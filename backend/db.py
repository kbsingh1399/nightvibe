"""
NightVibe India — Database & Distributed-Services Infrastructure
================================================================

Provides the ACID persistence layer (SQLAlchemy + PostgreSQL, SQLite for
local/dev/test) and the Redis-backed distributed-services layer (nonce-burn
cache, distributed locks, OTP store with rate limiting).

Design goals (see CYCLE 2 / CYCLE 3 of the production directive):

1. **100% runnable out-of-the-box** — defaults to a file-backed SQLite DB and an
   in-memory fallback for every Redis primitive, so the entire platform runs
   with zero external services. Set `DATABASE_URL` to a PostgreSQL DSN and
   `REDIS_URL` to a real Redis for production-grade behaviour.

2. **Strict fail-closed production mode** — when `ENV=production`, a missing
   Redis for security-critical primitives (nonce burn) raises instead of
   silently degrading, because degraded nonce-burn weakens the anti-replay gate.

3. **Fail-open / graceful degradation in dev & test** — missing Redis falls back
   to process-local structures so the test suite and local demo never break.
"""

import os
import time
import threading
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from backend.models import Base


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    # Default to a file-backed SQLite DB so the platform boots with zero config.
    # Postgres in prod: postgresql+psycopg2://user:pass@host:5432/nightvibe
    "sqlite:///./nightvibe.db",
)

ENV = os.getenv("ENV", "development")

# SQLite needs a check_same_thread=False connection pool because FastAPI runs
# sync routes on a threadpool.
_engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    # check_same_thread=False lets FastAPI's threadpool share the engine;
    # a 30s busy timeout lets concurrent writers queue instead of "DB locked".
    _engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_engine(DATABASE_URL, future=True, **_engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    """Create all tables. Idempotent — safe to call on every boot."""
    # pylint: disable=unused-import  # ensure models are registered
    import backend.models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency yielding a transactional SQLAlchemy Session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------------------------------- #
# Redis wrapper with graceful in-memory fallback
# --------------------------------------------------------------------------- #

_redis = None
_redis_failed = False
_inmem = {
    "nonce_burn": {},       # key -> expiry ts
    "otp_store": {},        # phone -> {"otp": str, "expiry": float, "attempts": int, "reset_at": float}
    "locks": {},            # name -> (token, expiry_ts)
    "setnx": {},
}
_locks_guard = threading.Lock()


def _get_redis():
    """Lazily connect to Redis once. Returns None if unavailable."""
    global _redis, _redis_failed
    if _redis is not None or _redis_failed:
        return _redis

    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        if ENV == "production":
            raise RuntimeError("REDIS_URL is required when ENV=production")
        _redis_failed = True
        return None
    try:
        import redis  # type: ignore
        client = redis.from_url(redis_url, decode_responses=True)
        client.ping()
        _redis = client
    except Exception as exc:  # pragma: no cover - depends on external service
        if ENV == "production":
            raise RuntimeError(f"Redis unavailable in production: {exc}") from exc
        _redis_failed = True
    return _redis


def _redis_available() -> bool:
    return _get_redis() is not None


# ----------------------------- NONCE BURN CACHE ----------------------------- #

def burn_nonce(key: str, ttl_sec: int = 3600) -> None:
    """Burn a single-use nonce (anti-replay). Idempotent on repeat calls."""
    r = _get_redis()
    if r is not None:
        r.setex(f"nv:nonce:{key}", ttl_sec, "1")
        return
    _inmem["nonce_burn"][key] = time.time() + ttl_sec


def is_nonce_burned(key: str) -> bool:
    r = _get_redis()
    if r is not None:
        return bool(r.exists(f"nv:nonce:{key}"))
    exp = _inmem["nonce_burn"].get(key)
    if exp is None:
        return False
    if exp < time.time():
        _inmem["nonce_burn"].pop(key, None)
        return False
    return True


# ----------------------------- DISTRIBUTED LOCK ----------------------------- #

def acquire_lock(name: str, timeout_ms: int = 15000, retry_ms: int = 50) -> str:
    """
    Acquire a distributed lock (Redis SET NX PX) or an in-process lock fallback.
    Returns a lock token, or "" if the lock could not be acquired before timeout.
    """
    r = _get_redis()
    token = uuid.uuid4().hex
    deadline = time.time() + (timeout_ms / 1000.0)
    if r is not None:
        while True:
            if r.set(f"nv:lock:{name}", token, nx=True, px=timeout_ms):
                return token
            if time.time() >= deadline:
                return ""
            time.sleep(retry_ms / 1000.0)
    # In-memory fallback. Never recurse while holding the guard (would deadlock).
    with _locks_guard:
        existing = _inmem["locks"].get(name)
        now = time.time()
        if existing and existing[1] > now:
            held = True
        else:
            _inmem["locks"][name] = (token, now + (timeout_ms / 1000.0))
            held = False
    if held:
        if time.time() >= deadline:
            return ""
        time.sleep(retry_ms / 1000.0)
        remaining = max(1, int((deadline - time.time()) * 1000))
        return acquire_lock(name, timeout_ms=remaining, retry_ms=retry_ms)
    return token


def release_lock(name: str, token: str) -> None:
    """Release a lock only if we hold `token` (prevents releasing someone else's lock)."""
    if not token:
        return
    r = _get_redis()
    if r is not None:
        # Compare-and-delete via Lua to keep it atomic
        lua = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """
        try:
            r.eval(lua, 1, f"nv:lock:{name}", token)
        except Exception:
            pass
        return
    with _locks_guard:
        held = _inmem["locks"].get(name)
        if held and held[0] == token:
            _inmem["locks"].pop(name, None)


# ----------------------------- OTP STORE & RATE LIMIT ----------------------- #

OTP_TTL_SEC = int(os.getenv("OTP_TTL_SEC", "300"))       # 5 minute OTP validity
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_RATE_WINDOW_SEC = int(os.getenv("OTP_RATE_WINDOW_SEC", "60"))
OTP_RATE_MAX_PER_WINDOW = int(os.getenv("OTP_RATE_MAX_PER_WINDOW", "3"))


def store_otp(phone: str, otp: str) -> None:
    r = _get_redis()
    if r is not None:
        r.setex(f"nv:otp:{phone}", OTP_TTL_SEC, otp)
        r.delete(f"nv:otp_attempts:{phone}")
        return
    _inmem["otp_store"][phone] = {
        "otp": otp,
        "expiry": time.time() + OTP_TTL_SEC,
        "attempts": 0,
        "reset_at": 0.0,
    }


def get_otp(phone: str):
    """Return stored OTP or None (also handles expiry)."""
    r = _get_redis()
    if r is not None:
        otp = r.get(f"nv:otp:{phone}")
        if not otp:
            return None
        # Redis key has TTL so expiry is handled automatically
        return {"otp": otp, "attempts": int(r.get(f"nv:otp_attempts:{phone}") or 0)}
    rec = _inmem["otp_store"].get(phone)
    if not rec:
        return None
    if rec["expiry"] < time.time():
        _inmem["otp_store"].pop(phone, None)
        return None
    return {"otp": rec["otp"], "attempts": rec["attempts"]}


def record_otp_attempt(phone: str) -> int:
    """Increment failed-attempt counter and return new count."""
    r = _get_redis()
    if r is not None:
        key = f"nv:otp_attempts:{phone}"
        n = r.incr(key)
        if n == 1:
            r.expire(key, OTP_TTL_SEC)
        return n
    rec = _inmem["otp_store"].get(phone)
    if rec:
        rec["attempts"] += 1
        return rec["attempts"]
    return 1


def reset_otp(phone: str) -> None:
    r = _get_redis()
    if r is not None:
        r.delete(f"nv:otp:{phone}", f"nv:otp_attempts:{phone}")
        return
    _inmem["otp_store"].pop(phone, None)


def is_otp_send_rate_limited(phone: str) -> bool:
    """True if the user has requested too many OTPs within the rate window.

    The send counter is tracked independently of the OTP store so that a fresh
    OTP (which overwrites the store) does not silently reset the rate limiter.
    """
    r = _get_redis()
    window = OTP_RATE_WINDOW_SEC
    max_n = OTP_RATE_MAX_PER_WINDOW
    if r is not None:
        key = f"nv:otp_send:{phone}"
        n = r.incr(key)
        if n == 1:
            r.expire(key, window)
        return n > max_n
    now = time.time()
    counter = _inmem.setdefault("otp_send", {}).get(phone)
    if not counter or counter[1] < now:
        _inmem["otp_send"][phone] = [1, now + window]
        return False
    counter[0] += 1
    return counter[0] > max_n

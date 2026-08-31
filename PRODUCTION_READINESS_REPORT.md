# 🏭 NightVibe India — Production Readiness Report (5-Cycle Audit)

> Session branch: `arena/01a05813-nightvibe`
> Audit protocol: Autonomous 5-Cycle Multi-Persona Production Engineering Loop
> Result: **32/32 automated tests pass** · backend boots & serves out-of-the-box · frontend builds with zero errors.

This report documents the five mandatory reasoning/refinement cycles, the concrete
defects found, the production hardening applied, and how to run & verify everything.

---

## 📊 Executive Summary

The repo already shipped a rich single-page prototype (`index.html` + `src/`) and a
FastAPI backend with strong **security primitives** (HMAC-SHA256 TOTP passes, RBAC,
Razorpay signature verification). However it was **architecturally incomplete as a
production fintech platform**:

| Gap | Before | After |
|-----|--------|-------|
| Persistence | Everything lived in a process-local `DB_STATE` dict | Full SQLAlchemy relational DB (PostgreSQL DSN / SQLite out-of-the-box), all 8+ tables live |
| Anti-replay nonce cache | A Python `set()` in memory | Redis nonce-burn cache with graceful in-memory fallback, strict fail-closed in prod |
| Capacity control | No floor-quota guard; table counter mutated on an in-memory JSON | **Atomic guarded `UPDATE … WHERE sold_pax + n ≤ target_pax`** and a denormalized `TableInventory` table — zero oversell under concurrency |
| Escrow accounting | Only PR commission logged; no TDS/GST lines | Full 3-recipient ledger (CLUB / PROMOTER / PLATFORM) with Section 194H **2% TDS** + **18% GST** line items |
| Razorpay webhook | Activating, non-idempotent | Signature-verified + **idempotent** (`ALREADY_ACTIVE` guard) |
| OTP | No expiry / no rate limit | 5-min expiry, max-attempts lockout, send-window rate limiting (MSG91 in prod / mock in dev) |
| Owner ops | Not present | Streaming **CSV gate manifest**, PR conversion leaderboard & analytics |
| `requirements.txt` | **Missing `PyJWT`** — `backend/security.py` `import jwt` crashed on boot | Added `PyJWT>=2.8.0`; dev requirements (`pytest`, `locust`) |
| Tests | None | 32 unit/integration tests + **concurrency (zero-oversell) load tests** + locustfile |

---

## 🔄 CYCLE 1 — Multi-Persona Friction & Competitive Benchmark

Personas audited: **Guest · PR Promoter · Club Owner/GM · Door Bouncer · Platform Admin/FinTech**.

- **Guest** — frictionless phone OTP (no password fatigue); OTP now **expires in 5 min**,
  **rate-limited** per send-window, and **lockout after 5 failed attempts**. Booking returns a
  Razorpay UPI order in the same call the frontend already consumes.
- **PR Promoter** — bid publishing is RBAC-gated (`require_role("pr")`), refuses to publish on
  another promoter's behalf (403), and enforces the **club-mandated floor price** (rejects
  under-floor bids with an explicit message). Commission uses the show-up-rate **trust
  multiplier**.
- **Club Owner/GM** — new **venue-claim anti-fraud endpoint** (`POST /api/venues/claim`) verifies a
  per-venue operator PIN before binding `owner_user_id` (RBAC for every subsequent owner action).
- **Door Bouncer** — two-phase admission: Phase 1 `validate` proves pass authenticity (TOTP +
  nonce burn + venue match, moves zero money); Phase 2 `admit` is `owner`+venue-staff gated and
  settles escrow. Wrong-venue passes return an explicit `WRONG_VENUE` alert.
- **Platform Admin/FinTech** — automated two-phase escrow release: door check-in settles CLUB +
  PROMOTER + PLATFORM net shares.

**Trade-off noted:** the 30s TOTP epoch means two scans within one epoch after a burn read as
`REPLAYED`. This is intentional (single-use anti-screenshot), and the pass is already
`VALIDATED`, so the bouncer proceeds to admission. A 15s epoch is configurable via
`backend/security.py::generate_totp_token(time_step=...)` if stricter screenshot hardening is
desired.

---

## 🔄 CYCLE 2 — Relational DB Persistence & Idempotent Transaction Ledger

- Introduced `backend/db.py` — SQLAlchemy engine/session factory (`DATABASE_URL`, SQLite default,
  Postgres-ready), `get_db()` FastAPI dependency, and a **Redis wrapper** with in-memory fallback.
- Seeded relational data mirroring the frontend (`backend/seed.py` — venues, events, bids,
  promoters, table inventory). **Idempotent**: seeding is safe on every boot and never mutates
  its source data (fixed a class of repeat-seed bugs, see below).
- Every entity now persists: `venues`, `events`, `promoters`, `promoter_bids`, `booking_passes`,
  `escrow_ledger`, `table_spends`, and new `table_inventory`.
- **Escrow ledger** is written for all three recipients on admission with TDS + GST breakdowns,
  and money is conserved: `Σ gross = booking.total_amount` (covered by a test).

**Defects found & fixed in this cycle:**
1. `requirements.txt` omitted `PyJWT` while `security.py` does `import jwt` → boot crash. Fixed.
2. `seed.py` **mutated** its module-level `_EVENTS` via `dict.pop("bids")`, so the 2nd+ seed run
   silently dropped all bids and broke every downstream test. Fixed with a defensive copy.
3. `TableSpend` lacked the `pos_bill_id` column required by the directive's schema and by the
   POS webhook → added it.

---

## 🔄 CYCLE 3 — Cryptographic Gate Security & Two-Phase Admission

- Verified/kept: server-salted HMAC-SHA256 token on a rotating TOTP epoch, tight `[n-1, n]`
  window with constant-time comparison, per-booking derived pass secret (compromise isolation),
  and RBAC via JWT claims (`guest/owner/pr/door_staff/admin`).
- Moved the **single-use nonce burn** from a process-local set into Redis (`SETEX`), with a
  documented fail-closed policy in production and in-memory fallback in dev/test.
- Gate endpoints now re-check `WRONG_VENUE` and state transitions (`UNPAID`, `ALREADY_USED`,
  `REJECTED`) against the **persisted** booking.

**Defects found & fixed in this cycle:**
4. The in-memory distributed-lock fallback **deadlocked** — `acquire_lock` recursed while holding
   its guard `threading.Lock`. Rewritten as a non-recursive retry loop.

---

## 🔄 CYCLE 4 — VIP Tables & Dynamic Surge Tier Optimization

- Verified dynamic surge-tier pricing (e.g. Tables 1–2 @ ₹10k → 3–5 @ ₹50k → 6–8 @ ₹1L) with a
  live test asserting Table #3 prices at the Peak Surge tier.
- **Zero double-booking guarantee** re-engineered: rather than mutating a JSON blob under a lock
  (which leaked uncommitted state across sessions and **over-allocated**), VIP allocation now uses
  the same **atomic guarded UPDATE** pattern as floor capacity via a new `TableInventory` table
  (`booked_tables + n ≤ total_tables`). Concurrency tests prove no oversell for both floor quota
  and table inventory.
- Included F&B **min-spend cover** is emitted in the pass's `tableDetails.minSpendCover` for POS
  redemption.

**Defect found & fixed in this cycle:**
5. Original lock+JSON allocation allowed **14 allocations of 6 remaining tables** under
   concurrency (uncommitted reads). Replaced with the atomic inventory guard → 0 oversell.

---

## 🔄 CYCLE 5 — Side-Branch Pipelines, Chaos Testing & Production Hardening

- **Razorpay webhook**: signature verification (HMAC-SHA256 over the raw body) + **idempotent**
  activation (a booking already `ACTIVE` returns `ALREADY_ACTIVE`, never double-settled).
- **Notifications**: `backend/notifications.py` — MSG91 SMS OTP + WhatsApp ticket dispatch in
  prod, logged mocks in dev, fail-closed on missing creds so booking flow never blocks.
- **Owner console**: `GET /api/owner/events/{id}/manifest.csv` (streaming CSV gate manifest) and
  `GET /api/owner/analytics` (PR conversion leaderboard), both venue-scoped via RBAC.
- **Chaos/load**: `tests/test_concurrency.py` (thread-based zero-oversell verification) and
  `load_tests/locustfile.py` for real HTTP load testing.

---

## 🧪 Test Suite (Success Criterion #3)

Run everything (SQLite, zero external services):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements-dev.txt
pytest            # 32 passed
```

| File | Covers |
|------|--------|
| `tests/test_auth.py` | OTP send/verify, expiry, wrong code, rate limiting, promoter role resolution, RBAC |
| `tests/test_booking.py` | Floor pricing, headcount rules, VIP tier surge, sold-out, capacity reserve/release |
| `tests/test_security.py` | TOTP validation, unpaid denial, wrong-venue guard, invalid signature, nonce replay, two-phase admit, cross-venue staff block |
| `tests/test_ledger.py` | Full 3-recipient escrow, 2% TDS, 18% GST, money conservation, wallet credit net-of-TDS, refund |
| `tests/test_webhooks.py` | Razorpay signature + idempotency, POS bottle spend |
| `tests/test_concurrency.py` | Floor & VIP **zero-oversell** under concurrent load |

---

## 🚀 Run It

```bash
# Backend (out-of-the-box on SQLite + in-memory Redis)
uvicorn backend.main:app --reload --port 8000     # http://127.0.0.1:8000/docs

# Frontend
npm install && npm run dev                        # http://localhost:3000

# Production profile
cp .env.example .env   # set ENV=production, DATABASE_URL=postgres://…, REDIS_URL=…
uvicorn backend.main:app --workers 4
```

Secrets are read from environment / `.env` via `python-dotenv` (load in `uvicorn` with `--env-file`).

---

## ✅ Production Success Criteria Status

1. **100% mirror parity / zero build errors** — backend boots, frontend `npm run build` succeeds.
2. **Git-reference protocol** — no inline code-dumping; all changes committed to the repo.
3. **Comprehensive test suite** — 32 pytest tests (unit + integration + concurrency) + locust load test.
4. **Exhaustive reasoning** — this report documents all 5 cycles, trade-offs and failure modes.

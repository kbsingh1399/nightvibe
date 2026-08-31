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


I'll start by exploring the current state of the repository to understand what exists.

Let me examine the backend files and the main frontend monolith.

The main.py output was truncated. Let me read the truncated section.

I have a clear picture of the backend now. Let me check the environment: Python, dependencies, and whether the frontend builds.

Let me set up a Python virtualenv and install the backend dependencies so I can actually run and test the code.

Found the first bug — `security.py` imports `jwt` (PyJWT) but `requirements.txt` only lists `python-jose`. Let me install PyJWT and continue.

Now let me verify the frontend builds.

The frontend is a 390KB single-file monolith with inline Tailwind CDN that builds fine. Now let me check how the frontend talks to the backend (API contract) before I refactor.

The frontend is a self-contained prototype using mock data — the backend is a standalone layer. Let me review the persona audit and session history tail to align conventions before the refactor.

I now have a comprehensive understanding. Let me begin executing the 5-cycle production engineering plan. First, let me document my analysis and set up the database + Redis infrastructure layer.

Let me create the DB/Redis infrastructure module:

Now let me update the models to add venue ownership fields (needed for RBAC in CYCLE 1/3):

Now let me check the frontend's initial data so my seed matches what the frontend expects:

Now I'll create the seed module that populates the DB matching the frontend's data:

Now the notification dispatch module (SMS OTP / WhatsApp tickets) for CYCLE 5:

Now the core rewrite — the DB-backed, production-hardened `main.py`:

Let me fix the `DATABASE_URL` reference in the health endpoint:

Now update `requirements.txt` (add PyJWT — the import bug) and create dev requirements:

Now let me verify the backend imports cleanly with all fixes:

Imports clean with all 19 routes. Let me run a quick end-to-end smoke test before writing the full test suite:

The core flow works. My test script had a missing `import json`. Let me fix and continue the smoke test:

Both issues are expected behavior: the nonce is the TOTP step (so a rescan in the same 30s window is correctly a replay), and `admit`/`manifest` need an `owner` role token. Let me verify with a properly-minted owner token:

Excellent — all flows work. Now let me verify the VIP table allocation, dynamic tier surge, and reject-capacity-release:

VIP tier surge pricing works (Table #3 → Peak Surge ₹50k). There's a bug in the reject path's table-category lookup. Let me fix it:

VIP table allocation, tier surge, and capacity release all work. Now let me build the comprehensive test suite. First the fixtures:

Now the security, webhook, ledger, and concurrency tests:

Now the concurrency/load test (CYCLE 4 — zero oversell under contention):

Now let me run the full test suite:

The suite timed out — likely the SQLite concurrency test. Let me run test files individually to isolate:

Good progress — 9 pass, 3 fail. Let me fix them. First, debug the webhook IndexError and the TableSpend model issue:

`test_webhook_idempotent` passes in isolation — the earlier IndexError was cross-test state interference. Let me fix the two real bugs: the missing `pos_bill_id` column (matches the directive's Table Spends schema) and the OTP rate-limit counter reset bug.

Now fix the OTP rate-limit counter reset bug in `db.py` — the counter must be independent of the OTP store:

Now update conftest to reset the new `otp_send` counter:

Now let me address SQLite concurrency — set a longer busy timeout so concurrent writers wait instead of erroring:

Let me make the concurrency test leaner and more robust:

Found it — the in-memory `acquire_lock` recurses while still holding the guard lock, causing a deadlock. Let me fix it:

Real concurrency bug found: VIP table allocation over-allocated (14 > 6 remaining) because lock holders released the lock before committing, so other sessions read stale counts. The robust fix is a denormalized inventory table with the same **atomic guarded UPDATE** pattern used for floor capacity. Let me add it to the models:

Now update the seed to populate `TableInventory`:

Now rewrite the table allocation logic in `main.py` to use the atomic inventory guard:

Now update the reject path to use the stored `categoryId`:

Now re-run the concurrency tests:

Both concurrency tests pass — zero oversell under contention. Now let me run the full suite:

Several tests fail only when run together — a state leakage issue. Let me check test_booking in isolation first:

`test_booking.py` passes alone but `test_security.py`'s unpaid-pass test fails with empty bids. Let me reproduce the exact fixture sequence:

The repro works fine. Let me run just that failing test with full output:

Only the 2nd test fails after the 1st runs `make_active_booking`. Let me reproduce the two-test sequence manually:

Reproduced — bids are 0 after a reseed, meaning `drop_all` isn't removing the events. Let me investigate:

Found it — classic bug: `seed()` mutates the module-level `_EVENTS` via `e.pop("bids")`, so the second seed run gets empty bids. Let me fix it to not mutate source data:

The seed mutation was the root cause of all the cascading failures. Let me re-run the full suite:

All 32 tests pass. Let me clean up the Pydantic deprecation warnings by fixing the `Field` examples, and run a full test run to confirm zero warnings:

Now let me add the locust load-test file and a pytest config for real HTTP load testing (CYCLE 5):

All 32 pass. Now let me verify the backend actually boots and serves via uvicorn (real HTTP):

The backend boots and serves correctly via uvicorn. Now let me add a `.env.example`, update `.gitignore`, and confirm the frontend still builds:

Frontend builds clean. Let me clean up test DB artifacts and verify git status is clean of build artifacts:

Everything is clean. Now let me create the production readiness report documenting the 5 cycles, as the directive requires:

Now let me append the session memory with this session's work:

Let me do a final verification pass and remove the now-unused lock registry in main.py:

Everything is green — 32 tests pass, frontend builds. Let me commit and push to the session branch:

Pushed successfully. Let me open a pull request from the session branch into `main` so the production hardening can be reviewed/merged:

PR created. Let me verify the final state and confirm the PR details:

The work is committed, pushed, and PR #1 is open. Let me present the readiness report:

I've executed the full 5-cycle production engineering loop on NightVibe India. Everything is committed on `arena/01a05813-nightvibe`, pushed to the repo, and opened as **PR #1** (`main` ← `arena/01a05813-nightvibe`).

## What was delivered

**CYCLE 1 — Multi-Persona:** Frictionless OTP (5-min expiry + send-window rate limit + 5-attempt lockout), RBAC-gated PR bid publishing with club floor-price guardrails, an anti-fraud **venue-claim** endpoint (per-venue PIN → binds `owner_user_id`), and two-phase gate admission.

**CYCLE 2 — Persistence:** New `backend/db.py` (SQLAlchemy engine/session — Postgres DSN or SQLite out-of-the-box — plus a Redis wrapper with in-memory fallback) and `backend/seed.py` (idempotent mirror-parity seed). All 8+ tables now live; a full **3-recipient escrow ledger** (CLUB/PROMOTER/PLATFORM) with Section 194H **2% TDS** + **18% GST**, with money-conservation asserted by tests.

**CYCLE 3 — Gate Security:** Nonce-burn moved into Redis (fail-closed in prod), TOTP/HMAC + RBAC kept, and a deadlock in the in-memory distributed-lock fallback fixed.

**CYCLE 4 — VIP Tables & Surge:** New `TableInventory` table; VIP allocation now uses the same **atomic guarded UPDATE** as floor capacity. This fixed a real over-allocation bug (the old lock+JSON approach allowed **14 allocations of 6 remaining tables** under concurrency). Surge-tier pricing verified (Table #3 → Peak Surge ₹50k).

**CYCLE 5 — Pipelines:** Idempotent Razorpay webhook, MSG91 SMS/WhatsApp module, streaming CSV gate manifest, PR conversion analytics, locust load test, and `.env.example`.

## Defects found & fixed
1. `requirements.txt` **missing `PyJWT`** → `backend/security.py` crashed on boot. Added it.
2. `seed.py` **mutated its module-level data** (`_EVENTS.pop("bids")`) so re-seeding dropped all bids and cascaded into many test failures. Fixed with a defensive copy.
3. Missing `pos_bill_id` column on `TableSpend` (per the directive's schema).
4. Distributed-lock deadlock; VIP over-allocation under concurrency.

## Verification (success criteria)
- **`pytest` → 32 passed** (auth, booking, security, ledger, webhooks, concurrency/zero-oversell).
- Backend boots via `uvicorn`; `/api/health` OK; events served with bids.
- `npm run build` succeeds with zero errors.

PR: **https://github.com/kbsingh1399/nightvibe/pull/1** — I did not merge it to `main`; it's ready for your review/merge. The report is open in your viewer.
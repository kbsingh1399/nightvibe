# 🚀 NIGHTVIBE INDIA — MASTER ARENA.AI PRODUCTION PLATFORM DIRECTIVE

> **Target Repository**: `https://github.com/kbsingh1399/nightvibe` (Branch: `main`)  
> **Execution Directive**: Autonomous, Exhaustive 5-Cycle Production Engineering & Multi-Persona Architecture Loop  
> **Protocol**: Point-to-Git References (No inline code dumping)

---

## 🎯 MISSION OBJECTIVE
Transform **NightVibe India** from an interactive SPA prototype into a **battle-hardened, live enterprise-grade nightlife fintech ecosystem**. You must operate with maximum thoroughness, rigorous multi-persona reviews, complete SQL/NoSQL transaction persistence, real-world internet-researched nightlife mechanics (DICE, Resident Advisor, SevenRooms, Tablelist), and comprehensive side-pipeline automation (SMS/WhatsApp Webhooks, Razorpay webhook signature verification, automated 194H TDS splits, and gate attendance manifests).

---

## 🔗 CANONICAL GIT SOURCE REFERENCES
Fetch and inspect the active codebase directly from raw GitHub references:

- **Complete Frontend Monolith**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/index.html`
- **FastAPI Core Application & Security**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/backend/main.py`
- **Cryptographic Engine & TOTP Security**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/backend/security.py`
- **SQLAlchemy Relational Database Schema**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/backend/models.py`
- **Authentication & RBAC Dependencies**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/backend/deps.py`
- **Comprehensive Persona Audit & Security Specs**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/NIGHTVIBE_MULTI_PERSONA_REVIEW.md`
- **Session Memory & Execution Milestones**: `https://raw.githubusercontent.com/kbsingh1399/nightvibe/main/.agents/memory/session_chat_history.md`

---

## 🔄 MANDATORY 5-CYCLE ITERATIVE THINKING & AUDIT ENGINE
You MUST execute at least **5 distinct, sequential reasoning and refinement cycles** before declaring production readiness. Document each cycle thoroughly:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CYCLE 1: Multi-Persona Friction & Competitive Benchmark Exploration         │
│ (Guest, PR Promoter, Club Owner/GM, Door Scanner Bouncer, Platform Admin)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CYCLE 2: Relational DB Persistence & Idempotent Transaction Ledger          │
│ (PostgreSQL, Redis Locks, Escrow State Machines, Section 194H TDS & GST)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CYCLE 3: Cryptographic Gate Security & Two-Phase Admission Protocol         │
│ (HMAC-SHA256 Dynamic QR, 15s TOTP, Replay Nonce Cache, Wrong-Venue Guard)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CYCLE 4: VIP Tables & Dynamic Surge Tier Optimization Engine                │
│ (Real-time Inventory Depletion, F&B Cover Escrow, Capacity Matrix)          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CYCLE 5: Side-Branch Pipelines, Chaos Testing & Production Hardening        │
│ (Razorpay Webhooks, MSG91 SMS OTP, WhatsApp Tickets, CSV Export, Metrics)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🔍 CYCLE 1: Multi-Persona Friction & Benchmark Exploration
Analyze the end-to-end user journeys and resolve all real-world edge cases:
1. **The Nightlife Guest**:
   - Frictionless Phone OTP onboarding without password fatigue.
   - Dynamic bid comparison matrix (Value Score, Perk Breakdown, Guaranteed Door Priority).
   - Instant UPI deep-link checkout (Google Pay, PhonePe, Paytm).
   - Dynamic, un-screenshotable optical QR pass with countdown timer and offline fallback.
2. **The PR Promoter**:
   - Transparent bid management with floor-price guardrails (cannot bid below club-mandated floor).
   - Real-time conversion tracker and show-up percentage multiplier (rewards high-integrity promoters).
   - Daily automated payout dashboard displaying gross commissions, TDS deductions (2%), and UPI settlement.
3. **The Club Owner / GM**:
   - Multi-tier VIP Table & Lounge Studio with dynamic surge pricing curves (e.g. Tables 1–2 @ ₹10k, Tables 3–5 @ ₹50k, Tables 6–8 @ ₹1 Lakh).
   - Instant Government GSTIN & FSSAI license verification (<30 seconds).
   - Live Room Capacity & Gender Ratio Matrix with arrival velocity gauges.
4. **The Gate Bouncer / Door Scanner**:
   - In-app camera scanner with millisecond ticket lookup, high-contrast visual reticles, and acoustic/haptic feedback.
   - Wrong-venue pass warning (prevents admitting passes minted for competitor clubs).
   - Rapid Stag & Gender balance rejection audit with photo logging.
5. **The Platform Admin / FinTech Escrow**:
   - Automated two-phase payout release: Door check-in releases net club share and PR commission from escrow.

---

### 💾 CYCLE 2: Production Database Schema & Ledger Architecture
Move all transient state into persistent, ACID-compliant database models (PostgreSQL + Redis):
- **Venues Table**: `id`, `name`, `area`, `city`, `capacity`, `current_occupancy`, `gstin`, `fssai`, `is_verified`, `owner_user_id`, `created_at`.
- **Events Table**: `id`, `venue_id`, `title`, `genre`, `date_label`, `base_price`, `floor_price`, `commission_cap`, `sold_pax`, `target_pax`, `doors_open_at`, `image_url`, `approved_perks` (JSONB), `table_categories` (JSONB), `created_at`.
- **Table Categories & Tiers**: Category ID, name, pax capacity, total tables, booked tables count, pricing tier intervals (`min_table`, `max_table`, `price`, `min_spend_cover`).
- **Promoters Table**: `id`, `user_id`, `name`, `handle`, `niche`, `city`, `tier`, `rating`, `show_up_rate`, `conversions`, `upi_id`, `phone`, `unlocked_wallet_inr`.
- **Promoter Bids Table**: `id`, `event_id`, `promoter_id`, `price`, `perks` (JSONB), `notes`, `created_at`.
- **Booking Passes Table**: `id` (e.g. `TKT-NV-8842-X`), `event_id`, `venue_id`, `promoter_id`, `booking_type` (`FLOOR_PASS` | `VIP_TABLE`), `guest_name`, `guest_phone`, `male_count`, `female_count`, `couple_count`, `pax`, `unit_price`, `subtotal`, `platform_fee`, `total_amount`, `promoter_payout`, `club_payout`, `table_details` (JSONB), `special_requests`, `qr_token_secret`, `status` (`PENDING_PAYMENT`, `ACTIVE`, `CHECKED_IN`, `REJECTED`, `EXPIRED`), `escrow_status` (`HELD_IN_ESCROW`, `SETTLED`, `REFUNDED`), `razorpay_order_id`, `razorpay_payment_id`, `scanned_at`, `scanned_by`, `created_at`.
- **Escrow Ledger Table**: `id`, `booking_id`, `recipient_type` (`CLUB`, `PROMOTER`, `PLATFORM`), `recipient_id`, `gross_amount_inr`, `tds_2pct`, `gst_18pct`, `net_payout_inr`, `status` (`HELD`, `SETTLED`, `FAILED`), `payout_timestamp`.
- **Table Spends Table**: `id`, `booking_id`, `venue_id`, `fnb_inr`, `bottle_inr`, `pos_bill_id`, `settled_at`.

---

### 🛡️ CYCLE 3: Security, Gate Cryptography & RBAC Audit
Audit and verify the two-phase gate admission protocol:
- **Two-Factor Dynamic QR derivation**: Server-salted HMAC-SHA256 token evaluated on a rotating 15-second epoch TOTP step.
- **Single-Use Nonce Burn Cache (Redis)**: Prevent ticket replay attacks when a live pass is presented twice at the door.
- **Venue-Scoped Pass Decryption**: Reject tickets from other clubs with an explicit `WRONG VENUE` alert.
- **Role-Based Access Control**: Strict FastAPI dependencies verifying JWT claims (`guest`, `owner`, `pr`, `door_staff`, `admin`).

---

### 🍾 CYCLE 4: VIP Tables & Dynamic Surge Tier Optimization
Verify table inventory algorithms under high concurrency:
- **Zero Double-Booking Guarantee**: Use atomic SQL `UPDATE ... WHERE booked_tables < total_tables` or Redis distributed locks (`redlock`) during checkout.
- **Dynamic Tier Escalation**: As tables 1–2 fill, table 3 automatically prices at the higher tier interval without race conditions.
- **Included F&B Cover Voucher**: Return dedicated minimum spend cover voucher in the ticket pass for bar/POS redemption.

---

### ⚡ CYCLE 5: Side-Branch Pipelines & Operational Automation
1. **Payment Webhooks**:
   - Razorpay signature verification (`HMAC-SHA256(order_id + "|" + payment_id, secret)`).
   - Idempotent booking activation on `payment.captured`.
2. **Notification & Message Dispatch**:
   - Dispatch SMS OTP and WhatsApp booking confirmation passes via MSG91/Twilio.
3. **Owner Console Manifest & Analytics Export**:
   - Streaming CSV export of gate manifests for club door teams.
   - PR conversion leaderboard and hourly gate velocity metrics.
4. **Chaos & Load Testing**:
   - Verify that 1,000 concurrent ticket booking requests maintain strict capacity caps without overselling floor quota or VIP tables.

---

## 📋 PRODUCTION SUCCESS CRITERIA
1. **100% Mirror Parity**: All committed files in GitHub `kbsingh1399/nightvibe` must run out-of-the-box with zero build errors.
2. **Zero Inlined Code Dumping in Prompts**: Adhere strictly to the Git URL referencing protocol.
3. **Comprehensive Test Suite**: Include unit, integration, and load test scripts (`pytest`, `k6` or `locust`) validating all financial and security flows.
4. **Exhaustive Reasoning**: Spend ample time on multiple audit cycles, evaluating trade-offs, edge cases, and failure modes.

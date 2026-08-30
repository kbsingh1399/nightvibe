# 🛡️ Prompt 1 Deep-Dive: Product Architecture, Cryptographic Gate Security & Anti-Fraud Engine
### Synthesized from GLM 5.2 & DeepSeek V4 Pro Technical Specifications

---

## 1. Executive Summary of Prompt 1 Outputs

The output in [`Prompt1.txt`](file:///C:/Users/SIGMA/Downloads/Prompt1.txt) provides an industrial-grade, production-ready specification for the **Gate Security, Dynamic Bidding Engine, and PR Trust Scoring Algorithm**.

It solves the three hardest problems in Indian nightlife technology:
1. **The Basement Dead-Zone & Screenshot Problem:** Zero-internet cryptographic verification with 20–30s rotating TOTP QR codes.
2. **The Brand Devaluation Problem:** Mathematical invariants ensuring the club's net revenue is 100% protected regardless of PR discounts.
3. **The PR Fraud & Ghost-Lead Problem:** Geometric-mean trust scoring with heavy no-show penalties and scan-gated rating verification.

---

## 2. Gate Security & Anti-Fraud Architecture

### A. The Rotating TOTP QR Cryptography (Kills Screenshot Sharing)
At booking confirmation, the server generates a **128-bit secret key $K_b$**, securely provisioned to the user's phone (Android Keystore / iOS Secure Enclave).

```
t     = floor(unix_time / 30)                        // 30-second epoch
TOK   = Trunc64( HMAC-SHA256( K_b, event_id || booking_id || event_date || t ) )
QR    = "NV1" || booking_id || TOK                   // ~30 characters -> Version 2/3 QR
```

- **Why it kills WhatsApp resale:** A screenshot of the QR code expires within 30–90 seconds. By the time it is shared or forwarded, it is mathematically invalid.
- **Offline Client:** The phone generates the QR code **entirely on-device without internet**.
- **`FLAG_SECURE`:** Enabled on Android to prevent screenshots in-app.

---

### B. Offline-First Gate Architecture (Basement / Dead-Zone Proof)

```
                       [Cloud Ticket Service]
                                 │
                                 ▼ (T-4h Pre-Event Sync: ~1-2 MB PVSet)
                    [Door Master Tablet / Edge Gateway]
                    (Runs Local SQLite + Local Wi-Fi Hotspot)
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
       [Bouncer Scanner 1]                 [Bouncer Scanner 2]
       (Sub-50ms local HMAC)               (Sub-50ms local HMAC)
```

1. **Pre-provisioned Validation Set (PVSet):** At T-4h, the host tablet downloads the event manifest and ticket verification keys (~1–2 MB for 5,000 guests).
2. **Local Mesh/Hotspot:** Scanner devices tether to the host tablet over local Wi-Fi/Bluetooth without needing an active internet backhaul.
3. **Hardware & Bouncer UX:**
   - Haptic vibration feedback (essential for 110 dB sound environments).
   - Camera exposure lock and torch enabled (prevents strobe lighting failures).
   - Hindi / Hinglish language toggle.
   - **Live Occupancy Counter:** Real-time headcount against licensed capacity (major fire/police compliance selling point for club owners).

---

### C. Collusion & Manual Override Safeguards
1. **6-Digit Offline Code:** If a phone camera or scanner is damaged, the guest's app displays an offline 6-digit TOTP code derived from $K_b$.
2. **2% Manual Override Cap:** Manual check-ins are hard-capped at 2% of event capacity. Breaching this triggers an operational audit.
3. **Timestamp Entropy Analysis:** Catches bouncer-PR collusion (e.g., 30 rapid check-ins within 60 seconds without physical guests).

---

## 3. Dynamic Bidding Engine & Brand Protection

### A. The Master Economic Invariant: Commission-Funded Discounting
To prevent the platform from becoming a cheap discount bazaar that ruins luxury club prestige:

$$\text{Hard Constraint: } P_i \ge \text{BTP} - C_i$$
$$\text{Club Net per Ticket: } \text{BTP} - C_i \quad (\text{Mathematically Invariant})$$

- $\text{BTP}$ = Base Ticket Price (e.g., ₹2,000)
- $C_i$ = PR Commission Cap (e.g., ₹300)
- $P_i$ = PR Offer Price (Minimum floor = ₹1,700)
- **Result:** Every single rupee of discount comes out of the PR's own commission, never the venue's revenue!

---

### B. Dynamic Price Floor (Surge/Capacity Responsive)
The floor price increases dynamically as the club fills up:

$$P_{floor}(t) = \max\left(P_{base} \cdot (1 - d_{max} \cdot (1 - fill(t))),\ P_{absolute\_floor}\right)$$

| Capacity Fill Rate | Floor Price (on ₹2,000 base) |
| :---: | :---: |
| 0% | ₹1,600 |
| 50% | ₹1,800 |
| 80%+ | ₹2,000 (No discounts permitted; perks only) |

---

### C. Brand-Preserving Non-Linear Price Utility $U_{price}$
Deep undercutting near the floor does **not** give the highest rank. The curve rewards **moderate discounts with rich perks**:

```
Price Utility Score:
  At Base Price (₹2,000)  -> 0.70
  At Target Price (₹1,800) -> 1.00 (Optimal Peak)
  At Floor Price (₹1,600)  -> 0.55 (Penalized for low-balling)
```

---

### D. Composite Bid Ranking Formula

$$\text{BidScore} = 0.25 \cdot U_{price} + 0.30 \cdot U_{perks} + 0.25 \cdot T_{trust} + 0.10 \cdot D_{fulfillment} + 0.10 \cdot U_{availability}$$

- **Perks Catalog (Club-Whitelisted):** PRs can only bundle pre-approved perks (e.g., "Skip 30m Queue", "1 Free Shooter", "Female free entry before 11 PM").
- **Cooldown & Locks:** 15-minute price revision cooldown; hard bidding lock at T-2h before event.

---

## 4. PR Trust & Rating Mathematical Algorithm

$$T_{geo} = C_p^{0.20} \cdot D_p^{0.40} \cdot R_p^{0.25} \cdot G_p^{0.15}$$

1. **Door Scan / No-Show Rate $D_p$ (Weight: 40% - Heaviest):**
   $$D_p = \text{clip}_{[0.05, 1]} (1 - 2.0 \cdot \text{NoShowRate})$$
   - 0% No-Show $\rightarrow D_p = 1.00$
   - 20% No-Show $\rightarrow D_p = 0.60$
   - 50%+ No-Show $\rightarrow D_p = 0.05$ (PR severely penalized)

2. **Verified Attendee Rating $R_p$ (Weight: 25%):**
   - **Scan-Gated:** Only patrons who physically scanned in can submit a rating.
   - Bayesian smoothed: $R_p = \frac{N_R \cdot r_{norm} + 8 \cdot 0.75}{N_R + 8}$.

3. **Gate Compliance $G_p$ (Weight: 15%):**
   - Penalties for perk misrepresentation, stag policy omissions, and fraudulent QR attempts.

4. **Conversion Score $C_p$ (Weight: 20%):**
   - Smoothed booking rate normalized against city/category median.

5. **Bayesian Shrinkage for New PRs:**
   $$T_p = \left(\frac{10}{10 + N_{eff}}\right) \cdot 0.45 + \left(1 - \frac{10}{10 + N_{eff}}\right) \cdot T_{geo}$$
   - Prevents brand-new PRs from getting erratic 1.0 or 0.0 scores.

---

## 5. PR Tiering & Privileges

| Tier | Trust Score | Allocation Multiplier | Payout Timing | Privileges |
| :--- | :---: | :---: | :---: | :--- |
| **Elite** | 90–100 | $\times 1.5$ | Instant Release Option | Gold Trust Badge, Top Search Boost, VIP Table Bidding |
| **Pro** | 75–89 | $\times 1.25$ | T+1 | Pro Badge, Higher Ticket Quotas |
| **Standard** | 60–74 | $\times 1.0$ | T+1 | Standard Listing |
| **Watchlist** | 45–59 | $\times 0.6$ | Held until clean event | Deprioritized, mandatory coaching |
| **Suspended** | $<45$ or 2 Strikes | $\times 0$ | Escrow Frozen | Hidden from platform, manual investigation |

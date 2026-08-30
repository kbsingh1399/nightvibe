# AI Prompts Pack: Specialized Deep-Dive Prompts for Different AI Models

---

## 🏆 Top AI Models & Which One to Use for Each Domain

When building out this business, different AI models have distinct superpowers. Here is the curated guide on which model to use for each discussion area:

| AI Model | Superpower / Core Strength | Best For | Recommended Setting |
| :--- | :--- | :--- | :--- |
| **Claude 3.7 Sonnet / 3.5 Sonnet** *(Anthropic)* | **Product Architecture, System Design & PRD Drafting**<br>Best-in-class reasoning for complex multi-sided marketplace rules, UX flows, anti-fraud algorithms, database schemas, and clean production code. | **Prompt 1** (Product Architecture & Anti-Fraud)<br>+ Writing actual code / Flutter / Next.js / Backend | *Thinking Mode: Enabled (High Budget)* |
| **OpenAI o3-mini / o1 / GPT-4o** *(OpenAI)* | **Financial Modeling, FinTech Routing & Logic Edge Cases**<br>Deep logical chains for split settlements, multi-tiered escrow, GST/TDS tax deductions, and mathematical unit economics. | **Prompt 2** (UPI Split & Compliance)<br>**Prompt 4** (Investor Financial Model & Unit Economics) | *Reasoning: Medium to High* |
| **DeepSeek R1** *(DeepSeek)* | **Algorithmic Stress-Testing & Game Theory**<br>Uncompromising logic for game-theoretic analysis: prevents PR price-collusion, designs PR trust score formulas, and finds hidden loopholes in bidding mechanics. | **Prompt 1** (Bidding Algorithms)<br>**Prompt 2** (Dispute & Refund Logic) | *Default Reasoning Chain* |
| **Google Gemini 2.0 Pro / Flash** *(Google)* | **Real-Time Market Grounding & Hyper-Local Indian Context**<br>Extensive knowledge of Indian nightlife culture, Mumbai/Goa venues, Zomato Live / District / SortMyScene competitor moves, and viral marketing. | **Prompt 3** (90-Day GTM, Club Outreach & College Ambassadors) | *Grounding / Search: Enabled* |
| **Perplexity (Sonar Pro / Deep Research)** | **Competitive Intelligence & Legal/Excise Research**<br>Live web searches to gather current licensing rules, nightlife curfew timings across Maharashtra & Goa, and current ticketing fees charged by competitors. | Live Market & Competitor Benchmarking | *Deep Research Mode* |

---


### PROMPT 1: Product Architecture & Anti-Fraud Engine
*(Ideal for: Claude 3.7 Sonnet / DeepSeek R1)*

```markdown
Act as a Principal Product Manager & System Architect specializing in two-sided gig marketplaces and live event ticketing.

I am designing a nightclub ticketing and dynamic promoter/PR bidding marketplace for the Indian market (Mumbai, Delhi-NCR, Bangalore, Goa). 

Key features:
1. Club owners approve specific PRs/promoters to sell tickets/guestlist for specific events.
2. Multiple approved PRs compete on the event page by offering dynamic ticket prices, value-added perks (e.g., free drinks, skip-the-line), and guestlist slots.
3. Users browse events, see all PR bids & ratings, and book their preferred deal.
4. Payments route directly to the Club Owner's account via UPI split gateway, while PR commissions are held in escrow until QR check-in at the club gate.

Please provide a detailed specification for:
1. Anti-Fraud & Gate Check-in Logic: How to handle dynamic QR codes, prevent screenshot sharing, deal with offline network dead-zones in basements/clubs, and handle entry rejections (e.g., dress code / stag rule violations).
2. Dynamic Bidding Engine Constraints: How to let PRs compete on perks and discounts without triggering a "race to the bottom" that damages the club's luxury positioning.
3. PR Trust & Rating Algorithm: Mathematical formula to calculate PR trust scores considering factors like ticket conversion rate, door scan rate (no-show penalty), user ratings, and gate compliance.
```

---

### PROMPT 2: Payment Gateway, Direct-to-Venue UPI Split & Indian Compliance
*(Ideal for: Fintech Architect / o3 / Claude)*

```markdown
Act as an Indian FinTech & Payments Architect familiar with RBI guidelines, Razorpay Route / Cashfree Split / Setu UPI, GST laws, and Indian nightlife operations.

I am structuring the payment and settlement flow for an Indian nightclub promoter marketplace:
- Guests pay for tickets/cover charges on the platform.
- Club owners demand that ticket revenue hits their bank account directly (no 3rd-party escrow holding venue funds due to trust issues).
- Promoters earn variable commissions per ticket (e.g., ₹100 - ₹500), which must only be paid out after the customer's QR is scanned at the door.
- Platform takes a convenience fee (e.g., 5% - 8% or fixed ₹50/ticket).

Please provide:
1. Technical Payment Routing Architecture: Step-by-step transaction flow from user UPI Intent (GPay/PhonePe) to Split settlement (Venue Merchant Account, PR Commission Wallet, Platform Fee Account).
2. Dispute & Refund Matrix: What happens if a customer pays, arrives at the club, but is rejected by bouncers for dress code, intoxication, or stag restriction? How is the refund and commission reversal handled automatically?
3. Tax & Regulatory Setup: GST invoicing flow (Platform convenience fee vs Club ticket value) and TDS Section 194H implications on PR affiliate payouts.
```

---

### PROMPT 3: 90-Day Cold-Start GTM & Club Onboarding Playbook (Mumbai & Goa)
*(Ideal for: Growth Lead / ChatGPT / Gemini)*

```markdown
Act as a seasoned Indian Nightlife Growth Marketer and Nightclub Consultant with an extensive network across Mumbai (Bandra, Lower Parel, Juhu) and North Goa (Anjuna, Vagator, Morjim).

I am launching a new nightlife ticketing platform that features dynamic promoter/PR bidding and direct venue payouts.

Give me an aggressive, hyper-practical 90-day Go-To-Market execution plan to solve the cold-start chicken-and-egg problem:
1. Club Acquisition (Target: 20 clubs in 30 days): Exact pitch deck hook, objection handling (e.g., "We already use SortMyScene/BookMyShow", "Our PRs handle everything on WhatsApp"), and zero-friction onboarding offer.
2. Top PR Recruitment (Target: 50 active PRs): How to incentivize established club PRs to shift their WhatsApp clients to our app.
3. Consumer Demand Generation: Viral guerrilla marketing, college nightlife partnerships (NMIMS, Mithibai, HR College), tourist targeting in Goa, and Instagram/Reels strategies to get the first 10,000 active app users.
```

---

### PROMPT 4: Pitch Deck Outline & Investor Financial Model
*(Ideal for: VC & Business Strategist / o3 / Claude)*

```markdown
Act as an early-stage consumer tech Venture Capitalist and Startup Mentor in India.

Review my startup idea: A dynamic promoter bidding and direct-settlement ticketing platform for Indian nightlife.

Generate:
1. 10-Slide Investor Pitch Deck Structure (Problem, Solution, Secret Sauce, Market Size in India [SAM/SOM], Business Model, Traction Plan, Competitive Advantage over BookMyShow & SortMyScene).
2. Unit Economics Model: Revenue per ticket, customer acquisition cost (CAC), lifetime value (LTV), promoter take-rate, platform margin, and projected 12-month P&L for a pilot in Mumbai.
3. Key Risks & Moats: The top 5 failure modes of nightlife tech in India and the technical/operational moats we must build to ensure high retention.
```

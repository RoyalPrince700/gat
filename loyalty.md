# Accessible Publishers — School Loyalty Reward Framework

**Briefing for Managing Director**  
**Source:** Data Analysis tab → Loyalty preview (Accessible Publishers admin)  
**Data snapshot:** All clean seasons loaded (Aug 2026) — 2,151 school clients, **₦1,260,066,623** total book-purchase spend  
**Status:** Planning model only — points are simulated from uploaded spend, not a live wallet

---

## 1. Executive summary

We have built a **data-driven loyalty reward framework** from historical school book-purchase records. The model answers three practical questions for leadership:

1. **How should schools earn points?** — Default: **1 point per ₦1,000** of verified spend (floor).
2. **What should they receive?** — A **five-rung gift ladder** aligned to spend bands, from jotter & pen at the entry level to phone / TV at strategic accounts.
3. **What will it cost?** — **Gift cost per point** is the main budget lever. Today the planning default is **₦30 per point (~3% of sales if every point were redeemed)**. We are evaluating a move to **₦10 per point (~1% of sales)**.

The Loyalty preview tab in the admin Data Analysis dashboard lets us stress-test earn rate, gift cost, and full redemption scenarios before launch.

---

## 2. How the reward framework works

### 2.1 Earn rule

| Parameter | Default | Meaning |
|-----------|---------|---------|
| **Naira per point** | ₦1,000 | Every ₦1,000 of book spend earns **1 point** (rounded down) |

**Examples**

| Spend | Points earned |
|-------|---------------|
| ₦50,000 | 50 |
| ₦260,000 (median school) | 260 |
| ₦500,000 | 500 |
| ₦1,000,000 | 1,000 |
| ₦5,000,000 | 5,000 |

Points are **not cash** — they are planning units that map to physical gifts on the ladder below.

### 2.2 Gift cost per point (budget lever)

**Gift cost per point** is the assumed **planning cost** of fulfilling one redeemed point. It is **not** warehouse or procurement cost; it is the number we use to estimate total gift budget.

| Scenario | Gift cost / point | % of spend (if all points redeemed)* |
|----------|-------------------|--------------------------------------|
| **Low (range floor)** | ₦20 | ~2.0% |
| **Current planning default** | **₦30** | **~3.0%** |
| **Proposed** | **₦10** | **~1.0%** |
| **High (range ceiling)** | ₦50 | ~5.0% |

\*Because earn rate is 1 point per ₦1,000, gift cost per point ÷ ₦1,000 equals the effective reward rate as a share of sales (e.g. ₦10 ÷ ₦1,000 = **1%**).

### 2.3 Gift cost range

The model uses a **planning range of ₦20–₦50 per point** to bracket uncertainty:

- **₦20** — lean programme; gifts stay modest; ~2% of sales at full redemption.
- **₦30** — current conservative default; ~3% of sales.
- **₦50** — premium positioning; ~5% of sales; suitable only if gifts must feel visibly high-value.

**Proposed direction:** Adopt **₦10 per point** as the operating assumption — a deliberate **1% reward rate** — while keeping ₦20–₦50 as sensitivity bounds in planning.

---

## 3. Customer segments and loyalty tiers

Schools are grouped by **total spend** so rewards match commercial importance. Segments roll up into five named tiers.

| Segment | Spend band | Loyalty tier | Role in programme |
|---------|------------|--------------|-------------------|
| Occasional | ₦0 – ₦49,999 | Bronze | Low earn; keep cost of rewards tiny |
| Small | ₦50,000 – ₦199,999 | Bronze | Entry tier |
| Core | ₦200,000 – ₦499,999 | Silver | Volume segment; **median school (~₦260k) sits here** |
| Strong | ₦500,000 – ₦999,999 | Gold | Solid repeat buyers; grow into key accounts |
| Key account | ₦1,000,000 – ₦4,999,999 | Platinum | ~Half of revenue — protect and reward |
| Strategic | ₦5,000,000+ | Diamond | White-glove treatment; **not the same gift as a ₦50k buyer** |

**Design intent:** Key and Strategic accounts (₦1m+) drive a disproportionate share of revenue. Their rewards must feel materially different from occasional buyers — same programme, different rung on the ladder.

---

## 4. Suggested gift ladder (reward catalogue)

Each rung defines **minimum points** to qualify. Clients sit in **one exclusive band** (50–249 pts, 250–499 pts, etc.) — not cumulative across every rung.

**Gift value = points at rung × gift cost per point**

### 4.1 At current planning default — ₦30 per point

| Point band | ~Spend to earn | Gift value | Suggested gifts (Nigeria) |
|------------|----------------|------------|---------------------------|
| 50 – 249 | ~₦50k | **₦1,500** (50 pts) | Branded jotter + pen · exercise-book pack · desk notepad |
| 250 – 499 | ~₦250k (median) | **₦7,500** (250 pts) | Lunch flask · umbrella · 10,000mAh power bank · quality diary + pen |
| 500 – 999 | ~₦500k | **₦15,000** (500 pts) | Electric kettle · sandwich maker · rechargeable fan · school backpack |
| 1,000 – 4,999 | ~₦1m | **₦30,000** (1,000 pts) | Table blender · standing fan · rice cooker · pressing iron + kettle |
| 5,000+ | ~₦5m | **₦150,000** (5,000 pts) | Android phone (Infinix/Tecno) · 32″ LED TV · small fridge · microwave |

### 4.2 At proposed rate — ₦10 per point (1%)

| Point band | ~Spend to earn | Gift value | Notes |
|------------|----------------|------------|-------|
| 50 – 249 | ~₦50k | **₦500** (50 pts) | Entry gift stays symbolic; protects budget on long tail |
| 250 – 499 | ~₦250k | **₦2,500** (250 pts) | Still meaningful for median school |
| 500 – 999 | ~₦500k | **₦5,000** (500 pts) | Mid-tier household / school items |
| 1,000 – 4,999 | ~₦1m | **₦10,000** (1,000 pts) | Recognises key accounts without over-spending |
| 5,000+ | ~₦5m | **₦50,000** (5,000 pts) | Strategic tier remains differentiated |

### 4.3 Gift range comparison (selected rungs)

| Rung (points) | ₦20/pt | **₦30/pt (current)** | **₦10/pt (proposed)** | ₦50/pt |
|---------------|--------|----------------------|-------------------------|--------|
| 50 | ₦1,000 | ₦1,500 | **₦500** | ₦2,500 |
| 250 | ₦5,000 | ₦7,500 | **₦2,500** | ₦12,500 |
| 500 | ₦10,000 | ₦15,000 | **₦5,000** | ₦25,000 |
| 1,000 | ₦20,000 | ₦30,000 | **₦10,000** | ₦50,000 |
| 5,000 | ₦100,000 | ₦150,000 | **₦50,000** | ₦250,000 |

---

## 5. Budget impact (full-data snapshot)

Using **2,151 clients** and **₦1,260,066,623** total spend (~**1,260,066 would-be points** at ₦1,000/pt):

| Gift cost / point | Est. gift budget (100% redemption) | Budget vs sales |
|-------------------|-------------------------------------|-----------------|
| ₦20 (range low) | ~₦25.2m | ~2.0% |
| **₦30 (current default)** | **~₦37.8m** | **~3.0%** |
| **₦10 (proposed)** | **~₦12.6m** | **~1.0%** |
| ₦50 (range high) | ~₦63.0m | ~5.0% |

**Important:** In practice, not every client redeems, and not every point is spent in one season. The figures above are a **ceiling** for planning. The Loyalty preview tab also shows **clients per rung** and **rung totals** if everyone in each band took that band’s gift — useful for capping procurement.

---

## 6. Programme design principles (from the analysis)

1. **Spend-proportional rewards** — Points follow money, not flat gifts. Occasional buyers (large share of names, tiny share of revenue) stay cheap to serve.
2. **Tier differentiation** — Platinum / Diamond schools must not receive the same recognition as a ₦50k Bronze buyer.
3. **Trade vs school** — Names flagged as bookshops or distributors should be treated as **trade clients**, not nursery/primary schools, when finalising rules.
4. **Multi-year caution** — 2023-2024 data is thin (~90 schools). Do **not** launch two-year loyalty tiers until **2025-2026** is uploaded and repeat behaviour is reliable.
5. **Planning, not live ledger** — Until go-live, all numbers are simulated from uploaded purchase Excel files on the School purchases screen.

---

## 7. Recommendation for MD decision

| Topic | Current | Proposal |
|-------|---------|----------|
| Earn rate | 1 pt / ₦1,000 | **Keep** — simple, already understood in the preview |
| Gift cost / point | **₦30 (~3%)** | **₦10 (~1%)** — lower burn, still funds a clear ladder |
| Gift range (sensitivity) | ₦20 – ₦50 | **Keep** for best / worst-case budgeting |
| Gift ladder structure | 5 rungs (50 → 5,000 pts) | **Keep** — aligns with natural spend clusters |

**Why ₦10 (1%)?**

- Cuts estimated full-redemption budget from **~₦37.8m to ~₦12.6m** on current data — easier to approve annually.
- Entry gift at 50 points becomes **₦500** instead of ₦1,500 — appropriate for occasional buyers who contribute minimal revenue.
- Strategic accounts at 5,000+ points still receive **₦50,000**-class gifts — visibly different from entry tier.
- Aligns reward cost directly with the **1% of spend** narrative for stakeholders.

**Trade-off to acknowledge:** At ₦10/pt, mid-tier gifts (e.g. ₦5,000 at 500 points) are smaller than at ₦30. Procurement should target high-perceived-value items (branded, useful, school-relevant) rather than headline naira value alone.

---

## 8. Next steps

1. **Confirm** gift cost per point: ₦30 (conservative) vs **₦10 (1% proposal)**.
2. **Load 2025-2026** season data before committing to multi-year or repeat-buyer bonuses.
3. **Finalise** trade-client rules (bookshops / distributors).
4. **Pilot** one season with capped redemption and review actual uptake vs the 100% planning ceiling.
5. **Use** the Loyalty preview tab sliders (Naira per point · Gift cost per point) to re-run scenarios after any policy change.

---

## Appendix — Key definitions

| Term | Definition |
|------|------------|
| **Would-be points** | Sum of `floor(spend ÷ ₦1,000)` across all clients in the selected season view |
| **Est. gift budget** | Would-be points × gift cost per point |
| **Budget vs sales** | Est. gift budget ÷ total sales in the same view |
| **Clients in rung** | Schools whose points fall in that band only (exclusive, not cumulative) |
| **Rung total** | Gift value at that rung × clients in rung (if all in band redeemed that gift) |

*Report generated from the Accessible Publishers loyalty model (`accessibleLoyalty.js` / Data Analysis → Loyalty preview). Figures reflect the Aug 2026 clean all-seasons snapshot; re-open the dashboard for live numbers after new uploads.*

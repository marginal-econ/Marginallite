# Marginalite: Engineering & Assessment Decisions

> **CRITICAL SECURITY NOTICE: LEAKED SUPABASE SERVICE ROLE JWT IN UPSTREAM REPO**
>
> In the upstream Marginal repository (`marginal-econ/Marginal_Upgrade`), `wrangler.jsonc` contained a committed Supabase `service_role` JWT (project ref `srukuuhxloxdukonmual`), also exposed across client-facing `VITE_*` variables.
> **Action taken in Marginalite:**
> 1. Old git history has been completely discarded (`.git` re-initialized fresh).
> 2. No keys, JWTs, URLs, or project references from the upstream project are copied or retained in Marginalite.
> 3. `wrangler.jsonc` now contains only safe non-secret configuration and environment variable bindings.
> 4. `ADMIN_EMAILS` environment variable replaces hardcoded administrative identities.
> 5. An automated secret scanner script (`scripts/secret-scan.ts`) is integrated into `npm run verify` to prevent any JWT (`eyJ...`) or `service_role` literals in tracked code.
> 6. **Urgent upstream advisory:** The owner of Supabase project `srukuuhxloxdukonmual` MUST immediately rotate the JWT secrets, regenerate service_role and anon keys, and scrub commit history.


---

## 0. Initial Green Baseline Audit (Upstream Repo State)

Executed prior to code modifications on fresh `git init` workspace:
1. `npm install --legacy-peer-deps`: Exit 0 (479 packages installed).
2. `npm test`: Exit 0 (29 test files, 417 tests passed).
3. `npm run build`: Exit 0 (Vite SSR + client bundles and Nitro `cloudflare-module` generated in `.output`).
4. `npm run lint`: Exit 1 in upstream codebase due to Prettier formatting differences in scripts/views and unused `any` typings.
5. `npx tsc --noEmit`: Exit 1 in upstream codebase, largely in monetization/pricing (`payment.tsx`, `pricing-plans.ts`), `live-examiner` components, and outdated query types. Both monetization and Live Examiner are designated for complete deletion in Phase 2, which eliminates these type issues at the root.

---

## 1. Domain & Syllabus Taxonomy (Cambridge IGCSE Economics 0455)

The Cambridge IGCSE 0455 syllabus (2027–2029) and past papers (e.g., Feb/March 2026 0455/12 and 0455/22) define the canonical topic hierarchy:

1. **The basic economic problem**
   - 1.1 The nature of the basic economic problem (finite resources and infinite wants, resource allocation decisions, economic and free goods)
   - 1.2 Factors of production (land, labour, capital, enterprise and their rewards: rent, wages, interest, profit; quantity and quality)
   - 1.3 Opportunity cost (definition, decision-making)
   - 1.4 Production possibility curve (PPC) diagrams (under, on, beyond; movements; shifts)

2. **The allocation of resources**
   - 2.1 The role of markets in allocating resources
   - 2.2 Demand (law, curve, movements vs shifts)
   - 2.3 Supply (law, curve, movements vs shifts)
   - 2.4 Price determination (equilibrium, disequilibrium, shortages and surpluses)
   - 2.5 Price changes
   - 2.6 Price elasticity of demand (PED) (calculation, elastic, inelastic, unitary, determinants, revenue impact)
   - 2.7 Price elasticity of supply (PES) (calculation, determinants)
   - 2.8 Market economic system (advantages and disadvantages)
   - 2.9 Market failure (public, merit, demerit goods, externalities, monopoly power)
   - 2.10 Mixed economic system (maximum/minimum prices, indirect taxes, subsidies, regulation, privatisation, nationalisation, direct provision, quotas)

3. **Microeconomic decision-makers**
   - 3.1 Money and banking (functions, central bank vs commercial banks)
   - 3.2 Households (spending, saving, borrowing influences)
   - 3.3 Workers (wage and non-wage factors, wage determination, trade unions, NMW, wage differences, labour mobility, division of labour)
   - 3.4 Firms (sectors, small vs large, mergers, economies and diseconomies of scale)
   - 3.5 Firms and production (demand for factors, labour- vs capital-intensive, production vs productivity)
   - 3.6 Firms' costs, revenue and objectives (TC, ATC, FC, AFC, VC, AVC, TR, AR, objectives: survival, social welfare, profit maximisation, growth)
   - 3.7 Types of markets (competitive markets vs monopoly markets)

4. **Government and the macroeconomy**
   - 4.1 Government macroeconomic intervention (aims: growth, employment, price stability, balance of payments, redistribution, environmental sustainability; conflicts)
   - 4.2 Fiscal policy (budget, deficit/surplus, reasons for spending, taxation types, fiscal measures)
   - 4.3 Monetary policy (money supply, interest rate, exchange rate)
   - 4.4 Supply-side policy (education, training, infrastructure, deregulation, lower direct taxes)
   - 4.5 Economic growth (real GDP, recession causes & consequences, policies)
   - 4.6 Employment and unemployment (measurement, types: frictional, structural, cyclical, seasonal, policies)
   - 4.7 Inflation (measurement CPI, demand-pull, cost-push, consequences, policies)

5. **Economic development**
   - 5.1 Living standards (real GDP per head, HDI and its components: education, life expectancy, income)
   - 5.2 Poverty (absolute vs relative, causes, policies)
   - 5.3 Population (birth/death rates, net migration, optimum population)
   - 5.4 Differences in economic development between countries

6. **International trade and globalisation**
   - 6.1 Specialisation and free trade (by country, advantages & disadvantages)
   - 6.2 Globalisation and trade restrictions (MNCs, tariffs, quotas, subsidies, embargoes, reasons for protection)
   - 6.3 Foreign exchange rates (floating rates, appreciation, depreciation, demand/supply for currency)
   - 6.4 Current account of the balance of payments (trade in goods, trade in services, primary income, secondary income; deficit and surplus causes & remedies)

---

## 2. Assessment Eras: Legacy (up to June 2026) vs New (2027–2029)

Cambridge 0455 undergoes a structural revision starting with the 2027 examination series:

| Dimension | Legacy Era (≤ June 2026) | New Era (2027–2029) |
|---|---|---|
| **Paper 1 (MCQ)** | 30 questions, 30 marks, 45 minutes (2700s) | 40 questions, 40 marks, 60 minutes (3600s) |
| **Paper 2 (Structured)** | 90 marks, 2 hours 15 minutes (8100s). Section A: Q1 (20 marks, parts a–h). Section B: Answer 3 of 4 (20 marks each: parts a=2, b=4, c=6, d=8). | 80 marks, 2 hours (7200s). Section A: Q1 (20 marks, parts a–f). Section B: Answer 3 of 4 (20 marks each: 20-mark total per question). |
| **AO Weightings** | AO1 ~40-43%, AO2 ~45-47%, AO3 ~10-15% | Overall: AO1 43%, AO2 47%, AO3 10%. P1: AO1 50%, AO2 50%, AO3 0%. P2: AO1 40%, AO2 45%, AO3 15%. |
| **Pace Hint** | 90 seconds / MCQ question | 90 seconds / MCQ question |

**Era Auto-Detection Rule:**
- Examination year ≤ 2025: `legacy`
- Year 2026: Series `m` (Feb/March 2026) and `s` (May/June 2026) are `legacy`. Series `w` (Oct/Nov 2026) or specimen papers for 2027+ are `2027`.
- Year ≥ 2027: `2027`.
- In case of cover page conflict, cover page question count (30 vs 40) or duration (45 min vs 1 hour) is authoritative.
- Admin override available per paper.

---

## 3. Question Tariffs Derived from 0455/22 Mark Scheme

| Question Part / Marks | Command Words | Assessment Model | Source Reference in 0455/22 MS |
|---|---|---|---|
| **1 mark** | Calculate, Identify, State | 1 accurate value / item | Q1(a): Remittances calc ($2.79bn); MS p. 8 |
| **2 marks** | State, Identify, Explain, Define | Point marking: 2 distinct items or 1 identified + 1 explained, or 2 definition criteria | Q1(b) 2 influences (1+1); Q1(c) 1 cause + 1 explain (1+1); Q2(a) scarcity & unlimited wants (1+1); Q5(a) non-rival + non-excludable (1+1); MS p. 8, 13, 26 |
| **4 marks** | Explain, Draw | Point + Development marking: 2 developed points × 2 marks (1 mark identify/point + 1 mark explanation/development). For diagrams: 4 points (axes, curves, shift, equilibrium). | Q1(d) 4 marks current account; Q1(e) D&S diagram (axes 1, curves 1, shift 1, equilibria 1); Q2(b) 2 reasons × 2 marks; Q3(b) 2 policies × 2 marks; Q4(b) 2 reasons × 2 marks; MS p. 8, 9, 14, 18, 22 |
| **5 marks** | Analyse (data) | Point marking: relationship (up to 2), evidence from data (up to 2), explanation (up to 2), exception + explanation (up to 2), max 5. | Q1(f) GDP per head vs poverty; MS p. 10 |
| **6 marks** | Analyse, Discuss | Point + Development: 3 developed points × 2 marks (or 2-sided discuss: up to 4 on one side, up to 4 on other, max 6). Max 3 for simple list. | Q1(g) Fiscal policy & HDI (max 4 on either side); Q1(h) Gold PED; Q2(c) Food access (max 3 for listing); Q3(c) State-owned firms; Q4(c) Competitive vs monopoly; Q5(c) Reduce pollution; MS p. 11, 12, 15, 19, 23, 27 |
| **8 marks** | Discuss | Levels-based marking (3 Levels): Level 3 (6–8 marks) reasoned two-sided discussion with clear analysis & thoughtful evaluation; Level 2 (3–5 marks) reasoned discussion, may lack depth or be one-sided; Level 1 (1–2 marks) simple attempt; Level 0 (0 marks). | Q2(d) Income tax on rich; Q3(d) Fixed exchange rate; Q4(d) Trade union membership; Q5(d) Living standards emigrate; MS p. 16–17, 20–21, 24–25, 28–29 |

---

## 4. Elimination of Live Examiner and Monetisation

- **Live Examiner:** Completely excised. All routes, components, server functions, types, and DB schemas removed. Main examiner (`src/lib/examiner/*`) preserved and retargeted to 0455.
- **Monetisation:** All pricing plans, subscription tiers, coupons, checkout routes, UPI/Razorpay/Stripe references, and quota locks removed. All features are open to authenticated users.
- **Abuse Guard:** Quiet rate limiter implemented in application layer (configurable requests per hour per user, default 30 essay gradings/hr, 60 vision OCR calls/hr) returning friendly throttling message without mentioning pricing, plans, or upgrades. Admins are exempt.

---

## 5. Visual Palette: Pink Theme Overhaul

- Shifted primary chromatic palette from purple/violet/indigo (hue ~280–305) to rose/pink (hue ~345–360).
- Primary light: `oklch(0.62 0.22 355)` with high-contrast foreground `oklch(0.99 0.01 350)`.
- Primary dark: `oklch(0.76 0.17 354)` with high-contrast foreground `oklch(0.12 0.03 350)`.
- Chart series re-indexed to ensure distinct hues while keeping pink lead.
- Destructive red maintained distinctly around hue 25–30.
- All SVG icons, favicons, logos, and PWA manifests refreshed with Marginalite branding in pink.

---

## 6. Copyright Notice Regarding Cambridge Past Papers

Past exam papers, question papers, mark schemes, and syllabuses are the intellectual property of Cambridge University Press & Assessment (UCLES). In accordance with educational fair use and Cambridge centre usage guidelines, documents in Marginalite are stored in a private storage bucket (`igcse-papers`), served strictly to authenticated students and teachers for non-commercial educational practice, and never distributed publicly.

/**
 * Cambridge IGCSE Economics (0455) Full-Blown Grading Calibration & Accuracy Benchmark.
 *
 * Benchmarks Marginalite's live Essay Grader (`gradeEssay`) and Data Response Grader
 * (`markDataResponseQuestion`) against:
 *  - Part 1: All 20 REAL Cambridge On-Screen Marked responses from 0455/22/F/M/26
 *            (Candidate Marks Report: 77/90 across 1a–1h, 3a–3d, 4a–4d, 5a–5d)
 *  - Part 2: 10 Cambridge 0455 Low / Middle / Boundary-Trap calibration scripts
 *            (0/2 misconception, 1/2 partial, 2/4 list-only, 3/6 listing cap,
 *             1/6 inverted diagram, 4/6 static cap, 2/8 L1, 5/8 one-sided L2 cap,
 *             3/8 inverted macro mechanism, 4/8 static L2 cap).
 *
 * Run:
 *   bun --env-file=.env run scripts/test-0455-calibration-benchmark.ts
 */

import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "../src/integrations/backend/client.server";
import { gradeEssay } from "../src/lib/examiner/grade.server";
import { defaultSplitForMaxMark } from "../src/lib/examiner/config";
import { markDataResponseQuestion } from "../src/lib/data-response/marking-engine.server";
import { PRELOADED_DATA_RESPONSE_PAPERS } from "../src/lib/data-response/preloaded-papers";

export interface EssayBenchmarkCase {
  id: string;
  source: "REAL_CAMBRIDGE_M26" | "CAMBRIDGE_BOUNDARY_ECR";
  questionNumber: string;
  question: string;
  maxMark: number;
  actualMark: number;
  tolerance?: number; // default 0 for exact, 1 for acceptable ±1 range on boundary cases
  band: "top" | "middle" | "bottom";
  candidateAnswer: string;
  cambridgeNotes: string;
}

export interface DrBenchmarkCase {
  id: string;
  questionNumber: string;
  maxMark: number;
  actualMark: number;
  candidateAnswer: string;
  cambridgeNotes: string;
}

// ============================================================================
// PART 1A: REAL CAMBRIDGE 0455/22 F/M 2026 SECTION A (8 PARTS, ACTUAL = 22/30)
// ============================================================================
export const REAL_M26_SECTION_A: DrBenchmarkCase[] = [
  {
    id: "m26_1a",
    questionNumber: "1(a)",
    maxMark: 1,
    actualMark: 1,
    candidateAnswer: "9/100 x 31 billion = 2.79 billion (Amount of remittance).",
    cambridgeNotes: "Tick (1/1): Exact calculation $2.79bn.",
  },
  {
    id: "m26_1b",
    questionNumber: "1(b)",
    maxMark: 2,
    actualMark: 2,
    candidateAnswer: "High interest rates and consumer confidence.",
    cambridgeNotes: "2 ticks (2/2): interest rates (1), confidence (1).",
  },
  {
    id: "m26_1c",
    questionNumber: "1(c)",
    maxMark: 2,
    actualMark: 2,
    candidateAnswer:
      "Senegal's extreme heat and droughts. High temperature and less water means that soil fertility may be low, leading to less quality of land and produce.",
    cambridgeNotes: "2 ticks (2/2): droughts/extreme heat (1) -> low soil fertility / lower land quality (1).",
  },
  {
    id: "m26_1d",
    questionNumber: "1(d)",
    maxMark: 4,
    actualMark: 3,
    candidateAnswer:
      "Capital goods increase production capacity. Capital increases production rates, which means more supply of sorghum and rice crops. Excess supply can increase exports and lead to improvement of current account deficit.\n\nCapital goods give absolute advantage. Increased use of capital rises productivity and decrease production, gaining absolute advantage, which increase international competitiveness and rising export, leading to current account improvement.",
    cambridgeNotes:
      "3/4: Credited production rates/productivity (BOD, 1), more supply (1), increase exports/improve current account deficit (1). Marked TV (too vague) on 'production capacity' and 'absolute advantage', and wrote 'decrease production' instead of 'decrease costs of production'.",
  },
  {
    id: "m26_1e",
    questionNumber: "1(e)",
    maxMark: 4,
    actualMark: 4,
    candidateAnswer:
      "[DIAGRAM: Market for Sorghum crops. Vertical axis labelled 'Price' with P and P1 (higher). Horizontal axis labelled 'Quantity' with Q and Q1 (higher). Upward-sloping supply curve S and downward-sloping demand curve D. Demand curve shifted rightward to D1 with rightward shift arrows. Original equilibrium at (P, Q) and new higher equilibrium at (P1, Q1) shown with dashed projection lines to both axes.]",
    cambridgeNotes: "4/4 ticks: Axes Price & Quantity (1), D & S labelled (1), D shifted right to D1 (1), P/Q and P1/Q1 equilibriums shown (1).",
  },
  {
    id: "m26_1f",
    questionNumber: "1(f)",
    maxMark: 5,
    actualMark: 1,
    candidateAnswer:
      "Higher GDP per head has a negative/inverse relation with % of population in poverty. Evidence includes Canada with GDP per head of $55,520 and poverty rate in population of only 0.7%. Another example is Iceland with GDP per head of $73,500 and zero poverty. Reason could be that higher GDP per head means more production and higher income. More income means lower levels of absolute poverty, as they can afford basic necessities, and higher living standards. An exception is Romania as it has a GDP per head of $15,820, comparatively higher than other countries, but has a poverty % in population of 7.1%. This could be because the demographic of Romania is low, leading to higher GDP per head. Other reason like low government spending on welfare may be applicable (can increase poverty).",
    cambridgeNotes:
      "1/5 (strict Cambridge mark): Credited inverse/negative relationship (1). Cross (X) on Romania exception — real exception is Papua New Guinea ($3,010 GDP/head, 80.0% poverty) vs Senegal ($1,600 GDP/head, 75.6% poverty). Did not contrast high-GDP/low-poverty with low-GDP/high-poverty cleanly.",
  },
  {
    id: "m26_1g",
    questionNumber: "1(g)",
    maxMark: 6,
    actualMark: 4,
    candidateAnswer:
      "Fiscal policies include government spending and taxation. Expansionary fiscal may benefit HDI.\n\nLower taxation can lead to higher income - as the Senegal government reduces taxation, disposable income of consumer increase. Higher income increases income index of HDI, leading to better quality of life.\n\nIncreased government spending rises quality of healthcare and education. More government spending in Senegal on healthcare can increase life expectancy and literacy rates increasing healthcare and education index in HDI.\n\nOn the other hand, increased government spending on these healthcare/education has opportunity cost. Increasing spending by Senegalese government on education decreases spending on supply-side subsidies, leading to lower production and decreased income affecting HDI's income index.\n\nIn conclusion, fiscal policy may not work in long term as in future it creates tax burden and inflation.",
    cambridgeNotes:
      "4/6: Credited lower taxation -> higher disposable income/income index (2), government spending on healthcare -> higher life expectancy (2). Counter-argument about supply-side subsidies & brief conclusion were too weak/uncredited.",
  },
  {
    id: "m26_1h",
    questionNumber: "1(h)",
    maxMark: 6,
    actualMark: 5,
    candidateAnswer:
      "Price elasticity of demand is % change in quantity demanded / % change in price.\n\nPrice may become inelastic due to higher income. Senegal's fiscal policy may increase production and increase income. Higher income means less proportion of income spent on gold, leading to inelastic PED.\n\nOn the other hand, increase substitutes for gold can make it elastic. As more substitute for gold like diamonds in Senegal rises, the PED may become elastic as other options are available to consumers.\n\nAlso, gold may not be considered as a necessity. Gold may be viewed as a veblen good and as a consumer want. Therefore a change in price means higher change in demand, leading to an elastic PED.\n\nTherefore, PED depends on social attitudes, as if it is viewed as a necessity PED may change accordingly.",
    cambridgeNotes:
      "5/6: Credited higher income (1) -> smaller proportion of income spent on gold (1), more substitutes (1) -> e.g. diamonds BOD (1), not a necessity / luxury want (1). Conclusion marked REP (repetition = 0).",
  },
];

// ============================================================================
// PART 1B: REAL CAMBRIDGE 0455/22 F/M 2026 SECTION B (12 PARTS, ACTUAL = 55/60)
// ============================================================================
export const REAL_M26_SECTION_B: EssayBenchmarkCase[] = [
  {
    id: "m26_3a",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "3(a)",
    question: "Identify two causes of an increase in the demand for bank loans.",
    maxMark: 2,
    actualMark: 1,
    band: "middle",
    candidateAnswer: "Higher income, low interest rates and consumer confidence high.",
    cambridgeNotes:
      "1/2: Official MS rule 'The reasons must relate to an increase.' 'Higher income' (1 tick) relates to a change; 'low interest rates' and 'consumer confidence high' got omission carets (^) because they are static states rather than 'fall in interest rates' / 'increase in confidence'.",
  },
  {
    id: "m26_3b",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "3(b)",
    question: "Explain two supply-side policy measures, other than privatisation.",
    maxMark: 4,
    actualMark: 4,
    band: "top",
    candidateAnswer:
      "Education and training - government policy relation to education increase skill level and productivity of workers. More productivity increases aggregate supply and economic growth.\n\nSubsidies - financial grants provided by government that reduce production cost for firm. This leads to higher rates of production and economic growth in long run due to high production capacity.",
    cambridgeNotes: "4/4: Education and training (1) -> higher productivity (1); Subsidies (1) -> reduce production cost / increase output (1).",
  },
  {
    id: "m26_3c",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "3(c)",
    question: "Analyse how state-owned firms may benefit a country's population.",
    maxMark: 6,
    actualMark: 6,
    band: "top",
    candidateAnswer:
      "Lower prices - State owned government can provide lower prices for consumer than private, as they don't have to focus on profit maximisation. This mean low priced product, higher consumer quality of life and less absolute poverty.\n\nMore jobs - state-owned firms may provide more secure job opportunities and higher income. As state-owned firms grow more workers are employed and they gain higher income. More disposable income leads to less poverty, lower unemployment and economic growth.\n\nState-owned firm offer more fringe benefits and non-wage factors. SOE provide worker with benefit like free transportation and more sick days, which increase incentive and productivity of workers, leading to economic growth and less mental stress, leading to higher quality of life in long term.",
    cambridgeNotes: "6/6: 6 distinct developed ticks across lower prices/non-profit/less poverty, job security/higher income, and fringe benefits/quality of life.",
  },
  {
    id: "m26_3d",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "3(d)",
    question: "Discuss whether or not having a fixed exchange rate will benefit an economy.",
    maxMark: 8,
    actualMark: 8,
    band: "top",
    candidateAnswer:
      "An exchange rate is a value of one currency in terms of another. Fixed exchange rate is controlled by government.\n\nA fixed exchange rate increase certainty and promotes economic growth. As the exchange rates are fixed, domestic firms may be more confident to invest, as they know the exact amount required to import capital and export. Increased confidence leads to more production and economic growth.\n\nA fixed exchange rate also increases Foreign direct investment and MNC. As fixed rates increases certainty, foreign investor are more likely to invest as their confidence is high. It may also attract MNC, as no fluctuation in exchange rates means more stability, leading to economic growth.\n\nSpeculation can be reduced - a fixed exchange rate may reduce investor speculation and flow of hot money. It means that the country can avoid increased demand or low supply, and hoarding of currency, leading to more exports and BOP stability in long term. It helps prevent rapid appreciation depreciation.\n\nOn the other hand, a fixed exchange rate is extremely inefficient for the government. As the constant need for change in exchange rate may increase administrative cost and decrease effectiveness of other policies like monetary. This leads to long term instability and less independence for government, leading to ineffective use of policies.\n\nAlso fixed exchange rates need high amount of foreign reserves and cannot benefit from auto stabilisation. As increasing the value of currency through revaluation may means borrowing foreign currency, the government debt may increase. Also if there are constant rise or fall in demand, the government cannot act quickly leading to inefficient production and low economic growth, or excess demand or excess supply (Disequilibrium).\n\nIn conclusion, a fixed exchange rate may only be positive if a country has a large foreign reserve. But, other methods like banded floating may be more effective.",
    cambridgeNotes: "8/8 (Top of Level 3): Thorough two-sided analysis (certainty/investment, FDI/MNCs, reduced speculation vs policy conflict/loss of monetary independence, high foreign reserve requirement/no auto-stabilisation) + clear conditional evaluation.",
  },
  {
    id: "m26_4a",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "4(a)",
    question: "Give the formula for price elasticity of supply.",
    maxMark: 2,
    actualMark: 2,
    band: "top",
    candidateAnswer: "% change in supply quantity divided by % change in price.",
    cambridgeNotes: "2/2: Correct percentage change in quantity supplied / percentage change in price.",
  },
  {
    id: "m26_4b",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "4(b)",
    question: "Explain two reasons why a worker may choose to work long hours.",
    maxMark: 4,
    actualMark: 4,
    band: "top",
    candidateAnswer:
      "Higher income - working longer hours may mean higher income and higher ability to buy product. Overtime pay may be available, therefore may choose to work.\n\nJob satisfaction and chance of promotion - workers may choose to work longer hours if they enjoy what they are doing or incentivised for chance of career growth that can be achieved through longer hours, eventually leading to higher income.",
    cambridgeNotes: "4/4: Higher income/overtime -> afford products (2); job satisfaction/promotion -> career growth (2).",
  },
  {
    id: "m26_4c",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "4(c)",
    question: "Analyse how a competitive market differs from a monopoly market.",
    maxMark: 6,
    actualMark: 6,
    band: "top",
    candidateAnswer:
      "Many suppliers vs single supplier - a competitive market may have many suppliers and large number of buyers, while monopolies have only one supplier and many buyers. In a competitive market firms are price takers as their demand is elastic due to higher number of substitutes, while monopolies are price makers as there is no substitutes and PED is inelastic. A competitive market may have lower prices and higher quality due to firms aiming to get profit, but a monopoly may be x-inefficient, leading to low quality products and higher prices from lack of competition. A monopoly takes up more than 70% of market share and can put artificial barrier of entry using predatory pricing and using economies of scale, while a competitive market has evenly distributed market shares and cannot benefit from economies of scale.",
    cambridgeNotes: "6/6: 6+ distinct contrast ticks (many vs one supplier, price takers vs price makers, elastic vs inelastic PED, lower prices/higher quality vs higher prices, barriers to entry/economies of scale).",
  },
  {
    id: "m26_4d",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "4(d)",
    question: "Discuss whether or not trade union membership is likely to increase.",
    maxMark: 8,
    actualMark: 6,
    band: "top",
    candidateAnswer:
      "Trade union is organisation of workers bargaining/representing to improve wages and working condition.\n\nTrade union membership may rise due to population growth. As the world population continues to grow, more workers enter the labour force, leading to more chance of worker joining unions, increasing membership of trade unions in long run.\n\nTrade union may increase in membership to increase wages - worker may need higher wages due to inflation, leading to more worker joining the union to increase collective bargaining powers. Increasing bargaining power and use of industrial action can help workers, and more future membership.\n\nMore membership may occur due to training provision - trade union offer their member workshop and training which increase skill and productivity of workers. This may incentivise more worker to join union.\n\nOn the other hand, higher membership cost can demotivate membership. If trade union charge higher cost to fund industrial action, worker may lose a lot of their disposable income, leading to less incentive to join unions.\n\nAlso, if trade union constantly push for higher wages, increase unemployment can decrease membership. If the union is constantly in industrial action, rate of production may be low, leading to less revenue for firms, and lay off of workers, leading to a decrease in memberships.\n\nIn conclusion, trade union help protect working condition, but the skill levels and productivity of other worker and their aims, may be a reason for increase in memberships.",
    cambridgeNotes:
      "6/8 (Bottom of Level 3): Both sides developed (population/labour force, wage bargaining/inflation, training vs membership fees, industrial action/unemployment) so enters L3, but chains are moderate and conclusion is vague/weak rather than a sharp comparative judgement.",
  },
  {
    id: "m26_5a",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "5(a)",
    question: "Define 'public good'.",
    maxMark: 2,
    actualMark: 2,
    band: "top",
    candidateAnswer: "Goods that are non-rival and non-excludable are public goods. Example is street lights.",
    cambridgeNotes: "2/2: non-rival (1) and non-excludable (1).",
  },
  {
    id: "m26_5b",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "5(b)",
    question: "Explain two reasons why young workers may be more mobile than older workers.",
    maxMark: 4,
    actualMark: 4,
    band: "top",
    candidateAnswer:
      "Less family ties - as young workers are less likely to have family ties that fix them, they are more geographically mobile, as they can move to different region for work easily.\n\nMore skilled - younger workers may be more skilled leading to higher productivity and higher occupational mobility. As young workers can easily learn and switch jobs, they can work in different areas easily.",
    cambridgeNotes: "4/4: Less family ties -> geographically mobile (2); more skilled/able to learn -> occupationally mobile (2).",
  },
  {
    id: "m26_5c",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "5(c)",
    question: "Analyse how a government could reduce pollution.",
    maxMark: 6,
    actualMark: 6,
    band: "top",
    candidateAnswer:
      "Increased taxation on petrol cars - the government may increase taxes on petrol cars through VAT/indirect taxes, causing an increase in prices, leading to less use of cars and less pollution as negative externalities.\n\nSubsidies for green goods / EV cars - the government may provide grants financially for EV car firms to increase production and lower prices on these cars, increasing the use of them, and less of petrol cars.\n\nIncreased regulations - increased regulation on what to produce and ban of certain raw material can decrease production of harmful goods that increase pollution. Use of embargos and quotas on foreign petrol car imports can reduce pollution too, as imports are banned or limited supply increases prices.",
    cambridgeNotes: "6/6: Indirect tax -> higher price -> less car use (3 ticks); Subsidies -> lower EV price/higher output (2 ticks); Regulations/bans (1 tick).",
  },
  {
    id: "m26_5d",
    source: "REAL_CAMBRIDGE_M26",
    questionNumber: "5(d)",
    question: "Discuss whether or not people who emigrate will always enjoy a higher living standard.",
    maxMark: 8,
    actualMark: 6,
    band: "top",
    candidateAnswer:
      "Emigration is when workers/individual move out of the country. Living standards are measured through HDI.\n\nEmigrants may have high living standard due to low income tax. Some foreign countries like Dubai has low income tax that increases disposable income, leading to low chance of absolute poverty and increase in income index of HDI.\n\nEmigrants may have high quality of life due to free education. Some countries like USA offer free education. This may increase skill of emigrants, while improving literacy rates, increasing education index of HDI.\n\nEmigrants may have high quality of life due to cheap quality healthcare. Some countries like Netherlands offer cheap quality healthcare, which may benefit emigrants, as their health and productivity are improved and higher life expectancy can improve healthcare index of HDI.\n\nOn the other hand, high living costs can reduce quality of life for emigrants. Some place like California in US have high living cost. High cost leads to less ability of consumer to spend on necessity, leading to chances of poverty / relative poverty increasing for emigrants.\n\nAlso, the political and social situation matter. For example, the current US regulation on Indian visa and regulation has lowered living standards of emigrants. Also discrimination and social view may cause worker wages to be low, leading to low living standard.\n\nTherefore, quality of life and living standard depends on which country the emigrants are moving to. It depends on that country's government and their political situation. As emigrating to areas of danger like Palestine is not advisable.",
    cambridgeNotes:
      "6/8 (Bottom of Level 3): Both sides covered (lower tax, education, healthcare vs high living cost, discrimination/visa rules) + conditional summary, but FOR paragraphs are repetitive/brief on causal mechanisms ('free education -> literacy' for adult emigrants) so sits at L3 bottom (6/8) rather than 8/8.",
  },
];

// ============================================================================
// PART 2: CAMBRIDGE 0455 LOW / MIDDLE / BOUNDARY-TRAP ECR CALIBRATION SCRIPTS
// ============================================================================
export const CAMBRIDGE_BOUNDARY_CASES: EssayBenchmarkCase[] = [
  {
    id: "ecr_2m_zero",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "5(a)",
    question: "Define 'public good'.",
    maxMark: 2,
    actualMark: 0,
    band: "bottom",
    candidateAnswer: "A public good is a good provided by the government such as education and healthcare that helps the public.",
    cambridgeNotes: "0/2: Classic Cambridge 0455 misconception — confuses public good (non-rival, non-excludable) with merit/state-provided goods.",
  },
  {
    id: "ecr_2m_partial",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "4(a)",
    question: "Give the formula for price elasticity of supply.",
    maxMark: 2,
    actualMark: 1,
    band: "middle",
    candidateAnswer: "Change in quantity supplied divided by change in price.",
    cambridgeNotes: "1/2: Official 0455/22/F/M/26 MS explicitly awards 1 mark (missing 'percentage').",
  },
  {
    id: "ecr_4m_list_only",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "3(b)",
    question: "Explain two supply-side policy measures, other than privatisation.",
    maxMark: 4,
    actualMark: 2,
    band: "middle",
    candidateAnswer: "Two supply-side policy measures are improving education and reducing direct taxes.",
    cambridgeNotes: "2/4: Identifies two valid policies (1+1) with zero explanation of impact/objective (0+0).",
  },
  {
    id: "ecr_6m_list_cap",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "5(c)",
    question: "Analyse how a government could reduce pollution.",
    maxMark: 6,
    actualMark: 3,
    band: "middle",
    candidateAnswer:
      "A government could reduce pollution by putting taxes on polluting firms, giving subsidies for electric cars, passing strict regulations and fines, providing better public transport, and running advertising campaigns.",
    cambridgeNotes: "3/6 (Max 3 listing cap): Official 0455 MS explicitly states 'Note: Listing any methods Max 3 marks.' Lists 5 valid methods with zero chains of analysis.",
  },
  {
    id: "ecr_6m_inverted_diagram",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "4(c)",
    question: "Analyse, using a demand and supply diagram, the effect of an indirect tax on the market for sugary drinks.",
    maxMark: 6,
    actualMark: 2,
    band: "bottom",
    candidateAnswer:
      "[DIAGRAM: Vertical axis Price (P), Horizontal axis Quantity (Q). Original demand D and supply S1. New supply curve S2 shifted to the RIGHT, showing lower price P2 and higher quantity Q2.]\n\nWhen the government imposes an indirect tax on sugary drinks, firms get more money so supply increases and shifts right, lowering prices and encouraging people to buy more.",
    cambridgeNotes: "2/6: Correct axes (1) and original D/S curves (1), but fatal inversion of supply shift (tax shifts S left, not right) -> 0 for shift, 0 for equilibrium, 0 for analysis.",
  },
  {
    id: "ecr_8m_l1_descriptive",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "2(d)",
    question: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
    maxMark: 8,
    actualMark: 2,
    band: "bottom",
    candidateAnswer:
      "Income tax is a direct tax on people's wages. The rich have a lot of money so the government can tax them more to get money for the country. However, rich people might not like paying high taxes because they lose their money.",
    cambridgeNotes: "2/8 (Level 1): Simple attempt using basic definition and assertions without economic analysis chains.",
  },
  {
    id: "ecr_8m_l2_onesided",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "3(d)",
    question: "Discuss whether or not having a fixed exchange rate will benefit an economy.",
    maxMark: 8,
    actualMark: 5,
    band: "middle",
    candidateAnswer:
      "A fixed exchange rate is one where the value of the currency is fixed by the government or central bank against another currency. Operating a fixed exchange rate eliminates exchange rate fluctuations and creates certainty for domestic exporters and importers. Because firms know the exact future price of imported raw materials and exported goods, they can plan budgets accurately and are more confident to invest in new capital equipment, which increases productive capacity and promotes economic growth.\n\nFurthermore, exchange rate stability attracts Foreign Direct Investment (FDI) and Multinational Companies (MNCs) who want predictable returns without the risk of currency depreciation eroding profits. This inflow of FDI creates jobs, lowers unemployment, and transfers new technology. Finally, a credible fixed exchange rate discourages speculative hot money flows and can keep imported inflation low if pegged to a low-inflation currency.",
    cambridgeNotes:
      "5/8 (Level 2 Max): Strong, well-developed economic analysis on WHY IT MIGHT benefit, but completely ONE-SIDED (zero counter-arguments). Cambridge 0455 Table A strictly caps one-sided Discuss answers in Level 2 (max 5/8).",
  },
  {
    id: "ecr_8m_l2_inverted_macro",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "4(d)",
    question: "Discuss whether or not a rise in the rate of interest will reduce inflation.",
    maxMark: 8,
    actualMark: 2,
    band: "bottom",
    candidateAnswer:
      "Inflation is a sustained rise in the general price level. When the central bank raises interest rates, borrowing becomes cheaper so households take out more loans and spend more money. Firms also invest more, which increases total demand and lowers prices. However, higher interest rates make people save less money which can be bad for banks. Therefore raising interest rates always stops inflation.",
    cambridgeNotes: "2/8 (Level 1/low L2): Accurate inflation definition, but fatally inverts the monetary policy transmission mechanism (higher interest rates make borrowing MORE expensive and encourage saving).",
  },
  {
    id: "ecr_8m_l2_static",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "4(d)",
    question: "Discuss whether or not trade union membership is likely to increase.",
    maxMark: 8,
    actualMark: 4,
    band: "middle",
    candidateAnswer:
      "Trade unions are organisations of workers that negotiate for better pay and working conditions. Trade union membership is high because workers want higher wages, job security, and protection from unfair dismissal through collective bargaining. On the other hand, trade union membership is low because some workers do not want to pay membership fees and some governments restrict union power through laws.",
    cambridgeNotes:
      "4/8 (Max L2 Static cap): Official 0455/22/F/M/26 Q4(d) MS states 'Note: Static response = Max L2 Max 4'. Explains why membership is high/low statically rather than why it is likely to INCREASE or NOT INCREASE in the future, with light development.",
  },
  {
    id: "ecr_8m_l2_mid_both_thin",
    source: "CAMBRIDGE_BOUNDARY_ECR",
    questionNumber: "5(d)",
    question: "Discuss whether or not people who emigrate will always enjoy a higher living standard.",
    maxMark: 8,
    actualMark: 5,
    band: "middle",
    candidateAnswer:
      "Emigrants may enjoy a higher living standard if they move to a developed country with higher wages and better job opportunities. Higher wages increase their disposable income so they can afford better housing, food, and healthcare, raising their material standard of living. However, emigrants may not enjoy a higher living standard if the host country has a much higher cost of living and inflation, which erodes their real income. They may also face language barriers or discrimination when looking for work.",
    cambridgeNotes:
      "5/8 (Top of Level 2): Touches both sides accurately with clear basic analysis, but lacks depth, extended multi-step development, and evaluative judgement needed to enter Level 3 (6–8).",
  },
];

async function runBenchmark() {
  const mode = process.argv.includes("--section-b-only")
    ? "section_b"
    : process.argv.includes("--dr-only")
      ? "dr"
      : "all";

  console.log("============================================================================");
  console.log("  CAMBRIDGE IGCSE ECONOMICS (0455) FULL-BLOWN CALIBRATION BENCHMARK SUITE");
  console.log("============================================================================\n");

  const results: Array<{
    id: string;
    group: string;
    tariff: number;
    actual: number;
    predicted: number;
    diff: number;
    absErr: number;
    band?: string;
    model?: string;
    latencyMs: number;
    notes: string;
  }> = [];

  // ── 1. SECTION A DATA RESPONSE (REAL 0455/22 F/M 2026 SENEGAL) ──
  if (mode === "all" || mode === "dr") {
    console.log(">>> PART 1A: REAL 0455/22 F/M 2026 SECTION A DATA RESPONSE (8 PARTS, ACTUAL = 22/30)");
    const senegal = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === "0455_22_2026_fm");
    if (!senegal) throw new Error("Missing 0455_22_2026_fm Senegal paper in preloaded-papers.ts");

    for (const tc of REAL_M26_SECTION_A) {
      const q = senegal.questions.find((qq) => qq.number === tc.questionNumber);
      if (!q) throw new Error(`Missing question ${tc.questionNumber} on Senegal paper`);
      const t0 = Date.now();
      const res = await markDataResponseQuestion({
        extract: senegal.extract,
        question: q,
        studentAnswer: tc.candidateAnswer,
      });
      const pred = res.awardedMark;
      const diff = pred - tc.actualMark;
      const absErr = Math.abs(diff);
      const status = absErr === 0 ? "EXACT" : absErr === 1 ? "±1 OK" : "MISS ";
      console.log(
        `  [${status}] ${tc.questionNumber.padEnd(4)} (${tc.maxMark}m) | Actual=${tc.actualMark} Pred=${pred} (diff=${diff >= 0 ? "+" : ""}${diff}) | ${Date.now() - t0}ms`,
      );
      results.push({
        id: tc.id,
        group: "REAL_M26_DR",
        tariff: tc.maxMark,
        actual: tc.actualMark,
        predicted: pred,
        diff,
        absErr,
        latencyMs: Date.now() - t0,
        notes: res.examinerRationale || "",
      });
    }
  }

  // ── 2. SECTION B ESSAYS (REAL 0455/22 F/M 2026 + CAMBRIDGE BOUNDARY ECRs) ──
  if (mode === "all" || mode === "section_b") {
    const essayCases = [...REAL_M26_SECTION_B, ...CAMBRIDGE_BOUNDARY_CASES];
    console.log(`\n>>> PART 1B & 2: ESSAY GRADER (${REAL_M26_SECTION_B.length} REAL M26 + ${CAMBRIDGE_BOUNDARY_CASES.length} BOUNDARY ECR = ${essayCases.length} CASES)`);

    for (const tc of essayCases) {
      const t0 = Date.now();
      const outcome = await gradeEssay(supabaseAdmin, {
        question: tc.question,
        essayText: tc.candidateAnswer,
        maxMark: tc.maxMark,
        split: defaultSplitForMaxMark(tc.maxMark, undefined, tc.question),
      });
      const g = outcome.grading;
      const pred = g.total_mark;
      const diff = pred - tc.actualMark;
      const absErr = Math.abs(diff);
      const status = absErr === 0 ? "EXACT" : absErr === 1 ? "±1 OK" : "MISS ";
      console.log(
        `  [${status}] ${tc.id.padEnd(23)} (${tc.maxMark}m) | Actual=${tc.actualMark} Pred=${pred} (diff=${diff >= 0 ? "+" : ""}${diff}) | ${g.band} | ${outcome.model} | ${Date.now() - t0}ms`,
      );
      results.push({
        id: tc.id,
        group: tc.source,
        tariff: tc.maxMark,
        actual: tc.actualMark,
        predicted: pred,
        diff,
        absErr,
        band: g.band,
        model: outcome.model,
        latencyMs: Date.now() - t0,
        notes: g.examiner_summary || "",
      });
    }
  }

  // ── SUMMARY METRICS ──
  const total = results.length;
  const exact = results.filter((r) => r.absErr === 0).length;
  const within1 = results.filter((r) => r.absErr <= 1).length;
  const mae = results.reduce((s, r) => s + r.absErr, 0) / Math.max(1, total);
  const bias = results.reduce((s, r) => s + r.diff, 0) / Math.max(1, total);

  const realM26 = results.filter((r) => r.group === "REAL_M26_DR" || r.group === "REAL_CAMBRIDGE_M26");
  const realActualSum = realM26.reduce((s, r) => s + r.actual, 0);
  const realPredSum = realM26.reduce((s, r) => s + r.predicted, 0);

  console.log("\n============================================================================");
  console.log("                         CALIBRATION BENCHMARK SUMMARY                      ");
  console.log("============================================================================");
  console.log(`Total Cases Evaluated:  ${total}`);
  console.log(`Exact Mark Match:       ${exact}/${total} (${((exact / total) * 100).toFixed(1)}%)`);
  console.log(`Within ±1 Mark:         ${within1}/${total} (${((within1 / total) * 100).toFixed(1)}%)`);
  console.log(`Mean Absolute Error:    ${mae.toFixed(2)} marks`);
  console.log(`Mean Signed Bias:       ${bias >= 0 ? "+" : ""}${bias.toFixed(2)} marks (${bias > 0.2 ? "LENIENT" : bias < -0.2 ? "HARSH" : "BALANCED"})`);
  if (realM26.length > 0) {
    console.log(`Real 0455/22 F/M/26:    Predicted ${realPredSum}/${realM26.reduce((s, r) => s + r.tariff, 0)} vs Official Cambridge ${realActualSum}/${realM26.reduce((s, r) => s + r.tariff, 0)} (delta=${realPredSum - realActualSum >= 0 ? "+" : ""}${realPredSum - realActualSum})`);
  }

  console.log("\nPer-Tariff Breakdown:");
  for (const tariff of [1, 2, 4, 5, 6, 8]) {
    const bucket = results.filter((r) => r.tariff === tariff);
    if (bucket.length === 0) continue;
    const bExact = bucket.filter((r) => r.absErr === 0).length;
    const bW1 = bucket.filter((r) => r.absErr <= 1).length;
    const bMae = bucket.reduce((s, r) => s + r.absErr, 0) / bucket.length;
    const bBias = bucket.reduce((s, r) => s + r.diff, 0) / bucket.length;
    console.log(
      `  ${tariff}m (${String(bucket.length).padStart(2)} cases): Exact=${bExact}/${bucket.length} | ±1=${bW1}/${bucket.length} | MAE=${bMae.toFixed(2)} | Bias=${bBias >= 0 ? "+" : ""}${bBias.toFixed(2)}`,
    );
  }

  const misses = results.filter((r) => r.absErr >= 2);
  if (misses.length > 0) {
    console.log(`\nLarge Misses (|err| >= 2): ${misses.length}`);
    for (const m of misses) {
      console.log(`  - ${m.id} (${m.tariff}m): Actual=${m.actual}, Pred=${m.predicted} (${m.diff >= 0 ? "+" : ""}${m.diff}) | ${m.notes.slice(0, 140)}`);
    }
  }

  const outPath = path.resolve(
    "C:/Users/Saikrish/.gemini/antigravity/brain/90b3b804-d5a9-4736-8bb5-020c470b808d/scratch",
    `benchmark-report-${Date.now()}.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify({ summary: { total, exact, within1, mae, bias, realActualSum, realPredSum }, results }, null, 2));
  console.log(`\nDetailed JSON saved to: ${outPath}`);
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});

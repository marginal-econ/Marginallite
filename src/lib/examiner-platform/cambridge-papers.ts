/**
 * Cambridge IGCSE Economics 0455 Paper Specifications.
 * Rebuilt directly from official Question Papers and Mark Schemes.
 */

export type CambridgeQuestionSpec = {
  number: string; // e.g. "1(a)", "2(a)", "2(b)"
  title: string;
  maxMark: number;
  tariff: {
    ao1: number;
    ao2: number;
    ao3: number;
  };
  hasDiagramRequirement: boolean;
  syllabusTopic: string;
  markingGuide: string;
};

export type CambridgePaperConfig = {
  subjectCode: "0455";
  subjectTitle: string;
  qualification: "igcse";
  era: "legacy" | "2027";
  paperNumber: string; // "12", "22"
  series: string; // "2026_feb_march"
  totalMarks: number;
  durationMinutes: number;
  questions: CambridgeQuestionSpec[];
};

export const CAMBRIDGE_0455_PAPERS: Record<string, CambridgePaperConfig> = {
  "0455_22_2026_fm": {
    subjectCode: "0455",
    subjectTitle: "Cambridge IGCSE Economics (0455)",
    qualification: "igcse",
    era: "legacy",
    paperNumber: "22",
    series: "2026_feb_march",
    totalMarks: 90,
    durationMinutes: 135, // 2 hours 15 minutes
    questions: [
      // ── Section A (Compulsory Question 1, 20 marks) ──
      {
        number: "1(a)",
        title: "Calculate the value of Senegal's workers' remittances in 2023.",
        maxMark: 1,
        tariff: { ao1: 1, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "6.3 Foreign exchange rates / remittances",
        markingGuide: "$2.79bn (1). Accept: 2.79bn or ($)2.8bn, ($)2 790 000 000, 2.79 x 10^9. Do not accept $2.7bn.",
      },
      {
        number: "1(b)",
        title: "Identify two influences on household spending in Senegal.",
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.2 Households",
        markingGuide: "Two from: income/wages/remittances (1), interest rates (1), confidence (1). Consider first 3 if more than 2 given.",
      },
      {
        number: "1(c)",
        title: "Explain one cause of a decrease in the quality of land used in agriculture in Senegal.",
        maxMark: 2,
        tariff: { ao1: 1, ao2: 1, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "1.2 Factors of production",
        markingGuide: "One mark for reason identified: droughts / extreme heat / weather (1). One mark for explanation: reduce/degrade fertility of land / kill off crops / reduced yield (1).",
      },
      {
        number: "1(d)",
        title: "Explain how greater use of capital equipment in agriculture could reduce the deficit on Senegal's current account of its balance of payments.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "6.4 Current account of the balance of payments",
        markingGuide: "May increase productivity/output/production (1) reduce costs of production (1) lower price of agricultural goods/increase price competitiveness (1) improve quality (1) grow variety of crops (1) reduce imports (1) increase exports (1) reduce deficit/create surplus (1). Max 4.",
      },
      {
        number: "1(e)",
        title: "Draw a demand and supply diagram to show how more people trying to lose weight would affect the market for sorghum.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: true,
        syllabusTopic: "2.2 Demand / 2.5 Price changes",
        markingGuide: "Axes correctly labelled P and Q (1). Original D and S curves correctly labelled (1). New demand curve shifted to the right, with label (1). Equilibriums shown by P1, Q1 and P2, Q2 or E1, E2 (1).",
      },
      {
        number: "1(f)",
        title: "Analyse the relationship between GDP per head and the percentage of the population living in poverty.",
        maxMark: 5,
        tariff: { ao1: 1, ao2: 4, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "5.1 Living standards / 5.2 Poverty",
        markingGuide: "Relationship (up to 2 marks): indirect/negative/inverse (1) as GDP per head falls, poverty rises (1). Evidence (up to 2 marks) citing country pairs. Explanation (up to 2 marks): low access to necessities/healthcare. Exception (up to 2 marks): Papua New Guinea vs Senegal. Max 5 marks.",
      },
      {
        number: "1(g)",
        title: "Discuss whether or not fiscal policy measures will increase a country's HDI value.",
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        syllabusTopic: "4.2 Fiscal policy / 5.1 Living standards",
        markingGuide: "Up to 4 marks for logical reasons why it might (increased spending on education/healthcare, higher taxes on demerit goods, expansionary policy). Up to 4 marks for why it might not (reduced spending, contractionary policy, tax evasion, inflation). Max 6 marks.",
      },
      {
        number: "1(h)",
        title: "Discuss whether or not the demand for gold will be more price-elastic in the future.",
        maxMark: 6,
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: false,
        syllabusTopic: "2.6 Price elasticity of demand (PED)",
        markingGuide: "Up to 4 marks for why it might (more substitutes, proportion of income, luxury, longer time period). Up to 4 marks for why it might not (income rises, addictive/habitual, derived demand, investment/necessity). Max 6 marks.",
      },

      // ── Section B (Structured Questions 2–5, 20 marks each) ──
      // Question 2
      {
        number: "2(a)",
        title: "State why the economic problem exists.",
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "1.1 The nature of the basic economic problem",
        markingGuide: "Unlimited / infinite wants (1) exceed limited / finite resources (1). Scarcity (1).",
      },
      {
        number: "2(b)",
        title: "Explain two reasons for differences in income distribution between countries.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "5.1 Living standards and income distribution",
        markingGuide: "One mark each for each of two reasons identified and one mark for each of two explanations (2 × 2 = 4).",
      },
      {
        number: "2(c)",
        title: "Analyse how a government could increase the access of low-income households to food.",
        maxMark: 6,
        tariff: { ao1: 0, ao2: 6, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "2.10 Mixed economic system / subsidies",
        markingGuide: "Coherent analysis (Pure AO2 Analysis: 3 developed points × 2 marks OR 2 in-depth multi-link analytical chains × 3 marks). Subsidies to food firms (1) lower costs/prices (1). State benefits (1) raise purchasing power (1). Maximum price (1) below equilibrium (1). Free school meals/direct provision (1). Note: Listing any methods Max 3 marks.",
      },
      {
        number: "2(d)",
        title: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
        maxMark: 8,
        tariff: { ao1: 2, ao2: 3, ao3: 3 },
        hasDiagramRequirement: false,
        syllabusTopic: "4.2 Fiscal policy / taxation",
        markingGuide: "Level 3 (6–8 marks): Reasoned two-sided discussion with clear analysis and thoughtful evaluation. Level 2 (3–5 marks): Reasoned discussion with economic analysis, may lack depth or be one-sided. Level 1 (1–2 marks): Simple attempt with economic definitions/terminology. Level 0 (0 marks).",
      },

      // Question 3
      {
        number: "3(a)",
        title: "Identify two causes of an increase in the demand for bank loans.",
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.1 Money and banking",
        markingGuide: "Two from: fall in interest rates (1), rise in investment opportunities / firms expanding (1), increase in confidence (1), recession / unemployment (1), inflation (1), successful bank advertising (1).",
      },
      {
        number: "3(b)",
        title: "Explain two supply-side policy measures, other than privatisation.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "4.4 Supply-side policy",
        markingGuide: "One mark for the policy and one additional mark for its impact/objective (2 × 2 = 4). Improved education, training, deregulation, cut in direct taxes, cut in unemployment benefits, subsidies.",
      },
      {
        number: "3(c)",
        title: "Analyse how state-owned firms may benefit a country's population.",
        maxMark: 6,
        tariff: { ao1: 0, ao2: 6, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.4 Firms / 2.10 Mixed economic system",
        markingGuide: "Pure AO2 Analysis (3 developed points × 2m OR 2 in-depth chains × 3m). Pay tax / reinvest profits in R&D and public services (1+1). Social welfare objective: keep prices low, access to necessities (1+1). High employment & job security (1+1). Produce merit goods / reduce market failure (1+1). Provide public goods (1+1). Max 3 for listing.",
      },
      {
        number: "3(d)",
        title: "Discuss whether or not having a fixed exchange rate will benefit an economy.",
        maxMark: 8,
        tariff: { ao1: 2, ao2: 3, ao3: 3 },
        hasDiagramRequirement: false,
        syllabusTopic: "6.3 Foreign exchange rates",
        markingGuide: "Level 3 (6–8 marks): Reasoned discussion accurately examining both sides (certainty, trade predictability vs large reserves required, loss of independent monetary policy). Level 2 (3–5 marks). Level 1 (1–2 marks).",
      },

      // Question 4
      {
        number: "4(a)",
        title: "Give the formula for price elasticity of supply.",
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "2.7 Price elasticity of supply (PES)",
        markingGuide: "Percentage change in quantity supplied / Percentage change in price (2 marks). 1 mark if 'percentage' omitted or inverted.",
      },
      {
        number: "4(b)",
        title: "Explain two reasons why a worker may choose to work long hours.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.3 Workers",
        markingGuide: "One mark each for each of two reasons identified and one mark each for explanation (2 × 2 = 4). Higher total pay for consumption/saving; increase skills/experience for promotion; job satisfaction; vocation; meet a deadline.",
      },
      {
        number: "4(c)",
        title: "Analyse how a competitive market differs from a monopoly market.",
        maxMark: 6,
        tariff: { ao1: 0, ao2: 6, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.7 Types of markets",
        markingGuide: "Pure AO2 Analysis (3 developed points × 2m OR 2 in-depth chains × 3m). Number of firms: many vs one (1+1). Barriers to entry: easy vs high (1+1). Price: price takers vs price makers (1+1). Economies of scale (1+1). PED: elastic vs inelastic (1+1). Profit: lower vs higher (1+1). Max 3 for listing.",
      },
      {
        number: "4(d)",
        title: "Discuss whether or not trade union membership is likely to increase.",
        maxMark: 8,
        tariff: { ao1: 2, ao2: 3, ao3: 3 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.3 Workers / Trade unions",
        markingGuide: "Level 3 (6–8 marks): Reasoned two-sided discussion (worker numbers, subscriptions fall, declining conditions vs unemployment rising, anti-union laws, public sector contraction). Level 2 (3–5 marks). Level 1 (1–2 marks).",
      },

      // Question 5
      {
        number: "5(a)",
        title: "Define 'public good'.",
        maxMark: 2,
        tariff: { ao1: 2, ao2: 0, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "2.9 Market failure",
        markingGuide: "A good that is non-rival (1) non-excludable (1). Also accept non-rejectable (1).",
      },
      {
        number: "5(b)",
        title: "Explain two reasons why young workers may be more mobile than older workers.",
        maxMark: 4,
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "3.3 Workers / Mobility of labour",
        markingGuide: "One mark each for each of two reasons identified and one mark for each explanation (2 × 2 = 4). More skilled/qualified / social media aware -> occupationally mobile; fewer family ties / fitter -> geographically mobile.",
      },
      {
        number: "5(c)",
        title: "Analyse how a government could reduce pollution.",
        maxMark: 6,
        tariff: { ao1: 0, ao2: 6, ao3: 0 },
        hasDiagramRequirement: false,
        syllabusTopic: "2.10 Mixed economic system / Market failure",
        markingGuide: "Pure AO2 Analysis (3 developed points × 2m OR 2 in-depth chains × 3m). Taxes on polluting firms (1+1); taxes on polluting consumption (1+1); subsidies for green technology (1+1); renewable energy promotion (1+1); regulation/bans/fines (1+1); awareness campaigns (1+1); public transport provision (1+1); tradable permits (1+1). Max 3 for listing.",
      },
      {
        number: "5(d)",
        title: "Discuss whether or not people who emigrate will always enjoy higher living standards.",
        maxMark: 8,
        tariff: { ao1: 2, ao2: 3, ao3: 3 },
        hasDiagramRequirement: false,
        syllabusTopic: "5.1 Living standards / 5.3 Population",
        markingGuide: "Level 3 (6–8 marks): Reasoned two-sided discussion (higher employment/wages, healthcare, consumer choice vs lower income per head, high inflation/cost of living, high taxes, discrimination, unsafe environment, remittance burden). Level 2 (3–5 marks). Level 1 (1–2 marks).",
      },
    ],
  },
  "0455_12_2026_fm": {
    subjectCode: "0455",
    subjectTitle: "Cambridge IGCSE Economics (0455)",
    qualification: "igcse",
    era: "legacy",
    paperNumber: "12",
    series: "2026_feb_march",
    totalMarks: 30,
    durationMinutes: 45,
    questions: [],
  },
};

export type ExaminerCustomPaper = {
  id: string;
  title: string;
  subjectCode: "0455" | string;
  subjectTitle?: string;
  qualification?: "igcse" | string;
  paperNumber: string;
  series: string;
  totalMarks: number;
  durationMinutes: number;
  qpUrl?: string | null;
  msUrl?: string | null;
  questions: CambridgeQuestionSpec[];
  isOfficial?: boolean;
  // snake_case aliases
  subject_code?: string;
  paper_number?: string;
  exam_series?: string;
  total_marks?: number;
  duration_minutes?: number;
  qp_url?: string | null;
  ms_url?: string | null;
};

export function listAvailablePapers(): CambridgePaperConfig[] {
  return Object.values(CAMBRIDGE_0455_PAPERS);
}

export function getPaperConfig(paperNumberOrKey: string): CambridgePaperConfig | null {
  if (CAMBRIDGE_0455_PAPERS[paperNumberOrKey]) {
    return CAMBRIDGE_0455_PAPERS[paperNumberOrKey];
  }
  const match = Object.values(CAMBRIDGE_0455_PAPERS).find(
    (p) => p.paperNumber === paperNumberOrKey || paperNumberOrKey.includes(p.paperNumber),
  );
  return match ?? CAMBRIDGE_0455_PAPERS["0455_22_2026_fm"] ?? null;
}

export async function getPaperConfigWithDb(
  _subjectCode?: string,
  paperNumber?: string,
  _examSeries?: string,
  _paperId?: string | null,
): Promise<CambridgePaperConfig> {
  const match = getPaperConfig(paperNumber || "22");
  return match || CAMBRIDGE_0455_PAPERS["0455_22_2026_fm"];
}

// Aliases for compatibility
export const CAMBRIDGE_PAPERS = CAMBRIDGE_0455_PAPERS;

export function getCambridgePaper(paperKey: string): CambridgePaperConfig | null {
  return getPaperConfig(paperKey);
}

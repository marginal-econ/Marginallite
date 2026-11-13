/**
 * Cambridge IGCSE Economics 0455 Gold Calibration Set.
 * Derived verbatim from official 0455/22 February/March 2026 Question Paper & Mark Scheme.
 * Used for AI examiner calibration, bias prevention tests, and regression verification.
 */

export type GoldCalibrationItem = {
  id: string;
  paper: string;
  questionNumber: string;
  commandWord: string;
  question: string;
  maxMark: number;
  expectedMark: number;
  expectedLevel?: string;
  candidateAnswer: string;
  markingGuide: string;
  reason: string;
};

export const IGCSE_0455_GOLD_CALIBRATION_SET: GoldCalibrationItem[] = [
  // ── 2-mark definitions & formulas ──
  {
    id: "0455-m26-22-q5a-full",
    paper: "0455/22/F/M/26",
    questionNumber: "5(a)",
    commandWord: "Define",
    question: "Define 'public good'.",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    candidateAnswer: "A public good is a good that is non-rival in consumption and non-excludable.",
    markingGuide: "Non-rival (1) non-excludable (1). Also accept non-rejectable (1).",
    reason: "Both criteria non-rival and non-excludable are correctly defined.",
  },
  {
    id: "0455-m26-22-q5a-partial",
    paper: "0455/22/F/M/26",
    questionNumber: "5(a)",
    commandWord: "Define",
    question: "Define 'public good'.",
    maxMark: 2,
    expectedMark: 1,
    expectedLevel: "Partial Credit",
    candidateAnswer: "A public good is a good where people cannot be excluded from consuming it once it is provided.",
    markingGuide: "Non-rival (1) non-excludable (1).",
    reason: "Defines non-excludable (1 mark), but omits non-rival (0 marks).",
  },
  {
    id: "0455-m26-22-q5a-zero",
    paper: "0455/22/F/M/26",
    questionNumber: "5(a)",
    commandWord: "Define",
    question: "Define 'public good'.",
    maxMark: 2,
    expectedMark: 0,
    expectedLevel: "Zero Marks",
    candidateAnswer: "A public good is any good that is good for the public to buy in private retail supermarkets.",
    markingGuide: "Non-rival (1) non-excludable (1).",
    reason: "Confuses economic definition with everyday colloquial phrase.",
  },

  // ── 4-mark explain questions (2 points × 2 marks) ──
  {
    id: "0455-m26-22-q2b-4m-full",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    candidateAnswer:
      "One reason is differences in government intervention through taxation and benefits. Countries with more progressive tax systems and generous welfare payments redistribute income more evenly to low-income households. Another reason is differences in education and healthcare provision. Subsidised access to quality education improves worker skills and employment opportunities, leading to higher earning potential and a more equal income distribution.",
    markingGuide: "One mark each for each of two reasons identified and one mark for each of two explanations. Max 4.",
    reason: "Two distinct valid reasons identified and each developed with explanation (2 × 2 = 4).",
  },
  {
    id: "0455-m26-22-q2b-3m",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 3,
    expectedLevel: "Mid-Upper",
    candidateAnswer:
      "One reason is the progressive tax system where the rich pay a higher proportion of their income in tax, which reduces inequality and leads to a more even distribution of income. A second reason is differences in natural resources between countries.",
    markingGuide: "One mark each for each of two reasons identified and one mark for each of two explanations.",
    reason: "Point 1 is identified and explained (2 marks). Point 2 is identified (1 mark) but has no economic explanation (0 development). Total 3.",
  },
  {
    id: "0455-m26-22-q2b-2m-one-developed",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 2,
    expectedLevel: "Mid-Band",
    candidateAnswer:
      "One major reason is government state benefits. In countries with generous unemployment benefits and cash transfers, lower-income households receive extra income, which makes the distribution of income more equal.",
    markingGuide: "One mark each for each of two reasons identified and one mark for each of two explanations.",
    reason: "Only one reason is provided, but it is both identified (1) and explained (1). Total 2.",
  },
  {
    id: "0455-m26-22-q2b-2m-repeated-point",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 2,
    expectedLevel: "No Double Credit",
    candidateAnswer:
      "One reason is progressive taxation, because taxing rich people more and transferring it to the poor makes income distribution less unequal. Another reason is higher income taxes on wealthy people which takes more of their money and redistributes it.",
    markingGuide: "No double-credit: restating the same point in different words is one point.",
    reason: "The candidate restates the progressive taxation point twice. Only one point can be credited (1 identify + 1 explain = 2).",
  },
  {
    id: "0455-m26-22-q2b-1m",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 1,
    expectedLevel: "Lower Band",
    candidateAnswer: "Income distribution differs because countries have different rates of unemployment.",
    markingGuide: "One mark for identified reason.",
    reason: "Identifies unemployment (1 mark), but offers no explanation of how or why it affects distribution.",
  },
  {
    id: "0455-m26-22-q2b-0m",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 0,
    expectedLevel: "Zero",
    candidateAnswer: "People in other countries are happier and spend more time playing football on the weekends.",
    markingGuide: "Zero credit for non-economic or completely irrelevant assertions.",
    reason: "Completely irrelevant content.",
  },

  // ── 6-mark analyse/discuss questions (3 points × 2 marks) ──
  {
    id: "0455-m26-22-q2c-6m-full",
    paper: "0455/22/F/M/26",
    questionNumber: "2(c)",
    commandWord: "Analyse",
    question: "Analyse how a government could increase the access of low-income households to food.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks",
    candidateAnswer:
      "Firstly, the government could subsidise agricultural firms producing food. Subsidies reduce the firms' costs of production and increase market supply, which lowers food prices and makes food more affordable for low-income families. Secondly, the government could increase state benefits such as unemployment benefits. This raises the disposable income and purchasing power of low-income households so they can afford sufficient food. Thirdly, the government could set a maximum price on staple foods below the equilibrium price. This legally limits the price producers can charge, ensuring food is kept cheap for poorer consumers.",
    markingGuide: "3 developed points × 2 marks (identify + explanation). Max 3 for simple listing.",
    reason: "Three coherent, developed methods: subsidies, state benefits, maximum price (3 × 2 = 6).",
  },
  {
    id: "0455-m26-22-q2c-4m",
    paper: "0455/22/F/M/26",
    questionNumber: "2(c)",
    commandWord: "Analyse",
    question: "Analyse how a government could increase the access of low-income households to food.",
    maxMark: 6,
    expectedMark: 4,
    expectedLevel: "Mid-Upper",
    candidateAnswer:
      "A government can give subsidies to food producers. This reduces their production costs and increases supply, lowering the price of food so poor families can buy more. In addition, the government can provide free school meals or food hampers directly, which directly ensures children and low-income families have access to food.",
    markingGuide: "2 developed points = 4 marks.",
    reason: "Two developed points awarded 2 marks each (subsidies + direct provision).",
  },
  {
    id: "0455-m26-22-q2c-2m",
    paper: "0455/22/F/M/26",
    questionNumber: "2(c)",
    commandWord: "Analyse",
    question: "Analyse how a government could increase the access of low-income households to food.",
    maxMark: 6,
    expectedMark: 2,
    expectedLevel: "Lower Mid",
    candidateAnswer:
      "The government can remove indirect sales taxes on food. This reduces the price of food in shops so low-income households find it easier to afford.",
    markingGuide: "1 developed point = 2 marks.",
    reason: "Single developed point: indirect tax removal -> lower price/more affordable.",
  },
  {
    id: "0455-m26-22-q2c-list-only",
    paper: "0455/22/F/M/26",
    questionNumber: "2(c)",
    commandWord: "Analyse",
    question: "Analyse how a government could increase the access of low-income households to food.",
    maxMark: 6,
    expectedMark: 3,
    expectedLevel: "List Cap",
    candidateAnswer:
      "The government could provide subsidies, set a maximum price, remove indirect taxes, give food stamps, and improve education.",
    markingGuide: "Note: Listing any methods Max 3 marks.",
    reason: "Lists 5 valid methods with zero economic development or explanation; capped at 3 marks per MS instruction.",
  },

  // ── 8-mark discuss evaluative questions (Levels 1–3) ──
  {
    id: "0455-m26-22-q2d-8m-l3-top",
    paper: "0455/22/F/M/26",
    questionNumber: "2(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3",
    candidateAnswer:
      "A government should consider imposing a high rate of personal income tax on the rich because the rich have a higher ability to pay without sacrificing basic necessities. This increases government tax revenue, which can be spent on public services such as state education and healthcare. This creates a more progressive tax system and reduces income inequality, improving living standards for the poorest.\n\nHowever, imposing very high rates of income tax can create severe economic disincentives. High tax rates reduce the reward for hard work and enterprise, discouraging entrepreneurs from expanding businesses and investing capital, which can reduce employment and economic growth. Furthermore, high taxes may cause tax evasion or tax avoidance, or encourage wealthy individuals and skilled professionals to emigrate abroad, which could actually reduce total tax revenue collected in the long term.\n\nIn conclusion, whether a government should impose a high tax rate depends on the tax rate chosen and how the revenue is used. If the rate is moderately higher and the revenue is spent effectively on infrastructure and human capital, the benefits to society will outweigh the costs; however, an excessively punitive rate is likely to trigger capital flight and brain drain.",
    markingGuide:
      "Level 3 (6–8 marks): reasoned discussion accurately examining both sides, clear and logical analysis, thoughtful evaluation, uncertainties/conditions identified.",
    reason: "Exemplary Level 3 response with balanced, developed two-sided economic analysis and a reasoned, conditional evaluation.",
  },
  {
    id: "0455-m26-22-q2d-8m-l2-mid",
    paper: "0455/22/F/M/26",
    questionNumber: "2(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
    maxMark: 8,
    expectedMark: 4,
    expectedLevel: "Level 2",
    candidateAnswer:
      "The government should impose high income tax on the rich because it makes taxation more progressive. Wealthy people have higher disposable income, so taxing them allows the government to raise money to fund schools and hospitals for poor people, which reduces poverty and helps income distribution.\n\nOn the other hand, the rich might not like it and might move to another country, which would reduce business investment.",
    markingGuide:
      "Level 2 (3–5 marks): reasoned discussion, but lacks depth or is largely one-sided with limited evaluation.",
    reason: "Good analysis on the 'should' side, but the counter-argument is brief and undeveloped with no reasoned conclusion.",
  },
  {
    id: "0455-m26-22-q2d-8m-l1-low",
    paper: "0455/22/F/M/26",
    questionNumber: "2(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
    maxMark: 8,
    expectedMark: 2,
    expectedLevel: "Level 1",
    candidateAnswer:
      "Income tax is a direct tax on money earned. The rich have a lot of money and the government needs tax money to pay for things.",
    markingGuide: "Level 1 (1–2 marks): simple attempt at using economic definitions and terminology.",
    reason: "Basic definitions and simple statements with occasional understanding; no analytical chain or evaluation.",
  },
];

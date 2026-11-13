export interface PastPaperQuestion {
  id: string;
  paperCode: string; // e.g. "0455/22/F/M/26", "0455/22/M/J/24"
  year: number;
  series: "m" | "s" | "w"; // Feb/March, May/June, Oct/Nov
  variant: 1 | 2 | 3;
  questionNumber: string; // "Q1(d)", "Q2(c)", "Q3(d)"
  marks: number; // 2 | 4 | 6 | 8
  unit: number; // 1 to 6
  stem: string;
  examinerTip: string;
  markSchemePoints: string[];
}

export interface SyllabusTopicAnalytics {
  id: string;
  code: string; // "1.4", "2.6", "4.7", etc.
  title: string;
  section: "Microeconomics" | "Macroeconomics";
  unit: number; // 1 to 6
  unitName: string;
  historicalAppearances: number;
  lastTestedSeries: string;
  seriesElapsed: number;
  examProbabilityIndex: number; // 0 to 100%
  cycleStatus: "overdue" | "normal" | "recent";
  forecastRationale: string;
  questions: PastPaperQuestion[];
}

export const CAMBRIDGE_PAPER_MATRIX_DATA: SyllabusTopicAnalytics[] = [
  // ── Unit 1: The Basic Economic Problem ──
  {
    id: "topic-1-ppc",
    code: "1.4",
    title: "Production Possibility Curves (PPC) & Opportunity Cost",
    section: "Microeconomics",
    unit: 1,
    unitName: "The Basic Economic Problem",
    historicalAppearances: 22,
    lastTestedSeries: "May/June 2024",
    seriesElapsed: 3,
    examProbabilityIndex: 88,
    cycleStatus: "overdue",
    forecastRationale:
      "Frequently tested in Paper 2 Section A data response and Section B structured questions. Usually requires PPC shift diagram showing economic growth or resource reallocation.",
    questions: [
      {
        id: "q-ppc-1",
        paperCode: "0455/22/F/M/26",
        year: 2026,
        series: "m",
        variant: 2,
        questionNumber: "Q1(e)",
        marks: 4,
        unit: 1,
        stem: "Draw a production possibility curve diagram showing the effect of an increase in the quality of labour on an economy.",
        examinerTip:
          "Label both axes clearly (e.g. Consumer goods / Capital goods or Good X / Good Y). Show an outward shift of the entire curve.",
        markSchemePoints: [
          "Axes correctly labelled with two goods or categories (1)",
          "Original production possibility curve shown as downward sloping and concave (1)",
          "New curve shifted outwards to the right (1)",
          "Directional arrow or labels clearly indicating economic growth (1)",
        ],
      },
      {
        id: "q-ppc-2",
        paperCode: "0455/22/M/J/24",
        year: 2024,
        series: "s",
        variant: 2,
        questionNumber: "Q2(b)",
        marks: 4,
        unit: 1,
        stem: "Explain, using examples, the opportunity cost of government spending on healthcare.",
        examinerTip: "Define opportunity cost explicitly (the next best alternative foregone) and give a clear government alternative.",
        markSchemePoints: [
          "Identification of next best alternative foregone (1)",
          "Explanation that government tax revenue and resources are finite (1)",
          "Specific alternative project sacrificed (e.g. education, infrastructure) (1)",
          "Impact of trade-off on citizens' welfare (1)",
        ],
      },
    ],
  },

  // ── Unit 2: The Allocation of Resources ──
  {
    id: "topic-2-ped",
    code: "2.6",
    title: "Price Elasticity of Demand (PED) & Revenue",
    section: "Microeconomics",
    unit: 2,
    unitName: "The Allocation of Resources",
    historicalAppearances: 26,
    lastTestedSeries: "Feb/March 2026",
    seriesElapsed: 1,
    examProbabilityIndex: 84,
    cycleStatus: "recent",
    forecastRationale:
      "Core 0455 topic. Appears across Paper 1 MCQs and Paper 2 subparts (d). Key link between price elasticity and changes in total consumer expenditure/firm revenue.",
    questions: [
      {
        id: "q-ped-1",
        paperCode: "0455/22/F/M/26",
        year: 2026,
        series: "m",
        variant: 2,
        questionNumber: "Q1(h)",
        marks: 6,
        unit: 2,
        stem: "Analyse how price elasticity of demand influences the effect of an increase in price on a firm's total revenue.",
        examinerTip: "Distinguish elastic (|PED| > 1) where price and revenue move inversely, from inelastic (|PED| < 1) where they move in the same direction.",
        markSchemePoints: [
          "Definition of PED formula (%ΔQD / %ΔP) (1)",
          "Explanation of elastic demand: price increase leads to larger % drop in quantity demanded (1)",
          "Resulting in a fall in total revenue (1)",
          "Explanation of inelastic demand: price increase leads to smaller % drop in quantity demanded (1)",
          "Resulting in a rise in total revenue (1)",
          "Unitary elasticity case where revenue remains constant (1)",
        ],
      },
    ],
  },
  {
    id: "topic-2-externality",
    code: "2.9",
    title: "Market Failure & Environmental Externalities",
    section: "Microeconomics",
    unit: 2,
    unitName: "The Allocation of Resources",
    historicalAppearances: 21,
    lastTestedSeries: "Oct/Nov 2024",
    seriesElapsed: 2,
    examProbabilityIndex: 91,
    cycleStatus: "overdue",
    forecastRationale:
      "High probability for Paper 2 Section B 8-mark discussion. Cambridge frequently examines government intervention to tackle pollution or overconsumption of demerit goods.",
    questions: [
      {
        id: "q-ext-1",
        paperCode: "0455/22/O/N/24",
        year: 2024,
        series: "w",
        variant: 2,
        questionNumber: "Q5(d)",
        marks: 8,
        unit: 2,
        stem: "Discuss whether or not government intervention can eliminate market failure caused by pollution.",
        examinerTip:
          "Provide a balanced discussion: tax/regulation advantages on one side, government failure/enforcement costs on the other side.",
        markSchemePoints: [
          "Level 3 (6–8 marks): Two-sided reasoned discussion with supported evaluation.",
          "Taxes internalise external costs, raising price and reducing output (up to 4)",
          "Regulations/fines set strict pollution caps and encourage cleaner technology (up to 4)",
          "Counter-arguments: difficulty in estimating external cost value, risk of firm relocation, tax evasion, enforcement expense (up to 4)",
        ],
      },
    ],
  },

  // ── Unit 3: Microeconomic Decision-Makers ──
  {
    id: "topic-3-unions",
    code: "3.3",
    title: "Trade Unions & Wage Differences",
    section: "Microeconomics",
    unit: 3,
    unitName: "Microeconomic Decision-Makers",
    historicalAppearances: 17,
    lastTestedSeries: "Feb/March 2026",
    seriesElapsed: 1,
    examProbabilityIndex: 72,
    cycleStatus: "recent",
    forecastRationale:
      "Consistently tested in Section B. Questions focus on collective bargaining power, non-wage factors, and differences between skilled and unskilled workers.",
    questions: [
      {
        id: "q-union-1",
        paperCode: "0455/22/F/M/26",
        year: 2026,
        series: "m",
        variant: 2,
        questionNumber: "Q4(d)",
        marks: 8,
        unit: 3,
        stem: "Discuss whether or not all workers would benefit from joining a trade union.",
        examinerTip: "Discuss wage and working condition benefits vs membership dues, risk of industrial action loss of earnings, and employer resistance.",
        markSchemePoints: [
          "Benefits: collective bargaining for higher wages, legal protection, safer working conditions (up to 4)",
          "Drawbacks: membership fees, lost pay during strikes, union agreements may prevent merit-based bonuses (up to 4)",
          "Level 3: Two-sided reasoned discussion with evaluation of worker skill level and union density (6–8 marks)",
        ],
      },
    ],
  },
  {
    id: "topic-3-monopoly",
    code: "3.7",
    title: "Competitive Markets vs Monopoly Markets",
    section: "Microeconomics",
    unit: 3,
    unitName: "Microeconomic Decision-Makers",
    historicalAppearances: 19,
    lastTestedSeries: "May/June 2024",
    seriesElapsed: 3,
    examProbabilityIndex: 86,
    cycleStatus: "overdue",
    forecastRationale:
      "Cyclically due in Section B. Compares single seller market power, barriers to entry, abnormal profits with consumer choice in competitive markets.",
    questions: [
      {
        id: "q-mono-1",
        paperCode: "0455/22/M/J/24",
        year: 2024,
        series: "s",
        variant: 2,
        questionNumber: "Q4(c)",
        marks: 6,
        unit: 3,
        stem: "Analyse the differences between a competitive market and a monopoly market.",
        examinerTip: "Compare number of sellers, barriers to entry, pricing power, and availability of substitutes.",
        markSchemePoints: [
          "Number of firms: many small firms in competitive market vs single seller in monopoly (2)",
          "Barriers to entry: free entry/exit in competition vs high barriers in monopoly (2)",
          "Price setting: price takers in competition vs price makers in monopoly (2)",
          "Product differentiation and abnormal profit longevity (2)",
        ],
      },
    ],
  },

  // ── Unit 4: Government and the Macroeconomy ──
  {
    id: "topic-4-fiscal",
    code: "4.2",
    title: "Fiscal Policy, Taxation & Macro Aims",
    section: "Macroeconomics",
    unit: 4,
    unitName: "Government and the Macroeconomy",
    historicalAppearances: 27,
    lastTestedSeries: "Feb/March 2026",
    seriesElapsed: 1,
    examProbabilityIndex: 94,
    cycleStatus: "recent",
    forecastRationale:
      "Highest historical frequency topic across 0455. Examined virtually every series via direct/indirect taxes, government budget deficits, and public spending impacts.",
    questions: [
      {
        id: "q-fiscal-1",
        paperCode: "0455/22/F/M/26",
        year: 2026,
        series: "m",
        variant: 2,
        questionNumber: "Q2(d)",
        marks: 8,
        unit: 4,
        stem: "Discuss whether or not increasing income tax on high earners will benefit an economy.",
        examinerTip: "Discuss redistribution and revenue gains vs disincentive to enterprise/work and brain drain.",
        markSchemePoints: [
          "Benefits: progressive tax reduces income inequality, generates revenue for merit goods (up to 4)",
          "Drawbacks: disincentive to work longer hours, tax avoidance/evasion, emigration of high-skilled talent (up to 4)",
          "Level 3: Balanced discussion with supported conclusion on net tax revenue yield (6–8 marks)",
        ],
      },
    ],
  },
  {
    id: "topic-4-inflation",
    code: "4.7",
    title: "Inflation: Causes, Consequences & Policies",
    section: "Macroeconomics",
    unit: 4,
    unitName: "Government and the Macroeconomy",
    historicalAppearances: 24,
    lastTestedSeries: "Oct/Nov 2024",
    seriesElapsed: 2,
    examProbabilityIndex: 89,
    cycleStatus: "overdue",
    forecastRationale:
      "Core macroeconomic indicator in 0455. Contrast demand-pull inflation with cost-push inflation and evaluate monetary interest rate response.",
    questions: [
      {
        id: "q-inf-1",
        paperCode: "0455/22/O/N/24",
        year: 2024,
        series: "w",
        variant: 2,
        questionNumber: "Q3(c)",
        marks: 6,
        unit: 4,
        stem: "Analyse the causes of cost-push inflation in an economy.",
        examinerTip: "Explain factors increasing production costs: raw material prices, wage increases exceeding productivity, imported component costs.",
        markSchemePoints: [
          "Definition of inflation as sustained rise in general price level (1)",
          "Higher wages not matched by productivity gains (2)",
          "Increased costs of imported raw materials / currency depreciation (2)",
          "Higher indirect taxes or energy costs shifting aggregate supply inward (2)",
        ],
      },
    ],
  },

  // ── Unit 5: Economic Development ──
  {
    id: "topic-5-living-standards",
    code: "5.1",
    title: "Living Standards, Real GDP Per Head & HDI",
    section: "Macroeconomics",
    unit: 5,
    unitName: "Economic Development",
    historicalAppearances: 18,
    lastTestedSeries: "Feb/March 2026",
    seriesElapsed: 1,
    examProbabilityIndex: 82,
    cycleStatus: "recent",
    forecastRationale:
      "Prominent in Section A Data Response. Tests HDI components (life expectancy, education index, GNI per head) vs simple real GDP per capita.",
    questions: [
      {
        id: "q-hdi-1",
        paperCode: "0455/22/F/M/26",
        year: 2026,
        series: "m",
        variant: 2,
        questionNumber: "Q1(g)",
        marks: 6,
        unit: 5,
        stem: "Discuss whether or not an increase in government spending will increase a country's Human Development Index (HDI).",
        examinerTip: "Directly link spending to HDI dimensions: healthcare (life expectancy), schooling (education), and social transfers.",
        markSchemePoints: [
          "Spending on healthcare raises life expectancy component (up to 4)",
          "Spending on schools and universities raises mean/expected years of schooling (up to 4)",
          "Counter: corruption, wasteful spending on military, inflationary pressures lowering real living standards (up to 4)",
        ],
      },
    ],
  },

  // ── Unit 6: International Trade and Globalisation ──
  {
    id: "topic-6-exchange-rates",
    code: "6.3",
    title: "Foreign Exchange Rates & Floating Currencies",
    section: "Macroeconomics",
    unit: 6,
    unitName: "International Trade and Globalisation",
    historicalAppearances: 23,
    lastTestedSeries: "Feb/March 2026",
    seriesElapsed: 1,
    examProbabilityIndex: 87,
    cycleStatus: "recent",
    forecastRationale:
      "Frequently tested in Section B 8-mark discussions. Explores fixed vs floating exchange rates and how appreciation/depreciation impacts current account balance.",
    questions: [
      {
        id: "q-fx-1",
        paperCode: "0455/22/F/M/26",
        year: 2026,
        series: "m",
        variant: 2,
        questionNumber: "Q3(d)",
        marks: 8,
        unit: 6,
        stem: "Discuss whether or not a country should maintain a fixed foreign exchange rate.",
        examinerTip: "Discuss certainty for international trade and investment vs loss of independent monetary policy and reserve depletion.",
        markSchemePoints: [
          "Benefits: price certainty for exporters/importers, curbs currency speculation, controls inflation (up to 4)",
          "Drawbacks: large foreign currency reserves needed, inability to use interest rates for domestic policy, risk of currency misalignment (up to 4)",
          "Level 3: Two-sided reasoned discussion with clear conclusion (6–8 marks)",
        ],
      },
    ],
  },
  {
    id: "topic-6-current-account",
    code: "6.4",
    title: "Current Account of the Balance of Payments",
    section: "Macroeconomics",
    unit: 6,
    unitName: "International Trade and Globalisation",
    historicalAppearances: 20,
    lastTestedSeries: "May/June 2024",
    seriesElapsed: 3,
    examProbabilityIndex: 90,
    cycleStatus: "overdue",
    forecastRationale:
      "Cyclically due in Paper 2. Focuses on trade in goods, trade in services, primary income, secondary income, and policies to correct a current account deficit.",
    questions: [
      {
        id: "q-bop-1",
        paperCode: "0455/22/M/J/24",
        year: 2024,
        series: "s",
        variant: 2,
        questionNumber: "Q1(d)",
        marks: 4,
        unit: 6,
        stem: "Explain two reasons why a country might experience a deficit on the current account of its balance of payments.",
        examinerTip: "Identify two distinct causes (e.g. overvalued exchange rate, domestic inflation, low quality of domestic goods) and explain each.",
        markSchemePoints: [
          "High domestic inflation making exports less price competitive (2)",
          "Appreciation of the currency making exports expensive and imports cheap (2)",
          "High domestic economic growth stimulating rapid demand for imported consumer goods (2)",
        ],
      },
    ],
  },
];

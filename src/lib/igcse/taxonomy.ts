/**
 * Canonical Cambridge IGCSE Economics (0455) Syllabus Taxonomy.
 * Derived verbatim from the official Cambridge IGCSE Economics 0455 Syllabus (2027-2029).
 */

export type SyllabusSubTopic = {
  id: string; // e.g. "1.1", "2.6"
  number: string;
  name: string;
  unitId: number;
  keywords: string[];
};

export type SyllabusUnit = {
  unitId: number;
  name: string;
  subTopics: SyllabusSubTopic[];
};

export const IGCSE_0455_UNITS: SyllabusUnit[] = [
  {
    unitId: 1,
    name: "The basic economic problem",
    subTopics: [
      {
        id: "1.1",
        number: "1.1",
        name: "The nature of the basic economic problem",
        unitId: 1,
        keywords: [
          "basic economic problem",
          "finite resources",
          "infinite wants",
          "scarcity",
          "resource allocation",
          "what to produce",
          "how to produce",
          "who to produce for",
          "economic goods",
          "free goods",
        ],
      },
      {
        id: "1.2",
        number: "1.2",
        name: "Factors of production",
        unitId: 1,
        keywords: [
          "factors of production",
          "land",
          "labour",
          "capital",
          "enterprise",
          "rent",
          "wages",
          "interest",
          "profit",
          "rewards to factors",
          "quality of factors",
          "quantity of factors",
        ],
      },
      {
        id: "1.3",
        number: "1.3",
        name: "Opportunity cost",
        unitId: 1,
        keywords: [
          "opportunity cost",
          "next best alternative forgone",
          "decision-making",
          "trade-offs",
        ],
      },
      {
        id: "1.4",
        number: "1.4",
        name: "Production possibility curve (PPC) diagrams",
        unitId: 1,
        keywords: [
          "production possibility curve",
          "ppc",
          "ppf",
          "points under on beyond ppc",
          "movements along ppc",
          "shifts of ppc",
          "economic growth ppc",
        ],
      },
    ],
  },
  {
    unitId: 2,
    name: "The allocation of resources",
    subTopics: [
      {
        id: "2.1",
        number: "2.1",
        name: "The role of markets in allocating resources",
        unitId: 2,
        keywords: ["market", "buyers and sellers", "role of markets"],
      },
      {
        id: "2.2",
        number: "2.2",
        name: "Demand",
        unitId: 2,
        keywords: [
          "demand",
          "individual demand",
          "market demand",
          "law of demand",
          "movements along demand curve",
          "extensions and contractions in demand",
          "shifts of demand curve",
          "determinants of demand",
        ],
      },
      {
        id: "2.3",
        number: "2.3",
        name: "Supply",
        unitId: 2,
        keywords: [
          "supply",
          "individual supply",
          "market supply",
          "law of supply",
          "movements along supply curve",
          "extensions and contractions in supply",
          "shifts of supply curve",
          "determinants of supply",
        ],
      },
      {
        id: "2.4",
        number: "2.4",
        name: "Price determination",
        unitId: 2,
        keywords: [
          "price mechanism",
          "market equilibrium",
          "equilibrium price",
          "equilibrium quantity",
          "market disequilibrium",
          "shortage",
          "surplus",
          "excess demand",
          "excess supply",
        ],
      },
      {
        id: "2.5",
        number: "2.5",
        name: "Price changes",
        unitId: 2,
        keywords: ["causes of price changes", "consequences of price changes", "impact of changes in market"],
      },
      {
        id: "2.6",
        number: "2.6",
        name: "Price elasticity of demand (PED)",
        unitId: 2,
        keywords: [
          "price elasticity of demand",
          "ped",
          "ped formula",
          "elastic demand",
          "inelastic demand",
          "unitary elastic",
          "perfectly elastic",
          "perfectly inelastic",
          "determinants of ped",
          "consumer expenditure",
          "revenue and ped",
        ],
      },
      {
        id: "2.7",
        number: "2.7",
        name: "Price elasticity of supply (PES)",
        unitId: 2,
        keywords: [
          "price elasticity of supply",
          "pes",
          "pes formula",
          "elastic supply",
          "inelastic supply",
          "determinants of pes",
        ],
      },
      {
        id: "2.8",
        number: "2.8",
        name: "Market economic system",
        unitId: 2,
        keywords: [
          "market economic system",
          "free market economy",
          "consumer sovereignty",
          "advantages of market economic system",
          "disadvantages of market system",
        ],
      },
      {
        id: "2.9",
        number: "2.9",
        name: "Market failure",
        unitId: 2,
        keywords: [
          "market failure",
          "public goods",
          "merit goods",
          "demerit goods",
          "private benefits",
          "external benefits",
          "social benefits",
          "private costs",
          "external costs",
          "social costs",
          "abuse of monopoly power",
          "non-rival",
          "non-excludable",
        ],
      },
      {
        id: "2.10",
        number: "2.10",
        name: "Mixed economic system",
        unitId: 2,
        keywords: [
          "mixed economic system",
          "maximum price",
          "price ceiling",
          "minimum price",
          "price floor",
          "indirect taxation",
          "subsidies",
          "regulation",
          "privatisation",
          "nationalisation",
          "direct provision",
          "quotas for natural resources",
        ],
      },
    ],
  },
  {
    unitId: 3,
    name: "Microeconomic decision-makers",
    subTopics: [
      {
        id: "3.1",
        number: "3.1",
        name: "Money and banking",
        unitId: 3,
        keywords: [
          "money",
          "forms of money",
          "functions of money",
          "characteristics of money",
          "central bank",
          "commercial bank",
          "bank lending",
          "bank loans",
        ],
      },
      {
        id: "3.2",
        number: "3.2",
        name: "Households",
        unitId: 3,
        keywords: [
          "household spending",
          "household saving",
          "borrowing",
          "disposable income",
          "influences on spending",
        ],
      },
      {
        id: "3.3",
        number: "3.3",
        name: "Workers",
        unitId: 3,
        keywords: [
          "choice of occupation",
          "wage factors",
          "non-wage factors",
          "wage determination",
          "trade unions",
          "collective bargaining",
          "national minimum wage",
          "nmw",
          "differences in wages",
          "mobility of labour",
          "occupational mobility",
          "geographical mobility",
          "division of labour",
          "specialisation of workers",
        ],
      },
      {
        id: "3.4",
        number: "3.4",
        name: "Firms",
        unitId: 3,
        keywords: [
          "primary sector",
          "secondary sector",
          "tertiary sector",
          "small and large firms",
          "mergers",
          "horizontal merger",
          "vertical merger",
          "conglomerate merger",
          "economies of scale",
          "diseconomies of scale",
          "internal economies",
          "external economies",
        ],
      },
      {
        id: "3.5",
        number: "3.5",
        name: "Firms and production",
        unitId: 3,
        keywords: [
          "demand for factors of production",
          "labour-intensive",
          "capital-intensive",
          "production and productivity",
          "productivity",
        ],
      },
      {
        id: "3.6",
        number: "3.6",
        name: "Firms' costs, revenue and objectives",
        unitId: 3,
        keywords: [
          "total cost",
          "tc",
          "average total cost",
          "atc",
          "fixed cost",
          "fc",
          "average fixed cost",
          "afc",
          "variable cost",
          "vc",
          "average variable cost",
          "avc",
          "total revenue",
          "tr",
          "average revenue",
          "ar",
          "profit maximisation",
          "survival",
          "growth",
          "social welfare",
        ],
      },
      {
        id: "3.7",
        number: "3.7",
        name: "Types of markets",
        unitId: 3,
        keywords: [
          "competitive market",
          "monopoly",
          "price taker",
          "price maker",
          "barriers to entry",
          "monopoly power",
        ],
      },
    ],
  },
  {
    unitId: 4,
    name: "Government and the macroeconomy",
    subTopics: [
      {
        id: "4.1",
        number: "4.1",
        name: "Government macroeconomic intervention",
        unitId: 4,
        keywords: [
          "macroeconomic aims",
          "economic growth",
          "full employment",
          "price stability",
          "balance of payments stability",
          "redistribution of income",
          "environmental sustainability",
          "conflicts between aims",
        ],
      },
      {
        id: "4.2",
        number: "4.2",
        name: "Fiscal policy",
        unitId: 4,
        keywords: [
          "fiscal policy",
          "government budget",
          "budget deficit",
          "budget surplus",
          "government spending",
          "taxation",
          "progressive tax",
          "regressive tax",
          "proportional tax",
          "direct tax",
          "indirect tax",
          "expansionary fiscal policy",
          "contractionary fiscal policy",
        ],
      },
      {
        id: "4.3",
        number: "4.3",
        name: "Monetary policy",
        unitId: 4,
        keywords: [
          "monetary policy",
          "money supply",
          "interest rate",
          "expansionary monetary policy",
          "contractionary monetary policy",
        ],
      },
      {
        id: "4.4",
        number: "4.4",
        name: "Supply-side policy",
        unitId: 4,
        keywords: [
          "supply-side policy",
          "education and training",
          "infrastructure spending",
          "labour market reforms",
          "deregulation",
          "incentives to work and invest",
        ],
      },
      {
        id: "4.5",
        number: "4.5",
        name: "Economic growth",
        unitId: 4,
        keywords: [
          "economic growth",
          "real gross domestic product",
          "real gdp",
          "causes of economic growth",
          "consequences of economic growth",
          "recession",
          "causes of recession",
        ],
      },
      {
        id: "4.6",
        number: "4.6",
        name: "Employment and unemployment",
        unitId: 4,
        keywords: [
          "employment",
          "unemployment",
          "full employment",
          "unemployment rate",
          "frictional unemployment",
          "structural unemployment",
          "cyclical unemployment",
          "seasonal unemployment",
        ],
      },
      {
        id: "4.7",
        number: "4.7",
        name: "Inflation",
        unitId: 4,
        keywords: [
          "inflation",
          "deflation",
          "consumer prices index",
          "cpi",
          "demand-pull inflation",
          "cost-push inflation",
          "causes of inflation",
          "consequences of inflation",
        ],
      },
    ],
  },
  {
    unitId: 5,
    name: "Economic development",
    subTopics: [
      {
        id: "5.1",
        number: "5.1",
        name: "Living standards",
        unitId: 5,
        keywords: [
          "living standards",
          "real gdp per head",
          "gdp per capita",
          "human development index",
          "hdi",
          "indicators of living standards",
          "income distribution",
        ],
      },
      {
        id: "5.2",
        number: "5.2",
        name: "Poverty",
        unitId: 5,
        keywords: [
          "poverty",
          "absolute poverty",
          "relative poverty",
          "causes of poverty",
          "policies to alleviate poverty",
        ],
      },
      {
        id: "5.3",
        number: "5.3",
        name: "Population",
        unitId: 5,
        keywords: [
          "population",
          "birth rate",
          "death rate",
          "net migration",
          "immigration",
          "emigration",
          "optimum population",
          "ageing population",
        ],
      },
      {
        id: "5.4",
        number: "5.4",
        name: "Differences in economic development between countries",
        unitId: 5,
        keywords: [
          "differences in economic development",
          "developing country",
          "developed country",
          "international differences",
        ],
      },
    ],
  },
  {
    unitId: 6,
    name: "International trade and globalisation",
    subTopics: [
      {
        id: "6.1",
        number: "6.1",
        name: "Specialisation and free trade",
        unitId: 6,
        keywords: [
          "specialisation by country",
          "free trade",
          "advantages of specialisation",
          "disadvantages of specialisation",
        ],
      },
      {
        id: "6.2",
        number: "6.2",
        name: "Globalisation and trade restrictions",
        unitId: 6,
        keywords: [
          "globalisation",
          "multinational companies",
          "mncs",
          "trade restrictions",
          "tariffs",
          "import quotas",
          "subsidies for domestic firms",
          "embargoes",
          "protectionism",
          "infant industries",
          "dumping",
        ],
      },
      {
        id: "6.3",
        number: "6.3",
        name: "Foreign exchange rates",
        unitId: 6,
        keywords: [
          "foreign exchange rate",
          "floating exchange rate",
          "appreciation",
          "depreciation",
          "demand and supply of currency",
          "remittances",
          "fixed exchange rate",
        ],
      },
      {
        id: "6.4",
        number: "6.4",
        name: "Current account of the balance of payments",
        unitId: 6,
        keywords: [
          "current account",
          "balance of payments",
          "trade in goods",
          "trade in services",
          "primary income",
          "secondary income",
          "current account deficit",
          "current account surplus",
        ],
      },
    ],
  },
];

export const ALL_SUBTOPICS: SyllabusSubTopic[] = IGCSE_0455_UNITS.flatMap((u) => u.subTopics);

/**
 * Classify a question text into an IGCSE 0455 Unit and Sub-Topic.
 */
export function classifyIgcseTopic(text: string): {
  unitId: number;
  unitName: string;
  subTopicId: string;
  subTopicName: string;
} {
  const lower = text.toLowerCase();

  let bestMatch: SyllabusSubTopic | null = null;
  let maxScore = 0;

  for (const sub of ALL_SUBTOPICS) {
    let score = 0;
    for (const kw of sub.keywords) {
      if (lower.includes(kw)) {
        score += kw.split(" ").length; // weight longer phrases
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = sub;
    }
  }

  if (bestMatch && maxScore > 0) {
    const unit = IGCSE_0455_UNITS.find((u) => u.unitId === bestMatch!.unitId)!;
    return {
      unitId: unit.unitId,
      unitName: unit.name,
      subTopicId: bestMatch.id,
      subTopicName: bestMatch.name,
    };
  }

  // Default fallback if no match
  return {
    unitId: 1,
    unitName: IGCSE_0455_UNITS[0].name,
    subTopicId: "1.1",
    subTopicName: IGCSE_0455_UNITS[0].subTopics[0].name,
  };
}

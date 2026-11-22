export type GoldenEssayFixture = {
  id: string;
  title: string;
  tariff: 8 | 12 | 20;
  level: "as" | "a2";
  question: string;
  essayText: string;
  expectedScores: {
    minTotal: number;
    maxTotal: number;
    expectedAo1: number;
    minAo2: number;
    maxAo2: number;
    minAo3: number;
    maxAo3: number;
  };
  dominantAo: "AO1" | "AO2" | "AO3";
  description: string;
};

export const GOLDEN_ESSAYS: GoldenEssayFixture[] = [
  // ---------------------------------------------------------------------------
  // 1. Tariff 8: Weak (AO1-only essay, no analysis or evaluation)
  // ---------------------------------------------------------------------------
  {
    id: "tariff-8-weak-ao1-only",
    title: "8-mark Weak: Pure definitions with zero evaluation",
    tariff: 8,
    level: "as",
    question: "Explain the meaning of price elasticity of demand and its determinants.",
    essayText:
      "Price elasticity of demand (PED) is defined as the responsiveness of quantity demanded to a change in price. It is calculated as the percentage change in quantity demanded divided by the percentage change in price. If PED is greater than 1, demand is price elastic. If PED is less than 1, demand is price inelastic. There are many determinants of elasticity including substitutes, proportion of income, and whether the good is a necessity or luxury.",
    expectedScores: {
      minTotal: 2,
      maxTotal: 3,
      expectedAo1: 2,
      minAo2: 0,
      maxAo2: 1,
      minAo3: 0,
      maxAo3: 0,
    },
    dominantAo: "AO1",
    description: "Accurate textbook definitions (AO1 maxed at 2) but lacks causal chains and has zero evaluation.",
  },

  // ---------------------------------------------------------------------------
  // 2. Tariff 8: Strong (Complete: definition, analysis chain, justified evaluative point)
  // ---------------------------------------------------------------------------
  {
    id: "tariff-8-strong",
    title: "8-mark Strong: Full knowledge, chain, and justified evaluation",
    tariff: 8,
    level: "as",
    question: "Discuss whether maximum prices are effective in protecting low-income consumers.",
    essayText:
      "A maximum price (price ceiling) is a legally enforced threshold set below the free-market equilibrium price. When the government sets a price ceiling on staple goods, it reduces price from Pe to Pmax, which makes the good affordable for low-income households. This leads to an expansion in demand to Qd whilst suppliers contract output to Qs, resulting in excess demand and shortages. However, the effectiveness depends heavily on whether the government rations the good, because without formal rationing, black markets often emerge where goods are sold above the legal price. Therefore, whilst price ceilings lower prices, they are only effective if accompanied by government subsidies or direct state supply to eliminate shortages.",
    expectedScores: {
      minTotal: 5,
      maxTotal: 8,
      expectedAo1: 2,
      minAo2: 2,
      maxAo2: 3,
      minAo3: 1,
      maxAo3: 3,
    },
    dominantAo: "AO2",
    description: "Exemplary 8-marker with crisp definitions, full causal mechanics, and a justified evaluative conclusion.",
  },

  // ---------------------------------------------------------------------------
  // 3. Tariff 12: Weak (Deliberately one-sided: all benefits, 0 evaluation)
  // ---------------------------------------------------------------------------
  {
    id: "tariff-12-weak-one-sided",
    title: "12-mark Weak: Entirely one-sided analysis with no evaluation",
    tariff: 12,
    level: "as",
    question: "Assess whether indirect taxation is the most effective policy to reduce the consumption of demerit goods.",
    essayText:
      "A demerit good is a good that is overprovided and overconsumed in a free market because consumers have imperfect information and ignore negative externalities. An indirect tax is an expenditure tax levied on producers, which shifts the supply curve upwards by the amount of the tax. This leads to an increase in the market price from P1 to P2, which causes consumers to contract their quantity demanded from Q1 to Q2. Consequently, market consumption decreases towards the socially optimum level, eliminating welfare loss and reducing external costs such as healthcare expenditure for the NHS. Therefore indirect taxes solve market failure.",
    expectedScores: {
      minTotal: 4,
      maxTotal: 7,
      expectedAo1: 2,
      minAo2: 3,
      maxAo2: 5,
      minAo3: 0,
      maxAo3: 1,
    },
    dominantAo: "AO2",
    description: "Strong analysis of tax mechanics (AO1: 2/2, AO2: ~4/6), but completely one-sided with no evaluation (AO3: 0/4).",
  },

  // ---------------------------------------------------------------------------
  // 4. Tariff 12: Strong (Balanced, multi-chain, robust evaluation & judgement)
  // ---------------------------------------------------------------------------
  {
    id: "tariff-12-strong",
    title: "12-mark Strong: Balanced two-sided analysis with sustained evaluation",
    tariff: 12,
    level: "as",
    question: "Assess whether indirect taxation is the most effective policy to reduce the consumption of demerit goods.",
    essayText:
      "A demerit good is a good that generates negative externalities in consumption and is overconsumed due to information failure, such as cigarettes. An indirect tax is a tax on spending that raises production costs, shifting the supply curve vertically upwards. This leads to a higher market price, causing a contraction along the demand curve and reducing equilibrium consumption towards the social optimum (MSB = MSC). However, the effectiveness of taxation depends crucially on the price elasticity of demand (PED) for the demerit good. Because addictive demerit goods have highly inelastic demand, an increase in tax will lead to a proportionately smaller fall in quantity demanded, meaning consumption remains high while generating substantial tax revenue for the government. Furthermore, regressive indirect taxes place a disproportionate burden on low-income households and can incentivize illicit black market trade. In conclusion, whilst indirect taxation generates government revenue to fund healthcare, it is not the most effective policy on its own. It must be combined with behavioral nudges and educational advertising to permanently shift consumer preferences and resolve the underlying information failure.",
    expectedScores: {
      minTotal: 10,
      maxTotal: 12,
      expectedAo1: 2,
      minAo2: 5,
      maxAo2: 6,
      minAo3: 3,
      maxAo3: 4,
    },
    dominantAo: "AO2",
    description: "Top-band Cambridge 12-marker with precise definitions, two analytical chains, PED evaluation, and a balanced final judgement.",
  },

  // ---------------------------------------------------------------------------
  // 5. Tariff 20: Weak (Undeveloped assertions, wrong direction, no context)
  // ---------------------------------------------------------------------------
  {
    id: "tariff-20-weak",
    title: "20-mark Weak: Vague narrative with theoretical flaws",
    tariff: 20,
    level: "a2",
    question: "Evaluate whether protectionist policies are always beneficial for developing economies.",
    essayText:
      "Protectionism means protecting domestic firms from foreign competitors using trade barriers. Tariffs are taxes on imports that make imports more expensive. When price goes up, demand shifts left. Developing countries need protectionism so that their infant industries can grow big and compete with foreign multinational companies. Also protectionism creates jobs because domestic firms produce more goods and need more workers. It also helps the balance of payments. In conclusion, protectionism is always good because it makes the country richer and protects jobs.",
    expectedScores: {
      minTotal: 4,
      maxTotal: 8,
      expectedAo1: 1,
      minAo2: 3,
      maxAo2: 6,
      minAo3: 0,
      maxAo3: 2,
    },
    dominantAo: "AO1",
    description: "Superficial 20-marker containing analytical misconception (price rise causes demand shift instead of contraction) and sweeping unsupported conclusions.",
  },

  // ---------------------------------------------------------------------------
  // 6. Tariff 20: Strong (Full Cambridge A2 mastery: 2 Knowledge, 12 Analysis, 6 Evaluation)
  // ---------------------------------------------------------------------------
  {
    id: "tariff-20-strong",
    title: "20-mark Strong: Cambridge A* comprehensive essay with nuanced evaluation",
    tariff: 20,
    level: "a2",
    question: "Evaluate whether protectionist policies are always beneficial for developing economies.",
    essayText:
      "Protectionism refers to government interventions, such as tariffs, quotas, and export subsidies, designed to restrict international trade and shield domestic producers from foreign competition. In developing economies, the primary theoretical justification is the infant industry argument. Nascent firms in developing nations lack the scale to achieve minimum efficient scale (MES) and experience higher average costs than established multinational incumbents. By imposing a tariff on imported manufactured goods, the price of foreign imports increases from Pw to Pw+tariff. This enables domestic producers to expand output along their short-run average cost curves, fostering learning-by-doing and dynamic efficiency. Consequently, employment in high-value secondary sectors expands, diversifying the economy away from volatile primary commodity dependency and alleviating balance of payments deficits. However, protectionism entails substantial economic costs and is rarely 'always beneficial'. Firstly, tariffs distort comparative advantage and generate deadweight consumer and producer welfare losses. Domestic consumers face higher prices and diminished consumer surplus, which disproportionately harms lower-income households. Secondly, shielding domestic monopolies from international rivalry breeds X-inefficiency and complacency; without market discipline, protected firms often fail to innovate or lower long-run average costs. Crucially, the policy risks retaliatory trade barriers from trading partners, which can precipitate a trade war and paralyze developing export sectors. In conclusion, protectionism is not universally beneficial. While temporary, strictly targeted tariffs can nurture competitive advantage in strategic infant industries, perpetual protectionism induces rent-seeking and allocative inefficiency. Ultimately, trade barriers are only successful if paired with sunset clauses, macroeconomic stability, and aggressive domestic infrastructure investment.",
    expectedScores: {
      minTotal: 16,
      maxTotal: 20,
      expectedAo1: 2,
      minAo2: 10,
      maxAo2: 12,
      minAo3: 4,
      maxAo3: 6,
    },
    dominantAo: "AO2",
    description: "Flawless Cambridge 20-mark essay with advanced economics theory (MES, X-inefficiency, dynamic efficiency, deadweight loss, sunset clauses) and multi-layered evaluation.",
  },
];

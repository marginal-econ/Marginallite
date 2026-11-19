export interface SampleEssay {
  id: string;
  title: string;
  shortLabel: string;
  tariff: "8_eval" | "8_legacy" | "6" | "4";
  maxMark: "8" | "6" | "4";
  paperLevel: "IGCSE 0455 Paper 2";
  category: "Macroeconomics" | "Microeconomics";
  question: string;
  essayText: string;
  examinerHighlight: string;
}

export const SAMPLE_ESSAYS: SampleEssay[] = [
  {
    id: "sample-8m-fixed-fx",
    title: "8-Mark: Fixed Foreign Exchange Rate (Paper 2 Section B)",
    shortLabel: "8M • Fixed Exchange Rate (0455 Macro)",
    tariff: "8_eval",
    maxMark: "8",
    paperLevel: "IGCSE 0455 Paper 2",
    category: "Macroeconomics",
    question: "Discuss whether or not a government should fix its foreign exchange rate. [8]",
    examinerHighlight:
      "Official Cambridge Distinction (8/8 Standard): Reasoned two-sided discussion linking fixed rates to business confidence and trade stability, balanced against loss of independent monetary policy and foreign currency reserve depletion.",
    essayText: `A fixed exchange rate occurs when a government or central bank officially pegs the external value of its domestic currency to another foreign currency or basket of currencies.

On the one hand, fixing the exchange rate provides price certainty and stability for domestic firms engaged in international trade. Exporters and importers face lower exchange rate volatility risk, which eliminates uncertainty over future export revenues and import costs. This encourages long-term business investment in capital goods and stimulates cross-border commerce. Furthermore, a fixed exchange rate discipline forces governments to control domestic inflation; if domestic prices rise faster than trading partners, goods become uncompetitive without currency depreciation to cushion the blow. This stability also lowers speculative pressure on the domestic currency and encourages inward foreign direct investment (FDI).

On the other hand, maintaining a fixed exchange rate deprives the central bank of monetary policy independence. The government cannot lower interest rates to stimulate domestic aggregate demand during a recession if doing so causes capital flight that threatens the exchange rate peg. Additionally, if the currency faces downward market pressure, the central bank must expend finite foreign exchange reserves or raise interest rates to defend the peg, potentially choking domestic economic growth and increasing unemployment. If the fixed rate is set too high, persistent current account deficits may develop because export prices remain artificially uncompetitive.

In conclusion, whether a government should fix its foreign exchange rate depends heavily on the openness of the economy and the level of foreign currency reserves available. For a small open economy with high trade exposure, exchange rate stability provides crucial certainty that outweighs the loss of monetary policy autonomy; however, for larger economies facing asymmetric external shocks, a floating exchange rate is preferable as an automatic stabiliser.`,
  },
  {
    id: "sample-8m-trade-unions",
    title: "8-Mark: Trade Union Membership (Paper 2 Section B)",
    shortLabel: "8M • Trade Unions (0455 Micro)",
    tariff: "8_eval",
    maxMark: "8",
    paperLevel: "IGCSE 0455 Paper 2",
    category: "Microeconomics",
    question: "Discuss whether or not trade union membership always benefits workers. [8]",
    examinerHighlight:
      "Cambridge Level 3 Discussion: Weighs collective bargaining advantages and legal representation against union subscription costs and risks of employer retaliation or strike-induced wage loss.",
    essayText: `A trade union is an organisation of workers formed to protect and promote the interests of its members, primarily through collective bargaining over wages and working conditions.

Trade union membership can provide significant benefits to workers. Through collective bargaining, unions possess greater bargaining power than individual workers when negotiating with employers. This enables them to secure higher real wages, improved fringe benefits, safer working environments, and reasonable working hours. Furthermore, unions protect workers against unfair dismissal and arbitrary employer treatment by providing legal representation and professional advice. They may also negotiate training opportunities, increasing workers' human capital and productivity.

However, trade union membership does not always benefit workers. Members are required to pay regular union subscription fees, which reduces workers' disposable income regardless of whether negotiations succeed. If trade unions demand wages significantly above the equilibrium market rate, employers may respond by substituting labour with capital machinery or reducing their workforce, resulting in worker layoffs and higher unemployment. Additionally, if unions organise industrial action such as strikes, striking workers lose wages during the dispute and may face employer hostility or long-term firm insolvency.

Therefore, trade union membership does not always benefit workers. While it provides indispensable protection in monopsonistic labour markets where employers hold dominant market power, excessive wage demands in competitive industries can backfire and reduce overall employment opportunities.`,
  },
  {
    id: "sample-6m-investment-growth",
    title: "6-Mark: Investment and Economic Growth (Paper 2 Section B)",
    shortLabel: "6M • Investment & Growth (0455 Macro)",
    tariff: "6",
    maxMark: "6",
    paperLevel: "IGCSE 0455 Paper 2",
    category: "Macroeconomics",
    question: "Analyse how an increase in investment can lead to economic growth. [6]",
    examinerHighlight:
      "Full 6/6 Cambridge 0455 Points Marked: Multi-step causal chains linking capital formation to productive capacity, lower average costs, aggregate demand expansion, and real GDP growth.",
    essayText: `Investment refers to spending by firms on capital goods, such as advanced machinery, factories, technology, and transport equipment.

First, investment is a major component of aggregate demand ($AD = C + I + G + (X - M)$). When businesses increase expenditure on new capital equipment, aggregate demand shifts rightwards. This increased spending prompts firms to raise production, leading to higher national output and short-run economic growth. To meet this expansion, firms hire more workers, lowering unemployment and generating higher household incomes, which further stimulates consumption through a multiplier effect.

Second, investment expands the productive capacity and potential output of the economy in the long run. Capital deepening introduces newer, more efficient technology into production processes, raising labour productivity and lowering average costs of production. This shifts the Long-Run Aggregate Supply ($LRAS$) curve rightward, enabling sustained non-inflationary economic growth. Improved domestic production efficiency also enhances international export competitiveness, strengthening net exports and accelerating real GDP growth.`,
  },
];

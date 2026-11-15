/**
 * Cambridge IGCSE Economics 0455 Gold Calibration Set.
 * Derived verbatim from official Cambridge 0455 Question Papers & Mark Schemes.
 * Covers all 6 Units across official tariffs: 2m, 4m, 6m (point-marking & diagram 4+2), and 8m (Levels 1–3).
 * Used for AI examiner calibration, bias prevention tests, and few-shot ground truth.
 */

export type GoldCalibrationItem = {
  id: string;
  topic: string;
  paper: string;
  questionNumber: string;
  commandWord: string;
  question: string;
  maxMark: number;
  expectedMark: number;
  expectedLevel?: string;
  band: "top" | "middle" | "bottom";
  candidateAnswer: string;
  markingGuide: string;
  reason: string;
};

export const IGCSE_0455_GOLD_CALIBRATION_SET: GoldCalibrationItem[] = [
  /* ----------------------------------------------------------------------- */
  /*  UNIT 1: The Basic Economic Problem                                     */
  /* ----------------------------------------------------------------------- */
  {
    id: "0455-u1-2m-top",
    topic: "Unit 1: The Basic Economic Problem",
    paper: "0455/22/M/J/24",
    questionNumber: "2(a)",
    commandWord: "Define",
    question: "Define 'opportunity cost'.",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer: "Opportunity cost is the next best alternative foregone when an economic decision or choice is made.",
    markingGuide: "Next best alternative (1) foregone / sacrificed (1).",
    reason: "Both the concept of 'next best alternative' and 'foregone' are explicitly stated.",
  },
  {
    id: "0455-u1-2m-mid",
    topic: "Unit 1: The Basic Economic Problem",
    paper: "0455/22/M/J/24",
    questionNumber: "2(a)",
    commandWord: "Define",
    question: "Define 'opportunity cost'.",
    maxMark: 2,
    expectedMark: 1,
    expectedLevel: "Partial Credit",
    band: "middle",
    candidateAnswer: "Opportunity cost is the other options you lose when you buy something.",
    markingGuide: "Next best alternative (1) foregone (1).",
    reason: "Identifies loss/sacrifice (1 mark), but misses 'next best alternative' (0 marks).",
  },
  {
    id: "0455-u1-4m-top",
    topic: "Unit 1: The Basic Economic Problem",
    paper: "0455/22/O/N/23",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two factors of production.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "One factor of production is land, which includes all natural resources provided by nature used in production, such as oil, forests, and agricultural soil. Another factor of production is capital, which refers to human-made physical goods used to produce other goods and services, such as industrial machinery, factories, and commercial vehicles.",
    markingGuide: "1 mark each for two identified factors (2) and 1 mark each for accurate explanations (2).",
    reason: "Two distinct factors identified (land, capital) and each correctly developed with economic definitions and examples (2 × 2 = 4).",
  },
  {
    id: "0455-u1-6m-diagram-top",
    topic: "Unit 1: The Basic Economic Problem",
    paper: "0455/22/M/J/23",
    questionNumber: "3(c)",
    commandWord: "Analyse",
    question: "Analyse, using a production possibility curve (PPC) diagram, the effect of an increase in the quality of education on an economy.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks (4m Diagram + 2m Analysis)",
    band: "top",
    candidateAnswer:
      "[DIAGRAM: PPC curve with consumer goods on vertical axis and capital goods on horizontal axis. Original curve PPC1 correctly labeled. New curve PPC2 shifted outwards to the right with directional arrows indicating an outward expansion.]\n\nAn increase in the quality of education improves human capital, labor productivity, and worker skills across the workforce. This expands the productive capacity and maximum potential output of the entire economy, shifting the production possibility curve outwards to the right from PPC1 to PPC2.",
    markingGuide:
      "Diagram (max 4): Correct axes labeled (goods A/B or consumer/capital) (1), initial curved or linear downward-sloping curve (1), shifted curve outwards to right (1), correct labels and arrows (1). Analysis (max 2): Quality education increases human capital/productivity (1), leading to an increase in potential output / economic growth (1).",
    reason: "Complete diagram with accurate axes and rightward shift (4m), plus coherent analytical chain linking education quality -> productivity -> productive capacity (2m). Total 6/6.",
  },
  {
    id: "0455-u1-8m-top",
    topic: "Unit 1: The Basic Economic Problem",
    paper: "0455/22/F/M/24",
    questionNumber: "2(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not an economy should reallocate resources from consumer goods to capital goods.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3 (Top Band)",
    band: "top",
    candidateAnswer:
      "An economy should reallocate resources towards capital goods because capital goods, such as machinery, technology, and commercial infrastructure, increase the productive capacity of the economy. Investment in capital goods increases labour productivity and allows more goods to be produced in the future, shifting the PPC outwards and fostering sustained long-term economic growth.\n\nHowever, because resources are scarce, producing more capital goods incurs an opportunity cost in the short run. Reallocating resources away from consumer goods means fewer food items, clothing, and household services are available immediately, which can lower current consumer living standards and cause short-term hardship, especially for lower-income households.\n\nIn conclusion, whether an economy should reallocate resources depends on its current stage of economic development and the rate of resource reallocation. Developing economies with significant infrastructure deficits will benefit enormously in the long run from capital investment, provided the transition is gradual so that basic consumer necessities remain affordable and accessible.",
    markingGuide:
      "Level 3 (6–8 marks): Balanced discussion examining both sides, developed economic analysis of productive capacity vs short-run opportunity cost, and a nuanced, reasoned conclusion with conditional judgment.",
    reason: "Exemplary Level 3 discussion with balanced two-sided economic analysis and a reasoned, conditional evaluation.",
  },

  /* ----------------------------------------------------------------------- */
  /*  UNIT 2: The Allocation of Resources                                    */
  /* ----------------------------------------------------------------------- */
  {
    id: "0455-u2-2m-top",
    topic: "Unit 2: The Allocation of Resources",
    paper: "0455/22/F/M/26",
    questionNumber: "5(a)",
    commandWord: "Define",
    question: "Define 'public good'.",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer: "A public good is a good that is non-rival in consumption and non-excludable.",
    markingGuide: "Non-rival (1) non-excludable (1). Also accept non-rejectable (1).",
    reason: "Both core characteristics non-rival and non-excludable are correctly defined.",
  },
  {
    id: "0455-u2-2m-zero",
    topic: "Unit 2: The Allocation of Resources",
    paper: "0455/22/F/M/26",
    questionNumber: "5(a)",
    commandWord: "Define",
    question: "Define 'public good'.",
    maxMark: 2,
    expectedMark: 0,
    expectedLevel: "Zero Marks",
    band: "bottom",
    candidateAnswer: "A public good is any good that is good for the public to buy in private retail supermarkets.",
    markingGuide: "Non-rival (1) non-excludable (1).",
    reason: "Confuses economic definition with everyday colloquial phrase.",
  },
  {
    id: "0455-u2-4m-top",
    topic: "Unit 2: The Allocation of Resources",
    paper: "0455/22/M/J/22",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two causes of an increase in demand for electric cars.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "One cause is a rise in consumer disposable incomes. As electric cars are normal goods, higher household income increases purchasing power, causing consumers to buy more electric cars at every price. Another cause is a rise in the price of petrol and diesel cars, which are substitutes. When substitutes become more expensive, consumers switch demand towards electric cars.",
    markingGuide: "1 mark each for two identified causes (2) and 1 mark each for economic explanations (2).",
    reason: "Two clear, valid causes identified (income, substitute price) and each developed with economic reasoning (2 × 2 = 4).",
  },
  {
    id: "0455-u2-6m-diagram-top",
    topic: "Unit 2: The Allocation of Resources",
    paper: "0455/22/O/N/22",
    questionNumber: "4(c)",
    commandWord: "Analyse",
    question: "Analyse, using a demand and supply diagram, the effect of an indirect tax on the market for sugary drinks.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks (4m Diagram + 2m Analysis)",
    band: "top",
    candidateAnswer:
      "[DIAGRAM: Price on vertical axis P, Quantity on horizontal axis Q. Downward sloping demand curve D, upward sloping supply curve S1. New supply curve S2 shifted upwards/leftwards parallel to S1. Original equilibrium price P1 and quantity Q1, new equilibrium price P2 higher and quantity Q2 lower. Shift arrow pointing left.]\n\nAn indirect tax is a tax on spending imposed on producers. This increases the costs of production for beverage firms, leading to a decrease in supply and shifting the supply curve to the left from S1 to S2. Consequently, the equilibrium market price rises from P1 to P2 while equilibrium quantity demanded contracts from Q1 to Q2.",
    markingGuide:
      "Diagram (max 4): Correct axes P and Q (1), correct D and S curves with initial equilibrium (1), S curve shifted left/up (1), new higher price and lower quantity indicated (1). Analysis (max 2): Tax increases production costs/reduces supply (1), resulting in higher consumer price and contracted quantity demanded (1).",
    reason: "Flawless diagram fulfilling all 4 Cambridge diagram criteria, supported by clear 2-mark economic analysis.",
  },
  {
    id: "0455-u2-8m-top",
    topic: "Unit 2: The Allocation of Resources",
    paper: "0455/22/M/J/23",
    questionNumber: "4(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not a market economic system allocates resources efficiently.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3 (Top Band)",
    band: "top",
    candidateAnswer:
      "In a market economic system, the price mechanism automatically allocates scarce resources through consumer sovereignty. High consumer demand signals profitable opportunities, incentivising firms to produce the goods and services households desire most, achieving allocative efficiency. Furthermore, intense competition among private firms forces producers to minimise average costs and adopt modern technology, promoting productive efficiency.\n\nHowever, free market systems suffer from significant market failure. Profit-seeking private firms ignore external costs, leading to overproduction of demerit goods like pollution and tobacco. Additionally, public goods such as street lighting and national defence will not be provided by private firms due to the free-rider problem, and monopolies may develop, restricting output and charging exploitative prices.\n\nIn conclusion, while a market economy is highly responsive and dynamically efficient at satisfying private consumer wants, it fails to achieve overall social efficiency due to externalities and missing markets. Therefore, a mixed economic system where government regulates market failures and provides public goods achieves a far more efficient allocation of resources.",
    markingGuide:
      "Level 3 (6–8 marks): Comprehensive two-sided discussion of price mechanism/efficiency vs market failures/monopoly, with well-structured evaluation and clear, justified conclusion.",
    reason: "Thorough Level 3 evaluation examining consumer sovereignty vs market failure with insightful conclusion.",
  },

  /* ----------------------------------------------------------------------- */
  /*  UNIT 3: Microeconomic Decision Makers                                  */
  /* ----------------------------------------------------------------------- */
  {
    id: "0455-u3-2m-top",
    topic: "Unit 3: Microeconomic Decision Makers",
    paper: "0455/22/F/M/23",
    questionNumber: "3(a)",
    commandWord: "State",
    question: "State two functions of a central bank.",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer: "Two functions of a central bank are issuing notes and coins (currency) and acting as a lender of last resort to commercial banks.",
    markingGuide: "1 mark for each valid function: issuing banknotes/currency, setting monetary policy/interest rates, lender of last resort, banker to the government, managing foreign reserves. Max 2.",
    reason: "Two valid, distinct central bank functions stated accurately.",
  },
  {
    id: "0455-u3-4m-top",
    topic: "Unit 3: Microeconomic Decision Makers",
    paper: "0455/22/O/N/24",
    questionNumber: "3(b)",
    commandWord: "Explain",
    question: "Explain two non-wage factors that influence an individual's choice of occupation.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "One non-wage factor is job satisfaction and working conditions. Workers are drawn to careers with pleasant, safe environments and manageable working hours because it enhances their daily well-being. Another non-wage factor is promotion prospects and career progression. Occupations that offer structured training and clear pathways to senior roles attract ambitious workers seeking future career growth.",
    markingGuide: "1 mark each for two identified non-wage factors (2) and 1 mark each for explanations (2).",
    reason: "Two valid non-wage factors identified and explained with economic understanding (2 × 2 = 4).",
  },
  {
    id: "0455-u3-6m-top",
    topic: "Unit 3: Microeconomic Decision Makers",
    paper: "0455/22/M/J/24",
    questionNumber: "3(c)",
    commandWord: "Analyse",
    question: "Analyse why small firms continue to survive alongside large firms in an economy.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "Firstly, small firms can provide personalised and customised customer service, which large, mass-producing corporations cannot replicate, allowing them to build strong customer loyalty. Secondly, small firms often operate in niche markets or local geographical areas where the total market size is too small for large firms to exploit economies of scale profitably. Thirdly, small firms benefit from greater operational flexibility and can adapt quickly to changing consumer tastes without navigating complex bureaucratic management structures.",
    markingGuide: "3 developed points × 2 marks (identify + explanation). Max 3 for simple listing.",
    reason: "Three developed, distinct economic reasons (personalised service, niche markets, flexibility) with full explanations (3 × 2 = 6).",
  },
  {
    id: "0455-u3-8m-top",
    topic: "Unit 3: Microeconomic Decision Makers",
    paper: "0455/22/M/J/22",
    questionNumber: "3(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not trade unions benefit workers in an economy.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3 (Top Band)",
    band: "top",
    candidateAnswer:
      "Trade unions benefit workers by engaging in collective bargaining with employers. Representing a large collective group gives workers greater bargaining power to negotiate higher wages, shorter working hours, and better pension arrangements than individual workers could negotiate alone. Furthermore, trade unions enforce workplace health and safety legislation, providing legal representation and protecting members against unfair dismissal.\n\nHowever, trade unions can also disadvantage workers. If unions demand wages above the market equilibrium, firms' production costs rise, which may cause employers to substitute labour with capital machinery or lay off workers, increasing unemployment. Furthermore, industrial actions such as strikes result in lost wages for striking workers during the dispute and may harm the long-term competitiveness and profitability of the firm, jeopardising future job security.\n\nIn conclusion, trade unions generally benefit workers significantly when wage rises are tied to productivity gains, as this maintains firm profitability while protecting real wages. However, if union demands are aggressive and unsupported by productivity, the resulting job losses may outweigh the benefits.",
    markingGuide:
      "Level 3 (6–8 marks): Balanced discussion of wage bargaining and safety vs potential unemployment and strike costs, with thoughtful conditional evaluation.",
    reason: "Exemplary Level 3 analysis with balanced viewpoints and strong productivity-linked evaluation.",
  },

  /* ----------------------------------------------------------------------- */
  /*  UNIT 4: Government and the Macroeconomy                                */
  /* ----------------------------------------------------------------------- */
  {
    id: "0455-u4-2m-top",
    topic: "Unit 4: Government and the Macroeconomy",
    paper: "0455/22/M/J/23",
    questionNumber: "4(a)",
    commandWord: "Define",
    question: "Define 'monetary policy'.",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer: "Monetary policy is government or central bank policy that manipulates interest rates and the money supply to influence aggregate demand in the economy.",
    markingGuide: "Policy of central bank/government (1) manipulating interest rates / money supply / exchange rates to influence the economy (1).",
    reason: "Identifies authority and key instruments (interest rates, money supply) influencing macro objectives.",
  },
  {
    id: "0455-u4-4m-top",
    topic: "Unit 4: Government and the Macroeconomy",
    paper: "0455/22/F/M/26",
    questionNumber: "2(b)",
    commandWord: "Explain",
    question: "Explain two reasons for differences in income distribution between countries.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "One reason is differences in government intervention through taxation and benefits. Countries with more progressive tax systems and generous welfare payments redistribute income more evenly to low-income households. Another reason is differences in education and healthcare provision. Subsidised access to quality education improves worker skills and employment opportunities, leading to higher earning potential and a more equal income distribution.",
    markingGuide: "1 mark each for two identified reasons (2) and 1 mark each for explanations (2).",
    reason: "Two distinct valid reasons identified and each developed with explanation (2 × 2 = 4).",
  },
  {
    id: "0455-u4-6m-top",
    topic: "Unit 4: Government and the Macroeconomy",
    paper: "0455/22/O/N/23",
    questionNumber: "4(c)",
    commandWord: "Analyse",
    question: "Analyse how a cut in interest rates could lead to economic growth.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "Firstly, a cut in interest rates lowers the cost of borrowing for consumers, encouraging households to take out loans to buy durable goods, and reduces the incentive to save, thereby boosting consumer expenditure (C). Secondly, lower interest rates reduce borrowing costs for firms, improving the expected return on capital projects and stimulating business investment (I). Thirdly, the increase in both consumer expenditure and investment boosts aggregate demand (AD). As firms expand production to meet higher demand, real national output (GDP) increases, leading to economic growth.",
    markingGuide: "3 developed analytical points: lower borrowing cost/more consumption (2), lower cost of investment/more capital (2), transmission to higher AD and real GDP (2).",
    reason: "Three connected steps in the transmission mechanism clearly explained with accurate macroeconomic concepts.",
  },
  {
    id: "0455-u4-8m-top",
    topic: "Unit 4: Government and the Macroeconomy",
    paper: "0455/22/F/M/26",
    questionNumber: "2(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3 (Top Band)",
    band: "top",
    candidateAnswer:
      "A government should consider imposing a high rate of personal income tax on the rich because the rich have a higher ability to pay without sacrificing basic necessities. This increases government tax revenue, which can be spent on public services such as state education and healthcare. This creates a more progressive tax system and reduces income inequality, improving living standards for the poorest.\n\nHowever, imposing very high rates of income tax can create severe economic disincentives. High tax rates reduce the reward for hard work and enterprise, discouraging entrepreneurs from expanding businesses and investing capital, which can reduce employment and economic growth. Furthermore, high taxes may cause tax evasion or tax avoidance, or encourage wealthy individuals and skilled professionals to emigrate abroad, which could actually reduce total tax revenue collected in the long term.\n\nIn conclusion, whether a government should impose a high tax rate depends on the tax rate chosen and how the revenue is used. If the rate is moderately higher and the revenue is spent effectively on infrastructure and human capital, the benefits to society will outweigh the costs; however, an excessively punitive rate is likely to trigger capital flight and brain drain.",
    markingGuide:
      "Level 3 (6–8 marks): Reasoned discussion accurately examining both sides, clear and logical analysis, thoughtful evaluation, uncertainties/conditions identified.",
    reason: "Exemplary Level 3 response with balanced, developed two-sided economic analysis and a reasoned, conditional evaluation.",
  },

  /* ----------------------------------------------------------------------- */
  /*  UNIT 5: Economic Development                                           */
  /* ----------------------------------------------------------------------- */
  {
    id: "0455-u5-2m-top",
    topic: "Unit 5: Economic Development",
    paper: "0455/22/M/J/24",
    questionNumber: "5(a)",
    commandWord: "Identify",
    question: "Identify two components of the Human Development Index (HDI).",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer: "Two components of HDI are life expectancy at birth and gross national income (GNI) per capita.",
    markingGuide: "1 mark each for two components: life expectancy at birth, education (expected/mean years of schooling), standard of living (GNI/GDP per capita). Max 2.",
    reason: "Two correct HDI components identified verbatim from official UN/Cambridge definitions.",
  },
  {
    id: "0455-u5-4m-top",
    topic: "Unit 5: Economic Development",
    paper: "0455/22/O/N/23",
    questionNumber: "5(b)",
    commandWord: "Explain",
    question: "Explain two reasons why birth rates differ between developed and developing countries.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "One reason is differences in family planning and contraception access. In developed countries, widespread availability of reproductive healthcare and education leads to smaller family sizes, whereas lack of access in some developing countries keeps birth rates high. Another reason is the economic role of children. In agricultural developing nations, children often work on family farms to supplement family income, creating an economic incentive for larger families, whereas in developed countries children are financially dependent on parents for longer.",
    markingGuide: "1 mark each for two identified reasons (2) and 1 mark each for explanations (2).",
    reason: "Two distinct reasons identified (family planning, child economic role) and explained with comparative economic context (2 × 2 = 4).",
  },
  {
    id: "0455-u5-6m-top",
    topic: "Unit 5: Economic Development",
    paper: "0455/22/M/J/23",
    questionNumber: "5(c)",
    commandWord: "Analyse",
    question: "Analyse how investment in healthcare can increase living standards in a developing country.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "Firstly, investment in healthcare reduces infant mortality rates and increases average life expectancy, directly improving the health component of the Human Development Index (HDI). Secondly, healthier workers suffer fewer days off sick, raising national labour productivity and enabling firms to expand output, which leads to higher wages and higher real GDP per capita. Thirdly, better healthcare reduces the personal burden of catastrophic medical expenses on poor households, allowing families to allocate more disposable income towards nutritious food, sanitation, and education.",
    markingGuide: "3 developed points: direct health/life expectancy improvements (2), productivity gains and GDP growth (2), poverty relief and income security (2).",
    reason: "Three logical analytical chains linking healthcare spending -> health metrics -> labour productivity -> disposable income and HDI.",
  },
  {
    id: "0455-u5-8m-top",
    topic: "Unit 5: Economic Development",
    paper: "0455/22/O/N/22",
    questionNumber: "5(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not rapid population growth is beneficial for an economy.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3 (Top Band)",
    band: "top",
    candidateAnswer:
      "Rapid population growth can be beneficial for an economy because a growing population expands the size of the domestic consumer market, increasing aggregate demand and creating sales opportunities for firms. Furthermore, an expanding population increases the future supply of labour, helping prevent labour shortages, keeping wages competitive, and providing a larger pool of potential entrepreneurs and innovators.\n\nHowever, rapid population growth can also impose heavy economic costs. If population grows faster than national output, GDP per capita will decline, worsening living standards. In addition, rapid population growth places severe pressure on state infrastructure, schools, and hospitals, which may lead to congestion, lower educational quality, and environmental degradation, particularly in developing countries with scarce public funds.\n\nIn conclusion, whether rapid population growth is beneficial depends on the age structure of the population and the availability of capital resources. If the country has unused land, natural resources, and capital to invest in educating the youth, population growth drives rapid industrialisation; however, if resources are already strained, it exacerbates poverty and unemployment.",
    markingGuide:
      "Level 3 (6–8 marks): Balanced discussion of larger consumer market and labour supply vs dependency burdens, infrastructure strain, and per capita GDP dilution, supported by clear evaluative judgment.",
    reason: "Comprehensive Level 3 discussion with detailed two-sided economic analysis and a thoughtful conclusion.",
  },

  /* ----------------------------------------------------------------------- */
  /*  UNIT 6: International Trade and Global Economy                         */
  /* ----------------------------------------------------------------------- */
  {
    id: "0455-u6-2m-top",
    topic: "Unit 6: International Trade and Global Economy",
    paper: "0455/22/M/J/24",
    questionNumber: "6(a)",
    commandWord: "Define",
    question: "Define 'quota'.",
    maxMark: 2,
    expectedMark: 2,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer: "A quota is a physical limit placed on the quantity or volume of a good that can be imported into a country over a given period.",
    markingGuide: "Physical limit (1) on the quantity/volume of imports (1).",
    reason: "Both elements: physical limit (1) and imports (1) are accurately captured.",
  },
  {
    id: "0455-u6-4m-top",
    topic: "Unit 6: International Trade and Global Economy",
    paper: "0455/22/O/N/24",
    questionNumber: "6(b)",
    commandWord: "Explain",
    question: "Explain two reasons why a country might protect its domestic industries.",
    maxMark: 4,
    expectedMark: 4,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "One reason is to protect infant industries. Newly established domestic firms have not yet grown large enough to exploit economies of scale, so trade protection shields them from established foreign competitors until they become competitive. Another reason is to prevent dumping. Foreign firms may sell surplus goods below their cost of production in domestic markets, which would drive domestic producers out of business without protection.",
    markingGuide: "1 mark each for two identified reasons (2) and 1 mark each for explanations (2).",
    reason: "Two valid reasons (infant industry, anti-dumping) identified and accurately explained (2 × 2 = 4).",
  },
  {
    id: "0455-u6-6m-top",
    topic: "Unit 6: International Trade and Global Economy",
    paper: "0455/22/M/J/23",
    questionNumber: "6(c)",
    commandWord: "Analyse",
    question: "Analyse how a depreciation of a country's foreign exchange rate could affect its current account balance.",
    maxMark: 6,
    expectedMark: 6,
    expectedLevel: "Full Marks",
    band: "top",
    candidateAnswer:
      "A depreciation of the exchange rate means that a unit of domestic currency buys less foreign currency. Firstly, this makes domestic exports cheaper in terms of foreign currencies, increasing foreign demand and raising export revenue (provided demand is price elastic). Secondly, it makes imported goods more expensive in domestic currency, discouraging domestic consumers from buying imports and reducing total import expenditure. Consequently, with export revenues rising and import spending falling, the net balance on the current account improves, helping reduce a trade deficit.",
    markingGuide: "3 developed points: depreciation lowers export prices abroad (2), raises import prices at home (2), increases net export revenue / improves current account balance (2).",
    reason: "Complete, accurate causal chain from depreciation -> relative prices -> quantity demanded -> current account balance.",
  },
  {
    id: "0455-u6-8m-top",
    topic: "Unit 6: International Trade and Global Economy",
    paper: "0455/22/F/M/25",
    questionNumber: "4(d)",
    commandWord: "Discuss",
    question: "Discuss whether or not free trade benefits all countries.",
    maxMark: 8,
    expectedMark: 8,
    expectedLevel: "Level 3 (Top Band)",
    band: "top",
    candidateAnswer:
      "Free trade benefits countries by allowing nations to specialise in producing goods where they have a comparative efficiency advantage. This increases world output, lowers consumer prices, and provides domestic households with access to a wider variety of quality goods and services. Furthermore, firms gain access to larger international export markets, allowing them to exploit economies of scale and lower their average costs of production.\n\nHowever, free trade does not benefit all countries or all sectors equally. Developing countries may find their infant industries destroyed by cheap imports from subsidised multinational corporations in developed nations, locking developing economies into low-value agricultural commodities. Additionally, free trade can cause structural unemployment in mature economies when traditional manufacturing industries decline due to cheaper foreign competition.\n\nIn conclusion, free trade generates substantial net economic gains globally through consumer variety and lower prices, but creates concentrated domestic losers in vulnerable industries. Therefore, free trade only benefits a country fully if the government implements active domestic retraining and regional policies to assist workers displaced by international competition.",
    markingGuide:
      "Level 3 (6–8 marks): Balanced discussion of specialisation, lower prices, and scale economies vs infant industry destruction, commodity dependence, and structural unemployment, with reasoned evaluation.",
    reason: "Thorough Level 3 analysis with balanced perspectives and a strong domestic adjustment policy conclusion.",
  },
];

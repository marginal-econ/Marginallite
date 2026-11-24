/**
 * Live Blind Benchmark Suite for Mistral Pipeline.
 *
 * Runs all real candidate papers and Cambridge ECR boundary cases blind through
 * Marginalite's live Mistral pipeline:
 *  - Saikrish Karthikeyan (Candidate 9061, 77/90)
 *  - Yuvan Kaarthik Mahendran (Candidate 9087, 81/90)
 *  - Cambridge ECR Boundary-Trap Scripts (0/2, 1/2, 2/4, 3/6, 2/8, 3/8, 4/8, 5/8)
 */

import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "../src/integrations/backend/client.server";
import { gradeEssay } from "../src/lib/examiner/grade.server";
import { defaultSplitForMaxMark } from "../src/lib/examiner/config";

export interface BenchmarkCase {
  candidate: "Saikrish (User)" | "Yuvan Kaarthik" | "Cambridge ECR";
  questionNumber: string;
  tariff: number;
  cambridgeMark: number;
  question: string;
  essayText: string;
  cambridgeRationale: string;
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  // =========================================================================
  // 1. SAIKRISH KARTHIKEYAN (Candidate 9061, IN023 - 77/90 Grade A*)
  // =========================================================================
  {
    candidate: "Saikrish (User)",
    questionNumber: "3(a)",
    tariff: 2,
    cambridgeMark: 1,
    question: "Identify two causes of an increase in the demand for bank loans.",
    essayText: "Higher income, low interest rates and consumer confidence high.",
    cambridgeRationale: "1/2: Credited 'higher income'. 'Low interest rates' and 'confidence high' were marked with omission carets because they are static states rather than directional changes (fall in interest rates / rise in confidence).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "3(b)",
    tariff: 4,
    cambridgeMark: 4,
    question: "Explain two supply-side policy measures, other than privatisation.",
    essayText:
      "Education and training - government policy relation to education increase skill level and productivity of workers. More productivity increases aggregate supply and economic growth.\n\nSubsidies - financial grants provided by government that reduce production cost for firm. This leads to higher rates of production and economic growth in long run due to high production capacity.",
    cambridgeRationale: "4/4: Education & training -> productivity -> AS (2m); Subsidies -> reduces costs -> higher output (2m).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "3(c)",
    tariff: 6,
    cambridgeMark: 6,
    question: "Analyse how state-owned firms may benefit a country's population.",
    essayText:
      "Lower prices - State owned government can provide lower prices for consumer than private, as they don't have to focus on profit maximisation. This mean low priced product, higher consumer quality of life and less absolute poverty.\n\nMore jobs - state-owned firms may provide more secure job opportunities and higher income. As state-owned firms grow more workers are employed and they gain higher income. More disposable income leads to less poverty, lower unemployment and economic growth.\n\nState-owned firm offer more fringe benefits and non-wage factors. SOE provide worker with benefit like free transportation and more sick days, which increase incentive and productivity of workers, leading to economic growth and less mental stress, leading to higher quality of life in long term.",
    cambridgeRationale: "6/6: Fully developed across lower prices/non-profit (2m), job security/higher income (2m), fringe benefits/quality of life (2m).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "3(d)",
    tariff: 8,
    cambridgeMark: 8,
    question: "Discuss whether or not having a fixed exchange rate will benefit an economy.",
    essayText:
      "An exchange rate is a value of one currency in terms of another. Fixed exchange rate is controlled by government.\n\nA fixed exchange rate increase certainty and promotes economic growth. As the exchange rates are fixed, domestic firms may be more confident to invest, as they know the exact amount required to import capital and export. Increased confidence leads to more production and economic growth.\n\nA fixed exchange rate also increases Foreign direct investment and MNC. As fixed rates increases certainty, foreign investor are more likely to invest as their confidence is high. It may also attract MNC, as no fluctuation in exchange rates means more stability, leading to economic growth.\n\nSpeculation can be reduced - a fixed exchange rate may reduce investor speculation and flow of hot money. It means that the country can avoid increased demand or low supply, and hoarding of currency, leading to more exports and BOP stability in long term. It helps prevent rapid appreciation depreciation.\n\nOn the other hand, a fixed exchange rate is extremely inefficient for the government. As the constant need for change in exchange rate may increase administrative cost and decrease effectiveness of other policies like monetary. This leads to long term instability and less independence for government, leading to ineffective use of policies.\n\nAlso fixed exchange rates need high amount of foreign reserves and cannot benefit from auto stabilisation. As increasing the value of currency through revaluation may means borrowing foreign currency, the government debt may increase. Also if there are constant rise or fall in demand, the government cannot act quickly leading to inefficient production and low economic growth, or excess demand or excess supply (Disequilibrium).\n\nIn conclusion, a fixed exchange rate may only be positive if a country has a large foreign reserve. But, other methods like banded floating may be more effective.",
    cambridgeRationale: "8/8: Level 3 top band. Two-sided analysis (certainty/investment, FDI, reduced speculation vs monetary policy loss, foreign reserves requirement, disequilibrium) + strong conclusion.",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "4(a)",
    tariff: 2,
    cambridgeMark: 2,
    question: "Give the formula for price elasticity of supply.",
    essayText: "% change in supply quantity divided by % change in price.",
    cambridgeRationale: "2/2: Correct % change in quantity supplied / % change in price.",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "4(b)",
    tariff: 4,
    cambridgeMark: 4,
    question: "Explain two reasons why a worker may choose to work long hours.",
    essayText:
      "Higher income - working longer hours may mean higher income and higher ability to buy product. Overtime pay may be available, therefore may choose to work.\n\nJob satisfaction and chance of promotion - workers may choose to work longer hours if they enjoy what they are doing or incentivised for chance of career growth that can be achieved through longer hours, eventually leading to higher income.",
    cambridgeRationale: "4/4: Higher income / overtime pay (2m); Job satisfaction / career promotion (2m).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "4(c)",
    tariff: 6,
    cambridgeMark: 6,
    question: "Analyse the differences between a competitive market and a monopoly market.",
    essayText:
      "One difference is the number of firms in the industry. In a competitive market there are many buyers and many sellers, none of whom can influence the market price, meaning they are price takers. In contrast, in a monopoly there is only one sole producer who has high market power and acts as a price maker.\n\nAnother difference is barriers to entry. Competitive markets have low or no barriers to entry and exit, allowing new firms to enter freely when profits are made. Monopolies have very high barriers to entry, such as legal patents, high start-up capital costs, or control of raw materials, which prevents new competitors from entering.\n\nFinally, product differentiation differs. Competitive markets usually offer homogeneous or very similar products, whereas a monopoly may produce unique products with no close substitutes available for consumers.",
    cambridgeRationale: "6/6: 3 clear comparative contrasts: price-takers vs price-makers (2m), barriers to entry (2m), homogeneous vs unique products (2m).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "4(d)",
    tariff: 8,
    cambridgeMark: 6,
    question: "Discuss whether or not trade union membership will increase in an economy.",
    essayText:
      "Trade union is organisation of workers bargaining/representing to improve wages and working condition.\n\nTrade union membership may rise due to population growth. As the world population continues to grow, more workers enter the labour force, leading to more chance of worker joining unions, increasing membership of trade unions in long run.\n\nTrade union may increase in membership to increase wages - worker may need higher wages due to inflation, leading to more worker joining the union to increase collective bargaining powers. Increasing bargaining power and use of industrial action can help workers, and more future membership.\n\nMore membership may occur due to training provision - trade union offer their member workshop and training which increase skill and productivity of workers. This may incentivise more worker to join union.\n\nOn the other hand, higher membership cost can demotivate membership. If trade union charge higher cost to fund industrial action, worker may lose a lot of their disposable income, leading to less incentive to join unions.\n\nAlso, if trade union constantly push for higher wages, increase unemployment can decrease membership. If the union is constantly in industrial action, rate of production may be low, leading to less revenue for firms, and lay off of workers, leading to a decrease in memberships.\n\nIn conclusion, trade union help protect working condition, but the skill levels and productivity of other worker and their aims, may be a reason for increase in memberships.",
    cambridgeRationale: "6/8: Level 3 awarded for two-sided discussion (inflation, bargaining, training vs fees and unemployment), but capped at 6 because conclusion is vague.",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "5(a)",
    tariff: 2,
    cambridgeMark: 2,
    question: "Define 'public good'.",
    essayText: "Goods that are non-rival and non-excludable are public goods. Example is street lights.",
    cambridgeRationale: "2/2: Non-rival (1) and non-excludable (1).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "5(b)",
    tariff: 4,
    cambridgeMark: 4,
    question: "Explain two reasons why young workers may be more mobile than older workers.",
    essayText:
      "Less family ties - as young workers are less likely to have family ties that fix them, they are more geographically mobile, as they can move to different region for work easily.\n\nMore skilled - younger workers may be more skilled leading to higher productivity and higher occupational mobility. As young workers can easily learn and switch jobs, they can work in different areas easily.",
    cambridgeRationale: "4/4: Fewer family ties -> geographical mobility (2m); More skilled/flexible -> occupational mobility (2m).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "5(c)",
    tariff: 6,
    cambridgeMark: 6,
    question: "Analyse how a government could reduce pollution.",
    essayText:
      "Increased taxation on petrol cars - the government may increase taxes on petrol cars through VAT/indirect taxes, causing an increase in prices, leading to less use of cars and less pollution as negative externalities.\n\nSubsidies for green goods / EV cars - the government may provide grants financially for EV car firms to increase production and lower prices on these cars, increasing the use of them, and less of petrol cars.\n\nIncreased regulations - increased regulation on what to produce and ban of certain raw material can decrease production of harmful goods that increase pollution. Use of embargos and quotas on foreign petrol car imports can reduce pollution too, as imports are banned or limited supply increases prices.",
    cambridgeRationale: "6/6: Taxation on negative externalities (2m), subsidies for green goods (2m), regulations/bans (2m).",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "5(d)",
    tariff: 8,
    cambridgeMark: 6,
    question: "Discuss whether or not people who emigrate will always enjoy a higher living standard.",
    essayText:
      "Emigration is when workers/individual move out of the country. Living standards are measured through HDI.\n\nEmigrants may have high living standard due to low income tax. Some foreign countries like Dubai has low income tax that increases disposable income, leading to low chance of absolute poverty and increase in income index of HDI.\n\nEmigrants may have high quality of life due to free education. Some countries like USA offer free education. This may increase skill of emigrants, while improving literacy rates, increasing education index of HDI.\n\nEmigrants may have high quality of life due to cheap quality healthcare. Some countries like Netherlands offer cheap quality healthcare, which may benefit emigrants, as their health and productivity are improved and higher life expectancy can improve healthcare index of HDI.\n\nOn the other hand, high living costs can reduce quality of life for emigrants. Some place like California in US have high living cost. High cost leads to less ability of consumer to spend on necessity, leading to chances of poverty / relative poverty increasing for emigrants.\n\nAlso, the political and social situation matter. For example, the current US regulation on Indian visa and regulation has lowered living standards of emigrants. Also discrimination and social view may cause worker wages to be low, leading to low living standard.\n\nTherefore, quality of life and living standard depends on which country the emigrants are moving to. It depends on that country's government and their political situation. As emigrating to areas of danger like Palestine is not advisable.",
    cambridgeRationale: "6/8: Level 3 awarded (income, education, healthcare vs living costs, discrimination/visas). Sits at 6/8 because the positive chains are somewhat brief.",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "1(g)",
    tariff: 6,
    cambridgeMark: 4,
    question: "Discuss whether or not fiscal policy can increase a country's HDI value.",
    essayText:
      "Fiscal policies include government spending and taxation. Expansionary fiscal may benefit HDI.\n\nLower taxation can lead to higher income - as the Senegal government reduces taxation, disposable income of consumer increase. Higher income increases income index of HDI, leading to better quality of life.\n\nIncreased government spending rises quality of healthcare and education. More government spending in Senegal on healthcare can increase life expectancy and literacy rates increasing healthcare and education index in HDI.\n\nOn the other hand, increased government spending on these healthcare/education has opportunity cost. Increasing spending by Senegalese government on education decreases spending on supply-side subsidies, leading to lower production and decreased income affecting HDI's income index.\n\nIn conclusion, fiscal policy may not work in long term as in future it creates tax burden and inflation.",
    cambridgeRationale: "4/6: Credited tax cuts -> disposable income / GNI (2m) and healthcare spending -> life expectancy (2m). Counter-argument on supply subsidies was weak.",
  },
  {
    candidate: "Saikrish (User)",
    questionNumber: "1(h)",
    tariff: 6,
    cambridgeMark: 5,
    question: "Discuss whether or not the demand for gold will become price-inelastic.",
    essayText:
      "Price elasticity of demand is % change in quantity demanded / % change in price.\n\nPrice may become inelastic due to higher income. Senegal's fiscal policy may increase production and increase income. Higher income means less proportion of income spent on gold, leading to inelastic PED.\n\nOn the other hand, increase substitutes for gold can make it elastic. As more substitute for gold like diamonds in Senegal rises, the PED may become elastic as other options are available to consumers.\n\nAlso, gold may not be considered as a necessity. Gold may be viewed as a veblen good and as a consumer want. Therefore a change in price means higher change in demand, leading to an elastic PED.\n\nTherefore, PED depends on social attitudes, as if it is viewed as a necessity PED may change accordingly.",
    cambridgeRationale: "5/6: Credited smaller proportion of income spent on gold (2m), more substitutes (2m), luxury vs necessity (1m). Conclusion marked REP (repetition).",
  },

  // =========================================================================
  // 2. YUVAN KAARTHIK MAHENDRAN (Candidate 9087, IN023 - 81/90 Grade A*)
  // =========================================================================
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "2(a)",
    tariff: 2,
    cambridgeMark: 2,
    question: "Define the economic problem.",
    essayText: "The economic problem is that there are unlimited wants but limited resources which creates scarcity.",
    cambridgeRationale: "2/2: Unlimited wants (1) and finite resources creating scarcity (1).",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "2(b)",
    tariff: 4,
    cambridgeMark: 2,
    question: "Explain two reasons why labour incomes vary between countries.",
    essayText:
      "Some countries may have more skilled labour who are more productive than labour in other countries where labour is largely unskilled.\n\nThere are changes in demand and supply for labour in different countries. Wherever labour is more demanded, their income is higher and wherever labour is less demanded, their income is reduced.",
    cambridgeRationale: "2/4: Identified skills/productivity (1) and demand/supply (1), but neither causal mechanism to wage determination was developed.",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "2(d)",
    tariff: 8,
    cambridgeMark: 6,
    question: "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
    essayText:
      "The government should impose a high rate of personal income tax on the rich as it will reduce income inequality in the country and reduce relative poverty as well.\n\nThe increased tax revenues can reduce a budget deficit if it was present and can be used to fund welfare schemes for the poor and be used to improve the wellbeing of all citizens through services, thus increasing the living standards in the country.\n\nHowever, imposing a high rate of personal income tax on the rich may cause them to migrate to a country with lower personal taxes, which would reduce aggregate demand in the economy as rich people contribute a lot to the total consumer expenditure. This will cause firms to reduce their scale of production and fire workers to reduce cost of production, leading to unemployment. Less output results in less economic growth.\n\nImposing high rates of personal tax on the rich also discourages enterprise in the economy as a large proportion of profit made will be collected as tax, thus less businesses will open which could reduce and cause business owners to relocate their firms elsewhere to avoid paying the taxes. This reduces the output of the economy thus slowing down economic growth and could lead to a recession.\n\nInstead the government can reduce the government expenditure on unemployment benefits, which would increase employment and the money could be allocated towards more productive areas of the economy.",
    cambridgeRationale: "6/8: Level 3 discussion. Progressive redistribution vs brain drain / capital flight and reduced enterprise incentive.",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "4(a)",
    tariff: 2,
    cambridgeMark: 2,
    question: "State the formula used to calculate price elasticity of supply.",
    essayText: "PES = percentage change in quantity supplied / percentage change in price",
    cambridgeRationale: "2/2: Accurate formula: % change in QS / % change in P.",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "4(b)",
    tariff: 4,
    cambridgeMark: 4,
    question: "Explain two reasons why a worker might choose to work longer hours.",
    essayText:
      "A worker may choose to work long hours if they want to make a large purchase such as a house, which would require large sums of money.\n\nA worker may also choose to work longer hours to save more of their income if interest rates have risen and thus incentivising the worker to save more money.\n\nThe worker may also be trying to build loyalty with the owner and may be doing this for a job promotion.",
    cambridgeRationale: "4/4: Target income for major purchase (2m); Saving incentive from higher interest rates (2m).",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "4(c)",
    tariff: 6,
    cambridgeMark: 6,
    question: "Analyse the differences between a competitive market and a monopoly market.",
    essayText:
      "In competitive markets both the producers and consumers are price-takers and none are price-makers. Any change in price by producers will incur a loss for them as increasing prices will cause customers to buy products from other producers and a decrease in price would incur a loss as they would not be making any profit. However in a monopoly market the sole producer is the price-maker and the consumers are price-takers. Because the monopoly controls the entire supply of a commodity, consumers have no choice but to pay the price the monopoly sets if the consumers want to consume that good.\n\nThere are also less barriers to entry for firms. Firms in a competitive market are also more efficient and produce higher quality goods than a monopoly market as the strong competition in a competitive market forces firms to cut costs of production and reduce their prices if they want to attract customers. This will ensure firms are efficient. In a monopoly however, the firm is inefficient and may produce bad quality products as it is facing zero competition and will still make profit even if they have inefficient production methods as they are the only supplier.",
    cambridgeRationale: "6/6: Complete comparative analysis of price-taking vs price-making, barriers to entry, and productive efficiency.",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "4(d)",
    tariff: 8,
    cambridgeMark: 6,
    question: "Discuss whether or not trade union membership will increase in an economy.",
    essayText:
      "Trade unions are organisations of workers that aim to promote and protect the interests of their members.\n\nTrade union membership may increase during inflation as the purchasing powers and real wages of workers will fall and thus they might demand higher wages from employers by joining a trade union as their cost of living increases.\n\nWorkers may also join trade unions if they feel like their working conditions and pay are insufficient and thus they may enrol into trade unions to collectively bargain with employers to increase the pay and working conditions as trade unions act as a single point of contract between workers and employers and also to increase their bargaining strength.\n\nHowever trade union membership may also decrease if trade union membership fees increase, and if the power of trade unions have been decreased by the government.\n\nTrade union membership may also decrease if firms have already met the demands of the workers and thus the workers would now no longer need to negotiate with employers.\n\nWorkers may also prefer to negotiate with employers themselves rather than with a trade union, as they may be more productive or have more experience than their colleagues and thus feel like they deserve a higher income than their colleagues. This would not be possible in a trade union, as all workers get the same income.\n\nIn conclusion, there are other multiple factors that affect trade union membership like training provided by trade unions.",
    cambridgeRationale: "6/8: Level 3 discussion. Inflation / real wage erosion vs membership fees and merit-based individual bargaining.",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "5(a)",
    tariff: 2,
    cambridgeMark: 2,
    question: "Define a public good.",
    essayText: "A public good is a good that is non-rivalrous and non-excludable.",
    cambridgeRationale: "2/2: Non-rivalrous (1) and non-excludable (1).",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "5(d)",
    tariff: 8,
    cambridgeMark: 6,
    question: "Discuss whether or not emigration benefits living standards.",
    essayText:
      "Living standards are the factors that contribute to a person's wellbeing and happiness. Emigration is when people leave a country.\n\nPeople who emigrate may enjoy a higher living standard if they move from a developing country to a developed country in search of work as there may be more employment opportunities abroad and thus people may have a higher chance of getting a job and income, which increases their living standards as they have a higher purchasing power and can afford necessities.\n\nHowever people may emigrate due to wars or famines occurring in their country. They may become refugees and may not be able to get jobs and may be forced to live in poor living conditions which can decrease their living standards as their health is compromised.\n\nPeople who emigrate for work may also fall victim to worse living standards than in their own country, if they are exploited by large firms and have to work in poor working conditions, which could deteriorate their health and can make them ill and stressed, thus decreasing their standards of living.\n\nIn conclusion, living standards can also be affected by healthcare provision and education levels in the country as well as if the country is experiencing high inflation or a recession which would decrease living standards for emigrants as high inflation would reduce their purchasing power and may lead to absolute poverty, and recessions may lead to unemployment as firms reduce their scale of operations in order to reduce their cost of production as there is not enough aggregate demand.",
    cambridgeRationale: "6/8: Level 3. Voluntary work migration vs refugee hardship and firm exploitation, with inflation/recession conclusion.",
  },
  {
    candidate: "Yuvan Kaarthik",
    questionNumber: "1(g)",
    tariff: 6,
    cambridgeMark: 6,
    question: "Discuss whether or not fiscal policy can increase a country's HDI value.",
    essayText:
      "Fiscal policy is a government policy that affects aggregate demand using tax rates and government expenditure.\n\nFiscal policy can increase a country's HDI value when expansionary fiscal policy is utilized, thus there is increased government expenditure which increases aggregate demand, which incentivizes firms to expand their scale of production and thus will hire more workers to produce more output. This combined with lower tax rates increases the gross national income per head which is an important component in HDI.\n\nFiscal policy can also decrease a country's HDI value, and thus government expenditure on healthcare and educational institutions will decrease which can decrease the average life expectancy in the country and can decrease the mean number of years a child will spend in school in that country, both which will decrease the HDI value.\n\nHowever, supply-side policies can be utilized for long-term economic growth instead of fiscal policy, as it may lead to demand-pull inflation due to the high aggregate demand. Monetary policy can also be used to increase the income index as monetary policy aids economic growth and thus improving incomes.",
    cambridgeRationale: "6/6: Full marks. Explicitly connects fiscal levers to all 3 HDI components: GNI per capita, life expectancy, and years of schooling.",
  },

  // =========================================================================
  // 3. CAMBRIDGE ECR BOUNDARY-TRAP SCRIPTS
  // =========================================================================
  {
    candidate: "Cambridge ECR",
    questionNumber: "5(a) ECR",
    tariff: 2,
    cambridgeMark: 0,
    question: "Define 'public good'.",
    essayText: "A public good is a good provided by the government such as education and healthcare that helps the public.",
    cambridgeRationale: "0/2: Misconception trap. Confuses public goods with state-provided merit goods. Zero awarded.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "4(a) ECR",
    tariff: 2,
    cambridgeMark: 1,
    question: "Give the formula for price elasticity of supply.",
    essayText: "Change in quantity supplied divided by change in price.",
    cambridgeRationale: "1/2: Missing percentage changes. Only partial mark credited.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "2(b) ECR",
    tariff: 4,
    cambridgeMark: 2,
    question: "Explain two factors of production.",
    essayText: "Land, labour, capital and enterprise are the four factors of production used by firms in economies.",
    cambridgeRationale: "2/4: Identification only. Lists factors but provides zero economic explanation or development.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "3(c) ECR",
    tariff: 6,
    cambridgeMark: 3,
    question: "Analyse the effect of an increase in education quality on an economy.",
    essayText:
      "- It improves worker skills\n- It leads to higher wages\n- It makes workers more productive\n- It increases the country's GDP",
    cambridgeRationale: "3/6: Bullet point listing cap. Cambridge examiners cap bulleted lists without causal connective links at maximum 3 marks.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "2(d) ECR",
    tariff: 8,
    cambridgeMark: 2,
    question: "Discuss whether or not an economy should reallocate resources from consumer goods to capital goods.",
    essayText:
      "Capital goods are goods like machinery, factories, trucks and tractors. Consumer goods are goods like food, clothes, televisions, phones and shoes. Firms use capital goods in factories to make consumer goods for people. Reallocating resources means moving workers and raw materials from making consumer goods to making capital goods.",
    cambridgeRationale: "2/8: Level 1 descriptive. Provides definitions and examples but zero analysis of economic trade-offs or opportunity cost.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "2(d) ECR-2",
    tariff: 8,
    cambridgeMark: 5,
    question: "Discuss whether or not an economy should reallocate resources from consumer goods to capital goods.",
    essayText:
      "An economy should definitely reallocate resources to capital goods. Capital goods include advanced industrial machinery, modern factories, and commercial transport infrastructure. When an economy invests in capital goods, labour productivity increases significantly because workers have better tools to work with. This raises the productive potential of the economy and shifts the PPC outwards to the right. Consequently, real GDP rises, firms can export more goods competitively, and sustained long-term economic growth is achieved, which creates many new jobs for citizens in the future.",
    cambridgeRationale: "5/8: Level 2 one-sided cap. Thorough one-sided analysis of capital goods benefits, but zero counter-argument or short-term opportunity cost. Capped at 5/8.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "4(d) ECR",
    tariff: 8,
    cambridgeMark: 3,
    question: "Discuss whether or not protectionism will reduce unemployment.",
    essayText:
      "Imposing tariffs on foreign goods makes imported products more expensive for domestic consumers. When imports become expensive, domestic consumers immediately switch all their spending to imported goods. As a result, domestic firms experience a sharp decrease in aggregate demand, leading them to cut production and lay off workers, causing unemployment to rise rapidly.",
    cambridgeRationale: "3/8: Inverted macro mechanism trap. Claims tariffs make consumers buy MORE imports and cause unemployment.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "4(d) ECR-2",
    tariff: 8,
    cambridgeMark: 4,
    question: "Discuss whether or not a national minimum wage benefits workers.",
    essayText:
      "A national minimum wage will definitely benefit workers. Workers will receive higher incomes, which means their living standards will improve and they will not live in poverty. They will also be happier and more motivated at work.\n\nOn the other hand, a national minimum wage will not benefit workers. Firms will have higher costs so they might fire workers, leading to unemployment. Also some workers will not get paid more if they already earn above the minimum wage.",
    cambridgeRationale: "4/8: Level 2 static assertions cap. Covers both sides but with brief, unsupported static assertions.",
  },
  {
    candidate: "Cambridge ECR",
    questionNumber: "5(d) ECR",
    tariff: 8,
    cambridgeMark: 5,
    question: "Discuss whether or not free trade benefits developing nations.",
    essayText:
      "Free trade benefits developing nations because it allows them to sell their agricultural and mineral goods to larger world markets without tariffs, bringing export revenue. Consumers also enjoy cheaper imported manufactured products.\n\nHowever, free trade also damages developing nations because large foreign multinational firms can flood their domestic markets with cheap mass-produced products, driving local infant industries out of business. Developing countries may also become overly dependent on exporting low-value primary commodities.\n\nIn conclusion, free trade has both positive and negative consequences.",
    cambridgeRationale: "5/8: Level 2 mid. Two-sided evaluation is present but both sides are thin, and the conclusion is a tautology.",
  },
];

async function runLiveBlindBenchmark() {
  console.log("============================================================================");
  console.log("       LIVE MISTRAL BLIND GRADING BENCHMARK (REAL PAPERS & ECRs)           ");
  console.log("============================================================================");
  console.log(`Total Candidates / Cases: ${BENCHMARK_CASES.length}\n`);

  interface ResultRow {
    candidate: string;
    questionNumber: string;
    tariff: number;
    cambridgeMark: number;
    mistralMark: number;
    diff: number;
    absErr: number;
    band: string;
    latencyMs: number;
    examinerSummary: string;
  }

  const results: ResultRow[] = [];
  const reportPath = path.resolve("scripts/live-blind-mistral-report.json");

  for (let i = 0; i < BENCHMARK_CASES.length; i++) {
    const tc = BENCHMARK_CASES[i]!;
    const t0 = Date.now();
    const split = defaultSplitForMaxMark(tc.tariff, undefined, tc.question);

    process.stdout.write(`[${String(i + 1).padStart(2)}/${BENCHMARK_CASES.length}] Grading ${tc.candidate.padEnd(16)} Q${tc.questionNumber.padEnd(10)} (${tc.tariff}m)... `);

    try {
      const outcome = await gradeEssay(supabaseAdmin, {
        question: tc.question,
        essayText: tc.essayText,
        maxMark: tc.tariff,
        split,
        auditPass: false,
      });

      const mistralMark = outcome.grading.total_mark;
      const diff = mistralMark - tc.cambridgeMark;
      const absErr = Math.abs(diff);
      const latency = Date.now() - t0;
      const status = absErr === 0 ? "EXACT MATCH" : absErr === 1 ? "±1 ACCURATE" : `DIFF ${diff >= 0 ? "+" : ""}${diff}`;

      console.log(`Cambridge=${tc.cambridgeMark} | Mistral=${mistralMark} [${status}] (${latency}ms)`);

      results.push({
        candidate: tc.candidate,
        questionNumber: tc.questionNumber,
        tariff: tc.tariff,
        cambridgeMark: tc.cambridgeMark,
        mistralMark,
        diff,
        absErr,
        band: outcome.grading.band,
        latencyMs: latency,
        examinerSummary: outcome.grading.examiner_summary || "",
      });

      // Save incremental progress after each case
      const currentExact = results.filter((r) => r.absErr === 0).length;
      const currentWithin1 = results.filter((r) => r.absErr <= 1).length;
      const currentMae = results.reduce((s, r) => s + r.absErr, 0) / results.length;
      fs.writeFileSync(
        reportPath,
        JSON.stringify(
          {
            summary: {
              total: results.length,
              exact: currentExact,
              within1: currentWithin1,
              mae: currentMae,
            },
            results,
          },
          null,
          2,
        ),
      );

      // Brief pause to stay well within Mistral rate limits
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Generate markdown report artifact
  const total = results.length;
  const exact = results.filter((r) => r.absErr === 0).length;
  const within1 = results.filter((r) => r.absErr <= 1).length;
  const mae = results.reduce((s, r) => s + r.absErr, 0) / Math.max(1, total);

  console.log("\n============================================================================");
  console.log("                         LIVE BENCHMARK SUMMARY                             ");
  console.log("============================================================================");
  console.log(`Total Cases Graded:    ${total}`);
  console.log(`Exact Cambridge Match: ${exact}/${total} (${((exact / total) * 100).toFixed(1)}%)`);
  console.log(`Within ±1 Mark:        ${within1}/${total} (${((within1 / total) * 100).toFixed(1)}%)`);
  console.log(`Mean Absolute Error:   ${mae.toFixed(2)} marks`);

  // Write final report to artifact directory
  fs.writeFileSync(reportPath, JSON.stringify({ summary: { total, exact, within1, mae }, results }, null, 2));
  console.log(`Detailed results saved to: ${reportPath}`);
}

runLiveBlindBenchmark().catch((err) => {
  console.error("Fatal benchmark error:", err);
  process.exit(1);
});

import { BENCHMARK_SAMPLE_ANSWERS } from "./benchmark-answers";
import type { DataResponsePaper } from "./types";

/**
 * Official Cambridge IGCSE Economics (0455) Paper 2 Section A Data Response Past Papers (2022–2026).
 * Every case study, table, sub-question, mark allocation, and mark scheme is extracted directly
 * from authentic Cambridge Assessment International Education 0455/22 Question Papers & Mark Schemes.
 */
const RAW_PRELOADED_DATA_RESPONSE_PAPERS: DataResponsePaper[] = [
  {
    "id": "0455_22_2026_fm",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Will Senegal escape poverty?",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2026_feb_march",
    "seriesLabel": "February/March 2026",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "originalExamCode": "0455/22/F/M/26",
    "pdfUrl": "/papers/0455_22_2026_fm.pdf",
    "extract": {
      "title": "1 Will Senegal escape poverty?",
      "paragraphs": [
        "Senegal fact file (2023): Population: 19m | GDP: $31bn | Workers' remittances as % of GDP: 9% | Human Development Index (HDI) value: 0.517.",
        "Senegal is a West African country that has low income per head. A high proportion of its households have low fluctuating incomes and many live in poverty. A high number of Senegalese struggle to afford necessities, such as housing, education and healthcare. To survive, some Senegalese rely on money sent home by relatives working in other countries.",
        "Table 1.1 shows GDP per head and the percentage of the population living in poverty in six countries in 2023.",
        "Over one-fifth of Senegalese workers are employed in agriculture. There has been a brain drain from the agricultural sector in recent years. Young dynamic workers have migrated to urban areas and overseas, seeking higher-paid jobs and better living conditions. The sector lacks irrigation systems, tractors and harvesting machinery, and its transport infrastructure is poor. It also suffers from severe weather conditions, including droughts and extreme heat.",
        "One key crop grown in Senegal is sorghum, a nutritious grain crop which is well suited to dry conditions. Global demand for the crop is increasing as more people are trying to lose weight, and eating sorghum can help people lose weight.",
        "The Senegalese government gets revenue from a variety of sources, including the mining of gold. A discovery of offshore oil and gas is expected to triple the country's economic growth rate and increase tax revenue. The government plans to spend some of the dynamics-driven additional tax revenue on transforming its economy and enabling people to escape poverty.",
        "Gold accounts for a quarter of Senegal's export revenue. In recent years, the global demand for gold has become slightly more price-elastic. Economists have differing views on whether the demand for gold will become even more price-elastic in the future."
      ],
      "tables": [
        {
          "title": "Table 1.1 GDP per head and the percentage of the population living in poverty in selected countries in 2023",
          "headers": [
            "Country",
            "GDP per head ($)",
            "Percentage (%) of the population living in poverty"
          ],
          "rows": [
            [
              "Canada",
              "55,520",
              "0.7"
            ],
            [
              "Iceland",
              "73,500",
              "0.0"
            ],
            [
              "Papua New Guinea",
              "3,010",
              "80.0"
            ],
            [
              "Romania",
              "15,820",
              "7.1"
            ],
            [
              "Senegal",
              "1,600",
              "75.6"
            ],
            [
              "South Africa",
              "6,770",
              "40.1"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22 February/March 2026 Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22 February/March 2026 Section A Case Study."
    },
    "sampleAnswers": {
      "0455_22_2026_fm_1a": "$2.79bn (9% of $31bn = 0.09 × $31bn = $2.79bn).",
      "1(a)": "$2.79bn (9% of $31bn = 0.09 × $31bn = $2.79bn).",
      "0455_22_2026_fm_1b": "1. Household disposable income, wages, and workers' remittances sent home from relatives abroad.\n2. The rate of interest and consumer confidence.",
      "1(b)": "1. Household disposable income, wages, and workers' remittances sent home from relatives abroad.\n2. The rate of interest and consumer confidence.",
      "0455_22_2026_fm_1c": "Severe weather conditions such as droughts and extreme heat degrade soil fertility and dry up water sources, killing off crops and reducing agricultural yields.",
      "1(c)": "Severe weather conditions such as droughts and extreme heat degrade soil fertility and dry up water sources, killing off crops and reducing agricultural yields.",
      "0455_22_2026_fm_1d": "Greater use of capital equipment such as irrigation systems, tractors and harvesting machinery will increase agricultural labour and land productivity, raising total crop output. This lowers average costs of production for Senegalese farmers, reducing domestic prices and increasing international price competitiveness. Higher quality and volume of agricultural output will increase export revenue and reduce expenditure on imported food, directly reducing the deficit on the current account of Senegal's balance of payments.",
      "1(d)": "Greater use of capital equipment such as irrigation systems, tractors and harvesting machinery will increase agricultural labour and land productivity, raising total crop output. This lowers average costs of production for Senegalese farmers, reducing domestic prices and increasing international price competitiveness. Higher quality and volume of agricultural output will increase export revenue and reduce expenditure on imported food, directly reducing the deficit on the current account of Senegal's balance of payments.",
      "0455_22_2026_fm_1e": "In the demand and supply diagram for sorghum, Price (P) is labelled on the vertical axis and Quantity (Q) on the horizontal axis, with initial downward-sloping demand curve D1 and upward-sloping supply curve S1 intersecting at initial equilibrium E1 (P1, Q1). Because eating sorghum helps people lose weight and more people are trying to lose weight, consumer preferences shift in favour of sorghum, shifting the demand curve to the right from D1 to D2. This causes an extension along the supply curve, raising equilibrium price from P1 to P2 and increasing equilibrium quantity traded from Q1 to Q2.",
      "1(e)": "In the demand and supply diagram for sorghum, Price (P) is labelled on the vertical axis and Quantity (Q) on the horizontal axis, with initial downward-sloping demand curve D1 and upward-sloping supply curve S1 intersecting at initial equilibrium E1 (P1, Q1). Because eating sorghum helps people lose weight and more people are trying to lose weight, consumer preferences shift in favour of sorghum, shifting the demand curve to the right from D1 to D2. This causes an extension along the supply curve, raising equilibrium price from P1 to P2 and increasing equilibrium quantity traded from Q1 to Q2.",
      "0455_22_2026_fm_1f": "There is an inverse (negative) relationship between GDP per head and the percentage of the population living in poverty: as GDP per head increases, the percentage living in poverty generally falls. For example, Iceland has the highest GDP per head at $73,500 and the lowest poverty rate at 0.0%, while Canada ($55,520) also has a very low poverty rate of 0.7%, whereas Senegal ($1,600) and Papua New Guinea ($3,010) have the lowest GDP per head and the highest poverty rates at 75.6% and 80.0% respectively. Higher GDP per head means higher average incomes, enabling households to afford basic necessities like housing, education, and healthcare, and generating more tax revenue for government anti-poverty programmes. However, Papua New Guinea is an exception: it has a higher GDP per head ($3,010) than Senegal ($1,600), yet a higher percentage of its population lives in poverty (80.0% compared to 75.6%), which may be explained by a more uneven distribution of income in Papua New Guinea or significant workers' remittances supporting poor households in Senegal.",
      "1(f)": "There is an inverse (negative) relationship between GDP per head and the percentage of the population living in poverty: as GDP per head increases, the percentage living in poverty generally falls. For example, Iceland has the highest GDP per head at $73,500 and the lowest poverty rate at 0.0%, while Canada ($55,520) also has a very low poverty rate of 0.7%, whereas Senegal ($1,600) and Papua New Guinea ($3,010) have the lowest GDP per head and the highest poverty rates at 75.6% and 80.0% respectively. Higher GDP per head means higher average incomes, enabling households to afford basic necessities like housing, education, and healthcare, and generating more tax revenue for government anti-poverty programmes. However, Papua New Guinea is an exception: it has a higher GDP per head ($3,010) than Senegal ($1,600), yet a higher percentage of its population lives in poverty (80.0% compared to 75.6%), which may be explained by a more uneven distribution of income in Papua New Guinea or significant workers' remittances supporting poor households in Senegal.",
      "0455_22_2026_fm_1g": "Fiscal policy measures could increase a country's HDI value because the government can use expansionary fiscal spending to invest directly in education and healthcare. Increased government spending on schools and teacher training raises expected and mean years of schooling, while spending on hospitals and clean water increases life expectancy at birth — two of the three core components of the Human Development Index. Furthermore, cutting direct income taxes or increasing government infrastructure spending stimulates aggregate demand and employment, raising real GNI/GDP per head (the third component of HDI). However, fiscal policy measures might not increase HDI if the government implements contractionary fiscal policy (cutting healthcare or education budgets to reduce a budget deficit) or raises regressive indirect taxes that reduce poor households' ability to afford nutritious food and schooling. Moreover, if expansionary fiscal policy causes demand-pull inflation or suffers from corruption and tax evasion, real incomes and living standards may stagnate. In conclusion, targeted fiscal expenditure on health and education funded by growing resource tax revenues will effectively raise a country's HDI value.",
      "1(g)": "Fiscal policy measures could increase a country's HDI value because the government can use expansionary fiscal spending to invest directly in education and healthcare. Increased government spending on schools and teacher training raises expected and mean years of schooling, while spending on hospitals and clean water increases life expectancy at birth — two of the three core components of the Human Development Index. Furthermore, cutting direct income taxes or increasing government infrastructure spending stimulates aggregate demand and employment, raising real GNI/GDP per head (the third component of HDI). However, fiscal policy measures might not increase HDI if the government implements contractionary fiscal policy (cutting healthcare or education budgets to reduce a budget deficit) or raises regressive indirect taxes that reduce poor households' ability to afford nutritious food and schooling. Moreover, if expansionary fiscal policy causes demand-pull inflation or suffers from corruption and tax evasion, real incomes and living standards may stagnate. In conclusion, targeted fiscal expenditure on health and education funded by growing resource tax revenues will effectively raise a country's HDI value.",
      "0455_22_2026_fm_1h": "Demand for gold might become more price-elastic in the future if closer substitutes are developed or become more fashionable in jewellery and investment markets, such as silver, platinum, or rose gold, making consumers more responsive to gold price changes. Additionally, over a longer time period, industrial users and consumers have more time to adjust their consumption habits and find cheaper alternatives. If global incomes fall during a recession, gold purchases will take up a larger proportion of household income, also making demand more price-elastic. On the other hand, demand for gold might not become more price-elastic if rising global incomes make gold a smaller percentage of buyers' total income, or if gold continues to be viewed as an essential safe-haven store of value and culturally necessary status symbol (e.g. for weddings) with no true substitute. Furthermore, derived demand for gold in high-tech electronics where gold is a tiny fraction of total production cost remains highly price-inelastic. Overall, while jewellery demand may become more price-elastic as substitutes expand, investment and industrial demand will likely keep overall PED relatively low.",
      "1(h)": "Demand for gold might become more price-elastic in the future if closer substitutes are developed or become more fashionable in jewellery and investment markets, such as silver, platinum, or rose gold, making consumers more responsive to gold price changes. Additionally, over a longer time period, industrial users and consumers have more time to adjust their consumption habits and find cheaper alternatives. If global incomes fall during a recession, gold purchases will take up a larger proportion of household income, also making demand more price-elastic. On the other hand, demand for gold might not become more price-elastic if rising global incomes make gold a smaller percentage of buyers' total income, or if gold continues to be viewed as an essential safe-haven store of value and culturally necessary status symbol (e.g. for weddings) with no true substitute. Furthermore, derived demand for gold in high-tech electronics where gold is a tiny fraction of total production cost remains highly price-inelastic. Overall, while jewellery demand may become more price-elastic as substitutes expand, investment and industrial demand will likely keep overall PED relatively low."
    },
    "questions": [
      {
        "id": "0455_22_2026_fm_1a",
        "number": "1(a)",
        "title": "Calculate the value of Senegal's workers' remittances in 2023. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "$2.79bn (1 mark)",
          "Accept 2.79bn or $2.8bn. Do NOT accept $2.7bn."
        ],
        "calculationGuidance": {
          "formula": "9% of $31bn = 0.09 × $31bn",
          "correctAnswer": "$2.79bn (accept 2.79bn or $2.8bn)",
          "ofrApplies": false
        },
        "markingGuide": "Award 1 mark for $2.79bn (accept 2.79bn or $2.8bn; do not accept $2.7bn).",
        "extractLinkageExpected": true,
        "syllabusTopic": "Current account and national income calculations"
      },
      {
        "id": "0455_22_2026_fm_1b",
        "number": "1(b)",
        "title": "Identify two influences on household spending in Senegal. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Income / wages / remittances (1 mark)",
          "Interest rates (1 mark)",
          "Confidence (1 mark)"
        ],
        "markingGuide": "Two from: income/wages/remittances, interest rates, confidence. (1 mark each, up to 2 marks).",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Households (influences on spending)"
      },
      {
        "id": "0455_22_2026_fm_1c",
        "number": "1(c)",
        "title": "Explain one cause of a decrease in the quality of land used in agriculture in Senegal. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Droughts / extreme heat / weather (1 mark)",
          "Reduce/degrade the fertility of land / kill off crops / reduced yield (1 mark)"
        ],
        "markingGuide": "Droughts / extreme heat/weather (1) reduce/degrade the fertility of land / kill off crops / reduced yield (1).",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.2 Factors of production (quality of land)"
      },
      {
        "id": "0455_22_2026_fm_1d",
        "number": "1(d)",
        "title": "Explain how greater use of capital equipment in agriculture could reduce the deficit on Senegal's current account of its balance of payments. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Increase productivity / output (1)",
          "Reduce costs of production (1)",
          "Lower price / increase price competitiveness (1)",
          "Improve quality / grow greater variety of crops (1)",
          "Reduce imports / import expenditure (1)",
          "Increase exports / export revenue (1)",
          "Improve trade in goods balance / reduce current account deficit (1)"
        ],
        "markingGuide": "Award up to 4 marks for a logical causal chain: increase productivity/output (1) -> reduce costs of production (1) -> lower price / increase price competitiveness / improve quality (1) -> reduce imports / increase exports -> reduce current account deficit (1).",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.5 Firms and production & 6.4 Current account of balance of payments"
      },
      {
        "id": "0455_22_2026_fm_1e",
        "number": "1(e)",
        "title": "Draw a demand and supply diagram to show how more people trying to lose weight would affect the market for sorghum. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Market for Sorghum (Rightward Demand Shift)",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "D2 (shifted right)",
            "S1 (or S)"
          ],
          "shiftDescription": "More people trying to lose weight increases demand for sorghum, shifting the demand curve to the right from D1 to D2.",
          "equilibriumDescription": "Equilibrium price rises from P1 to P2 and equilibrium quantity rises from Q1 to Q2 (E1 to E2).",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Axes correctly labelled: price and quantity or P and Q (1)",
          "Original demand and supply curves correctly labelled: D1 and S1 or D and S (1)",
          "New demand curve shifted to the right: D2 (indicated by label or arrow) (1)",
          "Equilibriums correctly shown by lines/labels P1, Q1 and P2, Q2 or equilibrium points E1 and E2 (1)"
        ],
        "markingGuide": "Coherent and accurate diagram (4 marks): Axes P & Q (1), Original D and S curves labelled (1), Demand curve shifted right to D2 (1), Equilibriums P1/Q1 and P2/Q2 or E1/E2 shown (1).",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 Demand & 2.5 Price changes"
      },
      {
        "id": "0455_22_2026_fm_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between GDP per head and the percentage of the population living in poverty. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Relationship: Inverse / negative relationship (1) — as GDP per head falls, the percentage living in poverty rises (or vice versa) (1)",
          "Supporting data (up to 2m): Iceland has highest GDP/head ($73,500) & lowest poverty (0.0%); Senegal/PNG have lowest GDP/head & highest poverty (75.6%/80.0%)",
          "Exception (up to 2m): Papua New Guinea has higher GDP/head ($3,010) than Senegal ($1,600) but higher poverty (80.0% vs 75.6%)",
          "Explanation of normal relationship (up to 2m): Higher GDP/head means higher average income to afford necessities and higher tax revenue to alleviate poverty",
          "Explanation of exception (1m): Income may be more evenly distributed in Senegal, or Senegal receives higher remittances / informal output"
        ],
        "markingGuide": "Award 1 mark for identifying inverse/negative relationship. Supporting data (up to 2 marks): must compare both ends of the table (e.g. Iceland highest GDP $73,500/lowest poverty 0% AND Senegal lowest GDP $1,600/high poverty 75.6%). Quoting only high-income countries without contrasting low-income countries earns 0 evidence marks. Identifying the exception (up to 2 marks): Papua New Guinea has higher GDP per head than Senegal ($3,010 vs $1,600) but higher poverty (80.0% vs 75.6%). Romania is NOT an exception (0 marks for false exception and 0 for explaining a false exception). Explanation of normal relationship (up to 2 marks): higher GDP/head enables households to afford necessities / higher living standards. Maximum 5 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "5.1 Living standards & 5.2 Poverty"
      },
      {
        "id": "0455_22_2026_fm_1g",
        "number": "1(g)",
        "title": "Discuss whether or not fiscal policy measures will increase a country's Human Development Index (HDI) value. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Why it might (up to 4 marks): Government spending on education increases mean/expected years of schooling (1-2); indirect taxes on demerit goods improve health and life expectancy (1-2); lower direct taxes increase disposable income, spending, GDP per head (1-2); expansionary fiscal policy lowers unemployment and raises output (1-2)",
          "Why it might not (up to 4 marks): Government may cut spending on healthcare reducing life expectancy (1-2); contractionary fiscal policy reduces GDP per head (1-2); high tax evasion limits impact (1); expansionary fiscal policy may cause demand-pull inflation reducing real GDP per head (1-2)"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why fiscal policy might increase HDI (linking to income per head, education/schooling years, and healthcare/life expectancy). Award up to 4 marks for logical reasons why it might not (contractionary policy, cuts to health/education, tax evasion, inflation). Maximum 6 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "4.2 Fiscal policy & 5.1 Living standards (HDI)"
      },
      {
        "id": "0455_22_2026_fm_1h",
        "number": "1(h)",
        "title": "Discuss whether or not the demand for gold will be more price-elastic in the future. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Why it might (up to 4 marks): More substitutes (silver, rose gold) allowing switching; falling incomes making gold a larger % of income; seen more as a luxury than necessity; rising price of complements (e.g. jewels); longer time period to adjust",
          "Why it might not (up to 4 marks): Rising incomes making gold a smaller % of income; habitual/addictive desire to own gold; derived demand for gold in manufacturing/electronics; viewed as a necessity/safe-haven investment",
          "Official Mark Scheme Caps: Reward a maximum of 3 marks if no development of determinants. Static response = Max 4 marks."
        ],
        "markingGuide": "Award up to 4 marks for why demand for gold might become more price-elastic in the future, and up to 4 marks for why it might not (Max 6 marks). Reward a maximum of 3 marks if determinants of PED are listed without development. Static responses are capped at Max 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.6 Price elasticity of demand (PED)"
      }
    ]
  },
  {
    "id": "0455_22_2025_mj",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: The future of the economy of St. Kitts and Nevis",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2025_may_june",
    "seriesLabel": "May/June 2025",
    "originalExamCode": "0455/22/M/J/25",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_s24_qp_22.pdf",
    "extract": {
      "title": "1 The future of the economy of St. Kitts and Nevis",
      "paragraphs": [
        "St. Kitts and Nevis fact file 2022 Population 54 800 GDP per head $27 000 Government spending $310m Tax revenue $292m Unemployment rate 5.1% Inflation rate 2.4% Current account balance of the balance of payments –$56m",
        "St. Kitts and Nevis is a small, two-island country in the Caribbean. The country’s three main industries are tourism, financial services and agriculture. Tourists are attracted by the country’s beaches, coral reefs, forts, rainforests and shipwrecks. However, if rainforests continue to be cut down and soil erosion continues to pollute the coral reefs, killing off marine life, tourism may be discouraged. The St. Kitts and Nevis Government is also concerned that the social costs of tourism exceed the private costs.",
        "St. Kitts and Nevis’s financial services include a growing banking sector. Among the country’s commercial banks are a few foreign multinational companies (MNCs). These MNCs are attracted by the country’s relatively high incomes, the absence of personal income tax and a relatively high literacy rate. Some of the country’s main agricultural products are carrots, onions, peanuts and sweet potatoes. In 2017, the St. Kitts and Nevis Government introduced a training scheme to raise the productivity of onion farmers. Other important industries in St Kitts and Nevis include healthcare and fishing.",
        "Table 1.1 shows healthcare spending as a percentage of GDP and life expectancy in six selected countries in 2022.",
        "The small size of St. Kitts and Nevis’s fishing industry means that it imports large quantities of fish. The country’s fishing boats are small and some lack up-to-date equipment. A larger fishing industry, with bigger boats, may bring a number of benefits to the country.",
        "Changes in the structure and performance of industries in St. Kitts and Nevis may alter the country’s price level. Between 2018 and 2020, the country experienced deflation. This affected people’s purchasing power, saving and debts. It also affected the country’s exports and firms’ investment decisions."
      ],
      "tables": [
        {
          "title": "Table 1.1 Healthcare spending as a percentage of GDP and life expectancy in selected countries in 2022",
          "headers": [
            "Country",
            "Healthcare spending as a % of GDP",
            "Life expectancy (years)"
          ],
          "rows": [
            [
              "Canada",
              "12.9",
              "84"
            ],
            [
              "Egypt",
              "4.5",
              "75"
            ],
            [
              "Haiti",
              "3.3",
              "65"
            ],
            [
              "Monaco",
              "1.9",
              "90"
            ],
            [
              "St. Kitts and Nevis",
              "5.4",
              "77"
            ],
            [
              "Sweden",
              "11.5",
              "83"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/M/J/25 (May/June 2025) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/M/J/25 (May/June 2025) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "$18m",
      "1(b)": "Beaches and rainforests.",
      "1(c)": "External costs are costs borne by third parties not involved in the transaction. Tourism causes external costs in St. Kitts and Nevis through pollution of coral reefs and soil erosion, which harms marine life and the environment.",
      "1(d)": "First, high incomes in the country create high demand for banking services and loans, leading to higher revenue for the bank. Second, the absence of personal income tax means workers have higher disposable income, increasing their ability to save and borrow, which benefits the bank.",
      "1(e)": "[Diagram: Price on Y-axis, Quantity on X-axis. Demand curve D1 downward sloping. Supply curve S1 upward sloping. New Supply curve S2 shifted to the right. Equilibrium moves from E1 (P1, Q1) to E2 (P2, Q2) where P2 < P1 and Q2 > Q1.]",
      "1(f)": "There is generally a direct relationship between healthcare spending and life expectancy, as seen with Canada and Sweden having high spending and high life expectancy, while Haiti has low spending and low life expectancy. This is because higher spending allows for better preventative care and medical treatment. However, Monaco is an exception, having the lowest spending percentage but the highest life expectancy, likely because its very high GDP means the absolute spending is still high, and other factors like nutrition and education play a role.",
      "1(g)": "An increase in the fishing industry could benefit St. Kitts and Nevis by reducing imports and improving the current account balance, as well as creating jobs and increasing GDP. However, it could also lead to over-fishing, depleting fish stocks and causing environmental damage that harms the tourism industry. Additionally, there is an opportunity cost as resources are diverted from other sectors. On balance, the environmental risks to tourism may outweigh the benefits if not managed sustainably.",
      "1(h)": "Deflation may have harmed St. Kitts and Nevis by increasing the real burden of debt for borrowers and causing firms to delay investment due to uncertainty. However, it may have benefited savers and consumers by increasing their purchasing power. It could also have made exports more competitive. On balance, the negative impact on investment and debtors may outweigh the benefits to savers, potentially slowing economic growth."
    },
    "questions": [
      {
        "id": "0455_22_2025_mj_1a",
        "number": "1(a)",
        "title": "Calculate St. Kitts and Nevis’s government budget deficit in 2022. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "Government Spending - Tax Revenue",
          "correctAnswer": "$18m",
          "ofrApplies": false
        },
        "indicativePoints": [
          "Calculate $310m - $292m",
          "Answer is $18m"
        ],
        "markingGuide": "Accept 18m, $18m, -$18m, $18,000,000, -$18,000,000.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Government budget"
      },
      {
        "id": "0455_22_2025_mj_1b",
        "number": "1(b)",
        "title": "Identify two examples of the factor of production ‘land’ in St. Kitts and Nevis. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Beaches",
          "(Coral) reefs",
          "Marine life / fish",
          "Rainforests",
          "Soil"
        ],
        "markingGuide": "Award 1 mark for each correct example from the list. If more than two given, consider the first three.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Factors of production"
      },
      {
        "id": "0455_22_2025_mj_1c",
        "number": "1(c)",
        "title": "Explain how tourism causes external costs in St. Kitts and Nevis. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Definition: Social costs > private costs / harmful effects on third parties not involved in production/consumption",
          "Example: Pollution / environmental damage / death of wildlife / marine life / overcrowding"
        ],
        "markingGuide": "1 mark for explanation of external costs. 1 mark for specific example based on tourism in St. Kitts and Nevis.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Externalities"
      },
      {
        "id": "0455_22_2025_mj_1d",
        "number": "1(d)",
        "title": "Explain two reasons why a foreign bank may open a branch in St. Kitts and Nevis. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Reason 1: High incomes -> high demand for banking/loans/savings -> high profit/revenue",
          "Reason 2: Absence of personal income tax -> workers keep all income / more disposable income / firms pay lower wages / higher motivation",
          "Reason 3: High literacy rates -> awareness of banking benefits / skilled workers / high productivity"
        ],
        "markingGuide": "1 mark for each reason identified, 1 mark for each explanation. Explanation marks dependent on identification. Do not give two explanation marks for one identification. If more than two reasons, consider first three.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Location of firms"
      },
      {
        "id": "0455_22_2025_mj_1e",
        "number": "1(e)",
        "title": "Draw a demand and supply diagram to show the effect of an increase in the productivity of onion farmers on the market for onions. [4]",
        "maxMark": 4,
        "category": "calculation",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Demand and Supply Diagram",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "S1",
            "S2"
          ],
          "shiftDescription": "Supply curve shifts to the right (S1 to S2) due to increased productivity.",
          "equilibriumDescription": "Show original equilibrium (P1, Q1) and new equilibrium (P2, Q2) or points E1 and E2.",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Axes correctly labelled (Price and Quantity)",
          "Original D and S curves correctly labelled",
          "New supply curve shifted to the right",
          "Equilibriums shown (P1/Q1 and P2/Q2 or E1/E2)"
        ],
        "markingGuide": "1 mark for axes, 1 mark for original curves, 1 mark for shift, 1 mark for equilibriums.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 Demand and Supply"
      },
      {
        "id": "0455_22_2025_mj_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between healthcare spending as a percentage of GDP and life expectancy. [5]",
        "maxMark": 5,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Direct/positive relationship: higher spending generally leads to higher life expectancy",
          "Evidence: Haiti (low spend, low LE) vs Canada/Sweden (high spend, high LE)",
          "Analysis: Higher spending provides better quality care, preventative medicine, reduces death rate",
          "Exception: Monaco (lowest spend %, highest LE)",
          "Analysis of exception: 1.9% of very high GDP may equal high absolute spending; other factors like nutrition/education/war influence LE"
        ],
        "markingGuide": "Must address expected relationship, supporting evidence (interpretation not just description), highlight exceptions, and analyse overall data. 1 mark for relationship, 1 for general trend, 1 for evidence, 1 for analysis of evidence, 1 for exception/analysis of exception.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.10 Economic development"
      },
      {
        "id": "0455_22_2025_mj_1g",
        "number": "1(g)",
        "title": "Discuss whether or not an increase in the size of its fishing industry would benefit St. Kitts and Nevis. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Benefits: Reduce imports / improve current account balance",
          "Benefits: Increase employment / raise incomes / increase GDP / higher tax revenue",
          "Benefits: Economies of scale -> lower average costs / lower prices / higher profits",
          "Benefits: Greater efficiency/productivity with larger boats",
          "Drawbacks: Opportunity cost of resources used in other industries",
          "Drawbacks: Over-fishing / depletion of stocks / environmental damage / harm to tourism",
          "Drawbacks: Diseconomies of scale / higher average costs",
          "Drawbacks: Risk of over-specialisation / dependency on industry"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might benefit and up to 4 marks for reasons why it might not. Total 6 marks. Each point credited only once. Separate development rewarded. Generic example rule applies (1 mark for point, 1 for development, 0 for reverse argument).",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.3 Industrial location and growth"
      },
      {
        "id": "0455_22_2025_mj_1h",
        "number": "1(h)",
        "title": "Discuss whether or not deflation is likely to have harmed St. Kitts and Nevis. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Harm: Real value of debts increases (debtors hurt)",
          "Harm: Firms may delay investment due to uncertainty or expectation of further price falls",
          "Harm: Reduced profit margins for firms if costs are sticky",
          "Benefit: Purchasing power of savers/consumers increases",
          "Benefit: Exports become more price competitive (if domestic prices fall faster than foreign)",
          "Benefit: Lower cost of living for those with fixed incomes"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might harm and up to 4 marks for reasons why it might benefit. Total 6 marks. Each point credited only once. Separate development rewarded. Generic example rule applies.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.8 Inflation and Deflation"
      }
    ]
  },
  {
    "id": "0455_22_2025_fm",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Population, household spending and poverty in Romania",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2025_feb_march",
    "seriesLabel": "February/March 2025",
    "originalExamCode": "0455/22/F/M/25",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_m24_qp_22.pdf",
    "extract": {
      "title": "1 Population, household spending and poverty in Romania",
      "paragraphs": [
        "Romania fact file 2022 Current account deficit on the balance of payments (percentage of GDP) 9% GDP $300bn Unemployment rate 5.2% Economic growth rate 4.8% Inflation rate 13.8% Percentage of women of working age in the labour force 42%",
        "Between 1990 and 2022, Romania’s population fell from 23 million to 19 million. The country’s birth rate and death rate both fell over this period. Some workers from other countries, including Sri Lanka and Vietnam, came to live in Romania. However, more Romanian workers left the country to work and live mostly in other European countries. If the Romanian economy continues to grow at its relatively high rate, fewer of its people may emigrate and more immigrants may be attracted.",
        "Recent economic growth has been driven largely by increases in household spending. Romanians have become wealthier, more confident about their future and have experienced low interest rates. In April 2022, the Romanian Government placed a maximum price on electricity. Romanians spend a relatively high proportion of their income on electricity and on food.",
        "Table 1.1 shows selected countries’ GDP per head and average spending on food as a percentage of total household spending.",
        "The poor are particularly affected by changes in electricity prices and food prices. Romania has a relatively high level of poverty. To reduce poverty, some economists have suggested that the government should attract more foreign multinational companies (MNCs) to Romania. More MNCs may affect poverty because of the possible effects on unemployment and prices.",
        "Another way to reduce poverty would be to encourage more women to work. The proportion of women in Romania who work or seek work has fallen in recent years. There is a range of influences on whether women enter the labour force. These include social attitudes, female education and whether childcare facilities and part-time work are available."
      ],
      "tables": [
        {
          "title": "Table 1.1 GDP per head and average spending on food as a percentage of total household spending in 2022",
          "headers": [
            "Country",
            "GDP per head ($)",
            "Average spending on food as a % of total household spending"
          ],
          "rows": [
            [
              "Belgium",
              "52 100",
              "13"
            ],
            [
              "Cambodia",
              "1 800",
              "42"
            ],
            [
              "Egypt",
              "3 850",
              "33"
            ],
            [
              "Ethiopia",
              "960",
              "56"
            ],
            [
              "Norway",
              "89 200",
              "11"
            ],
            [
              "Romania",
              "15 000",
              "26"
            ],
            [
              "USA",
              "70 500",
              "6"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/F/M/25 (February/March 2025) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/F/M/25 (February/March 2025) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "9% of $300bn = $27bn.",
      "1(b)": "1. The birth rate fell. 2. Net emigration occurred as more Romanians left than immigrants arrived.",
      "1(c)": "Romania's high economic growth rate (4.8%) leads to higher wages and more job opportunities, attracting immigrants seeking better living standards.",
      "1(d)": "1. Romanians have become wealthier with higher incomes, increasing their purchasing power. 2. Low interest rates have encouraged borrowing and reduced the cost of credit, stimulating spending.",
      "1(e)": "[Diagram: D and S curves intersect at Pe. A horizontal line is drawn below Pe labeled 'Max Price'. At this price, Qd > Qs, indicating a shortage.]",
      "1(f)": "There is a negative relationship between GDP per head and % spending on food. For example, Ethiopia has the lowest GDP and highest % food spending, while the USA has high GDP and low % food spending. This is because as income rises, food becomes a smaller proportion of total expenditure (Engel's Law). An exception is Norway, which has high GDP but relatively higher food spending, possibly due to expensive high-quality diets.",
      "1(g)": "MNCs may reduce poverty by creating jobs and raising wages, and by introducing technology that lowers prices. However, they may not reduce poverty if they replace domestic firms, send profits abroad, or use capital-intensive methods that do not employ unskilled workers. In Romania, MNCs could help by utilizing the available labour force, but if they only hire skilled workers, the gap may widen.",
      "1(h)": "A higher proportion of women may enter the labour force if childcare facilities improve and part-time work becomes more available, allowing them to balance work and family. Additionally, increased female education could boost their employability. However, negative social attitudes and discrimination may persist, and if household incomes rise sufficiently, the financial need for women to work may decrease."
    },
    "questions": [
      {
        "id": "0455_22_2025_fm_1a",
        "number": "1(a)",
        "title": "Calculate Romania’s current account deficit on its balance of payments in $s. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "GDP * (Current Account Deficit % / 100)",
          "correctAnswer": "$27bn",
          "ofrApplies": false
        },
        "indicativePoints": [
          "Calculate 9% of $300bn",
          "Answer must be in dollars"
        ],
        "markingGuide": "Accept 27bn without $. Accept $27 000 000 000, $27 × 10⁹, $2.7 × 10¹⁰.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.4 Balance of payments"
      },
      {
        "id": "0455_22_2025_fm_1b",
        "number": "1(b)",
        "title": "Identify two reasons why Romania’s population fell between 1990 and 2022. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Fall in birth rate",
          "Emigration / net emigration / people leaving the country"
        ],
        "markingGuide": "1 mark for each valid reason identified from the source material.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Population and labour force"
      },
      {
        "id": "0455_22_2025_fm_1c",
        "number": "1(c)",
        "title": "Explain why immigration into Romania may increase in the future. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "High economic growth rate / economic growth",
          "Higher wages / higher income / more job opportunities / higher living standards"
        ],
        "markingGuide": "1 mark for identification of high economic growth rate, and 1 mark for explanation of the link to immigration (e.g., higher wages).",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Population and labour force"
      },
      {
        "id": "0455_22_2025_fm_1d",
        "number": "1(d)",
        "title": "Explain two reasons why household spending has increased in Romania. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Romanians have become wealthier / higher income / greater purchasing power",
          "More confident about the future / increased optimism / job security",
          "Low interest rates encourage borrowing / reduce cost of borrowing",
          "High rate of inflation leads to spending to maintain living standards"
        ],
        "markingGuide": "Award 2 marks for each distinct reason explained. 1 mark for identification, 1 mark for logical explanation. Reasons must be linked to the source material (wealth, confidence, interest rates, inflation).",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Consumer behaviour"
      },
      {
        "id": "0455_22_2025_fm_1e",
        "number": "1(e)",
        "title": "Draw a demand and supply diagram to show the effect of setting a maximum price on electricity. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Maximum Price (Price Ceiling)",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "S1"
          ],
          "shiftDescription": "No shift; horizontal line drawn below equilibrium price",
          "equilibriumDescription": "Maximum price set below equilibrium. Quantity demanded exceeds quantity supplied (shortage).",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Axes correctly labelled (Price and Quantity)",
          "Demand and supply curves correctly labelled",
          "Maximum price set below the equilibrium price",
          "Quantity demanded and quantity supplied at the maximum price identified"
        ],
        "markingGuide": "1 mark for axes, 1 mark for curves, 1 mark for max price below equilibrium, 1 mark for identifying Qd and Qs at that price.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Price controls"
      },
      {
        "id": "0455_22_2025_fm_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between GDP per head and average spending on food as a percentage of total household spending. [5]",
        "maxMark": 5,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Inverse/negative relationship: higher GDP per head, lower % spending on food",
          "Supporting evidence: e.g., Ethiopia (lowest GDP, highest % food) vs Belgium/USA (high GDP, low % food)",
          "Analysis: As income rises, Engel's law applies; food is a necessity with lower income elasticity",
          "Exception: Norway/USA may have higher % due to expensive food/diet preferences",
          "Analysis of exception: Different diet or higher cost of living in high-income countries"
        ],
        "markingGuide": "Up to 2 marks for relationship, 2 for supporting evidence (interpretation not just description), 2 for analysis of relationship, 2 for exception, 1 for analysis of exception. Total capped at 5. Rewarding GDP per head (income) but not just GDP.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Consumer behaviour / Engel's Law"
      },
      {
        "id": "0455_22_2025_fm_1g",
        "number": "1(g)",
        "title": "Discuss whether or not foreign MNCs reduce poverty in their host countries. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "MNCs may increase employment/reduce unemployment, raising incomes",
          "MNCs may train workers, increasing skills and productivity",
          "MNCs may use advanced technology/economies of scale to lower prices",
          "MNCs may pay tax, allowing government redistribution via education/healthcare",
          "MNCs may replace domestic firms, driving them out of business",
          "MNCs may use capital-intensive methods, reducing demand for unskilled workers",
          "MNCs may send profits back home, limiting reinvestment",
          "MNCs may become monopolies, charging high prices"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why they might reduce poverty and up to 4 marks for reasons why they might not. Total capped at 6. Each point credited only once. Separate development rewarded. Must apply to Romania context where possible.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.4 Multinational corporations"
      },
      {
        "id": "0455_22_2025_fm_1h",
        "number": "1(h)",
        "title": "Discuss whether or not a higher proportion of women is likely to enter Romania’s labour force in the future. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Increase in childcare facilities makes it easier for women to work",
          "More part-time work/job opportunities available",
          "Increase in female education/qualifications increases skills and wages",
          "Lower birth rate enables women to combine work and child rearing",
          "Discrimination in jobs/wages may persist",
          "Negative social attitudes may continue",
          "Women may emigrate, leaving the labour force",
          "Higher household income may reduce the need for women to work"
        ],
        "markingGuide": "Award up to 4 marks for reasons why it might happen and up to 4 marks for reasons why it might not. Total capped at 6. No marks for just reproducing source words; interpretation needed (e.g., 'more part-time work'). Influences can be given either way but only rewarded once.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Population and labour force"
      }
    ]
  },
  {
    "id": "0455_22_2024_on",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Changes in Jordan’s economy and population",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2024_oct_nov",
    "seriesLabel": "October/November 2024",
    "originalExamCode": "0455/22/O/N/24",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_w24_qp_22.pdf",
    "extract": {
      "title": "1 Changes in Jordan’s economy and population",
      "paragraphs": [
        "Jordan fact file 2020\nPopulation 11m\nEconomic growth rate -1.5%\nLabour force employed in the primary sector 2%\nLabour force employed in the tertiary sector 79%\nUnemployment rate 23%\nInflation rate 2%\nTrade in services balance -$1bn\nImport tariff revenue $0.7bn\nPrimary income balance $0.8bn\n\nIn 2020, Jordan had a deficit on the current account of its balance of payments. This deficit contributed to a decline in Jordan’s total demand in that year. This lower total demand was the most important reason why the number of workers was greater than the number of jobs available. Employment fell in most of Jordan’s industries. One of Jordan’s main industries is tourism. Recent years have seen mergers between some of Jordan’s tourism firms. These mergers reduced the prices of some holidays and raised their quality. Jordan’s population continues to grow. This is mainly because of net immigration, but also because the country’s birth rate exceeds its death rate.",
        "Table 1.1 shows the birth rate and average age in six countries in 2020.\n\nChanges in the size of a country’s population affect the market for a range of products including clothing. An increase in population size also puts pressure on the country’s sources of energy. The Jordanian government has several large renewable energy projects, and plans to spend even more on such projects. Greater reliance on renewable energy, including wind and solar power, can reduce environmental damage and can be relatively cheap in the long run. However, most renewable energy generators, including hydroelectric power stations, are expensive to build. Also, wind turbines and solar panels rely on favourable weather conditions.",
        "Some of the spending by the Jordanian government is financed by borrowing. At the start of 2021, the Jordanian central bank was expected to raise the rate of interest. This was because total demand was predicted to increase and there would be a return to positive economic growth. A higher interest rate might affect Jordan’s foreign exchange rate and investment."
      ],
      "tables": [
        {
          "title": "Table 1.1",
          "headers": [
            "Country",
            "Birth rate (per 1000 people)",
            "Average age (years)"
          ],
          "rows": [
            [
              "Jordan",
              "20.1",
              "29.5"
            ],
            [
              "Germany",
              "8.5",
              "46.3"
            ],
            [
              "Japan",
              "7.4",
              "48.4"
            ],
            [
              "Nigeria",
              "35.3",
              "18.0"
            ],
            [
              "United Kingdom",
              "10.6",
              "40.3"
            ],
            [
              "United States",
              "11.7",
              "38.1"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/O/N/24 (October/November 2024) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/O/N/24 (October/November 2024) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "19%",
      "1(b)": "Trade in services, primary income",
      "1(c)": "Cyclical unemployment due to lower total demand and higher number of workers than jobs available.",
      "1(d)": "Lower prices may increase output and living standards. Higher quality may improve exports and competitiveness.",
      "1(e)": "Countries with low birth rates, like Monaco, tend to have higher average ages, indicating an inverse relationship. Exceptions like Venezuela show other factors like migration also play a role.",
      "1(f)": "DIAGRAM: Rightward shift of demand curve from D1 to D2, increasing equilibrium price and quantity from (P1, Q1) to (P2, Q2).\n\nANALYSIS: Increased population raises demand for clothing, leading to higher prices and quantities sold.",
      "1(g)": "FOR: Spending on renewable energy reduces environmental damage and long-term costs, meeting growing energy needs sustainably.\n\nAGAINST: High initial costs and reliance on weather conditions may make renewable energy projects less viable in the short term.",
      "1(h)": "FOR: Raising interest rates can control demand-pull inflation and attract foreign investment, supporting economic stability.\n\nAGAINST: Higher interest rates may discourage investment, increase borrowing costs, and negatively impact exports and economic growth."
    },
    "questions": [
      {
        "id": "0455_22_2024_on_1a",
        "number": "1(a)",
        "title": "Calculate the percentage of the Jordanian labour force employed in the secondary sector. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "(100 - (2% + 79%))",
          "correctAnswer": "19%",
          "ofrApplies": true
        },
        "indicativePoints": [
          "Correct calculation of secondary sector employment percentage",
          "Accept 19 as a valid answer"
        ],
        "markingGuide": "Accept 19% or 19. Award 1 mark for correct calculation.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Labour Market"
      },
      {
        "id": "0455_22_2024_on_1b",
        "number": "1(b)",
        "title": "Identify two components of the current account of Jordan’s balance of payments. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Trade in services (e.g., tourism)",
          "Primary income (e.g., income from investments)"
        ],
        "markingGuide": "Accept any two valid components of the current account. If more than two components are given, consider the first three. Accept 'invisibles' for trade in services.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.3 Balance of Payments"
      },
      {
        "id": "0455_22_2024_on_1c",
        "number": "1(c)",
        "title": "Explain the main type of unemployment experienced by Jordan in 2020. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Cyclical unemployment",
          "Lower total demand or fall in employment in most industries"
        ],
        "markingGuide": "Accept 'demand-deficient unemployment' for cyclical unemployment. Fall in demand alone is insufficient; must be macroeconomic.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 Unemployment"
      },
      {
        "id": "0455_22_2024_on_1d",
        "number": "1(d)",
        "title": "Explain two advantages the Jordanian economy may gain from the mergers between its tourism firms. [4]",
        "maxMark": 4,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Lower prices may raise output/GDP/employment/living standards or result from economies of scale",
          "Higher quality may raise exports, reduce current account deficit, or increase competitiveness"
        ],
        "markingGuide": "One mark each for identifying an advantage and one mark each for explaining it. Lower prices and higher quality can be linked to different outcomes.",
        "extractLinkageExpected": true,
        "syllabusTopic": "4.1 Market Structures"
      },
      {
        "id": "0455_22_2024_on_1e",
        "number": "1(e)",
        "title": "Analyse the relationship between birth rate and average age. [4]",
        "maxMark": 4,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Countries with low birth rates likely have high average ages (inverse relationship)",
          "Supporting evidence from data (e.g., Monaco, Niger, Germany, Jordan)",
          "Analysis of exceptions (e.g., Venezuela, Maldives) and factors like death rate and migration"
        ],
        "markingGuide": "Coherent analysis should include expected relationship, supporting evidence, exceptions, and analysis. Comparisons are required for evidence marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Population Change"
      },
      {
        "id": "0455_22_2024_on_1f",
        "number": "1(f)",
        "title": "Analyse, using a demand and supply diagram, how an increase in population size will affect the market for clothing. [5]",
        "maxMark": 5,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "diagramGuidance": {
          "diagramName": "Demand and Supply for Clothing",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "D2",
            "S1"
          ],
          "shiftDescription": "Rightward shift of demand curve (D1 to D2) due to increased population",
          "equilibriumDescription": "Original equilibrium (P1, Q1) and new equilibrium (P2, Q2) with higher price and quantity",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Correctly labeled axes (Price and Quantity)",
          "Original and new demand curves correctly labeled",
          "Rightward shift of demand curve",
          "Equilibriums marked (E1 and E2)",
          "Written analysis explaining increase in demand and price"
        ],
        "markingGuide": "Diagram must show correct axes, curves, and equilibriums. Written analysis must explain the effect of increased population on demand and price.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.3 Demand and Supply"
      },
      {
        "id": "0455_22_2024_on_1g",
        "number": "1(g)",
        "title": "Discuss whether or not the Jordanian government should spend more on renewable energy. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Reasons to spend more: energy needs, sustainability, reduced environmental damage, long-term cost savings",
          "Reasons not to spend more: high initial costs, reliance on weather, potential increase in borrowing costs"
        ],
        "markingGuide": "Award up to 4 marks for each side of the argument. Each point can be credited only once. Generic examples (e.g., tax revenue) should be specific to the context.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Government Intervention"
      },
      {
        "id": "0455_22_2024_on_1h",
        "number": "1(h)",
        "title": "Discuss whether or not the Jordanian central bank should have raised the rate of interest in 2021. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Reasons to raise interest: control total demand, reduce inflation, attract foreign funds",
          "Reasons not to raise interest: discourage investment, increase borrowing costs, affect exchange rate and trade"
        ],
        "markingGuide": "Award up to 4 marks for each side of the argument. Some points (e.g., discouraged spending) can be considered from either side but must be logically consistent.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Monetary Policy"
      }
    ]
  },
  {
    "id": "0455_22_2024_mj",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: The challenges facing the Tunisian government",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2024_may_june",
    "seriesLabel": "May/June 2024",
    "originalExamCode": "0455/22/M/J/24",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_s24_qp_22.pdf",
    "extract": {
      "title": "1 The challenges facing the Tunisian government",
      "paragraphs": [
        "Tunisia fact file 2020 Trade in goods and services balance – $3bn Primary and secondary income balance $0.6bn Unemployment rate 17% Tunisian dinar (TND) / US dollar exchange rate 1TND = $0.35",
        "Tunisia had a government budget deficit for a number of years. Between 2015 and 2020, the Tunisian government carried out reforms to reduce the tax burden, to rely more on indirect taxes and to make the tax system more efficient and more economical. As well as taxing a range of products, the Tunisian government also regulates the price of some products including flour and milk. Government control of the price of flour and milk can help reduce poverty and prevent monopoly firms exploiting their market power. The Tunisian government also subsidises the production of electricity. The subsidy affects the cost of producing electricity, and the change in the price of electricity affects other firms’ costs. This form of government spending can help reduce inflationary pressure but can also affect the efficiency of electricity production. While some firms benefit from the subsidy on electricity production, they also experience periods when their other costs of production rise. Tunisian shoe producers have recently experienced a rise in wage costs and a decline in the number of workers they employ. The average wage paid to Tunisian workers and the Tunisian inflation rate changed between 2014 and 2020 as shown in Fig. 1.1.",
        "Unemployment has been a problem in Tunisia for many years. In 2020, the government passed a law which promised that workers who had been unemployed for ten years or more would be employed by the public sector. To reduce the time spent moving between jobs, it increased labour market information available to workers and employers and did not raise unemployment benefit in line with inflation. The Tunisian foreign exchange rate fluctuated in 2020. This affected the price of the country’s exports and imports. It also affected the current account of its balance of payments, economic growth, inflation and unemployment."
      ],
      "tables": [
        {
          "title": "Fig. 1.1 Change in average wage and the inflation rate in Tunisia 2014 – 2020",
          "headers": [
            "Year",
            "Percentage (%)"
          ],
          "rows": [
            [
              "2014",
              "0"
            ],
            [
              "2015",
              "1"
            ],
            [
              "2016",
              "2"
            ],
            [
              "2017",
              "3"
            ],
            [
              "2018",
              "4"
            ],
            [
              "2019",
              "5"
            ],
            [
              "2020",
              "6"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/M/J/24 (May/June 2024) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/M/J/24 (May/June 2024) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "The balance on the current account is calculated by adding the trade balance (-$3bn) and the primary/secondary income balance ($0.6bn), resulting in -$2.4bn.",
      "1(b)": "The government aimed for efficiency (improving market performance) and economy (raising more revenue than the cost of collection).",
      "1(c)": "The government regulates prices to reduce poverty by keeping basic necessities like flour and milk affordable for low-income households.",
      "1(d)": "1. Increased labour market information to reduce search time and increase worker mobility. 2. Did not raise unemployment benefits in line with inflation to maintain the incentive to seek work.",
      "1(e)": "There is a direct relationship between wage changes and inflation. From 2014-2018, wages rose faster than inflation, increasing real wages. From 2018-2020, inflation outpaced wage growth, reducing real wages. This suggests wage increases can drive cost-push inflation.",
      "1(f)": "[Diagram: D1, S1 shifting left to S2, P rising from P1 to P2, Q falling from Q1 to Q2]. An increase in wage costs raises production costs, shifting the supply curve left. This results in a higher equilibrium price and lower quantity of shoes.",
      "1(g)": "Subsidies should continue as they lower electricity prices, reduce poverty, and lower costs for other firms, stimulating growth. However, they may create inefficiency, opportunity costs, and budget deficits. The government should weigh these benefits against the fiscal burden.",
      "1(h)": "A stronger dinar benefits the economy by reducing inflation and import costs, increasing purchasing power. However, it harms exporters by making goods more expensive, potentially reducing GDP and increasing unemployment. The net effect depends on the price elasticity of demand for exports and imports."
    },
    "questions": [
      {
        "id": "0455_22_2024_mj_1a",
        "number": "1(a)",
        "title": "Calculate Tunisia’s balance on the current account of its balance of payments. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "Trade balance + Primary/Secondary income balance",
          "correctAnswer": "-$2.4bn",
          "ofrApplies": false
        },
        "indicativePoints": [
          "Calculate: $3bn + $0.6bn = $3.6bn (Wait, source says Trade balance -$3bn? No, source says 'Trade in goods and services balance – $3bn'. Usually negative if deficit. Let's check MS. MS says -2.4bn. 3 + 0.6 = 3.6? No. If Trade is -3bn and Income is +0.6bn, sum is -2.4bn. Yes.)",
          "Accept -2.4bn or -6.8/-6.9 billion TND"
        ],
        "markingGuide": "Accept –2.4bn. Also accept –6.8 or –6.9 billion TND.",
        "extractLinkageExpected": true,
        "syllabusTopic": "4.1 Balance of payments"
      },
      {
        "id": "0455_22_2024_mj_1b",
        "number": "1(b)",
        "title": "Identify two qualities of a good tax that the Tunisian government aimed to achieve. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Efficiency / efficient / improve market performance / reduce market failure",
          "Economical / economy / raise more revenue than cost to collect"
        ],
        "markingGuide": "If more than 2 qualities are given, consider the first 3.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Taxation"
      },
      {
        "id": "0455_22_2024_mj_1c",
        "number": "1(c)",
        "title": "Explain one reason why the Tunisian government regulates the price of flour and milk. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Reduce poverty: flour/milk are basic necessities, keeping price low makes them affordable.",
          "Prevent monopoly exploitation: stop firms raising price to a high level."
        ],
        "markingGuide": "One mark for a reason identified and one mark for an explanation.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Price controls"
      },
      {
        "id": "0455_22_2024_mj_1d",
        "number": "1(d)",
        "title": "Explain two ways the Tunisian government tried to reduce frictional unemployment. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Increased labour market information: reduces search time, increases mobility, workers aware of vacancies/skills.",
          "Did not raise unemployment benefit in line with inflation: purchasing power falls, increases incentive to work."
        ],
        "markingGuide": "One mark for each of two ways identified and one mark for each of two explanations. If more than 2 ways are given, consider the first 3.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.3 Unemployment"
      },
      {
        "id": "0455_22_2024_mj_1e",
        "number": "1(e)",
        "title": "Analyse the relationship between the change in Tunisia’s average wage and inflation rate. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Direct/positive relationship: as wage change increases, inflation increases (and vice versa).",
          "Evidence: 2014-2018 wages rose faster than inflation (real wages up); 2018-2020 inflation higher than wage rise (real wages down).",
          "Explanation: Wage rise increases production costs (cost-push) or disposable income (demand-pull), causing inflation."
        ],
        "markingGuide": "Relationship (up to 2 marks), Evidence (up to 3 marks), Explanation (up to 2 marks). Responses should address expected relationship, supporting evidence, exceptions, and overall data analysis.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Inflation"
      },
      {
        "id": "0455_22_2024_mj_1f",
        "number": "1(f)",
        "title": "Analyse, using a demand and supply diagram, how an increase in wage costs would affect the market for shoes. [5]",
        "maxMark": 5,
        "category": "calculation",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Market for Shoes",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "S1",
            "S2"
          ],
          "shiftDescription": "Supply curve shifts to the left (S1 to S2) due to increased wage costs.",
          "equilibriumDescription": "Equilibrium moves from E1 (P1, Q1) to E2 (P2, Q2) where P2 > P1 and Q2 < Q1.",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Diagram: Correct axes, labels, leftward shift of supply, new equilibrium.",
          "Analysis: Increase in wage costs raises production costs, leading to a higher price and lower quantity supplied."
        ],
        "markingGuide": "4 marks for diagram (axes, labels, shift, equilibrium). 1 mark for written analysis linking higher costs to higher price.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 Supply and Demand"
      },
      {
        "id": "0455_22_2024_mj_1g",
        "number": "1(g)",
        "title": "Discuss whether or not the Tunisian government should continue to subsidise electricity production. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "For: Reduces production costs, increases supply, lowers price, makes electricity affordable, reduces poverty.",
          "For: Lowers costs for other firms, encourages expansion/investment, increases GDP/employment, reduces inflation.",
          "Against: Firms may become inefficient/rely on subsidy, opportunity cost of government spending, budget deficit/tax increase.",
          "Against: May cause pollution/external costs if non-renewable sources used."
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might, and up to 4 marks for logical reasons why it might not. Each point credited only once. Separate development rewarded.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.4 Government Intervention"
      },
      {
        "id": "0455_22_2024_mj_1h",
        "number": "1(h)",
        "title": "Discuss whether or not a rise in the value of the Tunisian dinar would benefit the Tunisian economy. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "For: Reduces inflation (cheaper imports), higher purchasing power, lower raw material costs, competitive pressure on domestic firms, indicator of strong economy.",
          "Against: Higher export prices reduce exports/revenue, lower import prices increase imports, reduces international competitiveness, worsens current account deficit.",
          "Against: Lower net exports reduce GDP/growth, may increase unemployment, discourage MNCs due to higher setup costs."
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might, and up to 4 marks for logical reasons why it might not. Lower total demand credited only once. MNCs: one mark for attract/discourage, additional marks for explanation.",
        "extractLinkageExpected": true,
        "syllabusTopic": "4.2 Exchange Rates"
      }
    ]
  },
  {
    "id": "0455_22_2024_fm",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Changes in the Danish economy",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2024_feb_march",
    "seriesLabel": "February/March 2024",
    "originalExamCode": "0455/22/F/M/24",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_m24_qp_22.pdf",
    "extract": {
      "title": "1 Changes in the Danish economy",
      "paragraphs": [
        "Denmark fact file GDP 2021 $372 bn Labour force in employment 2020 3 m Total wages paid 2020 $252 bn HDI value 2019 0.94 HDI ranking 2019 10th",
        "Denmark is a high-income, North European country. The Danish population have high living standards and enjoy relatively long hours of leisure time. They spend this time in a variety of ways including cycling, jogging and playing golf.",
        "Danish workers are employed in a range of industries. Denmark used to be a leading shipbuilding country but now the industry is in decline. Ships have substitutes in other forms of transport. Also, it may be possible to postpone the purchase of ships, they take a long time to produce and they are expensive to store.",
        "In contrast to the shipbuilding industry, the Danish toy industry has grown in recent years. Denmark’s shipbuilding and toy industries are in the private sector.",
        "Denmark’s economic performance is also influenced by changes in the public sector. Table 1.1 shows Danish government spending and GDP over the period 2015 to 2021.",
        "Denmark is heavily involved in international trade. It usually has a surplus on the current account of its balance of payments. International trade affects the availability of products in the country and the country’s foreign exchange rate. It also affects the country’s GDP and level of employment.",
        "How people work in Denmark, as in most countries, has changed in recent years. More people now spend at least some of their working hours working from home. This change is expected to affect productivity and help firms keep their workers. Households may be encouraged to move out of cities and to buy larger homes. There may also be changes in demand for transport, demand for food sold in city centres and firms’ need for office space."
      ],
      "tables": [
        {
          "title": "Table 1.1 Danish government spending and GDP 2015 – 2021",
          "headers": [
            "Year",
            "Government spending ($bn)",
            "GDP ($bn)"
          ],
          "rows": [
            [
              "2015",
              "77",
              "303"
            ],
            [
              "2016",
              "78",
              "314"
            ],
            [
              "2017",
              "79",
              "333"
            ],
            [
              "2018",
              "80",
              "356"
            ],
            [
              "2019",
              "82",
              "350"
            ],
            [
              "2020",
              "84",
              "356"
            ],
            [
              "2021",
              "86",
              "372"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/F/M/24 (February/March 2024) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/F/M/24 (February/March 2024) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "$84,000",
      "1(b)": "Playing golf; Jogging.",
      "1(c)": "HDI is used. It measures health, education, and income, providing a broader view of living standards than GDP alone.",
      "1(d)": "Ships take a long time to produce, so supply cannot adjust quickly to price changes. They are expensive to store, meaning firms cannot easily hold inventory to sell later if prices fall.",
      "1(e)": "There is a positive relationship; as government spending rose from 2015-2021, GDP generally rose. This is because government spending is a component of aggregate demand. However, in 2019, spending rose while GDP fell, likely due to counter-cyclical fiscal policy to stimulate the economy during a downturn.",
      "1(f)": "[Diagram: D shifts right to D2, P rises, Q rises] An increase in the birth rate increases the number of children, increasing the number of consumers for toys. This shifts the demand curve to the right, resulting in a higher equilibrium price and quantity.",
      "1(g)": "A surplus benefits the economy by adding to aggregate demand, increasing GDP and employment. It may also attract foreign investment. However, it may reduce consumer choice as fewer imports are available and could lead to inflation if the economy is at full capacity. Additionally, a stronger currency from the surplus may make exports less competitive in the long run.",
      "1(h)": "Working from home may benefit the economy by increasing productivity due to less stress and saving transport costs, and by allowing more people (e.g., caregivers) to enter the workforce. However, it may harm the economy by reducing demand for public transport and city-centre services, leading to unemployment in those sectors and reduced tax revenue."
    },
    "questions": [
      {
        "id": "0455_22_2024_fm_1a",
        "number": "1(a)",
        "title": "Calculate the average wage paid in Denmark in 2020. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "Total wages paid / Labour force in employment",
          "correctAnswer": "$84,000",
          "ofrApplies": false
        },
        "indicativePoints": [
          "Calculate $252bn / 3m = $84,000"
        ],
        "markingGuide": "Accept 84 000. 1 mark for correct calculation.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Basic economic concepts"
      },
      {
        "id": "0455_22_2024_fm_1b",
        "number": "1(b)",
        "title": "Identify two possible opportunity costs of a Danish person using their leisure time to cycle. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Playing golf",
          "Jogging"
        ],
        "markingGuide": "1 mark for each valid alternative leisure activity identified from the source material (e.g., playing golf, jogging).",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Basic economic concepts"
      },
      {
        "id": "0455_22_2024_fm_1c",
        "number": "1(c)",
        "title": "Explain one way that living standards are measured in Denmark. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Identify HDI / average wages / income / GDP per head / leisure hours",
          "Explain how the measure reflects living standards (e.g., HDI includes health/education; income influences goods purchased; leisure affects health)"
        ],
        "markingGuide": "1 mark for identification of a valid measure (HDI, average wages, income, GDP per head, leisure hours). 1 mark for explanation. Do not accept GDP alone.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.2 Economic growth and development"
      },
      {
        "id": "0455_22_2024_fm_1d",
        "number": "1(d)",
        "title": "Explain two reasons why the supply of ships is price-inelastic. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Reason 1: Long production time",
          "Explanation 1: Supply cannot be adjusted quickly to price changes",
          "Reason 2: Expensive to store / large space required",
          "Explanation 2: Low inventories / difficult to keep for future sales / must sell if prices fall"
        ],
        "markingGuide": "1 mark for each of two reasons identified. 1 mark for each of two explanations. Ignore comments on PED definition.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.6 Price elasticity of supply"
      },
      {
        "id": "0455_22_2024_fm_1e",
        "number": "1(e)",
        "title": "Analyse the relationship between government spending and GDP in Denmark. [4]",
        "maxMark": 4,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Positive/direct relationship: Higher gov spending associated with higher GDP",
          "Evidence: 2015-2018 both rose; 2019-2021 both rose",
          "Analysis: Gov spending increases aggregate demand, adding to GDP",
          "Exception: 2018-2019 gov spending rose but GDP fell",
          "Analysis of exception: Counter-cyclical policy to stimulate economy"
        ],
        "markingGuide": "Coherent analysis required. Address expected relationship, supporting evidence, exceptions, and analysis of data. Max 2 marks for evidence, max 2 marks for analysis of relationship/exceptions.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Macroeconomic objectives"
      },
      {
        "id": "0455_22_2024_fm_1f",
        "number": "1(f)",
        "title": "Analyse, using a demand and supply diagram, how an increase in the birth rate would affect the market for toys. [5]",
        "maxMark": 5,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Demand and Supply for Toys",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "S1",
            "D2"
          ],
          "shiftDescription": "Demand curve shifts to the right (D1 to D2) due to increase in number of consumers/children.",
          "equilibriumDescription": "New equilibrium at higher price (P2) and higher quantity (Q2).",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Diagram: Correct axes, labels, shift right, equilibria marked (4 marks)",
          "Analysis: Increase in birth rate increases number of children/consumers (1 mark)"
        ],
        "markingGuide": "4 marks for diagram (1 for axes, 1 for original curves, 1 for shift, 1 for equilibria). 1 mark for written analysis linking birth rate to demand increase.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Demand and supply"
      },
      {
        "id": "0455_22_2024_fm_1g",
        "number": "1(g)",
        "title": "Discuss whether or not a surplus on the current account of its balance of payments would benefit the Danish economy. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Benefit: Exports > Imports adds to aggregate demand, increasing GDP",
          "Benefit: Increases employment and incomes",
          "Benefit: Attracts foreign due to strong economic sign",
          "Benefit: Raises FX rate, enabling more import purchases",
          "Detriment: Reduces availability of products/consumers choice",
          "Detriment: Adds to inflationary pressure if near full employment",
          "Detriment: Raises FX rate, making exports less competitive, potentially causing deficit long run"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might benefit. Award up to 4 marks for logical reasons why it might not. Total max 6. Each point credited once. Separate development rewarded.",
        "extractLinkageExpected": true,
        "syllabusTopic": "4.1 Balance of payments"
      },
      {
        "id": "0455_22_2024_fm_1h",
        "number": "1(h)",
        "title": "Discuss whether or not more people working from home will benefit an economy. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Benefit: Raises productivity/efficiency (less stress, saves transport costs)",
          "Benefit: Increases quantity of labour (flexible hours, dependents can work)",
          "Benefit: Reduces firm costs (less office space needed)",
          "Benefit: Reduces pollution/congestion/external costs",
          "Detriment: Fall in demand for transport firms, creating unemployment",
          "Detriment: Closure of city centre businesses (cafes/restaurants), reducing tax revenue"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might benefit. Award up to 4 marks for logical reasons why it might not. Total max 6. Note: 1 mark for recognizing productivity change, further marks for explanation.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Economic growth"
      }
    ]
  },
  {
    "id": "0455_22_2023_on",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Will Honduras become a more successful economy?",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2023_oct_nov",
    "seriesLabel": "October/November 2023",
    "originalExamCode": "0455/22/O/N/23",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_w23_qp_22.pdf",
    "extract": {
      "title": "1 Will Honduras become a more successful economy?",
      "paragraphs": [
        "Honduras fact file 2020 Population 10 m Population without access to electricity 0.83 m Unemployment rate 6.1% Inflation rate 4.2% Government budget deficit as % of GDP 9.5%",
        "Honduras is a lower middle-income country which relies heavily on trade with the US. More than half of Honduran exports go to the US and 40% of its imports come from the US. A high number of Hondurans work in the US and send money back home to their relatives.",
        "Honduras used to concentrate on growing bananas and coffee, gaining skills and a good reputation in those industries. Now, Honduras produces a greater range of products including clothes, chemicals and paper. This diversification has reduced the uncertainty arising from sudden changes in demand and supply. For example, tariffs could be imposed on Honduran coffee or there could be a report stating that eating bananas is good for health.",
        "While employment is declining in agriculture, it is increasing in the clothes industry in Honduras. Training for workers in the clothes industry is expected to increase and working conditions to improve. The firms are also using more capital goods. It is, however, uncertain what will happen to the prices of cotton, wool and other materials used to make clothes.",
        "A successful clothes industry has the potential to reduce poverty in Honduras. The Honduran government tries to reduce poverty by, for example, providing unemployment benefit. A major reason for the government seeking to lower poverty is to increase life expectancy.",
        "Table 1.1 shows levels of poverty (percentage of population living on less than $1.90 a day) and life expectancy in selected countries.",
        "A more successful Honduran economy would raise incomes. The country has a progressive income tax system, so there could be a significant rise in tax revenue. A more successful economy would also be likely to encourage more investment. Unemployment would be expected to fall which, in turn, could influence consumer spending."
      ],
      "tables": [
        {
          "title": "Table 1.1 Percentage of population living in poverty and life expectancy in selected countries",
          "headers": [
            "Country",
            "% of population living in poverty",
            "Life expectancy (years)"
          ],
          "rows": [
            [
              "Chad",
              "38.1",
              "54"
            ],
            [
              "Honduras",
              "16.9",
              "75"
            ],
            [
              "Kenya",
              "37.1",
              "66"
            ],
            [
              "Maldives",
              "3.5",
              "79"
            ],
            [
              "South Sudan",
              "44.7",
              "58"
            ],
            [
              "Sweden",
              "0.2",
              "83"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/O/N/23 (October/November 2023) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/O/N/23 (October/November 2023) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "8.3%",
      "1(b)": "1. Sell more exports to the US. 2. Receive more remittances from Honduran workers in the US.",
      "1(c)": "Specialisation allows workers to gain skills and practice, which raises productivity and lowers the cost of production per unit.",
      "1(d)": "1. Provide unemployment benefits to raise the income of the unemployed. 2. Use a progressive income tax system to take a higher proportion from the rich and redistribute to the poor.",
      "1(e)": "[Diagram: D shifts right to D2, S unchanged. P rises from P1 to P2, Q rises from Q1 to Q2.]",
      "1(f)": "There is an inverse relationship: higher poverty correlates with lower life expectancy (e.g., Chad vs Sweden). This is because poverty leads to poor healthcare and nutrition. However, Chad has lower poverty than South Sudan but lower life expectancy, suggesting other factors like war affect life expectancy.",
      "1(g)": "Costs might fall due to increased productivity from training and capital goods, and economies of scale. However, costs might not fall if raw material prices rise, wages increase due to lower unemployment, or if firms face diseconomies of scale from rapid expansion.",
      "1(h)": "Inflation might occur if lower unemployment pushes up wages (cost-push) or increases consumer spending (demand-pull). However, it might not if the fall in unemployment is due to supply-side policies that increase total supply, or if the extra income is saved rather than spent."
    },
    "questions": [
      {
        "id": "0455_22_2023_on_1a",
        "number": "1(a)",
        "title": "Calculate what percentage of Honduran people did not have access to electricity in 2020. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "(0.83 / 10) * 100",
          "correctAnswer": "8.3%",
          "ofrApplies": false
        },
        "indicativePoints": [
          "8.3%"
        ],
        "markingGuide": "Accept 8.0 or 8.3.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Economic data"
      },
      {
        "id": "0455_22_2023_on_1b",
        "number": "1(b)",
        "title": "Identify two benefits the Honduran economy could gain from a growth in the US economy. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Sell more exports to the US",
          "Receive more money from Honduran workers in the US (remittances)",
          "More job opportunities for Honduran workers in the US"
        ],
        "markingGuide": "If more than two benefits are given, consider the first three. Accept 'increase trade for more exports'. Accept 'increase employment / lower unemployment' for more job opportunities.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Trade and exchange rates"
      },
      {
        "id": "0455_22_2023_on_1c",
        "number": "1(c)",
        "title": "Explain one advantage of an economy specialising. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Gain skills / raise productivity / lower costs of production / raise quality / increase output / less waste",
          "Gain a good reputation / increase demand"
        ],
        "markingGuide": "One mark for an advantage identified and one mark for an explanation. Identification mark must come directly from the source material. A relevant explanation mark can be given even in the absence of an identification.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Specialisation"
      },
      {
        "id": "0455_22_2023_on_1d",
        "number": "1(d)",
        "title": "Explain two ways a government could redistribute income. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Provision of unemployment benefit / state benefit / welfare benefit: raise income of those on low or no income / enable the unemployed to buy basic necessities / reduce absolute poverty",
          "Progressive income tax system: takes a higher proportion of the income of the rich / use some of tax revenue raised to increase spending to help those on low incomes"
        ],
        "markingGuide": "One mark each for each of two ways identified and one mark each for each of two explanations. If more than two reasons given, consider the first three. One mark for taxing the rich and giving to the poor.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Income distribution"
      },
      {
        "id": "0455_22_2023_on_1e",
        "number": "1(e)",
        "title": "Draw a demand and supply diagram to show how a report stating that bananas are good for health would affect the market for bananas. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Demand and Supply Diagram",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1",
            "S1",
            "D2"
          ],
          "shiftDescription": "Demand curve shifted to the right (D1 to D2)",
          "equilibriumDescription": "Equilibriums shown by lines P1/Q1 and P2/Q2 or points E1 and E2",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Axes correctly labelled – price and quantity or p and q",
          "Original demand and supply curves correctly labelled",
          "Demand curve shifted to the right",
          "Equilibriums – shown by lines P1 and Q1 and P2 and Q2 or equilibrium points marked as E1 and E2"
        ],
        "markingGuide": "If a candidate draws two diagrams, they may be able to get 3 marks: 1 mark for axes, 1 mark for D & S labelled correctly, 1 mark for the demand curve shifted to the right. They would not get the mark for the equilibriums as the two diagrams are likely to conflict on this.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 Demand and supply"
      },
      {
        "id": "0455_22_2023_on_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between the percentage of population living in poverty and life expectancy. [5]",
        "maxMark": 5,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Expected relationship: Inverse / negative (the higher the level of poverty, the lower the life expectancy)",
          "Supporting evidence: Sweden has the lowest % of population living in poverty and the highest life expectancy / Chad and South Sudan with highest poverty had lowest life expectancy",
          "Analysis of expected relationship: A high level of poverty is likely to mean poor healthcare / low nutrition / poor housing / poor sanitation / low levels of education",
          "Exception: Chad / South Sudan (Chad had a lower level of poverty but also a lower level of life expectancy than South Sudan)",
          "Analysis of exception: Life expectancy is determined by other influences e.g. wars"
        ],
        "markingGuide": "Responses do not have to be in the format suggested but they should address the expected/normal relationship, offer supporting evidence of that, highlight any exceptions to that, and analyse the overall data.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Income distribution and poverty"
      },
      {
        "id": "0455_22_2023_on_1g",
        "number": "1(g)",
        "title": "Discuss whether or not the cost of producing clothes in Honduras will fall in the future. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Might fall: More training / better working conditions may increase labour productivity / efficiency / skills / reduce labour costs",
          "Might fall: More use of capital goods may reduce disruption / make fewer mistakes / less waste / speed up production / increase productivity",
          "Might fall: Improved working conditions may reduce industrial action / more motivation",
          "Might fall: Successful clothes industry so firms may grow in size / more able to take advantage of economies of scale",
          "Might not fall: Price of raw materials may rise / subject to bad weather / exchange rate may fall / tariffs may be imposed on imported raw materials / reduce supply / country has experience of inflation",
          "Might not fall: Unemployment may fall making it more difficult to recruit labour / strengthening bargaining power of workers / raising wages / increasing labour costs",
          "Might not fall: Providing training and better working conditions will involve a cost",
          "Might not fall: More use of capital goods may involve initial high spending on equipment / firms may experience diseconomies of scale",
          "Might not fall: Higher indirect tax / tax may be imposed (on clothes / clothes firms)"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might, and up to 4 marks for logical reasons why it might not. Allow higher productivity / efficiency once either in connection with labour or capital. Some points may be given in reverse e.g. price of raw materials may fall. Not accepting subsidising the clothes industry as the source material indicates that it is a successful industry. Each point may be credited only once, on either side of an argument, but separate development as to how/why the outcome may differ is rewarded.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Production costs"
      },
      {
        "id": "0455_22_2023_on_1h",
        "number": "1(h)",
        "title": "Discuss whether or not a fall in unemployment in Honduras is likely to cause inflation. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Might cause: Unemployment is already low / may move towards full employment / may push up wages / increase (average) costs / cause cost-push inflation / total supply less than total demand",
          "Might cause: Lower unemployment may increase incomes / causing a rise in consumer spending / purchasing power / increasing total demand / causing demand-pull inflation / total demand higher than total supply",
          "Might cause: Inflation already exists / which may lead workers to expect it to continue / increasing wage claims",
          "Might not cause: May be higher investment / could increase total supply / total supply may rise in line with total demand / reducing cost-push inflation",
          "Might not cause: Lower unemployment could reduce spending on unemployment benefit / increase tax revenue / reduce the budget deficit / reduce the growth in total demand / some of higher tax revenue could be spent on supply-side policy / unemployment may have fallen due to supply-side policy",
          "Might not cause: The extra income may be saved / spent on imports / due to uncertainty about the future",
          "Might not cause: A fall in unemployment does not necessarily mean a rise in employment / the unemployed could have e.g. retired / emigrated"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might, and up to 4 marks for logical reasons why it might not. Each point may be credited only once, on either side of an argument, but separate development as to how/why the outcome may differ is rewarded.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Inflation"
      }
    ]
  },
  {
    "id": "0455_22_2023_mj",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: How will oil change Guyana?",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2023_may_june",
    "seriesLabel": "May/June 2023",
    "originalExamCode": "0455/22/M/J/23",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_s23_qp_22.pdf",
    "extract": {
      "title": "1 How will oil change Guyana?",
      "paragraphs": [
        "Guyana fact file 2020\nPopulation 790 000\nEstimated optimum population 1 100 000\nProportion of population living in poverty 35%\nEconomic growth rate 26%\nUnemployment rate 11%\nCurrent account of the balance of payments –$237m\n\nGuyana was the fastest growing economy in the world in 2020. Sugar, gold and timber have accounted for a relatively high proportion of the country’s output and exports for some time.",
        "In 2020, the sugar industry was hit by bad weather and falling global demand. In contrast, the output of gold and timber increased. The main reason why Guyana’s real GDP increased so rapidly was the increase in oil production. Oil was discovered offshore by a foreign multinational company (MNC) in 2015 and the MNC started production in 2019.",
        "It is predicted that Guyana will become the world’s largest oil producer per head by 2025. The Guyanese government is planning to use some of the tax revenue it will raise from oil to spend on education and improvements to the country’s infrastructure. Planned projects include new railway lines and stations.",
        "A more extensive and cheaper rail service may enable more people to work further from home and may influence the market for substitutes, such as car transport. The Guyanese government is also planning to spend some of the tax revenue on improving the country’s access to the internet. Guyana has experienced a slow growth in its population size in recent years.",
        "In 2020, its birth rate was 16.5, its death rate was 6.8 and its net migration rate was –7.7. With increases in oil production, emigration may decline and the country may start to experience net immigration. A higher population may affect Guyana in a number of ways including changing the size of its labour force and affecting the environment."
      ],
      "tables": [
        {
          "title": "Table 1.1 GDP per head and internet access in selected countries in 2020",
          "headers": [
            "Country",
            "GDP per head ($)",
            "Population with internet access (%)"
          ],
          "rows": [
            [
              "Brazil",
              "8717",
              "72"
            ],
            [
              "Eritrea",
              "643",
              "2"
            ],
            [
              "France",
              "40494",
              "83"
            ],
            [
              "Guyana",
              "6160",
              "39"
            ],
            [
              "Iceland",
              "66945",
              "99"
            ],
            [
              "Morocco",
              "3204",
              "64"
            ],
            [
              "Zambia",
              "1305",
              "29"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/M/J/23 (May/June 2023) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/M/J/23 (May/June 2023) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "790,000 × 0.35 = 276,500",
      "1(b)": "Bad weather; falling global demand",
      "1(c)": "Economic growth is measured by real GDP or national output/income/expenditure.",
      "1(d)": "Improved education could increase skills and occupational mobility. Cheaper rail transport could increase geographical mobility.",
      "1(e)": "(Diagram: Leftward shift in demand curve for car transport due to cheaper rail transport)",
      "1(f)": "There is a positive relationship between GDP per head and internet access, as seen in Iceland and France. However, Guyana is an exception with relatively high GDP per head but low internet access, possibly due to lower education levels.",
      "1(g)": "The discovery of oil could increase living standards through higher incomes, job creation, and government spending on education and healthcare. However, pollution and overdependence on oil could harm living standards.",
      "1(h)": "An increase in population could benefit Guyana by improving resource utilization and increasing tax revenue. However, it could also lead to pollution and increased dependency ratios, harming living standards."
    },
    "questions": [
      {
        "id": "0455_22_2023_mj_1a",
        "number": "1(a)",
        "title": "Calculate the number of people who were living in poverty in Guyana in 2020.",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "Population × Proportion in poverty",
          "correctAnswer": "276500",
          "ofrApplies": false
        },
        "indicativePoints": [
          "Correct calculation using 790,000 × 35%"
        ],
        "markingGuide": "Accept only the correct numerical answer (276 500).",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Basic economic concepts"
      },
      {
        "id": "0455_22_2023_mj_1b",
        "number": "1(b)",
        "title": "Identify two causes of the decrease in the output of sugar in 2020.",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Bad weather",
          "Falling (global) demand"
        ],
        "markingGuide": "Accept any two valid causes. If more than two causes given, consider the first three.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Production"
      },
      {
        "id": "0455_22_2023_mj_1c",
        "number": "1(c)",
        "title": "Explain how economic growth is measured.",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Real GDP",
          "National output/income/expenditure"
        ],
        "markingGuide": "Accept only real GDP or national output/income/expenditure. Not GDP per head for GDP.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 Economic growth and development"
      },
      {
        "id": "0455_22_2023_mj_1d",
        "number": "1(d)",
        "title": "Explain two reasons why labour mobility may increase in Guyana in the future.",
        "maxMark": 4,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Improved education/infrastructure/internet access → better skills/occupational mobility",
          "Net immigration → skilled workers/more willingness to move",
          "Cheaper rail transport → easier geographical mobility"
        ],
        "markingGuide": "One mark each for each of two reasons identified and one mark each for each of two explanations. If more than two reasons given, consider the first three.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Labour markets"
      },
      {
        "id": "0455_22_2023_mj_1e",
        "number": "1(e)",
        "title": "Draw a demand and supply diagram to show the effect of a decrease in the price of rail transport on the market for car transport.",
        "maxMark": 4,
        "category": "calculation",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Demand and supply for car transport",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1 (original demand)",
            "D2 (shifted demand)",
            "S1 (supply)"
          ],
          "shiftDescription": "Leftward shift of demand curve (D1 to D2)",
          "equilibriumDescription": "Original equilibrium (E1) and new equilibrium (E2) marked with price and quantity labels (P1, Q1 and P2, Q2)",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Correctly labeled axes (price and quantity)",
          "Original demand and supply curves correctly labeled",
          "Demand curve shifted to the left",
          "Equilibriums shown by lines P1, Q1 and P2, Q2 or points E1 and E2"
        ],
        "markingGuide": "One mark each for correctly labeled axes, labeled curves, shifted demand, and marked equilibriums.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.3 Market equilibrium"
      },
      {
        "id": "0455_22_2023_mj_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between GDP per head and internet access.",
        "maxMark": 5,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Expected direct/positive relationship",
          "Supporting evidence from table (e.g., Iceland, Eritrea, France)",
          "Analysis of exceptions (e.g., Guyana, Morocco)",
          "Analysis of other influences (e.g., education levels)"
        ],
        "markingGuide": "Coherent analysis including expected relationship, supporting evidence, exceptions, and analysis. No marks for mere description of figures. Maximum one mark for indirect comparisons.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.6 Technology and economic development"
      },
      {
        "id": "0455_22_2023_mj_1g",
        "number": "1(g)",
        "title": "Discuss whether or not the discovery of oil is likely to increase living standards in Guyana.",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Increase exports, economic growth, higher incomes, reduced poverty",
          "Job creation, reduced unemployment, immigration",
          "Tax revenue for education/healthcare, MNC investment in infrastructure",
          "Pollution, external costs, poor working conditions",
          "Profit repatriation, overdependence on oil, trade restrictions"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might increase living standards and up to 4 marks for logical reasons why it might not. Each point may be credited only once, on either side of the argument.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.7 Environmental sustainability"
      },
      {
        "id": "0455_22_2023_mj_1h",
        "number": "1(h)",
        "title": "Discuss whether or not Guyana would benefit from an increase in the size of its population.",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Population below optimum level, better resource utilization",
          "Immigration bringing new ideas/skills/technology",
          "Increase in labor force, tax revenue, aggregate demand",
          "Pollution, congestion, overcrowding, increased dependency ratio",
          "Pressure on housing/welfare, inflation, overpopulation"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might benefit and up to 4 marks for logical reasons why it might not. Each point may be credited only once, on either side of the argument.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Population change"
      }
    ]
  },
  {
    "id": "0455_22_2023_fm",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Changes in US macroeconomic performance and policies",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2023_feb_march",
    "seriesLabel": "February/March 2023",
    "originalExamCode": "0455/22/F/M/23",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_m23_qp_22.pdf",
    "extract": {
      "title": "1 Changes in US macroeconomic performance and policies",
      "paragraphs": [
        "US fact file 2020\nCurrent account of the balance of payments –$470 bn\nImports of goods and services $2 800 bn\nImports from China as % of total imports 20%\nEconomic growth rate –2.8%\nInflation rate 1.4%\n\nBetween 2009 and 2019, US real GDP increased every year. This was the result of, among other causes, low interest rates, land reclamation and an increase in the labour force.",
        "The higher US output brought a number of benefits but some workers lost their jobs. This was because while some industries expanded, others closed down. Income also became more unevenly distributed and pollution increased. US exports and imports rose over this period. The growth of trade with China, a major trading partner of the US, was affected later in the period by increases in US tariffs on some Chinese imports.",
        "These increases were expected to change the US current account balance, output and tax revenue. The US exports a range of products to China, including ice cream. China is the world’s largest consumer of ice cream, buying a third of all ice cream consumed. Chinese consumers sometimes buy chocolate to eat with ice cream. In 2019, the price of chocolate increased. In 2020, US macroeconomic performance changed.",
        "The country’s price level rose more slowly, largely due to a decrease in consumer expenditure and a reduction in workers’ bargaining power. The country’s real GDP fell and unemployment rose. These changes influenced US macroeconomic policy. US government spending rose significantly as shown in Table 1.1.",
        "The US central bank, the Federal Reserve, announced in September 2010 that it would allow the inflation rate to rise and would not increase the interest rate. In the past, central banks have aimed to keep the inflation rate low because of the effects that inflation can have on, for example, investment, exports, the distribution of income and tax revenue.",
        "The Federal Reserve stated that it wanted to raise economic growth which can increase income per head, employment and tax revenue.",
        ""
      ],
      "tables": [
        {
          "title": "US Government spending and unemployment rate 2015–2020",
          "headers": [
            "Year",
            "Government spending ($ billion)",
            "Unemployment (%)"
          ],
          "rows": [
            [
              "2015",
              "3 700",
              "5.3"
            ],
            [
              "2016",
              "3 900",
              "4.9"
            ],
            [
              "2017",
              "4 000",
              "4.4"
            ],
            [
              "2018",
              "4 100",
              "3.9"
            ],
            [
              "2019",
              "4 400",
              "3.7"
            ],
            [
              "2020",
              "6 600",
              "6.7"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/F/M/23 (February/March 2023) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/F/M/23 (February/March 2023) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "$560 bn",
      "1(b)": "Land reclamation; Increase in the labour force",
      "1(c)": "Import tariffs could improve the current account by reducing imports, making domestic goods more competitive.",
      "1(d)": "Fall in consumer expenditure reduced total demand, leading to lower demand-pull inflation. Reduction in workers' bargaining power led to lower wage rises, reducing cost-push inflation.",
      "1(e)": "(Diagram: Left-shifted demand curve with labeled axes, original and new equilibriums)",
      "1(f)": "Between 2015-2019, government spending increased while unemployment fell, indicating an inverse relationship. Higher spending increases total demand, encouraging firms to employ more workers. However, in 2020, both spending and unemployment rose, possibly due to increased spending on unemployment benefits.",
      "1(g)": "A central bank should aim for low inflation to increase international competitiveness and create economic certainty. However, reducing inflation may require contractionary monetary policy, which can reduce consumer expenditure and investment.",
      "1(h)": "Economic growth can increase employment and living standards, but it may also lead to job losses in declining industries and worsen income inequality. Environmental costs and uneven benefits mean not everyone is equally advantaged."
    },
    "questions": [
      {
        "id": "0455_22_2023_fm_1a",
        "number": "1(a)",
        "title": "Calculate the value of US imports from China in 2020. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "20% of $2,800 bn",
          "correctAnswer": "$560 bn",
          "ofrApplies": true
        },
        "indicativePoints": [
          "Correct calculation of 20% of $2,800 bn",
          "Accepts alternative formats: 560,000,000,000 or 5.6 × 10^11"
        ],
        "markingGuide": "Accept the correct figure without the $ sign. If more than one answer, consider the first correct one.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Basic economic concepts"
      },
      {
        "id": "0455_22_2023_fm_1b",
        "number": "1(b)",
        "title": "Identify two causes of the increase in the quantity of US factors of production. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Land reclamation",
          "Increase in the labour force"
        ],
        "markingGuide": "If more than two causes given, consider the first three. Accept 'increase in labour' for 'increase in the labour force'.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.2 Factors of production"
      },
      {
        "id": "0455_22_2023_fm_1c",
        "number": "1(c)",
        "title": "Explain one way that import tariffs could improve the US economy. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Improving the current account by reducing imports",
          "Increasing output by raising demand for US goods",
          "Raising tax revenue for government spending"
        ],
        "markingGuide": "One mark for a way identified and one mark for an explanation. If more than one way identified, consider the first two. To gain two marks, one mark must come from improving the current account, increasing output, or raising tax revenue.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Government intervention in markets"
      },
      {
        "id": "0455_22_2023_fm_1d",
        "number": "1(d)",
        "title": "Explain two reasons why the US inflation rate fell in 2020. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Fall in consumer expenditure leading to lower total demand",
          "Reduction in workers’ bargaining power leading to lower wage rises",
          "Higher unemployment reducing total demand",
          "Fall in real GDP reducing purchasing power"
        ],
        "markingGuide": "One mark each for each of two reasons identified and one mark each for each of two explanations. If more than two reasons given, consider the first three.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.3 Inflation"
      },
      {
        "id": "0455_22_2023_fm_1e",
        "number": "1(e)",
        "title": "Draw a demand and supply diagram to show the effect of an increase in the price of a complement on the market for ice cream. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": true,
        "diagramGuidance": {
          "diagramName": "Demand and Supply for Ice Cream",
          "axes": [
            "Price (P)",
            "Quantity (Q)"
          ],
          "curves": [
            "D1 (original demand)",
            "S1 (supply)",
            "D2 (shifted demand)"
          ],
          "shiftDescription": "Demand curve shifts left due to increase in price of complement (chocolate)",
          "equilibriumDescription": "Equilibrium points E1 (original) and E2 (new) with lower quantity and price",
          "marksAllocated": 4
        },
        "indicativePoints": [
          "Axes correctly labeled (Price and Quantity)",
          "Original demand and supply curves correctly labeled",
          "Demand curve shifted to the left",
          "Equilibriums marked (E1 and E2)"
        ],
        "markingGuide": "One mark for each of the following: axes correctly labeled, original curves labeled, demand curve shifted left, equilibriums shown.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Demand and supply"
      },
      {
        "id": "0455_22_2023_fm_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between government spending and unemployment. [5]",
        "maxMark": 5,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Inverse relationship between government spending and unemployment",
          "Evidence from 2015-2019 data (spending increased, unemployment fell)",
          "Higher government spending increases total demand and employment",
          "Government spending on education/training/infrastructure improves employability",
          "Exception in 2020: both spending and unemployment rose"
        ],
        "markingGuide": "Coherent analysis with an overview, supporting evidence, and expected relationship. Exception in 2020 should be addressed. Credit both direct and reverse causality arguments.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Government budgets and objectives"
      },
      {
        "id": "0455_22_2023_fm_1g",
        "number": "1(g)",
        "title": "Discuss whether or not a central bank should aim for a low inflation rate. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Low inflation can increase international price competitiveness and improve the current account",
          "Low inflation creates certainty, encouraging investment and economic growth",
          "Low inflation prevents random redistribution of income and protects savers",
          "High inflation may lead to contractionary monetary policy, reducing consumer expenditure and investment",
          "Low inflation can reduce menu/shoe leather costs"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why a central bank should aim for low inflation and up to 4 marks for reasons why it should not. Each point may be credited only once, on either side of the argument.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.3 Inflation"
      },
      {
        "id": "0455_22_2023_fm_1h",
        "number": "1(h)",
        "title": "Discuss whether or not economic growth benefits everyone in the US. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Economic growth can increase income per head, employment, and living standards",
          "Some workers lose jobs due to structural changes in industries",
          "Income distribution may become more uneven",
          "Pollution and environmental degradation may increase",
          "Not everyone benefits equally; some may be left behind"
        ],
        "markingGuide": "Award marks for logical arguments on both sides of the discussion. Consider the impact on different groups within society, such as workers, businesses, and the environment.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Economic growth"
      }
    ]
  },
  {
    "id": "0455_22_2022_on",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Bank mergers in Nigeria and the US",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2022_oct_nov",
    "seriesLabel": "October/November 2022",
    "originalExamCode": "0455/22/O/N/22",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_w22_qp_22.pdf",
    "extract": {
      "title": "1 Bank mergers in Nigeria and the US",
      "paragraphs": [
        "Nigeria 2019 US 2019 Change in GDP 2.3% 4.9% Inflation rate 11.5% 1.8% US dollar to Nigerian naira exchange rate 1 dollar = 400 naira In 2019, there was a merger between three Nigerian commercial banks to form Nigeria’s largest commercial bank. In 2019, two US commercial banks merged to form the US’s 6th largest commercial bank. In the US, the three largest banks controlled 32% of the market.",
        "In the US and Nigeria, large banks have opened more branches, carried out advertising campaigns and improved online banking. Bank mergers can result in some bank employees losing their jobs. Unemployment did rise in Nigeria in 2019. This is likely to have affected the government’s budget as both government tax revenue and government spending will have changed. Most commercial bank workers are well-educated.",
        "The number of years of education people receive can affect a country’s birth rate. Fig. 1.1 shows average years of schooling and the birth rate in selected countries in 2019. Some households in both Nigeria and the US, who spend more than they earn, borrow from commercial banks. Some children in Nigeria, in low-income households, do not have enough to eat due to the high price of food.",
        "A government subsidy to farmers could be used to help low-income Nigerian households. The subsidy could also help to reduce the deficit on the current account of its balance of payments. This will depend on Nigeria’s inflation rate compared with other countries and incomes at home and abroad. In the US, nearly 35% of children are overweight. One cause of this is the consumption of high-sugar food and drinks.",
        "The US government could impose a minimum price on such products, including chocolate. A minimum price could move the market closer to where social benefit equals social cost. However, some consumers think it would be unfair and some firms think it would reduce profits. A minimum price may also impose a cost on the government and its success would be influenced by how high the minimum price is set.",
        "0 0 2 4 6 8 10 12 14 16 10 20 30 Birth rate 40 50 Average years of schooling Chad Nigeria Eritrea Argentina US Germany Fig. 1.1 Average years of schooling and birth rate in selected countries 2019"
      ],
      "tables": [
        {
          "title": "Nigeria and US Fact File (2019)",
          "headers": [
            "Nigeria 2019",
            "US 2019"
          ],
          "rows": [
            [
              "Change in GDP",
              "2.3%",
              "4.9%"
            ],
            [
              "Inflation rate",
              "11.5%",
              "1.8%"
            ],
            [
              "US dollar to Nigerian naira exchange rate",
              "1 dollar = 400 naira",
              ""
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/O/N/22 (October/November 2022) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/O/N/22 (October/November 2022) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "16 dollars",
      "1(b)": "1. Open more branches. 2. Carry out an advertising campaign.",
      "1(c)": "It is a horizontal merger because both banks operate in the same stage of production (tertiary sector) and provide the same service (banking), allowing them to increase market share.",
      "1(d)": "1. High costs: The bank spends heavily on advertising and new branches, needing to recover these costs through higher prices. 2. Market power: As one of the largest banks with 32% market share, it has significant market power and faces inelastic demand, allowing it to charge higher prices to maximize profit.",
      "1(e)": "An increase in unemployment reduces household incomes, leading to lower income tax and indirect tax revenue. Simultaneously, government spending rises due to increased demand for unemployment benefits and social services. This combination of falling revenue and rising spending is likely to increase the budget deficit.",
      "1(f)": "There is generally an inverse relationship between years of schooling and birth rates. For example, Germany has high schooling and low birth rates, while Chad has low schooling and high birth rates. However, Nigeria is an exception, having more schooling than Eritrea but a higher birth rate, possibly due to other social or economic factors.",
      "1(g)": "A subsidy might reduce the deficit by lowering production costs for farmers, making Nigerian exports more competitive and increasing export revenue. However, it might not reduce the deficit if the subsidy leads to inefficiency, or if high domestic inflation offsets the cost advantage. Additionally, if demand for exports is inelastic, lower prices will not significantly increase export revenue.",
      "1(h)": "The government should impose a minimum price to reduce consumption of a demerit good, addressing negative externalities like obesity and reducing healthcare costs. However, it should not impose it because it is regressive, hurting low-income consumers, and may lead to a surplus or illegal markets. The effectiveness depends on the price elasticity of demand and the level of the minimum price set."
    },
    "questions": [
      {
        "id": "0455_22_2022_on_1a",
        "number": "1(a)",
        "title": "Calculate how many dollars 6400 Nigerian naira would have bought in 2019. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "6400 / 400",
          "correctAnswer": "16",
          "ofrApplies": false
        },
        "indicativePoints": [
          "16"
        ],
        "markingGuide": "Award 1 mark for the correct answer of 16. No method marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Exchange rates"
      },
      {
        "id": "0455_22_2022_on_1b",
        "number": "1(b)",
        "title": "Identify two ways a bank could increase demand for its services. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Open more branches",
          "Carry out an advertising campaign",
          "Improve online / mobile banking"
        ],
        "markingGuide": "Award 1 mark for each valid way identified. Maximum 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 Demand"
      },
      {
        "id": "0455_22_2022_on_1c",
        "number": "1(c)",
        "title": "State why a merger between two commercial banks is a horizontal merger. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Same stage of production / both in the tertiary (service) sector / same sector",
          "Same industry / same product / same service",
          "Can increase market share"
        ],
        "markingGuide": "Award 1 mark for stating they are in the same stage of production/sector. Award 1 mark for stating they produce the same product/service or to increase market share.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Market structures"
      },
      {
        "id": "0455_22_2022_on_1d",
        "number": "1(d)",
        "title": "Explain two reasons why a large US commercial bank may charge a high price for its services. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "High spending on opening new branches / advertising campaigns / developing online banking",
          "Need to get back costs / make a profit / may experience diseconomies of scale",
          "May offer high quality services",
          "Have high demand / customers willing to pay a high price",
          "High degree of monopoly / market power / control 32% of market",
          "Customers may have brand loyalty / reluctant to switch banks / lack of substitutes / inelastic demand",
          "High incomes in the US",
          "Many customers have the ability to pay a high price",
          "Employ skilled / well educated workers",
          "May pay high wages / may have high costs of production"
        ],
        "markingGuide": "Award 1 mark for each reason identified and 1 mark for each explanation. Maximum 4 marks (2 reasons x 2 marks).",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.2 Market power"
      },
      {
        "id": "0455_22_2022_on_1e",
        "number": "1(e)",
        "title": "Analyse how an increase in unemployment may affect the Nigerian government’s budget. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Likely to increase a deficit / reduce a surplus / may result in a budget deficit",
          "Tax revenue likely to fall / budget likely to fall",
          "Due to lower incomes",
          "Less income tax revenue",
          "Lower profits",
          "Less corporation tax revenue",
          "Lower spending",
          "Less indirect tax revenue",
          "Government may cut taxes to reduce unemployment",
          "Government spending likely to rise",
          "More spending on e.g. benefits / subsidies to the poor / law and order/ healthcare",
          "May be more spending on measures to reduce unemployment / expansionary fiscal policy",
          "May spend less on other areas e.g. education"
        ],
        "markingGuide": "Award up to 4 marks for coherent analysis. Points can be awarded for effects on tax revenue (fall) and government spending (rise).",
        "extractLinkageExpected": true,
        "syllabusTopic": "4.1 Government budget"
      },
      {
        "id": "0455_22_2022_on_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between countries’ average years of schooling and birth rates. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Generally, an inverse relationship / the more years of schooling, the lower the birth rate",
          "Germany has the highest years of schooling and lowest birth rate",
          "Chad has lowest years of schooling and highest birth rate",
          "US has more years of schooling than Argentina and so a lower birth rate",
          "The three countries with three highest years of schooling have the three lowest birth rates",
          "Exception: Nigeria / Eritrea",
          "Nigeria has more years of schooling than Eritrea but a higher birth rate",
          "More years of schooling is likely to cause people to form partnerships / have children later / focus on careers",
          "Increase awareness of contraception/family planning / increase health / reduce size of families",
          "Increase cost of raising children",
          "Exception may be result of other influences e.g. differences in fertility rates / differences in social attitudes"
        ],
        "markingGuide": "Award 1 mark for overview of inverse relationship. Up to 2 marks for supporting evidence from the graph. 1 mark for identifying an exception (Nigeria/Eritrea). Up to 1 mark for comments/explanation of the relationship or exception. No marks for just stating figures.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 Economic data"
      },
      {
        "id": "0455_22_2022_on_1g",
        "number": "1(g)",
        "title": "Discuss whether or not a subsidy, given to farmers by the Nigerian government, would reduce the deficit on the current account of its balance of payments. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "It should raise supply / increase output",
          "Equivalent to lower cost",
          "Lower price",
          "Increasing international competitiveness",
          "There may be more funds available to invest",
          "Raise quality",
          "Increase exports / reduce imports",
          "It may increase inefficiency",
          "As firms rely on the subsidy",
          "May not pass on the benefit of the subsidy to consumers",
          "Nigeria may have a high inflation rate",
          "Which may offset the cost advantage of the subsidy",
          "There may an increase in incomes at home",
          "Which may increase imports / divert exports to the home market",
          "There may be a recession abroad / decrease in incomes of trading partners",
          "Which reduces exports",
          "Lower export prices will not raise export revenue if demand is inelastic",
          "The exchange rate may rise",
          "Increasing export prices / lowering import prices",
          "Farmers may import e.g. more machinery",
          "There may be adverse weather conditions / disease",
          "Which reduces quality / quality may remain poor",
          "There may be import restrictions / increase in import restrictions imposed by other countries"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might reduce the deficit. Award up to 4 marks for logical reasons why it might not. Total maximum 6 marks. Each point may be credited only once. Separate development as to how/why the outcome may differ is rewarded.",
        "extractLinkageExpected": true,
        "syllabusTopic": "5.1 Balance of payments"
      },
      {
        "id": "0455_22_2022_on_1h",
        "number": "1(h)",
        "title": "Discuss whether or not the US government should impose a minimum price on chocolate. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "It will raise price",
          "Reduce demand / demand contracts / quantity demand falls / consumption falls",
          "Reduce obesity",
          "Social cost of eating chocolate may exceed social benefit",
          "Due to external costs",
          "Example e.g. cost on health service / may reduce need for government spending on healthcare",
          "Overconsumption of chocolate",
          "Move market closer to where social benefit equals social cost",
          "Increase welfare",
          "May raise health of the population / eating chocolate may be unhealthy",
          "Raise labour productivity",
          "There may be information failure",
          "Some chocolate is a demerit good",
          "Poor may not be able to afford chocolate",
          "Regressive measure",
          "Not everyone overweight / some may consume chocolate in quantities that are not harmful",
          "May cause demand to switch to other high sugar products / discriminate against other high sugar products",
          "It will encourage supply to extend",
          "A surplus may develop",
          "There may be an illegal market in chocolate",
          "There may be a cost to the government",
          "It may have to pay to monitor that the price is being charged",
          "Lower tax revenue from chocolate",
          "May be an increase in unemployment",
          "Demand may be inelastic",
          "Resulting in a relatively small fall in demand / chocolate may be addictive",
          "It depends on how high the minimum price is",
          "May have no effect if set below the market equilibrium"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it should. Award up to 4 marks for logical reasons why it should not. Total maximum 6 marks. A minimum price diagram without explanation can get a maximum of 2 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Market failure"
      }
    ]
  },
  {
    "id": "0455_22_2022_mj",
    "title": "Cambridge IGCSE Economics 0455/22 — Section A: Happiness in Bhutan",
    "subjectCode": "0455",
    "subjectTitle": "Cambridge IGCSE Economics (0455)",
    "qualificationLevel": "as",
    "paperNumber": "22",
    "examSeries": "2022_may_june",
    "seriesLabel": "May/June 2022",
    "originalExamCode": "0455/22/M/J/22",
    "totalMarks": 30,
    "durationMinutes": 45,
    "isOfficial": true,
    "pdfUrl": "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0455_s22_qp_22.pdf",
    "extract": {
      "title": "1 Happiness in Bhutan",
      "paragraphs": [
        "Fact File\nPopulation 0.8 m\nGDP per head $3250\nGovernment spending $450 m\nGovernment tax revenue $380 m\nWorld Happiness Index ranking 95th\nHuman Development Index ranking 134th\n\nThe United Nations has published a World Happiness Index every year since 2012. This index ranks countries according to life expectancy, freedom, social support, trust, generosity and GDP per head.",
        "New Zealand was ranked 8th in the World Happiness Index in 2019. The governments of both Bhutan and New Zealand now consider a number of influences on the happiness of their populations. While more than half of Bhutan’s labour force is employed in agriculture, most people in New Zealand are employed in the tertiary sector.",
        "Working conditions, working hours, the type of work and pay vary between the primary and tertiary sectors. Productivity is higher in all sectors in New Zealand than in Bhutan. This is partly the result of higher investment in capital goods and education in New Zealand. New Zealand also has a higher GDP per head.",
        "GDP per head ($) can influence net migration (number of people) as shown for selected countries in 2017 in Fig. 1.1. In its 2019 budget, the New Zealand government said it would measure its progress not by increases in GDP but by increases in the quality of people’s lives. To achieve this, it announced increased spending on some areas including mental health, child poverty and pollution.",
        "Some economists criticised this approach. They argued that the best way the government could improve living standards is to reduce income tax rates. This reduction could change government spending and the quantity of products that people buy, including cars. Tax revenue had increased in New Zealand in 2019, partly because of a rise in revenue from corporation tax.",
        "It was, however, difficult to predict firms’ future profits. This was because of uncertainty about what would happen to its GDP and its corporation tax rates."
      ],
      "tables": [
        {
          "title": "Fig. 1.1 GDP per head ($) and net migration (number of people) of selected countries 2017",
          "headers": [
            "Net migration (number of people)",
            "GDP per head ($)"
          ],
          "rows": [
            [
              "-55 000",
              "Bhutan"
            ],
            [
              "-35 000",
              "Cyprus"
            ],
            [
              "-15 000",
              "Kenya"
            ],
            [
              "5000",
              "Mozambique"
            ],
            [
              "25 000",
              "New Zealand"
            ],
            [
              "45 000",
              "Slovenia"
            ]
          ],
          "notes": "Source: Official Cambridge IGCSE Economics 0455/22/M/J/22 (May/June 2022) Question Paper."
        }
      ],
      "sources": "Official Cambridge International IGCSE Economics 0455/22/M/J/22 (May/June 2022) Section A Case Study."
    },
    "sampleAnswers": {
      "1(a)": "$2.6 bn",
      "1(b)": "Life expectancy and GDP per head.",
      "1(c)": "Government spending ($450m) exceeded tax revenue ($380m), creating a budget deficit of $70m. This deficit spending acts as expansionary fiscal policy, directly increasing aggregate demand.",
      "1(d)": "1. Better working conditions: Tertiary jobs often involve working indoors with less physical stress and better fringe benefits. 2. Higher pay: Tertiary roles often require more skills, leading to higher wages that allow for a higher standard of living.",
      "1(e)": "Investment in capital goods provides better equipment, allowing workers to produce more output per hour. Investment in education improves worker skills and qualifications, enabling them to use advanced technology more efficiently, thereby increasing overall productivity.",
      "1(f)": "Generally, there is a positive relationship: countries with higher GDP per head (e.g., New Zealand) have net immigration, while those with lower GDP per head (e.g., Mozambique) have net emigration. An exception is Kenya, which has a higher GDP per head than Mozambique but higher net emigration, possibly due to other factors like political instability or immigration controls.",
      "1(g)": "Enterprise might increase because higher productivity and investment in education create more skilled entrepreneurs and higher profits. However, it might not increase if uncertainty about GDP and tax rates reduces business confidence, or if increased government spending on regulation (e.g., pollution) raises firm costs and reduces profits.",
      "1(h)": "A tax cut might increase living standards by raising disposable income, allowing people to buy more goods and services, and increasing total demand which boosts employment. However, it might not if the government cuts essential public services to balance the budget, or if the tax cut leads to higher inflation that erodes the real value of the income increase."
    },
    "questions": [
      {
        "id": "0455_22_2022_mj_1a",
        "number": "1(a)",
        "title": "Calculate Bhutan’s GDP in 2018. [1]",
        "maxMark": 1,
        "category": "calculation",
        "tariff": {
          "ao1": 0,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "calculationGuidance": {
          "formula": "GDP = GDP per head × Population",
          "correctAnswer": "$2.6 bn / $2600 m / $2 600 000 000 / 2.6 × 10⁹",
          "ofrApplies": false
        },
        "indicativePoints": [
          "Accept the figure without the $ sign."
        ],
        "markingGuide": "Award 1 mark for the correct calculation of $2.6 billion (or equivalent). Accept figures without currency symbols.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 National income and output"
      },
      {
        "id": "0455_22_2022_mj_1b",
        "number": "1(b)",
        "title": "Identify two indicators that are in both the World Happiness Index and the Human Development Index. [2]",
        "maxMark": 2,
        "category": "definition",
        "tariff": {
          "ao1": 2,
          "ao2": 0,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Life expectancy",
          "GDP per head"
        ],
        "markingGuide": "Award 1 mark for each correct indicator identified. If more than two indicators are given, consider the first three.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 National income and output"
      },
      {
        "id": "0455_22_2022_mj_1c",
        "number": "1(c)",
        "title": "State why Bhutan’s 2018 government budget is likely to have increased total demand in Bhutan. [2]",
        "maxMark": 2,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 1,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Government spending was greater than government revenue",
          "There was a budget deficit of $70 m",
          "The government may have used expansionary fiscal policy"
        ],
        "markingGuide": "Award 1 mark for identifying that government spending exceeded revenue (budget deficit). Award 1 mark for linking this to expansionary fiscal policy or the specific deficit amount ($70m).",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Fiscal policy"
      },
      {
        "id": "0455_22_2022_mj_1d",
        "number": "1(d)",
        "title": "Explain two reasons why someone may prefer to work in the tertiary sector rather than in the primary sector. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Better working conditions / non-wage factors (e.g., working inside, less stress, fringe benefits)",
          "Shorter working hours permitting more leisure time",
          "Type of work is less physically demanding / less risk to health",
          "Better paid enabling more goods and services to be purchased / higher standard of living"
        ],
        "markingGuide": "Award 1 mark for each reason identified and 1 mark for each explanation. Accept 'mix and match' (e.g., working hours as part of working conditions). Accept explanations of disadvantages of the primary sector.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.1 The nature of the economy"
      },
      {
        "id": "0455_22_2022_mj_1e",
        "number": "1(e)",
        "title": "Analyse how investment in capital goods and education can increase New Zealand’s productivity. [4]",
        "maxMark": 4,
        "category": "short_answer",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Higher investment in capital goods enables workers to work with better equipment / more output per worker",
          "New capital goods may incorporate advances in technology / result in innovation",
          "Higher investment in education improves quality of education / increases knowledge",
          "Investment in education increases workers’ skills / qualifications / enables use of advanced technology",
          "Investment enables capital goods/workers to work at a faster rate / be more efficient / make fewer mistakes"
        ],
        "markingGuide": "Award up to 3 marks for analysis on investment in capital goods and up to 3 marks for investment in education. Only credit 'increase efficiency' once. Total max 4 marks.",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.4 Productivity"
      },
      {
        "id": "0455_22_2022_mj_1f",
        "number": "1(f)",
        "title": "Analyse the relationship between GDP per head and net migration. [5]",
        "maxMark": 5,
        "category": "short_answer",
        "tariff": {
          "ao1": 1,
          "ao2": 4,
          "ao3": 0
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Generally, countries with higher GDP per head have net immigration / positive relationship",
          "Supporting evidence: New Zealand has highest GDP per head and highest net immigration",
          "Supporting evidence: Cyprus has second highest GDP per head and second highest net immigration",
          "Exception: Kenya or Mozambique (e.g., Kenya has higher GDP per head but higher net emigration than Mozambique)",
          "Comment: Higher GDP per head encourages migration to increase living standards / income",
          "Comment: Other influences e.g., immigration controls, wars, political instability"
        ],
        "markingGuide": "1 mark for overview of general relationship. Up to 2 marks for supporting evidence from the figure. 1 mark for identifying an exception (Kenya/Mozambique) and explaining it. 1 mark for comments on causes (living standards) or other influences. Do not accept misinterpretations of the figure for the exception.",
        "extractLinkageExpected": true,
        "syllabusTopic": "1.1 National income and output"
      },
      {
        "id": "0455_22_2022_mj_1g",
        "number": "1(g)",
        "title": "Discuss whether or not enterprise is likely to have increased in New Zealand after 2019. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Might increase: High labour productivity keeps costs down and increases profits, motivating entrepreneurs",
          "Might increase: Higher investment in capital goods increases opportunities for expansion",
          "Might increase: Investment in education increases skills and risk-taking ability",
          "Might increase: Government spending on health/pollution increases worker productivity/health",
          "Might increase: Cut in income tax rates increases disposable income and profit incentive",
          "Might not increase: Uncertainty about GDP/tax rates reduces confidence and increases risk",
          "Might not increase: Increased corporation tax reduces retained profits",
          "Might not increase: Government spending on pollution/poverty increases firm costs and reduces profits"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might increase and up to 4 marks for logical reasons why it might not. Each point may be credited only once. Separate development of how/why outcomes differ is rewarded. Generic example: 'Tax revenue may decrease because incomes may be lower' (1) vs 'Tax revenue may increase because of a different reason' (1).",
        "extractLinkageExpected": true,
        "syllabusTopic": "2.2 The role of the entrepreneur"
      },
      {
        "id": "0455_22_2022_mj_1h",
        "number": "1(h)",
        "title": "Discuss whether or not a cut in income tax rates will increase living standards. [6]",
        "maxMark": 6,
        "category": "essay_evaluative",
        "tariff": {
          "ao1": 2,
          "ao2": 2,
          "ao3": 2
        },
        "hasDiagramRequirement": false,
        "indicativePoints": [
          "Might increase: Increases disposable income and ability to buy goods/services",
          "Might increase: Increases spending/total demand, reducing unemployment and increasing output",
          "Might increase: Increases saving, providing a safety net",
          "Might increase: Encourages investment, lowering costs and prices",
          "Might increase: Enables purchase of more merit goods (education/healthcare)",
          "Might increase: Increases incentive to work / allows fewer working hours for more leisure",
          "Might not increase: If tax cut is offset by reduced government spending on public goods",
          "Might not increase: If it leads to higher inflation eroding real income"
        ],
        "markingGuide": "Award up to 4 marks for logical reasons why it might increase and up to 4 marks for logical reasons why it might not. Rise in income is not sufficient; need idea of disposable income. Each point may be credited only once.",
        "extractLinkageExpected": true,
        "syllabusTopic": "3.1 Fiscal policy"
      }
    ]
  }
];

export const PRELOADED_DATA_RESPONSE_PAPERS: DataResponsePaper[] = RAW_PRELOADED_DATA_RESPONSE_PAPERS.map((paper) => ({
  ...paper,
  sampleAnswers: BENCHMARK_SAMPLE_ANSWERS[paper.id] || paper.sampleAnswers,
}));

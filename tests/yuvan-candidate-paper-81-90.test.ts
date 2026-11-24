import { describe, expect, it } from "vitest";
import { defaultSplitForMaxMark } from "@/lib/examiner/config";
import {
  normaliseGrading,
  purgeContradictions,
  deduplicateAcrossSections,
  type Grading,
} from "@/lib/examiner/types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "@/lib/examiner/writing-quality";
import { getCambridgeGradeStandard } from "@/lib/cambridge-thresholds";

/**
 * Stress Test on Second Real Cambridge International IGCSE Economics (0455/22) Paper:
 * Candidate: YUVAN KAARTHIK MAHENDRAN (Candidate 9087, Centre IN023)
 * Official Cambridge Script Assessment Total: 81 / 90 (Grade A*)
 */
describe("Yuvan Kaarthik Real Cambridge 0455/22 Script Stress Test Matrix (81/90)", () => {
  // ==========================================================================
  // Essay 1: Q5(d) 8m Discuss on Emigration and Living Standards (Cambridge Awarded: 6/8)
  // ==========================================================================
  describe("Real Essay 1: Q5(d) 8m Discuss on Emigration & Living Standards (Cambridge Awarded: 6/8)", () => {
    const question = "Discuss whether or not emigration benefits living standards";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `Living standards are the factors that contribute to a person's wellbeing and happiness. Emigration is when people leave a country.

People who emigrate may enjoy a higher living standard if they move from a developing country to a developed country in search of work as there may be more employment opportunities abroad and thus people may have a higher chance of getting a job and income, which increases their living standards as they have a higher purchasing power and can afford necessities.

However people may emigrate due to wars or famines occurring in their country. They may become refugees and may not be able to get jobs and may be forced to live in poor living conditions which can decrease their living standards as their health is compromised.

People who emigrate for work may also fall victim to worse living standards than in their own country, if they are exploited by large firms and have to work in poor working conditions, which could deteriorate their health and can make them ill and stressed, thus decreasing their standards of living.

In conclusion, living standards can also be affected by healthcare provision and education levels in the country as well as if the country is experiencing high inflation or a recession which would decrease living standards for emigrants as high inflation would reduce their purchasing power and may lead to absolute poverty, and recessions may lead to unemployment as firms reduce their scale of operations in order to reduce their cost of production as there is not enough aggregate demand.`;

    it("awards 6/8 marks with Level 3 two-sided evaluation, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Two-sided discussion with good economic development and conclusion)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of living standards and emigration." },
          analysis: { awarded: 2, out_of: 3, comment: "Clear analysis of wage differentials, purchasing power, and job opportunities in developed economies." },
          evaluation: { awarded: 2, out_of: 3, comment: "Sound counter-analysis on refugee hardship, worker exploitation, and concluding synthesis on inflation/recession trade-offs." },
        },
        points: [
          {
            quote: "Living standards are the factors that contribute to a person's wellbeing... Emigration is when people leave a country",
            matched_ms_point: "Definitions of living standards and emigration",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 definitions.",
          },
          {
            quote: "move from a developing country to a developed country in search of work... higher purchasing power and can afford necessities",
            matched_ms_point: "Higher wages and employment opportunities abroad",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed AO2 link from emigration to employment, income, and purchasing power.",
          },
          {
            quote: "emigrate due to wars or famines... forced to live in poor living conditions... health is compromised",
            matched_ms_point: "Refugee crises and involuntary emigration",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Sound AO3 counter-argument on involuntary displacement and compromised welfare.",
          },
          {
            quote: "exploited by large firms and have to work in poor working conditions, which could deteriorate their health",
            matched_ms_point: "Exploitation and poor working conditions",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Valid evaluative counter-point on migrant exploitation.",
          },
        ],
        examiner_summary: "Good Level 3 answer. Addresses both benefits of voluntary economic migration and costs of involuntary/exploitative migration, with a concluding judgment.",
        strengths: ["Clear distinction between voluntary work migration and refugee flight.", "Accurate link between income and purchasing power."],
        weaknesses: ["Could further develop the impact of remittances sent back to the home country."],
        missing_elements: { definitions: [], analysis: ["Remittance inflows"], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Consider how remittances sent home by emigrants alter living standards in the home country."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.max_mark).toBe(8);
      expect(finalGrading.band).toContain("Level 3");
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 2: Q4(d) 8m Discuss on Trade Union Membership (Cambridge Awarded: 6/8)
  // ==========================================================================
  describe("Real Essay 2: Q4(d) 8m Discuss on Trade Union Membership (Cambridge Awarded: 6/8)", () => {
    const question = "Discuss whether or not trade union membership will increase in an economy";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `Trade unions are organisations of workers that aim to promote and protect the interests of their members.

Trade union membership may increase during inflation as the purchasing powers and real wages of workers will fall and thus they might demand higher wages from employers by joining a trade union as their cost of living increases.

Workers may also join trade unions if they feel like their working conditions and pay are insufficient and thus they may enrol into trade unions to collectively bargain with employers to increase the pay and working conditions as trade unions act as a single point of contract between workers and employers and also to increase their bargaining strength.

However trade union membership may also decrease if trade union membership fees increase, and if the power of trade unions have been decreased by the government.

Trade union membership may also decrease if firms have already met the demands of the workers and thus the workers would now no longer need to negotiate with employers.

Workers may also prefer to negotiate with employers themselves rather than with a trade union, as they may be more productive or have more experience than their colleagues and thus feel like they deserve a higher income than their colleagues. This would not be possible in a trade union, as all workers get the same income.

In conclusion, there are other multiple factors that affect trade union membership like training provided by trade unions.`;

    it("awards 6/8 marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Two-sided discussion with good economic development and conclusion)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate definition of trade unions and collective bargaining." },
          analysis: { awarded: 2, out_of: 3, comment: "Clear analysis of inflation eroding real wages and bargaining power." },
          evaluation: { awarded: 2, out_of: 3, comment: "Sound counter-arguments covering union membership fees, government legislation, and individual merit negotiation." },
        },
        points: [
          {
            quote: "organisations of workers that aim to promote and protect the interests of their members",
            matched_ms_point: "Definition of trade union",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 definition.",
          },
          {
            quote: "purchasing powers and real wages of workers will fall and thus they might demand higher wages from employers by joining a trade union",
            matched_ms_point: "Inflation and protection of real wages",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed AO2 link from inflation to real wage erosion and union demand.",
          },
          {
            quote: "trade union membership may also decrease if trade union membership fees increase, and if the power of trade unions have been decreased by the government",
            matched_ms_point: "Cost of membership and government restrictions",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Valid AO3 counter-point on union costs and legal restrictions.",
          },
          {
            quote: "prefer to negotiate with employers themselves... deserve a higher income than their colleagues",
            matched_ms_point: "Individual bargaining and merit pay",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Relevant evaluative point on individual vs collective contracts.",
          },
        ],
        examiner_summary: "Well-reasoned Level 3 response covering real wage protection, collective bargaining, and counter-arguments regarding membership costs and individual bargaining.",
        strengths: ["Clear recognition of real wage erosion under inflation.", "Considers reasons why high-performing individuals avoid collective agreements."],
        weaknesses: ["Conclusion is slightly brief."],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Provide a more decisive evaluative conclusion weighing the relative strength of government legislation vs inflation."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.max_mark).toBe(8);
      expect(finalGrading.band).toContain("Level 3");
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 3: Q2(d) 8m Discuss on High Personal Income Tax on the Rich (Cambridge Awarded: 6/8)
  // ==========================================================================
  describe("Real Essay 3: Q2(d) 8m Discuss on Income Tax on the Rich (Cambridge Awarded: 6/8)", () => {
    const question = "Discuss whether or not a government should impose a high rate of personal income tax on the rich";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `The government should impose a high rate of personal income tax on the rich as it will reduce income inequality in the country and reduce relative poverty as well.

The increased tax revenues can reduce a budget deficit if it was present and can be used to fund welfare schemes for the poor and be used to improve the wellbeing of all citizens through services, thus increasing the living standards in the country.

However, imposing a high rate of personal income tax on the rich may cause them to migrate to a country with lower personal taxes, which would reduce aggregate demand in the economy as rich people contribute a lot to the total consumer expenditure. This will cause firms to reduce their scale of production and fire workers to reduce cost of production, leading to unemployment. Less output results in less economic growth.

Imposing high rates of personal tax on the rich also discourages enterprise in the economy as a large proportion of profit made will be collected as tax, thus less businesses will open which could reduce and cause business owners to relocate their firms elsewhere to avoid paying the taxes. This reduces the output of the economy thus slowing down economic growth and could lead to a recession.

Instead the government can reduce the government expenditure on unemployment benefits, which would increase employment and the money could be allocated towards more productive areas of the economy.`;

    it("awards 6/8 marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Two-sided discussion with good economic development and conclusion)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate understanding of progressive taxation, income redistribution, and budget balance." },
          analysis: { awarded: 2, out_of: 3, comment: "Clear analysis of inequality reduction and funding public services." },
          evaluation: { awarded: 2, out_of: 3, comment: "Strong counter-analysis on brain drain/capital flight, reduced enterprise incentives, and alternative policies." },
        },
        points: [
          {
            quote: "reduce income inequality in the country and reduce relative poverty as well",
            matched_ms_point: "Redistribution of income and poverty reduction",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 knowledge of progressive tax objective.",
          },
          {
            quote: "tax revenues can reduce a budget deficit... fund welfare schemes for the poor... improve wellbeing",
            matched_ms_point: "Fiscal revenue and welfare funding",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed AO2 link from revenue to public services and living standards.",
          },
          {
            quote: "cause them to migrate to a country with lower personal taxes... reduce aggregate demand... leading to unemployment",
            matched_ms_point: "Emigration of high earners and AD contraction",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Sound AO3 counter-analysis on tax avoidance emigration and demand reduction.",
          },
          {
            quote: "discourages enterprise in the economy... less businesses will open... slow down economic growth",
            matched_ms_point: "Disincentive to work and enterprise",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Valid evaluation of entrepreneurial disincentives.",
          },
        ],
        examiner_summary: "Solid Level 3 response. Effectively explores equity benefits and revenue generation against brain drain, reduced work effort, and tax avoidance.",
        strengths: ["Clear link between progressive tax and relative poverty.", "Detailed disincentive effects on enterprise."],
        weaknesses: ["Could mention the Laffer curve or tax evasion explicitly."],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Consider citing the risk of tax evasion vs legal tax avoidance."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.max_mark).toBe(8);
      expect(finalGrading.band).toContain("Level 3");
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 4: Q1(g) 6m Discuss on Fiscal Policy and HDI (Cambridge Awarded: 6/6)
  // ==========================================================================
  describe("Real Essay 4: Q1(g) 6m Discuss on Fiscal Policy & HDI (Cambridge Awarded: 6/6)", () => {
    const question = "Discuss whether or not fiscal policy can increase a country's HDI value";
    const split = defaultSplitForMaxMark(6, "discuss", question);
    const candidateEssay = `Fiscal policy is a government policy that affects aggregate demand using tax rates and government expenditure.

Fiscal policy can increase a country's HDI value when expansionary fiscal policy is utilized, thus there is increased government expenditure which increases aggregate demand, which incentivizes firms to expand their scale of production and thus will hire more workers to produce more output. This combined with lower tax rates increases the gross national income per head which is an important component in HDI.

Fiscal policy can also decrease a country's HDI value, and thus government expenditure on healthcare and educational institutions will decrease which can decrease the average life expectancy in the country and can decrease the mean number of years a child will spend in school in that country, both which will decrease the HDI value.

However, supply-side policies can be utilized for long-term economic growth instead of fiscal policy, as it may lead to demand-pull inflation due to the high aggregate demand. Monetary policy can also be used to increase the income index as monetary policy aids economic growth and thus improving incomes.`;

    it("awards 6/6 full marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Two-sided discussion with good economic development and conclusion)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate definition of fiscal policy and HDI components." },
          analysis: { awarded: 2, out_of: 2, comment: "Clear explanation of expansionary fiscal policy raising GNI per capita." },
          evaluation: { awarded: 2, out_of: 2, comment: "Sound counter-analysis on contractionary spending cuts to health/education hurting life expectancy and schooling, plus policy trade-offs." },
        },
        points: [
          {
            quote: "government policy that affects aggregate demand using tax rates and government expenditure",
            matched_ms_point: "Definition of fiscal policy",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 definition.",
          },
          {
            quote: "increased government expenditure which increases aggregate demand... hire more workers... increases gross national income per head which is an important component in HDI",
            matched_ms_point: "Expansionary policy and GNI per head component",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed AO2 link to HDI income dimension.",
          },
          {
            quote: "expenditure on healthcare and educational institutions will decrease which can decrease the average life expectancy... mean number of years a child will spend in school",
            matched_ms_point: "Health and education components of HDI",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Thorough AO3 evaluation of contractionary fiscal policy and non-income HDI components.",
          },
        ],
        examiner_summary: "Exemplary 6-mark Section A discuss answer. Directly links fiscal policy instruments to all three HDI components (GNI per capita, life expectancy, schooling).",
        strengths: ["Explicitly cites all three dimensions of the HDI.", "Covers both expansionary and contractionary policy impacts."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Excellent response."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 6, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 6, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.max_mark).toBe(6);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 6);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 5: Q4(c) 6m Analyse on Competitive Market vs Monopoly (Cambridge Awarded: 6/6)
  // ==========================================================================
  describe("Real Essay 5: Q4(c) 6m Analyse on Competitive Market vs Monopoly (Cambridge Awarded: 6/6)", () => {
    const question = "Analyse the differences between a competitive market and a monopoly market";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `In competitive markets both the producers and consumers are price-takers and none are price-makers. Any change in price by producers will incur a loss for them as increasing prices will cause customers to buy products from other producers and a decrease in price would incur a loss as they would not be making any profit. However in a monopoly market the sole producer is the price-maker and the consumers are price-takers. Because the monopoly controls the entire supply of a commodity, consumers have no choice but to pay the price the monopoly sets if the consumers want to consume that good.

There are also less barriers to entry for firms. Firms in a competitive market are also more efficient and produce higher quality goods than a monopoly market as the strong competition in a competitive market forces firms to cut costs of production and reduce their prices if they want to attract customers. This will ensure firms are efficient. In a monopoly however, the firm is inefficient and may produce bad quality products as it is facing zero competition and will still make profit even if they have inefficient production methods as they are the only supplier.`;

    it("awards 6/6 full marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Coherent, step-by-step causal chain of economic analysis)",
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "0455 6m Analyse allocates all marks to AO2." },
          analysis: { awarded: 6, out_of: 6, comment: "Comprehensive comparative analysis of price-taking vs price-making, barriers to entry, and productive/allocative efficiency." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "competitive markets both the producers and consumers are price-takers... in a monopoly market the sole producer is the price-maker",
            matched_ms_point: "Price takers vs price maker",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate contrast of price setting power.",
          },
          {
            quote: "Because the monopoly controls the entire supply of a commodity, consumers have no choice but to pay the price the monopoly sets",
            matched_ms_point: "Market concentration and consumer sovereignty",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Clear analysis of monopoly supply control.",
          },
          {
            quote: "strong competition in a competitive market forces firms to cut costs of production and reduce their prices... In a monopoly however, the firm is inefficient",
            matched_ms_point: "Efficiency and quality differences",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Detailed causal link from competitive discipline to productive efficiency.",
          },
        ],
        examiner_summary: "Exemplary 6-mark comparative analysis. Contrasts price determination, barriers to entry, and efficiency incentives with precision.",
        strengths: ["Clear comparative framework.", "Understands why competition forces cost minimization."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Excellent response."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 6, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 6, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.max_mark).toBe(6);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 6);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 6: Q2(b) 4m Explain Labour Income Variation (Cambridge Awarded: 2/4)
  // ==========================================================================
  describe("Real Essay 6: Q2(b) 4m Explain Labour Income Variation (Cambridge Awarded: 2/4)", () => {
    const question = "Explain two reasons why labour incomes vary between countries [4]";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateAnswer = `Some countries may have more skilled labour who are more productive than labour in other countries where labour is largely unskilled.

There are changes in demand and supply for labour in different countries. Wherever labour is more demanded, their income is higher and wherever labour is less demanded, their income is reduced.`;

    it("awards 2/4 marks, matching Cambridge official senior examiner penalty for underdeveloped second point", () => {
      const rawAiGrading = {
        total_mark: 2,
        band: "Level 1 (Partially developed explanation)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Identifies skills/productivity differences and demand/supply conditions." },
          analysis: { awarded: 0, out_of: 2, comment: "First point mentions skilled labour but does not develop why higher productivity leads to higher wages (revenue to firms). Second point on demand and supply is descriptive and undeveloped." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "Some countries may have more skilled labour who are more productive",
            matched_ms_point: "Differences in skills and education",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Valid identification of skills/productivity, but lacks development on firm revenues or marginal revenue product.",
          },
          {
            quote: "There are changes in demand and supply for labour in different countries",
            matched_ms_point: "Demand and supply of labour",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Identifies demand/supply forces, but explanation is circular ('more demanded means income higher').",
          },
        ],
        examiner_summary: "Candidate identifies two valid reasons (skill levels and demand/supply) but neither reason is fully developed with the economic chain to wages.",
        strengths: ["Correctly identifies skills and market forces."],
        weaknesses: ["Underdeveloped causal links. Explaining requires linking productivity to firm profitability and wage offers."],
        missing_elements: { definitions: [], analysis: ["Development of how productivity raises wage bargaining or firm revenue"], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Always add 'which means that...' or 'as a result...' to secure the development mark for each reason."],
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 4, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 4, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.max_mark).toBe(4);
    });
  });

  // ==========================================================================
  // Essay 7: Q4(b) 4m Explain Working Longer Hours (Cambridge Awarded: 4/4)
  // ==========================================================================
  describe("Real Essay 7: Q4(b) 4m Explain Working Longer Hours (Cambridge Awarded: 4/4)", () => {
    const question = "Explain two reasons why a worker might choose to work longer hours [4]";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateAnswer = `A worker may choose to work long hours if they want to make a large purchase such as a house, which would require large sums of money.

A worker may also choose to work longer hours to save more of their income if interest rates have risen and thus incentivising the worker to save more money.

The worker may also be trying to build loyalty with the owner and may be doing this for a job promotion.`;

    it("awards 4/4 full marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 4,
        band: "Level 2 (Two clearly explained points with sound economic transmission)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Identifies targets for major purchases and saving incentives." },
          analysis: { awarded: 2, out_of: 2, comment: "Clearly develops both causal links: earning lump sums for major commitments and capitalizing on higher interest returns." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "make a large purchase such as a house, which would require large sums of money",
            matched_ms_point: "Target income for major purchase",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed point linking major capital purchase to overtime work.",
          },
          {
            quote: "save more of their income if interest rates have risen and thus incentivising the worker to save more money",
            matched_ms_point: "Saving incentive from interest rates",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed point linking higher deposit returns to overtime labor supply.",
          },
        ],
        examiner_summary: "Strong 4-mark response. Candidate provides three valid reasons, of which the first two are fully developed.",
        strengths: ["Concrete real-world example (buying a house).", "Accurate link between interest rates and savings incentive."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Well-structured response."],
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 4, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 4, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(4);
      expect(finalGrading.max_mark).toBe(4);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 4);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 8: Q2(a) 2m Define The Economic Problem (Cambridge Awarded: 2/2)
  // ==========================================================================
  describe("Real Essay 8: Q2(a) 2m Define The Economic Problem (Cambridge Awarded: 2/2)", () => {
    const question = "Define the economic problem [2]";
    const split = defaultSplitForMaxMark(2, undefined, question);
    const candidateAnswer = "The economic problem is that there are unlimited wants but limited resources which creates scarcity.";

    it("awards 2/2 full marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 2,
        band: "Full Credit (Clear, accurate syllabus definition)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurately identifies unlimited wants and finite resources resulting in scarcity." },
          analysis: { awarded: 0, out_of: 0, comment: "" },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "unlimited wants",
            matched_ms_point: "Infinite/unlimited wants",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate identification of unlimited wants.",
          },
          {
            quote: "limited resources which creates scarcity",
            matched_ms_point: "Finite resources / scarcity",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate identification of finite resources / scarcity.",
          },
        ],
        examiner_summary: "Precise textbook definition of the fundamental economic problem.",
        strengths: ["Cites both sides of the scarcity definition."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Maintain this standard."],
      };

      const normalised = normaliseGrading(rawAiGrading, 2, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 2, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 2, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.max_mark).toBe(2);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 2);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 9: Q4(a) 2m Formula for PES (Cambridge Awarded: 2/2)
  // ==========================================================================
  describe("Real Essay 9: Q4(a) 2m Formula for PES (Cambridge Awarded: 2/2)", () => {
    const question = "State the formula used to calculate price elasticity of supply [2]";
    const split = defaultSplitForMaxMark(2, undefined, question);
    const candidateAnswer = "PES = percentage change in quantity supplied / percentage change in price";

    it("awards 2/2 full marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 2,
        band: "Full Credit (Clear, accurate syllabus definition)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate mathematical formula for PES." },
          analysis: { awarded: 0, out_of: 0, comment: "" },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "percentage change in quantity supplied",
            matched_ms_point: "% change in QS (numerator)",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate numerator.",
          },
          {
            quote: "percentage change in price",
            matched_ms_point: "% change in P (denominator)",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate denominator.",
          },
        ],
        examiner_summary: "Completely accurate formula for price elasticity of supply.",
        strengths: ["Correctly states numerator and denominator."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Maintain this formula precision."],
      };

      const normalised = normaliseGrading(rawAiGrading, 2, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 2, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 2, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.max_mark).toBe(2);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 2);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 10: Q5(a) 2m Define Public Good (Cambridge Awarded: 2/2)
  // ==========================================================================
  describe("Real Essay 10: Q5(a) 2m Define Public Good (Cambridge Awarded: 2/2)", () => {
    const question = "Define a public good [2]";
    const split = defaultSplitForMaxMark(2, undefined, question);
    const candidateAnswer = "A public good is a good that is non-rivalrous and non-excludable.";

    it("awards 2/2 full marks, matching Cambridge official senior examiner score", () => {
      const rawAiGrading = {
        total_mark: 2,
        band: "Full Credit (Clear, accurate syllabus definition)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurately identifies non-rivalry and non-excludability." },
          analysis: { awarded: 0, out_of: 0, comment: "" },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "non-rivalrous",
            matched_ms_point: "Non-rivalry",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate characteristic.",
          },
          {
            quote: "non-excludable",
            matched_ms_point: "Non-excludability",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate characteristic.",
          },
        ],
        examiner_summary: "Perfect 2-mark definition specifying both non-rivalry and non-excludability.",
        strengths: ["Cites both defining characteristics."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Spot-on."],
      };

      const normalised = normaliseGrading(rawAiGrading, 2, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 2, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 2, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.max_mark).toBe(2);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 2);
      expect(grade.letter).toBe("A*");
    });
  });
});

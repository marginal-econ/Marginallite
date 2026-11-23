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
 * Stress Test on User's Actual Cambridge International IGCSE Economics (0455/22) Paper:
 * Candidate: SAIKRISH KARTHIKEYAN (Candidate 9061, Centre IN023)
 * Official Cambridge Script Assessment Total: 77 / 90 (Grade A*)
 */
describe("User Real Cambridge 0455/22 Script Stress Test Matrix", () => {
  // ==========================================================================
  // Essay 1: Q3(d) 8-mark Discuss on Fixed Exchange Rates (Cambridge Awarded: 8/8)
  // ==========================================================================
  describe("Real Essay 1: Q3(d) 8m Discuss on Fixed Exchange Rates (Cambridge Awarded: 8/8)", () => {
    const question = "Discuss whether or not a fixed exchange rate system benefits an economy";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `A exchange rate is a value of one currency in terms of another. Fixed exchange rate is controlled by government.

A fixed exchange rate increase certainty and promotes economic growth. As the exchange rates are fixed, domestic firms may be more confident to invest, as they know the exact amount required to import capital and export. Increased confidence leads to more production and economic growth.

A fixed exchange rate also increases foreign direct investment and MNC. As fixed rates increases certainty, foreign investor are more likely to invest as their confidence is high. It may also attract MNC, as no fluctuation in exchange rates, means more stability, leading to economic growth.

Speculation can be reduced - a fixed exchange rate may reduce investor speculation and flow of hot money. It means that the country can avoid increased demand or low supply, and hoarding of currency, leading to more exports and BOP stability in long term. It helps prevent rapid appreciation depreciation.

On the other hand, a fixed exchange rate is extremely inefficient for the government. As the constant need for change in exchange rate may increase administrative cost and decrease effectiveness of other policies like monetary. This leads to long term instability and less independence for government, leading to ineffective use of policies.

Also fixed exchange rates need high amount of foreign reserves and cannot benefit from autostabilisation. As increasing the value of currency through revaluation may means borrowing foreign currency, the government debt may increase. Also if there are constant rise or fall in demand, the government cannot act quickly leading to inefficat production and low economic growth, or excess demand or excess supply (Disequilibrium).

In conclusion, a fixed exchange rate may only be positive if a country has a large foreign reserve. But, other methods like banded floating may be more effective.`;

    it("awards 8/8 full marks, recognizes Level 3 two-sided evaluation with foreign reserve trade-off", () => {
      const rawAiGrading = {
        total_mark: 8,
        band: "Level 3 (Reasoned Two-Sided Discussion & Evaluation)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate definition of exchange rate and government control mechanism." },
          analysis: { awarded: 3, out_of: 3, comment: "Extensive causal analysis on certainty, FDI, investment, and speculation reduction." },
          evaluation: { awarded: 3, out_of: 3, comment: "Well-reasoned counter-arguments regarding loss of monetary independence, high foreign reserves requirement, and debt risk, supported by a decisive conclusion." },
        },
        points: [
          {
            quote: "Fixed exchange rate is controlled by government.",
            matched_ms_point: "Definition of fixed exchange rate",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 definition.",
          },
          {
            quote: "A fixed exchange rate increase certainty and promotes economic growth... domestic firms may be more confident to invest",
            matched_ms_point: "Certainty encourages investment and trade",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed AO2 link from certainty to business investment.",
          },
          {
            quote: "attract MNC, as no fluctuation in exchange rates, means more stability",
            matched_ms_point: "Inward FDI and MNC stability",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Explains stability mechanism for foreign investment.",
          },
          {
            quote: "reduce investor speculation and flow of hot money... BOP stability",
            matched_ms_point: "Reduces speculative currency flows",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Detailed link to reducing currency speculation.",
          },
          {
            quote: "constant need for change in exchange rate may increase administrative cost and decrease effectiveness of other policies like monetary",
            matched_ms_point: "Loss of monetary policy autonomy",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Strong AO3 counter-argument on monetary policy constraint.",
          },
        ],
        examiner_summary: "Comprehensive, balanced script with exemplary economic transmission chains and realistic trade-offs.",
        strengths: ["Clear link between certainty, FDI, and growth.", "Mature evaluation of monetary policy constraints."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Maintain this standard of balanced, criteria-based evaluation."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(8);
      expect(finalGrading.band).toBe("Level 3 (Reasoned Two-Sided Discussion & Evaluation)");
      expect(finalGrading.ao_breakdown.knowledge.awarded).toBe(2);
      expect(finalGrading.ao_breakdown.analysis.awarded).toBe(3);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBe(3);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 2: Q4(d) 8-mark Discuss on Trade Unions (Cambridge Awarded: 6/8)
  // ==========================================================================
  describe("Real Essay 2: Q4(d) 8m Discuss on Trade Unions (Cambridge Awarded: 6/8)", () => {
    const question = "Discuss whether or not trade union membership will increase in an economy";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `Trade union is organisation of workers bargaining/representing to improve wages and working condition.

Trade union membership may rise due to population growth. As the world population continues to grow, more workers enter the labour force, leading to more chance of worker joing unions, increasing membership of trade unions in long run.

Trade union may increase in membership to increase wages - worker may need higher wages due to inflation, leading to more worker joining the union to increase collective bargaining powers. Increasing bargaining power and use of industrial action can help workers, and more future membership.

More membership may occur due to training provision - trade union offer their member workshop and training which increase skill and productivity of workers. This may incetuise more worker to join unions.

On the other hand, higher membership cost can demotivate membership. If trade union charge higher cost to fund industrial action, worker may lose a lot of their disposable income, leading to less incentive to join unions.

Also, if trade union constantly push for higher wages, increase unemployment can decrease membership. If the union is constantly in industrial action, rate of production may be low, leading to loss revenue for firms, and lay off of workers, leading to a decrease in memberships.

In conclusion, trade union help protect working condition, but the skill levels and productivity of other worker and their aims, may be a reason for increase in memberships.`;

    it("matches Cambridge's exact 6/8 marks, recognizing sound analysis but a summary-style conclusion", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Reasoned Two-Sided Discussion & Evaluation)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate definition of trade union." },
          analysis: { awarded: 2, out_of: 3, comment: "Analyzes wage bargaining, inflation pressures, and training incentives." },
          evaluation: { awarded: 2, out_of: 3, comment: "Presents counter-arguments on membership fees and wage-induced unemployment, but conclusion is descriptive." },
        },
        examiner_summary: "A competent two-sided discussion with good coverage of factors influencing trade union membership.",
        strengths: ["Clear analysis of collective bargaining and inflation.", "Good counter-argument on unemployment risks."],
        weaknesses: ["Conclusion merely summarizes points rather than providing a weighted judgment."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(2);
      expect(finalGrading.total_mark).toBeLessThanOrEqual(7);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Essay 3: Q5(d) 8-mark Discuss on Emigration & Living Standards (Cambridge: 6/8)
  // ==========================================================================
  describe("Real Essay 3: Q5(d) 8m Discuss on Emigration & Living Standards (Cambridge Awarded: 6/8)", () => {
    const question = "Discuss whether or not emigrants will experience higher living standards";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `Emigration is when workers/individual move out of the country. Living standards are measured through HDI.

Emigrants may have high living standard due to low income tax. Some foreign countries like Dubai has low income tax that increases disposable income, leading to low chance of absolute poverty and increase in income index of HDI.

Emmigrants may have high quality of life due to free education. Some countries like USA offer free education. This may increase skill of emigrants, while improving literacy rates, increasing education index of HDI.

Emmigrant may have high quality of life to cheap quality healthcare. Some countries like Netherlands offer cheap quality healthcare, which may benefit emmigrants, as their health and productivity are improved and higher life expectancy can improve healthcare index of HDI.

On the other hand, high living costs can reduce quality of life for emmigrants. Some place like California in US have high living cost. High cost leads to less ability of consumer to spend on necessity, leading to chances of poverty / relative poverty increasing for emmigrants.

Also, the potical and social situation matter. For example, the current US regulation on Indian visa and regulation has lowered living standards of emmigrants. Also discrimination and social views may cause worker wages to be low, leading to low living standard. Low income

Therefore, quality of life and living standard depends on which country the emmigrants are moving too. It depends on that countries government and their political situation. As emmigrating to areas of danger like palestine is not advisable.`;

    it("matches Cambridge's 6/8 marks, crediting HDI dimensions and clamping evaluation criteria", () => {
      const rawAiGrading = {
        total_mark: 6,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate linkage of living standards to HDI components." },
          analysis: { awarded: 2, out_of: 3, comment: "Good application of disposable income, education, and healthcare." },
          evaluation: { awarded: 2, out_of: 3, comment: "Considers high cost of living, visa restrictions, and discrimination." },
        },
        examiner_summary: "Good practical application using countries, though evaluation relies heavily on general examples.",
        strengths: ["Structured around HDI components.", "Practical consideration of living costs and visa regulations."],
        weaknesses: ["Could develop economic transmission on remittances and skilled brain drain."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.ao_breakdown.knowledge.awarded).toBe(2);
      expect(finalGrading.ao_breakdown.analysis.awarded).toBe(2);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBe(2);
    });
  });

  // ==========================================================================
  // Essay 4: Q3(c) 6-mark Analyse on SOEs vs Private Firms (Cambridge: 6/6)
  // ==========================================================================
  describe("Real Essay 4: Q3(c) 6m Analyse on State-Owned Enterprises (Cambridge Awarded: 6/6)", () => {
    const question = "Analyse the advantages of state-owned enterprises compared to private sector firms";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `Lower prices - State owned government can provide lower prices for consumer than private, as they don't have to focus on profit maximisation. This mean low priced product, higher consumer quality of life and less absolute poverty.

More jobs - state-owned firms may provide more secure job opportunities and higher income. As state-owned firms grow, more workers are employed and they gain higher income. More disposable income leads to less poverty, lower unemployment and economic growth.

State-owned firm offer more fringe benefits and non-wage factor. SOE provide worker with benefit like free transportation and more sick days, which increase incentive and productivity of workers, leading to economic growth and less mental stress, leading to higher quality of life in long term.`;

    it("awards 6/6 full marks for 3 fully developed comparative chains", () => {
      const rawAiGrading = {
        total_mark: 6,
        points: [
          {
            quote: "State owned government can provide lower prices for consumer than private, as they don't have to focus on profit maximisation",
            matched_ms_point: "Pricing policy (non-profit motive)",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate comparison of profit motive vs welfare pricing.",
          },
          {
            quote: "state-owned firms may provide more secure job opportunities and higher income... lower unemployment and economic growth",
            matched_ms_point: "Employment creation and job security",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed causal chain linking employment to disposable income.",
          },
          {
            quote: "State-owned firm offer more fringe benefits and non-wage factor... increase incentive and productivity",
            matched_ms_point: "Working conditions and non-wage benefits",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed chain linking fringe benefits to worker productivity.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "" },
          analysis: { awarded: 6, out_of: 6, comment: "Three well-developed advantages with distinct economic mechanisms." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        examiner_summary: "Full-mark response with clear causal chains on prices, employment, and working conditions.",
        strengths: ["Distinct comparative points.", "Clear causal progression."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);
      expect(normalised.total_mark).toBe(6);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(6);
      expect(normalised.points).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Essay 5: Q4(c) 6-mark Analyse on Monopoly vs Competition (Cambridge: 6/6)
  // ==========================================================================
  describe("Real Essay 5: Q4(c) 6m Analyse on Competitive Market vs Monopoly (Cambridge Awarded: 6/6)", () => {
    const question = "Analyse the differences between a competitive market and a monopoly";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `Many supplier vs single supplier - a competitive market may have many suppliers and large number of buyers, while Monopolies have only one supplier and many buyers. In a competitive market firms are price takers as their demand is elastic due to higher number of substitutes, which monopolies are price makers as their is no substitutes and PED is inelastic. A competitive market may have lower prices and higher quality due to firm aiming to get profits, but a monopoly may be x-inefficient, leading to low quality products and higher prices from lack of competition. A monopoly take up more than 70% of market share and can put artificial barrier of entry using predatory pricing and using economies of scale, while a competitive market has evenly distributed market shares and cannot benefit from economies of scale.`;

    it("awards 6/6 full marks, preserving candidate concepts like x-inefficiency and price taker/maker", () => {
      const rawAiGrading = {
        total_mark: 6,
        points: [
          {
            quote: "a competitive market may have many suppliers... while Monopolies have only one supplier",
            matched_ms_point: "Number of sellers and buyers",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate contrast of market structure.",
          },
          {
            quote: "In a competitive market firms are price takers... which monopolies are price makers as their is no substitutes",
            matched_ms_point: "Price setting power and substitutes",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate linkage between substitutes, PED, and pricing power.",
          },
          {
            quote: "monopoly may be x-inefficient, leading to low quality products and higher prices from lack of competition",
            matched_ms_point: "Efficiency, prices, and barriers to entry",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Links absence of competitive discipline to higher prices and barriers.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "" },
          analysis: { awarded: 6, out_of: 6, comment: "Exemplary contrast using formal economic terminology." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);
      expect(normalised.total_mark).toBe(6);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(6);
    });
  });

  // ==========================================================================
  // Essay 6: Q5(c) 6-mark Analyse on Pollution Policies (Cambridge: 6/6)
  // ==========================================================================
  describe("Real Essay 6: Q5(c) 6m Analyse on Car Pollution Policies (Cambridge Awarded: 6/6)", () => {
    const question = "Analyse how government policies can reduce pollution caused by cars";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `Increased taxation on petrol cars - the government may increase taxes on petrol cars through VAT / indirect taxes, causing an increase in prices, leading to less use of cars and less pollution as negative externalities.

Subsidies for green goods / EV cars - the government may provide grants financially for EV car firms to increase production and lower prices on those cars, increasing the use of them, and less of petrol cars.

Increased regulations - increased regulation on what to produce and ban of certain raw material can decrease production of harmful goods that increase pollution. Use of embargos and quotas on foreign petrol car imports can reduce pollution too, as import are banned or limited supply increases prices.`;

    it("awards 6/6 marks for three distinct policy instruments (taxation, subsidy, regulation)", () => {
      const rawAiGrading = {
        total_mark: 6,
        points: [
          {
            quote: "increase taxes on petrol cars through VAT / indirect taxes, causing an increase in prices, leading to less use",
            matched_ms_point: "Indirect taxation on polluting cars",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate chain from tax to price to reduced usage.",
          },
          {
            quote: "Subsidies for green goods / EV cars... lower prices on those cars, increasing the use of them",
            matched_ms_point: "Subsidies for cleaner alternatives",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate chain from subsidies to reduced EV prices and substitution.",
          },
          {
            quote: "increased regulation on what to produce and ban of certain raw material... Use of embargos and quotas",
            matched_ms_point: "Regulation, bans, and quotas",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate identification of regulatory bans and trade quotas.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "" },
          analysis: { awarded: 6, out_of: 6, comment: "Covers fiscal (tax/subsidy) and regulatory measures." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);
      expect(normalised.total_mark).toBe(6);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(6);
    });
  });

  // ==========================================================================
  // Essay 7: Q3(b) 4-mark Explain on Supply-Side Policies (Cambridge: 4/4)
  // ==========================================================================
  describe("Real Essay 7: Q3(b) 4m Explain on Supply-Side Policies (Cambridge Awarded: 4/4)", () => {
    const question = "Explain two supply-side policy measures that can increase economic growth";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateEssay = `Education and training - government policy relation to education increase skill level and productivity of workers. More productivity increases aggregate supply and economic growth.

Subsidies - Financial grants provided by government that reduce production cost for firm. This leads to higher rates of production and economic growth in long run due to high production capacity.`;

    it("awards 4/4 marks (2 marks x 2 policies: 1 identify + 1 develop each)", () => {
      const rawAiGrading = {
        total_mark: 4,
        points: [
          {
            quote: "Education and training... increase skill level and productivity of workers. More productivity increases aggregate supply",
            matched_ms_point: "Education and training increases labour productivity and AS",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies education and develops via AS and growth.",
          },
          {
            quote: "Subsidies - Financial grants provided by government that reduce production cost for firm. This leads to higher rates of production",
            matched_ms_point: "Subsidies reduce costs and increase productive capacity",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies subsidies and develops via lower costs and capacity.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate identification of two supply-side policies." },
          analysis: { awarded: 2, out_of: 2, comment: "Clear explanation of how both shift aggregate supply." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateEssay);
      expect(normalised.total_mark).toBe(4);
      expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(2);
    });
  });

  // ==========================================================================
  // Essay 8: Q4(b) 4-mark Explain on Working Longer Hours (Cambridge: 4/4)
  // ==========================================================================
  describe("Real Essay 8: Q4(b) 4m Explain on Working Longer Hours (Cambridge Awarded: 4/4)", () => {
    const question = "Explain two non-wage factors that can influence an individual's decision to work longer hours";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateEssay = `Higher income - working longer hours may mean higher income and higher ability to buy product. Overtime pay maybe available, therefore may choose to work.

Job satisfaction and chance of promotion - workers may choose to work longer hours if they enjoy what they are doing or incentivised for chance of career growth that can be achieved through longer hours, eventually leading to higher income.`;

    it("awards 4/4 marks (2 marks x 2 factors: 1 identify + 1 develop each)", () => {
      const rawAiGrading = {
        total_mark: 4,
        points: [
          {
            quote: "Overtime pay maybe available, therefore may choose to work.",
            matched_ms_point: "Overtime pay / higher earnings incentive",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies overtime incentive.",
          },
          {
            quote: "Job satisfaction and chance of promotion - workers may choose to work longer hours if they enjoy what they are doing or incentivised for chance of career growth",
            matched_ms_point: "Promotion prospects and job satisfaction",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies career promotion and develops with career growth.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Identifies financial and non-financial incentives." },
          analysis: { awarded: 2, out_of: 2, comment: "Clear development of motivation mechanisms." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateEssay);
      expect(normalised.total_mark).toBe(4);
      expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(2);
    });
  });

  // ==========================================================================
  // Essay 9: Q5(b) 4-mark Explain on Worker Mobility (Cambridge: 4/4)
  // ==========================================================================
  describe("Real Essay 9: Q5(b) 4m Explain on Mobility of Young Workers (Cambridge Awarded: 4/4)", () => {
    const question = "Explain two reasons why young workers may have higher mobility than older workers";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateEssay = `Less family ties - as young workers are less likely to have family ties that fix them, they are more geographically mobile, as they can move to different region for work easily.

More skilled - younger workers may be more skilled leading to higher productivity and higher occupational mobility. As young worker can easily learn and switch jobs, they can work in different areas easily.`;

    it("awards 4/4 marks, linking family ties to geographical mobility and skills to occupational mobility", () => {
      const rawAiGrading = {
        total_mark: 4,
        points: [
          {
            quote: "Less family ties - as young workers are less likely to have family ties that fix them, they are more geographically mobile",
            matched_ms_point: "Fewer family commitments / geographical mobility",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies fewer commitments and links to geographic movement.",
          },
          {
            quote: "younger workers may be more skilled leading to higher productivity and higher occupational mobility. As young worker can easily learn and switch jobs",
            matched_ms_point: "Adaptability and occupational mobility",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies job switching/training adaptability.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate distinction between geographical and occupational mobility." },
          analysis: { awarded: 2, out_of: 2, comment: "Well-explained mechanisms for each mobility type." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateEssay);
      expect(normalised.total_mark).toBe(4);
      expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(2);
    });
  });

  // ==========================================================================
  // Essay 10: Q1(g) 6-mark Discuss on Fiscal Policy & HDI (Cambridge: 4/6)
  // ==========================================================================
  describe("Real Essay 10: Q1(g) 6m Discuss on Fiscal Policy & HDI (Cambridge Awarded: 4/6)", () => {
    const question = "Discuss whether or not expansionary fiscal policy will benefit HDI in an economy";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `Fiscal policies include government spending and taxation. Expansionary fiscal may benefit HDI.

Lower taxation can lead to higher income - as the Senegal government reduces taxation, disposable income of consumer increase. Higher income increases income index of HDI, leading to better quality of life.

Increased government spending rises quality of healthcare and education. More government spending in Senegals on healthcare can increase life expectancy and literacy rates increasing healthcare and education index in HDI.

On the other hand, increased government spending on those healthcare/education has opportunity cost. Increasing spending by Senegalese government on education, decreases spending on supply-side subsidies, leading to lower production and decreased income affecting HDI's income index.

In conclusion, fiscal policy may not work in long term as in future it creates tax burden and inflation.`;

    it("matches Cambridge's exact 4/6 marks, recognizing benefits and opportunity cost with underdeveloped evaluation", () => {
      const rawAiGrading = {
        total_mark: 4,
        ao_breakdown: {
          knowledge: { awarded: 1, out_of: 2, comment: "Identifies fiscal policy instruments and HDI components." },
          analysis: { awarded: 2, out_of: 2, comment: "Explains transmission from spending to health/education indices." },
          evaluation: { awarded: 1, out_of: 2, comment: "Identifies opportunity cost and inflation drawback, but conclusion is brief." },
        },
        examiner_summary: "Competent response linking fiscal policy to HDI dimensions with basic evaluation.",
        strengths: ["Clear linkage to HDI health, education, and income indices."],
        weaknesses: ["Evaluation of future tax burden and inflation is asserted without causal development."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);
      const quality = analyzeEssayQuality(candidateEssay, 6, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 6, split, candidateEssay, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(4);
      expect(finalGrading.max_mark).toBe(6);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(1);
    });
  });
});

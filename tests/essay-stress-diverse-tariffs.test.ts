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
import { generatePass4Comments } from "@/lib/pass4-comments";

/**
 * Cambridge IGCSE 0455 Economics: Comprehensive 10-Essay Stress Test Suite
 * Across Diverse Tariffs (2m, 4m, 6m, 8m), Syllabus Units (1 to 6),
 * Diagrams, One-Sided Discussion Capping, Missing Elements, and Edge Cases.
 */
describe("Cambridge IGCSE 0455 Diverse Tariffs & Edge Cases Stress Test Suite", () => {
  // ==========================================================================
  // Test 1: 2m Part (a) - Unit 1: Define Opportunity Cost (Full Marks 2/2)
  // ==========================================================================
  describe("Test 1: 2m Part (a) - Unit 1: Define Opportunity Cost (2/2)", () => {
    const question = "Define opportunity cost [2]";
    const split = defaultSplitForMaxMark(2, undefined, question);
    const candidateAnswer = "Opportunity cost is the next best alternative forgone when an economic decision or choice is made.";

    it("awards 2/2 full marks with Level 2 accuracy for complete definition", () => {
      const rawAiGrading = {
        total_mark: 2,
        band: "Full Credit (Clear, accurate syllabus definition)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate and complete definition citing next best alternative forgone." },
          analysis: { awarded: 0, out_of: 0, comment: "Not assessed in 2m definition questions." },
          evaluation: { awarded: 0, out_of: 0, comment: "Not assessed in 2m definition questions." },
        },
        points: [
          {
            quote: "next best alternative",
            matched_ms_point: "Next best alternative",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate identification of next best alternative.",
          },
          {
            quote: "forgone when an economic decision or choice is made",
            matched_ms_point: "Forgone / sacrificed",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate recognition that the alternative is forgone.",
          },
        ],
        examiner_summary: "Precise Cambridge 0455 textbook definition.",
        strengths: ["Clear recognition of alternative forgone."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Maintain this crisp precision on 2-mark recall questions."],
      };

      const normalised = normaliseGrading(rawAiGrading, 2, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 2, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 2, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.max_mark).toBe(2);
      expect(finalGrading.ao_breakdown.knowledge.awarded).toBe(2);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 2);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Test 2: 2m Part (a) - Unit 1: Incomplete Definition Capped at 1/2
  // ==========================================================================
  describe("Test 2: 2m Part (a) - Unit 1: Incomplete Definition (Capped 1/2)", () => {
    const question = "Define opportunity cost [2]";
    const split = defaultSplitForMaxMark(2, undefined, question);
    const candidateAnswer = "Opportunity cost is when you choose one product instead of another.";

    it("caps mark at 1/2 due to missing 'next best' or 'forgone' criteria", () => {
      const rawAiGrading = {
        total_mark: 1,
        band: "Partial Credit (Incomplete definition)",
        ao_breakdown: {
          knowledge: { awarded: 1, out_of: 2, comment: "Understands it involves a choice between goods, but omits 'next best' and 'forgone/sacrificed'." },
          analysis: { awarded: 0, out_of: 0, comment: "" },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "choose one product instead of another",
            matched_ms_point: "Choice between alternatives",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Partial definition. Identifies choice but omits next best alternative forgone.",
          },
        ],
        examiner_summary: "Partial definition. Omits the critical economic phrase 'next best alternative forgone'.",
        strengths: ["Recognizes choice between alternatives."],
        weaknesses: ["Fails to state that the alternative is the next best one sacrificed."],
        missing_elements: { definitions: ["next best alternative forgone"], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Always include 'next best alternative forgone' for full marks on opportunity cost."],
      };

      const normalised = normaliseGrading(rawAiGrading, 2, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 2, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 2, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(1);
      expect(finalGrading.ao_breakdown.knowledge.awarded).toBe(1);
    });
  });

  // ==========================================================================
  // Test 3: 4m Part (b) - Unit 2: Explain Two Reasons for Demand Fall (4/4)
  // ==========================================================================
  describe("Test 3: 4m Part (b) - Unit 2: Explain Two Reasons for Demand Fall (4/4)", () => {
    const question = "Explain two reasons why the demand for a product might decrease [4]";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateAnswer = `One reason is a fall in consumer disposable income. For normal goods, when people have less income after taxes, their purchasing power declines, which directly reduces their willingness and ability to buy the product, shifting the demand curve to the left.

A second reason is a fall in the price of a close substitute. If a rival good becomes cheaper, consumers will switch their expenditure towards the substitute to maximize their utility, resulting in a decrease in demand for this product.`;

    it("awards full 4/4 marks (2 marks per fully developed reason)", () => {
      const rawAiGrading = {
        total_mark: 4,
        band: "Level 2 (Two clearly explained points with sound economic transmission)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Identifies two valid demand determinants: disposable income and substitute prices." },
          analysis: { awarded: 2, out_of: 2, comment: "Clearly develops both causal links: purchasing power reduction and consumer switching to cheaper substitutes." },
          evaluation: { awarded: 0, out_of: 0, comment: "No evaluation required in 4m explain questions." },
        },
        points: [
          {
            quote: "fall in consumer disposable income... purchasing power declines",
            matched_ms_point: "Fall in disposable income for normal goods",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed point on disposable income and purchasing power.",
          },
          {
            quote: "fall in the price of a close substitute... consumers switch their expenditure",
            matched_ms_point: "Price of substitute goods",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed point on substitute price drop and switching behavior.",
          },
        ],
        examiner_summary: "Exemplary 4-mark response. Two distinct causes identified and both fully developed.",
        strengths: ["Clear distinction between normal goods and purchasing power.", "Accurate substitute switching mechanism."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Maintain this structured two-paragraph format for 4-mark explain questions."],
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 4, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 4, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(4);
      expect(finalGrading.ao_breakdown.knowledge.awarded).toBe(2);
      expect(finalGrading.ao_breakdown.analysis.awarded).toBe(2);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 4);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Test 4: 4m Part (b) - Unit 2: Only One Reason Developed (Capped at 2/4)
  // ==========================================================================
  describe("Test 4: 4m Part (b) - Unit 2: Only One Reason Developed (Capped at 2/4)", () => {
    const question = "Explain two reasons why the supply of agricultural crops might decrease [4]";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateAnswer = `The supply of agricultural crops can decrease due to adverse weather conditions such as severe droughts or flooding. When extreme weather damages crop yields and destroys fertile soil, farmers produce a smaller harvest. This increases their unit cost of production and physically restricts available output, causing the market supply curve to shift to the left.`;

    it("strictly caps mark at 2/4 because only one reason is provided instead of two", () => {
      const rawAiGrading = {
        total_mark: 2,
        band: "Level 1 (Only one reason identified and developed)",
        ao_breakdown: {
          knowledge: { awarded: 1, out_of: 2, comment: "Identifies only one reason (adverse weather/natural disasters). Missing second reason." },
          analysis: { awarded: 1, out_of: 2, comment: "Accurate development of how bad weather restricts yield and raises unit costs." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "adverse weather conditions such as severe droughts... smaller harvest",
            matched_ms_point: "Weather / natural disasters",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Developed point on weather.",
          },
        ],
        examiner_summary: "Well-explained single point, but candidate failed to identify or explain a second reason.",
        strengths: ["Strong development of weather impact on agricultural yield."],
        weaknesses: ["Missing a second reason required by the prompt (e.g. rising fertilizer/fuel costs or outward migration of farm labor)."],
        missing_elements: { definitions: [], analysis: ["Second distinct supply determinant"], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Always look at the prompt wording 'two reasons' and write two separate paragraphs."],
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 4, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 4, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.total_mark).toBeLessThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Test 5: 6m Part (c) - Unit 4: Monetary Policy Transmission Mechanism (6/6)
  // ==========================================================================
  describe("Test 5: 6m Part (c) - Unit 4: Monetary Policy Transmission Mechanism (6/6)", () => {
    const question = "Analyse how a central bank's increase in interest rates can reduce inflation";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateAnswer = `When a central bank raises the base interest rate, commercial banks pass this on by raising their lending and deposit rates. This directly increases the cost of borrowing for households taking mortgages or personal loans, and incentivizes saving as the return on bank deposits rises. Consequently, consumer spending (C) falls.

Simultaneously, firms face higher interest costs on loans for capital equipment, reducing the expected profitability of investment projects, leading to a contraction in gross investment (I). 

Since consumer spending and investment are major components of aggregate demand (AD = C + I + G + (X - M)), the total demand for goods and services in the economy decreases, shifting AD to the left. With lower aggregate demand, demand-pull inflationary pressures subside because there is less competition among buyers for scarce output, forcing retailers to moderate price rises to clear excess stock. Additionally, slower economic activity reduces wage pressure, curtailing cost-push inflation and bringing the general price level under control.`;

    it("awards 6/6 full marks for coherent step-by-step causal transmission", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Coherent, step-by-step causal chain of economic analysis)",
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "Syllabus 0455 standard 6m allocate all 6 marks to AO2." },
          analysis: { awarded: 6, out_of: 6, comment: "Unbroken chain linking rate rise -> borrowing costs & saving -> consumption & investment -> AD reduction -> elimination of demand-pull and cost-push pressures." },
          evaluation: { awarded: 0, out_of: 0, comment: "No evaluation required in 6m analyse questions." },
        },
        points: [
          {
            quote: "commercial banks pass this on by raising their lending and deposit rates... increases cost of borrowing",
            matched_ms_point: "Commercial bank rate transmission",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate chain from base rate to borrowing costs and saving incentives.",
          },
          {
            quote: "firms face higher interest costs on loans for capital equipment... contraction in gross investment",
            matched_ms_point: "Reduced firm investment",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate chain from higher borrowing costs to reduced capital investment.",
          },
          {
            quote: "total demand for goods and services in the economy decreases... demand-pull inflationary pressures subside",
            matched_ms_point: "AD contraction and inflation reduction",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Comprehensive linkage to reduced AD and moderated price level.",
          },
        ],
        examiner_summary: "Exemplary Level 3 analysis. Causal transmission from interest rates to AD and inflation is unbroken and mathematically sound.",
        strengths: ["Coherent macroeconomic transmission mechanism.", "Distinguishes both consumer borrowing/saving and firm investment."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Flawless analysis. Maintain this unbroken cause-and-effect structure."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 6, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 6, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);
      expect(finalGrading.ao_breakdown.analysis.awarded).toBe(6);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 6);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Test 6: 6m Part (c) - Unit 2: Diagram-Required Analysis WITH Diagram (6/6)
  // ==========================================================================
  describe("Test 6: 6m Part (c) - Unit 2: Diagram-Required Analysis WITH Diagram (6/6)", () => {
    const question = "Analyse using a demand and supply diagram the effect of a subsidy on the market for solar panels";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateAnswer = `A subsidy is a direct financial grant paid by the government to producers to lower their production costs and encourage output.

{Diagram: Subsidy}

As shown in the diagram, when the government grants a per-unit subsidy to producers of solar panels, firms face lower production costs. This incentivizes solar panel manufacturers to expand output, causing the market supply curve to shift vertically downwards/rightwards from S to S1. At the initial price P, there is excess supply. To clear the market, the equilibrium price falls from P to P1, which extends consumer demand. Consequently, the equilibrium quantity bought and sold expands from Q to Q1. The vertical distance between the two supply curves represents the per-unit subsidy paid by the government.`;

    it("awards 6/6 marks and confirms diagram integration without critique", () => {
      const rawAiGrading = {
        total_mark: 6,
        band: "Level 3 (Accurate diagram and comprehensive causal explanation)",
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "0455 6m Analyse allocates all marks to AO2." },
          analysis: { awarded: 6, out_of: 6, comment: "Complete explanation of supply shift from S to S1, price drop from P to P1, and quantity expansion from Q to Q1." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "firms face lower production costs... supply curve to shift vertically downwards/rightwards from S to S1",
            matched_ms_point: "Supply shift from subsidy",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate chain from grant to unit cost reduction and rightward supply shift.",
          },
          {
            quote: "equilibrium price falls from P to P1, which extends consumer demand",
            matched_ms_point: "Price fall mechanism",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate transmission from excess supply to price contraction and demand extension.",
          },
          {
            quote: "equilibrium quantity bought and sold expands from Q to Q1",
            matched_ms_point: "Quantity expansion",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Correctly identifies output expansion and equilibrium restoration.",
          },
        ],
        examiner_summary: "Fully integrated diagram with correct shifts, axes, and equilibrium coordinates.",
        strengths: ["Diagram correctly placed and fully referenced in the surrounding text."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Excellent diagrammatic analysis."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 6, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 6, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(6);

      // Verify Pass 4 comments suppress unsolicited diagram critique
      const comments = generatePass4Comments(
        candidateAnswer,
        question,
        finalGrading,
        [{ title: "Subsidy", matchText: "{Diagram: Subsidy}" }],
      );
      const diagramComment = comments.find((c) => c.category === "diagram");
      expect(diagramComment).toBeUndefined();
    });
  });

  // ==========================================================================
  // Test 7: 6m Part (c) - Unit 2: Diagram-Required Analysis OMITTED Diagram (Capped at 3/6)
  // ==========================================================================
  describe("Test 7: 6m Part (c) - Unit 2: Omitted Diagram (Capped at 3/6)", () => {
    const question = "Analyse using a demand and supply diagram the effect of an indirect tax on the market for cigarettes";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateAnswer = `An indirect tax is a tax imposed on spending on goods and services, which increases production costs for producers. When an indirect tax is levied on cigarettes, producers face higher per-unit costs, which causes the supply curve to shift to the left. The price of cigarettes rises and the quantity demanded contracts, reducing consumption of demerit goods.`;

    it("caps mark at 3/6 because Cambridge explicitly mandates a diagram in the prompt", () => {
      const rawAiGrading = {
        total_mark: 3,
        band: "Level 2 (Text analysis correct but required diagram omitted)",
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "" },
          analysis: { awarded: 3, out_of: 6, comment: "Explains supply shift and price rise, but maximum 3 marks can be awarded when the required diagram is absent." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        points: [
          {
            quote: "producers face higher per-unit costs, which causes the supply curve to shift to the left",
            matched_ms_point: "Supply shift from tax",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate supply contraction.",
          },
          {
            quote: "price of cigarettes rises and the quantity demanded contracts",
            matched_ms_point: "Price rise and demand contraction",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Identifies price increase.",
          },
        ],
        examiner_summary: "Sound written analysis, but prompt explicitly commanded 'using a demand and supply diagram'. Under Cambridge mark schemes, omitting the diagram caps the score at 3/6.",
        strengths: ["Clear written explanation of cost increase and supply contraction."],
        weaknesses: ["No demand and supply diagram drawn despite explicit instruction in the question stem."],
        missing_elements: {
          definitions: [],
          analysis: [],
          evaluation: [],
          examples: [],
          diagrams: ["Demand and supply diagram showing S shifting left to S1, price rising from P to P1, and quantity falling from Q to Q1."],
        },
        actionable_feedback: ["Whenever a question says 'using a diagram', draw it immediately. An answer without a diagram cannot score above 3/6."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 6, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 6, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(2);
      expect(finalGrading.total_mark).toBeLessThanOrEqual(3);
      expect(finalGrading.missing_elements.diagrams.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Test 8: 8m Part (d) - Unit 3: Trade Unions Balanced Discussion (8/8)
  // ==========================================================================
  describe("Test 8: 8m Part (d) - Unit 3: Trade Unions Balanced Discussion (8/8)", () => {
    const question = "Discuss whether or not an increase in trade union membership benefits an economy";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateAnswer = `A trade union is an organization of workers formed to protect and promote their rights, wages, and working conditions through collective bargaining.

On the one hand, an increase in trade union membership can provide significant economic benefits. Trade unions have greater bargaining power than individual workers, enabling them to negotiate higher wages and safe working conditions. Higher wages increase workers' purchasing power and living standards, which boosts consumer expenditure and aggregate demand, stimulating economic growth. Furthermore, well-represented workers often experience higher morale and job security, reducing staff turnover and motivating workers to be more productive, which can lower unit labour costs for firms in the long run. Unions also assist in resolving workplace grievances, promoting industrial harmony.

On the other hand, strong trade unions may harm economic performance. If unions push for wage increases that exceed productivity gains, firms face rising unit costs of production. To protect profit margins, firms may increase prices, triggering wage-price spiral inflation. Alternatively, firms unable to pass on costs may substitute labour with capital or lay off workers, causing classical wage-unemployment. Additionally, if collective bargaining breaks down and unions engage in industrial action, such as strikes or go-slows, national output is lost, supply chains are disrupted, and foreign direct investment may decline due to fears of labour unreliability.

In conclusion, the net impact depends on the economic climate and union cooperation. In an expanding economy with productivity-linked wage agreements, union membership benefits workers without harming firms. However, aggressive wage demands during recessions or high inflation can exacerbate unemployment and cost-push inflation.`;

    it("awards 8/8 full marks, recognizing Level 3 balanced evaluation with decisive qualification", () => {
      const rawAiGrading = {
        total_mark: 8,
        band: "Level 3 (Reasoned Two-Sided Discussion & Evaluation)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate definition of trade unions and collective bargaining." },
          analysis: { awarded: 3, out_of: 3, comment: "Detailed causal analysis on bargaining power, worker morale, productivity, and AD expansion." },
          evaluation: { awarded: 3, out_of: 3, comment: "Thorough counter-analysis of wage-price spirals, classical unemployment, and strike disruption, synthesised with a decisive productivity-linked conclusion." },
        },
        points: [
          {
            quote: "trade union is an organization of workers formed to protect and promote their rights",
            matched_ms_point: "Definition of trade union",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 definition.",
          },
          {
            quote: "greater bargaining power... negotiate higher wages... boosts consumer expenditure and aggregate demand",
            matched_ms_point: "Bargaining power and living standards",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Comprehensive chain from collective bargaining to wages and AD.",
          },
          {
            quote: "higher morale and job security, reducing staff turnover and motivating workers to be more productive",
            matched_ms_point: "Worker morale and productivity",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Explains non-wage motivation and productivity enhancements.",
          },
          {
            quote: "wage increases that exceed productivity gains... wage-price spiral inflation",
            matched_ms_point: "Cost-push inflation risks",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate evaluation of unit costs and inflationary pressure.",
          },
          {
            quote: "substitute labour with capital or lay off workers, causing classical wage-unemployment",
            matched_ms_point: "Unemployment from excessive wages",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Sound counter-analysis on classical wage unemployment.",
          },
        ],
        examiner_summary: "Exemplary Level 3 performance. Thoroughly addresses both sides with depth, precision, and an authoritative evaluative judgment.",
        strengths: ["Balanced two-sided economic chains.", "Insightful distinction between wage increases and productivity gains."],
        weaknesses: [],
        missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
        actionable_feedback: ["Outstanding essay. Cambridge exemplar standard."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(8);
      expect(finalGrading.ao_breakdown.knowledge.awarded).toBe(2);
      expect(finalGrading.ao_breakdown.analysis.awarded).toBe(3);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBe(3);
      const grade = getCambridgeGradeStandard(finalGrading.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // ==========================================================================
  // Test 9: 8m Part (d) - Unit 5: HDI vs GDP One-Sided Essay (Capped at Level 2: 5/8)
  // ==========================================================================
  describe("Test 9: 8m Part (d) - Unit 5: HDI vs GDP One-Sided (Capped at 5/8)", () => {
    const question = "Discuss whether or not the Human Development Index (HDI) is a better measure of living standards than GDP per capita";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateAnswer = `The Human Development Index (HDI) is a composite index compiled by the UN that measures living standards across three core dimensions: life expectancy at birth (health), mean and expected years of schooling (education), and GNI per capita at PPP (income).

HDI is much better than GDP per capita because GDP per capita only measures total economic output divided by population. A country can have high GDP per capita simply from oil extraction while most of its citizens live in poverty with terrible healthcare. HDI includes life expectancy, which shows whether people have clean water, sanitation, and hospitals. It also includes education, which measures whether people are literate and capable of acquiring skilled employment. Therefore, HDI provides a multidimensional view of real human wellbeing rather than just narrow monetary production.`;

    it("strictly caps mark at Level 2 (max 5/8) due to complete absence of counter-arguments", () => {
      const rawAiGrading = {
        total_mark: 5,
        band: "Level 2 (One-sided discussion only; no evaluation/counter-arguments)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate breakdown of HDI dimensions (health, education, income) and GDP per capita definition." },
          analysis: { awarded: 3, out_of: 3, comment: "Detailed explanation of why multidimensional health and education metrics exceed pure monetary output." },
          evaluation: { awarded: 0, out_of: 3, comment: "No counter-argument provided. Candidate failed to discuss limitations of HDI or advantages of GDP per capita." },
        },
        points: [
          {
            quote: "composite index compiled by the UN that measures living standards across three core dimensions",
            matched_ms_point: "Definition and components of HDI",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate knowledge of health, education, and GNI dimensions.",
          },
          {
            quote: "multidimensional view of real human wellbeing rather than just narrow monetary production",
            matched_ms_point: "Advantages of HDI over pure output metrics",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Valid analysis of why non-monetary health and education matter.",
          },
        ],
        examiner_summary: "Strong one-sided analysis of HDI advantages. However, under Cambridge 0455 Level marking grids, a one-sided response cannot access Level 3 and is strictly capped at Level 2 (maximum 5/8).",
        strengths: ["Clear breakdown of HDI components."],
        weaknesses: ["Completely one-sided. Failed to discuss why GDP per capita might be preferred (simplicity, timeliness of data, ease of comparison) or the limitations of HDI (ignores income inequality, political freedom, crime, and environmental degradation)."],
        missing_elements: {
          definitions: [],
          analysis: [],
          evaluation: ["Limitations of HDI (ignores income inequality, crime, pollution) and benefits of GDP per capita (updated quarterly, standardized accounting)."],
          examples: [],
          diagrams: [],
        },
        actionable_feedback: ["Always provide the other side of the argument in an 8-mark Discuss question to unlock Level 3."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(5);
      expect(finalGrading.total_mark).toBeLessThanOrEqual(5);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBe(0);
      expect(finalGrading.band).toContain("Level 2");
    });
  });

  // ==========================================================================
  // Test 10: 8m Part (d) - Unit 6: Tariffs on Steel with Repetitive Points Deduplication
  // ==========================================================================
  describe("Test 10: 8m Part (d) - Unit 6: Tariffs with Repetitive Points Deduplication (5/8)", () => {
    const question = "Discuss whether or not a government should impose tariffs on imported steel";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateAnswer = `A tariff is a tax placed on imported goods. 

Imposing a tariff on steel protects domestic steel workers from losing their jobs. When foreign steel is taxed, domestic steel mills can sell more steel and keep hiring workers so employment in steel rises. 

Also, tariffs on steel save domestic jobs because when steel from other countries becomes expensive, buyers must buy from local steel firms so local steel employment is protected from unemployment. 

Furthermore, imposing steel tariffs prevents workers from being laid off in the steel sector because local factories do not have to close down and steel workers keep their jobs and earn income.

On the other hand, steel is a raw material for car manufacturing. A tariff raises the cost of car production, leading to higher car prices for consumers.`;

    it("deduplicates repetitive arguments on domestic steel jobs and calibrates score at 5/8", () => {
      const rawAiGrading = {
        total_mark: 5,
        band: "Level 2 (Underdeveloped two-sided discussion with repetitive points)",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Understands tariffs and impact on imported steel price." },
          analysis: { awarded: 2, out_of: 3, comment: "Explains domestic employment protection. However, paragraphs 2, 3, and 4 all repeat the identical job-protection mechanism without new economic development." },
          evaluation: { awarded: 1, out_of: 3, comment: "Brief counter-point regarding raw material costs for car manufacturing, but lacks depth and lacks a concluding evaluation." },
        },
        points: [
          {
            quote: "tariff is a tax placed on imported goods",
            matched_ms_point: "Definition of tariff",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Accurate AO1 definition.",
          },
          {
            quote: "protects domestic steel workers from losing their jobs... domestic steel mills can sell more steel",
            matched_ms_point: "Domestic employment protection",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate chain from tariff to local demand and jobs.",
          },
          {
            quote: "steel is a raw material for car manufacturing... higher car prices for consumers",
            matched_ms_point: "Higher raw material costs for downstream industries",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Identifies downstream industry cost impact.",
          },
        ],
        examiner_summary: "Candidate repeats the same employment protection point three times using slightly different wording. The pipeline deduplicates these repetitions. Counter-analysis on car manufacturers is brief.",
        strengths: ["Identifies tariffs as import taxes.", "Recognizes raw material cost transmission."],
        weaknesses: ["Repeated the domestic employment point multiple times without developing new arguments (e.g. infant industry, balance of payments, retaliation)."],
        missing_elements: {
          definitions: [],
          analysis: ["Retaliatory tariffs from trading partners", "Dumping of cheap steel"],
          evaluation: ["Welfare loss / deadweight loss analysis"],
          examples: [],
          diagrams: [],
        },
        actionable_feedback: ["Never repeat the same argument across multiple paragraphs. Once a point is made, introduce a distinct economic argument."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateAnswer);
      const quality = analyzeEssayQuality(candidateAnswer, 8, split);
      const guarded = applyWritingQualityGuardrail(normalised, quality, 8, split, candidateAnswer, question);
      const finalGrading = deduplicateAcrossSections(purgeContradictions(guarded), question);

      expect(finalGrading.total_mark).toBe(5);
      expect(finalGrading.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(2);
      expect(finalGrading.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(1);
    });
  });
});

import { describe, expect, it } from "vitest";
import { defaultSplitForMaxMark, isEvaluativeQuestion } from "@/lib/examiner/config";
import {
  normaliseGrading,
  purgeContradictions,
  sanitizeIgcseFeedbackText,
  stripScoreFractionsFromText,
  bandFor,
  type Grading,
} from "@/lib/examiner/types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "@/lib/examiner/writing-quality";
import { validateEconomicsSyllabus, OffSyllabusError } from "@/lib/examiner/syllabus-guard.server";
import { sanitizeOcrTranscription } from "@/lib/ocr/gemini.server";
import { getCambridgeGradeStandard } from "@/lib/cambridge-thresholds";

describe("Cambridge IGCSE 0455 Comprehensive 10-Essay Pipeline Suite", () => {
  // --------------------------------------------------------------------------
  // Essay 1: The Money Supply Discuss Essay (From Bug Report)
  // --------------------------------------------------------------------------
  describe("Essay 1: 8-mark Discuss on Money Supply (Point Cap, Math Reconciliation, Flawed Mechanism)", () => {
    const question = "Discuss whether or not an increase in money supply will benefit an economy";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `When there is an increase in money supply in an economy, the value of the currency may reduce. This means that exports to other countries become cheaper, causing an increase in net exports, which can help increase and stabilize foreign currency (balance of payments), helping to stabilize it. When money supply is increased, maybe due to a reduction in interest rates and cash reserve ratio, the cost of borrowing reduces, allowing more consumers to invest and purchase products, causing higher money circulation, therefore benefiting the economy. When the supply of money increases, the value of domestic currency decreases, causing imported goods to become more expensive. This helps reduce the amount of BOP deficit and brings stability for BOP as demand for the more expensive imports reduces, benefiting the economy. An increase in the supply of money may disadvantage an economy, as the reduced value of money due to the increased supply of money causes the value of exports to exceed the value of imports, which may cause imported goods to become more expensive. An increased supply of money in an economy also means that costs of production increase for firms due to the reduced domestic currency value, deincentivising firms to expand and innovate, which drops the standards of living in the economy.`;

    it("reconciles point breakdown so point sum never exceeds total_mark (7/8) and eliminates flawed/duplicate points", () => {
      // Simulate raw output that originally had the 11/8 contradiction:
      const rawAiGrading = {
        total_mark: 7,
        band: "Level 3 (Reasoned Two-Sided Discussion & Evaluation)",
        mechanism_validation: {
          core_mechanisms_sound: false,
          fatal_misconceptions_found: true,
          error_evidence_quotes: [
            "causes the value of exports to exceed the value of imports, which may cause imported goods to become more expensive",
          ],
        },
        points: [
          {
            quote: "When there is an increase in money supply in an economy, the value of the currency may reduce.",
            matched_ms_point: "Increase in money supply causes currency depreciation",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurately links money supply increase to currency depreciation (AO2).",
          },
          {
            quote: "When money supply is increased, maybe due to a reduction in interest rates... the cost of borrowing reduces",
            matched_ms_point: "Reduction in interest rates lowers borrowing costs",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Correctly identifies interest rate reduction as monetary tool and impact on borrowing.",
          },
          {
            quote: "When the supply of money increases, the value of domestic currency decreases, causing imported goods to become more expensive.",
            matched_ms_point: "Currency depreciation raises import prices",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurately explains depreciation effect on imports.",
          },
          {
            quote: "causes the value of exports to exceed the value of imports, which may cause imported goods to become more expensive",
            matched_ms_point: "Trade balance and import costs",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "misleading backwards economics phrasing: exports exceeding imports does not cause import price rise.",
          },
          {
            quote: "costs of production increase for firms due to the reduced domestic currency value, deincentivising firms to expand",
            matched_ms_point: "Imported input costs and business investment",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Links money supply expansion to cost-push inflation and reduced business confidence.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate terminology." },
          analysis: { awarded: 3, out_of: 3, comment: "Developed causal chains." },
          evaluation: { awarded: 2, out_of: 3, comment: "Sound two-sided discussion." },
        },
        examiner_summary: "A well-structured two-sided response addressing benefits and costs.",
        strengths: ["Strong explanation of borrowing costs.", "Balanced discussion of benefits and costs."],
        weaknesses: ["Phrasing imprecision in trade balance mechanism."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);

      // 1. Total mark must be 7/8
      expect(normalised.total_mark).toBe(7);
      expect(normalised.max_mark).toBe(8);

      // 2. Point sum must NOT exceed total_mark (7)
      const awardedPointSum = (normalised.points || []).reduce(
        (sum, p) => sum + p.identify_awarded + (p.identify_awarded > 0 ? p.development_awarded : 0),
        0,
      );
      expect(awardedPointSum).toBeLessThanOrEqual(normalised.total_mark);

      // 3. Point 4 (backwards economics) MUST be zeroed out
      const flawedPoint = (normalised.points || []).find((p) =>
        p.quote.includes("causes the value of exports to exceed"),
      );
      expect(flawedPoint).toBeDefined();
      expect(flawedPoint?.identify_awarded).toBe(0);
      expect(flawedPoint?.development_awarded).toBe(0);

      // 4. Point 5 verbatim quote must preserve candidate's exact word "deincentivising"
      const verbatimPoint = (normalised.points || []).find((p) => p.quote.includes("deincentivising"));
      expect(verbatimPoint).toBeDefined();
      expect(verbatimPoint?.quote).toContain("deincentivising");

      // 5. Band and grade standard
      expect(normalised.band).toBe("Level 3 (Reasoned Two-Sided Discussion & Evaluation)");
      const grade = getCambridgeGradeStandard(normalised.total_mark, 8);
      expect(grade.letter).toBe("A*");
    });
  });

  // --------------------------------------------------------------------------
  // Essay 2: One-Sided 8-mark Discuss Essay (Table A Level 2 Max 5/8 Cap)
  // --------------------------------------------------------------------------
  describe("Essay 2: One-Sided 8-mark Discuss on Interest Rates (Deterministic Table A Cap)", () => {
    const question = "Discuss whether or not a decrease in the rate of interest will increase economic growth";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `A decrease in the rate of interest by the central bank will benefit economic growth in multiple ways. Firstly, lower interest rates reduce the cost of borrowing for commercial bank customers. When households can borrow more cheaply, they take out mortgages and personal loans to buy durable goods like cars and houses. This increases consumer expenditure, which is a major component of aggregate demand. Furthermore, firms will be incentivised to invest in new capital machinery and expand production because borrowing for investment is cheaper. Investment increases both aggregate demand in the short run and productive capacity in the long run. Additionally, lower interest rates discourage saving because the reward for saving is reduced, so consumers prefer to spend their disposable income. As total spending rises, firms hire more workers, leading to lower unemployment and higher real GDP growth across the entire economy.`;

    it("enforces Cambridge Table A Level 2 cap (maximum 5/8) when evaluation/counter-argument is absent", () => {
      // Simulate raw AI output that mistakenly tried to award 7/8 based on strong AO2 analysis
      const rawAiGrading = {
        total_mark: 7,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate understanding of interest rates." },
          analysis: { awarded: 3, out_of: 3, comment: "Strong causal links to AD components." },
          evaluation: { awarded: 2, out_of: 3, comment: "Candidate provides a one-sided discussion without considering drawbacks." },
        },
        examiner_summary: "The response is one-sided only discusses the benefits of lower interest rates without counter-arguments.",
        strengths: ["Clear analysis of consumer spending and investment."],
        weaknesses: ["One-sided discussion lacks any counter-argument or consideration of inflation risks."],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);

      // Must be deterministically capped at 5/8
      expect(normalised.total_mark).toBeLessThanOrEqual(5);
      expect(normalised.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(1);
      expect(normalised.band).toBe("Level 2 (Reasoned Discussion / One-Sided Analysis)");
    });
  });

  // --------------------------------------------------------------------------
  // Essay 3: 6-mark Analyse with Listing Only (Max 3/6 Cap)
  // --------------------------------------------------------------------------
  describe("Essay 3: 6-mark Analyse on Causes of Unemployment (Listing Cap Max 3)", () => {
    const question = "Analyse the causes of an increase in unemployment in an economy";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `There are four main causes of an increase in unemployment in an economy. The first cause is cyclical unemployment, which happens when the economy enters a recession. The second cause is structural unemployment, which occurs when traditional industries like coal mining decline. The third cause is frictional unemployment, which is when university graduates search for their first jobs. The fourth cause is seasonal unemployment, which affects workers in agriculture and tourism during the winter months.`;

    it("caps 6-mark Analyse at max 3/6 when points are listed without causal chains", () => {
      const rawAiGrading = {
        total_mark: 5,
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "" },
          analysis: { awarded: 5, out_of: 6, comment: "Candidate lists points without causal development or explaining mechanisms." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        examiner_summary: "The candidate provides a list of causes of unemployment without causal development. In Cambridge mark schemes, listing points without causal analysis is capped at a maximum of 3 marks.",
        weaknesses: ["Lists points without causal development."],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);

      expect(normalised.total_mark).toBe(3);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(3);
      expect(normalised.max_mark).toBe(6);
    });
  });

  // --------------------------------------------------------------------------
  // Essay 4: 6-mark Analyse with Full Causal Development (Distinction 6/6)
  // --------------------------------------------------------------------------
  describe("Essay 4: 6-mark Analyse on Contractionary Monetary Policy (Distinction 6/6)", () => {
    const question = "Analyse how a central bank uses monetary policy to reduce inflation";
    const split = defaultSplitForMaxMark(6, undefined, question);
    const candidateEssay = `A central bank can implement contractionary monetary policy by increasing the base interest rate. When the base rate increases, commercial banks pass on this cost by raising interest rates on mortgages, business loans, and consumer credit. This increases the cost of borrowing for both households and firms. As a result, households cut back on non-essential consumption financed by borrowing, and firms delay capital investment projects. Concurrently, higher interest rates raise the incentive to save in bank deposits rather than spend. This combined reduction in consumption (C) and investment (I) causes aggregate demand (AD) to decrease, shifting the AD curve to the left. A leftward shift in aggregate demand reduces demand-pull pressure on the general price level, thereby lowering the rate of inflation.`;

    it("awards 6/6 marks for complete step-by-step causal chains linking interest rates to inflation", () => {
      const rawAiGrading = {
        total_mark: 6,
        points: [
          {
            quote: "A central bank can implement contractionary monetary policy by increasing the base interest rate.",
            matched_ms_point: "Identify increase in interest rates",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate identification of monetary policy tool and transmission.",
          },
          {
            quote: "increases the cost of borrowing for both households and firms. As a result, households cut back on non-essential consumption... and firms delay capital investment",
            matched_ms_point: "Impact on borrowing costs, consumption and investment",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Fully developed causal chain linking borrowing costs to AD components.",
          },
          {
            quote: "causes aggregate demand (AD) to decrease, shifting the AD curve to the left... reduces demand-pull pressure",
            matched_ms_point: "Shift in AD and reduction in demand-pull inflation",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurate macroeconomic conclusion linking AD reduction to lower price level.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 0, comment: "" },
          analysis: { awarded: 6, out_of: 6, comment: "Exemplary causal analysis showing full transmission mechanism." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        examiner_summary: "Outstanding response with an unbroken causal chain from monetary policy to price level stability.",
        strengths: ["Logical step-by-step causal chain linking interest rates to C and I and AD."],
        weaknesses: [],
      };

      const normalised = normaliseGrading(rawAiGrading, 6, split, candidateEssay);

      expect(normalised.total_mark).toBe(6);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(6);
      expect(normalised.band).toBe("Point Marked (6/6)");
      const grade = getCambridgeGradeStandard(normalised.total_mark, 6);
      expect(grade.letter).toBe("A*");
    });
  });

  // --------------------------------------------------------------------------
  // Essay 5: 4-mark Explain with 2 Reasons + Development (Full 4/4)
  // --------------------------------------------------------------------------
  describe("Essay 5: 4-mark Explain on Cigarette Taxes (Identify + Develop 4/4)", () => {
    const question = "Explain two reasons why a government imposes a tax on cigarettes";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateEssay = `One reason a government taxes cigarettes is that cigarettes are demerit goods that produce negative consumption externalities such as secondhand smoke. By imposing an indirect tax, the government increases the market price, discouraging consumption and reducing the harm inflicted on bystanders. A second reason is to raise government tax revenue. Because cigarettes are addictive, demand is price-inelastic, meaning consumers continue to purchase them despite higher prices, allowing the government to collect substantial tax revenue that can be spent on healthcare services.`;

    it("awards 4/4 marks (2 marks per reason: 1 identify + 1 develop each)", () => {
      const rawAiGrading = {
        total_mark: 4,
        points: [
          {
            quote: "cigarettes are demerit goods that produce negative consumption externalities... By imposing an indirect tax, the government increases the market price, discouraging consumption",
            matched_ms_point: "Reduce consumption of demerit goods / negative externalities",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies demerit good/externality and explains how price increase discourages consumption.",
          },
          {
            quote: "to raise government tax revenue. Because cigarettes are addictive, demand is price-inelastic... allows government to collect revenue",
            matched_ms_point: "Raise government revenue (inelastic demand)",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Identifies revenue raising and develops with price-inelastic demand concept.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate identification of reasons." },
          analysis: { awarded: 2, out_of: 2, comment: "Developed explanations with externalities and PED." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        examiner_summary: "Complete 4-mark response with two well-developed points.",
        strengths: ["Clear application of demerit goods and PED."],
        weaknesses: [],
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateEssay);

      expect(normalised.total_mark).toBe(4);
      expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(2);
      expect(normalised.points).toHaveLength(2);
      expect(normalised.points![0]!.identify_awarded).toBe(1);
      expect(normalised.points![0]!.development_awarded).toBe(1);
      expect(normalised.points![1]!.identify_awarded).toBe(1);
      expect(normalised.points![1]!.development_awarded).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Essay 6: 4-mark Explain with Fatal Misconception (Reversed Definitions)
  // --------------------------------------------------------------------------
  describe("Essay 6: 4-mark Explain on Direct vs Indirect Tax (Fatal Misconception / 0 Marks)", () => {
    const question = "Explain two differences between a direct tax and an indirect tax";
    const split = defaultSplitForMaxMark(4, undefined, question);
    const candidateEssay = `A direct tax is a tax on goods and services like VAT which is directly paid by shoppers at the supermarket checkout. In contrast, an indirect tax is a tax on personal income which is indirectly deducted by your boss before you receive your salary. Another difference is that direct tax can be avoided by choosing not to buy products, whereas indirect tax is compulsory for every person regardless of their earnings.`;

    it("detects reversed economic definitions, flags fatal misconception, and zeroes point marks", () => {
      const rawAiGrading = {
        total_mark: 0,
        mechanism_validation: {
          core_mechanisms_sound: false,
          fatal_misconceptions_found: true,
          error_evidence_quotes: [
            "direct tax is a tax on goods and services like VAT",
            "indirect tax is a tax on personal income",
          ],
        },
        points: [
          {
            quote: "A direct tax is a tax on goods and services like VAT which is directly paid by shoppers",
            matched_ms_point: "Tax on goods/services (indirect)",
            identify_awarded: 0,
            development_awarded: 0,
            reason: "Fatal error: VAT is an indirect tax, not a direct tax. Definitions are completely reversed.",
          },
          {
            quote: "an indirect tax is a tax on personal income which is indirectly deducted",
            matched_ms_point: "Tax on income (direct)",
            identify_awarded: 0,
            development_awarded: 0,
            reason: "Fatal error: Income tax is a direct tax, not an indirect tax.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 0, out_of: 2, comment: "Direct and indirect taxes are confused and reversed." },
          analysis: { awarded: 0, out_of: 2, comment: "Mechanisms based on false definitions." },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        examiner_summary: "The candidate confuses direct and indirect taxes, reversing their definitions and examples. No credit can be awarded.",
        strengths: [],
        weaknesses: ["Direct tax is levied on income/wealth (e.g. income tax); indirect tax is levied on expenditure (e.g. VAT)."],
      };

      const normalised = normaliseGrading(rawAiGrading, 4, split, candidateEssay);

      expect(normalised.total_mark).toBe(0);
      expect(normalised.mechanism_validation?.fatal_misconceptions_found).toBe(true);
      expect(normalised.ao_breakdown.knowledge.awarded).toBe(0);
      expect(normalised.ao_breakdown.analysis.awarded).toBe(0);
      expect(normalised.points?.every((p) => p.identify_awarded === 0 && p.development_awarded === 0)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Essay 7: 2-mark Identify Question (Point Tariff 2/2)
  // --------------------------------------------------------------------------
  describe("Essay 7: 2-mark Identify on Economies of Scale (Exact Ceiling & No Development Needed)", () => {
    const question = "Identify two internal economies of scale";
    const split = defaultSplitForMaxMark(2, undefined, question);
    const candidateEssay = `1. Purchasing economies of scale (bulk buying).\n2. Financial economies of scale.`;

    it("awards 2/2 marks with 2 identify points and 0 development required", () => {
      const rawAiGrading = {
        total_mark: 2,
        points: [
          {
            quote: "Purchasing economies of scale (bulk buying)",
            matched_ms_point: "Purchasing / bulk-buying economies",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Correctly identifies purchasing economies of scale.",
          },
          {
            quote: "Financial economies of scale",
            matched_ms_point: "Financial economies",
            identify_awarded: 1,
            development_awarded: 0,
            reason: "Correctly identifies financial economies of scale.",
          },
        ],
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Two accurate internal economies of scale identified." },
          analysis: { awarded: 0, out_of: 0, comment: "" },
          evaluation: { awarded: 0, out_of: 0, comment: "" },
        },
        examiner_summary: "Two correct internal economies of scale identified.",
        strengths: ["Precise identification of syllabus concepts."],
        weaknesses: [],
      };

      const normalised = normaliseGrading(rawAiGrading, 2, split, candidateEssay);

      expect(normalised.total_mark).toBe(2);
      expect(normalised.max_mark).toBe(2);
      expect(normalised.ao_breakdown.knowledge.awarded).toBe(2);
      expect(normalised.points).toHaveLength(2);
      expect(normalised.points![0]!.identify_awarded).toBe(1);
      expect(normalised.points![0]!.development_awarded).toBe(0);
      expect(normalised.points![1]!.identify_awarded).toBe(1);
      expect(normalised.points![1]!.development_awarded).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Essay 8: OCR Preamble & Worksheet Header Stripping + Safe Grading
  // --------------------------------------------------------------------------
  describe("Essay 8: OCR Preamble & Header Leaks (Transcription Sanitization)", () => {
    const rawOcrText = `Here is the transcription of your handwritten Economics notes. I've preserved your original wording and line breaks.

Practice Questions
1. Discuss minimum wage.
2. Analyse trade unions.
3. Explain division of labour.

Question 1.
A minimum wage guarantees a basic legal floor for hourly earnings, preventing worker exploitation and reducing relative poverty for low-skilled labourers. Higher wages boost employee morale and motivation, which can raise labour productivity.

However, if the minimum wage is set above the free-market equilibrium wage rate, it creates an excess supply of labour, causing classical unemployment as employers lay off workers to cut production costs. Firms may also pass higher wage costs onto consumers in the form of higher prices.

In conclusion, a minimum wage benefits workers who retain their jobs, but disadvantages younger or less experienced workers who face higher barriers to employment.`;

    it("strips AI preamble and unattempted worksheet headers cleanly before grading", () => {
      const sanitized = sanitizeOcrTranscription(rawOcrText);

      expect(sanitized).not.toContain("Here is the transcription");
      expect(sanitized).not.toContain("I've preserved your original wording");
      expect(sanitized).not.toContain("Practice Questions");
      expect(sanitized).not.toContain("2. Analyse trade unions");
      expect(sanitized).not.toContain("3. Explain division of labour");

      // Preserves the actual candidate response
      expect(sanitized).toContain("A minimum wage guarantees a basic legal floor");
      expect(sanitized).toContain("excess supply of labour");
      expect(sanitized).toContain("In conclusion, a minimum wage benefits workers");

      // Verify that quality analysis computes true candidate length (not inflated by preamble)
      const split = defaultSplitForMaxMark(8, undefined, "Discuss whether or not the imposition of a minimum wage benefits workers in an economy");
      const quality = analyzeEssayQuality(sanitized, 8, split);
      expect(quality.isSeverelyUndersized).toBe(false);
      expect(quality.isUndersized).toBe(true); // 102 words correctly identified as compact Level 2 length (<110 words)
      expect(quality.maxAllowableTotalMark).toBe(5);
      expect(quality.wordCount).toBeGreaterThan(90);
      expect(quality.wordCount).toBeLessThan(120);
    });
  });

  // --------------------------------------------------------------------------
  // Essay 9: Off-Syllabus Guardrail (Non-Economics Question Rejection)
  // --------------------------------------------------------------------------
  describe("Essay 9: Off-Syllabus Pre-Flight Guardrail (Biology Rejection)", () => {
    const question = "Discuss whether or not mitochondria is the powerhouse of the cell";
    const essayText = "Mitochondria produce ATP through the citric acid cycle and oxidative phosphorylation. They contain their own circular DNA and ribosomes, indicating an endosymbiotic evolutionary origin with aerobic bacteria.";

    it("rejects non-economics syllabus questions with OffSyllabusError prior to AI grading", async () => {
      await expect(validateEconomicsSyllabus(question, essayText)).rejects.toThrow(OffSyllabusError);
    });
  });

  // --------------------------------------------------------------------------
  // Essay 10: High-Scoring 8-mark Discuss on Protectionism with Typos
  // --------------------------------------------------------------------------
  describe("Essay 10: High-Scoring 8-mark Discuss on Protectionism (Grade A*, Typo Resilience, Deduplicated Feedback)", () => {
    const question = "Discuss whether or not protectionist measures by a government will improve its balance of payments on current account";
    const split = defaultSplitForMaxMark(8, undefined, question);
    const candidateEssay = `Protectionist measures such as tarrifs (taxes on imports) and import quotas can improve the balance of payments current account. When a government imposes tarrifs, the price of foreign imported goods increases in the domestic market. If domestic demand for imports is price elasticc, consumers switch their expenditure away from expensive imports toward domestically produced substitute goods. This causes the total value of imports (M) to fall, which helps reduce a current account deficit.

However, protectionism may not improve the current account in the long run. If the country's trading partners face restrictions on their exports, they may retaliate by imposing retaliatory tarrifs on the country's exports (X). This will cause export revenue to decline, worsening the current account balance. Furthermore, tariffs on imported raw materials increase production costs for domestic exporting industries, reducing their international competitiveness.

In conclusion, protectionist measures will improve the current account in the short run if import demand is price elastic and trading partners do not retaliate. However, in the long run, retaliatory trade wars and cost-push inflation will cancel out these gains.`;

    it("awards Level 3 (7/8) Grade A*, preserves candidate typos in quotes without crashing, and ensures no duplicate feedback", () => {
      const rawAiGrading = {
        total_mark: 7,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2, comment: "Accurate knowledge of tariffs, quotas, and current account components." },
          analysis: { awarded: 3, out_of: 3, comment: "Strong causal links between tariffs, relative prices, import expenditure, and retaliation." },
          evaluation: { awarded: 2, out_of: 3, comment: "Balanced two-sided discussion considering retaliation and short-run vs long-run PED." },
        },
        points: [
          {
            quote: "When a government imposes tarrifs, the price of foreign imported goods increases in the domestic market.",
            matched_ms_point: "Tariffs increase price of imports",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Accurately explains how tariffs raise import prices and reduce import expenditure.",
          },
          {
            quote: "trading partners face restrictions... they may retaliate by imposing retaliatory tarrifs on the country's exports",
            matched_ms_point: "Retaliation by trading partners",
            identify_awarded: 1,
            development_awarded: 1,
            reason: "Strong counter-argument regarding retaliation reducing export earnings.",
          },
        ],
        examiner_summary: "A rigorous, balanced response with sound economic reasoning on both sides of protectionism.",
        strengths: [
          "Accurate causal chain linking tariffs to relative import prices.",
          "Balanced two-sided discussion weighing short-run gains against retaliatory trade risks.",
          "Balanced two-sided discussion weighing retaliation risks.", // deliberate duplicate for test
        ],
        weaknesses: [
          "Could evaluate the Marshall-Lerner condition more explicitly.",
          "Could evaluate the Marshall-Lerner condition more explicitly.", // deliberate duplicate for test
        ],
        missing_elements: {
          definitions: [],
          analysis: [],
          evaluation: ["Explicit consideration of currency appreciation feedback."],
          examples: [],
          diagrams: [],
        },
        actionable_feedback: [
          "Discuss how exchange rate appreciation could offset the reduction in import spending.",
        ],
      };

      const normalised = normaliseGrading(rawAiGrading, 8, split, candidateEssay);
      const purged = purgeContradictions(normalised);

      expect(purged.total_mark).toBe(7);
      expect(purged.band).toBe("Level 3 (Reasoned Two-Sided Discussion & Evaluation)");

      // Check indicative grade standard is A*
      const grade = getCambridgeGradeStandard(purged.total_mark, 8);
      expect(grade.letter).toBe("A*");

      // Verify that duplicate feedback strings are purged
      const uniqueStrengths = new Set(purged.strengths);
      expect(uniqueStrengths.size).toBe(purged.strengths.length);

      const uniqueWeaknesses = new Set(purged.weaknesses);
      expect(uniqueWeaknesses.size).toBe(purged.weaknesses.length);

      // Verify quote preserves candidate typo ("tarrifs")
      const quoteWithTypo = (purged.points || []).find((p) => p.quote.includes("tarrifs"));
      expect(quoteWithTypo).toBeDefined();
    });
  });
});

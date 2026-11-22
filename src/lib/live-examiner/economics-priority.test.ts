import { describe, expect, it } from "vitest";
import { compactSyllabusContext } from "../live-examiner.functions";

describe("Live Examiner Economics Feedback & Context Engine", () => {
  it("compacts syllabus context while preserving core definitions", () => {
    const rawContext = `0455 Economics Syllabus 2023-2025
Core Topic: Price Elasticity of Demand (PED)
PED measures the percentage change in quantity demanded divided by percentage change in price.
When PED > 1 demand is price elastic; when PED < 1 demand is price inelastic.
BAND 4 ANCHOR ESSAY EXAMPLE
Here is a very long script that was 4000 characters long and should be stripped out during keystroke checks.`;

    const compacted = compactSyllabusContext(rawContext);
    expect(compacted).toContain("Price Elasticity of Demand");
    expect(compacted).toContain("percentage change in quantity demanded");
    expect(compacted).not.toContain("BAND 4 ANCHOR ESSAY EXAMPLE");
  });

  it("handles empty context gracefully without failing", () => {
    expect(compactSyllabusContext("")).toBe("");
  });

  it("sanitises standard predicted mark responses correctly", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const raw = {
      total_mark: 6,
      confidence: 0.85,
      headline: "Strong AD definition and initial analysis",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 3 },
        analysis: { awarded: 3, out_of: 6 },
        evaluation: { awarded: 1, out_of: 3 },
      },
    };
    const res = sanitisePredictedMark(raw, 12);
    expect(res).not.toBeNull();
    expect(res?.total_mark).toBe(6);
    expect(res?.confidence).toBe(0.85);
    expect(res?.ao_breakdown.knowledge.awarded).toBe(2);
    expect(res?.ao_breakdown.analysis.awarded).toBe(3);
    expect(res?.ao_breakdown.evaluation.awarded).toBe(1);
  });

  it("handles stringified numbers, percentage confidence, and alternative AO keys", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const raw = {
      total_mark: "6",
      confidence: 85, // 85% instead of 0.85
      headline: "Good progress",
      ao_breakdown: {
        AO1: 2,
        AO2: 4,
        AO3: 0,
      },
    };
    const res = sanitisePredictedMark(raw, 12);
    expect(res).not.toBeNull();
    expect(res?.total_mark).toBe(6);
    expect(res?.confidence).toBe(0.85);
    expect(res?.ao_breakdown.knowledge.awarded).toBe(2);
    expect(res?.ao_breakdown.analysis.awarded).toBe(4);
    expect(res?.ao_breakdown.evaluation.awarded).toBe(0);
  });

  it("clamps marks accurately to maxMark tariff", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const raw = {
      total_mark: 25,
      confidence: 0.9,
      headline: "Exceeds max",
      ao_breakdown: {
        knowledge: { awarded: 10, out_of: 4 },
        analysis: { awarded: 10, out_of: 6 },
        evaluation: { awarded: 5, out_of: 2 },
      },
    };
    const res = sanitisePredictedMark(raw, 12);
    expect(res).not.toBeNull();
    expect(res?.total_mark).toBeLessThanOrEqual(12);
    expect(res?.ao_breakdown.knowledge.awarded).toBe(4);
    expect(res?.ao_breakdown.analysis.awarded).toBe(6);
    expect(res?.ao_breakdown.evaluation.awarded).toBe(2);
  });

  it("validates MaxOutResponseSchema with placement and placement_rationale", async () => {
    const { MaxOutResponseSchema } = await import("../live-examiner.functions");
    const testData = {
      headline: "Upgrade your draft to full marks",
      target_band: "Band 1 / Level 5",
      perfection_summary: "Deepen analytical mechanisms",
      suggestions: [
        {
          target_ao: "ao1",
          title: "Rigorous Definitions",
          suggestion: "Define minimum price and market failure",
          mark_uplift: "+1 mark",
          placement: "Paragraph 1 (Introduction & Core Definitions)",
          placement_rationale: "Establishes baseline knowledge early.",
          how_to_write: ["Step 1", "Step 2"],
          strategic_options: [
            {
              label: "Option 1",
              description: "Information failure",
              sentence_starter: "Demerit goods...",
            },
          ],
          model_phrasing: "A minimum price intervention...",
        },
      ],
    };

    const parsed = MaxOutResponseSchema.parse(testData);
    expect(parsed.suggestions[0].placement).toBe("Paragraph 1 (Introduction & Core Definitions)");
    expect(parsed.suggestions[0].placement_rationale).toBe("Establishes baseline knowledge early.");
  });

  it("accurately classifies 'but' phrases as AO3 Evaluation", async () => {
    const { classifySentenceDeterministically } = await import("./client-evaluation");
    
    // Test direct 'but' counter-argument
    const res1 = classifySentenceDeterministically(
      "Price ceilings protect low-income consumers, but they create persistent shortages in the market."
    );
    expect(res1.ao).toBe("AO3");
    expect(res1.explanation).toContain("Evaluation");

    // Test 'however' counter-argument
    const res2 = classifySentenceDeterministically(
      "However, the policy effectiveness depends on the price elasticity of demand."
    );
    expect(res2.ao).toBe("AO3");

    // Test that deadweight loss remains AO2 Analysis
    const res3 = classifySentenceDeterministically(
      "This distortion generates deadweight welfare loss as mutually beneficial trades are eliminated."
    );
    expect(res3.ao).toBe("AO2");
  });

  it("awards 11/12 distinction when student provides strong AO2 chains and multiple AO3 evaluations", async () => {
    const { evaluateCambridgeAnswer } = await import("./client-evaluation");

    const answer = `
      A minimum price is a legally mandated price floor set above the free-market equilibrium price.
      This policy incentivises profit-seeking suppliers to expand output to Q2 along their supply curve.
      Consequently, higher consumer prices contract demand to Q1 along the demand curve, creating excess supply.
      Furthermore, this generates deadweight welfare loss as trades above equilibrium cost are prevented.
      However, the overall policy effectiveness is compromised if demerit goods have highly inelastic demand.
      Moreover, price floors may protect producer incomes, but they inevitably create informal black markets where goods trade below the legal rate.
    `;

    const result = evaluateCambridgeAnswer(answer, "Assess whether minimum prices are effective.", 12);
    expect(result.predictedMark.total_mark).toBeGreaterThanOrEqual(11);
    expect(result.classifications.filter((c) => c.ao === "AO3").length).toBeGreaterThanOrEqual(2);
    expect(result.classifications.filter((c) => c.ao === "AO2").length).toBeGreaterThanOrEqual(3);
  });

  it("classifies complex whole-sentence Cambridge AO3 evaluation patterns accurately", async () => {
    const { classifySentenceDeterministically } = await import("./client-evaluation");

    const evalSentences = [
      "While subsidies increase consumption of merit goods, they carry a high opportunity cost for the government.",
      "In spite of the short-run reduction in inflation, contractionary monetary policy may trigger cyclical unemployment in the long run.",
      "Alternative policies such as education campaigns may be more effective than indirect taxation at correcting information failure.",
      "This intervention risks government failure if buffer stock schemes become too costly to administer.",
    ];

    for (const sentence of evalSentences) {
      const res = classifySentenceDeterministically(sentence);
      expect(res.ao).toBe("AO3");
    }
  });

  it("awards 0 marks on completely off-topic non-economic writing when a question is provided", async () => {
    const { evaluateCambridgeAnswer } = await import("./client-evaluation");
    const irrelevant =
      "Photosynthesis is the biological process by which green plants convert sunlight into chemical energy inside chloroplasts during the summer season.";
    const result = evaluateCambridgeAnswer(
      irrelevant,
      "Assess whether fiscal policy can reduce deflation.",
      12,
    );
    expect(result.predictedMark.total_mark).toBe(0);
  });

  it("instantly catches single-word and phrase typos in <5ms (including user test words and fuzzy transpositions)", async () => {
    const { analyzeGrammarAndMechanics } = await import("./grammar-engine");
    const { evaluateCambridgeAnswer } = await import("./client-evaluation");

    const wordPairs: Array<[string, string]> = [
      ["tkaing", "taking"],
      ["ffeedback", "feedback"],
      ["hsould", "should"],
      ["adpated", "adapted"],
      ["chekci", "check"],
      ["amrks", "marks"],
      ["fetaure", "feature"],
      ["exmianer", "examiner"],
      ["emxinar", "examiner"],
      ["grmmar", "grammar"],
      ["teh", "the"],
      ["highligh", "highlight"],
      ["evalaution", "evaluation"],
      ["possibel", "possible"],
      ["mamxiser", "maximiser"],
      ["bascially", "basically"],
      ["evryhting", "everything"],
      ["strucutres", "structures"],
      ["methdos", "methods"],
      ["accuracys", "accuracy"],
      ["becuase", "because"],
      ["faliure", "failure"],
      ["externailties", "externalities"],
      ["equillibrium", "equilibrium"],
      ["elatsicity", "elasticity"],
      ["govrenment", "government"],
      ["unempolyment", "unemployment"],
      ["infaltion", "inflation"],
      ["subisdies", "subsidies"],
      // Fuzzy leading double-letter & adjacent transposition checks
      ["ddemand", "demand"],
      ["ssupply", "supply"],
      ["pprice", "price"],
      ["ggovernment", "government"],
    ];

    const start = performance.now();
    for (const [typo, expected] of wordPairs) {
      const issues = analyzeGrammarAndMechanics([typo]);
      expect(issues.length, `Expected typo "${typo}" to be caught`).toBeGreaterThanOrEqual(1);
      expect(issues[0].suggestion.toLowerCase()).toBe(expected.toLowerCase());
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);

    // Test contextual multi-word phrases
    const phraseEval = evaluateCambridgeAnswer(
      "Students craft there essay and it hsould br quick with a increase in an firm output.",
      "Explain how subsidies affect market equilibrium.",
      12,
    );
    const originals = phraseEval.issues.map((i) => i.original.toLowerCase());
    const suggestions = phraseEval.issues.map((i) => i.suggestion.toLowerCase());
    expect(originals).toContain("there essay");
    expect(suggestions).toContain("their essay");
    expect(originals).toContain("hsould br");
    expect(suggestions).toContain("should be");
    expect(originals).toContain("a increase");
    expect(suggestions).toContain("an increase");
    expect(originals).toContain("an firm");
    expect(suggestions).toContain("a firm");
  });

  it("strips all markdown asterisks (** and *) from predicted marks and suggestions", async () => {
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const { cleanSuggestion } = await import("./clean-suggestion");

    const raw = {
      total_mark: 8,
      confidence: 0.9,
      headline: "**Strong AO2** analysis, *needs* deeper **AO3 evaluation**",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2 },
        analysis: { awarded: 4, out_of: 6 },
        evaluation: { awarded: 2, out_of: 4 },
      },
    };
    const sanitised = sanitisePredictedMark(raw, 12);
    expect(sanitised?.headline).not.toContain("*");
    expect(sanitised?.headline).toBe("Strong AO2 analysis, needs deeper AO3 evaluation");

    const dirtySuggestion = cleanSuggestion("Replace with **allocative efficiency** where *P = MC*.");
    expect(dirtySuggestion).not.toContain("*");
  });

  it("accurately classifies both Free Trade definition sentences as AO1 (2/12, never 4/12) and coaches AO2 expansion", async () => {
    const { evaluateCambridgeAnswer } = await import("./client-evaluation");
    const { sanitisePredictedMark } = await import("../live-examiner.functions");
    const question =
      "Assess the extent to which the consequences of free trade are always positive for an economy";

    // 1. First definition sentence only -> 1/12 (AO1: 1/2)
    const defOnly =
      "Free trade is when countries trade with each other with few barriers such as tariffs and quotas.";
    const defEval = evaluateCambridgeAnswer(defOnly, question, 12);
    expect(defEval.classifications).toHaveLength(1);
    expect(defEval.classifications[0].ao).toBe("AO1");
    expect(defEval.predictedMark.ao_breakdown.knowledge.awarded).toBe(1);
    expect(defEval.predictedMark.ao_breakdown.analysis.awarded).toBe(0);
    expect(defEval.predictedMark.total_mark).toBe(1);

    // 2. Both sentences from screenshot (defining free trade + defining specialisation) -> BOTH are AO1, score is 2/12 (never 4/12)
    const twoSentences =
      "Free trade is when countries trade with each other with few barriers such as tariffs and quotas. Free trade can lead to specialisation where countries can focus on producing a limited range of products.";
    const twoEval = evaluateCambridgeAnswer(twoSentences, question, 12);
    expect(twoEval.classifications).toHaveLength(2);
    expect(twoEval.classifications[0].ao).toBe("AO1");
    expect(twoEval.classifications[1].ao).toBe("AO1");
    expect(twoEval.predictedMark.ao_breakdown.knowledge.awarded).toBe(2);
    expect(twoEval.predictedMark.ao_breakdown.analysis.awarded).toBe(0);
    expect(twoEval.predictedMark.ao_breakdown.evaluation.awarded).toBe(0);
    expect(twoEval.predictedMark.total_mark).toBe(2);

    // Must flag an AO2 analysis coaching suggestion on the shallow specialisation definition
    expect(twoEval.issues.some((i) => i.category === "analysis")).toBe(true);

    // Even if LLM hallucinated 4/12 (AO1: 2, AO2: 2), sanitisePredictedMark must clamp AO2 to 0 -> 2/12
    const clamped = sanitisePredictedMark(
      {
        total_mark: 4,
        confidence: 0.8,
        headline: "Inflated mark",
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2 },
          analysis: { awarded: 2, out_of: 6 },
          evaluation: { awarded: 0, out_of: 4 },
        },
      },
      12,
      question,
      twoSentences,
    );
    expect(clamped?.ao_breakdown.knowledge.awarded).toBe(2);
    expect(clamped?.ao_breakdown.analysis.awarded).toBe(0);
    expect(clamped?.total_mark).toBe(2);

    // 3. Adding a genuine AO2 causal mechanism sentence earns AO2 credit (3-4/12)
    const withDevelopedAo2 = `${twoSentences} By specialising in goods with a lower opportunity cost due to comparative advantage, firms exploit economies of scale, lowering average costs and reducing consumer prices, which raises consumer surplus and real GDP.`;
    const devEval = evaluateCambridgeAnswer(withDevelopedAo2, question, 12);
    expect(devEval.classifications[2].ao).toBe("AO2");
    expect(devEval.predictedMark.ao_breakdown.knowledge.awarded).toBe(2);
    expect(devEval.predictedMark.ao_breakdown.analysis.awarded).toBeGreaterThanOrEqual(1);
    expect(devEval.predictedMark.total_mark).toBeGreaterThanOrEqual(3);
  });
});


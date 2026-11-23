import { describe, expect, it } from "vitest";
import { generatePass4Comments } from "./pass4-comments";
import type { Grading } from "./examiner/types";

describe("generatePass4Comments", () => {
  const mockGrading: Grading = {
    total_mark: 10,
    max_mark: 12,
    band: "Top Band",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions of maximum price." },
      analysis: { awarded: 5, out_of: 6, comment: "Detailed causal chain from price ceiling to shortage." },
      evaluation: { awarded: 3, out_of: 4, comment: "Balanced evaluation of consumer surplus vs black markets." },
    },
    examiner_summary: "A thorough response with strong economic intuition.",
    strengths: ["Clear diagrammatic positioning", "Detailed analysis of market equilibrium"],
    weaknesses: [
      "Diagram explanation lacks explicit labeling of the deadweight welfare loss triangle.",
      "Evaluation could be strengthened by examining long-run supply elasticity.",
    ],
    missing_elements: {
      definitions: [],
      analysis: ["Explicit step explaining producer surplus reduction."],
      evaluation: ["Long-run investment disincentives."],
      examples: [],
      diagrams: ["Deadweight loss triangle shading."],
    },
    actionable_feedback: [
      "Explicitly connect the curves shown on the diagram to deadweight loss.",
      "Weigh short-run affordability against long-run supply disincentives.",
    ],
    suggested_resources: [],
    suggested_practice: [],
    confidence: 0.95,
    audited: true,
    sources: [],
    anchorsUsed: 2,
  };

  const mockEssay = `A maximum price is a legally set price ceiling below the market equilibrium.

When the government imposes a maximum price at Pmax below Pe, quantity demanded extends to Qd while quantity supplied contracts to Qs.

(Diagram: Maximum Price)

This creates a persistent shortage equal to Qd - Qs.

However, price ceilings can lead to illegal black markets and reduced product quality over time.

In conclusion, maximum price controls will not always improve consumer welfare.`;

  it("decodes the diagram and generates a diagram integration comment", () => {
    const comments = generatePass4Comments(mockEssay, "Evaluate maximum price controls [12]", mockGrading, [
      { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
    ]);

    expect(comments.length).toBeGreaterThan(0);
    const diagramComment = comments.find((c) => c.category === "diagram");
    expect(diagramComment).toBeDefined();
    expect(diagramComment?.title).toContain("Maximum Price");
    expect(diagramComment?.color).toBe("emerald");
    expect(diagramComment?.highlightText).toBe("(Diagram: Maximum Price)");
  });

  it("maps analysis and evaluation weaknesses to corresponding paragraphs", () => {
    const comments = generatePass4Comments(mockEssay, "Evaluate maximum price controls [12]", mockGrading, [
      { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
    ]);

    const evalComment = comments.find((c) => c.category === "evaluation");
    expect(evalComment).toBeDefined();
    expect(evalComment?.color).toBe("sky");

    const analysisComment = comments.find((c) => c.category === "analysis");
    expect(analysisComment).toBeDefined();
    expect(analysisComment?.color).toBe("amber");
  });

  it("handles essays without diagrams and generates an omission recommendation", () => {
    const comments = generatePass4Comments(mockEssay, "Evaluate maximum price controls [12]", mockGrading, []);
    const diagramOmission = comments.find((c) => c.category === "diagram");
    expect(diagramOmission).toBeDefined();
    expect(diagramOmission?.badge).toBe("Diagram Gap");
  });

  it("does not treat 'acknowledge' as a knowledge/terminology weakness and avoids duplicate diagnostic sentences", () => {
    const duplicateBugGrading: Grading = {
      total_mark: 10,
      max_mark: 12,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate exchange rate definition." },
        analysis: { awarded: 5, out_of: 6, comment: "Detailed causal chain on depreciation." },
        evaluation: { awarded: 3, out_of: 4, comment: "Good discussion of J-curve effect." },
      },
      examiner_summary: "Strong candidate response.",
      strengths: ["Clear terminology"],
      weaknesses: [
        "The analysis of production capacity constraints could briefly acknowledge potential domestic demand-pull inflation risks if spare capacity is limited.",
      ],
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
      actionable_feedback: [],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.95,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      `An exchange rate is the price of one currency in terms of another.\n\nA depreciation leads to cheaper exports.\n\nHowever, capacity constraints matter.`,
      "Assess the impact of currency depreciation [12]",
      duplicateBugGrading,
      [],
    );

    // Ensure no duplicate critique text across any comments
    const critiques = comments.map((c) => c.critique);
    const uniqueCritiques = new Set(critiques);
    expect(critiques.length).toBe(uniqueCritiques.size);

    // Verify 'acknowledge' was NOT falsely tagged as a terminology gap
    const knowledgeGap = comments.find((c) => c.category === "knowledge");
    expect(knowledgeGap).toBeUndefined();
  });

  it("relabels defect badges and softens suggestions for 12/12 exemplar scripts", () => {
    const fullMarksGrading: Grading = {
      total_mark: 12,
      max_mark: 12,
      band: "Band 1 / Level 3 Exemplar",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Flawless knowledge." },
        analysis: { awarded: 6, out_of: 6, comment: "Comprehensive causal chain." },
        evaluation: { awarded: 4, out_of: 4, comment: "Nuanced, contextual evaluation." },
      },
      examiner_summary: "Exemplar Cambridge IGCSE 0455 script.",
      strengths: ["Thorough analysis", "Sharp evaluation"],
      weaknesses: ["Could briefly consider secondary international feedback loops."],
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
      actionable_feedback: ["To push toward full marks, consider secondary feedback loops."],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.98,
      audited: true,
      sources: [],
      anchorsUsed: 3,
    };

    const comments = generatePass4Comments(
      `Definition paragraph.\n\nAnalysis paragraph with detailed mechanism.\n\nEvaluative weighing paragraph.`,
      "Evaluate policy [12]",
      fullMarksGrading,
      [],
    );

    for (const comment of comments) {
      expect(comment.badge).not.toMatch(/gap/i);
      expect(comment.suggestion).not.toMatch(/to push toward full marks/i);
      expect(comment.color).not.toBe("amber");
      expect(comment.color).not.toBe("rose");
    }
  });

  it("accurately labels J-Curve diagrams as inserts (e.g. after ¶4) and provides time vs current account balance advice", () => {
    const essayWithJCurve = `Paragraph 1: An exchange rate is the price of one currency in terms of another.

Paragraph 2: A depreciation lowers export prices in foreign currency terms.

Paragraph 3: However, in the short run, trade contracts are fixed.

Paragraph 4: Therefore, the import bill rises before demand can adjust.

(Diagram: The J-Curve)

Paragraph 5: In the long run, once consumers switch to domestic goods, the trade deficit reverses.`;

    const jCurveGrading: Grading = {
      total_mark: 10,
      max_mark: 12,
      band: "Top Band",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "" },
        analysis: { awarded: 5, out_of: 6, comment: "" },
        evaluation: { awarded: 3, out_of: 4, comment: "" },
      },
      examiner_summary: "Solid script.",
      strengths: [],
      weaknesses: [],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      actionable_feedback: [],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.9,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      essayWithJCurve,
      "Discuss whether currency depreciation improves the balance of payments [12]",
      jCurveGrading,
      [{ title: "The J-Curve", matchText: "(Diagram: The J-Curve)" }],
    );

    const diagramComment = comments.find((c) => c.category === "diagram");
    expect(diagramComment).toBeDefined();

    // Check paragraphLabel shows "Diagram (after ¶4)" instead of "Paragraph 5" or "Paragraph 6"
    expect(diagramComment?.paragraphLabel).toBe("Diagram (after ¶4)");

    // Check J-Curve syllabus-specific advice: must reference Current Account Balance / Time / Marshall-Lerner
    expect(diagramComment?.suggestion).toMatch(/current account/i);
    expect(diagramComment?.suggestion).toMatch(/time/i);
    expect(diagramComment?.suggestion).toMatch(/marshall/i);

    // Must NOT contain generic supply/demand price & quantity coordinate text
    expect(diagramComment?.critique).not.toMatch(/price and quantity coordinates/i);
    expect(diagramComment?.suggestion).not.toMatch(/price and quantity coordinates/i);
  });

  it("accurately handles Keynesian LRAS diagram with macro coordinates and prevents phantom paragraph indexing", () => {
    // 8 text paragraphs with a diagram block inserted between ¶8 and ¶9
    const paragraphs = [
      "Paragraph 1: Introduction to macroeconomic aggregate demand and aggregate supply.",
      "Paragraph 2: Aggregate demand consists of consumption, investment, government spending, and net exports.",
      "Paragraph 3: An increase in government expenditure shifts the aggregate demand curve to the right.",
      "Paragraph 4: In the short run, firms respond to higher aggregate demand by increasing production.",
      "Paragraph 5: This leads to an increase in real GDP and lower cyclical unemployment.",
      "Paragraph 6: However, the inflationary impact depends on the state of spare capacity in the economy.",
      "Paragraph 7: According to the Keynesian view, the aggregate supply curve has three distinct phases.",
      "Paragraph 8: When the economy operates with substantial spare capacity, output can expand without inflation.",
      "[DIAGRAM: Keynesian LRAS diagram (price level vs real GDP)]",
      "Paragraph 9: Once the economy reaches full employment Yfe, further shifts in aggregate demand are purely inflationary.",
      "Paragraph 10: In conclusion, fiscal stimulus is only non-inflationary when spare capacity exists.",
    ];
    const mockMacroEssay = paragraphs.join("\n\n");

    const macroGrading: Grading = {
      total_mark: 15,
      max_mark: 20,
      band: "Level 4",
      ao_breakdown: {
        knowledge: { awarded: 4, out_of: 4, comment: "" },
        analysis: { awarded: 7, out_of: 8, comment: "" },
        evaluation: { awarded: 4, out_of: 8, comment: "" },
      },
      examiner_summary: "Strong analytical response on fiscal policy and aggregate supply.",
      strengths: ["Clear Keynesian LRAS explanation"],
      weaknesses: ["Diagram could more explicitly show the transition from spare capacity to full employment bottleneck."],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      actionable_feedback: [],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.92,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      mockMacroEssay,
      "Discuss the effects of an increase in aggregate demand on real GDP and the price level [20]",
      macroGrading,
      [{ title: "Keynesian LRAS diagram", matchText: "[DIAGRAM: Keynesian LRAS diagram (price level vs real GDP)]" }],
    );

    const diagramComment = comments.find((c) => c.category === "diagram");
    expect(diagramComment).toBeDefined();

    // Verify paragraph label accurately counts preceding text paragraphs: 8, so "Diagram (after ¶8)"
    expect(diagramComment?.paragraphLabel).toBe("Diagram (after ¶8)");
    expect(diagramComment?.paragraphLabel).not.toBe("Diagram (after ¶18)");

    // Verify macro-specific guidance: Price Level, Real GDP, capacity
    expect(diagramComment?.suggestion).toMatch(/price level/i);
    expect(diagramComment?.suggestion).toMatch(/real gdp|national output/i);
    expect(diagramComment?.suggestion).toMatch(/spare capacity|full employment/i);

    // Verify NO microeconomic welfare areas injected
    expect(diagramComment?.critique).not.toMatch(/deadweight loss/i);
    expect(diagramComment?.critique).not.toMatch(/surplus/i);
    expect(diagramComment?.suggestion).not.toMatch(/deadweight loss/i);
  });

  it("accurately targets the specific paragraph by topic keywords rather than defaulting to paragraph 2", () => {
    const multiTopicEssay = [
      "Maximum price is a government-imposed price ceiling set below the equilibrium price.",
      "The ceiling causes consumer demand to expand while producer supply contracts, resulting in an immediate market shortage.",
      "Because of the persistent shortage, unrationed consumers turn to illegal black markets where goods are traded above legal limits.",
      "However, in the long run, price elasticity of supply determines whether producers permanently exit the market or reduce capital investment.",
      "In conclusion, maximum price controls require government rationing coupons to prevent market failure.",
    ].join("\n\n");

    const targetedGrading: Grading = {
      total_mark: 9,
      max_mark: 12,
      band: "Level 3",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2 },
        analysis: { awarded: 4, out_of: 6 },
        evaluation: { awarded: 3, out_of: 4 },
      },
      examiner_summary: "Good response but missing detailed black market transmission analysis.",
      strengths: ["Clear definition"],
      weaknesses: [
        "The causal mechanism explaining black markets and illegal rationing lacked depth regarding producer enforcement costs.",
      ],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      actionable_feedback: ["Detail how black markets emerge when rationing mechanisms fail."],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.94,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      multiTopicEssay,
      "Evaluate maximum price controls [12]",
      targetedGrading,
      [],
    );

    const analysisComment = comments.find((c) => c.category === "analysis");
    expect(analysisComment).toBeDefined();

    // Must target Paragraph 3 (which discusses black markets), NOT Paragraph 2!
    expect(analysisComment?.paragraphLabel).toBe("¶ Paragraph 3");
    expect(analysisComment?.highlightText).toMatch(/black market/i);
  });

  it("respects explicit paragraph references made by the examiner report", () => {
    const essay = [
      "Introduction to tariffs and protectionism.",
      "Domestic producers benefit from higher domestic prices and gain producer surplus.",
      "In the third paragraph, consumer surplus decreases significantly as domestic consumers pay higher prices.",
      "However, the net welfare loss depends on whether foreign retaliatory tariffs are enacted.",
      "In conclusion, tariffs cause deadweight welfare loss unless terms of trade improve.",
    ].join("\n\n");

    const explicitGrading: Grading = {
      total_mark: 8,
      max_mark: 12,
      band: "Level 2",
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2 },
        analysis: { awarded: 4, out_of: 6 },
        evaluation: { awarded: 2, out_of: 4 },
      },
      examiner_summary: "Uneven analysis across paragraphs.",
      strengths: [],
      weaknesses: [
        "In paragraph 3, the analysis of deadweight consumer surplus loss lacks intermediate price transmission steps.",
      ],
      missing_elements: { definitions: [], analysis: [], evaluation: [], examples: [], diagrams: [] },
      actionable_feedback: [],
      suggested_resources: [],
      suggested_practice: [],
      confidence: 0.9,
      audited: true,
      sources: [],
      anchorsUsed: 2,
    };

    const comments = generatePass4Comments(
      essay,
      "Evaluate tariffs on imported goods [12]",
      explicitGrading,
      [],
    );

    const analysisComment = comments.find((c) => c.category === "analysis");
    expect(analysisComment).toBeDefined();
    expect(analysisComment?.paragraphLabel).toBe("¶ Paragraph 3");
  });
});

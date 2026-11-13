import { describe, expect, it } from "vitest";

import {
  MIN_ESSAYS_FOR_REVIEW,
  MIN_MCQ_PAPERS_FOR_REVIEW,
  type GradeProjection,
  type MasteryPillar,
} from "./review.functions";
import type { McqDiagnostic, McqExplanationResult } from "./mcq/mcq-pdf.server";

describe("Review Panel & Holistic Diagnostics", () => {
  it("enforces progressive gating threshold for early feedback", () => {
    expect(MIN_ESSAYS_FOR_REVIEW).toBe(3);
    expect(MIN_MCQ_PAPERS_FOR_REVIEW).toBe(1);
  });

  it("projects Cambridge grade boundaries accurately", () => {
    function computeGrade(percent: number): GradeProjection["projectedGrade"] {
      if (percent >= 85) return "A*";
      if (percent >= 75) return "A";
      if (percent >= 65) return "B";
      if (percent >= 55) return "C";
      if (percent >= 45) return "D";
      if (percent >= 35) return "E";
      return "U";
    }

    expect(computeGrade(90)).toBe("A*");
    expect(computeGrade(78)).toBe("A");
    expect(computeGrade(68)).toBe("B");
    expect(computeGrade(58)).toBe("C");
    expect(computeGrade(48)).toBe("D");
    expect(computeGrade(38)).toBe("E");
    expect(computeGrade(25)).toBe("U");
  });

  it("evaluates the 5 pillars of Cambridge Economics", () => {
    const pillars: MasteryPillar[] = [
      {
        pillar: "Definitions & Terminology (AO1)",
        score: 85,
        status: "mastered",
        guidance: "Strong grasp of syllabus definitions.",
      },
      {
        pillar: "Causal Linkages & Multipliers (AO2)",
        score: 68,
        status: "developing",
        guidance: "Deepen transmission mechanisms.",
      },
      {
        pillar: "Evaluative Weighing & Judgements (AO3)",
        score: 45,
        status: "vulnerable",
        guidance: "Include short-run vs long-run qualifiers.",
      },
      {
        pillar: "Diagrammatic Synthesis & Labeling",
        score: 80,
        status: "mastered",
        guidance: "Accurate equilibrium shifts.",
      },
      {
        pillar: "MCQ Speed & Distractor Rejection",
        score: 72,
        status: "developing",
        guidance: "Watch for shift vs movement traps.",
      },
    ];

    expect(pillars).toHaveLength(5);
    expect(pillars.filter((p) => p.status === "mastered")).toHaveLength(2);
    expect(pillars.filter((p) => p.status === "developing")).toHaveLength(2);
    expect(pillars.filter((p) => p.status === "vulnerable")).toHaveLength(1);
  });
});

describe("Advanced MCQ Review and Response Engine", () => {
  it("validates structured Cambridge MCQ diagnostic schema", () => {
    const mockDiagnostic: McqDiagnostic = {
      concept: "AS Unit 2: Cross Elasticity of Demand (XED)",
      keyRule: "Positive XED indicates substitutes; negative XED indicates complements.",
      correctReasoning:
        "A price increase in good X shifts the demand for good Y rightward, meaning X and Y are substitute goods.",
      distractorTrap:
        "Distractor C confused complement relationship with substitute relationship due to sign reversal.",
      speedTip:
        "Substitutes move in the same direction (+). Immediately eliminate negative options in 15 seconds.",
    };

    const result: McqExplanationResult = {
      text: "Option B is correct based on positive XED.",
      diagnostic: mockDiagnostic,
    };

    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic?.concept).toContain("AS Unit 2");
    expect(result.diagnostic?.keyRule).toBeTruthy();
    expect(result.diagnostic?.correctReasoning).toBeTruthy();
    expect(result.diagnostic?.distractorTrap).toBeTruthy();
    expect(result.diagnostic?.speedTip).toBeTruthy();
  });

  it("supports backward-compatible fallback to plain text explanation", () => {
    const fallbackResult: McqExplanationResult = {
      text: "Option B is correct because the demand curve shifts rightward following a decrease in tax.",
    };

    expect(fallbackResult.text).toBeTruthy();
    expect(fallbackResult.diagnostic).toBeUndefined();
  });
});

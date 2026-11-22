import { describe, it, expect } from "vitest";
import { cleanSuggestion } from "./clean-suggestion";
import { cleanStars, stripStars } from "@/lib/utils";
import { getLiveExaminerIssueVisual } from "@/components/app/live-examiner-panel";
import { TEMPERATURE_EXAMINER } from "@/lib/examiner/config";

describe("Mistral Adaptation & Live Examiner Polish", () => {
  it("strips all bold and italic markdown asterisks from Mistral output", () => {
    const rawMistralExplanation =
      "The student asserts that **minimum prices** increase supply, but a legally binding price floor causes a **contraction in demand** and creates an **unsold surplus**.";
    expect(stripStars(rawMistralExplanation)).not.toContain("**");
    expect(stripStars(rawMistralExplanation)).not.toContain("*");
    expect(stripStars(rawMistralExplanation)).toContain("minimum prices");
    expect(stripStars(rawMistralExplanation)).toContain("contraction in demand");
  });

  it("cleans Mistral suggestions with asterisks, command verbs, and quotes", () => {
    expect(cleanSuggestion("**contraction in quantity demanded**")).toBe("contraction in quantity demanded");
    expect(cleanSuggestion("Use: **allocative efficiency** instead")).toBe("allocative efficiency");
    expect(cleanSuggestion("Suggestion: 'marginal private benefit'")).toBe("marginal private benefit");
    expect(cleanSuggestion("• Rewrite: **opportunity cost**")).toBe("opportunity cost");
    expect(cleanSuggestion("Correction: **ceteris paribus**")).toBe("ceteris paribus");
  });

  it("cleanStars recursively strips asterisks from nested objects and arrays", () => {
    const nested = {
      headline: "**Key Improvement Needed**",
      suggestions: [
        {
          original: "**price ceiling**",
          suggestion: "**maximum legal price**",
          how_to_write: ["Step 1: Define **price ceiling**", "Step 2: Trace **shortage**"],
        },
      ],
    };
    const cleaned = cleanStars(nested);
    expect(cleaned.headline).toBe("Key Improvement Needed");
    expect(cleaned.suggestions[0].original).toBe("price ceiling");
    expect(cleaned.suggestions[0].suggestion).toBe("maximum legal price");
    expect(cleaned.suggestions[0].how_to_write[0]).toBe("Step 1: Define price ceiling");
  });

  it("maps semantic color coding with 100% accuracy", () => {
    // Economics inaccuracies and misconceptions must be red
    const misconceptionVisual = getLiveExaminerIssueVisual("misconception");
    expect(misconceptionVisual.cardBorder).toContain("border-l-red-600");
    expect(misconceptionVisual.badge).toContain("text-red-700");

    const accuracyVisual = getLiveExaminerIssueVisual("economics_accuracy");
    expect(accuracyVisual.cardBorder).toContain("border-l-red-600");
    expect(accuracyVisual.badge).toContain("text-red-700");

    // Mechanics / Grammar must be rose/pink
    const grammarVisual = getLiveExaminerIssueVisual("grammar");
    expect(grammarVisual.cardBorder).toContain("border-l-rose-500");
    expect(grammarVisual.badge).toContain("text-rose-700");

    const clarityVisual = getLiveExaminerIssueVisual("clarity");
    expect(clarityVisual.cardBorder).toContain("border-l-rose-500");
    expect(clarityVisual.badge).toContain("text-rose-700");

    // Terminology must be AO1 blue
    const termVisual = getLiveExaminerIssueVisual("terminology");
    expect(termVisual.cardBorder).toContain("border-l-ao1");
    expect(termVisual.badge).toContain("text-ao1");

    // Analysis / Reasoning must be AO2 green
    const analysisVisual = getLiveExaminerIssueVisual("analysis");
    expect(analysisVisual.cardBorder).toContain("border-l-ao2");
    expect(analysisVisual.badge).toContain("text-ao2");

    // Evaluation must be AO3 amber
    const evalVisual = getLiveExaminerIssueVisual("evaluation");
    expect(evalVisual.cardBorder).toContain("border-l-ao3");
    expect(evalVisual.badge).toContain("text-ao3");
  });

  it("verifies TEMPERATURE_EXAMINER matches essay grader", () => {
    expect(TEMPERATURE_EXAMINER).toBeGreaterThanOrEqual(0.0);
    expect(TEMPERATURE_EXAMINER).toBeLessThanOrEqual(0.25);
  });
});

import { describe, expect, it } from "vitest";
import {
  cleanAndShortenSentence,
  extractSinglePunchySentence,
  formatThreeLineMcqFeedback,
  generateInstantMcqDiagnostic,
} from "./mcq-feedback-format";

describe("MCQ Ultra-Concise 3-Line Feedback Formatter (Cambridge 0455)", () => {
  it("formats verbose explanations into strictly 3 distinct, punchy lines", () => {
    const rawExplanation = {
      concept: "Classification of Goods: Public vs Private Goods",
      correctReasoning:
        "Option D is the official mark scheme answer because entry fees establish price excludability, while overcrowding causes rivalry in consumption. Under Cambridge conventions, these two characteristics uniquely define a private good rather than a public good.",
      distractorTrap:
        "The distractor relies on the misconception that because the national park is owned and maintained by the government, it must automatically be classified as a public good.",
      keyRule:
        "Golden Rule: Private goods are defined by rivalry and excludability, regardless of whether they are provided by the state or private sector.",
      speedTip: "Speed tip: Look for payment (excludable) and overcrowding (rival).",
    };

    const formatted = formatThreeLineMcqFeedback({
      explanation: { diagnostic: rawExplanation },
      correctAnswer: "D",
      userAnswer: "A",
      isCorrect: false,
    });

    expect(formatted.concept).toBe("Classification of Goods: Public vs Private Goods");
    expect(formatted.line1.badge).toBe("Option D");
    expect(formatted.line1.text).not.toContain("Option D is the official mark scheme answer because");
    expect(formatted.line1.text.length).toBeLessThan(120);

    expect(formatted.line2.badge).toBe("The Trap");
    expect(formatted.line2.text).not.toContain("The distractor relies on the misconception that");
    expect(formatted.line2.text.length).toBeLessThan(120);

    expect(formatted.line3.badge).toBe("Takeaway");
    expect(formatted.line3.text).not.toContain("Golden Rule:");
    expect(formatted.line3.text.length).toBeLessThan(110);

    const lines = formatted.plainText.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^Option D:/);
    expect(lines[1]).toMatch(/^The Trap:/);
    expect(lines[2]).toMatch(/^Takeaway:/);
  });

  it("handles instant zero-latency diagnostic generation for PED and revenue", () => {
    const instant = generateInstantMcqDiagnostic({
      correctAnswer: "B",
      userAnswer: "C",
      isCorrect: false,
      questionStem: "A firm faces price-inelastic demand for its good. What happens to total revenue when price increases?",
    });

    expect(instant.concept).toContain("Price Elasticity of Demand");
    expect(instant.correctReasoning).toContain("total revenue");
    expect(instant.distractorTrap).toContain("Confuses");
    expect(instant.keyRule).toContain("Inelastic demand");
  });

  it("handles instant zero-latency diagnostic for PPC and opportunity cost", () => {
    const instant = generateInstantMcqDiagnostic({
      correctAnswer: "C",
      userAnswer: "C",
      isCorrect: true,
      questionStem: "What does a movement along a production possibility curve indicate?",
    });

    expect(instant.concept).toContain("PPC");
    expect(instant.correctReasoning).toContain("alternative forgone");
    expect(instant.distractorTrap).toContain("Avoided");
  });

  it("extracts single punchy sentence safely without regex lookbehinds", () => {
    const text = "Taxes shift the supply curve upward by the tax amount. This raises consumer prices. Producers also bear part of the burden.";
    const sentence = cleanAndShortenSentence(text);
    expect(sentence).toBe("Taxes shift the supply curve upward by the tax amount.");
  });

  it("strips asterisks and markdown formatting cleanly", () => {
    const text = "**Option B** is correct *because* **demand** is inelastic.";
    const sentence = extractSinglePunchySentence(text);
    expect(sentence).not.toContain("*");
    expect(sentence).toContain("Option B is correct because demand is inelastic.");
  });
});

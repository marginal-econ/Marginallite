import { describe, expect, it } from "vitest";
import { normalizeIssueSpan } from "./normalize-issue-span";

describe("normalizeIssueSpan", () => {
  it("USER SCREENSHOT 1: extracts single misspelled word when AI quotes the entire sentence", () => {
    const sentence = "Inflation is a persistant rise in general price level.";
    const result = normalizeIssueSpan({
      sentence,
      original: "Inflation is a persistant rise in general price level.",
      suggestion: "persistent",
      category: "grammar",
    });

    expect(result).not.toBeNull();
    // Only the misspelled word should be flagged and replaced, NOT the whole sentence!
    expect(result?.original).toBe("persistant");
    expect(result?.suggestion).toBe("persistent");
  });

  it("USER SCREENSHOT 1 EDGE CASE: discards bogus suggestion when suggestion is identical to word in text", () => {
    const sentence = "Inflation is a persistant rise in general price level.";
    const result = normalizeIssueSpan({
      sentence,
      original: "Inflation is a persistant rise in general price level.",
      suggestion: "persistant", // AI hallucinated suggesting the same typo
      category: "grammar",
    });

    // Should be safely discarded as a no-op hallucination
    expect(result).toBeNull();
  });

  it("USER SCREENSHOT 2: extracts minimal differing span for missing article", () => {
    const sentence = "Inflation is a persistent rise in general price level.";
    const result = normalizeIssueSpan({
      sentence,
      original: "Inflation is a persistent rise in general price level.",
      suggestion: "Inflation is a persistent rise in the general price level.",
      category: "terminology",
    });

    expect(result).not.toBeNull();
    // In an insertion, the anchor word ("general") is underlined and replaced with "the general"
    expect(result?.original).toBe("general");
    expect(result?.suggestion).toBe("the general");
  });

  it("USER SCREENSHOT 2: handles 'Exmaples of monetary policy' -> 'Examples of monetary policy'", () => {
    const sentence = "Exmaples of monetary policy can include interest rates.";
    const result = normalizeIssueSpan({
      sentence,
      original: "Exmaples of monetary policy",
      suggestion: "Examples of monetary policy",
      category: "grammar",
    });

    expect(result).not.toBeNull();
    expect(result?.original).toBe("Exmaples");
    expect(result?.suggestion).toBe("Examples");
  });

  it("prevents destruction: discards grammar fragment when AI flags full sentence with unaligned 1-word fragment", () => {
    const sentence = "Inflation reduces the purchasing power of money over time.";
    const result = normalizeIssueSpan({
      sentence,
      original: "Inflation reduces the purchasing power of money over time.",
      suggestion: "macroeconomic", // Unaligned fragment
      category: "grammar",
    });

    // Must return null to protect the sentence from being replaced by a 1-word fragment!
    expect(result).toBeNull();
  });

  it("allows full sentence replacement for substantive analysis/evaluation expansions", () => {
    const sentence = "Monetary policy cuts inflation.";
    const expansion = "Higher central bank policy rates raise borrowing costs, reducing consumer expenditure and dampening aggregate demand.";
    const result = normalizeIssueSpan({
      sentence,
      original: "Monetary policy cuts inflation.",
      suggestion: expansion,
      category: "analysis",
    });

    expect(result).not.toBeNull();
    expect(result?.original).toBe("Monetary policy cuts inflation.");
    expect(result?.suggestion).toBe(expansion);
  });

  it("safely handles already-minimal word corrections", () => {
    const sentence = "The firm will loose profit.";
    const result = normalizeIssueSpan({
      sentence,
      original: "loose",
      suggestion: "lose",
      category: "grammar",
    });

    expect(result).not.toBeNull();
    expect(result?.original).toBe("loose");
    expect(result?.suggestion).toBe("lose");
  });
});

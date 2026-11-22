import { describe, expect, it } from "vitest";
import {
  buildMistakePathologySummary,
  isMcqMistakeType,
  MCQ_MISTAKE_TYPES,
} from "./mcq-mistakes";

describe("MCQ Mistake Pathology Taxonomy & Summary", () => {
  it("validates canonical mistake archetype IDs", () => {
    expect(isMcqMistakeType("concept_gap")).toBe(true);
    expect(isMcqMistakeType("distractor_trap")).toBe(true);
    expect(isMcqMistakeType("stem_misread")).toBe(true);
    expect(isMcqMistakeType("calculation_rush")).toBe(true);
    expect(isMcqMistakeType("unknown")).toBe(false);
    expect(isMcqMistakeType(null)).toBe(false);
  });

  it("identifies dominant mistake archetype and computes exact percentages", () => {
    const summary = buildMistakePathologySummary(
      {
        2: "distractor_trap",
        5: "distractor_trap",
        9: "distractor_trap",
        14: "stem_misread",
        21: "concept_gap",
      },
      [2, 5, 9, 14, 21, 28],
    );

    expect(summary.totalWrong).toBe(6);
    expect(summary.totalTagged).toBe(5);
    expect(summary.untaggedCount).toBe(1);
    expect(summary.dominant?.meta.id).toBe("distractor_trap");
    expect(summary.dominant?.count).toBe(3);
    expect(summary.dominant?.pct).toBe(60);
    expect(summary.dominant?.questionNumbers).toEqual([2, 5, 9]);
    expect(summary.recommendation).toContain("Distractor Traps");
    expect(summary.buckets).toHaveLength(MCQ_MISTAKE_TYPES.length);
  });

  it("returns zero-mistake celebration when no questions were missed", () => {
    const summary = buildMistakePathologySummary({}, []);
    expect(summary.totalWrong).toBe(0);
    expect(summary.dominant).toBeNull();
    expect(summary.recommendation).toContain("Zero mistakes");
  });
});

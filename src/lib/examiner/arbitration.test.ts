import { describe, expect, it } from "vitest";
import { computeObjectiveConfidence, shouldTriggerArbitration } from "./arbitration.server";
import type { Grading } from "./types";

function mockGrading(totalMark: number, band: string, strengths: string[] = []): Grading {
  return {
    total_mark: totalMark,
    max_mark: 12,
    band,
    ao_breakdown: {
      knowledge: { awarded: Math.round(totalMark * 0.25), out_of: 3, comment: "" },
      analysis: { awarded: Math.round(totalMark * 0.5), out_of: 6, comment: "" },
      evaluation: { awarded: Math.round(totalMark * 0.25), out_of: 3, comment: "" },
    },
    examiner_summary: "Test summary",
    strengths,
    weaknesses: [],
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
    confidence: 0.8,
    audited: false,
    sources: [],
    anchorsUsed: 0,
  };
}

describe("Principal Examiner Arbitration & Confidence Engine", () => {
  describe("Dispute Detection (shouldTriggerArbitration)", () => {
    it("does not trigger arbitration when examiner and moderator agree closely", () => {
      const examiner = mockGrading(8, "Upper middle band");
      const moderator = mockGrading(9, "Upper middle band");

      const result = shouldTriggerArbitration(examiner, moderator, 12);
      expect(result.shouldArbitrate).toBe(false);
      expect(result.delta).toBe(1);
    });

    it("triggers arbitration when mark difference exceeds tolerance threshold", () => {
      const examiner = mockGrading(10, "Top band");
      const moderator = mockGrading(6, "Lower middle band"); // 4 marks discrepancy on 12-mark essay

      const result = shouldTriggerArbitration(examiner, moderator, 12);
      expect(result.shouldArbitrate).toBe(true);
      expect(result.delta).toBe(4);
      expect(result.reason).toContain("discrepancy of 4 marks");
    });

    it("triggers arbitration on severe grade band contradiction", () => {
      const examiner = mockGrading(8, "Top band");
      const moderator = mockGrading(7, "Lower middle band");

      const result = shouldTriggerArbitration(examiner, moderator, 12);
      expect(result.shouldArbitrate).toBe(true);
      expect(result.reason).toContain("contradiction");
    });
  });

  describe("Objective Confidence Computation", () => {
    it("awards high confidence when examiner and moderator closely converge", () => {
      const examiner = mockGrading(9, "Upper middle band", [
        'Quotes: "AD shifts right due to investment"',
      ]);
      const moderator = mockGrading(9, "Upper middle band", ['Agrees with "AD shifts right"']);

      const confidence = computeObjectiveConfidence(examiner, moderator, false);
      expect(confidence).toBeGreaterThanOrEqual(0.9);
      expect(confidence).toBeLessThanOrEqual(0.98);
    });

    it("reduces confidence proportionally when examiner and moderator diverge", () => {
      const examiner = mockGrading(11, "Top band");
      const moderator = mockGrading(6, "Lower middle band");

      const confidence = computeObjectiveConfidence(examiner, moderator, false);
      expect(confidence).toBeLessThan(0.7);
      expect(confidence).toBeGreaterThanOrEqual(0.35);
    });

    it("maintains authoritative high baseline confidence when successfully arbitrated", () => {
      const examiner = mockGrading(10, "Top band");
      const moderator = mockGrading(7, "Lower middle band");

      const confidence = computeObjectiveConfidence(examiner, moderator, true);
      expect(confidence).toBeGreaterThanOrEqual(0.85);
    });
  });
});

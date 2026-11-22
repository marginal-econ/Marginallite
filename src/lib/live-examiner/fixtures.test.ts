import { describe, expect, it } from "vitest";
import { GOLDEN_ESSAYS } from "./__fixtures__/essays";
import { segmentEssay } from "./segment";
import { computeHeuristicScore } from "./heuristic-score";
import { TARIFF_SPLITS } from "@/lib/examiner/config";

describe("Live Examiner v2 - Golden Fixtures Evaluation", () => {
  it.each(GOLDEN_ESSAYS)(
    "evaluates '$title' accurately within Cambridge tariff bounds",
    (essay) => {
      const segments = segmentEssay(essay.essayText);
      const score = computeHeuristicScore({
        sentences: segments.map((s) => ({ text: s.text, paragraphIndex: s.paragraphIndex })),
        question: essay.question,
        maxMark: essay.tariff,
      });

      const split = TARIFF_SPLITS[essay.tariff];

      // 1. Total score must be within expected range
      expect(score.total).toBeGreaterThanOrEqual(essay.expectedScores.minTotal);
      expect(score.total).toBeLessThanOrEqual(essay.expectedScores.maxTotal);

      // 2. Score must never exceed overall tariff
      expect(score.total).toBeLessThanOrEqual(essay.tariff);

      // 3. Per-AO score must never exceed the exact Cambridge tariff ceilings
      expect(score.aoBreakdown.ao1).toBeLessThanOrEqual(split.ao1_marks);
      expect(score.aoBreakdown.ao2).toBeLessThanOrEqual(split.ao2_marks);
      expect(score.aoBreakdown.ao3).toBeLessThanOrEqual(split.ao3_marks);
    },
  );
});

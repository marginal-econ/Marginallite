import { describe, expect, it } from "vitest";
import {
  calculatePredictedGradeFromThresholds,
  getCambridgeGradeStandard,
  normalizeSeriesId,
} from "@/lib/cambridge-thresholds";
import { defaultSplitForMaxMark, isEvaluativeQuestion } from "@/lib/examiner/config";
import { synthesizeDualPasses } from "@/lib/examiner/arbitration.server";
import {
  normaliseGrading,
  purgeContradictions,
  sanitizeIgcseFeedbackText,
  stripInternalSnippetCitations,
  stripScoreFractionsFromText,
  verifyVerbatimQuotes,
} from "@/lib/examiner/types";
import { analyzeEssayQuality, applyWritingQualityGuardrail } from "@/lib/examiner/writing-quality";
import { aggregateMcqDomains, classifyMcqQuestion } from "@/lib/mcq-domain";
import { buildMistakePathologySummary } from "@/lib/mcq-mistakes";

describe("Cambridge IGCSE Economics (0455) Migration Verification Suite", () => {
  describe("IGCSE 0455 Tariffs & Evaluation Detection", () => {
    it("detects evaluative vs non-evaluative IGCSE command words", () => {
      expect(isEvaluativeQuestion("Discuss whether or not fiscal policy reduces poverty.")).toBe(true);
      expect(isEvaluativeQuestion("Define opportunity cost.")).toBe(false);
      expect(isEvaluativeQuestion("Explain two causes of inflation.")).toBe(false);
      expect(isEvaluativeQuestion("Analyse how a subsidy affects equilibrium price.")).toBe(false);
    });

    it("auto-selects Section A 6-mark Discuss AO split from question prompt", () => {
      const discuss6 = defaultSplitForMaxMark(
        6,
        undefined,
        "Discuss whether or not demand for gold will be more price-elastic.",
      );
      expect(discuss6).toEqual({ ao1_marks: 2, ao2_marks: 2, ao3_marks: 2 });

      const analyse6 = defaultSplitForMaxMark(
        6,
        undefined,
        "Analyse how an increase in education spending affects economic growth.",
      );
      expect(analyse6).toEqual({ ao1_marks: 0, ao2_marks: 6, ao3_marks: 0 });
    });
  });

  describe("IGCSE 0455 Writing Quality Calibration", () => {
    it("never penalises concise 2-mark IGCSE definitions", () => {
      const split = defaultSplitForMaxMark(2);
      const q = analyzeEssayQuality(
        "Opportunity cost is the next best alternative forgone when making a choice.",
        2,
        split,
      );
      expect(q.isUndersized).toBe(false);
      expect(q.isSeverelyUndersized).toBe(false);
      expect(q.maxAllowableTotalMark).toBe(2);
    });

    it("exempts 6-mark diagram responses with [DIAGRAM: ...] from prose brevity penalties", () => {
      const split = defaultSplitForMaxMark(6);
      const q = analyzeEssayQuality(
        "[DIAGRAM: Demand and supply for sorghum shifting right from D1 to D2, P1 to P2, Q1 to Q2.]\n\nHigher preference shifts demand right, raising equilibrium price and quantity.",
        6,
        split,
      );
      expect(q.hasDiagramTag).toBe(true);
      expect(q.isUndersized).toBe(false);
      expect(q.maxAllowableTotalMark).toBe(6);
    });

    it("caps severely undersized 8-mark Discuss fragments at Level 1", () => {
      const split = defaultSplitForMaxMark(8);
      const q = analyzeEssayQuality("Taxes raise money for schools. Sometimes taxes hurt firms.", 8, split);
      expect(q.isSeverelyUndersized).toBe(true);
      expect(q.maxAllowableTotalMark).toBeLessThanOrEqual(2);
    });

    it("protects well-paragraphed 8-mark IGCSE Discuss essays (200+ words)", () => {
      const split = defaultSplitForMaxMark(8);
      const essay = [
        "Fiscal policy involves changes in government spending and taxation to influence economic activity and living standards. Higher government expenditure on schools and hospitals directly improves human capital and life expectancy, lifting the Human Development Index.",
        "When the government invests in teacher training, rural clinics, and clean water infrastructure, workforce productivity increases over time. Higher productivity raises average wages and household disposable income, helping low-income families escape absolute poverty.",
        "However, expansionary fiscal policy may fail to improve living standards if funds are misallocated through inefficiency or if higher spending creates demand-pull inflation that erodes purchasing power for the poorest households. Raising indirect taxes to fund spending is also regressive.",
        "In conclusion, fiscal policy is most likely to raise living standards in the long run when spending is tightly targeted at public education and healthcare rather than untargeted transfers, and when tax collection is progressive.",
      ].join("\n\n");
      const q = analyzeEssayQuality(essay, 8, split);
      expect(q.isUndersized).toBe(false);
      expect(q.isMonolithicBlock).toBe(false);
      expect(q.maxAllowableTotalMark).toBe(8);
    });
  });

  describe("Anti-Hallucination Hygiene & Dual-Pass Synthesis", () => {
    it("strips [S#] codes, score fractions, asterisks, and accidental 9708/A-Level references", () => {
      expect(stripInternalSnippetCitations("Accurate shift (as per [S1], [S3]) shown [S2].")).toBe(
        "Accurate shift shown.",
      );
      expect(stripScoreFractionsFromText("Strong point (3/4 marks) but held at 5/8.")).toBe(
        "Strong point but limited in depth.",
      );
      const clean = sanitizeIgcseFeedbackText("**Great** Cambridge 9708 Paper 4 AS Level point (AO4).");
      expect(clean).not.toContain("*");
      expect(clean).not.toContain("9708");
      expect(clean).not.toContain("Paper 4");
      expect(clean).not.toContain("AS Level");
      expect(clean).not.toContain("AO4");
    });

    it("purges internal contradictions and strips A-Level-only topics from IGCSE feedback", () => {
      const split = defaultSplitForMaxMark(8);
      const raw = normaliseGrading(
        {
          total_mark: 7,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Clear definition." },
            analysis: { awarded: 3, out_of: 3, comment: "Developed chains." },
            evaluation: { awarded: 2, out_of: 3, comment: "Good balance." },
          },
          examiner_summary: "Strong IGCSE 0455 essay.",
          strengths: ["Uses a strong example of Senegal agriculture to illustrate productivity."],
          weaknesses: [
            "No examples were provided in the answer.",
            "Consider adding indifference curves and MRPL.",
            "Weigh short-run versus long-run fiscal trade-offs more explicitly.",
          ],
          missing_elements: {
            definitions: [],
            analysis: [],
            evaluation: [],
            examples: ["Missing examples"],
            diagrams: [],
          },
          actionable_feedback: ["Strengthen the final judgement."],
          suggested_resources: ["Cambridge IGCSE 0455 Unit 4.3: Fiscal Policy"],
          suggested_practice: ["Write an 8-mark discuss essay on progressive taxation."],
        },
        8,
        split,
      );
      const purged = purgeContradictions(raw);
      expect(purged.weaknesses.some((w) => /no examples/i.test(w))).toBe(false);
      expect(purged.weaknesses.some((w) => /indifference|mrpl/i.test(w))).toBe(false);
      expect(purged.weaknesses.some((w) => /short-run/i.test(w))).toBe(true);
      expect(purged.missing_elements.examples).toHaveLength(0);
    });

    it("verifies verbatim quotes against student essay text", () => {
      const essay = "Higher interest rates discourage borrowing and reduce consumer spending.";
      expect(
        verifyVerbatimQuotes('Strong link in "discourage borrowing and reduce consumer spending".', essay),
      ).toContain('"discourage borrowing and reduce consumer spending"');
      expect(
        verifyVerbatimQuotes('Claimed "central bank prints infinite gold reserves immediately".', essay),
      ).not.toContain('"central bank prints infinite gold reserves immediately"');
    });

    it("synthesizes Pass 1 and Pass 2 cleanly when passes converge", () => {
      const split = defaultSplitForMaxMark(8);
      const pass1 = normaliseGrading(
        {
          total_mark: 6,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
            analysis: { awarded: 2, out_of: 3, comment: "Good chains." },
            evaluation: { awarded: 2, out_of: 3, comment: "Balanced." },
          },
          examiner_summary: "Solid.",
          strengths: ["Clear causal analysis of subsidies."],
          weaknesses: ["Deepen the concluding judgement."],
        },
        8,
        split,
      );
      const pass2 = normaliseGrading(
        {
          total_mark: 7,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Accurate syllabus definitions." },
            analysis: { awarded: 3, out_of: 3, comment: "Well-developed two-sided chains." },
            evaluation: { awarded: 2, out_of: 3, comment: "Balanced weighing with conclusion." },
          },
          examiner_summary: "Strong Level 3 IGCSE 0455 discussion.",
          strengths: ["Effective two-sided structure."],
          weaknesses: ["Clarify long-run opportunity cost."],
        },
        8,
        split,
      );
      const merged = synthesizeDualPasses(pass1, pass2, 8, split);
      expect(merged.total_mark).toBe(7);
      expect(merged.audited).toBe(true);
      expect(merged.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("applies fatal misconception ceiling only when explicitly proven with verbatim quotes", () => {
      const split = defaultSplitForMaxMark(8);
      const flawed = normaliseGrading(
        {
          mechanism_validation: {
            core_mechanisms_sound: false,
            fatal_misconceptions_found: true,
            error_evidence_quotes: ["higher supply causes equilibrium price to increase"],
          },
          total_mark: 7,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "" },
            analysis: { awarded: 3, out_of: 3, comment: "" },
            evaluation: { awarded: 2, out_of: 3, comment: "" },
          },
        },
        8,
        split,
      );
      const q = analyzeEssayQuality("word ".repeat(220), 8, split);
      const guarded = applyWritingQualityGuardrail(flawed, q, 8, split);
      expect(guarded.total_mark).toBeLessThanOrEqual(4);
    });
  });

  describe("Cambridge IGCSE 0455 Grade Thresholds & MCQ Diagnostics", () => {
    it("predicts A* through G grades accurately from IGCSE 0455 thresholds", () => {
      expect(normalizeSeriesId("Feb/March 2026")).toBe("march_2026");
      expect(calculatePredictedGradeFromThresholds(80).projectedGrade).toBe("A*");
      expect(calculatePredictedGradeFromThresholds(68).projectedGrade).toBe("A");
      expect(calculatePredictedGradeFromThresholds(58).projectedGrade).toBe("B");
      expect(calculatePredictedGradeFromThresholds(24).projectedGrade).toBe("F");
      expect(getCambridgeGradeStandard(7, 8).letter).toBe("A*");
    });

    it("classifies IGCSE 0455 MCQs across Units 1–6 and aggregates Micro vs Macro domains", () => {
      const pedQ = classifyMcqQuestion({
        questionText: "If price elasticity of demand (PED) is -0.4 and price rises, what happens to total revenue?",
        number: 8,
      });
      expect(pedQ.unitNumber).toBe(2);
      expect(pedQ.domain).toBe("micro");

      const hdiQ = classifyMcqQuestion({
        questionText: "Which indicator is included in the Human Development Index (HDI)?",
        number: 24,
      });
      expect(hdiQ.unitNumber).toBe(5);
      expect(hdiQ.domain).toBe("macro");

      const stats = aggregateMcqDomains([
        { topic: pedQ.topic, correct: true },
        { topic: hdiQ.topic, correct: false },
      ]);
      expect(stats.find((s) => s.domain === "micro")?.accuracyPct).toBe(100);
      expect(stats.find((s) => s.domain === "macro")?.accuracyPct).toBe(0);
    });

    it("builds MCQ mistake pathology summary cleanly", () => {
      const summary = buildMistakePathologySummary(
        {
          3: "concept_gap",
          7: "concept_gap",
          12: "stem_misread",
        },
        [3, 7, 12],
      );
      expect(summary.totalTagged).toBe(3);
      expect(summary.dominant?.meta.id).toBe("concept_gap");
    });
  });
});

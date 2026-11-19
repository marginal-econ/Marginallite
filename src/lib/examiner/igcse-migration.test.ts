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

  describe("Cambridge IGCSE 0455 8-Mark Table A & Evaluative Conclusion Withhold Rule", () => {
    const split8 = defaultSplitForMaxMark(8);

    it("enforces the 2 + 6 mark architecture on 8-mark Discuss questions", () => {
      const essay = [
        "Fiscal policy is the use of government taxation and public expenditure to influence macroeconomic outcomes.",
        "On the one hand, expansionary fiscal policy through increased investment in schools and hospitals raises labor productivity and shifts the PPC outwards, generating sustainable economic growth.",
        "On the other hand, higher government spending can lead to budget deficits and demand-pull inflation, eroding household real purchasing power.",
        "In conclusion, whether fiscal policy improves living standards depends on the time horizon. In the short run, budget deficits may pressure inflation, but in the long run, capital spending expands productive capacity.",
      ].join("\n\n");

      const grading = normaliseGrading(
        {
          total_mark: 8,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Accurate definition of fiscal policy." },
            analysis: { awarded: 3, out_of: 3, comment: "Detailed two-sided causal transmission mechanisms." },
            evaluation: { awarded: 3, out_of: 3, comment: "Nuanced conditional evaluative conclusion." },
          },
          examiner_summary: "Exemplary Level 3 discussion with balanced two-sided analysis and a reasoned conclusion.",
          strengths: ["Clear two-sided analysis.", "Substantiated conclusion."],
          weaknesses: [],
        },
        8,
        split8,
        essay,
      );

      expect(grading.total_mark).toBe(8);
      expect(grading.table_a_breakdown).toBeDefined();
      expect(grading.table_a_breakdown?.level).toBe("Level 3");
      expect(grading.table_a_breakdown?.knowledge_setup_awarded).toBe(2);
      expect(grading.table_a_breakdown?.discussion_awarded).toBe(6);
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.status).toBe("substantiated");
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.marks_withheld).toBe(0);
      expect(grading.table_a_breakdown?.one_sided_cap_applied).toBe(false);
    });

    it("withholds 1 mark and holds at Level 3 entry (6/8) when evaluative conclusion is omitted", () => {
      const essayWithoutConclusion = [
        "Fiscal policy involves government spending and taxation to influence aggregate demand.",
        "Increased government spending on infrastructure lowers firm transport costs and increases productive capacity, raising GDP and creating jobs.",
        "However, higher expenditure may require the government to raise indirect taxes such as VAT, which is regressive and lowers the living standards of low-income families.",
      ].join("\n\n");

      const grading = normaliseGrading(
        {
          total_mark: 7,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Accurate terminology." },
            analysis: { awarded: 3, out_of: 3, comment: "Strong two-sided arguments." },
            evaluation: { awarded: 2, out_of: 3, comment: "Presents both sides but omitted conclusion." },
          },
          examiner_summary: "Strong two-sided discussion but candidate omitted an evaluative conclusion.",
          strengths: ["Balanced two-sided points."],
          weaknesses: ["No evaluative conclusion provided."],
        },
        8,
        split8,
        essayWithoutConclusion,
      );

      // Under Cambridge Table A, omitted conclusion withholds 1 mark, holding the answer at Level 3 entry (6/8)
      expect(grading.total_mark).toBe(6);
      expect(grading.table_a_breakdown?.level).toBe("Level 3");
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.status).toBe("missing");
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.marks_withheld).toBe(1);
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.withhold_reason).toContain(
        "Level 3 (6 marks)",
      );
      expect(grading.table_a_breakdown?.discussion_awarded).toBe(4);
    });

    it("withholds 1 mark when conclusion is merely a generic summary without weighing conditional criteria", () => {
      const essayWithGenericSummary = [
        "Fiscal policy involves government spending and taxation.",
        "Higher government spending boosts economic growth and reduces unemployment by increasing aggregate demand.",
        "However, higher government spending can increase inflation and worsen the national debt.",
        "In conclusion, both sides have good points and fiscal policy has both advantages and disadvantages.",
      ].join("\n\n");

      const grading = normaliseGrading(
        {
          total_mark: 8,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Accurate setup." },
            analysis: { awarded: 3, out_of: 3, comment: "Well-explained advantages and disadvantages." },
            evaluation: { awarded: 3, out_of: 3, comment: "Brief final summary paragraph." },
          },
          examiner_summary: "Two-sided discussion. Conclusion is brief and merely summarises without weighing trade-offs.",
          strengths: ["Clear analysis on both sides."],
          weaknesses: ["Conclusion merely summarises without evaluative weighing."],
        },
        8,
        split8,
        essayWithGenericSummary,
      );

      // Generic summary withholds 1 mark (8/8 -> 7/8)
      expect(grading.total_mark).toBe(7);
      expect(grading.table_a_breakdown?.level).toBe("Level 3");
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.status).toBe("generic_summary");
      expect(grading.table_a_breakdown?.evaluative_conclusion_audit.marks_withheld).toBe(1);
    });

    it("strictly caps one-sided Discuss essays at Level 2 (max 5/8) under Table A", () => {
      const oneSidedEssay = [
        "A fixed exchange rate creates certainty for domestic exporters and importers.",
        "Because firms know the future price of imported materials, they can invest in new capital equipment, raising economic growth.",
        "Additionally, exchange rate stability attracts foreign direct investment, creating employment and transferring skills.",
      ].join("\n\n");

      const grading = normaliseGrading(
        {
          total_mark: 7,
          ao_breakdown: {
            knowledge: { awarded: 2, out_of: 2, comment: "Clear knowledge." },
            analysis: { awarded: 3, out_of: 3, comment: "Detailed analysis of benefits." },
            evaluation: { awarded: 2, out_of: 3, comment: "One-sided response with no counter-arguments." },
          },
          examiner_summary: "Detailed analysis of benefits but response is one-sided and lacks counter-arguments.",
          strengths: ["Sound analysis of fixed exchange rate benefits."],
          weaknesses: ["One-sided discussion without disadvantages."],
        },
        8,
        split8,
        oneSidedEssay,
      );

      // Official Table A cap: one-sided response = max 5/8 in Level 2
      expect(grading.total_mark).toBe(5);
      expect(grading.table_a_breakdown?.level).toBe("Level 2");
      expect(grading.table_a_breakdown?.one_sided_cap_applied).toBe(true);
      expect(grading.table_a_breakdown?.two_sided_balance).toBe("one_sided");
    });
  });
});

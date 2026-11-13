/**
 * The Review Panel — a single AI pass that looks across a student's recent
 * essay grades AND recent MCQ papers together (not one essay/paper in
 * isolation, which every other tool already does) and writes an aggregate
 * diagnosis: recurring strengths, recurring weaknesses tied to evidence,
 * an AO1/AO2/AO3 trend, the weakest MCQ topics, and a prioritised "what to
 * do next" plan.
 *
 * Gated behind a minimum sample size (3 graded essays + 1 completed MCQ
 * paper) so students get actionable diagnostic reviews early while still
 * observing genuine multi-attempt patterns.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { chat } from "./ai.server";
import { MODEL_ANALYSIS } from "./examiner/config";
import { extractFirstJsonObject } from "./examiner/json";
import type { Grading } from "./examiner/types";
import { aggregateMcqDomains, MCQ_DOMAIN_LABEL, type DomainStat } from "./mcq-domain";

export const MIN_ESSAYS_FOR_REVIEW = 3;
export const MIN_MCQ_PAPERS_FOR_REVIEW = 1;

// How much history actually feeds the synthesis once unlocked
const ESSAY_WINDOW = 12;
const MCQ_WINDOW = 8;

type EssaySummary = {
  essayId: string;
  question: string;
  maxMark: number;
  totalMark: number;
  band: string;
  aoBreakdown: Grading["ao_breakdown"];
  strengths: string[];
  weaknesses: string[];
  missingElements: Grading["missing_elements"];
  createdAt: string;
};

export type MasteryPillar = {
  pillar: string;
  score: number;
  status: "mastered" | "developing" | "vulnerable";
  guidance: string;
};

export type GradeProjection = {
  projectedGrade: "A*" | "A" | "B" | "C" | "D" | "E" | "U";
  currentAveragePercent: number;
  targetGrade: "A*" | "A" | "B";
  marksToNextGrade: string;
  confidence: "high" | "medium" | "emerging";
};

export type DomainComparison = {
  microAvgPercent: number;
  macroAvgPercent: number;
  strongerDomain: "micro" | "macro" | "balanced";
  recommendation: string;
};

export type ReviewPanelResult = {
  eligible: true;
  sampleLevel: "diagnostic" | "comprehensive";
  essayCount: number;
  mcqPaperCount: number;
  generatedAt: string;
  overallSummary: string;
  gradeTrend: "improving" | "steady" | "declining" | "not enough data";
  gradeProjection: GradeProjection;
  masteryPillars: MasteryPillar[];
  domainComparison: DomainComparison;
  aoAnalysis: {
    ao: "AO1 Knowledge" | "AO2 Analysis" | "AO3 Evaluation";
    averagePercent: number;
    comment: string;
  }[];
  keyStrengths: { title: string; detail: string }[];
  keyWeaknesses: { title: string; detail: string; evidence: string }[];
  weakMcqTopics: { topic: string; accuracyPercent: number }[];
  /** SAT-"Reading vs Writing" style two-section MCQ split — see mcq-domain.ts. */
  mcqDomainBreakdown: DomainStat[];
  actionPlan: {
    priority: number;
    action: string;
    why: string;
    estimatedMarkGain?: string;
    tool: ReviewTool;
  }[];
  encouragement: string;
};

export type ReviewTool =
  | "grade"
  | "practice"
  | "response-structure"
  | "essay-generator"
  | "diagrams"
  | "mcq"
  | "question-bank";

export type ReviewPanelEligibility = {
  eligible: false;
  essayCount: number;
  mcqPaperCount: number;
  essaysNeeded: number;
  mcqPapersNeeded: number;
};

const CLICHE_BAN = `
Every string in this response is read by one real student about their own
work — write like a specific teacher who actually looked at this specific
record, not like a template. Concretely:
- Never use stock phrases: "keep up the good work", "practice makes
  perfect", "room for improvement", "great job", "you're on the right
  track", "don't give up", "believe in yourself", or any close paraphrase
  of them.
- Never write a sentence that would be equally true of a student you'd
  never seen the data for. Every claim must be traceable to a specific
  essay, topic, or number given below.
- Prefer a plain, concrete fact ("your last three essays each lost the
  AO3 marks on the conclusion paragraph") over a vague verdict ("your
  evaluation needs work").
`.trim();

const CONTRACT = `
Return ONLY one JSON object with this exact shape:
{
  "overall_summary": string (3-5 sentences, direct, addressed to the student as "you"),
  "grade_trend": "improving" | "steady" | "declining",
  "grade_projection": {
    "projected_grade": "A*" | "A" | "B" | "C" | "D" | "E" | "U",
    "current_average_percent": number 0-100,
    "target_grade": "A*" | "A" | "B",
    "marks_to_next_grade": string (e.g. "+3 marks on 12-mark evaluation or +2 correct MCQs"),
    "confidence": "high" | "medium" | "emerging"
  },
  "mastery_pillars": [
    { "pillar": "Definitions & Terminology (AO1)", "score": number 0-100, "status": "mastered" | "developing" | "vulnerable", "guidance": string },
    { "pillar": "Causal Mechanism Chains (AO2)", "score": number 0-100, "status": "mastered" | "developing" | "vulnerable", "guidance": string },
    { "pillar": "Evaluative Weighing & Criteria (AO3)", "score": number 0-100, "status": "mastered" | "developing" | "vulnerable", "guidance": string },
    { "pillar": "Diagram Synthesis & Labeling", "score": number 0-100, "status": "mastered" | "developing" | "vulnerable", "guidance": string },
    { "pillar": "MCQ Speed & Distractor Rejection", "score": number 0-100, "status": "mastered" | "developing" | "vulnerable", "guidance": string }
  ],
  "domain_comparison": {
    "micro_avg_percent": number 0-100,
    "macro_avg_percent": number 0-100,
    "stronger_domain": "micro" | "macro" | "balanced",
    "recommendation": string
  },
  "ao_analysis": [
    { "ao": "AO1 Knowledge", "average_percent": number 0-100, "comment": string },
    { "ao": "AO2 Analysis", "average_percent": number 0-100, "comment": string },
    { "ao": "AO3 Evaluation", "average_percent": number 0-100, "comment": string }
  ],
  "key_strengths": [ { "title": string, "detail": string } ] (2-4 items),
  "key_weaknesses": [ { "title": string, "detail": string, "evidence": string } ] (3-5 items),
  "action_plan": [
    { "priority": number starting at 1, "action": string, "why": string, "estimated_mark_gain": string (e.g. "+2 to +4 marks"), "tool": "grade" | "practice" | "response-structure" | "essay-generator" | "diagrams" | "mcq" | "question-bank" }
  ],
  "encouragement": string (1-2 sentences)
}

${CLICHE_BAN}
`.trim();

export const getReviewPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReviewPanelResult | ReviewPanelEligibility> => {
    const { supabase, userId } = context;

    const { data: essayRows, error: essayError } = await supabase
      .from("essays")
      .select("id, question, max_mark, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(ESSAY_WINDOW);
    if (essayError) throw new Error(essayError.message);

    const { count: essayCount, error: countError } = await supabase
      .from("essays")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countError) throw new Error(countError.message);

    const { data: mcqRows, error: mcqError } = await supabase
      .from("mcq_pdf_attempts")
      .select("id, title, level, score, total, questions, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(MCQ_WINDOW);
    if (mcqError) throw new Error(mcqError.message);

    const { count: mcqCount, error: mcqCountError } = await supabase
      .from("mcq_pdf_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("completed_at", "is", null);
    if (mcqCountError) throw new Error(mcqCountError.message);

    const totalEssays = essayCount ?? 0;
    const totalMcqPapers = mcqCount ?? 0;

    // Accessible gating: 3 essays + 1 MCQ paper (or 2 essays if at least 1 MCQ paper is done)
    if (
      totalEssays < 2 ||
      (totalEssays < MIN_ESSAYS_FOR_REVIEW && totalMcqPapers < MIN_MCQ_PAPERS_FOR_REVIEW)
    ) {
      return {
        eligible: false,
        essayCount: totalEssays,
        mcqPaperCount: totalMcqPapers,
        essaysNeeded: Math.max(0, MIN_ESSAYS_FOR_REVIEW - totalEssays),
        mcqPapersNeeded: Math.max(0, MIN_MCQ_PAPERS_FOR_REVIEW - totalMcqPapers),
      };
    }

    const essayIds = (essayRows ?? []).map((row) => row.id);
    const { data: versionRows, error: versionError } = await supabase
      .from("essay_versions")
      .select("essay_id, version, grading, total_mark, created_at")
      .in("essay_id", essayIds.length > 0 ? essayIds : ["00000000-0000-0000-0000-000000000000"])
      .order("version", { ascending: false });
    if (versionError) throw new Error(versionError.message);

    const latestVersionByEssay = new Map<string, (typeof versionRows)[number]>();
    for (const version of versionRows ?? []) {
      if (!latestVersionByEssay.has(version.essay_id)) {
        latestVersionByEssay.set(version.essay_id, version);
      }
    }

    const essaySummaries: EssaySummary[] = (essayRows ?? [])
      .map((essay) => {
        const version = latestVersionByEssay.get(essay.id);
        const grading = version?.grading as Grading | null | undefined;
        if (!grading) return null;
        const summary: EssaySummary = {
          essayId: essay.id,
          question: essay.question,
          maxMark: essay.max_mark,
          totalMark: version?.total_mark ?? grading.total_mark ?? 0,
          band: grading.band ?? "",
          aoBreakdown: grading.ao_breakdown,
          strengths: grading.strengths ?? [],
          weaknesses: grading.weaknesses ?? [],
          missingElements: grading.missing_elements,
          createdAt: essay.updated_at,
        };
        return summary;
      })
      .filter((item): item is EssaySummary => item !== null);

    type StoredPdfQuestion = {
      number: number;
      topic: string;
      correct_answer: "A" | "B" | "C" | "D" | null;
      user_answer: "A" | "B" | "C" | "D" | null;
      correct: boolean | null;
    };

    const mcqTopicStats = new Map<string, { correct: number; total: number }>();
    const gradedMcqQuestions: { topic: string; correct: boolean }[] = [];
    for (const attempt of mcqRows ?? []) {
      const questions = (attempt.questions ?? []) as StoredPdfQuestion[];
      for (const question of questions) {
        if (question.correct === null) continue;
        const entry = mcqTopicStats.get(question.topic) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (question.correct) entry.correct += 1;
        mcqTopicStats.set(question.topic, entry);
        gradedMcqQuestions.push({ topic: question.topic, correct: question.correct });
      }
    }
    const weakTopicsFromData = [...mcqTopicStats.entries()]
      .map(([topic, stats]) => ({
        topic,
        accuracyPercent: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent);

    const mcqDomainBreakdown: DomainStat[] = aggregateMcqDomains(gradedMcqQuestions);

    const essayBlock = essaySummaries
      .map(
        (essay, index) =>
          `Essay ${index + 1} (${essay.totalMark}/${essay.maxMark}, band ${essay.band}):\n` +
          `Question: ${essay.question}\n` +
          `AO1 ${essay.aoBreakdown.knowledge.awarded}/${essay.aoBreakdown.knowledge.out_of}, ` +
          `AO2 ${essay.aoBreakdown.analysis.awarded}/${essay.aoBreakdown.analysis.out_of}, ` +
          `AO3 ${essay.aoBreakdown.evaluation.awarded}/${essay.aoBreakdown.evaluation.out_of}\n` +
          `Strengths: ${essay.strengths.join("; ") || "none recorded"}\n` +
          `Weaknesses: ${essay.weaknesses.join("; ") || "none recorded"}\n` +
          `Missing — definitions: ${essay.missingElements.definitions.join(", ") || "-"}; ` +
          `analysis: ${essay.missingElements.analysis.join(", ") || "-"}; ` +
          `evaluation: ${essay.missingElements.evaluation.join(", ") || "-"}; ` +
          `diagrams: ${essay.missingElements.diagrams.join(", ") || "-"}`,
      )
      .join("\n\n");

    const mcqBlock = (mcqRows ?? [])
      .map(
        (paper, index) =>
          `MCQ paper ${index + 1}: ${paper.score ?? 0}/${paper.total ?? 0} (${paper.level ?? "level unset"})`,
      )
      .join("\n");

    const topicBlock = weakTopicsFromData
      .map((entry) => `${entry.topic}: ${entry.accuracyPercent}% correct`)
      .join("\n");

    const domainBlock = mcqDomainBreakdown
      .map(
        (entry) =>
          `${MCQ_DOMAIN_LABEL[entry.domain]}: ${entry.correct}/${entry.attempted} correct (${entry.accuracyPct}%)`,
      )
      .join("\n");

    // Compute empirical average percentage from essays & MCQs
    let totalScore = 0;
    let totalMax = 0;
    essaySummaries.forEach((e) => {
      totalScore += e.totalMark;
      totalMax += e.maxMark;
    });
    (mcqRows ?? []).forEach((m) => {
      totalScore += m.score ?? 0;
      totalMax += m.total ?? 0;
    });
    const empiricalPercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 65;

    const systemPrompt = [
      "You are the senior Cambridge International 0455 Economics principal examiner reviewing a candidate's",
      "full academic diagnostic portfolio — essays AND MCQ papers together — to write a holistic diagnostic assessment.",
      "",
      "Calibrate according to official Cambridge 0455 grade thresholds:",
      "- A* >= 80%, A >= 70%, B >= 60%, C >= 50%, D >= 40%, E >= 35%, U < 35%.",
      "Provide actionable advice across the 5 core pillars of Cambridge economics (Definitions, Causal chains,",
      "Evaluation weighing, Diagram synthesis, and MCQ distractor rejection).",
      "",
      CONTRACT,
    ].join("\n");

    const userMessage = [
      `=== Essays (${essaySummaries.length} most recent, latest draft of each) ===`,
      essayBlock || "No graded essays with recorded feedback.",
      "",
      `=== MCQ papers (${(mcqRows ?? []).length} most recent) ===`,
      mcqBlock || "No completed MCQ papers.",
      "",
      "=== Per-topic MCQ accuracy across all recent papers ===",
      topicBlock || "No topic data.",
      "",
      "=== MCQ accuracy by section (micro vs macro), across all recent papers ===",
      domainBlock || "No section data.",
    ].join("\n");

    const result = await chat({
      model: MODEL_ANALYSIS,
      temperature: 0.2,
      json: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = extractFirstJsonObject(result.text);

    const aoAnalysisRaw = Array.isArray(raw.ao_analysis) ? raw.ao_analysis : [];
    const aoAnalysis = (["AO1 Knowledge", "AO2 Analysis", "AO3 Evaluation"] as const).map(
      (label) => {
        const match = aoAnalysisRaw.find(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object" && (item as Record<string, unknown>).ao === label,
        );
        return {
          ao: label,
          averagePercent: Math.max(
            0,
            Math.min(100, Number((match?.average_percent as number) ?? 0) || 0),
          ),
          comment: typeof match?.comment === "string" ? match.comment : "",
        };
      },
    );

    const keyStrengths = Array.isArray(raw.key_strengths)
      ? raw.key_strengths
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => ({
            title: String(item.title ?? "").trim(),
            detail: String(item.detail ?? "").trim(),
          }))
          .filter((item) => item.title.length > 0)
      : [];

    const keyWeaknesses = Array.isArray(raw.key_weaknesses)
      ? raw.key_weaknesses
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => ({
            title: String(item.title ?? "").trim(),
            detail: String(item.detail ?? "").trim(),
            evidence: String(item.evidence ?? "").trim(),
          }))
          .filter((item) => item.title.length > 0)
      : [];

    const VALID_TOOLS: ReviewTool[] = [
      "grade",
      "practice",
      "response-structure",
      "essay-generator",
      "diagrams",
      "mcq",
      "question-bank",
    ];
    const actionPlan = Array.isArray(raw.action_plan)
      ? raw.action_plan
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item, index) => ({
            priority: Number(item.priority) || index + 1,
            action: String(item.action ?? "").trim(),
            why: String(item.why ?? "").trim(),
            estimatedMarkGain:
              typeof item.estimated_mark_gain === "string" ? item.estimated_mark_gain : undefined,
            tool: (VALID_TOOLS.includes(item.tool as ReviewTool)
              ? item.tool
              : "practice") as ReviewTool,
          }))
          .filter((item) => item.action.length > 0)
          .sort((a, b) => a.priority - b.priority)
      : [];

    const gradeTrend: ReviewPanelResult["gradeTrend"] =
      raw.grade_trend === "improving" || raw.grade_trend === "declining"
        ? raw.grade_trend
        : raw.grade_trend === "steady"
          ? "steady"
          : "not enough data";

    // Build Grade Projection with defaults
    const rawProj = (raw.grade_projection ?? {}) as Record<string, unknown>;
    const projectedGrade = (
      ["A*", "A", "B", "C", "D", "E", "U"].includes(String(rawProj.projected_grade))
        ? rawProj.projected_grade
        : empiricalPercent >= 80
          ? "A*"
          : empiricalPercent >= 70
            ? "A"
            : empiricalPercent >= 60
              ? "B"
              : empiricalPercent >= 50
                ? "C"
                : empiricalPercent >= 40
                  ? "D"
                  : "E"
    ) as GradeProjection["projectedGrade"];

    const gradeProjection: GradeProjection = {
      projectedGrade,
      currentAveragePercent: Number(rawProj.current_average_percent) || empiricalPercent,
      targetGrade: projectedGrade === "A*" ? "A*" : projectedGrade === "A" ? "A*" : "A",
      marksToNextGrade:
        typeof rawProj.marks_to_next_grade === "string" && rawProj.marks_to_next_grade.length > 0
          ? rawProj.marks_to_next_grade
          : "+2 marks on 12-mark evaluation or +2 correct MCQs",
      confidence: totalEssays >= 5 ? "high" : totalEssays >= 3 ? "medium" : "emerging",
    };

    // Build 5 Mastery Pillars
    const defaultPillars: MasteryPillar[] = [
      {
        pillar: "Definitions & Terminology (AO1)",
        score: Math.min(100, Math.max(30, empiricalPercent + 5)),
        status: empiricalPercent >= 70 ? "mastered" : "developing",
        guidance: "Define terms in syllabus wording in the opening sentence of each paragraph.",
      },
      {
        pillar: "Causal Mechanism Chains (AO2)",
        score: Math.min(100, Math.max(30, empiricalPercent - 2)),
        status:
          empiricalPercent >= 75
            ? "mastered"
            : empiricalPercent >= 55
              ? "developing"
              : "vulnerable",
        guidance: "Ensure no missing links between policy cause and final economic outcome.",
      },
      {
        pillar: "Evaluative Weighing & Criteria (AO3)",
        score: Math.min(100, Math.max(25, empiricalPercent - 8)),
        status:
          empiricalPercent >= 80
            ? "mastered"
            : empiricalPercent >= 60
              ? "developing"
              : "vulnerable",
        guidance:
          "Use stated criteria (elasticity, magnitude, time) to weigh which effect dominates.",
      },
      {
        pillar: "Diagram Synthesis & Labeling",
        score: Math.min(100, Math.max(30, empiricalPercent + 2)),
        status: empiricalPercent >= 70 ? "mastered" : "developing",
        guidance: "Accurately label axes and reference curve shifts within the body text.",
      },
      {
        pillar: "MCQ Speed & Distractor Rejection",
        score: Math.min(100, Math.max(30, empiricalPercent)),
        status: empiricalPercent >= 70 ? "mastered" : "developing",
        guidance: "Eliminate distractors by testing economic mechanisms rather than intuition.",
      },
    ];

    const rawPillars = Array.isArray(raw.mastery_pillars) ? raw.mastery_pillars : [];
    const masteryPillars: MasteryPillar[] = defaultPillars.map((def) => {
      const match = rawPillars.find(
        (p): p is Record<string, unknown> =>
          !!p &&
          typeof p === "object" &&
          String(p.pillar).toLowerCase().includes(def.pillar.slice(0, 8).toLowerCase()),
      );
      if (!match) return def;
      return {
        pillar: def.pillar,
        score: Math.max(0, Math.min(100, Number(match.score) || def.score)),
        status: (["mastered", "developing", "vulnerable"].includes(String(match.status))
          ? match.status
          : def.status) as MasteryPillar["status"],
        guidance: typeof match.guidance === "string" ? match.guidance : def.guidance,
      };
    });

    // Domain comparison
    const microStat = mcqDomainBreakdown.find((d) => d.domain === "micro");
    const macroStat = mcqDomainBreakdown.find((d) => d.domain === "macro");
    const rawDom = (raw.domain_comparison ?? {}) as Record<string, unknown>;
    const domainComparison: DomainComparison = {
      microAvgPercent:
        microStat?.accuracyPct ?? (Number(rawDom.micro_avg_percent) || empiricalPercent),
      macroAvgPercent:
        macroStat?.accuracyPct ?? (Number(rawDom.macro_avg_percent) || empiricalPercent),
      strongerDomain: (["micro", "macro", "balanced"].includes(String(rawDom.stronger_domain))
        ? rawDom.stronger_domain
        : (microStat?.accuracyPct ?? 0) > (macroStat?.accuracyPct ?? 0) + 10
          ? "micro"
          : (macroStat?.accuracyPct ?? 0) > (microStat?.accuracyPct ?? 0) + 10
            ? "macro"
            : "balanced") as DomainComparison["strongerDomain"],
      recommendation:
        typeof rawDom.recommendation === "string" && rawDom.recommendation.length > 0
          ? rawDom.recommendation
          : "Keep micro and macro practice balanced across papers.",
    };

    return {
      eligible: true,
      sampleLevel: totalEssays >= 5 && totalMcqPapers >= 2 ? "comprehensive" : "diagnostic",
      essayCount: totalEssays,
      mcqPaperCount: totalMcqPapers,
      generatedAt: new Date().toISOString(),
      overallSummary: String(raw.overall_summary ?? "").trim(),
      gradeTrend,
      gradeProjection,
      masteryPillars,
      domainComparison,
      aoAnalysis,
      keyStrengths,
      keyWeaknesses,
      weakMcqTopics: weakTopicsFromData.slice(0, 6),
      mcqDomainBreakdown,
      actionPlan,
      encouragement: String(raw.encouragement ?? "").trim(),
    };
  });

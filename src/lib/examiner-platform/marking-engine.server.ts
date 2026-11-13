import { chat } from "../ai.server";
import { MODEL_EXAMINER, renderAoDefinitions } from "../examiner/config";
import type { CambridgeQuestionSpec } from "./cambridge-papers";
import type { QuestionMarkRecord, AoBreakdown, DiagramEvaluation, VerificationFlag } from "./types";

export type QuestionMarkInput = {
  question: CambridgeQuestionSpec;
  studentAnswerText: string;
  candidateCode?: string;
};

const MARKING_SYSTEM_PROMPT = `You are an official Cambridge IGCSE Economics (0455) Assistant Principal Examiner.
You are evaluating a candidate's actual examination response to propose marks for teacher review.

CAMBRIDGE 0455 ASSESSMENT OBJECTIVES (SINGLE SOURCE OF TRUTH):
${renderAoDefinitions()}

CRITICAL INSTRUCTIONS:
1. Mark strictly against the official question-specific mark scheme criteria provided.
2. Award marks supported by concrete evidence in the candidate's actual written prose or drawn diagrams.
3. Accept valid alternative economic reasoning where theoretically sound under Cambridge IGCSE 0455.
4. Assess diagrams rigorously: verify axes labels, curve labels, direction of shifts, equilibrium points, and labels.
5. Respect mark caps: NEVER award more than the maximum allocated for any Assessment Objective (AO).
6. Total mark MUST equal exactly the sum of AO1 awarded + AO2 awarded + AO3 awarded.
7. Explain each mark awarded and each withheld mark constructively with clear examiner rationale.
8. Quote exact snippets from the student's text as supporting evidence.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN FENCES):
{
  "total_mark": <integer, sum of AO1+AO2+AO3>,
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": <int>, "comment": "<reasoning>" },
    "analysis": { "awarded": <int>, "out_of": <int>, "comment": "<reasoning>" },
    "evaluation": { "awarded": <int>, "out_of": <int>, "comment": "<reasoning>" }
  },
  "marking_rationale": "<comprehensive examiner paragraph explaining the mark>",
  "evidence_quotes": ["<direct verbatim quote from candidate response>", "..."],
  "missing_elements": ["<concept or step missing to reach full marks>", "..."],
  "diagram_evaluation": {
    "detected": <true or false>,
    "name": "<name of diagram>",
    "axes_labelled_correctly": <true or false>,
    "curves_drawn_correctly": <true or false>,
    "shift_direction_correct": <true or false>,
    "equilibrium_labelled": <true or false>,
    "examiner_comment": "<assessment of diagram accuracy>",
    "marks_awarded_for_diagram": <int>
  }
}`;

export async function markQuestionResponse(
  input: QuestionMarkInput,
): Promise<Omit<QuestionMarkRecord, "id" | "script_id" | "created_at" | "updated_at">> {
  const { question, studentAnswerText } = input;

  const promptContent = `
QUESTION:
Number: ${question.number}
Question Text: ${question.title}
Max Marks: ${question.maxMark}
Tariff: AO1 (Knowledge): ${question.tariff.ao1}, AO2 (Analysis): ${question.tariff.ao2}, AO3 (Evaluation): ${question.tariff.ao3}
Diagram Expected: ${question.hasDiagramRequirement ? "Yes (Diagram required or credited)" : "Optional/Not required"}

OFFICIAL CAMBRIDGE 0455 MARK SCHEME:
${question.markingGuide}

CANDIDATE TRANSCRIBED RESPONSE:
"""
${studentAnswerText || "[Candidate left this question blank]"}
"""
`.trim();

  // If candidate left it blank
  if (!studentAnswerText || studentAnswerText.trim().length < 5) {
    return {
      question_number: question.number,
      question_title: question.title,
      max_mark: question.maxMark,
      ai_awarded_mark: 0,
      teacher_approved_mark: null,
      moderated_mark: null,
      is_disagreement: false,
      ao_breakdown: {
        knowledge: { awarded: 0, out_of: question.tariff.ao1, comment: "No attempt made." },
        analysis: { awarded: 0, out_of: question.tariff.ao2, comment: "No attempt made." },
        evaluation: { awarded: 0, out_of: question.tariff.ao3, comment: "No attempt made." },
      },
      marking_rationale: "Candidate provided no substantive response for this question (0 marks).",
      evidence_quotes: [],
      missing_elements: ["Complete response required."],
      diagram_detected: false,
      diagram_evaluation: null,
      verification_flags: [
        {
          id: "blank-response",
          severity: "info",
          category: "evidence_gap",
          message: "Question appears unanswered or blank.",
        },
      ],
      transcription_snippet: "",
      teacher_feedback_note: null,
      is_approved: false,
    };
  }

  try {
    const response = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      messages: [
        { role: "system", content: MARKING_SYSTEM_PROMPT },
        { role: "user", content: promptContent },
      ],
      maxCompletionTokens: 1500,
    });

    let data: any = {};
    try {
      data = JSON.parse(response.text);
    } catch {
      // Fallback parser
      data = {};
    }

    const rawBreakdown = data.ao_breakdown || {};
    const safeKnowledge = Math.min(
      question.tariff.ao1,
      Math.max(0, Number(rawBreakdown.knowledge?.awarded ?? 0)),
    );
    const safeAnalysis = Math.min(
      question.tariff.ao2,
      Math.max(0, Number(rawBreakdown.analysis?.awarded ?? 0)),
    );
    const safeEvaluation = Math.min(
      question.tariff.ao3,
      Math.max(0, Number(rawBreakdown.evaluation?.awarded ?? 0)),
    );

    // Enforce mathematical invariant: total = sum of parts
    const totalMark = Math.min(
      question.maxMark,
      safeKnowledge + safeAnalysis + safeEvaluation,
    );

    const aoBreakdown: AoBreakdown = {
      knowledge: {
        awarded: safeKnowledge,
        out_of: question.tariff.ao1,
        comment: rawBreakdown.knowledge?.comment || undefined,
      },
      analysis: {
        awarded: safeAnalysis,
        out_of: question.tariff.ao2,
        comment: rawBreakdown.analysis?.comment || undefined,
      },
      evaluation: {
        awarded: safeEvaluation,
        out_of: question.tariff.ao3,
        comment: rawBreakdown.evaluation?.comment || undefined,
      },
    };

    const diagramEval: DiagramEvaluation | null = data.diagram_evaluation
      ? {
          detected: Boolean(data.diagram_evaluation.detected),
          name: data.diagram_evaluation.name,
          axes_labelled_correctly: Boolean(data.diagram_evaluation.axes_labelled_correctly),
          curves_drawn_correctly: Boolean(data.diagram_evaluation.curves_drawn_correctly),
          shift_direction_correct: Boolean(data.diagram_evaluation.shift_direction_correct),
          equilibrium_labelled: Boolean(data.diagram_evaluation.equilibrium_labelled),
          examiner_comment: String(data.diagram_evaluation.examiner_comment || ""),
          marks_awarded_for_diagram: Number(data.diagram_evaluation.marks_awarded_for_diagram || 0),
        }
      : null;

    const verificationFlags: VerificationFlag[] = [];
    if (question.hasDiagramRequirement && (!diagramEval || !diagramEval.detected)) {
      verificationFlags.push({
        id: "missing-diagram",
        severity: "warning",
        category: "diagram_check",
        message: "Question syllabus guidelines expect a diagram, but none was detected in the script.",
      });
    }

    return {
      question_number: question.number,
      question_title: question.title,
      max_mark: question.maxMark,
      ai_awarded_mark: totalMark,
      teacher_approved_mark: null,
      moderated_mark: null,
      is_disagreement: false,
      ao_breakdown: aoBreakdown,
      marking_rationale:
        data.marking_rationale ||
        `Awarded ${totalMark}/${question.maxMark} marks based on Cambridge 0455 mark scheme analysis.`,
      evidence_quotes: Array.isArray(data.evidence_quotes) ? data.evidence_quotes : [],
      missing_elements: Array.isArray(data.missing_elements) ? data.missing_elements : [],
      diagram_detected: Boolean(diagramEval?.detected),
      diagram_evaluation: diagramEval,
      verification_flags: verificationFlags,
      transcription_snippet: studentAnswerText.slice(0, 300) + (studentAnswerText.length > 300 ? "..." : ""),
      teacher_feedback_note: null,
      is_approved: false,
    };
  } catch (error: any) {
    // Graceful fallback for unexpected provider issues
    return {
      question_number: question.number,
      question_title: question.title,
      max_mark: question.maxMark,
      ai_awarded_mark: 0,
      teacher_approved_mark: null,
      moderated_mark: null,
      is_disagreement: false,
      ao_breakdown: {
        knowledge: { awarded: 0, out_of: question.tariff.ao1 },
        analysis: { awarded: 0, out_of: question.tariff.ao2 },
        evaluation: { awarded: 0, out_of: question.tariff.ao3 },
      },
      marking_rationale: "Marking could not be completed automatically. Teacher review required.",
      evidence_quotes: [],
      missing_elements: [],
      diagram_detected: false,
      diagram_evaluation: null,
      verification_flags: [
        {
          id: "marking-timeout",
          severity: "caution",
          category: "evidence_gap",
          message: error?.message || "Marking engine encountered an error.",
        },
      ],
      transcription_snippet: studentAnswerText.slice(0, 300),
      teacher_feedback_note: null,
      is_approved: false,
    };
  }
}

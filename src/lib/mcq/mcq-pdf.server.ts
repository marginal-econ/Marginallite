/**
 * Marginalite MCQ Live — practice straight off an uploaded past paper.
 *
 * Real Cambridge IGCSE Economics (0455) Paper 1 multiple-choice practice.
 *
 * AI is used for two assistive (not generative) things only:
 *   classifyPdfMcqTopics — tags each question against the real 0455
 *   syllabus sections so it can feed the same "where you're losing marks"
 *   feedback as the rest of the app. Text-only, cheap, one call per paper.
 *
 *   explainPdfMcqAnswer — after marking, a short written explanation of
 *   why the correct option is right for one question the student got
 *   wrong (or wants to review) — text-only, generated on demand per
 *   question, never used to grade.
 */
import { chat, visionChat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";
import { classifyMcqQuestion } from "../mcq-domain";
import { MCQ_MISTAKE_META_MAP, type McqMistakeType } from "../mcq-mistakes";
import { cleanStars } from "../utils";
import { formatThreeLineMcqFeedback } from "./mcq-feedback-format";
import { IGCSE_0455_SECTIONS } from "./mcq.server";

export type PdfMcqEra = "legacy" | "2027";

/** One row as read straight off `mcq_pdf_attempts` — the minimum needed to group attempts by paper. */
export type PdfAttemptRow = {
  id: string;
  title: string;
  level: string;
  paper_id: string | null;
  score: number | null;
  total: number;
  completed_at: string | null;
  created_at: string;
};

/**
 * One row per *paper* a student has practiced, not one row per attempt —
 * retaking the same library paper collapses into a single history entry
 * instead of flooding the sidebar with duplicates.
 */
export type PaperHistoryEntry = {
  paperId: string | null;
  title: string;
  level: string;
  attemptsCount: number;
  aggregateAttemptId: string;
  aggregateScore: number | null;
  aggregateTotal: number;
  aggregateAt: string;
  latestAttemptId: string;
  latestScore: number | null;
  latestTotal: number;
  latestAt: string;
};

/** Groups completed attempt rows into one history entry per paper, first-attempt-counts. */
export function groupPdfAttemptsByPaper(rows: PdfAttemptRow[]): PaperHistoryEntry[] {
  const completed = rows
    .filter((r) => r.completed_at)
    .slice()
    .sort((a, b) => (a.completed_at! < b.completed_at! ? -1 : 1));

  const byKey = new Map<string, PdfAttemptRow[]>();
  for (const row of completed) {
    const key = row.paper_id ?? `solo:${row.id}`;
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }

  const entries: PaperHistoryEntry[] = [];
  for (const [key, attempts] of byKey) {
    const first = attempts[0];
    const latest = attempts[attempts.length - 1];
    entries.push({
      paperId: key.startsWith("solo:") ? null : key,
      title: latest.title,
      level: latest.level,
      attemptsCount: attempts.length,
      aggregateAttemptId: first.id,
      aggregateScore: first.score,
      aggregateTotal: first.total,
      aggregateAt: first.completed_at!,
      latestAttemptId: latest.id,
      latestScore: latest.score,
      latestTotal: latest.total,
      latestAt: latest.completed_at!,
    });
  }

  return entries.sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1));
}

export type TopicTag = {
  number: number;
  topic: string;
  skill: "knowledge" | "application" | "analysis";
};

/** Tags each question against the real syllabus sections — classification, not generation. */
export async function classifyPdfMcqTopics(options: {
  level?: string;
  items: { number: number; text: string }[];
}): Promise<TopicTag[]> {
  if (!options?.items || options.items.length === 0) return [];
  const sections = IGCSE_0455_SECTIONS;

  const systemPrompt = [
    "You are tagging real Cambridge IGCSE Economics (0455) Paper 1 Multiple Choice exam",
    "questions against the official syllabus, for a student's topic-level feedback report.",
    "Do not answer, rewrite, or invent any question content — only classify what is given.",
    "",
    "Syllabus units to choose from (use the closest match; do not invent new ones):",
    sections.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  ].join("\n");

  const userMessage = [
    "Question text was extracted from a real PDF, so it may include the option list run",
    "together with the stem, stray line breaks, or minor OCR noise — classify from what's legible.",
    "",
    "Questions:",
    options.items.map((it) => `#${it.number}: ${it.text.slice(0, 600)}`).join("\n\n"),
    "",
    'Return ONLY one JSON object: { "tags": [ { "number": number, "topic": string, "skill": "knowledge" | "application" | "analysis" } ] }',
    "topic must be a short syllabus topic name drawn from the units above (not the full sentence).",
  ].join("\n");

  const result = await chat({
    model: MODEL_EXAMINER,
    temperature: 0,
    json: true,
    reasoningEffort: "low",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = extractFirstJsonObject(result.text);
  const tags = Array.isArray(parsed.tags) ? (parsed.tags as unknown[]) : [];

  return tags
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const row = t as Record<string, unknown>;
      const number = Number(row.number);
      if (!Number.isFinite(number)) return null;
      const skill =
        row.skill === "application" || row.skill === "analysis" ? row.skill : "knowledge";
      return {
        number,
        topic: typeof row.topic === "string" && row.topic.trim() ? row.topic.trim() : "Untagged",
        skill,
      } satisfies TopicTag;
    })
    .filter((t): t is TopicTag => t !== null);
}

export type McqDiagnostic = {
  concept: string;
  keyRule: string;
  correctReasoning: string;
  distractorTrap: string;
  speedTip: string;
};

export type McqExplanationResult = {
  text: string;
  diagnostic?: McqDiagnostic;
};

const inMemoryExplanationCache = new Map<string, McqExplanationResult>();

/**
 * Retrieves all stored explanations for a paper (from database & cache)
 * so students don't experience any waiting when practicing in Tutor Mode.
 */
export async function getStoredPaperExplanationsServer(
  paperId: string,
): Promise<Record<number, McqExplanationResult>> {
  const result: Record<number, McqExplanationResult> = {};

  // 1. Pull from in-memory cache for this paper
  const prefix = `${paperId}:`;
  for (const [key, val] of inMemoryExplanationCache.entries()) {
    if (key.startsWith(prefix)) {
      const qNum = parseInt(key.slice(prefix.length), 10);
      if (Number.isFinite(qNum)) {
        result[qNum] = val;
      }
    }
  }

  // 2. If it's a UUID paper from the library, pull from overlay.explanations in mcq_pdf_papers
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);
  if (isUuid) {
    try {
      const { data, error } = await supabaseAdmin
        .from("mcq_pdf_papers")
        .select("overlay")
        .eq("id", paperId)
        .maybeSingle();

      if (!error && data?.overlay) {
        const dbExplanations = (data.overlay as Record<string, any>)?.explanations;
        if (dbExplanations && typeof dbExplanations === "object") {
          for (const [numStr, expl] of Object.entries(dbExplanations)) {
            const qNum = parseInt(numStr, 10);
            if (Number.isFinite(qNum) && expl && typeof expl === "object") {
              result[qNum] = expl as McqExplanationResult;
              inMemoryExplanationCache.set(`${paperId}:${qNum}`, expl as McqExplanationResult);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch stored explanations from mcq_pdf_papers:", err);
    }
  } else {
    // 3. If it's a topical paper, check if its source past papers have stored explanations
    try {
      const { getTopicalPaperById } = await import("../topical-mcq-papers");
      const topical = getTopicalPaperById(paperId);
      if (topical) {
        const sourceTitles = Array.from(
          new Set(topical.questions.map((q) => q.sourcePaperTitle).filter(Boolean)),
        );
        if (sourceTitles.length > 0) {
          const { data: sourcePapers } = await supabaseAdmin
            .from("mcq_pdf_papers")
            .select("title, overlay")
            .in("title", sourceTitles);

          if (sourcePapers) {
            const byTitle = new Map(sourcePapers.map((p) => [p.title, p]));
            for (const q of topical.questions) {
              const sp = byTitle.get(q.sourcePaperTitle);
              const spExpls = (sp?.overlay as any)?.explanations;
              const spExpl = spExpls?.[String(q.originalQuestionNumber)];
              if (spExpl && !result[q.number]) {
                result[q.number] = spExpl as McqExplanationResult;
                inMemoryExplanationCache.set(`${paperId}:${q.number}`, spExpl as McqExplanationResult);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to map topical paper explanations:", err);
    }
  }

  return result;
}

/**
 * Persists an explanation to the in-memory cache and directly into Supabase (mcq_pdf_papers.overlay)
 * so it is stored beforehand and accessible instantly to every student.
 */
export async function savePaperExplanationServer(
  paperId: string,
  number: number,
  explanation: McqExplanationResult,
): Promise<void> {
  // Store in in-memory cache immediately
  inMemoryExplanationCache.set(`${paperId}:${number}`, explanation);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);
  if (isUuid) {
    try {
      const { data } = await supabaseAdmin
        .from("mcq_pdf_papers")
        .select("id, overlay")
        .eq("id", paperId)
        .maybeSingle();

      if (data) {
        const currentOverlay = ((data.overlay as any) ?? {}) as Record<string, any>;
        const currentExplanations = (currentOverlay.explanations ?? {}) as Record<string, any>;
        currentExplanations[String(number)] = explanation;
        await supabaseAdmin
          .from("mcq_pdf_papers")
          .update({
            overlay: {
              ...currentOverlay,
              explanations: currentExplanations,
            },
          })
          .eq("id", paperId);
      }
    } catch (err) {
      console.warn("Failed to save explanation to mcq_pdf_papers:", err);
    }
  }
}

/**
 * Advanced examiner explanation of why one question's mark-scheme answer is
 * correct, generated on demand when a student opens a question in the
 * post-attempt review. Produces structured Cambridge 0455 diagnostic data
 * (concept, key rule, worked derivation, distractor trap analysis, speed tip).
 */
export async function explainPdfMcqAnswer(options: {
  paperId?: string | null;
  level?: "igcse" | "as" | "a2" | string;
  number: number;
  stemText: string;
  correctAnswer: "A" | "B" | "C" | "D";
  userAnswer: "A" | "B" | "C" | "D" | null;
  topic?: string;
  subtopic?: string;
  mistakeType?: McqMistakeType | null;
  questionImageDataUrl?: string | null;
  userId?: string | null;
}): Promise<McqExplanationResult> {
  const {
    paperId,
    level,
    number,
    stemText,
    correctAnswer,
    userAnswer,
    topic,
    subtopic,
    mistakeType,
    questionImageDataUrl,
    userId,
  } = options;

  // If paperId is provided and no mistakeType override is requested, check if we already have the stored explanation!
  if (paperId && !mistakeType) {
    const memoryHit = inMemoryExplanationCache.get(`${paperId}:${number}`);
    if (memoryHit) {
      return memoryHit;
    }
    const stored = await getStoredPaperExplanationsServer(paperId);
    if (stored[number]) {
      return stored[number];
    }
  }
  const inferred = classifyMcqQuestion({
    level: "AS",
    number,
    text: stemText,
    existingTopic: topic,
    existingSubtopic: subtopic,
  });

  const mistakeMeta = mistakeType ? MCQ_MISTAKE_META_MAP[mistakeType] : null;
  const hasImage =
    typeof questionImageDataUrl === "string" &&
    questionImageDataUrl.startsWith("data:image/");
  const isStudentCorrect = userAnswer !== null && userAnswer === correctAnswer;

  const systemPrompt = [
    "You are a Cambridge International IGCSE Economics (0455) Principal Examiner",
    `(${"Paper 1 Multiple Choice"}) delivering a strictly accurate, 3-line diagnostic breakdown for a past paper multiple-choice question.`,
    "",
    "CRITICAL CONSTRAINT - ULTRA-CONCISE 3 LINES (CANNOT EXCEED 3 LINES):",
    "High school students will not read long, grueling essays. Your entire explanation MUST NOT EXCEED 3 LINES.",
    "Keep it ultra-concise, teenage-accessible, razor-sharp, and 100% pitch-accurate to Cambridge 0455 conventions:",
    `1. correctReasoning: Exactly ONE short, punchy sentence (max 16 words, under 100 chars) stating why Option ${correctAnswer} is correct.`,
    isStudentCorrect
      ? `2. distractorTrap: Exactly ONE short sentence (max 15 words, under 95 chars) diagnosing the top tempting distractor trap avoided.`
      : userAnswer
        ? `2. distractorTrap: Exactly ONE short sentence (max 15 words, under 95 chars) diagnosing why Option ${userAnswer} fails.`
        : "2. distractorTrap: Exactly ONE short sentence (max 15 words, under 95 chars) diagnosing the main distractor trap.",
    "3. keyRule: Exactly ONE punchy Cambridge golden rule or formula takeaway (max 12 words, under 85 chars).",
    "",
    "STRICT ACCURACY & GROUNDING RULES:",
    hasImage
      ? "1. READ THE ATTACHED OFFICIAL PDF IMAGE FIRST. Inspect EVERY word of the stem, ALL axis labels, curve labels (e.g. D1->D2, S1->S2, AD/AS, PPC), shaded areas, table numbers, and the EXACT wording of Options A, B, C, and D directly from the image. If the OCR text excerpt below is incomplete or garbled, TRUST THE PDF IMAGE 100%."
      : "1. Base your explanation strictly on the exact question stem and options provided. Never invent numbers, curve labels, or statements that do not appear in the question.",
    `2. The official Cambridge 0455 mark scheme answer is Option ${correctAnswer}. Never contradict the mark scheme; prove rigorously why Option ${correctAnswer} is uniquely true under Cambridge 0455 conventions.`,
    "3. NO ASTERISKS: Never use asterisks (* or **) anywhere in any JSON string. Do not use markdown bold, italics, or asterisk bullets. Return plain text only.",
    "4. LENGTH: Keep each of the 3 fields to 1 single concise sentence (under 12-16 words each, max 100 characters).",
    "",
    "Return ONLY a single valid JSON object (no markdown fences, no commentary outside JSON) with these exact keys:",
    '- "concept": exact Cambridge IGCSE 0455 syllabus unit & specific concept tested (short phrase)',
    `- "correctReasoning": exactly ONE ultra-concise sentence (max 16 words) proving why Option ${correctAnswer} is correct`,
    '- "distractorTrap": exactly ONE ultra-concise sentence (max 15 words) explaining the trap / why the wrong option fails',
    '- "keyRule": exactly ONE ultra-concise sentence (max 12 words) with the Cambridge rule or takeaway formula',
    '- "speedTip": optional short elimination tip (max 12 words)',
    '- "summary": exactly 3 lines combining the 3 points above separated by newline',
  ].join("\n");

  const userMessage = [
    `Official Cambridge IGCSE 0455 Question ${number} (${"IGCSE Paper 1"}):`,
    hasImage
      ? "(High-resolution official PDF image of Question " +
        number +
        " is attached — read the exact stem, diagrams, tables, and Options A–D directly from the image.)"
      : "",
    stemText.trim()
      ? `Extracted PDF text reference (use only to assist; trust the attached PDF image if any diagram/table differs):\n${stemText.trim().slice(0, 1600)}`
      : hasImage
        ? "(No PDF text layer extracted — read the entire question directly from the attached PDF image.)"
        : `(Full diagram/stem text not captured — explain based on Cambridge IGCSE 0455 Question ${number} in ${inferred.unit}: ${inferred.topic} / ${inferred.subtopic} and why Option ${correctAnswer} is the mark scheme answer)`,
    "",
    `Rough syllabus hint (override if image shows a different topic): ${inferred.unit} — ${inferred.topic} / ${inferred.subtopic}`,
    `Official Cambridge mark scheme answer: Option ${correctAnswer}`,
    userAnswer
      ? `Student selected: Option ${userAnswer} (${isStudentCorrect ? "CORRECT" : "INCORRECT"})`
      : "Student left this question unattempted.",
    mistakeMeta && !isStudentCorrect
      ? `Student self-diagnosed mistake type: ${mistakeMeta.label} (${mistakeMeta.tagline}). Tailor distractorTrap and speedTip to directly repair this exact error pattern.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let resultText = "";
  let visionGrounded = false;

  if (hasImage) {
    try {
      const visionRes = await visionChat({
        model: MODEL_EXAMINER,
        systemPrompt,
        prompt: userMessage,
        imageDataUrls: [questionImageDataUrl],
        maxCompletionTokens: 700,
        userId: userId ?? null,
        feature: "mcq_explain_vision",
      });
      if (visionRes.text && visionRes.text.trim().length > 20) {
        resultText = visionRes.text;
        visionGrounded = true;
      }
    } catch (visionErr) {
      console.warn(
        `Vision MCQ explanation failed for Q${number}, falling back to text chat:`,
        visionErr instanceof Error ? visionErr.message : visionErr,
      );
    }
  }

  if (!resultText) {
    const result = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      reasoningEffort: "low",
      maxCompletionTokens: 600,
      userId: userId ?? null,
      feature: "mcq_explain_text",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    resultText = result.text;
  }

  const parsed = extractFirstJsonObject(resultText);
  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    const summary = typeof p.summary === "string" && p.summary.trim() ? p.summary.trim() : "";
    const correctReasoning =
      typeof p.correctReasoning === "string" ? p.correctReasoning.trim() : "";
    const distractorTrap =
      typeof p.distractorTrap === "string" ? p.distractorTrap.trim() : "";
    const keyRule =
      typeof p.keyRule === "string" ? p.keyRule.trim() : "";
    const speedTip =
      typeof p.speedTip === "string" ? p.speedTip.trim() : "";

    const rawDiagnostic: McqDiagnostic = {
      concept:
        typeof p.concept === "string" && p.concept.trim()
          ? p.concept.trim()
          : `${inferred.unit}: ${inferred.subtopic}`,
      keyRule,
      correctReasoning: correctReasoning || summary,
      distractorTrap,
      speedTip,
    };

    // Guarantee the explanation is strictly at most 3 concise, pitch-accurate lines
    const formatted = formatThreeLineMcqFeedback({
      explanation: { diagnostic: rawDiagnostic, text: summary },
      correctAnswer,
      userAnswer,
      isCorrect: isStudentCorrect,
      topic: inferred.topic,
      subtopic: inferred.subtopic,
      unit: inferred.unit,
      mistakeType,
    });

    const diagnostic: McqDiagnostic = {
      concept: formatted.concept ?? rawDiagnostic.concept,
      keyRule: formatted.line3.text,
      correctReasoning: formatted.line1.text,
      distractorTrap: formatted.line2.text,
      speedTip: speedTip ? cleanStars(speedTip) : formatted.line3.text,
    };

    const finalResult = cleanStars({
      text: formatted.plainText,
      diagnostic,
      visionGrounded,
    });
    if (paperId && !mistakeType) {
      await savePaperExplanationServer(paperId, number, finalResult).catch(() => {});
    }
    return finalResult;
  }

  const fallbackFormatted = formatThreeLineMcqFeedback({
    explanation: resultText.trim(),
    correctAnswer,
    userAnswer,
    isCorrect: isStudentCorrect,
    topic: inferred.topic,
    subtopic: inferred.subtopic,
    unit: inferred.unit,
    mistakeType,
  });

  const fallbackResult = cleanStars({
    text: fallbackFormatted.plainText,
    diagnostic: {
      concept: `${inferred.unit}: ${inferred.subtopic}`,
      correctReasoning: fallbackFormatted.line1.text,
      distractorTrap: fallbackFormatted.line2.text,
      keyRule: fallbackFormatted.line3.text,
      speedTip: fallbackFormatted.line3.text,
    },
    visionGrounded,
  });
  if (paperId && !mistakeType) {
    await savePaperExplanationServer(paperId, number, fallbackResult).catch(() => {});
  }
  return fallbackResult;
}

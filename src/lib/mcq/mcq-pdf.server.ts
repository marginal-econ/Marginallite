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
import { chat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";
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
    "You are a Principal Examiner for Cambridge IGCSE Economics (0455)",
    `(${"IGCSE Paper 1"}) delivering a strictly accurate, question-specific diagnostic breakdown for a real past paper multiple-choice question.`,
    "",
    "STRICT ACCURACY & GROUNDING RULES:",
    hasImage
      ? "1. READ THE ATTACHED OFFICIAL PDF IMAGE FIRST. Inspect EVERY word of the stem, ALL axis labels, curve labels (e.g. D1->D2, S1->S2, AD/AS, MC/MR), shaded areas (e.g. W, X, Y, Z), table numbers, and the EXACT wording of Options A, B, C, and D directly from the image. If the OCR text excerpt below is incomplete or garbled, TRUST THE PDF IMAGE 100%."
      : "1. Base your explanation strictly on the exact question stem and options provided. Never invent numbers, curve labels, or statements that do not appear in the question.",
    `2. The official Cambridge IGCSE 0455 mark scheme answer is Option ${correctAnswer}. Never contradict the mark scheme; prove rigorously why Option ${correctAnswer} is uniquely true under Cambridge IGCSE 0455 conventions.`,
    "3. QUOTE OR REFERENCE THE ACTUAL OPTION CONTENT: In correctReasoning, explicitly state what Option " +
      correctAnswer +
      " says (or depicts in the diagram/table) and derive step-by-step why it is true. For any calculation, show exact formula, substituted numbers, sign, and final value.",
    isStudentCorrect
      ? `4. THE STUDENT ANSWERED CORRECTLY (Option ${correctAnswer}). In distractorTrap, identify the #1 most tempting WRONG option from this exact question (naming its exact letter A/B/C/D and quoting/describing what it says) and explain precisely why that distractor fails so the student reinforces their mastery.`
      : userAnswer
        ? `4. THE STUDENT ANSWERED INCORRECTLY (picked Option ${userAnswer} instead of ${correctAnswer}). In distractorTrap, specifically quote/describe what Option ${userAnswer} says and explain the exact economic flaw in Option ${userAnswer}, then briefly note why the remaining wrong options fail.`
        : "4. In distractorTrap, identify the #1 most deceptive wrong option letter in this question and explain why candidates fall for it.",
    "5. In concept, name the EXACT Cambridge IGCSE 0455 syllabus topic actually tested by THIS question (do not blindly repeat the fallback topic hint if the PDF image tests a different topic).",
    "6. In speedTip, give a concrete, question-specific elimination shortcut referencing an exact keyword, qualifier, axis, or calculation check from THIS question (no vague generic advice).",
    "7. NO ASTERISKS: Never use asterisks (* or **) anywhere in any JSON string. Do not use markdown bold, italics, or asterisk bullets. Return plain text only with zero asterisks.",
    "",
    "Return ONLY a single valid JSON object (no markdown fences, no commentary outside JSON) with these exact keys:",
    '- "concept": exact Cambridge IGCSE 0455 syllabus unit & specific concept tested in this question',
    '- "keyRule": the core economic principle, formula, or Cambridge rule governing this exact question',
    '- "correctReasoning": exact step-by-step worked proof quoting Option ' +
      correctAnswer +
      " and showing every diagram/table/calculation step",
    '- "distractorTrap": specific diagnosis of ' +
      (isStudentCorrect
        ? "the top tempting wrong option letter the student successfully avoided"
        : userAnswer
          ? `why Option ${userAnswer} is wrong and how Cambridge set that trap`
          : "the main distractor trap Cambridge set in this question"),
    '- "speedTip": concrete elimination shortcut specific to this question (< 45 seconds)',
    '- "summary": a concise 3-4 sentence explanation walking straight through this exact question',
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
        maxCompletionTokens: 1600,
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
      maxCompletionTokens: 1400,
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
    const text = summary || correctReasoning || resultText.trim();

    const diagnostic: McqDiagnostic = {
      concept:
        typeof p.concept === "string" && p.concept.trim()
          ? p.concept.trim()
          : `${inferred.unit}: ${inferred.subtopic}`,
      keyRule: typeof p.keyRule === "string" ? p.keyRule.trim() : "",
      correctReasoning: correctReasoning || text,
      distractorTrap: typeof p.distractorTrap === "string" ? p.distractorTrap.trim() : "",
      speedTip: typeof p.speedTip === "string" ? p.speedTip.trim() : "",
    };

    const finalResult = cleanStars({ text, diagnostic, visionGrounded });
    if (paperId && !mistakeType) {
      await savePaperExplanationServer(paperId, number, finalResult).catch(() => {});
    }
    return finalResult;
  }

  const fallbackResult = cleanStars({
    text: resultText.trim(),
    visionGrounded,
  });
  if (paperId && !mistakeType) {
    await savePaperExplanationServer(paperId, number, fallbackResult).catch(() => {});
  }
  return fallbackResult;
}

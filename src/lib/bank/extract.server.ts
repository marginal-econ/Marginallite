/**
 * Question bank extraction — turns pasted/uploaded real past-paper text
 * (a question paper, optionally with its mark scheme) into discrete,
 * structured question rows: real MCQ stems + options + answer, or real
 * essay questions + suggested tariff. This never touches the existing AI
 * generators (mcq.server.ts / essay/generator.server.ts) — it's a separate
 * extraction pass over real exam text, feeding a review queue a teacher
 * approves before anything reaches a student.
 */
import { chat, visionChat } from "../ai.server";
import { DIAGRAM_IDS, DIAGRAM_INDEX_FOR_AI } from "../diagrams/catalog";
import { MODEL_EXAMINER } from "../examiner/config";
import { extractFirstJsonObject } from "../examiner/json";

export type ExtractedMcqCandidate = {
  stem: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  distractorNotes: Partial<Record<"A" | "B" | "C" | "D", string>>;
  topic: string;
  skill: "knowledge" | "application" | "analysis";
  /** An id from the diagram library, matched to the paper's real figure — or
   *  null when no library diagram is a faithful enough match. */
  diagramId: string | null;
};

export type ExtractedEssayCandidate = {
  questionText: string;
  topic: string;
  maxMark: number;
};

const DIAGRAM_MATCH_RULES = [
  "Diagram matching:",
  "- The real paper's own figure/table image is not available to you — only its described data or",
  "  axis labels, if the text conveys them. Do not invent what the figure looks like.",
  "- If, and only if, one diagram in the library below is a genuinely faithful redraw of what the",
  "  question describes (same axes, same curves, same shift/movement, same labels) — not just a",
  '  related topic — set "diagram_id" to its id. The diagram is rendered above the stem exactly as',
  "  the library draws it, so a wrong or approximate match is worse than no diagram at all.",
  "- Most real-paper questions that reference a figure will NOT have a faithful library match —",
  '  leave "diagram_id": "" whenever you are not confident, and keep the reference in the stem',
  "  wording (e.g. 'In the diagram, ...') so a teacher reviewing it knows a real figure existed",
  "  there and can attach the right one by hand.",
  '- Never set "diagram_id" for a question that references a data table, not a diagram.',
  "",
  "DIAGRAM LIBRARY (id — title (section, topic): what it shows):",
  DIAGRAM_INDEX_FOR_AI,
].join("\n");

// Used instead of DIAGRAM_MATCH_RULES when real page images were supplied
// (vision path) — the model can actually see the figures/tables now, so the
// instructions flip from "describe what the text implies" to "read what is
// actually drawn/printed", which meaningfully improves both stem fidelity
// (numbers copied straight off a data table instead of re-typed from OCR
// text) and diagram-library matching accuracy.
const DIAGRAM_MATCH_RULES_VISION = [
  "Diagram and table matching (you can SEE the real page images):",
  "- You have been given the actual scanned/photographed page images of this paper, not just OCR'd",
  "  text. Read any figure, graph, or data table directly off the image — do not rely only on the",
  "  text below, which may have garbled numbers, axis labels, or table cells during OCR. Where the",
  "  text and the image disagree on a number or label, trust the image.",
  "- If a question stem references a data table, copy the table's numbers into the stem exactly as",
  "  printed (as a short inline description or markdown table), so the question is fully",
  "  self-contained without the original image.",
  "- If, and only if, one diagram in the library below is a genuinely faithful redraw of the actual",
  "  figure you can see on the page (same axes, same curves, same shift/movement, same labels) —",
  '  not just a related topic — set "diagram_id" to its id. The diagram is rendered above the stem',
  "  exactly as the library draws it, so a wrong or approximate match is worse than no diagram at",
  "  all. Compare against what you actually see, not what the topic name suggests.",
  '- Leave "diagram_id": "" whenever the real figure isn\'t a faithful library match, or the',
  "  question references a data table rather than a diagram — but still keep the descriptive",
  "  reference in the stem so a teacher reviewing it understands a real figure/table existed there.",
  "",
  "DIAGRAM LIBRARY (id — title (section, topic): what it shows):",
  DIAGRAM_INDEX_FOR_AI,
].join("\n");

/** Cap on how many page images go into a single vision extraction call — keeps token/latency bounded. */
const VISION_MAX_PAGES = 14;
/** Gateway-safe default model id, only used when no admin vision/chat override is configured. */
export const VISION_FALLBACK_MODEL = "google/gemini-3.8-flash";

/**
 * Runs one extraction prompt either as a text-only chat() call (legacy path,
 * OCR'd/pasted text only) or as a visionChat() call over the real page
 * images when the caller supplied any — letting the model read the paper's
 * actual diagrams and data tables instead of trusting text extraction alone.
 */
async function runExtraction(
  systemPrompt: string,
  userMessage: string,
  pageImages: string[] | undefined,
) {
  if (pageImages && pageImages.length > 0) {
    return visionChat({
      model: VISION_FALLBACK_MODEL,
      systemPrompt,
      prompt: userMessage,
      imageDataUrls: pageImages.slice(0, VISION_MAX_PAGES),
      maxCompletionTokens: 16384,
    });
  }
  return chat({
    model: MODEL_EXAMINER,
    temperature: 0,
    json: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
}

const MCQ_CONTRACT = `
Return ONLY one JSON object:
{ "questions": [
  {
    "stem": string,                  // the exact question as printed on the paper (reworded only to remove "Fig. 1"/image references — never invent numbers)
    "options": { "A": string, "B": string, "C": string, "D": string },
    "answer": "A" | "B" | "C" | "D", // from the mark scheme if provided, otherwise your best determination — flag uncertainty in "explanation"
    "explanation": string,           // why the key is correct, examiner voice, 2-3 sentences
    "distractor_notes": { "A": string, "B": string, "C": string, "D": string },
    "topic": string,                 // short syllabus topic name, e.g. "Price elasticity of demand"
    "skill": "knowledge" | "application" | "analysis",
    "diagram_id": string             // an id from the diagram library below, or "" — see diagram matching rules
  }
] }
`.trim();

const ESSAY_CONTRACT = `
Return ONLY one JSON object:
{ "questions": [
  {
    "question_text": string, // the exact essay question as printed, including the command word and the mark allocation in brackets if shown, e.g. "Discuss whether an indirect tax is the best way to reduce consumption of a demerit good. [8]"
    "topic": string,          // short syllabus topic name
    "max_mark": number        // the tariff for this question — 2, 4, 6 or 8 for 0455 Paper 2
  }
] }
`.trim();

/**
 * Extracts real MCQ questions (stem, four options, correct answer) from
 * pasted question-paper text, using the mark scheme text (if supplied) to
 * pin down the correct answer rather than guessing it.
 */
export async function extractMcqQuestionsFromPaper(options: {
  era?: "legacy" | "2027";
  qpText: string;
  msText?: string;
  /** Real scanned/photographed page images of the QP (data URLs), for vision extraction. */
  pageImages?: string[];
}): Promise<{ candidates: ExtractedMcqCandidate[]; meta: Awaited<ReturnType<typeof chat>> }> {
  const hasImages = Boolean(options.pageImages?.length);
  const systemPrompt = [
    "You are transcribing a real Cambridge IGCSE Economics (0455) Paper 1",
    options.era === "2027" ? "(40 questions, 1 hour)" : "(30 questions, 45 minutes)",
    "multiple choice past paper into structured data. Do NOT invent, improve,",
    "rephrase, or 'fix' any question — transcribe exactly what is on the paper,",
    "only cleaning up OCR artefacts (broken line wraps, stray page numbers,",
    "header/footer noise). If a question references a diagram/table/figure you",
    hasImages
      ? "cannot fully make out, transcribe its described data as faithfully as possible and keep the"
      : "cannot see, transcribe its described data faithfully and keep the",
    "reference in the stem rather than dropping the question.",
    "",
    "If a mark scheme is provided below, use it as the authoritative source",
    "for the correct answer letter — do not override it with your own",
    "judgement. If no mark scheme is provided, determine the correct answer",
    "yourself and say so plainly in the explanation.",
    "",
    "Skip anything that is not a genuine standalone multiple choice question",
    "(e.g. instructions, a cover page, an answer key table on its own).",
    "",
    hasImages ? DIAGRAM_MATCH_RULES_VISION : DIAGRAM_MATCH_RULES,
    "",
    MCQ_CONTRACT,
  ].join("\n");

  const userMessage = [
    hasImages
      ? "QUESTION PAPER — page images attached above, plus its OCR'd text below for reference (the text may contain errors; trust the images for numbers, figures and tables):"
      : "QUESTION PAPER TEXT:",
    options.qpText.slice(0, 60_000),
    options.msText
      ? `\n\nMARK SCHEME TEXT:\n${options.msText.slice(0, 30_000)}`
      : "\n\n(No mark scheme provided.)",
  ].join("\n");

  const result = await runExtraction(systemPrompt, userMessage, options.pageImages);

  const raw = extractFirstJsonObject(result.text);
  const list = raw && Array.isArray(raw.questions) ? raw.questions : [];

  const candidates = list
    .map((item) => {
      const q = (item ?? {}) as Record<string, unknown>;
      const rawOptions = (q.options ?? {}) as Record<string, unknown>;
      const optionsOut: Record<"A" | "B" | "C" | "D", string> = {
        A: String(rawOptions.A ?? "").trim(),
        B: String(rawOptions.B ?? "").trim(),
        C: String(rawOptions.C ?? "").trim(),
        D: String(rawOptions.D ?? "").trim(),
      };
      const answer = String(q.answer ?? "")
        .toUpperCase()
        .trim() as "A" | "B" | "C" | "D";
      const notesRaw = (q.distractor_notes ?? {}) as Record<string, unknown>;
      const distractorNotes: Partial<Record<"A" | "B" | "C" | "D", string>> = {};
      for (const key of ["A", "B", "C", "D"] as const) {
        const note = notesRaw[key];
        if (typeof note === "string" && note.trim()) distractorNotes[key] = note.trim();
      }
      const skill = String(q.skill ?? "knowledge");
      const diagramId = String(q.diagram_id ?? "").trim();
      return {
        stem: String(q.stem ?? "").trim(),
        options: optionsOut,
        answer,
        explanation: String(q.explanation ?? "").trim(),
        distractorNotes,
        topic: String(q.topic ?? "").trim(),
        skill: (["knowledge", "application", "analysis"].includes(skill)
          ? skill
          : "knowledge") as ExtractedMcqCandidate["skill"],
        diagramId: DIAGRAM_IDS.includes(diagramId) ? diagramId : null,
      } satisfies ExtractedMcqCandidate;
    })
    .filter(
      (q) =>
        q.stem.length > 8 &&
        (["A", "B", "C", "D"] as string[]).includes(q.answer) &&
        Object.values(q.options).every((option) => option.length > 0),
    );

  return { candidates, meta: result };
}

/** Extracts real essay questions (with tariff) from pasted question-paper text. */
export async function extractEssayQuestionsFromPaper(options: {
  era?: "legacy" | "2027";
  qpText: string;
  /** Real scanned/photographed page images of the QP (data URLs), for vision extraction. */
  pageImages?: string[];
}): Promise<{ candidates: ExtractedEssayCandidate[]; meta: Awaited<ReturnType<typeof chat>> }> {
  const hasImages = Boolean(options.pageImages?.length);
  const systemPrompt = [
    "You are transcribing real Cambridge IGCSE Economics (0455) Paper 2",
    "structured question past paper text into structured data.",
    "Extract every genuine structured question part (2, 4, 6 or 8 marks),",
    "exactly as printed including the command word ('Identify', 'State',",
    "'Explain', 'Analyse', 'Discuss') and marks in brackets.",
    hasImages
      ? "\nPage images of the real paper are attached above — if a question references extract data\nor a table, read the real numbers off the image rather than trusting OCR text alone, and\ninclude them in the question text so it stays self-contained."
      : "",
    "",
    ESSAY_CONTRACT,
  ].join("\n");

  const userMessage = [
    hasImages
      ? "QUESTION PAPER — page images attached above, OCR'd text below for reference:"
      : "QUESTION PAPER TEXT:",
    options.qpText.slice(0, 60_000),
  ].join("\n");

  const result = await runExtraction(systemPrompt, userMessage, options.pageImages);

  const raw = extractFirstJsonObject(result.text);
  const list = raw && Array.isArray(raw.questions) ? raw.questions : [];

  const candidates = list
    .map((item) => {
      const q = (item ?? {}) as Record<string, unknown>;
      const maxMarkRaw = Number(q.max_mark ?? 12);
      const maxMark = [8, 12, 20].includes(maxMarkRaw) ? maxMarkRaw : 12;
      return {
        questionText: String(q.question_text ?? "").trim(),
        topic: String(q.topic ?? "").trim(),
        maxMark,
      } satisfies ExtractedEssayCandidate;
    })
    .filter((q) => q.questionText.length > 10);

  return { candidates, meta: result };
}

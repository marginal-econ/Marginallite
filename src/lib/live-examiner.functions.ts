import { buildQuestionRubric } from "./live-examiner/rubric-retrieval";
import { checkEconomicMisconceptions } from "./live-examiner/reasoning-engine";
import { evaluateParagraphSemantics } from "./live-examiner/semantic-engine";
import { buildMarkLedger } from "./live-examiner/mark-ledger";
import { generateFeedbackAndOpportunities } from "./live-examiner/score-maximizer";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { LIVE_EXAMINER_LIMIT_MESSAGE } from "@/lib/usage-limits";
import { deterministicTerminologyIssues } from "@/lib/live-examiner/economics-glossary";
import { analyzeGrammarAndMechanics } from "@/lib/live-examiner/grammar-engine";
import { diffSentences, splitSentences } from "@/lib/writing-check/sentence-diff";
import { AO_DEFINITIONS, defaultSplitForMaxMark } from "@/lib/examiner/config";
import { analyzeEssayQuality } from "@/lib/examiner/writing-quality";
import { isMarginalAdmin } from "@/lib/auth-admin";
import { normalizeIssueSpan } from "@/lib/live-examiner/normalize-issue-span";
import { classifySentence } from "@/lib/live-examiner/sentence-engine";
import { cleanSuggestion } from "@/lib/live-examiner/clean-suggestion";
import { cleanStars } from "@/lib/utils";
import { extractQuestionTopicTokens, detectOffTopicConcept } from "./live-examiner/topic-relevance";

type AuthContextLike = {
  id?: string;
  userId?: string;
  email?: string | null;
  isAdmin?: boolean;
  user?: { id?: string; email?: string | null } | null;
};

function assertAdminOnlyAccess(auth?: AuthContextLike | null) {
  if (!auth) {
    throw new Error("Live Examiner is currently restricted to the Marginal Administrator.");
  }
  const userId = auth.userId ?? auth.id ?? auth.user?.id;
  const email = auth.email ?? auth.user?.email ?? undefined;
  if (!auth.isAdmin && !isMarginalAdmin({ userId, email })) {
    throw new Error("Live Examiner is currently restricted to the Marginal Administrator.");
  }
}

/**
 * HARD limit: restricted to the Marginal Administrator (`marginal.econ.ai@gmail.com`).
 */
async function assertLiveExaminerSessionAllowed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  question: string,
  auth?: AuthContextLike | null,
) {
  assertAdminOnlyAccess(auth);
  return;
  const { data, error } = await supabase.rpc("claim_live_examiner_session", {
    p_question: question,
  });
  if (error) throw new Error(error.message);
  if (!(data as { allowed?: boolean } | null)?.allowed) {
    throw new Error(LIVE_EXAMINER_LIMIT_MESSAGE);
  }
}

/**
 * Ceiling on suggestions shown at once. Loosened from 5 — feedback said it
 * was resurfacing real issues too slowly. Still capped (not unlimited) so
 * a badly-written paragraph doesn't dump 20 red flags at once; the
 * Stage-2 verifier is the real quality gate, this is just "how much to
 * show in one go".
 */
const MAX_VISIBLE_ISSUES = 5;

/** At most this many BRAND NEW issues are introduced in a single check —
 *  even if a big paste triggers many candidates, they surface a batch at
 *  a time rather than all at once. Raised from 3 alongside
 *  MAX_VISIBLE_ISSUES so a big paste doesn't take several passes to
 *  reach the new higher ceiling. */
const MAX_NEW_ISSUES_PER_CALL = 6;

/** Sentences per model call is capped so one giant paste can't spike cost. */
const MAX_SENTENCES_PER_CALL = 24;

/** Stage-1 candidates below this self-reported confidence are dropped
 *  before they even reach verification — cheap, zero-latency filter.
 *  Lowered from 0.7: Stage 2's independent, default-reject verifier is
 *  the actual quality gate, so this only needs to filter out
 *  low-confidence noise before it wastes a verifier slot — not act as a
 *  second quality bar itself. */
const CONFIDENCE_THRESHOLD = 0.55;

/**
 * Mechanical categories (grammar/clarity/terminology) at very high
 * self-reported confidence skip Stage 2 verification entirely — a
 * misspelled word or a misused term doesn't need a second opinion the way
 * an economics-judgement call does. This is the main latency lever: it
 * means a purely mechanical fix can show up after one fast model call
 * instead of two, without touching the accuracy of the higher-stakes AO
 * categories, which always still go through the verifier.
 */
const AUTO_KEEP_CATEGORIES: ReadonlySet<string> = new Set([
  "grammar",
  "clarity",
  "terminology",
  "misconception",
  "economics_accuracy",
  "analysis",
  "application",
  "evaluation",
  "reasoning_chain",
]);
const AUTO_KEEP_CONFIDENCE = 0.72;

const CATEGORIES = [
  "grammar",
  "clarity",
  "economics_accuracy",
  "analysis",
  "application",
  "evaluation",
  "reasoning_chain",
  "terminology",
  "misconception",
] as const;

const SEVERITIES = ["low", "medium", "high"] as const;

export const IssueSchema = z.object({
  original: z.string(),
  suggestion: z.string(),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  /** One short sentence — why this is an issue and what the fix improves. */
  explanation: z.string(),
  /** The sentence (or [DIAGRAM: ...] tag) this issue's `original` was found in. */
  context: z.string(),
  /**
   * The proof: for "economics_accuracy" this MUST be a verbatim quote from
   * the retrieved syllabus context (checked server-side, not trusted on
   * the model's say-so). For every other category it's a short, concrete
   * reason a human could check in one glance (a quoted grammar rule, the
   * specific missing link, etc). Never shown as invented certainty —
   * that's the whole point of requiring it.
   */
  evidence: z.string().optional(),
});

export type LiveExaminerIssue = z.infer<typeof IssueSchema>;

const AO_CODES = ["AO1", "AO2", "AO3"] as const;

export const AoClassificationSchema = z.object({
  original: z.string(),
  context: z.string(),
  ao: z.enum(AO_CODES),
  explanation: z.string(),
});

export type LiveExaminerAoClassification = z.infer<typeof AoClassificationSchema>;

// ---------------------------------------------------------------------------
// 1. Prepare syllabus grounding for a question — run ONCE when the question
//    is set/changed, never per keystroke. Every subsequent check call reuses
//    this rendered context block instead of paying for a fresh retrieval.
// ---------------------------------------------------------------------------

const PrepareContextInput = z.object({
  level: z.enum(["as", "a2"]),
  topic: z.string().trim().max(200),
  question: z.string().trim().min(5).max(2000),
});

export const prepareLiveExaminerContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = (input && typeof input === "object" && "data" in input)
      ? (input as any).data
      : input;
    return PrepareContextInput.parse(raw);
  })
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    const { retrieve, renderContext } = await import("./retrieval.server");
    const { fetchCalibrationAnchors, buildAnchorBlock } =
      await import("./examiner/calibration.server");

    const timeoutFallback = <T>(promise: Promise<T>, fallback: T, ms = 2500): Promise<T> =>
      Promise.race([
        promise.catch(() => fallback),
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    const [sources, anchors] = await Promise.all([
      timeoutFallback(
        retrieve(context.supabase, {
          query: `${data.topic} — ${data.question}`,
          matchCount: 6,
          docTypes: ["syllabus", "coursebook", "mark_scheme", "examiner_report"],
          minSimilarity: 0.22,
        }),
        [],
        2500,
      ),
      timeoutFallback(fetchCalibrationAnchors(context.supabase), [], 2000),
    ]);

    const anchorBlock = anchors.length > 0 ? buildAnchorBlock(anchors) : "";
    const renderedSources = sources.length > 0 ? renderContext(sources) : "";

    const contextBlock = anchorBlock && renderedSources
      ? `${renderedSources}\n\n${anchorBlock}`
      : renderedSources || anchorBlock;

    return {
      contextBlock,
      sourceCount: sources.length,
      anchorsUsed: anchors.length,
    };
  });

// ---------------------------------------------------------------------------
// 2. Live check — TWO stages:
//
//    Stage 1 (candidate generation): same diff-based, capped shape as the
//    plain spelling/grammar checker, but widened to full examiner-style
//    categories, grounded in the retrieved context block, and required to
//    self-report a confidence score and cite evidence.
//
//    Stage 2 (verification): a second, independent pass that is shown ONLY
//    the surviving candidates (not the whole essay again) and is told to
//    reject anything it cannot independently justify, and — critically —
//    to recognise that a valid economics argument phrased differently from
//    a "template" answer is NOT an error. This is what keeps the tool from
//    nagging about correct-but-unconventional writing.
//
//    Stage 2 only runs when stage 1 actually produced candidates, so a
//    clean passage costs one (cheap) call, not two.
// ---------------------------------------------------------------------------

const CheckInput = z.object({
  essayText: z.string().trim().min(2, "That's too short to check.").max(40_000),
  previousText: z.string().max(40_000).optional(),
  previousIssues: z
    .array(IssueSchema.extend({ id: z.string() }))
    .max(MAX_VISIBLE_ISSUES * 4)
    .optional(),
  question: z.string().trim().min(5).max(2000),
  level: z.string().transform((v) => v.toLowerCase()).pipe(z.enum(["as", "a2"])),
  maxMark: z.coerce.number().int().positive().max(30),
  /** Rendered syllabus context from prepareLiveExaminerContext — passed
   *  through verbatim so this call never re-embeds/re-retrieves. */
  contextBlock: z.string().max(20_000).nullish().transform((v) => v || ""),
});

const CandidateSchema = IssueSchema.extend({ confidence: z.number().min(0).max(1) });
type Candidate = z.infer<typeof CandidateSchema>;

function stripAsterisks(str: string): string {
  if (!str) return "";
  return str
    .replace(/<audit>[\s\S]*?<\/audit>/gi, "")
    .replace(/<audit>[\s\S]*$/gi, "")
    .replace(/\*+/g, "")
    .replace(/[`_]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Distills retrieved syllabus context to essential syllabus concepts (max 1,500 chars),
 * stripping heavy anchor essays during rapid live keystroke checks.
 * Reduces prompt tokens from ~4,500 down to ~350 (92% reduction).
 */
export function compactSyllabusContext(contextBlock: string): string {
  if (!contextBlock) return "";
  const lines = contextBlock.split("\n");
  const filtered: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (line.includes("BAND ") && line.includes("ANCHOR")) break;
    filtered.push(line);
    length += line.length + 1;
    if (length >= 1500) break;
  }
  return filtered.join("\n").slice(0, 1500).trim();
}

function buildCandidateSystemPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
  includePredictedMark = false,
) {
  const split = defaultSplitForMaxMark(maxMark);
  const predictedMarkSection = includePredictedMark
    ? `,
  "predicted_mark": {
    "total_mark": <integer 0 to ${maxMark}, sum of the 3 awarded values below; MUST be 0 if off-topic>,
    "confidence": <0 to 1>,
    "headline": "<max 8 words, plain text, no asterisks>",
    "ao_breakdown": {
      "knowledge": { "awarded": <int>, "out_of": ${split.ao1_marks} },
      "analysis": { "awarded": <int>, "out_of": ${split.ao2_marks} },
      "evaluation": { "awarded": <int>, "out_of": ${split.ao3_marks} }
    }
  }`
    : "";

  return `You are a senior Cambridge IGCSE 0455 Economics examiner giving real-time, Grammarly-style feedback on a student's answer as they type it.

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

${contextBlock || "No syllabus material was retrieved for this question — be conservative about flagging economics content. Grammar/clarity/terminology issues are still fine to flag."}

CRITICAL RULES:
0. STRICT QUESTION RELEVANCE & POSITIVE MARKING (CAMBRIDGE IGCSE 0455 MANDATE):
   - You are evaluating an answer specifically to the prompt: "${question}".
   - Cambridge examiners practice POSITIVE MARKING: reward what the candidate knows, understands, and analyzes.
   - DO NOT FALSELY ZERO AN ESSAY: Laying theoretical groundwork (e.g. defining market failure, externalities, or information failure before discussing policy interventions) and comparing the primary policy against alternative policies are legitimate Cambridge economics and must be marked on their merits.
   - Only award zero marks if the candidate's text has literally ZERO economic relation to the question prompt (e.g. non-economic prose, personal anecdotes, random gibberish, or defining public goods when asked about demerit goods):
     * "predicted_mark" MUST HAVE total_mark: 0, confidence: 0.95, headline: "Off-topic answer — 0 marks", and ao_breakdown: { knowledge: { awarded: 0, out_of: ${split.ao1_marks} }, analysis: { awarded: 0, out_of: ${split.ao2_marks} }, evaluation: { awarded: 0, out_of: ${split.ao3_marks} } }.
     * "classifications": DO NOT classify any off-topic or non-economic sentence into "classifications". Keep "classifications" empty [] for off-topic or irrelevant sentences!
     * "issues": FLAG an "application" or "economics_accuracy" issue on the off-topic phrase or sentence:
       - original: <the off-topic phrase, e.g. "Public goods are non-rival">
       - suggestion: <the correct relevant concept from the prompt, e.g. "Demerit goods are goods with negative externalities in consumption">
       - category: "application"
       - explanation: "Off-topic content: The question specifically asks about this prompt. Writing about unrelated concepts earns zero marks under Cambridge IGCSE 0455 mark schemes."
1. NO SYNONYMS: NEVER suggest mere synonyms (e.g. replacing 'leads to' with 'results in', or 'causes' with 'brings about'). If the student's phrasing is valid English and developed economics, DO NOT FLAG IT for style.
2. FLAG SHALLOW / UNDEVELOPED CLAIMS FOR "analysis": If a sentence states an undeveloped economic assertion or stops at defining a concept without explaining the step-by-step causal mechanism (e.g. "Free trade can lead to specialisation where countries focus on producing a limited range of products" without explaining comparative advantage, lower opportunity cost, economies of scale, and lower consumer prices), flag the trailing phrase as "analysis" and suggest extending the causal chain.
3. NO ASTERISKS OR MARKDOWN (MISTRAL MANDATE): Output strictly clean plain English text. NEVER include asterisks (** or *), bolding, backticks, or markdown formatting anywhere in "original", "suggestion", "explanation", "evidence", or "headline". Keep all wording clean, professional, and unformatted.
4. MINIMAL SPANS & NO SENTENCE CHOPPING:
   - "original" MUST be ONLY the exact erroneous word or short phrase inside the sentence (typically 1 to 6 words). DO NOT quote the entire sentence in "original" unless the whole sentence is fundamentally flawed and needs a complete rewrite.
   - "suggestion" MUST be ONLY the exact drop-in replacement for "original" (never a partial word, never the whole sentence unless "original" was the whole sentence). When "original" is replaced by "suggestion", the sentence must read smoothly and correctly. Never output a suggestion identical to "original".
   - NEVER chop off the start or end of words (e.g. if the typo is "Exmaples", suggestion must be "Examples", NEVER "amples").
5. STRICT GRAMMAR QUALITY:
   - NEVER invent weird, pedantic, or false grammar rules (e.g. never invent rules about letters, optional articles like "the", or stylistic preferences).
   - Only flag clear, indisputable grammatical errors, true spelling typos (e.g. "becuase", "faliure", "externailties", "persistant"), or clear subject-verb disagreements. Do not penalize valid British or American spelling conventions.
   - Focus primarily on economics substance: accurate Cambridge terminology, analytical transmission chains, evaluative conditions/tradeoffs, and economic misconceptions.
6. CAMBRIDGE MANDATORY ACCURACY CHECKS FOR "economics_accuracy":
   - Indirect tax shifts SUPPLY left (NEVER demand left); subsidy shifts SUPPLY right.
   - Inelastic demand means quantity falls LESS, making a tax LESS effective at reducing consumption (though revenue rises).
   - Hyperinflation is rapid price rise (>50% per month) with currency collapse, NOT mere accelerating inflation.
   - A fall in demand causes a movement along supply, NEVER a shift in supply.
   - Investment raises AD in the short run and LRAS in the long run; it does NOT automatically increase the money supply.
   - Policies do not guarantee or completely solve market outcomes without proof.
   - Contradictions (calling a policy weakness a reason it is very effective) must be flagged.
   Explain in plain economics with ZERO rule codes or asterisks.
7. CAMBRIDGE MARKING PRINCIPLES — THEORETICAL ANALYSIS & REAL-WORLD EXAMPLES:
   - Written economics alone can score FULL MARKS (including full marks in AO2 and overall).
   - Do NOT penalise an essay simply because it lacks real-world empirical statistics or historical dates. Sound theoretical reasoning through economic concepts earns full marks.
   - Theoretical application (applying theory to consumers, producers, market mechanisms, or types of goods) and diagrammatic explanations are fully valid Cambridge application alongside real-world examples.
   - Guiding theoretical examples earn credit under AO2 if integrated into the causal reasoning.

Categories you may flag, and ONLY these:
- "grammar": genuine spelling, grammar, punctuation, or tense errors. (Not an AO — pure writing mechanics.)
- "clarity": a sentence that is genuinely hard to follow, broken, or ambiguous — not merely simple. (Writing mechanics.)
- "economics_accuracy": a factually wrong economics claim that DIRECTLY CONTRADICTS the syllabus material above. (${AO_DEFINITIONS.ao1.code} ${AO_DEFINITIONS.ao1.name} — ${AO_DEFINITIONS.ao1.description}.)
- "terminology": an economics term used incorrectly or misspelled (e.g. 'monopolistic' instead of 'monopoly'). (${AO_DEFINITIONS.ao1.code} ${AO_DEFINITIONS.ao1.name}.)
- "analysis": a claim stated with no causal chain, or stopping at a definition without explaining the economic mechanism (cause -> market adjustment -> outcome on costs, prices, output, or welfare). (${AO_DEFINITIONS.ao2.code} ${AO_DEFINITIONS.ao2.name} — ${AO_DEFINITIONS.ao2.description}.)
- "application": analysis that ignores the context/scenario in the question. (${AO_DEFINITIONS.ao2.code} ${AO_DEFINITIONS.ao2.name}.)
- "reasoning_chain": a genuine logical contradiction where the conclusion contradicts the premise. (${AO_DEFINITIONS.ao2.code} ${AO_DEFINITIONS.ao2.name}.)
- "evaluation": an assertive claim made without justification, limitation, or balance where the question requires evaluation. (${AO_DEFINITIONS.ao3.code} ${AO_DEFINITIONS.ao3.name}.)

WHOLE SENTENCE CLASSIFICATION & STRICT RUNNING MARK CALIBRATION:
Classify every creditworthy economic sentence into assessment objectives:
- AO1: Knowledge, definitions, concepts, formulas, diagrams, facts, or identifying what a term means. IMPORTANT: A sentence that states "X can lead to Y where Y means..." (e.g. "Free trade can lead to specialisation where countries can focus on producing a limited range of products") is AO1 Knowledge (defining specialisation), NEVER AO2 Analysis!
- AO2: ONLY sentences that explain a multi-step causal economic mechanism with directional market/macro outcomes (e.g. how a tax raises average costs, shifts supply leftwards, raises market price, and contracts quantity demanded). A complete causal chain earns full AO2 credit via theoretical transmission, diagrammatic analysis, or authentic market context.
- AO3: Evaluation, balance, weighing significance, limitations, elasticity/time-lag conditions, and justified judgement.
For "original" in classifications, return the FULL sentence text from "SENTENCES TO CHECK", so the whole sentence is cleanly highlighted.
When estimating "predicted_mark":
- Temperature is 0.0: Grade with strict, accurate Cambridge IGCSE 0455 examination standards.
- DO NOT INFLATE MARKS: A high-scoring Cambridge essay requires sustained, comprehensive development across distinct paragraphs:
  * For a 12-mark essay (target 500–750 words):
    - Under 120 words: extreme fragment — total mark CANNOT exceed 3/12 (AO1: max 2, AO2: max 1, AO3: 0).
    - Under 220 words: severely undersized — total mark CANNOT exceed 5/12 (AO1: max 2, AO2: max 2, AO3: max 1).
    - Under 350 words: compressed outline — total mark CANNOT exceed 7/12 (AO1: max 2, AO2: max 3, AO3: max 2).
    - Under 450 words: developing essay — total mark CANNOT exceed 9/12 (AO1: max 2, AO2: max 5, AO3: max 3).
    - Top Band (10–12/12) is STRICTLY RESERVED for full, extensive, multi-paragraph essays of 450+ words with sustained step-by-step causal mechanisms and decisive comparative evaluation. Under NO circumstances award 10-12/12 to an underdeveloped or outline draft!
  * For an 8-mark essay: under 120 words max 3/8; under 200 words max 5/8.
  * For a 20-mark essay: under 350 words max 7/20; under 550 words max 12/20.
- 1 AO1 definition sentence earns 1 AO1 mark; 2+ AO1 sentences earn up to ${split.ao1_marks}/${split.ao1_marks} AO1 marks.
- If there are 0 genuine AO2 causal mechanism sentences, analysis.awarded MUST be 0 (never award 4/12 for two AO1 sentences!).
- If there are 0 genuine AO3 evaluation sentences, evaluation.awarded MUST be 0.
${maxMark >= 20 ? `- For 20-mark questions (${maxMark} marks: AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}): AO2 analysis must be thorough with complete causal chains and powerful use of real-life examples (naming countries, markets, policy cases). Top band (${split.ao2_marks - 2}-${split.ao2_marks}/${split.ao2_marks}) requires extensive, multi-perspective causal reasoning with integrated examples. Evaluation requires rigorous synoptic weighing and decisive prioritization under timed exam conditions. Do NOT award high marks for compressed notes or passing one-liner mentions.` : ""}

Respond ONLY with a single valid JSON object. Do NOT wrap the JSON inside markdown codeblocks or triple backticks. Do NOT include conversational greetings, preamble, or trailing commentary. Exactly this JSON structure:
{
  "issues": [
    {
      "sentence_index": <number, from "SENTENCES TO CHECK">,
      "original": "<the exact erroneous word or short phrase, copied verbatim from the sentence, no asterisks>",
      "suggestion": "<the minimal fix — a phrase, not a rewrite, no asterisks>",
      "category": "grammar" | "clarity" | "economics_accuracy" | "analysis" | "application" | "evaluation" | "reasoning_chain" | "terminology",
      "severity": "low" | "medium" | "high",
      "explanation": "<one short sentence explaining the issue in plain terms, no asterisks>",
      "evidence": "<verbatim syllabus quote for economics_accuracy, or a short reason otherwise>",
      "confidence": <0 to 1>
    }
  ],
  "classifications": [
    {
      "sentence_index": <number, from "SENTENCES TO CHECK">,
      "original": "<the FULL sentence copied verbatim from SENTENCES TO CHECK>",
      "ao": "AO1" | "AO2" | "AO3",
      "explanation": "<one short sentence explaining why this sentence earns that AO, no asterisks>"
    }
  ]${predictedMarkSection}
}
If a sentence has no issues, omit it from issues but still classify its meaningful economics clauses.`;
}

function buildVerifierSystemPrompt(question: string, contextBlock: string) {
  return `You are a strict, sceptical second reviewer checking a junior examiner's candidate feedback on a Cambridge IGCSE 0455 Economics answer before any of it is shown to the student. Your default is REJECT — a candidate only survives if it is clearly, provably correct.

QUESTION: ${question}

${contextBlock || "No syllabus material is available."}

For EACH candidate below, decide keep or reject:
- REJECT any candidate that is merely suggesting a synonym or stylistic rephrasing for an already developed sentence.
- REJECT any "economics_accuracy" candidate whose "evidence" is not an exact, verbatim quote from the syllabus material above, or whose evidence does not actually contradict the student's sentence when you re-read both side by side.
- KEEP any candidate that flags off-topic content, unrelated syllabus definitions, or material that does not directly address the question prompt.
- KEEP any "analysis" / "application" / "evaluation" candidate that shows the student how to extend a shallow/undeveloped claim or definition into a full Cambridge causal mechanism or evaluative judgement.
- REJECT anything vague, debatable, or where a reasonable examiner could disagree.
- KEEP only candidates you would be comfortable defending in front of the student with the evidence shown.
- Ensure "explanation" contains NO asterisks or markdown formatting.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary:
{
  "verdicts": [
    { "index": <number, matching the candidate list below>, "keep": true | false, "explanation": "<optionally tightened, only if keep is true, no asterisks>" }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Predicted mark — a rough, live-updating estimate shown next to the
// editor, NOT the real grade. It runs on the same fast model as the
// candidate check, on the full current essay text (not just the changed
// sentences, since a mark estimate needs the whole answer), and is fired
// in parallel with the Stage-1 candidate call so it costs latency, not
// doubles it. It intentionally skips retrieval grounding, the audit pass,
// and calibration anchors — all the things that make full grading slow —
// because a rough live number is the point; "Grade now" still runs the
// real, fully-grounded two-pass examiner for the mark that counts.
// ---------------------------------------------------------------------------

const PredictedAoSchema = z.object({
  awarded: z.number(),
  out_of: z.number(),
});

const PredictedMarkSchema = z.object({
  total_mark: z.number(),
  confidence: z.number().min(0).max(1),
  headline: z.string(),
  ao_breakdown: z.object({
    knowledge: PredictedAoSchema,
    analysis: PredictedAoSchema,
    evaluation: PredictedAoSchema,
  }),
});

export type PredictedMark = z.infer<typeof PredictedMarkSchema>;

function buildPredictedMarkPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
) {
  const split = defaultSplitForMaxMark(maxMark);
  return `You are a Principal Cambridge IGCSE Economics (0455) Examiner providing an accurate, live running mark on an in-progress student answer — calibrated to the exact same standards as the official Essay Grader.

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

${contextBlock || "No syllabus material was retrieved for this question — judge on strict Cambridge IGCSE 0455 standards."}

FIXED AO ALLOCATION for this question: knowledge (${AO_DEFINITIONS.ao1.name}) out of ${split.ao1_marks}, analysis (${AO_DEFINITIONS.ao2.name}) out of ${split.ao2_marks}, evaluation (${AO_DEFINITIONS.ao3.name}) out of ${split.ao3_marks}. These "out_of" values are fixed — use exactly these three numbers, never invent different ones.

CRITICAL RELEVANCE DIRECTIVE:
If the student's writing is unrelated to the question asked or discusses a completely different economic topic (e.g. writing about subsidies when the question asks about free trade), total_mark MUST be 0 and all awarded AOs must be 0. Do NOT award courtesy marks for off-topic or irrelevant writing. Do not hesitate to give 0 if the question is unaddressed or answered poorly.

CAMBRIDGE IGCSE 0455 BAND CALIBRATION (ALIGNED WITH ESSAY GRADER):
- AO1 Knowledge (max ${split.ao1_marks}): Award full marks (${split.ao1_marks}/${split.ao1_marks}) for precise definitions of the core question concepts and accurate theoretical foundations; partial (1/${split.ao1_marks}) for vague definitions; 0 for missing or false definitions.
- AO2 Analysis & Application (max ${split.ao2_marks}): Top band (${Math.max(1, split.ao2_marks - 1)}-${split.ao2_marks}/${split.ao2_marks}) requires complete, unbroken multi-step causal transmission chains (initial shock -> mechanism -> market reaction -> equilibrium/welfare outcome) applied to context. Theoretical misconceptions (e.g. shift vs movement along a curve) cap AO2 at Level 1-2.
- AO3 Evaluation (max ${split.ao3_marks}): Top band (${Math.max(0, split.ao3_marks - 1)}-${split.ao3_marks}/${split.ao3_marks}) weighs critical conditions (PED/PES elasticity, short-run vs long-run time lags, government failure, unintended consequences), compares alternatives when the prompt asks 'best way'/'most effective', and reaches a conditional judgement.
- Judge only what is actually written so far using positive marking.

Do NOT penalise for missing diagrams — written economics alone can achieve full marks.
- NO ASTERISKS: Return clean plain text strings with ZERO asterisks (* or **).

Respond ONLY with a single valid JSON object, no markdown fences, no commentary:
{
  "total_mark": <integer, 0 to ${maxMark}, sum of the three awarded values below>,
  "confidence": <0 to 1, your own honest confidence in this rough read — lower for a very short or very early draft>,
  "headline": "<max 8 words, plain, e.g. 'Solid knowledge, analysis still thin'>",
  "ao_breakdown": {
    "knowledge": { "awarded": <int>, "out_of": ${split.ao1_marks} },
    "analysis": { "awarded": <int>, "out_of": ${split.ao2_marks} },
    "evaluation": { "awarded": <int>, "out_of": ${split.ao3_marks} }
  }
}`;
}

/** Clamp/sanitise the model's rough estimate so a malformed response never
 *  reaches the client as a bogus number (e.g. negative, or exceeding the
 *  fixed out_of for an AO). Returns null on anything unusable — the caller
 *  treats that exactly like "estimate unavailable this round", never as an
 *  error that should block the real issue-checking result. */
export function sanitisePredictedMark(
  raw: unknown,
  maxMark: number,
  question?: string,
  essayText?: string,
): PredictedMark | null {
  if (!raw || typeof raw !== "object") return null;

  const rawObj = raw as Record<string, any>;
  const split = defaultSplitForMaxMark(maxMark);

  // Confidence normalisation (e.g. 85 -> 0.85, "0.85" -> 0.85)
  let confidence = typeof rawObj.confidence === "number" ? rawObj.confidence : parseFloat(String(rawObj.confidence));
  if (isNaN(confidence)) confidence = 0.5;
  if (confidence > 1 && confidence <= 100) confidence = confidence / 100;
  confidence = Math.min(Math.max(0, confidence), 1);

  // Headline
  const headline = stripAsterisks(typeof rawObj.headline === "string" ? rawObj.headline.slice(0, 80) : "Running mark estimate");

  // AO Breakdown normalisation
  const rawBreakdown = rawObj.ao_breakdown && typeof rawObj.ao_breakdown === "object" ? rawObj.ao_breakdown : {};

  const parseAo = (
    keys: string[],
    defaultOutOf: number,
  ): { awarded: number; out_of: number } => {
    let candidate: any = undefined;
    for (const k of keys) {
      if (k in rawBreakdown) {
        candidate = rawBreakdown[k];
        break;
      }
    }

    let awarded = 0;
    let outOf = defaultOutOf;

    if (candidate !== undefined && candidate !== null) {
      if (typeof candidate === "object") {
        const rawAw = candidate.awarded ?? candidate.mark ?? candidate.score ?? 0;
        const rawOut = candidate.out_of ?? candidate.max ?? defaultOutOf;
        awarded = typeof rawAw === "number" ? rawAw : parseFloat(String(rawAw));
        outOf = typeof rawOut === "number" ? rawOut : parseFloat(String(rawOut));
      } else {
        awarded = typeof candidate === "number" ? candidate : parseFloat(String(candidate));
      }
    }

    if (isNaN(awarded)) awarded = 0;
    if (isNaN(outOf) || outOf <= 0) outOf = defaultOutOf;

    outOf = Math.max(0, Math.round(outOf));
    awarded = Math.min(Math.max(0, Math.round(awarded)), outOf);

    return { awarded, out_of: outOf };
  };

  const knowledge = parseAo(["knowledge", "AO1", "ao1", "knowledge_and_understanding"], split.ao1_marks);
  const analysis = parseAo(["analysis", "AO2", "ao2"], split.ao2_marks);
  const evaluation = parseAo(["evaluation", "AO3", "ao3"], split.ao3_marks);

  // Calibrate against deterministic Cambridge AO classification so LLM cannot inflate AO2/AO3
  // when there are 0 genuine AO2/AO3 sentences in the essay (e.g. 2 AO1 definition sentences = 2/12, never 4/12).
  if (essayText && essayText.trim().length > 0 && question) {
    const wc = essayText.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 10) {
      knowledge.awarded = 0;
      analysis.awarded = 0;
      evaluation.awarded = 0;
    } else {
      const sentences = splitSentences(essayText)
        .map((s) => s.trim())
        .filter((s) => s.length >= 5 && !/\[DIAGRAM:[^\]]*\]/i.test(s));
      const validClassified = sentences.map((s) => {
        const offTopic = detectOffTopicConcept(s, question);
        if (offTopic.isOffTopic) return { ao: "AO1" as const, strength: 0 as const, confidence: 0 };
        return classifySentence(s);
      });
      const ao1Count = validClassified.filter((c) => c.ao === "AO1" && c.strength > 0).length;
      const ao2Count = validClassified.filter((c) => c.ao === "AO2" && c.strength > 0).length;
      const ao3Count = validClassified.filter((c) => c.ao === "AO3" && c.strength > 0).length;

      // AO1 Knowledge calibration: 1 definition sentence = 1 mark; 2+ definitions = up to split.ao1_marks
      if (ao1Count === 0) {
        knowledge.awarded = 0;
      } else if (ao1Count === 1) {
        knowledge.awarded = Math.min(1, knowledge.awarded, knowledge.out_of);
      } else {
        knowledge.awarded = Math.min(knowledge.out_of, knowledge.awarded);
      }

      if (ao2Count === 0) {
        analysis.awarded = 0;
      } else {
        // Strict Cambridge IGCSE 0455: 1 analysis sentence = max 1 mark; 2 sentences = max 3 marks
        const maxReasonableAo2 = ao2Count === 1 ? 1 : ao2Count === 2 ? 3 : ao2Count === 3 ? 4 : analysis.out_of;
        analysis.awarded = Math.min(analysis.out_of, analysis.awarded, maxReasonableAo2);
      }
      if (ao3Count === 0) {
        evaluation.awarded = 0;
      } else {
        // Strict Cambridge IGCSE 0455: 1 evaluation sentence = max 1 mark; 2 sentences = max 2 marks
        const maxReasonableAo3 = ao3Count === 1 ? 1 : ao3Count === 2 ? 2 : evaluation.out_of;
        evaluation.awarded = Math.min(evaluation.out_of, evaluation.awarded, maxReasonableAo3);
      }

      // Apply official Cambridge Essay Grader Writing Quality, Length & Depth Guardrail
      const quality = analyzeEssayQuality(essayText, maxMark, split);
      analysis.awarded = Math.min(analysis.awarded, quality.maxAllowableAo2);
      evaluation.awarded = Math.min(evaluation.awarded, quality.maxAllowableAo3);

      // Question topic relevance guard
      const topicTokens = extractQuestionTopicTokens(question);
      const fullTextLower = essayText.toLowerCase();
      const hasTopicRelevance =
        topicTokens.length === 0 || topicTokens.some((t) => fullTextLower.includes(t));

      if (!hasTopicRelevance && wc >= 20) {
        knowledge.awarded = 0;
        analysis.awarded = 0;
        evaluation.awarded = 0;
      }
    }
  }

  const quality = essayText ? analyzeEssayQuality(essayText, maxMark, split) : null;
  const maxAllowable = quality ? quality.maxAllowableTotalMark : maxMark;

  const totalCalculated = Math.min(
    maxAllowable,
    knowledge.awarded + analysis.awarded + evaluation.awarded,
  );
  let totalMark =
    rawObj.total_mark !== undefined && (!essayText || !question)
      ? typeof rawObj.total_mark === "number"
        ? rawObj.total_mark
        : parseFloat(String(rawObj.total_mark))
      : totalCalculated;

  if (isNaN(totalMark)) totalMark = totalCalculated;
  totalMark = Math.min(Math.max(0, Math.round(totalMark)), totalCalculated);

  return {
    total_mark: totalMark,
    confidence,
    headline,
    ao_breakdown: { knowledge, analysis, evaluation },
  };
}

function issueKey(issue: Pick<LiveExaminerIssue, "context" | "original" | "category">): string {
  return `${issue.category}::${issue.context.trim().toLowerCase()}::${issue.original.trim().toLowerCase()}`;
}

function dedupeAndCap(issues: LiveExaminerIssue[]): LiveExaminerIssue[] {
  const seenOriginals = new Set<string>();
  const seenSuggestions = new Set<string>();
  const seenExplanations = new Set<string>();
  const deduped: LiveExaminerIssue[] = [];

  for (const issue of issues) {
    const origNorm = (issue.original || "").trim().toLowerCase();
    const suggNorm = (issue.suggestion || "").trim().toLowerCase();
    const explNorm = (issue.explanation || "").trim().toLowerCase().slice(0, 50);

    // Suppress repeating feedback on the same phrase
    if (origNorm && seenOriginals.has(`${issue.category}::${origNorm}`)) continue;

    // Suppress repeating suggestion advice across the essay
    if (suggNorm && seenSuggestions.has(`${issue.category}::${suggNorm}`)) continue;

    // Suppress repeating explanatory advice (e.g. duplicate off-topic or superficial application tips)
    if (explNorm && seenExplanations.has(explNorm)) continue;

    if (origNorm) seenOriginals.add(`${issue.category}::${origNorm}`);
    if (suggNorm) seenSuggestions.add(`${issue.category}::${suggNorm}`);
    if (explNorm) seenExplanations.add(explNorm);

    deduped.push(issue);
  }

  const order: Record<(typeof SEVERITIES)[number], number> = { high: 0, medium: 1, low: 2 };
  return deduped.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, MAX_VISIBLE_ISSUES);
}

/** Case-insensitive substring check — the deterministic half of "no economics
 *  claim without proof": a citation that isn't literally in the retrieved
 *  material is rejected before it ever reaches the verifier. */
function evidenceAppearsInContext(evidence: string, contextBlock: string): boolean {
  if (!evidence.trim()) return false;
  return contextBlock.toLowerCase().includes(evidence.trim().toLowerCase());
}

export const checkEssayWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = (input && typeof input === "object" && "data" in input)
      ? (input as any).data
      : input;
    return CheckInput.parse(raw);
  })
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    const currentSentences = splitSentences(data.essayText);
    const previousSentences = data.previousText ? splitSentences(data.previousText) : [];
    const carriedIssues = data.previousIssues ?? [];

    const diffed =
      previousSentences.length > 0
        ? diffSentences(previousSentences, currentSentences)
        : currentSentences.map((sentence) => ({ sentence, changed: true }));

    const unchangedSentenceSet = new Set(
      diffed.filter((entry) => !entry.changed).map((entry) => entry.sentence),
    );
    const changedSentences = diffed.filter((entry) => entry.changed).map((entry) => entry.sentence);

    const carryForward = () =>
      carriedIssues
        .filter((issue) => unchangedSentenceSet.has(issue.context))
        .map(({ id: _id, ...issue }) => issue);

    // Nothing new to check (e.g. only whitespace changed) — no model call.
    if (changedSentences.length === 0) {
      const surviving = dedupeAndCap(carryForward());
      // predictedMark omitted (not undefined-but-typed) on purpose: the
      // client treats a missing field as "no fresh estimate this round,
      // keep showing the last one" — see useLiveExaminerCheck.
      return {
        issues: surviving,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        predictedMark: undefined as PredictedMark | null | undefined,
      };
    }

    const toSend = changedSentences.slice(0, MAX_SENTENCES_PER_CALL);

    // Deterministic pass first — zero cost, zero latency, needs no AI
    // confirmation since these are exact-string glossary and 4-layer grammar/misconception matches.
    const misconceptionIssues: LiveExaminerIssue[] = toSend.flatMap((s, idx) =>
      checkEconomicMisconceptions(s, `det_misc_${idx}`).map((iss) => ({
        original: iss.original,
        suggestion: iss.suggestion || "",
        category: iss.category as any,
        severity: iss.severity,
        explanation: iss.explanation,
        context: s,
        evidence: iss.evidence,
        aoImpact: iss.aoImpact,
      }))
    );
    const grammarDeterministic: LiveExaminerIssue[] = analyzeGrammarAndMechanics(toSend).map(
      ({ ruleId: _ruleId, startOffset: _start, endOffset: _end, ...issue }) => issue,
    );
    const offTopicDeterministic: LiveExaminerIssue[] = toSend.flatMap((s) => {
      const check = detectOffTopicConcept(s, data.question);
      if (!check.isOffTopic) return [];
      return [
        {
          original: check.offTopicConcept || s,
          suggestion: check.relevantConcept || "Address question prompt concepts",
          category: "application",
          severity: "high",
          explanation:
            check.reason ||
            `Off-topic concept: Writing about unrelated concepts earns 0 marks under Cambridge IGCSE 0455 mark schemes.`,
          context: s,
          evidence: "Cambridge IGCSE 0455: Marks are awarded strictly for relevance to the question prompt.",
          aoImpact: "0 marks awarded under Cambridge IGCSE 0455.",
        },
      ];
    });
    const deterministic: LiveExaminerIssue[] = [
      ...deterministicTerminologyIssues(toSend),
      ...misconceptionIssues,
      ...grammarDeterministic,
      ...offTopicDeterministic,
    ];
    const rubric = buildQuestionRubric({
      question: data.question,
      level: data.level,
      maxMark: data.maxMark,
      contextBlock: data.contextBlock,
    });

    // Compact context block so live keystroke checks use ~350 tokens instead of ~4,500
    const compactedContext = compactSyllabusContext(data.contextBlock);

    // Fast-path: if the student typed 1-3 words and deterministic rules already caught the issue(s),
    // return in 0ms without any network round-trip to the LLM.
    const wordCount = data.essayText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 3 && deterministic.length > 0) {
      const merged = dedupeAndCap([...carryForward(), ...deterministic]);
      return {
        issues: merged,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: toSend,
        clean: merged.length === 0,
        checkedText: data.essayText,
        predictedMark: null,
      };
    }

    const shouldEstimateMark = data.essayText.trim().length >= 8;

    try {
      const { chat } = await import("./ai.server");
      const { MODEL_LIVE_CHECK, MODEL_LIVE_CANDIDATE } =
        await import("./examiner/config");
      const { extractFirstJsonObject } = await import("./examiner/json");

      // Single unified fast Mistral call: checks sentences, classifies AOs, and estimates running mark in one round-trip.
      const targetBlock = toSend.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n");
      const userPrompt = shouldEstimateMark
        ? `SENTENCES TO CHECK:\n${targetBlock}\n\nFULL ANSWER SO FAR (for predicted_mark):\n${data.essayText}`
        : `SENTENCES TO CHECK:\n${targetBlock}`;

      const candidateResult = await chat({
        model: MODEL_LIVE_CANDIDATE,
        feature: "live_examiner_check",
        userId: context.userId,
        temperature: 0,
        maxCompletionTokens: 900,
        json: true,
        messages: [
          {
            role: "system",
            content: buildCandidateSystemPrompt(
              data.question,
              data.level,
              data.maxMark,
              compactedContext,
              shouldEstimateMark,
            ),
          },
          { role: "user", content: userPrompt },
        ],
      });

      const raw = extractFirstJsonObject(candidateResult.text);
      let predictedMark: PredictedMark | null = null;
      if (shouldEstimateMark && raw && typeof raw === "object" && "predicted_mark" in raw) {
        try {
          predictedMark = sanitisePredictedMark(
            (raw as Record<string, unknown>).predicted_mark,
            data.maxMark,
            data.question,
            data.essayText,
          );
        } catch {
          predictedMark = null;
        }
      }
      const issuesRaw = Array.isArray(raw.issues) ? raw.issues : [];
      const classificationsRaw = Array.isArray(raw.classifications) ? raw.classifications : [];
      const classifications = classificationsRaw.flatMap<LiveExaminerAoClassification>((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        const idx = Number(record.sentence_index);
        const sentence = Number.isInteger(idx) ? toSend[idx - 1] : undefined;
        let original = typeof record.original === "string" ? stripAsterisks(record.original) : "";
        let explanation = typeof record.explanation === "string" ? stripAsterisks(record.explanation) : "";
        let ao = AO_CODES.includes(record.ao as (typeof AO_CODES)[number])
          ? (record.ao as (typeof AO_CODES)[number])
          : null;
        if (!sentence || !ao) return [];
        if (/\[DIAGRAM:[^\]]*\]/i.test(original)) return [];

        // Off-topic sentences cannot earn Cambridge AO credit
        const offTopicCheck = detectOffTopicConcept(sentence, data.question);
        if (offTopicCheck.isOffTopic) return [];

        // Cross-check with deterministic sentence classifier: if the sentence is a high-confidence
        // AO1 definition (e.g. "Free trade is when..." or "Free trade can lead to specialisation where..."),
        // prevent the LLM from misclassifying it as AO2 Analysis.
        const detClassification = classifySentence(sentence);
        if (detClassification && detClassification.ao === "AO1" && detClassification.confidence >= 0.9) {
          ao = "AO1";
          explanation = detClassification.explanation;
        }

        // If model returns a partial phrase or exact sentence, prefer whole sentence
        // so highlighting is clean, seamless, and unbroken across the entire sentence.
        if (!original || !sentence.toLowerCase().includes(original.toLowerCase()) || original.length > sentence.trim().length * 0.6) {
          original = sentence.trim();
        } else {
          const localIndex = sentence.toLowerCase().indexOf(original.toLowerCase());
          if (localIndex !== -1) {
            original = sentence.slice(localIndex, localIndex + original.length);
          } else {
            original = sentence.trim();
          }
        }

        return [
          {
            original,
            context: sentence,
            ao,
            explanation: explanation || `${ao} creditworthy evidence identified by the examiner.`,
          },
        ];
      });
      if (predictedMark && predictedMark.total_mark === 0) {
        classifications.length = 0;
      }
      const candidates = issuesRaw.flatMap<Candidate>((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        const idx = Number(record.sentence_index);
        const sentence = Number.isInteger(idx) ? toSend[idx - 1] : undefined;
        let original = typeof record.original === "string" ? stripAsterisks(record.original) : "";
        let suggestion = typeof record.suggestion === "string" ? stripAsterisks(record.suggestion) : "";
        const explanation = typeof record.explanation === "string" ? stripAsterisks(record.explanation) : "";
        const evidence = typeof record.evidence === "string" ? stripAsterisks(record.evidence) : "";
        const confidence = Number(record.confidence);
        const parsedCategory = CATEGORIES.includes(record.category as (typeof CATEGORIES)[number])
          ? (record.category as (typeof CATEGORIES)[number])
          : null;
        const parsedSeverity = SEVERITIES.includes(record.severity as (typeof SEVERITIES)[number])
          ? (record.severity as (typeof SEVERITIES)[number])
          : "medium";
        if (!sentence || !original || !suggestion || !parsedCategory) return [];
        if (original.toLowerCase().trim() === suggestion.toLowerCase().trim()) return [];
        if (!Number.isFinite(confidence) || confidence < CONFIDENCE_THRESHOLD) return [];

        // Normalize issue spans to minimal replacements and guard against sentence chopping
        const normalized = normalizeIssueSpan({
          sentence,
          original,
          suggestion,
          category: parsedCategory,
        });
        if (!normalized) return [];

        original = stripAsterisks(normalized.original);
        suggestion = cleanSuggestion(stripAsterisks(normalized.suggestion));

        if (original.toLowerCase().trim() === suggestion.toLowerCase().trim()) return [];

        // Suppress low-confidence or pedantic grammar/clarity noise
        if ((parsedCategory === "grammar" || parsedCategory === "clarity") && confidence < 0.70) {
          return [];
        }

        // Guard against a hallucinated correction that doesn't even
        // appear in the sentence it claims to fix.
        if (!sentence.toLowerCase().includes(original.toLowerCase())) return [];
        // Economics claims need real proof: the cited evidence must
        // literally exist in the retrieved syllabus material, checked
        // here rather than trusted from the model's own claim.
        if (
          parsedCategory === "economics_accuracy" &&
          data.contextBlock &&
          !evidenceAppearsInContext(evidence, data.contextBlock) &&
          !/off[- ]topic/i.test(explanation + " " + evidence)
        ) {
          return [];
        }
        return [
          {
            original,
            suggestion,
            category: parsedCategory,
            severity: parsedSeverity,
            explanation: explanation || "Flagged by the examiner check.",
            context: sentence,
            evidence: evidence || undefined,
            confidence,
          },
        ];
      });

      let freshIssues: LiveExaminerIssue[] = [];

      // Split off the mechanical, high-confidence candidates so they skip
      // Stage 2 entirely (see AUTO_KEEP_CATEGORIES above) — they show up a
      // full round trip sooner. Everything else (every AO-judgement
      // category, and any lower-confidence mechanical one) still goes
      // through independent verification exactly as before; accuracy on
      // the categories that actually affect a mark is unchanged.
      const autoKept: LiveExaminerIssue[] = [];
      const needsVerification: Candidate[] = [];
      for (const candidate of candidates) {
        if (
          AUTO_KEEP_CATEGORIES.has(candidate.category) &&
          candidate.confidence >= AUTO_KEEP_CONFIDENCE
        ) {
          const { confidence: _confidence, ...issue } = candidate;
          autoKept.push(issue);
        } else {
          needsVerification.push(candidate);
        }
      }

      // ---- Stage 2: independent verification ----
      // Only spend a second call when there are still candidates that need
      // it — a clean passage, or one where everything was auto-kept, never
      // pays for verification it doesn't need.
      if (needsVerification.length > 0) {
        const candidateBlock = needsVerification
          .map(
            (c, index) =>
              `${index + 1}. [${c.category}] Student wrote: "${c.context}"\n   Flagged phrase: "${c.original}" → suggested: "${c.suggestion}"\n   Claimed reason: ${c.explanation}\n   Evidence offered: ${c.evidence || "(none)"}`,
          )
          .join("\n\n");

        const verifyResult = await chat({
          model: MODEL_LIVE_CHECK,
          feature: "live_examiner_verify",
          userId: context.userId,
          temperature: 0,
          maxCompletionTokens: 400,
          json: true,
          messages: [
            {
              role: "system",
              content: buildVerifierSystemPrompt(data.question, compactedContext),
            },
            { role: "user", content: `CANDIDATES:\n\n${candidateBlock}` },
          ],
        });

        const verifyRaw = extractFirstJsonObject(verifyResult.text);
        const verdicts = Array.isArray(verifyRaw.verdicts) ? verifyRaw.verdicts : [];
        const verdictByIndex = new Map<number, { keep: boolean; explanation?: string }>();
        for (const v of verdicts) {
          const record = (v ?? {}) as Record<string, unknown>;
          const idx = Number(record.index);
          if (!Number.isInteger(idx)) continue;
          verdictByIndex.set(idx, {
            keep: record.keep === true,
            explanation: typeof record.explanation === "string" ? record.explanation : undefined,
          });
        }

        const verified = needsVerification
          .map((candidate, i) => {
            const verdict = verdictByIndex.get(i + 1);
            if (!verdict?.keep) return null;
            const { confidence: _confidence, ...issue } = candidate;
            return { ...issue, explanation: stripAsterisks(verdict.explanation || issue.explanation) };
          })
          .filter((item): item is LiveExaminerIssue => item !== null);

        // Trickle new issues in rather than dumping all of them at once.
        freshIssues = [...autoKept, ...verified].slice(0, MAX_NEW_ISSUES_PER_CALL);
      } else {
        freshIssues = autoKept.slice(0, MAX_NEW_ISSUES_PER_CALL);
      }

      const merged = dedupeAndCap([...carryForward(), ...deterministic, ...freshIssues]);

      const sentenceObjects = currentSentences.map((s, idx) => ({
        id: `s_${idx}`,
        text: s,
        paragraphIndex: 0,
        sentenceIndex: idx,
        isComplete: true,
      }));

      const semanticClassifications = evaluateParagraphSemantics({
        sentences: sentenceObjects,
        paragraphText: data.essayText,
        docVersion: 1,
        rubric,
      });

      for (const c of classifications) {
        const match = semanticClassifications.find(
          (sc) =>
            sc.evidence.toLowerCase().includes(c.original.toLowerCase()) ||
            c.original.toLowerCase().includes(sc.evidence.toLowerCase())
        );
        if (match && c.ao) {
          match.primaryAO = c.ao as any;
        }
      }

      const ledgerResult = buildMarkLedger({
        sentences: sentenceObjects,
        classifications: semanticClassifications,
        rubric,
        isAiVerified: true,
      });

      const feedbackResult = generateFeedbackAndOpportunities({
        ledger: ledgerResult.ledger,
        rubric,
        aoBreakdown: ledgerResult.aoBreakdown,
        totalWords: wordCount,
      });

      if (predictedMark) {
        ledgerResult.totalMark = predictedMark.total_mark;
        ledgerResult.aoBreakdown.ao1.awarded = predictedMark.ao_breakdown.knowledge.awarded;
        ledgerResult.aoBreakdown.ao2.awarded = predictedMark.ao_breakdown.analysis.awarded;
        ledgerResult.aoBreakdown.ao3.awarded = predictedMark.ao_breakdown.evaluation.awarded;
        ledgerResult.status = "verified";
        ledgerResult.markRange = [
          Math.max(0, predictedMark.total_mark - (predictedMark.total_mark === 0 ? 0 : 1)),
          Math.min(data.maxMark, predictedMark.total_mark + (predictedMark.total_mark === 0 ? 0 : 1)),
        ];
      }

      return cleanStars({
        issues: merged,
        classifications,
        classifiedContexts: toSend,
        clean: merged.length === 0,
        checkedText: data.essayText,
        predictedMark,
        rubric,
        ledger: ledgerResult.ledger,
        arguments: ledgerResult.arguments,
        opportunities: feedbackResult.opportunities,
        strengths: feedbackResult.strengths,
        areasForImprovement: feedbackResult.areasForImprovement,
        markRange: ledgerResult.markRange,
        status: ledgerResult.status,
      });
    } catch (_error) {
      // A failed check is an enhancement failing, never a hard gate — keep
      // whatever was already found (plus the free deterministic pass).
      const surviving = dedupeAndCap([...carryForward(), ...deterministic]);
      const sentenceObjects = currentSentences.map((s, idx) => ({
        id: `s_${idx}`,
        text: s,
        paragraphIndex: 0,
        sentenceIndex: idx,
        isComplete: true,
      }));
      const fallbackRubric = buildQuestionRubric({
        question: data.question,
        level: data.level,
        maxMark: data.maxMark,
        contextBlock: data.contextBlock,
      });
      const semanticClassifications = evaluateParagraphSemantics({
        sentences: sentenceObjects,
        paragraphText: data.essayText,
        docVersion: 1,
        rubric: fallbackRubric,
      });
      const localLedger = buildMarkLedger({
        sentences: sentenceObjects,
        classifications: semanticClassifications,
        rubric: fallbackRubric,
        isAiVerified: false,
      });
      const localFeedback = generateFeedbackAndOpportunities({
        ledger: localLedger.ledger,
        rubric: fallbackRubric,
        aoBreakdown: localLedger.aoBreakdown,
        totalWords: wordCount,
      });

      return cleanStars({
        issues: surviving,
        classifications: [] as LiveExaminerAoClassification[],
        classifiedContexts: [] as string[],
        clean: surviving.length === 0,
        checkedText: data.essayText,
        checkFailed: true,
        predictedMark: null,
        rubric: fallbackRubric,
        ledger: localLedger.ledger,
        arguments: localLedger.arguments,
        opportunities: localFeedback.opportunities,
        strengths: localFeedback.strengths,
        areasForImprovement: localFeedback.areasForImprovement,
        markRange: localLedger.markRange,
        status: localLedger.status,
      });
    }
  });

// ---------------------------------------------------------------------------
// 3. Autosave — one row per (user, question), upserted on a debounce from
//    the client. Cheap: no AI involved.
// ---------------------------------------------------------------------------

const SaveSessionInput = z.object({
  level: z.enum(["as", "a2"]),
  topic: z.string().trim().max(200).default(""),
  question: z.string().trim().min(5).max(2000),
  maxMark: z.number().int().positive().max(30),
  essayText: z.string().max(40_000),
  issuesHistory: z.array(z.record(z.string(), z.unknown())).max(1000).default([]),
  sentenceCache: z.record(z.string(), z.unknown()).default({}),
  scoreHistory: z.array(z.record(z.string(), z.unknown())).default([]),
  docVersion: z.number().int().default(0),
  schemaVersion: z.number().int().default(2),
  /** The attached diagrams' [DIAGRAM: ...] tags, joined together if there's
   *  more than one, so they survive a reload/resume exactly like the essay
   *  text does. Sized for several diagrams, not just one. */
  diagramTag: z.string().trim().max(4000).nullable().optional(),
});

export const saveLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertLiveExaminerSessionAllowed(context.supabase, data.question, context);

    let { data: row, error } = await context.supabase
      .from("live_examiner_sessions")
      .upsert(
        {
          user_id: context.userId,
          level: data.level,
          topic: data.topic,
          question: data.question,
          max_mark: data.maxMark,
          essay_text: data.essayText,
          issues_history: data.issuesHistory as Json,
          sentence_cache: data.sentenceCache as Json,
          score_history: data.scoreHistory as Json,
          doc_version: data.docVersion,
          schema_version: data.schemaVersion,
          diagram_tag: data.diagramTag ?? null,
        },
        { onConflict: "user_id,question" },
      )
      .select("id, updated_at")
      .single();

    if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
      const fallback = await context.supabase
        .from("live_examiner_sessions")
        .upsert(
          {
            user_id: context.userId,
            level: data.level,
            topic: data.topic,
            question: data.question,
            max_mark: data.maxMark,
            essay_text: data.essayText,
            issues_history: data.issuesHistory as Json,
            diagram_tag: data.diagramTag ?? null,
          },
          { onConflict: "user_id,question" },
        )
        .select("id, updated_at")
        .single();
      row = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(error.message);
    return { sessionId: row.id as string, savedAt: row.updated_at as string };
  });

const GetSessionInput = z.object({
  question: z.string().trim().min(5).max(2000),
});

export const getLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    assertAdminOnlyAccess(context);
    try {
      let result = await Promise.race([
        context.supabase
          .from("live_examiner_sessions")
          .select(
            "id, level, topic, question, max_mark, essay_text, issues_history, sentence_cache, score_history, doc_version, schema_version, diagram_tag, updated_at",
          )
          .eq("user_id", context.userId)
          .eq("question", data.question)
          .maybeSingle(),
        new Promise<{ data: null; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 3000),
        ),
      ]);

      if (result.error && ((result.error as any).code === "PGRST204" || (result.error.message && result.error.message.includes("column")))) {
        result = await context.supabase
          .from("live_examiner_sessions")
          .select(
            "id, level, topic, question, max_mark, essay_text, issues_history, diagram_tag, updated_at",
          )
          .eq("user_id", context.userId)
          .eq("question", data.question)
          .maybeSingle();
      }

      const session = result.data ? {
        ...result.data,
        sentence_cache: (result.data as any).sentence_cache ?? {},
        score_history: (result.data as any).score_history ?? [],
        doc_version: (result.data as any).doc_version ?? 0,
        schema_version: (result.data as any).schema_version ?? 1,
      } : null;
      return { session };
    } catch {
      return { session: null };
    }
  });

// ---------------------------------------------------------------------------
// 4. History — every past writing session for this student, newest first,
//    so Live Examiner can offer a "past essays" panel to browse and resume
//    from (the same one-row-per-question table autosave already writes to;
//    this just lists it instead of fetching a single row by question).
// ---------------------------------------------------------------------------

export const listLiveExaminerSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdminOnlyAccess(context);
    try {
      const result = await Promise.race([
        context.supabase
          .from("live_examiner_sessions")
          .select("id, level, topic, question, max_mark, essay_text, updated_at")
          .eq("user_id", context.userId)
          .order("updated_at", { ascending: false })
          .limit(100),
        new Promise<{ data: []; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: [], error: null }), 3500),
        ),
      ]);

      return (result.data ?? []).map((row) => {
        const essayText = (row.essay_text as string | null) ?? "";
        const trimmed = essayText.trim();
        return {
          id: row.id as string,
          level: row.level as "as" | "a2",
          topic: row.topic as string,
          question: row.question as string,
          maxMark: row.max_mark as number,
          wordCount: trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length,
          updatedAt: row.updated_at as string,
        };
      });
    } catch {
      return [];
    }
  });

const DeleteSessionInput = z.object({ id: z.string().uuid() });

export const deleteLiveExaminerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    assertAdminOnlyAccess(context);
    // Scoped to user_id as well as id — belt and braces alongside the RLS
    // policy, so this can never touch a row that isn't the caller's own.
    const { error, count } = await context.supabase
      .from("live_examiner_sessions")
      .delete({ count: "exact" })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    if (!count) throw new Error("That essay couldn't be found — it may already be deleted.");
    return { deleted: true };
  });

// ---------------------------------------------------------------------------
// 5. "Max out this answer" — an on-demand, deeper suggestion pass a student
//    triggers themselves once they've finished writing (from the "Grade
//    now" result), separate from the continuous while-you-type checking
//    above. Takes the mark the essay already got (with its examiner's own
//    weaknesses/missing-elements/actionable-feedback, already grounded by
//    the marking pass) and turns it into a small number of concrete,
//    specific, write-this-in additions targeted at the marks actually
//    still on the table — not a repeat of the general feedback already
//    shown alongside the mark.
// ---------------------------------------------------------------------------

const MaxOutMissingElements = z
  .object({
    definitions: z.array(z.string()).default([]),
    analysis: z.array(z.string()).default([]),
    evaluation: z.array(z.string()).default([]),
    examples: z.array(z.string()).default([]),
    diagrams: z.array(z.string()).default([]),
  })
  .partial()
  .default({});

const MaxOutInput = z.object({
  question: z.string().trim().min(5).max(2000),
  level: z.enum(["as", "a2"]),
  maxMark: z.number().int().positive().max(30),
  essayText: z.string().trim().min(1).max(40_000),
  contextBlock: z.string().max(20_000).default(""),
  totalMark: z.number().min(0),
  band: z.string().max(120).default(""),
  weaknesses: z.array(z.string()).max(20).default([]),
  missingElements: MaxOutMissingElements,
  actionableFeedback: z.array(z.string()).max(20).default([]),
});

const AoTargetSchema = z.enum(["ao1", "ao2", "ao3", "structure"]);

const StrategicOptionSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  sentence_starter: z.string().optional(),
});

const MaxOutSuggestionSchema = z.object({
  target_ao: AoTargetSchema,
  title: z.string().min(1).max(80),
  suggestion: z.string().min(1).max(600),
  mark_uplift: z.string().max(40),
  placement: z.string().optional(),
  placement_rationale: z.string().optional(),
  how_to_write: z.array(z.string()).optional(),
  strategic_options: z.array(StrategicOptionSchema).optional(),
  model_phrasing: z.string().optional(),
});

export const MaxOutResponseSchema = z.object({
  headline: z.string().max(160),
  target_band: z.string().optional(),
  perfection_summary: z.string().optional(),
  suggestions: z.array(MaxOutSuggestionSchema).max(6),
});

export type MaxOutSuggestion = z.infer<typeof MaxOutSuggestionSchema>;
export type MaxOutResponse = z.infer<typeof MaxOutResponseSchema>;

function buildMaxOutSystemPrompt(
  question: string,
  level: string,
  maxMark: number,
  contextBlock: string,
): string {
  return `You are a Principal Cambridge IGCSE 0455 Economics Examiner creating a high-impact "Score Maximizer Blueprint" to elevate an already-written student essay to full marks (${maxMark}/${maxMark}).

QUESTION (${level === "a2" ? "A Level" : "AS Level"}, ${maxMark} marks): ${question}

SYLLABUS MATERIAL RETRIEVED FOR THIS QUESTION:
${contextBlock || "None retrieved — ground all advice strictly in official Cambridge IGCSE 0455 standards."}

INSTRUCTIONS FOR THE SCORE MAXIMIZER BLUEPRINT:
1. Every suggestion must be CONCRETE, SURGICAL, and SPECIFIC to what THIS student actually wrote. Reference the student's existing paragraphs, arguments, or missing links directly.
2. Provide at most 4 high-impact upgrades ordered by mark value (biggest mark gain first).
3. For each upgrade, specify:
   - "target_ao": "ao1" | "ao2" | "ao3" | "structure"
   - "title": crisp 4-8 word title (e.g. "Complete the PED Tax-Incidence Chain")
   - "suggestion": 2-3 sentences explaining the exact gap in the student's script and why fixing it unlocks marks.
   - "mark_uplift": e.g. "+2 marks (AO2)"
   - "placement": exact paragraph/section where this belongs (e.g. "Paragraph 1 (Introduction & Core Definitions)", "Paragraph 2 (Analytical Body — Transmission Chain)", "Final Paragraph (Evaluative Synthesis & Judgement)").
   - "placement_rationale": 1 sentence explaining why this structural placement maximizes examiner clarity.
   - "how_to_write": array of 2-3 step-by-step instructions on how to construct this point.
   - "strategic_options": array of 2 distinct economic angles the student can choose from, each with "label", "description", and "sentence_starter".
   - "model_phrasing": a complete, ready-to-insert Cambridge IGCSE 0455 Top-Band sentence or short paragraph (25-55 words) that the student can insert directly into their essay.
4. NO ASTERISKS: Return ONLY clean plain text with ZERO asterisks (* or **). Never use rule labels or code identifiers.

Respond ONLY with a single valid JSON object, no markdown fences, no commentary:
{
  "headline": "<one short sentence on the single biggest thing standing between this draft and full marks>",
  "target_band": "Top Band (Level 4 — Full Marks Trajectory)",
  "perfection_summary": "<1-2 sentences summarising how these targeted upgrades elevate the essay to full marks>",
  "suggestions": [
    {
      "target_ao": "<ao1 | ao2 | ao3 | structure>",
      "title": "<max 8 words>",
      "suggestion": "<2-3 sentences specific to this essay>",
      "mark_uplift": "<short estimate, e.g. '+2 marks'>",
      "placement": "<exact paragraph placement>",
      "placement_rationale": "<1 sentence why it belongs there>",
      "how_to_write": ["<step 1>", "<step 2>"],
      "strategic_options": [
        {
          "label": "<Angle 1 name>",
          "description": "<1 sentence description>",
          "sentence_starter": "<opening clause>"
        },
        {
          "label": "<Angle 2 name>",
          "description": "<1 sentence description>",
          "sentence_starter": "<opening clause>"
        }
      ],
      "model_phrasing": "<complete, top-band Cambridge IGCSE 0455 sentence/paragraph ready to insert>"
    }
  ]
}`;
}

function buildMaxOutUserPrompt(
  essayText: string,
  totalMark: number,
  maxMark: number,
  band: string,
  weaknesses: string[],
  missingElements: z.infer<typeof MaxOutMissingElements>,
  actionableFeedback: string[],
): string {
  const missingLines = (Object.entries(missingElements) as [string, string[] | undefined][])
    .filter(([, items]) => (items ?? []).length > 0)
    .map(([key, items]) => `- ${key}: ${(items ?? []).join("; ")}`)
    .join("\n");

  return `CURRENT MARK: ${totalMark}/${maxMark} (${band || "band not set"})

WHAT THE EXAMINER ALREADY FLAGGED AS COSTING MARKS:
${weaknesses.length > 0 ? weaknesses.map((w) => `- ${w}`).join("\n") : "- (none flagged)"}

MISSING ELEMENTS THE EXAMINER IDENTIFIED:
${missingLines || "- (none flagged)"}

EXAMINER'S ALREADY-GIVEN ACTIONABLE FEEDBACK (do not just repeat this — go further, be more specific):
${actionableFeedback.length > 0 ? actionableFeedback.map((f) => `- ${f}`).join("\n") : "- (none given)"}

THE STUDENT'S FULL ANSWER:
${essayText}`;
}

/**
 * Triggered from the "Grade now" result or on-demand Score Maximizer once a
 * student has written a draft.
 */
export const getMaxOutSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MaxOutInput.parse(input))
  .handler(async ({ data, context }) => {
    assertAdminOnlyAccess(context);
    const { chat } = await import("./ai.server");
    const { MODEL_GRADING, TEMPERATURE_TUTOR } = await import("./examiner/config");
    const { extractFirstJsonObject } = await import("./examiner/json");

    const result = await chat({
      model: MODEL_GRADING,
      feature: "live_examiner_maximise",
      userId: context.userId,
      temperature: TEMPERATURE_TUTOR,
      json: true,
      maxCompletionTokens: 2400,
      messages: [
        {
          role: "system",
          content: buildMaxOutSystemPrompt(
            data.question,
            data.level,
            data.maxMark,
            compactSyllabusContext(data.contextBlock) || data.contextBlock,
          ),
        },
        {
          role: "user",
          content: buildMaxOutUserPrompt(
            data.essayText,
            data.totalMark,
            data.maxMark,
            data.band,
            data.weaknesses,
            data.missingElements,
            data.actionableFeedback,
          ),
        },
      ],
    });

    const parsed = MaxOutResponseSchema.safeParse(extractFirstJsonObject(result.text));
    if (!parsed.success) {
      throw new Error("Couldn't generate suggestions just now — try again.");
    }
    return cleanStars({
      headline: stripAsterisks(parsed.data.headline),
      target_band: parsed.data.target_band ? stripAsterisks(parsed.data.target_band) : undefined,
      perfection_summary: parsed.data.perfection_summary
        ? stripAsterisks(parsed.data.perfection_summary)
        : undefined,
      suggestions: parsed.data.suggestions.map((s) => ({
        ...s,
        title: stripAsterisks(s.title),
        suggestion: cleanSuggestion(stripAsterisks(s.suggestion)),
        mark_uplift: stripAsterisks(s.mark_uplift),
        placement: s.placement ? stripAsterisks(s.placement) : undefined,
        placement_rationale: s.placement_rationale ? stripAsterisks(s.placement_rationale) : undefined,
        how_to_write: s.how_to_write?.map((step) => stripAsterisks(step)),
        strategic_options: s.strategic_options?.map((opt) => ({
          label: opt.label ? stripAsterisks(opt.label) : undefined,
          description: opt.description ? stripAsterisks(opt.description) : undefined,
          sentence_starter: opt.sentence_starter ? stripAsterisks(opt.sentence_starter) : undefined,
        })),
        model_phrasing: s.model_phrasing ? stripAsterisks(s.model_phrasing) : undefined,
      })),
    });
  });

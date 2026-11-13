/**
 * Syllabus Guardrail for Marginalite (Cambridge IGCSE Economics 0455).
 *
 * Prevents non-economics submissions and Advanced post-16 economics topics from:
 * 1. Burning costly AI grading calls.
 * 2. Polluting the IGCSE vector database, platform marks, and student analytics.
 */

import { chat } from "../ai.server";
import { MODEL_FAST, SYLLABUS_CODE } from "./config";

export class OffSyllabusError extends Error {
  readonly detectedSubject: string;
  readonly reason: string;

  constructor(detectedSubject: string, reason: string) {
    super(
      `This question appears to be from ${detectedSubject || "another subject"} rather than Cambridge IGCSE Economics (0455). Marginalite is exclusively calibrated for IGCSE Economics 0455. ${reason ? `(${reason})` : ""}`.trim(),
    );
    this.name = "OffSyllabusError";
    this.detectedSubject = detectedSubject;
    this.reason = reason;
  }
}

/**
 * High-confidence Cambridge IGCSE Economics (0455) keywords based on Units 1–6.
 */
const HIGH_CONFIDENCE_0455_ECON_TERMS: RegExp[] = [
  /\bbasic economic problem\b/i,
  /\bfinite resources\b/i,
  /\binfinite wants\b/i,
  /\bscarcity\b/i,
  /\bfactors of production\b/i,
  /\bopportunity cost\b/i,
  /\bproduction possibilit(y|ies)\b/i,
  /\bppc\b/i,
  /\bprice mechanism\b/i,
  /\bmarket equilibrium\b/i,
  /\bmarket disequilibrium\b/i,
  /\bprice elasticity of demand\b/i,
  /\bped\b/i,
  /\bprice elasticity of supply\b/i,
  /\bpes\b/i,
  /\bmarket economic system\b/i,
  /\bmixed economic system\b/i,
  /\bmarket failure\b/i,
  /\bpublic good(s)?\b/i,
  /\bmerit good(s)?\b/i,
  /\bdemerit good(s)?\b/i,
  /\bexternal (cost|benefit)(s)?\b/i,
  /\bsocial (cost|benefit)(s)?\b/i,
  /\bmaximum price\b/i,
  /\bminimum price\b/i,
  /\bindirect tax(es)?\b/i,
  /\bsubsid(y|ies)\b/i,
  /\bcentral bank\b/i,
  /\bcommercial bank(s)?\b/i,
  /\btrade union(s)?\b/i,
  /\bnational minimum wage\b/i,
  /\bnmw\b/i,
  /\bdivision of labo(u)?r\b/i,
  /\beconomies of scale\b/i,
  /\bdiseconomies of scale\b/i,
  /\bincome distribution\b/i,
  /\blow-income\b/i,
  /\bwork(ing)? (long )?hours\b/i,
  /\bcompetitive market(s)?\b/i,
  /\bmonopol(y|ies)\b/i,
  /\bfixed exchange rate\b/i,
  /\bincome tax\b/i,
  /\btax(ation)? on the rich\b/i,
  /\bwage(s)?\b/i,
  /\blabou?r mobility\b/i,
  /\bfiscal policy\b/i,
  /\bmonetary policy\b/i,
  /\bsupply[- ]side polic(y|ies)\b/i,
  /\beconomic growth\b/i,
  /\bgross domestic product\b/i,
  /\bgdp\b/i,
  /\brecession\b/i,
  /\bunemployment\b/i,
  /\binflation\b/i,
  /\bconsumer prices index\b/i,
  /\bcpi\b/i,
  /\bliving standards\b/i,
  /\bhuman development index\b/i,
  /\bhdi\b/i,
  /\babsolute poverty\b/i,
  /\brelative poverty\b/i,
  /\boptimum population\b/i,
  /\bspecialisation by country\b/i,
  /\bfree trade\b/i,
  /\bglobalisation\b/i,
  /\bmultinational compan(y|ies)\b/i,
  /\bmnc(s)?\b/i,
  /\btariff(s)?\b/i,
  /\bimport quota(s)?\b/i,
  /\bembargo(es)?\b/i,
  /\bforeign exchange rate(s)?\b/i,
  /\bfloating exchange rate\b/i,
  /\bappreciation\b/i,
  /\bdepreciation\b/i,
  /\bbalance of payments\b/i,
  /\bcurrent account\b/i,
];

/**
 * Topics from other subjects or Advanced Post-16 Economics NOT in Cambridge IGCSE 0455.
 */
const OBVIOUS_OFF_SYLLABUS_TERMS: { pattern: RegExp; subject: string }[] = [
  // Other subjects
  { pattern: /\b(autistic|autism|doodle|doodling|semi-structured interview|naturalistic observation|participant observation|bandura|milgram|zimbardo|loftus)\b/i, subject: "Psychology" },
  { pattern: /\b(photosynthesis|chloroplast|mitochondri(a|on)|cellular respiration|dna replication|mitosis|meiosis|enzyme substrate)\b/i, subject: "Biology" },
  { pattern: /\b(shakespeare|macbeth|hamlet|soliloquy|iambic pentameter|stanza|sonnet|protagonist|antagonist)\b/i, subject: "English Literature" },
  { pattern: /\b(titration|stoichiometry|covalent bond|ionic bond|periodic table|enthalpy of combustion)\b/i, subject: "Chemistry" },
  { pattern: /\b(projectile motion|kinematics|gravitational potential|quantum mechanics|electromagnetic induction)\b/i, subject: "Physics" },

  // Post-16 / Advanced Economics topics excluded from IGCSE 0455
  { pattern: /\b(keynesian cross|45 degree line diagram|multiplier formula|marginal propensity to consume|marginal propensity to save|is-lm model)\b/i, subject: "Advanced Post-16 Economics (Keynesian Cross & Multiplier Maths)" },
  { pattern: /\b(monopolistic competition|tangency of ar and ac|kinked demand curve|nash equilibrium|game theory pay-off)\b/i, subject: "Advanced Post-16 Economics (Market Structures Theory)" },
  { pattern: /\b(marshall-lerner condition|j-curve effect|liquidity preference theory)\b/i, subject: "Advanced Post-16 Economics (Macroeconomic Models)" },
  { pattern: /\b(indifference curve|budget line analysis|mrs)\b/i, subject: "Advanced Post-16 Economics (Consumer Theory)" },
];

export type SyllabusValidationResult = {
  isEconomics: boolean;
  detectedSubject: string;
  reason: string;
};

/**
 * Fast syllabus pre-flight validator for IGCSE Economics 0455.
 * Throws `OffSyllabusError` if the question or excerpt is non-economics or advanced post-16 only.
 */
export async function validateEconomicsSyllabus(
  question: string,
  essayExcerpt?: string,
): Promise<SyllabusValidationResult> {
  const trimmed = question?.trim() ?? "";
  if (trimmed.length < 5) {
    throw new Error("Question is too short to evaluate. Please provide a full question.");
  }

  // 1. Check for blatant off-syllabus or advanced post-16 terms
  for (const { pattern, subject } of OBVIOUS_OFF_SYLLABUS_TERMS) {
    if (pattern.test(trimmed) || (essayExcerpt && pattern.test(essayExcerpt))) {
      throw new OffSyllabusError(
        subject,
        `Topic is outside Cambridge IGCSE Economics (${SYLLABUS_CODE}).`,
      );
    }
  }

  // 2. High-confidence match for IGCSE 0455 Economics
  const hasStrongEconSignal = HIGH_CONFIDENCE_0455_ECON_TERMS.some((term) => term.test(trimmed));
  if (hasStrongEconSignal) {
    return {
      isEconomics: true,
      detectedSubject: `Cambridge IGCSE Economics (${SYLLABUS_CODE})`,
      reason: "Matched official Cambridge IGCSE 0455 curriculum terminology.",
    };
  }

  // 3. Fast LLM classifier for ambiguous inputs
  try {
    const prompt = `You are a strict syllabus gatekeeper for Marginalite, an assessment platform calibrated exclusively for Cambridge IGCSE Economics (Syllabus 0455).

Determine whether the question below belongs to Cambridge IGCSE Economics 0455, OR if it belongs to another school subject (Psychology, Biology, History, Literature, Physics, Chemistry, casual chat) OR an Advanced post-16 topic (such as the Keynesian cross, IS-LM, game theory matrices, or monopolistic competition tangency).

Question:
"${trimmed.slice(0, 1000)}"

${essayExcerpt ? `Candidate Text Excerpt:\n"${essayExcerpt.slice(0, 400)}"\n` : ""}

Respond ONLY with a valid JSON object in this format:
{
  "isEconomics": boolean,
  "detectedSubject": string,
  "reason": string
}`;

    const res = await chat({
      model: MODEL_FAST,
      temperature: 0,
      json: true,
      messages: [{ role: "user", content: prompt }],
      maxCompletionTokens: 150,
    });

    const parsed = JSON.parse(res.text.trim()) as {
      isEconomics?: boolean;
      detectedSubject?: string;
      reason?: string;
    };

    if (parsed.isEconomics === false) {
      throw new OffSyllabusError(
        parsed.detectedSubject || "an off-syllabus subject",
        parsed.reason || "Question is outside Cambridge IGCSE Economics 0455.",
      );
    }

    return {
      isEconomics: true,
      detectedSubject: parsed.detectedSubject || `Cambridge IGCSE Economics (${SYLLABUS_CODE})`,
      reason: parsed.reason || "Validated as IGCSE 0455 Economics content.",
    };
  } catch (err) {
    if (err instanceof OffSyllabusError) throw err;
    console.warn("Syllabus guardrail classifier fallback:", err);
    return {
      isEconomics: true,
      detectedSubject: `Cambridge IGCSE Economics (${SYLLABUS_CODE})`,
      reason: "Classifier fallback",
    };
  }
}

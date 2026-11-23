/**
 * Cambridge IGCSE Economics (0455) Economic Misconception & Inverted Mechanism Radar.
 *
 * Implements authoritative syllabus rules to catch fundamental economic fallacies
 * that AI examiners sometimes hallucinate or pass through (e.g. confusing price ceilings
 * and price floors, or claiming non-binding price controls alter equilibrium).
 */

import { cleanStars } from "@/lib/utils";
import type { AoSplit } from "./config";
import { bandFor, stripScoreFractionsFromText, type Grading } from "./types";

export type DetectedMisconception = {
  topic: string;
  verbatimQuote: string;
  correction: string;
};

/**
 * Scans candidate text for explicit, verifiable economic misconceptions under Cambridge IGCSE 0455.
 */
export function detectExplicitMisconceptions(essayText: string): DetectedMisconception[] {
  if (!essayText || typeof essayText !== "string") return [];

  const detected: DetectedMisconception[] = [];
  const sentences = essayText
    .replace(/\n+/g, " ")
    .replace(/([.?!])\s+/g, "$1\0")
    .split("\0")
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  for (const sentence of sentences) {
    // 1. MAXIMUM PRICE (Price Ceiling) ABOVE EQUILIBRIUM FALLACY
    // Claiming a maximum price above equilibrium raises prices, increases revenue/profits, boosts supply/GDP, or causes inflation.
    const maxAboveRegex =
      /\b(?:maximum\s+price|price\s+ceiling|max\s+price)\b[^.?!]{0,80}\babove\b[^.?!]{0,60}\bequilibrium\b[^.?!]{0,100}\b(?:incentivi[sz]e|increase|raise|boost|higher|more\s+(?:housing|production|supply)|revenue|profit|production|gdp|inflation|expensive)\b/i;

    if (maxAboveRegex.test(sentence)) {
      // Ensure the candidate is not actually saying it is non-binding / has no effect
      const hasNegation =
        /\b(?:no\s+effect|ineffective|non-binding|not\s+effective|does\s+not\s+(?:change|affect|raise|increase))\b/i.test(
          sentence,
        );
      if (!hasNegation) {
        detected.push({
          topic: "Price Controls (Cambridge IGCSE 0455 Unit 4.3: Maximum Price / Price Ceiling)",
          verbatimQuote: sentence,
          correction:
            "A maximum price (price ceiling) is a legal cap set by the government. To be effective, it MUST be set BELOW the market equilibrium price to make necessities affordable. A maximum price set ABOVE equilibrium is completely non-binding and ineffective (the market continues to clear at the equilibrium price). It CANNOT push prices up, CANNOT increase revenue or profits, CANNOT incentivise producers to supply more, and CANNOT cause inflation.",
        });
      }
    }

    // 2. MINIMUM PRICE (Price Floor) BELOW EQUILIBRIUM FALLACY
    // Claiming a minimum price below equilibrium lowers prices or makes goods cheaper.
    const minBelowRegex =
      /\b(?:minimum\s+price|price\s+floor|min\s+price)\b[^.?!]{0,80}\bbelow\b[^.?!]{0,60}\bequilibrium\b[^.?!]{0,100}\b(?:cheaper|decrease|lower|affordable|reduce\s+price)\b/i;

    if (minBelowRegex.test(sentence)) {
      const hasNegation =
        /\b(?:no\s+effect|ineffective|non-binding|not\s+effective|does\s+not\s+(?:change|affect|lower|reduce))\b/i.test(
          sentence,
        );
      if (!hasNegation) {
        detected.push({
          topic: "Price Controls (Cambridge IGCSE 0455 Unit 4.3: Minimum Price / Price Floor)",
          verbatimQuote: sentence,
          correction:
            "A minimum price (price floor) is a legal minimum price. To be effective, it MUST be set ABOVE the market equilibrium price. A minimum price set BELOW equilibrium is non-binding and has zero effect on the market price.",
        });
      }
    }

    // 3. INVERTED SUPPLY MECHANISM
    // Claiming an outward shift of supply or increased supply increases the equilibrium price
    const invertedSupplyRegex =
      /\b(?:increase\s+in\s+supply|supply\s+(?:curve\s+)?shifts?\s+right|higher\s+supply)\b[^.?!]{0,80}\b(?:raises?|increases?|drives?\s+up|leads?\s+to\s+higher)\s+(?:the\s+)?(?:equilibrium\s+)?price\b/i;

    if (invertedSupplyRegex.test(sentence)) {
      detected.push({
        topic: "Price Mechanism (Cambridge IGCSE 0455 Unit 2.2–2.3: Market Equilibrium)",
        verbatimQuote: sentence,
        correction:
          "An increase in supply (shift of the supply curve to the right) causes a surplus at the original price, resulting in a FALL in equilibrium price and an extension in quantity demanded, not a price rise.",
      });
    }

    // 4. INVERTED DEMAND MECHANISM
    // Claiming an outward shift in demand lowers equilibrium price
    const invertedDemandRegex =
      /\b(?:increase\s+in\s+demand|demand\s+(?:curve\s+)?shifts?\s+right|higher\s+demand)\b[^.?!]{0,80}\b(?:lowers?|decreases?|reduces?|leads?\s+to\s+lower)\s+(?:the\s+)?(?:equilibrium\s+)?price\b/i;

    if (invertedDemandRegex.test(sentence)) {
      detected.push({
        topic: "Price Mechanism (Cambridge IGCSE 0455 Unit 2.2–2.3: Market Equilibrium)",
        verbatimQuote: sentence,
        correction:
          "An increase in demand (shift of the demand curve to the right) creates excess demand / shortage at the original price, driving the equilibrium price UP, not down.",
      });
    }
  }

  return detected;
}

/**
 * Enforces Cambridge Table A Level Descriptors:
 * Any response containing fatal economic misconceptions or inverted mechanisms
 * CANNOT enter Level 3 (6–8 marks). It is strictly capped in Level 2 (maximum 4/8 or 3/8 for 8-mark Discuss;
 * max 3/6 for 6-mark Analyse), and all falsely credited points are revoked.
 */
export function applyMisconceptionGuardrail(
  grading: Grading,
  maxMark: number,
  split: AoSplit,
  essayText: string,
): Grading {
  const explicitErrors = detectExplicitMisconceptions(essayText);
  const mv = grading.mechanism_validation;
  const aiFlaggedError = Boolean(mv && mv.fatal_misconceptions_found && (mv.error_evidence_quotes?.length ?? 0) > 0);

  if (explicitErrors.length === 0 && !aiFlaggedError) {
    return grading;
  }

  // Compile unique error evidence quotes
  const allQuotes = new Set<string>(Array.isArray(mv?.error_evidence_quotes) ? mv.error_evidence_quotes : []);
  const allCorrections: string[] = [];

  for (const err of explicitErrors) {
    allQuotes.add(err.verbatimQuote);
    allCorrections.push(err.correction);
  }

  const errorQuotesList = Array.from(allQuotes);

  // Maximum mark ceilings under Cambridge Level Descriptors when fatal errors exist:
  // 8-mark Discuss: Level 2 cap (maximum 4 marks)
  // 6-mark Analyse: Maximum 3 marks
  // 4-mark Explain: Maximum 2 marks
  const maxTotal = maxMark === 8 ? 4 : maxMark === 6 ? 3 : maxMark === 4 ? 2 : Math.round(maxMark * 0.45);
  const maxAo1 = Math.min(grading.ao_breakdown.knowledge.awarded, Math.min(1, split.ao1_marks));
  const maxAo2 = Math.min(grading.ao_breakdown.analysis.awarded, Math.min(2, split.ao2_marks));
  const maxAo3 = Math.min(grading.ao_breakdown.evaluation.awarded, Math.min(1, split.ao3_marks));

  const newTotal = Math.min(maxTotal, maxAo1 + maxAo2 + maxAo3);

  // Revoke credit from any "points" that praised the misconception
  const sanitizedPoints = (grading.points || []).map((p) => {
    const isTainted = errorQuotesList.some((quote) =>
      p.quote.toLowerCase().includes(quote.toLowerCase()) ||
      quote.toLowerCase().includes(p.quote.toLowerCase()) ||
      /above\s+(the\s+)?(market\s+)?equilibrium/i.test(p.quote),
    );

    if (isTainted && (p.identify_awarded > 0 || p.development_awarded > 0)) {
      return {
        ...p,
        identify_awarded: 0,
        development_awarded: 0,
        reason: `Zero marks awarded: Contradicts official Cambridge 0455 syllabus principles. A maximum price set above equilibrium is non-binding and has zero market effect.`,
      };
    }
    return p;
  });

  // Ensure weaknesses list contains the authoritative examiner correction
  const weaknesses = [...(grading.weaknesses || [])];
  for (const corr of allCorrections) {
    if (!weaknesses.some((w) => w.toLowerCase().includes("maximum price") || w.toLowerCase().includes("non-binding"))) {
      weaknesses.unshift(corr);
    }
  }

  // Adjust summary to explain the Level 2 cap
  let examinerSummary = grading.examiner_summary || "";
  if (!examinerSummary.includes("misconception") && !examinerSummary.includes("Level 2")) {
    examinerSummary =
      `This response contains an attempt at both sides of the question, but is capped at Level 2 (${newTotal}/${maxMark}) due to a fundamental economic misconception: claiming that setting a maximum price above equilibrium increases price, revenue, supply, or causes inflation. In official Cambridge IGCSE 0455 economics, a price ceiling set above equilibrium is non-binding and ineffective (the market continues to clear at equilibrium). Accurate analysis is credited for the affordability impact of price ceilings below equilibrium, but Level 3 requires sound economics throughout.`;
  }

  const updated: Grading = {
    ...grading,
    total_mark: newTotal,
    band: bandFor(newTotal, maxMark),
    mechanism_validation: {
      core_mechanisms_sound: false,
      fatal_misconceptions_found: true,
      error_evidence_quotes: errorQuotesList,
    },
    ao_breakdown: {
      knowledge: {
        ...grading.ao_breakdown.knowledge,
        awarded: maxAo1,
        comment: maxAo1 < split.ao1_marks
          ? "Partial credit for basic necessity and affordability identification; penalized for misunderstanding maximum price mechanics relative to equilibrium."
          : grading.ao_breakdown.knowledge.comment,
      },
      analysis: {
        ...grading.ao_breakdown.analysis,
        awarded: maxAo2,
        comment:
          "Capped due to fundamental economic error claiming maximum price above equilibrium raises prices and incentivises production.",
      },
      evaluation: {
        ...grading.ao_breakdown.evaluation,
        awarded: maxAo3,
        comment:
          "Evaluative comments rely on the false premise of setting maximum prices above equilibrium to support suppliers; cannot enter Level 3.",
      },
    },
    points: sanitizedPoints,
    weaknesses: weaknesses.map((w) => stripScoreFractionsFromText(w)).slice(0, 5),
    examiner_summary: examinerSummary,
  };

  return cleanStars(updated);
}

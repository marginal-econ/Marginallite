import type {
  MarkLedgerEntry,
  QuestionRubric,
  ScoreMaximizerOpportunity,
} from "./types";
import { stripStars } from "./clean-suggestion";

export type FeedbackGenerationResult = {
  strengths: string[];
  areasForImprovement: string[];
  opportunities: ScoreMaximizerOpportunity[];
  suggestedDevelopment?: string;
};

/**
 * Derives pedagogically rigorous, evidence-linked feedback from the Mark Ledger and Rubric.
 */
export function generateFeedbackAndOpportunities(params: {
  ledger: MarkLedgerEntry[];
  rubric: QuestionRubric;
  aoBreakdown: {
    ao1: { awarded: number; max: number };
    ao2: { awarded: number; max: number };
    ao3: { awarded: number; max: number };
  };
  totalWords: number;
}): FeedbackGenerationResult {
  const { ledger, rubric, aoBreakdown, totalWords } = params;

  const strengths: string[] = [];
  const areasForImprovement: string[] = [];
  const opportunities: ScoreMaximizerOpportunity[] = [];

  // 1. Synthesize Strengths from Awarded Ledger Entries
  const creditedEntries = ledger.filter((e) => e.awardedCredit !== null && e.awardedCredit > 0);
  for (const entry of creditedEntries) {
    if (entry.assessmentObjective === "AO1" && strengths.length < 2) {
      strengths.push(
        `Accurate syllabus conceptual grounding: "${entry.evidence.slice(0, 60)}..." clearly establishes knowledge required by the prompt.`,
      );
    } else if (entry.assessmentObjective === "AO2" && strengths.length < 3) {
      strengths.push(
        `Clear causal transmission: demonstrated step-by-step reasoning in "${entry.evidence.slice(0, 65)}...".`,
      );
    } else if (entry.assessmentObjective === "AO3" && strengths.length < 4) {
      strengths.push(
        `Evaluative weighing: effectively assessed economic condition or trade-off in "${entry.evidence.slice(0, 60)}...".`,
      );
    }
  }

  // 2. Synthesize Areas for Improvement from Ledger Deficits
  const deficitEntries = ledger.filter((e) => e.missingDevelopment.length > 0);
  for (const entry of deficitEntries) {
    for (const missing of entry.missingDevelopment) {
      if (areasForImprovement.length < 3 && !areasForImprovement.includes(missing)) {
        areasForImprovement.push(missing);
      }
    }
  }

  // 3. Intelligent Score Maximizer Opportunity Prioritisation
  const remainingAo1 = Math.max(0, aoBreakdown.ao1.max - aoBreakdown.ao1.awarded);
  const remainingAo2 = Math.max(0, aoBreakdown.ao2.max - aoBreakdown.ao2.awarded);
  const remainingAo3 = Math.max(0, aoBreakdown.ao3.max - aoBreakdown.ao3.awarded);

  // A. AO1 Priority: If definitions are missing
  if (remainingAo1 > 0) {
    const indicativeKey = rubric.indicativeContent[0] || "core concept";
    opportunities.push({
      id: "max_ao1_definition",
      priority: totalWords < 50 ? "critical" : "high",
      aoTarget: "ao1",
      sentenceIds: [],
      title: `Define ${indicativeKey.slice(0, 30)}`,
      whyItMatters: `Cambridge examiners allocate ${aoBreakdown.ao1.max} marks for syllabus-precise definitions before crediting application.`,
      suggestedAction: `Open with an explicit definition stating the exact formula or economic meaning of the key term.`,
      illustrativeExpansion: `Define the term precisely (e.g. "PED measures the responsiveness of quantity demanded to a change in price").`,
      potentialGain: 1,
      confidence: 0.9,
    });
  }

  // B. AO2 Priority: If causal chains or analytical coverage are incomplete
  if (remainingAo2 > 0) {
    const incompleteChainEntry = ledger.find(
      (e) => e.assessmentObjective === "AO2" && e.missingDevelopment.some((m) => m.includes("causal") || m.includes("Developing")),
    );

    if (incompleteChainEntry) {
      opportunities.push({
        id: "max_ao2_chain",
        priority: "critical",
        aoTarget: "ao2",
        sentenceIds: incompleteChainEntry.sentenceIds,
        title: "Complete Causal Mechanism Linkage",
        whyItMatters: "Leaping directly from cause to final outcome without intermediate price or cost adjustments caps analysis at Level 2.",
        suggestedAction: "Insert intermediate step: explain how per-unit costs change, shifting the supply curve and adjusting equilibrium market price.",
        illustrativeExpansion: "Explain the transmission: cause -> unit cost changes -> supply shifts -> equilibrium price adjusts -> consumer expenditure response.",
        potentialGain: 1,
        confidence: 0.88,
      });
    } else {
      opportunities.push({
        id: "max_ao2_mechanism",
        priority: "high",
        aoTarget: "ao2",
        sentenceIds: [],
        title: "Develop Additional Analytical Mechanism",
        whyItMatters: "Cambridge mark schemes award up to 6 marks for analysis across multiple mechanisms, diagrammatic explanations, or policy channels. Written economics alone can score full marks without empirical case studies.",
        suggestedAction: "Analyse an alternative mechanism (e.g. how information campaigns shift demand, or how price elasticity affects quantity), describe the diagrammatic curve shifts, or illustrate in context.",
        illustrativeExpansion: "Explain the transmission: policy intervention -> shift in supply/demand curve -> price adjustment -> contraction in quantity -> correction of market failure.",
        potentialGain: Math.min(2, remainingAo2),
        confidence: 0.88,
      });
    }
  }

  // C. AO3 Priority: If evaluation is missing on an evaluative question
  if (remainingAo3 > 0 && rubric.commandWord.toLowerCase() !== "explain") {
    opportunities.push({
      id: "max_ao3_judgement",
      priority: totalWords > 200 ? "critical" : "high",
      aoTarget: "ao3",
      sentenceIds: [],
      title: "Add Supported Contextual Judgement",
      whyItMatters: `Cambridge evaluative essays award AO3 marks for weighing counter-arguments, price elasticity (PED), short vs long run time lags, or alternative policies.`,
      suggestedAction: "Introduce economic evaluation criteria (e.g. PED elasticity, time horizons, or stakeholder trade-offs) and state which factor is most decisive.",
      illustrativeExpansion: "State: 'However, in the short run demand is price-inelastic so consumption falls little; over the long run, combined information campaigns shift preferences and reduce deadweight loss.'",
      potentialGain: Math.min(2, remainingAo3),
      confidence: 0.9,
    });
  }

  // Sort opportunities: critical > high > medium
  const priorityWeight = { critical: 0, high: 1, medium: 2 };
  opportunities.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);

  let suggestedDevelopment: string | undefined = undefined;
  if (opportunities.length > 0 && opportunities[0]!.illustrativeExpansion) {
    suggestedDevelopment = stripStars(opportunities[0]!.illustrativeExpansion);
  }

  return {
    strengths,
    areasForImprovement,
    opportunities: opportunities.slice(0, 3),
    suggestedDevelopment,
  };
}

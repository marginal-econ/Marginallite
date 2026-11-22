/**
 * Cambridge IGCSE 0455 Economics Question Topic Relevance & Off-Topic Concept Detection
 */

export const QUESTION_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "over", "after", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "can", "could",
  "should", "would", "will", "shall", "may", "might", "must",
  "assess", "evaluate", "discuss", "explain", "whether", "extent", "consider",
  "analyse", "analyze", "impact", "effects", "effect", "using", "through",
  "what", "which", "who", "whom", "this", "that", "these", "those",
  "more", "than", "between", "their", "there", "other", "mean", "means", "meaning",
  "good", "goods",
]);

/**
 * Extracts key domain topic tokens from a Cambridge IGCSE 0455 question prompt.
 * Preserves essential 2-4 letter economics terms (tax, gdp, cpi, ped, pes, yed, xed, etc.).
 */
export function extractQuestionTopicTokens(question: string): string[] {
  if (!question) return [];
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !QUESTION_STOPWORDS.has(w));

  // Deduplicate while preserving order
  return Array.from(new Set(words));
}

export type OffTopicDetectionResult = {
  isOffTopic: boolean;
  offTopicConcept?: string;
  relevantConcept?: string;
  reason?: string;
};

/**
 * Detects if a sentence discusses or defines an economic concept that is
 * clearly off-topic for the specific Cambridge IGCSE 0455 question prompt.
 */
export function detectOffTopicConcept(
  sentenceText: string,
  question: string,
): OffTopicDetectionResult {
  if (!sentenceText || !question) return { isOffTopic: false };

  const sLower = sentenceText.toLowerCase();
  const qLower = question.toLowerCase();

  // 1. Demerit Goods vs Merit Goods / Public Goods
  const isDemeritPrompt = /\bdemerit\b/i.test(qLower);
  const isMeritPrompt = /\bmerit\b/i.test(qLower) && !isDemeritPrompt;
  const isPublicGoodPrompt = /\bpublic goods?\b/i.test(qLower);

  if (isDemeritPrompt) {
    if (/\bpublic goods?\b/i.test(sLower) && !/\bdemerit\b/i.test(sLower)) {
      return {
        isOffTopic: true,
        offTopicConcept: "Public goods",
        relevantConcept: "Demerit goods",
        reason:
          "Off-topic concept: The set question asks about reducing over-consumption of a demerit good. Defining or discussing public goods does not answer the question and earns 0 marks under Cambridge IGCSE 0455 mark schemes.",
      };
    }
    if (/\bmerit goods?\b/i.test(sLower) && !/\bdemerit\b/i.test(sLower)) {
      return {
        isOffTopic: true,
        offTopicConcept: "Merit goods",
        relevantConcept: "Demerit goods",
        reason:
          "Off-topic concept: The question specifically asks about demerit goods (negative externalities, over-consumption). Defining merit goods (positive externalities, under-consumption) is off-topic and earns 0 marks.",
      };
    }
  }

  if (isMeritPrompt) {
    if (/\bdemerit goods?\b/i.test(sLower) && !/\bmerit\b/i.test(sLower)) {
      return {
        isOffTopic: true,
        offTopicConcept: "Demerit goods",
        relevantConcept: "Merit goods",
        reason:
          "Off-topic concept: The question asks about merit goods. Defining demerit goods does not address the prompt.",
      };
    }
    if (/\bpublic goods?\b/i.test(sLower) && !/\bmerit\b/i.test(sLower)) {
      return {
        isOffTopic: true,
        offTopicConcept: "Public goods",
        relevantConcept: "Merit goods",
        reason:
          "Off-topic concept: The question asks about merit goods, not non-rival public goods.",
      };
    }
  }

  if (isPublicGoodPrompt && !isDemeritPrompt && !isMeritPrompt) {
    if (/\bdemerit goods?\b/i.test(sLower) && !/\bpublic goods?\b/i.test(sLower)) {
      return {
        isOffTopic: true,
        offTopicConcept: "Demerit goods",
        relevantConcept: "Public goods",
        reason:
          "Off-topic concept: The question asks about public goods (non-rival, non-excludable). Demerit goods are off-topic.",
      };
    }
  }

  // 2. Macro vs Micro Mismatches
  const isPureMicroPrompt =
    /\b(demerit|merit|public good|monopoly|oligopoly|ped|pes|yed|xed|price elasticity|indirect tax|subsid|minimum price|maximum price|market failure|externality|externalities)\b/i.test(
      qLower,
    ) && !/\b(macroeconomic|gdp|inflation|unemployment|balance of payments|fiscal policy|monetary policy)\b/i.test(qLower);

  const isPureMacroPrompt =
    /\b(inflation|deflation|unemployment|balance of payments|current account|exchange rate|monetary policy|interest rate|fiscal policy|national income|aggregate demand|aggregate supply|economic growth)\b/i.test(
      qLower,
    ) && !/\b(demerit|merit|public good|monopoly|ped|indirect tax on a good)\b/i.test(qLower);

  if (isPureMicroPrompt) {
    const macroMismatches = sLower.match(
      /\b(monetary policy|interest rates?|quantitative easing|exchange rates?|balance of payments|current account deficit|hyperinflation)\b/i,
    );
    if (macroMismatches && !/\b(tax|firm|market|good|consumer|price|demand|supply)\b/i.test(macroMismatches[0])) {
      return {
        isOffTopic: true,
        offTopicConcept: macroMismatches[0],
        relevantConcept: "Microeconomic policy (e.g. indirect tax, information campaign)",
        reason: `Off-topic macroeconomic discussion: The question is a microeconomic question. Discussing ${macroMismatches[0]} does not address the set prompt.`,
      };
    }
  }

  if (isPureMacroPrompt) {
    const microMismatches = sLower.match(
      /\b(demerit goods?|merit goods?|public goods?|cross elasticity of demand|xed|price discrimination)\b/i,
    );
    if (microMismatches) {
      return {
        isOffTopic: true,
        offTopicConcept: microMismatches[0],
        relevantConcept: "Macroeconomic concepts",
        reason: `Off-topic microeconomic concept: Discussing ${microMismatches[0]} is irrelevant to this macroeconomic question.`,
      };
    }
  }

  // 3. Definition of an economic concept with zero prompt overlap
  const isDefinitionPattern =
    /\b(is defined as|refers to|means that|is a good that|is an expenditure tax|are goods that)\b/i.test(
      sLower,
    );

  if (isDefinitionPattern) {
    // Cambridge IGCSE 0455 Essay Grader: Laying theoretical groundwork (e.g. market failure, externalities,
    // information failure, deadweight loss) before discussing interventions is legitimate economics.
    const isGroundwork =
      /\b(market failures?|externalit(?:y|ies)|negative externalit(?:y|ies)|information failures?|allocative (?:in)?efficiency|social optimum|deadweight (?:welfare )?loss|marginal social (?:cost|benefit)|marginal private (?:cost|benefit)|opportunity costs?|ceteris paribus|price elasticity)\b/i.test(
        sLower,
      );
    if (!isGroundwork) {
      const topicTokens = extractQuestionTopicTokens(question);
      if (topicTokens.length >= 2) {
        const mentionsAnyTopic = topicTokens.some((t) => sLower.includes(t));
        if (!mentionsAnyTopic) {
          // Find what was defined (first 1-4 words before definition trigger)
          const match = sLower.match(/^(?:a|an|the)?\s*([a-z\s]{3,30}?)\s+(?:is defined as|refers to|means that|is a good that|are goods that)\b/i);
          const definedTerm = match ? match[1].trim() : "This definition";
          return {
            isOffTopic: true,
            offTopicConcept: definedTerm,
            relevantConcept: topicTokens[0],
            reason: `Off-topic definition: Defining "${definedTerm}" does not address the set question prompt. Off-topic definitions earn 0 marks under Cambridge IGCSE 0455.`,
          };
        }
      }
    }
  }

  return { isOffTopic: false };
}

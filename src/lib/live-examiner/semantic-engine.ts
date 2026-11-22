import type { SemanticClassification, IssueV2, QuestionRubric } from "./types";
import { classifySentence } from "./sentence-engine";
import { checkEconomicMisconceptions, analyzeCausalChain, evaluateEvaluativeDepth, assessApplicationQuality } from "./reasoning-engine";
import { stripStars } from "./clean-suggestion";
import { detectOffTopicConcept, extractQuestionTopicTokens } from "./topic-relevance";

export type SentenceContextInput = {
  id: string;
  text: string;
  paragraphText: string;
  previousSentenceText?: string;
  nextSentenceText?: string;
  paragraphIndex: number;
  sentenceIndex: number;
};

/**
 * Evaluates a single sentence with rich surrounding context to determine its true economic function.
 */
export function evaluateSentenceSemantics(params: {
  sentence: SentenceContextInput;
  docVersion: number;
  rubric: QuestionRubric;
  existingIssues?: IssueV2[];
}): SemanticClassification {
  const { sentence, docVersion, rubric, existingIssues = [] } = params;
  const text = sentence.text.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // 1. Fragments and short incomplete clauses (< 4 words) earn NO_CREDIT
  if (wordCount < 4 || !/[.!?]['"’”\)\]]*$/.test(text)) {
    return {
      sentenceId: sentence.id,
      documentVersion: docVersion,
      primaryAO: "NO_CREDIT",
      secondaryAOs: [],
      confidence: 0.95,
      economicFunction: "Incomplete fragment or note",
      evidence: "",
      issues: existingIssues,
      requiresReview: false,
    };
  }

  // 2. Deterministic Misconceptions & Reasoning Flaws
  const misconceptionIssues = checkEconomicMisconceptions(text, sentence.id);
  const causalResult = analyzeCausalChain(text);
  const evalResult = evaluateEvaluativeDepth(text);
  const appResult = assessApplicationQuality(text);

  const combinedIssues: IssueV2[] = [...existingIssues, ...misconceptionIssues];

  if (appResult.isSuperficial && appResult.feedback) {
    combinedIssues.push({
      id: `superficial_app::${sentence.id}`,
      sentenceId: sentence.id,
      from: 0,
      to: text.length,
      category: "application",
      severity: "medium",
      original: appResult.contextFound || text,
      explanation: appResult.feedback,
      evidence: "Cambridge IGCSE 0455 Indicative Application Criteria",
      aoImpact: "Capped at Level 2 analysis without specific economic condition details.",
      status: "active",
    });
  }

  // 2b. Strict Cambridge Question Topic & Off-Topic Concept Check
  const offTopicCheck = detectOffTopicConcept(text, rubric.questionText || "");
  if (offTopicCheck.isOffTopic) {
    const offTopicOrig = offTopicCheck.offTopicConcept || text;
    const matchIdx = text.toLowerCase().indexOf(offTopicOrig.toLowerCase());
    const issueFrom = matchIdx !== -1 ? matchIdx : 0;
    const issueTo = matchIdx !== -1 ? issueFrom + offTopicOrig.length : text.length;

    combinedIssues.push({
      id: `off_topic::${sentence.id}`,
      sentenceId: sentence.id,
      from: issueFrom,
      to: issueTo,
      category: "application",
      severity: "high",
      original: offTopicOrig,
      suggestion: offTopicCheck.relevantConcept || "Address question prompt concepts",
      explanation:
        offTopicCheck.reason ||
        `Off-topic concept: Writing about unrelated concepts earns 0 marks under Cambridge IGCSE 0455 mark schemes.`,
      evidence: "Cambridge IGCSE 0455: Marks are awarded strictly for relevance to the question prompt.",
      aoImpact: "0 marks awarded under Cambridge IGCSE 0455.",
      status: "active",
    });

    return {
      sentenceId: sentence.id,
      documentVersion: docVersion,
      primaryAO: "NO_CREDIT",
      secondaryAOs: [],
      confidence: 0.95,
      economicFunction: offTopicCheck.reason || "Off-topic concept (0 marks under Cambridge IGCSE 0455)",
      evidence: "",
      issues: combinedIssues,
      requiresReview: false,
    };
  }

  // 3. Fallback to existing deterministic classifier for baseline
  const baseline = classifySentence(text);
  let primaryAO: "AO1" | "AO2" | "AO3" | "NO_CREDIT" | "UNCERTAIN" = "NO_CREDIT";
  const secondaryAOs: ("AO1" | "AO2" | "AO3")[] = [];
  let economicFunction = "General descriptive statement";
  let confidence = 0.85;

  const qTopicTokens = extractQuestionTopicTokens(rubric.questionText || "");
  const lowerText = text.toLowerCase();
  const hasQuestionTopicMatch = qTopicTokens.some((token) => lowerText.includes(token));

  const hasEconKeywords =
    hasQuestionTopicMatch ||
    /\b(demand|supply|price|elastic\w*|inelastic|ped|yed|pes|xed|equilibrium|externalit\w+|market failure|merit|demerit|public goods?|subsid\w+|tax\w*|tariff\w*|quota\w*|free trade|protectionism|speciali[sz]ation|comparative advantage|absolute advantage|inflation|deflation|gdp|cpi|rpi|monopol\w+|oligopol\w+|competition|efficien\w+|surplus|opportunity cost|fiscal|monetary|interest rates?|exchange rates?|unemployment|claimant count|labour force survey|lfs|claimants?|benefits?|labor|labour|workforce|employment|sampling error\w*|sample\w*|survey\w*|underemployment|inactivity|discouraged workers?|living standards|standard of living|national income|purchasing power parity|ppp|hdi|gini|lorenz|balance of payments|current account|trade deficit|trade surplus|budget deficit|national debt|administrative (?:data|records?)|reliability|central bank|liquidity|productivity|productive capacity|recession|boom|growth|wealth|poverty|distribution of income|aggregate|multiplier|welfare|deadweight|incidence|margin\w*|utility|revenue|profit|output|firms?|consumers?|producers?|government|consumption|investment|economic growth)\b/i.test(
      text,
    );

  // If the sentence has zero economic terminology and zero baseline confidence, it earns NO_CREDIT
  if (!hasEconKeywords && (!baseline || baseline.confidence === 0)) {
    return {
      sentenceId: sentence.id,
      documentVersion: docVersion,
      primaryAO: "NO_CREDIT",
      secondaryAOs: [],
      confidence: 0.95,
      economicFunction: "Non-economic statement",
      evidence: "",
      issues: combinedIssues,
      requiresReview: false,
    };
  }

  // 4. Contextual Decision Matrix (Requires legitimate economic grounding)
  const isDefinitionPattern =
    hasEconKeywords &&
    /\b(is defined as|refers to|means that|is when|are when|formula for|is a good that|is an expenditure tax|is a subsidy)\b/i.test(
      text,
    );

  if (isDefinitionPattern || (baseline && baseline.ao === "AO1" && baseline.confidence > 0 && baseline.strength > 0)) {
    primaryAO = "AO1";
    economicFunction = "Knowledge & concept definition";
    confidence = Math.max(confidence, baseline ? baseline.confidence : 0.88);

    // If a definition also introduces a causal step (e.g. "Free trade refers to... which increases specialization and lowers prices")
    if (causalResult.steps.length > 0) {
      secondaryAOs.push("AO2");
    }
  } else if ((evalResult.depth !== "none" && hasEconKeywords) || (baseline && baseline.ao === "AO3" && baseline.confidence > 0)) {
    // If the question command word doesn't reward evaluation (e.g. "Explain"), treat as AO2 or note restriction
    if (!rubric.commandWord || rubric.commandWord.toLowerCase() === "explain") {
      primaryAO = "AO2";
      economicFunction = "Analytical contrast (command word 'Explain' does not award AO3)";
      confidence = 0.8;
    } else {
      primaryAO = "AO3";
      economicFunction =
        evalResult.depth === "justified_judgement"
          ? "Supported contextual judgement resolving prompt"
          : evalResult.depth === "sustained"
            ? "Sustained comparative evaluation & trade-off weighing"
            : "Evaluative contrast / conditional qualification";
      confidence = Math.max(confidence, baseline ? baseline.confidence : 0.85);

      if (causalResult.isComplete) {
        secondaryAOs.push("AO2");
      }
    }
  } else if (
    (causalResult.steps.length >= 2 || (causalResult.steps.length > 0 && hasEconKeywords)) ||
    (baseline && baseline.ao === "AO2" && baseline.confidence > 0)
  ) {
    primaryAO = "AO2";
    economicFunction = causalResult.isComplete
      ? "Developed multi-step causal transmission chain"
      : "Analytical linkage (intermediate step required for full mark)";
    confidence = Math.max(confidence, baseline ? baseline.confidence : 0.82);

    if (isDefinitionPattern) {
      secondaryAOs.push("AO1");
    }
  } else if (wordCount >= 10 && hasEconKeywords) {
    // Economically relevant context without strong chain
    primaryAO = "AO1";
    economicFunction = "Factual economic context or background";
    confidence = 0.7;
  }

  return {
    sentenceId: sentence.id,
    documentVersion: docVersion,
    primaryAO,
    secondaryAOs,
    confidence,
    economicFunction,
    evidence: stripStars(text.slice(0, 100)),
    issues: combinedIssues,
    requiresReview: confidence < 0.75,
  };
}

/**
 * Re-evaluates a paragraph of sentences maintaining argument relationships.
 */
export function evaluateParagraphSemantics(params: {
  sentences: { id: string; text: string; paragraphIndex: number; sentenceIndex: number }[];
  paragraphText: string;
  docVersion: number;
  rubric: QuestionRubric;
}): SemanticClassification[] {
  const { sentences, paragraphText, docVersion, rubric } = params;

  return sentences.map((s, idx) => {
    const prev = idx > 0 ? sentences[idx - 1]!.text : undefined;
    const next = idx < sentences.length - 1 ? sentences[idx + 1]!.text : undefined;

    return evaluateSentenceSemantics({
      sentence: {
        id: s.id,
        text: s.text,
        paragraphText,
        previousSentenceText: prev,
        nextSentenceText: next,
        paragraphIndex: s.paragraphIndex,
        sentenceIndex: s.sentenceIndex,
      },
      docVersion,
      rubric,
    });
  });
}

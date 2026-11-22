import type {
  EconomicArgument,
  MarkLedgerEntry,
  QuestionRubric,
  SemanticClassification,
} from "./types";
import { TARIFF_SPLITS, defaultSplitForMaxMark } from "../examiner/config";
import { analyzeEssayQuality } from "../examiner/writing-quality";
import { stripStars } from "./clean-suggestion";
import { extractQuestionTopicTokens, detectOffTopicConcept } from "./topic-relevance";

export type BuildLedgerResult = {
  arguments: EconomicArgument[];
  ledger: MarkLedgerEntry[];
  totalMark: number;
  maxMark: number;
  status: "provisional" | "verified" | "uncertain" | "complete";
  markRange?: [number, number];
  aoBreakdown: {
    ao1: { awarded: number; max: number; coveragePct: number };
    ao2: { awarded: number; max: number; coveragePct: number };
    ao3: { awarded: number; max: number; coveragePct: number };
  };
};

/**
 * Normalises text to detect conceptual duplicates and prevent false repeated credit.
 */
function normalizeArgumentClaim(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\b(the|a|an|is|are|defined|as|when|in|on|of|to|that|it)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Groups classified sentences into coherent economic arguments and evaluates them against the Question Rubric.
 */
export function buildMarkLedger(params: {
  sentences: { id: string; text: string; paragraphIndex: number; isComplete: boolean }[];
  classifications: SemanticClassification[];
  rubric: QuestionRubric;
  isAiVerified?: boolean;
}): BuildLedgerResult {
  const { sentences, classifications, rubric, isAiVerified = false } = params;
  const maxMark = (rubric.maximumMarks === 8 || rubric.maximumMarks === 12 || rubric.maximumMarks === 20 ? rubric.maximumMarks : 12) as 8 | 12 | 20;
  const split = TARIFF_SPLITS[maxMark] || defaultSplitForMaxMark(maxMark);

  const totalWords = sentences.reduce(
    (acc, s) => acc + s.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );

  // 1. Fragment or Insufficient text guard (< 10 words)
  if (totalWords < 10) {
    return {
      arguments: [],
      ledger: [],
      totalMark: 0,
      maxMark,
      status: "uncertain",
      markRange: [0, 0],
      aoBreakdown: {
        ao1: { awarded: 0, max: split.ao1_marks, coveragePct: 0 },
        ao2: { awarded: 0, max: split.ao2_marks, coveragePct: 0 },
        ao3: { awarded: 0, max: split.ao3_marks, coveragePct: 0 },
      },
    };
  }

  // 1b. Question Topic Relevance Guard & Authentic Paragraph Reconstruction
  const topicTokens = extractQuestionTopicTokens(rubric.questionText || "");
  const paragraphs: string[] = [];
  let currentP: string[] = [];
  let lastPIdx = -1;

  for (const s of sentences) {
    if (s.paragraphIndex !== undefined && s.paragraphIndex !== lastPIdx && currentP.length > 0) {
      paragraphs.push(currentP.join(" "));
      currentP = [];
    }
    currentP.push(s.text);
    lastPIdx = s.paragraphIndex ?? 0;
  }
  if (currentP.length > 0) {
    paragraphs.push(currentP.join(" "));
  }
  const fullEssayText = paragraphs.join("\n\n");
  const fullEssayTextLower = fullEssayText.toLowerCase();

  const hasTopicRelevance =
    topicTokens.length === 0 || topicTokens.some((t) => fullEssayTextLower.includes(t));

  if (!hasTopicRelevance && totalWords >= 20) {
    return {
      arguments: [],
      ledger: [
        {
          argumentId: "arg_off_topic",
          sentenceIds: sentences.map((s) => s.id),
          assessmentObjective: "AO1",
          rubricCriterion: "Question Relevance",
          evidence: sentences[0]?.text?.slice(0, 100) || "",
          awardedCredit: 0,
          missingDevelopment: [
            `The answer does not address the core question prompt (${topicTokens.slice(0, 3).join(", ")}). Cambridge IGCSE 0455 mark schemes award zero marks for off-topic material.`,
          ],
          status: isAiVerified ? "verified" : "provisional",
          reasoning: "Material is not relevant to the prompt set.",
        },
      ],
      totalMark: 0,
      maxMark,
      status: isAiVerified ? "verified" : "uncertain",
      markRange: [0, 0],
      aoBreakdown: {
        ao1: { awarded: 0, max: split.ao1_marks, coveragePct: 0 },
        ao2: { awarded: 0, max: split.ao2_marks, coveragePct: 0 },
        ao3: { awarded: 0, max: split.ao3_marks, coveragePct: 0 },
      },
    };
  }

  // Map classification by sentenceId
  const classMap = new Map(classifications.map((c) => [c.sentenceId, c]));

  // 2. Group sentences into arguments by paragraph and AO continuity
  const argumentsList: EconomicArgument[] = [];
  let currentGroup: {
    sentenceIds: string[];
    texts: string[];
    primaryAO: "AO1" | "AO2" | "AO3" | "NO_CREDIT";
    paragraphIndex: number;
  } | null = null;

  for (const s of sentences) {
    // Incomplete sentences are actively being typed and must not award marks or cause score fluctuations
    if (s.isComplete === false) continue;

    const classification = classMap.get(s.id);
    const ao = classification && classification.primaryAO !== "UNCERTAIN" ? classification.primaryAO : "NO_CREDIT";

    if (
      currentGroup &&
      currentGroup.paragraphIndex === s.paragraphIndex &&
      currentGroup.primaryAO === ao &&
      currentGroup.sentenceIds.length < 3
    ) {
      // Continue existing argument chain
      currentGroup.sentenceIds.push(s.id);
      currentGroup.texts.push(s.text);
    } else {
      if (currentGroup && currentGroup.primaryAO !== "NO_CREDIT") {
        argumentsList.push(createArgument(currentGroup));
      }
      currentGroup = {
        sentenceIds: [s.id],
        texts: [s.text],
        primaryAO: ao,
        paragraphIndex: s.paragraphIndex,
      };
    }
  }

  if (currentGroup && currentGroup.primaryAO !== "NO_CREDIT") {
    argumentsList.push(createArgument(currentGroup));
  }

  function createArgument(group: {
    sentenceIds: string[];
    texts: string[];
    primaryAO: "AO1" | "AO2" | "AO3" | "NO_CREDIT";
  }): EconomicArgument {
    const combinedText = group.texts.join(" ");

    // Cambridge IGCSE 0455 application includes theoretical market mechanisms, diagrammatic curve shifts,
    // and empirical real-world context. Written economics alone can earn full marks without named case studies.
    const hasEmpirical = /\b(uk|us|singapore|china|india|japan|germany|france|eu|nhs|cigarettes|sugar tax|tobacco|alcohol|petrol|fuel|monopoly|airline|steel|cars?)\b/i.test(combinedText);
    const hasTheoreticalApp = /\b(consumers?|producers?|firms?|market|supply|demand|price mechanism|costs? of production|average cost|marginal (?:private|social) (?:cost|benefit)|mpc|msc|msb|mpb|elasticity|ped|pes|deadweight (?:welfare )?loss|welfare loss|externalit(?:y|ies)|revenue|tax incidence|shortage|surplus|demerit|merit)\b/i.test(combinedText);
    const hasDiagrammaticApp = /\b(shifts? (?:vertically|upwards?|downwards?|left|right|outward|inward)|curves?|diagram|contraction along|extension along|equilibrium price|equilibrium quantity)\b/i.test(combinedText);
    const hasApplication = hasEmpirical || hasTheoreticalApp || hasDiagrammaticApp;

    const transmissionChain = combinedText.split(/\b(?:because|therefore|leads to|results in|consequently|shifts?|causes?|increases?|decreases?|contracts|expands|raises?|lowers?|reduces?)\b/i).filter(Boolean);

    let evalDepth: "unsupported" | "partial" | "sustained" | "justified_judgement" = "unsupported";
    if (group.primaryAO === "AO3") {
      const hasEvalCriteria = /\b(elasticity|inelastic|elastic|ped|pes|short[- ]run|long[- ]run|over time|time lag|magnitude|size of (?:the )?(?:tax|intervention|subsidy)|depends on|depends upon|contingent on|opportunity cost|unintended consequences|regressive|black market|smuggling|equity|administrative cost|government failure|compared to|alternative policy|more effective than|whereas a campaign|while a tax)\b/i.test(combinedText);
      const hasJudgement = /\b(on balance|in conclusion|overall|weighing|ultimately|decisive|most effective|greater impact|crucially depends|to a large extent|recommend)\b/i.test(combinedText);
      if (hasJudgement && hasEvalCriteria) {
        evalDepth = "justified_judgement";
      } else if (hasEvalCriteria) {
        evalDepth = "sustained";
      } else {
        evalDepth = "partial";
      }
    }

    return {
      argumentId: `arg::${group.sentenceIds[0]}`,
      sentenceIds: group.sentenceIds,
      claim: combinedText.slice(0, 140),
      primaryAO: group.primaryAO,
      transmissionChain: transmissionChain.map((s) => s.trim()).filter((s) => s.length > 5),
      isCompleteChain: transmissionChain.length >= 2,
      hasContextualApplication: hasApplication,
      evaluativeDepth: evalDepth,
    };
  }

  // 3. Build Evidence-based Ledger with Anti-Duplication Protection
  const ledger: MarkLedgerEntry[] = [];
  const seenClaimHashes = new Set<string>();

  let ao1MarksAwarded = 0;
  let ao2MarksAwarded = 0;
  let ao3MarksAwarded = 0;

  for (const arg of argumentsList) {
    if (arg.primaryAO === "NO_CREDIT") continue;

    // Check for repetitive/duplicate arguments
    const claimHash = normalizeArgumentClaim(arg.claim);
    const isDuplicate = seenClaimHashes.has(claimHash);
    seenClaimHashes.add(claimHash);

    const missingDevelopment: string[] = [];
    let credit = 0;

    if (arg.primaryAO === "AO1") {
      const claimLower = arg.claim.toLowerCase();
      const qLower = (rubric.questionText || "").toLowerCase();

      // Check for off-topic syllabus concept substitutions
      const offTopicResult = detectOffTopicConcept(arg.claim, rubric.questionText || "");
      const isOffTopicDefinition = offTopicResult.isOffTopic;

      const relatesToTopic =
        !isOffTopicDefinition &&
        (topicTokens.length === 0 || topicTokens.some((t) => claimLower.includes(t)));

      if (isDuplicate) {
        missingDevelopment.push("Repeated concept definition; duplicate credit prevented under Cambridge mark scheme.");
      } else if (!relatesToTopic) {
        missingDevelopment.push("Defined an economic concept not required by the question prompt. Off-topic definitions earn 0 marks.");
      } else if (ao1MarksAwarded < split.ao1_marks) {
        credit = 1;
        ao1MarksAwarded += 1;
      }
      ledger.push({
        argumentId: arg.argumentId,
        sentenceIds: arg.sentenceIds,
        assessmentObjective: "AO1",
        rubricCriterion: `Knowledge & understanding of key syllabus concepts (max ${split.ao1_marks}m)`,
        evidence: stripStars(arg.claim),
        awardedCredit: credit,
        missingDevelopment,
        status: isAiVerified ? "verified" : "provisional",
        reasoning: isDuplicate
          ? "Duplicate definition of previously established economic concept."
          : !relatesToTopic
            ? "Concept definition is not relevant to the question topic."
            : "Accurate specification definition credited toward syllabus knowledge.",
      });
    } else if (arg.primaryAO === "AO2") {
      if (isDuplicate) {
        missingDevelopment.push("Repeated analytical mechanism without new intermediate causal steps.");
      } else if (ao2MarksAwarded < split.ao2_marks) {
        // Cambridge IGCSE 0455: Complete causal chain earns full 2 marks through sound theoretical transmission,
        // diagrammatic explanation, or empirical examples. Incomplete/developing assertions earn 1 mark.
        credit = arg.isCompleteChain ? 2 : (ao2MarksAwarded === 0 ? 1 : 0);
        if (!arg.isCompleteChain) {
          missingDevelopment.push("Developing causal chain: explain intermediate market/cost adjustments (e.g. how costs shift supply, adjusting equilibrium price and quantity).");
        }
        credit = Math.min(credit, split.ao2_marks - ao2MarksAwarded);
        ao2MarksAwarded += credit;
      }
      ledger.push({
        argumentId: arg.argumentId,
        sentenceIds: arg.sentenceIds,
        assessmentObjective: "AO2",
        rubricCriterion: `Analytical transmission and application (max ${split.ao2_marks}m)`,
        evidence: stripStars(arg.claim),
        awardedCredit: credit,
        missingDevelopment,
        status: isAiVerified ? "verified" : "provisional",
        reasoning: arg.isCompleteChain
          ? "Complete multi-step causal transmission chain explaining intermediate economic adjustments."
          : "Developing analytical assertion with room for intermediate mechanism development.",
      });
    } else if (arg.primaryAO === "AO3") {
      if (isDuplicate) {
        missingDevelopment.push("Repeated evaluative point without new criteria or trade-off weighing.");
      } else if (ao3MarksAwarded < split.ao3_marks) {
        // Cambridge IGCSE 0455: 2 marks for justified judgement or sustained comparative/criteria evaluation; 1 mark for developing evaluation
        credit = arg.evaluativeDepth === "justified_judgement"
          ? 2
          : arg.evaluativeDepth === "sustained"
            ? (ao3MarksAwarded === 0 ? 2 : 1)
            : 1;
        if (arg.evaluativeDepth === "partial" || arg.evaluativeDepth === "unsupported") {
          missingDevelopment.push("Developing evaluation: justify your evaluation using economic criteria (e.g. elasticity, short vs long run time lags, or comparative policy effectiveness).");
        }
        credit = Math.min(credit, split.ao3_marks - ao3MarksAwarded);
        ao3MarksAwarded += credit;
      }
      ledger.push({
        argumentId: arg.argumentId,
        sentenceIds: arg.sentenceIds,
        assessmentObjective: "AO3",
        rubricCriterion: `Critical evaluation and supported judgement (max ${split.ao3_marks}m)`,
        evidence: stripStars(arg.claim),
        awardedCredit: credit,
        missingDevelopment,
        status: isAiVerified ? "verified" : "provisional",
        reasoning: arg.evaluativeDepth === "justified_judgement"
          ? "Supported final judgement weighing competing arguments using economic criteria."
          : arg.evaluativeDepth === "sustained"
            ? "Critical consideration of economic limitations, conditions, or trade-offs."
            : "Developing evaluative point with room for economic justification.",
      });
    }
  }

  // 4. Strict Tariff Reconciliation with Cambridge Essay Grader Writing Quality & Length Guardrails
  const quality = analyzeEssayQuality(fullEssayText, maxMark, split);
  ao1MarksAwarded = Math.min(split.ao1_marks, Math.max(0, ao1MarksAwarded));
  ao2MarksAwarded = Math.min(split.ao2_marks, Math.max(0, ao2MarksAwarded));
  ao3MarksAwarded = Math.min(split.ao3_marks, Math.max(0, ao3MarksAwarded));

  const rawSum = ao1MarksAwarded + ao2MarksAwarded + ao3MarksAwarded;
  const totalMark = Math.min(quality.maxAllowableTotalMark, rawSum);
  const status: "provisional" | "verified" | "uncertain" | "complete" =
    totalWords < 40 ? "uncertain" : isAiVerified ? "verified" : "provisional";

  const markRange: [number, number] = [
    Math.max(0, totalMark - (isAiVerified ? 1 : 2)),
    Math.min(maxMark, totalMark + (isAiVerified ? 1 : 2)),
  ];

  return {
    arguments: argumentsList,
    ledger,
    totalMark,
    maxMark,
    status,
    markRange,
    aoBreakdown: {
      ao1: {
        awarded: ao1MarksAwarded,
        max: split.ao1_marks,
        coveragePct: split.ao1_marks > 0 ? Math.round((ao1MarksAwarded / split.ao1_marks) * 100) : 100,
      },
      ao2: {
        awarded: ao2MarksAwarded,
        max: split.ao2_marks,
        coveragePct: split.ao2_marks > 0 ? Math.round((ao2MarksAwarded / split.ao2_marks) * 100) : 100,
      },
      ao3: {
        awarded: ao3MarksAwarded,
        max: split.ao3_marks,
        coveragePct: split.ao3_marks > 0 ? Math.round((ao3MarksAwarded / split.ao3_marks) * 100) : 100,
      },
    },
  };
}

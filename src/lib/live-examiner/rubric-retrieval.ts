import { TARIFF_SPLITS, defaultSplitForMaxMark } from "../examiner/config";
import type { QuestionRubric } from "./types";

/**
 * Recognised Cambridge IGCSE 0455 command words and their assessment implications.
 */
export const COMMAND_WORD_RULES: Record<
  string,
  {
    requiresEvaluation: boolean;
    ao1Weight: number;
    ao2Weight: number;
    ao3Weight: number;
    description: string;
  }
> = {
  discuss: {
    requiresEvaluation: true,
    ao1Weight: 0.25,
    ao2Weight: 0.5,
    ao3Weight: 0.25,
    description: "Requires exploring both sides of an economic argument and arriving at a supported judgement.",
  },
  evaluate: {
    requiresEvaluation: true,
    ao1Weight: 0.2,
    ao2Weight: 0.5,
    ao3Weight: 0.3,
    description: "Requires making reasoned, contextual judgements on the relative significance or effectiveness of policies or factors.",
  },
  assess: {
    requiresEvaluation: true,
    ao1Weight: 0.25,
    ao2Weight: 0.5,
    ao3Weight: 0.25,
    description: "Requires weighing outcomes and judging the relative importance of economic factors.",
  },
  "to what extent": {
    requiresEvaluation: true,
    ao1Weight: 0.2,
    ao2Weight: 0.5,
    ao3Weight: 0.3,
    description: "Requires measuring the degree of validity or success, weighing supporting vs counter-arguments.",
  },
  consider: {
    requiresEvaluation: true,
    ao1Weight: 0.25,
    ao2Weight: 0.5,
    ao3Weight: 0.25,
    description: "Requires examining multiple economic perspectives and drawing a reasoned conclusion.",
  },
  explain: {
    requiresEvaluation: false,
    ao1Weight: 0.3,
    ao2Weight: 0.7,
    ao3Weight: 0.0,
    description: "Requires setting out reasons, mechanisms, or relationships. Evaluation is NOT rewarded unless specifically asked.",
  },
  analyse: {
    requiresEvaluation: false,
    ao1Weight: 0.25,
    ao2Weight: 0.75,
    ao3Weight: 0.0,
    description: "Requires deconstructing economic concepts and demonstrating cause-and-effect chains step by step.",
  },
  compare: {
    requiresEvaluation: false,
    ao1Weight: 0.3,
    ao2Weight: 0.7,
    ao3Weight: 0.0,
    description: "Requires identifying similarities and differences between two or more economic policies or market structures.",
  },
};

/**
 * Extracts command word from Cambridge IGCSE 0455 question prompt.
 */
export function extractCommandWord(questionText: string): string {
  const norm = questionText.trim().toLowerCase();
  if (norm.startsWith("to what extent") || norm.includes("to what extent")) {
    return "to what extent";
  }
  const firstWord = norm.split(/\s+/)[0]?.replace(/[^a-z]/g, "") || "discuss";
  if (COMMAND_WORD_RULES[firstWord]) {
    return firstWord;
  }
  for (const cmd of Object.keys(COMMAND_WORD_RULES)) {
    if (new RegExp(`\\b${cmd}\\b`, "i").test(norm)) {
      return cmd;
    }
  }
  return "discuss";
}

/**
 * Extracts key indicative content concepts from question and syllabus context.
 */
export function extractIndicativePoints(question: string, contextBlock: string): string[] {
  const points: string[] = [];
  const qNorm = question.toLowerCase();

  // Core topic detection
  if (/tariff|tax|subsidy|indirect tax/i.test(qNorm)) {
    points.push("Definition of indirect tax / tariff / subsidy with distinction between specific and ad valorem");
    points.push("Market impact: upward shift of supply, higher equilibrium price, lower quantity traded");
    points.push("Tax incidence: distribution of tax burden between consumer and producer governed by PED vs PES");
    points.push("Deadweight welfare loss and government revenue vs consumer/producer surplus reduction");
    points.push("Evaluation: elasticity dependency, regressive nature on low incomes, and risk of smuggling/informal markets");
  } else if (/inflation|cpi|monetary policy|interest rates?/i.test(qNorm)) {
    points.push("Definition of inflation (sustained rise in general price level) and distinction between demand-pull and cost-push");
    points.push("Transmission mechanism: policy rate -> borrowing costs -> consumer expenditure (C) and investment (I) -> AD shift");
    points.push("Impact on macroeconomic objectives: price stability vs economic growth vs unemployment (Phillips curve trade-off)");
    points.push("Evaluation: time lags, consumer/business confidence, international competitiveness, and exchange rate feedback");
  } else if (/free trade|protectionism|comparative advantage|quota/i.test(qNorm)) {
    points.push("Theory of comparative advantage and opportunity cost ratios");
    points.push("Gains from trade: lower consumer prices, greater variety, economies of scale, efficiency gains");
    points.push("Arguments for protection: infant industry argument, anti-dumping, strategic industries, preventing structural unemployment");
    points.push("Evaluation: risk of retaliatory tariffs, loss of dynamic efficiency, deadweight loss, welfare misallocation");
  } else if (/market failure|externalit|public good|merit good/i.test(qNorm)) {
    points.push("Definition of market failure: misallocation of scarce resources resulting in net welfare loss");
    points.push("Divergence between private cost/benefit and social cost/benefit (MSC > MPC or MSB > MPB)");
    points.push("Policy remedy: tax, subsidy, direct state provision, minimum price, or regulation");
    points.push("Evaluation: government failure, unintended consequences, information asymmetry, and fiscal cost");
  } else {
    points.push("Precise definition of the core economic concept(s) stated in the question");
    points.push("Rigorous step-by-step causal transmission: initial shock -> market adjustment -> micro/macro equilibrium");
    points.push("Contextual application to specific economic stakeholders, markets, or economies");
    points.push("Balanced evaluation: short-run vs long-run constraints, elasticity dependencies, and justified overall judgement");
  }

  // Parse lines from retrieved mark schemes or coursebooks if present
  if (contextBlock) {
    const lines = contextBlock.split("\n");
    for (const line of lines) {
      const clean = line.trim();
      if ((clean.startsWith("- ") || clean.startsWith("• ") || /^\d+\./.test(clean)) && clean.length > 20 && clean.length < 200) {
        if (!points.includes(clean)) {
          points.push(clean.replace(/^[-•\d.]\s*/, ""));
          if (points.length >= 8) break;
        }
      }
    }
  }

  return points.slice(0, 8);
}

/**
 * Builds official Cambridge IGCSE 0455 Level Descriptors for 8, 12, or 20 mark questions.
 */
export function buildLevelDescriptors(
  maxMark: number,
  commandWord: string,
): { band: number; markRange: [number, number]; descriptor: string }[] {
  const requiresEval = COMMAND_WORD_RULES[commandWord]?.requiresEvaluation ?? true;

  if (maxMark === 20) {
    return [
      {
        band: 4,
        markRange: [16, 20],
        descriptor:
          "Thorough knowledge and understanding. Comprehensive, unbroken causal transmission chains with robust micro/macro mechanisms. Powerful contextual integration of real-world examples. Sustained synoptic evaluation with short vs long-run weighing and a decisive, justified judgement.",
      },
      {
        band: 3,
        markRange: [11, 15],
        descriptor:
          "Good knowledge and understanding. Developed economic analysis with clear intermediate causal steps. Relevant real-world examples applied. Meaningful evaluation addressing counter-arguments, though judgement may lack full contextual weighing.",
      },
      {
        band: 2,
        markRange: [6, 10],
        descriptor:
          "Descriptive knowledge with partial conceptual grounding. Analysis contains gaps in transmission or asserts conclusions without intermediate mechanism. Generic or superficial examples. Unbalanced or assertive evaluation without analytical reasoning.",
      },
      {
        band: 1,
        markRange: [1, 5],
        descriptor:
          "Fragmented economic knowledge with major misconceptions. Undeveloped assertions, broken causal links, no contextual application. Evaluation is absent or limited to unexplained one-liners.",
      },
    ];
  }

  if (maxMark === 8) {
    if (!requiresEval) {
      // Legacy 8m non-evaluative Section B split (2 AO1, 6 AO2)
      return [
        {
          band: 4,
          markRange: [7, 8],
          descriptor:
            "Accurate syllabus definitions and comprehensive theoretical knowledge. Thorough, multi-step causal analysis explaining market/macro transmission without gaps. Clear diagrammatic reference or accurate application.",
        },
        {
          band: 3,
          markRange: [5, 6],
          descriptor:
            "Clear knowledge of key concepts. Good causal analysis explaining intermediate transmission steps, with minor gaps in depth.",
        },
        {
          band: 2,
          markRange: [3, 4],
          descriptor:
            "Basic knowledge shown. Descriptive analysis with asserted links rather than fully explained economic mechanisms.",
        },
        {
          band: 1,
          markRange: [1, 2],
          descriptor:
            "Isolated definitions or brief factual statements. Causal analysis is missing, confused, or contains significant misconceptions.",
        },
      ];
    }

    // 8m evaluative Section A split (2 AO1, 4 AO2, 2 AO3)
    return [
      {
        band: 4,
        markRange: [7, 8],
        descriptor:
          "Precise definitions. Multi-step causal analysis of mechanism. Contextual evaluation with supported judgement directly resolving the question.",
      },
      {
        band: 3,
        markRange: [5, 6],
        descriptor:
          "Good knowledge and clear analysis of at least two causal steps. Some evaluation addressing both sides or assessing significance.",
      },
      {
        band: 2,
        markRange: [3, 4],
        descriptor:
          "Basic knowledge. Fragmented analysis. Evaluation is superficial or merely repeats previous points.",
      },
      {
        band: 1,
        markRange: [1, 2],
        descriptor:
          "Superficial definitions, disconnected claims, and zero evaluation.",
      },
    ];
  }

  // Default: 12-mark question (AO1: 3, AO2: 6, AO3: 3)
  return [
    {
      band: 4,
      markRange: [10, 12],
      descriptor:
        "Comprehensive syllabus knowledge. Complete, multi-step causal analysis showing market adjustment. Balanced, contextually supported evaluation with explicit criteria and a clear conclusion.",
    },
    {
      band: 3,
      markRange: [7, 9],
      descriptor:
        "Accurate knowledge. Developed causal analysis of key arguments. Good evaluative weighing, though judgement may be brief.",
    },
    {
      band: 2,
      markRange: [4, 6],
      descriptor:
        "Partial knowledge with descriptive explanations. Gaps in causal links. Superficial evaluation without analytical support.",
    },
    {
      band: 1,
      markRange: [1, 3],
      descriptor:
        "Fragmented knowledge with misconceptions. Undeveloped assertions. Evaluation is absent.",
    },
  ];
}

/**
 * Constructs a comprehensive QuestionRubric object grounded in the question and Cambridge IGCSE 0455 specifications.
 */
export function buildQuestionRubric(params: {
  question: string;
  level: "as" | "a2";
  maxMark: number;
  contextBlock?: string;
}): QuestionRubric {
  const { question, maxMark, contextBlock = "" } = params;
  const commandWord = extractCommandWord(question);
  const validTariff = (maxMark === 8 || maxMark === 12 || maxMark === 20 ? maxMark : 12) as 8 | 12 | 20;
  const split = TARIFF_SPLITS[validTariff] || defaultSplitForMaxMark(validTariff);
  const cmdRule = COMMAND_WORD_RULES[commandWord] || COMMAND_WORD_RULES.discuss!;

  const requiresEval = cmdRule.requiresEvaluation && split.ao3_marks > 0;

  const assessmentObjectives = [
    {
      ao: "AO1" as const,
      applicable: split.ao1_marks > 0,
      criteria: [
        `Accurate definitions of key terms specified in the prompt (${split.ao1_marks} marks max).`,
        "Precise use of Cambridge IGCSE 0455 economics terminology without conceptual inversions.",
      ],
    },
    {
      ao: "AO2" as const,
      applicable: split.ao2_marks > 0,
      criteria: [
        `Multi-step causal transmission: cause -> intermediate market adjustments -> equilibrium outcome (${split.ao2_marks} marks max).`,
        "Application to economic context: market mechanisms, elasticity, diagrammatic curve shifts, or relevant case studies.",
        "Unbroken economic logic: diagrams and formulas correctly integrated into reasoning.",
      ],
    },
    {
      ao: "AO3" as const,
      applicable: requiresEval,
      criteria: requiresEval
        ? [
            `Critical weighing of policy trade-offs, short-run vs long-run implications (${split.ao3_marks} marks max).`,
            "Contextual dependency: identifying which elasticity or economic condition is most decisive.",
            "Supported evaluative judgement that directly resolves the prompt.",
          ]
        : ["Command word does not award evaluation credit; focus on analytical depth."],
    },
  ];

  const indicativeContent = extractIndicativePoints(question, contextBlock);
  const levelDescriptors = buildLevelDescriptors(validTariff, commandWord);

  return {
    questionId: `q::${encodeURIComponent(question.slice(0, 40))}`,
    questionText: question,
    commandWord,
    maximumMarks: validTariff,
    assessmentObjectives,
    indicativeContent,
    levelDescriptors,
    alternativeAcceptableArguments: [
      "Alternative Keynesian vs Classical / Monetarist transmission channels are accepted with equal validity.",
      "Both microeconomic (firm/consumer) and macroeconomic (national economy) perspectives are credited when grounded in the question context.",
    ],
    markingInstructions: [
      "Award credit strictly for demonstrated economic understanding, not keyword repetition.",
      "Do NOT award AO2 analysis credit for sentences that merely define terms or introduce examples without explaining the mechanism.",
      "Ensure the mathematical sum of awarded AO marks does not exceed the total question tariff.",
    ],
    sourceReferences: contextBlock ? ["Cambridge IGCSE 0455 Official Syllabus & RAG Mark Scheme"] : ["Cambridge IGCSE 0455 Syllabus Standard"],
    rubricVersion: "2.0",
  };
}

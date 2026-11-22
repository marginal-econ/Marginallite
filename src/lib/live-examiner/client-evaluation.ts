import { defaultSplitForMaxMark } from "@/lib/examiner/config";
import type {
  ActiveAoClassification,
  ActiveIssue,
  PredictedMark,
} from "@/hooks/use-live-examiner-check";
import { deterministicTerminologyIssues } from "./economics-glossary";
import { analyzeGrammarAndMechanics } from "./grammar-engine";
import { splitSentences } from "@/lib/writing-check/sentence-diff";
import { classifySentence } from "./sentence-engine";

const AO1_PATTERNS = [
  /\b(aggregate demand|aggregate supply|ad equation|c\s*\+\s*i\s*\+\s*g\s*\+\s*nx|ad\s*=\s*c\s*\+\s*i\s*\+\s*g\s*\+\s*nx)\b/i,
  /\b(monetary policy|fiscal policy|supply-?side policy|expansionary|contractionary|interest rates?|taxation|money supply)\b/i,
  /\b(inflation|demand-?pull|cost-?push|deflation|disinflation|price level|cpi|unemployment|cyclical|structural|frictional)\b/i,
  /\b(elasticity|ped|yed|pes|xed|price elastic|inelastic)\b/i,
  /\b(gdp|economic growth|real gdp|output|national income|living standards)\b/i,
  /\b(demerit goods?|merit goods?|public goods?|free rider|non-excludable|non-rival)\b/i,
  /\b(external costs?|externalit(?:y|ies|ailties)|social optimum|market failures?|information failures?|information faliure)\b/i,
  /\b(opportunity costs?|production possibility|ppc|ppf|scarcity|factors? of production)\b/i,
  /\b(equilibrium|price floors?|minimum prices?|maximum prices?|price ceilings?|subsid(?:y|ies)|tariffs?|quotas?|free trade|protectionism|speciali[sz]ation|comparative advantage|absolute advantage|exchange rates?|current account|terms of trade|monopoly|oligopoly|perfect competition)\b/i,
  /\b(is when|occurs when|is equal to|is defined as|can be defined as|refers to|measures the|means that suppliers|means that firms|are goods that are|government intervention|overconsumed|underconsumed)\b/i,
];

const AO2_PATTERNS = [
  /\b(leads to|leading to|causes|causing|as a result|consequently|therefore)\b/i,
  /\b(because|due to their|means that|meaning that|results in|resulting in|generates?)\b/i,
  /\b(incentivised to produce|incentivized to produce|profit motive|job opportunities)\b/i,
  /\b(shifts outward|shifts inward|shifts right|shifts left|contracts demand|expands demand)\b/i,
  /\b(increases production|increase in production|rises|rising|reduces|reducing|contracts)\b/i,
  /\b(tax revenue rises|corporate tax rises|income tax|budget for the government|government revenue)\b/i,
  /\b(deadweight (?:welfare )?loss|welfare loss|consumer surplus|producer surplus|allocative (?:in)?efficiency|multiplier effect|crowding out|transmission mechanism)\b/i,
];

const AO3_PATTERNS = [
  /\b(but|how+ev+e?r|however|in contrast|by contrast|on the other hand|on the one hand|whereas|nevertheless|nonetheless|conversely|alternatively|despite this|in spite of|on the contrary|notwithstanding|yet|although|even though)\b/i,
  /\b(but\s+(?:this|in|the|it|if|when|whether|there|consumers?|firms?|producers?|governments?|only|may|might|could|creates?|leads?|results?|depends?|is not|are not|cannot))\b/i,
  /\b(depends on|depend on|depending on|depends upon|depending upon|contingent on|contingent upon|is determined by the extent|to the extent that|the extent to which|to what extent|degree to which|critical factor determining|crucial factor|pivotal factor)\b/i,
  /\b(elasticity of demand determines|depends on the elasticity|ped of the good|ped is inelastic|ped is elastic|pes is inelastic|pes is elastic|magnitude of the shift|size of the tax|size of the subsidy|scale of the intervention)\b/i,
  /\b(not fully accurate|merely estimates|assumes? ceteris paribus|ceteris paribus assumption|in reality|temporal validity|past data|data may be outdated|difficult to measure|imperfect information|asymmetric information)\b/i,
  /\b(short run versus long run|short run vs long run|short-run vs long-run|in the short run.*in the long run|in the short-?run|in the long-?run|time lag|time lags|over time|takes time to|immediate effect)\b/i,
  /\b(more important than|most critical factor|greater significance|weighing up|overall|in conclusion|to conclude|in summary|to summarise|ultimately|on balance|all things considered|balanced judgement|final judgement|judgement|priority should be|more effective than|the most effective policy)\b/i,
  /\b(not always|only effective if|effective when|ineffective|limitation|limitations|drawbacks?|trade-?off|trade-offs|unintended consequence|unintended consequences|market distortion|government failure|opportunity cost of government)\b/i,
];

export function classifySentenceDeterministically(sentence: string): {
  ao: "AO1" | "AO2" | "AO3";
  explanation: string;
} {
  const { ao, explanation } = classifySentence(sentence);
  return { ao, explanation };
}

export type ClientEvaluationResult = {
  predictedMark: PredictedMark;
  classifications: ActiveAoClassification[];
  issues: ActiveIssue[];
  matchedTerms: string[];
};

export function evaluateCambridgeAnswer(
  text: string,
  arg2?: number | string,
  arg3?: number | string,
  _arg4?: string,
): ClientEvaluationResult {
  let maxMark = 12;
  let _level = "as";
  let question = "";

  if (typeof arg2 === "number") {
    maxMark = arg2;
    if (typeof arg3 === "string") _level = arg3;
  } else if (typeof arg3 === "number") {
    if (typeof arg2 === "string") question = arg2;
    maxMark = arg3;
    if (typeof _arg4 === "string") _level = _arg4;
  } else if (typeof arg2 === "string" && !isNaN(Number(arg2)) && arg2.trim() !== "") {
    maxMark = Number(arg2);
    if (typeof arg3 === "string") _level = arg3;
  } else if (typeof arg2 === "string") {
    question = arg2;
  }

  // Guard against non-numeric or non-finite values
  maxMark = Number.isFinite(maxMark) && maxMark > 0 ? maxMark : 12;
  const sentences = splitSentences(text);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const split = defaultSplitForMaxMark(maxMark);
  const classifications: ActiveAoClassification[] = [];
  const matchedTerms = new Set<string>();

  let ao1Count = 0;
  let ao2Count = 0;
  let ao3Count = 0;
  let ao2Units = 0;
  let ao3Units = 0;
  let hasDiagram = false;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (/\[DIAGRAM:[^\]]*\]/i.test(trimmed)) {
      hasDiagram = true;
      ao2Units += 1.2;
      continue;
    }
    const wordsInSentence = trimmed.split(/\s+/).filter(Boolean).length;
    if (wordsInSentence < 5) continue;

    const fullClass = classifySentence(trimmed);
    const classified = { ao: fullClass.ao, explanation: fullClass.explanation };
    if (classified.ao === "AO3") {
      ao3Count++;
      ao3Units += fullClass.strength === 2 ? 1.35 : 0.9;
    } else if (classified.ao === "AO2") {
      ao2Count++;
      ao2Units += fullClass.strength === 2 ? 1.35 : 0.9;
    } else {
      ao1Count++;
    }

    classifications.push({
      id: `${classified.ao}::${trimmed.toLowerCase()}::${trimmed.toLowerCase()}`,
      original: trimmed,
      context: sentence,
      ao: classified.ao,
      explanation: classified.explanation,
    });

    // Collect matched terms
    for (const pat of AO1_PATTERNS) {
      const match = trimmed.match(pat);
      if (match) matchedTerms.add(match[0].toLowerCase());
    }
    for (const pat of AO2_PATTERNS) {
      const match = trimmed.match(pat);
      if (match) matchedTerms.add(match[0].toLowerCase());
    }
    for (const pat of AO3_PATTERNS) {
      const match = trimmed.match(pat);
      if (match) matchedTerms.add(match[0].toLowerCase());
    }
  }

  // Issues (glossary & grammar)
  const terms = deterministicTerminologyIssues(sentences);
  const grammar = analyzeGrammarAndMechanics(sentences);
  const rawIssues: ActiveIssue[] = [
    ...terms.map((t) => ({
      ...t,
      id: `${t.category}::${t.context.trim().toLowerCase()}::${t.original.trim().toLowerCase()}`,
    })),
    ...grammar.map(({ ruleId: _r, startOffset: _s, endOffset: _e, ...g }) => ({
      ...g,
      id: `${g.category}::${g.context.trim().toLowerCase()}::${g.original.trim().toLowerCase()}`,
    })),
  ];
  const issues: ActiveIssue[] = Array.from(new Map(rawIssues.map((item) => [item.id, item])).values());
  const misconceptionCount = issues.filter((i) => i.category === "misconception").length;

  // Calculate marks calibrated to Cambridge IGCSE 0455 tariffs & Essay Grader bands
  // Strict Cambridge Examiner Guard: Fragments or < 10 words earn ZERO marks
  let ao1Awarded = 0;
  if (wordCount >= 10) {
    if (
      ao1Count >= 2 ||
      (wordCount >= 40 && ao1Count >= 1) ||
      (ao1Count >= 1 && ao2Count >= 1 && wordCount >= 28)
    ) {
      ao1Awarded = split.ao1_marks;
    } else if (ao1Count >= 1) {
      ao1Awarded = Math.min(split.ao1_marks, Math.max(1, Math.floor(split.ao1_marks * 0.5)));
    }
  }

  let ao2Awarded = 0;
  // Analysis requires developing causal transmission mechanisms
  if (wordCount >= 10) {
    if (
      (wordCount >= 180 && ao2Count >= 4) ||
      (ao2Count >= 4 && ao3Count >= 2) ||
      (ao2Count >= 3 && ao3Count >= 2) ||
      ao2Count >= 5 ||
      ao2Units >= 4.5
    ) {
      // Top-band analysis: 5 or 6 out of 6
      ao2Awarded = Math.min(split.ao2_marks, Math.max(5, Math.round(split.ao2_marks * 0.95)));
    } else if ((wordCount >= 120 && ao2Count >= 3) || ao2Count >= 3 || ao2Units >= 3.2) {
      ao2Awarded = Math.min(split.ao2_marks, Math.max(4, Math.round(split.ao2_marks * 0.8)));
    } else if ((wordCount >= 60 && ao2Count >= 2) || (ao2Count >= 2 && hasDiagram) || ao2Units >= 2.3) {
      ao2Awarded = Math.min(split.ao2_marks, Math.max(2, Math.round(split.ao2_marks * 0.5)));
    } else if (ao2Count >= 1 || hasDiagram) {
      ao2Awarded = 1;
    }
  }

  // Theoretical misconceptions cap AO2 analysis at Level 2 unless overridden by abundant clean chains
  if (misconceptionCount > 0 && ao2Count <= misconceptionCount + 1) {
    ao2Awarded = Math.min(ao2Awarded, Math.max(1, Math.floor(split.ao2_marks * 0.5)));
  }

  let ao3Awarded = 0;
  // Evaluation requires weighing up, conditions, and judgements
  if (split.ao3_marks > 0 && wordCount >= 10 && (wordCount >= 20 || ao3Count >= 1)) {
    if (
      (wordCount >= 150 && ao3Count >= 2) ||
      (ao3Count >= 2 && ao2Count >= 3) ||
      ao3Count >= 3 ||
      ao3Units >= 3.2
    ) {
      // Top-band evaluation: full marks
      ao3Awarded = split.ao3_marks;
    } else if ((ao3Count >= 2) || (ao3Count >= 1 && wordCount >= 90) || ao3Units >= 1.8) {
      ao3Awarded = Math.min(split.ao3_marks, Math.max(2, Math.round(split.ao3_marks * 0.65)));
    } else if (ao3Count >= 1) {
      ao3Awarded = Math.min(split.ao3_marks, Math.max(1, Math.round(split.ao3_marks * 0.35)));
    }
  }

  // Question relevance guard: if completely devoid of economic terms and >15 words, award 0
  if (wordCount >= 15 && matchedTerms.size === 0 && ao2Count === 0 && ao3Count === 0 && question.length > 0) {
    const qTokens = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !/^(assess|evaluate|discuss|explain|whether|extent|consider|analyse|analyze|impact|effects?)$/.test(w));
    const lowerText = text.toLowerCase();
    const hasTopicOverlap = qTokens.length === 0 || qTokens.some((t) => lowerText.includes(t));
    if (!hasTopicOverlap) {
      ao1Awarded = 0;
      ao2Awarded = 0;
      ao3Awarded = 0;
    }
  }

  const safeAo1 = Number.isFinite(ao1Awarded) ? Math.min(split.ao1_marks, Math.max(0, ao1Awarded)) : 0;
  const safeAo2 = Number.isFinite(ao2Awarded) ? Math.min(split.ao2_marks, Math.max(0, ao2Awarded)) : 0;
  const safeAo3 = Number.isFinite(ao3Awarded) ? Math.min(split.ao3_marks, Math.max(0, ao3Awarded)) : 0;
  const sumMarks = safeAo1 + safeAo2 + safeAo3;
  const totalMark = Math.min(maxMark, Number.isFinite(sumMarks) ? sumMarks : 0);

  let nextCoaching = "calibrated against Cambridge IGCSE 0455 assessment criteria";
  if (wordCount === 0) {
    nextCoaching = "Start with precise Cambridge IGCSE 0455 definitions to unlock AO1 marks";
  } else if (safeAo1 < split.ao1_marks) {
    nextCoaching = "Define key syllabus terms precisely in your opening to secure full AO1 marks";
  } else if (maxMark >= 20 && wordCount < 550) {
    nextCoaching = "Extend your response with thorough causal chains and real-life examples (800-1200w target)";
  } else if (maxMark >= 20 && safeAo2 < 10) {
    nextCoaching = "Deepen AO2 analysis with unbroken causal transmission and integrated real-world examples";
  } else if (maxMark >= 20 && safeAo3 < 5) {
    nextCoaching = "Synthesize synoptic evaluation by prioritizing decisive trade-offs and reaching a supported verdict";
  } else if (safeAo2 < Math.ceil(split.ao2_marks * 0.7)) {
    nextCoaching = "Extend your AO2 causal transmission chains (cause -> market adjustment -> equilibrium outcome)";
  } else if (split.ao3_marks > 0 && safeAo3 < split.ao3_marks) {
    nextCoaching = "Add AO3 evaluation weighing PED/PES elasticity, short-run vs long-run, or unintended consequences";
  } else {
    nextCoaching = "Top-Band trajectory — refine academic precision or conclude with a conditional judgement";
  }

  const predictedMark: PredictedMark = {
    total_mark: totalMark,
    confidence: wordCount > 150 ? 0.88 : wordCount > 60 ? 0.76 : 0.65,
    headline: `${totalMark}/${maxMark} marks — ${nextCoaching}`,
    ao_breakdown: {
      knowledge: { awarded: safeAo1, out_of: split.ao1_marks || 2 },
      analysis: { awarded: safeAo2, out_of: split.ao2_marks || 6 },
      evaluation: { awarded: safeAo3, out_of: split.ao3_marks || 4 },
    },
  };

  return {
    predictedMark,
    classifications,
    issues,
    matchedTerms: Array.from(matchedTerms),
  };
}

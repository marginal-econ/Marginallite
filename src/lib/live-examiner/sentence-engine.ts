/**
 * Live Examiner sentence engine — the "delta buffer".
 *
 * Everything here is pure, free (no AI) and runs in the browser on every
 * keystroke AND on the server:
 *   - sentence keys + completeness detection (so unfinished sentences are
 *     never sent to the AI),
 *   - a confidence-scored AO classifier (only genuinely ambiguous
 *     sentences ever need an AI opinion),
 *   - the running-mark aggregator: the mark is computed from per-sentence
 *     credit, so it rises automatically as more creditworthy writing is
 *     added and never needs a paid whole-essay AI call.
 */
import { defaultSplitForMaxMark } from "@/lib/examiner/config";
import { splitSentences } from "@/lib/writing-check/sentence-diff";

export type AoCode = "AO1" | "AO2" | "AO3";

export type SentenceClass = {
  ao: AoCode;
  /** 0..1 — below AMBIGUOUS_BELOW the sentence is worth an AI second opinion. */
  confidence: number;
  /** 0 = no credit, 1 = basic credit, 2 = developed credit. */
  strength: 0 | 1 | 2;
  explanation: string;
};

export const AMBIGUOUS_BELOW = 0.7;

export function sentenceKey(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s.!?]+$/g, "")
    .trim();
}

export function wordCountOf(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isDiagramTag(sentence: string): boolean {
  return /\[DIAGRAM:[^\]]*\]/i.test(sentence);
}

/** True when the text ends on a finished sentence (terminal punctuation / newline). */
export function endsWithCompleteSentence(text: string): boolean {
  return /(?:[.!?]["')\]]*|\n)\s*$/.test(text);
}

/** Splits into sentences, flagging whether each is finished (the last one may not be). */
export function splitWithCompleteness(text: string): { sentence: string; complete: boolean }[] {
  const sentences = splitSentences(text);
  const lastComplete = endsWithCompleteSentence(text);
  return sentences.map((sentence, i) => ({
    sentence,
    complete: i < sentences.length - 1 || lastComplete,
  }));
}

const CAUSAL =
  /\b(leads? to|leading to|led to|causes?|causing|results? in|resulting in|as a result|consequently|therefore|thus|hence|because|due to|which means|this means|meaning that|so that|so (?:firms|consumers|producers|the)|incentivis\w*|incentiviz\w*|encourages?|discourages?|reduces?|raises?|increases?|decreases?|lowers?|shifts?|contraction|expansion|excess (?:supply|demand)|deadweight|welfare loss|multiplier|crowding out|transmission|generates?|creates?|forces?|induces?|falls?|rises?|fell|rose)\b/i;
const DIRECTION =
  /\b(rise|rises|rising|fall|falls|falling|increase|increases|decrease|decreases|higher|lower|more|less|shift|shifts|contract|expand|reduce|reduces|raise|raises)\b/i;
const EVAL_STRONG =
  /\b(however|although|though|even though|whereas|whilst|nevertheless|nonetheless|conversely|in contrast|by contrast|on the other hand|on the one hand|despite this|in spite of|despite the fact|depends? (?:on|upon)|depending on|dependent on|contingent (?:on|upon)|to (?:what|the) extent|the extent to which|degree to which|on balance|in conclusion|to conclude|in summary|to summarise|to summarize|ultimately|overall|all things considered|unless|provided that|only if|even if|only effective|only works if|limitations?|drawbacks?|trade-?offs?|unintended consequences?|government failure|black markets?|informal markets?|shadow econom\w+|regressive impact|time lags?|in the (?:short|long)[- ]run|short[- ]run (?:vs|versus) long[- ]run|not always|may not|might not|will not necessarily|not necessarily|most (?:important|significant|effective|critical)|more (?:important|effective|significant) than|less effective than|alternative polic(?:y|ies)|compared to|outweighs?|outweighed by|critical factor|crucial factor|pivotal factor|key determinant|questionable whether|debatable whether|fails to account for|overlooks|ceteris paribus|in practice|in reality|judgement|weigh(?:ing)?)\b/i;
const EVAL_WEAK = /\b(but|yet|while|whilst|ineffective|effective|likely|unlikely|significant|magnitude|scale|elasticity|short-run|long-run)\b/i;
const DEFINITION =
  /\b(is when|are when|occurs when|happens when|is defined as|are defined as|can be defined as|refers to|is the degree of responsiveness|is a measure of|is the measure of|measures the percentage change|measures how|is calculated as|is equal to|formula for|is the percentage change|is the (?:total|amount|value|rate|ratio|process|situation|cost|price|quantity|difference|increase|decrease|sum|level|ability|exchange|removal|absence)|are goods that are|are goods which|is a (?:good|service|tax|policy|market|situation|price|type|system|limit|ban|barrier)|are (?:goods|services|markets|firms|taxes|policies|barriers|restrictions)|with (?:few|no|minimal) (?:trade )?(?:barriers|restrictions) such as|where (?:countries|firms|producers|workers|economies|nations|individuals) (?:can )?(?:focus|concentrate|speciali[sz]e) on|focus(?:ing)? on producing a (?:limited|narrow|specific) range of (?:goods|products|services))\b/i;
const DEFINITION_START =
  /^(?:a|an|the)?\s*[\w\s\-()/]{0,60}?\s(?:is|are)\s+(?:the|a|an|when|where|defined|goods|services)\b/i;
const ECON_TERM =
  /\b(demand|supply|price|elastic\w*|inelastic|ped|yed|pes|xed|equilibrium|externalit\w+|market failure|merit|demerit|public goods?|subsid\w+|tax\w*|tariff\w*|quota\w*|free trade|protectionism|speciali[sz]ation|comparative advantage|absolute advantage|inflation|deflation|gdp|cpi|rpi|monopol\w+|oligopol\w+|competition|efficien\w+|surplus|opportunity cost|fiscal|monetary|interest rates?|exchange rates?|unemployment|claimant count|labour force survey|lfs|claimants?|benefits?|labor|labour|workforce|employment|sampling error\w*|sample\w*|survey\w*|underemployment|inactivity|discouraged workers?|living standards|standard of living|national income|purchasing power parity|ppp|hdi|gini|lorenz|balance of payments|current account|trade deficit|trade surplus|budget deficit|national debt|administrative (?:data|records?)|reliability|central bank|liquidity|productivity|productive capacity|recession|boom|growth|wealth|poverty|distribution of income|aggregate|multiplier|welfare|deadweight|incidence|margin\w*|utility|revenue|profit|output|firms?|consumers?|producers?|government|consumption|investment|borrowing costs?|trade|trades?|shortages?)\b/i;
const CONTEXT_APP =
  /\b(for example|for instance|in the case of|e\.g\.|toyota|apple|tesla|india|china|uk|us|usa|europe|opec|nhs|covid)\b/i;

/** Confidence-scored AO classification of one sentence. Pure and free. */
export function classifySentence(sentence: string): SentenceClass {
  const s = sentence.trim();
  const lower = s.toLowerCase();
  const words = wordCountOf(s);

  // Incomplete fragment or single isolated word earns NO credit
  if (words < 5) {
    return {
      ao: "AO1",
      confidence: 0,
      strength: 0,
      explanation: "Sentence fragment — write a complete thought to earn marks.",
    };
  }

  const hasEcon = ECON_TERM.test(lower);

  const isDef =
    DEFINITION.test(lower) ||
    DEFINITION_START.test(lower) ||
    /^(?:ped|yed|pes|xed|price elasticity|income elasticity|cross elasticity|elasticity of supply|inflation|deflation|gdp|cpi|opportunity cost|fiscal policy|monetary policy|free trade|protectionism|speciali[sz]ation|comparative advantage|absolute advantage|tariff\w*|quota\w*|subsid\w*)\s+(?:is|are|measures|refers to|represents|means|occurs when)\b/i.test(
      lower,
    ) ||
    /\b(demerit goods? are|merit goods? are|public goods? are|free riders? are)\b/i.test(lower);
  const evalStrong = (lower.match(new RegExp(EVAL_STRONG.source, "gi")) ?? []).length;
  const evalWeak = EVAL_WEAK.test(lower);
  const causal = (lower.match(new RegExp(CAUSAL.source, "gi")) ?? []).length;
  const direction = DIRECTION.test(lower);
  const applied = CONTEXT_APP.test(lower);

  // 1. Definitions — unmistakably AO1, unless the sentence goes on to evaluate or build a multi-step directional chain.
  if (isDef && evalStrong === 0 && (causal === 0 || (causal === 1 && !direction))) {
    return {
      ao: "AO1",
      confidence: 0.95,
      strength: words >= 10 ? 2 : 1,
      explanation:
        "AO1 Knowledge: Accurate Cambridge IGCSE 0455 definition, formula, or economic concept foundation.",
    };
  }

  // 2. Evaluation — whole-sentence evaluative weighing, conditions, limitations, or judgements
  if (evalStrong >= 1 && hasEcon) {
    const confident =
      evalStrong >= 2 ||
      /however|on balance|in conclusion|to conclude|depends|dependent|contingent|extent|although|even though|whereas|whilst|on the other hand|in contrast|by contrast|nevertheless|nonetheless|unintended consequence|government failure|limitations?|trade-?offs?|in the (?:short|long)[- ]run|time lags?|most (?:important|effective)|more effective than/i.test(
        lower,
      );
    return {
      ao: "AO3",
      confidence: confident ? 0.92 : 0.8,
      strength: words >= 12 && (evalStrong >= 2 || causal >= 1) ? 2 : 1,
      explanation:
        "AO3 Evaluation: Critical capacity condition, dependency, limitation, or evaluative judgement.",
    };
  }
  if (
    evalWeak &&
    (/\b(but|yet)\b/i.test(lower) || /^(?:while|whilst)\b/i.test(lower)) &&
    hasEcon &&
    (/(?:depends|elasticity|time lags?|short-run|long-run|magnitude|trade-offs?|unintended|ineffective|shortage|failure|limitation|drawback|distort|costly)/i.test(lower) ||
      (causal >= 1 && words >= 10))
  ) {
    return {
      ao: "AO3",
      confidence: 0.82,
      strength: words >= 14 && causal >= 1 ? 2 : 1,
      explanation:
        "AO3 Evaluation: Critical capacity condition, dependency, limitation, or evaluative judgement.",
    };
  }

  // 3. Analysis — requires an actual causal transmission mechanism (multi-step causal chain, or causal + directional economic adjustment)
  if ((causal >= 2 || (causal >= 1 && (direction || applied))) && hasEcon && !isDef) {
    return {
      ao: "AO2",
      confidence:
        causal >= 2 ||
        /because|therefore|as a result|which means|consequently|leading to|resulting in/i.test(lower)
          ? 0.88
          : 0.76,
      strength: words >= 12 && (causal >= 2 || applied) ? 2 : 1,
      explanation:
        "AO2 Analysis: Causal transmission mechanism linking cause, market reaction, and economic outcome.",
    };
  }
  if (applied && hasEcon && !isDef && (direction || causal >= 1 || words >= 10)) {
    return {
      ao: "AO2",
      confidence: 0.78,
      strength: 1,
      explanation:
        "AO2 Application: Economic theory applied to a specific example or context.",
    };
  }
  if (causal >= 1 && hasEcon && words >= 8 && !isDef) {
    return {
      ao: "AO2",
      confidence: 0.70,
      strength: 1,
      explanation:
        "AO2 Analysis: Causal transmission mechanism linking cause, market reaction, and economic outcome.",
    };
  }

  // 4. Knowledge / foundation (including single-step concept identification without a mechanism)
  if (hasEcon || isDef) {
    return {
      ao: "AO1",
      confidence: 0.82,
      strength: words < 5 ? 0 : 1,
      explanation:
        "AO1 Knowledge: Foundational economic statement, terminology, or theoretical premise.",
    };
  }

  // Non-economic sentence earns ZERO credit and ZERO confidence
  return {
    ao: "AO1",
    confidence: 0,
    strength: 0,
    explanation: "General statement — contains no economic terminology, theory, or syllabus concepts.",
  };
}

/** Per-sentence record held in the delta buffer. `ai` = an AI opinion has been folded in. */
export type LedgerRecord = { ao: AoCode; strength: 0 | 1 | 2; ai: boolean };
export type Ledger = Map<string, LedgerRecord>;

export function resolveSentence(sentence: string, record?: LedgerRecord): SentenceClass {
  const det = classifySentence(sentence);
  if (record?.ai) {
    return {
      ...det,
      ao: record.ao,
      strength: record.strength,
      confidence: 0.95,
      explanation: aoExplanation(record.ao),
    };
  }
  return det;
}

export function aoExplanation(ao: AoCode): string {
  if (ao === "AO3")
    return "AO3 Evaluation: Critical capacity condition, dependency, limitation, or evaluative judgement.";
  if (ao === "AO2")
    return "AO2 Analysis: Causal transmission mechanism linking cause, market reaction, and economic outcome.";
  return "AO1 Knowledge: Foundational economic statement, terminology, or theoretical premise.";
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function similar(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size) >= 0.85;
}

export type MarkInput = {
  text: string;
  maxMark: number;
  ledger?: Ledger;
  /** Contexts of sentences carrying a substantive economics error — they earn no credit. */
  wrongContexts?: Set<string>;
};

export type RunningMark = {
  total_mark: number;
  confidence: number;
  headline: string;
  ao_breakdown: {
    knowledge: { awarded: number; out_of: number };
    analysis: { awarded: number; out_of: number };
    evaluation: { awarded: number; out_of: number };
  };
};

// Strength-weighted sentence units needed per mark (calibrated so a full
// 12-mark essay needs roughly 400+ words of developed argument).
const UNITS_PER_MARK = { ao1: 0.9, ao2: 1.25, ao3: 1.15 } as const;
const STRENGTH_WEIGHT = [0, 0.5, 1] as const;

/**
 * Running mark from per-sentence credit. Monotonic in the amount of
 * creditworthy writing: adding sentences can only add credit, deleting
 * removes it. Costs nothing and updates on every keystroke.
 */
export function computeRunningMark(input: MarkInput): RunningMark {
  const { text, maxMark, ledger, wrongContexts } = input;
  const split = defaultSplitForMaxMark(maxMark);
  const items = splitWithCompleteness(text);
  const units = { AO1: 0, AO2: 0, AO3: 0 };
  const seen: Set<string>[] = [];
  let aiCount = 0;
  let counted = 0;

  for (const { sentence, complete } of items) {
    if (isDiagramTag(sentence)) {
      units.AO2 += 0.8; // an attached diagram is analysis credit
      continue;
    }
    const words = wordCountOf(sentence);
    // A trailing, unfinished sentence earns credit only once it is substantial.
    if (!complete && words < 8) continue;
    if (words < 5) continue;
    if (wrongContexts?.has(sentence)) continue;

    const tok = tokens(sentence);
    if (seen.some((t) => similar(t, tok))) continue; // repeated point: no extra credit
    seen.push(tok);

    const rec = ledger?.get(sentenceKey(sentence));
    const cls = resolveSentence(sentence, rec);
    if (rec?.ai) aiCount++;
    counted++;
    const weight = STRENGTH_WEIGHT[cls.strength] * (complete ? 1 : 0.6);
    units[cls.ao] += weight;
  }

  const wc = wordCountOf(text);
  const round = (u: number, upm: number, cap: number) =>
    wc < 10 ? 0 : Math.max(0, Math.min(cap, Math.floor(u / upm + 0.5)));
  const ao1 = round(units.AO1, UNITS_PER_MARK.ao1, split.ao1_marks);
  const ao2 = round(units.AO2, UNITS_PER_MARK.ao2, split.ao2_marks);
  // You cannot be credited for evaluating analysis that is not there.
  const ao3 = wc < 10 ? 0 : Math.min(
    round(units.AO3, UNITS_PER_MARK.ao3, split.ao3_marks),
    split.ao3_marks === 0 ? 0 : ao2 + 1,
  );
  const total = wc < 10 ? 0 : Math.min(maxMark, ao1 + ao2 + ao3);

  const weakest = (
    [
      ["add precise definitions", split.ao1_marks ? ao1 / split.ao1_marks : 1],
      ["develop your causal chains", split.ao2_marks ? ao2 / split.ao2_marks : 1],
      ["add evaluation and judgement", split.ao3_marks ? ao3 / split.ao3_marks : 1],
    ] as [string, number][]
  ).sort((a, b) => a[1] - b[1])[0];
  const headline =
    counted === 0 || wc < 10
      ? "Start writing to earn marks"
      : total >= maxMark
        ? "Full marks on current evidence"
        : `Next: ${weakest[0]}`;

  const confidence = Math.min(
    0.95,
    0.5 + Math.min(0.25, wc / 800) + (counted ? (aiCount / counted) * 0.2 : 0),
  );

  return {
    total_mark: total,
    confidence: Math.round(confidence * 100) / 100,
    headline,
    ao_breakdown: {
      knowledge: { awarded: ao1, out_of: split.ao1_marks },
      analysis: { awarded: ao2, out_of: split.ao2_marks },
      evaluation: { awarded: ao3, out_of: split.ao3_marks },
    },
  };
}

/** Sentences (complete, substantive) that the AI has not yet seen. */
export function pendingSentences(text: string, ledger: Ledger): string[] {
  return splitWithCompleteness(text)
    .filter(
      ({ sentence, complete }) =>
        complete &&
        !isDiagramTag(sentence) &&
        wordCountOf(sentence) >= 4 &&
        !ledger.get(sentenceKey(sentence))?.ai,
    )
    .map((x) => x.sentence);
}

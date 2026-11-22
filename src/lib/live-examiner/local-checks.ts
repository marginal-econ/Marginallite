import nspell from "nspell";
import aff from "./dict/index.aff?raw";
import dic from "./dict/index.dic?raw";
import type { IssueV2, RawSegment } from "./types";
import { CAMBRIDGE_ECONOMICS_WHITELIST } from "./grammar-engine";

// Lazy-initialized nspell instance
let spellChecker: ReturnType<typeof nspell> | null = null;

// Technical economic whitelist (expanded with abbreviations and terms)
const CUSTOM_WHITELIST = new Set<string>();

// Add all terms and their constituent words
for (const phrase of CAMBRIDGE_ECONOMICS_WHITELIST) {
  const norm = phrase.toLowerCase().trim();
  CUSTOM_WHITELIST.add(norm);
  for (const part of norm.split(/\s+/)) {
    if (part.length > 2) CUSTOM_WHITELIST.add(part);
  }
}

const EXTRA_TERMS = [
  "ped",
  "yed",
  "pes",
  "xed",
  "gdp",
  "gnp",
  "gni",
  "cpi",
  "rpi",
  "lras",
  "sras",
  "ad",
  "as",
  "ppc",
  "ppf",
  "mrs",
  "mpc",
  "mps",
  "mpt",
  "mpm",
  "bop",
  "fdi",
  "mne",
  "mnc",
  "tpp",
  "wto",
  "imf",
  "opec",
  "nhs",
  "uk",
  "us",
  "usa",
  "eu",
  "ceteris",
  "paribus",
  "valorem",
  "lorenz",
  "gini",
  "oligopoly",
  "monopsony",
  "externalities",
  "externality",
  "microeconomics",
  "macroeconomics",
  "diseconomies",
  "inelastic",
  "elasticity",
  "hyperinflation",
  "stagflation",
  "devaluation",
  "revaluation",
  "depreciation",
  "appreciation",
  "nationalisation",
  "privatisation",
  "deregulation",
  "subsidies",
  "subsidisation",
  "tariff",
  "tariffs",
  "quotas",
  "embargo",
  "allocative",
  "equimarginal",
  "non-rival",
  "non-rivalrous",
  "non-excludable",
  "asymmetric",
  "underprovided",
  "overprovided",
  "underconsumed",
  "overconsumed",
  "underproduced",
  "overproduced",
  "underprovision",
  "overprovision",
  "underconsumption",
  "overconsumption",
  "underallocation",
  "overallocation",
  "demerit",
  "demerits",
  "merit",
  "merits",
  "deadweight",
  "unpriced",
  "unrivalled",
  "unrivaled",
  "rivalrous",
  "excludable",
  "regressive",
  "progressive",
  "proportional",
  "behaviour",
  "behavioural",
  "behaviourist",
  "favour",
  "labour",
  "labourer",
  "labourers",
  "programme",
  "programmes",
  "practise",
  "maximisation",
  "maximising",
  "maximised",
  "minimisation",
  "minimising",
  "minimised",
  "monopolist",
  "monopolists",
  "monopolistic",
  "subsidise",
  "subsidised",
  "subsidising",
  "subsidize",
  "subsidized",
  "subsidizing",
  "privatise",
  "privatised",
  "privatising",
  "privatize",
  "privatized",
  "privatizing",
  "nationalise",
  "nationalised",
  "nationalising",
  "nationalize",
  "nationalized",
  "nationalizing",
  "diseconomy",
  "elasticities",
  "inelasticities",
  "advalorem",
  "inelasticity",
  "equilibrium",
  "disequilibrium",
  "disincentive",
  "disincentives",
  "monopsonist",
  "monopsonistic",
  "external",
  "spillover",
  "spillovers",
];

for (const t of EXTRA_TERMS) {
  CUSTOM_WHITELIST.add(t.toLowerCase());
}

export function getSpellChecker(): ReturnType<typeof nspell> {
  if (!spellChecker) {
    spellChecker = nspell(aff, dic);
    // Add custom terms to nspell
    for (const word of CUSTOM_WHITELIST) {
      if (typeof word === "string" && !word.includes(" ")) {
        spellChecker.add(word);
      }
    }
  }
  return spellChecker;
}

/** Words that are legitimately repeated occasionally in English / Economics */
const LEGITIMATE_REPEATS = new Set(["that", "had"]);

/**
 * Runs Layer A local synchronous checks on a single segment.
 * Returns IssueV2[] with exact document offsets [from, to].
 * STRICT RULE: Only evaluate completed sentences. Never interrupt in-progress typing mid-sentence.
 */
export function runLocalChecksOnSegment(segment: {
  id: string;
  from: number;
  to: number;
  text: string;
  isComplete?: boolean;
}): IssueV2[] {
  // Only evaluate completed sentences — let the person write without mid-sentence flags
  if (segment.isComplete === false) {
    return [];
  }

  const issues: IssueV2[] = [];
  const text = segment.text;

  // Ignore diagram placeholders [DIAGRAM: ...] and illegible marks [?]
  if (/^\[DIAGRAM:[^\]]*\]$/i.test(text.trim()) || text.trim() === "[?]") {
    return [];
  }

  const speller = getSpellChecker();

  // 1. Spellcheck words (tokens matching [a-zA-Z]+(-[a-zA-Z]+)?)
  const wordRegex = /\b[A-Za-z]+(?:-[A-Za-z]+)?\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const lower = word.toLowerCase();

    // Skip short words or technical/glossary terms
    if (word.length <= 2) continue;
    if (CUSTOM_WHITELIST.has(lower)) continue;

    // Skip if all caps (likely acronym like OPEC, WTO, LRAS)
    if (word === word.toUpperCase() && word.length > 1) continue;

    // Never flag half-words currently being typed
    const isAtEnd = match.index + word.length >= text.length;
    const isTrailingIncomplete =
      segment.isComplete === false &&
      match.index + word.length >= text.trimEnd().length &&
      !/[.!?]['"’”\)\]]*$/.test(text);

    if (isAtEnd || isTrailingIncomplete) {
      continue;
    }

    // If hyphenated (e.g. non-price, short-run, profit-maximizing), verify parts
    let isCorrect = speller.correct(word);
    if (!isCorrect && word.includes("-")) {
      const parts = word.split("-");
      const allPartsValid = parts.every(
        (part) =>
          part.length <= 2 ||
          CUSTOM_WHITELIST.has(part.toLowerCase()) ||
          speller.correct(part) ||
          part.toLowerCase() === "non" ||
          part.toLowerCase() === "multi" ||
          part.toLowerCase() === "sub",
      );
      if (allPartsValid) {
        isCorrect = true;
      }
    }

    if (!isCorrect) {
      const suggestions = speller.suggest(word);
      const topSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : undefined;

      // Discard invalid or blank suggestions where suggestion matches original
      if (!topSuggestion || topSuggestion.toLowerCase().trim() === word.toLowerCase().trim()) {
        continue;
      }

      const from = segment.from + match.index;
      const to = from + word.length;

      issues.push({
        id: `spell_${segment.id}_${match.index}`,
        from,
        to,
        sentenceId: segment.id,
        category: "spelling",
        severity: "medium",
        original: word,
        suggestion: topSuggestion,
        explanation: `Possible spelling error. Did you mean "${topSuggestion}"?`,
        status: "active",
      });
    }
  }

  // 2. High-precision rule: Repeated consecutive words ("the the", "is is")
  const repeatRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  while ((match = repeatRegex.exec(text)) !== null) {
    const word = match[1]!;
    if (LEGITIMATE_REPEATS.has(word.toLowerCase())) continue;

    const from = segment.from + match.index;
    const to = from + match[0].length;

    issues.push({
      id: `repeat_${segment.id}_${match.index}`,
      from,
      to,
      sentenceId: segment.id,
      category: "grammar",
      severity: "low",
      original: match[0],
      suggestion: word,
      explanation: `Repeated word: "${word}" appears consecutively.`,
      status: "active",
    });
  }

  // 3. High-precision rule: "alot" -> "a lot"
  const alotRegex = /\balot\b/gi;
  while ((match = alotRegex.exec(text)) !== null) {
    const from = segment.from + match.index;
    const to = from + match[0].length;
    issues.push({
      id: `alot_${segment.id}_${match.index}`,
      from,
      to,
      sentenceId: segment.id,
      category: "spelling",
      severity: "low",
      original: match[0],
      suggestion: match[0][0] === "A" ? "A lot" : "a lot",
      explanation: '"a lot" is always two words.',
      status: "active",
    });
  }

  // 4. Missing capital at sentence start (only if starts with letter)
  const trimmed = text.trimStart();
  const leadingSpaces = text.length - trimmed.length;
  if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
    const firstChar = trimmed[0]!;
    const from = segment.from + leadingSpaces;
    const to = from + 1;
    // Don't flag e.g. or i.e., and don't flag during the very first word while typing
    const hasMultipleWordsOrComplete = segment.isComplete !== false || trimmed.includes(" ");
    if (hasMultipleWordsOrComplete && !trimmed.startsWith("e.g.") && !trimmed.startsWith("i.e.")) {
      issues.push({
        id: `cap_${segment.id}_0`,
        from,
        to,
        sentenceId: segment.id,
        category: "punctuation",
        severity: "low",
        original: firstChar,
        suggestion: firstChar.toUpperCase(),
        explanation: "Sentences must start with a capital letter.",
        status: "active",
      });
    }
  }

  // 5. Unmatched brackets or parentheses inside sentence (only flag when sentence is complete)
  if (segment.isComplete !== false) {
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push({
        id: `unmatched_paren_${segment.id}`,
        from: segment.from,
        to: segment.to,
        sentenceId: segment.id,
        category: "punctuation",
        severity: "low",
        original: text,
        explanation: "Unmatched parentheses found in this sentence.",
        status: "active",
      });
    }
  }

  return issues;
}

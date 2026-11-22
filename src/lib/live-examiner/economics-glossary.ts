/**
 * Zero-cost, zero-latency terminology pass. Runs before any AI call and
 * catches the handful of Cambridge IGCSE 0455 terms students misspell most often
 * — these are unambiguous (a fixed string either appears or it doesn't), so
 * there is no reason to spend a model call confirming them. Anything not in
 * this list is left for the AI pass; this is a deterministic pre-filter,
 * not a replacement for it.
 */

type GlossaryEntry = { wrong: string; correct: string };

// Matched case-insensitively, whole-word. Keep this list to genuinely
// unambiguous misspellings only — a false "correction" here has no AI
// judgement behind it to catch it.
const GLOSSARY: GlossaryEntry[] = [
  { wrong: "elasticy", correct: "elasticity" },
  { wrong: "elasitcity", correct: "elasticity" },
  { wrong: "inelasitc", correct: "inelastic" },
  { wrong: "oligopolly", correct: "oligopoly" },
  { wrong: "oligopolistic competition", correct: "oligopoly" },
  { wrong: "monoploy", correct: "monopoly" },
  { wrong: "externalitie", correct: "externality" },
  { wrong: "extenality", correct: "externality" },
  { wrong: "opportunity cost's", correct: "opportunity cost" },
  { wrong: "marginal utillity", correct: "marginal utility" },
  { wrong: "comparitive advantage", correct: "comparative advantage" },
  { wrong: "comparative advantadge", correct: "comparative advantage" },
  { wrong: "absoloute advantage", correct: "absolute advantage" },
  { wrong: "tarrif", correct: "tariff" },
  { wrong: "subsidys", correct: "subsidies" },
  { wrong: "deflationery", correct: "deflationary" },
  { wrong: "inflationery", correct: "inflationary" },
  { wrong: "flucuate", correct: "fluctuate" },
  { wrong: "flucuation", correct: "fluctuation" },
  { wrong: "equilibrum", correct: "equilibrium" },
  { wrong: "equilbrium", correct: "equilibrium" },
  { wrong: "diseconomys of scale", correct: "diseconomies of scale" },
  { wrong: "economys of scale", correct: "economies of scale" },
  { wrong: "gini coeffecient", correct: "Gini coefficient" },
  { wrong: "gini co-efficient", correct: "Gini coefficient" },
  { wrong: "monetory policy", correct: "monetary policy" },
  { wrong: "fical policy", correct: "fiscal policy" },
  { wrong: "reccession", correct: "recession" },
  { wrong: "unemploymant", correct: "unemployment" },
  { wrong: "productiv efficiency", correct: "productive efficiency" },
  { wrong: "allocative effeciency", correct: "allocative efficiency" },
  { wrong: "merit good's", correct: "merit goods" },
  { wrong: "demerit good's", correct: "demerit goods" },
  { wrong: "public good's", correct: "public goods" },
  { wrong: "marginal social benifit", correct: "marginal social benefit" },
  { wrong: "marginal social benifits", correct: "marginal social benefits" },
  { wrong: "marginal private benifit", correct: "marginal private benefit" },
];

export type DeterministicIssue = {
  original: string;
  suggestion: string;
  category: "terminology";
  severity: "medium";
  explanation: string;
  context: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scans plain sentences (no AI call) for known misspellings. Case is
 * preserved on the matched original text so the suggestion card shows
 * exactly what the student wrote.
 */
export function deterministicTerminologyIssues(sentences: string[]): DeterministicIssue[] {
  const found: DeterministicIssue[] = [];

  for (const sentence of sentences) {
    for (const entry of GLOSSARY) {
      const pattern = new RegExp(`\\b${escapeRegExp(entry.wrong)}\\b`, "i");
      const match = pattern.exec(sentence);
      if (!match) continue;
      found.push({
        original: match[0],
        suggestion: entry.correct,
        category: "terminology",
        severity: "medium",
        explanation: `"${entry.correct}" is the standard Cambridge IGCSE 0455 spelling for this term.`,
        context: sentence,
      });
      // One deterministic hit per sentence is enough — avoid stacking
      // multiple glossary matches on top of each other in a short sentence.
      break;
    }
  }

  return found;
}

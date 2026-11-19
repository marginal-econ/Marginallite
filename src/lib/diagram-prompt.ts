/**
 * Utilities to detect diagram requirements in Cambridge IGCSE 0455 exam questions
 * and candidate scripts.
 */

export interface DiagramRequirement {
  /** True if the question explicitly demands or instructs diagrammatic analysis */
  isExplicitlyRequested: boolean;
  /** True if the student script mentions diagrams, figures, or curves without attaching them */
  isMentionedInScript: boolean;
  /** The specific phrase detected in the prompt (e.g. "with the help of diagram(s)") */
  matchedPhrase?: string;
}

const EXPLICIT_DIAGRAM_PATTERNS: Array<{ pattern: RegExp; phrase: string }> = [
  {
    pattern: /\b(?:draw|drawing) (?:a |an )?(?:demand and supply |production possibility curve |ppc |relevant |appropriate )?diagram\b/i,
    phrase: "draw a diagram",
  },
  {
    pattern: /\b(?:with (?:the )?(?:help|aid) of (?:a )?diagrams?)\b/i,
    phrase: "with the help of diagram(s)",
  },
  {
    pattern: /\b(?:use|using|include|including) (?:a |an |appropriate |relevant )?diagrams?\b/i,
    phrase: "use / include diagram(s)",
  },
  {
    pattern: /\b(?:illustrated? (?:by|with) (?:a )?diagrams?)\b/i,
    phrase: "illustrated with diagram(s)",
  },
  {
    pattern: /\bdiagrammatic(?:ally)?\b/i,
    phrase: "diagrammatic analysis",
  },
  {
    pattern: /\b(?:with (?:a |an )?(?:appropriate |relevant )?diagrams?)\b/i,
    phrase: "with diagram(s)",
  },
  {
    pattern: /\b(?:diagrams? (?:is|are) required)\b/i,
    phrase: "diagrams are required",
  },
  {
    pattern: /\b(?:support(?:ed)? (?:your answer )?with (?:a )?diagrams?)\b/i,
    phrase: "support with diagram(s)",
  },
];

const SCRIPT_FIGURE_PATTERNS = [
  /\bfig(?:ure)?\.?\s*[a-z0-9]/i,
  /\bdiagram\s*[a-z0-9]/i,
  /\bas (?:seen|shown|illustrated|demonstrated) in (?:the )?(?:diagram|figure|graph|chart)/i,
  /\bin (?:the )?(?:diagram|figure|graph|chart) (?:above|below|to the right|to the left)/i,
  /\bsee (?:figure|fig|diagram|graph)/i,
];

export function detectDiagramRequirement(
  question: string = "",
  essayText: string = "",
): DiagramRequirement {
  const q = question.trim();
  const text = essayText.trim();

  let isExplicitlyRequested = false;
  let matchedPhrase: string | undefined;

  for (const { pattern, phrase } of EXPLICIT_DIAGRAM_PATTERNS) {
    if (pattern.test(q)) {
      isExplicitlyRequested = true;
      matchedPhrase = phrase;
      break;
    }
  }

  // Also check if question mentions "diagram" anywhere as a standalone word
  if (!isExplicitlyRequested && /\bdiagrams?\b/i.test(q)) {
    isExplicitlyRequested = true;
    matchedPhrase = "diagram";
  }

  const isMentionedInScript = SCRIPT_FIGURE_PATTERNS.some((pattern) => pattern.test(text));

  return {
    isExplicitlyRequested,
    isMentionedInScript,
    matchedPhrase,
  };
}

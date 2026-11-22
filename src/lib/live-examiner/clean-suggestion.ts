/**
 * Aggressively removes all markdown formatting, bold/italic asterisks (* and **),
 * backticks, and audit tags from feedback strings.
 */
export function stripStars(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/<audit>[\s\S]*?<\/audit>/gi, "")
    .replace(/<audit>[\s\S]*$/gi, "")
    .replace(/\*+/g, "")
    .replace(/[`_]/g, "")
    .trim();
}

/**
 * Sanitizes an examiner or grammar suggestion so it can be substituted
 * directly into the student's text without awkward prefixes, quotes, or meta-language.
 * Fully adapted for Gemini, Mistral, and other models that output bold asterisks,
 * bullet points, and command lead-ins.
 *
 * CRITICAL SAFETY: Never strips real English or economics words starting with "ex",
 * "use", "try", "like" (e.g. "Examples", "Externalities", "Expansionary", "Excess",
 * "Useful", "Likely", "Exchange", "Exports").
 */
export function cleanSuggestion(raw: string | undefined | null): string {
  if (!raw) return "";
  let text = String(raw).trim();

  // Strip all asterisks (* and **) from suggestions upfront
  text = text.replace(/\*+/g, "").trim();

  // Strip leading bullet point symbols (e.g. "- ", "• ", "* ")
  text = text.replace(/^[-•*]\s*/, "");

  // Strip common conversational / exemplar lead-ins:
  // e.g., "e.g. higher costs", "eg: higher costs", "for example, higher costs"
  // Note: 'ex.' and 'ex:' require punctuation to avoid mutilating words like 'Examples' or 'Externalities'
  text = text.replace(/^(?:e\.g\.|e\.g\b|eg:|eg\b|i\.e\.|i\.e\b|ie:|ie\b|for example\b|ex\.(?!\w)|ex:\s*)\s*[:,-]?\s*/i, "");
  text = text.replace(/^like\s*[:,-]\s*/i, "");

  // Strip action/command lead-ins with word boundary:
  // e.g., "Use: higher costs", "Change to: higher costs", "Consider: higher costs", "Replace with: higher costs"
  text = text.replace(/^(?:use|change to|replace with|consider using|consider|try|write|rewrite|recommend)\b\s*[:,-]?\s*/i, "");
  text = text.replace(/^(?:suggestion|revision|fix|correction|edit)\b\s*[:,-]?\s*/i, "");

  // Strip leading and trailing quotes if wrapped: e.g. "higher costs" -> higher costs
  text = text.replace(/^["'“‘`]+(.*?)["'”’`]+$/s, "$1").trim();

  // Strip trailing "instead" or "as well" at word boundaries
  text = text.replace(/\b(?:instead|as well)\.?$/i, "").trim();

  // Re-run lead-in check in case of nested e.g. "e.g. 'higher costs'"
  text = text.replace(/^(?:e\.g\.|e\.g\b|eg:|eg\b|for example\b|ex\.(?!\w)|ex:\s*)\s*[:,-]?\s*/i, "");
  text = text.replace(/^(?:suggestion|correction|revision)\b\s*[:,-]?\s*/i, "");
  text = text.replace(/^["'“‘`]+(.*?)["'”’`]+$/s, "$1").trim();

  // Final cleanup of asterisks and underscores
  text = text.replace(/[*_]+/g, "").trim();

  return text;
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "a": "ₐ",
  "e": "ₑ",
  "h": "ₕ",
  "i": "ᵢ",
  "j": "ⱼ",
  "k": "ₖ",
  "l": "ₗ",
  "m": "ₘ",
  "n": "ₙ",
  "o": "ₒ",
  "p": "ₚ",
  "r": "ᵣ",
  "s": "ₛ",
  "t": "ₜ",
  "u": "ᵤ",
  "v": "ᵥ",
  "x": "ₓ",
};

function toSubscript(str: string): string {
  let res = "";
  for (const ch of str) {
    const lower = ch.toLowerCase();
    if (SUBSCRIPT_MAP[ch]) {
      res += SUBSCRIPT_MAP[ch];
    } else if (SUBSCRIPT_MAP[lower]) {
      res += SUBSCRIPT_MAP[lower];
    } else {
      res += ch;
    }
  }
  return res;
}

/**
 * Replaces raw LaTeX notation, dollar-sign math wrappers, and raw underscore subscripts
 * (e.g. ($P_x$), $P_m$, $Q_1$, $AD_1$, $MSB = MSC$) with clean, publication-grade
 * Unicode economics notation (e.g. (Pₓ), Pₘ, Q₁, AD₁, MSB = MSC), while safely preserving
 * standard currency expressions (e.g. $100, $50 billion, $10 to $20).
 */
export function formatEconomicsMathText(text: unknown): string {
  if (typeof text !== "string" || !text) return "";
  let s = text;

  // 1. Common LaTeX commands
  s = s.replace(/\\text\{([^}]+)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^}]+)\}/g, "$1");
  s = s.replace(/\\mathit\{([^}]+)\}/g, "$1");
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)");
  s = s.replace(/\\(?:Delta|delta)\b/g, "Δ");
  s = s.replace(/\\times\b/g, "×");
  s = s.replace(/\\cdot\b/g, "·");
  s = s.replace(/\\div\b/g, "÷");
  s = s.replace(/\\(?:leq|le)\b/g, "≤");
  s = s.replace(/\\(?:geq|ge)\b/g, "≥");
  s = s.replace(/\\(?:neq|ne)\b/g, "≠");
  s = s.replace(/\\approx\b/g, "≈");
  s = s.replace(/\\(?:rightarrow|to)\b/g, "→");
  s = s.replace(/\\leftarrow\b/g, "←");
  s = s.replace(/\\%/g, "%");

  // 2. Subscripts inside dollar signs or parentheses or standalone:
  // e.g. ($P_x$) -> (Pₓ), $P_{x}$ -> Pₓ, $Q_1$ -> Q₁, $AD_1$ -> AD₁
  s = s.replace(/\(\$([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?\$\)/g, (_, v, sub) => `(${v}${toSubscript(sub)})`);
  s = s.replace(/\$([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?\$/g, (_, v, sub) => `${v}${toSubscript(sub)}`);

  // 3. Subscripts outside dollar signs on economic variables:
  // e.g. P_x, P_m, Q_1, Q_2, AD_1, AS_1, SRAS_1, LRAS_1, MSB_1, Y_1, etc.
  s = s.replace(/\b([A-Za-z]{1,4})_\{?([A-Za-z0-9]+)\}?\b/g, (_, v, sub) => `${v}${toSubscript(sub)}`);

  // 4. Unwrap math expressions inside $...$
  // Math expressions start with a letter, Greek/operator symbol, or parenthesis (never digits like currency $100)
  s = s.replace(/\$([A-Za-zΔ×·÷≤≥≠≈→←\\(][^$\n]{0,100}?)\$/g, (match, inner) => {
    // If it looks like currency (e.g. "$10 to $20"), don't match
    if (/\$\d/.test(inner)) return match;
    // Format inner subscripts if any remain
    const formatted = inner.replace(/\b([A-Za-z]{1,4})_\{?([A-Za-z0-9]+)\}?\b/g, (_, v, sub) => `${v}${toSubscript(sub)}`);
    return formatted.trim();
  });

  // 5. Clean up any remaining stray math dollar signs wrapping single tokens or parenthesized tokens
  // e.g. $(P_x)$ -> (Pₓ), $(AD)$ -> (AD), $(X-M)$ -> (X-M), ($P$) -> (P)
  s = s.replace(/\$\(([^)]+)\)\$/g, "($1)");
  s = s.replace(/\(\$([^$]+)\$\)/g, "($1)");

  return s;
}

/**
 * Strips all asterisks (* and **) from feedback and diagnostic text and cleans
 * raw math / LaTeX notation into properly formatted economic variables.
 * Ensures zero asterisks and no ugly raw ($P_x$) notation appear anywhere
 * across student feedback, rubrics, examiner summaries, and review panels.
 */
export function stripStars(text: unknown): string {
  if (typeof text !== "string") return "";
  let cleaned = text
    .replace(/<audit>[\s\S]*?<\/audit>/gi, "")
    .replace(/<audit>[\s\S]*$/gi, "")
    .replace(/\*+/g, "");

  // Format economics math symbols and subscripts before stripping markdown underscores
  cleaned = formatEconomicsMathText(cleaned);

  cleaned = cleaned
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();

  return cleaned;
}

/**
 * Recursively removes all asterisks (* and **) from any feedback string, array, or object.
 */
export function cleanStars<T>(value: T): T {
  if (typeof value === "string") {
    return stripStars(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => cleanStars(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      res[k] = cleanStars(v);
    }
    return res as T;
  }
  return value;
}

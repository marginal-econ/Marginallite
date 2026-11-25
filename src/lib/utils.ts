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

  // 1. Display math blocks $$...$$
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => inner.trim());

  // 2. Common LaTeX commands
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

  // 3. Subscripts inside dollar signs or parentheses or standalone:
  // e.g. ($P_x$) -> (Pₓ), $P_{x}$ -> Pₓ, $Q_1$ -> Q₁, $AD_1$ -> AD₁
  s = s.replace(/\(\$([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?\$\)/g, (_, v, sub) => `(${v}${toSubscript(sub)})`);
  s = s.replace(/\$([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?\$/g, (_, v, sub) => `${v}${toSubscript(sub)}`);

  // 4. Subscripts outside dollar signs on economic variables:
  // e.g. P_x, P_m, Q_1, Q_2, AD_1, AS_1, SRAS_1, LRAS_1, MSB_1, Y_1, etc.
  s = s.replace(/\b([A-Za-z]{1,4})_\{?([A-Za-z0-9]+)\}?\b/g, (_, v, sub) => `${v}${toSubscript(sub)}`);

  // 5. Unwrap math expressions inside $...$
  // Math expressions start with a letter, Greek/operator symbol, parenthesis, or bracket (never digits like currency $100)
  s = s.replace(/\$([A-Za-zΔ×·÷≤≥≠≈→←\\(\[][^$\n]{0,120}?)\$/g, (match, inner) => {
    // If it looks like currency (e.g. "$10 to $20"), don't match
    if (/\$\d/.test(inner)) return match;
    // Format inner subscripts if any remain
    const formatted = inner.replace(/\b([A-Za-z]{1,4})_\{?([A-Za-z0-9]+)\}?\b/g, (_: string, v: string, sub: string) => `${v}${toSubscript(sub)}`);
    return formatted.trim();
  });

  // 6. Clean up any remaining stray math dollar signs wrapping single tokens or parenthesized tokens
  // e.g. $(P_x)$ -> (Pₓ), $(AD)$ -> (AD), $(X-M)$ -> (X-M), ($P$) -> (P)
  s = s.replace(/\$\(([^)]+)\)\$/g, "($1)");
  s = s.replace(/\(\$([^$]+)\$\)/g, "($1)");
  s = s.replace(/\$\[([^\]]+)\]\$/g, "[$1]");
  s = s.replace(/\$([A-Za-z])/g, "$1");
  s = s.replace(/([A-Za-z])\$/g, "$1");

  return s;
}

/**
 * Clean plain-text sanitizer for candidate scripts.
 * Strips raw LaTeX math wrappers ($P_x$, $$formula$$, ($AD$)) into clean, authentic
 * Cambridge student notation without raw dollar delimiters.
 */
export function cleanMathDollarSigns(text: unknown): string {
  if (typeof text !== "string" || !text) return "";
  let s = text;
  // 1. Remove display math $$...$$
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => inner.trim());
  // 2. Format parenthesized variables with dollar signs: ($P_x$) -> (Px), ($P_m$) -> (Pm)
  s = s.replace(/\(\$([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?\$\)/g, "($1$2)");
  s = s.replace(/\$([A-Za-z]+)_\{?([A-Za-z0-9]+)\}?\$/g, "$1$2");
  // 3. Format standalone expressions like ($AD$), ($SRAS$), ($X - M$), ($PED_x + PED_m < 1$)
  s = s.replace(/\(\$([^$]+)\$\)/g, (match, inner) => {
    const cleaned = inner.replace(/_([A-Za-z0-9]+)/g, "$1");
    return `(${cleaned.trim()})`;
  });
  // 4. Unwrap math expressions in $...$
  s = s.replace(/\$([A-Za-zΔ][^$\n]*?)\$/g, (match, inner) => {
    if (/^\d/.test(inner.trim())) return match;
    const cleaned = inner.replace(/_([A-Za-z0-9]+)/g, "$1");
    return cleaned.trim();
  });
  // 5. Clean any residual dollar signs touching letters
  s = s.replace(/\$([A-Za-z])/g, "$1").replace(/([A-Za-z])\$/g, "$1");
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

/**
 * Automatically ensures authentic Cambridge paragraphing across student essays.
 * If an essay is a single monolithic block of text (>= 60 words, 0 or 1 paragraphs),
 * it intelligently detects logical transitions (discourse markers, counter-arguments,
 * evaluation, conclusion) and full sentence breaks to structure into clean paragraphs.
 */
export function autoParagraphText(text: unknown): string {
  if (typeof text !== "string" || !text.trim()) return "";
  const raw = text.trim();

  // If already properly paragraphed with multiple substantial paragraphs, leave intact
  const existingParagraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^\s*\((?:Diagram:\s*)?[^)]+\)\s*$/i.test(p));

  const words = raw.split(/\s+/).length;

  // Only auto-paragraph if the essay is a monolithic block (words >= 60 with <= 1 paragraph)
  if (words < 60 || existingParagraphs.length >= 2) {
    return raw;
  }

  // 1. First attempt: Split at major Cambridge discourse & transition markers that follow sentence endings (.!?)
  // Avoid splitting on mid-paragraph causal connectors ("Consequently", "Therefore") which create 1-sentence fragments.
  // Avoid RegExp lookbehinds for broad browser compatibility (older Safari/WebKit & iPads).
  const transitionPattern = /([.!?])\s+(?=(?:However|In contrast|Conversely|On the other hand|Furthermore|Moreover|In addition|Additionally|Alternatively|Secondly|Thirdly|Finally|In evaluation|To evaluate|In conclusion|Overall|Ultimately|From an evaluative standpoint|Examining this policy|With regard to|With regards to|Turning to|A government can|Monetary policy|Fiscal policy|Supply-side policy)\b)/gi;

  const splitByTransitions = raw
    .replace(transitionPattern, "$1\n\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (splitByTransitions.length >= 2) {
    // Prevent overly fragmented 1-sentence stub paragraphs (< 18 words) unless it's a conclusion/evaluation opener
    const merged: string[] = [];
    for (const para of splitByTransitions) {
      const wordCount = para.split(/\s+/).length;
      const isStructuralOpener = /^(?:in conclusion|in evaluation|to evaluate|overall|ultimately|however)\b/i.test(para);
      if (merged.length > 0 && wordCount < 18 && !isStructuralOpener) {
        merged[merged.length - 1] = `${merged[merged.length - 1]} ${para}`;
      } else {
        merged.push(para);
      }
    }
    if (merged.length >= 2) {
      return merged.join("\n\n");
    }
  }

  // 2. Second attempt: If no explicit transition words exist, split at natural sentence boundaries
  // every 3-4 sentences (or roughly 80-110 words) to avoid a monolithic wall of text.
  const sentences = raw.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!sentences || sentences.length <= 3) {
    return raw;
  }

  const paragraphs: string[] = [];
  let currentPara: string[] = [];
  let currentWords = 0;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim();
    if (!s) continue;
    const sWords = s.split(/\s+/).length;
    currentPara.push(s);
    currentWords += sWords;

    const remainingSentences = sentences.length - (i + 1);
    if ((currentWords >= 80 || currentPara.length >= 4) && remainingSentences >= 2) {
      paragraphs.push(currentPara.join(" "));
      currentPara = [];
      currentWords = 0;
    }
  }

  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(" "));
  }

  return paragraphs.length >= 2 ? paragraphs.join("\n\n") : raw;
}

/**
 * Universal cross-browser clipboard copy with fallback.
 * Reliable on Safari (iOS / iPadOS / macOS), Firefox, Chrome, Edge, and webviews.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback to execCommand below */
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Universal UUID generator with fallback for Safari iOS, macOS Monterey/Big Sur,
 * and insecure/local IP network contexts.
 */
export function safeRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

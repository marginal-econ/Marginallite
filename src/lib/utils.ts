import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips all asterisks (* and **), raw LaTeX math notation ($P_x$, $\Delta$),
 * and internal audit markers from feedback and diagnostic text.
 * Ensures clean, human-readable Cambridge IGCSE English prose appears everywhere
 * across student feedback, rubrics, examiner summaries, MCQ explanations, and review panels.
 */
export function stripStars(text: unknown): string {
  if (typeof text !== "string") return "";
  let out = text
    .replace(/<audit>[\s\S]*?<\/audit>/gi, "")
    .replace(/<audit>[\s\S]*$/gi, "")
    .replace(/\*+/g, "")
    .replace(/__([^_]+)__/g, "$1")
    // Clean LaTeX display / bracketed math
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\(?:mathrm|mathbf|mathit)\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 / $2")
    .replace(/\\(?:Delta|delta)/g, "Δ")
    .replace(/\\(?:times)/g, "×")
    .replace(/\\(?:rightarrow|to)/g, "→")
    .replace(/\\(?:leftarrow)/g, "←")
    .replace(/\\(?:le|leq)/g, "≤")
    .replace(/\\(?:ge|geq)/g, "≥")
    .replace(/\\(?:approx)/g, "≈")
    .replace(/\\(?:pm)/g, "±");

  // Clean LaTeX display math $$...$$
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, "$1");

  // Clean LaTeX inline math $...$ when wrapping variables or formulas (e.g. $P_x$, $AD$),
  // while strictly preserving real currency amounts (e.g. $50, $10.5m, $200 billion).
  out = out.replace(/\$([^\n$]+?)\$/g, (match, inner) => {
    // If it looks like currency ($50, $100.25, $5 billion), preserve it
    if (/^\s*\d+([,.]\d+)?\s*(billion|million|trillion|m|bn|k)?\s*$/i.test(inner)) {
      return match;
    }
    // Otherwise unwrap the math delimiters and clean subscript variables
    return inner.replace(/([A-Za-z])_([A-Za-z0-9]+)/g, "$1$2");
  });

  // Clean any economics subscript notation: P_x -> Px, P_m -> Pm, Q_1 -> Q1, P_1 -> P1
  out = out.replace(/\b([A-Za-z])_([A-Za-z0-9]+)\b/g, "$1$2");

  // Clean any remaining markdown italics underscores _word_
  out = out.replace(/_([^_]+)_/g, "$1");

  return out.trim();
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

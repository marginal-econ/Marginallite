import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips all asterisks (* and **) from feedback and diagnostic text.
 * Ensures zero asterisks appear anywhere across student feedback, rubrics,
 * examiner summaries, MCQ explanations, and review panels.
 */
export function stripStars(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<audit>[\s\S]*?<\/audit>/gi, "")
    .replace(/<audit>[\s\S]*$/gi, "")
    .replace(/\*+/g, "")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .trim();
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

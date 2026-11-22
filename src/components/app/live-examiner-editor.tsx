import { Check, Sparkles, Wand2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ActiveAoClassification,
  ActiveIssue,
  IssueCategory,
  PredictedMark,
} from "@/hooks/use-live-examiner-check";
import { cleanSuggestion } from "@/lib/live-examiner/clean-suggestion";
import { classifySentenceDeterministically } from "@/lib/live-examiner/client-evaluation";
import { splitSentences } from "@/lib/writing-check/sentence-diff";
import { AO_DEFINITIONS } from "@/lib/examiner/config";
import { cn } from "@/lib/utils";

const CATEGORY_AO: Partial<Record<IssueCategory, string | null>> = {
  grammar: null,
  spelling: null,
  punctuation: null,
  clarity: null,
  economics_accuracy: AO_DEFINITIONS.ao1.code,
  terminology: AO_DEFINITIONS.ao1.code,
  analysis: AO_DEFINITIONS.ao2.code,
  application: AO_DEFINITIONS.ao2.code,
  reasoning_chain: AO_DEFINITIONS.ao2.code,
  evaluation: AO_DEFINITIONS.ao3.code,
  misconception: AO_DEFINITIONS.ao1.code,
};

export type UnderlineStyleMeta = {
  label: string;
  dot: string;
  underlineColor: string;
  underlineStyle: "wavy" | "solid" | "dashed";
  underlineThickness: string;
  offset: string;
  backgroundColor: string;
};

const CATEGORY_META: Partial<Record<IssueCategory, UnderlineStyleMeta>> = {
  grammar: {
    label: "Grammar",
    dot: "bg-rose-500 dark:bg-rose-400",
    underlineColor: "rgba(251, 113, 133, 0.95)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(244, 63, 94, 0.16)",
  },
  clarity: {
    label: "Clarity",
    dot: "bg-purple-400",
    underlineColor: "rgba(192, 132, 252, 0.95)",
    underlineStyle: "dashed",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(192, 132, 252, 0.14)",
  },
  economics_accuracy: {
    label: "Economics accuracy",
    dot: "bg-rose-600 dark:bg-rose-400",
    underlineColor: "rgba(244, 63, 94, 0.98)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(225, 29, 72, 0.18)",
  },
  misconception: {
    label: "Economic misconception",
    dot: "bg-red-600 dark:bg-red-400",
    underlineColor: "rgba(239, 68, 68, 0.98)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(220, 38, 38, 0.18)",
  },
  analysis: {
    label: "Extend AO2 Analysis",
    dot: "bg-orange-400",
    underlineColor: "rgba(251, 146, 60, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
  },
  application: {
    label: "Extend AO2 Application",
    dot: "bg-orange-400",
    underlineColor: "rgba(251, 146, 60, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
  },
  evaluation: {
    label: "Extend AO3 Evaluation",
    dot: "bg-amber-400",
    underlineColor: "rgba(251, 191, 36, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 191, 36, 0.16)",
  },
  reasoning_chain: {
    label: "Chain of reasoning",
    dot: "bg-orange-400",
    underlineColor: "rgba(251, 146, 60, 0.96)",
    underlineStyle: "wavy",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(251, 146, 60, 0.16)",
  },
  terminology: {
    label: "Terminology",
    dot: "bg-purple-400",
    underlineColor: "rgba(192, 132, 252, 0.95)",
    underlineStyle: "dashed",
    underlineThickness: "2px",
    offset: "5px",
    backgroundColor: "rgba(192, 132, 252, 0.15)",
  },
};

const DIAGRAM_TAG = /\[DIAGRAM:[^\]]*\]/g;

export const AO_META: Record<"AO1" | "AO2" | "AO3", UnderlineStyleMeta> = {
  AO1: {
    label: "AO1 Knowledge",
    dot: "bg-sky-400",
    underlineColor: "rgba(56, 189, 248, 0.95)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "6px",
    backgroundColor: "rgba(56, 189, 248, 0.11)",
  },
  AO2: {
    label: "AO2 Analysis",
    dot: "bg-emerald-400",
    underlineColor: "rgba(16, 185, 129, 0.95)",
    underlineStyle: "solid",
    underlineThickness: "2px",
    offset: "6px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  AO3: {
    label: "AO3 Evaluation",
    dot: "bg-amber-400",
    underlineColor: "rgba(245, 158, 11, 0.95)",
    underlineStyle: "solid",
    underlineThickness: "2.25px",
    offset: "6px",
    backgroundColor: "rgba(245, 158, 11, 0.13)",
  },
};

export type Range =
  | { start: number; end: number; id: string; kind: "issue"; issue: ActiveIssue }
  | {
      start: number;
      end: number;
      id: string;
      kind: "classification";
      classification: ActiveAoClassification;
    };

const DEFAULT_ISSUE_META: UnderlineStyleMeta = {
  label: "Correction",
  dot: "bg-rose-500 dark:bg-rose-400",
  underlineColor: "rgba(244, 63, 94, 0.85)",
  underlineStyle: "dashed",
  underlineThickness: "1.5px",
  offset: "6px",
  backgroundColor: "rgba(244, 63, 94, 0.08)",
};

/** Locate every issue's `original` text and AO classification inside the essay.
 *  Issues take precedence over classifications for styling and suggestions,
 *  while allowing the surrounding sentence to retain its AO underline.
 *  Diagram and table tags ([DIAGRAM: ...]) are protected from underlines. */
export function computeRanges(
  text: string,
  issues: ActiveIssue[],
  classifications: ActiveAoClassification[],
): Range[] {
  if (!text) return [];

  const protectedSpans: Array<[number, number]> = [];
  for (const match of text.matchAll(DIAGRAM_TAG)) {
    protectedSpans.push([match.index!, match.index! + match[0].length]);
  }

  const overlapsProtected = (start: number, end: number) =>
    protectedSpans.some(([pStart, pEnd]) => start < pEnd && end > pStart);

  // 1. Locate issues (non-overlapping among each other, skipping diagrams)
  type LocatedIssue = { start: number; end: number; id: string; issue: ActiveIssue };
  const locatedIssues: LocatedIssue[] = [];

  for (const issue of issues) {
    if (!issue.original) continue;
    let foundStart = -1;

    // First try: locate within issue.context
    if (issue.context) {
      let searchContextFrom = 0;
      while (true) {
        const at = text.indexOf(issue.context, searchContextFrom);
        if (at === -1) break;
        let searchOriginalFrom = 0;
        while (true) {
          const localIndex = issue.context.indexOf(issue.original, searchOriginalFrom);
          if (localIndex === -1) break;
          const candidateStart = at + localIndex;
          const candidateEnd = candidateStart + issue.original.length;
          const collides =
            overlapsProtected(candidateStart, candidateEnd) ||
            locatedIssues.some((r) => candidateStart < r.end && candidateEnd > r.start);
          if (!collides) {
            foundStart = candidateStart;
            break;
          }
          searchOriginalFrom = localIndex + 1;
        }
        if (foundStart !== -1) break;
        searchContextFrom = at + 1;
      }
    }

    // Fallback: search issue.original directly in text
    if (foundStart === -1) {
      let searchOriginalFrom = 0;
      while (true) {
        const at = text.indexOf(issue.original, searchOriginalFrom);
        if (at === -1) break;
        const candidateStart = at;
        const candidateEnd = candidateStart + issue.original.length;
        const collides =
          overlapsProtected(candidateStart, candidateEnd) ||
          locatedIssues.some((r) => candidateStart < r.end && candidateEnd > r.start);
        if (!collides) {
          foundStart = candidateStart;
          break;
        }
        searchOriginalFrom = at + 1;
      }
    }

    if (foundStart !== -1) {
      locatedIssues.push({
        start: foundStart,
        end: foundStart + issue.original.length,
        id: issue.id,
        issue,
      });
    }
  }

  // 2. Locate sentences in document order and apply AO classifications + issues seamlessly
  const allSentences = splitSentences(text);

  const aoPriority: Record<"AO3" | "AO2" | "AO1", number> = {
    AO3: 3,
    AO2: 2,
    AO1: 1,
  };
  const sortedClassifications = [...classifications].sort(
    (a, b) => (aoPriority[b.ao] ?? 0) - (aoPriority[a.ao] ?? 0),
  );

  const rawRanges: Range[] = [];
  let cursor = 0;

  for (const sentence of allSentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 3 || /\[DIAGRAM:[^\]]*\]/i.test(trimmed)) continue;

    // Locate sentence in text in sequential document order
    let at = text.indexOf(trimmed, cursor);
    if (at === -1) {
      at = text.indexOf(trimmed);
    }
    if (at === -1) continue;

    let sStart = at;
    let sEnd = at + trimmed.length;
    cursor = sEnd;

    // Absorb terminal punctuation (e.g. '.', '!', '?') if followed by whitespace or end of string
    if (sEnd < text.length && /[.!?]/.test(text[sEnd])) {
      const nextChar = text[sEnd + 1];
      if (!nextChar || /\s/.test(nextChar) || /[)\]"']/.test(nextChar)) {
        sEnd++;
      }
    }
    if (sEnd < text.length && /[)\]"']/.test(text[sEnd])) {
      const afterQuote = text[sEnd + 1];
      if (!afterQuote || /\s/.test(afterQuote)) {
        sEnd++;
      }
    }

    // Clean whitespace
    while (sStart < sEnd && /\s/.test(text[sStart])) sStart++;
    while (sEnd > sStart && /\s/.test(text[sEnd - 1])) sEnd--;
    if (sStart >= sEnd || overlapsProtected(sStart, sEnd)) continue;

    // Determine the Assessment Objective for this complete sentence:
    // Match against server classifications (prioritizing AO3 > AO2 > AO1), or fallback to deterministic
    const matched = sortedClassifications.find((c) => {
      const cContext = (c.context || "").trim();
      const cOrig = (c.original || "").trim();
      if (
        cContext.length >= 8 &&
        (cContext === trimmed || cContext.includes(trimmed) || trimmed.includes(cContext))
      ) {
        return true;
      }
      if (
        cOrig.length >= 8 &&
        (cOrig === trimmed || cOrig.includes(trimmed) || trimmed.includes(cOrig))
      ) {
        return true;
      }
      return false;
    });

    const activeClassification: ActiveAoClassification = matched
      ? matched
      : (() => {
          const auto = classifySentenceDeterministically(trimmed);
          return {
            id: `auto-${auto.ao}-${sStart}`,
            original: trimmed,
            context: trimmed,
            ao: auto.ao,
            explanation: auto.explanation,
          };
        })();

    // Check for issues that lie strictly inside this sentence
    const sentenceIssues = locatedIssues
      .filter((iss) => iss.start >= sStart && iss.end <= sEnd)
      .sort((a, b) => a.start - b.start);

    if (sentenceIssues.length === 0) {
      rawRanges.push({
        start: sStart,
        end: sEnd,
        id: activeClassification.id,
        kind: "classification",
        classification: activeClassification,
      });
    } else {
      let currentPos = sStart;
      for (const issue of sentenceIssues) {
        if (issue.start > currentPos) {
          rawRanges.push({
            start: currentPos,
            end: issue.start,
            id: activeClassification.id,
            kind: "classification",
            classification: activeClassification,
          });
        }
        rawRanges.push({
          start: issue.start,
          end: issue.end,
          id: issue.id,
          kind: "issue",
          issue: issue.issue,
        });
        currentPos = issue.end;
      }
      if (currentPos < sEnd) {
        rawRanges.push({
          start: currentPos,
          end: sEnd,
          id: activeClassification.id,
          kind: "classification",
          classification: activeClassification,
        });
      }
    }
  }

  // 3. Strictly sanitize against newlines: NO <mark> tag ever wraps across \n or \r
  // This guarantees zero background highlight boxes on empty lines or paragraph breaks!
  const sanitizedRanges: Range[] = [];
  for (const range of rawRanges) {
    const slice = text.slice(range.start, range.end);
    if (!/[\r\n]/.test(slice)) {
      if (range.start < range.end) {
        sanitizedRanges.push({ ...range });
      }
      continue;
    }

    let segStart = range.start;
    for (let i = range.start; i < range.end; i++) {
      if (text[i] === "\n" || text[i] === "\r") {
        if (i > segStart) {
          sanitizedRanges.push({ ...range, start: segStart, end: i, id: `${range.id}-${segStart}` });
        }
        segStart = i + 1;
      }
    }
    if (range.end > segStart) {
      sanitizedRanges.push({ ...range, start: segStart, end: range.end, id: `${range.id}-${segStart}` });
    }
  }

  // 4. Merge adjacent slices of identical identity
  sanitizedRanges.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of sanitizedRanges) {
    const previous = merged.at(-1);
    if (previous && previous.end === range.start && previous.id === range.id) {
      previous.end = range.end;
      continue;
    }
    merged.push({ ...range });
  }

  return merged;
}

export const LIVE_EXAMINER_TYPOGRAPHY: React.CSSProperties = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: "15px",
  lineHeight: "28px",
  letterSpacing: "-0.01em",
  wordSpacing: "0px",
  boxSizing: "border-box",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
  tabSize: 2,
  textRendering: "geometricPrecision",
  fontVariantLigatures: "none",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

export { LiveExaminerEditor } from "./live-examiner/editor";

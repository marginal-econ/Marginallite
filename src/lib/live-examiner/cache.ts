import type { AoClassification, IssueV2 } from "./types";
import { issueDedupeKey } from "./anchoring";

export type CachedSentenceResult = {
  sentenceHash: string;
  ao: AoClassification | null;
  issues: IssueV2[];
  cachedAt: number;
};

export class LiveExaminerCache {
  private sentenceMap = new Map<string, CachedSentenceResult>();
  private dismissedKeys = new Set<string>();

  constructor(initialData?: {
    sentences?: Record<string, CachedSentenceResult>;
    dismissed?: string[];
  }) {
    if (initialData?.sentences) {
      for (const [hash, res] of Object.entries(initialData.sentences)) {
        this.sentenceMap.set(hash, res);
      }
    }
    if (initialData?.dismissed) {
      for (const key of initialData.dismissed) {
        this.dismissedKeys.add(key);
      }
    }
  }

  get(sentenceHash: string): CachedSentenceResult | undefined {
    return this.sentenceMap.get(sentenceHash);
  }

  set(sentenceHash: string, result: Omit<CachedSentenceResult, "cachedAt">): void {
    // Filter out dismissed issues before caching
    const filteredIssues = result.issues.filter(
      (iss) => !this.isDismissed(sentenceHash, iss.category, iss.original),
    );
    this.sentenceMap.set(sentenceHash, {
      ...result,
      issues: filteredIssues,
      cachedAt: Date.now(),
    });
  }

  has(sentenceHash: string): boolean {
    return this.sentenceMap.has(sentenceHash);
  }

  dismiss(sentenceHash: string, category: string, original: string): void {
    const normOrig = (original || "").trim().toLowerCase();
    const cat = (category || "").trim().toLowerCase();

    if (sentenceHash) {
      this.dismissedKeys.add(issueDedupeKey(sentenceHash, category, original));
    }
    // Global dismissal keys so edits to sentence text do not cause dismissed issues to resurrect
    this.dismissedKeys.add(`*::${cat}::${normOrig}`);
    this.dismissedKeys.add(`::${cat}::${normOrig}`);
    if (normOrig) {
      this.dismissedKeys.add(normOrig);
    }

    // Also remove from any cached sentence entries
    for (const entry of this.sentenceMap.values()) {
      entry.issues = entry.issues.filter(
        (iss) =>
          iss.original.trim().toLowerCase() !== normOrig ||
          iss.category.trim().toLowerCase() !== cat,
      );
    }
  }

  isDismissed(sentenceHash: string, category: string, original: string): boolean {
    const normOrig = (original || "").trim().toLowerCase();
    const cat = (category || "").trim().toLowerCase();

    return (
      (sentenceHash ? this.dismissedKeys.has(issueDedupeKey(sentenceHash, category, original)) : false) ||
      this.dismissedKeys.has(`*::${cat}::${normOrig}`) ||
      this.dismissedKeys.has(`::${cat}::${normOrig}`) ||
      (normOrig ? this.dismissedKeys.has(normOrig) : false)
    );
  }

  clear(): void {
    this.sentenceMap.clear();
    this.dismissedKeys.clear();
  }

  toJSON(): {
    sentences: Record<string, CachedSentenceResult>;
    dismissed: string[];
  } {
    const sentences: Record<string, CachedSentenceResult> = {};
    for (const [hash, res] of this.sentenceMap.entries()) {
      sentences[hash] = res;
    }
    return {
      sentences,
      dismissed: Array.from(this.dismissedKeys),
    };
  }
}

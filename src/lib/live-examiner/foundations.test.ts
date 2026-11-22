import { describe, expect, it } from "vitest";
import { segmentEssay, normalizeSentenceForHash, hashString } from "./segment";
import {
  mapPositionThroughChanges,
  rebaseAndVerifyAnchor,
  resolveOffsetsInSentence,
  issueDedupeKey,
} from "./anchoring";
import { computeHeuristicScore } from "./heuristic-score";
import { runLocalChecksOnSegment } from "./local-checks";
import { LiveExaminerScheduler } from "./scheduler";
import { LiveExaminerCache } from "./cache";
import { TARIFF_SPLITS } from "@/lib/examiner/config";

describe("Live Examiner v2 - Foundations", () => {
  describe("Economics-aware Segmentation", () => {
    it("handles complex economics abbreviations and numbers without splitting", () => {
      const text =
        "Price elasticity of demand (e.g. for oil) is PED = 0.4. The government spent $2.5m on subsidies, as shown in Fig. 1.2. Consequently, demand shifted.";
      const segments = segmentEssay(text);

      expect(segments.length).toBe(3);
      expect(segments[0]!.text).toBe("Price elasticity of demand (e.g. for oil) is PED = 0.4.");
      expect(segments[1]!.text).toBe(
        "The government spent $2.5m on subsidies, as shown in Fig. 1.2.",
      );
      expect(segments[2]!.text).toBe("Consequently, demand shifted.");

      // Check offsets match exactly
      expect(text.slice(segments[0]!.from, segments[0]!.to)).toBe(segments[0]!.text);
      expect(text.slice(segments[1]!.from, segments[1]!.to)).toBe(segments[1]!.text);
      expect(text.slice(segments[2]!.from, segments[2]!.to)).toBe(segments[2]!.text);
    });

    it("assigns stable unique IDs based on normalized hash and occurrence index", () => {
      const text = "Inflation rises. Inflation rises.";
      const segments = segmentEssay(text);
      expect(segments.length).toBe(2);
      expect(segments[0]!.hash).toBe(segments[1]!.hash);
      expect(segments[0]!.id).not.toBe(segments[1]!.id);
      expect(segments[0]!.id).toContain("_1");
      expect(segments[1]!.id).toContain("_2");
    });
  });

  describe("Anchoring, Rebase & Resolution", () => {
    it("maps offsets through changes before and after the anchor", () => {
      // Original: "Demand is high."
      // Anchor on "high": from 10, to 14
      // Insert "very " at position 10 -> "Demand is very high."
      const changes = [
        { from: 10, to: 10, insertedLength: 5, version: 1 },
      ];
      const newFrom = mapPositionThroughChanges(10, changes);
      const newTo = mapPositionThroughChanges(14, changes);
      expect(newFrom).toBe(15);
      expect(newTo).toBe(19);
    });

    it("rebases and drops anchor silently if text underneath no longer matches", () => {
      const anchor = { from: 10, to: 14, textHash: "h1", sentenceId: "s1" };
      // User typed "low" over "high"
      const docText = "Demand is low.";
      const changes = [{ from: 10, to: 14, insertedLength: 3, version: 1 }];
      const rebased = rebaseAndVerifyAnchor(anchor, "high", docText, changes);
      expect(rebased).toBeNull();
    });

    it("resolves offsets within sentence with exact and case-insensitive matching", () => {
      const sentence = "Firms experience diseconomies of scale.";
      const res = resolveOffsetsInSentence(sentence, 100, "diseconomies of scale");
      expect(res).not.toBeNull();
      expect(res!.from).toBe(117);
      expect(res!.to).toBe(117 + "diseconomies of scale".length);
    });
  });

  describe("Heuristic Scoring & Tariff Splitting", () => {
    it("strictly clamps scores to AO ceilings for 8, 12, and 20 marks", () => {
      const sentences = [
        { text: "Price elasticity of demand is defined as the responsiveness of quantity demanded to price.", paragraphIndex: 0 },
        { text: "This leads to increased revenue because demand is inelastic, which means firms raise prices.", paragraphIndex: 0 },
        { text: "However, this depends on consumer income and availability of substitutes.", paragraphIndex: 1 },
        { text: "Overall, in conclusion the most significant factor is the time period under consideration.", paragraphIndex: 1 },
      ];

      // 8-mark split: AO1 2, AO2 4, AO3 2
      const score8 = computeHeuristicScore({ sentences, question: "Discuss PED", maxMark: 8 });
      expect(score8.aoBreakdown.ao1).toBeLessThanOrEqual(TARIFF_SPLITS[8].ao1_marks);
      expect(score8.aoBreakdown.ao2).toBeLessThanOrEqual(TARIFF_SPLITS[8].ao2_marks);
      expect(score8.aoBreakdown.ao3).toBeLessThanOrEqual(TARIFF_SPLITS[8].ao3_marks);
      expect(score8.total).toBeLessThanOrEqual(8);

      // 12-mark split: AO1 2, AO2 6, AO3 4
      const score12 = computeHeuristicScore({ sentences, question: "Evaluate tariff impacts", maxMark: 12 });
      expect(score12.aoBreakdown.ao1).toBeLessThanOrEqual(TARIFF_SPLITS[12].ao1_marks);
      expect(score12.aoBreakdown.ao2).toBeLessThanOrEqual(TARIFF_SPLITS[12].ao2_marks);
      expect(score12.aoBreakdown.ao3).toBeLessThanOrEqual(TARIFF_SPLITS[12].ao3_marks);
      expect(score12.total).toBeLessThanOrEqual(12);

      // 20-mark split: AO1 2, AO2 12, AO3 6
      const score20 = computeHeuristicScore({ sentences, question: "Assess protectionism policies", maxMark: 20 });
      expect(score20.aoBreakdown.ao1).toBeLessThanOrEqual(TARIFF_SPLITS[20].ao1_marks);
      expect(score20.aoBreakdown.ao2).toBeLessThanOrEqual(TARIFF_SPLITS[20].ao2_marks);
      expect(score20.aoBreakdown.ao3).toBeLessThanOrEqual(TARIFF_SPLITS[20].ao3_marks);
      expect(score20.total).toBeLessThanOrEqual(20);
    });
  });

  describe("Local Checks & False-Positive Economics Corpus", () => {
    it("flags obvious spelling errors like 'speling' and 'inelasitc'", () => {
      const seg = {
        id: "s1",
        from: 0,
        to: 35,
        text: "The demand is inelasitc for goods.",
      };
      const issues = runLocalChecksOnSegment(seg);
      expect(issues.some((i) => i.original === "inelasitc")).toBe(true);
    });

    it("flags repeated words and 'alot'", () => {
      const seg = {
        id: "s2",
        from: 0,
        to: 45,
        text: "The the government imposes alot of tariffs.",
      };
      const issues = runLocalChecksOnSegment(seg);
      expect(issues.some((i) => i.category === "grammar" && i.original.toLowerCase().includes("the the"))).toBe(true);
      expect(issues.some((i) => i.category === "spelling" && i.original.toLowerCase() === "alot")).toBe(true);
    });

    it("does NOT flag trailing in-progress half-words as spelling errors while typing", () => {
      // Half-words directly at the end of the unpunctuated text (actively being typed)
      const inProgressCases = [
        "The demand is inelas",
        "The government imposes dem",
        "Merit goods are underpr",
        "Indirect taxes shift the suppl",
      ];

      for (const text of inProgressCases) {
        const seg = {
          id: "s_prog",
          from: 0,
          to: text.length,
          text,
          isComplete: false,
        };
        const issues = runLocalChecksOnSegment(seg);
        const spellingIssues = issues.filter((i) => i.category === "spelling");
        expect(spellingIssues).toEqual([]);
      }

      // But once the misspelled word is followed by a space or punctuation, it IS flagged
      const completedTypo = {
        id: "s_done",
        from: 0,
        to: 35,
        text: "The demand is inelasitc for goods.",
        isComplete: true,
      };
      const issues = runLocalChecksOnSegment(completedTypo);
      expect(issues.some((i) => i.original === "inelasitc")).toBe(true);
    });

    it("does NOT flag unmatched parentheses on in-progress incomplete sentences", () => {
      const inProgress = {
        id: "s_paren_prog",
        from: 0,
        to: 30,
        text: "An indirect tax (e.g. sugar tax",
        isComplete: false,
      };
      const issuesProg = runLocalChecksOnSegment(inProgress);
      expect(issuesProg.some((i) => i.id.startsWith("unmatched_paren"))).toBe(false);

      const completed = {
        id: "s_paren_done",
        from: 0,
        to: 35,
        text: "An indirect tax (e.g. sugar tax.",
        isComplete: true,
      };
      const issuesDone = runLocalChecksOnSegment(completed);
      expect(issuesDone.some((i) => i.id.startsWith("unmatched_paren"))).toBe(true);
    });

    it("produces ZERO false positives on legitimate Cambridge technical economics prose", () => {
      const correctEconomicsCorpus = [
        "Ceteris paribus, an ad valorem tax causes the supply curve to shift inwards.",
        "Merit goods are underprovided in a free market due to positive externalities and imperfect consumer information.",
        "Monopolistic competition and oligopoly both feature non-price competition.",
        "In the short run, fixed costs remain unchanged, whilst variable costs increase with output.",
        "Equimarginal utility dictates that consumers allocate expenditure where the marginal utility per pound is equal.",
        "The Gini coefficient measures income inequality across the Lorenz curve.",
      ];

      for (const sentence of correctEconomicsCorpus) {
        const seg = { id: "test", from: 0, to: sentence.length, text: sentence };
        const issues = runLocalChecksOnSegment(seg);
        const spellingIssues = issues.filter((i) => i.category === "spelling");
        expect(spellingIssues).toEqual([]);
      }
    });
  });

  describe("Scheduler & Cache", () => {
    it("queues and dequeues dirty sentences, respecting backoff", () => {
      const scheduler = new LiveExaminerScheduler();
      const seg = {
        id: "s1",
        from: 0,
        to: 20,
        text: "Demand is falling.",
        hash: "hash123",
        paragraphIndex: 0,
        sentenceIndex: 0,
        isComplete: true,
      };

      scheduler.enqueue([seg], 1);
      expect(scheduler.hasPending()).toBe(true);

      const batch = scheduler.getNextBatch();
      expect(batch.length).toBe(1);
      expect(batch[0]!.segment.hash).toBe("hash123");

      scheduler.dequeue(["hash123"]);
      expect(scheduler.hasPending()).toBe(false);
    });

    it("maintains cache and respects dismissed issues across reloads", () => {
      const cache = new LiveExaminerCache();
      cache.dismiss("h1", "spelling", "word");
      expect(cache.isDismissed("h1", "spelling", "word")).toBe(true);

      cache.set("h1", {
        sentenceHash: "h1",
        ao: { tag: "ao1", reason: "definition" },
        issues: [
          {
            id: "i1",
            from: 0,
            to: 4,
            sentenceId: "s1",
            category: "spelling",
            severity: "medium",
            original: "word",
            explanation: "test",
            status: "active",
          },
        ],
      });

      // Issue should have been filtered out by dismissed set
      const retrieved = cache.get("h1");
      expect(retrieved).toBeDefined();
      expect(retrieved!.issues).toEqual([]);

      // Global dismissal: even if sentenceHash changes to h2, dismissing "word" stays active
      expect(cache.isDismissed("h2", "spelling", "word")).toBe(true);
    });

    it("does NOT flag demerit or demerits as spelling errors", () => {
      const seg1 = {
        id: "s_demerit",
        from: 0,
        to: 35,
        text: "Demerit goods cause market failure.",
        isComplete: true,
      };
      const issues = runLocalChecksOnSegment(seg1);
      expect(issues.some((i) => i.original.toLowerCase() === "demerit")).toBe(false);

      const seg2 = {
        id: "s_demerits",
        from: 0,
        to: 45,
        text: "The consumption of demerits leads to negative externalities.",
        isComplete: true,
      };
      const issues2 = runLocalChecksOnSegment(seg2);
      expect(issues2.some((i) => i.original.toLowerCase().includes("demerit"))).toBe(false);
    });
  });
});

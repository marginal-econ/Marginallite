import { describe, expect, it } from "vitest";
import {
  computeLexicalScore,
  deduplicateSources,
  expandEconomicQuery,
  reciprocalRankFusion,
} from "./retrieval.server";

describe("Advanced RAG Retrieval Engine", () => {
  describe("Syllabus-aware Query Expansion", () => {
    it("expands an exchange rate question with Marshall-Lerner and J-curve", () => {
      const query = "Evaluate the effect of a currency depreciation on the current account.";
      const expanded = expandEconomicQuery(query);
      expect(expanded).toContain("Marshall-Lerner condition");
      expect(expanded).toContain("J-curve effect");
      expect(expanded).toContain("terms of trade");
    });

    it("expands a monetary policy question with transmission mechanism", () => {
      const query = "Discuss whether monetary policy is effective in controlling inflation.";
      const expanded = expandEconomicQuery(query);
      expect(expanded).toContain("transmission mechanism");
      expect(expanded).toContain("interest rates");
      expect(expanded).toContain("Phillips curve");
    });

    it("expands a PPC and scarcity micro question with allocative efficiency", () => {
      const query =
        "Explain how the production possibility curve illustrates scarcity and opportunity cost.";
      const expanded = expandEconomicQuery(query);
      expect(expanded).toContain("production possibility curve");
      expect(expanded).toContain("allocative efficiency");
      expect(expanded).toContain("capital goods");
    });

    it("expands an elasticity question with PED and tax incidence", () => {
      const query =
        "Assess the usefulness of price elasticity of demand to a business setting prices.";
      const expanded = expandEconomicQuery(query);
      expect(expanded).toContain("price elasticity of demand");
      expect(expanded).toContain("tax incidence");
      expect(expanded).toContain("total revenue test");
    });

    it("leaves unrelated non-economic queries unexpanded", () => {
      const query = "What is the procedure for registering for exam sessions?";
      const expanded = expandEconomicQuery(query);
      expect(expanded).toBe(query);
    });
  });

  describe("Sparse Lexical Scoring", () => {
    it("boosts matches found in headings and document titles", () => {
      const chunkWithTitleMatch = {
        document_title: "Cambridge Economics — Chapter 4: Elasticity Guide",
        heading: "Elasticity Requirements",
        content: "If PEDx + PEDm > 1, depreciation improves trade balance.",
      };
      const chunkWithoutBoost = {
        document_title: "General Macroeconomics",
        heading: "Overview",
        content: "If PEDx + PEDm > 1, depreciation improves trade balance.",
      };

      const queryTerms = ["elasticity", "guide"];
      const scoreBoosted = computeLexicalScore(chunkWithTitleMatch, queryTerms);
      const scoreNormal = computeLexicalScore(chunkWithoutBoost, queryTerms);

      expect(scoreBoosted).toBeGreaterThan(scoreNormal);
    });

    it("properly scores 2-letter economics acronyms like AD, AS, MC, MR", () => {
      const chunk = {
        document_title: "Cambridge 0455 Economics — Macroeconomic Equilibrium",
        heading: "AD-AS Analysis",
        content: "An increase in investment shifts the AD curve to the right, raising real output.",
      };

      const queryTerms = ["ad", "shift"];
      const score = computeLexicalScore(chunk, queryTerms);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe("Reciprocal Rank Fusion (RRF)", () => {
    it("fuses dense vector similarity with exact keyword matches", () => {
      const rows = [
        {
          chunk_id: "c1",
          document_id: "d1",
          document_title: "Trade Balance Overview",
          doc_type: "syllabus" as const,
          heading: null,
          content: "General trade flows and balance of payments accounting.",
          similarity: 0.88, // High dense similarity, low keyword match
        },
        {
          chunk_id: "c2",
          document_id: "d2",
          document_title: "Cambridge 0455 Mark Scheme — Exchange Rates",
          doc_type: "mark_scheme" as const,
          heading: "Marshall-Lerner Condition",
          content:
            "Examiner credit requires explicit reference to Marshall-Lerner and PED elasticity sum.",
          similarity: 0.84, // Slightly lower dense similarity, but exact keyword match in title and heading
        },
        {
          chunk_id: "c3",
          document_id: "d3",
          document_title: "Notes on Currency",
          doc_type: "notes" as const,
          heading: "J-curve",
          content: "In the short run, trade balance may worsen before improving.",
          similarity: 0.75,
        },
      ];

      const query = "Marshall-Lerner condition";
      const fused = reciprocalRankFusion(rows, query, 2);

      expect(fused.length).toBe(2);
      // c2 has the highest lexical score and high dense score, so RRF brings it to the top!
      expect(fused[0].chunk_id).toBe("c2");
    });
  });

  describe("Snippet Deduplication", () => {
    it("deduplicates identical and near-identical chunks", () => {
      const sources = [
        {
          documentId: "doc1",
          documentTitle: "Syllabus 2026",
          docType: "syllabus",
          heading: "Fiscal Policy",
          snippet:
            "Fiscal policy is the manipulation of government spending and taxation to influence AD.",
          similarity: 0.9,
        },
        {
          documentId: "doc2",
          documentTitle: "Coursebook Chap 12",
          docType: "coursebook",
          heading: "Fiscal Definitions",
          snippet:
            "Fiscal policy is the manipulation of government spending and taxation to influence AD.",
          similarity: 0.88,
        },
        {
          documentId: "doc3",
          documentTitle: "Examiner Report",
          docType: "examiner_report",
          heading: "Common Errors",
          snippet:
            "Students often fail to distinguish between automatic stabilisers and discretionary policy.",
          similarity: 0.85,
        },
      ];

      const deduped = deduplicateSources(sources);
      expect(deduped.length).toBe(2);
      expect(deduped[0].snippet).toContain("Fiscal policy is the manipulation");
      expect(deduped[1].snippet).toContain("Students often fail to distinguish");
    });
  });
});

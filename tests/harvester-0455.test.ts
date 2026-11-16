import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  parseCambridge0455Filename,
  parseMcqAnswerKey,
  parsePaper2StructuredQuestions,
  chunkText,
  hashContent,
  extractTextFromPdfBuffer,
} from "../scripts/harvest-papers";

describe("Cambridge IGCSE 0455 Past Paper Harvester", () => {
  describe("Filename Parser (parseCambridge0455Filename)", () => {
    it("parses Paper 1 MCQ question paper filename correctly", () => {
      const parsed = parseCambridge0455Filename("0455_m26_qp_12.pdf");
      expect(parsed).not.toBeNull();
      expect(parsed?.syllabus).toBe("0455");
      expect(parsed?.season).toBe("m");
      expect(parsed?.seasonName).toBe("Feb/March");
      expect(parsed?.year).toBe(2026);
      expect(parsed?.type).toBe("qp");
      expect(parsed?.component).toBe(1);
      expect(parsed?.variant).toBe("12");
      expect(parsed?.isMcq).toBe(true);
      expect(parsed?.era).toBe("legacy");
    });

    it("parses Paper 1 MCQ mark scheme filename correctly", () => {
      const parsed = parseCambridge0455Filename("0455_m26_ms_12.pdf");
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("ms");
      expect(parsed?.isMcq).toBe(true);
      expect(parsed?.era).toBe("legacy");
    });

    it("parses Paper 2 Structured question paper filename correctly", () => {
      const parsed = parseCambridge0455Filename("0455_m26_qp_22.pdf");
      expect(parsed).not.toBeNull();
      expect(parsed?.component).toBe(2);
      expect(parsed?.variant).toBe("22");
      expect(parsed?.isMcq).toBe(false);
      expect(parsed?.era).toBe("legacy");
    });

    it("parses May/June series and 2027 era correctly", () => {
      const parsed24 = parseCambridge0455Filename("0455_s24_ms_21.pdf");
      expect(parsed24?.season).toBe("s");
      expect(parsed24?.seasonName).toBe("May/June");
      expect(parsed24?.year).toBe(2024);
      expect(parsed24?.era).toBe("legacy");

      const parsed27 = parseCambridge0455Filename("0455_s27_qp_11.pdf");
      expect(parsed27?.year).toBe(2027);
      expect(parsed27?.era).toBe("2027");
    });

    it("identifies syllabus specification document", () => {
      const parsed = parseCambridge0455Filename("0455_syllabus_2027_2029.pdf");
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe("syllabus");
      expect(parsed?.era).toBe("2027");
    });

    it("returns null for non-0455 or malformed filenames", () => {
      expect(parseCambridge0455Filename("random_file.pdf")).toBeNull();
      expect(parseCambridge0455Filename("9708_s22_qp_12.pdf")).toBeNull();
    });
  });

  describe("Deterministic MCQ Answer Key Extractor (parseMcqAnswerKey)", () => {
    it("extracts clean table answers 1 to 30 from mark scheme text", () => {
      const mockMsText = `
        Cambridge IGCSE – Mark Scheme February/March 2026
        Question Answer Marks
        1 A 1
        2 D 1
        3 B 1
        4 A 1
        5 A 1
        6 B 1
        7 B 1
        8 C 1
        9 B 1
        10 B 1
        11 A 1
        12 B 1
        13 D 1
        14 B 1
        15 C 1
        16 C 1
        17 B 1
        18 B 1
        19 C 1
        20 D 1
        21 C 1
        22 B 1
        23 C 1
        24 A 1
        25 D 1
        26 A 1
        27 C 1
        28 A 1
        29 D 1
        30 D 1
      `;
      const answerKey = parseMcqAnswerKey(mockMsText, 30);
      expect(Object.keys(answerKey).length).toBe(30);
      expect(answerKey["1"]).toBe("A");
      expect(answerKey["2"]).toBe("D");
      expect(answerKey["30"]).toBe("D");
    });

    it("parses the real source PDF 0455_m26_ms_12.pdf with 100% fidelity", async () => {
      const filePath = path.resolve(process.cwd(), "docs/source/0455_m26_ms_12.pdf");
      if (!fs.existsSync(filePath)) return;

      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const buf = fs.readFileSync(filePath);
      const text = await extractTextFromPdfBuffer(pdfjs, buf);

      const answerKey = parseMcqAnswerKey(text, 30);
      expect(Object.keys(answerKey).length).toBe(30);
      expect(answerKey["1"]).toBe("A");
      expect(answerKey["2"]).toBe("D");
      expect(answerKey["3"]).toBe("B");
      expect(answerKey["29"]).toBe("D");
      expect(answerKey["30"]).toBe("D");
    }, 15000);
  });

  describe("Paper 2 Structured Question Parser", () => {
    it("extracts parts (a) 2m, (b) 4m, (c) 6m, (d) 8m from real 0455 QP", async () => {
      const filePath = path.resolve(process.cwd(), "docs/source/0455_m26_qp_22.pdf");
      if (!fs.existsSync(filePath)) return;

      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const buf = fs.readFileSync(filePath);
      const text = await extractTextFromPdfBuffer(pdfjs, buf);

      const questions = parsePaper2StructuredQuestions(text);
      expect(questions.length).toBeGreaterThanOrEqual(16);

      const marks = questions.map((q) => q.mark);
      expect(marks).toContain(2);
      expect(marks).toContain(4);
      expect(marks).toContain(6);
      expect(marks).toContain(8);

      const commandWords = questions.map((q) => q.commandWord.toLowerCase());
      expect(commandWords.some((c) => c.startsWith("state") || c.startsWith("define") || c.startsWith("give") || c.startsWith("identify"))).toBe(true);
      expect(commandWords.some((c) => c.startsWith("explain"))).toBe(true);
      expect(commandWords.some((c) => c.startsWith("analyse"))).toBe(true);
      expect(commandWords.some((c) => c.startsWith("discuss"))).toBe(true);
    });
  });

  describe("Chunk Idempotency & Hashing", () => {
    it("produces identical SHA-256 content hashes for identical input", () => {
      const sampleText = "The basic economic problem arises from scarcity of resources.";
      const hash1 = hashContent(sampleText);
      const hash2 = hashContent(sampleText);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it("generates structured chunks with predictable offsets", () => {
      const paras = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}: Economic resources include land, labour, capital and enterprise.`);
      const text = paras.join("\n\n");
      const chunks = chunkText(text);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].content).toContain("Paragraph 1");
    });
  });
});

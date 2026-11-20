import { describe, it, expect } from "vitest";
import { isBlankOrUnread, sanitizeOcrTranscription } from "./gemini.server";

describe("Handwriting OCR Validation & Blank Filter", () => {
  it("detects empty or null transcriptions as blank/unread", () => {
    expect(isBlankOrUnread(null)).toBe(true);
    expect(isBlankOrUnread(undefined)).toBe(true);
    expect(isBlankOrUnread("")).toBe(true);
    expect(isBlankOrUnread("   \n\t  ")).toBe(true);
  });

  it("detects blank page annotations from vision models", () => {
    expect(isBlankOrUnread("[Blank page]")).toBe(true);
    expect(isBlankOrUnread("[Blank page / no handwriting detected]")).toBe(true);
    expect(isBlankOrUnread("[blank page - unreadable]")).toBe(true);
  });

  it("detects 'nothing visible' or 'no handwriting' phrases that previously leaked into essays", () => {
    expect(isBlankOrUnread("nothing visible")).toBe(true);
    expect(isBlankOrUnread("nothing visible.")).toBe(true);
    expect(isBlankOrUnread("No handwriting detected.")).toBe(true);
    expect(isBlankOrUnread("no text found")).toBe(true);
    expect(isBlankOrUnread("no text visible.")).toBe(true);
    expect(isBlankOrUnread("unreadable page")).toBe(true);
    expect(isBlankOrUnread("blank")).toBe(true);
  });

  it("detects empty diagram tags with accuracy: nothing visible", () => {
    expect(
      isBlankOrUnread(
        "[DIAGRAM: unlabelled | axes: unlabelled | curves: none | labels: none | accuracy: nothing visible]",
      ),
    ).toBe(true);
  });

  it("confirms genuine student handwriting transcriptions are treated as valid", () => {
    const studentAnswer =
      "Fiscal policy involves the government manipulating taxation and government spending to influence aggregate demand.\n\n" +
      "An expansionary fiscal policy shifts AD to the right from AD1 to AD2, increasing real output from Y1 to Y2.";
    expect(isBlankOrUnread(studentAnswer)).toBe(false);
  });

  it("confirms student transcription containing inline economics diagrams is valid", () => {
    const answerWithDiagram =
      "Question 2(a)\n\n" +
      "A subsidy on agricultural goods shifts the supply curve downwards and to the right.\n\n" +
      "[DIAGRAM: Demand and Supply with specific subsidy | axes: Price / Quantity | curves: S1 shifts down to S2 | labels: P1, P2, Q1, Q2]\n\n" +
      "As shown in the diagram, consumer surplus increases from area A to area A+B.";
    expect(isBlankOrUnread(answerWithDiagram)).toBe(false);
  });
});

describe("sanitizeOcrTranscription Preamble & Header Stripper", () => {
  it("strips conversational AI preambles while preserving student handwriting", () => {
    const raw =
      "Here is the transcription of your handwritten Economics notes. I've preserved your original wording and spelling.\n\n" +
      "A maximum price below equilibrium causes shortages and excess demand.";
    const cleaned = sanitizeOcrTranscription(raw);
    expect(cleaned).toBe("A maximum price below equilibrium causes shortages and excess demand.");
  });

  it("strips unattempted worksheet practice question headers", () => {
    const raw =
      "Practice Questions\n\n" +
      "1. Discuss whether or not money supply increases benefit an economy.\n" +
      "2. Discuss whether or not maximum price controls benefit consumers.\n\n" +
      "An increase in money supply can stimulate aggregate demand by lowering interest rates.";
    const cleaned = sanitizeOcrTranscription(raw);
    expect(cleaned).toBe(
      "An increase in money supply can stimulate aggregate demand by lowering interest rates.",
    );
  });

  it("strips conversational AI trailers", () => {
    const raw =
      "Fiscal policy shifts AD to the right.\n\n" +
      "Hope this helps! Let me know if you need anything else.";
    const cleaned = sanitizeOcrTranscription(raw);
    expect(cleaned).toBe("Fiscal policy shifts AD to the right.");
  });

  it("strips markdown fences around OCR transcriptions", () => {
    const raw = "```markdown\nA subsidy lowers production costs.\n```";
    const cleaned = sanitizeOcrTranscription(raw);
    expect(cleaned).toBe("A subsidy lowers production costs.");
  });
});

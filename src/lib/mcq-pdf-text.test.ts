import { describe, expect, it } from "vitest";
import { extractQuestionSpans, extractQuestionStems, type PdfTextItem } from "./mcq-pdf-text";

describe("MCQ PDF Text Extraction & Page Mapping", () => {
  it("ignores cover / instructions pages completely (preventing false matches like 12 from 9708/12)", () => {
    const coverPageItems: PdfTextItem[] = [
      { str: "CAMBRIDGE INTERNATIONAL EXAMINATIONS", transform: [1, 0, 0, 1, 50, 800] },
      { str: "ECONOMICS", transform: [1, 0, 0, 1, 50, 750] },
      { str: "9708/12", transform: [1, 0, 0, 1, 150, 750] },
      { str: "READ THESE INSTRUCTIONS FIRST", transform: [1, 0, 0, 1, 50, 700] },
      {
        str: "There are thirty questions on this paper. Answer all questions.",
        transform: [1, 0, 0, 1, 50, 650],
      },
      { str: "12", transform: [1, 0, 0, 1, 50, 500] }, // Stray 12 token
    ];

    const stems = extractQuestionStems(coverPageItems);
    expect(stems).toEqual([]);
  });

  it("does not treat '12' inside '9708/12' or 'Paper 12' as question 12", () => {
    const pageWithVariantCode: PdfTextItem[] = [
      { str: "Paper", transform: [1, 0, 0, 1, 50, 800] },
      { str: "12", transform: [1, 0, 0, 1, 90, 800] },
      { str: "Multiple Choice", transform: [1, 0, 0, 1, 120, 800] },
      { str: "1", transform: [1, 0, 0, 1, 50, 600] },
      { str: "What is an advantage of a market economy?", transform: [1, 0, 0, 1, 80, 600] },
      { str: "A It ensures equality.", transform: [1, 0, 0, 1, 80, 550] },
    ];

    const stems = extractQuestionStems(pageWithVariantCode);
    const questionNumbers = stems.map((s) => s.number);
    expect(questionNumbers).toContain(1);
    expect(questionNumbers).not.toContain(12);
  });

  it("correctly extracts true Question 12 on a question page", () => {
    const questionPageItems: PdfTextItem[] = [
      { str: "11", transform: [1, 0, 0, 1, 50, 700] },
      { str: "Which policy shifts aggregate demand right?", transform: [1, 0, 0, 1, 80, 700] },
      { str: "12", transform: [1, 0, 0, 1, 50, 500] },
      {
        str: "In the diagram, what represents consumer surplus?",
        transform: [1, 0, 0, 1, 80, 500],
      },
    ];

    const stems = extractQuestionStems(questionPageItems);
    const questionNumbers = stems.map((s) => s.number);
    expect(questionNumbers).toContain(11);
    expect(questionNumbers).toContain(12);
  });

  it("never mistakes diagram origin '0' tokens for a question number on single-question diagram pages", () => {
    const diagramPageItems: PdfTextItem[] = [
      { str: "16", transform: [1, 0, 0, 1, 50, 720] },
      {
        str: "The diagrams show four government price controls in a competitive market.",
        transform: [1, 0, 0, 1, 75, 720],
      },
      // Four 2x2 diagrams with ten '0' origin tokens at x=131 and x=310
      { str: "0", transform: [1, 0, 0, 1, 131, 600] },
      { str: "0", transform: [1, 0, 0, 1, 131, 580] },
      { str: "0", transform: [1, 0, 0, 1, 131, 450] },
      { str: "0", transform: [1, 0, 0, 1, 131, 430] },
      { str: "0", transform: [1, 0, 0, 1, 310, 600] },
      // Question prompt below the diagram (> 6 lines below the top)
      {
        str: "Which diagram shows an effective maximum price (price ceiling)?",
        transform: [1, 0, 0, 1, 75, 320],
      },
      { str: "A diagram W   B diagram X   C diagram Y   D diagram Z", transform: [1, 0, 0, 1, 75, 280] },
    ];

    const stems = extractQuestionStems(diagramPageItems);
    expect(stems).toHaveLength(1);
    expect(stems[0].number).toBe(16);
    expect(stems[0].text).toContain("effective maximum price");
  });

  it("extracts non-overlapping yTop/yBottom PDF spans for single-question cropping", () => {
    const pageItems: PdfTextItem[] = [
      { str: "3", transform: [1, 0, 0, 1, 290, 805] }, // Page number header
      { str: "4", transform: [1, 0, 0, 1, 50, 740] },
      { str: "What causes a movement along a supply curve?", transform: [1, 0, 0, 1, 80, 740] },
      { str: "5", transform: [1, 0, 0, 1, 50, 420] },
      { str: "Which statement about public goods is correct?", transform: [1, 0, 0, 1, 80, 420] },
      { str: "© UCLES 2023", transform: [1, 0, 0, 1, 50, 38] },
      { str: "9708/12/M/J/23", transform: [1, 0, 0, 1, 260, 38] },
    ];

    const spans = extractQuestionSpans(pageItems, 842);
    expect(spans).toHaveLength(2);
    expect(spans[0].number).toBe(4);
    expect(spans[1].number).toBe(5);
    expect(spans[0].yTop).toBeGreaterThan(spans[0].yBottom);
    expect(spans[0].yBottom).toBeGreaterThanOrEqual(spans[1].yTop - 8);
    expect(spans[1].yBottom).toBeGreaterThanOrEqual(52);
  });
});

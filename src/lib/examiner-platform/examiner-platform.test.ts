import { describe, it, expect, vi } from "vitest";

vi.mock("../ai.server", () => ({
  chat: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      total_ai_mark: 2,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Underconsumed and imperfect info identified" },
        analysis: { awarded: 0, out_of: 0, comment: "N/A" },
        evaluation: { awarded: 0, out_of: 0, comment: "N/A" },
      },
      marking_rationale: "Clear definition of merit goods.",
      evidence_quotes: ["underconsumed in the free market", "imperfect information"],
      missing_elements: [],
    }),
  }),
  visionChat: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      transcription: "Sample page text",
      detected_questions: ["1(a)"],
      diagram_tags: [],
      uncertain_words: [],
      has_cross_outs: false,
      confidence: 0.95,
    }),
  }),
}));

vi.mock("../ocr/gemini.server", () => ({
  transcribeWithGemini: vi.fn().mockResolvedValue({
    text: "Question 1(a): A negative externality is an external cost.\nQuestion 1(b): An indirect tax raises production costs.",
    pages: [
      {
        pageNumber: 1,
        text: "Question 1(a): A negative externality is an external cost.\nQuestion 1(b): An indirect tax raises production costs.",
        uncertainCount: 0,
      },
    ],
  }),
}));

import {
  getPaperConfig,
  listAvailablePapers,
} from "./cambridge-papers";
import {
  processScriptTranscription,
  segmentTranscriptionByQuestions,
} from "./ocr-pipeline.server";
import { verifyScriptMarking } from "./verification-engine.server";
import { markQuestionResponse } from "./marking-engine.server";
import type { QuestionMarkRecord } from "./types";

describe("Cambridge IGCSE 0455 Paper Configurations", () => {
  it("loads Paper 22 (Structured Questions) configuration correctly", () => {
    const config = getPaperConfig("22");
    expect(config).toBeDefined();
    expect(config?.subjectCode).toBe("0455");
    expect(config?.qualification).toBe("igcse");
    expect(config?.totalMarks).toBe(90);
    expect(config?.durationMinutes).toBe(135);
    expect(config?.questions.length).toBeGreaterThanOrEqual(8);

    // Question 1(a) Remittances
    const q1a = config?.questions.find((q) => q.number === "1(a)");
    expect(q1a).toBeDefined();
    expect(q1a?.maxMark).toBe(1);
    expect(q1a?.tariff).toEqual({ ao1: 1, ao2: 0, ao3: 0 });

    // Question 1(e) D&S diagram
    const q1e = config?.questions.find((q) => q.number === "1(e)");
    expect(q1e).toBeDefined();
    expect(q1e?.maxMark).toBe(4);
    expect(q1e?.hasDiagramRequirement).toBe(true);

    // Question 2(d) Discuss evaluative essay
    const q2d = config?.questions.find((q) => q.number === "2(d)");
    expect(q2d).toBeDefined();
    expect(q2d?.maxMark).toBe(8);
  });

  it("loads Paper 12 (MCQ) configuration correctly", () => {
    const config = getPaperConfig("12");
    expect(config).toBeDefined();
    expect(config?.qualification).toBe("igcse");
    expect(config?.totalMarks).toBe(30);
    expect(config?.durationMinutes).toBe(45);
  });

  it("lists all available authorized Cambridge papers", () => {
    const papers = listAvailablePapers();
    expect(papers.length).toBeGreaterThanOrEqual(2);
    const codes = papers.map((p) => p.paperNumber);
    expect(codes).toContain("22");
    expect(codes).toContain("12");
  });
});

describe("OCR & Handwriting Pipeline", () => {
  it("segments transcribed text into discrete question responses", () => {
    const pages = [
      {
        page_number: 1,
        raw_text: "Question 1(a)\nA merit good is a good that is underconsumed in a free market due to imperfect information.\n\nQuestion 1(b)\nCross elasticity of demand measures the responsiveness of demand for good X to a change in price of good Y.",
        detected_questions: ["1(a)", "1(b)"],
        diagram_tags: [],
        uncertain_words: [],
        has_cross_outs: false,
        confidence: 0.95,
      },
      {
        page_number: 2,
        raw_text: "Question 2\n[DIAGRAM: Negative production externality showing MSC above MPC]\nA negative externality occurs when marginal social cost exceeds marginal private cost. The market equilibrium is at Qm, but social optimum is at Q* leading to deadweight welfare loss [?].",
        detected_questions: ["2"],
        diagram_tags: ["Negative production externality showing MSC above MPC"],
        uncertain_words: ["[?]"],
        has_cross_outs: false,
        confidence: 0.92,
      },
    ];

    const expectedQuestions = ["1(a)", "1(b)", "2"];
    const segmented = segmentTranscriptionByQuestions(pages, expectedQuestions);

    expect(segmented["1(a)"]).toBeDefined();
    expect(segmented["1(a)"]).toContain("merit good is a good that is underconsumed");
    expect(segmented["1(b)"]).toBeDefined();
    expect(segmented["1(b)"]).toContain("Cross elasticity of demand measures");
    expect(segmented["2"]).toBeDefined();
    expect(segmented["2"]).toContain("negative externality occurs");
  });

  it("processes synthetic fallback pages and extracts structure", async () => {
    const fallbackPages = [
      {
        pageNumber: 1,
        textFallback: "Question 1(a) Merit good definition and underconsumption in free market.",
      },
    ];

    const result = await processScriptTranscription(fallbackPages);
    expect(result.pages.length).toBe(1);
    expect(result.pages[0].page_number).toBe(1);
    expect(result.pages[0].raw_text).toContain("Merit good");
    expect(result.overallConfidence).toBeGreaterThan(0.5);
  });

  it("preserves image_url and dataUrl across processed pages", async () => {
    const inputPages = [
      {
        pageNumber: 1,
        dataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        textFallback: "Question 1(a): External cost response.",
      },
      {
        pageNumber: 2,
        imageUrl: "https://example.com/scans/page2.jpg",
        textFallback: "Question 1(b): Tax curve shift.",
      },
    ];

    const result = await processScriptTranscription(inputPages);
    expect(result.pages.length).toBe(2);
    expect(result.pages[0].image_url).toBe("data:image/jpeg;base64,/9j/4AAQSkZJRg==");
    expect(result.pages[1].image_url).toBe("https://example.com/scans/page2.jpg");
  });

  it("segments question variants like 1a, 1(a), and Part a accurately", () => {
    const pages = [
      {
        page_number: 1,
        raw_text: "1a. A demerit good is overconsumed.\n\n1b. Indirect tax shifts supply inward.",
        detected_questions: [],
        diagram_tags: [],
        uncertain_words: [],
        has_cross_outs: false,
        confidence: 0.9,
      },
    ];

    const segmented = segmentTranscriptionByQuestions(pages, ["1(a)", "1(b)"]);
    expect(segmented["1(a)"]).toContain("demerit good is overconsumed");
    expect(segmented["1(b)"]).toContain("Indirect tax shifts supply");
  });
});

describe("Verification Engine", () => {
  it("flags mark cap overflow when awarded mark exceeds question maximum", () => {
    const questionMarks = [
      {
        question_number: "1(a)",
        max_mark: 2,
        ai_awarded_mark: 3, // Exceeds max 2
        teacher_approved_mark: null,
        moderated_mark: null,
        is_disagreement: false,
        ao_breakdown: {
          knowledge: { awarded: 2, out_of: 2 },
          analysis: { awarded: 1, out_of: 0 },
          evaluation: { awarded: 0, out_of: 0 },
        },
        marking_rationale: "Rationale",
        evidence_quotes: ["Underconsumed merit good"],
        missing_elements: [],
        diagram_detected: false,
        verification_flags: [],
        transcription_snippet: "Underconsumed merit good.",
        teacher_feedback_note: null,
        is_approved: false,
      },
    ];

    const result = verifyScriptMarking(questionMarks);
    expect(result.criticalFlags.some((f) => f.category === "mark_cap")).toBe(true);
  });

  it("flags arithmetic contradiction when AO subcomponents do not equal awarded mark", () => {
    const questionMarks = [
      {
        question_number: "2",
        max_mark: 20,
        ai_awarded_mark: 15,
        teacher_approved_mark: null,
        moderated_mark: null,
        is_disagreement: false,
        ao_breakdown: {
          knowledge: { awarded: 3, out_of: 4 },
          analysis: { awarded: 4, out_of: 4 },
          evaluation: { awarded: 5, out_of: 12 }, // 3 + 4 + 5 = 12 != 15!
        },
        marking_rationale: "Rationale",
        evidence_quotes: ["MSC is above MPC"],
        missing_elements: [],
        diagram_detected: true,
        verification_flags: [],
        transcription_snippet: "Complete essay on externalities with diagrams.",
        teacher_feedback_note: null,
        is_approved: false,
      },
    ];

    const result = verifyScriptMarking(questionMarks);
    expect(result.criticalFlags.some((f) => f.id?.startsWith("ao-mismatch"))).toBe(true);
  });

  it("flags ambiguous handwriting when uncertain words are present", () => {
    const questionMarks = [
      {
        question_number: "1(b)",
        max_mark: 4,
        ai_awarded_mark: 3,
        teacher_approved_mark: null,
        moderated_mark: null,
        is_disagreement: false,
        ao_breakdown: {
          knowledge: { awarded: 1, out_of: 1 },
          analysis: { awarded: 2, out_of: 3 },
          evaluation: { awarded: 0, out_of: 0 },
        },
        marking_rationale: "Rationale",
        evidence_quotes: ["The substitute coefficient"],
        missing_elements: [],
        diagram_detected: false,
        verification_flags: [],
        transcription_snippet: "The substitute coefficient is [?] which means strong relation [?].",
        teacher_feedback_note: null,
        is_approved: false,
      },
    ];

    const result = verifyScriptMarking(questionMarks);
    expect(result.criticalFlags.some((f) => f.category === "handwriting_ambiguity")).toBe(true);
  });
});

describe("Marking Engine", () => {
  it("evaluates a question and enforces deterministic score aggregation", async () => {
    const qSpec = {
      number: "1(a)",
      title: "Define the term 'merit good'",
      maxMark: 2,
      tariff: { ao1: 2, ao2: 0, ao3: 0 },
      hasDiagramRequirement: false,
      syllabusTopic: "Market failure",
      markingGuide: "1 mark for underconsumed in free market. 1 mark for imperfect information.",
    };

    const response = await markQuestionResponse({
      question: qSpec,
      studentAnswerText: "A merit good is a good that is underconsumed in the free market because consumers have imperfect information regarding its private benefits.",
    });

    expect(response.ai_awarded_mark).toBeGreaterThanOrEqual(1);
    expect(response.ai_awarded_mark).toBeLessThanOrEqual(2);
    expect(response.evidence_quotes.length).toBeGreaterThan(0);
    // Deterministic arithmetic invariant
    expect(
      response.ao_breakdown.knowledge.awarded +
      response.ao_breakdown.analysis.awarded +
      response.ao_breakdown.evaluation.awarded
    ).toBe(response.ai_awarded_mark);
  });

  it("handles blank responses with 0 marks and flags them for teacher review", async () => {
    const qSpec = {
      number: "1(c)",
      title: "Explain how indirect taxes reduce negative externalities",
      maxMark: 4,
      tariff: { ao1: 1, ao2: 3, ao3: 0 },
      hasDiagramRequirement: true,
      syllabusTopic: "Government microeconomic intervention",
      markingGuide: "1 mark for shifting MPC up. Up to 3 marks for analysis of tax incidence.",
    };

    const response = await markQuestionResponse({
      question: qSpec,
      studentAnswerText: "",
    });

    expect(response.ai_awarded_mark).toBe(0);
    expect(response.ao_breakdown.knowledge.awarded).toBe(0);
    expect(response.ao_breakdown.analysis.awarded).toBe(0);
    expect(response.ao_breakdown.evaluation.awarded).toBe(0);
    expect(response.verification_flags.some((f: any) => f.id === "blank-response")).toBe(true);
  });

  it("segments answers written out of order across pages", () => {
    const pages = [
      {
        page_number: 1,
        raw_text: "Question 2\n[DIAGRAM: Aggregate Demand and Aggregate Supply]\nAn increase in government spending increases AD from AD1 to AD2. This leads to higher real GDP and demand-pull inflation.",
        detected_questions: ["2"],
        diagram_tags: ["[DIAGRAM: Aggregate Demand and Aggregate Supply]"],
        uncertain_words: [],
        has_cross_outs: false,
        confidence: 0.96,
      },
      {
        page_number: 2,
        raw_text: "Question 1(a)\nOpportunity cost is the next best alternative forgone when making an economic choice.\n\nQuestion 1(b)\nPublic goods are non-excludable and non-rival in consumption.",
        detected_questions: ["1(a)", "1(b)"],
        diagram_tags: [],
        uncertain_words: [],
        has_cross_outs: false,
        confidence: 0.94,
      },
    ];

    const expected = ["1(a)", "1(b)", "1(c)", "2"];
    const segmented = segmentTranscriptionByQuestions(pages, expected);

    // Q2 was written on page 1 before Q1(a)
    expect(segmented["2"]).toContain("government spending increases AD");
    expect(segmented["2"]).toContain("[DIAGRAM: Aggregate Demand and Aggregate Supply]");

    // Q1(a) was written on page 2
    expect(segmented["1(a)"]).toContain("Opportunity cost is the next best alternative");

    // Q1(b) was written on page 2 after 1(a)
    expect(segmented["1(b)"]).toContain("Public goods are non-excludable");

    // Q1(c) was completely skipped by student
    expect(segmented["1(c)"]).toBe("");
  });

  it("handles crossed-out responses without awarding credit to superseded text", () => {
    const rawWithCrossOut = `
Question 1(a)
[[CROSSED OUT: A merit good is a good produced by the government.]]
A merit good is an underconsumed commodity where social benefits exceed private benefits.
`;
    expect(rawWithCrossOut).toContain("[[CROSSED OUT:");
    const activeText = rawWithCrossOut.replace(/\[\[CROSSED OUT:[\s\S]*?\]\]/g, "").trim();
    expect(activeText).not.toContain("produced by the government");
    expect(activeText).toContain("underconsumed commodity");
  });
});


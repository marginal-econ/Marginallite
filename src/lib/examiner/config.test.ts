import { describe, expect, it } from "vitest";

import {
  AO_DEFINITIONS,
  defaultSplitForMaxMark,
  formatAoLine,
  MODEL_ANALYSIS,
  MODEL_ARBITRATION,
  MODEL_AUDIT,
  MODEL_CHALLENGE,
  MODEL_COACH,
  MODEL_ESTIMATE,
  MODEL_EXAMINER,
  MODEL_EXTRACT,
  MODEL_FAST,
  MODEL_GRADING,
  MODEL_MECHANICAL,
  MODEL_QUESTION_GEN,
  SYLLABUS_CODE,
  TARIFF_SPLITS,
} from "./config";

describe("Examiner Configuration for Cambridge IGCSE Economics 0455", () => {
  it("enforces SYLLABUS_CODE as 0455", () => {
    expect(SYLLABUS_CODE).toBe("0455");
  });

  it("allocates Gemini 3.8 Flash for deep evaluative grading and arbitration", () => {
    expect(MODEL_EXAMINER).toBe("google/gemini-3.8-flash");
    expect(MODEL_GRADING).toBe("google/gemini-3.8-flash");
    expect(MODEL_AUDIT).toBe("google/gemini-3.8-flash");
    expect(MODEL_ARBITRATION).toBe("google/gemini-3.8-flash");
  });

  it("allocates Gemini 3.8 Flash for helper tasks", () => {
    expect(MODEL_FAST).toBe("google/gemini-3.8-flash");
    expect(MODEL_ESTIMATE).toBe("google/gemini-3.8-flash");
    expect(MODEL_MECHANICAL).toBe("google/gemini-3.8-flash");
    expect(MODEL_EXTRACT).toBe("google/gemini-3.8-flash");
    expect(MODEL_COACH).toBe("google/gemini-3.8-flash");
    expect(MODEL_CHALLENGE).toBe("google/gemini-3.8-flash");
    expect(MODEL_QUESTION_GEN).toBe("google/gemini-3.8-flash");
    expect(MODEL_ANALYSIS).toBe("google/gemini-3.8-flash");
  });

  it("preserves authoritative Cambridge 0455 AO splits across tariffs derived from mark schemes", () => {
    expect(TARIFF_SPLITS[2]).toEqual({ ao1_marks: 2, ao2_marks: 0, ao3_marks: 0 });
    expect(TARIFF_SPLITS[4]).toEqual({ ao1_marks: 2, ao2_marks: 2, ao3_marks: 0 });
    expect(TARIFF_SPLITS[6]).toEqual({ ao1_marks: 0, ao2_marks: 6, ao3_marks: 0 });
    expect(TARIFF_SPLITS[8]).toEqual({ ao1_marks: 2, ao2_marks: 3, ao3_marks: 3 });
    expect(TARIFF_SPLITS[20]).toEqual({ ao1_marks: 4, ao2_marks: 10, ao3_marks: 6 });

    const split4 = defaultSplitForMaxMark(4);
    expect(split4.ao1_marks + split4.ao2_marks + split4.ao3_marks).toBe(4);

    const split6 = defaultSplitForMaxMark(6);
    expect(split6).toEqual({ ao1_marks: 0, ao2_marks: 6, ao3_marks: 0 });
    expect(split6.ao1_marks + split6.ao2_marks + split6.ao3_marks).toBe(6);

    const split8 = defaultSplitForMaxMark(8);
    expect(split8.ao1_marks + split8.ao2_marks + split8.ao3_marks).toBe(8);

    const split20 = defaultSplitForMaxMark(20);
    expect(split20.ao1_marks + split20.ao2_marks + split20.ao3_marks).toBe(20);
  });

  it("supports evaluative discuss 6-markers with AO3 split", () => {
    const splitDiscuss6 = defaultSplitForMaxMark(6, "discuss");
    expect(splitDiscuss6).toEqual({ ao1_marks: 2, ao2_marks: 2, ao3_marks: 2 });
  });

  it("formats AO lines accurately according to syllabus standard", () => {
    expect(formatAoLine("ao1")).toContain("AO1 Knowledge and understanding");
    expect(formatAoLine("ao2")).toContain("AO2 Analysis");
    expect(formatAoLine("ao3")).toContain("AO3 Evaluation");
  });
});

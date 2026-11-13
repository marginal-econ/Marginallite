import { describe, it, expect } from "vitest";
import { extractFirstJsonObject } from "./json";

describe("extractFirstJsonObject", () => {
  it("parses pure JSON directly", () => {
    const raw = '{"total_mark": 2, "confidence": 0.95}';
    expect(extractFirstJsonObject(raw)).toEqual({ total_mark: 2, confidence: 0.95 });
  });

  it("extracts JSON surrounded by markdown fences", () => {
    const raw = 'Here is the response:\n```json\n{"status": "ok", "items": [1, 2]}\n```\nDone.';
    expect(extractFirstJsonObject(raw)).toEqual({ status: "ok", items: [1, 2] });
  });

  it("extracts JSON surrounded by conversational prose", () => {
    const raw = 'Certainly! The evaluation is:\n{"issues": [{"original": "bad"}]}\nHope that helps!';
    expect(extractFirstJsonObject(raw)).toEqual({ issues: [{ original: "bad" }] });
  });

  it("recovers truncated JSON when string was cut off mid-sentence", () => {
    const truncated = '{"issues": [{"original": "demerit goods", "explanation": "In Cambridge 0455';
    const parsed = extractFirstJsonObject(truncated);
    expect(parsed).toBeDefined();
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect((parsed.issues as any)[0].original).toBe("demerit goods");
  });

  it("recovers truncated JSON when array was cut off after a comma", () => {
    const truncated = '{"issues": [{"original": "demerit goods"}], "classifications": [';
    const parsed = extractFirstJsonObject(truncated);
    expect(parsed).toBeDefined();
    expect(parsed.issues).toEqual([{ original: "demerit goods" }]);
  });

  it("recovers root object from real-world candidate truncated response", () => {
    const truncated = `{
  "issues": [
    {
      "sentence_index": 2,
      "original": "demerit goods",
      "suggestion": "Demerit goods",
      "category": "grammar",
      "severity": "low",
      "explanation": "Sentences should begin with a capital letter.",
      "evidence": "Standard academic writing conventions.",
      "confidence": 0.98
    },
    {
      "sentence_index": 2,
      "original": "because consumers are not aware of its negative externalities due to information failure.",
      "suggestion": "because consumers underestimate the private harm to themselves due to information failure, and their consumption generates negative externalities.",
      "category": "economics_accuracy",
      "severity": "medium",
      "explanation": "In Cambridge 0455 Economics,`;
    const parsed = extractFirstJsonObject(truncated);
    expect(parsed).toBeDefined();
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect((parsed.issues as any).length).toBeGreaterThanOrEqual(1);
    expect((parsed.issues as any)[0].original).toBe("demerit goods");
  });

  it("throws on completely non-JSON content", () => {
    expect(() => extractFirstJsonObject("Just some text without any JSON at all")).toThrow(
      "The examiner returned a response that could not be read as valid JSON.",
    );
  });
});

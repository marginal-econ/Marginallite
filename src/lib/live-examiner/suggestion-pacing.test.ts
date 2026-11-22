import { describe, expect, it } from "vitest";
import {
  getCumulativeSuggestionBudget,
  getMaxActiveIssues,
  MAX_SESSION_SUGGESTIONS,
} from "./suggestion-pacing";

describe("Live Examiner Suggestion Pacing & Spreading Engine", () => {
  it("withholds all suggestions on early in-progress text under 2 sentences or 25 words", () => {
    expect(getCumulativeSuggestionBudget(10, 1)).toBe(0);
    expect(getCumulativeSuggestionBudget(20, 1)).toBe(0);
    expect(getMaxActiveIssues(20, 1)).toBe(0);
  });

  it("strictly caps the first 3 lines (<= 3 sentences or < 75 words) to at most 2 lifetime suggestions", () => {
    // 2 completed sentences, 35 words
    expect(getCumulativeSuggestionBudget(35, 2)).toBe(2);
    // 3 completed sentences, 55 words
    expect(getCumulativeSuggestionBudget(55, 3)).toBe(2);
    // Max active issues on screen in the first 3 lines is 2
    expect(getMaxActiveIssues(55, 3)).toBe(2);
  });

  it("progressively unlocks suggestions as the essay develops across paragraphs up to 10 total", () => {
    // Paragraph 2 / early body: 5 sentences, 120 words -> budget is 4
    expect(getCumulativeSuggestionBudget(120, 5)).toBe(4);
    expect(getMaxActiveIssues(120, 5)).toBe(2);

    // Developing analysis: 8 sentences, 200 words -> budget is 6
    expect(getCumulativeSuggestionBudget(200, 8)).toBe(6);
    expect(getMaxActiveIssues(200, 8)).toBe(3);

    // Evaluative weighing: 12 sentences, 320 words -> budget is 8
    expect(getCumulativeSuggestionBudget(320, 12)).toBe(8);

    // Full essay / conclusion: 15 sentences, 450 words -> full 10 budget
    expect(getCumulativeSuggestionBudget(450, 15)).toBe(MAX_SESSION_SUGGESTIONS);
    expect(getCumulativeSuggestionBudget(450, 15)).toBe(10);
  });
});

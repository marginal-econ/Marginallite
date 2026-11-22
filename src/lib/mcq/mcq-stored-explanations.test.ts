import { describe, expect, it } from "vitest";
import {
  getStoredPaperExplanationsServer,
  savePaperExplanationServer,
  type McqExplanationResult,
} from "./mcq-pdf.server";

describe("Stored MCQ Explanations for 1-by-1 Tutor Mode", () => {
  it("stores and retrieves pre-run explanations instantly from memory cache", async () => {
    const testPaperId = "test-paper-tutor-mode-1";
    const sampleExplanation: McqExplanationResult = {
      text: "Option B is correct because opportunity cost represents the value of the next best alternative forgone.",
      diagnostic: {
        concept: "AS Unit 1 - Basic Economic Ideas: Opportunity Cost",
        keyRule: "Opportunity cost is strictly the value of the next best alternative sacrificed.",
        correctReasoning: "Option B correctly defines the single next best alternative given up.",
        distractorTrap: "Option A refers to total alternative costs, which candidates frequently confuse.",
        speedTip: "Look for 'next best alternative' and eliminate total expenditure options.",
      },
      visionGrounded: true,
    };

    // Save explanation before the user checks
    await savePaperExplanationServer(testPaperId, 1, sampleExplanation);

    // Retrieve explanations for this paper
    const stored = await getStoredPaperExplanationsServer(testPaperId);
    expect(stored[1]).toBeDefined();
    expect(stored[1].text).toContain("Option B is correct");
    expect(stored[1].diagnostic?.concept).toContain("Opportunity Cost");
    expect(stored[1].diagnostic?.speedTip).toContain("next best alternative");
    expect(stored[1].visionGrounded).toBe(true);
  });

  it("handles multiple pre-fetched questions for a paper without interference", async () => {
    const testPaperId = "test-paper-tutor-mode-2";
    const q1Explanation: McqExplanationResult = {
      text: "Q1 Explanation",
      diagnostic: {
        concept: "Concept 1",
        keyRule: "Rule 1",
        correctReasoning: "Reason 1",
        distractorTrap: "Trap 1",
        speedTip: "Tip 1",
      },
      visionGrounded: false,
    };
    const q2Explanation: McqExplanationResult = {
      text: "Q2 Explanation",
      diagnostic: {
        concept: "Concept 2",
        keyRule: "Rule 2",
        correctReasoning: "Reason 2",
        distractorTrap: "Trap 2",
        speedTip: "Tip 2",
      },
      visionGrounded: false,
    };

    await savePaperExplanationServer(testPaperId, 1, q1Explanation);
    await savePaperExplanationServer(testPaperId, 2, q2Explanation);

    const stored = await getStoredPaperExplanationsServer(testPaperId);
    expect(Object.keys(stored).length).toBeGreaterThanOrEqual(2);
    expect(stored[1].text).toBe("Q1 Explanation");
    expect(stored[2].text).toBe("Q2 Explanation");
  });
});

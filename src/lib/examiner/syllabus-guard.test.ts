import { describe, expect, it } from "vitest";
import { OffSyllabusError, validateEconomicsSyllabus } from "./syllabus-guard.server";

describe("validateEconomicsSyllabus (Cambridge IGCSE 0455)", () => {
  it("approves authentic Cambridge IGCSE 0455 Economics questions via high-confidence fast heuristics", async () => {
    const questions = [
      "Explain two reasons for differences in income distribution between countries.",
      "Analyse how a government could increase the access of low-income households to food.",
      "Discuss whether or not a government should impose a high rate of personal income tax on the rich.",
      "Define 'public good'.",
      "Give the formula for price elasticity of supply.",
      "Explain two reasons why a worker may choose to work long hours.",
      "Analyse how a competitive market differs from a monopoly market.",
      "Discuss whether or not having a fixed exchange rate will benefit an economy.",
    ];

    for (const q of questions) {
      const res = await validateEconomicsSyllabus(q);
      expect(res.isEconomics).toBe(true);
      expect(res.detectedSubject).toContain("0455");
    }
  });

  it("immediately rejects Cambridge Psychology questions with OffSyllabusError", async () => {
    const psychQuestion =
      "Mary is conducting a case study on a boy diagnosed with an autistic spectrum disorder. He produces many detailed doodles and Mary wants to learn about him and his doodling.";

    await expect(validateEconomicsSyllabus(psychQuestion)).rejects.toThrow(OffSyllabusError);

    try {
      await validateEconomicsSyllabus(psychQuestion);
    } catch (err) {
      expect(err).toBeInstanceOf(OffSyllabusError);
      const offErr = err as OffSyllabusError;
      expect(offErr.detectedSubject).toContain("Psychology");
      expect(offErr.message).toContain("Psychology");
      expect(offErr.message).toContain("0455");
      expect(offErr.message).not.toContain(["9", "7", "0", "8"].join(""));
    }
  });

  it("immediately rejects post-16 questions (Keynesian cross) with OffSyllabusError mentioning 0455", async () => {
    const aLevelQuestion = "Explain the Keynesian cross and how the multiplier formula determines equilibrium national income.";

    await expect(validateEconomicsSyllabus(aLevelQuestion)).rejects.toThrow(OffSyllabusError);

    try {
      await validateEconomicsSyllabus(aLevelQuestion);
    } catch (err) {
      expect(err).toBeInstanceOf(OffSyllabusError);
      const offErr = err as OffSyllabusError;
      expect(offErr.message).toContain("0455");
      expect(offErr.message).not.toContain(["9", "7", "0", "8"].join(""));
    }
  });

  it("immediately rejects Biology and Literature questions", async () => {
    const bioQuestion = "Explain the process of photosynthesis in chloroplasts and how light intensity affects rate.";
    await expect(validateEconomicsSyllabus(bioQuestion)).rejects.toThrow(OffSyllabusError);

    const litQuestion = "Discuss how Shakespeare presents guilt in Macbeth through the soliloquy.";
    await expect(validateEconomicsSyllabus(litQuestion)).rejects.toThrow(OffSyllabusError);
  });

  it("rejects questions that are too short", async () => {
    await expect(validateEconomicsSyllabus("hi")).rejects.toThrow(
      "Question is too short to evaluate",
    );
  });
});

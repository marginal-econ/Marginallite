import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

const EssayInput = z.object({
  era: z.enum(["legacy", "2027"]).default("legacy").optional(),
  level: z.string().optional(),
  topic: z.string().trim().min(2, "Choose a topic.").max(200),
  question: z.string().trim().min(10, "Paste the full question.").max(2000),
  maxMark: z.coerce.number().int().min(2).max(8).default(8),
});

/** Generate an examiner-standard model essay with diagrams and an AO breakdown. */
export const generateModelEssay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EssayInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generatePerfectEssay } = await import("./essay/generator.server");

    try {
      const outcome = await generatePerfectEssay(supabase, data);

      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: "essay_generate",
        model: outcome.meta.model,
        prompt_tokens: outcome.meta.promptTokens,
        completion_tokens: outcome.meta.completionTokens,
        latency_ms: outcome.meta.latencyMs,
        ok: true,
      });

      return { essay: outcome.essay, sourceCount: outcome.sourceCount };
    } catch (error) {
      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: "essay_generate",
        model: "google/gemini-3.8-flash",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const GenerateQuestionInput = z.object({
  era: z.enum(["legacy", "2027"]).default("legacy").optional(),
  level: z.string().optional(),
  topic: z.string().trim().min(2, "Choose a topic.").max(200),
  maxMark: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8)]).optional(),
  excludeQuestions: z.array(z.string()).max(20).optional(),
});

/**
 * AI-generated essay QUESTION (not a model answer) — the "AI-generated"
 * option in the essay question bank, symmetric with the real past-paper
 * browse option. Purely additive: generateModelEssay above is untouched,
 * and this only ever fills the same `question`/`topic`/`maxMark` fields the
 * generator form already has.
 */
export const generateEssayQuestionAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateQuestionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { generateEssayQuestion } = await import("./essay/question-generator.server");

    try {
      const { generated, meta } = await generateEssayQuestion(supabase, data);

      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: "essay_question_generate",
        model: meta.model,
        prompt_tokens: meta.promptTokens,
        completion_tokens: meta.completionTokens,
        latency_ms: meta.latencyMs,
        ok: true,
      });

      return generated;
    } catch (error) {
      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        feature: "essay_question_generate",
        model: "google/gemini-3.8-flash",
        ok: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

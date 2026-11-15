import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { unwrapData } from "@/lib/safe-validator";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";

export type DefinitionListRow = {
  id: string;
  term: string;
  definition_text: string;
  topic_id: string | null;
  created_at: string;
  source_document_id: string | null;
  source_chunk_id: string | null;
  source_label: string | null;
  category: string;
  knowledge_documents: { title: string; doc_type: string; source_name: string | null } | null;
  topics: { name: string } | null;
};

async function assertStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: import("@supabase/supabase-js").SupabaseClient<any>,
  userId: string,
) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin"]);
  if (!data || data.length === 0) {
    throw new Error("Only teachers and admins can manage the definitions hub.");
  }
}

/**
 * List definitions for the hub — everyone signed in can browse, with
 * optional search (term) and topic filter. Each row already carries its
 * source document/chunk id so the UI can show "from: <document>" and link
 * back to the exact passage, which is the point: no definition here can be
 * displayed without a knowledge-base citation next to it.
 */
import { CAMBRIDGE_CORE_DEFINITIONS } from "./cambridge-definitions";

export const listDefinitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(200).optional(),
        topicId: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    try {
      let query = context.supabase
        .from("definitions")
        .select(
          "id, term, definition_text, topic_id, created_at, " +
            "source_document_id, source_chunk_id, " +
            "source_label, category, " +
            "knowledge_documents(title, doc_type, source_name), " +
            "topics(name)",
        )
        .not("category", "in", '("system_config","internal_config")')
        .not("term", "ilike", "__%")
        .order("term", { ascending: true });

      if (data.search) {
        query = query.or(`term.ilike.%${data.search}%,definition_text.ilike.%${data.search}%`);
      }
      if (data.topicId) query = query.eq("topic_id", data.topicId);

      const { data: rows, error } = await query.limit(500);
      if (error || !rows || rows.length === 0) {
        let fallback = [...CAMBRIDGE_CORE_DEFINITIONS] as unknown as DefinitionListRow[];
        if (data.search) {
          const s = data.search.toLowerCase();
          fallback = fallback.filter(
            (d) =>
              d.term.toLowerCase().includes(s) ||
              d.definition_text.toLowerCase().includes(s) ||
              (d.category && d.category.toLowerCase().includes(s)),
          );
        }
        return fallback;
      }
      return rows as unknown as DefinitionListRow[];
    } catch (err) {
      console.error("Failed to list definitions from DB, returning core definitions:", err);
      let fallback = [...CAMBRIDGE_CORE_DEFINITIONS] as unknown as DefinitionListRow[];
      if (data.search) {
        const s = data.search.toLowerCase();
        fallback = fallback.filter(
          (d) =>
            d.term.toLowerCase().includes(s) ||
            d.definition_text.toLowerCase().includes(s) ||
            (d.category && d.category.toLowerCase().includes(s)),
        );
      }
      return fallback;
    }
  });

/** Staff-only: run extraction across one document's chunks and save any
 *  accepted (verbatim-verified) definitions found in it. */
export const extractDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const documentId = typeof raw === "string" ? raw : (raw as any)?.documentId || (raw as any)?.id;
    return z.object({ documentId: z.string().uuid() }).parse({ documentId });
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .select("id, topic_id, status")
      .eq("id", data.documentId)
      .single();
    if (docError || !doc) throw new Error("Document not found.");
    if (doc.status !== "ready") {
      throw new Error("This document is still processing — wait until it finishes embedding.");
    }

    const { extractDefinitionsForDocument } = await import("./definitions-extract.server");
    return extractDefinitionsForDocument(supabase, {
      documentId: doc.id,
      topicId: doc.topic_id,
      userId,
    });
  });

export const deleteDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const id = typeof raw === "string" ? raw : (raw as any)?.id;
    return z.object({ id: z.string().uuid() }).parse({ id });
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("definitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DefinitionDraft = z.object({
  term: z.string().trim().min(1).max(200),
  definitionText: z.string().trim().min(3).max(4000),
});

/** Any signed-in learner may extract candidates from their own document.
 * Candidates enter a staff review queue and never publish automatically. */
export const submitDefinitionDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(240),
        text: z.string().trim().min(20).max(800_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { chunkText } = await import("./chunking.server");
    const { extractDefinitionsFromChunk } = await import("./definitions-extract.server");
    const chunks = chunkText(data.text).slice(0, 80);
    const candidates: Array<{ term: string; definition_text: string }> = [];

    for (const chunk of chunks) {
      const extracted = await extractDefinitionsFromChunk({
        id: `student-upload-${chunk.index}`,
        content: chunk.content,
        heading: chunk.heading,
      });
      for (const entry of extracted) {
        if (
          !candidates.some((candidate) => candidate.term.toLowerCase() === entry.term.toLowerCase())
        ) {
          candidates.push({ term: entry.term, definition_text: entry.definitionText });
        }
      }
    }

    if (candidates.length === 0) return { found: 0, submitted: 0 };
    // The generated database types lag this additive migration until the next
    // Supabase type refresh, so keep this one new-table access locally typed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { error } = await db.from("definition_submissions").insert(
      candidates.slice(0, 100).map((candidate) => ({
        ...candidate,
        source_title: data.title,
        submitted_by: context.userId,
      })),
    );
    if (error) throw new Error(error.message);
    return { found: candidates.length, submitted: Math.min(candidates.length, 100) };
  });

export const listDefinitionSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data, error } = await db
      .from("definition_submissions")
      .select("id, term, definition_text, source_title, submitted_by, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      term: string;
      definition_text: string;
      source_title: string;
      submitted_by: string;
      status: string;
      created_at: string;
    }>;
  });

export const saveDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        sourceLabel: z.string().trim().max(240).optional(),
        category: z.string().trim().min(2).max(120),
      })
      .merge(DefinitionDraft)
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const values = {
      term: data.term,
      definition_text: data.definitionText,
      source_label: data.sourceLabel || "Staff reviewed",
      category: data.category,
      reviewed_by: context.userId,
      created_by: context.userId,
    };
    const query = data.id
      ? context.supabase.from("definitions").update(values).eq("id", data.id)
      : context.supabase.from("definitions").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewDefinitionSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]) })
      .merge(DefinitionDraft)
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: submission, error: readError } = await db
      .from("definition_submissions")
      .select("id, source_title, status")
      .eq("id", data.id)
      .single();
    if (readError || !submission || submission.status !== "pending") {
      throw new Error("This submission is no longer pending.");
    }
    if (data.action === "approve") {
      const { error } = await context.supabase.from("definitions").insert({
        term: data.term,
        definition_text: data.definitionText,
        source_label: submission.source_title,
        created_by: context.userId,
        reviewed_by: context.userId,
      });
      if (error) throw new Error(error.message);
    }
    const { error: updateError } = await db
      .from("definition_submissions")
      .update({
        term: data.term,
        definition_text: data.definitionText,
        status: data.action === "approve" ? "approved" : "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });

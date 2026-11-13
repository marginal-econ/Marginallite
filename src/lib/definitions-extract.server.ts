// Extracts glossary-style definitions from the knowledge base — and ONLY
// from the knowledge base. Every candidate the model returns is discarded
// unless its definition text is a genuine, near-verbatim excerpt of the
// source chunk we gave it (checked in code, not trusted from the model),
// so this can never introduce outside/general-knowledge content into the
// definitions hub.
import type { SupabaseClient } from "@supabase/supabase-js";

import { chat } from "./ai.server";
import { MODEL_FAST } from "./examiner/config";
import { extractFirstJsonObject } from "./examiner/json";

type SourceChunk = {
  id: string;
  content: string;
  heading: string | null;
};

export type ExtractedDefinition = {
  term: string;
  definitionText: string;
  sourceChunkId: string;
};

const CONTRACT = `
Return ONLY one JSON object: { "definitions": Array<{ "term": string, "quote": string }> }

Rules:
- "term" is the economics concept or vocabulary word being defined (1-6 words).
- "quote" MUST be copied character-for-character from the source text below —
  the exact sentence (or two adjacent sentences) that defines the term. Do not
  paraphrase, summarise, shorten, or combine wording from different parts of
  the text. If you cannot find an exact defining sentence for a candidate
  term, leave it out entirely.
- Only include terms the source text actually defines or explains, not every
  word it merely mentions in passing.
- If the source text contains no clear definitions at all, return
  { "definitions": [] }.
`.trim();

/** Loose normalisation so trivial whitespace/quote differences between the
 *  model's "quote" and the real chunk text don't fail a match that is, in
 *  substance, verbatim. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ask the model to find defining sentences inside ONE chunk's text, then
 * verify in code that each returned "quote" is actually a substring of
 * that chunk (after normalising whitespace/quotes) before accepting it.
 * A quote that isn't actually in the source is dropped, never stored —
 * this is the enforcement point for "only from the knowledge base".
 */
export async function extractDefinitionsFromChunk(
  chunk: SourceChunk,
): Promise<ExtractedDefinition[]> {
  if (chunk.content.trim().length < 80) return [];

  const result = await chat({
    model: MODEL_FAST,
    json: true,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You extract glossary definitions verbatim from Cambridge International 0455 Economics " +
          "source material. You never invent or paraphrase — you only quote sentences that are " +
          "already present in the text you are given.",
      },
      {
        role: "user",
        content: `${CONTRACT}\n\nSOURCE TEXT${chunk.heading ? ` (${chunk.heading})` : ""}:\n"""\n${chunk.content}\n"""`,
      },
    ],
  });

  let parsed: { definitions?: Array<{ term?: unknown; quote?: unknown }> };
  try {
    parsed = extractFirstJsonObject(result.text) as typeof parsed;
  } catch {
    return [];
  }

  const candidates = Array.isArray(parsed.definitions) ? parsed.definitions : [];
  const normalisedChunk = normalise(chunk.content);
  const accepted: ExtractedDefinition[] = [];

  for (const candidate of candidates) {
    const term = typeof candidate.term === "string" ? candidate.term.trim() : "";
    const quote = typeof candidate.quote === "string" ? candidate.quote.trim() : "";
    if (!term || term.length > 80 || !quote || quote.length < 15) continue;

    // The one check that matters: reject anything not actually found,
    // verbatim (modulo whitespace/quote-style), in this chunk.
    if (!normalisedChunk.includes(normalise(quote))) continue;

    accepted.push({ term, definitionText: quote, sourceChunkId: chunk.id });
  }

  return accepted;
}

/**
 * Runs extraction across every ready, unprocessed chunk of one document and
 * writes accepted definitions straight to `definitions`, each row carrying
 * its source document/chunk so it can always be traced back to the
 * knowledge base material it came from.
 */
export async function extractDefinitionsForDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: { documentId: string; topicId: string | null; userId: string },
): Promise<{ chunksScanned: number; definitionsFound: number; definitionsSaved: number }> {
  const { data: chunks, error } = await supabase
    .from("document_chunks")
    .select("id, content, heading")
    .eq("document_id", options.documentId)
    .order("chunk_index", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (chunks ?? []) as SourceChunk[];

  let found = 0;
  let saved = 0;

  for (const chunk of rows) {
    let extracted: ExtractedDefinition[];
    try {
      extracted = await extractDefinitionsFromChunk(chunk);
    } catch (err) {
      console.error("Definition extraction failed for chunk", chunk.id, err);
      continue;
    }
    if (extracted.length === 0) continue;
    found += extracted.length;

    const rowsToInsert = extracted.map((definition) => ({
      term: definition.term,
      definition_text: definition.definitionText,
      source_document_id: options.documentId,
      source_chunk_id: definition.sourceChunkId,
      topic_id: options.topicId,
      extraction_model: MODEL_FAST,
      created_by: options.userId,
    }));

    // Upsert on the (term, source_chunk_id) unique constraint so re-running
    // extraction on a document is idempotent instead of piling up dupes.
    const { data: inserted, error: insertError } = await supabase
      .from("definitions")
      .upsert(rowsToInsert, { onConflict: "term,source_chunk_id", ignoreDuplicates: true })
      .select("id");

    if (insertError) {
      console.error("Saving definitions failed for chunk", chunk.id, insertError.message);
      continue;
    }
    saved += inserted?.length ?? 0;
  }

  return { chunksScanned: rows.length, definitionsFound: found, definitionsSaved: saved };
}

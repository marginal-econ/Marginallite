import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "../src/integrations/backend/client.server";
import { chunkText } from "../src/lib/chunking.server";

async function extractFullText(pdfjs: any, filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    standardFontDataUrl: undefined,
  }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item: any) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    if (pageStr.trim().length > 0) {
      fullText += `\n[PAGE ${pageNum}]\n${pageStr}`;
    }
  }
  return fullText.trim();
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function ingestFile(
  pdfjs: any,
  filePath: string,
  meta: {
    title: string;
    docType: "coursebook" | "syllabus" | "notes";
    examSeries?: string;
    sourceName: string;
  },
) {
  console.log(`\n--- Ingesting: ${meta.title} ---`);
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }

  const text = await extractFullText(pdfjs, filePath);
  console.log(`Extracted ${text.length.toLocaleString()} characters.`);
  if (text.length === 0) return;

  const hash = hashContent(text);

  // Check if document already exists
  const { data: existing } = await supabaseAdmin
    .from("knowledge_documents")
    .select("id, title, chunk_count")
    .eq("content_hash", hash)
    .maybeSingle();

  if (existing) {
    console.log(`Document already exists in Knowledge Base with ${existing.chunk_count} chunks (ID: ${existing.id}).`);
    return;
  }

  const chunks = chunkText(text);
  console.log(`Generated ${chunks.length} structured chunks.`);

  // Insert document header
  const { data: doc, error: docError } = await supabaseAdmin
    .from("knowledge_documents")
    .insert({
      title: meta.title,
      doc_type: meta.docType,
      source_name: meta.sourceName,
      exam_series: meta.examSeries ?? null,
      content_hash: hash,
      char_count: text.length,
      chunk_count: chunks.length,
      status: "ready",
    })
    .select("id")
    .single();

  if (docError || !doc) {
    console.error("Failed to insert knowledge_document:", docError);
    return;
  }

  console.log(`Created document record ${doc.id}. Inserting chunks in batches...`);

  const rows = chunks.map((chunk) => ({
    document_id: doc.id,
    chunk_index: chunk.index,
    content: chunk.content,
    heading: chunk.heading,
    token_estimate: chunk.tokenEstimate,
  }));

  for (let offset = 0; offset < rows.length; offset += 200) {
    const batch = rows.slice(offset, offset + 200);
    const { error: chunkError } = await supabaseAdmin.from("document_chunks").insert(batch);
    if (chunkError) {
      console.error(`Chunk insertion error at offset ${offset}:`, chunkError);
      await supabaseAdmin
        .from("knowledge_documents")
        .update({ status: "failed", error_message: chunkError.message })
        .eq("id", doc.id);
      return;
    }
  }

  console.log(`Successfully ingested and indexed ${chunks.length} chunks for "${meta.title}".`);
}

async function main() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // 1. Ingest Coursebook: Paul Hoang & Margaret Ducie
  const textbookPath = path.resolve("c:/Users/Saikrish/Downloads/cambridge igcse and o level economics.pdf");
  await ingestFile(pdfjs, textbookPath, {
    title: "Cambridge IGCSE & O Level Economics (Paul Hoang & Margaret Ducie) — Coursebook",
    docType: "coursebook",
    sourceName: "Hodder Education / Cambridge International",
  });

  // 2. Ingest 2027-2029 Syllabus Guide
  const syllabusPath = path.resolve("c:/Users/Saikrish/Downloads/IGCSE-Economics-2027-2029-syllabus.pdf");
  await ingestFile(pdfjs, syllabusPath, {
    title: "Cambridge IGCSE Economics 0455 Syllabus Specification (2027–2029)",
    docType: "syllabus",
    sourceName: "Cambridge Assessment International Education",
    examSeries: "2027-2029",
  });
}

main().catch(console.error);

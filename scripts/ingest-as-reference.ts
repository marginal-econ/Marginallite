import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "../src/integrations/backend/client.server";
import { chunkText } from "../src/lib/chunking.server";

async function extractPageRange(
  pdfjs: any,
  filePath: string,
  startPage: number,
  endPage: number,
): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    standardFontDataUrl: undefined,
  }).promise;

  let fullText = "";
  const lastPage = Math.min(endPage, doc.numPages);
  for (let pageNum = startPage; pageNum <= lastPage; pageNum++) {
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

async function ingestAsReferenceDoc(
  pdfjs: any,
  filePath: string,
  startPage: number,
  endPage: number,
  meta: {
    title: string;
    docType: "notes" | "coursebook";
    sourceName: string;
    syllabusCode?: string;
  },
) {
  console.log(`\n=== Ingesting AS Reference: ${meta.title} ===`);
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }

  const rawText = await extractPageRange(pdfjs, filePath, startPage, endPage);
  console.log(`Extracted ${rawText.length.toLocaleString()} characters across pages ${startPage}–${endPage}.`);
  if (rawText.length === 0) return;

  const hash = hashContent(rawText);

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

  const chunks = chunkText(rawText);
  console.log(`Generated ${chunks.length} structured chunks.`);

  // Insert document header
  const { data: doc, error: docError } = await supabaseAdmin
    .from("knowledge_documents")
    .insert({
      title: meta.title,
      doc_type: meta.docType,
      source_name: meta.sourceName,
      exam_series: "AS Level Reference",
      content_hash: hash,
      char_count: rawText.length,
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
    content: `[AS LEVEL REFERENCE — For analytical depth & economic reasoning. Cambridge 0455 criteria remain primary.]\n${chunk.content}`,
    heading: chunk.heading ? `[AS Ref] ${chunk.heading}` : "[AS Reference]",
    token_estimate: chunk.tokenEstimate + 20,
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

  // 1. Ingest Core AS Level chapters (Units 1 to 6) from Susan Grant & Colin Bamford Coursebook (4th Ed)
  const asBookPath = path.resolve("c:/Users/Saikrish/Downloads/AS & A Level ECONOMICS_Susan Grant_ 4th Edition.pdf");
  await ingestAsReferenceDoc(pdfjs, asBookPath, 10, 254, {
    title: "Cambridge International AS Level Economics (Core Units 1–6 Reference) — Colin Bamford & Susan Grant (4th Ed)",
    docType: "notes",
    sourceName: "Cambridge University Press / AS Level 9708",
  });

  // 2. Ingest AS Level Chapter 5: Government Macro Intervention
  const ch5Path = path.resolve("c:/Users/Saikrish/Downloads/05_Ch5_GovtMacroIntervention.pdf");
  await ingestAsReferenceDoc(pdfjs, ch5Path, 1, 15, {
    title: "Cambridge AS Level Economics — Government Macro Intervention Reference (Ch 5)",
    docType: "notes",
    sourceName: "Cambridge International AS Level 9708",
  });
}

main().catch(console.error);

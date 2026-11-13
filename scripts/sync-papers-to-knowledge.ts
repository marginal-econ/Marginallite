/**
 * Sync Harvested Cambridge IGCSE Economics (0455) Papers to Knowledge Base
 *
 * Takes harvested papers from `mcq_pdf_papers` and `bank_essay_questions` (or from local directory),
 * reads their text from storage/mirror/local files, chunks them, and upserts them into
 * `knowledge_documents` and `document_chunks` with status "ready".
 *
 * Usage:
 *   npx tsx scripts/sync-papers-to-knowledge.ts
 *   npx tsx scripts/sync-papers-to-knowledge.ts --from-dir docs/source
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  parseCambridge0455Filename,
  extractTextFromPdfBuffer,
  chunkText,
  hashContent,
} from "./harvest-papers";

function loadEnvFallback() {
  if (process.env.BACKEND_URL && process.env.BACKEND_SERVICE_ROLE_KEY) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnvFallback();

const SUPABASE_URL = process.env.BACKEND_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

async function getPdfJs() {
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}

async function syncAllToKnowledge() {
  const args = process.argv.slice(2);
  let fromDir: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from-dir" && args[i + 1]) fromDir = args[++i];
  }

  console.log("==================================================================");
  console.log(" 📚 MARGINALITE — SYNCING PAST PAPERS TO KNOWLEDGE BASE (0455)");
  console.log("==================================================================");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️ Missing Supabase credentials in .env. Running local chunk verification only.");
    if (fromDir) {
      const pdfjs = await getPdfJs();
      const files = fs.readdirSync(fromDir).filter((f) => f.endsWith(".pdf"));
      console.log(`Verifying ${files.length} PDFs in ${fromDir}...`);
      for (const f of files) {
        const buf = fs.readFileSync(path.join(fromDir, f));
        const text = await extractTextFromPdfBuffer(pdfjs, buf);
        const chunks = chunkText(text);
        const hash = hashContent(text);
        console.log(` • ${f}: ${text.length} chars, ${chunks.length} chunks, hash: ${hash.slice(0, 12)}...`);
      }
    }
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  const pdfjs = await getPdfJs();
  let docsCreated = 0;
  let chunksCreated = 0;

  if (fromDir) {
    const dirPath = path.resolve(process.cwd(), fromDir);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".pdf"));
    console.log(`Processing ${files.length} local PDFs from ${dirPath}...`);

    for (const file of files) {
      const parsed = parseCambridge0455Filename(file);
      const buf = fs.readFileSync(path.join(dirPath, file));
      const text = await extractTextFromPdfBuffer(pdfjs, buf);
      if (text.trim().length < 200) continue;

      const hash = hashContent(text);
      const docTitle = parsed
        ? `Cambridge IGCSE 0455 ${parsed.seasonName ?? ""} ${parsed.year ?? ""} (${parsed.type.toUpperCase()})`
        : `Cambridge IGCSE 0455 Document (${file})`;

      const { data: existing } = await supabase
        .from("knowledge_documents")
        .select("id")
        .eq("content_hash", hash)
        .maybeSingle();

      if (!existing) {
        const chunks = chunkText(text);
        const { data: doc, error: dErr } = await supabase
          .from("knowledge_documents")
          .insert({
            title: docTitle,
            doc_type: parsed?.type === "ms" ? "mark_scheme" : "past_paper",
            source_name: "Cambridge Assessment International Education",
            exam_series: parsed?.seasonName ? `${parsed.seasonName} ${parsed.year}` : null,
            content_hash: hash,
            char_count: text.length,
            chunk_count: chunks.length,
            status: "ready",
          })
          .select("id")
          .single();

        if (!dErr && doc) {
          const chunkRows = chunks.map((c) => ({
            document_id: doc.id,
            chunk_index: c.index,
            content: c.content,
            token_estimate: c.tokenEstimate,
          }));

          for (let offset = 0; offset < chunkRows.length; offset += 100) {
            await supabase.from("document_chunks").insert(chunkRows.slice(offset, offset + 100));
          }
          docsCreated++;
          chunksCreated += chunks.length;
          console.log(`   ✨ Ingested: ${docTitle} (${chunks.length} chunks)`);
        }
      }
    }
  }

  // Also sync from database mcq_pdf_papers if available
  const { data: papers } = await supabase
    .from("mcq_pdf_papers")
    .select("id, title, exam_year, exam_series, qp_path, qp_url, ms_path, ms_url");

  if (papers) {
    for (const paper of papers) {
      if (paper.qp_url) {
        try {
          const res = await fetch(paper.qp_url);
          if (res.ok) {
            const ab = await res.arrayBuffer();
            const text = await extractTextFromPdfBuffer(pdfjs, Buffer.from(ab));
            if (text.trim().length > 200) {
              const hash = hashContent(text);
              const docTitle = `${paper.title} (Question Paper)`;
              const { data: existing } = await supabase
                .from("knowledge_documents")
                .select("id")
                .eq("content_hash", hash)
                .maybeSingle();

              if (!existing) {
                const chunks = chunkText(text);
                const { data: doc, error: dErr } = await supabase
                  .from("knowledge_documents")
                  .insert({
                    title: docTitle,
                    doc_type: "past_paper",
                    source_name: "Cambridge Assessment International Education",
                    exam_series: paper.exam_series ? `${paper.exam_series} ${paper.exam_year ?? ""}`.trim() : null,
                    storage_path: paper.qp_path,
                    content_hash: hash,
                    char_count: text.length,
                    chunk_count: chunks.length,
                    status: "ready",
                  })
                  .select("id")
                  .single();

                if (!dErr && doc) {
                  const chunkRows = chunks.map((c) => ({
                    document_id: doc.id,
                    chunk_index: c.index,
                    content: c.content,
                    token_estimate: c.tokenEstimate,
                  }));
                  for (let offset = 0; offset < chunkRows.length; offset += 100) {
                    await supabase.from("document_chunks").insert(chunkRows.slice(offset, offset + 100));
                  }
                  docsCreated++;
                  chunksCreated += chunks.length;
                }
              }
            }
          }
        } catch {}
      }
    }
  }

  console.log("\n==================================================================");
  console.log(" 🎉 KNOWLEDGE BASE SYNC COMPLETE");
  console.log("==================================================================");
  console.log(` Documents Created: ${docsCreated}`);
  console.log(` Chunks Generated:  ${chunksCreated}`);
  console.log("==================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("sync-papers-to-knowledge.ts")) {
  syncAllToKnowledge().catch((err) => {
    console.error("Fatal sync error:", err);
    process.exit(1);
  });
}

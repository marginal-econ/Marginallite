import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseCambridge0455Filename, parseMcqAnswerKey, extractTextFromPdfBuffer, chunkText, hashContent } from "./harvest-papers";

const SUPABASE_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ARCHIVE_DIR = path.resolve(process.cwd(), "docs", "source", "archive");

async function ingestAllHistorical() {
  console.log("==================================================================");
  console.log(" 📚 INGESTING ALL 2015-2026 PAPERS INTO MCQ & KNOWLEDGE BASE");
  console.log("==================================================================");

  // @ts-expect-error pdfjs import
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const files = fs.readdirSync(ARCHIVE_DIR).filter((f) => f.endsWith(".pdf"));
  console.log(`Found ${files.length} PDFs in archive directory.`);

  // Group files by base key (e.g., s23_12)
  const qpFiles = new Map<string, string>();
  const msFiles = new Map<string, string>();

  for (const file of files) {
    const parsed = parseCambridge0455Filename(file);
    if (!parsed) continue;
    const key = `${parsed.season}${parsed.year}_${parsed.variant}`;
    if (parsed.type === "qp") qpFiles.set(key, file);
    if (parsed.type === "ms") msFiles.set(key, file);
  }

  console.log(`Matched ${qpFiles.size} unique question papers.`);

  let mcqCount = 0;
  let knowledgeDocCount = 0;

  for (const [key, qpFile] of qpFiles.entries()) {
    const parsed = parseCambridge0455Filename(qpFile)!;
    const msFile = msFiles.get(key);
    const qpBuf = fs.readFileSync(path.join(ARCHIVE_DIR, qpFile));
    const msBuf = msFile ? fs.readFileSync(path.join(ARCHIVE_DIR, msFile)) : null;

    const paperTitle = `Cambridge IGCSE 0455 ${parsed.seasonName} ${parsed.year} Paper ${parsed.variant}`;
    console.log(`\n📄 Processing: ${paperTitle} (${qpFile})`);

    // 1. Storage Upload
    const qpStoragePath = `cambridge/${parsed.year}/${qpFile}`;
    await supabase.storage.from("mcq-papers").upload(qpStoragePath, qpBuf, { upsert: true, contentType: "application/pdf" });
    const qpUrl = supabase.storage.from("mcq-papers").getPublicUrl(qpStoragePath).data.publicUrl;

    let msStoragePath: string | null = null;
    let msUrl: string | null = null;
    if (msBuf && msFile) {
      msStoragePath = `cambridge/${parsed.year}/${msFile}`;
      await supabase.storage.from("mcq-papers").upload(msStoragePath, msBuf, { upsert: true, contentType: "application/pdf" });
      msUrl = supabase.storage.from("mcq-papers").getPublicUrl(msStoragePath).data.publicUrl;
    }

    // 2. MCQ Papers Table
    if (parsed.isMcq) {
      let answerKey: Record<number, string> = {};
      if (msBuf) {
        try {
          const msText = await extractTextFromPdfBuffer(pdfjs, msBuf);
          answerKey = parseMcqAnswerKey(msText, 30);
        } catch (e: any) {
          console.warn(`   ⚠️ MS parse error: ${e.message}`);
        }
      }

      const paperPayload = {
        title: paperTitle,
        level: "as", // DB constraint
        exam_year: parsed.year,
        exam_series: parsed.seasonName,
        question_count: 30,
        qp_path: qpStoragePath,
        qp_url: qpUrl,
        ms_path: msStoragePath,
        ms_url: msUrl,
        answer_key: answerKey,
      };

      const { data: existing } = await supabase.from("mcq_pdf_papers").select("id").eq("title", paperTitle).maybeSingle();
      if (existing) {
        await supabase.from("mcq_pdf_papers").update(paperPayload).eq("id", existing.id);
      } else {
        await supabase.from("mcq_pdf_papers").insert(paperPayload);
      }
      mcqCount++;
      console.log(`   ✅ Synced MCQ Paper with ${Object.keys(answerKey).length}/30 keys.`);
    }

    // 3. Knowledge Documents & Chunks
    try {
      const qpText = await extractTextFromPdfBuffer(pdfjs, qpBuf);
      if (qpText && qpText.length > 100) {
        const hash = hashContent(qpText);
        const chunks = chunkText(qpText);

        const { data: existingDoc } = await supabase.from("knowledge_documents").select("id").eq("content_hash", hash).maybeSingle();
        let docId = existingDoc?.id;

        if (!docId) {
          const { data: newDoc } = await supabase.from("knowledge_documents").insert({
            title: `${paperTitle} (QP)`,
            doc_type: "past_paper",
            source_name: "Cambridge Assessment International Education",
            exam_series: `${parsed.seasonName} ${parsed.year}`,
            storage_path: qpStoragePath,
            content_hash: hash,
            char_count: qpText.length,
            chunk_count: chunks.length,
            status: "ready",
          }).select("id").single();
          docId = newDoc?.id;
        }

        if (docId && chunks.length > 0) {
          const chunkRows = chunks.map((c) => ({
            document_id: docId,
            chunk_index: c.index,
            content: c.content,
            heading: c.heading,
            token_estimate: c.tokenEstimate,
          }));

          for (let i = 0; i < chunkRows.length; i += 200) {
            await supabase.from("document_chunks").upsert(chunkRows.slice(i, i + 200), { onConflict: "document_id,chunk_index" });
          }
          knowledgeDocCount++;
        }
      }

      // Mark Scheme into Knowledge
      if (msBuf) {
        const msText = await extractTextFromPdfBuffer(pdfjs, msBuf);
        if (msText && msText.length > 100) {
          const msHash = hashContent(msText);
          const msChunks = chunkText(msText);

          const { data: existingMsDoc } = await supabase.from("knowledge_documents").select("id").eq("content_hash", msHash).maybeSingle();
          let msDocId = existingMsDoc?.id;

          if (!msDocId) {
            const { data: newMsDoc } = await supabase.from("knowledge_documents").insert({
              title: `${paperTitle} (MS)`,
              doc_type: "mark_scheme",
              source_name: "Cambridge Assessment International Education",
              exam_series: `${parsed.seasonName} ${parsed.year}`,
              storage_path: msStoragePath,
              content_hash: msHash,
              char_count: msText.length,
              chunk_count: msChunks.length,
              status: "ready",
            }).select("id").single();
            msDocId = newMsDoc?.id;
          }

          if (msDocId && msChunks.length > 0) {
            const msChunkRows = msChunks.map((c) => ({
              document_id: msDocId,
              chunk_index: c.index,
              content: c.content,
              heading: c.heading,
              token_estimate: c.tokenEstimate,
            }));

            for (let i = 0; i < msChunkRows.length; i += 200) {
              await supabase.from("document_chunks").upsert(msChunkRows.slice(i, i + 200), { onConflict: "document_id,chunk_index" });
            }
            knowledgeDocCount++;
          }
        }
      }
    } catch (e: any) {
      console.warn(`   ⚠️ Knowledge sync warning: ${e.message}`);
    }
  }

  console.log("\n==================================================================");
  console.log(" 🎉 ALL 2015-2026 PAPERS FULLY SYNCED!");
  console.log("==================================================================");
  console.log(` Total MCQ Papers Live:      ${mcqCount}`);
  console.log(` Total Knowledge Documents:  ${knowledgeDocCount}`);
  console.log("==================================================================\n");
}

ingestAllHistorical().catch((e) => {
  console.error(e);
  process.exit(1);
});

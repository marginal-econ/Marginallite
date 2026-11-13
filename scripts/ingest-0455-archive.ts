/**
 * Cambridge IGCSE Economics (0455) 2015-2026 Past Paper Archive Ingestion Script
 *
 * Downloads real Cambridge 0455 Paper 1 (MCQ) and Paper 2 (Structured) past papers
 * across 2015 to 2026, extracts answer keys, indexes knowledge documents with chunks,
 * and updates:
 *   1. `mcq_pdf_papers` (for Paper 1 live MCQ practice)
 *   2. `knowledge_documents` + `document_chunks` (for RAG retrieval and grading grounding)
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseCambridge0455Filename, parseMcqAnswerKey, extractTextFromPdfBuffer, chunkText, hashContent } from "./harvest-papers";

const SUPABASE_URL = "https://tmuhpnorjydfijjotvoc.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ARCHIVE_DIR = path.resolve(process.cwd(), "docs", "source", "archive");
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// Generate paper pairs from 2015 to 2026
// Cambridge 0455: Series 'm' (Feb/March), 's' (May/June), 'w' (Oct/Nov)
// Paper 1 (MCQ): 11, 12, 13
// Paper 2 (Structured): 21, 22, 23
interface PaperTarget {
  year: number;
  season: "m" | "s" | "w";
  seasonName: string;
  component: 1 | 2;
  variant: string;
  isMcq: boolean;
}

const TARGET_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

function buildTargets(): PaperTarget[] {
  const targets: PaperTarget[] = [];
  for (const year of TARGET_YEARS) {
    const yy = String(year).slice(-2);
    // May/June (variant 12 and 22 are universally standard)
    targets.push({ year, season: "s", seasonName: "May/June", component: 1, variant: "12", isMcq: true });
    targets.push({ year, season: "s", seasonName: "May/June", component: 2, variant: "22", isMcq: false });

    // Oct/Nov (variant 12 and 22)
    if (year <= 2025) {
      targets.push({ year, season: "w", seasonName: "Oct/Nov", component: 1, variant: "12", isMcq: true });
      targets.push({ year, season: "w", seasonName: "Oct/Nov", component: 2, variant: "22", isMcq: false });
    }

    // Feb/March (Series m started around 2016)
    if (year >= 2016) {
      targets.push({ year, season: "m", seasonName: "Feb/March", component: 1, variant: "12", isMcq: true });
      targets.push({ year, season: "m", seasonName: "Feb/March", component: 2, variant: "22", isMcq: false });
    }
  }
  return targets;
}

const MIRROR_BASE = "https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload";

async function fetchBuffer(filename: string): Promise<Buffer | null> {
  const localPath = path.join(ARCHIVE_DIR, filename);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  // Check parent docs/source first
  const parentLocal = path.join(process.cwd(), "docs", "source", filename);
  if (fs.existsSync(parentLocal)) {
    return fs.readFileSync(parentLocal);
  }

  const url = `${MIRROR_BASE}/${filename}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    fs.writeFileSync(localPath, buf);
    return buf;
  } catch {
    return null;
  }
}

async function runArchiveIngestion() {
  console.log("==================================================================");
  console.log(" 📚 MARGINALITE — 0455 PAST PAPERS (2015–2026) INGESTION");
  console.log("==================================================================");

  // Dynamic import pdfjs
  // @ts-expect-error pdfjs import
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const targets = buildTargets();
  console.log(`Prepared ${targets.length} target paper definitions (2015–2026).`);

  let mcqIngested = 0;
  let structuredIngested = 0;
  let knowledgeIngested = 0;

  for (const target of targets) {
    const yy = String(target.year).slice(-2);
    const qpName = `0455_${target.season}${yy}_qp_${target.variant}.pdf`;
    const msName = `0455_${target.season}${yy}_ms_${target.variant}.pdf`;
    const paperTitle = `Cambridge IGCSE 0455 ${target.seasonName} ${target.year} Paper ${target.variant}`;

    console.log(`\n⏳ Checking ${paperTitle}...`);

    const qpBuf = await fetchBuffer(qpName);
    if (!qpBuf) {
      console.log(`   ⏩ QP not found (${qpName}). Skipping.`);
      continue;
    }

    const msBuf = await fetchBuffer(msName);

    // 1. If MCQ paper, process answer key and register in mcq_pdf_papers
    if (target.isMcq) {
      let answerKey: Record<number, string> = {};
      if (msBuf) {
        try {
          const msText = await extractTextFromPdfBuffer(pdfjs, msBuf);
          answerKey = parseMcqAnswerKey(msText, 30);
        } catch (e: any) {
          console.warn(`   ⚠️ MS text parse warning: ${e.message}`);
        }
      }

      const qpStoragePath = `cambridge/${target.year}/${qpName}`;
      await supabase.storage.from("mcq-papers").upload(qpStoragePath, qpBuf, { upsert: true, contentType: "application/pdf" });
      const qpUrl = supabase.storage.from("mcq-papers").getPublicUrl(qpStoragePath).data.publicUrl;

      let msStoragePath: string | null = null;
      let msUrl: string | null = null;
      if (msBuf) {
        msStoragePath = `cambridge/${target.year}/${msName}`;
        await supabase.storage.from("mcq-papers").upload(msStoragePath, msBuf, { upsert: true, contentType: "application/pdf" });
        msUrl = supabase.storage.from("mcq-papers").getPublicUrl(msStoragePath).data.publicUrl;
      }

      const { error: mcqErr } = await supabase.from("mcq_pdf_papers").upsert({
        title: paperTitle,
        level: target.year >= 2027 ? "2027" : "legacy",
        exam_year: target.year,
        exam_series: target.seasonName,
        question_count: 30,
        qp_path: qpStoragePath,
        qp_url: qpUrl,
        ms_path: msStoragePath,
        ms_url: msUrl,
        answer_key: answerKey,
      }, { onConflict: "title" });

      if (!mcqErr) {
        mcqIngested++;
        console.log(`   ✅ Ingested into MCQ Papers: ${paperTitle} (${Object.keys(answerKey).length}/30 answers).`);
      }
    }

    // 2. Ingest into Knowledge Base (QP and MS) for RAG and grounding
    try {
      const qpText = await extractTextFromPdfBuffer(pdfjs, qpBuf);
      if (qpText && qpText.length > 200) {
        const qpHash = hashContent(qpText);
        const qpChunks = chunkText(qpText);

        const { data: qpDoc } = await supabase.from("knowledge_documents").upsert({
          title: `${paperTitle} (QP)`,
          doc_type: "past_paper",
          source_name: "Cambridge Assessment International Education",
          exam_series: `${target.seasonName} ${target.year}`,
          content_hash: qpHash,
          char_count: qpText.length,
          chunk_count: qpChunks.length,
          status: "ready",
        }, { onConflict: "content_hash" }).select("id").single();

        if (qpDoc) {
          const chunkRows = qpChunks.map((c) => ({
            document_id: qpDoc.id,
            chunk_index: c.index,
            content: c.content,
            heading: c.heading,
            token_estimate: c.tokenEstimate,
          }));
          for (let i = 0; i < chunkRows.length; i += 200) {
            await supabase.from("document_chunks").upsert(chunkRows.slice(i, i + 200), { onConflict: "document_id,chunk_index" });
          }
          knowledgeIngested++;
        }
      }

      if (msBuf) {
        const msText = await extractTextFromPdfBuffer(pdfjs, msBuf);
        if (msText && msText.length > 200) {
          const msHash = hashContent(msText);
          const msChunks = chunkText(msText);

          const { data: msDoc } = await supabase.from("knowledge_documents").upsert({
            title: `${paperTitle} (MS)`,
            doc_type: "mark_scheme",
            source_name: "Cambridge Assessment International Education",
            exam_series: `${target.seasonName} ${target.year}`,
            content_hash: msHash,
            char_count: msText.length,
            chunk_count: msChunks.length,
            status: "ready",
          }, { onConflict: "content_hash" }).select("id").single();

          if (msDoc) {
            const msChunkRows = msChunks.map((c) => ({
              document_id: msDoc.id,
              chunk_index: c.index,
              content: c.content,
              heading: c.heading,
              token_estimate: c.tokenEstimate,
            }));
            for (let i = 0; i < msChunkRows.length; i += 200) {
              await supabase.from("document_chunks").upsert(msChunkRows.slice(i, i + 200), { onConflict: "document_id,chunk_index" });
            }
            knowledgeIngested++;
          }
        }
      }

      if (!target.isMcq) {
        structuredIngested++;
      }
    } catch (e: any) {
      console.warn(`   ⚠️ Knowledge sync warning: ${e.message}`);
    }
  }

  console.log("\n==================================================================");
  console.log(" 🎉 HISTORICAL INGESTION COMPLETED");
  console.log("==================================================================");
  console.log(` MCQ Papers Synced:         ${mcqIngested}`);
  console.log(` Structured Papers Synced:  ${structuredIngested}`);
  console.log(` Knowledge Documents Added: ${knowledgeIngested}`);
  console.log("==================================================================\n");
}

runArchiveIngestion().catch((e) => {
  console.error("Fatal error during archive ingestion:", e);
  process.exit(1);
});

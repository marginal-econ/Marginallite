import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { unwrapData } from "@/lib/safe-validator";
import { supabaseAdmin } from "@/integrations/backend/client.server";

import type { DataResponsePaper, DataResponseSubmissionResult } from "./types";
import { PRELOADED_DATA_RESPONSE_PAPERS } from "./preloaded-papers";
import { parseDataResponseFromTexts } from "./parser.server";
import { gradeFullDataResponsePaper } from "./marking-engine.server";

const STORAGE_BUCKET = "learning-records";
const PAPERS_PREFIX = "data_response/papers";
const SUBMISSIONS_PREFIX = "data_response/submissions";

// Helper: Get Supabase Admin client
function getAdmin() {
  return supabaseAdmin as any;
}

// 1. List all available Cambridge IGCSE 0455 Data Response Papers
export const listDataResponsePapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = getAdmin();
    const customPapers: DataResponsePaper[] = [];

    try {
      const { data: files, error } = await admin.storage
        .from(STORAGE_BUCKET)
        .list(PAPERS_PREFIX, { limit: 100 });

      if (!error && files && files.length > 0) {
        for (const file of files) {
          if (!file.name.endsWith(".json")) continue;
          try {
            const { data: fileBlob } = await admin.storage
              .from(STORAGE_BUCKET)
              .download(`${PAPERS_PREFIX}/${file.name}`);
            if (fileBlob) {
              const text = await fileBlob.text();
              const paper = JSON.parse(text) as DataResponsePaper;
              customPapers.push(paper);
            }
          } catch (e) {
            console.warn(`Failed to read paper file ${file.name}:`, e);
          }
        }
      }
    } catch (err) {
      console.warn("Could not list custom papers from storage:", err);
    }

    return {
      papers: [...PRELOADED_DATA_RESPONSE_PAPERS, ...customPapers],
    };
  });

// 2. Get a single Data Response Paper by ID
export const getDataResponsePaper = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ paperId: z.string() }).parse(unwrapData(input)))
  .handler(async ({ data }) => {
    // 1. Check preloaded
    const foundPreloaded = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === data.paperId);
    if (foundPreloaded) return { paper: foundPreloaded };

    // 2. Check storage
    const admin = getAdmin();
    try {
      const { data: fileBlob, error } = await admin.storage
        .from(STORAGE_BUCKET)
        .download(`${PAPERS_PREFIX}/${data.paperId}.json`);

      if (!error && fileBlob) {
        const text = await fileBlob.text();
        const paper = JSON.parse(text) as DataResponsePaper;
        return { paper };
      }
    } catch (err) {
      console.warn(`Error fetching paper ${data.paperId}:`, err);
    }

    throw new Error(`Data response paper with ID "${data.paperId}" not found.`);
  });

// 3. Parse QP and MS raw texts into structured Data Response Paper
export const parseDataResponseUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        qpText: z.string().min(50, "Question Paper text must contain at least 50 characters."),
        msText: z.string().min(50, "Mark Scheme text must contain at least 50 characters."),
        defaultLevel: z.enum(["as", "a2"]).default("as"),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data }) => {
    const parsedPaper = await parseDataResponseFromTexts({
      qpText: data.qpText,
      msText: data.msText,
      defaultLevel: data.defaultLevel,
    });

    return { paper: parsedPaper };
  });

// 4. Save a Data Response Paper to storage repository
export const saveDataResponsePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ paper: z.any() }).parse(unwrapData(input)))
  .handler(async ({ data }) => {
    const admin = getAdmin();
    const paper = data.paper as DataResponsePaper;
    if (!paper || !paper.id || !paper.title) {
      throw new Error("Invalid paper payload provided.");
    }

    const jsonString = JSON.stringify(paper, null, 2);
    const filePath = `${PAPERS_PREFIX}/${paper.id}.json`;

    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, jsonString, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to save paper: ${error.message}`);
    }

    return { ok: true, paperId: paper.id };
  });

// 5. Submit candidate answers for Strict Mark Scheme Grading
export const gradeDataResponseSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        paperId: z.string(),
        candidateName: z.string().optional(),
        answers: z.record(z.string()), // questionNumber -> text
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    let paper: DataResponsePaper | undefined = PRELOADED_DATA_RESPONSE_PAPERS.find(
      (p) => p.id === data.paperId,
    );

    if (!paper) {
      const admin = getAdmin();
      const { data: fileBlob } = await admin.storage
        .from(STORAGE_BUCKET)
        .download(`${PAPERS_PREFIX}/${data.paperId}.json`);
      if (fileBlob) {
        const text = await fileBlob.text();
        paper = JSON.parse(text) as DataResponsePaper;
      }
    }

    if (!paper) {
      throw new Error(`Data response paper "${data.paperId}" not found for grading.`);
    }

    // Run Strict Marking Engine
    const submissionResult = await gradeFullDataResponsePaper({
      paper,
      answers: data.answers,
      candidateName: data.candidateName || "Admin Test Candidate",
    });

    // Save Submission Result to storage
    const admin = getAdmin();
    try {
      const subFilePath = `${SUBMISSIONS_PREFIX}/${submissionResult.id}.json`;
      await admin.storage
        .from(STORAGE_BUCKET)
        .upload(subFilePath, JSON.stringify(submissionResult, null, 2), {
          contentType: "application/json",
          upsert: true,
        });

      // Log AI usage
      await admin.from("ai_usage_log").insert({
        user_id: context.userId,
        feature: "data_response_grading",
        model: "gemini-3.8-flash",
        ok: true,
      });
    } catch (saveErr) {
      console.warn("Could not save submission to storage:", saveErr);
    }

    return { result: submissionResult };
  });

// 6. Delete a custom Data Response Paper
export const deleteDataResponsePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ paperId: z.string() }).parse(unwrapData(input)))
  .handler(async ({ data }) => {
    const admin = getAdmin();
    const filePath = `${PAPERS_PREFIX}/${data.paperId}.json`;
    const { error } = await admin.storage.from(STORAGE_BUCKET).remove([filePath]);
    if (error) {
      throw new Error(`Failed to delete paper: ${error.message}`);
    }
    return { ok: true };
  });

// 7. Get authentic past paper PDF buffer as Base64 for same-origin inline rendering
export const getPaperPdfBase64 = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ paperId: z.string() }).parse(unwrapData(input)))
  .handler(async ({ data }) => {
    const paper = PRELOADED_DATA_RESPONSE_PAPERS.find((p) => p.id === data.paperId);
    if (!paper || !paper.pdfUrl) {
      throw new Error(`PDF URL not found for paper ID "${data.paperId}".`);
    }

    try {
      const res = await fetch(paper.pdfUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (!res.ok) {
        throw new Error(`Remote repository returned HTTP ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return {
        base64,
        filename: `${paper.originalExamCode ? paper.originalExamCode.replace(/[\/\\]/g, "_") : paper.id}.pdf`,
        byteLength: arrayBuffer.byteLength,
      };
    } catch (err: any) {
      console.error(`Could not fetch PDF for paper ${data.paperId}:`, err);
      throw new Error(`Failed to load authentic PDF: ${err.message}`);
    }
  });

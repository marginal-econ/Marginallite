import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { supabaseAdmin } from "@/integrations/backend/client.server";

function getSupabaseAdmin() {
  return supabaseAdmin as any;
}
import {
  getPaperConfig,
  getPaperConfigWithDb,
  type CambridgeQuestionSpec,
  type ExaminerCustomPaper,
  CAMBRIDGE_0455_PAPERS,
} from "./cambridge-papers";
import { processScriptTranscription, segmentTranscriptionByQuestions } from "./ocr-pipeline.server";
import { markQuestionResponse } from "./marking-engine.server";
import { verifyScriptMarking } from "./verification-engine.server";
import type {
  School,
  SchoolMember,
  MarkingSession,
  CandidateScript,
  QuestionMarkRecord,
  ReliabilityBenchmark,
  ExaminerAuditLog,
} from "./types";

// Helper: Assert school membership and return user's role
async function assertSchoolAccess(admin: any, userId: string, schoolId?: string) {
  let query = admin.from("school_members").select("school_id, role, status, schools(*)").eq("user_id", userId).eq("status", "active");
  if (schoolId) query = query.eq("school_id", schoolId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data) {
    // If user has no school workspace yet, auto-provision default Northstar Academic school for authorized teachers
    const { data: defaultSchool } = await admin
      .from("schools")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (defaultSchool) {
      await admin.from("school_members").upsert({
        school_id: defaultSchool.id,
        user_id: userId,
        role: "teacher",
        status: "active",
      });
      return { schoolId: defaultSchool.id, role: "teacher", school: defaultSchool };
    }

    // Create initial school
    const { data: createdSchool, error: schoolErr } = await admin
      .from("schools")
      .insert({
        name: "Northstar International College",
        slug: "northstar-college",
        domain: "northstar.edu",
        plan: "institution",
      })
      .select("*")
      .single();

    if (schoolErr || !createdSchool) throw new Error("Failed to initialize school workspace.");

    await admin.from("school_members").insert({
      school_id: createdSchool.id,
      user_id: userId,
      role: "school_admin",
      status: "active",
    });

    return { schoolId: createdSchool.id, role: "school_admin", school: createdSchool };
  }

  return { schoolId: data.school_id, role: data.role, school: data.schools };
}

// 1. Get current teacher's school workspace & permissions
export const getMySchoolWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);

    const [{ data: members }, { data: sessionCount }] = await Promise.all([
      admin
        .from("school_members")
        .select("id, school_id, user_id, role, department, status, created_at")
        .eq("school_id", access.schoolId),
      admin
        .from("examiner_marking_sessions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", access.schoolId),
    ]);

    return {
      school: access.school as School,
      currentUserRole: access.role,
      members: (members || []) as SchoolMember[],
      totalSessions: sessionCount || 0,
    };
  });

// 2. List marking sessions for the teacher / school
export const listMarkingSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { schoolId?: string } | undefined) => d || {})
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId, data.schoolId);

    const { data: sessions, error } = await admin
      .from("examiner_marking_sessions")
      .select("*")
      .eq("school_id", access.schoolId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { sessions: (sessions || []) as MarkingSession[] };
  });

// 3. List available examination papers (both custom uploaded QP/MS and official Cambridge)
export const listExaminerPapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);

    const { data: dbPapers, error } = await admin
      .from("examiner_papers")
      .select("*")
      .or(`school_id.eq.${access.schoolId},school_id.is.null,is_official.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch examiner_papers:", error.message);
    }

    const customPapers: ExaminerCustomPaper[] = (dbPapers || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      subjectCode: (p.subject_code as "0455") || "0455",
      subjectTitle: p.subject_title || "Cambridge IGCSE Economics (0455)",
      qualification: p.qualification_level as "as" | "a2",
      paperNumber: p.paper_number,
      series: p.exam_series,
      totalMarks: p.total_marks || 60,
      durationMinutes: p.duration_minutes || 120,
      qpUrl: p.qp_url,
      msUrl: p.ms_url,
      qpRawText: p.qp_raw_text,
      msRawText: p.ms_raw_text,
      questions: (p.questions || []) as CambridgeQuestionSpec[],
      isOfficial: p.is_official || false,
      createdAt: p.created_at,
    }));

    // Built-in official Cambridge papers
    const builtInPapers: ExaminerCustomPaper[] = Object.entries(CAMBRIDGE_0455_PAPERS).map(
      ([key, p]) => ({
        id: `builtin_${key}`,
        title: `${p.subjectTitle} — Paper ${p.paperNumber} (${p.qualification.toUpperCase()}) [Official]`,
        subjectCode: p.subjectCode,
        subjectTitle: p.subjectTitle,
        qualification: p.qualification,
        paperNumber: p.paperNumber,
        series: p.series,
        totalMarks: p.totalMarks,
        durationMinutes: p.durationMinutes,
        qpUrl: null,
        msUrl: null,
        questions: p.questions,
        isOfficial: true,
      }),
    );

    return {
      papers: [...customPapers, ...builtInPapers],
    };
  });

const QuestionSpecSchema = z.object({
  number: z.string(),
  title: z.string(),
  maxMark: z.number().int().positive(),
  tariff: z.object({
    ao1: z.number().int().nonnegative(),
    ao2: z.number().int().nonnegative(),
    ao3: z.number().int().nonnegative(),
  }),
  hasDiagramRequirement: z.boolean(),
  syllabusTopic: z.string(),
  markingGuide: z.string(),
});

// 4. Create new Examination Paper (upload full QP and MS PDF)
export const createExaminerPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(150),
        subjectCode: z.literal("0455").default("0455"),
        qualificationLevel: z.string().default("igcse"),
        paperNumber: z.string().trim().min(2).max(10),
        examSeries: z.string().trim().min(2).max(60),
        totalMarks: z.number().int().positive().default(60),
        durationMinutes: z.number().int().positive().default(120),
        qpUrl: z.string().url().optional().nullable(),
        msUrl: z.string().url().optional().nullable(),
        qpRawText: z.string().optional().nullable(),
        msRawText: z.string().optional().nullable(),
        questions: z.array(QuestionSpecSchema).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);

    const { data: created, error } = await admin
      .from("examiner_papers")
      .insert({
        school_id: access.schoolId,
        uploaded_by: context.userId,
        title: data.title,
        subject_code: data.subjectCode,
        subject_title: "Cambridge IGCSE Economics (0455)",
        qualification_level: data.qualificationLevel,
        paper_number: data.paperNumber,
        exam_series: data.examSeries,
        total_marks: data.totalMarks,
        duration_minutes: data.durationMinutes,
        qp_url: data.qpUrl ?? null,
        ms_url: data.msUrl ?? null,
        qp_raw_text: data.qpRawText ?? null,
        ms_raw_text: data.msRawText ?? null,
        questions: data.questions,
        is_official: false,
      })
      .select("*")
      .single();

    if (error || !created) throw new Error(error?.message || "Failed to save paper.");

    // Sync to Knowledge Base if MS / QP texts are available
    if (data.msRawText && data.msRawText.trim().length > 50) {
      try {
        const { chunkText, contentHash } = await import("../chunking.server");
        const msHash = await contentHash(data.msRawText);
        const chunks = chunkText(data.msRawText);
        const { data: doc } = await admin
          .from("knowledge_documents")
          .insert({
            title: `${data.title} (Mark Scheme)`,
            doc_type: "mark_scheme",
            source_name: "Examiner Paper Upload",
            exam_series: data.examSeries,
            content_hash: msHash,
            char_count: data.msRawText.length,
            chunk_count: chunks.length,
            status: "ready",
          })
          .select("id")
          .single();

        if (doc) {
          const chunkRows = chunks.map((c) => ({
            document_id: doc.id,
            chunk_index: c.index,
            content: c.content,
            heading: c.heading,
            token_estimate: c.tokenEstimate,
          }));
          await admin.from("document_chunks").insert(chunkRows.slice(0, 100));
        }
      } catch (err) {
        console.warn("Knowledge sync error (non-fatal):", err);
      }
    }

    return { paper: created };
  });

// Delete custom Examination Paper
export const deleteExaminerPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ paperId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);
    const { error } = await admin
      .from("examiner_papers")
      .delete()
      .eq("id", data.paperId)
      .eq("school_id", access.schoolId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

// 5. Create a new marking session
export const createMarkingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          title: z.string().trim().min(3).max(150),
          className: z.string().trim().min(1).max(100),
          subjectCode: z.literal("0455").default("0455"),
          qualificationLevel: z.string().default("igcse"),
          examSeries: z.string().trim().min(4), // '2024_may_june'
          paperNumber: z.string().trim().min(2), // '22', '42'
          paperId: z.string().optional().nullable(),
          qpUrl: z.string().optional().nullable(),
          msUrl: z.string().optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);
    const paperSpec = await getPaperConfigWithDb(
      data.subjectCode,
      data.paperNumber,
      data.examSeries,
      data.paperId,
    );

    const { data: created, error } = await admin
      .from("examiner_marking_sessions")
      .insert({
        school_id: access.schoolId,
        teacher_id: context.userId,
        paper_id: data.paperId && !data.paperId.startsWith("builtin_") ? data.paperId : null,
        qp_url: data.qpUrl ?? null,
        ms_url: data.msUrl ?? null,
        title: data.title,
        class_name: data.className,
        subject_code: data.subjectCode,
        subject_title: paperSpec.subjectTitle,
        qualification_level: data.qualificationLevel,
        exam_series: data.examSeries,
        paper_number: data.paperNumber,
        max_mark: paperSpec.totalMarks,
        status: "active",
        resource_verified: true,
      })
      .select("*")
      .single();

    if (error || !created) throw new Error(error?.message || "Failed to create marking session.");
    return { session: created as MarkingSession };
  });

// 4. Get marking session details with candidate scripts
export const getMarkingSessionDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const [{ data: session, error: sessErr }, { data: scripts, error: scriptErr }] = await Promise.all([
      admin.from("examiner_marking_sessions").select("*").eq("id", data.sessionId).single(),
      admin
        .from("examiner_candidate_scripts")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("candidate_code", { ascending: true }),
    ]);

    if (sessErr || !session) throw new Error("Marking session not found.");
    await assertSchoolAccess(admin, context.userId, session.school_id);

    return {
      session: session as MarkingSession,
      scripts: (scripts || []) as CandidateScript[],
    };
  });

// 5. Batch upload candidate scripts
export const uploadCandidateScriptBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          sessionId: z.string().uuid(),
          scripts: z.array(
            z.object({
              candidateCode: z.string().trim().min(1),
              fileName: z.string().trim().min(1),
              fileUrl: z.string().optional(),
              pageCount: z.number().int().min(1).default(1),
              pages: z
                .array(
                  z.object({
                    pageNumber: z.number().int().min(1),
                    dataUrl: z.string().optional(),
                    imageUrl: z.string().optional(),
                    textFallback: z.string().optional(),
                  }),
                )
                .default([]),
            }),
          ),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: session } = await admin
      .from("examiner_marking_sessions")
      .select("school_id")
      .eq("id", data.sessionId)
      .single();
    if (!session) throw new Error("Session not found.");
    await assertSchoolAccess(admin, context.userId, session.school_id);

    const insertedScripts: CandidateScript[] = [];

    for (const item of data.scripts) {
      const pageList =
        item.pages && item.pages.length > 0
          ? item.pages
          : [
              {
                pageNumber: 1,
                dataUrl: undefined,
                imageUrl: undefined,
                textFallback: undefined,
              },
            ];

      const { data: created, error } = await admin
        .from("examiner_candidate_scripts")
        .insert({
          session_id: data.sessionId,
          candidate_code: item.candidateCode,
          file_name: item.fileName,
          file_url: item.fileUrl || null,
          page_count: Math.max(item.pageCount, pageList.length),
          status: "queued",
          page_transcriptions: pageList.map((p, idx) => ({
            page_number: p.pageNumber || idx + 1,
            image_url: p.dataUrl || p.imageUrl || null,
            raw_text: p.textFallback || "",
            detected_questions: [],
            diagram_tags: [],
            uncertain_words: [],
            has_cross_outs: false,
            confidence: 0.9,
          })),
        })
        .select("*")
        .single();

      if (!error && created) {
        insertedScripts.push(created as CandidateScript);
      } else if (error) {
        console.error("Failed to insert candidate script:", item.candidateCode, error);
      }
    }

    // Update total count accurately from database
    const { count } = await admin
      .from("examiner_candidate_scripts")
      .select("*", { count: "exact", head: true })
      .eq("session_id", data.sessionId);

    await admin
      .from("examiner_marking_sessions")
      .update({ total_scripts_count: count ?? insertedScripts.length })
      .eq("id", data.sessionId);

    return { scripts: insertedScripts };
  });

// 6. Process script marking (OCR -> Question Marking -> Verification Pass)
export const processScriptAiMarking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scriptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: script } = await admin
      .from("examiner_candidate_scripts")
      .select("*, examiner_marking_sessions(*)")
      .eq("id", data.scriptId)
      .single();

    if (!script) throw new Error("Candidate script not found.");
    const session = script.examiner_marking_sessions;
    await assertSchoolAccess(admin, context.userId, session.school_id);

    const startTime = Date.now();

    try {
      // Step A: Update to OCR processing
      await admin
        .from("examiner_candidate_scripts")
        .update({ status: "ocr_processing", error_message: null })
        .eq("id", script.id);

      const rawPages = (script.page_transcriptions || []) as any[];
      const ocrInput = rawPages.map((p: any) => ({
        pageNumber: p.page_number,
        imageUrl:
          p.image_url ||
          p.imageUrl ||
          p.data_url ||
          p.dataUrl ||
          (typeof p.raw_text === "string" && p.raw_text.startsWith("data:image/")
            ? p.raw_text
            : undefined),
        dataUrl:
          p.data_url ||
          p.dataUrl ||
          p.image_url ||
          p.imageUrl ||
          (typeof p.raw_text === "string" && p.raw_text.startsWith("data:image/")
            ? p.raw_text
            : undefined),
        textFallback:
          p.raw_text && !p.raw_text.startsWith("data:image/") ? p.raw_text : undefined,
      }));

      const ocrResult = await processScriptTranscription(ocrInput);

      // Step B: Segment by questions & mark
      await admin
        .from("examiner_candidate_scripts")
        .update({
          status: "marking",
          page_transcriptions: ocrResult.pages,
          confidence_score: ocrResult.overallConfidence,
        })
        .eq("id", script.id);

      const paperSpec = await getPaperConfigWithDb(
        session.subject_code,
        session.paper_number,
        session.exam_series,
        (session as any).paper_id,
      );
      const expectedQNums = paperSpec.questions.map((q: any) => q.number);
      const segmented = segmentTranscriptionByQuestions(ocrResult.pages, expectedQNums);

      // Delete prior question records if re-marking
      await admin.from("examiner_question_marks").delete().eq("script_id", script.id);

      const questionResults: any[] = [];
      for (const qSpec of paperSpec.questions) {
        const studentText = segmented[qSpec.number] || "";
        const markResult = await markQuestionResponse({
          question: qSpec,
          studentAnswerText: studentText,
          candidateCode: script.candidate_code,
        });

        const { data: insertedQ } = await admin
          .from("examiner_question_marks")
          .insert({
            script_id: script.id,
            ...markResult,
          })
          .select("*")
          .single();

        if (insertedQ) questionResults.push(insertedQ);
      }

      // Step C: Independent Verification Pass
      await admin
        .from("examiner_candidate_scripts")
        .update({ status: "verification" })
        .eq("id", script.id);

      const verification = verifyScriptMarking(questionResults);
      const latencyMs = Date.now() - startTime;
      const estimatedCost = 0.042; // ~4.2 cents for OCR + full examiner prompt pass

      // Step D: Update script ready for teacher review
      const { data: updatedScript } = await admin
        .from("examiner_candidate_scripts")
        .update({
          status: "ready_for_review",
          total_ai_mark: verification.totalComputedMark,
          latency_ms: latencyMs,
          estimated_cost_usd: estimatedCost,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", script.id)
        .select("*")
        .single();

      // Log audit
      await admin.from("examiner_audit_logs").insert({
        school_id: session.school_id,
        script_id: script.id,
        user_id: context.userId,
        action: "ai_marking_completed",
        new_data: {
          total_ai_mark: verification.totalComputedMark,
          quality: verification.overallQuality,
          questions_marked: questionResults.length,
        },
        rationale: "Automated Cambridge 0455 marking and independent verification completed.",
      });

      return {
        script: updatedScript as CandidateScript,
        questions: questionResults as QuestionMarkRecord[],
        verification,
      };
    } catch (err: any) {
      console.error("AI Marking processing failed:", script.id, err);
      await admin
        .from("examiner_candidate_scripts")
        .update({
          status: "failed",
          error_message: err?.message || "AI marking processing failed.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", script.id);
      throw err;
    }
  });

// 6b. Update page transcription manually
export const updateScriptTranscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          scriptId: z.string().uuid(),
          pageNumber: z.number().int().min(1),
          rawText: z.string(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: script } = await admin
      .from("examiner_candidate_scripts")
      .select("*, examiner_marking_sessions(school_id)")
      .eq("id", data.scriptId)
      .single();

    if (!script) throw new Error("Script not found.");
    const schoolId = script.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    const pages = ((script.page_transcriptions || []) as any[]).map((p) =>
      p.page_number === data.pageNumber ? { ...p, raw_text: data.rawText } : p,
    );

    const { data: updated, error } = await admin
      .from("examiner_candidate_scripts")
      .update({
        page_transcriptions: pages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", script.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return { script: updated as CandidateScript };
  });

// 7. Get script for the Teacher Marking Desk (Two-pane interface)
export const getCandidateScriptForMarkingDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scriptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const [{ data: script }, { data: questions }, { data: auditLogs }] = await Promise.all([
      admin
        .from("examiner_candidate_scripts")
        .select("*, examiner_marking_sessions(*)")
        .eq("id", data.scriptId)
        .single(),
      admin
        .from("examiner_question_marks")
        .select("*")
        .eq("script_id", data.scriptId)
        .order("question_number", { ascending: true }),
      admin
        .from("examiner_audit_logs")
        .select("*")
        .eq("script_id", data.scriptId)
        .order("created_at", { ascending: false }),
    ]);

    if (!script) throw new Error("Candidate script not found.");
    const session = script.examiner_marking_sessions;
    await assertSchoolAccess(admin, context.userId, session.school_id);

    return {
      script: script as CandidateScript,
      session: session as MarkingSession,
      questions: (questions || []) as QuestionMarkRecord[],
      auditLogs: (auditLogs || []) as any[],
    };
  });

// 8. Update teacher mark and notes for a specific question
export const updateQuestionTeacherMark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          questionId: z.string().uuid(),
          teacherMark: z.number().int().min(0),
          feedbackNote: z.string().optional(),
          isApproved: z.boolean().default(true),
          rationale: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: q } = await admin
      .from("examiner_question_marks")
      .select("*, examiner_candidate_scripts(*, examiner_marking_sessions(school_id))")
      .eq("id", data.questionId)
      .single();

    if (!q) throw new Error("Question record not found.");
    const schoolId = q.examiner_candidate_scripts.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    const safeMark = Math.min(q.max_mark, data.teacherMark);
    const isDisagreement = safeMark !== q.ai_awarded_mark;

    const { data: updated, error } = await admin
      .from("examiner_question_marks")
      .update({
        teacher_approved_mark: safeMark,
        teacher_feedback_note: data.feedbackNote || null,
        is_approved: data.isApproved,
        is_disagreement: isDisagreement,
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    // Audit log
    await admin.from("examiner_audit_logs").insert({
      school_id: schoolId,
      script_id: q.script_id,
      user_id: context.userId,
      action: "teacher_edited_mark",
      previous_data: { mark: q.teacher_approved_mark ?? q.ai_awarded_mark },
      new_data: { mark: safeMark, question: q.question_number },
      rationale: data.rationale || "Teacher adjusted mark during script review.",
    });

    return { question: updated as QuestionMarkRecord };
  });

// 9. Approve complete script after teacher review
export const approveCandidateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ scriptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const [{ data: script }, { data: questions }] = await Promise.all([
      admin
        .from("examiner_candidate_scripts")
        .select("*, examiner_marking_sessions(school_id)")
        .eq("id", data.scriptId)
        .single(),
      admin.from("examiner_question_marks").select("*").eq("script_id", data.scriptId),
    ]);

    if (!script) throw new Error("Script not found.");
    const schoolId = script.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    // Calculate total teacher-approved mark
    let totalTeacher = 0;
    for (const q of questions || []) {
      totalTeacher += q.teacher_approved_mark ?? q.ai_awarded_mark;
    }

    const { data: updated } = await admin
      .from("examiner_candidate_scripts")
      .update({
        status: "teacher_approved",
        total_teacher_approved_mark: totalTeacher,
        approved_at: new Date().toISOString(),
        approved_by: context.userId,
      })
      .eq("id", script.id)
      .select("*")
      .single();

    // Mark all questions as approved
    await admin
      .from("examiner_question_marks")
      .update({ is_approved: true })
      .eq("script_id", script.id);

    // Audit log
    await admin.from("examiner_audit_logs").insert({
      school_id: schoolId,
      script_id: script.id,
      user_id: context.userId,
      action: "script_approved",
      new_data: { total_mark: totalTeacher },
      rationale: "Teacher completed full script review and approved final marks.",
    });

    return { script: updated as CandidateScript };
  });

// 10. Submit moderator adjustment
export const submitScriptModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          scriptId: z.string().uuid(),
          moderatedMark: z.number().int().min(0),
          rationale: z.string().trim().min(5),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const { data: script } = await admin
      .from("examiner_candidate_scripts")
      .select("*, examiner_marking_sessions(school_id)")
      .eq("id", data.scriptId)
      .single();

    if (!script) throw new Error("Script not found.");
    const schoolId = script.examiner_marking_sessions.school_id;
    await assertSchoolAccess(admin, context.userId, schoolId);

    const { data: updated } = await admin
      .from("examiner_candidate_scripts")
      .update({
        status: "moderated",
        total_moderated_mark: data.moderatedMark,
      })
      .eq("id", script.id)
      .select("*")
      .single();

    await admin.from("examiner_audit_logs").insert({
      school_id: schoolId,
      script_id: script.id,
      user_id: context.userId,
      action: "moderation_adjusted",
      previous_data: { mark: script.total_teacher_approved_mark ?? script.total_ai_mark },
      new_data: { mark: data.moderatedMark },
      rationale: data.rationale,
    });

    return { script: updated as CandidateScript };
  });

// 11. Fetch Cambridge Reliability Benchmark metrics
export const getReliabilityBenchmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("examiner_benchmarks")
      .select("*")
      .order("tested_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { benchmarks: (data || []) as ReliabilityBenchmark[] };
  });

// 12. Fetch moderation candidate scripts and school audit log
export const listModerationScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { sessionId?: string; discrepancyOnly?: boolean } | undefined) => d || {})
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdmin();
    const access = await assertSchoolAccess(admin, context.userId);

    let query = admin
      .from("examiner_candidate_scripts")
      .select(`
        *,
        examiner_marking_sessions!inner(id, school_id, title, paper_number, exam_series, max_mark)
      `)
      .eq("examiner_marking_sessions.school_id", access.schoolId)
      .in("status", ["ready_for_review", "teacher_approved", "moderated"])
      .order("created_at", { ascending: false });

    if (data.sessionId) {
      query = query.eq("session_id", data.sessionId);
    }

    const { data: scripts, error } = await query;
    if (error) throw new Error(error.message);

    let results = (scripts || []) as (CandidateScript & { examiner_marking_sessions: MarkingSession })[];

    if (data.discrepancyOnly) {
      results = results.filter((s) => {
        const ai = s.total_ai_mark ?? 0;
        const teacher = s.total_teacher_approved_mark;
        const hasDelta = teacher !== null && teacher !== undefined && Math.abs(teacher - ai) > 0;
        return hasDelta || (s.total_moderated_mark !== null);
      });
    }

    const { data: auditLogs } = await admin
      .from("examiner_audit_logs")
      .select("*")
      .eq("school_id", access.schoolId)
      .order("created_at", { ascending: false })
      .limit(40);

    return {
      scripts: results,
      auditLogs: (auditLogs || []) as ExaminerAuditLog[],
      userRole: access.role,
    };
  });

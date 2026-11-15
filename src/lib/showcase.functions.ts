import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { unwrapData } from "@/lib/safe-validator";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isAdmin } from "@/lib/auth-admin";

export type ShowcaseAoScore = {
  awarded: number;
  out_of: number;
  comment?: string;
};

export type ShowcaseAoBreakdown = {
  knowledge?: ShowcaseAoScore;
  analysis?: ShowcaseAoScore;
  evaluation?: ShowcaseAoScore;
};

export type ShowcaseGrading = {
  band?: string;
  examiner_summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  actionable_feedback?: string[];
  ao_breakdown?: ShowcaseAoBreakdown;
  confidence?: number;
};

export type ShowcaseEssayItem = {
  essay_id: string;
  version_id: string;
  question: string;
  max_mark: number;
  total_mark: number;
  ao1_awarded: number | null;
  ao2_awarded: number | null;
  ao3_awarded: number | null;
  essay_text: string;
  grading: ShowcaseGrading | null;
  topic_id: string | null;
  topic_name: string | null;
  author_initials: string;
  showcased_at: string;
  is_hidden?: boolean;
  source?: "student_auto" | "teacher_model" | "cambridge_model" | "admin_added";
};

// In-memory / server state for admin overrides
const ADMIN_HIDDEN_ESSAY_IDS = new Set<string>();
const ADMIN_CUSTOM_EXEMPLARS: ShowcaseEssayItem[] = [];

// Built-in Cambridge exemplar storage (AI model answers removed in favor of real student distinction submissions)
const CAMBRIDGE_SHOWCASE_EXEMPLARS: ShowcaseEssayItem[] = [];

function formatAuthorInitials(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) return "Anonymous";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase() + ".";
  return (
    parts[0].slice(0, 1).toUpperCase() +
    ". " +
    parts[parts.length - 1].slice(0, 1).toUpperCase() +
    "."
  );
}

/**
 * Checks whether an essay qualifies for automatic showcase display:
 * - 8-marker: >= 7 marks (7 or 8)
 * - 12-marker: >= 10 marks (10, 11, 12)
 * - 20-marker: >= 15 marks (15 to 20)
 * - Any other tariff: >= 75% of max marks
 */
export function isShowcaseScore(totalMark: number, maxMark: number): boolean {
  if (maxMark === 8) return totalMark >= 7;
  if (maxMark === 12) return totalMark >= 10;
  if (maxMark === 20) return totalMark >= 15;
  return totalMark >= Math.round(maxMark * 0.75);
}

async function getAdminDatabaseClient(fallbackClient: any) {
  try {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    if (admin) return admin;
  } catch {
    /* fallback */
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    if (supabaseAdmin) return supabaseAdmin;
  } catch {
    /* fallback */
  }
  return fallbackClient;
}

/**
 * List showcase essays — automatically returns ALL qualifying high-scoring essays
 * (>=7 for 8m, >=10 for 12m, >=15 for 20m, plus teacher/admin exemplars) across the entire platform.
 */
export const listShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicId: z.string().optional(),
        tariff: z.number().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const results: ShowcaseEssayItem[] = [];

    // 1. Decoupled, schema-resilient database query for student and teacher submissions
    try {
      const client = await getAdminDatabaseClient(context.supabase);

      // Query raw essay_versions directly without fragile relational joins
      const { data: dbVersions, error: vError } = await client
        .from("essay_versions")
        .select(
          "id, essay_id, user_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at",
        )
        .not("total_mark", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!vError && dbVersions && dbVersions.length > 0) {
        // Collect IDs for separate batch fetching
        const essayIds = Array.from(
          new Set(dbVersions.map((v: any) => v.essay_id).filter(Boolean)),
        );
        const userIds = Array.from(new Set(dbVersions.map((v: any) => v.user_id).filter(Boolean)));

        // Fetch parent essay metadata (question, max_mark, topic_id)
        const essaysMap = new Map<
          string,
          { question: string; max_mark: number; topic_id: string | null }
        >();
        if (essayIds.length > 0) {
          const { data: essaysData } = await client
            .from("essays")
            .select("id, question, max_mark, topic_id")
            .in("id", essayIds);
          for (const e of essaysData ?? []) {
            essaysMap.set(e.id, e);
          }
        }

        // Fetch user profiles for author display names
        const profilesMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profilesData } = await client
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          for (const p of profilesData ?? []) {
            if (p.full_name) profilesMap.set(p.id, p.full_name);
          }
        }

        // Fetch user roles to distinguish teachers/admins
        const roleMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: rolesData } = await client
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);
          for (const r of rolesData ?? []) {
            roleMap.set(r.user_id, r.role);
          }
        }

        // Fetch topic names
        const topicIds = Array.from(
          new Set(
            Array.from(essaysMap.values())
              .map((e) => e.topic_id)
              .filter(Boolean),
          ),
        ) as string[];
        const topicsMap = new Map<string, string>();
        if (topicIds.length > 0) {
          const { data: topicsData } = await client
            .from("topics")
            .select("id, name")
            .in("id", topicIds);
          for (const t of topicsData ?? []) {
            topicsMap.set(t.id, t.name);
          }
        }

        for (const row of dbVersions as any[]) {
          const essayMeta = essaysMap.get(row.essay_id);
          const maxMark = essayMeta?.max_mark ?? 12;
          const totalMark = row.total_mark;
          const userRole = roleMap.get(row.user_id);
          const isTeacher = userRole === "teacher";

          // Qualifies if teacher response or score meets distinction threshold (e.g. 10/12, 8/8, 15/20)
          if (totalMark !== null && (isTeacher || isShowcaseScore(totalMark, maxMark))) {
            const versionId = row.id as string;
            // Check if hidden by administrator
            if (ADMIN_HIDDEN_ESSAY_IDS.has(versionId) || ADMIN_HIDDEN_ESSAY_IDS.has(row.essay_id)) {
              continue;
            }

            let parsedGrading: ShowcaseGrading | null = null;
            if (typeof row.grading === "string") {
              try {
                parsedGrading = JSON.parse(row.grading);
              } catch {
                parsedGrading = null;
              }
            } else if (typeof row.grading === "object" && row.grading !== null) {
              parsedGrading = row.grading as ShowcaseGrading;
            }

            const authorName = profilesMap.get(row.user_id);
            const authorInitials = isTeacher
              ? authorName
                ? `${authorName} (Economics Faculty)`
                : "Economics Faculty"
              : formatAuthorInitials(authorName);

            const topicName = essayMeta?.topic_id
              ? (topicsMap.get(essayMeta.topic_id) ?? "Cambridge Economics")
              : "Cambridge Economics";

            results.push({
              essay_id: row.essay_id,
              version_id: versionId,
              question: essayMeta?.question || "Cambridge 0455 Economics Question",
              max_mark: maxMark,
              total_mark: totalMark,
              ao1_awarded: row.ao1_awarded ?? null,
              ao2_awarded: row.ao2_awarded ?? null,
              ao3_awarded: row.ao3_awarded ?? null,
              essay_text: row.essay_text,
              grading: parsedGrading,
              topic_id: essayMeta?.topic_id || null,
              topic_name: topicName,
              author_initials: authorInitials,
              showcased_at: row.created_at,
              source: isTeacher
                ? "teacher_model"
                : userRole === "admin"
                  ? "admin_added"
                  : "student_auto",
            });
          }
        }
      }
    } catch (err) {
      console.warn("Database query for showcase essays encountered error:", err);
    }

    // 2. Append Cambridge Model Answers & Admin Custom Exemplars
    const visibleCambridge = CAMBRIDGE_SHOWCASE_EXEMPLARS.filter(
      (e) => !ADMIN_HIDDEN_ESSAY_IDS.has(e.version_id) && !ADMIN_HIDDEN_ESSAY_IDS.has(e.essay_id),
    );
    const visibleCustom = ADMIN_CUSTOM_EXEMPLARS.filter(
      (e) => !ADMIN_HIDDEN_ESSAY_IDS.has(e.version_id) && !ADMIN_HIDDEN_ESSAY_IDS.has(e.essay_id),
    );

    let combined = [...visibleCustom, ...results, ...visibleCambridge];

    // Filter by topic if requested
    if (data.topicId) {
      combined = combined.filter((e) => e.topic_id === data.topicId);
    }

    // Filter by tariff if requested
    if (data.tariff) {
      combined = combined.filter((e) => e.max_mark === data.tariff);
    }

    // Sort by highest mark percentage first, then date
    combined.sort((a, b) => {
      const scoreDiff = b.total_mark / b.max_mark - a.total_mark / a.max_mark;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return new Date(b.showcased_at).getTime() - new Date(a.showcased_at).getTime();
    });

    return combined.slice(0, data.limit ?? 100);
  });

/* ------------------------------------------------------------------ */
/* Admin Showcase Management Functions                                 */
/* ------------------------------------------------------------------ */

/**
 * List all showcase essays for administrators, including hidden items and source details.
 */
export const adminListShowcaseEssays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userIsAdmin = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!userIsAdmin) throw new Error("Administrator permissions required.");

    const allItems: ShowcaseEssayItem[] = [];

    // Decoupled DB query
    try {
      const client = await getAdminDatabaseClient(context.supabase);

      const { data: dbVersions } = await client
        .from("essay_versions")
        .select(
          "id, essay_id, user_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at",
        )
        .not("total_mark", "is", null)
        .order("created_at", { ascending: false });

      if (dbVersions && dbVersions.length > 0) {
        const essayIds = Array.from(
          new Set(dbVersions.map((v: any) => v.essay_id).filter(Boolean)),
        );
        const userIds = Array.from(new Set(dbVersions.map((v: any) => v.user_id).filter(Boolean)));

        const essaysMap = new Map<
          string,
          { question: string; max_mark: number; topic_id: string | null }
        >();
        if (essayIds.length > 0) {
          const { data: essaysData } = await client
            .from("essays")
            .select("id, question, max_mark, topic_id")
            .in("id", essayIds);
          for (const e of essaysData ?? []) {
            essaysMap.set(e.id, e);
          }
        }

        const profilesMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profilesData } = await client
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          for (const p of profilesData ?? []) {
            if (p.full_name) profilesMap.set(p.id, p.full_name);
          }
        }

        const roleMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: rolesData } = await client
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);
          for (const r of rolesData ?? []) {
            roleMap.set(r.user_id, r.role);
          }
        }

        const topicIds = Array.from(
          new Set(
            Array.from(essaysMap.values())
              .map((e) => e.topic_id)
              .filter(Boolean),
          ),
        ) as string[];
        const topicsMap = new Map<string, string>();
        if (topicIds.length > 0) {
          const { data: topicsData } = await client
            .from("topics")
            .select("id, name")
            .in("id", topicIds);
          for (const t of topicsData ?? []) {
            topicsMap.set(t.id, t.name);
          }
        }

        for (const row of dbVersions as any[]) {
          const essayMeta = essaysMap.get(row.essay_id);
          const maxMark = essayMeta?.max_mark ?? 12;
          const totalMark = row.total_mark;
          const userRole = roleMap.get(row.user_id);
          const isTeacher = userRole === "teacher";

          if (totalMark !== null && (isTeacher || isShowcaseScore(totalMark, maxMark))) {
            const versionId = row.id as string;
            const isHidden =
              ADMIN_HIDDEN_ESSAY_IDS.has(versionId) || ADMIN_HIDDEN_ESSAY_IDS.has(row.essay_id);

            let parsedGrading: ShowcaseGrading | null = null;
            if (typeof row.grading === "string") {
              try {
                parsedGrading = JSON.parse(row.grading);
              } catch {
                parsedGrading = null;
              }
            } else if (typeof row.grading === "object" && row.grading !== null) {
              parsedGrading = row.grading as ShowcaseGrading;
            }

            const authorName = profilesMap.get(row.user_id);
            const authorInitials = isTeacher
              ? `${authorName ?? "Faculty"} (Teacher)`
              : authorName || "Student Submission";

            const topicName = essayMeta?.topic_id
              ? (topicsMap.get(essayMeta.topic_id) ?? "Cambridge Economics")
              : "Cambridge Economics";

            allItems.push({
              essay_id: row.essay_id,
              version_id: versionId,
              question: essayMeta?.question || "Cambridge 0455 Economics Question",
              max_mark: maxMark,
              total_mark: totalMark,
              ao1_awarded: row.ao1_awarded ?? null,
              ao2_awarded: row.ao2_awarded ?? null,
              ao3_awarded: row.ao3_awarded ?? null,
              essay_text: row.essay_text,
              grading: parsedGrading,
              topic_id: essayMeta?.topic_id || null,
              topic_name: topicName,
              author_initials: authorInitials,
              showcased_at: row.created_at,
              is_hidden: isHidden,
              source: isTeacher
                ? "teacher_model"
                : userRole === "admin"
                  ? "admin_added"
                  : "student_auto",
            });
          }
        }
      }
    } catch {
      // Fallback
    }

    // Append custom admin exemplars
    for (const custom of ADMIN_CUSTOM_EXEMPLARS) {
      allItems.push({
        ...custom,
        is_hidden: ADMIN_HIDDEN_ESSAY_IDS.has(custom.version_id),
        source: "admin_added",
      });
    }

    // Append Cambridge exemplars
    for (const ex of CAMBRIDGE_SHOWCASE_EXEMPLARS) {
      allItems.push({
        ...ex,
        is_hidden: ADMIN_HIDDEN_ESSAY_IDS.has(ex.version_id),
        source: "cambridge_model",
      });
    }

    return allItems;
  });

/**
 * Toggle visibility of an essay in the showcase (hide / unhide).
 */
export const adminToggleShowcaseVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ versionId: z.string(), hidden: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userIsAdmin = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!userIsAdmin) throw new Error("Administrator permissions required.");

    if (data.hidden) {
      ADMIN_HIDDEN_ESSAY_IDS.add(data.versionId);
    } else {
      ADMIN_HIDDEN_ESSAY_IDS.delete(data.versionId);
    }

    return { ok: true, versionId: data.versionId, hidden: data.hidden };
  });

/**
 * Add a custom exemplar essay to the showcase (Admin only).
 */
export const adminAddShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(5, "Question must be at least 5 characters."),
        maxMark: z.number().int().min(1).max(30),
        totalMark: z.number().int().min(1).max(30),
        ao1Awarded: z.number().int().optional(),
        ao2Awarded: z.number().int().optional(),
        ao3Awarded: z.number().int().optional(),
        essayText: z.string().trim().min(20, "Essay text must be at least 20 characters."),
        examinerSummary: z.string().trim().optional(),
        topicName: z.string().trim().optional(),
        authorName: z.string().trim().optional(),
        source: z
          .enum(["student_auto", "teacher_model", "cambridge_model", "admin_added"])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userIsAdmin = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!userIsAdmin) throw new Error("Administrator permissions required.");

    const id = `custom-ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newExemplar: ShowcaseEssayItem = {
      essay_id: id,
      version_id: id,
      question: data.question,
      max_mark: data.maxMark,
      total_mark: data.totalMark,
      ao1_awarded: data.ao1Awarded ?? null,
      ao2_awarded: data.ao2Awarded ?? null,
      ao3_awarded: data.ao3Awarded ?? null,
      essay_text: data.essayText,
      grading: {
        band: "Cambridge Level 5 Exemplar",
        examiner_summary:
          data.examinerSummary ||
          "Master-level Cambridge response with balanced chains of reasoning and thorough evaluation.",
        strengths: [
          "Cohesive analytical structure addressing all directive command words.",
          "Strong integration of economic theory with evaluative context.",
        ],
        actionable_feedback: ["Exemplary standard for Level 4/5 revision."],
        ao_breakdown: {
          knowledge: {
            awarded: data.ao1Awarded ?? Math.round(data.maxMark * 0.25),
            out_of: Math.round(data.maxMark * 0.25),
            comment: "Accurate definitions and conceptual foundations.",
          },
          analysis: {
            awarded: data.ao2Awarded ?? Math.round(data.maxMark * 0.5),
            out_of: Math.round(data.maxMark * 0.5),
            comment: "Stepwise economic reasoning and mechanism analysis.",
          },
          evaluation: {
            awarded: data.ao3Awarded ?? Math.round(data.maxMark * 0.25),
            out_of: Math.round(data.maxMark * 0.25),
            comment: "Balanced evaluation with contextual synthesis.",
          },
        },
      },
      topic_id: null,
      topic_name: data.topicName || "Cambridge Economics",
      author_initials: data.authorName ? formatAuthorInitials(data.authorName) : "Exemplar Author",
      showcased_at: new Date().toISOString(),
      source: data.source || "admin_added",
      is_hidden: false,
    };

    ADMIN_CUSTOM_EXEMPLARS.unshift(newExemplar);
    return { ok: true, exemplar: newExemplar };
  });

/**
 * Remove or delete an essay from the showcase.
 */
export const adminDeleteShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = unwrapData(input);
    const id = typeof raw === "string" ? raw : (raw as any)?.id;
    return z.object({ id: z.string() }).parse({ id });
  })
  .handler(async ({ data, context }) => {
    const userIsAdmin = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!userIsAdmin) throw new Error("Administrator permissions required.");

    // Remove from custom exemplars if present
    const customIdx = ADMIN_CUSTOM_EXEMPLARS.findIndex(
      (e) => e.version_id === data.id || e.essay_id === data.id,
    );
    if (customIdx !== -1) {
      ADMIN_CUSTOM_EXEMPLARS.splice(customIdx, 1);
    } else {
      // Add to hidden set
      ADMIN_HIDDEN_ESSAY_IDS.add(data.id);
    }

    return { ok: true, id: data.id };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { unwrapData } from "@/lib/safe-validator";
import { isAdmin as checkIsAdmin } from "@/lib/auth-admin";

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
  is_removed?: boolean;
  source?: "student_auto" | "teacher_model" | "cambridge_model" | "admin_added";
};

export type ShowcaseModerationData = {
  hidden_ids: string[];
  removed_ids: string[];
  custom_exemplars: ShowcaseEssayItem[];
};

// Edge-resilient in-memory cache with short TTL backed by persistent database storage
let cachedModeration: ShowcaseModerationData | null = null;
let cachedModerationAt = 0;
const CACHE_TTL_MS = 15_000;

async function loadShowcaseModeration(client: any): Promise<ShowcaseModerationData> {
  const now = Date.now();
  if (cachedModeration && now - cachedModerationAt < CACHE_TTL_MS) {
    return cachedModeration;
  }

  const result: ShowcaseModerationData = {
    hidden_ids: [],
    removed_ids: [],
    custom_exemplars: [],
  };

  // 1. Primary Store: definitions table key '__SYS_SHOWCASE_MODERATION__'
  try {
    const { data: defRow, error: defErr } = await client
      .from("definitions")
      .select("definition_text")
      .eq("term", "__SYS_SHOWCASE_MODERATION__")
      .maybeSingle();

    if (!defErr && defRow?.definition_text) {
      const parsed = JSON.parse(defRow.definition_text);
      if (parsed && typeof parsed === "object") {
        result.hidden_ids = Array.isArray(parsed.hidden_ids) ? parsed.hidden_ids : [];
        result.removed_ids = Array.isArray(parsed.removed_ids) ? parsed.removed_ids : [];
        result.custom_exemplars = Array.isArray(parsed.custom_exemplars) ? parsed.custom_exemplars : [];
        cachedModeration = result;
        cachedModerationAt = now;
        return result;
      }
    }
  } catch (err) {
    console.warn("Failed reading showcase moderation from definitions table:", err);
  }

  // 2. Secondary Store: site_settings table (JSONB column 'value.showcase_moderation')
  try {
    const { data: settingsRow, error: sErr } = await client
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();

    if (!sErr && settingsRow?.value && typeof settingsRow.value === "object") {
      const mod = (settingsRow.value as any).showcase_moderation;
      if (mod && typeof mod === "object") {
        result.hidden_ids = Array.isArray(mod.hidden_ids) ? mod.hidden_ids : [];
        result.removed_ids = Array.isArray(mod.removed_ids) ? mod.removed_ids : [];
        result.custom_exemplars = Array.isArray(mod.custom_exemplars) ? mod.custom_exemplars : [];
        cachedModeration = result;
        cachedModerationAt = now;
        return result;
      }
    }
  } catch (err) {
    console.warn("Failed reading showcase moderation from site_settings table:", err);
  }

  cachedModeration = result;
  cachedModerationAt = now;
  return result;
}

async function saveShowcaseModeration(client: any, data: ShowcaseModerationData): Promise<void> {
  // Update cache immediately
  cachedModeration = data;
  cachedModerationAt = Date.now();

  const payloadStr = JSON.stringify(data);

  // 1. Primary: Save to definitions table
  try {
    const { data: existing } = await client
      .from("definitions")
      .select("id")
      .eq("term", "__SYS_SHOWCASE_MODERATION__")
      .maybeSingle();

    if (existing?.id) {
      await client
        .from("definitions")
        .update({
          definition_text: payloadStr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await client.from("definitions").insert({
        term: "__SYS_SHOWCASE_MODERATION__",
        definition_text: payloadStr,
        category: "system_config",
        source_label: "admin_showcase_moderation",
      });
    }
  } catch (err) {
    console.warn("Failed saving showcase moderation to definitions table:", err);
  }

  // 2. Secondary: Save to site_settings table
  try {
    const { data: row } = await client
      .from("site_settings")
      .select("value")
      .eq("id", 1)
      .maybeSingle();
    const existingVal = row?.value && typeof row.value === "object" ? row.value : {};
    await client.from("site_settings").upsert({
      id: 1,
      value: {
        ...existingVal,
        showcase_moderation: data,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed saving showcase moderation to site_settings table:", err);
  }
}

import { OFFICIAL_0455_SHOWCASE_EXEMPLARS } from "./showcase-exemplars";

// Built-in Cambridge exemplar storage (authentic student distinction scripts and official Cambridge benchmark models)
const CAMBRIDGE_SHOWCASE_EXEMPLARS: ShowcaseEssayItem[] = OFFICIAL_0455_SHOWCASE_EXEMPLARS;

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
 * Checks whether an essay qualifies for automatic showcase display in Cambridge IGCSE 0455:
 * - 8-marker: >= 7 marks (7 or 8)
 * - 6-marker: >= 5 marks (5 or 6)
 * - 4-marker: >= 3 marks (3 or 4)
 * - 2-marker: >= 2 marks (2)
 * - Any other tariff: >= 75% of max marks
 */
export function isShowcaseScore(totalMark: number, maxMark: number): boolean {
  if (maxMark === 8) return totalMark >= 7;
  if (maxMark === 6) return totalMark >= 5;
  if (maxMark === 4) return totalMark >= 3;
  if (maxMark === 2) return totalMark >= 2;
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
      const mod = await loadShowcaseModeration(client);
      const blockedIds = new Set([...mod.hidden_ids, ...mod.removed_ids]);

      // Query raw essay_versions directly with showcased flags
      const { data: dbVersions, error: vError } = await client
        .from("essay_versions")
        .select(
          "id, essay_id, user_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at, showcased, showcase_consented",
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
          const versionId = row.id as string;
          const essayId = row.essay_id as string;

          // PERMANENT EXCLUSION 1: Blacklisted in persistent moderation store
          if (blockedIds.has(versionId) || (essayId && blockedIds.has(essayId))) {
            continue;
          }

          // PERMANENT EXCLUSION 2: Explicitly un-showcased or removed in database row
          if (row.showcased === false && row.showcase_consented === false) {
            continue;
          }

          // Qualifies if teacher response or score meets distinction threshold (e.g. 10/12, 8/8, 15/20)
          if (totalMark !== null && (isTeacher || isShowcaseScore(totalMark, maxMark))) {
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
              essay_id: essayId,
              version_id: versionId,
              question: essayMeta?.question || "Cambridge IGCSE 0455 Economics Question",
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

      // 2. Append Cambridge Model Answers & Admin Custom Exemplars (strictly filtered)
      const visibleCambridge = CAMBRIDGE_SHOWCASE_EXEMPLARS.filter(
        (e) => !blockedIds.has(e.version_id) && !blockedIds.has(e.essay_id) && !e.is_hidden,
      );
      const visibleCustom = mod.custom_exemplars.filter(
        (e) => !blockedIds.has(e.version_id) && !blockedIds.has(e.essay_id) && !e.is_hidden,
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
    } catch (err) {
      console.warn("Database query for showcase essays encountered error:", err);
      return [];
    }
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
    const isAdmin = checkIsAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const allItems: ShowcaseEssayItem[] = [];

    // Decoupled DB query
    try {
      const client = await getAdminDatabaseClient(context.supabase);
      const mod = await loadShowcaseModeration(client);
      const hiddenSet = new Set(mod.hidden_ids);
      const removedSet = new Set(mod.removed_ids);

      const { data: dbVersions } = await client
        .from("essay_versions")
        .select(
          "id, essay_id, user_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, essay_text, grading, created_at, showcased, showcase_consented",
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
            const essayId = row.essay_id as string;

            const isRemoved = removedSet.has(versionId) || (essayId ? removedSet.has(essayId) : false);
            const isHidden =
              isRemoved ||
              hiddenSet.has(versionId) ||
              (essayId ? hiddenSet.has(essayId) : false) ||
              (row.showcased === false && row.showcase_consented === false);

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
              essay_id: essayId,
              version_id: versionId,
              question: essayMeta?.question || "Cambridge IGCSE 0455 Economics Question",
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
              is_removed: isRemoved,
              source: isTeacher
                ? "teacher_model"
                : userRole === "admin"
                  ? "admin_added"
                  : "student_auto",
            });
          }
        }
      }

      // Append custom admin exemplars
      for (const custom of mod.custom_exemplars) {
        const isRemoved = removedSet.has(custom.version_id) || removedSet.has(custom.essay_id);
        const isHidden =
          isRemoved ||
          Boolean(custom.is_hidden) ||
          hiddenSet.has(custom.version_id) ||
          hiddenSet.has(custom.essay_id);
        allItems.push({
          ...custom,
          is_hidden: isHidden,
          is_removed: isRemoved,
          source: "admin_added",
        });
      }

      // Append Cambridge exemplars
      for (const ex of CAMBRIDGE_SHOWCASE_EXEMPLARS) {
        const isRemoved = removedSet.has(ex.version_id) || removedSet.has(ex.essay_id);
        const isHidden =
          isRemoved ||
          Boolean(ex.is_hidden) ||
          hiddenSet.has(ex.version_id) ||
          hiddenSet.has(ex.essay_id);
        allItems.push({
          ...ex,
          is_hidden: isHidden,
          is_removed: isRemoved,
          source: ex.source || "cambridge_model",
        });
      }

      return allItems;
    } catch {
      return [];
    }
  });

/**
 * Toggle visibility of an essay in the showcase (hide / restore).
 */
export const adminToggleShowcaseVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        versionId: z.string(),
        hidden: z.boolean(),
        essayId: z.string().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = checkIsAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const client = await getAdminDatabaseClient(context.supabase);
    const mod = await loadShowcaseModeration(client);

    const hiddenSet = new Set(mod.hidden_ids);
    const removedSet = new Set(mod.removed_ids);

    if (data.hidden) {
      // HIDE from student public showcase
      hiddenSet.add(data.versionId);
      if (data.essayId) hiddenSet.add(data.essayId);
      removedSet.delete(data.versionId);
      if (data.essayId) removedSet.delete(data.essayId);

      for (const c of mod.custom_exemplars) {
        if (c.version_id === data.versionId || (data.essayId && c.essay_id === data.essayId)) {
          c.is_hidden = true;
        }
      }

      try {
        await client
          .from("essay_versions")
          .update({ showcased: false, showcase_consented: false })
          .eq("id", data.versionId);
        if (data.essayId) {
          await client
            .from("essay_versions")
            .update({ showcased: false, showcase_consented: false })
            .eq("essay_id", data.essayId);
        }
      } catch (err) {
        console.warn("Failed updating essay_versions for hidden showcase:", err);
      }
    } else {
      // RESTORE to student showcase
      hiddenSet.delete(data.versionId);
      removedSet.delete(data.versionId);
      if (data.essayId) {
        hiddenSet.delete(data.essayId);
        removedSet.delete(data.essayId);
      }

      for (const c of mod.custom_exemplars) {
        if (c.version_id === data.versionId || (data.essayId && c.essay_id === data.essayId)) {
          c.is_hidden = false;
        }
      }

      try {
        await client
          .from("essay_versions")
          .update({ showcased: true, showcase_consented: true })
          .eq("id", data.versionId);
        if (data.essayId) {
          await client
            .from("essay_versions")
            .update({ showcased: true, showcase_consented: true })
            .eq("essay_id", data.essayId);
        }
      } catch (err) {
        console.warn("Failed updating essay_versions for restored showcase:", err);
      }
    }

    mod.hidden_ids = Array.from(hiddenSet);
    mod.removed_ids = Array.from(removedSet);
    await saveShowcaseModeration(client, mod);

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
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = checkIsAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

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
      is_removed: false,
    };

    const client = await getAdminDatabaseClient(context.supabase);
    const mod = await loadShowcaseModeration(client);
    mod.custom_exemplars.unshift(newExemplar);
    await saveShowcaseModeration(client, mod);

    return { ok: true, exemplar: newExemplar };
  });

/**
 * Remove or delete an essay from the showcase permanently.
 */
export const adminDeleteShowcaseExemplar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        essayId: z.string().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = checkIsAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isAdmin) throw new Error("Administrator permissions required. Marginal is the platform administrator.");

    const client = await getAdminDatabaseClient(context.supabase);
    const mod = await loadShowcaseModeration(client);

    // Look up essay_id if not provided
    let targetEssayId = data.essayId;
    if (!targetEssayId) {
      try {
        const { data: verRow } = await client
          .from("essay_versions")
          .select("essay_id")
          .eq("id", data.id)
          .maybeSingle();
        if (verRow?.essay_id) {
          targetEssayId = verRow.essay_id;
        }
      } catch {
        /* ignore */
      }
    }

    // Remove from custom exemplars if present
    mod.custom_exemplars = mod.custom_exemplars.filter(
      (e) =>
        e.version_id !== data.id &&
        e.essay_id !== data.id &&
        (!targetEssayId || e.essay_id !== targetEssayId),
    );

    // Permanently blacklist in removed_ids and hidden_ids
    const removedSet = new Set(mod.removed_ids);
    const hiddenSet = new Set(mod.hidden_ids);
    removedSet.add(data.id);
    hiddenSet.add(data.id);
    if (targetEssayId) {
      removedSet.add(targetEssayId);
      hiddenSet.add(targetEssayId);
    }
    mod.removed_ids = Array.from(removedSet);
    mod.hidden_ids = Array.from(hiddenSet);

    // Update database row: permanently set showcased = false, showcase_consented = false
    try {
      await client
        .from("essay_versions")
        .update({ showcased: false, showcase_consented: false })
        .eq("id", data.id);
      if (targetEssayId) {
        await client
          .from("essay_versions")
          .update({ showcased: false, showcase_consented: false })
          .eq("essay_id", targetEssayId);
      }
    } catch (err) {
      console.warn("Failed updating essay_versions on deletion:", err);
    }

    // Persist to definitions table and site_settings table
    await saveShowcaseModeration(client, mod);

    return { ok: true, id: data.id, essayId: targetEssayId };
  });

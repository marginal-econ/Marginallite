import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isAdmin } from "@/lib/auth-admin";
import { type CambridgeSeriesId, normalizeSeriesId } from "@/lib/cambridge-thresholds";
import { unwrapData } from "@/lib/safe-validator";

export type AppRole = "student" | "teacher" | "admin";
export type NavigationLayout = "topbar" | "sidebar" | "dock";

export type UserAcademicPreferences = {
  examSeries: CambridgeSeriesId;
  targetLevel: "igcse_0455" | "igcse_core" | "igcse_extended";
  targetGrade: "A*" | "A" | "B" | "C";
  currencyContext?: string;
  feedbackDepth?: string;
  timedModeDefault?: boolean;
  showDiagramLabels?: boolean;
  navigationLayout?: NavigationLayout;
};

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let isUserAdmin = isAdmin({
      userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });

    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const db = supabaseAdmin ?? supabase;

      let profile: {
        id: string;
        full_name: string | null;
        school: string | null;
        tutorial_completed: boolean;
        avatar_url?: string | null;
      } | null = null;
      let roles: { role: string }[] | null = null;

      let extendedProfile: { bio?: string; birthday?: string; avatarUrl?: string } = {};
      try {
        const { data: extData } = await db
          .from("definitions")
          .select("definition_text")
          .eq("term", `__USER_PROFILE_EXT_${userId}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (extData?.definition_text) {
          extendedProfile = JSON.parse(extData.definition_text);
        }
      } catch {
        /* fallback */
      }

      try {
        const profileRes = await db
          .from("profiles")
          .select("id, full_name, school, tutorial_completed, avatar_url")
          .eq("id", userId)
          .maybeSingle();
        profile = profileRes.data as any;
      } catch {
        profile = null;
      }

      try {
        const rolesRes = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        roles = rolesRes.data as { role: string }[] | null;
      } catch {
        roles = null;
      }

      const roleList = (roles ?? []).map((row: any) => row.role);
      if (roleList.includes("admin")) {
        isUserAdmin = true;
      }

      let isTeacherUser =
        roleList.includes("teacher") ||
        roleList.includes("teacher_pending") ||
        (context as any).claims?.user_metadata?.role === "teacher" ||
        (context as any).claims?.app_metadata?.role === "teacher";

      if (!isTeacherUser) {
        try {
          const { data: tp } = await (db as any)
            .from("teacher_profiles")
            .select("status")
            .eq("user_id", userId)
            .maybeSingle();
          if (tp?.status === "approved" || tp?.status === "pending") {
            isTeacherUser = true;
          }
        } catch {
          /* fallback */
        }
      }

      if (isTeacherUser && !roleList.includes("teacher")) {
        try {
          await db.from("user_roles").upsert(
            { user_id: userId, role: "teacher" } as any,
            { onConflict: "user_id,role" },
          );
        } catch {
          /* best effort */
        }
      }

      let role: AppRole = "student";
      if (isUserAdmin) {
        role = "admin";
      } else if (isTeacherUser) {
        role = "teacher";
      }

      const metaName =
        (context as any).claims?.user_metadata?.full_name ||
        (context as any).claims?.user_metadata?.name;
      const emailPrefix = (context as any).email ? (context as any).email.split("@")[0] : null;
      const resolvedName =
        profile?.full_name || metaName || (isUserAdmin ? "Marginalite Admin" : emailPrefix);

      const resolvedAvatar =
        profile?.avatar_url ||
        extendedProfile?.avatarUrl ||
        (context as any).claims?.user_metadata?.avatar_url ||
        null;

      if (!profile) {
        try {
          const { supabaseAdmin } = await import("@/integrations/backend/client.server");
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            full_name: resolvedName,
            school: (context as any).claims?.user_metadata?.school || null,
            avatar_url: resolvedAvatar,
          });
          if (!roleList || roleList.length === 0) {
            await (supabaseAdmin.from("user_roles") as any).upsert(
              {
                user_id: userId,
                role: role,
              },
              { onConflict: "user_id,role" },
            );
          }
        } catch {
          /* best effort */
        }
      }

      return {
        userId,
        fullName: resolvedName,
        school: profile?.school ?? (context as any).claims?.user_metadata?.school ?? null,
        avatarUrl: resolvedAvatar,
        bio: extendedProfile?.bio || "",
        birthday: extendedProfile?.birthday || "",
        role,
        isAdmin: isUserAdmin,
        isStaff: isUserAdmin || role === "teacher",
        tutorialCompleted: profile?.tutorial_completed ?? true,
      };
    } catch (err) {
      console.warn("Exception in getMe, returning fallback role:", err);
      return {
        userId,
        fullName: isUserAdmin ? "Marginalite Admin" : null,
        school: null,
        avatarUrl: null,
        bio: "",
        birthday: "",
        role: isUserAdmin ? ("admin" as AppRole) : ("student" as AppRole),
        isAdmin: isUserAdmin,
        isStaff: isUserAdmin,
        tutorialCompleted: true,
      };
    }
  });

/**
 * Privacy-safe community signal for the Dashboard (counts only).
 */
export const getCommunityPulse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      let onlineCount = 0;
      try {
        const { count, error } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("updated_at", onlineSince);
        if (!error && count != null) onlineCount = count;
      } catch {
        // Safe fallback
      }

      let memberCount = 0;
      try {
        const authResult = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (!authResult.error && authResult.data?.users) {
          memberCount = authResult.data.users.filter((user) =>
            Boolean(user.last_sign_in_at),
          ).length;
        }
      } catch {
        // Safe fallback
      }

      return { onlineCount, memberCount };
    } catch {
      return { onlineCount: 0, memberCount: 0 };
    }
  });

export const markTutorialSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ tutorial_completed: true })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().max(120).optional(),
        school: z.string().trim().max(160).optional(),
        avatarUrl: z.string().trim().max(500000).optional().nullable(),
        bio: z.string().trim().max(500).optional().nullable(),
        birthday: z.string().trim().max(30).optional().nullable(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? supabase;

    try {
      const updatePayload: Record<string, any> = {
        full_name: data.fullName ?? null,
        school: data.school ?? null,
        updated_at: new Date().toISOString(),
      };
      if (data.avatarUrl !== undefined) {
        updatePayload.avatar_url = data.avatarUrl;
      }

      await db.from("profiles").update(updatePayload).eq("id", userId);
    } catch (err) {
      console.warn("Profiles table update error:", err);
    }

    // Persist extended profile info (bio, birthday, custom avatar) in definitions table
    try {
      const term = `__USER_PROFILE_EXT_${userId}`;
      const extPayload = {
        bio: data.bio ?? "",
        birthday: data.birthday ?? "",
        avatarUrl: data.avatarUrl ?? "",
        updatedAt: new Date().toISOString(),
      };
      const { data: existing } = await db
        .from("definitions")
        .select("id")
        .eq("term", term)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await db
          .from("definitions")
          .update({
            definition_text: JSON.stringify(extPayload),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await db.from("definitions").insert({
          term,
          definition_text: JSON.stringify(extPayload),
          category: "candidate_profile",
          source_label: "Marginalite Profile",
        } as any);
      }
    } catch (extErr) {
      console.warn("Could not save extended profile:", extErr);
    }

    return { ok: true };
  });

export const getUserAcademicPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserAcademicPreferences> => {
    const { supabase, userId } = context;
    const term = `__USER_PREFS_${userId}`;

    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const db = supabaseAdmin ?? supabase;
      const { data } = await db
        .from("definitions")
        .select("definition_text")
        .eq("term", term)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.definition_text) {
        const parsed = JSON.parse(data.definition_text);
        return {
          examSeries: normalizeSeriesId(parsed.examSeries),
          targetLevel: parsed.targetLevel || "igcse_0455",
          targetGrade: parsed.targetGrade || "A*",
          currencyContext: parsed.currencyContext || "uk_intl",
          feedbackDepth: parsed.feedbackDepth || "detailed",
          timedModeDefault: parsed.timedModeDefault ?? true,
          showDiagramLabels: parsed.showDiagramLabels ?? true,
          navigationLayout: (parsed.navigationLayout as NavigationLayout) || "topbar",
        };
      }
    } catch {
      // Fallback
    }

    return {
      examSeries: "all_average",
      targetLevel: "igcse_0455",
      targetGrade: "A*",
      currencyContext: "uk_intl",
      feedbackDepth: "detailed",
      timedModeDefault: true,
      showDiagramLabels: true,
      navigationLayout: "topbar",
    };
  });

export const saveUserAcademicPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        examSeries: z.string().optional(),
        targetLevel: z.enum(["igcse_0455", "igcse_core", "igcse_extended"]).optional(),
        targetGrade: z.enum(["A*", "A", "B", "C"]).optional(),
        currencyContext: z.string().optional(),
        feedbackDepth: z.string().optional(),
        timedModeDefault: z.boolean().optional(),
        showDiagramLabels: z.boolean().optional(),
        navigationLayout: z.enum(["topbar", "sidebar", "dock"]).optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? supabase;
    const term = `__USER_PREFS_${userId}`;
    const cacheTerm = `__REVIEW_CACHE_${userId}`;

    const normalizedSeries = normalizeSeriesId(data.examSeries);
    const payload: UserAcademicPreferences = {
      examSeries: normalizedSeries,
      targetLevel: data.targetLevel || "igcse_0455",
      targetGrade: data.targetGrade || "A*",
      currencyContext: data.currencyContext || "uk_intl",
      feedbackDepth: data.feedbackDepth || "detailed",
      timedModeDefault: data.timedModeDefault ?? true,
      showDiagramLabels: data.showDiagramLabels ?? true,
      navigationLayout: data.navigationLayout || "topbar",
    };

    try {
      const { data: existing } = await db
        .from("definitions")
        .select("id")
        .eq("term", term)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await db
          .from("definitions")
          .update({
            definition_text: JSON.stringify(payload),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await db.from("definitions").insert({
          term,
          definition_text: JSON.stringify(payload),
          category: "candidate_preferences",
          source_label: "Cambridge IGCSE 0455 Candidate Preferences",
        } as any);
      }
    } catch (err) {
      console.warn("Could not persist preferences in definitions table:", err);
    }

    try {
      await db.from("definitions").delete().eq("term", cacheTerm);
    } catch {
      // Non-fatal
    }

    return { ok: true, preferences: payload };
  });

const RegisterStudentInput = z.object({
  fullName: z.string().optional(),
  school: z.string().optional(),
  email: z.string().email("A valid email address is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

/**
 * Direct registration endpoint for Cambridge IGCSE 0455 candidates.
 * Creates an account with email_confirm: true (instant access, zero verification gate).
 */
export const registerStudent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RegisterStudentInput.parse(unwrapData(input)))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName?.trim() || email.split("@")[0];
    const school = data.school?.trim();

    // 1. Create candidate user in Auth with pre-confirmed email (zero verification requirement)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        school: school || undefined,
        role: "student",
      },
    });

    if (createError) {
      if (
        createError.message.includes("already registered") ||
        createError.message.includes("already exists")
      ) {
        throw new Error(
          "An account with this email already exists. Please sign in or reset your password.",
        );
      }
      throw new Error(createError.message);
    }

    const userId = createData.user.id;

    // 2. Set profile with student details
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      school: school || null,
    });

    // 3. Mark role directly as student
    await (supabaseAdmin.from("user_roles") as any).upsert({
      user_id: userId,
      role: "student",
    });

    return { success: true, userId };
  });

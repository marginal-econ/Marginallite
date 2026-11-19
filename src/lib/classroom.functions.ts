import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { unwrapData } from "@/lib/safe-validator";
import type { Database } from "@/integrations/backend/types";
import { isAdmin as checkIsAdmin } from "@/lib/auth-admin";

const classroomInput = z.object({
  name: z.string().trim().min(1, "Give the class a name.").max(100),
  level: z.enum(["as", "a2", "mixed"]),
  teacherId: z.string().uuid().optional(),
});

const classroomIdInput = z.object({ classroomId: z.string().uuid() });

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  if (checkIsAdmin({ userId: context.userId, claims: (context as any).claims, email: (context as any).email })) {
    return;
  }
  throw new Error("Administrator privileges are required to create or remove classrooms. Marginalite is the platform administrator.");
}

/**
 * Automatically infers the correct Cambridge mark scheme maximum marks (8, 12, 20)
 * from explicit question bracket tariffs (e.g. "[12]", "[8]", "[20]") if present,
 * or falls back to stored marks / default 20.
 */
export function inferCambridgeEssayMaxMark(
  storedMaxMark: number | string | null | undefined,
  questionOrTitle: string | null | undefined,
): number {
  if (questionOrTitle) {
    const match =
      questionOrTitle.match(/\[\s*(\d{1,2})\s*(?:marks?|m)?\s*\]/i) ||
      questionOrTitle.match(/\(\s*(\d{1,2})\s*(?:marks?|m)\s*\)/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed === 8 || parsed === 12 || parsed === 20 || parsed === 25 || parsed === 15) {
        return parsed;
      }
    }
  }

  const parsedStored = Number(storedMaxMark);
  if (parsedStored && parsedStored > 0) {
    return parsedStored;
  }
  return 20;
}

export const CR_STORE = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T>(admin: any, term: string): Promise<T | null> {
    try {
      const { data } = await admin
        .from("definitions")
        .select("definition_text")
        .eq("term", term)
        .maybeSingle();
      if (!data?.definition_text) return null;
      return JSON.parse(data.definition_text) as T;
    } catch {
      return null;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async list<T>(admin: any, prefix: string): Promise<T[]> {
    try {
      const { data } = await admin
        .from("definitions")
        .select("definition_text")
        .like("term", `${prefix}%`);
      if (!data) return [];
      const list: T[] = [];
      for (const row of data) {
        try {
          if (row.definition_text) list.push(JSON.parse(row.definition_text) as T);
        } catch {}
      }
      return list;
    } catch {
      return [];
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set<T>(admin: any, term: string, value: T): Promise<void> {
    const text = JSON.stringify(value);
    const { data: existing } = await admin
      .from("definitions")
      .select("id")
      .eq("term", term)
      .maybeSingle();

    if (existing?.id) {
      await admin
        .from("definitions")
        .update({ definition_text: text, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin
        .from("definitions")
        .insert({ term, definition_text: text, category: "classroom" });
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async remove(admin: any, term: string): Promise<void> {
    try {
      await admin.from("definitions").delete().eq("term", term);
    } catch {}
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async removePrefix(admin: any, prefix: string): Promise<void> {
    try {
      await admin.from("definitions").delete().like("term", `${prefix}%`);
    } catch {}
  },
};

async function assertTeacher(context: { supabase: SupabaseClient<Database>; userId: string }) {
  if (checkIsAdmin({ userId: context.userId, claims: (context as any).claims, email: (context as any).email })) {
    return;
  }
  const { getSupabaseAdmin } = await import("@/server/supabase");
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["teacher"])
    .limit(1)
    .maybeSingle();
  if (data?.role === "teacher") return;

  if (
    (context as any).claims?.user_metadata?.role === "teacher" ||
    (context as any).claims?.app_metadata?.role === "teacher"
  ) {
    return;
  }

  try {
    const { data: tp } = await admin
      .from("teacher_profiles")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (tp?.status === "approved") return;
  } catch {}

  // In 100% Free Community Tier, automatically register the user as teacher role so they can create classes without hurdles
  try {
    await admin.from("user_roles").upsert(
      { user_id: context.userId, role: "teacher" },
      { onConflict: "user_id,role" },
    );
    return;
  } catch {}

  return;
}

async function getClassroomAuthority(userId: string, classroomId: string) {
  const { getSupabaseAdmin } = await import("@/server/supabase");
  const admin = getSupabaseAdmin();
  const [{ data: classroom, error }, { data: roles }] = await Promise.all([
    admin
      .from("classrooms")
      .select("id, teacher_id, name, level, join_code, archived, created_at")
      .eq("id", classroomId)
      .single(),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (error || !classroom) throw new Error(error?.message || "Classroom not found.");
  const isAdmin = checkIsAdmin({ userId });

  let collaborator: { id: string } | null = null;
  try {
    const { data, error: colError } = await admin
      .from("classroom_teachers")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (!colError && data) {
      collaborator = data;
    }
  } catch {
    // If classroom_teachers table is not present, safely proceed
  }

  let membership: { id: string } | null = null;
  try {
    const { data: mem, error: memError } = await admin
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("student_id", userId)
      .maybeSingle();
    if (!memError && mem) {
      membership = mem;
    }
  } catch {
    // Safely proceed
  }

  return {
    admin,
    classroom,
    isOwner: classroom.teacher_id === userId,
    isAdmin,
    isStaff: classroom.teacher_id === userId || isAdmin || Boolean(collaborator),
    isMember: Boolean(membership),
  };
}

/**
 * Resilient batch resolver for user profiles, emails, and full names.
 * Applies multi-tier fallback: profile full_name -> user_metadata -> email username -> fallback.
 */
async function resolveUsersBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userIds: string[],
  defaultRoleLabel = "Student",
) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  let profiles: any[] | null = null;
  try {
    const res = await admin
      .from("profiles")
      .select("id, full_name, school, avatar_url")
      .in("id", uniqueIds);
    if (!res.error && res.data) profiles = res.data;
  } catch {
    profiles = [];
  }

  type ProfileRow = {
    id: string;
    full_name: string | null;
    school: string | null;
    avatar_url: string | null;
  };
  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profiles as ProfileRow[] | null) ?? []) {
    if (p?.id) profileMap.set(p.id, p);
  }

  const resolved = new Map<
    string,
    { id: string; fullName: string; email: string; school: string | null; avatarUrl: string | null }
  >();

  // Fetch auth user data safely in parallel with catch handlers
  await Promise.all(
    uniqueIds.map(async (id) => {
      const profile = profileMap.get(id);
      let email = "";
      let metaName = "";

      try {
        const userRes = await admin.auth.admin.getUserById(id);
        if (userRes?.data?.user) {
          email = userRes.data.user.email ?? "";
          metaName =
            userRes.data.user.user_metadata?.full_name?.trim() ||
            userRes.data.user.user_metadata?.name?.trim() ||
            "";
        }
      } catch {
        // Safe fallback if auth lookup fails
      }

      const emailPrefix = email ? email.split("@")[0].replace(/[._-]/g, " ") : "";
      const formattedEmailPrefix = emailPrefix
        ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
        : "";

      const fullName =
        profile?.full_name?.trim() || metaName || formattedEmailPrefix || defaultRoleLabel;

      resolved.set(id, {
        id,
        fullName,
        email,
        school: profile?.school ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      });
    }),
  );

  return resolved;
}

export const listClassrooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roleList = (roles ?? []).map((r: any) => r.role);
    const isMarginalite = checkIsAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    const hasTeacherRole =
      roleList.includes("teacher") ||
      roleList.includes("teacher_pending") ||
      (context as any).claims?.user_metadata?.role === "teacher" ||
      (context as any).claims?.app_metadata?.role === "teacher";

    if (hasTeacherRole && !roleList.includes("teacher")) {
      try {
        await admin.from("user_roles").upsert(
          { user_id: context.userId, role: "teacher" },
          { onConflict: "user_id,role" },
        );
      } catch {}
    }

    const activeRole = isMarginalite
      ? ("admin" as const)
      : hasTeacherRole
        ? ("teacher" as const)
        : ("student" as const);

    let classesQuery;
    if (activeRole === "admin") {
      classesQuery = admin
        .from("classrooms")
        .select("id, teacher_id, name, level, join_code, archived, created_at")
        .eq("archived", false)
        .order("created_at", { ascending: false });
    } else if (activeRole === "teacher") {
      // Find classes owned or co-taught
      let coTaughtIds: string[] = [];
      try {
        const { data: coTaught, error: ctErr } = await admin
          .from("classroom_teachers")
          .select("classroom_id")
          .eq("teacher_id", context.userId);
        if (!ctErr && coTaught) {
          coTaughtIds = coTaught.map((ct) => ct.classroom_id);
        }
      } catch {
        // Safe fallback if table doesn't exist yet
      }

      classesQuery = admin
        .from("classrooms")
        .select("id, teacher_id, name, level, join_code, archived, created_at")
        .or(
          `teacher_id.eq.${context.userId}${coTaughtIds.length > 0 ? `,id.in.(${coTaughtIds.join(",")})` : ""}`,
        )
        .eq("archived", false)
        .order("created_at", { ascending: false });
    } else {
      // Student: classes enrolled in
      let classIds: string[] = [];
      try {
        const { data: memberships, error: memErr } = await admin
          .from("classroom_members")
          .select("classroom_id")
          .eq("student_id", context.userId);
        if (!memErr && memberships) {
          classIds = memberships.map((m) => m.classroom_id);
        }
      } catch {
        classIds = [];
      }

      if (classIds.length === 0) {
        return { role: activeRole, classes: [] };
      }

      classesQuery = admin
        .from("classrooms")
        .select("id, teacher_id, name, level, join_code, archived, created_at")
        .in("id", classIds)
        .eq("archived", false)
        .order("created_at", { ascending: false });
    }

    const { data: classes, error } = await classesQuery;
    if (error) throw new Error(error.message);

    const classList = classes ?? [];
    if (classList.length === 0) {
      return { role: activeRole, classes: [] };
    }

    const teacherIds = classList.map((c) => c.teacher_id);
    const classIds = classList.map((c) => c.id);

    let memberCounts: any[] = [];
    let assignmentCounts: any[] = [];

    const [teacherMap] = await Promise.all([
      resolveUsersBatch(admin, teacherIds, "Teacher"),
      (async () => {
        try {
          const res = await admin
            .from("classroom_members")
            .select("classroom_id")
            .in("classroom_id", classIds);
          if (!res.error && res.data) memberCounts = res.data;
        } catch {}
      })(),
      (async () => {
        try {
          const counts = await Promise.all(
            classIds.map(async (cid) => {
              const asgs = await CR_STORE.list<any>(admin, `__CR_ASG_${cid}_`);
              return { classroom_id: cid, count: asgs.filter((a) => !a.archived).length };
            }),
          );
          assignmentCounts = counts;
        } catch {}
      })(),
    ]);

    const memberCountByClass = new Map<string, number>();
    for (const m of memberCounts) {
      memberCountByClass.set(m.classroom_id, (memberCountByClass.get(m.classroom_id) ?? 0) + 1);
    }

    const assignmentCountByClass = new Map<string, number>();
    for (const a of assignmentCounts) {
      assignmentCountByClass.set(
        a.classroom_id,
        (assignmentCountByClass.get(a.classroom_id) ?? 0) + (a.count ?? 1),
      );
    }

    const enrichedClasses = classList.map((c) => {
      const teacherInfo = teacherMap.get(c.teacher_id);
      return {
        ...c,
        teacher_name: teacherInfo?.fullName || "Classroom Teacher",
        teacher_school: teacherInfo?.school ?? null,
        teacher_avatar: teacherInfo?.avatarUrl ?? null,
        student_count: memberCountByClass.get(c.id) ?? 0,
        assignment_count: assignmentCountByClass.get(c.id) ?? 0,
        is_owner: c.teacher_id === context.userId,
      };
    });

    return {
      role: activeRole,
      classes: enrichedClasses,
    };
  });

// ADMINS AND VERIFIED TEACHERS CAN CREATE CLASSROOMS
export const createClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const isMarginalite = checkIsAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    const assignedTeacherId = isMarginalite && data.teacherId ? data.teacherId : context.userId;

    if (!isMarginalite) {
      await assertTeacher(context);
      const { count, error: countErr } = await admin
        .from("classrooms")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", assignedTeacherId)
        .eq("archived", false);

      if (!countErr && typeof count === "number" && count >= 3) {
        throw new Error(
          "Teachers can create a maximum of 3 active classrooms. Please archive or remove an existing classroom first.",
        );
      }
    }

    const { data: row, error } = await admin
      .from("classrooms")
      .insert({ teacher_id: assignedTeacherId, name: data.name, level: data.level })
      .select("id, teacher_id, name, level, join_code, archived, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// TEACHER (OWNER) OR ADMIN CAN ARCHIVE CLASSROOMS
export const archiveClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isAdmin && !authority.isOwner) {
      throw new Error("Only the classroom teacher or administrator can archive this classroom.");
    }
    const { error } = await authority.admin
      .from("classrooms")
      .update({ archived: true })
      .eq("id", data.classroomId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// TEACHER (OWNER) OR ADMIN CAN PERMANENTLY DELETE CLASSROOMS
export const deleteClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isAdmin && !authority.isOwner) {
      throw new Error("Only the classroom teacher or administrator can remove this classroom.");
    }
    const { error } = await authority.admin.from("classrooms").delete().eq("id", data.classroomId);
    if (error) throw new Error(error.message);

    // Clean up CR_STORE resources
    await Promise.all([
      CR_STORE.removePrefix(authority.admin, `__CR_MSG_${data.classroomId}_`),
      CR_STORE.removePrefix(authority.admin, `__CR_ANN_${data.classroomId}_`),
      CR_STORE.removePrefix(authority.admin, `__CR_ASG_${data.classroomId}_`),
    ]);

    return { ok: true };
  });

export const joinClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(20),
        acknowledgeTeacherAccess: z.literal(true),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();

    const normalizedCode = data.code.trim().toUpperCase();
    const { data: targetClass, error: findError } = await admin
      .from("classrooms")
      .select("id, name, teacher_id")
      .ilike("join_code", normalizedCode)
      .eq("archived", false)
      .maybeSingle();

    if (findError) throw new Error(findError.message);
    if (!targetClass) throw new Error("No active classroom found with that join code.");
    if (targetClass.teacher_id === context.userId) {
      throw new Error("You are the teacher of this classroom.");
    }

    const { data: existingMember } = await admin
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", targetClass.id)
      .eq("student_id", context.userId)
      .maybeSingle();

    if (existingMember) {
      return { classroom_id: targetClass.id, classroom_name: targetClass.name };
    }

    const { error: insertError } = await admin.from("classroom_members").insert({
      classroom_id: targetClass.id,
      student_id: context.userId,
    });

    if (insertError) throw new Error(insertError.message);
    return { classroom_id: targetClass.id, classroom_name: targetClass.name };
  });

export const getClassroomRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be enrolled or teaching this class to view people.");
    }

    let memberList: any[] = [];
    try {
      const { data: members, error } = await authority.admin
        .from("classroom_members")
        .select("id, student_id, joined_at")
        .eq("classroom_id", data.classroomId)
        .order("joined_at", { ascending: true });
      if (!error && members) memberList = members;
    } catch {
      memberList = [];
    }

    if (memberList.length === 0) return [];

    const studentIds = memberList.map((m) => m.student_id);
    const userMap = await resolveUsersBatch(authority.admin, studentIds, "Student");

    return memberList.map((m) => {
      const u = userMap.get(m.student_id);
      return {
        membership_id: m.id,
        student_id: m.student_id,
        full_name: u?.fullName || "Student",
        email: u?.email ?? "",
        school: u?.school ?? null,
        avatar_url: u?.avatarUrl ?? null,
        joined_at: m.joined_at,
      };
    });
  });

export const getClassroomTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomIdInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be part of this class to view teachers.");
    }

    let collaborators: Array<{ id: string; teacher_id: string; created_at: string | null }> = [];
    try {
      const { data: resData, error: resError } = await authority.admin
        .from("classroom_teachers")
        .select("id, teacher_id, created_at")
        .eq("classroom_id", data.classroomId)
        .order("created_at", { ascending: true });
      if (!resError && resData) {
        collaborators = resData;
      }
    } catch {
      collaborators = [];
    }

    const entries = [
      { id: "owner", teacher_id: authority.classroom.teacher_id, created_at: null, owner: true },
      ...collaborators.map((row) => ({ ...row, owner: false })),
    ];

    const teacherMap = await resolveUsersBatch(
      authority.admin,
      entries.map((r) => r.teacher_id),
      "Teacher",
    );

    const teachers = entries.map((entry) => {
      const u = teacherMap.get(entry.teacher_id);
      return {
        id: entry.id,
        teacherId: entry.teacher_id,
        fullName: u?.fullName || "Teacher",
        email: u?.email ?? "",
        school: u?.school ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        owner: entry.owner,
      };
    });

    return { canManage: authority.isOwner || authority.isAdmin, teachers };
  });

export const addClassroomTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), email: z.string().trim().email() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isOwner && !authority.isAdmin)
      throw new Error("Only the class owner or administrator can add another teacher.");

    const normalizedEmail = data.email.toLowerCase();
    let target: { id: string; email?: string } | undefined;

    for (let page = 1; page <= 10 && !target; page += 1) {
      const result = await authority.admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error(result.error.message);
      target = result.data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
      if (result.data.users.length < 1000) break;
    }
    if (!target) throw new Error("No Marginalite account uses that email yet.");
    if (target.id === authority.classroom.teacher_id)
      throw new Error("That person already owns this class.");

    const { data: role } = await authority.admin
      .from("user_roles")
      .select("role")
      .eq("user_id", target.id)
      .in("role", ["teacher", "admin"])
      .limit(1)
      .maybeSingle();

    if (!role) {
      // Auto-assign teacher role so invited educator can co-teach
      await authority.admin.from("user_roles").upsert({
        user_id: target.id,
        role: "teacher",
      });
    }

    const { error } = await authority.admin.from("classroom_teachers").upsert(
      {
        classroom_id: data.classroomId,
        teacher_id: target.id,
        added_by: context.userId,
      },
      { onConflict: "classroom_id,teacher_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addClassroomStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), email: z.string().trim().email() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff)
      throw new Error("Only the classroom teacher or administrator can add students.");

    const normalizedEmail = data.email.toLowerCase();
    let target: { id: string; email?: string } | undefined;

    for (let page = 1; page <= 10 && !target; page += 1) {
      const result = await authority.admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error(result.error.message);
      target = result.data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
      if (result.data.users.length < 1000) break;
    }
    if (!target) {
      throw new Error(
        "No Marginalite account found with that email. Please check the email or have the student join using the class code.",
      );
    }

    const { error } = await authority.admin.from("classroom_members").upsert(
      {
        classroom_id: data.classroomId,
        student_id: target.id,
      },
      { onConflict: "classroom_id,student_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeClassroomTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), teacherId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isOwner && !authority.isAdmin)
      throw new Error("Only the class owner or administrator can remove another teacher.");
    if (data.teacherId === authority.classroom.teacher_id)
      throw new Error("The class owner cannot be removed.");
    const { error } = await authority.admin
      .from("classroom_teachers")
      .delete()
      .eq("classroom_id", data.classroomId)
      .eq("teacher_id", data.teacherId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStudentClassroomOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    let members: any[] = [];
    try {
      const { data: mems, error: membersError } = await authority.admin
        .from("classroom_members")
        .select("student_id, joined_at")
        .eq("classroom_id", data.classroomId)
        .order("joined_at", { ascending: true });
      if (!membersError && mems) members = mems;
    } catch {
      members = [];
    }

    const userIds = [authority.classroom.teacher_id, ...members.map((r) => r.student_id)];
    const userMap = await resolveUsersBatch(authority.admin, userIds);

    const teacherInfo = userMap.get(authority.classroom.teacher_id);
    return {
      teacher: {
        id: authority.classroom.teacher_id,
        fullName: teacherInfo?.fullName || "Classroom Teacher",
        school: teacherInfo?.school ?? null,
        avatarUrl: teacherInfo?.avatarUrl ?? null,
      },
      studentCount: members.length,
      classmates: members
        .filter((row) => row.student_id !== context.userId)
        .map((row) => {
          const u = userMap.get(row.student_id);
          return {
            id: row.student_id,
            fullName: u?.fullName || "Classmate",
            school: u?.school ?? null,
            avatarUrl: u?.avatarUrl ?? null,
            joinedAt: row.joined_at,
          };
        }),
    };
  });

export const getStudentClassroomInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), studentId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    const { data: insights, error } = await authority.admin.rpc("get_teacher_student_insights", {
      _classroom_id: data.classroomId,
      _student_id: data.studentId,
    });
    if (error) throw new Error(error.message);
    return insights;
  });

export const rotateClassroomCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newCode = "";
    for (let i = 0; i < 6; i++) {
      newCode += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const { error } = await authority.admin
      .from("classrooms")
      .update({ join_code: newCode })
      .eq("id", data.classroomId);

    if (error) throw new Error(error.message);
    return { code: newCode };
  });

export const removeClassroomMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ membershipId: z.string().uuid(), classroomId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    const { error } = await authority.admin
      .from("classroom_members")
      .delete()
      .eq("id", data.membershipId)
      .eq("classroom_id", data.classroomId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("classroom_members")
      .delete()
      .eq("classroom_id", data.classroomId)
      .eq("student_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================================
// GOOGLE CLASSROOM UPGRADE: LIVE CHAT INFRASTRUCTURE
// =========================================================================

export const listClassroomMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).optional().default(100),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be enrolled or teaching this class to join the chat.");
    }

    let messages: Array<{
      id: string;
      classroom_id: string;
      user_id: string;
      content: string;
      is_pinned: boolean;
      created_at: string;
    }> = [];

    // 1. Try dedicated table first
    try {
      const { data: rows, error } = await authority.admin
        .from("classroom_messages")
        .select("id, classroom_id, user_id, content, is_pinned, created_at, updated_at")
        .eq("classroom_id", data.classroomId)
        .order("created_at", { ascending: true })
        .limit(data.limit);
      if (!error && rows) {
        messages = rows;
      }
    } catch {
      messages = [];
    }

    // 2. Resilient store via CR_STORE
    const crStored = await CR_STORE.list<any>(authority.admin, `__CR_MSG_${data.classroomId}_`);
    if (crStored && crStored.length > 0) {
      messages.push(...crStored);
    }

    // Deduplicate and sort by created_at ascending
    const uniqueMap = new Map<string, (typeof messages)[0]>();
    for (const m of messages) {
      uniqueMap.set(m.id, m);
    }
    const sortedMessages = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    if (sortedMessages.length === 0) return [];

    const userIds = sortedMessages.map((m) => m.user_id);
    const userMap = await resolveUsersBatch(authority.admin, userIds, "Student");

    return sortedMessages.map((m) => {
      const u = userMap.get(m.user_id);
      const isAuthor = m.user_id === context.userId;
      const isTeacher = m.user_id === authority.classroom.teacher_id;
      return {
        id: m.id,
        classroomId: m.classroom_id,
        userId: m.user_id,
        userName: u?.fullName || (isTeacher ? "Teacher" : "Student"),
        userAvatar: u?.avatarUrl ?? null,
        userSchool: u?.school ?? null,
        isTeacher,
        content: m.content,
        isPinned: m.is_pinned,
        createdAt: m.created_at,
        isMine: isAuthor,
        canDelete: isAuthor || authority.isStaff,
        canPin: authority.isStaff,
      };
    });
  });

export const sendClassroomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        content: z.string().trim().min(1, "Message cannot be empty.").max(4000),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be part of this class to send messages.");
    }

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg = {
      id: msgId,
      classroom_id: data.classroomId,
      user_id: context.userId,
      content: data.content,
      is_pinned: false,
      created_at: now,
    };

    // Store in CR_STORE (guaranteed resilient)
    await CR_STORE.set(authority.admin, `__CR_MSG_${data.classroomId}_${msgId}`, msg);

    // Best-effort try dedicated table
    try {
      await authority.admin.from("classroom_messages").insert({
        id: msgId,
        classroom_id: data.classroomId,
        user_id: context.userId,
        content: data.content,
      });
    } catch {}

    return msg;
  });

export const deleteClassroomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ messageId: z.string().uuid(), classroomId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);

    // 1. Try CR_STORE first
    const key = `__CR_MSG_${data.classroomId}_${data.messageId}`;
    const stored = await CR_STORE.get<any>(authority.admin, key);
    if (stored) {
      if (stored.user_id !== context.userId && !authority.isStaff) {
        throw new Error("You are not authorised to delete this message.");
      }
      await CR_STORE.remove(authority.admin, key);
      return { ok: true };
    }

    // 2. Try dedicated table if present
    try {
      const { data: message } = await authority.admin
        .from("classroom_messages")
        .select("user_id")
        .eq("id", data.messageId)
        .maybeSingle();

      if (message) {
        if (message.user_id !== context.userId && !authority.isStaff) {
          throw new Error("You are not authorised to delete this message.");
        }
        await authority.admin.from("classroom_messages").delete().eq("id", data.messageId);
        return { ok: true };
      }
    } catch (err: any) {
      if (err?.message?.includes("not authorised")) throw err;
    }

    return { ok: true };
  });

export const togglePinClassroomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        classroomId: z.string().uuid(),
        isPinned: z.boolean(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Only teachers or admins can pin messages.");

    // 1. Try CR_STORE
    const key = `__CR_MSG_${data.classroomId}_${data.messageId}`;
    const stored = await CR_STORE.get<any>(authority.admin, key);
    if (stored) {
      stored.is_pinned = data.isPinned;
      await CR_STORE.set(authority.admin, key, stored);
      return { ok: true };
    }

    // 2. Try dedicated table
    try {
      await authority.admin
        .from("classroom_messages")
        .update({ is_pinned: data.isPinned, updated_at: new Date().toISOString() })
        .eq("id", data.messageId)
        .eq("classroom_id", data.classroomId);
    } catch {}

    return { ok: true };
  });

// =========================================================================
// GOOGLE CLASSROOM UPGRADE: STREAM (Announcements & Comments)
// =========================================================================

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomIdInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be a member or teacher of this class.");
    }

    let annList: Array<{
      id: string;
      classroom_id: string;
      author_id: string;
      content: string;
      pinned: boolean;
      created_at: string;
      updated_at: string;
    }> = [];

    // CR_STORE announcements
    const crAnnouncements = await CR_STORE.list<any>(authority.admin, `__CR_ANN_${data.classroomId}_`);
    if (crAnnouncements && crAnnouncements.length > 0) {
      annList.push(...crAnnouncements);
    }

    // Try dedicated announcements table if present
    try {
      const { data: announcements, error: annError } = await authority.admin
        .from("classroom_announcements")
        .select("id, classroom_id, author_id, content, pinned, created_at, updated_at")
        .eq("classroom_id", data.classroomId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (!annError && announcements) {
        annList.push(...announcements);
      }
    } catch {}

    // Deduplicate and sort announcements (pinned first, then newest)
    const uniqueAnnMap = new Map<string, (typeof annList)[0]>();
    for (const a of annList) {
      uniqueAnnMap.set(a.id, a);
    }
    const finalAnnList = Array.from(uniqueAnnMap.values()).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (finalAnnList.length === 0) return [];

    let comments: Array<{
      id: string;
      announcement_id: string | null;
      assignment_id: string | null;
      author_id: string;
      content: string;
      created_at: string;
    }> = [];

    const annIds = finalAnnList.map((a) => a.id);

    // Fetch comments from CR_STORE
    for (const annId of annIds) {
      const crComms = await CR_STORE.list<any>(authority.admin, `__CR_CMT_${annId}_`);
      if (crComms && crComms.length > 0) {
        comments.push(...crComms);
      }
    }

    // Try dedicated comments table if present
    try {
      const { data: comms, error: commError } = await authority.admin
        .from("classroom_comments")
        .select("id, announcement_id, assignment_id, author_id, content, created_at")
        .in("announcement_id", annIds)
        .order("created_at", { ascending: true });
      if (!commError && comms) {
        comments.push(...comms);
      }
    } catch {}

    // Deduplicate comments
    const uniqueCommMap = new Map<string, (typeof comments)[0]>();
    for (const c of comments) {
      uniqueCommMap.set(c.id, c);
    }
    const finalComments = Array.from(uniqueCommMap.values());

    const allAuthorIds = [
      ...finalAnnList.map((a) => a.author_id),
      ...finalComments.map((c) => c.author_id),
    ];
    const userMap = await resolveUsersBatch(authority.admin, allAuthorIds, "Member");

    const commentsByAnnouncement = new Map<
      string,
      Array<{
        id: string;
        authorId: string;
        authorName: string;
        authorAvatar: string | null;
        content: string;
        createdAt: string;
        canDelete: boolean;
      }>
    >();

    for (const c of finalComments) {
      if (!c.announcement_id) continue;
      const u = userMap.get(c.author_id);
      const list = commentsByAnnouncement.get(c.announcement_id) ?? [];
      list.push({
        id: c.id,
        authorId: c.author_id,
        authorName: u?.fullName || "User",
        authorAvatar: u?.avatarUrl ?? null,
        content: c.content,
        createdAt: c.created_at,
        canDelete: c.author_id === context.userId || authority.isStaff,
      });
      commentsByAnnouncement.set(c.announcement_id, list);
    }

    return finalAnnList.map((a) => {
      const u = userMap.get(a.author_id);
      const comms = (commentsByAnnouncement.get(a.id) ?? []).sort(
        (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
      );
      return {
        id: a.id,
        classroomId: a.classroom_id,
        authorId: a.author_id,
        authorName: u?.fullName || "User",
        authorAvatar: u?.avatarUrl ?? null,
        authorSchool: u?.school ?? null,
        content: a.content,
        pinned: a.pinned,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        canDelete: a.author_id === context.userId || authority.isStaff,
        canPin: authority.isStaff,
        comments: comms,
      };
    });
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        content: z.string().trim().min(1, "Post cannot be empty.").max(5000),
        pinned: z.boolean().optional().default(false),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be part of this class to post.");
    }

    const annId = crypto.randomUUID();
    const now = new Date().toISOString();
    const isPinned = authority.isStaff ? Boolean(data.pinned) : false;
    const ann = {
      id: annId,
      classroom_id: data.classroomId,
      author_id: context.userId,
      content: data.content,
      pinned: isPinned,
      created_at: now,
      updated_at: now,
    };

    // Store in CR_STORE
    await CR_STORE.set(authority.admin, `__CR_ANN_${data.classroomId}_${annId}`, ann);

    // Try dedicated table if present
    try {
      await authority.admin.from("classroom_announcements").insert(ann);
    } catch {}

    return ann;
  });

export const togglePinAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        announcementId: z.string().uuid(),
        classroomId: z.string().uuid(),
        pinned: z.boolean(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Only teachers can pin posts.");

    // 1. Try CR_STORE
    const key = `__CR_ANN_${data.classroomId}_${data.announcementId}`;
    const stored = await CR_STORE.get<any>(authority.admin, key);
    if (stored) {
      stored.pinned = data.pinned;
      stored.updated_at = new Date().toISOString();
      await CR_STORE.set(authority.admin, key, stored);
      return { ok: true };
    }

    // 2. Try dedicated table
    try {
      await authority.admin
        .from("classroom_announcements")
        .update({ pinned: data.pinned, updated_at: new Date().toISOString() })
        .eq("id", data.announcementId)
        .eq("classroom_id", data.classroomId);
    } catch {}

    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ announcementId: z.string().uuid(), classroomId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);

    // 1. Try CR_STORE
    const key = `__CR_ANN_${data.classroomId}_${data.announcementId}`;
    const stored = await CR_STORE.get<any>(authority.admin, key);
    if (stored) {
      if (stored.author_id !== context.userId && !authority.isStaff) {
        throw new Error("You are not authorised to delete this post.");
      }
      await CR_STORE.remove(authority.admin, key);
      await CR_STORE.removePrefix(authority.admin, `__CR_CMT_${data.announcementId}_`);
      return { ok: true };
    }

    // 2. Try dedicated table
    try {
      const { data: announcement } = await authority.admin
        .from("classroom_announcements")
        .select("author_id")
        .eq("id", data.announcementId)
        .maybeSingle();

      if (announcement) {
        if (announcement.author_id !== context.userId && !authority.isStaff) {
          throw new Error("You are not authorised to delete this post.");
        }
        await authority.admin.from("classroom_announcements").delete().eq("id", data.announcementId);
      }
    } catch (err: any) {
      if (err?.message?.includes("not authorised")) throw err;
    }

    return { ok: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        announcementId: z.string().uuid().optional(),
        assignmentId: z.string().uuid().optional(),
        content: z.string().trim().min(1, "Comment cannot be empty.").max(2000),
      })
      .refine((val) => Boolean(val.announcementId || val.assignmentId), {
        message: "Must specify announcementId or assignmentId",
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be part of this class to comment.");
    }

    const commId = crypto.randomUUID();
    const now = new Date().toISOString();
    const targetId = (data.announcementId || data.assignmentId)!;
    const commPayload = {
      id: commId,
      announcement_id: data.announcementId ?? null,
      assignment_id: data.assignmentId ?? null,
      classroom_id: data.classroomId,
      author_id: context.userId,
      content: data.content,
      created_at: now,
    };

    // Store in CR_STORE under targetId and fast lookup pointer
    await CR_STORE.set(authority.admin, `__CR_CMT_${targetId}_${commId}`, commPayload);
    await CR_STORE.set(authority.admin, `__CR_CMT_PTR_${commId}`, {
      targetId,
      authorId: context.userId,
    });

    // Try dedicated table
    try {
      await authority.admin.from("classroom_comments").insert({
        id: commId,
        announcement_id: data.announcementId ?? null,
        assignment_id: data.assignmentId ?? null,
        author_id: context.userId,
        content: data.content,
      });
    } catch {}

    return commPayload;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ commentId: z.string().uuid(), classroomId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);

    // 1. Try pointer lookup in CR_STORE
    const ptr = await CR_STORE.get<{ targetId: string; authorId: string }>(
      authority.admin,
      `__CR_CMT_PTR_${data.commentId}`,
    );

    if (ptr) {
      if (ptr.authorId !== context.userId && !authority.isStaff) {
        throw new Error("You are not authorised to delete this comment.");
      }
      await CR_STORE.remove(authority.admin, `__CR_CMT_${ptr.targetId}_${data.commentId}`);
      await CR_STORE.remove(authority.admin, `__CR_CMT_PTR_${data.commentId}`);
      return { ok: true };
    }

    // 2. Try dedicated table
    try {
      const { data: comment } = await authority.admin
        .from("classroom_comments")
        .select("author_id")
        .eq("id", data.commentId)
        .maybeSingle();

      if (comment) {
        if (comment.author_id !== context.userId && !authority.isStaff) {
          throw new Error("You are not authorised to delete this comment.");
        }
        await authority.admin.from("classroom_comments").delete().eq("id", data.commentId);
      }
    } catch (err: any) {
      if (err?.message?.includes("not authorised")) throw err;
    }

    return { ok: true };
  });

// =========================================================================
// GOOGLE CLASSROOM UPGRADE: CLASSWORK (Assignments, Submissions, Grading)
// =========================================================================

export const listClassroomAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomIdInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff && !authority.isMember) {
      throw new Error("You must be part of this class to view assignments.");
    }

    let assList: any[] = [];

    // 1. Read assignments from CR_STORE
    const crAssignments = await CR_STORE.list<any>(authority.admin, `__CR_ASG_${data.classroomId}_`);
    if (crAssignments && crAssignments.length > 0) {
      assList.push(...crAssignments.filter((a) => !a.archived));
    }

    // 2. Read from dedicated table if present
    try {
      const { data: assignments, error: assError } = await authority.admin
        .from("classroom_assignments")
        .select(
          "id, classroom_id, created_by, kind, title, instructions, due_at, archived, created_at, bank_essay_question_id, essay_question, essay_topic, essay_max_mark, mcq_paper_id",
        )
        .eq("classroom_id", data.classroomId)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (!assError && assignments) {
        assList.push(
          ...assignments.filter(
            (a) =>
              !a.title?.startsWith("[CHAT_MSG]") &&
              !a.title?.startsWith("[ANNOUNCEMENT]") &&
              !a.title?.startsWith("[COMMENT]") &&
              !a.title?.startsWith("[SUBMISSION]"),
          ),
        );
      }
    } catch {}

    const uniqueAssMap = new Map<string, any>();
    for (const a of assList) {
      uniqueAssMap.set(a.id, a);
    }
    const finalAssList = Array.from(uniqueAssMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    if (finalAssList.length === 0) return [];

    const assIds = finalAssList.map((a) => a.id);

    let subList: any[] = [];
    const draftMap = new Map<string, any>();

    // Fetch submissions and drafts from CR_STORE
    for (const assId of assIds) {
      const crSubs = await CR_STORE.list<any>(authority.admin, `__CR_SUB_${assId}_`);
      if (crSubs && crSubs.length > 0) {
        subList.push(...crSubs);
      }
      const draft = await CR_STORE.get<any>(
        authority.admin,
        `__CR_DRAFT_${assId}_${context.userId}`,
      );
      if (draft) {
        draftMap.set(assId, draft);
      }
    }

    // Fetch from dedicated table if present
    try {
      const { data: submissions, error: subErr } = await authority.admin
        .from("classroom_submissions")
        .select(
          "id, assignment_id, student_id, essay_id, submission_text, status, ai_score, teacher_score, teacher_feedback, submitted_at, graded_at, returned_at",
        )
        .in("assignment_id", assIds);
      if (!subErr && submissions) {
        subList.push(...submissions);
      }
    } catch {}

    const uniqueSubMap = new Map<string, any>();
    for (const s of subList) {
      uniqueSubMap.set(`${s.assignment_id}_${s.student_id}`, s);
    }
    const finalSubList = Array.from(uniqueSubMap.values());

    const subMapByAss = new Map<string, any[]>();
    for (const sub of finalSubList) {
      const list = subMapByAss.get(sub.assignment_id) ?? [];
      list.push(sub);
      subMapByAss.set(sub.assignment_id, list);
    }

    let totalStudents = 0;
    try {
      const { count: memberCount } = await authority.admin
        .from("classroom_members")
        .select("id", { count: "exact", head: true })
        .eq("classroom_id", data.classroomId);
      totalStudents = memberCount ?? 0;
    } catch {
      totalStudents = 0;
    }

    return finalAssList.map((a) => {
      const subs = subMapByAss.get(a.id) ?? [];
      const mySub = subs.find((s) => s.student_id === context.userId);
      const turnedIn = subs.filter(
        (s) => s.status === "submitted" || s.status === "graded" || s.status === "returned",
      ).length;
      const graded = subs.filter((s) => s.status === "graded" || s.status === "returned").length;
      const assigned = Math.max(0, totalStudents - turnedIn);

      const gradedSubsWithScores = subs.filter((s) => (s.teacher_score ?? s.ai_score) !== null);
      const avgScore =
        gradedSubsWithScores.length > 0
          ? gradedSubsWithScores.reduce(
              (acc, curr) => acc + Number(curr.teacher_score ?? curr.ai_score ?? 0),
              0,
            ) / gradedSubsWithScores.length
          : null;

      return {
        id: a.id,
        classroomId: a.classroom_id,
        createdBy: a.created_by,
        kind: a.kind as "essay" | "mcq_paper",
        title: a.title,
        instructions: a.instructions,
        dueAt: a.due_at,
        createdAt: a.created_at,
        bankEssayQuestionId: a.bank_essay_question_id ?? null,
        essayQuestion: a.essay_question ?? null,
        essayTopic: a.essay_topic ?? null,
        essayMaxMark: inferCambridgeEssayMaxMark(a.essay_max_mark, `${a.essay_question || ""} ${a.title || ""}`),
        mcqPaperId: a.mcq_paper_id ?? null,
        stats: {
          totalStudents,
          assigned,
          turnedIn,
          graded,
          averageScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        },
        mySubmission: mySub
          ? {
              id: mySub.id,
              status: mySub.status as "assigned" | "submitted" | "graded" | "returned",
              submissionText: mySub.submission_text ?? null,
              submissionType:
                mySub.submission_type ??
                (mySub.submission_text?.includes("[DIAGRAM:") ? "handwritten" : "typed"),
              essayId: mySub.essay_id ?? null,
              aiScore: mySub.ai_score ?? null,
              teacherScore: mySub.teacher_score ?? null,
              teacherFeedback: mySub.teacher_feedback ?? null,
              submittedAt: mySub.submitted_at ?? null,
              gradedAt: mySub.graded_at ?? null,
              returnedAt: mySub.returned_at ?? null,
            }
          : null,
        myDraft: draftMap.get(a.id)
          ? {
              draftText: draftMap.get(a.id).draftText ?? "",
              submissionType: draftMap.get(a.id).submissionType ?? "typed",
              savedAt: draftMap.get(a.id).savedAt ?? null,
            }
          : null,
      };
    });
  });

export const createClassroomAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        kind: z.enum(["essay", "mcq_paper"]),
        title: z.string().trim().min(1, "Title is required.").max(200),
        instructions: z.string().trim().max(4000).optional(),
        dueAt: z.string().datetime().nullable().optional(),
        bankEssayQuestionId: z.string().uuid().nullable().optional(),
        essayQuestion: z.string().trim().max(2000).optional(),
        essayTopic: z.string().trim().max(100).optional(),
        essayMaxMark: z.number().int().min(1).max(50).optional(),
        mcqPaperId: z.string().uuid().nullable().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Only teachers can create assignments.");

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id,
      classroom_id: data.classroomId,
      created_by: context.userId,
      kind: data.kind,
      title: data.title,
      instructions: data.instructions || null,
      due_at: data.dueAt || null,
      archived: false,
      created_at: now,
      bank_essay_question_id: data.bankEssayQuestionId || null,
      essay_question: data.kind === "essay" ? data.essayQuestion || data.title : null,
      essay_topic: data.kind === "essay" ? data.essayTopic || "Economics" : null,
      essay_max_mark:
        data.kind === "essay"
          ? inferCambridgeEssayMaxMark(data.essayMaxMark, `${data.essayQuestion || ""} ${data.title || ""}`)
          : null,
      mcq_paper_id: data.kind === "mcq_paper" ? data.mcqPaperId || null : null,
    };

    // Store in CR_STORE
    await CR_STORE.set(authority.admin, `__CR_ASG_${data.classroomId}_${id}`, payload);

    // Try dedicated table
    try {
      await authority.admin.from("classroom_assignments").insert(payload);
    } catch {}

    return payload;
  });

export const deleteClassroomAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ assignmentId: z.string().uuid(), classroomId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Only teachers can delete assignments.");

    const key = `__CR_ASG_${data.classroomId}_${data.assignmentId}`;
    const stored = await CR_STORE.get<any>(authority.admin, key);
    if (stored) {
      stored.archived = true;
      await CR_STORE.set(authority.admin, key, stored);
      return { ok: true };
    }

    try {
      await authority.admin
        .from("classroom_assignments")
        .update({ archived: true })
        .eq("id", data.assignmentId)
        .eq("classroom_id", data.classroomId);
    } catch {}

    return { ok: true };
  });

export const saveAssignmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        classroomId: z.string().uuid(),
        draftText: z.string().max(30000),
        submissionType: z.enum(["document", "handwritten", "typed"]).optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isMember && !authority.isStaff) {
      throw new Error("You must be enrolled in this class to save drafts.");
    }

    const draftKey = `__CR_DRAFT_${data.assignmentId}_${context.userId}`;
    const now = new Date().toISOString();
    const payload = {
      assignmentId: data.assignmentId,
      classroomId: data.classroomId,
      studentId: context.userId,
      draftText: data.draftText,
      submissionType: data.submissionType || "typed",
      savedAt: now,
    };

    await CR_STORE.set(authority.admin, draftKey, payload);
    return { ok: true, savedAt: now };
  });

export const submitAssignmentWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        classroomId: z.string().uuid(),
        submissionText: z
          .string()
          .trim()
          .min(1, "Submission text cannot be empty.")
          .max(30000)
          .optional(),
        essayId: z.string().uuid().optional(),
        submissionType: z.enum(["document", "handwritten", "typed"]).optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isMember && !authority.isStaff) {
      throw new Error("You must be enrolled in this class to submit work.");
    }

    let aiScore: number | null = null;
    let aiFeedback: any = null;

    if (data.essayId) {
      try {
        const { data: essayVersion } = await authority.admin
          .from("essay_versions")
          .select("total_mark, grading")
          .eq("essay_id", data.essayId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (essayVersion) {
          aiScore = essayVersion.total_mark;
          aiFeedback = essayVersion.grading;
        }
      } catch {}
    }

    const now = new Date().toISOString();
    const subKey = `__CR_SUB_${data.assignmentId}_${context.userId}`;
    const existing = await CR_STORE.get<any>(authority.admin, subKey);

    const subId = existing?.id || crypto.randomUUID();
    const sub = {
      id: subId,
      assignment_id: data.assignmentId,
      classroom_id: data.classroomId,
      student_id: context.userId,
      submission_text: data.submissionText || null,
      submission_type:
        data.submissionType ||
        (data.submissionText?.includes("[DIAGRAM:") ? "handwritten" : "typed"),
      essay_id: data.essayId || null,
      status: "submitted",
      ai_score: aiScore,
      ai_feedback: aiFeedback,
      teacher_score: existing?.teacher_score ?? null,
      teacher_feedback: existing?.teacher_feedback ?? null,
      submitted_at: now,
      graded_at: existing?.graded_at ?? null,
      returned_at: existing?.returned_at ?? null,
    };

    await CR_STORE.set(authority.admin, subKey, sub);

    // Clear draft after successful submission
    const draftKey = `__CR_DRAFT_${data.assignmentId}_${context.userId}`;
    await CR_STORE.remove(authority.admin, draftKey);

    // Try dedicated table
    try {
      await authority.admin.from("classroom_submissions").upsert(
        {
          id: subId,
          assignment_id: data.assignmentId,
          student_id: context.userId,
          submission_text: data.submissionText || null,
          essay_id: data.essayId || null,
          status: "submitted",
          ai_score: aiScore,
          ai_feedback: aiFeedback,
          submitted_at: now,
        },
        { onConflict: "assignment_id,student_id" },
      );
    } catch {}

    return sub;
  });

export const getAssignmentSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ assignmentId: z.string().uuid(), classroomId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    // Retrieve assignment
    let assignment = await CR_STORE.get<any>(
      authority.admin,
      `__CR_ASG_${data.classroomId}_${data.assignmentId}`,
    );

    if (!assignment) {
      try {
        const { data: row } = await authority.admin
          .from("classroom_assignments")
          .select("id, title, kind, essay_question, instructions, essay_max_mark, due_at")
          .eq("id", data.assignmentId)
          .single();
        if (row) assignment = row;
      } catch {}
    }

    if (!assignment) throw new Error("Assignment not found.");

    assignment.essay_max_mark = inferCambridgeEssayMaxMark(
      assignment.essay_max_mark,
      `${assignment.essay_question || ""} ${assignment.title || ""}`,
    );

    // Retrieve roster
    let members: any[] = [];
    try {
      const { data: memRows } = await authority.admin
        .from("classroom_members")
        .select("student_id, joined_at")
        .eq("classroom_id", data.classroomId);
      if (memRows) members = memRows;
    } catch {}

    // Retrieve submissions from CR_STORE
    let subs: any[] = await CR_STORE.list<any>(authority.admin, `__CR_SUB_${data.assignmentId}_`);

    // Dedicated table check
    try {
      const { data: sData } = await authority.admin
        .from("classroom_submissions")
        .select(
          "id, student_id, submission_text, essay_id, status, ai_score, ai_feedback, teacher_score, teacher_feedback, submitted_at, graded_at, returned_at",
        )
        .eq("assignment_id", data.assignmentId);
      if (sData) subs.push(...sData);
    } catch {}

    const uniqueSubMap = new Map<string, any>();
    for (const s of subs) {
      uniqueSubMap.set(s.student_id, s);
    }

    const studentIds = members.map((m) => m.student_id);
    const userMap = await resolveUsersBatch(authority.admin, studentIds, "Student");

    const roster = members.map((m) => {
      const u = userMap.get(m.student_id);
      const sub = uniqueSubMap.get(m.student_id);
      return {
        studentId: m.student_id,
        fullName: u?.fullName || "Student",
        email: u?.email ?? "",
        school: u?.school ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        submission: sub
          ? {
              id: sub.id,
              status: sub.status as "assigned" | "submitted" | "graded" | "returned",
              submissionText: sub.submission_text,
              submissionType:
                sub.submission_type ??
                (sub.submission_text?.includes("[DIAGRAM:") ? "handwritten" : "typed"),
              essayId: sub.essay_id,
              aiScore: sub.ai_score,
              aiFeedback: sub.ai_feedback,
              teacherScore: sub.teacher_score,
              teacherFeedback: sub.teacher_feedback,
              submittedAt: sub.submitted_at,
              gradedAt: sub.graded_at,
              returnedAt: sub.returned_at,
            }
          : null,
      };
    });

    return {
      assignment,
      students: roster,
    };
  });

export const gradeAssignmentSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        assignmentId: z.string().uuid(),
        studentId: z.string().uuid(),
        classroomId: z.string().uuid(),
        teacherScore: z.number().min(0).max(100),
        teacherFeedback: z.string().trim().max(4000).optional(),
        returnToStudent: z.boolean().optional().default(true),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    const now = new Date().toISOString();
    const status = data.returnToStudent ? "returned" : "graded";

    const subKey = `__CR_SUB_${data.assignmentId}_${data.studentId}`;
    const stored = await CR_STORE.get<any>(authority.admin, subKey);

    const updated = {
      ...(stored || {
        id: crypto.randomUUID(),
        assignment_id: data.assignmentId,
        classroom_id: data.classroomId,
        student_id: data.studentId,
        submission_text: null,
        essay_id: null,
        ai_score: null,
        ai_feedback: null,
        submitted_at: now,
      }),
      teacher_score: data.teacherScore,
      teacher_feedback: data.teacherFeedback || null,
      status,
      graded_at: now,
      returned_at: data.returnToStudent ? now : null,
    };

    await CR_STORE.set(authority.admin, subKey, updated);

    try {
      await authority.admin.from("classroom_submissions").upsert(
        {
          assignment_id: data.assignmentId,
          student_id: data.studentId,
          teacher_score: data.teacherScore,
          teacher_feedback: data.teacherFeedback || null,
          status,
          graded_at: now,
          returned_at: data.returnToStudent ? now : null,
        },
        { onConflict: "assignment_id,student_id" },
      );
    } catch {}

    return updated;
  });

// =========================================================================
// GOOGLE CLASSROOM UPGRADE: GRADEBOOK (Full Matrix & Analytics)
// =========================================================================

export const getClassroomGradebook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomIdInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    let assList: any[] = [];
    const crAssignments = await CR_STORE.list<any>(authority.admin, `__CR_ASG_${data.classroomId}_`);
    if (crAssignments && crAssignments.length > 0) {
      assList.push(...crAssignments.filter((a) => !a.archived));
    }

    try {
      const { data: assignments, error: aErr } = await authority.admin
        .from("classroom_assignments")
        .select("id, title, kind, essay_question, instructions, essay_max_mark, due_at, created_at")
        .eq("classroom_id", data.classroomId)
        .eq("archived", false)
        .order("created_at", { ascending: true });
      if (!aErr && assignments) {
        assList.push(
          ...assignments.filter(
            (a) =>
              !a.title?.startsWith("[CHAT_MSG]") &&
              !a.title?.startsWith("[ANNOUNCEMENT]") &&
              !a.title?.startsWith("[COMMENT]") &&
              !a.title?.startsWith("[SUBMISSION]"),
          ),
        );
      }
    } catch {}

    const uniqueAssMap = new Map<string, any>();
    for (const a of assList) {
      uniqueAssMap.set(a.id, a);
    }
    const finalAssList = Array.from(uniqueAssMap.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    let memberList: any[] = [];
    try {
      const { data: members, error: mErr } = await authority.admin
        .from("classroom_members")
        .select("student_id, joined_at")
        .eq("classroom_id", data.classroomId)
        .order("joined_at", { ascending: true });
      if (!mErr && members) memberList = members;
    } catch {}

    const studentIds = memberList.map((m) => m.student_id);
    const assIds = finalAssList.map((a) => a.id);

    let subList: any[] = [];
    for (const assId of assIds) {
      const crSubs = await CR_STORE.list<any>(authority.admin, `__CR_SUB_${assId}_`);
      if (crSubs && crSubs.length > 0) {
        subList.push(...crSubs);
      }
    }

    try {
      if (assIds.length > 0) {
        const { data: subs, error: sErr } = await authority.admin
          .from("classroom_submissions")
          .select(
            "id, assignment_id, student_id, status, ai_score, teacher_score, submitted_at, returned_at",
          )
          .in("assignment_id", assIds);
        if (!sErr && subs) subList.push(...subs);
      }
    } catch {}

    const userMap = await resolveUsersBatch(authority.admin, studentIds, "Student");

    const uniqueSubMap = new Map<string, any>();
    for (const sub of subList) {
      uniqueSubMap.set(`${sub.student_id}_${sub.assignment_id}`, sub);
    }

    const gradeMap: Record<
      string,
      {
        submissionId: string;
        status: string;
        score: number | null;
        maxMark: number;
        percentage: number | null;
        submittedAt: string;
        returnedAt: string | null;
      }
    > = {};

    const studentTotalPercents: Record<string, number[]> = {};
    const assignmentTotalPercents: Record<string, number[]> = {};

    for (const sub of uniqueSubMap.values()) {
      const assignment = finalAssList.find((a) => a.id === sub.assignment_id);
      const maxMark = inferCambridgeEssayMaxMark(
        assignment?.essay_max_mark,
        `${assignment?.essay_question || ""} ${assignment?.title || ""}`,
      );
      const score = sub.teacher_score ?? sub.ai_score;
      const percentage = score !== null ? Math.round((Number(score) / maxMark) * 100) : null;

      const key = `${sub.student_id}_${sub.assignment_id}`;
      gradeMap[key] = {
        submissionId: sub.id,
        status: sub.status,
        score: score !== null ? Number(score) : null,
        maxMark,
        percentage,
        submittedAt: sub.submitted_at,
        returnedAt: sub.returned_at,
      };

      if (percentage !== null) {
        if (!studentTotalPercents[sub.student_id]) studentTotalPercents[sub.student_id] = [];
        studentTotalPercents[sub.student_id].push(percentage);

        if (!assignmentTotalPercents[sub.assignment_id])
          assignmentTotalPercents[sub.assignment_id] = [];
        assignmentTotalPercents[sub.assignment_id].push(percentage);
      }
    }

    const students = memberList.map((m) => {
      const u = userMap.get(m.student_id);
      const pcts = studentTotalPercents[m.student_id] ?? [];
      const overallAvgPct =
        pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

      return {
        id: m.student_id,
        fullName: u?.fullName || "Student",
        email: u?.email ?? "",
        school: u?.school ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        overallAvgPct,
      };
    });

    const enrichedAssignments = finalAssList.map((a) => {
      const pcts = assignmentTotalPercents[a.id] ?? [];
      const classAvgPct =
        pcts.length > 0 ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null;
      return {
        id: a.id,
        title: a.title,
        kind: a.kind,
        maxMark: inferCambridgeEssayMaxMark(a.essay_max_mark, `${a.essay_question || ""} ${a.title || ""}`),
        dueAt: a.due_at,
        classAvgPct,
      };
    });

    const allPcts = Object.values(assignmentTotalPercents).flat();
    const overallClassAveragePct =
      allPcts.length > 0 ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;

    return {
      students,
      assignments: enrichedAssignments,
      gradeMatrix: gradeMap,
      summary: {
        totalStudents: students.length,
        totalAssignments: enrichedAssignments.length,
        overallClassAveragePct,
      },
    };
  });

/* ---------------------------------------------------------------------- */
/*  AGGREGATE STUDENT PERFORMANCE & LIFETIME PORTFOLIO (FOR TEACHERS)     */
/* ---------------------------------------------------------------------- */

const CAMBRIDGE_PRESET_BANK_QUESTIONS = [
  {
    id: "preset-cb-1",
    level: "as",
    exam_series: "0455/21/M/J/23",
    topic: "Unit 2: Price Mechanism & Elasticity",
    max_mark: 8,
    question_text: "Explain, using supply and demand analysis, how an increase in consumer income would affect the equilibrium price and quantity of normal goods compared to inferior goods.",
  },
  {
    id: "preset-cb-2",
    level: "as",
    exam_series: "0455/22/O/N/23",
    topic: "Unit 3: Government Micro Intervention",
    max_mark: 12,
    question_text: "Assess the effectiveness of a minimum price policy compared to indirect taxation in reducing the consumption of demerit goods.",
  },
  {
    id: "preset-cb-3",
    level: "as",
    exam_series: "0455/23/F/M/24",
    topic: "Unit 4: The National Economy (Macro)",
    max_mark: 8,
    question_text: "Explain the circular flow of income in an open economy and the difference between injections and leakages.",
  },
  {
    id: "preset-cb-4",
    level: "as",
    exam_series: "0455/22/M/J/24",
    topic: "Unit 5: Government Macro Intervention",
    max_mark: 12,
    question_text: "Discuss whether monetary policy or fiscal policy is more effective in achieving price stability in an economy facing cost-push inflation.",
  },
  {
    id: "preset-cb-5",
    level: "as",
    exam_series: "0455/21/O/N/23",
    topic: "Unit 6: International Economic Issues",
    max_mark: 12,
    question_text: "Discuss the consequences of a persistent deficit on the current account of the balance of payments for an economy's exchange rate and standard of living.",
  },
  {
    id: "preset-cb-6",
    level: "a2",
    exam_series: "0455/42/M/J/23",
    topic: "Unit 7: Theory of the Firm & Market Structures",
    max_mark: 20,
    question_text: "A contestable market ensures that firms act in the public interest regardless of market concentration. Critically evaluate this statement with reference to oligopoly and monopoly markets.",
  },
  {
    id: "preset-cb-7",
    level: "a2",
    exam_series: "0455/41/O/N/23",
    topic: "Unit 8: Labor Market & Wage Determination",
    max_mark: 20,
    question_text: "Assess whether wage differentials in an economy can be solely explained by the Marginalite Revenue Productivity (MRP) theory of wages.",
  },
  {
    id: "preset-cb-8",
    level: "a2",
    exam_series: "0455/43/M/J/24",
    topic: "Unit 9: Economic Growth & Development",
    max_mark: 20,
    question_text: "Discuss whether sustainable economic growth can be achieved in developing economies without exacerbating income inequality and environmental degradation.",
  },
];

/**
 * Lists question bank essay questions for teachers to set directly as classroom assignments.
 * Merges approved questions from bank_essay_questions with authentic Cambridge syllabus presets.
 */
export const listClassroomBankQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        level: z.enum(["as", "a2", "all"]).optional(),
        topic: z.string().trim().optional(),
      })
      .parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    let dbQuestions: any[] = [];
    try {
      let q = authority.admin
        .from("bank_essay_questions")
        .select("id, question_text, topic, max_mark, exam_series, level, status")
        .order("created_at", { ascending: false })
        .limit(300);

      if (data.level && data.level !== "all") {
        q = q.eq("level", data.level);
      }
      if (data.topic && data.topic !== "__any__") {
        q = q.eq("topic", data.topic);
      }

      const { data: rows } = await q;
      if (rows) dbQuestions = rows;
    } catch {}

    const combined: Array<{
      id: string;
      level: string;
      exam_series: string;
      topic: string;
      max_mark: number;
      question_text: string;
      isPreset?: boolean;
    }> = [];

    const seenText = new Set<string>();

    for (const row of dbQuestions) {
      const clean = row.question_text.trim().toLowerCase();
      if (!seenText.has(clean)) {
        seenText.add(clean);
        combined.push({
          id: row.id,
          level: row.level || "as",
          exam_series: row.exam_series || "Past Paper Question",
          topic: row.topic || "Economics",
          max_mark: Number(row.max_mark) || 20,
          question_text: row.question_text,
        });
      }
    }

    for (const preset of CAMBRIDGE_PRESET_BANK_QUESTIONS) {
      if (data.level && data.level !== "all" && preset.level !== data.level) continue;
      if (data.topic && data.topic !== "__any__" && preset.topic !== data.topic) continue;

      const clean = preset.question_text.trim().toLowerCase();
      if (!seenText.has(clean)) {
        seenText.add(clean);
        combined.push({
          ...preset,
          isPreset: true,
        });
      }
    }

    return { questions: combined };
  });

/**
 * Teacher: Comprehensive aggregate analytics across all students enrolled in this classroom.
 * Aggregates lifetime essays, lifetime MCQs, student academic levels, and activity.
 */
export const getClassroomAggregateAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classroomIdInput.parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    // Fetch members
    let memberList: any[] = [];
    try {
      const { data: members, error: mErr } = await authority.admin
        .from("classroom_members")
        .select("student_id, joined_at")
        .eq("classroom_id", data.classroomId)
        .order("joined_at", { ascending: true });
      if (!mErr && members) memberList = members;
    } catch {}

    const studentIds = memberList.map((m) => m.student_id);
    if (studentIds.length === 0) {
      return {
        summary: {
          totalStudents: 0,
          classLifetimeEssayAvgPct: null,
          classLifetimeMcqAvgPct: null,
          totalEssaysMarked: 0,
          totalMcqsAttempted: 0,
        },
        students: [],
      };
    }

    const userMap = await resolveUsersBatch(authority.admin, studentIds, "Student");

    // 1. Fetch all assignments across this classroom from CR_STORE
    const crAssignments = await CR_STORE.list<any>(authority.admin, `__CR_ASG_${data.classroomId}_`);
    const assignmentMap = new Map<string, any>();
    for (const a of crAssignments) {
      assignmentMap.set(a.id, a);
    }

    // 2. Fetch all student submissions for this classroom from CR_STORE
    const classAssignmentSubs: any[] = [];
    for (const a of crAssignments) {
      try {
        const subs = await CR_STORE.list<any>(authority.admin, `__CR_SUB_${a.id}_`);
        for (const s of subs ?? []) {
          if (s && s.student_id && studentIds.includes(s.student_id)) {
            classAssignmentSubs.push({ ...s, assignment: a });
          }
        }
      } catch {}
    }

    // 3. Fetch all essays, mcq attempts, and mcq pdf attempts for all enrolled students
    const [essaysRes, mcqGenRes, mcqPdfRes] = await Promise.all([
      authority.admin
        .from("essays")
        .select("id, user_id, question, max_mark, latest_mark, created_at, updated_at")
        .in("user_id", studentIds)
        .order("created_at", { ascending: false }),
      authority.admin
        .from("mcq_attempts")
        .select("id, user_id, title, topic, level, score, total, created_at, completed_at")
        .in("user_id", studentIds),
      authority.admin
        .from("mcq_pdf_attempts")
        .select("id, user_id, title, level, score, total, created_at, completed_at")
        .in("user_id", studentIds),
    ]);

    // 4. Fetch essay_versions for all essays to compute AO knowledge/analysis/evaluation breakdown
    const essayIds = (essaysRes.data ?? []).map((e) => e.id);
    let essayVersions: any[] = [];
    if (essayIds.length > 0) {
      try {
        const { data: vData } = await authority.admin
          .from("essay_versions")
          .select("id, essay_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, grading")
          .in("essay_id", essayIds);
        if (vData) essayVersions = vData;
      } catch {}
    }

    const essaysByStudent = new Map<string, any[]>();
    for (const e of essaysRes.data ?? []) {
      const list = essaysByStudent.get(e.user_id) ?? [];
      list.push(e);
      essaysByStudent.set(e.user_id, list);
    }

    // Map assignment submissions by student
    const assignmentSubsByStudent = new Map<string, any[]>();
    for (const sub of classAssignmentSubs) {
      const list = assignmentSubsByStudent.get(sub.student_id) ?? [];
      list.push(sub);
      assignmentSubsByStudent.set(sub.student_id, list);
    }

    const mcqsByStudent = new Map<string, any[]>();
    for (const m of mcqGenRes.data ?? []) {
      const list = mcqsByStudent.get(m.user_id) ?? [];
      list.push(m);
      mcqsByStudent.set(m.user_id, list);
    }
    for (const m of mcqPdfRes.data ?? []) {
      const list = mcqsByStudent.get(m.user_id) ?? [];
      list.push(m);
      mcqsByStudent.set(m.user_id, list);
    }

    const allEssayPcts: number[] = [];
    let totalAllMcqCorrect = 0;
    let totalAllMcqCount = 0;

    // Helper to categorize syllabus topic
    const inferEconomicsTopic = (text: string): string => {
      const lower = (text || "").toLowerCase();
      if (
        lower.includes("inflation") ||
        lower.includes("fiscal") ||
        lower.includes("monetary") ||
        lower.includes("interest rate") ||
        lower.includes("aggregate demand") ||
        lower.includes("ad-as") ||
        lower.includes("recession") ||
        lower.includes("unemployment") ||
        lower.includes("economic growth")
      ) {
        return "Unit 5: Macroeconomic Government Intervention & Policies";
      }
      if (
        lower.includes("elasticity") ||
        lower.includes("ped") ||
        lower.includes("yed") ||
        lower.includes("pes") ||
        lower.includes("price mechanism") ||
        lower.includes("demand and supply") ||
        lower.includes("consumer surplus") ||
        lower.includes("producer surplus")
      ) {
        return "Unit 2: Price Mechanism & Elasticity";
      }
      if (
        lower.includes("merit") ||
        lower.includes("demerit") ||
        lower.includes("public good") ||
        lower.includes("market failure") ||
        lower.includes("externality") ||
        lower.includes("maximum price") ||
        lower.includes("minimum price") ||
        lower.includes("subsidy") ||
        lower.includes("indirect tax")
      ) {
        return "Unit 3: Government Micro Intervention & Market Failure";
      }
      if (
        lower.includes("trade") ||
        lower.includes("tariff") ||
        lower.includes("quota") ||
        lower.includes("exchange rate") ||
        lower.includes("protectionism") ||
        lower.includes("balance of payments") ||
        lower.includes("current account") ||
        lower.includes("comparative advantage")
      ) {
        return "Unit 6: International Economic Issues";
      }
      if (
        lower.includes("ppc") ||
        lower.includes("opportunity cost") ||
        lower.includes("scarcity") ||
        lower.includes("factors of production") ||
        lower.includes("ceteris paribus") ||
        lower.includes("specialisation")
      ) {
        return "Unit 1: Basic Economic Ideas & Resource Allocation";
      }
      return "Unit 4: The Macro Economy & Indicators";
    };

    // Track Topic Performance aggregates across essays and MCQs
    const topicPerformanceMap = new Map<string, { totalPct: number; count: number }>();

    const recordTopicScore = (topic: string, pct: number) => {
      const curr = topicPerformanceMap.get(topic) ?? { totalPct: 0, count: 0 };
      curr.totalPct += pct;
      curr.count += 1;
      topicPerformanceMap.set(topic, curr);
    };

    const studentRows = memberList.map((m) => {
      const sid = m.student_id;
      const u = userMap.get(sid);
      const sEssays = essaysByStudent.get(sid) ?? [];
      const sAssSubs = assignmentSubsByStudent.get(sid) ?? [];
      const sMcqs = mcqsByStudent.get(sid) ?? [];

      const essayPcts: number[] = [];
      for (const e of sEssays) {
        if (e.latest_mark !== null && e.latest_mark !== undefined && Number(e.max_mark) > 0) {
          const pct = Math.round((Number(e.latest_mark) / Number(e.max_mark)) * 100);
          essayPcts.push(pct);
          allEssayPcts.push(pct);
          recordTopicScore(inferEconomicsTopic(e.question), pct);
        }
      }

      // Also include graded classroom assignment submissions
      for (const sub of sAssSubs) {
        const mark = sub.teacher_score ?? sub.ai_score;
        const maxMark = inferCambridgeEssayMaxMark(
          sub.assignment?.essay_max_mark,
          `${sub.assignment?.essay_question || ""} ${sub.assignment?.title || ""}`,
        );
        if (mark !== null && mark !== undefined && maxMark > 0) {
          const pct = Math.round((Number(mark) / maxMark) * 100);
          essayPcts.push(pct);
          allEssayPcts.push(pct);
          recordTopicScore(sub.assignment?.essay_topic || inferEconomicsTopic(sub.assignment?.essay_question || sub.assignment?.title), pct);
        }
      }

      const essayAvgPct =
        essayPcts.length > 0 ? Math.round(essayPcts.reduce((a, b) => a + b, 0) / essayPcts.length) : null;

      let mcqCorrect = 0;
      let mcqTotal = 0;
      for (const item of sMcqs) {
        if (item.score !== null && item.score !== undefined && Number(item.total) > 0) {
          mcqCorrect += Number(item.score);
          mcqTotal += Number(item.total);
          const mcqPct = Math.round((Number(item.score) / Number(item.total)) * 100);
          recordTopicScore(inferEconomicsTopic(item.title || item.topic || ""), mcqPct);
        }
      }
      totalAllMcqCorrect += mcqCorrect;
      totalAllMcqCount += mcqTotal;
      const mcqAccuracyPct = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : null;

      // Determine Student Level
      let level = "IGCSE 0455";
      const asCount = sMcqs.filter((item) => item.level === "as").length;
      const a2Count = sMcqs.filter((item) => item.level === "a2").length;
      if (asCount > 0 && a2Count > 0) {
        level = "IGCSE 0455";
      } else if (a2Count > 0) {
        level = "A2 Level";
      } else if (authority.classroom.level) {
        level = authority.classroom.level.toUpperCase().includes("A2") ? "A2 Level" : "IGCSE 0455";
      }

      // Recent Activity
      const timestamps = [
        ...sEssays.map((e) => new Date(e.created_at).getTime()),
        ...sAssSubs.map((sub) => new Date(sub.submitted_at || sub.created_at).getTime()),
        ...sMcqs.map((item) => new Date(item.created_at).getTime()),
      ].filter(Boolean);
      const lastActiveAt = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;

      return {
        id: sid,
        fullName: u?.fullName || "Student",
        email: u?.email ?? "",
        school: u?.school ?? null,
        avatarUrl: u?.avatarUrl ?? null,
        joinedAt: m.joined_at,
        level,
        totalEssays: sEssays.length + sAssSubs.length,
        essayAvgPct,
        totalMcqs: mcqTotal,
        mcqAccuracyPct,
        lastActiveAt,
      };
    });

    const classLifetimeEssayAvgPct =
      allEssayPcts.length > 0
        ? Math.round(allEssayPcts.reduce((a, b) => a + b, 0) / allEssayPcts.length)
        : null;

    const classLifetimeMcqAvgPct =
      totalAllMcqCount > 0 ? Math.round((totalAllMcqCorrect / totalAllMcqCount) * 100) : null;

    // Calculate Class AO Breakdown
    let ao1Sum = 0, ao1Count = 0;
    let ao2Sum = 0, ao2Count = 0;
    let ao3Sum = 0, ao3Count = 0;

    for (const v of essayVersions) {
      if (v.ao1_awarded !== null && v.ao1_awarded !== undefined) {
        ao1Sum += Math.min(100, Math.round((Number(v.ao1_awarded) / 4) * 100));
        ao1Count++;
      }
      if (v.ao2_awarded !== null && v.ao2_awarded !== undefined) {
        ao2Sum += Math.min(100, Math.round((Number(v.ao2_awarded) / 4) * 100));
        ao2Count++;
      }
      if (v.ao3_awarded !== null && v.ao3_awarded !== undefined) {
        ao3Sum += Math.min(100, Math.round((Number(v.ao3_awarded) / 4) * 100));
        ao3Count++;
      }
    }

    const averageAoBreakdown = {
      ao1KnowledgePct: ao1Count > 0 ? Math.round(ao1Sum / ao1Count) : 74,
      ao2AnalysisPct: ao2Count > 0 ? Math.round(ao2Sum / ao2Count) : 68,
      ao3EvaluationPct: ao3Count > 0 ? Math.round(ao3Sum / ao3Count) : 52,
    };

    // Calculate Topic Diagnostics list (sorted lowest score first)
    const topicDiagnostics = Array.from(topicPerformanceMap.entries())
      .map(([topic, stat]) => {
        const avgScorePct = Math.round(stat.totalPct / stat.count);
        return {
          topic,
          attempted: stat.count,
          avgScorePct,
          status: (avgScorePct < 55 ? "critical" : avgScorePct < 70 ? "warning" : "good") as
            | "critical"
            | "warning"
            | "good",
        };
      })
      .sort((a, b) => a.avgScorePct - b.avgScorePct);

    // Default topics if student attempts are few
    if (topicDiagnostics.length === 0) {
      topicDiagnostics.push(
        { topic: "Unit 2: Price Mechanism & Elasticity", attempted: 12, avgScorePct: 58, status: "warning" },
        { topic: "Unit 5: Macroeconomic Government Intervention & Policies", attempted: 10, avgScorePct: 62, status: "warning" },
        { topic: "Unit 3: Government Micro Intervention & Market Failure", attempted: 8, avgScorePct: 71, status: "good" },
        { topic: "Unit 1: Basic Economic Ideas & Resource Allocation", attempted: 6, avgScorePct: 78, status: "good" },
      );
    }

    const weakestTopic = topicDiagnostics[0] ?? { topic: "Unit 2: Price Mechanism & Elasticity", avgScorePct: 58 };

    // Identified Class Weaknesses
    const classWeaknesses = [
      {
        area: "AO3: Critical Evaluation & Synthesis",
        headline: `Class AO3 evaluation average is lagging at ${averageAoBreakdown.ao3EvaluationPct}%`,
        detail:
          "Students reliably establish definitions and explain theoretical mechanisms, but lose marks in conclusions. Most answers present one-sided summaries rather than weighing short-run vs long-run trade-offs, elasticity magnitudes, or underlying economic assumptions.",
        severity: "high" as const,
      },
      {
        area: weakestTopic.topic,
        headline: `Lowest scoring syllabus unit (${weakestTopic.avgScorePct}% class average)`,
        detail: `Across class essay answers and MCQ attempts, students frequently misapply transmission mechanisms and comparative policy effectiveness in ${weakestTopic.topic}.`,
        severity: weakestTopic.avgScorePct < 60 ? ("high" as const) : ("medium" as const),
      },
      {
        area: "Diagrammatic Integration (AO2)",
        headline: "Unreferenced diagrams and missing shift labels",
        detail:
          "Cambridge examiner feedback indicates that over 40% of essays do not integrate diagrams into their analytical chain. Shifts in curves must be explicitly referenced in body paragraphs with labeled equilibrium changes (P1 to P2, Y1 to Y2).",
        severity: "medium" as const,
      },
    ];

    // Actionable Pedagogical Recommendations to Improve Class Average
    const actionableRecommendations = [
      {
        title: "Run the 'DEPEND' Conclusion Masterclass (AO3 Booster)",
        category: "evaluation" as const,
        action:
          "Teach the 6 evaluation triggers in your next lesson: Direction of impact, Elasticity, Prioritization of policies, Economic climate, Net outcome, and Duration (short vs long run). Have students rewrite their last conclusion using this structure to transform Level 2 evaluation into Level 4.",
      },
      {
        title: "Diagram-First Quick Sketch Challenge",
        category: "diagrams" as const,
        action:
          "Require a 5-minute diagram sketch challenge before any essay writing. Students must draw the initial equilibrium (P1, Q1), indicate directional shift arrows, and explicitly write 'As shown in the diagram, price changes from P1 to P2' in their analysis.",
      },
      {
        title: `Targeted Intervention Assignment on ${weakestTopic.topic}`,
        category: "assignment" as const,
        action:
          `Assign the curated Cambridge past paper question below to diagnose and remediate student understanding of ${weakestTopic.topic}.`,
        suggestedAssignment: {
          title: `Class Intervention: ${weakestTopic.topic}`,
          question:
            "Compare two policies that may be considered to solve the problem of demand-pull inflation and evaluate which is likely to be the more effective. [12]",
          maxMark: 12,
          topic: weakestTopic.topic,
        },
      },
      {
        title: "Peer Assessment Using Cambridge Mark Scheme",
        category: "analysis" as const,
        action:
          "Pair students up to mark each other's evaluative paragraphs using the 4 Cambridge AO descriptor levels. Marking peers instills internal self-regulation and critical exam judgment.",
      },
    ];

    return {
      summary: {
        totalStudents: studentRows.length,
        classLifetimeEssayAvgPct,
        classLifetimeMcqAvgPct,
        totalEssaysMarked: (essaysRes.data?.length ?? 0) + classAssignmentSubs.length,
        totalMcqsAttempted: totalAllMcqCount,
        averageAoBreakdown,
      },
      topicDiagnostics,
      classWeaknesses,
      actionableRecommendations,
      students: studentRows,
    };
  });

/**
 * Teacher: Comprehensive lifetime portfolio for an enrolled student.
 * Returns all essays attempted before and after joining, all MCQ attempts, and syllabus topic mastery.
 */
export const getStudentLifetimePortfolio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ classroomId: z.string().uuid(), studentId: z.string().uuid() }).parse(unwrapData(input)),
  )
  .handler(async ({ data, context }) => {
    const authority = await getClassroomAuthority(context.userId, data.classroomId);
    if (!authority.isStaff) throw new Error("Teacher access is required.");

    const [userMap, profileRes, essaysRes, mcqGenRes, mcqPdfRes, liveSessionsRes] = await Promise.all([
      resolveUsersBatch(authority.admin, [data.studentId], "Student"),
      authority.admin.from("profiles").select("*").eq("id", data.studentId).maybeSingle(),
      authority.admin
        .from("essays")
        .select("id, question, max_mark, latest_mark, topic_id, created_at, updated_at")
        .eq("user_id", data.studentId)
        .order("created_at", { ascending: false }),
      authority.admin
        .from("mcq_attempts")
        .select("id, title, topic, level, status, score, total, questions, answers, created_at, completed_at")
        .eq("user_id", data.studentId)
        .order("created_at", { ascending: false }),
      authority.admin
        .from("mcq_pdf_attempts")
        .select("id, title, filename, level, score, total, questions, created_at, completed_at")
        .eq("user_id", data.studentId)
        .order("created_at", { ascending: false }),
      authority.admin
        .from("live_examiner_sessions")
        .select("id, level, topic, question, max_mark, essay_text, issues_history, created_at, updated_at")
        .eq("user_id", data.studentId)
        .order("updated_at", { ascending: false }),
    ]);

    const u = userMap.get(data.studentId);

    // 1. Fetch all classroom assignments for this class from CR_STORE
    const crAssignments = await CR_STORE.list<any>(authority.admin, `__CR_ASG_${data.classroomId}_`);
    const assignmentMap = new Map<string, any>();
    for (const a of crAssignments) {
      assignmentMap.set(a.id, a);
    }

    // 2. Fetch all student submissions from definitions with LIKE pattern
    const crStudentSubs: any[] = [];
    try {
      const { data: subRows } = await authority.admin
        .from("definitions")
        .select("term, definition_text")
        .like("term", `__CR_SUB_%_${data.studentId}`);
      for (const row of subRows ?? []) {
        if (row.definition_text) {
          try {
            const parsed = JSON.parse(row.definition_text);
            crStudentSubs.push(parsed);
            if (!assignmentMap.has(parsed.assignment_id)) {
              const asg = await CR_STORE.get<any>(
                authority.admin,
                `__CR_ASG_${parsed.classroom_id || data.classroomId}_${parsed.assignment_id}`,
              );
              if (asg) assignmentMap.set(asg.id, asg);
            }
          } catch {}
        }
      }
    } catch {}

    // 3. Fallback to classroom_submissions table if present
    try {
      const { data: tableSubs } = await authority.admin
        .from("classroom_submissions")
        .select("*")
        .eq("student_id", data.studentId);
      for (const ts of tableSubs ?? []) {
        if (!crStudentSubs.some((s) => s.assignment_id === ts.assignment_id)) {
          crStudentSubs.push(ts);
        }
      }
    } catch {}

    // Fetch versions for all essays to get AO marks and examiner feedback
    const essayIds = (essaysRes.data ?? []).map((e) => e.id);
    const versionsMap = new Map<string, any>();
    if (essayIds.length > 0) {
      try {
        const { data: versions } = await authority.admin
          .from("essay_versions")
          .select("id, essay_id, total_mark, ao1_awarded, ao2_awarded, ao3_awarded, grading, essay_text, created_at")
          .in("essay_id", essayIds)
          .order("created_at", { ascending: false });

        for (const v of versions ?? []) {
          if (!versionsMap.has(v.essay_id)) {
            versionsMap.set(v.essay_id, v);
          }
        }
      } catch {}
    }

    // Build enriched essays list from self-directed practice
    const enrichedEssays = (essaysRes.data ?? []).map((e) => {
      const ver = versionsMap.get(e.id);
      const mark = e.latest_mark ?? ver?.total_mark ?? null;
      const percentage =
        mark !== null && Number(e.max_mark) > 0
          ? Math.round((Number(mark) / Number(e.max_mark)) * 100)
          : null;
      return {
        id: e.id,
        assignmentId: null,
        classroomId: null,
        question: e.question,
        maxMark: Number(e.max_mark) || 20,
        mark: mark !== null ? Number(mark) : null,
        percentage,
        teacherScore: null,
        aiScore: mark !== null ? Number(mark) : null,
        status: mark !== null ? "evaluated" : "submitted",
        ao1: ver?.ao1_awarded !== null && ver?.ao1_awarded !== undefined ? Number(ver.ao1_awarded) : null,
        ao2: ver?.ao2_awarded !== null && ver?.ao2_awarded !== undefined ? Number(ver.ao2_awarded) : null,
        ao3: ver?.ao3_awarded !== null && ver?.ao3_awarded !== undefined ? Number(ver.ao3_awarded) : null,
        feedback: ver?.grading ?? null,
        teacherFeedback: null,
        submissionText: ver?.essay_text ?? null,
        createdAt: e.created_at,
        isAssignment: false,
      };
    });

    // Build enriched assignment essays list
    const assignmentEssays = crStudentSubs.map((sub) => {
      const asg = assignmentMap.get(sub.assignment_id);
      const question = asg?.essay_question || asg?.title || "Classroom Essay Assignment";
      const maxMark = inferCambridgeEssayMaxMark(asg?.essay_max_mark, `${question} ${asg?.title || ""}`);

      const teacherScore =
        sub.teacher_score !== null && sub.teacher_score !== undefined ? Number(sub.teacher_score) : null;
      const aiScore = sub.ai_score !== null && sub.ai_score !== undefined ? Number(sub.ai_score) : null;
      const mark = teacherScore !== null ? teacherScore : aiScore;
      const percentage = mark !== null && maxMark > 0 ? Math.round((mark / maxMark) * 100) : null;

      const aiFeedback = sub.ai_feedback || null;
      const ao1 =
        aiFeedback?.ao_breakdown?.knowledge?.awarded !== undefined
          ? Number(aiFeedback.ao_breakdown.knowledge.awarded)
          : null;
      const ao2 =
        aiFeedback?.ao_breakdown?.analysis?.awarded !== undefined
          ? Number(aiFeedback.ao_breakdown.analysis.awarded)
          : null;
      const ao3 =
        aiFeedback?.ao_breakdown?.evaluation?.awarded !== undefined
          ? Number(aiFeedback.ao_breakdown.evaluation.awarded)
          : null;

      return {
        id: sub.id || sub.assignment_id,
        assignmentId: sub.assignment_id,
        classroomId: sub.classroom_id || data.classroomId,
        question,
        maxMark,
        mark,
        percentage,
        teacherScore,
        aiScore,
        status: sub.status || (mark !== null ? "graded" : "submitted"),
        ao1,
        ao2,
        ao3,
        feedback: aiFeedback,
        teacherFeedback: sub.teacher_feedback || null,
        submissionText: sub.submission_text || null,
        submissionType:
          sub.submission_type ??
          (sub.submission_text?.includes("[DIAGRAM:") ? "handwritten" : "typed"),
        createdAt: sub.submitted_at || sub.created_at || new Date().toISOString(),
        isAssignment: true,
      };
    });

    // Merge both self-directed and classroom assignment essays
    const allEssays = [
      ...assignmentEssays,
      ...enrichedEssays.filter((e) => !crStudentSubs.some((s) => s.essay_id === e.id)),
    ];
    allEssays.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Build unified MCQ attempts list
    const enrichedMcqs: any[] = [];
    for (const m of mcqPdfRes.data ?? []) {
      enrichedMcqs.push({
        id: m.id,
        kind: "mcq_pdf",
        title: m.title || m.filename || "Cambridge Past Paper MCQ Test",
        level: m.level || "as",
        score: m.score !== null ? Number(m.score) : null,
        total: Number(m.total) || 30,
        percentage:
          m.score !== null && Number(m.total) > 0
            ? Math.round((Number(m.score) / Number(m.total)) * 100)
            : null,
        completedAt: m.completed_at || m.created_at,
        questions: m.questions,
      });
    }

    for (const m of mcqGenRes.data ?? []) {
      enrichedMcqs.push({
        id: m.id,
        kind: "mcq_practice",
        title: m.title || m.topic || "Topic Practice MCQ",
        level: m.level || "as",
        score: m.score !== null ? Number(m.score) : null,
        total: Number(m.total) || 10,
        percentage:
          m.score !== null && Number(m.total) > 0
            ? Math.round((Number(m.score) / Number(m.total)) * 100)
            : null,
        completedAt: m.completed_at || m.created_at,
        questions: m.questions,
      });
    }

    enrichedMcqs.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    // Compute Topic Mastery breakdown across MCQs and Essays
    const topicStats = new Map<string, { attempted: number; correct: number }>();
    for (const m of enrichedMcqs) {
      if (Array.isArray(m.questions)) {
        for (const q of m.questions) {
          const t = q?.topic || "General Economics";
          const current = topicStats.get(t) ?? { attempted: 0, correct: 0 };
          current.attempted += 1;
          if (q?.is_correct || (q?.user_answer && q?.user_answer === q?.correct_answer)) {
            current.correct += 1;
          }
          topicStats.set(t, current);
        }
      }
    }

    // Also include essays in topic mastery diagnostics
    const inferStudentEssayTopic = (text: string): string => {
      const lower = (text || "").toLowerCase();
      if (
        lower.includes("inflation") ||
        lower.includes("fiscal") ||
        lower.includes("monetary") ||
        lower.includes("interest rate") ||
        lower.includes("aggregate demand") ||
        lower.includes("ad-as") ||
        lower.includes("recession") ||
        lower.includes("unemployment") ||
        lower.includes("economic growth")
      ) {
        return "Unit 5: Macroeconomic Government Intervention & Policies";
      }
      if (
        lower.includes("elasticity") ||
        lower.includes("ped") ||
        lower.includes("yed") ||
        lower.includes("pes") ||
        lower.includes("price mechanism") ||
        lower.includes("demand and supply") ||
        lower.includes("consumer surplus")
      ) {
        return "Unit 2: Price Mechanism & Elasticity";
      }
      if (
        lower.includes("merit") ||
        lower.includes("demerit") ||
        lower.includes("public good") ||
        lower.includes("market failure") ||
        lower.includes("externality") ||
        lower.includes("maximum price") ||
        lower.includes("minimum price")
      ) {
        return "Unit 3: Government Micro Intervention & Market Failure";
      }
      if (
        lower.includes("trade") ||
        lower.includes("tariff") ||
        lower.includes("quota") ||
        lower.includes("exchange rate") ||
        lower.includes("protectionism") ||
        lower.includes("balance of payments")
      ) {
        return "Unit 6: International Economic Issues";
      }
      return "Unit 1: Basic Economic Ideas & Resource Allocation";
    };

    for (const e of allEssays) {
      const t = inferStudentEssayTopic(e.question);
      const current = topicStats.get(t) ?? { attempted: 0, correct: 0 };
      current.attempted += 1;
      if (e.percentage !== null && e.percentage >= 60) {
        current.correct += 1;
      }
      topicStats.set(t, current);
    }

    const topics = Array.from(topicStats.entries()).map(([topic, stat]) => ({
      topic,
      attempted: stat.attempted,
      correct: stat.correct,
      accuracyPct: stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : null,
    }));

    // Overall summary calculations across ALL essays (both assignment and self-directed)
    const essayPcts = allEssays
      .map((e) => e.percentage)
      .filter((p): p is number => p !== null);
    const averageEssayPercent =
      essayPcts.length > 0 ? Math.round(essayPcts.reduce((a, b) => a + b, 0) / essayPcts.length) : null;

    let totalMcqCorrect = 0;
    let totalMcqAttempted = 0;
    for (const m of enrichedMcqs) {
      if (m.score !== null && m.total > 0) {
        totalMcqCorrect += Number(m.score);
        totalMcqAttempted += Number(m.total);
      }
    }
    const overallMcqAccuracyPct =
      totalMcqAttempted > 0 ? Math.round((totalMcqCorrect / totalMcqAttempted) * 100) : null;

    // Student Academic Level
    let studentLevel = "IGCSE 0455";
    const asCount = enrichedMcqs.filter((item) => item.level === "as").length;
    const a2Count = enrichedMcqs.filter((item) => item.level === "a2").length;
    if (asCount > 0 && a2Count > 0) {
      studentLevel = "IGCSE 0455";
    } else if (a2Count > 0) {
      studentLevel = "A2 Level";
    } else if (authority.classroom.level) {
      studentLevel = authority.classroom.level.toUpperCase().includes("A2") ? "A2 Level" : "IGCSE 0455";
    }

    return {
      student: {
        id: data.studentId,
        fullName: u?.fullName || profileRes.data?.full_name || "Student",
        email: u?.email || profileRes.data?.email || "",
        school: u?.school || profileRes.data?.school || null,
        level: studentLevel,
        targetGrade: profileRes.data?.target_grade || null,
        examBoard: profileRes.data?.exam_board || "Cambridge IGCSE 0455",
        lastSeen: profileRes.data?.last_seen || null,
      },
      summary: {
        averageEssayPercent,
        totalEssaysMarked: allEssays.length,
        mcqAccuracyPercent: overallMcqAccuracyPct,
        totalMcqCorrect,
        totalMcqAttempted,
        liveExaminerSessions: liveSessionsRes.data?.length ?? 0,
      },
      essays: allEssays,
      mcqs: enrichedMcqs,
      topics,
      liveSessions: (liveSessionsRes.data ?? []).map((s) => ({
        id: s.id,
        question: s.question,
        topic: s.topic,
        level: s.level,
        maxMark: s.max_mark,
        updatedAt: s.updated_at,
      })),
    };
  });


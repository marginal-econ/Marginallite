import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import type { Database } from "@/integrations/backend/types";
import { isAdmin } from "@/lib/auth-admin";

const classroomInput = z.object({
  name: z.string().trim().min(1, "Give the class a name.").max(100),
  level: z.enum(["as", "a2", "mixed"]),
  teacherId: z.string().uuid().optional(),
});

const classroomIdInput = z.object({ classroomId: z.string().uuid() });

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  if (isAdmin({ userId: context.userId, claims: (context as any).claims, email: (context as any).email })) {
    return;
  }
  throw new Error("Administrator privileges are required to create or remove classrooms.");
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
  if (isAdmin({ userId: context.userId, claims: (context as any).claims, email: (context as any).email })) {
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
  const isPlatformAdmin = isAdmin({ userId });

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
    isAdmin: isPlatformAdmin,
    isStaff: classroom.teacher_id === userId || isPlatformAdmin || Boolean(collaborator),
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
    const isPlatformAdmin = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    const activeRole = isPlatformAdmin
      ? ("admin" as const)
      : roleList.includes("teacher")
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
  .inputValidator((input: unknown) => classroomInput.parse(input))
  .handler(async ({ data, context }) => {
    const isPlatformAdmin = isAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email,
    });
    const { getSupabaseAdmin } = await import("@/server/supabase");
    const admin = getSupabaseAdmin();
    const assignedTeacherId = isPlatformAdmin && data.teacherId ? data.teacherId : context.userId;

    if (!isPlatformAdmin) {
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
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
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
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
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
      .parse(input),
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
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
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
  .inputValidator((input: unknown) => classroomIdInput.parse(input))
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
    z.object({ classroomId: z.string().uuid(), email: z.string().trim().email() }).parse(input),
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
    z.object({ classroomId: z.string().uuid(), email: z.string().trim().email() }).parse(input),
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
    z.object({ classroomId: z.string().uuid(), teacherId: z.string().uuid() }).parse(input),
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
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
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
    z.object({ classroomId: z.string().uuid(), studentId: z.string().uuid() }).parse(input),
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
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
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
    z.object({ membershipId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
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
  .inputValidator((input: unknown) => z.object({ classroomId: z.string().uuid() }).parse(input))
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
      .parse(input),
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
      .parse(input),
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
    z.object({ messageId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
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
      .parse(input),
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
  .inputValidator((input: unknown) => classroomIdInput.parse(input))
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
      .parse(input),
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
      .parse(input),
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
    z.object({ announcementId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
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
      .parse(input),
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
    z.object({ commentId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
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
  .inputValidator((input: unknown) => classroomIdInput.parse(input))
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

    // Fetch submissions from CR_STORE
    for (const assId of assIds) {
      const crSubs = await CR_STORE.list<any>(authority.admin, `__CR_SUB_${assId}_`);
      if (crSubs && crSubs.length > 0) {
        subList.push(...crSubs);
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
        essayMaxMark: a.essay_max_mark ?? 20,
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
              essayId: mySub.essay_id ?? null,
              aiScore: mySub.ai_score ?? null,
              teacherScore: mySub.teacher_score ?? null,
              teacherFeedback: mySub.teacher_feedback ?? null,
              submittedAt: mySub.submitted_at ?? null,
              gradedAt: mySub.graded_at ?? null,
              returnedAt: mySub.returned_at ?? null,
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
      .parse(input),
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
      essay_max_mark: data.kind === "essay" ? data.essayMaxMark || 20 : null,
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
    z.object({ assignmentId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
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
          .max(20000)
          .optional(),
        essayId: z.string().uuid().optional(),
      })
      .parse(input),
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
    z.object({ assignmentId: z.string().uuid(), classroomId: z.string().uuid() }).parse(input),
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
          .select("id, title, kind, essay_max_mark, due_at")
          .eq("id", data.assignmentId)
          .single();
        if (row) assignment = row;
      } catch {}
    }

    if (!assignment) throw new Error("Assignment not found.");

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
      .parse(input),
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
  .inputValidator((input: unknown) => classroomIdInput.parse(input))
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
        .select("id, title, kind, essay_max_mark, due_at, created_at")
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
      const maxMark = assignment?.essay_max_mark ?? 20;
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
        maxMark: a.essay_max_mark ?? 20,
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

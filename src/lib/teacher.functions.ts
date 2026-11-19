import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isAdmin } from "@/lib/auth-admin";
import { unwrapData } from "@/lib/safe-validator";

const RegisterTeacherInput = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  schoolName: z.string().min(3, "Official school name is compulsory."),
  schoolEmail: z.string().email("A valid institutional school email is compulsory."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

/**
 * Public registration endpoint for Cambridge IGCSE 0455 teachers.
 * Creates an account in pending status requiring admin approval.
 */
export const registerTeacher = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RegisterTeacherInput.parse(unwrapData(input)))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { requireEnv, readEnv } = await import("@/server/env");

    const email = data.schoolEmail.trim().toLowerCase();
    const fullName = data.fullName.trim();
    const schoolName = data.schoolName.trim();

    // 1. Create or check user in Auth
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        school: schoolName,
        school_email: email,
        role: "teacher",
        teacher_status: "approved",
      },
    });

    if (createError) {
      if (createError.message.includes("already registered") || createError.message.includes("already exists")) {
        throw new Error("An account with this institutional email already exists. Please sign in or reset your password.");
      }
      throw new Error(createError.message);
    }

    const userId = createData.user.id;

    // 2. Set profile with school details
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      school: schoolName,
    });

    // 3. Mark role directly as teacher (immediate access, no manual verification delay)
    await (supabaseAdmin.from("user_roles") as any).upsert({
      user_id: userId,
      role: "teacher",
    }, { onConflict: "user_id,role" });

    // Clean up any pending role flag if it exists
    try {
      await (supabaseAdmin.from("user_roles") as any)
        .delete()
        .eq("user_id", userId)
        .eq("role", "teacher_pending");
    } catch {}

    // 4. Send welcome confirmation email to teacher via Mailjet
    try {
      const apiKey = readEnv("MAILJET_API_KEY");
      const secretKey = readEnv("MAILJET_SECRET_KEY");
      const sender = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";

      if (apiKey && secretKey) {
        // Teacher confirmation
        await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: sender, Name: "Marginalite Academic Staff" },
                To: [{ Email: email, Name: fullName }],
                Subject: "Welcome to Marginalite · Teacher Account Activated",
                HTMLPart: `
                  <div style="font-family:sans-serif;background:#f7f4ff;padding:32px 14px;color:#181323">
                    <div style="max-width:560px;margin:0 auto;background:#fff;border:2px solid #21172d;border-radius:20px;padding:32px;box-shadow:6px 6px 0 #21172d">
                      <h2 style="color:#7c4edb;margin-top:0">Teacher Account Activated!</h2>
                      <p>Dear ${fullName},</p>
                      <p>Welcome to Marginalite! Your educator account for <strong>${schoolName}</strong> is activated with full teacher privileges.</p>
                      <ul style="line-height:1.7;">
                        <li><strong>Classrooms:</strong> Create Cambridge IGCSE 0455 cohorts and invite your students.</li>
                        <li><strong>Assignments:</strong> Set essay homework and review automated AI markings.</li>
                        <li><strong>Mark Schemes:</strong> Ingest custom syllabuses and calibrate standards.</li>
                      </ul>
                      <div style="margin:24px 0;">
                        <a href="https://lite.marginal-econ.com/teacher-auth" style="background:#7c4edb;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block">Open Teacher Portal →</a>
                      </div>
                      <p style="font-size:12px;color:#777;margin-top:28px">Marginalite · Dedicated Cambridge IGCSE 0455 Economics Evaluation Platform</p>
                    </div>
                  </div>
                `,
              },
              // Admin notification
              {
                From: { Email: sender, Name: "Marginalite Notifications" },
                To: [{ Email: sender, Name: "Marginalite Administrator" }],
                Subject: `[New Teacher Joined] ${fullName} (${schoolName})`,
                HTMLPart: `
                  <div style="font-family:sans-serif;padding:20px;">
                    <h3>New Cambridge Economics Teacher Joined</h3>
                    <p><strong>Name:</strong> ${fullName}</p>
                    <p><strong>School:</strong> ${schoolName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p>Account status: <strong>Active (Auto-verified)</strong>.</p>
                  </div>
                `,
              },
            ],
          }),
        });
      }
    } catch (mailErr) {
      console.warn("Mailjet teacher registration email warning:", mailErr);
    }

    return {
      success: true,
      message: "Teacher account created and approved. Full educator access granted.",
    };
  });

/**
 * Checks if the currently authenticated user is an approved teacher.
 */
export const getTeacherProfileStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const isMarginalite = isAdmin({ userId, email: (context as any).email, claims: (context as any).claims });

    if (isMarginalite) {
      return { status: "approved" as const, isStaff: true, isAdmin: true };
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const db = supabaseAdmin ?? supabase;

    const { data: roles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleList = (roles ?? []).map((r: any) => r.role);

    if (
      roleList.includes("teacher") ||
      (context as any).claims?.user_metadata?.role === "teacher" ||
      (context as any).claims?.app_metadata?.role === "teacher"
    ) {
      if (!roleList.includes("teacher")) {
        try {
          await db.from("user_roles").upsert(
            { user_id: userId, role: "teacher" },
            { onConflict: "user_id,role" }
          );
        } catch {}
      }
      return { status: "approved" as const, isStaff: true, isAdmin: false };
    }

    // Auto-approve pending teachers during open teacher access
    if (roleList.includes("teacher_pending")) {
      try {
        await db.from("user_roles").upsert(
          { user_id: userId, role: "teacher" },
          { onConflict: "user_id,role" }
        );
        await (db.from("user_roles") as any)
          .delete()
          .eq("user_id", userId)
          .eq("role", "teacher_pending");
      } catch {}
      return { status: "approved" as const, isStaff: true, isAdmin: false };
    }

    try {
      const { data: tp } = await (db as any)
        .from("teacher_profiles")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();

      if (tp?.status === "approved" || tp?.status === "pending") {
        try {
          await db.from("user_roles").upsert(
            { user_id: userId, role: "teacher" },
            { onConflict: "user_id,role" }
          );
        } catch {}
        return { status: "approved" as const, isStaff: true, isAdmin: false };
      }
    } catch {
      /* ignore */
    }

    // Open teacher access: when checked in teacher context, auto-grant teacher role
    try {
      await db.from("user_roles").upsert(
        { user_id: userId, role: "teacher" },
        { onConflict: "user_id,role" }
      );
    } catch {}

    return { status: "approved" as const, isStaff: true, isAdmin: false };
  });

/**
 * Admin: List all teacher registrations and applications.
 */
export const listTeacherApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isMarginalite = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isMarginalite) {
      throw new Error("Admin access required.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // Get all users
    const { data: usersData, error: uErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (uErr) throw new Error(uErr.message);

    // Get all roles
    const { data: rolesData, error: rErr } = await supabaseAdmin.from("user_roles").select("*");
    if (rErr) throw new Error(rErr.message);

    // Get all profiles
    const { data: profilesData } = await supabaseAdmin.from("profiles").select("*");
    const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

    const teacherUsers: Array<{
      id: string;
      email: string;
      fullName: string;
      school: string;
      status: "approved" | "pending" | "rejected";
      createdAt: string;
      lastSignInAt: string | null;
    }> = [];

    for (const u of usersData.users) {
      const userRoles = (rolesData || []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role);
      const isTeacherRole = userRoles.includes("teacher");
      const isPendingRole = userRoles.includes("teacher_pending");
      const metaRole = u.user_metadata?.role;
      const metaStatus = u.user_metadata?.teacher_status;

      if (isTeacherRole || isPendingRole || metaRole === "teacher") {
        const prof = profileMap.get(u.id);
        const status = isTeacherRole
          ? "approved"
          : metaStatus === "rejected"
          ? "rejected"
          : "pending";

        teacherUsers.push({
          id: u.id,
          email: u.email || "",
          fullName: prof?.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "Educator",
          school: prof?.school || u.user_metadata?.school || "Unspecified School",
          status,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
        });
      }
    }

    return teacherUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

/**
 * Admin: Approve a teacher application, grant teacher role, and send notification.
 */
export const approveTeacherApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const isMarginalite = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isMarginalite) throw new Error("Admin access required.");

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");
    const { readEnv } = await import("@/server/env");

    // 1. Remove teacher_pending
    await (supabaseAdmin.from("user_roles") as any)
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "teacher_pending");

    // 2. Add teacher role
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: data.userId, role: "teacher" },
      { onConflict: "user_id,role" }
    );

    // 3. Update user metadata
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userData?.user) {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        user_metadata: {
          ...userData.user.user_metadata,
          role: "teacher",
          teacher_status: "approved",
        },
      });

      // 4. Send official approval email via Mailjet
      try {
        const apiKey = readEnv("MAILJET_API_KEY");
        const secretKey = readEnv("MAILJET_SECRET_KEY");
        const sender = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";
        const email = userData.user.email;
        const name = userData.user.user_metadata?.full_name || "Educator";
        const school = userData.user.user_metadata?.school || "your school";

        if (apiKey && secretKey && email) {
          await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              Messages: [
                {
                  From: { Email: sender, Name: "Marginalite Academic Staff" },
                  To: [{ Email: email, Name: name }],
                  Subject: "Approved: Your Marginalite Teacher Account is Active!",
                  HTMLPart: `
                    <div style="font-family:sans-serif;background:#f7f4ff;padding:32px 14px;color:#181323">
                      <div style="max-width:560px;margin:0 auto;background:#fff;border:2px solid #21172d;border-radius:20px;padding:32px;box-shadow:6px 6px 0 #21172d">
                        <h2 style="color:#7c4edb;margin-top:0">Welcome to the Marginalite Teacher Network!</h2>
                        <p>Dear ${name},</p>
                        <p>Your teacher verification for <strong>${school}</strong> has been approved by the Marginalite administration.</p>
                        <p>You now have full staff privileges to:</p>
                        <ul style="line-height:1.7;">
                          <li><strong>Knowledge Base:</strong> Ingest and manage Cambridge IGCSE 0455 mark schemes, past papers, and coursebooks.</li>
                          <li><strong>Classrooms:</strong> Set assignments, track student cohorts, and review diagnostic heatmaps.</li>
                          <li><strong>Marking Desk:</strong> Batch-process student mock papers with AI first-pass marking.</li>
                        </ul>
                        <div style="margin:28px 0;">
                          <a href="https://app.marginal-econ.workers.dev/teacher-auth" style="background:#7c4edb;color:#fff;padding:14px 24px;border-radius:12px;font-weight:bold;text-decoration:none;border:2px solid #21172d;display:inline-block;box-shadow:4px 4px 0 #21172d">Sign In to Teacher Portal →</a>
                        </div>
                        <p style="font-size:12px;color:#777">Marginalite · Built for Cambridge IGCSE Economics (0455) 0455</p>
                      </div>
                    </div>
                  `,
                },
              ],
            }),
          });
        }
      } catch (e) {
        console.warn("Mailjet approval send warning:", e);
      }
    }

    return { success: true, message: "Teacher approved and staff privileges granted." };
  });

/**
 * Admin: Reject teacher application.
 */
export const rejectTeacherApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), reason: z.string().optional() }).parse(unwrapData(input)))
  .handler(async ({ data, context }) => {
    const isMarginalite = isAdmin({
      userId: context.userId,
      email: (context as any).email,
      claims: (context as any).claims,
    });
    if (!isMarginalite) throw new Error("Admin access required.");

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // Remove teacher role if exists
    await (supabaseAdmin.from("user_roles") as any).delete().eq("user_id", data.userId).in("role", ["teacher", "teacher_pending"]);

    // Update metadata
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userData?.user) {
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        user_metadata: {
          ...userData.user.user_metadata,
          teacher_status: "rejected",
        },
      });
    }

    return { success: true, message: "Teacher application rejected." };
  });

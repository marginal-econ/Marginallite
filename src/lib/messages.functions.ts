import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { isMarginalAdmin } from "./auth-admin";

export type DirectMessage = {
  id: string;
  userId: string;
  sender: "admin" | "user";
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
};

export type UserConversation = {
  userId: string;
  name: string;
  email: string;
  school: string | null;
  role: string;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSender: "admin" | "user" | null;
  totalMessages: number;
};

function parseMessagePayload(row: {
  id: string;
  user_id: string | null;
  error_message: string | null;
  created_at: string;
  ok: boolean;
}): DirectMessage {
  try {
    const parsed = JSON.parse(row.error_message || "{}");
    return {
      id: row.id,
      userId: row.user_id || "",
      sender: parsed.sender === "admin" ? "admin" : "user",
      senderName: parsed.senderName || (parsed.sender === "admin" ? "Marginalite Team" : "Student"),
      text: parsed.text || row.error_message || "",
      createdAt: row.created_at,
      read: row.ok === true || parsed.read === true,
    };
  } catch {
    return {
      id: row.id,
      userId: row.user_id || "",
      sender: "user",
      senderName: "User",
      text: row.error_message || "",
      createdAt: row.created_at,
      read: row.ok === true,
    };
  }
}

type RawMessageRow = {
  id: string;
  user_id: string | null;
  error_message: string | null;
  created_at: string;
  ok: boolean;
};

// Resilient DB fetch: tries ai_usage_log first, falls back to definitions table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchRawMessages(admin: any, userId?: string): Promise<RawMessageRow[]> {
  // 1. Try ai_usage_log if present
  try {
    let q = admin
      .from("ai_usage_log")
      .select("id, user_id, error_message, created_at, ok")
      .eq("feature", "DIRECT_MESSAGE");
    if (userId) {
      q = q.eq("user_id", userId);
    }
    const { data, error } = await q.order("created_at", { ascending: false }).limit(2000);
    if (!error && data && data.length > 0) return data;
  } catch {}

  // 2. Primary / Fallback: definitions table (stored with category: "direct_message")
  try {
    let q = admin
      .from("definitions")
      .select("id, term, definition_text, created_at, source_label")
      .eq("category", "direct_message");
    if (userId) {
      q = q.like("term", `__MSG_${userId}_%`);
    }
    const { data, error } = await q.order("created_at", { ascending: false }).limit(2000);
    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((r: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any = {};
        try {
          parsed = JSON.parse(r.definition_text || "{}");
        } catch {}
        const parts = (r.term || "").split("_");
        const extractedUserId = parts.length >= 4 ? parts[2] : parsed.userId || null;
        return {
          id: r.id,
          user_id: extractedUserId,
          error_message: r.definition_text,
          created_at: r.created_at,
          ok: parsed.read === true || r.source_label === "read",
        };
      });
    }
  } catch {}

  return [];
}

// Resilient DB insert: tries ai_usage_log, falls back to definitions table
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRawMessage(admin: any, userId: string, payload: any, isRead: boolean) {
  const jsonStr = JSON.stringify({ ...payload, read: isRead });

  // 1. Try ai_usage_log
  try {
    const { data, error } = await admin
      .from("ai_usage_log")
      .insert({
        user_id: userId,
        feature: "DIRECT_MESSAGE",
        model: "direct_text",
        ok: isRead,
        error_message: jsonStr,
      })
      .select("id, created_at")
      .single();
    if (!error && data) return data;
  } catch {}

  // 2. Insert into definitions table
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  await admin.from("definitions").insert({
    id: newId,
    term: `__MSG_${userId}_${newId}`,
    definition_text: jsonStr,
    category: "direct_message",
    source_label: isRead ? "read" : "unread",
    created_at: now,
    updated_at: now,
  });

  return { id: newId, created_at: now };
}

// Resilient DB mark read
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markRawMessagesRead(admin: any, rowIds: string[]) {
  if (rowIds.length === 0) return;

  // 1. Try ai_usage_log
  try {
    await admin.from("ai_usage_log").update({ ok: true }).in("id", rowIds);
  } catch {}

  // 2. Try definitions
  try {
    const { data: rows } = await admin
      .from("definitions")
      .select("id, definition_text")
      .in("id", rowIds)
      .eq("category", "direct_message");

    for (const r of rows ?? []) {
      try {
        const parsed = JSON.parse(r.definition_text || "{}");
        parsed.read = true;
        await admin
          .from("definitions")
          .update({
            definition_text: JSON.stringify(parsed),
            source_label: "read",
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id);
      } catch {}
    }
  } catch {}
}

/**
 * Admin: List all user conversations with their latest direct message,
 * unread badges, and user contact details.
 */
export const listAdminConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserConversation[]> => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });
    if (!isMarginal) {
      throw new Error("Admin access is restricted to Marginalite Team.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // 1. Fetch all registered users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authUsers: any[] = [];
    try {
      for (let page = 1; ; page += 1) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users) break;
        authUsers.push(...data.users);
        if (data.users.length < 1000) break;
      }
    } catch (e) {
      console.warn("Failed to fetch auth users in listAdminConversations:", e);
    }

    // 2. Fetch profiles
    const profilesMap = new Map<string, { full_name: string | null; school: string | null }>();
    try {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, school");
      for (const p of profiles ?? []) {
        profilesMap.set(p.id, { full_name: p.full_name, school: p.school });
      }
    } catch {}

    // 3. Fetch direct messages using resilient loader
    const rawMessages = await fetchRawMessages(supabaseAdmin);

    const messagesByUser = new Map<string, DirectMessage[]>();
    for (const row of rawMessages ?? []) {
      if (!row.user_id) continue;
      const parsed = parseMessagePayload(row);
      const list = messagesByUser.get(row.user_id) ?? [];
      list.push(parsed);
      messagesByUser.set(row.user_id, list);
    }

    // 4. Combine into UserConversation summaries
    const conversations: UserConversation[] = [];
    const seenUserIds = new Set<string>();

    for (const u of authUsers) {
      if (seenUserIds.has(u.id)) continue;
      seenUserIds.add(u.id);

      const profile = profilesMap.get(u.id);
      const msgs = messagesByUser.get(u.id) ?? [];
      const unreadCount = msgs.filter((m) => m.sender === "user" && !m.read).length;
      const latestMsg = msgs[0] ?? null;

      const name =
        profile?.full_name ||
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        (u.email ? u.email.split("@")[0] : "Student");

      const role =
        u.user_metadata?.role ||
        u.app_metadata?.role ||
        (u.email === "marginal.econ.ai@gmail.com" ? "admin" : "student");

      conversations.push({
        userId: u.id,
        name,
        email: u.email || "No email",
        school: profile?.school || u.user_metadata?.school || null,
        role,
        unreadCount,
        lastMessage: latestMsg?.text ?? null,
        lastMessageAt: latestMsg?.createdAt ?? null,
        lastSender: latestMsg?.sender ?? null,
        totalMessages: msgs.length,
      });
    }

    // Include users with messages who may not be in listUsers
    for (const [uid, msgs] of messagesByUser.entries()) {
      if (!seenUserIds.has(uid)) {
        seenUserIds.add(uid);
        const profile = profilesMap.get(uid);
        const unreadCount = msgs.filter((m) => m.sender === "user" && !m.read).length;
        const latestMsg = msgs[0] ?? null;
        conversations.push({
          userId: uid,
          name: profile?.full_name || "Student",
          email: "Active User",
          school: profile?.school || null,
          role: "student",
          unreadCount,
          lastMessage: latestMsg?.text ?? null,
          lastMessageAt: latestMsg?.createdAt ?? null,
          lastSender: latestMsg?.sender ?? null,
          totalMessages: msgs.length,
        });
      }
    }

    // Sort: users with unread messages first, then latest messages, then recent signups
    return conversations.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.name.localeCompare(b.name);
    });
  });

/**
 * Fetch direct message thread between Admin and a specific student.
 */
export const getConversationThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string() }).parse(input))
  .handler(async ({ data, context }): Promise<DirectMessage[]> => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });

    if (!isMarginal && context.userId !== data.userId) {
      throw new Error("You can only read your own conversation thread.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    // Fetch messages
    const rows = await fetchRawMessages(supabaseAdmin, data.userId);

    // If admin is reading, mark incoming student messages as read
    if (isMarginal) {
      const unreadStudentIds = (rows ?? [])
        .filter((r) => !r.ok)
        .map((r) => r.id);

      if (unreadStudentIds.length > 0) {
        await markRawMessagesRead(supabaseAdmin, unreadStudentIds);
      }
    }

    const thread = (rows ?? []).map((r) => ({
      ...parseMessagePayload(r),
      read: isMarginal ? true : r.ok === true,
    }));

    return thread.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

/**
 * Admin: Send direct text message to a specific student inside the app.
 */
export const sendAdminTextMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        recipientUserId: z.string().min(5),
        text: z.string().trim().min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });
    if (!isMarginal) {
      throw new Error("Only platform administrators can send admin direct messages.");
    }

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const payload = {
      sender: "admin",
      senderName: "Marginalite Team",
      text: data.text.trim(),
      createdAt: new Date().toISOString(),
    };

    const inserted = await insertRawMessage(supabaseAdmin, data.recipientUserId, payload, false);

    return {
      ok: true,
      id: inserted.id,
      createdAt: inserted.created_at,
    };
  });

/**
 * Student: Send a direct text message to Marginalite Admin inside the app.
 */
export const sendStudentTextMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(1).max(5000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const senderName =
      (context as any).claims?.user_metadata?.full_name ||
      (context as any).claims?.user_metadata?.name ||
      ((context as any).email ? (context as any).email.split("@")[0] : "Student");

    const payload = {
      sender: "user",
      senderName,
      text: data.text.trim(),
      createdAt: new Date().toISOString(),
    };

    const inserted = await insertRawMessage(supabaseAdmin, context.userId, payload, false);

    return {
      ok: true,
      id: inserted.id,
      createdAt: inserted.created_at,
    };
  });

/**
 * Student: Fetch own direct messages thread with Marginalite Team.
 */
export const getMyStudentThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ messages: DirectMessage[]; unreadCount: number }> => {
    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const rows = await fetchRawMessages(supabaseAdmin, context.userId);

    // Mark admin messages as read now that student has opened the thread
    const unreadAdminRowIds = (rows ?? [])
      .filter((r) => {
        const parsed = parseMessagePayload(r);
        return parsed.sender === "admin" && !r.ok;
      })
      .map((r) => r.id);

    if (unreadAdminRowIds.length > 0) {
      await markRawMessagesRead(supabaseAdmin, unreadAdminRowIds);
    }

    const thread = (rows ?? []).map((r) => ({
      ...parseMessagePayload(r),
      read: true,
    }));

    return {
      messages: thread.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      unreadCount: 0,
    };
  });

/**
 * Mark all messages in a conversation as read explicitly.
 */
export const markConversationAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().optional() }).optional().parse(input) ?? {},
  )
  .handler(async ({ data, context }) => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    const targetUserId = (isMarginal && data?.userId) ? data.userId : context.userId;
    const rows = await fetchRawMessages(supabaseAdmin, targetUserId);

    const unreadIds = rows.filter((r) => !r.ok).map((r) => r.id);
    if (unreadIds.length > 0) {
      await markRawMessagesRead(supabaseAdmin, unreadIds);
    }

    return { ok: true };
  });

/**
 * Quick unread message check for header badge (Student or Admin).
 */
export const getUnreadMessageCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ unreadCount: number }> => {
    const isMarginal = isMarginalAdmin({
      userId: context.userId,
      claims: (context as any).claims,
      email: (context as any).email || (context as any).claims?.email,
    });

    const { supabaseAdmin } = await import("@/integrations/backend/client.server");

    if (isMarginal) {
      const rows = await fetchRawMessages(supabaseAdmin);
      const unreadFromUsers = rows.filter((r) => {
        try {
          const parsed = parseMessagePayload(r);
          return parsed.sender === "user" && !parsed.read;
        } catch {
          return true;
        }
      }).length;

      return { unreadCount: unreadFromUsers };
    } else {
      const rows = await fetchRawMessages(supabaseAdmin, context.userId);
      const unreadFromAdmin = rows.filter((r) => {
        try {
          const parsed = parseMessagePayload(r);
          return parsed.sender === "admin" && !parsed.read;
        } catch {
          return false;
        }
      }).length;

      return { unreadCount: unreadFromAdmin };
    }
  });

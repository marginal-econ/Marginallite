import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/backend/types";
import { requireEnv } from "./env";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!,
  );
}

export async function sendAccessInvitation(
  client: SupabaseClient<Database>,
  member: { email: string; name: string | null; status: string },
  redirectTo: string,
): Promise<void> {
  const options = { redirectTo, data: { full_name: member.name ?? "" } };
  let generated = await client.auth.admin.generateLink({
    type: member.status === "invited" ? "recovery" : "invite",
    email: member.email,
    options,
  });

  // A previous attempt may have created the Auth user without updating the
  // waitlist row. A recovery link is the safe equivalent for that user: it
  // still lands on Marginalite's choose-password screen.
  if (generated.error && member.status !== "invited") {
    generated = await client.auth.admin.generateLink({
      type: "recovery",
      email: member.email,
      options: { redirectTo },
    });
  }
  if (generated.error || !generated.data.properties?.hashed_token) {
    throw new Error(generated.error?.message ?? "Supabase did not create an invitation link.");
  }

  const tokenHash = generated.data.properties.hashed_token;
  const verificationType = generated.data.properties.verification_type || (member.status === "invited" ? "recovery" : "invite");
  const directActionLink = `${new URL(redirectTo).origin}/auth?token_hash=${tokenHash}&type=${verificationType}`;

  const firstName = escapeHtml(member.name?.trim().split(/\s+/)[0] || "there");
  const actionLink = escapeHtml(directActionLink);
  const sender = requireEnv("MAILJET_SENDER_EMAIL");
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(
        `${requireEnv("MAILJET_API_KEY")}:${requireEnv("MAILJET_SECRET_KEY")}`,
      )}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: sender, Name: "Marginalite" },
          To: [{ Email: member.email, Name: member.name ?? undefined }],
          Subject: "Your invitation to Marginalite",
          TextPart: `Hi ${member.name?.trim().split(/\s+/)[0] || "there"},\n\nYou're invited to Marginalite. Use this secure link to choose your password and open your student account:\n\n${generated.data.properties.action_link}\n\nThis link is intended only for ${member.email}. If you weren't expecting it, you can ignore this email.\n\n— Marginalite`,
          HTMLPart: `<!doctype html>
<html><body style="margin:0;background:#fdf2f8;font-family:Arial,Helvetica,sans-serif;color:#181323">
  <div style="display:none;max-height:0;overflow:hidden">Your Marginalite student access is ready.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fdf2f8;padding:36px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:2px solid #21172d;border-radius:24px;box-shadow:8px 8px 0 #21172d;overflow:hidden">
        <tr><td style="height:10px;background:#ec4899"></td></tr>
        <tr><td style="padding:36px 38px 16px">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="width:44px;height:44px;background:#ec4899;border:2px solid #21172d;border-radius:13px;text-align:center;color:white;font-size:24px;font-weight:700">m</td>
            <td style="padding-left:12px;font-size:22px;font-weight:700">Marginalite</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 38px 38px">
          <p style="margin:0 0 12px;color:#ec4899;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Your access is ready</p>
          <h1 style="margin:0 0 18px;font-size:34px;line-height:1.12">Welcome to Marginalite, ${firstName}.</h1>
          <p style="margin:0 0 24px;color:#625d6c;font-size:17px;line-height:1.65">You’ve been invited to use Marginalite for Cambridge IGCSE Economics (0455). Choose a password to open your student account.</p>
          <a href="${actionLink}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:15px 24px;border:2px solid #21172d;border-radius:13px;box-shadow:4px 4px 0 #21172d">Set up my account →</a>
          <p style="margin:28px 0 0;color:#777180;font-size:13px;line-height:1.55">This secure invitation is for ${escapeHtml(member.email)}. If you weren’t expecting it, you can safely ignore this email.</p>
        </td></tr>
      </table>
      <p style="margin:22px 0 0;color:#777180;font-size:12px">Marginalite · Built for Cambridge IGCSE Economics (0455)</p>
    </td></tr>
  </table>
</body></html>`,
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[invite] Mailjet rejected access invitation", response.status, detail);
    throw new Error(`Mailjet could not send the invitation (HTTP ${response.status}).`);
  }
}

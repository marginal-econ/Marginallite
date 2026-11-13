import { getSupabaseAdmin } from "./supabase";
import { requireEnv } from "./env";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  portal: "student" | "teacher" = "student",
): Promise<void> {
  const siteUrl = new URL(requireEnv("PUBLIC_SITE_URL"));
  if (siteUrl.protocol !== "https:" && siteUrl.hostname !== "localhost") {
    throw new Error("PUBLIC_SITE_URL must use HTTPS.");
  }

  const client = getSupabaseAdmin();
  const redirectPath = portal === "teacher" ? "/teacher-auth" : "/auth";
  const { data, error } = await client.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: new URL(redirectPath, siteUrl).href },
  });

  // Do not reveal whether an address has an account. The public endpoint
  // returns the same success response either way and sends mail only when
  // Supabase can create a valid recovery link.
  if (error || !data.properties?.hashed_token) return;

  const actionLink = `${siteUrl.origin}${redirectPath}?token_hash=${data.properties.hashed_token}&type=recovery`;
  const safeActionLink = escapeHtml(actionLink);
  const safeEmail = escapeHtml(email);
  const sender = requireEnv("MAILJET_SENDER_EMAIL");
  const isTeacher = portal === "teacher";
  const subject = isTeacher
    ? "Reset your Marginalite Educator password"
    : "Reset your Marginalite password";
  const portalName = isTeacher ? "Educator & Department Portal" : "Student Workspace";
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
          From: { Email: sender, Name: "Marginalite Accounts" },
          ReplyTo: { Email: sender, Name: "Marginalite Support" },
          To: [{ Email: email }],
          Subject: subject,
          TextPart: `${subject}\n\nWe received a request to reset the password for ${email} on the ${portalName}.\n\nChoose a new password using this secure link:\n${actionLink}\n\nFor your security, this link can be used only once. If Marginalite emails are filtered, please mark this message as not spam and add Marginalite to your trusted senders.\n\nIf you did not request a password reset, you can safely ignore this email; your password will remain unchanged.\n\nMarginalite\nCambridge IGCSE Economics (0455)`,
          HTMLPart: `<!doctype html>
<html lang="en"><body style="margin:0;background:#fdf2f8;font-family:Arial,Helvetica,sans-serif;color:#181323">
  <div style="display:none;max-height:0;overflow:hidden">Use this secure link to choose a new Marginalite password.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fdf2f8;padding:38px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:2px solid #21172d;border-radius:24px;box-shadow:8px 8px 0 #21172d;overflow:hidden">
        <tr><td style="height:10px;background:#ec4899"></td></tr>
        <tr><td style="padding:34px 38px 16px">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="width:44px;height:44px;background:#ec4899;border:2px solid #21172d;border-radius:13px;text-align:center;color:#ffffff;font-size:24px;font-weight:700">m</td>
            <td style="padding-left:12px"><div style="font-size:22px;font-weight:700">Marginalite</div><div style="margin-top:2px;color:#777180;font-size:12px">Cambridge IGCSE Economics (0455)</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 38px 38px">
          <p style="margin:0 0 12px;color:#ec4899;font-size:13px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Account security</p>
          <h1 style="margin:0 0 18px;font-size:34px;line-height:1.14">Reset your password</h1>
          <p style="margin:0 0 24px;color:#625d6c;font-size:17px;line-height:1.65">We received a request to reset the password for <strong style="color:#181323">${safeEmail}</strong>. Choose a new password using the secure button below.</p>
          <a href="${safeActionLink}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:15px 24px;border:2px solid #21172d;border-radius:13px;box-shadow:4px 4px 0 #21172d">Choose a new password →</a>
          <div style="margin-top:28px;padding:17px 18px;border-radius:13px;background:#fdf2f8;color:#625d6c;font-size:13px;line-height:1.6"><strong style="color:#181323">Didn’t request this?</strong><br>You can safely ignore this email. Your password will remain unchanged, and nobody can access your account through this message without the secure link.</div>
          <p style="margin:20px 0 0;color:#625d6c;font-size:13px;line-height:1.6"><strong style="color:#181323">Keep Marginalite emails visible.</strong><br>If this message was filtered, mark it as not spam and add Marginalite to your trusted senders.</p>
          <p style="margin:24px 0 6px;color:#777180;font-size:12px;line-height:1.5">If the button does not work, copy and paste this address into your browser:</p>
          <p style="margin:0;word-break:break-all;font-size:11px;line-height:1.5"><a href="${safeActionLink}" style="color:#ec4899">${safeActionLink}</a></p>
        </td></tr>
      </table>
      <p style="margin:24px 0 5px;color:#625d6c;font-size:12px;font-weight:700">Marginalite · Built for Cambridge IGCSE Economics (0455)</p>
      <p style="margin:0;color:#8b8592;font-size:11px">This automated security email was sent to ${safeEmail}.</p>
    </td></tr>
  </table>
</body></html>`,
          CustomID: "password-reset",
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[auth] Mailjet rejected password reset email", response.status, detail);
    throw new Error(`Mailjet could not send the password reset email (HTTP ${response.status}).`);
  }
}

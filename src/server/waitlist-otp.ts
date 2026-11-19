import { requireEnv } from "./env";
import { getSupabaseAdmin } from "./supabase";
import { generateReferralCode } from "./referral";
import type { NormalisedSignup } from "./validation";

type EmailBrandSettings = {
  sender_name: string;
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  footer: string;
};

const DEFAULT_EMAIL_BRAND: EmailBrandSettings = {
  sender_name: "Marginalite",
  subject: "Your Marginalite verification code",
  eyebrow: "Email verification",
  heading: "Confirm your place on the waitlist",
  intro: "Use the six-digit code below to verify your email and join the Marginalite waitlist.",
  footer: "Marginalite · Built for Cambridge IGCSE Economics (0455)",
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!,
  );
}

async function getEmailBrandSettings(): Promise<EmailBrandSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("email_brand_settings")
    .select("sender_name,subject,eyebrow,heading,intro,footer")
    .eq("id", true)
    .maybeSingle();
  return error || !data ? DEFAULT_EMAIL_BRAND : data;
}

function verificationEmailHtml(code: string, brand: EmailBrandSettings): string {
  const digits = code
    .split("")
    .map(
      (digit) =>
        `<td style="width:52px;height:64px;border:2px solid #21172d;border-radius:12px;background:#fdf2f8;text-align:center;font:700 30px/64px Arial,Helvetica,sans-serif;color:#21172d">${digit}</td>`,
    )
    .join('<td style="width:8px"></td>');
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#fdf2f8;font-family:Arial,Helvetica,sans-serif;color:#21172d">
  <div style="display:none;max-height:0;overflow:hidden">Your Marginalite code is ${code}. It expires in 10 minutes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fdf2f8;padding:36px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:2px solid #21172d;border-radius:24px;box-shadow:8px 8px 0 #21172d;overflow:hidden">
        <tr><td style="height:10px;background:#7c6df0"></td></tr>
        <tr><td style="padding:30px 38px 20px;border-bottom:1px solid #e6dfef">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="width:44px;height:44px;background:#7c6df0;border:2px solid #21172d;border-radius:13px;text-align:center;color:#ffffff;font-size:24px;font-weight:700">m</td>
            <td style="padding-left:12px"><div style="font-size:22px;font-weight:700;color:#21172d">Marginalite</div><div style="font-size:12px;color:#726b7c">Cambridge IGCSE Economics (0455)</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 38px 36px">
          <p style="margin:0 0 12px;color:#7c6df0;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">${escapeHtml(brand.eyebrow)}</p>
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.15;color:#181323">${escapeHtml(brand.heading)}</h1>
          <p style="margin:0 0 26px;color:#625d6c;font-size:16px;line-height:1.65">${escapeHtml(brand.intro)}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" aria-label="Verification code"><tr>${digits}</tr></table>
          <p style="margin:24px 0 0;color:#625d6c;font-size:14px;line-height:1.6"><strong>This code expires in 10 minutes.</strong><br>Enter it only on the official Marginalite website. We will never ask you to send this code by email or message.</p>
          <div style="margin-top:26px;padding:16px 18px;border-radius:12px;background:#fdf2f8;color:#625d6c;font-size:13px;line-height:1.55">Joining the waitlist does not automatically create an account. An administrator will contact you when access is available. After verification, please continue checking your inbox and spam or junk folder for your access invitation.</div>
        </td></tr>
        <tr><td style="padding:20px 38px;background:#21172d;color:#d9cee8;font-size:12px;line-height:1.55">If you did not request this code, you can safely ignore this email. No account changes will be made.</td></tr>
      </table>
      <p style="margin:22px 0 0;color:#777180;font-size:12px">${escapeHtml(brand.footer)}</p>
    </td></tr>
  </table>
</body></html>`;
}

async function digest(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requireEnv("WAITLIST_OTP_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function requestWaitlistCode(
  signup: NormalisedSignup & { source: string },
  requester: string,
) {
  const apiKey = requireEnv("MAILJET_API_KEY");
  const secretKey = requireEnv("MAILJET_SECRET_KEY");
  const sender = requireEnv("MAILJET_SENDER_EMAIL");
  const id = crypto.randomUUID();
  // Rejection sampling avoids modulo bias in six-digit codes.
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= 4294000000);
  const code = String(random[0] % 1000000).padStart(6, "0");
  const client = getSupabaseAdmin();
  const brand = await getEmailBrandSettings();
  const { data: allowed, error } = await client.rpc("request_waitlist_code", {
    p_id: id,
    p_email: signup.email,
    p_signup: signup,
    p_hash: await digest(`${id}:${code}`),
    p_requester: await digest(`ip:${requester}`),
  });
  if (error) throw error;
  if (!allowed) return null;
  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: sender, Name: brand.sender_name },
            To: [{ Email: signup.email }],
            Subject: brand.subject,
            TextPart: `${brand.heading}\n\n${brand.intro}\n\nYour verification code: ${code}\n\nThis code expires in 10 minutes. Enter it only on the official Marginalite website. Joining the waitlist does not create an account; an administrator must invite you. After verification, please continue checking your inbox and spam or junk folder for your access invitation.\n\nIf you did not request this code, ignore this email.\n\n${brand.footer}`,
            HTMLPart: verificationEmailHtml(code, brand),
            CustomID: "waitlist-verification",
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("[waitlist] Mailjet rejected verification email", response.status, detail);
      throw new Error(`Mailjet could not send verification email (HTTP ${response.status}).`);
    }
  } catch (error) {
    await client.from("waitlist_email_codes").update({ consumed: true }).eq("id", id);
    throw error;
  }
  return id;
}

export async function verifyWaitlistCode(
  id: string,
  code: string,
): Promise<{
  duplicate: boolean;
  referralCode: string | null;
  position: number;
} | null> {
  const { data, error } = await getSupabaseAdmin().rpc("verify_waitlist_code", {
    p_id: id,
    p_hash: await digest(`${id}:${code}`),
    p_referral_code: generateReferralCode(),
  });
  if (error) throw error;
  return data;
}

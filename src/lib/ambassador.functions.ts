import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { readEnv } from "@/server/env";

const AmbassadorApplicationInput = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Valid email is required").max(254),
  school: z.string().trim().min(2, "School or college is required").max(180),
  country: z.string().trim().min(2, "Country or city is required").max(100),
  linkedinOrSocial: z.string().trim().max(300).optional().or(z.literal("")),
  reason: z.string().trim().min(10, "Please share a few lines on why you'd like to represent Marginal").max(3000),
});

export type AmbassadorApplication = z.infer<typeof AmbassadorApplicationInput>;

/**
 * Dispatches a Student Ambassador Application directly to founder Saikrish's email via Mailjet.
 */
export const submitAmbassadorApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AmbassadorApplicationInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = readEnv("MAILJET_API_KEY");
    const secretKey = readEnv("MAILJET_SECRET_KEY");
    const sender = readEnv("MAILJET_SENDER_EMAIL") || "marginal.econ.ai@gmail.com";
    const recipient = "marginal.econ.ai@gmail.com";

    // 1. Audit log in Supabase
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      await supabaseAdmin.from("ai_usage_log").insert({
        feature: "AMBASSADOR_APPLICATION",
        model: data.country,
        latency_ms: 0,
        ok: true,
        error_message: JSON.stringify({
          ...data,
          submittedAt: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn("[ambassador] Database log warning:", e);
    }

    // 2. Dispatch via Mailjet API
    if (apiKey && secretKey) {
      try {
        const textContent =
          `New Marginal Student Ambassador Application\n\n` +
          `Name: ${data.fullName}\n` +
          `Email: ${data.email}\n` +
          `School/College: ${data.school}\n` +
          `Location: ${data.country}\n` +
          `Social/LinkedIn: ${data.linkedinOrSocial || "None provided"}\n\n` +
          `Application Statement:\n${data.reason}\n\n` +
          `Submitted at: ${new Date().toLocaleString()}`;

        const htmlContent = `
<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f5f1fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e1b2e">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background:#ffffff;border:2px solid #1e1b2e;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06)">
          <tr>
            <td style="height:10px;background:linear-gradient(90deg, #7c3aed, #a855f7, #f59e0b);"></td>
          </tr>
          <tr>
            <td style="padding:32px 36px">
              <span style="display:inline-block;padding:4px 10px;background:#ede9fe;color:#6d28d9;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">
                Ambassador Application
              </span>
              <h1 style="margin:12px 0 20px;font-size:24px;font-weight:800;color:#1e1b2e">
                New Candidate: ${data.fullName}
              </h1>
              
              <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:18px;margin-bottom:24px">
                <table style="width:100%;font-size:13px;line-height:1.7">
                  <tr>
                    <td style="color:#6b7280;width:120px"><strong>Applicant:</strong></td>
                    <td style="color:#111827"><strong>${data.fullName}</strong></td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280"><strong>Email:</strong></td>
                    <td style="color:#111827"><a href="mailto:${data.email}" style="color:#7c3aed;text-decoration:none">${data.email}</a></td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280"><strong>School:</strong></td>
                    <td style="color:#111827">${data.school}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280"><strong>Location:</strong></td>
                    <td style="color:#111827">${data.country}</td>
                  </tr>
                  ${data.linkedinOrSocial ? `<tr><td style="color:#6b7280"><strong>Profile:</strong></td><td><a href="${data.linkedinOrSocial}" target="_blank" style="color:#7c3aed">${data.linkedinOrSocial}</a></td></tr>` : ""}
                </table>
              </div>

              <h2 style="font-size:14px;font-weight:700;margin:0 0 10px;color:#374151">Why they want to represent Marginal:</h2>
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap">
${data.reason}
              </div>

              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f3f4f6;text-align:center">
                <a href="mailto:${data.email}?subject=Marginal%20Student%20Ambassador%20Role%20-%20Next%20Steps" style="display:inline-block;background:#7c3aed;color:#ffffff;padding:12px 24px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none">
                  Reply Directly to ${data.fullName}
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        const resp = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: sender, Name: "Marginal Ambassadors" },
                To: [{ Email: recipient, Name: "Saikrish (Founder)" }],
                ReplyTo: { Email: data.email, Name: data.fullName },
                Subject: `[Ambassador Application] ${data.fullName} - ${data.school}`,
                TextPart: textContent,
                HTMLPart: htmlContent,
                CustomID: "ambassador-application",
              },
            ],
          }),
        });

        if (!resp.ok) {
          const detail = await resp.text();
          console.error("[ambassador] Mailjet send error:", resp.status, detail);
        }
      } catch (err) {
        console.error("[ambassador] Failed to send email via Mailjet:", err);
      }
    }

    return {
      success: true,
      message: "Application submitted successfully! Our founder Saikrish and team will review and reach out to you via email.",
    };
  });

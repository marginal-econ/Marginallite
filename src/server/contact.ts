import { z } from "zod";

import { requireEnv } from "./env";

export const CONTACT_CATEGORIES = [
  "general",
  "technical",
  "bug",
  "partnership",
  "account",
  "teacher",
  "feedback",
] as const;

const CATEGORY_LABELS: Record<(typeof CONTACT_CATEGORIES)[number], string> = {
  general: "General question",
  technical: "Technical error",
  bug: "Found a bug",
  partnership: "Partnership",
  account: "Account or privacy",
  teacher: "Teacher or school enquiry",
  feedback: "Feedback or suggestion",
};

const attachmentSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  contentType: z
    .string()
    .refine(
      (value) =>
        value.startsWith("image/") ||
        [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ].includes(value),
      "Unsupported attachment type",
    ),
  base64: z.string().min(1).max(7_000_000),
});

export const contactMessageSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    category: z.enum(CONTACT_CATEGORIES),
    subject: z.string().trim().min(3).max(140),
    message: z.string().trim().min(20).max(4000),
    pageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
    attachments: z.array(attachmentSchema).max(3).default([]),
  })
  .superRefine((message, context) => {
    if ((message.category === "technical" || message.category === "bug") && !message.pageUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pageUrl"],
        message: "Add the affected page.",
      });
    }
  });

export type ContactMessage = z.infer<typeof contactMessageSchema>;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!,
  );
}

export async function sendContactMessage(message: ContactMessage): Promise<void> {
  const sender = requireEnv("MAILJET_SENDER_EMAIL");
  const destination = process.env.HELP_DESTINATION_EMAIL || "marginal.econ.ai@gmail.com";
  const category = CATEGORY_LABELS[message.category];
  const pageLine = message.pageUrl ? `\nPage: ${message.pageUrl}` : "";
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
          From: { Email: sender, Name: "Marginalite Help" },
          To: [{ Email: destination, Name: "Marginalite support" }],
          ReplyTo: { Email: message.email, Name: message.name },
          Subject: `[${category}] ${message.subject}`,
          TextPart: `New Marginalite help request\n\nCategory: ${category}\nFrom: ${message.name} <${message.email}>${pageLine}\n\n${message.message}`,
          HTMLPart: `<!doctype html><html><body style="margin:0;background:#fdf2f8;font-family:Arial,Helvetica,sans-serif;color:#21172d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:2px solid #21172d;border-radius:20px;overflow:hidden"><tr><td style="height:9px;background:#ec4899"></td></tr><tr><td style="padding:28px 32px"><p style="margin:0 0 8px;color:#ec4899;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">${escapeHtml(category)}</p><h1 style="margin:0 0 22px;font-size:27px">${escapeHtml(message.subject)}</h1><p style="margin:0 0 6px"><strong>From:</strong> ${escapeHtml(message.name)} &lt;${escapeHtml(message.email)}&gt;</p>${message.pageUrl ? `<p style="margin:0 0 20px"><strong>Page:</strong> ${escapeHtml(message.pageUrl)}</p>` : ""}<div style="margin-top:20px;padding:18px;background:#fdf2f8;border-radius:12px;white-space:pre-wrap;line-height:1.6">${escapeHtml(message.message)}</div></td></tr></table></td></tr></table></body></html>`,
          Attachments: message.attachments.map((attachment) => ({
            ContentType: attachment.contentType,
            Filename: attachment.filename,
            Base64Content: attachment.base64,
          })),
          CustomID: "help-request",
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("[contact] Mailjet rejected help request", response.status, detail);
    throw new Error(`Mailjet could not send the help request (HTTP ${response.status}).`);
  }
}

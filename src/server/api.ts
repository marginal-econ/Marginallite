import { getSettings, saveSettings } from "./settings";
import { publicSettings, validateSettings, matchesBlockedDomain } from "../lib/site-settings";
import { bulkSignups, getAdminSummary, parseFilters, querySignups } from "./admin-waitlist";
import { invalidateWaitlistCount, resolveReferrer } from "./waitlist";
import { getSupabaseAdmin } from "./supabase";
/**
 * The site's own HTTP API, mounted ahead of the router in `src/server.ts`.
 *
 * Three endpoints, all server-side:
 *
 *   POST /api/waitlist          join the list
 *   GET  /api/waitlist/count    how many people are on it
 *   GET  /api/admin/waitlist    the whole list, as JSON or CSV (key required)
 *   DELETE /api/admin/waitlist  remove one person (key required)
 *
 * Design rules that apply to every handler here:
 *  - Nothing from Supabase reaches the client. Database errors are logged
 *    server-side and answered with a fixed, friendly message; the response
 *    body is always a shape this file defines.
 *  - Every field is validated here, whatever the client already checked.
 *  - Status codes are real: 200 created/ok, 400 bad input, 409 duplicate,
 *    429 rate limited, 500 our fault, 503 not configured.
 */

import { readEnv } from "./env";
import { safeEqual } from "./referral";
import * as rateLimit from "./rate-limit";
import { validateSignup } from "./validation";
import { deleteSignup, getReferralStatus, getReferralTally, getWaitlistCount } from "./waitlist";
import { requestWaitlistCode, verifyWaitlistCode } from "./waitlist-otp";
import { contactMessageSchema, sendContactMessage } from "./contact";
import { sendPasswordResetEmail } from "./password-reset";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

class PayloadTooLargeError extends Error {}

async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PayloadTooLargeError("Request body is too large.");
  }
  if (!request.body) throw new SyntaxError("Missing JSON body.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError("Request body is too large.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function payloadTooLarge(): Response {
  return json(
    { success: false, code: "PAYLOAD_TOO_LARGE", message: "That request is too large." },
    413,
  );
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

/**
 * The single place a server-side failure becomes a client-visible message.
 * The real error goes to the log; the caller gets a sentence.
 */
function serverError(context: string, error: unknown): Response {
  console.error(`[waitlist] ${context}`, error);
  return json(
    {
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our end. Try again in a moment.",
    },
    500,
  );
}

function notConfigured(error: unknown): Response {
  console.error("[waitlist] not configured", error);
  return json(
    {
      success: false,
      code: "NOT_CONFIGURED",
      message: "The waitlist isn't connected yet. Try again shortly.",
    },
    503,
  );
}

function isMissingEnvError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.startsWith("Missing required environment variable")
  );
}

/**
 * Returns a Response when this request is ours, and `null` when it should
 * fall through to the TanStack router (i.e. it is a page request).
 */
export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (!path.startsWith("/api/")) return null;

  switch (path) {
    case "/api/settings":
      if (request.method !== "GET") return methodNotAllowed("GET");
      try {
        return json({ success: true, settings: publicSettings((await getSettings()).settings) });
      } catch (error) {
        return serverError("read public settings", error);
      }

    case "/api/admin/settings":
      if (!["GET", "PUT"].includes(request.method)) return methodNotAllowed("GET, PUT");
      return adminSettings(request);
    case "/api/admin/waitlist/bulk":
      if (request.method !== "POST") return methodNotAllowed("POST");
      return adminBulk(request);
    case "/api/waitlist":
      if (request.method === "POST") return postWaitlist(request);
      return methodNotAllowed("POST");

    case "/api/waitlist/count":
      if (request.method === "GET") return getCount(request);
      return methodNotAllowed("GET");

    case "/api/contact":
      if (request.method === "POST") return postContact(request);
      return methodNotAllowed("POST");

    case "/api/password-reset":
      if (request.method === "POST") return postPasswordReset(request);
      return methodNotAllowed("POST");

    case "/api/admin/waitlist":
      if (request.method === "GET") return getAdminExport(request, url);
      if (request.method === "DELETE") return deleteAdminRow(request, url);
      return methodNotAllowed("GET, DELETE");

    default:
      return json({ success: false, code: "NOT_FOUND", message: "No such endpoint." }, 404);
  }
}

async function postPasswordReset(request: Request): Promise<Response> {
  const requester = `password-reset:${rateLimit.identifyRequester(request)}`;
  const rules = [rateLimit.PASSWORD_RESET_BURST, rateLimit.PASSWORD_RESET_HOURLY];
  const localVerdict = rateLimit.check(requester, rules);
  const verdict = localVerdict.allowed
    ? await rateLimit.checkPersistent("password-reset", requester, rules)
    : localVerdict;
  if (!verdict.allowed) {
    return json(
      {
        success: false,
        code: "RATE_LIMITED",
        message: "Too many reset requests. Please wait a few minutes and try again.",
      },
      429,
      { "retry-after": String(verdict.retryAfterSeconds) },
    );
  }

  try {
    const body = (await readJsonBody(request, 16 * 1024)) as { email?: unknown; portal?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const portal = body.portal === "teacher" ? ("teacher" as const) : ("student" as const);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(
        { success: false, code: "INVALID_EMAIL", message: "Enter a valid email address." },
        400,
      );
    }
    await sendPasswordResetEmail(email, portal);
    return json({
      success: true,
      message:
        "If an account exists for that email, a secure reset link has been sent. Please check your inbox and spam or junk folder.",
    });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLarge();
    if (error instanceof SyntaxError) {
      return json({ success: false, code: "INVALID_PAYLOAD", message: "Send a JSON body." }, 400);
    }
    if (isMissingEnvError(error)) return notConfigured(error);
    return serverError("send password reset", error);
  }
}

async function postContact(request: Request): Promise<Response> {
  const requester = `contact:${rateLimit.identifyRequester(request)}`;
  const rules = [rateLimit.CONTACT_BURST, rateLimit.CONTACT_HOURLY];
  const localVerdict = rateLimit.check(requester, rules);
  const verdict = localVerdict.allowed
    ? await rateLimit.checkPersistent("contact", requester, rules)
    : localVerdict;
  if (!verdict.allowed) {
    return json(
      {
        success: false,
        code: "RATE_LIMITED",
        message: "Too many messages were sent from this connection. Please try again later.",
      },
      429,
      { "retry-after": String(verdict.retryAfterSeconds) },
    );
  }

  try {
    const raw = (await readJsonBody(request, 22 * 1024 * 1024)) as Record<string, unknown>;
    // Hidden field: real visitors never fill this. Pretend success so bots do
    // not learn which signal caught them.
    if (typeof raw.company === "string" && raw.company.trim()) return json({ success: true });
    const startedAt = Number(raw.startedAt);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt < 900) return json({ success: true });
    const message = contactMessageSchema.parse(raw);
    await sendContactMessage(message);
    return json({ success: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLarge();
    if (error instanceof SyntaxError || (error && typeof error === "object" && "issues" in error)) {
      return json(
        {
          success: false,
          code: "INVALID_MESSAGE",
          message: "Check the highlighted details and try again.",
        },
        400,
      );
    }
    if (isMissingEnvError(error)) return notConfigured(error);
    return serverError("send help request", error);
  }
}

function methodNotAllowed(allow: string): Response {
  return json({ success: false, code: "METHOD_NOT_ALLOWED", message: `Use ${allow}.` }, 405, {
    allow,
  });
}

/* ── POST /api/waitlist ──────────────────────────────────────────────────── */

/**
 * A form a human filled in takes longer than this to submit. Anything faster
 * is a script, and is treated the same way as a filled honeypot.
 */
const MIN_HUMAN_FILL_MS = 900;

async function postWaitlist(request: Request): Promise<Response> {
  const requester = rateLimit.identifyRequester(request);
  const verdict = rateLimit.check(requester, [rateLimit.SIGNUP_BURST, rateLimit.SIGNUP_HOURLY]);

  if (!verdict.allowed) {
    return json(
      {
        success: false,
        code: "RATE_LIMITED",
        message: "That's a lot of tries. Give it a minute and go again.",
      },
      429,
      { "retry-after": String(verdict.retryAfterSeconds) },
    );
  }

  let payload: unknown;
  try {
    payload = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLarge();
    return json({ success: false, code: "INVALID_PAYLOAD", message: "Send a JSON body." }, 400);
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  // Honeypot: a field no human ever sees, and no human ever fills. Bots that
  // auto-complete every input get a plausible success and no database row —
  // an error here just tells the author which field to skip next time.
  const honeypotTripped = typeof body.company === "string" && body.company.trim().length > 0;
  const elapsed = typeof body.elapsedMs === "number" ? body.elapsedMs : Number.POSITIVE_INFINITY;
  const tooFast = Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_HUMAN_FILL_MS;

  if (honeypotTripped || tooFast) {
    console.warn(`[waitlist] soft-rejected submission from ${requester}`, {
      honeypotTripped,
      elapsed,
    });
    return json({
      success: true,
      message: "You're on the waitlist!",
      referralCode: null,
      position: null,
    });
  }

  const validated = validateSignup(body);
  if (!validated.ok) {
    return json({ success: false, ...validated.error }, 400);
  }

  try {
    const { settings } = await getSettings();
    if (!settings.signupOpen)
      return json(
        { success: false, code: "WAITLIST_CLOSED", message: settings.closedMessage },
        403,
      );
    if (settings.requireName && !validated.value.name)
      return json(
        { success: false, code: "INVALID_PAYLOAD", message: "Please add your name." },
        400,
      );
    if (matchesBlockedDomain(validated.value.email, settings.blockedDomains))
      return json(
        {
          success: false,
          code: "DISPOSABLE_EMAIL",
          message:
            "Temporary email addresses aren't accepted. Please use a permanent email address.",
        },
        400,
      );
    if (
      validated.value.referredBy &&
      !(await resolveReferrer(validated.value.referredBy, validated.value.email))
    )
      return json(
        {
          success: false,
          code: "INVALID_REFERRAL",
          message: "That referral code was not found. Check the code or leave the field blank.",
        },
        400,
      );
    if (!body.challengeId && !body.otp) {
      const challengeId = await requestWaitlistCode(
        {
          ...validated.value,
          source: typeof body.source === "string" ? body.source.slice(0, 40) : "website",
        },
        requester,
      );
      if (!challengeId)
        return json(
          {
            success: false,
            code: "RATE_LIMITED",
            message:
              "Please wait at least a minute before requesting another code. You can request up to five per hour.",
          },
          429,
        );
      return json({
        success: true,
        code: "VERIFICATION_REQUIRED",
        challengeId,
        message:
          "We sent a six-digit verification code to your email. Please check your inbox and spam or junk folder. The code expires in 10 minutes.",
      });
    }
    if (
      typeof body.challengeId !== "string" ||
      !UUID_PATTERN.test(body.challengeId) ||
      typeof body.otp !== "string" ||
      !/^\d{6}$/.test(body.otp)
    ) {
      return json(
        {
          success: false,
          code: "INVALID_CODE",
          message: "Enter the six-digit code from your email.",
        },
        400,
      );
    }
    const outcome = await verifyWaitlistCode(body.challengeId, body.otp);
    if (!outcome)
      return json(
        {
          success: false,
          code: "INVALID_CODE",
          message:
            "That code is incorrect, expired or already used. After five incorrect attempts, request a new code.",
        },
        400,
      );
    invalidateWaitlistCount();

    if (outcome.duplicate) {
      return json(
        {
          success: false,
          code: "ALREADY_REGISTERED",
          message: "You're already on the waitlist.",
          referralCode: outcome.referralCode,
          position: outcome.position,
        },
        409,
      );
    }

    return json({
      success: true,
      message: settings.successMessage,
      referralCode: outcome.referralCode,
      position: outcome.position,
    });
  } catch (error) {
    if (isMissingEnvError(error)) return notConfigured(error);
    return serverError("createSignup failed", error);
  }
}

/* ── GET /api/waitlist/count ─────────────────────────────────────────────── */

async function getCount(request: Request): Promise<Response> {
  const verdict = rateLimit.check(rateLimit.identifyRequester(request), [rateLimit.READ_RULE]);
  if (!verdict.allowed) {
    return json({ success: false, code: "RATE_LIMITED", message: "Slow down." }, 429, {
      "retry-after": String(verdict.retryAfterSeconds),
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  try {
    const count = await getWaitlistCount();
    const normalisedCode = code?.toUpperCase();
    const [referrals, member] = normalisedCode
      ? await Promise.all([getReferralTally(normalisedCode), getReferralStatus(normalisedCode)])
      : [undefined, undefined];
    return json({
      success: true,
      count,
      referrals,
      active: member?.active,
      position: member?.position,
    });
  } catch (error) {
    if (isMissingEnvError(error)) return notConfigured(error);
    return serverError("getWaitlistCount failed", error);
  }
}

/* ── GET /api/admin/waitlist ─────────────────────────────────────────────── */

/**
 * Guarded by a single shared key in `WAITLIST_ADMIN_KEY`, compared in
 * constant time. If the variable is unset the route is off entirely rather
 * than open — an unset password must never mean "no password".
 */
function authoriseAdmin(request: Request): Response | null {
  const expected = readEnv("WAITLIST_ADMIN_KEY");
  if (!expected) {
    return json(
      {
        success: false,
        code: "ADMIN_DISABLED",
        message: "Admin export is disabled: WAITLIST_ADMIN_KEY is not set on the server.",
      },
      503,
    );
  }

  const header = request.headers.get("x-admin-key");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supplied = header ?? bearer ?? "";

  if (!safeEqual(supplied, expected)) {
    return json({ success: false, code: "UNAUTHORISED", message: "Wrong key." }, 401);
  }
  return null;
}

async function getAdminExport(request: Request, url: URL): Promise<Response> {
  const verdict = rateLimit.check(`admin:${rateLimit.identifyRequester(request)}`, [
    { limit: 30, windowMs: 60 * 1000 },
  ]);
  if (!verdict.allowed) {
    return json({ success: false, code: "RATE_LIMITED", message: "Slow down." }, 429);
  }

  const rejection = authoriseAdmin(request);
  if (rejection) return rejection;

  try {
    let filters;
    try {
      filters = parseFilters(url);
    } catch (error) {
      return json({ success: false, message: (error as Error).message }, 400);
    }
    const result = await querySignups(filters, url.searchParams.get("format") === "csv");
    const { rows } = result;

    if (url.searchParams.get("format") === "csv") {
      return new Response(toCsv(rows), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="marginalite-waitlist-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    return json({ success: true, ...result, summary: await getAdminSummary() });
  } catch (error) {
    if (isMissingEnvError(error)) return notConfigured(error);
    return serverError("listSignups failed", error);
  }
}

/**
 * DELETE /api/admin/waitlist  { id }
 *
 * Behind the same key as the export, and rate limited on the same bucket. The
 * id must be a UUID and nothing else — it is interpolated into a query, and
 * although supabase-js parameterises it, validating the shape here means a
 * malformed id is a 400 rather than a database round trip.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function deleteAdminRow(request: Request, url: URL): Promise<Response> {
  const verdict = rateLimit.check(`admin:${rateLimit.identifyRequester(request)}`, [
    { limit: 30, windowMs: 60 * 1000 },
  ]);
  if (!verdict.allowed) {
    return json({ success: false, code: "RATE_LIMITED", message: "Slow down." }, 429);
  }

  const rejection = authoriseAdmin(request);
  if (rejection) return rejection;

  let id: unknown;
  try {
    const body = (await readJsonBody(request, 16 * 1024)) as { id?: unknown };
    id = body?.id;
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLarge();
    id = url.searchParams.get("id");
  }

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return json({ success: false, code: "INVALID_ID", message: "Send the row's id." }, 400);
  }

  try {
    const removed = await deleteSignup(id);
    if (!removed) {
      return json(
        { success: false, code: "NOT_FOUND", message: "That person is not on the list." },
        404,
      );
    }
    return json({ success: true, message: "Removed from the waitlist." });
  } catch (error) {
    if (isMissingEnvError(error)) return notConfigured(error);
    return serverError("deleteSignup failed", error);
  }
}

const CSV_COLUMNS = [
  "created_at",
  "email",
  "name",
  "city",
  "country",
  "referral_code",
  "referred_by",
  "source",
  "status",
  "id",
] as const;

/**
 * RFC 4180 quoting, plus one extra: a leading =, +, - or @ is prefixed with a
 * single quote. Without that, a row whose name is `=HYPERLINK(...)` becomes a
 * live formula the moment the export is opened in Excel or Sheets.
 */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => csvCell(row[column])).join(","));
  }
  // Leading BOM so Excel opens UTF-8 names correctly rather than as mojibake.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function checkAdminAccess(request: Request): Response | null {
  const verdict = rateLimit.check(`admin:${rateLimit.identifyRequester(request)}`, [
    { limit: 60, windowMs: 60_000 },
  ]);
  if (!verdict.allowed)
    return json({ success: false, message: "Too many requests. Try again in a minute." }, 429);
  return authoriseAdmin(request);
}
async function adminSettings(request: Request): Promise<Response> {
  const rejection = checkAdminAccess(request);
  if (rejection) return rejection;
  try {
    if (request.method === "GET") return json({ success: true, ...(await getSettings()) });
    let settings;
    try {
      settings = validateSettings(await readJsonBody(request, 64 * 1024));
    } catch (error) {
      if (error instanceof PayloadTooLargeError) return payloadTooLarge();
      return json({ success: false, message: (error as Error).message }, 400);
    }
    const current = await getSettings();
    if (!current.ready)
      return json(
        {
          success: false,
          message: "Settings storage is not set up yet. Run the admin-settings migration first.",
        },
        503,
      );
    await saveSettings(settings);
    return json({ success: true, settings });
  } catch (error) {
    return serverError("admin settings", error);
  }
}
async function adminBulk(request: Request): Promise<Response> {
  const rejection = checkAdminAccess(request);
  if (rejection) return rejection;
  let body: unknown;
  try {
    body = await readJsonBody(request, 2 * 1024 * 1024);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLarge();
    return json({ success: false, message: "Send a JSON body." }, 400);
  }
  try {
    const changed = await bulkSignups(body);
    invalidateWaitlistCount();
    return json({ success: true, changed });
  } catch (error) {
    if (error instanceof TypeError) return json({ success: false, message: error.message }, 400);
    return serverError("bulk waitlist action", error);
  }
}




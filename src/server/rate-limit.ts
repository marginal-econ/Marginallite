/**
 * Best-effort abuse protection for the public endpoint.
 *
 * Honest about what this is: an in-memory fixed-window counter, held per
 * isolate. On Cloudflare that means a determined attacker spread across many
 * colos gets more than the nominal budget, and a cold isolate starts empty.
 * It is not a security boundary — it is the thing that stops one script, one
 * bored classmate, or one runaway retry loop from filling the table.
 *
 * The limits are set well above anything a real person does. A student
 * signing up, mistyping, and signing up again uses three of them.
 *
 * If the list ever needs a real limiter, the upgrade is a Cloudflare Rate
 * Limiting rule in front of `/api/waitlist`, or a Durable Object — both keep
 * this module's shape, so only `check()` changes.
 */

type Window = { count: number; resetAt: number };

const BUCKETS = new Map<string, Window>();

/** Hard cap on tracked keys, so a spray of forged IPs cannot grow the map without bound. */
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitRule = {
  /** Requests permitted inside one window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/*
 * Set for the audience, not for a benchmark. A whole class signing up together
 * in an IT lesson shares one school IP, and Indian mobile carriers put large
 * numbers of subscribers behind one CGNAT address — so a limit tuned to "one
 * person, one connection" would block exactly the moment this page is supposed
 * to work best. 25 in ten minutes is comfortably more than a full class, and
 * still two orders of magnitude below what a script would do.
 */
export const SIGNUP_BURST: RateLimitRule = { limit: 25, windowMs: 10 * 60 * 1000 };
export const SIGNUP_HOURLY: RateLimitRule = { limit: 80, windowMs: 60 * 60 * 1000 };
export const READ_RULE: RateLimitRule = { limit: 120, windowMs: 60 * 1000 };
export const CONTACT_BURST: RateLimitRule = { limit: 3, windowMs: 10 * 60 * 1000 };
export const CONTACT_HOURLY: RateLimitRule = { limit: 8, windowMs: 60 * 60 * 1000 };
export const PASSWORD_RESET_BURST: RateLimitRule = { limit: 3, windowMs: 10 * 60 * 1000 };
export const PASSWORD_RESET_HOURLY: RateLimitRule = { limit: 8, windowMs: 60 * 60 * 1000 };

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

function evictIfCrowded(now: number): void {
  if (BUCKETS.size < MAX_TRACKED_KEYS) return;
  for (const [key, window] of BUCKETS) {
    if (window.resetAt <= now) BUCKETS.delete(key);
  }
  // Still full of live windows? Drop the oldest insertions — Map preserves
  // insertion order, so the first entries are the least recently created.
  if (BUCKETS.size >= MAX_TRACKED_KEYS) {
    let toDrop = Math.ceil(MAX_TRACKED_KEYS / 10);
    for (const key of BUCKETS.keys()) {
      BUCKETS.delete(key);
      if (--toDrop <= 0) break;
    }
  }
}

export function check(identifier: string, rules: RateLimitRule[]): RateLimitResult {
  const now = Date.now();
  evictIfCrowded(now);

  // Every rule is evaluated before any is incremented, so a request rejected
  // by the hourly rule does not also burn a slot in the burst rule.
  const windows: Array<{ key: string; rule: RateLimitRule; window: Window }> = [];

  for (const rule of rules) {
    const key = `${identifier}:${rule.windowMs}`;
    const existing = BUCKETS.get(key);
    const window =
      existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + rule.windowMs };

    if (window.count >= rule.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
      };
    }
    windows.push({ key, rule, window });
  }

  for (const { key, window } of windows) {
    window.count += 1;
    BUCKETS.set(key, window);
  }
  return { allowed: true };
}

async function hashIdentifier(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * A database-backed limiter for actions that send email and therefore cost
 * money or can be used to harass an address. Unlike the isolate-local guard
 * above, this counter is shared by every Cloudflare location and cold start.
 */
export async function checkPersistent(
  namespace: string,
  identifier: string,
  rules: RateLimitRule[],
): Promise<RateLimitResult> {
  try {
    const { getSupabaseAdmin } = await import("./supabase");
    const client = getSupabaseAdmin();
    const requesterHash = await hashIdentifier(`${namespace}:${identifier}`);
    for (const rule of rules) {
      const { data, error } = await client.rpc("check_public_email_rate_limit", {
        p_bucket: `${namespace}:${rule.windowMs}`,
        p_requester_hash: requesterHash,
        p_limit: rule.limit,
        p_window_seconds: Math.ceil(rule.windowMs / 1000),
      });
      if (error) throw error;
      const result = data as unknown as { allowed?: boolean; retryAfterSeconds?: number } | null;
      if (result?.allowed === false) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Number(result.retryAfterSeconds) || 1),
        };
      }
    }
    return { allowed: true };
  } catch (error) {
    // The isolate-local limit has already run before this function. Preserve
    // availability during a transient database outage without silently
    // dropping all abuse protection.
    console.error("[rate-limit] persistent limiter unavailable", error);
    return { allowed: true };
  }
}

/**
 * The caller's identity, as well as it can be known behind a CDN.
 *
 * `cf-connecting-ip` is set by Cloudflare and cannot be spoofed by the client
 * when the Worker is the origin, which is why it is preferred over
 * `x-forwarded-for` (a client-supplied header anywhere else).
 */
export function identifyRequester(request: Request): string {
  const headers = request.headers;
  const candidate =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return candidate.slice(0, 64);
}

/**
 * Abuse rate limit guard for essay grading (quiet protection).
 * Throws a polite generic throttling error with no mention of tiers, plans, or credits.
 * Admins are completely exempt.
 */
export function checkUserEssayLimit(userId: string, isAdminUser?: boolean): void {
  if (isAdminUser) return;
  const rawLimit = typeof process !== "undefined" ? process.env["RATE_LIMIT_ESSAY_PER_HOUR"] : undefined;
  const limit = Number(rawLimit) || 30;
  const result = check(`user-essay:${userId}`, [{ limit, windowMs: 60 * 60 * 1000 }]);
  if (!result.allowed) {
    throw new Error("You're going fast. Try again in a few minutes.");
  }
}

/**
 * Abuse rate limit guard for vision OCR (quiet protection).
 * Throws a polite generic throttling error with no mention of tiers, plans, or credits.
 * Admins are completely exempt.
 */
export function checkUserVisionLimit(userId: string, isAdminUser?: boolean): void {
  if (isAdminUser) return;
  const rawLimit = typeof process !== "undefined" ? process.env["RATE_LIMIT_VISION_PER_HOUR"] : undefined;
  const limit = Number(rawLimit) || 60;
  const result = check(`user-vision:${userId}`, [{ limit, windowMs: 60 * 60 * 1000 }]);
  if (!result.allowed) {
    throw new Error("You're going fast. Try again in a few minutes.");
  }
}

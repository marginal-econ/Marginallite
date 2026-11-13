/**
 * The browser's half of the waitlist.
 *
 * It knows one URL — `/api/waitlist` on this same origin — and nothing about
 * Supabase. No key, no project URL, no table name is present in any module
 * the browser loads; the secret lives only in `src/server/`.
 */

export type WaitlistState =
  | "idle"
  | "loading"
  | "verification-required"
  | "success"
  | "already-registered"
  | "invalid-email"
  | "rate-limited"
  | "error";

export type WaitlistResult = {
  state: WaitlistState;
  message: string;
  referralCode?: string | null;
  position?: number | null;
  challengeId?: string;
};

type ApiResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  referralCode?: string | null;
  position?: number | null;
  challengeId?: string;
};

const REFERRAL_STORAGE_KEY = "marginalite-waitlist-ref";
const SELF_STORAGE_KEY = "marginalite-waitlist-self";

/**
 * Reads `?ref=CODE` off the URL and remembers it.
 *
 * Persisted because the referred visitor almost never signs up on the click
 * that brought them: they read the page, open the FAQ, come back tomorrow.
 * If the code only lived in the query string, the referrer would lose credit
 * for the visit they earned. The URL is then cleaned so the code does not get
 * copied onward into someone else's share.
 */
export function captureReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("ref");

    if (fromUrl && /^[A-Za-z0-9]{4,16}$/.test(fromUrl)) {
      const code = fromUrl.toUpperCase();
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);

      params.delete("ref");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
      return code;
    }

    return window.localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Private browsing, or storage disabled. The signup still works; the
    // referral is simply not remembered across the visit.
    return null;
  }
}

/** Remembers this visitor's own signup, so a return visit skips the form. */
export function rememberOwnSignup(result: WaitlistResult): void {
  if (typeof window === "undefined" || !result.referralCode) return;
  try {
    window.localStorage.setItem(
      SELF_STORAGE_KEY,
      JSON.stringify({ referralCode: result.referralCode, position: result.position ?? null }),
    );
  } catch {
    /* not fatal */
  }
}

export function readOwnSignup(): { referralCode: string; position: number | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SELF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { referralCode?: unknown; position?: unknown };
    if (typeof parsed.referralCode !== "string") return null;
    return {
      referralCode: parsed.referralCode,
      position: typeof parsed.position === "number" ? parsed.position : null,
    };
  } catch {
    return null;
  }
}

export function forgetOwnSignup(): void {
  try {
    window.localStorage.removeItem(SELF_STORAGE_KEY);
  } catch {
    /* not fatal */
  }
}

/** Client-side shape check, for instant feedback only. The server decides. */
export function looksLikeEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  return /^[^\s@,;:<>()[\]\\"]+@[^\s@.,;:<>()[\]\\"]+(\.[^\s@.,;:<>()[\]\\"]+)+$/.test(email);
}

export async function joinWaitlist(input: {
  email: string;
  name?: string;
  city: string;
  country: string;
  referredBy?: string | null;
  /** Honeypot. Always empty for a human. */
  company?: string;
  /** Milliseconds between the form appearing and this submission. */
  elapsedMs?: number;
  challengeId?: string;
  otp?: string;
  signal?: AbortSignal;
}): Promise<WaitlistResult> {
  let response: Response;

  try {
    response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        name: input.name ?? null,
        city: input.city,
        country: input.country,
        referredBy: input.referredBy ?? null,
        company: input.company ?? "",
        elapsedMs: input.elapsedMs ?? null,
        source: "website",
        challengeId: input.challengeId,
        otp: input.otp,
      }),
      signal: input.signal,
    });
  } catch {
    // Offline, DNS failure, or the request was aborted.
    return {
      state: "error",
      message: "Couldn't reach the server. Check your connection and try again.",
    };
  }

  let payload: ApiResponse = {};
  try {
    payload = (await response.json()) as ApiResponse;
  } catch {
    /* fall through to the status-based branches below */
  }

  if (response.ok && payload.success && payload.code === "VERIFICATION_REQUIRED") {
    return {
      state: "verification-required",
      message: payload.message ?? "Enter the code sent to your email.",
      challengeId: payload.challengeId,
    };
  }

  if (response.ok && payload.success) {
    return {
      state: "success",
      message: payload.message ?? "You're on the waitlist!",
      referralCode: payload.referralCode ?? null,
      position: payload.position ?? null,
    };
  }

  switch (payload.code ?? String(response.status)) {
    case "ALREADY_REGISTERED":
      return {
        state: "already-registered",
        message: payload.message ?? "You're already on the waitlist.",
        referralCode: payload.referralCode ?? null,
        position: payload.position ?? null,
      };
    case "WAITLIST_CLOSED":
      return {
        state: "error",
        message: payload.message ?? "Signups are paused. Please check back soon.",
      };
    case "DISPOSABLE_EMAIL":
    case "INVALID_EMAIL":
    case "INVALID_PAYLOAD":
      return {
        state: "invalid-email",
        message: payload.message ?? "That email doesn't look right.",
      };
    case "INVALID_CODE":
      return { state: "error", message: payload.message ?? "That code is not valid." };
    case "RATE_LIMITED":
      return {
        state: "rate-limited",
        message: payload.message ?? "Too many tries. Give it a minute.",
      };
    default:
      return {
        state: "error",
        message: payload.message ?? "Something went wrong on our end. Try again in a moment.",
      };
  }
}

export type WaitlistStats = {
  count: number;
  referrals?: number;
  active?: boolean;
  position?: number | null;
};

/** The live counter. Failure is silent — it is decoration, not content. */
export async function fetchWaitlistStats(code?: string | null): Promise<WaitlistStats | null> {
  try {
    const query = code ? `?code=${encodeURIComponent(code)}` : "";
    const response = await fetch(`/api/waitlist/count${query}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      count?: number;
      referrals?: number;
      active?: boolean;
      position?: number | null;
    };
    if (typeof payload.count !== "number") return null;
    return {
      count: payload.count,
      referrals: payload.referrals,
      active: payload.active,
      position: payload.position,
    };
  } catch {
    return null;
  }
}

/** The link a member shares. Absolute, because it is going into a message. */
export function shareUrlFor(code: string): string {
  const origin = typeof window === "undefined" ? "https://marginalite.app" : window.location.origin;
  return `${origin}/?ref=${code}`;
}

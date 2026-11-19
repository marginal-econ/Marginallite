/**
 * Centralized authorization rules for Marginalite administrator privileges.
 * marginal.econ.ai@gmail.com is the ONE and ONLY administrator of the platform.
 */

export const MARGINAL_ADMIN_USER_ID = "b22b0880-7903-4504-b12c-bfb955b1024b";
export const MARGINAL_ADMIN_EMAIL = "marginal.econ.ai@gmail.com";

export const AUTHORIZED_ADMIN_IDS = new Set([
  "b22b0880-7903-4504-b12c-bfb955b1024b", // marginal.econ.ai@gmail.com (Marginalite Supabase)
  "00296414-0221-4d5b-aa1c-04dc9366a218", // marginal.econ.ai@gmail.com (Marginal legacy)
]);

export const AUTHORIZED_ADMIN_EMAILS = new Set([
  "marginal.econ.ai@gmail.com", // Marginalite ONLY
]);

export function getAdminEmails(): Set<string> {
  const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
  let raw = "";

  if (typeof process !== "undefined" && process.env?.["ADMIN_EMAILS"]) {
    raw = process.env["ADMIN_EMAILS"];
  } else if (typeof process !== "undefined" && process.env?.["VITE_ADMIN_EMAILS"]) {
    raw = process.env["VITE_ADMIN_EMAILS"];
  } else if (metaEnv?.["VITE_ADMIN_EMAILS"]) {
    raw = metaEnv["VITE_ADMIN_EMAILS"];
  } else if (metaEnv?.["ADMIN_EMAILS"]) {
    raw = metaEnv["ADMIN_EMAILS"];
  } else if (typeof globalThis !== "undefined" && (globalThis as any).__env__?.ADMIN_EMAILS) {
    raw = (globalThis as any).__env__.ADMIN_EMAILS;
  }

  const set = new Set(
    raw
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0),
  );

  // Platform superadmin is always an admin
  set.add("marginal.econ.ai@gmail.com");

  return set;
}

export function isAdmin(
  opts?:
    | {
        userId?: string | null;
        email?: string | null;
        role?: string | null;
        claims?: any;
      }
    | string
    | null,
): boolean {
  if (!opts) return false;

  const adminEmails = getAdminEmails();

  if (typeof opts === "string") {
    const trimmed = opts.trim();
    if (AUTHORIZED_ADMIN_IDS.has(trimmed)) {
      return true;
    }
    const lower = trimmed.toLowerCase();
    if (AUTHORIZED_ADMIN_EMAILS.has(lower) || adminEmails.has(lower)) {
      return true;
    }
    return false;
  }

  // Check user ID directly
  const candidateId = opts.userId || opts.claims?.sub || opts.claims?.user?.id;
  if (candidateId && AUTHORIZED_ADMIN_IDS.has(candidateId)) {
    return true;
  }

  // Check role claim if explicitly provided
  if (
    opts.role === "admin" ||
    opts.claims?.role === "admin" ||
    opts.claims?.app_metadata?.role === "admin" ||
    opts.claims?.user_metadata?.role === "admin" ||
    opts.claims?.user?.app_metadata?.role === "admin" ||
    opts.claims?.user?.user_metadata?.role === "admin"
  ) {
    return true;
  }

  const candidateEmail = (
    opts.email ||
    opts.claims?.email ||
    opts.claims?.user_metadata?.email ||
    opts.claims?.app_metadata?.email ||
    opts.claims?.user?.email ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (
    candidateEmail &&
    (adminEmails.has(candidateEmail) || AUTHORIZED_ADMIN_EMAILS.has(candidateEmail))
  ) {
    return true;
  }

  return false;
}

// Backwards-compatible aliases
export const isMarginalAdmin = isAdmin;
export const isMarginaliteAdmin = isAdmin;
export const isUserAdmin = (
  opts?:
    | {
        userId?: string | null;
        email?: string | null;
        claims?: any;
      }
    | string
    | null,
): boolean => {
  if (!opts) return false;
  if (typeof opts === "string") {
    return isAdmin({ userId: opts });
  }
  return isAdmin(opts);
};

export function assertAdmin(context: {
  userId?: string | null;
  claims?: any;
  email?: string | null;
  user?: any;
}): void {
  const isMarginal = isAdmin({
    userId: context?.userId ?? context?.user?.id,
    claims: context?.claims,
    email: context?.email ?? context?.user?.email,
  });

  if (isMarginal) {
    return;
  }

  throw new Error("Admin access is restricted. Marginalite is the sole administrator of this platform.");
}


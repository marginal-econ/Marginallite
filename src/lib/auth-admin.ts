/**
 * Centralized authorization rules for Marginalite administrator privileges.
 * Admin identity is configured via ADMIN_EMAILS (comma-separated) and/or user_roles.
 */

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
    const trimmed = opts.trim().toLowerCase();
    if (adminEmails.has(trimmed)) {
      return true;
    }
    return false;
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

  if (candidateEmail && adminEmails.has(candidateEmail)) {
    return true;
  }

  return false;
}

// Backwards-compatible aliases
export const isMarginalAdmin = isAdmin;
export const isMarginaliteAdmin = isAdmin;
export const MARGINAL_ADMIN_USER_ID = "";
export const MARGINAL_ADMIN_EMAIL = "marginal.econ.ai@gmail.com";
export const isUserAdmin = (userId?: string | null) => isAdmin({ userId });

export function assertAdmin(context: {
  userId?: string | null;
  claims?: any;
  email?: string | null;
}): void {
  if (!isAdmin(context)) {
    throw new Error("Forbidden: Administrator access required.");
  }
}


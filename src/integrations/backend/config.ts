// Self-hosted backend configuration.
// Reads from env vars (set these in .env / your host's dashboard) so the
// project can be pointed at a brand new Supabase project without touching
// code. The URL and publishable key are public by design, but still belong in
// environment configuration so a repository never silently points at a real
// project.
const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
export const BACKEND_URL =
  metaEnv?.["VITE_BACKEND_URL"] ||
  (typeof process !== "undefined" ? process.env["BACKEND_URL"] || process.env["VITE_BACKEND_URL"] : undefined) ||
  "";
export const BACKEND_PUBLISHABLE_KEY =
  metaEnv?.["VITE_BACKEND_PUBLISHABLE_KEY"] ||
  (typeof process !== "undefined" ? process.env["BACKEND_PUBLISHABLE_KEY"] || process.env["VITE_BACKEND_PUBLISHABLE_KEY"] : undefined) ||
  "";

export function requireBackendConfig(): void {
  if (!BACKEND_URL || !BACKEND_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing VITE_BACKEND_URL or VITE_BACKEND_PUBLISHABLE_KEY. Configure the Supabase project before using authenticated features.",
    );
  }
}

function isNewApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** New-format `sb_` keys are opaque strings, not bearer JWTs. */
export function createBackendFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewApiKey(apiKey) && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * The one place a Supabase client is ever constructed — server only.
 *
 * It is built with the *secret* key, which bypasses Row Level Security. That
 * is deliberate and is exactly why this module must never be reachable from a
 * component: every write to `public.waitlist` goes through the endpoint in
 * `src/server/api.ts`, and RLS stays on with no public policy, so the browser
 * has no path to the table at all.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readEnv } from "./env";

let cached: { key: string; client: SupabaseClient } | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  const url =
    readEnv("BACKEND_URL") ??
    readEnv("SUPABASE_URL") ??
    readEnv("VITE_BACKEND_URL") ??
    (typeof process !== "undefined" ? process.env["BACKEND_URL"] || process.env["SUPABASE_URL"] : undefined);

  const secretKey =
    readEnv("BACKEND_SERVICE_ROLE_KEY") ??
    readEnv("SUPABASE_SECRET_KEY") ??
    (typeof process !== "undefined" ? process.env["BACKEND_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] : undefined);

  if (!url || !secretKey) {
    throw new Error("Missing Supabase admin URL or secret key in environment.");
  }

  // Cached across requests in the same isolate, but keyed on the credentials
  // so a rotated secret is picked up without a redeploy of this module.
  if (cached && cached.key === `${url}::${secretKey}`) return cached.client;

  const client = createClient(url, secretKey, {
    auth: {
      // No user sessions exist here — this is a public waitlist, not an app
      // with accounts. Leaving these on makes the client try to persist and
      // refresh tokens that will never exist.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "marginalite-waitlist" },
    },
  });

  cached = { key: `${url}::${secretKey}`, client };
  return client;
}

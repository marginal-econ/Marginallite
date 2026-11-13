// Server-only admin client for the self-hosted backend. Bypasses RLS.
// Load it inside handlers: await import("@/integrations/backend/client.server")
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/backend/types";
import { readEnv } from "@/server/env";
import { BACKEND_URL, createBackendFetch } from "./config";

function createAdminClient() {
  const url =
    readEnv("BACKEND_URL") ||
    readEnv("SUPABASE_URL") ||
    readEnv("VITE_BACKEND_URL") ||
    BACKEND_URL;

  const key =
    readEnv("BACKEND_SERVICE_ROLE_KEY") ||
    readEnv("SUPABASE_SECRET_KEY") ||
    (typeof process !== "undefined" ? process.env["BACKEND_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] : undefined);

  if (!url || !key) {
    throw new Error("Missing BACKEND_URL or BACKEND_SERVICE_ROLE_KEY for server admin client.");
  }

  return createClient<Database>(url, key, {
    global: { fetch: createBackendFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _admin: ReturnType<typeof createAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_, prop, receiver) {
    if (!_admin) _admin = createAdminClient();
    return Reflect.get(_admin, prop, receiver);
  },
});

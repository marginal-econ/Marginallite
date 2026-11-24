/**
 * The one place a Supabase client is ever constructed — server only.
 *
 * It is built with the *secret* key, which bypasses Row Level Security. That
 * is deliberate and is exactly why this module must never be reachable from a
 * component: every write to `public.waitlist` goes through the endpoint in
 * `src/server/api.ts`, and RLS stays on with no public policy, so the browser
 * has no path to the table at all.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/backend/client.server";

export function getSupabaseAdmin(): SupabaseClient {
  return supabaseAdmin as unknown as SupabaseClient;
}

/**
 * Everything that touches `public.waitlist`.
 *
 * All database access for the waitlist lives here. The HTTP layer in
 * `api.ts` shapes requests and responses; it never builds a query, and no
 * component anywhere imports this file.
 */

import { getSupabaseAdmin } from "./supabase";
import { generateReferralCode } from "./referral";
import type { NormalisedSignup } from "./validation";

const TABLE = "waitlist";

/** Postgres unique-violation. The last line of defence against a duplicate. */
const UNIQUE_VIOLATION = "23505";

export type WaitlistRow = {
  id: string;
  name: string | null;
  city: string | null;
  country: string | null;
  email: string;
  referral_code: string;
  referred_by: string | null;
  source: string;
  status: string;
  created_at: string;
};

export type SignupOutcome =
  | { kind: "created"; referralCode: string; position: number | null }
  | { kind: "duplicate"; referralCode: string | null; position: number | null };

/**
 * Adds someone to the list, or reports that they are already on it.
 *
 * Duplicates are handled twice over: a lookup first (which is what produces
 * the friendly "you're already on the list" path and returns their existing
 * code), and a caught unique violation second (which closes the race between
 * two simultaneous submissions of the same address). The second only works if
 * the unique index from `supabase/waitlist.sql` has been applied — see the
 * README.
 */
export async function createSignup(
  input: NormalisedSignup,
  options: { source?: string } = {},
): Promise<SignupOutcome> {
  const supabase = getSupabaseAdmin();

  const existing = await supabase
    .from(TABLE)
    .select("referral_code, created_at")
    .eq("email", input.email)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    const row = existing.data as Pick<WaitlistRow, "referral_code" | "created_at">;
    return {
      kind: "duplicate",
      referralCode: row.referral_code ?? null,
      position: await positionOf(row.referral_code, row.created_at),
    };
  }

  // Self-referral is meaningless and is the first thing anyone tries. A code
  // that does not exist is dropped rather than stored, so `referred_by`
  // always points at a real row or at nothing.
  const referredBy = await resolveReferrer(input.referredBy, input.email);

  // Collisions are astronomically unlikely at 31^7, but `referral_code` is
  // UNIQUE, so a retry is cheaper than an incident.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();

    const inserted = await supabase
      .from(TABLE)
      .insert({
        email: input.email,
        name: input.name,
        city: input.city,
        country: input.country,
        referral_code: referralCode,
        referred_by: referredBy,
        source: options.source ?? "website",
        status: "waiting",
      })
      .select("referral_code, created_at")
      .single();

    if (!inserted.error) {
      const row = inserted.data as Pick<WaitlistRow, "referral_code" | "created_at">;
      return {
        kind: "created",
        referralCode: row.referral_code,
        position: await positionOf(row.referral_code, row.created_at),
      };
    }

    if (inserted.error.code !== UNIQUE_VIOLATION) throw inserted.error;

    // A unique violation is either the referral code (retry with a new one)
    // or the email (someone beat us to it between the lookup and the insert).
    const raced = await supabase
      .from(TABLE)
      .select("referral_code, created_at")
      .eq("email", input.email)
      .limit(1)
      .maybeSingle();

    if (raced.data) {
      const row = raced.data as Pick<WaitlistRow, "referral_code" | "created_at">;
      return {
        kind: "duplicate",
        referralCode: row.referral_code ?? null,
        position: await positionOf(row.referral_code, row.created_at),
      };
    }
  }

  throw new Error("Could not allocate a unique referral code after 5 attempts.");
}

/**
 * Queue order rewards real referrals first, then preserves first-come order
 * between people with the same referral total. This makes the promise that a
 * friend joining "moves you up" true in the number shown to the member.
 */
async function positionOf(referralCode: string, createdAt: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .select("referral_code, referred_by, created_at")
    .order("created_at", { ascending: true })
    .limit(10_000);

  if (error || !data) return null;
  const tallies = new Map<string, number>();
  for (const row of data) {
    if (row.referred_by) tallies.set(row.referred_by, (tallies.get(row.referred_by) ?? 0) + 1);
  }
  const ordered = [...data].sort((left, right) => {
    const referralDifference =
      (tallies.get(right.referral_code) ?? 0) - (tallies.get(left.referral_code) ?? 0);
    if (referralDifference !== 0) return referralDifference;
    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  });
  const index = ordered.findIndex(
    (row) => row.referral_code === referralCode && row.created_at === createdAt,
  );
  return index < 0 ? null : index + 1;
}

/** Returns the code only if it belongs to a real, different person. */
export async function resolveReferrer(code: string | null, email: string): Promise<string | null> {
  if (!code) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .select("email")
    .eq("referral_code", code)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if ((data as { email: string }).email === email) return null;
  return code;
}

/**
 * Total signups, cached briefly.
 *
 * The counter is decoration on a landing page, not a ledger: serving a number
 * up to 30 seconds stale is a fair trade for not hitting Postgres once per
 * page view.
 */
let countCache: { value: number; expiresAt: number } | undefined;

export async function getWaitlistCount(): Promise<number> {
  const now = Date.now();
  if (countCache && countCache.expiresAt > now) return countCache.value;

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (error) throw error;

  const value = count ?? 0;
  countCache = { value, expiresAt: now + 30_000 };
  return value;
}

/** How many people a given code has brought in. Powers the share card. */
export async function getReferralTally(code: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("referred_by", code);

  if (error) return 0;
  return count ?? 0;
}

/** Validates a referral code saved in a visitor's browser and refreshes its
 * queue position. This prevents local storage from claiming someone is still
 * on the list after an admin has removed their database row. */
export async function getReferralStatus(
  code: string,
): Promise<{ active: boolean; position: number | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .select("created_at")
    .eq("referral_code", code)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { active: false, position: null };
  return { active: true, position: await positionOf(code, data.created_at) };
}

/**
 * Removes one person from the list — admin only.
 *
 * A hard delete, not a status flag. Someone asking to be taken off a waitlist
 * is asking for their email to be gone, and "deleted: true" in a row that
 * still holds their address does not honour that.
 *
 * Their referral code goes with them. Rows they referred keep the code in
 * `referred_by` as a dangling string, which is deliberate: it preserves the
 * fact that those signups came from somewhere, and nothing reads that column
 * expecting a live row.
 *
 * Returns false when no row matched, so the caller can answer 404 rather than
 * pretend a delete happened.
 */
export async function deleteSignup(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id");

  if (error) throw error;

  // The cached total is now wrong by one, and a stale counter on the landing
  // page is a worse look than one extra query.
  countCache = undefined;

  return (data ?? []).length > 0;
}

/** Every row, oldest first — admin export only. */
export async function listSignups(limit = 5000): Promise<WaitlistRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, name, email, city, country, referral_code, referred_by, source, status, created_at",
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WaitlistRow[];
}

export function invalidateWaitlistCount(): void {
  countCache = undefined;
}

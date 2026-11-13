-- ─────────────────────────────────────────────────────────────────────────────
-- public.waitlist
--
-- Run this in the Supabase SQL editor. It is written to be safe on a table
-- that already exists: every statement is IF NOT EXISTS or ADD COLUMN IF NOT
-- EXISTS, so running it against your current table adds only what is missing
-- and changes nothing that is already right.
--
-- Two of these are not optional if you want the duplicate handling in
-- `src/server/waitlist.ts` to hold under load:
--
--   * the UNIQUE index on lower(email) — without it, two people submitting the
--     same address in the same second both get inserted, because the
--     application-level "does this email exist" check has no way to be atomic;
--   * RLS enabled with NO public policy — that is what makes the table
--     unreachable from the browser. The server uses the secret key, which
--     bypasses RLS; anonymous callers get nothing.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  email         text not null,
  referral_code text unique,
  referred_by   text,
  source        text        not null default 'website',
  status        text        not null default 'waiting',
  created_at    timestamptz not null default now()
);

-- Additive, for a table created earlier without one of these.
alter table public.waitlist add column if not exists name text;
alter table public.waitlist add column if not exists referred_by text;
alter table public.waitlist add column if not exists source text not null default 'website';
alter table public.waitlist add column if not exists status text not null default 'waiting';

-- One row per address, case-insensitively. The server already lowercases
-- every email before it writes, so this is the guard against the race rather
-- than a substitute for normalisation.
create unique index if not exists waitlist_email_unique_idx
  on public.waitlist (lower(email));

-- Referral codes are unique and are looked up on every referred signup.
create unique index if not exists waitlist_referral_code_unique_idx
  on public.waitlist (referral_code)
  where referral_code is not null;

-- Counting "how many people joined before me" orders by created_at.
create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at);

-- Counting a member's referrals filters on referred_by.
create index if not exists waitlist_referred_by_idx
  on public.waitlist (referred_by)
  where referred_by is not null;

-- ── Row Level Security ───────────────────────────────────────────────────────
-- On, with no policy for anon or authenticated. That combination means: no
-- browser can read this table, and no browser can write to it. Every signup
-- goes through POST /api/waitlist, which runs on the server with the secret
-- key. Do not add a permissive insert policy "so the form works" — the form
-- already works, and such a policy would let anyone enumerate or spam the
-- table directly from the console.
alter table public.waitlist enable row level security;

-- Optional belt-and-braces: revoke the API roles' table grants outright, so
-- even a policy added by accident later cannot expose the data.
revoke all on public.waitlist from anon, authenticated;

-- ── Handy queries ────────────────────────────────────────────────────────────
-- Everyone, in queue order:
--   select row_number() over (order by created_at) as position, created_at, email, name, referral_code, referred_by
--   from public.waitlist order by created_at;
--
-- The best referrers:
--   select referred_by as code, count(*) as brought_in
--   from public.waitlist where referred_by is not null
--   group by referred_by order by brought_in desc;
--
-- Signups per day:
--   select date_trunc('day', created_at) as day, count(*)
--   from public.waitlist group by 1 order by 1 desc;

-- Run once in Supabase SQL Editor before using the new admin settings.
-- This migration does not modify existing waitlist entries.
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select, insert, update on public.site_settings to service_role;

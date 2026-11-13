# Marginalite: Supabase Database Setup & Configuration

This guide details setting up a brand-new Supabase project for **Marginalite (Cambridge IGCSE Economics 0455)**.

> **CRITICAL SECURITY NOTE:**
> Never copy or reuse project references, JWT keys, or URLs from upstream Marginal. Always generate a fresh Supabase project. Keep `BACKEND_SERVICE_ROLE_KEY` strictly on the server or in `wrangler secret put`, never behind a `VITE_` prefix or in client bundles.

---

## 1. Project Initialization

1. Create a brand-new project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Note your **Project URL**, **Anon / Publishable Key**, and **Service Role Key** under **Project Settings → API**.
3. Enable the **Vector** (`pgvector`) extension under **Database → Extensions**.

---

## 2. Apply the Baseline Migration

The single canonical migration `supabase/migrations/20261024000000_marginalite_baseline.sql` initializes:
- All extensions (`pgcrypto`, `vector`, `uuid-ossp`)
- Core schemas and enums (`app_role`, `doc_type`, `assessment_era`, `marking_mode`)
- Knowledge base and chunk storage (`embedding vector(2048)`) with halfvec HNSW index
- Paper 1 MCQ timed exam engine with server deadline validation
- Paper 2 Structured question banks with mark schemes and level descriptors
- Classrooms and teacher dashboards
- Admin AI key pool and usage logging
- Ingestion runs and review queue
- Private storage buckets (`igcse-papers`, `uploads`) and public bucket (`bank-diagrams`)
- Strict Row Level Security (RLS) on all tables

### Link and push via Supabase CLI:

```bash
# Log in to Supabase CLI
npx supabase login

# Link your fresh project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the canonical baseline migration
npx supabase db push
```

Alternatively, copy the contents of `supabase/migrations/20261024000000_marginalite_baseline.sql` directly into the Supabase SQL Editor and execute.

---

## 3. Storage Buckets Verification

Under **Storage → Buckets**, verify:
1. `igcse-papers`: **Private** (stores official past papers, served only to authenticated students/teachers)
2. `uploads`: **Private** (stores student handwriting OCR uploads, scoped to `auth.uid()`)
3. `bank-diagrams`: **Public** (stores syllabus diagram assets)

---

## 4. Bootstrapping the First Administrator

Marginalite resolves administrative privileges dynamically using:
1. The `ADMIN_EMAILS` environment variable (comma-separated list of admin emails).
2. The `user_roles` database table.

To grant persistent admin role in the database:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('marginal.econ.ai@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 5. Seed Syllabus Definitions

Populate the 0455 syllabus definitions using the automated sync tool:

```bash
npm run harvest:papers -- --from-dir docs/source --dry-run
```

Verify that all tables and queries load correctly on the `/admin` dashboard.

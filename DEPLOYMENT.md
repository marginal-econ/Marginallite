# Marginalite: Production Deployment Guide

Marginalite builds as a Cloudflare Workers full-stack application via TanStack Start and Nitro.

---

## 1. Prerequisites & Environment Secrets

### Never Commit Secrets
Secrets must **never** be placed in `wrangler.jsonc` or prefixed with `VITE_`.
Configure production secrets using `wrangler secret put`:

```bash
# Supabase Backend Service Role (Server-only, NEVER VITE_ prefixed)
npx wrangler secret put BACKEND_SERVICE_ROLE_KEY

# Administrative identities (comma-separated list of approved emails)
npx wrangler secret put ADMIN_EMAILS

# Email Delivery (Mailjet)
npx wrangler secret put MAILJET_API_KEY
npx wrangler secret put MAILJET_SECRET_KEY

# AI Gateway / Provider Keys (or configure via /admin pool)
npx wrangler secret put GOOGLE_AI_KEY
npx wrangler secret put OPENAI_API_KEY
```

Public variables are configured under `vars` in `wrangler.jsonc` or deployed via CI environment:
- `VITE_BACKEND_URL`: Public Supabase Project URL (`https://xyz.supabase.co`)
- `VITE_BACKEND_PUBLISHABLE_KEY`: Public Supabase Anon / Publishable Key
- `PUBLIC_SITE_URL`: Production application URL (`https://marginalite.marginal-econ.workers.dev` or custom domain `https://marginalite.org`)

---

## 2. Pre-Deployment Verification

Execute the full verification gauntlet before deploying:

```bash
# Verify type safety
npx tsc --noEmit

# Verify code style and linting
npm run lint

# Run all test suites
npm test

# Run full repository cleanliness and security verification
npm run verify
```

---

## 3. Production Build & Deployment

```bash
# 1. Build the production application (Nitro bundles output to .output/)
npm run build

# 2. Test Cloudflare Worker bundle without publishing (dry run)
npx wrangler deploy --dry-run

# 3. Deploy to Cloudflare Workers
npx wrangler deploy
```

---

## 4. Post-Deployment Verification Checklist

1. **Authentication**: Test student and teacher signup / login. Ensure confirmation emails route to the production domain.
2. **Access Control**: Confirm a standard student account cannot access `/admin` or invoke admin RPCs.
3. **Paper Practice**: Complete a 30-question Paper 1 attempt and confirm server-authoritative timer submission.
4. **Essay Marking**: Submit a Paper 2 response and confirm two-pass examiner marking executes with official 0455 tariffs.
5. **Rate Limiting**: Confirm rate limits throttle gracefully without displaying paywall or plan upgrade prompts.

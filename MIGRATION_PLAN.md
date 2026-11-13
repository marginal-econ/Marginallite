# Marginalite Migration & Syllabus Re-targeting Plan

## Objectives

- Re-target Cambridge Economics assessment platform from legacy syllabus to Cambridge IGCSE Economics (0455).
- Complete excision of Live Examiner, pricing plans, subscription tiers, coupons, checkout routes, and payment gateways.
- Overhaul visual theme from purple to high-contrast WCAG 2.1 AA pink.
- Clean database migrations into a single canonical baseline (`supabase/migrations/20261024000000_marginalite_baseline.sql`).
- Implement server-authoritative MCQ timing and past paper auto-ingestion.

## Completed Milestones

1. **Security Isolation**: Purged upstream JWT leaks and hardcoded credentials. Configured environment-driven secrets.
2. **Feature Excision**: Deleted Live Examiner routes and components. Removed all billing, pricing, and locks.
3. **Assessment Engine Re-calibration**: Re-targeted examiner marking to 0455 Paper 2 tariffs (2m, 4m, 6m, 8m).
4. **Theme Overhaul**: Pink OKLCH palette achieving 100% WCAG 2.1 AA contrast compliance.
5. **Database Baseline**: Single canonical migration with full RLS, pgvector HNSW indexing, and storage buckets.
6. **Automated Verification**: End-to-end verification gauntlet via `npm run verify`.

# Architecture

Marginalite is a Cambridge IGCSE Economics (0455) application built on TanStack Start using React 19, TypeScript, Vite, Tailwind CSS, React Query, Supabase, and Nitro on Cloudflare Workers.

## Application layers

- `src/routes/index.tsx` and `src/components/marketing/`: public Marginalite experience and waitlist conversion flow.
- `src/routes/auth.tsx`: student authentication, account recovery, capacity checks, and waitlist fallback.
- `src/routes/_authenticated/`: student learning tools and administrator screens.
- `src/components/app/`: shared application shell and assessment interfaces.
- `src/lib/*.functions.ts`: authenticated server functions and product workflows.
- `src/lib/*/*.server.ts`: AI, OCR, extraction, retrieval, and grading implementation that must remain server-only.
- `src/integrations/backend/`: browser and server Supabase clients plus auth middleware.
- `src/server/`: public waitlist/settings endpoints using server-only credentials.
- `supabase/migrations/`: schema, indexes, functions, RLS, storage rules, and access-control changes.

Public waitlist requests are handled first by `src/server.ts`. Other requests flow through TanStack Start. Authenticated server functions receive the browser's bearer token and execute against Supabase with the caller's RLS context. Administrative operations explicitly verify the admin role; the service-role client is loaded only inside server handlers.

The grading pipeline retrieves relevant Cambridge 0455 syllabus knowledge, creates a structured examiner result calibrated to 0455 Paper 2 tariffs (2m, 4m, 6m, 8m), and runs a verification audit pass. AI provider credentials stay in the database or deployment secrets and are never returned to the browser unmasked.

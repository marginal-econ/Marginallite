# Vision + MCQ rebuild — what changed

## 1. New "Vision" key purpose (Admin console)

`ai_provider_keys.purpose` now has a third value, `'vision'`, alongside the
existing `'chat'` and `'embedding'` — same independent-active-key pattern
(migration `20260831130000_vision_provider_keys.sql`).

- **Admin → AI providers** now has three tabs: AI providers, Embeddings,
  **Vision**. The Vision tab lets you save/rotate/test/activate a key from
  any vision-capable provider (Anthropic, OpenAI, Google, xAI, OpenRouter,
  Mistral, Custom — DeepSeek/Groq excluded, they don't do image input).
  "Test" sends a real tiny image through the key and confirms it reads it.

## 2. Where vision keys are used

- `visionChat()` (`src/lib/ai.server.ts`) resolution order: explicit
  override → active **vision** key → active **chat** key (back-compat) →
  built-in gateway.
- **Handwriting OCR** (`src/lib/ocr/gemini.server.ts`): now uses the active
  vision key generically — Google still gets a direct high-res REST call
  (mediaResolution:HIGH), any other provider goes through `visionChat`.
- **MCQ/essay bank extraction** (`src/lib/bank/extract.server.ts`,
  `question-bank-admin.tsx`): uploading a QP as a PDF or **photo** now
  rasterizes the real pages and sends them through vision extraction
  alongside the OCR'd text, so the model reads actual diagrams and data
  tables off the page instead of guessing from text alone. New "Upload PDF
  or photo" button (was PDF-only), plus a "Vision extraction active" hint
  when page images are attached.

## 3. MCQ practice UI rebuild (`src/routes/_authenticated/mcq.tsx`)

- New quickmark-style header: **Skip**, **Mark out of syllabus** (new,
  independent from the existing "flag for review" star), and an **expand**
  button that opens the same question full-screen in a dialog.
- Options now use circular letter badges; short options (e.g. numeric
  answers) lay out as a wrapped horizontal row of pills, long options stay
  full-width stacked rows — both with the same badge style.
- Question stems that contain a markdown pipe table (`| a | b |`) — which
  is exactly what the vision extraction path now produces for real data
  tables — render as an actual `<table>`, not raw pipe characters.
- All existing functionality preserved: timer, pause/resume, flag-for-
  review, keyboard nav, review-filter, mark/retry flow, diagrams.

## Verification

`tsc --noEmit` and `eslint --fix` were run against every changed file —
zero new type errors, zero new lint errors (remaining `any` warnings match
the codebase's pre-existing pattern for Supabase row shapes).

## One thing to do locally

As with prior hand-patches in this repo, `src/routeTree.gen.ts` was not
touched — nothing new was added to routing, so no regen is required. Run
`bun install` (or `npm install --legacy-peer-deps`) then `bun dev` as usual.

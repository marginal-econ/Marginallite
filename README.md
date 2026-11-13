# Marginalite

Marginalite is a Cambridge IGCSE Economics (0455) assessment and revision platform, providing deterministic, syllabus-calibrated two-pass AI marking, past paper multiple choice with server-authoritative timing, exemplar models, and handwriting OCR.

## Features

- **Two-Pass Examiner Marking**: Calibrated to Cambridge IGCSE Economics (0455) Paper 2 tariffs (2m, 4m, 6m, 8m) with full AO1, AO2, AO3 breakdown.
- **Server-Authoritative MCQ Engine**: Real Cambridge IGCSE 0455 Paper 1 practice (45m/30q legacy, 60m/40q 2027+ syllabus) with strict tamper-resistant server timing.
- **Handwriting OCR**: High-accuracy transcription of handwritten student exam scripts via multimodal Gemini vision.
- **Economics Diagram Library & Visual Feedback**: Interactive SVG diagrams and automatic visual validation of candidate diagrams.
- **Model Response Generator & Exemplar Showcase**: Examiner-standard responses structured to official Cambridge mark schemes.
- **Knowledge Base RAG**: Vector-grounded retrieval using Cambridge IGCSE Economics coursebooks and mark schemes.
- **Zero Gating**: 100% unlocked for all registered students with quiet rate-limiting abuse protection. No pricing, tiers, credits, coupons, or paywalls.

## Quick Start

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Environment configuration:
   ```bash
   cp .env.example .env.local
   # Fill in Supabase URL and anon/service keys, and AI provider keys
   ```

3. Verification gauntlet:
   ```bash
   npm run verify
   ```

4. Development server:
   ```bash
   npm run dev
   ```

5. Production build:
   ```bash
   npm run build
   ```

## Automated Verification Suite

Run all verification suites in one command:
```bash
npm run verify
```
This runs:
- Secret leak scan (`scripts/secret-scan.ts`)
- WCAG 2.1 AA pink theme contrast verification (`scripts/contrast-check.ts`)
- Banned terms & legacy remnants scan (`scripts/verify-clean.ts`)
- TypeScript type-check (`tsc --noEmit`)
- ESLint code quality (`npm run lint`)
- Vitest unit & integration test suite (`npm test`)

## Documentation

- `DECISIONS.md`: Architectural decisions, Cambridge 0455 marking tariff justifications, and era auto-detection rules.
- `VERIFICATION_REPORT.md`: Comprehensive audit report and verification logs.
- `SUPABASE_SETUP.md`: Database setup, migrations, and canonical schema guide.
- `DEPLOYMENT.md`: Cloudflare Workers & Nitro deployment guide.

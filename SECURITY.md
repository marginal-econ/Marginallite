# Security

- Supabase RLS is the primary authorization boundary for user-owned data.
- Server functions attach and validate the user's bearer token; client-side hiding is never treated as authorization.
- Administrative handlers verify the admin role before elevated operations.
- Service-role, waitlist admin, and AI secrets are server-only. Never prefix them with `VITE_`.
- The public waitlist uses validation, duplicate protection, a honeypot, rate limiting, and fixed error responses.
- New accounts are students. The legacy self-claim admin RPC is revoked by the final migration.
- Uploads retain file-size/type limits; OCR and AI input are treated as untrusted content.
- AI output is parsed and validated before storage or display, and marking is presented as an estimate.

Before production, review policies with a student token, rotate any credentials ever stored outside a secret manager, enable provider-side rate limits, and configure monitoring without logging raw secrets or full student submissions.

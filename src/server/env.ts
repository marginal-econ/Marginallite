/**
 * Runtime environment access — server only.
 *
 * Three things make this less trivial than `process.env`:
 *
 *  1. On Cloudflare Workers there is no `process.env`. Secrets arrive as the
 *     second argument to `fetch(request, env, ctx)`, which is why
 *     `src/server.ts` hands that object to `setRuntimeEnv` on every request.
 *  2. In `vite dev` there is no Worker `env`, but Nitro has already loaded
 *     `.env` / `.env.local` into `process.env`, so that is the fallback.
 *  3. Nothing in this file may ever be imported from a component. It lives
 *     under `src/server/`, which no client module imports — that is the wall
 *     that keeps SUPABASE_SECRET_KEY out of the browser bundle.
 */

type EnvRecord = Record<string, unknown>;

let runtimeEnv: EnvRecord | undefined;

/** Called once per request by the Worker entry in `src/server.ts`. */
export function setRuntimeEnv(env: unknown): void {
  if (env && typeof env === "object") runtimeEnv = env as EnvRecord;
}

export function readEnv(name: string): string | undefined {
  const fromWorker = runtimeEnv?.[name];
  if (typeof fromWorker === "string" && fromWorker.length > 0) return fromWorker;

  const fromGlobalEnv = (globalThis as any)?.__env__?.[name];
  if (typeof fromGlobalEnv === "string" && fromGlobalEnv.length > 0) return fromGlobalEnv;

  // `globalThis.process` is guarded rather than assumed: it exists in dev and
  // in Node deployments, and is simply absent on a bare Worker.
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const fromNode = proc?.env?.[name];
  if (typeof fromNode === "string" && fromNode.length > 0) return fromNode;

  return undefined;
}

/**
 * Reads a variable that the app cannot run without. Throws with the variable
 * name — never with its value — so a missing secret shows up in the server
 * log as a clear misconfiguration rather than as a confusing Supabase 401.
 */
export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local for local development, or as a secret on your host for production.`,
    );
  }
  return value;
}

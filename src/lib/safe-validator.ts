import { z } from "zod";

/**
 * Unwraps `{ data: ... }` if present, ensuring TanStack Start RPC calls
 * with `{ data: payload }` validate seamlessly against schemas expecting `payload`.
 */
export function unwrapData<T = any>(input: unknown): T {
  if (input && typeof input === "object" && "data" in input && (input as any).data !== undefined) {
    return (input as any).data as T;
  }
  return input as T;
}

/**
 * Creates an input validator function that unwraps `{ data: ... }` before passing to a Zod schema.
 */
export function validateWith<T extends z.ZodTypeAny>(schema: T) {
  return (input: unknown): z.infer<T> => {
    return schema.parse(unwrapData(input));
  };
}

/**
 * Formats server or Zod error messages into clean, readable text instead of raw JSON arrays.
 */
export function formatErrorMessage(err: unknown, fallback = "An unexpected error occurred."): string {
  if (!err) return fallback;
  const msg = typeof err === "string" ? err : (err as any).message || String(err);
  if (typeof msg === "string" && msg.trim().startsWith("[") && msg.includes('"message"')) {
    try {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((p: any) => (p.path && p.path.length ? `${p.path.join(".")}: ${p.message}` : p.message))
          .join("; ");
      }
    } catch {}
  }
  return msg || fallback;
}

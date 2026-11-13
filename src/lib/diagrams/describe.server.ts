/**
 * Describes an economics diagram supplied as an image URL (e.g. a photo of a
 * textbook diagram, or a diagram exported from another tool) into the same
 * structured [DIAGRAM: ...] tag format the handwriting OCR pipeline uses, so
 * a typed online essay can get the same diagram credit as a scanned script.
 */
import { visionChat } from "../ai.server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = [
  "You are looking at an image of an economics diagram supplied by a Cambridge IGCSE Economics 0455 student, alongside their response.",
  "Describe ONLY what is actually drawn — do not invent axes, curves or labels that are not visible.",
  "Respond with a single structured tag, and nothing else, in this exact format:",
  "[DIAGRAM: <best-guess standard name, e.g. AD/AS, demand and supply with price ceiling, PPC, monopoly, Lorenz curve>",
  "| axes: <x-axis label / y-axis label exactly as shown, or 'unlabelled'>",
  "| curves: <curves shown and any shifts/directions, e.g. 'AD shifts right AD1->AD2, SRAS static'>",
  "| labels: <equilibrium points, prices, quantities, shaded areas, annotations shown on the diagram>",
  "| accuracy: <short factual note on what is correct, missing or mislabelled — no marks, no praise>]",
].join("\n");

const USER_PROMPT =
  "Describe this economics diagram using the exact [DIAGRAM: ...] tag format from the system prompt. Output only the tag.";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function assertSafeRemoteImageUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("That doesn't look like a valid image URL.");
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Diagram URLs must be http or https links.");
  }
  if (parsed.username || parsed.password) throw new Error("Image URLs cannot contain credentials.");
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new Error("That image URL uses an unsupported port.");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const blockedName =
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal");
  const blockedIpv6 =
    hostname === "::" ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe8") ||
    hostname.startsWith("fe9") ||
    hostname.startsWith("fea") ||
    hostname.startsWith("feb");
  if (blockedName || blockedIpv6 || isPrivateIpv4(hostname)) {
    throw new Error("Private or local network image URLs are not allowed.");
  }
  return parsed;
}

async function readResponseWithLimit(response: Response): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new Error("That image is too large — please use an image under 8MB.");
  }
  if (!response.body) return new ArrayBuffer(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("That image is too large — please use an image under 8MB.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  let parsed = assertSafeRemoteImageUrl(url);
  let response: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetch(parsed.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location || redirects === 3) throw new Error("That image URL redirected too many times.");
    parsed = assertSafeRemoteImageUrl(new URL(location, parsed).toString());
  }
  if (!response) throw new Error("Could not fetch that image.");
  if (!response.ok) throw new Error(`Could not fetch that image (${response.status}).`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("That URL doesn't point directly at an image file.");
  }

  const buffer = await readResponseWithLimit(response);

  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

// Same gateway-verified model list as the handwriting OCR pipeline (see
// ocr/gemini.server.ts) — "google/gemini-3.7-flash" is NOT served by the
// gateway and was previously first in this list, burning a guaranteed-failed
// attempt on every diagram description before ever reaching a working model.
const GATEWAY_MODELS = ["google/gemini-3.8-flash", "openai/gpt-5.6-sol", "openai/gpt-5.6-terra"];

const MAX_DATA_URL_BYTES = MAX_IMAGE_BYTES;

/**
 * Shared describe step once we already have the image as a data URL —
 * used both by the URL-fetch path below and by a directly uploaded photo
 * (e.g. Response Grader's "attach a diagram" control), so both pathways get
 * the exact same prompt, model list and [DIAGRAM: ...] tag format.
 */
export async function describeDiagramFromDataUrl(dataUrl: string): Promise<string> {
  // Rough byte-size check on the base64 payload — same ceiling as the
  // URL-fetch path, just measured after the fact instead of via
  // content-length, since an uploaded file arrives as a data URL already.
  const commaIndex = dataUrl.indexOf(",");
  const base64Length = commaIndex >= 0 ? dataUrl.length - commaIndex - 1 : dataUrl.length;
  const approxBytes = Math.floor((base64Length * 3) / 4);
  if (approxBytes > MAX_DATA_URL_BYTES) {
    throw new Error("That image is too large — please use an image under 8MB.");
  }

  let lastError: unknown = null;
  for (const model of GATEWAY_MODELS) {
    try {
      const result = await visionChat({
        model,
        systemPrompt: SYSTEM_PROMPT,
        prompt: USER_PROMPT,
        imageDataUrls: [dataUrl],
        maxCompletionTokens: 1024,
      });
      const text = result.text.trim();
      if (text.startsWith("[DIAGRAM:")) return text;
      lastError = new Error(`${model} did not return a diagram tag.`);
    } catch (error) {
      lastError = error;
    }
  }

  console.error("Diagram description failed for all models", lastError);
  throw new Error("Couldn't make out a diagram in that image — try a clearer, closer photo.");
}

export async function describeDiagramFromUrl(url: string): Promise<string> {
  const dataUrl = await fetchAsDataUrl(url);
  return describeDiagramFromDataUrl(dataUrl);
}

/**
 * Client-safe catalogue of AI providers an admin can plug their own key into.
 * Every provider except Anthropic speaks the OpenAI chat-completions shape,
 * so a single adapter covers them all.
 */
export const AI_PROVIDERS = [
  {
    id: "lovable",
    label: "Lovable AI (built in)",
    baseUrl: "https://ai.gateway.lovable.dev/v1",
    keyHint: "Managed automatically — no key needed",
    models: [
      "google/gemini-3.1-pro",
      "google/gemini-3.8-flash",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
    ],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["google/gemini-3.1-pro", "google/gemini-3.8-flash", "openai/gpt-5.6-sol"],
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyHint: "sk-...",
    models: ["gpt-5.1", "gpt-4.1", "gpt-4o"],
    embeddingModels: ["text-embedding-3-large", "text-embedding-3-small"],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: ["gpt-4.1", "gpt-4o", "gpt-5.1"],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    keyHint: "sk-ant-...",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-haiku-latest"],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["claude-sonnet-4-5", "claude-opus-4-1"],
  },
  {
    id: "google",
    label: "Google (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyHint: "AIza... (single key or comma-separated pool for auto-rotation)",
    models: ["gemini-3.8-flash", "gemini-3.1-pro", "gemini-3.1-flash"],
    embeddingModels: ["models/gemini-embedding-001"],
    embeddingCapable: true,
    // Gemini reads dense/cramped handwriting and exam figures better than
    // any other line here — this is the recommended default for the
    // Vision console. Model ids match the Google AI Studio REST id
    // (used directly by src/lib/ocr/gemini.server.ts), not the OpenAI-
    // compatible alias used for chat/embeddings.
    visionCapable: true,
    visionModels: ["models/gemini-3.8-flash", "models/gemini-3.1-flash", "models/gemini-3.1-pro"],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    keyHint: "xai-...",
    models: ["grok-4", "grok-3-mini"],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["grok-4"],
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keyHint: "gsk_...",
    models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"],
    embeddingCapable: false,
    visionCapable: false,
    visionModels: [],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keyHint: "sk-or-...",
    models: ["anthropic/claude-sonnet-4.5", "google/gemini-3.1-pro", "openai/gpt-4.1"],
    embeddingModels: ["nvidia/nemotron-3-embed-1b:free", "openai/text-embedding-3-large"],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: ["anthropic/claude-sonnet-4.5", "google/gemini-3.1-pro", "openai/gpt-4.1"],
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    keyHint: "...",
    models: ["mistral-large-latest"],
    // mistral-embed is fixed at 1024 dims with no way to request a
    // different size, so it can never match document_chunks.embedding
    // (vector(2048)) — left out of the Embeddings console rather than
    // offering an option that's guaranteed to fail on first use.
    embeddingModels: [],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["pixtral-large-latest"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    keyHint: "sk-...",
    models: ["deepseek-chat", "deepseek-reasoner"],
    embeddingCapable: false,
    // DeepSeek's chat models are text-only; there's no vision-capable
    // endpoint on this base URL. Left out of the Vision console rather
    // than offering an option guaranteed to 400 on the first image.
    visionCapable: false,
    visionModels: [],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    keyHint: "Any key your endpoint expects",
    models: [],
    embeddingModels: [],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: [],
  },
] as const;

export type AiProviderId = (typeof AI_PROVIDERS)[number]["id"];

/** Providers with a working /embeddings-shaped endpoint, for the Embeddings console. */
export const EMBEDDING_PROVIDERS = AI_PROVIDERS.filter((p) => p.embeddingCapable);

/** Providers with a working image-input endpoint, for the Vision console. */
export const VISION_PROVIDERS = AI_PROVIDERS.filter((p) => p.visionCapable);

export function providerMeta(id: string) {
  return (
    AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[AI_PROVIDERS.length - 1]
  );
}

/**
 * Client-safe catalogue of AI providers an admin can plug their own key into.
 * Supports dedicated separate Gemini platform as well as multi-provider platforms
 * (Groq, xAI Grok, OpenRouter, Mistral, OpenAI, Anthropic, DeepSeek, Custom).
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
    id: "groq",
    label: "Groq (Ultra-Fast Inference)",
    baseUrl: "https://api.groq.com/openai/v1",
    keyHint: "gsk_...",
    models: [
      "llama-3.3-70b-versatile",
      "deepseek-r1-distill-llama-70b",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "llama-3.2-11b-vision-preview",
    ],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["llama-3.2-11b-vision-preview"],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    keyHint: "xai-...",
    models: ["grok-beta", "grok-2-1212", "grok-2-vision-1212", "grok-vision-beta"],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["grok-2-vision-1212", "grok-vision-beta"],
  },
  {
    id: "openrouter",
    label: "OpenRouter (Universal Router)",
    baseUrl: "https://openrouter.ai/api/v1",
    keyHint: "sk-or-...",
    models: [
      "qwen/qwen-2.5-72b-instruct",
      "mistralai/mistral-large",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "google/gemini-2.0-flash-001",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
    ],
    embeddingModels: ["nvidia/nemotron-3-embed-1b:free", "openai/text-embedding-3-large"],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: [
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.0-flash-001",
      "openai/gpt-4o-mini",
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    keyHint: "sk-ant-...",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    embeddingCapable: false,
    visionCapable: true,
    visionModels: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyHint: "sk-...",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    embeddingModels: ["text-embedding-3-large", "text-embedding-3-small"],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  },
  {
    id: "google",
    label: "Google (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyHint: "AIza... (single key or multi-project pool for auto-rotation)",
    models: ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    embeddingModels: ["models/gemini-embedding-001", "models/text-embedding-004"],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: ["models/gemini-3.8-flash", "models/gemini-2.5-flash"],
  },
  {
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    keyHint: "Paste Mistral API keys (one per line or JSON pool for auto-hopping)",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    embeddingModels: ["mistral-embed"],
    embeddingCapable: true,
    visionCapable: true,
    visionModels: ["pixtral-large-latest", "pixtral-12b-2409"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    keyHint: "sk-...",
    models: ["deepseek-chat", "deepseek-reasoner"],
    embeddingCapable: false,
    visionCapable: false,
    visionModels: [],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    keyHint: "Any key your endpoint expects (vLLM, Ollama, Together, etc.)",
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

/**
 * Returns prioritized fallback candidate models for a given provider.
 * If the primary requested model 404s (e.g. decommissioned or tier-restricted),
 * the gateway automatically tries candidate models so calls never die with 404.
 */
export function getCandidateModels(provider: string, primaryModel?: string): string[] {
  const result: string[] = [];
  if (primaryModel && primaryModel.trim()) {
    result.push(primaryModel.trim());
  }

  const fallbackMap: Record<string, string[]> = {
    groq: ["qwen/qwen3.8-27b"],
    xai: ["grok-beta", "grok-2-1212", "grok-2-vision-1212", "grok-vision-beta"],
    openrouter: [
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-r1",
      "qwen/qwen-2.5-72b-instruct",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
    ],
    anthropic: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    google: ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
  };

  const fallbacks = fallbackMap[provider] || [];
  for (const m of fallbacks) {
    if (!result.includes(m)) {
      result.push(m);
    }
  }

  // If user selected a free-tier model on OpenRouter (:free), ensure free-tier fallbacks are available
  if (provider === "openrouter" && primaryModel?.includes(":free")) {
    const freeFallbacks = [
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-r1:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ];
    for (const fm of freeFallbacks) {
      if (!result.includes(fm)) result.push(fm);
    }
  }

  if (result.length === 0) {
    result.push(primaryModel || "gpt-4o-mini");
  }

  return result;
}

/**
 * Returns the default recommended model for a provider when none is specified.
 */
export function getProviderDefaultModel(provider: string): string {
  const meta = providerMeta(provider);
  if (meta && meta.models && meta.models.length > 0) {
    return meta.models[0]!;
  }
  return "gpt-4o-mini";
}

/**
 * Returns the provider-safe economy model for "economy" mode,
 * ensuring non-Google providers are NOT erroneously forced into Google Gemini models.
 */
export function getEconomyModelForProvider(provider: string, currentModel?: string): string {
  switch (provider) {
    case "groq":
      return "llama-3.1-8b-instant";
    case "xai":
      return "grok-beta";
    case "openrouter":
      return "meta-llama/llama-3.3-70b-instruct";
    case "mistral":
      return "mistral-small-latest";
    case "anthropic":
      return "claude-3-5-haiku-20241022";
    case "openai":
      return "gpt-4o-mini";
    case "deepseek":
      return "deepseek-chat";
    case "google":
      return "gemini-3.8-flash";
    default:
      return currentModel || "gpt-4o-mini";
  }
}

import Anthropic from "@anthropic-ai/sdk";

export const AI_PROVIDERS = [
  "anthropic",
  "openai",
  "openrouter",
  "groq",
  "google",
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string | null;
};

export type ClaudeFamily = "haiku" | "sonnet";

const CLAUDE_SONNET = "claude-sonnet-4-6";
const CLAUDE_HAIKU = "claude-haiku-4-5";
const OPENROUTER_SONNET = "anthropic/claude-sonnet-4.6";
const OPENROUTER_HAIKU = "anthropic/claude-haiku-4.5";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: CLAUDE_SONNET,
  openai: "gpt-4.1",
  openrouter: OPENROUTER_SONNET,
  groq: "llama-3.3-70b-versatile",
  google: "gemini-2.5-flash",
};

const DEFAULT_BASE: Record<AiProvider, string | null> = {
  anthropic: null,
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
};

type Env = Record<string, string | undefined>;

function envOf(source?: Env): Env {
  return source ?? process.env;
}

function firstKey(env: Env, names: string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseProvider(value: string | undefined): AiProvider | null {
  const raw = value?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "openai-compatible" || raw === "compatible") return "openai";
  if ((AI_PROVIDERS as readonly string[]).includes(raw)) return raw as AiProvider;
  return null;
}

function looksLikeClaudeId(value: string): boolean {
  return /(?:^|\/)claude-(?:haiku|sonnet)-/.test(value);
}

/** Claude API may only use Haiku or Sonnet — never Opus, Fable, or other families. */
export function classifyClaudeFamily(model: string): ClaudeFamily | null {
  const raw = model.trim().toLowerCase();
  if (!raw) return null;
  if (/\b(opus|fable)\b/.test(raw)) return null;
  if (/\bhaiku\b/.test(raw)) return "haiku";
  if (/\bsonnet\b/.test(raw)) return "sonnet";
  return null;
}

export function pickAllowedClaudeModel(
  requested: string | undefined,
  destination: "anthropic" | "openrouter",
): string {
  const family = requested ? classifyClaudeFamily(requested) : "sonnet";
  const trimmed = requested?.trim() ?? "";
  if (family === "haiku") {
    if (destination === "openrouter") {
      return looksLikeClaudeId(trimmed) && trimmed.includes("/")
        ? trimmed
        : OPENROUTER_HAIKU;
    }
    return looksLikeClaudeId(trimmed) && !trimmed.includes("/") ? trimmed : CLAUDE_HAIKU;
  }
  if (family === "sonnet" && trimmed && looksLikeClaudeId(trimmed)) {
    if (destination === "openrouter") {
      return trimmed.includes("/") ? trimmed : OPENROUTER_SONNET;
    }
    return trimmed.includes("/") ? CLAUDE_SONNET : trimmed;
  }
  return destination === "openrouter" ? OPENROUTER_SONNET : CLAUDE_SONNET;
}

export function detectProvider(env: Env = process.env): AiProvider | null {
  const explicit = parseProvider(env.AI_PROVIDER);
  if (explicit) return explicit;
  if (env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (env.GROQ_API_KEY?.trim()) return "groq";
  if (env.OPENAI_API_KEY?.trim()) return "openai";
  if (env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim()) return "google";
  const generic = env.AI_API_KEY?.trim();
  if (!generic) return null;
  if (env.AI_BASE_URL?.trim()) return "openai";
  if (generic.startsWith("sk-ant-")) return "anthropic";
  if (generic.startsWith("sk-or-")) return "openrouter";
  if (generic.startsWith("gsk_")) return "groq";
  if (generic.startsWith("AIza")) return "google";
  return "openai";
}

export function resolveAiConfig(source?: Env): AiConfig | null {
  const env = envOf(source);
  const provider = detectProvider(env);
  if (!provider) return null;

  const apiKey = firstKey(env, [
    "AI_API_KEY",
    provider === "anthropic" ? "ANTHROPIC_API_KEY" : "",
    provider === "openai" ? "OPENAI_API_KEY" : "",
    provider === "openrouter" ? "OPENROUTER_API_KEY" : "",
    provider === "groq" ? "GROQ_API_KEY" : "",
    provider === "google" ? "GEMINI_API_KEY" : "",
    provider === "google" ? "GOOGLE_API_KEY" : "",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
  ].filter(Boolean));
  if (!apiKey) return null;

  const requestedModel = env.AI_MODEL?.trim();
  const model =
    provider === "anthropic"
      ? pickAllowedClaudeModel(requestedModel, "anthropic")
      : provider === "openrouter"
        ? pickAllowedClaudeModel(requestedModel, "openrouter")
        : requestedModel || DEFAULT_MODELS[provider];

  return {
    provider,
    apiKey,
    model,
    baseUrl: env.AI_BASE_URL?.trim() || DEFAULT_BASE[provider],
  };
}

export function hasAiKey(source?: Env): boolean {
  return resolveAiConfig(source) !== null;
}

export async function completeJson(
  system: string,
  user: string,
  maxTokens = 16000,
  options?: { fast?: boolean },
): Promise<string> {
  const config = resolveAiConfig();
  if (!config) {
    throw new Error("AI is not configured on the server");
  }
  const effective =
    options?.fast && (config.provider === "anthropic" || config.provider === "openrouter")
      ? {
          ...config,
          model: pickAllowedClaudeModel(
            "haiku",
            config.provider === "openrouter" ? "openrouter" : "anthropic",
          ),
        }
      : config;
  try {
    if (effective.provider === "anthropic") {
      return await askAnthropic(effective, system, user, maxTokens);
    }
    if (effective.provider === "google") {
      return await askGoogle(effective, system, user, maxTokens);
    }
    return await askOpenAiCompatible(effective, system, user, maxTokens);
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("The model took too long. Try again.");
    }
    throw error;
  }
}

const AI_TIMEOUT_MS = 120_000;

async function askAnthropic(config: AiConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const model = pickAllowedClaudeModel(config.model, "anthropic");
  const message = await new Anthropic({
    apiKey: config.apiKey,
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0,
  }).messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") throw new Error("Empty model response");
  return block.text;
}

async function askOpenAiCompatible(
  config: AiConfig,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const base = (config.baseUrl ?? DEFAULT_BASE.openai)?.replace(/\/$/, "");
  const headers: Record<string, string> = {
    authorization: `Bearer ${config.apiKey}`,
    "content-type": "application/json",
  };
  if (config.provider === "openrouter") {
    headers["http-referer"] = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    headers["x-title"] = "Adaptive Cookbook";
  }
  const model =
    config.provider === "openrouter"
      ? pickAllowedClaudeModel(config.model, "openrouter")
      : config.model;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const body = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    throw new Error(body.error?.message || `AI request failed (${res.status})`);
  }
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty model response");
  return text;
}

async function askGoogle(config: AiConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const base = (config.baseUrl ?? DEFAULT_BASE.google)?.replace(/\/$/, "");
  const url = `${base}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
  });
  const body = (await res.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) {
    throw new Error(body.error?.message || `AI request failed (${res.status})`);
  }
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Empty model response");
  return text;
}

import { describe, expect, it } from "vitest";
import {
  classifyClaudeFamily,
  detectProvider,
  hasAiKey,
  pickAllowedClaudeModel,
  resolveAiConfig,
} from "@/lib/ai";

describe("AI provider config", () => {
  it("returns null when no keys are set", () => {
    expect(resolveAiConfig({})).toBeNull();
    expect(hasAiKey({})).toBe(false);
  });

  it("uses Anthropic when ANTHROPIC_API_KEY is present", () => {
    const config = resolveAiConfig({ ANTHROPIC_API_KEY: "sk-ant-test" });
    expect(config?.provider).toBe("anthropic");
    expect(config?.model).toBe("claude-sonnet-4-6");
    expect(config?.apiKey).toBe("sk-ant-test");
  });

  it("uses a generic AI_API_KEY with an explicit provider", () => {
    const config = resolveAiConfig({
      AI_API_KEY: "sk-any",
      AI_PROVIDER: "openai",
      AI_MODEL: "gpt-4o",
    });
    expect(config?.provider).toBe("openai");
    expect(config?.apiKey).toBe("sk-any");
    expect(config?.model).toBe("gpt-4o");
    expect(config?.baseUrl).toContain("openai.com");
  });

  it("treats openai-compatible as openai and honors AI_BASE_URL", () => {
    const config = resolveAiConfig({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "local-key",
      AI_BASE_URL: "http://127.0.0.1:11434/v1",
      AI_MODEL: "llama3",
    });
    expect(config?.provider).toBe("openai");
    expect(config?.baseUrl).toBe("http://127.0.0.1:11434/v1");
    expect(config?.model).toBe("llama3");
  });

  it("detects OpenRouter, Groq, and Google from their native env names", () => {
    expect(detectProvider({ OPENROUTER_API_KEY: "or" })).toBe("openrouter");
    expect(detectProvider({ GROQ_API_KEY: "g" })).toBe("groq");
    expect(detectProvider({ GEMINI_API_KEY: "gem" })).toBe("google");
  });

  it("sniffs a generic AI_API_KEY prefix when provider is omitted", () => {
    expect(detectProvider({ AI_API_KEY: "sk-ant-hello" })).toBe("anthropic");
    expect(detectProvider({ AI_API_KEY: "sk-or-v1-hello" })).toBe("openrouter");
    expect(detectProvider({ AI_API_KEY: "gsk_hello" })).toBe("groq");
    expect(detectProvider({ AI_API_KEY: "AIzaSyHello" })).toBe("google");
    expect(detectProvider({ AI_API_KEY: "sk-openai-style" })).toBe("openai");
  });

  it("prefers AI_API_KEY over a provider-specific key", () => {
    const config = resolveAiConfig({
      AI_PROVIDER: "anthropic",
      AI_API_KEY: "generic",
      ANTHROPIC_API_KEY: "specific",
    });
    expect(config?.apiKey).toBe("generic");
  });

  it("allows Haiku or Sonnet and rejects larger Claude families", () => {
    expect(classifyClaudeFamily("claude-haiku-4-5")).toBe("haiku");
    expect(classifyClaudeFamily("claude-sonnet-5")).toBe("sonnet");
    expect(classifyClaudeFamily("claude-opus-5")).toBeNull();
    expect(classifyClaudeFamily("claude-fable-5-1")).toBeNull();
    expect(pickAllowedClaudeModel("claude-opus-5", "anthropic")).toBe("claude-sonnet-4-6");
    expect(pickAllowedClaudeModel("haiku", "anthropic")).toBe("claude-haiku-4-5");
    expect(pickAllowedClaudeModel("claude-sonnet-5", "anthropic")).toBe("claude-sonnet-5");
  });

  it("clamps Anthropic AI_MODEL to Haiku or Sonnet", () => {
    expect(resolveAiConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
      AI_MODEL: "claude-opus-5",
    })?.model).toBe("claude-sonnet-4-6");
    expect(resolveAiConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
      AI_MODEL: "claude-haiku-4-5",
    })?.model).toBe("claude-haiku-4-5");
    expect(resolveAiConfig({
      OPENROUTER_API_KEY: "or",
      AI_MODEL: "anthropic/claude-opus-4.6",
    })?.model).toBe("anthropic/claude-sonnet-4.6");
  });
});

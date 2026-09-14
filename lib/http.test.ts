import { describe, expect, it } from "vitest";
import {
  applyNdjsonLine,
  friendlyGenerateError,
  isNetworkFailure,
  readGenerateResponse,
  trimUsdaCache,
} from "@/lib/http";

describe("network error copy", () => {
  it("recognizes Safari and Chromium fetch failures", () => {
    expect(isNetworkFailure("Load failed")).toBe(true);
    expect(isNetworkFailure("Failed to fetch")).toBe(true);
    expect(isNetworkFailure("NetworkError when attempting to fetch resource.")).toBe(true);
    expect(isNetworkFailure("Week JSON invalid after repair")).toBe(false);
  });

  it("rewrites Load failed into a retryable kitchen sentence", () => {
    expect(friendlyGenerateError(new Error("Load failed"), "Could not write this week")).toMatch(
      /connection dropped/i,
    );
    expect(friendlyGenerateError(new Error("Cook time exceeds max"), "fallback")).toBe(
      "Cook time exceeds max",
    );
  });
});

describe("generate response parsing", () => {
  it("reads a JSON error body instead of crashing on HTML-ish text", async () => {
    const res = new Response(JSON.stringify({ error: "Meal writing is not configured yet." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
    await expect(readGenerateResponse(res)).rejects.toThrow("Meal writing is not configured yet.");
  });

  it("does not throw Unexpected token when the host returns HTML", async () => {
    const res = new Response("<html>oops</html>", {
      status: 502,
      headers: { "content-type": "text/html" },
    });
    await expect(readGenerateResponse(res)).rejects.toThrow("Request failed (502)");
  });

  it("reads the final ndjson result and ignores pings", async () => {
    const payload = [
      JSON.stringify({ type: "ping", pad: " " }),
      JSON.stringify({ type: "result", week: { id: "w1" }, recipes: [] }),
      "",
    ].join("\n");
    const res = new Response(payload, {
      status: 200,
      headers: { "content-type": "application/x-ndjson; charset=utf-8" },
    });
    const body = await readGenerateResponse<{ week: { id: string }; recipes: unknown[] }>(res);
    expect(body.week.id).toBe("w1");
  });

  it("surfaces an in-band ndjson error", () => {
    const state: { result: { week: string } | null; error: string | null } = {
      result: null,
      error: null,
    };
    applyNdjsonLine(JSON.stringify({ type: "ping" }), state);
    applyNdjsonLine(JSON.stringify({ type: "error", error: "Empty model response" }), state);
    expect(state.error).toBe("Empty model response");
    expect(state.result).toBeNull();
  });
});

describe("usda cache trim", () => {
  it("omits an empty cache so the first-week POST stays small", () => {
    expect(trimUsdaCache({})).toBeUndefined();
  });

  it("keeps the newest 400 entries when the cache is huge", () => {
    const cache = Object.fromEntries(
      Array.from({ length: 450 }, (_, i) => [String(i), { n: i }]),
    );
    const trimmed = trimUsdaCache(cache);
    expect(trimmed).toBeDefined();
    expect(Object.keys(trimmed ?? {})).toHaveLength(400);
    expect(trimmed?.["449"]).toEqual({ n: 449 });
    expect(trimmed?.["0"]).toBeUndefined();
  });
});

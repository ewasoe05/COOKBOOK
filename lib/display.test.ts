import { describe, expect, it } from "vitest";
import { formatDuration, isCookModePath } from "@/lib/display";

describe("display helpers", () => {
  it("does not treat /cookbook as cook mode", () => {
    expect(isCookModePath("/cookbook")).toBe(false);
    expect(isCookModePath("/grocery")).toBe(false);
    expect(isCookModePath("/recipe/abc/cook")).toBe(true);
    expect(isCookModePath("/recipe/abc/cook/")).toBe(true);
  });

  it("formats minutes", () => {
    expect(formatDuration(15)).toBe("15 min");
  });
});

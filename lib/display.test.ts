import { describe, expect, it } from "vitest";
import { formatDuration, isAuthPath, isCookModePath } from "@/lib/display";

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

  it("treats /sign-in as an auth path", () => {
    expect(isAuthPath("/sign-in")).toBe(true);
    expect(isAuthPath("/profile")).toBe(false);
  });
});

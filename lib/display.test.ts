import { describe, expect, it } from "vitest";
import { formatDuration, isAuthPath, isCookModePath, kgToLb, lbToKg, parseNumberField } from "@/lib/display";

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

  it("shows whole pounds without a forced decimal", () => {
    expect(kgToLb(75)).toBe(165);
    expect(kgToLb(lbToKg(165))).toBe(165);
  });

  it("treats a cleared number field as empty instead of zero", () => {
    expect(parseNumberField("")).toBeNull();
    expect(parseNumberField("   ")).toBeNull();
    expect(parseNumberField(".")).toBeNull();
    expect(parseNumberField("0")).toBe(0);
    expect(parseNumberField("165")).toBe(165);
  });
});

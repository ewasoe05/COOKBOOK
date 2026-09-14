import { describe, expect, it } from "vitest";
import { authBaseUrl, isAuthEnabled, isGoogleEnabled } from "@/lib/auth-flags";

describe("auth flags", () => {
  it("requires both a database and a Better Auth secret", () => {
    expect(isAuthEnabled({})).toBe(false);
    expect(isAuthEnabled({ DATABASE_URL: "postgres://x" })).toBe(false);
    expect(isAuthEnabled({ BETTER_AUTH_SECRET: "secret-at-least-32-characters-long" })).toBe(
      false,
    );
    expect(
      isAuthEnabled({
        DATABASE_URL: "postgres://x",
        BETTER_AUTH_SECRET: "secret-at-least-32-characters-long",
      }),
    ).toBe(true);
  });

  it("enables Google only when both OAuth values exist", () => {
    expect(isGoogleEnabled({ GOOGLE_CLIENT_ID: "id" })).toBe(false);
    expect(
      isGoogleEnabled({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }),
    ).toBe(true);
  });

  it("prefers BETTER_AUTH_URL then the public site URL", () => {
    expect(authBaseUrl({})).toBe("http://localhost:3000");
    expect(authBaseUrl({ NEXT_PUBLIC_SITE_URL: "https://cook.example" })).toBe(
      "https://cook.example",
    );
    expect(
      authBaseUrl({
        BETTER_AUTH_URL: "https://auth.example",
        NEXT_PUBLIC_SITE_URL: "https://cook.example",
      }),
    ).toBe("https://auth.example");
  });
});

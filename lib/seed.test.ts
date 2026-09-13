import { describe, expect, it } from "vitest";
import { ProfileSchema, RecipeSchema, WeekSchema } from "@/lib/schemas";
import { DEMO_PROFILES, buildDemoSnapshot } from "@/lib/seed";

describe("demo seed", () => {
  it("has three valid demo profiles", () => {
    for (const profile of Object.values(DEMO_PROFILES)) {
      expect(ProfileSchema.parse(profile).id).toBe(profile.id);
    }
  });

  it("builds a schema-valid sample chapter", () => {
    const snapshot = buildDemoSnapshot();
    WeekSchema.parse(snapshot.weeks[0]);
    snapshot.recipes.forEach((recipe) => RecipeSchema.parse(recipe));
    expect(snapshot.weeks[0].days).toHaveLength(7);
    expect(snapshot.recipes).toHaveLength(4);
  });
});

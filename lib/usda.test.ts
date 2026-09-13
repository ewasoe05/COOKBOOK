import { describe, expect, it, vi } from "vitest";
import { lookupIngredient, type UsdaCache } from "@/lib/usda";
import type { NutritionPerServing } from "@/lib/schemas";

const per100g: NutritionPerServing = {
  calories: 884,
  proteinG: 0,
  carbsG: 0,
  fatG: 100,
  fiberG: 0,
  sodiumMg: 0,
  addedSugarG: 0,
};

describe("USDA cache", () => {
  it("skips the network when the ingredient is already cached", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const cache: UsdaCache = {
      "olive oil": {
        query: "olive oil",
        fdcId: 171413,
        description: "Oil, olive",
        per100g,
      },
    };
    const result = await lookupIngredient("Olive oil", cache);
    expect(result?.fdcId).toBe(171413);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

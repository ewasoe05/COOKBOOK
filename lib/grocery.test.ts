import { describe, expect, it } from "vitest";
import { buildGroceryList, groceryToText } from "@/lib/grocery";
import type { Recipe } from "@/lib/schemas";

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "r1",
    title: "Test",
    emoji: "🍲",
    mealType: "dinner",
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 20,
    costEstimateUsd: 8,
    cuisine: "american",
    ingredients: [
      { name: "Chicken thighs", amount: 1, unit: "lb" },
      { name: "Olive oil", amount: 2, unit: "tbsp" },
    ],
    steps: [{ title: "Cook", text: "Cook it." }],
    nutritionPerServing: {
      calories: 400,
      proteinG: 30,
      carbsG: 10,
      fatG: 20,
      fiberG: 2,
      sodiumMg: 400,
      addedSugarG: 0,
    },
    nutritionSource: "ai_estimate",
    whyThisFitsYou: "Because tests.",
    tags: [],
    madeCount: 0,
    makeAgain: false,
    weekId: "w1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildGroceryList", () => {
  it("merges duplicate ingredients across recipes", () => {
    const list = buildGroceryList([
      recipe(),
      recipe({
        id: "r2",
        ingredients: [
          { name: "chicken thighs", amount: 0.5, unit: "lb" },
          { name: "Spinach", amount: 2, unit: "cup" },
        ],
      }),
    ]);
    const meat = list.find((section) => section.section === "Meat & Seafood");
    const chicken = meat?.items.find((item) => item.name.toLowerCase().includes("chicken"));
    expect(chicken?.amount).toBe(1.5);
  });

  it("marks pantry items inPantry and checked", () => {
    const list = buildGroceryList([recipe()], ["olive oil"]);
    const pantry = list.flatMap((section) => section.items).find((item) => item.name === "Olive oil");
    expect(pantry?.inPantry).toBe(true);
    expect(pantry?.checked).toBe(true);
  });

  it("groups produce separately", () => {
    const list = buildGroceryList([
      recipe({
        ingredients: [{ name: "Lemon", amount: 1, unit: "each" }],
      }),
    ]);
    expect(list.some((section) => section.section === "Produce")).toBe(true);
  });

  it("merges teaspoon and tablespoon of the same ingredient", () => {
    const list = buildGroceryList([
      recipe({
        ingredients: [{ name: "Olive oil", amount: 1, unit: "tsp" }],
      }),
      recipe({
        id: "r3",
        ingredients: [{ name: "olive oil", amount: 1, unit: "tbsp" }],
      }),
    ]);
    const oils = list
      .flatMap((section) => section.items)
      .filter((item) => item.name.toLowerCase() === "olive oil");
    expect(oils).toHaveLength(1);
    expect(oils[0].unit).toBe("tbsp");
    expect(oils[0].amount).toBeCloseTo(4 / 3, 2);
  });

  it("copy text omits pantry items", () => {
    const text = groceryToText(buildGroceryList([recipe()], ["olive oil"]));
    expect(text.toLowerCase()).toContain("chicken");
    expect(text.toLowerCase()).not.toContain("olive oil");
  });
});

import { describe, expect, it } from "vitest";
import { amountToGrams, scaleNutrition } from "@/lib/units";

describe("amountToGrams", () => {
  it("converts tbsp to grams", () => {
    expect(amountToGrams(2, "tbsp", "olive oil")).toBe(30);
  });

  it("converts cups of flour with a denser table", () => {
    expect(amountToGrams(1, "cup", "all-purpose flour")).toBe(120);
  });

  it("converts eggs as each", () => {
    expect(amountToGrams(2, "each", "large eggs")).toBe(100);
  });

  it("returns null for unknown countable items", () => {
    expect(amountToGrams(1, "sprig", "mystery")).toBeNull();
  });
});

describe("scaleNutrition", () => {
  it("scales per-100g values", () => {
    const scaled = scaleNutrition(
      {
        calories: 100,
        proteinG: 10,
        carbsG: 20,
        fatG: 5,
        fiberG: 2,
        sodiumMg: 200,
        addedSugarG: 1,
      },
      50,
    );
    expect(scaled.calories).toBe(50);
    expect(scaled.proteinG).toBe(5);
  });
});

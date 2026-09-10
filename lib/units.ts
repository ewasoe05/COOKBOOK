import type { NutritionPerServing } from "@/lib/schemas";

const GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  mg: 0.001,
  oz: 28.3495,
  ounce: 28.3495,
  lb: 453.592,
  pound: 453.592,
  ml: 1,
  milliliter: 1,
  l: 1000,
  liter: 1000,
  tsp: 5,
  teaspoon: 5,
  tbsp: 15,
  tablespoon: 15,
  cup: 240,
  pint: 473,
  quart: 946,
};

const EACH_GRAMS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  banana: 118,
  "chicken breast": 174,
  "chicken thigh": 120,
  onion: 110,
  "garlic clove": 3,
  clove: 3,
  lemon: 58,
  lime: 67,
  "slice bread": 30,
  slice: 30,
  avocado: 150,
  tomato: 123,
  carrot: 61,
  apple: 182,
};

export function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/\.$/, "").replace(/s$/, (m, offset, str) => {
    if (str === "cup" || str.endsWith("cup")) return "s";
    return "";
  });
}

export function amountToGrams(amount: number, unit: string, ingredientName: string): number | null {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (GRAMS[u] !== undefined) {
    let gramsPer = GRAMS[u];
    if (u === "cup") {
      const name = ingredientName.toLowerCase();
      if (name.includes("flour")) gramsPer = 120;
      else if (name.includes("sugar")) gramsPer = 200;
      else if (name.includes("oat")) gramsPer = 90;
      else if (name.includes("rice")) gramsPer = 185;
      else if (name.includes("leaf") || name.includes("spinach") || name.includes("herb")) gramsPer = 30;
    }
    return amount * gramsPer;
  }
  if (u === "clove" || u === "cloves") return amount * 3;
  if (["each", "item", "piece", "whole", "large", "medium", "small", ""].includes(u)) {
    const name = ingredientName.toLowerCase();
    for (const [key, grams] of Object.entries(EACH_GRAMS)) {
      if (name.includes(key)) return amount * grams;
    }
  }
  return null;
}

export function scaleNutrition(per100g: NutritionPerServing, grams: number): NutritionPerServing {
  const factor = grams / 100;
  return {
    calories: per100g.calories * factor,
    proteinG: per100g.proteinG * factor,
    carbsG: per100g.carbsG * factor,
    fatG: per100g.fatG * factor,
    fiberG: per100g.fiberG * factor,
    sodiumMg: per100g.sodiumMg * factor,
    addedSugarG: per100g.addedSugarG * factor,
  };
}

export function sumNutrition(parts: NutritionPerServing[]): NutritionPerServing {
  return parts.reduce(
    (acc, part) => ({
      calories: acc.calories + part.calories,
      proteinG: acc.proteinG + part.proteinG,
      carbsG: acc.carbsG + part.carbsG,
      fatG: acc.fatG + part.fatG,
      fiberG: acc.fiberG + part.fiberG,
      sodiumMg: acc.sodiumMg + part.sodiumMg,
      addedSugarG: acc.addedSugarG + part.addedSugarG,
    }),
    {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sodiumMg: 0,
      addedSugarG: 0,
    },
  );
}

export function perServing(total: NutritionPerServing, servings: number): NutritionPerServing {
  const n = Math.max(servings, 1);
  return {
    calories: total.calories / n,
    proteinG: total.proteinG / n,
    carbsG: total.carbsG / n,
    fatG: total.fatG / n,
    fiberG: total.fiberG / n,
    sodiumMg: total.sodiumMg / n,
    addedSugarG: total.addedSugarG / n,
  };
}

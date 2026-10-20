import { z } from "zod";
import {
  NutritionPerServingSchema,
  type Ingredient,
  type NutritionPerServing,
  type Recipe,
} from "@/lib/schemas";
import { amountToGrams, perServing, scaleNutrition, sumNutrition } from "@/lib/units";

const SEARCH = "https://api.nal.usda.gov/fdc/v1/foods/search";
const LOOKUP_TIMEOUT_MS = 8000;

const NUTRIENT_IDS = {
  calories: [1008, 2048],
  proteinG: [1003],
  carbsG: [1005],
  fatG: [1004],
  fiberG: [1079],
  sodiumMg: [1093],
  addedSugarG: [1235, 2000],
};

export const UsdaCacheEntrySchema = z.object({
  query: z.string(),
  fdcId: z.number(),
  description: z.string(),
  per100g: NutritionPerServingSchema,
});

export const UsdaCacheSchema = z.record(z.string(), UsdaCacheEntrySchema);

export type UsdaCacheEntry = z.infer<typeof UsdaCacheEntrySchema>;
export type UsdaCache = z.infer<typeof UsdaCacheSchema>;

const inflight = new Map<string, Promise<UsdaCacheEntry | null>>();

export function cacheKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hasUsdaKey(): boolean {
  return Boolean(process.env.USDA_API_KEY?.trim());
}

function apiKey(): string | null {
  return process.env.USDA_API_KEY?.trim() || null;
}

function nutrientValue(
  food: { foodNutrients?: { nutrientId?: number; nutrientNumber?: string; value?: number }[] },
  ids: number[],
): number {
  const nutrients = food.foodNutrients ?? [];
  for (const id of ids) {
    const match = nutrients.find(
      (n) => n.nutrientId === id || n.nutrientNumber === String(id),
    );
    if (typeof match?.value === "number") return match.value;
  }
  return 0;
}

function toPer100g(food: {
  fdcId: number;
  description?: string;
  foodNutrients?: { nutrientId?: number; nutrientNumber?: string; value?: number }[];
}): NutritionPerServing {
  return {
    calories: nutrientValue(food, NUTRIENT_IDS.calories),
    proteinG: nutrientValue(food, NUTRIENT_IDS.proteinG),
    carbsG: nutrientValue(food, NUTRIENT_IDS.carbsG),
    fatG: nutrientValue(food, NUTRIENT_IDS.fatG),
    fiberG: nutrientValue(food, NUTRIENT_IDS.fiberG),
    sodiumMg: nutrientValue(food, NUTRIENT_IDS.sodiumMg),
    addedSugarG: nutrientValue(food, NUTRIENT_IDS.addedSugarG),
  };
}

async function searchFoods(query: string, dataType: string): Promise<UsdaCacheEntry | null> {
  const key = apiKey();
  if (!key) return null;
  const url = new URL(SEARCH);
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("dataType", dataType);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      foods?: { fdcId: number; description?: string; foodNutrients?: { nutrientId?: number; value?: number }[] }[];
    };
    const food = body.foods?.[0];
    if (!food) return null;
    return {
      query,
      fdcId: food.fdcId,
      description: food.description ?? query,
      per100g: toPer100g(food),
    };
  } catch {
    return null;
  }
}

export async function lookupIngredient(
  name: string,
  cache: UsdaCache,
): Promise<UsdaCacheEntry | null> {
  const key = cacheKey(name);
  if (cache[key]) return cache[key];

  const pending = inflight.get(key);
  if (pending) {
    const shared = await pending;
    if (shared) cache[key] = shared;
    return shared;
  }

  const request = (async () => {
    const preferred = await searchFoods(name, "Foundation,SR Legacy");
    return preferred ?? (await searchFoods(name, "Branded"));
  })();
  inflight.set(key, request);
  try {
    const entry = await request;
    if (entry) cache[key] = entry;
    return entry;
  } finally {
    inflight.delete(key);
  }
}

export async function verifyRecipe(
  recipe: Recipe,
  mealCalorieTarget: number,
  cache: UsdaCache,
): Promise<Recipe> {
  let working: Recipe = { ...recipe, ingredients: recipe.ingredients.map((i) => ({ ...i })) };
  let source: Recipe["nutritionSource"] = "usda_verified";

  for (let pass = 0; pass < 3; pass += 1) {
    const parts: NutritionPerServing[] = [];
    let anyMiss = false;

    const lookedUp = await Promise.all(
      working.ingredients.map(async (ingredient) => {
        const entry = await lookupIngredient(ingredient.name, cache);
        const grams = amountToGrams(ingredient.amount, ingredient.unit, ingredient.name);
        return { ingredient, entry, grams };
      }),
    );

    const nextIngredients: Ingredient[] = [];
    for (const { ingredient, entry, grams } of lookedUp) {
      if (!entry || grams === null) {
        anyMiss = true;
        nextIngredients.push(ingredient);
        continue;
      }
      nextIngredients.push({ ...ingredient, usdaFdcId: entry.fdcId });
      parts.push(scaleNutrition(entry.per100g, grams));
    }

    working = { ...working, ingredients: nextIngredients };
    if (anyMiss || parts.length === 0) {
      source = "ai_estimate";
      break;
    }

    const verified = perServing(sumNutrition(parts), working.servings);
    working = { ...working, nutritionPerServing: roundNutrition(verified), nutritionSource: "usda_verified" };

    const delta = Math.abs(verified.calories - mealCalorieTarget) / Math.max(mealCalorieTarget, 1);
    if (delta <= 0.15 || pass === 2) {
      source = "usda_verified";
      break;
    }

    const factor = mealCalorieTarget / Math.max(verified.calories, 1);
    working = {
      ...working,
      ingredients: working.ingredients.map((ingredient) => ({
        ...ingredient,
        amount: Number((ingredient.amount * factor).toFixed(2)),
      })),
    };
  }

  return { ...working, nutritionSource: source };
}

function roundNutrition(n: NutritionPerServing): NutritionPerServing {
  return {
    calories: Math.round(n.calories),
    proteinG: Math.round(n.proteinG * 10) / 10,
    carbsG: Math.round(n.carbsG * 10) / 10,
    fatG: Math.round(n.fatG * 10) / 10,
    fiberG: Math.round(n.fiberG * 10) / 10,
    sodiumMg: Math.round(n.sodiumMg),
    addedSugarG: Math.round(n.addedSugarG * 10) / 10,
  };
}

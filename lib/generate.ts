import Anthropic from "@anthropic-ai/sdk";
import { ClaudeWeekSchema, RecipeSchema, type Profile, type Recipe, type Week } from "@/lib/schemas";
import { computeTargets, mealMacroWindows } from "@/lib/nutrition";
import { buildGroceryList } from "@/lib/grocery";
import { verifyRecipe, type UsdaCache } from "@/lib/usda";
import { z } from "zod";

const MODEL = "claude-sonnet-4-6";

function client(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function voice(intent: Profile["intent"]): string {
  if (intent === "performance") {
    return "Voice: concise, macro-forward, batch-friendly. whyThisFitsYou MUST mention protein and calories.";
  }
  if (intent === "managed") {
    return "Voice: reassuring, explain guardrails in plain language, avoid diet-culture words like 'cheat' or 'cleanse'. whyThisFitsYou must never scold.";
  }
  return "Voice: warm and simple. whyThisFitsYou must NEVER mention numbers, calories, or macros. Favor familiar comfort food done healthier.";
}

export function buildWeekPrompt(
  profile: Profile,
  extras: { liked: string[]; disliked: string[]; pantry: string[]; weekNumber: number },
): string {
  const targets = computeTargets(profile);
  const windows = mealMacroWindows(targets);
  const allergies = profile.allergies.length ? profile.allergies.join(", ") : "none";
  return [
    `Create a full 7-day cookbook chapter (Week ${extras.weekNumber}) as JSON only. No markdown fences.`,
    `Profile: ${JSON.stringify(profile)}`,
    `Computed targets: ${JSON.stringify(targets)}`,
    `Per-meal calorie windows (±12%): ${JSON.stringify(windows)}`,
    `ALLERGIES ARE AN ABSOLUTE PROHIBITION AND MUST NEVER APPEAR IN ANY INGREDIENT: ${allergies}.`,
    `Restated: do not use these allergens in any amount, garnish, oil, or sauce: ${allergies}.`,
    `Dislikes: ${profile.dislikes.join(", ") || "none"}`,
    `Liked cuisines: ${profile.likedCuisines.join(", ") || "any"}`,
    `Spice: ${profile.spice}. Max cook minutes per meal: ${profile.maxCookMinutes}. cookMinutes MUST be <= ${profile.maxCookMinutes}. Skill: ${profile.skill}.`,
    `Each day's meals must sum to within ±5% of the daily calorie target (${targets.calories} kcal).`,
    `Use ONLY this equipment: ${profile.equipment.join(", ") || "stovetop"}.`,
    profile.weeklyBudgetUsd ? `Rough weekly grocery budget: $${profile.weeklyBudgetUsd}.` : "",
    `Servings default to householdSize ${profile.householdSize}. Batch-cooked recipes may use servings = householdSize * 2 and be reused across days. ${profile.intent === "performance" ? "Encourage batching." : ""}`,
    voice(profile.intent),
    extras.liked.length ? `Lean toward meals like: ${extras.liked.join("; ")}` : "",
    extras.disliked.length ? `Avoid meals like: ${extras.disliked.join("; ")}` : "",
    extras.pantry.length ? `Pantry already has: ${extras.pantry.join(", ")}` : "",
    profile.intent === "performance"
      ? "Variety: protein source or cuisine may repeat for batching."
      : "Variety: no protein source or cuisine more than 3 times in the week.",
    "Each recipe needs: title, emoji (a single food emoji), mealType, servings, prepMinutes, cookMinutes, costEstimateUsd, cuisine, ingredients[{name,amount,unit}], steps[{title,text,timerSeconds?}], nutritionPerServing{calories,proteinG,carbsG,fatG,fiberG,sodiumMg,addedSugarG}, nutritionSource 'ai_estimate', whyThisFitsYou, tags.",
    "Repeat ingredient quantities inside step text.",
    "days: 7 entries, day 0-6. meals[].recipeId must match a recipe id you assign (use stable slugs like d0-breakfast).",
    "Also include summary: two sentences introducing the week.",
    'Return shape: { "summary": string, "recipes": Recipe[], "days": [{ "day": 0-6, "meals": [{ "mealType": "breakfast"|"lunch"|"dinner"|"snack", "recipeId": string }] }] }',
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Claude returned no JSON object");
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function ask(system: string, user: string): Promise<string> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") throw new Error("Empty Claude response");
  return block.text;
}

export async function generateWeekFromClaude(
  profile: Profile,
  extras: {
    liked: string[];
    disliked: string[];
    pantry: string[];
    weekNumber: number;
    usdaCache?: UsdaCache;
  },
): Promise<{ week: Week; recipes: Recipe[]; usdaCache: UsdaCache }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }
  const targets = computeTargets(profile);
  const windows = mealMacroWindows(targets);
  const system = "You are a professional cookbook author. Output valid JSON only.";
  let raw = await ask(system, buildWeekPrompt(profile, extras));
  let parsed = ClaudeWeekSchema.safeParse(extractJson(raw));
  if (!parsed.success) {
    raw = await ask(
      system,
      `Your previous JSON failed validation. Fix these issues and return JSON only:\n${parsed.error.message}\n\nPrevious output:\n${raw}`,
    );
    parsed = ClaudeWeekSchema.safeParse(extractJson(raw));
    if (!parsed.success) {
      throw new Error(`Week JSON invalid after repair: ${parsed.error.message}`);
    }
  }

  const weekId = crypto.randomUUID();
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  const recipes: Recipe[] = [];
  const cache: UsdaCache = { ...(extras.usdaCache ?? {}) };
  console.info("[usda] seeded cache entries", Object.keys(cache).length);

  for (const draft of parsed.data.recipes) {
    const newId = crypto.randomUUID();
    idMap.set(draft.id, newId);
    if (draft.cookMinutes > profile.maxCookMinutes) {
      throw new Error(
        `"${draft.title}" cook time ${draft.cookMinutes} min exceeds max ${profile.maxCookMinutes}`,
      );
    }
    let recipe: Recipe = RecipeSchema.parse({
      ...draft,
      id: newId,
      weekId,
      createdAt: now,
      madeCount: 0,
      makeAgain: false,
      servings: draft.servings || profile.householdSize,
    });
    const window = windows[recipe.mealType];
    recipe = await verifyRecipe(recipe, window.target, cache);
    if (profile.allergies.some((allergy) => allergenInRecipe(recipe, allergy))) {
      throw new Error(`Generated recipe "${recipe.title}" contains allergen "${profile.allergies.join(", ")}"`);
    }
    recipes.push(recipe);
  }

  const days = parsed.data.days.map((day) => ({
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      recipeId: idMap.get(meal.recipeId) ?? meal.recipeId,
    })),
  }));

  const week: Week = {
    id: weekId,
    number: extras.weekNumber,
    createdAt: now,
    profileSnapshot: profile,
    targets,
    days,
    groceryList: buildGroceryList(recipes, extras.pantry),
    summary: parsed.data.summary,
  };

  return { week, recipes, usdaCache: cache };
}

const SingleRecipeSchema = RecipeSchema.omit({
  id: true,
  weekId: true,
  createdAt: true,
  rating: true,
}).extend({
  id: z.string().optional(),
  madeCount: z.number().optional(),
  makeAgain: z.boolean().optional(),
});

export async function regenerateMealFromClaude(input: {
  profile: Profile;
  oldTitle: string;
  mealType: Recipe["mealType"];
  weekId: string;
  pantry: string[];
  liked: string[];
  disliked: string[];
  usdaCache?: UsdaCache;
}): Promise<{ recipe: Recipe; usdaCache: UsdaCache }> {
  const targets = computeTargets(input.profile);
  const window = mealMacroWindows(targets)[input.mealType];
  const allergies = input.profile.allergies.join(", ") || "none";
  const user = [
    `Replace one ${input.mealType} recipe. Not like: ${input.oldTitle}.`,
    `Profile: ${JSON.stringify(input.profile)}`,
    `Targets: ${JSON.stringify(targets)}`,
    `Meal calorie window: ${JSON.stringify(window)}`,
    `ALLERGIES NEVER: ${allergies}. Again: never use ${allergies}.`,
    `cookMinutes MUST be <= ${input.profile.maxCookMinutes}.`,
    voice(input.profile.intent),
    `JSON only: a single recipe object matching the recipe schema fields (title, emoji, mealType "${input.mealType}", servings, prepMinutes, cookMinutes, costEstimateUsd, cuisine, ingredients, steps, nutritionPerServing, nutritionSource, whyThisFitsYou, tags).`,
  ].join("\n");
  let raw = await ask("You are a professional cookbook author. Output valid JSON only.", user);
  let parsed = SingleRecipeSchema.safeParse(extractJson(raw));
  if (!parsed.success) {
    raw = await ask(
      "You are a professional cookbook author. Output valid JSON only.",
      `Fix validation errors and return one recipe JSON:\n${parsed.error.message}\n\n${raw}`,
    );
    parsed = SingleRecipeSchema.safeParse(extractJson(raw));
    if (!parsed.success) throw new Error(parsed.error.message);
  }
  const cache: UsdaCache = { ...(input.usdaCache ?? {}) };
  let recipe = RecipeSchema.parse({
    ...parsed.data,
    id: crypto.randomUUID(),
    weekId: input.weekId,
    createdAt: new Date().toISOString(),
    madeCount: 0,
    makeAgain: false,
    mealType: input.mealType,
  });
  recipe = await verifyRecipe(recipe, window.target, cache);
  if (recipe.cookMinutes > input.profile.maxCookMinutes) {
    throw new Error(
      `"${recipe.title}" cook time ${recipe.cookMinutes} min exceeds max ${input.profile.maxCookMinutes}`,
    );
  }
  if (input.profile.allergies.some((allergy) => allergenInRecipe(recipe, allergy))) {
    throw new Error(`Replacement "${recipe.title}" contains a listed allergen`);
  }
  if (recipe.title.toLowerCase() === input.oldTitle.toLowerCase()) {
    throw new Error("Replacement meal matched the old title");
  }
  return { recipe, usdaCache: cache };
}

function allergenInRecipe(recipe: Recipe, allergy: string): boolean {
  const needle = allergy.trim().toLowerCase();
  if (!needle) return false;
  return recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(needle));
}

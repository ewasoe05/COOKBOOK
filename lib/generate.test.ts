import { describe, expect, it } from "vitest";
import { ClaudeDaySchema } from "@/lib/schemas";
import { DEMO_PROFILES } from "@/lib/seed";
import { buildDayPrompt, buildWeekPrompt } from "@/lib/generate";

describe("day prompt", () => {
  it("asks for only one named day and a week summary on Sunday", () => {
    const prompt = buildDayPrompt(DEMO_PROFILES.parent, {
      liked: ["Tacos"],
      disliked: ["Liver"],
      pantry: ["rice"],
      weekNumber: 1,
      day: 0,
      previousTitles: [],
    });
    expect(prompt).toContain("Sunday");
    expect(prompt).toContain("day 0");
    expect(prompt).toContain("two sentences introducing the whole week");
    expect(prompt).not.toContain("Create a full 7-day");
  });

  it("lists already-written titles so later days stay varied", () => {
    const prompt = buildDayPrompt(DEMO_PROFILES.lifter, {
      liked: [],
      disliked: [],
      pantry: [],
      weekNumber: 1,
      day: 3,
      previousTitles: ["Skillet eggs and oats", "Chicken bowls"],
    });
    expect(prompt).toContain("Wednesday");
    expect(prompt).toContain("Skillet eggs and oats");
    expect(prompt).toContain("Do not include a week summary");
  });

  it("still has a full-week prompt for repair tooling", () => {
    expect(buildWeekPrompt(DEMO_PROFILES.managed, {
      liked: [],
      disliked: [],
      pantry: [],
      weekNumber: 2,
    })).toContain("7-day");
  });
});

describe("ClaudeDaySchema", () => {
  it("accepts a four-meal day", () => {
    const recipe = {
      id: "d1-breakfast",
      title: "Oats",
      emoji: "🥣",
      mealType: "breakfast",
      servings: 2,
      prepMinutes: 5,
      cookMinutes: 10,
      costEstimateUsd: 2,
      cuisine: "american",
      ingredients: [{ name: "Oats", amount: 80, unit: "g" }],
      steps: [{ title: "Cook", text: "Simmer 80 g oats." }],
      nutritionPerServing: {
        calories: 400,
        proteinG: 20,
        carbsG: 50,
        fatG: 10,
        fiberG: 6,
        sodiumMg: 100,
        addedSugarG: 0,
      },
      nutritionSource: "ai_estimate",
      whyThisFitsYou: "Familiar breakfast.",
      tags: ["quick"],
    };
    const parsed = ClaudeDaySchema.parse({
      recipes: [
        recipe,
        { ...recipe, id: "d1-lunch", title: "Lunch", mealType: "lunch" },
        { ...recipe, id: "d1-dinner", title: "Dinner", mealType: "dinner" },
        { ...recipe, id: "d1-snack", title: "Snack", mealType: "snack" },
      ],
      meals: [
        { mealType: "breakfast", recipeId: "d1-breakfast" },
        { mealType: "lunch", recipeId: "d1-lunch" },
        { mealType: "dinner", recipeId: "d1-dinner" },
        { mealType: "snack", recipeId: "d1-snack" },
      ],
    });
    expect(parsed.recipes).toHaveLength(4);
  });
});

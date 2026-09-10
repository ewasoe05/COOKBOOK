import { describe, expect, it } from "vitest";
import {
  calorieFloor,
  computeBmr,
  computeTargets,
  dayCalorieWindow,
  mealCalorieWindow,
  mealShare,
} from "@/lib/nutrition";
import type { Profile } from "@/lib/schemas";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "test",
    createdAt: "2026-01-01T00:00:00.000Z",
    intent: "everyday",
    sex: "female",
    age: 30,
    heightCm: 165,
    weightKg: 70,
    activity: "moderate",
    goal: "maintain",
    dietaryPattern: "none",
    allergies: [],
    dislikes: [],
    likedCuisines: ["italian"],
    spice: "mild",
    maxCookMinutes: 45,
    skill: "comfortable",
    equipment: ["oven", "stovetop"],
    householdSize: 2,
    guardrails: [],
    showNumbers: false,
    unitSystem: "metric",
    ...overrides,
  };
}

describe("Mifflin-St Jeor BMR", () => {
  it("computes male BMR", () => {
    const bmr = computeBmr({ sex: "male", age: 25, heightCm: 180, weightKg: 80 });
    expect(bmr).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 25 + 5, 5);
  });

  it("computes female BMR", () => {
    const bmr = computeBmr({ sex: "female", age: 25, heightCm: 180, weightKg: 80 });
    expect(bmr).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 25 - 161, 5);
  });

  it("averages male and female BMR when sex is unspecified", () => {
    const male = computeBmr({ sex: "male", age: 40, heightCm: 170, weightKg: 70 });
    const female = computeBmr({ sex: "female", age: 40, heightCm: 170, weightKg: 70 });
    const mixed = computeBmr({ sex: "unspecified", age: 40, heightCm: 170, weightKg: 70 });
    expect(mixed).toBeCloseTo((male + female) / 2, 5);
  });
});

describe("calorie floors", () => {
  it("uses 1200 for female", () => {
    expect(calorieFloor("female")).toBe(1200);
  });

  it("uses 1500 for male", () => {
    expect(calorieFloor("male")).toBe(1500);
  });

  it("uses 1350 for unspecified", () => {
    expect(calorieFloor("unspecified")).toBe(1350);
  });

  it("never drops a fast-losing small female below 1200", () => {
    const targets = computeTargets(
      profile({
        sex: "female",
        weightKg: 45,
        heightCm: 150,
        age: 60,
        activity: "sedentary",
        goal: "lose",
        pace: "fast",
      }),
    );
    expect(targets.calories).toBeGreaterThanOrEqual(1200);
  });

  it("never drops a fast-losing small male below 1500", () => {
    const targets = computeTargets(
      profile({
        sex: "male",
        weightKg: 50,
        heightCm: 155,
        age: 70,
        activity: "sedentary",
        goal: "lose",
        pace: "fast",
      }),
    );
    expect(targets.calories).toBeGreaterThanOrEqual(1500);
  });
});

describe("goal calorie adjustments", () => {
  const base = profile({
    sex: "male",
    age: 30,
    heightCm: 178,
    weightKg: 82,
    activity: "moderate",
  });

  it("maintain equals TDEE", () => {
    const targets = computeTargets({ ...base, goal: "maintain" });
    expect(targets.calories).toBe(targets.tdee);
  });

  it("eat_better equals TDEE", () => {
    const targets = computeTargets({ ...base, goal: "eat_better" });
    expect(targets.calories).toBe(targets.tdee);
  });

  it("lose slow is TDEE minus 250", () => {
    const maintain = computeTargets({ ...base, goal: "maintain" });
    const lose = computeTargets({ ...base, goal: "lose", pace: "slow" });
    expect(lose.calories).toBe(maintain.calories - 250);
  });

  it("lose moderate is TDEE minus 500", () => {
    const maintain = computeTargets({ ...base, goal: "maintain" });
    const lose = computeTargets({ ...base, goal: "lose", pace: "moderate" });
    expect(lose.calories).toBe(maintain.calories - 500);
  });

  it("lose fast is TDEE minus 750", () => {
    const maintain = computeTargets({ ...base, goal: "maintain" });
    const lose = computeTargets({ ...base, goal: "lose", pace: "fast" });
    expect(lose.calories).toBe(maintain.calories - 750);
  });

  it("gain slow is TDEE plus 250", () => {
    const maintain = computeTargets({ ...base, goal: "maintain" });
    const gain = computeTargets({ ...base, goal: "gain", pace: "slow" });
    expect(gain.calories).toBe(maintain.calories + 250);
  });

  it("gain moderate is TDEE plus 400", () => {
    const maintain = computeTargets({ ...base, goal: "maintain" });
    const gain = computeTargets({ ...base, goal: "gain", pace: "moderate" });
    expect(gain.calories).toBe(maintain.calories + 400);
  });

  it("gain fast is TDEE plus 600", () => {
    const maintain = computeTargets({ ...base, goal: "maintain" });
    const gain = computeTargets({ ...base, goal: "gain", pace: "fast" });
    expect(gain.calories).toBe(maintain.calories + 600);
  });

  it("defaults missing lose/gain pace to moderate", () => {
    const explicit = computeTargets({ ...base, goal: "lose", pace: "moderate" });
    const implied = computeTargets({ ...base, goal: "lose", pace: undefined });
    expect(implied.calories).toBe(explicit.calories);
  });
});

describe("activity multipliers", () => {
  it("uses 1.2 for sedentary TDEE", () => {
    const p = profile({ activity: "sedentary", goal: "maintain" });
    const targets = computeTargets(p);
    expect(targets.tdee).toBe(Math.round(computeBmr(p) * 1.2));
  });

  it("uses 1.375 for light TDEE", () => {
    const p = profile({ activity: "light", goal: "maintain" });
    const targets = computeTargets(p);
    expect(targets.tdee).toBe(Math.round(computeBmr(p) * 1.375));
  });

  it("uses 1.9 for very_active TDEE", () => {
    const p = profile({ activity: "very_active", goal: "maintain" });
    const targets = computeTargets(p);
    expect(targets.tdee).toBe(Math.round(computeBmr(p) * 1.9));
  });
});

describe("protein by intent", () => {
  it("sets everyday protein at 1.4 g/kg", () => {
    const targets = computeTargets(profile({ intent: "everyday", weightKg: 70, goal: "maintain" }));
    expect(targets.proteinG).toBe(98);
  });

  it("sets managed protein at 1.4 g/kg", () => {
    const targets = computeTargets(profile({ intent: "managed", weightKg: 80, goal: "maintain" }));
    expect(targets.proteinG).toBe(112);
  });

  it("sets performance lose protein at 2.2 g/kg", () => {
    const targets = computeTargets(
      profile({
        intent: "performance",
        goal: "lose",
        pace: "slow",
        weightKg: 80,
        activity: "active",
        showNumbers: true,
      }),
    );
    expect(targets.proteinG).toBe(176);
  });

  it("sets performance gain protein at 2.0 g/kg", () => {
    const targets = computeTargets(
      profile({
        intent: "performance",
        goal: "gain",
        pace: "moderate",
        weightKg: 80,
        activity: "active",
        showNumbers: true,
      }),
    );
    expect(targets.proteinG).toBe(160);
  });

  it("caps protein at 40% of calories", () => {
    const targets = computeTargets(
      profile({
        intent: "performance",
        goal: "lose",
        pace: "fast",
        sex: "female",
        weightKg: 120,
        heightCm: 160,
        activity: "sedentary",
        showNumbers: true,
      }),
    );
    expect(targets.proteinG * 4).toBeLessThanOrEqual(targets.calories * 0.4 + 4);
  });
});

describe("macros and guardrails", () => {
  it("sets fat near 28% of calories for non-keto", () => {
    const targets = computeTargets(profile({ dietaryPattern: "none" }));
    const fatShare = (targets.fatG * 9) / targets.calories;
    expect(fatShare).toBeGreaterThan(0.25);
    expect(fatShare).toBeLessThan(0.32);
  });

  it("keeps keto carbs at or under 25 g", () => {
    const targets = computeTargets(profile({ dietaryPattern: "keto", goal: "maintain" }));
    expect(targets.carbsG).toBeLessThanOrEqual(25);
  });

  it("sets fiber at 14 g per 1000 kcal", () => {
    const targets = computeTargets(profile());
    expect(targets.fiberG).toBe(Math.round((targets.calories / 1000) * 14));
  });

  it("raises fiber 1.3x for high_fiber guardrail", () => {
    const plain = computeTargets(profile({ guardrails: [] }));
    const high = computeTargets(profile({ guardrails: ["high_fiber"] }));
    expect(high.fiberG).toBe(Math.round(plain.fiberG * 1.3));
  });

  it("sets sodium max 1500 for low_sodium", () => {
    const targets = computeTargets(profile({ guardrails: ["low_sodium"], intent: "managed" }));
    expect(targets.sodiumMgMax).toBe(1500);
  });

  it("sets added sugar max 25 for low_sugar", () => {
    const targets = computeTargets(profile({ guardrails: ["low_sugar"], intent: "managed" }));
    expect(targets.addedSugarGMax).toBe(25);
  });

  it("caps carbs at 100 g for low_carb", () => {
    const targets = computeTargets(
      profile({
        guardrails: ["low_carb"],
        activity: "very_active",
        goal: "gain",
        pace: "fast",
        sex: "male",
        weightKg: 90,
      }),
    );
    expect(targets.carbsG).toBeLessThanOrEqual(100);
  });

  it("omits sodium and sugar caps when guardrails are empty", () => {
    const targets = computeTargets(profile({ guardrails: [] }));
    expect(targets.sodiumMgMax).toBeUndefined();
    expect(targets.addedSugarGMax).toBeUndefined();
  });
});

describe("meal windows", () => {
  it("splits meals 25/30/35/10", () => {
    expect(mealShare("breakfast") + mealShare("lunch") + mealShare("dinner") + mealShare("snack")).toBeCloseTo(1);
  });

  it("applies ±12% per meal", () => {
    const window = mealCalorieWindow(2000, "lunch");
    expect(window.target).toBe(600);
    expect(window.min).toBe(Math.round(600 * 0.88));
    expect(window.max).toBe(Math.round(600 * 1.12));
  });

  it("applies ±5% per day", () => {
    const window = dayCalorieWindow(2000);
    expect(window.min).toBe(1900);
    expect(window.max).toBe(2100);
  });
});

describe("intent voice in rationale", () => {
  it("mentions numbers for performance", () => {
    const targets = computeTargets(profile({ intent: "performance", showNumbers: true }));
    expect(targets.rationale).toMatch(/\d+ kcal/);
  });

  it("avoids tracking language for everyday", () => {
    const targets = computeTargets(profile({ intent: "everyday" }));
    expect(targets.rationale.toLowerCase()).toContain("won't need to track");
  });

  it("mentions guardrails for managed", () => {
    const targets = computeTargets(profile({ intent: "managed", guardrails: ["low_sodium"] }));
    expect(targets.rationale.toLowerCase()).toContain("guardrail");
  });
});

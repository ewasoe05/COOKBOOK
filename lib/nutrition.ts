import type { MealType, Profile, Targets } from "@/lib/schemas";

const ACTIVITY: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const MEAL_SPLIT: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.35,
  snack: 0.1,
};

export const MEAL_TOLERANCE = 0.12;
export const DAY_TOLERANCE = 0.05;

function round(value: number): number {
  return Math.round(value);
}

function mifflin(weightKg: number, heightCm: number, age: number, offset: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + offset;
}

export function computeBmr(profile: Pick<Profile, "sex" | "age" | "heightCm" | "weightKg">): number {
  const male = mifflin(profile.weightKg, profile.heightCm, profile.age, 5);
  const female = mifflin(profile.weightKg, profile.heightCm, profile.age, -161);
  if (profile.sex === "male") return male;
  if (profile.sex === "female") return female;
  return (male + female) / 2;
}

export function calorieFloor(sex: Profile["sex"]): number {
  if (sex === "female") return 1200;
  if (sex === "male") return 1500;
  return 1350;
}

function calorieDelta(profile: Profile): number {
  if (profile.goal === "maintain" || profile.goal === "eat_better") {
    return 0;
  }
  const pace = profile.pace ?? "moderate";
  if (profile.goal === "lose") {
    if (pace === "slow") return -250;
    if (pace === "fast") return -750;
    return -500;
  }
  if (pace === "slow") return 250;
  if (pace === "fast") return 600;
  return 400;
}

function proteinPerKg(profile: Profile): number {
  if (profile.intent === "performance") {
    return profile.goal === "lose" ? 2.2 : 2.0;
  }
  return 1.4;
}

export function mealShare(meal: MealType): number {
  return MEAL_SPLIT[meal];
}

export function mealCalorieWindow(
  dailyCalories: number,
  meal: MealType,
): { target: number; min: number; max: number } {
  const target = dailyCalories * MEAL_SPLIT[meal];
  return {
    target: round(target),
    min: round(target * (1 - MEAL_TOLERANCE)),
    max: round(target * (1 + MEAL_TOLERANCE)),
  };
}

export function dayCalorieWindow(dailyCalories: number): { min: number; max: number } {
  return {
    min: round(dailyCalories * (1 - DAY_TOLERANCE)),
    max: round(dailyCalories * (1 + DAY_TOLERANCE)),
  };
}

function rationaleFor(profile: Profile, calories: number, tdee: number): string {
  const rounded = round(calories);
  if (profile.intent === "performance") {
    const verb =
      profile.goal === "lose"
        ? "a cut"
        : profile.goal === "gain"
          ? "a surplus"
          : "maintenance";
    return `Targets ${rounded} kcal for ${verb} from a ${round(tdee)} kcal TDEE, with protein set for training.`;
  }
  if (profile.intent === "managed") {
    return `We'll keep meals around ${rounded} calories a day and stay inside your health guardrails — no tracking required.`;
  }
  return `We'll build you meals around roughly ${rounded} calories a day — you won't need to track anything.`;
}

export function computeTargets(profile: Profile): Targets {
  const bmr = computeBmr(profile);
  const tdee = bmr * ACTIVITY[profile.activity];
  const floor = calorieFloor(profile.sex);
  const calories = Math.max(tdee + calorieDelta(profile), floor);

  const proteinCapG = (calories * 0.4) / 4;
  const proteinG = Math.min(profile.weightKg * proteinPerKg(profile), proteinCapG);

  const keto = profile.dietaryPattern === "keto";
  const lowCarb = keto || profile.guardrails.includes("low_carb");

  let fatG: number;
  let carbsG: number;

  if (keto) {
    const proteinKcal = proteinG * 4;
    const carbsGTarget = 25;
    const carbsKcal = carbsGTarget * 4;
    let fatKcal = calories * 0.7;
    const leftover = calories - proteinKcal - carbsKcal;
    fatKcal = Math.min(fatKcal, Math.max(leftover, calories * 0.55));
    fatG = fatKcal / 9;
    carbsG = Math.min(carbsGTarget, Math.max(0, (calories - proteinKcal - fatG * 9) / 4));
  } else {
    fatG = (calories * 0.28) / 9;
    carbsG = Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4);
    if (lowCarb && carbsG > 100) {
      const extraKcal = (carbsG - 100) * 4;
      carbsG = 100;
      fatG += extraKcal / 9;
    }
  }

  let fiberG = (calories / 1000) * 14;
  if (profile.guardrails.includes("high_fiber")) {
    fiberG *= 1.3;
  }

  const targets: Targets = {
    bmr: round(bmr),
    tdee: round(tdee),
    calories: round(calories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    fiberG: round(fiberG),
    rationale: rationaleFor(profile, calories, tdee),
  };

  if (profile.guardrails.includes("low_sodium")) {
    targets.sodiumMgMax = 1500;
  }
  if (profile.guardrails.includes("low_sugar")) {
    targets.addedSugarGMax = 25;
  }

  return targets;
}

export function mealMacroWindows(targets: Targets) {
  return {
    breakfast: mealCalorieWindow(targets.calories, "breakfast"),
    lunch: mealCalorieWindow(targets.calories, "lunch"),
    dinner: mealCalorieWindow(targets.calories, "dinner"),
    snack: mealCalorieWindow(targets.calories, "snack"),
    day: dayCalorieWindow(targets.calories),
  };
}

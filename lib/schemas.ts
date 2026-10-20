import { z } from "zod";

export const IntentSchema = z.enum(["performance", "everyday", "managed"]);
export const SexSchema = z.enum(["male", "female", "unspecified"]);
export const ActivitySchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const GoalSchema = z.enum(["lose", "maintain", "gain", "eat_better"]);
export const PaceSchema = z.enum(["slow", "moderate", "fast"]);
export const DietaryPatternSchema = z.enum([
  "none",
  "vegetarian",
  "vegan",
  "pescatarian",
  "halal",
  "kosher",
  "keto",
  "paleo",
  "mediterranean",
]);
export const SpiceSchema = z.enum(["none", "mild", "medium", "hot"]);
export const MaxCookMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
  z.literal(60),
  z.literal(90),
]);
export const SkillSchema = z.enum(["beginner", "comfortable", "confident"]);
export const UnitSystemSchema = z.enum(["imperial", "metric"]);
export const MealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export const NutritionSourceSchema = z.enum(["usda_verified", "ai_estimate"]);
export const RatingSchema = z.enum(["up", "down"]);
export const EnergySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const EQUIPMENT_OPTIONS = [
  "oven",
  "stovetop",
  "air_fryer",
  "slow_cooker",
  "microwave",
  "blender",
  "grill",
] as const;

export const GUARDRAIL_OPTIONS = [
  "low_sodium",
  "low_sugar",
  "low_carb",
  "high_fiber",
] as const;

export const ProfileSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  intent: IntentSchema,
  sex: SexSchema,
  age: z.number().int().min(13).max(100),
  heightCm: z.number().positive().max(250),
  weightKg: z.number().positive().max(400),
  activity: ActivitySchema,
  goal: GoalSchema,
  pace: PaceSchema.optional(),
  dietaryPattern: DietaryPatternSchema,
  allergies: z.array(z.string()),
  dislikes: z.array(z.string()),
  likedCuisines: z.array(z.string()),
  spice: SpiceSchema,
  maxCookMinutes: MaxCookMinutesSchema,
  skill: SkillSchema,
  equipment: z.array(z.string()),
  weeklyBudgetUsd: z.number().positive().optional(),
  householdSize: z.number().int().min(1).max(12),
  guardrails: z.array(z.string()),
  showNumbers: z.boolean(),
  unitSystem: UnitSystemSchema,
});

export const TargetsSchema = z.object({
  bmr: z.number(),
  tdee: z.number(),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number(),
  sodiumMgMax: z.number().optional(),
  addedSugarGMax: z.number().optional(),
  rationale: z.string().min(1),
});

export const IngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  unit: z.string().min(1),
  usdaFdcId: z.number().optional(),
});

export const StepSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  timerSeconds: z.number().int().positive().optional(),
});

export const NutritionPerServingSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number(),
  sodiumMg: z.number(),
  addedSugarG: z.number(),
});

export const RecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1),
  mealType: MealTypeSchema,
  servings: z.number().positive(),
  prepMinutes: z.number().nonnegative(),
  cookMinutes: z.number().nonnegative(),
  costEstimateUsd: z.number().nonnegative(),
  cuisine: z.string().min(1),
  ingredients: z.array(IngredientSchema).min(1),
  steps: z.array(StepSchema).min(1),
  nutritionPerServing: NutritionPerServingSchema,
  nutritionSource: NutritionSourceSchema,
  whyThisFitsYou: z.string().min(1),
  tags: z.array(z.string()),
  rating: RatingSchema.optional(),
  madeCount: z.number().int().nonnegative(),
  makeAgain: z.boolean(),
  weekId: z.string().min(1),
  createdAt: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const GroceryItemSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nonnegative(),
  unit: z.string().min(1),
  checked: z.boolean(),
  inPantry: z.boolean(),
});

export const GrocerySectionSchema = z.object({
  section: z.string().min(1),
  items: z.array(GroceryItemSchema),
});

export const WeekDaySchema = z.object({
  day: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  meals: z.array(
    z.object({
      mealType: z.string().min(1),
      recipeId: z.string().min(1),
    }),
  ),
});

export const WeekSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  createdAt: z.string().min(1),
  profileSnapshot: ProfileSchema,
  targets: TargetsSchema,
  days: z.array(WeekDaySchema).length(7),
  groceryList: z.array(GrocerySectionSchema),
  summary: z.string().min(1),
});

export const CheckInSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  weightKg: z.number().positive().optional(),
  energy: EnergySchema,
  hunger: EnergySchema,
  note: z.string().optional(),
});

export const ClaudeRecipeSchema = RecipeSchema.omit({
  id: true,
  weekId: true,
  createdAt: true,
  rating: true,
  madeCount: true,
  makeAgain: true,
}).extend({
  id: z.string().min(1),
  madeCount: z.number().int().nonnegative().optional(),
  makeAgain: z.boolean().optional(),
});

export const ClaudeWeekSchema = z.object({
  summary: z.string().min(1),
  recipes: z.array(ClaudeRecipeSchema).min(1),
  days: z.array(WeekDaySchema).length(7),
});

export const ClaudeDaySchema = z.object({
  summary: z.string().min(1).optional(),
  recipes: z.array(ClaudeRecipeSchema).min(3).max(6),
  meals: z.array(
    z.object({
      mealType: z.string().min(1),
      recipeId: z.string().min(1),
    }),
  ).min(3),
});

export type Intent = z.infer<typeof IntentSchema>;
export type Sex = z.infer<typeof SexSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Pace = z.infer<typeof PaceSchema>;
export type MealType = z.infer<typeof MealTypeSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Targets = z.infer<typeof TargetsSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type Week = z.infer<typeof WeekSchema>;
export type CheckIn = z.infer<typeof CheckInSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type NutritionPerServing = z.infer<typeof NutritionPerServingSchema>;
export type ClaudeWeek = z.infer<typeof ClaudeWeekSchema>;
export type ClaudeDay = z.infer<typeof ClaudeDaySchema>;

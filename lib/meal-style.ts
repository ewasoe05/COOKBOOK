import type { MealType } from "@/lib/schemas";

export function mealBandClass(meal: MealType): string {
  switch (meal) {
    case "breakfast":
      return "bg-meal-breakfast";
    case "lunch":
      return "bg-meal-lunch";
    case "dinner":
      return "bg-meal-dinner";
    case "snack":
      return "bg-meal-snack";
  }
}

import type { Profile, Recipe, Week } from "@/lib/schemas";
import { computeTargets } from "@/lib/nutrition";
import { buildGroceryList } from "@/lib/grocery";

export function assembleWeek(input: {
  weekId: string;
  weekNumber: number;
  createdAt: string;
  profile: Profile;
  summary: string;
  days: Week["days"];
  recipes: Recipe[];
  pantry: string[];
}): Week {
  return {
    id: input.weekId,
    number: input.weekNumber,
    createdAt: input.createdAt,
    profileSnapshot: input.profile,
    targets: computeTargets(input.profile),
    days: input.days,
    groceryList: buildGroceryList(input.recipes, input.pantry),
    summary: input.summary,
  };
}

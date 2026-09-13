import { del, get, set } from "idb-keyval";
import type { CheckIn, Profile, Recipe, Week } from "@/lib/schemas";
import {
  CheckInSchema,
  ProfileSchema,
  RecipeSchema,
  WeekSchema,
} from "@/lib/schemas";
import { UsdaCacheSchema, type UsdaCache } from "@/lib/usda";
import { z } from "zod";

const KEYS = {
  profile: "adaptive-cookbook.profile",
  weeks: "adaptive-cookbook.weeks",
  recipes: "adaptive-cookbook.recipes",
  checkIns: "adaptive-cookbook.checkins",
  pantry: "adaptive-cookbook.pantry",
  usda: "adaptive-cookbook.usda",
  onboarding: "adaptive-cookbook.onboarding",
} as const;

export type CookbookSnapshot = {
  profile: Profile | null;
  weeks: Week[];
  recipes: Recipe[];
  checkIns: CheckIn[];
  pantry: string[];
  usdaCache: UsdaCache;
};

const emptySnapshot = (): CookbookSnapshot => ({
  profile: null,
  weeks: [],
  recipes: [],
  checkIns: [],
  pantry: [],
  usdaCache: {},
});

async function readJson<T>(key: string, fallback: T, schema: z.ZodType<T>): Promise<T> {
  const raw = await get(key);
  if (raw === undefined) return fallback;
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : fallback;
}

export async function loadSnapshot(): Promise<CookbookSnapshot> {
  const [profileRaw, weeks, recipes, checkIns, pantry, usdaCache] = await Promise.all([
    get(KEYS.profile),
    readJson(KEYS.weeks, [] as Week[], z.array(WeekSchema)),
    readJson(KEYS.recipes, [] as Recipe[], z.array(RecipeSchema)),
    readJson(KEYS.checkIns, [] as CheckIn[], z.array(CheckInSchema)),
    readJson(KEYS.pantry, [] as string[], z.array(z.string())),
    readJson(KEYS.usda, {} as UsdaCache, UsdaCacheSchema),
  ]);
  const profileParsed = ProfileSchema.safeParse(profileRaw);
  return {
    profile: profileParsed.success ? profileParsed.data : null,
    weeks,
    recipes,
    checkIns,
    pantry,
    usdaCache: usdaCache ?? {},
  };
}

export async function saveProfile(profile: Profile | null): Promise<void> {
  if (profile) await set(KEYS.profile, profile);
  else await del(KEYS.profile);
}

export async function saveWeeks(weeks: Week[]): Promise<void> {
  await set(KEYS.weeks, weeks);
}

export async function saveRecipes(recipes: Recipe[]): Promise<void> {
  await set(KEYS.recipes, recipes);
}

export async function saveCheckIns(checkIns: CheckIn[]): Promise<void> {
  await set(KEYS.checkIns, checkIns);
}

export async function savePantry(pantry: string[]): Promise<void> {
  await set(KEYS.pantry, pantry);
}

export async function saveUsdaCache(cache: UsdaCache): Promise<void> {
  await set(KEYS.usda, cache);
}

export async function saveOnboardingDraft(draft: unknown): Promise<void> {
  await set(KEYS.onboarding, draft);
}

export async function loadOnboardingDraft<T>(fallback: T): Promise<T> {
  const raw = await get(KEYS.onboarding);
  return (raw as T) ?? fallback;
}

export async function resetCookbook(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => del(key)));
}

export function exportSnapshot(snapshot: CookbookSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseSnapshot(json: string): CookbookSnapshot {
  const raw = JSON.parse(json) as CookbookSnapshot;
  const profile = raw.profile ? ProfileSchema.parse(raw.profile) : null;
  return {
    profile,
    weeks: z.array(WeekSchema).parse(raw.weeks ?? []),
    recipes: z.array(RecipeSchema).parse(raw.recipes ?? []),
    checkIns: z.array(CheckInSchema).parse(raw.checkIns ?? []),
    pantry: z.array(z.string()).parse(raw.pantry ?? []),
    usdaCache: raw.usdaCache ? UsdaCacheSchema.parse(raw.usdaCache) : {},
  };
}

export { emptySnapshot };

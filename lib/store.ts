"use client";

import { create } from "zustand";
import type { CheckIn, Profile, Recipe, Week } from "@/lib/schemas";
import type { UsdaCache } from "@/lib/usda";
import {
  emptySnapshot,
  loadSnapshot,
  parseSnapshot,
  resetCookbook,
  saveCheckIns,
  savePantry,
  saveProfile,
  saveRecipes,
  saveUsdaCache,
  saveWeeks,
  type CookbookSnapshot,
} from "@/lib/storage";

type Store = CookbookSnapshot & {
  hydrated: boolean;
  busy: boolean;
  generateMessage: string;
  generateError: string | null;
  hydrate: () => Promise<void>;
  setProfile: (profile: Profile) => Promise<void>;
  addWeek: (week: Week, recipes: Recipe[], usdaCache: UsdaCache) => Promise<void>;
  replaceRecipe: (oldId: string, next: Recipe, usdaCache?: UsdaCache) => Promise<void>;
  patchRecipe: (id: string, patch: Partial<Recipe>) => Promise<void>;
  setGrocery: (weekId: string, groceryList: Week["groceryList"]) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  togglePantry: (name: string) => Promise<void>;
  importAll: (snapshot: CookbookSnapshot) => Promise<void>;
  resetAll: () => Promise<void>;
  setGenerateError: (error: string | null) => void;
  setBusy: (busy: boolean, message?: string) => void;
};

export const useCookbookStore = create<Store>((set, get) => ({
  ...emptySnapshot(),
  hydrated: false,
  busy: false,
  generateMessage: "Calculating your targets…",
  generateError: null,
  setGenerateError: (generateError) => set({ generateError }),
  setBusy: (busy, message) =>
    set({ busy, generateMessage: message ?? get().generateMessage }),
  hydrate: async () => {
    const snapshot = await loadSnapshot();
    set({ ...snapshot, hydrated: true });
  },
  setProfile: async (profile) => {
    await saveProfile(profile);
    set({ profile });
  },
  addWeek: async (week, recipes, usdaCache) => {
    const nextWeeks = [...get().weeks, week];
    const nextRecipes = [...get().recipes, ...recipes];
    const nextCache = { ...get().usdaCache, ...usdaCache };
    await Promise.all([
      saveWeeks(nextWeeks),
      saveRecipes(nextRecipes),
      saveUsdaCache(nextCache),
    ]);
    set({ weeks: nextWeeks, recipes: nextRecipes, usdaCache: nextCache });
  },
  replaceRecipe: async (oldId, next, usdaCache) => {
    const recipes = get().recipes.map((recipe) => (recipe.id === oldId ? next : recipe));
    const weeks = get().weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          meal.recipeId === oldId ? { ...meal, recipeId: next.id } : meal,
        ),
      })),
    }));
    const nextCache = { ...get().usdaCache, ...usdaCache };
    await Promise.all([saveRecipes(recipes), saveWeeks(weeks), saveUsdaCache(nextCache)]);
    set({ recipes, weeks, usdaCache: nextCache });
  },
  patchRecipe: async (id, patch) => {
    const recipes = get().recipes.map((recipe) =>
      recipe.id === id ? { ...recipe, ...patch } : recipe,
    );
    await saveRecipes(recipes);
    set({ recipes });
  },
  setGrocery: async (weekId, groceryList) => {
    const weeks = get().weeks.map((week) =>
      week.id === weekId ? { ...week, groceryList } : week,
    );
    await saveWeeks(weeks);
    set({ weeks });
  },
  addCheckIn: async (checkIn) => {
    const checkIns = [...get().checkIns, checkIn];
    await saveCheckIns(checkIns);
    set({ checkIns });
  },
  togglePantry: async (name) => {
    const key = name.trim().toLowerCase();
    const pantry = get().pantry.some((item) => item.toLowerCase() === key)
      ? get().pantry.filter((item) => item.toLowerCase() !== key)
      : [...get().pantry, name];
    await savePantry(pantry);
    set({ pantry });
  },
  importAll: async (snapshot) => {
    await Promise.all([
      saveProfile(snapshot.profile),
      saveWeeks(snapshot.weeks),
      saveRecipes(snapshot.recipes),
      saveCheckIns(snapshot.checkIns),
      savePantry(snapshot.pantry),
      saveUsdaCache(snapshot.usdaCache),
    ]);
    set({ ...snapshot, hydrated: true });
  },
  resetAll: async () => {
    await resetCookbook();
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("ac.autogen");
    set({
      ...emptySnapshot(),
      hydrated: true,
      busy: false,
      generateError: null,
      generateMessage: "Calculating your targets…",
    });
  },
}));

export { parseSnapshot };

"use client";

import { create } from "zustand";
import { authClient } from "@/lib/auth-client";
import {
  deleteCloudCookbook,
  fetchCloudCookbook,
  putCloudCookbook,
} from "@/lib/cloud";
import type { CheckIn, Profile, Recipe, Week } from "@/lib/schemas";
import type { UsdaCache } from "@/lib/usda";
import {
  emptySnapshot,
  loadSnapshot,
  loadUpdatedAt,
  parseSnapshot,
  resetCookbook,
  saveCheckIns,
  savePantry,
  saveProfile,
  saveRecipes,
  saveUsdaCache,
  saveUpdatedAt,
  saveWeeks,
  touchUpdatedAt,
  type CookbookSnapshot,
} from "@/lib/storage";
import {
  applyCloudSnapshot,
  decideSync,
  toCloudSnapshot,
} from "@/lib/sync";

type Store = CookbookSnapshot & {
  hydrated: boolean;
  accountLinked: boolean;
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
  importAll: (snapshot: CookbookSnapshot, options?: { skipPush?: boolean }) => Promise<void>;
  resetAll: () => Promise<void>;
  signOutLocal: () => Promise<void>;
  setGenerateError: (error: string | null) => void;
  setBusy: (busy: boolean, message?: string) => void;
};

const PUSH_DELAY_MS = 500;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCloudPush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void flushCloudPush();
  }, PUSH_DELAY_MS);
}

async function persistSnapshot(snapshot: CookbookSnapshot): Promise<void> {
  await Promise.all([
    saveProfile(snapshot.profile),
    saveWeeks(snapshot.weeks),
    saveRecipes(snapshot.recipes),
    saveCheckIns(snapshot.checkIns),
    savePantry(snapshot.pantry),
    saveUsdaCache(snapshot.usdaCache),
  ]);
}

async function flushCloudPush() {
  const state = useCookbookStore.getState();
  if (!state.accountLinked) return;
  const saved = await putCloudCookbook(toCloudSnapshot(state));
  await saveUpdatedAt(saved.updatedAt);
}

async function markDirtyAndPush() {
  await touchUpdatedAt();
  scheduleCloudPush();
}

export const useCookbookStore = create<Store>((set, get) => ({
  ...emptySnapshot(),
  hydrated: false,
  accountLinked: false,
  busy: false,
  generateMessage: "Calculating your targets…",
  generateError: null,
  setGenerateError: (generateError) => set({ generateError }),
  setBusy: (busy, message) =>
    set({ busy, generateMessage: message ?? get().generateMessage }),
  hydrate: async () => {
    const snapshot = await loadSnapshot();
    const localUpdatedAt = await loadUpdatedAt();
    let next = snapshot;
    let accountLinked = false;

    try {
      const session = await authClient.getSession();
      if (session.data) {
        accountLinked = true;
        const remote = await fetchCloudCookbook();
        const decision = decideSync(
          { snapshot: toCloudSnapshot(snapshot), updatedAt: localUpdatedAt },
          remote,
        );
        if (decision.action === "download") {
          next = applyCloudSnapshot(decision.snapshot, snapshot.usdaCache);
          await persistSnapshot(next);
          await saveUpdatedAt(decision.updatedAt);
        } else if (decision.action === "upload") {
          const saved = await putCloudCookbook(decision.snapshot);
          await saveUpdatedAt(saved.updatedAt);
        }
      }
    } catch {
      // Stay on the device copy if the host or network is unavailable.
    }

    set({ ...next, hydrated: true, accountLinked });
  },
  setProfile: async (profile) => {
    await saveProfile(profile);
    set({ profile });
    await markDirtyAndPush();
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
    await markDirtyAndPush();
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
    await markDirtyAndPush();
  },
  patchRecipe: async (id, patch) => {
    const recipes = get().recipes.map((recipe) =>
      recipe.id === id ? { ...recipe, ...patch } : recipe,
    );
    await saveRecipes(recipes);
    set({ recipes });
    await markDirtyAndPush();
  },
  setGrocery: async (weekId, groceryList) => {
    const weeks = get().weeks.map((week) =>
      week.id === weekId ? { ...week, groceryList } : week,
    );
    await saveWeeks(weeks);
    set({ weeks });
    await markDirtyAndPush();
  },
  addCheckIn: async (checkIn) => {
    const checkIns = [...get().checkIns, checkIn];
    await saveCheckIns(checkIns);
    set({ checkIns });
    await markDirtyAndPush();
  },
  togglePantry: async (name) => {
    const key = name.trim().toLowerCase();
    const pantry = get().pantry.some((item) => item.toLowerCase() === key)
      ? get().pantry.filter((item) => item.toLowerCase() !== key)
      : [...get().pantry, name];
    await savePantry(pantry);
    set({ pantry });
    await markDirtyAndPush();
  },
  importAll: async (snapshot, options) => {
    await persistSnapshot(snapshot);
    set({ ...snapshot, hydrated: true });
    if (!options?.skipPush) await markDirtyAndPush();
  },
  resetAll: async () => {
    await resetCookbook();
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("ac.autogen");
    if (get().accountLinked) {
      try {
        await deleteCloudCookbook();
      } catch {
        // Local reset still proceeds.
      }
    }
    set({
      ...emptySnapshot(),
      hydrated: true,
      accountLinked: get().accountLinked,
      busy: false,
      generateError: null,
      generateMessage: "Calculating your targets…",
    });
  },
  signOutLocal: async () => {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    if (get().accountLinked) {
      try {
        await flushCloudPush();
      } catch {
        // Still leave the device copy.
      }
    }
    await resetCookbook();
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("ac.autogen");
    set({
      ...emptySnapshot(),
      hydrated: true,
      accountLinked: false,
      busy: false,
      generateError: null,
      generateMessage: "Calculating your targets…",
    });
  },
}));

export { parseSnapshot };

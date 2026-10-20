"use client";

import { useEffect, useState } from "react";
import type { Recipe, Week } from "@/lib/schemas";
import type { UsdaCache } from "@/lib/usda";
import { assembleWeek } from "@/lib/week";
import { friendlyGenerateError, readGenerateResponse, trimUsdaCache } from "@/lib/http";
import { useCookbookStore } from "@/lib/store";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_TIMEOUT_MS = 50_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

type DayResult = {
  recipes: Recipe[];
  day: Week["days"][number];
  summary?: string;
  usdaCache?: UsdaCache;
};

async function requestOneDay(input: {
  profile: NonNullable<ReturnType<typeof useCookbookStore.getState>["profile"]>;
  liked: string[];
  disliked: string[];
  pantry: string[];
  weekNumber: number;
  weekId: string;
  day: number;
  previousTitles: string[];
  usdaCache?: UsdaCache;
}): Promise<DayResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DAY_TIMEOUT_MS);
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        profile: input.profile,
        liked: input.liked,
        disliked: input.disliked,
        pantry: input.pantry,
        weekNumber: input.weekNumber,
        weekId: input.weekId,
        day: input.day,
        previousTitles: input.previousTitles,
        usdaCache: trimUsdaCache(input.usdaCache),
      }),
    });
    const body = await readGenerateResponse<DayResult>(res);
    if (!body.recipes?.length || !body.day) throw new Error("Could not write this day");
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestWeekGeneration(): Promise<void> {
  const store = useCookbookStore.getState();
  const profile = store.profile;
  if (!profile) return;
  store.setBusy(true, "Calculating your targets…");
  store.setGenerateError(null);

  const liked = store.recipes.filter((r) => r.rating === "up").map((r) => r.title);
  const disliked = store.recipes.filter((r) => r.rating === "down").map((r) => r.title);
  const weekId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const weekNumber = store.weeks.length + 1;
  const recipes: Recipe[] = [];
  const days: Week["days"] = [];
  let usdaCache: UsdaCache = { ...store.usdaCache };
  let summary = "";

  try {
    for (let day = 0; day <= 6; day += 1) {
      useCookbookStore
        .getState()
        .setBusy(true, `Writing ${DAY_LABELS[day]}… (${day + 1} of 7)`);
      const result = await requestOneDay({
        profile,
        liked,
        disliked,
        pantry: store.pantry,
        weekNumber,
        weekId,
        day,
        previousTitles: recipes.map((recipe) => recipe.title),
        usdaCache,
      });
      recipes.push(...result.recipes);
      days.push(result.day);
      usdaCache = { ...usdaCache, ...(result.usdaCache ?? {}) };
      if (result.summary) summary = result.summary;
    }

    const week = assembleWeek({
      weekId,
      weekNumber,
      createdAt,
      profile,
      summary: summary || `Week ${weekNumber} of meals written for your kitchen.`,
      days,
      recipes,
      pantry: store.pantry,
    });
    await store.addWeek(week, recipes, usdaCache);
  } catch (err) {
    store.setGenerateError(
      isAbortError(err)
        ? "That day took too long. Try again — we write one day at a time."
        : friendlyGenerateError(err, "Could not write this week"),
    );
  } finally {
    useCookbookStore.getState().setBusy(false);
  }
}

export async function requestMealSwap(recipe: Recipe): Promise<void> {
  const store = useCookbookStore.getState();
  const profile = store.profile;
  if (!profile) return;
  store.setBusy(true, "Finding a different plate…");
  store.setGenerateError(null);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DAY_TIMEOUT_MS);
  try {
    const liked = store.recipes.filter((r) => r.rating === "up").map((r) => r.title);
    const disliked = store.recipes.filter((r) => r.rating === "down").map((r) => r.title);
    const res = await fetch("/api/regenerate-meal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        profile,
        oldTitle: recipe.title,
        mealType: recipe.mealType,
        weekId: recipe.weekId,
        pantry: store.pantry,
        liked,
        disliked,
        usdaCache: trimUsdaCache(store.usdaCache),
      }),
    });
    const body = await readGenerateResponse<{ recipe: Recipe; usdaCache?: UsdaCache }>(res);
    await store.replaceRecipe(recipe.id, body.recipe, body.usdaCache ?? {});
  } catch (err) {
    store.setGenerateError(
      isAbortError(err)
        ? "That swap took too long. Try again."
        : friendlyGenerateError(err, "Could not swap this meal"),
    );
  } finally {
    window.clearTimeout(timeout);
    useCookbookStore.getState().setBusy(false);
  }
}

export function useWeekGenerator() {
  const profile = useCookbookStore((s) => s.profile);
  const busy = useCookbookStore((s) => s.busy);
  const message = useCookbookStore((s) => s.generateMessage);
  const error = useCookbookStore((s) => s.generateError);
  const setError = useCookbookStore((s) => s.setGenerateError);

  return {
    generate: requestWeekGeneration,
    swap: requestMealSwap,
    busy,
    message,
    error,
    setError,
    profile,
  };
}

export function GeneratingOverlay({ message }: { message: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-foreground/20 p-6 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6">
        <p className="font-display text-2xl tracking-display">Writing your chapter</p>
        <p className="mt-3 text-muted-foreground">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {elapsed < 15 ? "One day at a time so the host can finish." : `Still writing… ${elapsed}s`}
        </p>
        <div className="mt-6 h-2 overflow-hidden bg-muted">
          <div className="h-2 w-1/2 animate-pulse bg-primary" />
        </div>
      </div>
    </div>
  );
}

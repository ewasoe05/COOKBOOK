"use client";

import { useEffect, useState } from "react";
import type { Recipe, Week } from "@/lib/schemas";
import type { UsdaCache } from "@/lib/usda";
import { friendlyGenerateError, readGenerateResponse, trimUsdaCache } from "@/lib/http";
import { useCookbookStore } from "@/lib/store";

const MESSAGES = [
  "Calculating your targets…",
  "Writing the week's chapter…",
  "Checking nutrition…",
  "Building the grocery list…",
];

const GENERATE_TIMEOUT_MS = 150_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

export async function requestWeekGeneration(): Promise<void> {
  const store = useCookbookStore.getState();
  const profile = store.profile;
  if (!profile) return;
  store.setBusy(true, MESSAGES[0]);
  store.setGenerateError(null);
  let i = 0;
  const timer = window.setInterval(() => {
    i = (i + 1) % MESSAGES.length;
    useCookbookStore.getState().setBusy(true, MESSAGES[i]);
  }, 2800);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
  try {
    const liked = store.recipes.filter((r) => r.rating === "up").map((r) => r.title);
    const disliked = store.recipes.filter((r) => r.rating === "down").map((r) => r.title);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        profile,
        liked,
        disliked,
        pantry: store.pantry,
        weekNumber: store.weeks.length + 1,
        usdaCache: trimUsdaCache(store.usdaCache),
      }),
    });
    const body = await readGenerateResponse<{
      week: Week;
      recipes: Recipe[];
      usdaCache?: UsdaCache;
    }>(res);
    if (!body.week || !body.recipes) throw new Error("Could not write this week");
    await store.addWeek(body.week, body.recipes, body.usdaCache ?? {});
  } catch (err) {
    store.setGenerateError(
      isAbortError(err)
        ? "Writing took too long. Try again."
        : friendlyGenerateError(err, "Could not write this week"),
    );
  } finally {
    window.clearInterval(timer);
    window.clearTimeout(timeout);
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
  const timeout = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
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
          {elapsed < 20 ? "This usually takes about a minute." : `Still writing… ${elapsed}s`}
        </p>
        <div className="mt-6 h-2 overflow-hidden bg-muted">
          <div className="h-2 w-1/2 animate-pulse bg-primary" />
        </div>
      </div>
    </div>
  );
}

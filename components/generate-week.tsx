"use client";

import type { Profile, Recipe, Week } from "@/lib/schemas";
import type { UsdaCache } from "@/lib/usda";
import { useCookbookStore } from "@/lib/store";

const MESSAGES = [
  "Calculating your targets…",
  "Writing the week's chapter…",
  "Checking nutrition…",
  "Building the grocery list…",
];

export function useWeekGenerator() {
  const profile = useCookbookStore((s) => s.profile);
  const recipes = useCookbookStore((s) => s.recipes);
  const pantry = useCookbookStore((s) => s.pantry);
  const weeks = useCookbookStore((s) => s.weeks);
  const usdaCache = useCookbookStore((s) => s.usdaCache);
  const addWeek = useCookbookStore((s) => s.addWeek);
  const replaceRecipe = useCookbookStore((s) => s.replaceRecipe);
  const busy = useCookbookStore((s) => s.busy);
  const message = useCookbookStore((s) => s.generateMessage);
  const error = useCookbookStore((s) => s.generateError);
  const setBusy = useCookbookStore((s) => s.setBusy);
  const setError = useCookbookStore((s) => s.setGenerateError);

  async function generate() {
    if (!profile) return;
    setBusy(true, MESSAGES[0]);
    setError(null);
    let i = 0;
    const timer = window.setInterval(() => {
      i = (i + 1) % MESSAGES.length;
      setBusy(true, MESSAGES[i]);
    }, 2800);
    try {
      const liked = recipes.filter((r) => r.rating === "up").map((r) => r.title);
      const disliked = recipes.filter((r) => r.rating === "down").map((r) => r.title);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          liked,
          disliked,
          pantry,
          weekNumber: weeks.length + 1,
          usdaCache,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not write this week");
      await addWeek(body.week as Week, body.recipes as Recipe[], (body.usdaCache ?? {}) as UsdaCache);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write this week");
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  }

  async function swap(recipe: Recipe) {
    if (!profile) return;
    setBusy(true, "Finding a different plate…");
    setError(null);
    try {
      const liked = recipes.filter((r) => r.rating === "up").map((r) => r.title);
      const disliked = recipes.filter((r) => r.rating === "down").map((r) => r.title);
      const res = await fetch("/api/regenerate-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          oldTitle: recipe.title,
          mealType: recipe.mealType,
          weekId: recipe.weekId,
          pantry,
          liked,
          disliked,
          usdaCache,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not swap this meal");
      await replaceRecipe(recipe.id, body.recipe as Recipe, (body.usdaCache ?? {}) as UsdaCache);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not swap this meal");
    } finally {
      setBusy(false);
    }
  }

  return { generate, swap, busy, message, error, setError, profile: profile as Profile | null };
}

export function GeneratingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-foreground/20 p-6 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6">
        <p className="font-display text-2xl tracking-display">Writing your chapter</p>
        <p className="mt-3 text-muted-foreground">{message}</p>
        <div className="mt-6 h-2 overflow-hidden bg-muted">
          <div className="h-2 w-1/2 animate-pulse bg-primary" />
        </div>
      </div>
    </div>
  );
}

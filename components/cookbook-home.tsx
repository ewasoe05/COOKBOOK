"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecipeCard } from "@/components/recipe-card";
import { GeneratingOverlay, useWeekGenerator } from "@/components/generate-week";
import { Button } from "@/components/ui/button";
import { useCookbookStore } from "@/lib/store";
import type { Recipe } from "@/lib/schemas";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CookbookHome() {
  const search = useSearchParams();
  const router = useRouter();
  const profile = useCookbookStore((s) => s.profile);
  const weeks = useCookbookStore((s) => s.weeks);
  const recipes = useCookbookStore((s) => s.recipes);
  const patchRecipe = useCookbookStore((s) => s.patchRecipe);
  const { generate, swap, busy, message, error, setError } = useWeekGenerator();
  const [tab, setTab] = useState<"week" | "hits" | "chapters">("week");
  const [day, setDay] = useState(new Date().getDay());
  const current = weeks[weeks.length - 1];

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  useEffect(() => {
    if (search.get("generate") !== "1" || weeks.length > 0 || !profile) return;
    if (typeof window !== "undefined" && sessionStorage.getItem("ac.autogen") === "1") return;
    sessionStorage.setItem("ac.autogen", "1");
    void generate();
  }, [search, weeks.length, profile, generate]);

  const dayRecipes = useMemo(() => {
    if (!current) return [];
    const entry = current.days.find((item) => item.day === day);
    return (entry?.meals ?? [])
      .map((meal) => recipes.find((recipe) => recipe.id === meal.recipeId))
      .filter((recipe): recipe is Recipe => Boolean(recipe));
  }, [current, day, recipes]);

  const hits = recipes.filter((recipe) => recipe.makeAgain || recipe.rating === "up");

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-8 pb-40">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {current ? `Week ${current.number}` : "No chapters yet"}
        </p>
        <h1 className="font-display text-4xl tracking-display">Your Cookbook</h1>
        {current ? <p className="measure text-muted-foreground">{current.summary}</p> : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["week", "This Week"],
            ["hits", "Greatest Hits"],
            ["chapters", "All Chapters"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`h-11 rounded-full border px-4 ${
              tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-destructive">
          {error}{" "}
          <button type="button" className="underline" onClick={() => setError(null)}>
            dismiss
          </button>
        </p>
      ) : null}

      {tab === "week" ? (
        current ? (
          <div className="flex flex-col gap-6">
            <div className="flex gap-1 overflow-x-auto">
              {DAYS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDay(index)}
                  className={`h-11 min-w-11 rounded-full px-3 ${
                    day === index ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {dayRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  showNumbers={profile.showNumbers}
                  why={recipe.whyThisFitsYou}
                  onSwap={() => void swap(recipe)}
                  onHeart={() => void patchRecipe(recipe.id, { makeAgain: !recipe.makeAgain })}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="measure text-lg text-muted-foreground">
              Your first chapter is unwritten. We&apos;ll cook to your body, kitchen, and taste.
            </p>
            <Button size="touch" onClick={() => void generate()}>
              Write my first week
            </Button>
          </div>
        )
      ) : null}

      {tab === "hits" ? (
        hits.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {hits.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} showNumbers={profile.showNumbers} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Heart a meal to keep it here.</p>
        )
      ) : null}

      {tab === "chapters" ? (
        <ol className="flex flex-col gap-4">
          {weeks.map((week) => (
            <li key={week.id} className="border-b border-border py-4">
              <p className="font-display text-2xl">Week {week.number}</p>
              <p className="measure mt-2 text-muted-foreground">{week.summary}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {current ? (
        <div className="fixed inset-x-0 bottom-24 z-10 flex justify-end px-4 md:bottom-6">
          <div className="mx-auto flex w-full max-w-5xl justify-end">
            <Button size="touch" onClick={() => void generate()}>
              Write next week
            </Button>
          </div>
        </div>
      ) : null}

      {busy ? <GeneratingOverlay message={message} /> : null}
    </div>
  );
}

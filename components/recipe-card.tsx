"use client";

import Link from "next/link";
import { Heart, RefreshCw } from "lucide-react";
import type { Recipe } from "@/lib/schemas";
import { formatDuration } from "@/lib/display";
import { mealBandClass } from "@/lib/meal-style";

export function RecipeCard({
  recipe,
  showNumbers,
  why,
  onSwap,
  onHeart,
}: {
  recipe: Recipe;
  showNumbers: boolean;
  why?: string;
  onSwap?: () => void;
  onHeart?: () => void;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={`flex items-end justify-between px-5 py-6 ${mealBandClass(recipe.mealType)}`}>
        <p className="text-sm font-medium capitalize text-secondary-foreground">{recipe.mealType}</p>
        <span className="text-3xl" aria-hidden>
          {recipe.emoji}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="font-display text-2xl tracking-display">
          <Link href={`/recipe/${recipe.id}`} className="hover:text-primary">
            {recipe.title}
          </Link>
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatDuration(recipe.prepMinutes + recipe.cookMinutes)}
          {showNumbers
            ? ` · ${recipe.nutritionPerServing.calories} kcal · ${recipe.nutritionPerServing.proteinG}g protein`
            : why
              ? ` · ${why}`
              : ""}
        </p>
        <div className="mt-auto flex gap-1 pt-2">
          {onSwap ? (
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted"
              onClick={onSwap}
              aria-label="Swap this meal"
            >
              <RefreshCw className="size-5" strokeWidth={1.5} />
            </button>
          ) : null}
          {onHeart ? (
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted"
              onClick={onHeart}
              aria-label="Heart this meal"
              aria-pressed={recipe.makeAgain}
            >
              <Heart
                className="size-5"
                strokeWidth={1.5}
                fill={recipe.makeAgain ? "currentColor" : "none"}
              />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

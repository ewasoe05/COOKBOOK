"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { cn } from "cn";
import { ServingScaler } from "@/components/serving-scaler";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { mealBandClass } from "@/lib/meal-style";
import type { Recipe } from "@/lib/schemas";
import { useCookbookStore } from "@/lib/store";
import { formatQuantity } from "@/lib/format";

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const profile = useCookbookStore((s) => s.profile);
  const patchRecipe = useCookbookStore((s) => s.patchRecipe);
  const [servings, setServings] = useState(recipe.servings);
  const [openNutrition, setOpenNutrition] = useState(Boolean(profile?.showNumbers));
  const factor = servings / recipe.servings;

  const ingredients = useMemo(
    () =>
      recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        amount: ingredient.amount * factor,
      })),
    [recipe.ingredients, factor],
  );

  return (
    <article className="flex flex-col gap-10 pb-28">
      <header className="flex flex-col gap-4">
        <div className={`${mealBandClass(recipe.mealType)} rounded-lg px-6 py-8`}>
          <p className="text-sm capitalize text-secondary-foreground">{recipe.mealType}</p>
          <p className="mt-2 text-4xl" aria-hidden>
            {recipe.emoji}
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-display">{recipe.title}</h1>
        </div>
        <p className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-foreground">
            <Clock className="size-4" strokeWidth={1.5} />
            {recipe.prepMinutes + recipe.cookMinutes} min
          </span>
          <span>~${recipe.costEstimateUsd.toFixed(0)}</span>
          <span>{recipe.cuisine}</span>
        </p>
        <p className="measure text-lg leading-body">{recipe.whyThisFitsYou}</p>
        <ServingScaler servings={servings} onChange={setServings} />
      </header>

      <div className="grid gap-12 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <h2 className="font-display text-2xl">Ingredients</h2>
          <ul className="mt-4 divide-y divide-border">
            {ingredients.map((ingredient) => (
              <li key={ingredient.name} className="flex items-start gap-3 py-3">
                <label className="flex min-h-11 flex-1 items-start gap-3">
                  <input type="checkbox" className="mt-1 size-5" />
                  <span>
                    <span className="font-medium tabular-nums">
                      {formatQuantity(ingredient.amount, ingredient.unit)}
                    </span>{" "}
                    {ingredient.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className="lg:col-span-7">
          <h2 className="font-display text-2xl">Method</h2>
          <ol className="mt-4 flex flex-col gap-6">
            {recipe.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="font-display text-xl text-primary">{index + 1}</span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="measure mt-1 text-lg leading-body">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section>
        <button
          type="button"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => setOpenNutrition((v) => !v)}
        >
          {openNutrition ? "Hide nutrition" : "Nutrition"}
        </button>
        {openNutrition ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {recipe.nutritionPerServing.calories} kcal · {recipe.nutritionPerServing.proteinG}g protein ·{" "}
            {recipe.nutritionPerServing.carbsG}g carbs · {recipe.nutritionPerServing.fatG}g fat
            <span className="ml-2 rounded-full border border-border px-2 py-1 text-xs">
              {recipe.nutritionSource === "usda_verified" ? "USDA verified" : "estimated"}
            </span>
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={recipe.rating === "up" ? "default" : "outline"}
          size="touch"
          onClick={() => void patchRecipe(recipe.id, { rating: "up" })}
        >
          Thumbs up
        </Button>
        <Button
          type="button"
          variant={recipe.rating === "down" ? "default" : "outline"}
          size="touch"
          onClick={() => void patchRecipe(recipe.id, { rating: "down" })}
        >
          Thumbs down
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="touch"
          onClick={() => void patchRecipe(recipe.id, { madeCount: recipe.madeCount + 1 })}
        >
          I made this ({recipe.madeCount})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="touch"
          onClick={() => void patchRecipe(recipe.id, { makeAgain: !recipe.makeAgain })}
        >
          {recipe.makeAgain ? "In greatest hits" : "Make again"}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-background p-4 md:bottom-0">
        <div className="mx-auto flex max-w-5xl">
          <Link
            href={`/recipe/${recipe.id}/cook`}
            className={cn(buttonVariants({ size: "touch" }), "w-full sm:ml-auto sm:w-auto")}
          >
            Cook mode
          </Link>
        </div>
      </div>
    </article>
  );
}

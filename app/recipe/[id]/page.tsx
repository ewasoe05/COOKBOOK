"use client";

import { use, useMemo } from "react";
import { RecipeView } from "@/components/recipe-detail";
import { useCookbookStore } from "@/lib/store";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const recipes = useCookbookStore((s) => s.recipes);
  const recipe = useMemo(() => recipes.find((item) => item.id === id), [recipes, id]);

  if (!recipe) {
    return <p className="text-muted-foreground">That recipe is not in this kitchen.</p>;
  }
  return <RecipeView recipe={recipe} />;
}

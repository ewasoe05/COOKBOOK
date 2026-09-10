"use client";

import { Minus, Plus } from "lucide-react";

export function ServingScaler({
  servings,
  onChange,
  min = 1,
  max = 12,
}: {
  servings: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-muted-foreground">Servings</p>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card transition-colors duration-hover ease-standard hover:bg-muted disabled:opacity-50"
        onClick={() => onChange(Math.max(min, servings - 1))}
        disabled={servings <= min}
        aria-label="Decrease servings"
      >
        <Minus className="size-4" strokeWidth={1.5} />
      </button>
      <p className="min-w-8 text-center text-lg font-medium tabular-nums" aria-live="polite">
        {servings}
      </p>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card transition-colors duration-hover ease-standard hover:bg-muted disabled:opacity-50"
        onClick={() => onChange(Math.min(max, servings + 1))}
        disabled={servings >= max}
        aria-label="Increase servings"
      >
        <Plus className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

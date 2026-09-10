"use client";

import { useEffect } from "react";
import { useCookbookStore } from "@/lib/store";

export function HydrateStore({ children }: { children: React.ReactNode }) {
  const hydrate = useCookbookStore((s) => s.hydrate);
  const hydrated = useCookbookStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return children;
}

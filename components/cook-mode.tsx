"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Plus, Timer as TimerIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServingScaler } from "@/components/serving-scaler";
import type { Recipe } from "@/lib/schemas";
import { formatQuantity } from "@/lib/format";

type KitchenTimer = {
  id: string;
  label: string;
  remaining: number;
  running: boolean;
};

function playTimerAlert() {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
      osc.onended = () => void ctx.close();
    }
  } catch {
    /* audio is optional */
  }
  if ("vibrate" in navigator) navigator.vibrate([200, 80, 200]);
}

export function CookMode({ recipe }: { recipe: Recipe }) {
  const [servings, setServings] = useState(recipe.servings);
  const [done, setDone] = useState(() => recipe.steps.map(() => false));
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const alerted = useRef(new Set<string>());
  const nextIndex = done.findIndex((item) => !item);
  const factor = servings / recipe.servings;

  useEffect(() => {
    let sentinel: WakeLockSentinel | undefined;
    void (async () => {
      try {
        if ("wakeLock" in navigator) sentinel = await navigator.wakeLock.request("screen");
      } catch {
        /* cook mode still works */
      }
    })();
    return () => {
      void sentinel?.release();
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimers((current) =>
        current.map((timer) => {
          if (!timer.running || timer.remaining <= 0) return timer;
          const remaining = timer.remaining - 1;
          return { ...timer, remaining, running: remaining > 0 };
        }),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    for (const timer of timers) {
      if (timer.remaining === 0 && !alerted.current.has(timer.id)) {
        alerted.current.add(timer.id);
        playTimerAlert();
      }
    }
  }, [timers]);

  function addTimer(seconds: number, label: string) {
    setTimers((current) => [
      ...current,
      { id: crypto.randomUUID(), label, remaining: seconds, running: true },
    ]);
  }

  return (
    <div className="flex flex-col gap-8 pb-52">
      <header className="flex flex-col gap-3">
        <Link href={`/recipe/${recipe.id}`} className="text-sm text-muted-foreground hover:underline">
          Back to recipe
        </Link>
        <h1 className="font-display text-3xl tracking-display">{recipe.title}</h1>
        <ServingScaler servings={servings} onChange={setServings} />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <TimerIcon className="size-5" strokeWidth={1.5} />
          Timers
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-11 rounded-full border border-border px-4"
            onClick={() => addTimer(10, "10 sec")}
          >
            10 sec
          </button>
          {[60, 300, 480, 600].map((seconds) => (
            <button
              key={seconds}
              type="button"
              className="h-11 rounded-full border border-border px-4"
              onClick={() => addTimer(seconds, `${seconds / 60} min`)}
            >
              {seconds / 60} min
            </button>
          ))}
          {recipe.steps
            .filter((step) => step.timerSeconds)
            .map((step) => (
              <button
                key={step.title}
                type="button"
                className="h-11 rounded-full border border-border px-4"
                onClick={() => addTimer(step.timerSeconds ?? 60, step.title)}
              >
                {step.title}
              </button>
            ))}
        </div>
      </section>

      <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
        {recipe.ingredients.map((ingredient) => (
          <li key={ingredient.name}>
            {formatQuantity(ingredient.amount * factor, ingredient.unit)} {ingredient.name}
          </li>
        ))}
      </ul>

      <ol className="flex flex-col gap-4">
        {recipe.steps.map((step, index) => {
          const checked = done[index];
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() =>
                  setDone((current) => current.map((item, i) => (i === index ? !item : item)))
                }
                className={`flex w-full gap-4 rounded-lg border p-4 text-left ${
                  checked ? "border-border bg-muted text-muted-foreground" : "border-border bg-card"
                } ${index === nextIndex ? "border-primary" : ""}`}
              >
                <span className="inline-flex size-11 items-center justify-center rounded-md border">
                  {checked ? <Check className="size-5" strokeWidth={1.5} /> : index + 1}
                </span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className={`mt-1 text-xl leading-body ${checked ? "line-through" : ""}`}>
                    {step.text}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background p-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          {timers.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {timers.map((timer) => (
                <li key={timer.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <p className="font-display text-2xl tabular-nums">
                    {String(Math.floor(Math.max(timer.remaining, 0) / 60)).padStart(2, "0")}:
                    {String(Math.max(timer.remaining, 0) % 60).padStart(2, "0")}
                  </p>
                  <p className="flex-1 text-sm">{timer.label}</p>
                  <button
                    type="button"
                    className="size-11"
                    onClick={() =>
                      setTimers((current) =>
                        current.map((item) =>
                          item.id === timer.id ? { ...item, running: !item.running } : item,
                        ),
                      )
                    }
                  >
                    {timer.running ? "Pause" : "Start"}
                  </button>
                  <button
                    type="button"
                    className="size-11"
                    aria-label="Remove timer"
                    onClick={() => setTimers((current) => current.filter((item) => item.id !== timer.id))}
                  >
                    <X className="size-4" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="touch" className="flex-1" onClick={() => addTimer(300, "5 min")}>
              <Plus className="size-4" strokeWidth={1.5} />
              Quick 5 min
            </Button>
            <Button
              type="button"
              size="touch"
              className="flex-1"
              disabled={nextIndex === -1}
              onClick={() =>
                setDone((current) => current.map((item, i) => (i === nextIndex ? true : item)))
              }
            >
              {nextIndex === -1 ? "All steps done" : "Mark step done"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeTargets } from "@/lib/nutrition";
import { exportSnapshot } from "@/lib/storage";
import { parseSnapshot, useCookbookStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/number-field";
import { Textarea } from "@/components/ui/textarea";
import { cmToImperial, imperialToCm, kgToLb, lbToKg } from "@/lib/display";
import {
  EQUIPMENT_OPTIONS,
  GUARDRAIL_OPTIONS,
  type Activity,
  type Goal,
  type Pace,
  type Profile,
} from "@/lib/schemas";

export function ProfileView() {
  const router = useRouter();
  const profile = useCookbookStore((s) => s.profile);
  const setProfile = useCookbookStore((s) => s.setProfile);
  const checkIns = useCookbookStore((s) => s.checkIns);
  const addCheckIn = useCookbookStore((s) => s.addCheckIn);
  const recipes = useCookbookStore((s) => s.recipes);
  const weeks = useCookbookStore((s) => s.weeks);
  const pantry = useCookbookStore((s) => s.pantry);
  const usdaCache = useCookbookStore((s) => s.usdaCache);
  const resetAll = useCookbookStore((s) => s.resetAll);
  const importAll = useCookbookStore((s) => s.importAll);
  const [weight, setWeight] = useState("");
  const [energy, setEnergy] = useState(3);
  const [hunger, setHunger] = useState(3);
  const [note, setNote] = useState("");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const targets = useMemo(() => (profile ? computeTargets(profile) : null), [profile]);
  const weights = checkIns.filter((item) => item.weightKg).map((item) => item.weightKg as number);

  useEffect(() => {
    if (!profile) router.replace("/");
  }, [profile, router]);

  if (!profile || !targets) {
    return <p className="text-muted-foreground">Opening onboarding…</p>;
  }

  const current = profile;
  const currentTargets = targets;

  function patch(partial: Partial<Profile>) {
    void setProfile({ ...current, ...partial });
  }

  const imperial = current.unitSystem === "imperial";
  const { feet, inches } = cmToImperial(current.heightCm);

  return (
    <div className="flex flex-col gap-10 pb-24">
      <header>
        <h1 className="font-display text-4xl tracking-display">Profile</h1>
        <p className="measure mt-2 text-muted-foreground">
          Changing body or goal numbers recalculates targets. Your next week will use these.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">This week&apos;s targets</h2>
        <p className="measure">{currentTargets.rationale}</p>
        {current.showNumbers ? (
          <p className="text-sm text-muted-foreground">
            {currentTargets.calories} kcal · {currentTargets.proteinG}g protein · {currentTargets.carbsG}g carbs · {currentTargets.fatG}g fat
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">Body and kitchen</h2>
        <label className="flex flex-col gap-2 text-sm">
          Age
          <NumberField
            className="h-11"
            integer
            value={current.age}
            onValueChange={(age) => {
              if (age === null) return;
              patch({ age });
            }}
          />
        </label>
        {imperial ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-sm">
              Height (ft)
              <NumberField
                key="height-ft"
                className="h-11"
                integer
                value={feet}
                onValueChange={(next) => {
                  if (next === null) return;
                  patch({ heightCm: imperialToCm(next, inches) });
                }}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Height (in)
              <NumberField
                key="height-in"
                className="h-11"
                integer
                allowZero
                value={inches}
                onValueChange={(next) => {
                  if (next === null) return;
                  patch({ heightCm: imperialToCm(feet, next) });
                }}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-2 text-sm">
              Weight (lb)
              <NumberField
                key="weight-lb"
                className="h-11"
                integer
                value={kgToLb(current.weightKg)}
                onValueChange={(next) => {
                  if (next === null) return;
                  patch({ weightKg: lbToKg(next) });
                }}
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-sm">
              Height (cm)
              <NumberField
                key="height-cm"
                className="h-11"
                integer
                value={current.heightCm}
                onValueChange={(heightCm) => {
                  if (heightCm === null) return;
                  patch({ heightCm });
                }}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Weight (kg)
              <NumberField
                key="weight-kg"
                className="h-11"
                value={current.weightKg}
                onValueChange={(weightKg) => {
                  if (weightKg === null) return;
                  patch({ weightKg });
                }}
              />
            </label>
          </div>
        )}
        <label className="flex flex-col gap-2 text-sm">
          Activity
          <select
            className="h-11 rounded-lg border border-input bg-background px-3"
            value={current.activity}
            onChange={(e) => patch({ activity: e.target.value as Activity })}
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very_active">Very active</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Goal
          <select
            className="h-11 rounded-lg border border-input bg-background px-3"
            value={current.goal}
            onChange={(e) => patch({ goal: e.target.value as Goal })}
          >
            <option value="eat_better">Eat better</option>
            <option value="lose">Lose</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain</option>
          </select>
        </label>
        {current.goal === "lose" || current.goal === "gain" ? (
          <div className="flex gap-2">
            {(["slow", "moderate", "fast"] as Pace[]).map((pace) => (
              <button
                key={pace}
                type="button"
                className={`h-11 rounded-full border px-4 capitalize ${
                  current.pace === pace
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
                onClick={() => patch({ pace })}
              >
                {pace}
              </button>
            ))}
          </div>
        ) : null}
        <label className="flex flex-col gap-2 text-sm">
          Allergies (comma separated)
          <Input
            className="h-11"
            value={current.allergies.join(", ")}
            onChange={(e) =>
              patch({
                allergies: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          People at the table
          <NumberField
            className="h-11"
            integer
            min={1}
            max={12}
            value={current.householdSize}
            onValueChange={(householdSize) => {
              if (householdSize === null) return;
              patch({ householdSize });
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {GUARDRAIL_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`h-11 rounded-full border px-4 capitalize ${
                current.guardrails.includes(item)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
              onClick={() =>
                patch({
                  guardrails: current.guardrails.includes(item)
                    ? current.guardrails.filter((g) => g !== item)
                    : [...current.guardrails, item],
                })
              }
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`h-11 rounded-full border px-4 capitalize ${
                current.equipment.includes(item)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
              onClick={() =>
                patch({
                  equipment: current.equipment.includes(item)
                    ? current.equipment.filter((e) => e !== item)
                    : [...current.equipment, item],
                })
              }
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Weekly check-in</h2>
        <label className="text-sm">
          Weight ({current.unitSystem === "imperial" ? "lb" : "kg"}, optional)
          <Input className="mt-2 h-11" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <p className="text-sm">Energy {energy}/5</p>
        <input type="range" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
        <p className="text-sm">Hunger {hunger}/5</p>
        <input type="range" min={1} max={5} value={hunger} onChange={(e) => setHunger(Number(e.target.value))} />
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did the week feel?" />
        <Button
          size="touch"
          onClick={() => {
            const weightKg =
              weight === ""
                ? undefined
                : current.unitSystem === "imperial"
                  ? Number(weight) / 2.20462
                  : Number(weight);
            void addCheckIn({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              weightKg,
              energy: energy as 1 | 2 | 3 | 4 | 5,
              hunger: hunger as 1 | 2 | 3 | 4 | 5,
              note: note || undefined,
            });
            setNote("");
          }}
        >
          Save check-in
        </Button>
        {weights.length > 1 ? (
          <svg viewBox="0 0 120 40" className="h-16 w-48 text-primary" aria-hidden>
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points={weights
                .map((value, index) => {
                  const min = Math.min(...weights);
                  const max = Math.max(...weights);
                  const x = (index / (weights.length - 1)) * 120;
                  const y = 36 - ((value - min) / Math.max(max - min, 0.1)) * 32;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        ) : (
          <p className="text-sm text-muted-foreground">A weight sparkline appears after two check-ins.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Show numbers</h2>
        <Button variant="outline" size="touch" onClick={() => patch({ showNumbers: !current.showNumbers })}>
          {current.showNumbers ? "Hide calories on cards" : "Show calories on cards"}
        </Button>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-8">
        <h2 className="font-display text-2xl">Danger zone</h2>
        <Button
          variant="outline"
          size="touch"
          onClick={() => {
            const json = exportSnapshot({ profile: current, weeks, recipes, checkIns, pantry, usdaCache });
            void navigator.clipboard.writeText(json);
            setMessage("Exported JSON copied to clipboard.");
          }}
        >
          Export all data
        </Button>
        <Textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste JSON to import"
        />
        <Button
          variant="outline"
          size="touch"
          onClick={() => {
            try {
              void importAll(parseSnapshot(importText));
              setMessage("Imported.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Import failed");
            }
          }}
        >
          Import JSON
        </Button>
        <Button variant="destructive" size="touch" onClick={() => void resetAll()}>
          Reset cookbook
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/number-field";
import { computeTargets } from "@/lib/nutrition";
import {
  EQUIPMENT_OPTIONS,
  GUARDRAIL_OPTIONS,
  ProfileSchema,
  type Intent,
  type Profile,
} from "@/lib/schemas";
import { useCookbookStore } from "@/lib/store";
import { saveOnboardingDraft } from "@/lib/storage";
import { cmToImperial, imperialToCm, kgToLb, lbToKg } from "@/lib/display";

const CUISINES = [
  "american",
  "italian",
  "mexican",
  "japanese",
  "indian",
  "mediterranean",
  "chinese",
  "thai",
  "middle eastern",
];

const empty = {
  intent: "" as Intent | "",
  sex: "unspecified" as Profile["sex"],
  age: 35,
  heightCm: 170,
  weightKg: 75,
  activity: "moderate" as Profile["activity"],
  goal: "eat_better" as Profile["goal"],
  pace: "moderate" as Profile["pace"],
  dietaryPattern: "none" as Profile["dietaryPattern"],
  allergies: "",
  dislikes: "",
  likedCuisines: [] as string[],
  spice: "mild" as Profile["spice"],
  maxCookMinutes: 30 as Profile["maxCookMinutes"],
  skill: "comfortable" as Profile["skill"],
  equipment: ["oven", "stovetop"] as string[],
  weeklyBudgetUsd: 100,
  householdSize: 2,
  guardrails: [] as string[],
  unitSystem: "imperial" as Profile["unitSystem"],
};

type Draft = typeof empty;

const STEPS = [
  "Why you're here",
  "Body and goal",
  "Food rules",
  "Taste",
  "Kitchen",
  "Household",
  "Your plan",
];

export function OnboardingWizard({ initial }: { initial?: Partial<Profile> }) {
  const router = useRouter();
  const setProfile = useCookbookStore((s) => s.setProfile);
  const [step, setStep] = useState(0);
  const [showNumbers, setShowNumbers] = useState(initial?.showNumbers ?? false);
  const [draft, setDraft] = useState<Draft>(() => ({
    ...empty,
    ...profileToDraft(initial),
  }));

  const profile = useMemo(() => draftToProfile(draft, showNumbers), [draft, showNumbers]);
  const parsed = ProfileSchema.safeParse(profile);
  const targets = parsed.success ? computeTargets(parsed.data) : null;

  useEffect(() => {
    void saveOnboardingDraft({ draft, step, showNumbers });
  }, [draft, step, showNumbers]);

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    if (!parsed.success) return;
    await setProfile(parsed.data);
    router.push("/cookbook?generate=1");
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-2 h-1 w-full bg-muted">
          <div
            className="h-1 bg-primary transition-[width] duration-enter ease-enter"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 ? (
        <IntentStep
          value={draft.intent}
          onChange={(intent) => {
            setDraft((d) => ({ ...d, intent }));
            setShowNumbers(intent === "performance");
          }}
        />
      ) : null}
      {step === 1 ? <BodyStep draft={draft} setDraft={setDraft} /> : null}
      {step === 2 ? <RulesStep draft={draft} setDraft={setDraft} /> : null}
      {step === 3 ? <TasteStep draft={draft} setDraft={setDraft} /> : null}
      {step === 4 ? <KitchenStep draft={draft} setDraft={setDraft} /> : null}
      {step === 5 ? <HouseholdStep draft={draft} setDraft={setDraft} /> : null}
      {step === 6 && targets ? (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl tracking-display">Your kitchen, tuned.</h1>
          {showNumbers || draft.intent === "performance" ? (
            <p className="measure text-lg leading-body">
              {targets.rationale} About {targets.proteinG}g protein, {targets.carbsG}g carbs,{" "}
              {targets.fatG}g fat.
            </p>
          ) : (
            <p className="measure text-lg leading-body">{targets.rationale}</p>
          )}
          {draft.intent !== "performance" ? (
            <button
              type="button"
              className="self-start text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => setShowNumbers((v) => !v)}
            >
              {showNumbers ? "Hide the numbers" : "Show me the numbers"}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" size="touch" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            size="touch"
            onClick={next}
            disabled={step === 0 && !draft.intent}
          >
            Continue
          </Button>
        ) : (
          <Button type="button" size="touch" onClick={() => void finish()} disabled={!parsed.success}>
            Write my first week
          </Button>
        )}
      </div>
    </div>
  );
}

function IntentStep({
  value,
  onChange,
}: {
  value: Intent | "";
  onChange: (intent: Intent) => void;
}) {
  const options: { intent: Intent; title: string; dek: string }[] = [
    {
      intent: "performance",
      title: "Hit my training goals",
      dek: "Protein, calories, and batch cooking that keep up with the gym.",
    },
    {
      intent: "everyday",
      title: "Eat better, simpler",
      dek: "Familiar dinners, less decision fatigue, no tracking.",
    },
    {
      intent: "managed",
      title: "Manage my health",
      dek: "Guardrails like sodium or sugar, explained in plain language.",
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl tracking-display">What&apos;s your main reason for being here?</h1>
      <div className="flex flex-col gap-3">
        {options.map((option, index) => (
          <button
            key={option.intent}
            type="button"
            onClick={() => onChange(option.intent)}
            className={`rounded-lg border px-5 py-5 text-left transition-colors duration-hover ease-standard ${
              value === option.intent ? "border-primary bg-card" : "border-border bg-card hover:bg-muted"
            } ${index === 0 ? "min-h-32" : ""}`}
          >
            <p className="font-display text-2xl tracking-display">{option.title}</p>
            <p className="mt-2 max-w-xl text-muted-foreground">{option.dek}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function BodyStep({ draft, setDraft }: { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void }) {
  const imperial = draft.unitSystem === "imperial";
  const { feet, inches } = cmToImperial(draft.heightCm);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl tracking-display">Body and goal</h1>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted-foreground">Units</legend>
        <div className="flex gap-2">
          {(["imperial", "metric"] as const).map((unit) => (
            <Chip
              key={unit}
              selected={draft.unitSystem === unit}
              onClick={() => setDraft((d) => ({ ...d, unitSystem: unit }))}
            >
              {unit}
            </Chip>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 text-sm">
        Sex
        <select
          className="h-11 rounded-lg border border-input bg-background px-3"
          value={draft.sex}
          onChange={(e) => setDraft((d) => ({ ...d, sex: e.target.value as Draft["sex"] }))}
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="unspecified">Prefer not to say</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Age
        <NumberField
          className="h-11"
          integer
          value={draft.age}
          onValueChange={(age) => {
            if (age === null) return;
            setDraft((d) => ({ ...d, age }));
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
                setDraft((d) => ({ ...d, heightCm: imperialToCm(next, inches) }));
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
                setDraft((d) => ({ ...d, heightCm: imperialToCm(feet, next) }));
              }}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-2 text-sm">
            Weight (lb)
            <NumberField
              key="weight-lb"
              className="h-11"
              integer
              value={kgToLb(draft.weightKg)}
              onValueChange={(next) => {
                if (next === null) return;
                setDraft((d) => ({ ...d, weightKg: lbToKg(next) }));
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
              value={draft.heightCm}
              onValueChange={(heightCm) => {
                if (heightCm === null) return;
                setDraft((d) => ({ ...d, heightCm }));
              }}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Weight (kg)
            <NumberField
              key="weight-kg"
              className="h-11"
              value={draft.weightKg}
              onValueChange={(weightKg) => {
                if (weightKg === null) return;
                setDraft((d) => ({ ...d, weightKg }));
              }}
            />
          </label>
        </div>
      )}
      <label className="flex flex-col gap-2 text-sm">
        Activity
        <select
          className="h-11 rounded-lg border border-input bg-background px-3"
          value={draft.activity}
          onChange={(e) => setDraft((d) => ({ ...d, activity: e.target.value as Draft["activity"] }))}
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
          value={draft.goal}
          onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value as Draft["goal"] }))}
        >
          <option value="eat_better">Eat better</option>
          <option value="lose">Lose</option>
          <option value="maintain">Maintain</option>
          <option value="gain">Gain</option>
        </select>
      </label>
      {draft.goal === "lose" || draft.goal === "gain" ? (
        <div className="flex gap-2">
          {(["slow", "moderate", "fast"] as const).map((pace) => (
            <Chip key={pace} selected={draft.pace === pace} onClick={() => setDraft((d) => ({ ...d, pace }))}>
              {pace}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RulesStep({ draft, setDraft }: { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl tracking-display">Food rules</h1>
      <p className="measure text-muted-foreground">
        Allergies are a hard rule. We will never put them in a recipe.
      </p>
      <label className="flex flex-col gap-2 text-sm">
        Allergies (comma separated)
        <Input
          className="h-11"
          value={draft.allergies}
          onChange={(e) => setDraft((d) => ({ ...d, allergies: e.target.value }))}
          placeholder="peanuts, shellfish"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Eating pattern
        <select
          className="h-11 rounded-lg border border-input bg-background px-3"
          value={draft.dietaryPattern}
          onChange={(e) => setDraft((d) => ({ ...d, dietaryPattern: e.target.value as Draft["dietaryPattern"] }))}
        >
          <option value="none">No specific pattern</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="pescatarian">Pescatarian</option>
          <option value="halal">Halal</option>
          <option value="kosher">Kosher</option>
          <option value="keto">Keto</option>
          <option value="paleo">Paleo</option>
          <option value="mediterranean">Mediterranean</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        {GUARDRAIL_OPTIONS.map((item) => (
          <Chip
            key={item}
            selected={draft.guardrails.includes(item)}
            onClick={() =>
              setDraft((d) => ({
                ...d,
                guardrails: d.guardrails.includes(item)
                  ? d.guardrails.filter((g) => g !== item)
                  : [...d.guardrails, item],
              }))
            }
          >
            {item.replaceAll("_", " ")}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function TasteStep({ draft, setDraft }: { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl tracking-display">Taste</h1>
      <label className="flex flex-col gap-2 text-sm">
        Dislikes
        <Input className="h-11" value={draft.dislikes} onChange={(e) => setDraft((d) => ({ ...d, dislikes: e.target.value }))} />
      </label>
      <div className="flex flex-wrap gap-2">
        {CUISINES.map((cuisine) => (
          <Chip
            key={cuisine}
            selected={draft.likedCuisines.includes(cuisine)}
            onClick={() =>
              setDraft((d) => ({
                ...d,
                likedCuisines: d.likedCuisines.includes(cuisine)
                  ? d.likedCuisines.filter((c) => c !== cuisine)
                  : [...d.likedCuisines, cuisine],
              }))
            }
          >
            {cuisine}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["none", "mild", "medium", "hot"] as const).map((spice) => (
          <Chip key={spice} selected={draft.spice === spice} onClick={() => setDraft((d) => ({ ...d, spice }))}>
            {spice}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function KitchenStep({ draft, setDraft }: { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl tracking-display">Kitchen and time</h1>
      <div className="flex flex-wrap gap-2">
        {([15, 30, 45, 60, 90] as const).map((minutes) => (
          <Chip
            key={minutes}
            selected={draft.maxCookMinutes === minutes}
            onClick={() => setDraft((d) => ({ ...d, maxCookMinutes: minutes }))}
          >
            {minutes} min
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["beginner", "comfortable", "confident"] as const).map((skill) => (
          <Chip key={skill} selected={draft.skill === skill} onClick={() => setDraft((d) => ({ ...d, skill }))}>
            {skill}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((item) => (
          <Chip
            key={item}
            selected={draft.equipment.includes(item)}
            onClick={() =>
              setDraft((d) => ({
                ...d,
                equipment: d.equipment.includes(item)
                  ? d.equipment.filter((e) => e !== item)
                  : [...d.equipment, item],
              }))
            }
          >
            {item.replaceAll("_", " ")}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function HouseholdStep({ draft, setDraft }: { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl tracking-display">Household and budget</h1>
      <label className="flex flex-col gap-2 text-sm">
        People at the table
        <NumberField
          className="h-11"
          integer
          min={1}
          max={12}
          value={draft.householdSize}
          onValueChange={(householdSize) => {
            if (householdSize === null) return;
            setDraft((d) => ({ ...d, householdSize }));
          }}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Weekly grocery budget (USD, optional)
        <NumberField
          className="h-11"
          integer
          value={draft.weeklyBudgetUsd}
          onValueChange={(weeklyBudgetUsd) =>
            setDraft((d) => ({ ...d, weeklyBudgetUsd: weeklyBudgetUsd ?? 0 }))
          }
        />
      </label>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center rounded-full border px-4 capitalize ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftToProfile(draft: Draft, showNumbers: boolean): Profile {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    intent: draft.intent || "everyday",
    sex: draft.sex,
    age: draft.age,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    activity: draft.activity,
    goal: draft.goal,
    pace: draft.goal === "lose" || draft.goal === "gain" ? draft.pace : undefined,
    dietaryPattern: draft.dietaryPattern,
    allergies: splitList(draft.allergies),
    dislikes: splitList(draft.dislikes),
    likedCuisines: draft.likedCuisines,
    spice: draft.spice,
    maxCookMinutes: draft.maxCookMinutes,
    skill: draft.skill,
    equipment: draft.equipment,
    weeklyBudgetUsd: draft.weeklyBudgetUsd || undefined,
    householdSize: draft.householdSize,
    guardrails: draft.guardrails,
    showNumbers: draft.intent === "performance" ? true : showNumbers,
    unitSystem: draft.unitSystem,
  };
}

function profileToDraft(profile?: Partial<Profile>): Partial<Draft> {
  if (!profile) return {};
  return {
    intent: profile.intent ?? "",
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activity,
    goal: profile.goal,
    pace: profile.pace ?? "moderate",
    dietaryPattern: profile.dietaryPattern,
    allergies: profile.allergies?.join(", ") ?? "",
    dislikes: profile.dislikes?.join(", ") ?? "",
    likedCuisines: profile.likedCuisines ?? [],
    spice: profile.spice,
    maxCookMinutes: profile.maxCookMinutes,
    skill: profile.skill,
    equipment: profile.equipment ?? ["oven", "stovetop"],
    weeklyBudgetUsd: profile.weeklyBudgetUsd ?? 100,
    householdSize: profile.householdSize,
    guardrails: profile.guardrails ?? [],
    unitSystem: profile.unitSystem,
  };
}

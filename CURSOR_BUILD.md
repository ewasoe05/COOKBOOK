# CURSOR BUILD SPEC — Adaptive Cookbook App

> **How to use this file:** Open an empty folder in Cursor. Drop this file in it. Open the Agent panel, attach this file, and type:
> `Read CURSOR_BUILD.md and build the entire app exactly as specified. Do not ask me questions — make reasonable decisions and keep going until every item in the Definition of Done passes.`
>
> The only thing the human will do is paste an Anthropic API key into `.env.local` when you tell them to. Everything else is your job.

---

## 0. Rules for the Agent

1. **Do not ask the human questions.** If something is ambiguous, pick the simplest sensible option, note it in `DECISIONS.md`, and continue.
2. **Run every command yourself** (install, build, lint, dev server). Never tell the human to run something you can run.
3. **Work in this order:** scaffold → data + logic → API routes → screens → polish → verify. Do not build UI before the nutrition engine and recipe generator work in isolation.
4. **Verify constantly.** After each phase run `npm run build` and `npm run lint`. Fix all errors before moving on. Never leave the app in a broken state.
5. **Write real code, not placeholders.** No `// TODO: implement`. No mock data left in production paths (seed/demo data is fine when clearly labeled).
6. **Handle the human's one job:** create `.env.local.example`, and when the app is otherwise complete, print a single clear message:
   `→ Paste your Anthropic API key into .env.local as ANTHROPIC_API_KEY=... then the app is live at http://localhost:3000`
   Until the key exists, the app must still run and show a friendly "Add your API key" banner instead of crashing.
7. Commit to git after each phase with a clear message.

---

## 1. What We're Building

A web app that builds a personal cookbook around the user's body, goals, and lifestyle. It calculates real nutrition targets, generates a full week of meals that fit them using Claude, verifies nutrition against the USDA database, saves everything into a growing cookbook, and produces a grocery list. It must work equally well for someone bulking at 3,000 calories and for someone who just wants to eat better and never look at a number.

**The product is customization.** Nothing about the app should feel generic.

---

## 2. Fixed Tech Stack (do not change)

- **Next.js 14+ (App Router), TypeScript, Tailwind CSS**
- **shadcn/ui** for components (install via CLI)
- **Zustand** for client state, **persisted to IndexedDB** via `idb-keyval` (no accounts in v1 — all data lives on device)
- **Anthropic API** (`@anthropic-ai/sdk`) called **only from Next.js Route Handlers** so the key is never exposed to the browser. Model: `claude-sonnet-4-6`
- **USDA FoodData Central API** for nutrition verification. Use `DEMO_KEY` if `USDA_API_KEY` is not set (it has rate limits — cache aggressively)
- **Zod** for every schema (profile, recipe, week, Claude output)
- **Vitest** for the nutrition engine and schema tests
- Images: **no image API in v1.** Each recipe gets a deterministic, attractive gradient card with an emoji chosen by Claude. Structure the code so an image URL can be dropped in later.

Env vars:
```
ANTHROPIC_API_KEY=        # required for generation
USDA_API_KEY=             # optional, falls back to DEMO_KEY
```

---

## 3. Data Models (implement as Zod schemas in `/lib/schemas.ts`)

### Profile
```ts
{
  id: string
  createdAt: string
  intent: "performance" | "everyday" | "managed"   // set by the first onboarding question
  sex: "male" | "female" | "unspecified"
  age: number
  heightCm: number
  weightKg: number
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active"
  goal: "lose" | "maintain" | "gain" | "eat_better"
  pace?: "slow" | "moderate" | "fast"               // only for lose/gain
  dietaryPattern: "none" | "vegetarian" | "vegan" | "pescatarian" | "halal" | "kosher" | "keto" | "paleo" | "mediterranean"
  allergies: string[]                                // HARD RULE — never violated
  dislikes: string[]
  likedCuisines: string[]
  spice: "none" | "mild" | "medium" | "hot"
  maxCookMinutes: 15 | 30 | 45 | 60 | 90
  skill: "beginner" | "comfortable" | "confident"
  equipment: string[]                                // e.g. ["oven","stovetop","air_fryer","slow_cooker","microwave","blender","grill"]
  weeklyBudgetUsd?: number
  householdSize: number
  guardrails: string[]                               // e.g. ["low_sodium","low_sugar","low_carb","high_fiber"]
  showNumbers: boolean                               // performance → true by default, others → false
  unitSystem: "imperial" | "metric"
}
```

### Targets (computed, never stored by hand)
```ts
{
  bmr: number
  tdee: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  sodiumMgMax?: number
  addedSugarGMax?: number
  rationale: string   // one plain-English sentence explaining the target
}
```

### Recipe
```ts
{
  id: string
  title: string
  emoji: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  servings: number
  prepMinutes: number
  cookMinutes: number
  costEstimateUsd: number
  cuisine: string
  ingredients: { name: string; amount: number; unit: string; usdaFdcId?: number }[]
  steps: { title: string; text: string; timerSeconds?: number }[]
  nutritionPerServing: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; sodiumMg: number; addedSugarG: number }
  nutritionSource: "usda_verified" | "ai_estimate"
  whyThisFitsYou: string
  tags: string[]
  rating?: "up" | "down"
  madeCount: number
  makeAgain: boolean
  weekId: string
  createdAt: string
}
```

### Week (a "chapter" of the cookbook)
```ts
{
  id: string
  number: number             // Week 1, Week 2...
  createdAt: string
  profileSnapshot: Profile   // profile as it was when generated
  targets: Targets
  days: { day: 0|1|2|3|4|5|6; meals: { mealType: string; recipeId: string }[] }[]
  groceryList: { section: string; items: { name: string; amount: number; unit: string; checked: boolean; inPantry: boolean }[] }[]
  summary: string            // 2-sentence intro to the week written by Claude
}
```

### CheckIn
```ts
{ id: string; date: string; weightKg?: number; energy: 1|2|3|4|5; hunger: 1|2|3|4|5; note?: string }
```

---

## 4. Nutrition Engine (`/lib/nutrition.ts`) — build and test this FIRST

- **BMR:** Mifflin-St Jeor. For `sex: "unspecified"`, average the male and female results.
- **TDEE multipliers:** sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9
- **Calories by goal:**
  - lose: slow −250, moderate −500, fast −750 (never below 1,200 F / 1,500 M)
  - gain: slow +250, moderate +400, fast +600
  - maintain / eat_better: TDEE
- **Protein:** performance intent → 2.0 g/kg (gain) or 2.2 g/kg (lose); everyday/managed → 1.4 g/kg. Cap at 40% of calories.
- **Fat:** 25–30% of calories (use 28%). Keto pattern overrides: fat 70%, carbs ≤ 25 g.
- **Carbs:** remainder.
- **Fiber:** 14 g per 1,000 kcal.
- **Guardrails:** low_sodium → 1,500 mg max; low_sugar → 25 g added sugar max; low_carb → carbs ≤ 100 g; high_fiber → fiber ×1.3.
- **Per-meal split:** breakfast 25%, lunch 30%, dinner 35%, snack 10%. Tolerance ±12% per meal, ±5% per day.
- Write Vitest tests covering every goal/intent combination plus the floors and guardrails.

---

## 5. USDA Verification (`/lib/usda.ts`)

- For each ingredient: search FoodData Central (`/foods/search`, dataType Foundation + SR Legacy first, Branded as fallback), take the top match, pull calories/protein/carbs/fat/fiber/sodium/sugars per 100 g, convert the recipe amount to grams using a unit table (cup/tbsp/tsp/oz/lb/g/ml + common per-item weights for eggs, bananas, chicken breast, etc.), and sum.
- Cache every USDA lookup in IndexedDB keyed by normalized ingredient name. Never look up the same ingredient twice.
- If lookup fails for an ingredient, fall back to Claude's estimate for that ingredient only and mark the recipe `nutritionSource: "ai_estimate"`.
- If verified calories differ from Claude's estimate by more than 15%, **rescale the ingredient amounts proportionally** to hit the meal target, then re-sum. Max 2 rescale passes.

---

## 6. Recipe Generation (`/app/api/generate/route.ts`)

**One call generates a full week.** Do not generate meal by meal.

System prompt must include:
- The full profile and computed targets, per-meal calorie/macro windows
- Allergies as an absolute prohibition, restated twice
- Dislikes, cuisines, spice, max cook time, skill, equipment (only use listed equipment), budget, household size (servings = householdSize; batch-cooked recipes may set servings = householdSize × 2 and be reused across days — encourage this for `performance` intent)
- Intent-specific voice:
  - performance → concise, macro-forward, batch-friendly, "why" mentions protein/calories
  - everyday → warm, simple, "why" never mentions numbers, favors familiar comfort food done healthier
  - managed → reassuring, explains guardrails plainly, avoids diet language
- Rating history: titles of everything rated up (weight toward similar), everything rated down (avoid), pantry favorites
- Variety rule: no protein source or cuisine more than 3× in the week unless performance intent
- **Output: JSON only, matching the Week + Recipe schema exactly.** No markdown fences. Validate with Zod; on failure, send the validation errors back to Claude once for repair; on second failure return a clear error to the UI.

Use `max_tokens: 16000`. Stream is not required; show a progress screen with rotating messages ("Calculating your targets…", "Writing Week 3…", "Checking nutrition…").

Second route `/app/api/regenerate-meal/route.ts` replaces a single meal with the same constraints plus "not like: [old title]".

Third route `/app/api/grocery/route.ts` is **not needed** — build the grocery list deterministically in `/lib/grocery.ts`: merge identical ingredients across the week (normalize names and units), subtract pantry items, group by store section (Produce, Meat & Seafood, Dairy & Eggs, Pantry, Frozen, Bakery, Spices, Other) using a keyword map.

---

## 7. Screens

All screens mobile-first (375 px), then responsive. Use shadcn/ui. Design should feel like a **modern cookbook**, not a fitness tracker: warm off-white background, one deep accent color (choose a rich terracotta or forest green), serif for recipe titles (e.g. Fraunces or Playfair via `next/font`), sans for body. Generous whitespace. No dashboards-with-six-widgets.

### `/` — Landing / Onboarding
- If no profile → onboarding. If profile → redirect to `/cookbook`.
- Step 1 asks only: **"What's your main reason for being here?"** with three big cards: *Hit my training goals* / *Eat better, simpler* / *Manage my health*. This sets `intent` and the tone of everything that follows.
- Steps 2–6: body & goal, food rules (allergies first, big and clear), taste & cuisines, kitchen & time, household & budget. One question group per screen, progress bar, back button, all values saved as you go.
- Final step: show targets. For performance intent show the numbers with the rationale. For others show a plain sentence ("We'll build you meals around roughly 2,100 calories a day — you won't need to track anything") with a "show me the numbers" toggle.
- Button: **Write my first week**.

### `/cookbook` — Home
- Header: "[Name or 'Your'] Cookbook" + current week number
- Tabs: **This Week** · **Greatest Hits** · **All Chapters**
- This Week: 7-day grid (day pills across the top), meals as recipe cards with emoji, title, time, and either macros (showNumbers) or a one-line "why". Each card has swap (regenerate) and heart.
- Empty state for new users leads straight to generation.
- Floating button: **Write next week**

### `/recipe/[id]`
- Hero card (gradient + emoji), title, time, servings (adjustable — scales ingredients), cost
- "Why this fits you" callout
- Ingredients with checkboxes; steps; **Cook mode** button → full-screen step-by-step with timers
- Nutrition panel (collapsed by default unless showNumbers), with a small "USDA verified" or "estimated" badge
- Rate: 👍 👎 · "I made this" (increments madeCount) · "Make again" toggle

### `/grocery`
- Current week's list grouped by section, checkboxes persist, "I have this" moves item to pantry (remembered for future weeks)
- **Copy as text** and **Share** buttons (Web Share API with clipboard fallback)

### `/profile`
- Edit anything from onboarding; changing body/goal fields recalculates targets live and shows a "your next week will use these" note
- Weekly check-in card (weight optional, energy, hunger) with a tiny sparkline of weight over time
- Danger zone: export all data as JSON, import JSON, reset

### Global
- Sticky bottom nav on mobile: Cookbook · Grocery · Profile
- "Add your API key" banner when `ANTHROPIC_API_KEY` is missing (server checks, client displays)
- Every network action has loading, error, and retry states

---

## 8. Seed / Demo

Include `/lib/seed.ts` with three demo profiles (a 20-year-old male lifter bulking at ~3,000 kcal, a 38-year-old parent of four wanting simpler dinners, a 55-year-old on low sodium). Add a hidden route `/demo` that loads one and pre-fills onboarding so the app can be tried without typing. Do not generate weeks at seed time (that needs the API key).

---

## 9. Definition of Done (verify every line before stopping)

- [ ] `npm run build` and `npm run lint` pass with zero errors
- [ ] `npm run test` passes; nutrition engine has ≥ 20 tests
- [ ] Fresh visitor completes onboarding in all three intents and sees correctly toned target screens
- [ ] With API key: generating a week produces 7 days, all meals validate against schema, allergies never appear in any ingredient, no meal exceeds `maxCookMinutes`, daily calories within ±5% of target
- [ ] Without API key: app runs, shows banner, nothing crashes
- [ ] USDA lookups are cached; generating a second week hits the API far fewer times
- [ ] Swap a meal works and the new meal differs from the old
- [ ] Ratings persist across reload and influence the next week's prompt (visible in server log)
- [ ] Grocery list merges duplicates, respects pantry, copies to clipboard
- [ ] Cook mode timers count down and alert
- [ ] Export → reset → import restores everything
- [ ] Lighthouse mobile performance ≥ 85, accessibility ≥ 95
- [ ] `README.md` explains what the app is, the one env var, and `npm run dev`
- [ ] `DECISIONS.md` lists every judgment call you made
- [ ] Final message to human printed exactly as specified in Rule 6

---

## 10. Out of Scope for This Build (do not start these)

Accounts / cloud sync, payments, image generation, restaurant mode, integrations, native app wrappers. Leave clean extension points (a `storage` adapter interface, an `imageUrl?` field) but build nothing further.

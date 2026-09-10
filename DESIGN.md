# DESIGN DIRECTION — Adaptive Cookbook

**Authoritative. Overrides any default, including shadcn and Tailwind kit aesthetics.**

This file is the visual and product contract. Cursor reads `.cursor/rules/design.mdc`, which points here. Do not re-decide fonts, colors, radii, motion, or layout primitives in a component.

## Product

A mobile-first personalized cookbook web app. Warm, editorial, appetizing, calm — like a modern food magazine (Kinfolk / Bon Appétit / Ottolenghi), not a SaaS dashboard.

**Adaptive** means the cook can scale servings, keep multiple timers, and cook from a large-type always-on Cook Mode. v1 is image-less: typography and meal-type color blocks are the visual.

Light mode is the default. Dark mode is an optional warm-espresso theme, never the default and never gray.

## Stack

Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui. Theme via CSS variables in `app/globals.css` (`:root` + `.dark`, mapped with `@theme inline`). Load fonts with `next/font/google`. Icons: Lucide only.

## Typography (exact)

- Display / headings / wordmark: **Fraunces** (variable). `font-optical-sizing: auto`. Explicitly set weight (do NOT rely on the default — Fraunces defaults to 900). Set **WONK off for UI**; WONK on only for the wordmark. Never set Fraunces below 16px.
- Body / UI: **Source Sans 3**. Never use Inter for display. Never load Inter at all.
- Two font families only.
- Type scale (px): 16 / 20 / 25 / 31 / 39 / 49. Body 16px; recipe intros 18–20px. Line-height: body 1.5, headings 1.15. Body measure `max-width: 66ch`.
- Repeat ingredient quantities **inline inside step text**.
- Headings may use `letter-spacing: -0.01em` only on the 39 / 49 sizes.

## Color

Paste and keep the OKLCH tokens in `app/globals.css`. Hue anchors: terracotta ~40–50°, cream ~80–95°, olive/sage ~110–130°.

Token roles:

| Token | When to use | When not to use |
| --- | --- | --- |
| `--primary` | The single highest-emphasis action per screen | Never two primary buttons in one view |
| `--secondary` / `--accent` | Soft sage bands, selected chips, meal-type lunch | Not for primary CTAs |
| `--muted` | Skeleton fills, inset wells, hairline separation | Not as body text |
| `--destructive` | Destructive / discard only | Not for “spicy” decoration |

Meal-type color blocks (image-less cards) use theme tokens, never hex:

- breakfast — `--meal-breakfast`
- lunch — `--meal-lunch`
- dinner — `--meal-dinner`
- dessert — `--meal-dessert`
- snack — `--meal-snack`

## Radius, spacing, motion

- `--radius: 0.625rem`. One radius system. Pills (`rounded-full`) only for chips/tags. No `rounded-2xl` everywhere.
- Tailwind default spacing scale only (4px base). **No arbitrary bracket values** (`p-[13px]`, `text-[#…]`, `w-[327px]`).
- Hover/press: **120ms**. Entrances / state changes: **200ms**. Page / modal: **280ms**. Never >500ms.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` standard; `cubic-bezier(0, 0, 0.2, 1)` for entrances.
- Honor `prefers-reduced-motion` (collapse to 0.01ms). Animate only meaningful state changes; keep animations interruptible.

## Loading

`loading.tsx` per route + `<Suspense>` per section. Skeletons only (never spinners). Match real dimensions/grid. `bg-muted`, subtle `animate-pulse`, 3–6 items.

## Icons

Lucide only, one stroke width (`strokeWidth={1.5}`). NEVER emoji as icons. NEVER mix icon libraries.

## Layout

- Mobile-first 375px. Thumb-zone: primary cook actions in the bottom reachable third.
- Left-aligned editorial hero. No centered hero. No pill badge floating above the H1.
- Do **not** put everything in cards. Separate with whitespace, rules, and type scale. Cards are only for genuinely card-like objects (a recipe preview).
- Break the grid: one full-bleed featured recipe, then an asymmetric list — unequal emphasis, not three identical icon-top cards.
- Cook Mode: large step type, always-on, multiple simultaneous timers, quantities repeated in each step.

## Image-less recipe cards (v1)

Typographic-led. Dish name in Fraunces; a warm color-block band keyed to meal type; time / calories / macros in Source Sans 3. Composed, not a missing-image fallback. NO colored left/top accent stripe. Max one soft shadow; prefer hairline `--border`.

## Accessibility

- Text contrast ≥4.5:1. Verify white-on-terracotta and muted-foreground.
- Touch targets ≥44×44px (invisible padding if the glyph is smaller).
- `:focus-visible` outline ≥2px using `--ring` (terracotta), `outline-offset: 2px`. Never remove focus.
- Never block zoom. Use `rem` and unitless line-heights.

## PROHIBITIONS (never do)

- never Inter for display (never Inter at all)
- never indigo / violet / purple
- never a blue or blue→purple gradient
- never permanent / default dark mode
- never centered hero + floating badge
- never colored card border stripe
- never emoji icons
- never glassmorphism
- never large colored glows / box-shadows
- never arbitrary spacing or hex values in components
- never identical 3-card icon-top rows
- never `rounded-2xl` on everything
- never more than two typefaces
- never spinners; skeletons only

## QA before done

Grep for `#`-hex literals in `app/` and `components/` (except comments in `globals.css`). Grep for arbitrary `[` values in classNames. Confirm no Inter, no purple, no card accent stripes, no emoji icons. Confirm 44px targets and visible focus. Render every screen at 375px and desktop.

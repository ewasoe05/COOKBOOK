# Decisions

Judgment calls made while implementing CURSOR_BUILD.md under the Adaptive Cookbook design spec.

- **Sex unspecified calorie floor:** 1,350 kcal (midpoint of 1,200 female / 1,500 male).
- **Missing pace on lose/gain:** treated as `moderate`.
- **Performance + maintain/eat_better protein:** 2.0 g/kg (same as gain). Only `lose` uses 2.2 g/kg.
- **Keto macros:** carbs capped at 25 g; fat aims at 70% of calories but yields to protein so totals stay near the calorie target.
- **low_carb leftover calories:** moved onto fat after capping carbs at 100 g.
- **Recipe emoji:** stored as dish content on cards (`recipe.emoji`). Lucide remains the only UI icon set (design spec bans emoji as chrome).
- **Card visual:** meal-type color block (not a brand blue/purple gradient) plus the recipe emoji. Design spec wins over “gradient as brand.”
- **No name field on Profile:** cookbook header always reads “Your Cookbook”.
- **USDA cache:** server Map for the current generate request, plus IndexedDB on the client. The client sends cached lookups with generate/regenerate so a second week hits USDA less. Serverless has no durable disk.
- **USDA DEMO_KEY:** used when `USDA_API_KEY` is unset.
- **Claude model:** default `claude-sonnet-4-6` when the provider is Anthropic. JSON-only; one repair pass on Zod failure.
- **AI keys:** server-only. `AI_API_KEY` + optional `AI_PROVIDER` covers Anthropic, OpenAI, OpenRouter, Groq, Google, and any OpenAI-compatible `AI_BASE_URL`. Native env names still work. Visitors never paste a key; once the host is configured, generation is automatic. The banner is operator-facing in local dev and a short “not on this host yet” note in production.
- **Onboarding draft:** persisted in IndexedDB as you go; generation requires a complete `ProfileSchema`.
- **Imperial display:** stored metric internally; converted only in the UI.
- **Vitest:** pinned to v3 so it peers with `@types/node@20`.
- **Client USDA cache on generate:** the browser sends its IndexedDB USDA cache with every generate/regenerate so serverless lookups skip known ingredients.
- **Cook-mode alerts:** timer zero plays a short beep (Web Audio) and vibrates on Android; iOS has no Vibration API.
- **Copy vs Share on grocery:** Copy writes the clipboard; Share uses the Web Share API and falls back to clipboard.
- **Profile editing:** body, goal, allergies, household, guardrails, and equipment are editable live; next-week generation uses the saved profile.
- **Demo sample chapter:** `/demo` can load a clearly labeled sample week (not Claude-generated) so cook mode and grocery can be tried without an API key.
- **10-second cook timer:** added as a rest/sear preset so short timers are usable at the stove.
- **Grocery volume merge:** tsp/tbsp/cup of the same ingredient are converted to one line.
- **Lighthouse (mobile, production `next start`):** performance 88, accessibility 100 on `/`. Dev-server Lighthouse is slower and was not used for the bar.
- **Everywhere / App Store:** ship as a hosted Next.js PWA first (Vercel + Add to Home Screen). An App Store binary should be a Capacitor/WKWebView shell of that HTTPS origin so the AI key never ships in the client. Native wrappers stay deferred until there is a live domain and an Apple Developer account.
- **Week write on phones:** `/api/generate` and `/api/regenerate-meal` stream NDJSON with keep-alive pings (Safari buffers the first 1 KB). The client rewrites WebKit's raw `Load failed` / Chromium `Failed to fetch` / `Request timeout` into a stay-on-the-page retry. USDA lookups run in parallel with an 8s timeout so a hung FoodData Central call cannot take the whole week down.
- **One day per request:** a full 7-day JSON chapter plus USDA exceeds Vercel’s request window (Hobby 10s, Pro often 60s). The client now asks for Sunday–Saturday in seven calls, Haiku + 5k tokens per day, and assembles the week + grocery list on the device. Week writes skip USDA (model `ai_estimate`); swap still verifies when a USDA key exists. `maxDuration` is 60s per route.

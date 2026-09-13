# Adaptive Cookbook

A personal cookbook web app. It calculates nutrition targets from your body and goals, writes a week of meals with Claude, checks them against USDA FoodData Central, and turns them into a grocery list. Design is warm and editorial (Fraunces + Source Sans 3, terracotta on cream). See [DESIGN.md](./DESIGN.md) and [CURSOR_BUILD.md](./CURSOR_BUILD.md).

Cookbook data lives on the device (IndexedDB). AI keys stay on the server. People using the site never paste a key.

## Run locally

```bash
npm install
cp .env.local.example .env.local
# paste one server key, then:
npm run dev
```

In `.env.local` you only need **one** of:

```
AI_API_KEY=...          # any provider; sniffed from the key prefix if AI_PROVIDER is blank
AI_PROVIDER=anthropic   # or openai | openrouter | groq | google
AI_MODEL=               # optional override
AI_BASE_URL=            # optional; any OpenAI-compatible host (Together, Fireworks, Ollama, …)
```

Provider-native names still work: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`.

Open [http://localhost:3000](http://localhost:3000).

`USDA_API_KEY` is optional (falls back to `DEMO_KEY`).

Without a server AI key the app still runs: onboarding, profile, and saved data work. Generation shows a banner instead of crashing. Once the key is set on the host, visitors write weeks with no setup.

Hidden demo: [/demo](http://localhost:3000/demo)

## Deploy (available everywhere)

This is a Next.js app with server routes, so it needs a Node host — [Vercel](https://vercel.com) is the usual choice.

1. Push this repo and import it in Vercel (or `npx vercel`).
2. Set env vars in the Vercel project:
   - `AI_API_KEY` — required for generating weeks (any supported provider)
   - `AI_PROVIDER` — optional if the key prefix can be sniffed (`anthropic`, `openai`, `openrouter`, `groq`, `google`)
   - `AI_MODEL` / `AI_BASE_URL` — optional
   - `USDA_API_KEY` — optional
   - `NEXT_PUBLIC_SITE_URL` — `https://your-domain.vercel.app` (or your custom domain)
3. Deploy. Open that `https://` URL on any phone or computer. Users do not enter an API key.

On iPhone: Safari → Share → **Add to Home Screen**. The app is a PWA (standalone, terracotta icon). Some cook-mode extras (vibration) still do not exist on iOS; timers do.

Generation always runs on the host. Do not put an AI key in the iPhone app or a public client bundle.

## App Store (later)

The App Store build should be a thin iOS shell around this **hosted** site, not a second copy of the API:

1. Keep the Vercel (or similar) backend as the source of truth so the AI key never ships in the binary.
2. Wrap it with [Capacitor](https://capacitorjs.com) (`server.url` = your production HTTPS URL) or a small WKWebView app.
3. Apple Developer Program ($99/year), Xcode, privacy nutrition labels, and a privacy policy URL.
4. TestFlight, then App Store review.

Until that wrapper exists, Add to Home Screen is the iPhone install path. Native wrappers were deferred on purpose: they need your Apple account and a live HTTPS backend first.

## Scripts

- `npm run dev`
- `npm run test` — nutrition engine, grocery merge, unit conversions
- `npm run lint`
- `npm run build`
- `npm run icons` — regenerate PWA PNG icons

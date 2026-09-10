# Adaptive Cookbook

A personal cookbook web app. It calculates nutrition targets from your body and goals, writes a week of meals with Claude, checks them against USDA FoodData Central, and turns them into a grocery list. Design is warm and editorial (Fraunces + Source Sans 3, terracotta on cream). See [DESIGN.md](./DESIGN.md) and [CURSOR_BUILD.md](./CURSOR_BUILD.md).

Cookbook data lives on the device (IndexedDB). The Anthropic key stays on the server.

## Run locally

```bash
npm install
cp .env.local.example .env.local
# paste ANTHROPIC_API_KEY=...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`USDA_API_KEY` is optional (falls back to `DEMO_KEY`).

Without an Anthropic key the app still runs: onboarding, profile, and saved data work. Generation shows a banner instead of crashing.

Hidden demo: [/demo](http://localhost:3000/demo)

## Deploy (available everywhere)

This is a Next.js app with server routes, so it needs a Node host — [Vercel](https://vercel.com) is the usual choice.

1. Push this repo and import it in Vercel (or `npx vercel`).
2. Set env vars in the Vercel project:
   - `ANTHROPIC_API_KEY` — required for generating weeks
   - `USDA_API_KEY` — optional
   - `NEXT_PUBLIC_SITE_URL` — `https://your-domain.vercel.app` (or your custom domain)
3. Deploy. Open that `https://` URL on any phone or computer.

On iPhone: Safari → Share → **Add to Home Screen**. The app is a PWA (standalone, terracotta icon). Some cook-mode extras (vibration) still do not exist on iOS; timers do.

Generation always runs on the host. Do not put the Anthropic key in the iPhone app or a public client bundle.

## App Store (later)

The App Store build should be a thin iOS shell around this **hosted** site, not a second copy of the API:

1. Keep the Vercel (or similar) backend as the source of truth so `ANTHROPIC_API_KEY` never ships in the binary.
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

@AGENTS.md

# Blinc Reviews

Public Shopify reviews app (Judge.me/Okendo competitor, targeting Built for Shopify).
React Router 7 app, Polaris web components (`s-*`), Prisma + Postgres (Railway), Admin API 2026-10.

## Layout

- `app/features/<area>/` — domain logic (`*.server.ts` server-only; plain `.ts` shared with the client).
  - `reviews/` storefront submit/list, ratings + metafield sync, admin moderation
  - `requests/` review request scheduling + worker, emails (`email-template.ts` is the pure renderer used by senders and editor previews), `notifications.server.ts` (reply, confirmation)
  - `appearance/` widget design (`blinc.design` app-installation metafield)
  - `settings/`, `imports/`, `media/` (photos in Railway bucket), `setup/` (theme detection)
- `app/routes/` — `app.*` admin pages, `proxy.*` storefront app proxy (`/apps/blinc-reviews/*`), `e.*` public email links (open pixel, unsubscribe, confirm), `webhooks.*`.
- `extensions/blinc-reviews-theme/` — theme app extension: blocks `reviews`, `star-rating` (autofill product setting), `app-embed` (collection card stars).
- `widget/src/` — storefront JS/CSS sources, bundled by esbuild into the extension `assets/`.

## Rules

- Never edit `extensions/blinc-reviews-theme/assets/*` directly: edit `widget/src` and run `npm run widget:build`. App-block JS budget is 10 KB per file; keep `blinc-reviews.js` lean and lazy-load extras.
- App snippets are wrapped in HTML comments: never render a snippet inside a tag (`blinc-root-open` echoes the whole opening tag).
- Storefront data comes from metafields first: standard `reviews.rating` / `reviews.rating_count` (theme-native stars) plus `blinc.breakdown`, `blinc.photos`, `blinc.reviews`.
- Email settings live in the `blinc.email` app-installation metafield; sender name / reply-to in `ShopSettings`.
- Validate GraphQL and Polaris components with the Shopify Dev MCP `validate` tool. `Shop.brand` doesn't exist in the Admin API.
- Settings pages must live under `/app/settings/*` (the admin nav highlights by URL prefix; anything else falls back to Home). Sections use the `app.settings.tsx` layout; pages needing their own page actions use `app.settings_.*` routes with `SettingsShell`.
- Customer-facing links that change state (unsubscribe, confirm) are GET = confirmation page, POST = action (mail scanners prefetch).

## Commands

- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run widget:build`
- `npm run build` must print `✓ built in` twice; typecheck does not catch route components importing from `*.server.ts` (constants/types used by the UI belong in a plain `.ts` file).
- ESLint uses `--cache`; after fixing a parse error, delete `node_modules/.cache/eslint` if stale errors remain.
- Direct scripts: `npx tsx --env-file=.env script.ts`.
- Editing tools decode `\uXXXX` escapes into real characters (NBSP, control chars break lint). For escapes in source, build them in a script with `String.fromCharCode(92)`, or check with `npm run lint` before committing.
- Customer-facing text: storefront strings in `extensions/blinc-reviews-theme/locales/*.json` (18 languages); emails and app-proxy pages in `app/features/i18n/`. Keep languages in sync when adding strings.

## Dev environment (Windows)

- The user runs WireGuard: Shopify API and Railway DB calls are slow (~1 s / ~300 ms) and occasionally fail with `fetch failed` — network, not code.
- Prisma EPERM on generate = an orphaned `react-router dev` process holds the DLL; kill it.
- Dev preview extension IDs change when the preview is recreated: blocks show "not found" until removed and re-added in the theme editor.
- Don't deploy to Railway or push to GitHub unless asked.

## Billing

- Shopify App Pricing (Billing API is legacy): plans/prices/trials live in the Partner Dashboard; plan handles must contain `pro` / `business`. Limits and features are in `app/features/billing/plans.ts`.
- `resolvePlan` (Partner API `activeSubscription`, 5-min cache) gates `/app` and stores `Shop.plan` for the worker. Env: `SHOPIFY_PARTNER_ORG_ID`, `SHOPIFY_PARTNER_API_ACCESS_TOKEN`, `SHOPIFY_APP_GID`, `SHOPIFY_APP_HANDLE`. Without them billing is off and `BILLING_DEV_PLAN` (default `business`) applies.

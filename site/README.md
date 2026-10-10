# site

Public marketing website for applyspace (`applyspace.app`). Next.js 16 (App Router), Tailwind v4, Sanity as CMS. Separate Vercel project from `apps/web` (root directory `site`). It is its own pnpm root (`site/pnpm-workspace.yaml`, own lockfile), so it does not touch the app's lockfile.

Linear: project Website, APP-138. Content plan: [`docs/website-content-plan.md`](../docs/website-content-plan.md).

## Run

```bash
cd site
pnpm install
pnpm dev          # http://localhost:3100
pnpm lint && pnpm typecheck && pnpm build && pnpm budget
pnpm studio       # Sanity Studio, needs the Sanity env vars
```

Without any Sanity env var the site builds and renders from the local fallback content in `src/content/fallback/`. With them, Sanity wins for every document type that has content; an empty or failing query falls back silently (error logged).

## Structure

```
src/app/[locale]/      pages (home, product, pricing, resources, resources/[slug])
src/app/{og,sitemap.ts,robots.ts,api/revalidate}
src/proxy.ts           unprefixed English URLs: rewrite to /en, redirect /en/x to /x
src/content/           types, UI strings, fallback content (what ships without Sanity)
src/lib/               env, i18n, content access layer, SEO helpers, JSON-LD, Sanity client
src/components/        layout (header, mobile menu, footer), sections, ui
sanity/schemaTypes/    schemas; sanity.config.ts and sanity.cli.ts at the site root
```

Design: same tokens as `apps/web` (brand scale, stone neutrals, radius, 1.6px borders, no shadows, Fraunces headlines, Geist body, Hugeicons). Fonts are self-hosted (`geist`, `@fontsource-variable/fraunces`), no third-party requests.

## Environment variables (names only, see `.env.example`)

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | Canonical origin, default `https://applyspace.app` |
| `NEXT_PUBLIC_APP_URL` | build | App origin for Sign in / Start for free, default `https://app.applyspace.app` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | build, studio | Sanity project id (public) |
| `NEXT_PUBLIC_SANITY_DATASET` | build, studio | Dataset name (public) |
| `NEXT_PUBLIC_SANITY_API_VERSION` | build | Optional, default `2026-10-01` |
| `SANITY_API_READ_TOKEN` | server | Only for a private dataset |
| `SANITY_REVALIDATE_SECRET` | server | Shared secret for `POST /api/revalidate` |

`VERCEL_ENV` (set by Vercel) decides indexing: only `production` is indexable; previews, staging and local runs send `noindex` and `Disallow: /`.

## Content model (Sanity)

`siteSettings`, `page` (home, product, pricing, resources: heading, intro, hero buttons, ordered sections, SEO), `feature` (anchor id, theme, copy, screenshot + alt, plan, "not shipped yet"), `pricingPlan` (caps, planned price, "not purchasable yet"), `resource` (article with Portable Text body, SEO). Every document has a `language` field (`en` today); routes are already `[locale]`-based.

Webhook: in Sanity, add a webhook on publish to `https://applyspace.app/api/revalidate` (POST, header `x-revalidate-secret`). Without it, content refreshes within 5 minutes anyway.

Plan caps in Sanity must match the database (`enforce_application_cap`: Free 15, Plus 99, Max unlimited).

## SEO checklist

- [x] Unique title and description per page, site name appended by template
- [x] One H1 per page, H2/H3 hierarchy, landmarks, skip link
- [x] Canonical URL on every page, one URL per page (`/en/x` redirects to `/x`)
- [x] `hreflang` and `x-default` generated from the locale list
- [x] Open Graph and Twitter cards; generated card at `/og?title=`, or an image set in Sanity
- [x] `sitemap.xml` (static pages + every article, with `lastmod`)
- [x] `robots.txt`: production allows, everything else disallows; `noindex` meta outside production
- [x] JSON-LD: Organization, WebSite (all pages), SoftwareApplication (Home, Product), FAQPage (Pricing), Article and BreadcrumbList (articles), BreadcrumbList (Product, Pricing, Resources). No fake ratings.
- [x] Image alt text required in the CMS for covers, article images and screenshots
- [x] Static generation for every page, 5 minute ISR for Sanity content, tag revalidation
- [x] Fonts self-hosted with `font-display: swap`; no third-party scripts
- [x] Performance budget: `pnpm budget` fails above 170 kB gzip JS per page (framework baseline about 143 kB)
- [ ] Real screenshots (placeholders ship), French copy, privacy policy and terms pages
- [ ] Search Console and Bing property verification, then submit the sitemap (founder)

## Founder actions

1. **Sanity**: create the project and a `production` dataset (founder account, no account is created by agents). Run `pnpm studio:deploy` or host the studio; add CORS origins for the studio and site URLs. Create documents (or leave empty to keep the fallback).
2. **Vercel**: new project from this repo with Root Directory `site`; set the env vars above; add `applyspace.app` and `www.applyspace.app` (redirect www to apex). Do not remove `demo.applyspace.app` from the app project.
3. **Decide where the app lives** once the site takes `applyspace.app` (default assumed `app.applyspace.app`); update Supabase `site_url` and redirect URLs, OAuth names and the Vercel app project domain (announce and wait for go, per the rules). Until then set `NEXT_PUBLIC_APP_URL` to the current app URL.
4. **DNS** for the domains above (not touched here).
5. Sanity webhook to `/api/revalidate`, Search Console, privacy policy and terms.
6. Review the two seed articles before launch, and approve the planned prices on Pricing (or set `priceVisible` off).

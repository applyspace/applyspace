# studio

Sanity Studio for the public website content. The website itself is part of the web app (`apps/web`, route group `app/(site)`, code in `apps/web/src/site`) and is served on `applyspace.app` to signed-out visitors.

The Studio is not deployed on Vercel: it runs locally or on Sanity's hosting.

- `pnpm install` then `pnpm dev` (local Studio) or `pnpm deploy` (`<name>.sanity.studio`).
- Env: `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` (see `.env.example`).
- Schemas: `sanity/schemaTypes` (page, feature, pricingPlan, resource, siteSettings). Keep them in sync with `apps/web/src/site/content/types.ts`.
- Own pnpm root (`pnpm-workspace.yaml`), not part of the apps/* workspace: Sanity's dependencies never touch the app lockfile.

The website reads Sanity with `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` on the `applyspace` Vercel project; without them it renders local fallback content. Webhook for revalidation: `POST https://applyspace.app/api/revalidate` with `SANITY_REVALIDATE_SECRET`.

# Agent guide

Start with [README.md](./README.md) (stack, architecture) and [CLAUDE.md](./CLAUDE.md) (branches, commit format). App-specific rules: `apps/web/CLAUDE.md`, `apps/desktop/CLAUDE.md`, `packages/db/CLAUDE.md`. The database schema and its rules: `supabase/README.md`.

## Hard rules

- Never merge a pull request. Open it, link the Linear issue, stop.
- Never create accounts, never handle or paste secrets (keys, passwords, tokens). Public values only.
- Supabase: any migration or config change is announced to the founder and waits for an explicit go. Write the file and the PR; do not apply it.
- Do not touch `feature/APP-37-onboarding-v2`.
- Never run scrapers or HTTP calls against LinkedIn, Indeed, Welcome to the Jungle or HelloWork from the cloud. Scraper work is tested locally by the founder (and scrapers are parked: APP-135).
- No local database: records live in Supabase; platform sessions (cookies) stay on the device (ADR-004).
- The public demo lives only on `demo.applyspace.app`.
- Do not work around a blocked network or a refused permission; report it.

## How to work

- One Linear issue per PR. Branch name from Linear (`<user>/app-<n>-<slug>` or `fix/APP-<n>-<slug>`), commit `emoji(scope): message`, docs and code in English.
- Before finishing: `pnpm install`, typecheck, lint, tests that exist; CI must be green.
- After each meaningful piece of work: update the docs where the knowledge belongs, update the Linear issue, note PR status (open, never merged by you).

## Work packages (distributed after the Supabase move)

1. Wire PostHog end to end: onboarding events, Settings consent, Home, collection events (APP-130).
2. Resume/LinkedIn parser, Profile data model and onboarding integration (APP-106 to 110, 119, 120).
3. Applications hub: design first (APP-114), then layouts (APP-100, 115 to 118).
4. Local scrapers and collection (APP-77, 111, 112, 79, 80): parked until the data model is settled (APP-135).

Sidebar (APP-125) and Home (APP-126) are separate; only the sidebar project edits layout files. Packages 1 to 3 touch different code paths; check for overlap before starting.

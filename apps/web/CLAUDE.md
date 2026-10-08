# apps/web — Claude instructions

> For git conventions and monorepo structure, see the root [CLAUDE.md](../../CLAUDE.md).

## Stack

- **Framework** — Next.js 16 (App Router, Server Components)
- **Language** — TypeScript (strict mode)
- **Styling** — Tailwind CSS v4 + shadcn/ui
- **Auth** — Supabase Auth (Google and LinkedIn OIDC)
- **Database** — Supabase PostgreSQL for signed-in users (Row Level Security); local SQLite for the demo and desktop
- **Deployment** — Vercel
- **Package manager** — pnpm

## Code conventions

- Components: PascalCase (`JobCard.tsx`, `AppShell.tsx`)
- Utilities and lib files: camelCase (`formatDate.ts`, `jobs.ts`)
- Named exports only — no default exports
- Shared app types live in `packages/core` (`@apply/core/[domain]`), not in the web app
- Server Components by default — use `'use client'` only when necessary (interactivity, hooks)

## Project structure

```
src/
├── app/
│   ├── (auth)/         # Authenticated routes: /, /offers, /applications, /processes, /settings
│   ├── (public)/       # Public routes: /login
│   └── api/            # Route handlers: settings, auth, linkedin/profile
├── components/
│   ├── layout/         # AppShell, Sidebar
│   ├── jobs/           # JobCard, JobGrid, JobFilters
│   ├── settings/       # SettingsShell + tabs (Profile, Criteria, Platforms)
│   ├── changelog/      # WhatsNew sheet
│   ├── providers/      # Providers (SessionProvider, LocaleProvider)
│   └── ui/             # shadcn/ui components — do not modify
├── lib/
│   ├── profiles.ts, searches.ts, offers.ts, applications.ts, …   # Readers: Supabase when signed in, else SQLite
│   ├── settings.ts     # Read/write user settings (Supabase when signed in, else SQLite)
│   ├── supabase/       # Clients, request scope, row helpers and queries
│   ├── sources.ts      # Platform metadata (labels, colors, cookie keys)
│   ├── i18n.ts         # EN / FR translations
│   └── utils.ts        # Shared helpers
```

# Apply

Job search companion, France first. Find offers across job boards, track applications and interviews, and write better applications, all in one place.

## Status

Prototype. Today the data lives in a local SQLite file and job boards are scraped with the user's own session. The target architecture moves candidate data to a shared Supabase database so web, desktop, extension and mobile see the same data. Platform sessions (cookies) always stay on the user's device.

## Repository

```
apps/
  web/        Next.js 16 app (UI)
  desktop/    Electron shell around the web app
  mobile/     Expo app, iOS first (not started)
packages/
  db/         Drizzle SQLite schema and migrations (prototype storage)
  scraper/    Playwright scraper, cookie based (will become packages/connectors)
site/         Marketing website (not started)
```

Planned: `apps/extension`, `packages/core`, `packages/connectors`, `packages/ai`, `packages/design-tokens`, `packages/ui`, `supabase/`.

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Desktop | Electron |
| Database | Drizzle + SQLite today, Supabase (Postgres) planned |
| Scraper | Node.js + Playwright |
| Auth | NextAuth v4 (LinkedIn OAuth) today, Supabase Auth planned |
| Package manager | pnpm workspaces |

## Getting started

```bash
pnpm install
```

Create `apps/web/.env.local` with `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` and `NEXTAUTH_SECRET`.

```bash
pnpm db:migrate     # create the local SQLite database in .local/
pnpm db:seed        # optional seed data
pnpm auth           # log in to each job board, saves session cookies locally
pnpm scrape         # run the scrapers
pnpm dev            # web app + desktop shell
pnpm desktop        # desktop shell only
pnpm dist           # build the desktop installer
```

Session cookies are saved in `.local/` and never leave the machine.

## Git workflow

- Apps use **release branching**: branch from `release/x.y`, open the pull request into that release branch. When the release is ready, `release/x.y` is merged into `main` and tagged. There is no `develop` branch.
- The site uses **environment branching**: `staging` and `production`.
- Versioning is SemVer (`0.x` until launch). Tags per app: `web-vX.Y.Z`, `desktop-vX.Y.Z`, `ios-vX.Y.Z`, `extension-vX.Y.Z`. The site is not versioned.
- Commit messages follow gitmoji + scope, see [CLAUDE.md](./CLAUDE.md).

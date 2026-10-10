# Apply — Claude instructions

> For a full project overview, stack, and architecture, see [README.md](./README.md).

## Monorepo structure

```
apps/web         → Next.js app (see apps/web/CLAUDE.md)
apps/desktop     → Electron shell (see apps/desktop/CLAUDE.md)
apps/mobile      → Expo app, not started
packages/db      → Drizzle schema and migrations (see packages/db/CLAUDE.md)
packages/scraper → Playwright scraper
studio/          → Sanity Studio (website content), own pnpm root, see studio/README.md. The website is in apps/web (app/(site), src/site)
```

## Branching

- Apps use release branching: branch from `release/x.y`, open the pull request into that release branch. `release/x.y` is merged into `main` and tagged. No `develop` branch.
- The site uses environment branching: `staging` and `production`.
- Tags: `web-vX.Y.Z`, `desktop-vX.Y.Z`, `ios-vX.Y.Z`, `extension-vX.Y.Z`. SemVer, `0.x` until launch.

## Git conventions

All commit messages follow the gitmoji + scope format:

```
emoji(scope): message
```

**Scopes:** `web`, `desktop`, `mobile`, `extension`, `site`, `db`, `scraper`, `dev`, `config`, `deps`, `docs`

| Emoji | Code | When to use |
|---|---|---|
| ✨ | `:sparkles:` | New feature |
| 🐛 | `:bug:` | Bug fix |
| 💄 | `:lipstick:` | UI / styling changes |
| ♻️ | `:recycle:` | Refactor (no behavior change) |
| 🎨 | `:art:` | Code structure / formatting |
| 📝 | `:memo:` | Documentation |
| 🔧 | `:wrench:` | Config / tooling |
| ➕ | `:heavy_plus_sign:` | Add a dependency |
| ➖ | `:heavy_minus_sign:` | Remove a dependency |
| 🗑️ | `:wastebasket:` | Delete files or dead code |
| 🏗️ | `:building_construction:` | Architecture change |
| 🚀 | `:rocket:` | Performance improvement |
| 🔒 | `:lock:` | Security fix |
| 🌐 | `:globe_with_meridians:` | i18n |
| 🚧 | `:construction:` | Work in progress |
| 🔖 | `:bookmark:` | Release / version tag |

Examples:
```
✨(scraper): add HelloWork scraper
🐛(scraper): fix WTTJ selector broken after site update
♻️(scraper): extract deduplication logic to utils
💄(web): rework JobCard layout and salary badge
📝(docs): update README project structure
🔧(config): update scraper package.json scripts
➕(deps): add date-fns to web app
```

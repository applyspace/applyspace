# apps/desktop — Claude instructions

> For git conventions and monorepo structure, see the root [CLAUDE.md](../../CLAUDE.md).

## Stack

- Electron 34, TypeScript, electron-builder
- Main process in `src/main`, preload in `src/preload` (`index.mts`: Electron only loads an ESM preload with the `.mjs` extension), typed IPC in `src/shared/ipc.ts`

## Notes

- In dev, the shell loads the web app on `http://localhost:3000` (run `pnpm dev` from the root).
- When packaged, it forks the Next standalone server on a free loopback port. This is temporary: the target is to load a built client bundle without a child server.
- Keep `contextIsolation: true` and `nodeIntegration: false`. Expose only typed IPC channels.
- Release tag: `desktop-vX.Y.Z`. The .dmg is built by GitHub Actions: see `RELEASE.md`.
- Sign-in: packaged app opens Google/LinkedIn in the system browser; Supabase sends it back to `https://applyspace.app/auth/desktop` (a page with an "Open ApplySpace" button, because browsers do not launch an app from a redirect nobody clicked), which opens `applyspace://auth/callback`. Main validates the link (`main/deepLink.ts`) and hands only the one-time `code` to the renderer (`takeAuthCallback`), which runs `exchangeCodeForSession`. In dev the scheme is not reliable, so the login keeps the in-window web flow. The Supabase redirect allow-list must contain `https://applyspace.app/auth/desktop` and `applyspace://auth/callback`.
- Sign-in return, rules learned the hard way (APP-132 follow-up): never gate delivery of the deep link on window state. Next.js calls `history.replaceState` on every hydration and Electron reports it as a main-frame `did-start-navigation` (`isInPlace: true`) with no `did-finish-load` after it, so a "renderer ready" flag can stay false and silently drop the link. `main/authCoordinator.ts` keeps the callback until the renderer takes it, wakes the renderer on every link and repeats the wake-up for ~16 s; the renderer also looks for it on mount, window focus and visibility. A code is accepted once (`authInbox.ts`); the renderer calls `resetAuth` when a sign-in starts and on sign-out. Desktop signs out with `scope: 'local'`.
- Auth log: `<logs>/auth.log` (macOS: `~/Library/Logs/ApplySpace/`) and stdout, via `authLog.ts`. Values are numbers, booleans or a fixed vocabulary only: never log a code, token or URL. See [AUTH-DEBUGGING.md](./AUTH-DEBUGGING.md).
- Tests: `pnpm --filter @apply/desktop test` (compiles, then `node --test` on `dist/**/*.test.js`). Test files are not packaged.

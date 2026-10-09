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
- Sign-in: packaged app opens Google/LinkedIn in the system browser and returns through `applyspace://auth/callback`. Main validates the link (`main/deepLink.ts`) and hands only the one-time `code` to the renderer (`takeAuthCallback`), which runs `exchangeCodeForSession`. In dev the scheme is not reliable, so the login keeps the in-window web flow. The Supabase redirect allow-list must contain `applyspace://auth/callback`.

# apps/desktop — Claude instructions

> For git conventions and monorepo structure, see the root [CLAUDE.md](../../CLAUDE.md).

## Stack

- Electron 34, TypeScript, electron-builder
- Main process in `src/main`, preload in `src/preload`, typed IPC in `src/shared/ipc.ts`

## Notes

- In dev, the shell loads the web app on `http://localhost:3000` (run `pnpm dev` from the root).
- When packaged, it forks the Next standalone server on a free loopback port. This is temporary: the target is to load a built client bundle without a child server.
- `better-sqlite3` is a native module: run `pnpm desktop:rebuild` after dependency changes.
- Keep `contextIsolation: true` and `nodeIntegration: false`. Expose only typed IPC channels.
- Release tag: `desktop-vX.Y.Z`.

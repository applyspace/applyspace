# packages/core — Claude instructions

> For git conventions and monorepo structure, see the root [CLAUDE.md](../../CLAUDE.md).

## Purpose

Shared app types and constants, imported by web, desktop, extension and mobile. Source-only package: no build step, consumers transpile it (`transpilePackages` in `apps/web/next.config.ts`).

## Conventions

- One file per domain (`offers.ts`, `searches.ts`, …), exposed as `@apply/core/<domain>`; `@apply/core` re-exports everything.
- Types and constants only. No React, no Next, no Node APIs, no I/O.
- Database row types come from `@apply/db`; this package adds the app-level shapes on top.
- Any value crossing a boundary (API, server action, storage) gets a Zod schema next to its type (planned, not yet in place).

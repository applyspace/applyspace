# packages/core — Claude instructions

> For git conventions and monorepo structure, see the root [CLAUDE.md](../../CLAUDE.md).

## Purpose

Shared app types and constants, imported by web, desktop, extension and mobile. Source-only package: no build step, consumers transpile it (`transpilePackages` in `apps/web/next.config.ts`).

## Conventions

- One file per domain (`offers.ts`, `searches.ts`, …), exposed as `@apply/core/<domain>`; `@apply/core` re-exports everything.
- Types and constants only. No React, no Next, no Node APIs, no I/O.
- Database row types come from `@apply/db`; this package adds the app-level shapes on top.
- Any value crossing a boundary (API, server action, storage) gets a Zod schema next to its type (planned, not yet in place).

## Resume parser contract (`@apply/core/resume`)

`src/resume/contract.ts` is the contract of every resume and LinkedIn parser (APP-106): `ParsedResume`, a partial structured profile where each top-level scalar is a `Field` (`value` + `confidence`) and each list entry carries a `confidence`. `validateParsedResume(raw)` cleans any untrusted JSON (LLM answer, stored value) and never throws; dates are `YYYY-MM` (`normalizeMonth`), `isCurrent` replaces an end date such as "Present" / "Aujourd'hui". Seniority tokens are `entry | junior | mid | senior | lead` (`SENIORITY_ONBOARDING_LABEL` gives the onboarding card label). No Zod yet: the validator is hand written to avoid a new dependency; swap it for a Zod schema when Zod is added to the workspace.

Tests: `pnpm --filter @apply/core test` (Node's built-in test runner; `test/register.mjs` resolves the extensionless imports).

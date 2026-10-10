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

## Resume text extraction (`@apply/core/resume`, APP-107)

`extractResumeText(bytes)` turns a PDF or .docx into text, on bytes only (server, browser and tests share it; inflate uses the web `DecompressionStream`, no Node API, no dependency). The type is read from the content. Result: `{ ok: true, format, text, pages?, truncated }` or `{ ok: false, reason }` with `reason` one of `encrypted`, `scanned` (image-only PDF, needs OCR: unsupported for now), `empty`, `unreadable` (fonts without a usable CMap), `corrupt`, `too-large` (10 MB; 15 pages read), `unsupported-format` (legacy .doc and anything else).

- `extract/pdf.ts`: own parser (object streams, Flate/ASCII85, ToUnicode CMaps, glyph widths, reading order from text positions, two-column split). Good for text PDFs from Word, Google Docs, LibreOffice, Chrome, LaTeX; swap in pdf.js behind the same signature if a resume breaks it.
- `extract/docx.ts` + `extract/zip.ts`: `word/document.xml` to lines (table cells tab separated). The zip reader is also what the LinkedIn archive import (APP-109) uses.
- `sections.ts`: `splitSections(text)` cuts the text at EN/FR headings (experience, education, skills, languages, ...) for the parsers.
- Tests build synthetic PDF and DOCX files in `test/helpers.ts`; no real resumes in the repo.

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

## Resume parsing (`@apply/core/resume`, APP-108)

`parseResume(text, { provider? })` returns `{ resume, method: 'rules' | 'llm', attempts, fallbackReason? }`.

- `parse/rules.ts`: deterministic parser (EN/FR headings, date ranges, role lines "Title - Company - City" / "at" / "chez", education, skills, languages with levels, contacts, name, seniority and years). It is the default and the fallback.
- `parse/llm.ts`: `ResumeLlmProvider` interface (`complete({ system, user, maxTokens })`), prompt that treats the resume as data, loose JSON parsing, `validateParsedResume`, grounding (an email, phone or link the model returns must appear in the text), one retry with the rejection reason, then `LlmExtractionError`. `parseResume` merges the model answer with the rules (rule-found contacts win) and falls back to the rules on any failure. There is no `packages/ai` yet; the provider interface lives here and the Claude adapter in `apps/web/src/lib/resume/provider.ts`.
- The Claude provider is OFF unless `RESUME_LLM_ENABLED=1`, `ANTHROPIC_API_KEY` and `RESUME_LLM_MODEL` are all set on the server. Enabling it sends resume text to Anthropic: needs a privacy notice and the founder's go first.
- Eval set: `test/fixtures.ts` (synthetic FR/EN resumes with expected JSON, no real data) scored by `parse/eval.ts` (`scoreResume`, fact-level precision, recall, F1). Run with `pnpm --filter @apply/core test`; the same `scoreResume` can score a real model run on the same fixtures.

## LinkedIn data export import (`@apply/core/resume`, APP-109)

`parseLinkedInArchive(zipBytes)` (or `parseLinkedInFiles({ profile, positions, ... })` for single CSVs, `linkedInFileKey(name)` to route a dropped file) maps the archive a user downloads from LinkedIn (Settings > Data privacy > Get a copy of your data) to a `ParsedResume` with `source: 'linkedin-export'`. Files read, by name in any folder: Profile, Positions, Education, Skills, Languages, Certifications, Email Addresses, PhoneNumbers (`.csv`). Result: `{ ok: true, resume, filesRead }` or `{ ok: false, reason: 'not-a-zip' | 'too-large' | 'no-profile-data' }`.

- Local only: it works on bytes, so it runs in the browser and nothing is uploaded. No request to LinkedIn, no cookie, no scraping (ADR-004). A capture from the user's own session on their device (desktop or extension) is NOT implemented; it needs the terms-of-service review of APP-77 first.
- `linkedin/csv.ts`: small RFC 4180 reader (quotes, line breaks in cells, BOM, a note before the header).
- Reuses `extract/zip.ts` from APP-107. The export has no profile URL and no years of experience: years and seniority are derived like for resumes.

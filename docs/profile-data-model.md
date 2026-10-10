# Profile data model

Decision record for APP-119. Migration: `supabase/migrations/20261010000000_profile_data_model.sql` (written, **not applied**: the founder applies it). The parser contract it matches: `packages/core/src/resume/contract.ts` (APP-106).

## Principles

- One default profile per user (`profiles.is_default`); every list below hangs off a profile with a composite foreign key `(profile_id, user_id)`.
- Each row carries `source`: `manual` (typed by the user), `parsed` (resume / LinkedIn PDF through the parser), `imported` (LinkedIn data archive). Re-importing merges on natural keys instead of duplicating (see "Merge keys").
- Everything is optional except the natural key of the row. Nothing is guessed by the parser.
- Platform sessions and cookies never live here (ADR-004).

## Gap analysis (what existed, what is added)

| Group | Existing | Added by the migration |
|---|---|---|
| Identity | `accounts.first_name/last_name/avatar_url`, `profiles.job_title/description` | `profiles.headline` |
| Contact | `accounts.email/linkedin_url/website_url/current_place` | `accounts.phone_number`, `profiles.location`, `profile_links` (kind: linkedin, github, portfolio, other) |
| Seniority | `searches.experience_levels` (per search) | `profiles.seniority` (entry, junior, mid, senior, lead), `profiles.years_of_experience` |
| Experiences | `experiences` (title, company, dates, `is_current`, location, description) | `employment_type`, `achievements[]`, `skills_used[]` |
| Education | `education` | `source` only |
| Skills | `skills` (name, level) | `source` only |
| Languages | `searches.languages` (search filter) | `languages` (name, level: basic, conversational, professional, native) |
| Certifications | none | `certifications` (name, issuer, issued/expires, credential URL) |
| Projects, volunteering, publications | none | `projects`, `volunteering`, `publications` |
| Preferences (salary, contract, remote, sectors, sizes) | `searches` (per search profile) | nothing: stays on `searches`, it is already what the product filters on |
| Documents | `documents` + Storage bucket | nothing |
| Writing style | `accounts.writing_style` | nothing |
| Visibility | none | deferred: needs a product decision (who can see a profile); not added to avoid an unused column |

## Parser contract to tables

| `ParsedResume` | Written to |
|---|---|
| `firstName`, `lastName` | `accounts.first_name`, `accounts.last_name` (only when empty) |
| `phoneNumber` | `accounts.phone_number` (after the migration) |
| `jobTitle`, `description`, `location`, `seniority`, `yearsOfExperience` | default profile: `job_title`, `description`, `location`, `seniority`, `years_of_experience` |
| `experiences[]` | `experiences` (`companyName` -> `companies` row by name, `startDate`/`endDate` as first of the month) |
| `education[]`, `skills[]` | `education`, `skills` |
| `languages[]`, `certifications[]`, `links[]` | `languages`, `certifications`, `profile_links` (after the migration) |
| `links[]` of kind linkedin / other | also `accounts.linkedin_url` / `website_url` when empty |

Until the migration is applied, the review-and-save flow (APP-110) writes only the columns that already exist and reports the rest as "kept for later".

## Merge keys (idempotent re-import)

- Experience: company name (case-insensitive) + job title + start month.
- Education: school + degree + start month.
- Skill: lower-cased name (unique index `ux_skills_profile_name`).
- Language / certification / link: lower-cased name or URL (unique indexes in the migration).
- Account and profile scalars: an existing non-empty value is never overwritten by an import; the user edits it in Profile.

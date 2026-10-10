# supabase

SQL migrations for the Supabase projects. They are the source of truth for the schema of candidate data.

## Environments

| Environment | Supabase project | Used by |
|---|---|---|
| Production | `applyspace-production` (org `applyspace`, eu-west-3, free plan) | applyspace.app, desktop .dmg |
| Staging | not created yet (free plan allows 2 projects per account) | previews, once it exists |

Project references, URLs and publishable keys are not secrets but are not listed here: they live in Vercel and GitHub Actions variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, see `apps/web/.env.example`). Never commit a key, a database password or a service-role key.

## Rules

- Every schema change is a new file in `migrations/`, named `YYYYMMDDHHMMSS_short_name.sql`, applied in filename order. Never edit a migration that has been applied; add a new one.
- Re-runnable: guard every statement (`if not exists`, `drop ... if exists`). Additive first; drop legacy columns in a later migration.
- Every table has Row Level Security enabled. Policies scope rows to `auth.uid()`. Child tables use composite foreign keys `(id, user_id)` so a row can never point to another user's data.
- A migration is announced to the founder and waits for an explicit go before it touches any project. Agents write the file and the PR; they never apply it and never merge.
- Auth settings (providers, redirect URLs, Site URL) are changed in the dashboard by the founder, after an announcement.

## Schema map

| Table | Purpose |
|---|---|
| `accounts` | One row per signed-in user (created by trigger `on_auth_user_created`): names, locale, theme, `onboarded_at`, `plan`, `selected_plan`. `plan` is not writable by users; `selected_plan` is an intent only. |
| `platforms` | Reference table of job platforms (read-only for users). |
| `profiles`, `experiences`, `education`, `skills` | Candidate profile. One default profile per user (`is_default`). |
| `languages`, `certifications`, `profile_links`, `projects`, `volunteering`, `publications` | Rich profile lists (migration 10, pending). See `docs/profile-data-model.md`. |
| `documents` + Storage bucket `documents` | Resume and extra files (private, 10 MB, PDF/DOCX). Storage policies scope by the first folder = user id. |
| `companies`, `no_gos`, `search_no_gos` | Companies and exclusions (built-in no-gos have `user_id is null`). |
| `searches` | Search criteria. Several titles, locations, contract types, company sizes; salary with currency. Legacy columns (`search_title`, `location`, `remote_mode`, `salary_*_eur`) are kept in sync by a trigger until a later migration drops them. |
| `offers`, `offer_sources` | Job offers; an offer published on several platforms keeps one `offer_sources` row per source. |
| `applications`, `interviews` | Application tracking. |

Plan limits (Free / Plus / Max: search profiles, job titles, locations, contract types, extra files) are enforced in the database by triggers, not only in the UI.

Platform sessions (cookies) are never stored here (ADR-004).

## Migrations (apply in this order)

1. `20261005225049_accounts` - accounts, `set_updated_at`, RLS, `handle_new_user` trigger.
2. `20261005230833_candidate_data` - platforms, profiles, companies, experiences, no-gos, searches, offers, applications, interviews.
3. `20261006002710_account_names` - first and last name, insert policy for accounts.
4. `20261006033858_profile_education_skills_documents` - education, skills, documents, bucket and storage policies, `onboarded_at`, column grants, company sizes.
5. `20261006035456_volunteer_contract_and_search_limit` - contract types, Free search limit.
6. `20261006093900_searches_last_run` - `last_run_at`.
7. `20261006100334_onboarding_v2_profile_plans_platforms` - plans, profile fields, multi-title searches, plan limits, new platforms, `offer_sources`.
8. `20261008120000_onboarding_v2_company_sizes` - new company size ranges.
9. `20261008180000_accounts_selected_plan` - `selected_plan`.
10. `20261010000000_profile_data_model` - rich profile (seniority, languages, certifications, links, projects, volunteering, publications, `source` per row). Written, not applied yet.

Moving a project or creating a new one: follow `MIGRATION-RUNBOOK.md`.

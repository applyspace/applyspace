# Runbook: set up a Supabase project from scratch

Used to move production to the project in the founder's own org, and later to create staging. Nothing here runs without the founder's explicit go. Agents prepare, the founder applies. No secret is ever pasted in a chat, a PR or a doc.

Context: the old project (Vercel-managed org) only holds test accounts, so no data is migrated: the 9 migrations are replayed on an empty database. Do not delete the old project or the Vercel Supabase integration before step 8 (deleting the integration deletes its database and revokes its credentials).

## 1. Prepare the new project (founder, dashboard)

- Project `applyspace-production` in org `applyspace` (done). Note the project reference and URL; the publishable key is public.
- Free plan: no automatic backups. Make a manual dump before any risky change (`supabase db dump`).

## 2. Apply the schema (founder)

Option A, CLI (preferred, records migration history):

1. `supabase init` once (creates `supabase/config.toml`; commit it in its own PR).
2. `supabase link --project-ref <ref>` (asks for the database password, typed locally).
3. `supabase db push`.

Option B, SQL Editor: run each file of `migrations/` in filename order. Simple, no history table; do not mix with the CLI afterwards without `supabase migration repair`.

## 3. Authentication settings (founder, dashboard)

- Site URL: `https://applyspace.app`.
- Redirect URLs: `https://applyspace.app/**`, `https://www.applyspace.app/**`, `https://applyspace.app/auth/desktop`, `applyspace://auth/callback`, `http://localhost:3000/**`.
- Providers: Google and LinkedIn (OIDC). Client id and secret are typed in the dashboard only. Add `https://<ref>.supabase.co/auth/v1/callback` as an authorized redirect URI in the Google and LinkedIn consoles.
- Check the identity-linking behavior (same email on two providers) while here.

## 4. Switch the apps (founder, then agent verifies)

- Vercel env vars (all environments): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Redeploy.
- GitHub Actions variables (Settings > Secrets and variables > Actions > Variables): same two names, then run "Desktop release" for a new .dmg.
- `apps/web/.env.local` for local runs.

## 5. Verify

- All public tables have RLS enabled (`select tablename, rowsecurity from pg_tables where schemaname = 'public'`); 15 tables expected: accounts, platforms, profiles, companies, experiences, no_gos, searches, search_no_gos, offers, offer_sources, applications, interviews, education, skills, documents (plus Storage bucket `documents`).
- `platforms` is seeded; trigger `on_auth_user_created` exists.
- Sign in with Google and with LinkedIn (web and desktop): an `accounts` row appears, onboarding saves, a resume upload works.
- Two different accounts cannot read each other's rows or files.

## 6. Rollback

The old project stays untouched until step 8, so rollback is switching the two variables back and redeploying.

## 7. Staging

Create `applyspace-staging` once a free-project slot is available (the limit is 2 per account), then repeat steps 2 and 3 and point Vercel preview variables to it.

## 8. Clean up (founder, after a few days of stable use)

Remove the old project and the Vercel Supabase integration, then update this file and `README.md`.

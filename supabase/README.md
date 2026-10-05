# supabase

SQL migrations for the Supabase project (source of truth for candidate data).

- `migrations/` — applied in filename order. Until CI applies them, run each new file once in the Supabase SQL Editor.
- Every table has Row Level Security enabled; policies scope rows to `auth.uid()`.
- Never commit keys. The app only needs the public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `apps/web/.env.example`).

## Migrations

- `20261006000000_accounts` — one account row per signed-in user (settings, locale, theme).
- `20261007000000_candidate_data` — profiles, companies, experiences, searches, no-gos, offers, applications, interviews, plus the `platforms` reference table. Rows are owned by `user_id`; child tables use composite foreign keys so a row can never point to another user's data. Platform sessions are not stored here (ADR-004).

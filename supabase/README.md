# supabase

SQL migrations for the Supabase project (source of truth for candidate data).

- `migrations/` — applied in filename order. Until CI applies them, run each new file once in the Supabase SQL Editor.
- Every table has Row Level Security enabled; policies scope rows to `auth.uid()`.
- Never commit keys. The app only needs the public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `apps/web/.env.example`).

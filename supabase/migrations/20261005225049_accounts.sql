-- One account row per signed-in user, created on first sign-in (Google or
-- LinkedIn). Mirrors the local `settings` table of the desktop app.

create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  locale text not null default 'fr' check (locale in ('en', 'fr')),
  theme_mode text not null default 'system' check (theme_mode in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- Row Level Security: a user only ever sees and edits their own row.
-- There is no insert or delete policy: rows are created by the trigger below
-- and removed with the auth user.
alter table public.accounts enable row level security;

create policy "Users read their own account"
  on public.accounts for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users update their own account"
  on public.accounts for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

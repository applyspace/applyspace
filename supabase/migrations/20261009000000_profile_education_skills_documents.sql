-- Candidate profile, part two: education, skills and documents (CV, sample
-- "fit messages"), plus what onboarding needs on the account and on searches.
--
-- Same rules as 20261007000000_candidate_data.sql: every row belongs to a user
-- (`user_id`), Row Level Security scopes it, and child tables point to their
-- profile with a composite foreign key (id, user_id) so cross-user references
-- are impossible.
--
-- Written to be re-runnable: every statement is guarded (if not exists /
-- drop ... if exists), so applying it twice is a no-op.

-- ---------------------------------------------------------------------------
-- education: attached to a profile, like experiences
-- ---------------------------------------------------------------------------
create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  school text not null,
  degree text,
  field text,
  started_at date,
  ended_at date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);

create index if not exists idx_education_profile on public.education (profile_id);
create index if not exists idx_education_user on public.education (user_id);

-- ---------------------------------------------------------------------------
-- skills: attached to a profile, one row per skill name (case-insensitive)
-- ---------------------------------------------------------------------------
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  name text not null,
  level text check (level in ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);

-- Also serves lookups by profile.
create unique index if not exists ux_skills_profile_name on public.skills (profile_id, lower(name));
create index if not exists idx_skills_user on public.skills (user_id);

-- ---------------------------------------------------------------------------
-- documents: files the user gives Apply. They belong to the user, not to one
-- profile. A CV has a file in the `documents` Storage bucket (`storage_path`);
-- a fit message is pasted text kept in `extracted_text` and has no file.
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cv', 'fit_message', 'other')),
  name text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  is_primary boolean not null default false,
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only pasted fit messages may exist without a file.
  check (kind = 'fit_message' or storage_path is not null)
);

create index if not exists idx_documents_user on public.documents (user_id, kind);
create unique index if not exists ux_documents_storage_path on public.documents (storage_path);
-- At most one primary document per kind (the CV used by default).
create unique index if not exists ux_documents_one_primary on public.documents (user_id, kind) where is_primary;

-- ---------------------------------------------------------------------------
-- Row Level Security and updated_at triggers for the three new tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['education', 'skills', 'documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Users manage their own rows" on public.%I', t);
    execute format(
      'create policy "Users manage their own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at',
      t
    );
  end loop;
end
$$;

-- Signed-out visitors get nothing.
revoke all on public.education, public.skills, public.documents from anon;

-- ---------------------------------------------------------------------------
-- Storage: private `documents` bucket. Objects live under a folder named after
-- the owner's auth uid (`<uid>/<file>`), and that first folder is what the
-- policies check.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Users read their own documents" on storage.objects;
create policy "Users read their own documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users upload their own documents" on storage.objects;
create policy "Users upload their own documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update their own documents" on storage.objects;
create policy "Users update their own documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own documents" on storage.objects;
create policy "Users delete their own documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- accounts: onboarding state and plan
-- ---------------------------------------------------------------------------
-- `onboarded_at` is set when onboarding is finished or skipped. It is null for
-- every existing account, so current users go through onboarding once.
alter table public.accounts
  add column if not exists onboarded_at timestamptz,
  add column if not exists plan text not null default 'free';

alter table public.accounts drop constraint if exists accounts_plan_check;
alter table public.accounts add constraint accounts_plan_check check (plan in ('free', 'plus'));

-- The plan is not something a user may change for themselves: the existing
-- "Users update their own account" policy would otherwise let any signed-in
-- user set plan = 'plus' on their own row. Column privileges close that: a
-- column-level revoke has no effect while the table-level privilege is held,
-- so the table-level one goes and every editable column is granted by name.
-- (A column added to accounts later needs its own grant to be user-editable.)
revoke insert, update on public.accounts from authenticated;
grant insert (id, email, full_name, first_name, last_name, avatar_url, locale, theme_mode, onboarded_at)
  on public.accounts to authenticated;
grant update (email, full_name, first_name, last_name, avatar_url, locale, theme_mode, onboarded_at)
  on public.accounts to authenticated;

-- ---------------------------------------------------------------------------
-- searches: company size criterion
-- ---------------------------------------------------------------------------
-- contract_types (CDI, CDD, Stage, Freelance, Apprentissage) and
-- experience_levels (entry, mid, senior, lead) already carry the right check
-- constraints from 20261007000000_candidate_data.sql: nothing to change.
alter table public.searches add column if not exists company_sizes text[];

alter table public.searches drop constraint if exists searches_company_sizes_check;
alter table public.searches
  add constraint searches_company_sizes_check
  check (company_sizes <@ array['0-15', '15-50', '50-500', '500+']);

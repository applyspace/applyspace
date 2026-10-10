-- Profile data model, rich schema (APP-119). NOT APPLIED: waits for the founder's go.
--
-- Goal: a profile can hold everything the resume / LinkedIn parser extracts
-- (packages/core/src/resume/contract.ts) and the product needs, with the source
-- of each row (typed by hand, parsed from a resume, imported from LinkedIn).
-- See docs/profile-data-model.md for the gap analysis and the field mapping.
--
-- Additive only, no data is changed or deleted. Re-runnable: every statement is
-- guarded. Same rules as the other migrations: every row has a `user_id`, Row
-- Level Security scopes it, child tables use a composite foreign key
-- (profile_id, user_id) so a row can never point to another user's profile.

-- 1. accounts: contact ----------------------------------------------------------

alter table public.accounts
  add column if not exists phone_number text;

alter table public.accounts drop constraint if exists accounts_phone_number_check;
alter table public.accounts
  add constraint accounts_phone_number_check
  check (phone_number is null or char_length(phone_number) <= 40);

grant update (phone_number) on public.accounts to authenticated;

-- 2. profiles: seniority, experience, headline, source ---------------------------

alter table public.profiles
  add column if not exists headline text,
  add column if not exists seniority text,
  add column if not exists years_of_experience smallint,
  add column if not exists location text,
  add column if not exists source text not null default 'manual';

alter table public.profiles drop constraint if exists profiles_seniority_check;
alter table public.profiles
  add constraint profiles_seniority_check
  check (seniority is null or seniority in ('entry', 'junior', 'mid', 'senior', 'lead'));

alter table public.profiles drop constraint if exists profiles_years_of_experience_check;
alter table public.profiles
  add constraint profiles_years_of_experience_check
  check (years_of_experience is null or years_of_experience between 0 and 60);

alter table public.profiles drop constraint if exists profiles_source_check;
alter table public.profiles
  add constraint profiles_source_check check (source in ('manual', 'parsed', 'imported'));

alter table public.profiles drop constraint if exists profiles_text_length_check;
alter table public.profiles
  add constraint profiles_text_length_check
  check (char_length(coalesce(headline, '')) <= 200 and char_length(coalesce(location, '')) <= 200);

-- 3. experiences / education / skills: employment type, achievements, source ------

alter table public.experiences
  add column if not exists employment_type text,
  add column if not exists achievements text[] not null default '{}',
  add column if not exists skills_used text[] not null default '{}',
  add column if not exists source text not null default 'manual';

alter table public.experiences drop constraint if exists experiences_employment_type_check;
alter table public.experiences
  add constraint experiences_employment_type_check
  check (employment_type is null or employment_type in
    ('full_time', 'part_time', 'contract', 'freelance', 'internship', 'apprenticeship', 'volunteer'));

alter table public.experiences drop constraint if exists experiences_lists_check;
alter table public.experiences
  add constraint experiences_lists_check
  check (cardinality(achievements) <= 30 and cardinality(skills_used) <= 50);

alter table public.experiences drop constraint if exists experiences_source_check;
alter table public.experiences
  add constraint experiences_source_check check (source in ('manual', 'parsed', 'imported'));

alter table public.education
  add column if not exists source text not null default 'manual';
alter table public.education drop constraint if exists education_source_check;
alter table public.education
  add constraint education_source_check check (source in ('manual', 'parsed', 'imported'));

alter table public.skills
  add column if not exists source text not null default 'manual';
alter table public.skills drop constraint if exists skills_source_check;
alter table public.skills
  add constraint skills_source_check check (source in ('manual', 'parsed', 'imported'));

-- 4. New child tables ----------------------------------------------------------------

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  level text check (level in ('basic', 'conversational', 'professional', 'native')),
  source text not null default 'manual' check (source in ('manual', 'parsed', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);
create unique index if not exists ux_languages_profile_name on public.languages (profile_id, lower(name));

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  name text not null check (char_length(name) between 1 and 160),
  issuer text check (char_length(issuer) <= 200),
  issued_at date,
  expires_at date,
  credential_url text check (credential_url is null or (credential_url ~* '^https?://' and char_length(credential_url) <= 2048)),
  source text not null default 'manual' check (source in ('manual', 'parsed', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);
create unique index if not exists ux_certifications_profile_name on public.certifications (profile_id, lower(name));

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  kind text not null default 'other' check (kind in ('linkedin', 'github', 'portfolio', 'other')),
  url text not null check (url ~* '^https?://' and char_length(url) <= 2048),
  label text check (char_length(label) <= 100),
  source text not null default 'manual' check (source in ('manual', 'parsed', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);
create unique index if not exists ux_profile_links_profile_url on public.profile_links (profile_id, lower(url));

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  description text check (char_length(description) <= 4000),
  url text check (url is null or (url ~* '^https?://' and char_length(url) <= 2048)),
  started_at date,
  ended_at date,
  skills_used text[] not null default '{}' check (cardinality(skills_used) <= 50),
  source text not null default 'manual' check (source in ('manual', 'parsed', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);

create table if not exists public.volunteering (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  organization text not null check (char_length(organization) between 1 and 200),
  role text check (char_length(role) <= 200),
  cause text check (char_length(cause) <= 200),
  started_at date,
  ended_at date,
  description text check (char_length(description) <= 4000),
  source text not null default 'manual' check (source in ('manual', 'parsed', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  title text not null check (char_length(title) between 1 and 300),
  publisher text check (char_length(publisher) <= 200),
  published_at date,
  url text check (url is null or (url ~* '^https?://' and char_length(url) <= 2048)),
  description text check (char_length(description) <= 4000),
  source text not null default 'manual' check (source in ('manual', 'parsed', 'imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);

-- 5. Indexes, Row Level Security, updated_at triggers, no anonymous access ----------

do $$
declare
  t text;
begin
  foreach t in array array['languages', 'certifications', 'profile_links', 'projects', 'volunteering', 'publications']
  loop
    execute format('create index if not exists %I on public.%I (profile_id)', 'idx_' || t || '_profile', t);
    execute format('create index if not exists %I on public.%I (user_id)', 'idx_' || t || '_user', t);
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
    execute format('revoke all on public.%I from anon', t);
  end loop;
end
$$;

-- Candidate data: profiles, searches, offers, applications and interviews.
-- Ported from the Drizzle SQLite schema (packages/db) with two differences:
--   * every row belongs to a user (`user_id`) and Row Level Security scopes it;
--   * platform sessions are not stored here (ADR-004), so there is no
--     platform_connections table. Settings live in `public.accounts`.
--
-- Cross-user references are impossible: each child table points to its parent
-- with a composite foreign key (id, user_id).

-- ---------------------------------------------------------------------------
-- platforms: read-only reference data
-- ---------------------------------------------------------------------------
create table public.platforms (
  slug text primary key,
  label text not null,
  brand_color text,
  login_url text not null
);

insert into public.platforms (slug, label, brand_color, login_url) values
  ('linkedin', 'LinkedIn', '#0A66C2', 'https://www.linkedin.com/login'),
  ('wttj', 'Welcome to the Jungle', '#FFC619', 'https://www.welcometothejungle.com/fr/signin'),
  ('hellowork', 'HelloWork', '#FD3345', 'https://www.hellowork.com/fr-fr/candidat/login.html'),
  ('jobsthatmakesense', 'JobsThatMakeSense', '#006A4E', 'https://www.jobs_that_makesense.org/fr/login');

alter table public.platforms enable row level security;

create policy "Signed-in users read platforms"
  on public.platforms for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- profiles: a job-search persona (e.g. "Product Designer")
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_title text not null,
  is_default boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index ux_profiles_one_default on public.profiles (user_id) where is_default;

-- ---------------------------------------------------------------------------
-- companies: deduplicated by name, per user
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  domain text,
  linkedin_handle text,
  sector text,
  size text check (size in ('startup', 'scale-up', 'midsize', 'large')),
  headquarters text,
  description text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- experiences: attached to a profile, company is optional
-- ---------------------------------------------------------------------------
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  company_id uuid,
  title text not null,
  location text,
  started_at date not null,
  ended_at date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade,
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete set null (company_id)
);

create index idx_experiences_profile on public.experiences (profile_id);
create index idx_experiences_company on public.experiences (company_id);

-- ---------------------------------------------------------------------------
-- no_gos: sectors the user refuses. Built-in rows have no owner and are
-- readable by everyone; custom rows belong to a user.
-- ---------------------------------------------------------------------------
create table public.no_gos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  key text not null,
  label_en text not null,
  label_fr text not null,
  is_built_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is null) = is_built_in)
);

create unique index ux_no_gos_built_in_key on public.no_gos (key) where user_id is null;
create unique index ux_no_gos_user_key on public.no_gos (user_id, key) where user_id is not null;

insert into public.no_gos (key, label_en, label_fr, is_built_in) values
  ('defense', 'Defense & weapons', 'Défense & armement', true),
  ('gambling', 'Gambling', 'Jeux d''argent', true),
  ('tobacco', 'Tobacco', 'Tabac', true),
  ('fossil-fuels', 'Fossil fuels', 'Énergies fossiles', true),
  ('adult', 'Adult industry', 'Industrie adulte', true),
  ('fast-fashion', 'Fast fashion', 'Mode jetable', true);

-- ---------------------------------------------------------------------------
-- searches: criteria, one or more per profile
-- ---------------------------------------------------------------------------
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null,
  search_title text not null,
  location text,
  contract_types text[] check (contract_types <@ array['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage']),
  experience_levels text[] check (experience_levels <@ array['entry', 'mid', 'senior', 'lead']),
  remote_mode text check (remote_mode in ('onsite', 'hybrid', 'remote')),
  salary_min_eur integer,
  salary_max_eur integer,
  enabled_platforms text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete cascade
);

create index idx_searches_profile on public.searches (profile_id);

create table public.search_no_gos (
  user_id uuid not null references auth.users (id) on delete cascade,
  search_id uuid not null,
  no_go_id uuid not null references public.no_gos (id) on delete cascade,
  primary key (search_id, no_go_id),
  foreign key (search_id, user_id) references public.searches (id, user_id) on delete cascade
);

create index idx_search_no_gos_no_go on public.search_no_gos (no_go_id);

-- ---------------------------------------------------------------------------
-- offers: job offers found by the connectors, per user
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_slug text not null references public.platforms (slug) on delete restrict,
  company_id uuid not null,
  external_id text not null,
  url text not null,
  title text not null,
  location text not null,
  remote_mode text check (remote_mode in ('onsite', 'hybrid', 'remote')),
  contract text check (contract in ('CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage')),
  experience_level text check (experience_level in ('entry', 'mid', 'senior', 'lead')),
  salary_min_eur integer,
  salary_max_eur integer,
  salary_raw text,
  description text not null,
  description_html text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_status text not null default 'new' check (user_status in ('new', 'viewed', 'passed', 'applied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, platform_slug, external_id),
  unique (user_id, platform_slug, url),
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete restrict
);

create index idx_offers_company on public.offers (company_id);
create index idx_offers_user_status on public.offers (user_id, user_status);
create index idx_offers_last_seen on public.offers (user_id, last_seen_at desc);
create index idx_offers_platform on public.offers (platform_slug);

-- ---------------------------------------------------------------------------
-- applications: at most one per offer; offer is optional (off-scrape entries)
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid unique,
  profile_id uuid not null,
  company_id uuid not null,
  job_title text not null,
  applied_at timestamptz not null,
  status text not null check (status in ('waiting', 'interviewing', 'accepted', 'rejected', 'ghosted', 'withdrawn')),
  cover_letter text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (offer_id, user_id) references public.offers (id, user_id) on delete set null (offer_id),
  foreign key (profile_id, user_id) references public.profiles (id, user_id) on delete restrict,
  foreign key (company_id, user_id) references public.companies (id, user_id) on delete restrict
);

create index idx_applications_profile on public.applications (profile_id);
create index idx_applications_company on public.applications (company_id);
create index idx_applications_status on public.applications (user_id, status);

-- ---------------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null,
  stage text not null check (stage in ('HR', 'Manager', 'Design Case', 'Team-Fit', 'Technical', 'Final', 'Other')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  outcome text check (outcome in ('pending', 'passed', 'failed', 'ghosted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (application_id, user_id) references public.applications (id, user_id) on delete cascade
);

create index idx_interviews_application on public.interviews (application_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user only ever reads and writes their own rows.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'companies', 'experiences', 'searches', 'search_no_gos', 'offers', 'applications', 'interviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Users manage their own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
    execute format('create index %I on public.%I (user_id)', 'idx_' || t || '_user', t);
  end loop;

  foreach t in array array['profiles', 'companies', 'experiences', 'searches', 'offers', 'applications', 'interviews', 'no_gos']
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at',
      t
    );
  end loop;
end
$$;

alter table public.no_gos enable row level security;

create policy "Users read built-in and their own no-gos"
  on public.no_gos for select
  to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "Users create their own no-gos"
  on public.no_gos for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own no-gos"
  on public.no_gos for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete their own no-gos"
  on public.no_gos for delete
  to authenticated
  using (user_id = (select auth.uid()));

create index idx_no_gos_user on public.no_gos (user_id);

-- Signed-out visitors get nothing.
revoke all on all tables in schema public from anon;

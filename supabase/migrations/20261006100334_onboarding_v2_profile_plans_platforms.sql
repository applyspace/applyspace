-- Onboarding v2, profile fields, plan limits, job platforms and multi-source offers.
--
-- Decisions (founder, 6 October 2026):
--   * Plans: free, plus, max. A search profile holds several job titles.
--       Free: 1 search profile, 3 job titles, 3 locations, 3 contract types.
--       Plus: 3 search profiles, 6 job titles each (locations and contract types unlimited).
--       Max : unlimited. A hard sanity cap of 100 job titles / locations applies to everyone.
--   * Search criteria are worldwide: several locations, salary stored with its currency.
--   * Profile: availability, current place, LinkedIn and website URLs, writing style.
--   * Resources: extra files (kind 'other') only on Plus and Max.
--   * Job platforms: Indeed, Glassdoor, Collective.work and France Travail join the existing four.
--   * An offer published on several platforms keeps every source (offer_sources).
--
-- Compatibility: the legacy columns (search_title, location, remote_mode,
-- salary_min_eur, salary_max_eur) stay and are kept in sync by a trigger so the
-- code already deployed keeps working. Drop them in a later migration.
--
-- Re-runnable: every statement is guarded. Additive only, no data is deleted.

-- 1. Plans -------------------------------------------------------------------

alter table public.accounts drop constraint if exists accounts_plan_check;
alter table public.accounts
  add constraint accounts_plan_check check (plan in ('free', 'plus', 'max'));

-- 2. Profile fields on the account --------------------------------------------

alter table public.accounts
  add column if not exists availability text,
  add column if not exists current_place jsonb,
  add column if not exists linkedin_url text,
  add column if not exists website_url text,
  add column if not exists writing_style jsonb not null default '{}'::jsonb;

alter table public.accounts drop constraint if exists accounts_availability_check;
alter table public.accounts
  add constraint accounts_availability_check
  check (availability is null or availability in ('active', 'open', 'paused'));

alter table public.accounts drop constraint if exists accounts_current_place_check;
alter table public.accounts
  add constraint accounts_current_place_check
  check (current_place is null or (jsonb_typeof(current_place) = 'object' and octet_length(current_place::text) <= 2000));

alter table public.accounts drop constraint if exists accounts_linkedin_url_check;
alter table public.accounts
  add constraint accounts_linkedin_url_check
  check (linkedin_url is null or (linkedin_url ~* '^https?://' and char_length(linkedin_url) <= 2048));

alter table public.accounts drop constraint if exists accounts_website_url_check;
alter table public.accounts
  add constraint accounts_website_url_check
  check (website_url is null or (website_url ~* '^https?://' and char_length(website_url) <= 2048));

alter table public.accounts drop constraint if exists accounts_writing_style_check;
alter table public.accounts
  add constraint accounts_writing_style_check
  check (jsonb_typeof(writing_style) = 'object' and octet_length(writing_style::text) <= 20000);

-- Users may write these columns (column-level grants; `plan` stays unwritable).
grant update (availability, current_place, linkedin_url, website_url, writing_style)
  on public.accounts to authenticated;

-- 3. Search criteria ----------------------------------------------------------

alter table public.searches
  add column if not exists job_titles text[] not null default '{}',
  add column if not exists locations jsonb not null default '[]'::jsonb,
  add column if not exists remote_modes text[] not null default '{}',
  add column if not exists salary_min integer,
  add column if not exists salary_max integer,
  add column if not exists salary_currency text not null default 'EUR',
  add column if not exists sectors text[] not null default '{}',
  add column if not exists languages text[] not null default '{}';

alter table public.searches drop constraint if exists searches_job_titles_check;
alter table public.searches
  add constraint searches_job_titles_check check (cardinality(job_titles) <= 100);

alter table public.searches drop constraint if exists searches_locations_check;
alter table public.searches
  add constraint searches_locations_check
  check (jsonb_typeof(locations) = 'array' and jsonb_array_length(locations) <= 100);

alter table public.searches drop constraint if exists searches_remote_modes_check;
alter table public.searches
  add constraint searches_remote_modes_check
  check (remote_modes <@ array['onsite', 'hybrid', 'remote']);

alter table public.searches drop constraint if exists searches_salary_currency_check;
alter table public.searches
  add constraint searches_salary_currency_check check (salary_currency ~ '^[A-Z]{3}$');

alter table public.searches drop constraint if exists searches_salary_range_check;
alter table public.searches
  add constraint searches_salary_range_check
  check ((salary_min is null or salary_min >= 0)
     and (salary_max is null or salary_max >= 0)
     and (salary_min is null or salary_max is null or salary_max >= salary_min));

alter table public.searches drop constraint if exists searches_sectors_check;
alter table public.searches
  add constraint searches_sectors_check check (cardinality(sectors) <= 50);

alter table public.searches drop constraint if exists searches_languages_check;
alter table public.searches
  add constraint searches_languages_check check (cardinality(languages) <= 50);

-- Backfill from the legacy columns (runs before the new triggers exist).
update public.searches
set job_titles = case when cardinality(job_titles) = 0 then array[search_title] else job_titles end,
    locations = case
      when jsonb_array_length(locations) = 0 and location is not null and location <> ''
        then jsonb_build_array(jsonb_build_object('label', location))
      else locations end,
    remote_modes = case
      when cardinality(remote_modes) = 0 and remote_mode is not null then array[remote_mode]
      else remote_modes end,
    salary_min = coalesce(salary_min, salary_min_eur),
    salary_max = coalesce(salary_max, salary_max_eur);

-- Keeps legacy and new columns in sync, in both directions.
create or replace function public.sync_search_legacy_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Job titles
  if tg_op = 'UPDATE' and new.job_titles is not distinct from old.job_titles
     and new.search_title is distinct from old.search_title and new.search_title is not null then
    if cardinality(new.job_titles) = 0 then
      new.job_titles := array[new.search_title];
    else
      new.job_titles[1] := new.search_title;
    end if;
  elsif cardinality(new.job_titles) = 0 and new.search_title is not null then
    new.job_titles := array[new.search_title];
  end if;
  if cardinality(new.job_titles) > 0 then
    new.search_title := new.job_titles[1];
  end if;

  -- Locations
  if tg_op = 'UPDATE' and new.locations is not distinct from old.locations
     and new.location is distinct from old.location then
    if new.location is null or new.location = '' then
      new.locations := '[]'::jsonb;
    else
      new.locations := jsonb_build_array(jsonb_build_object('label', new.location));
    end if;
  elsif jsonb_array_length(new.locations) = 0 and new.location is not null and new.location <> '' then
    new.locations := jsonb_build_array(jsonb_build_object('label', new.location));
  end if;
  if jsonb_array_length(new.locations) > 0 then
    new.location := new.locations -> 0 ->> 'label';
  elsif tg_op = 'UPDATE' and new.locations is distinct from old.locations then
    new.location := null;
  end if;

  -- Remote modes
  if tg_op = 'UPDATE' and new.remote_modes is not distinct from old.remote_modes
     and new.remote_mode is distinct from old.remote_mode then
    new.remote_modes := case when new.remote_mode is null then '{}'::text[] else array[new.remote_mode] end;
  elsif cardinality(new.remote_modes) = 0 and new.remote_mode is not null then
    new.remote_modes := array[new.remote_mode];
  end if;
  new.remote_mode := new.remote_modes[1];

  -- Salary (legacy columns are euro only)
  if tg_op = 'UPDATE' and new.salary_min is not distinct from old.salary_min
     and new.salary_min_eur is distinct from old.salary_min_eur then
    new.salary_min := new.salary_min_eur;
    new.salary_currency := 'EUR';
  elsif new.salary_min is null and new.salary_min_eur is not null then
    new.salary_min := new.salary_min_eur;
  end if;
  if tg_op = 'UPDATE' and new.salary_max is not distinct from old.salary_max
     and new.salary_max_eur is distinct from old.salary_max_eur then
    new.salary_max := new.salary_max_eur;
    new.salary_currency := 'EUR';
  elsif new.salary_max is null and new.salary_max_eur is not null then
    new.salary_max := new.salary_max_eur;
  end if;
  new.salary_min_eur := case when new.salary_currency = 'EUR' then new.salary_min end;
  new.salary_max_eur := case when new.salary_currency = 'EUR' then new.salary_max end;

  return new;
end
$$;

drop trigger if exists searches_10_sync_legacy_columns on public.searches;
create trigger searches_10_sync_legacy_columns
  before insert or update on public.searches
  for each row execute function public.sync_search_legacy_columns();

-- 4. Plan limits, enforced in the database ---------------------------------

create or replace function public.enforce_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_max_searches integer;
  v_max_titles integer;
  v_max_locations integer;
  v_max_contracts integer;
begin
  select plan into v_plan from public.accounts where id = new.user_id;
  v_plan := coalesce(v_plan, 'free');

  if v_plan = 'max' then
    return new;
  elsif v_plan = 'plus' then
    v_max_searches := 3;
    v_max_titles := 6;
  else
    v_max_searches := 1;
    v_max_titles := 3;
    v_max_locations := 3;
    v_max_contracts := 3;
  end if;

  if tg_op = 'INSERT' then
    -- One insert at a time per user, so the count below cannot be raced.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
    if (select count(*) from public.searches where user_id = new.user_id) >= v_max_searches then
      if v_plan = 'free' then
        raise exception 'free_plan_search_limit: the Free plan includes one search profile'
          using errcode = 'check_violation';
      else
        raise exception 'plus_plan_search_limit: the Plus plan includes three search profiles'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  if (tg_op = 'INSERT' or new.job_titles is distinct from old.job_titles)
     and cardinality(new.job_titles) > v_max_titles then
    raise exception 'plan_limit_job_titles: the % plan includes up to % job titles per search profile', v_plan, v_max_titles
      using errcode = 'check_violation';
  end if;

  if v_max_locations is not null
     and (tg_op = 'INSERT' or new.locations is distinct from old.locations)
     and jsonb_array_length(new.locations) > v_max_locations then
    raise exception 'plan_limit_locations: the % plan includes up to % locations per search profile', v_plan, v_max_locations
      using errcode = 'check_violation';
  end if;

  if v_max_contracts is not null
     and (tg_op = 'INSERT' or new.contract_types is distinct from old.contract_types)
     and coalesce(cardinality(new.contract_types), 0) > v_max_contracts then
    raise exception 'plan_limit_contract_types: the % plan includes up to % contract types per search profile', v_plan, v_max_contracts
      using errcode = 'check_violation';
  end if;

  return new;
end
$$;

revoke all on function public.enforce_plan_limits() from public, anon, authenticated;

drop trigger if exists searches_20_plan_limits on public.searches;
create trigger searches_20_plan_limits
  before insert or update on public.searches
  for each row execute function public.enforce_plan_limits();

-- Replaces the Free-only limit from the previous migration.
drop trigger if exists searches_free_plan_limit on public.searches;
drop function if exists public.enforce_free_plan_search_limit();

-- Resources: extra files are for Plus and Max only.
create or replace function public.enforce_plan_documents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'other'
     and coalesce((select plan from public.accounts where id = new.user_id), 'free') = 'free' then
    raise exception 'plan_limit_resources: extra files in Resources are included in Plus and Max'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke all on function public.enforce_plan_documents() from public, anon, authenticated;

drop trigger if exists documents_plan_limits on public.documents;
create trigger documents_plan_limits
  before insert or update of kind on public.documents
  for each row execute function public.enforce_plan_documents();

-- 5. Job platforms --------------------------------------------------------------

alter table public.platforms
  add column if not exists country_codes text[],            -- null means worldwide
  add column if not exists sort_order integer not null default 100;

-- The stored login URL had an invalid host (underscores).
update public.platforms
set login_url = 'https://jobs.makesense.org/fr'
where slug = 'jobsthatmakesense' and login_url like '%jobs_that_makesense%';

insert into public.platforms (slug, label, brand_color, login_url, country_codes, sort_order) values
  ('linkedin', 'LinkedIn', '#0A66C2', 'https://www.linkedin.com/login', null, 10),
  ('indeed', 'Indeed', null, 'https://secure.indeed.com/auth', null, 20),
  ('glassdoor', 'Glassdoor', null, 'https://www.glassdoor.com/profile/login_input.htm', null, 30),
  ('wttj', 'Welcome to the Jungle', '#FFC619', 'https://www.welcometothejungle.com/fr/signin', null, 40),
  ('hellowork', 'HelloWork', '#FD3345', 'https://www.hellowork.com/fr-fr/candidat/login.html', null, 50),
  ('jobsthatmakesense', 'JobsThatMakeSense', '#006A4E', 'https://jobs.makesense.org/fr', null, 60),
  ('collectivework', 'Collective.work', null, 'https://www.collective.work', null, 70),
  ('francetravail', 'France Travail', null, 'https://candidat.francetravail.fr', array['FR'], 80)
on conflict (slug) do update
  set country_codes = excluded.country_codes,
      sort_order = excluded.sort_order;

-- 6. Offers published on several platforms -------------------------------------

alter table public.offers add column if not exists dedupe_key text;
create index if not exists idx_offers_user_dedupe
  on public.offers (user_id, dedupe_key) where dedupe_key is not null;

create table if not exists public.offer_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid not null,
  platform_slug text not null references public.platforms (slug) on delete restrict,
  external_id text not null,
  url text not null,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint offer_sources_offer_fkey
    foreign key (offer_id, user_id) references public.offers (id, user_id) on delete cascade,
  constraint offer_sources_user_platform_external_key unique (user_id, platform_slug, external_id)
);

create index if not exists idx_offer_sources_offer on public.offer_sources (offer_id);
create index if not exists idx_offer_sources_user on public.offer_sources (user_id);

alter table public.offer_sources enable row level security;

drop policy if exists "Users manage their own rows" on public.offer_sources;
create policy "Users manage their own rows" on public.offer_sources
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.offer_sources to authenticated;

-- Every existing offer already has one source: the platform it was found on.
insert into public.offer_sources
  (user_id, offer_id, platform_slug, external_id, url, posted_at, first_seen_at, last_seen_at)
select user_id, id, platform_slug, external_id, url, posted_at, first_seen_at, last_seen_at
from public.offers
on conflict (user_id, platform_slug, external_id) do nothing;

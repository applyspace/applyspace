-- Applications hub (APP-100, APP-115 to APP-118).
-- 1. Optional details of an application: link, location, deadline, reply date.
-- 2. application_documents: which of the user's documents were sent with it.
-- 3. Plan caps on the number of applications (Free 15, Plus 99, Max unlimited),
--    enforced in the database like the other plan limits.
-- Additive and re-runnable. Announced to the founder; never applied by an agent.

-- 1. Application details ----------------------------------------------------

alter table public.applications add column if not exists url text;
alter table public.applications add column if not exists location text;
alter table public.applications add column if not exists deadline_at timestamptz;
alter table public.applications add column if not exists responded_at timestamptz;

-- 2. Documents sent with an application ------------------------------------

create table if not exists public.application_documents (
  application_id uuid not null,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (application_id, document_id),
  foreign key (application_id, user_id) references public.applications (id, user_id) on delete cascade
);

create index if not exists idx_application_documents_user on public.application_documents (user_id);
create index if not exists idx_application_documents_document on public.application_documents (document_id);

alter table public.application_documents enable row level security;

drop policy if exists "Users manage their own application documents" on public.application_documents;
create policy "Users manage their own application documents"
  on public.application_documents for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );

revoke all on public.application_documents from anon;

-- 3. Plan caps -----------------------------------------------------------------

create or replace function public.enforce_application_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_max integer;
begin
  select plan into v_plan from public.accounts where id = new.user_id;
  v_plan := coalesce(v_plan, 'free');

  if v_plan = 'max' then
    return new;
  elsif v_plan = 'plus' then
    v_max := 99;
  else
    v_max := 15;
  end if;

  -- One insert at a time per user, so the count below cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended('applications:' || new.user_id::text, 0));
  if (select count(*) from public.applications where user_id = new.user_id) >= v_max then
    raise exception 'plan_limit_applications: the % plan includes up to % applications', v_plan, v_max
      using errcode = 'check_violation';
  end if;

  return new;
end
$$;

revoke all on function public.enforce_application_cap() from public, anon, authenticated;

drop trigger if exists applications_20_plan_cap on public.applications;
create trigger applications_20_plan_cap
  before insert on public.applications
  for each row execute function public.enforce_application_cap();

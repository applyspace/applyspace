-- Two product decisions:
--   1. Volunteer is a contract type (and the app also uses "Alternance" for
--      apprenticeships), so the contract checks accept them.
--   2. One search per job title, but only Plus accounts may have more than one
--      search. The Free limit is enforced here so it cannot be bypassed from a
--      client; `accounts.plan` is not writable by users (column grants).
--
-- Re-runnable: every statement is guarded.

alter table public.searches drop constraint if exists searches_contract_types_check;
alter table public.searches
  add constraint searches_contract_types_check
  check (contract_types <@ array['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage', 'Alternance', 'Bénévolat']);

alter table public.offers drop constraint if exists offers_contract_check;
alter table public.offers
  add constraint offers_contract_check
  check (contract in ('CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage', 'Alternance', 'Bénévolat'));

create or replace function public.enforce_free_plan_search_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select plan from public.accounts where id = new.user_id), 'free') = 'free'
     and exists (select 1 from public.searches where user_id = new.user_id) then
    raise exception 'free_plan_search_limit: the Free plan includes one search profile'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke all on function public.enforce_free_plan_search_limit() from public, anon, authenticated;

drop trigger if exists searches_free_plan_limit on public.searches;
create trigger searches_free_plan_limit
  before insert on public.searches
  for each row execute function public.enforce_free_plan_search_limit();

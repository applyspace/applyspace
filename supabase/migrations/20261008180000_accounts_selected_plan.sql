-- Onboarding v2: remember the plan the user picked on the last onboarding page.
--
-- `selected_plan` is an intent only. It grants nothing: limits and entitlements keep reading
-- `accounts.plan`, which stays unwritable by users (column grants). It lets us follow up on
-- Plus/Max interest when billing launches and measure demand per plan.
-- Additive and re-runnable. No data is changed.

alter table public.accounts
  add column if not exists selected_plan text;

alter table public.accounts drop constraint if exists accounts_selected_plan_check;
alter table public.accounts
  add constraint accounts_selected_plan_check check (selected_plan is null or selected_plan in ('free', 'plus', 'max'));

grant update (selected_plan) on public.accounts to authenticated;

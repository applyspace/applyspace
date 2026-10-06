-- First and last name on the account (the settings form edits them
-- separately), and the right for a user to create their own account row if
-- the sign-up trigger never ran for them.

alter table public.accounts
  add column first_name text,
  add column last_name text;

create policy "Users create their own account"
  on public.accounts for insert
  to authenticated
  with check (id = (select auth.uid()));

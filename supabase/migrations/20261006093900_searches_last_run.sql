-- When a search last ran through a connector (APP-20). Re-runnable.
alter table public.searches add column if not exists last_run_at timestamptz;

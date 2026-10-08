-- Onboarding v2: company size ranges used by the new onboarding.
--
-- The onboarding offers 1-10, 11-50, 51-200, 201-1,000 and 1,000+ employees; the original check only
-- accepted 0-15, 15-50, 50-500 and 500+. Both sets are accepted so existing rows stay valid.
-- Requires 20261006100334_onboarding_v2_profile_plans_platforms.sql (new search columns) to be applied first.
-- Additive and re-runnable.

alter table public.searches drop constraint if exists searches_company_sizes_check;
alter table public.searches
  add constraint searches_company_sizes_check
  check (company_sizes <@ array['0-15', '15-50', '50-500', '500+', '1-10', '11-50', '51-200', '201-1,000', '1,000+']);

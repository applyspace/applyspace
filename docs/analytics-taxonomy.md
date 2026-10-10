# Analytics taxonomy (PostHog)

Source of truth: `apps/web/src/lib/analytics.ts` (`AnalyticsEvents`). Never call `posthog.capture` directly; use `analytics.capture(name, props)`. Adding an event means adding it to that type and to this table.

Naming: `snake_case`, `object_action` in past tense (`cv_uploaded`), `*_failed` for failures.

## Identity

- Distinct id = Supabase user id, on web and desktop (the desktop shell loads the same web app, so one code path).
- `analytics.identify({ id }, { locale })` runs only after consent, when a user is known (sign-in, session restore, or right after Accept). Person properties: `app_platform` (`web`/`desktop`), `plan` (`free`/`plus`/`max`, once known), `locale` (`en`/`fr`). Email and name are never sent to PostHog.
- `analytics.reset()` runs on sign-out (`sign_out_completed` is captured first, under the old id) and on a direct account switch, so two accounts never merge. posthog-js clears the consent choice on `reset()`, so the helper restores it right after (granted stays granted, denied stays denied).
- Super properties on every event: `app_platform`, and `plan` once known (re-registered after each reset).

## Consent

- Analytics is opt-in. PostHog initialises with `opt_out_capturing_by_default: true` (`instrumentation-client.ts`): until the user accepts, nothing is captured (no events, pageviews, exceptions or identify). `analytics.capture` and `identify` are also no-ops without consent.
- Signed-in users see a small non-blocking prompt (`ConsentBanner`, bottom corner, EN and FR) until they choose Accept or Decline. The choice is stored by posthog-js on the device and persists across sessions on web and desktop.
- Settings > Privacy > "Usage analytics" switch defaults to off and reflects the stored choice. On = `opt_in_capturing`; off = `reset()` then `opt_out_capturing` (drops the identity).
- Consent states: `pending` (no choice, prompt shown, nothing captured), `granted`, `denied`.

## Events

| Event | Properties | Fired when |
|---|---|---|
| `sign_in_started` | `provider` | User clicks a sign-in provider |
| `sign_out_completed` | none | User signs out |
| `onboarding_step_viewed` | `step`, `step_index` | A step is shown (`import`, `status`, `role`, `location`, `contract`, `company`, `platforms`, `plan`) |
| `onboarding_step_completed` | `step`, `step_index`, `method` (`next`/`skip`) | User leaves a step |
| `onboarding_plan_selected` | `plan` (`free`/`plus`/`max`) | User clicks a plan |
| `onboarding_completed` | `completion_method` (`plan_selected`/`completed`/`skipped`), `plan?` | Answers saved and onboarding stamped (no longer fired before the save) |
| `onboarding_save_failed` | `reason` | Saving onboarding answers failed (incl. `signed-out`) |
| `onboarding_import_save_failed` | `reason` | Attaching the imported resume failed |
| `search_created` | `has_location`, `contract_types_count`, `experience_levels_count` | New search profile created |
| `search_run_completed` | `offers_found`, `offers_inserted`, `offers_updated` | "Search now" finished |
| `offer_declined` / `offer_application_started` | none | Offer actions in the offers table |
| `cv_uploaded` | `file_format`, `size_bucket` | Resume uploaded in Profile |
| `primary_cv_selected`, `fit_message_saved` | none | Documents panel |
| `profile_section_saved` / `profile_section_removed` | `section` | Profile editor |
| `linkedin_profile_sync_completed` | none | Settings profile sync |
| `settings_saved` | `section` (`profile`/`search_criteria`) | Settings tab saved |
| `$exception` | PostHog default | `global-error.tsx` (`captureException`) and `capture_exceptions: true` |

## Feature flags

None are read in the code today (no `getFeatureFlag`, `isFeatureEnabled`, `useFeatureFlag`, no bootstrap). If one is added, read it through a typed helper next to `analytics.ts`, define a safe default for when PostHog is blocked or not loaded, and bootstrap it for first paint.

## Proposed insights (not created; to build in PostHog after the APP-129 retest)

1. Onboarding funnel (funnel, 14 days, unique users): `onboarding_step_viewed` (step = import) > ... > `onboarding_step_viewed` (step = plan) > `onboarding_plan_selected` > `onboarding_completed`. Breakdown: `app_platform`, then `plan`. Companion trend: `onboarding_save_failed` and `onboarding_import_save_failed` by `reason`.
2. Activation (funnel, 7 days from `onboarding_completed`): `search_created` or `search_run_completed` (offers_found > 0) > `offer_application_started`. Activation = first `search_run_completed` with offers within 24 h of onboarding.
3. Weekly retention (retention, weekly, 8 weeks): start `onboarding_completed`, return on any of `search_run_completed`, `offer_application_started`, `offer_declined`, `profile_section_saved`. Breakdown `app_platform`.
4. Data health: unique users per day with `$identify`, to check identified vs anonymous ratio and opt-outs (expect volume to follow the opt-in rate: only users who accepted are tracked).

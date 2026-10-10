# Analytics taxonomy (PostHog)

Source of truth: `apps/web/src/lib/analytics.ts` (`AnalyticsEvents`). Never call `posthog.capture` directly; use `analytics.capture(name, props)`. Adding an event means adding it to that type and to this table.

Naming: `snake_case`, `object_action` in past tense (`cv_uploaded`), `*_failed` for failures.

## Identity

- Distinct id = Supabase user id, on web and desktop (the desktop shell loads the same web app, so one code path).
- `analytics.identify({ id, email }, { locale })` runs only after consent, when a user is known (sign-in, session restore, or right after Accept). Person properties: `app_platform` (`web`/`desktop`), `plan` (`free`/`plus`/`max`, once known), `locale` (`en`/`fr`), `email` (account email, founder decision 10 Oct, opt-in only). The name is never sent to PostHog.
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
| `onboarding_import_save_failed` | `reason` (`unsupported`/`too-large`/`signed-out`/`upload`/`register`/`profile`) | Attaching the imported resume failed. `profile` = the confirmed resume data could not be saved to the profile (call site lands with APP-110/APP-120) |
| `resume_import_confirmed` | `context` (`onboarding`/`profile`), `sections_count` | User reviewed a parsed resume and confirmed it. Counts only, never content. **Call site pending**: APP-110 (`importParsedProfile` in `OnboardingV2`) |
| `application_status_changed` | `from_status`, `to_status`, `layout` | A status move was saved in the Applications hub (not fired when the save fails) |
| `applications_layout_changed` | `from_layout`, `to_layout` (`board`/`table`/`timeline`/`map`) | User switches the Applications hub layout |
| `application_created` | `source` (`manual`/`offer`) | An application is created. **Call site pending**: APP-118 (`ApplicationForm` after `createApplication` succeeds) |
| `search_created` | `has_location`, `contract_types_count`, `experience_levels_count` | New search profile created |
| `search_run_completed` | `offers_found`, `offers_inserted`, `offers_updated` | "Search now" finished |
| `offer_declined` / `offer_application_started` | none | Offer actions in the offers table |
| `cv_uploaded` | `file_format`, `size_bucket` | Resume uploaded in Profile |
| `primary_cv_selected`, `fit_message_saved` | none | Documents panel |
| `profile_section_saved` / `profile_section_removed` | `section` | Profile editor |
| `linkedin_profile_sync_completed` | none | Settings profile sync |
| `settings_saved` | `section` (`profile`/`search_criteria`) | Settings tab saved |
| `$exception` | PostHog default | `global-error.tsx` (`captureException`) and `capture_exceptions: true` |

### Pending call sites

`resume_import_confirmed`, `application_created` and the `profile` reason of `onboarding_import_save_failed` are declared in the typed helper but not fired yet: their screens are in open PRs (APP-110, APP-118, APP-120) that were not merged when this was written. Each PR adds a single `analytics.capture(...)` line at the spot named above; until then the matching dashboard tiles stay empty. Properties are enums and counts only: no company names, job titles, notes, URLs, file names or resume content.

## Feature flags

None are read in the code today (no `getFeatureFlag`, `isFeatureEnabled`, `useFeatureFlag`, no bootstrap). If one is added, read it through a typed helper next to `analytics.ts`, define a safe default for when PostHog is blocked or not loaded, and bootstrap it for first paint.

## Dashboards (PostHog EU, project 296021)

| Dashboard | Id | Insights |
|---|---|---|
| Onboarding funnel | 1011880 | Onboarding funnel by platform, plan selected by plan, save failures by reason (includes `onboarding_import_save_failed` reasons), resume imports confirmed (new) |
| Activation and retention | 1011881 | Activation funnel, weekly retention after onboarding, weekly active users (now also `application_status_changed` and `application_created`), application status moves by new status (new), Applications hub layout usage (new) |
| Data health and errors | 1011882 | Event volume by name, identified users per day, exceptions per day, sign-in by provider |

Notes: retention uses `search_run_completed` as the single returning event (the typed retention query takes one). Data only exists for users who opted in, so volume follows the opt-in rate. Retest steps for the founder: `docs/posthog-retest.md` (APP-129).

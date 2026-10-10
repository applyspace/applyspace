# PostHog retest checklist (APP-129)

For the founder. Run on the Alpha build (web, then desktop). PostHog EU project 296021, dashboards 1011880, 1011881, 1011882. Taxonomy: `docs/analytics-taxonomy.md`.

Tip: use a private window, open DevTools > Network and filter on `i/v0/e`, `/flags`, `/s/` (recorder) and `/decide`. Use Live events in PostHog (Activity > Live) to confirm what arrives.

## 1. Consent (opt-in)

- [ ] Fresh browser profile, sign in. The consent banner appears (bottom corner, EN/FR) and does not shift the page or the onboarding top bar.
- [ ] Before choosing: no request to `i/v0/e`, no recorder (`/s/`) request, nothing in Live events, no `$pageview`, no `$identify`. Note whether a `/flags` request goes out anyway and write it down (not expected to carry events).
- [ ] Decline: banner disappears, still nothing captured, Settings > Privacy > Usage analytics is OFF. Reload: no banner, still OFF.
- [ ] Settings > Privacy: switch ON. Events start flowing, `$identify` appears. Switch OFF: capture stops and the identity is dropped (next events, if any, would be anonymous).
- [ ] Accept in a new profile: banner gone, switch shows ON after reload.
- [ ] Session replay: no recording exists for the period before Accept (Replay > recordings, check start time vs consent time).
- [ ] Sign out then sign in with the same account: the previous choice is kept (granted stays granted, denied stays denied) and no second banner.
- [ ] Desktop app: same banner, same persisted choice.

## 2. Identity and person properties

- [ ] After Accept and sign-in, one `$identify` with the Supabase user id as distinct id (not the email).
- [ ] Person properties: `email` (founder decision 10 Oct), `app_platform` (`web` or `desktop`), `plan` once known, `locale`. No `name`, `first_name`, `full_name`.
- [ ] Same account on web and desktop resolves to the same person.
- [ ] Sign out: `sign_out_completed` arrives under the old id, then a new anonymous id. Switch directly to another account: two persons, not merged.
- [ ] Super property `app_platform` is present on every event.

## 3. Events (fire each once, check name and properties in Live events)

| Action | Expected event and properties |
|---|---|
| Click a sign-in provider | `sign_in_started` (`provider`) |
| Onboarding: open each step | `onboarding_step_viewed` (`step`, `step_index`) |
| Onboarding: Next / Skip | `onboarding_step_completed` (`method` = `next`/`skip`) |
| Onboarding: pick a plan | `onboarding_plan_selected` (`plan`), then `onboarding_completed` only after the answers are saved |
| Onboarding: force a save failure (offline) | `onboarding_save_failed` (`reason`), no `onboarding_completed` |
| Onboarding: import a resume that cannot be stored | `onboarding_import_save_failed` (`reason` is one of the fixed values) |
| Profile: upload a CV | `cv_uploaded` (`file_format`, `size_bucket`) |
| Applications hub: switch layout | `applications_layout_changed` (`from_layout`, `to_layout`) |
| Applications hub: move a card to another status | `application_status_changed` (`from_status`, `to_status`, `layout`); not fired if the save fails or the status is unchanged |
| Create an application manually | `application_created` (`source`) once APP-118 is merged |
| Confirm a parsed resume | `resume_import_confirmed` (`context`, `sections_count`) once APP-110 is merged |
| Search, decline or apply to an offer | `search_run_completed`, `offer_declined`, `offer_application_started` |

- [ ] Event names match the table exactly (snake_case, past tense).
- [ ] Not yet wired, expected missing: `application_created`, `resume_import_confirmed`, reason `profile`.

## 4. No personal data in properties

- [ ] Open 5 to 10 events in Live events and read every property. Allowed: enums, counts, booleans, plan, locale. Not allowed: company name, job title, notes, URL, file name, search keywords, resume text, email or name inside an event (email lives only on the person).
- [ ] Error messages are never sent as `reason`.

## 5. Feature flags

- [ ] The code reads no flag today (no `getFeatureFlag`, `isFeatureEnabled`, bootstrap), so there is nothing to break. In PostHog > Feature flags, confirm none are expected to be live.
- [ ] If a flag is added later: typed helper, safe default when PostHog is blocked, bootstrap for first paint (see taxonomy doc).
- [ ] With an ad blocker on, the app works normally (no errors, no blocked UI).

## 6. Dashboards after the retest

- [ ] 1011880 Onboarding funnel: steps and plan tiles fill with your test run; save failures tile shows the forced failure by `reason`.
- [ ] 1011881 Activation and retention: status moves and layout usage tiles show your test moves.
- [ ] 1011882 Data health: identified users per day is above 0 after Accept; volume only counts opted-in users.
- [ ] Remove test persons if needed (Persons > delete) so the dashboards start clean.

Result: tick the boxes, then comment on APP-129 with anything that failed (event, property, screenshot of Live events).

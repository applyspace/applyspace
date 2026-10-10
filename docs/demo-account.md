# Demo account

Linear: APP-139. A fictional job seeker, **Camille Aubert**, with a full account: profile, about 40 offers, about 20 applications, interviews, documents, saved searches, Max plan. The founder can open it at any time, on every preview. Nothing here is real: no person, company or address. Hosts are reserved (`.example`), the account email is on `example.com`, companies have no domain (so no logo is fetched for them).

## Three separate things

| | Public demo | Demo account | Seed |
|---|---|---|---|
| Where | `demo.applyspace.app` only (AGENTS.md) | Any preview, local run | Supabase project of the founder |
| Data | In-memory fixtures (`lib/demo.ts`), WTTJ snapshot | Real Supabase rows of the demo user | Writes the rows above |
| Who | Anyone, no sign-in | The founder, with a private link | The founder, from his computer |
| Writes | Never (read-only) | Yes, as any user (reset with the seed) | n/a |

The public demo does **not** serve this dataset yet (it has no applications, interviews or profile fixtures). See "Open decisions".

## What the dataset holds

| Area | Content |
|---|---|
| Account | Max plan, onboarded, French locale, availability "open", phone in the reserved fictional range |
| Profiles | 2: Product Designer (default) and UX Researcher |
| Profile details | 3 experiences, 2 education, 12 skills, 3 languages, 3 certifications, 4 links, 2 projects, 1 volunteering, 1 publication |
| Companies | 35, fictional, headquartered in 14 French cities |
| Offers | 40 on 8 platforms (LinkedIn, Indeed, Glassdoor, WTTJ, HelloWork, JobsThatMakeSense, Collective.work, France Travail), CDI / CDD / Freelance / Stage, statuses new 17, viewed 5, passed 4, applied 14, 3 published on two platforms (43 sources) |
| Applications | 20: waiting 6, interviewing 4, accepted 1, rejected 4, ghosted 3, withdrawn 2. 14 come from an offer, 6 were logged by hand. All have a location: pins for Paris, Lyon, Lille, Marseille, Nice, Grenoble, Bordeaux, Nantes and Annecy, and 4 remote ones for the "remote and unlocated" list of the Map. One has a deadline in 5 days |
| Interviews | 18, four of them upcoming |
| Documents | 2 CVs (FR primary, EN), 2 fit messages, 2 other files (portfolio, certificate). The PDFs are small generated placeholders |
| Searches | 5 saved searches across both profiles, with built-in no-gos on the main one |

Dates are relative to an **anchor day**: the same anchor always gives the same data. Re-seed with a new anchor to keep "posted 3 days ago" true (`--anchor YYYY-MM-DD`, default today for the script; `2026-10-12` for `pnpm demo:sql`).

Source: `packages/core/src/demo/` (`fixtures.ts` is the content, `dataset.ts` builds the rows). Row ids are fixed uuids that do not depend on the user, so a re-run upserts the same rows.

## Founder actions, in order

1. **Migrations.** The dataset uses the rich profile tables and the application details: `20261010000000_profile_data_model.sql` and `20261010120000_applications_hub.sql`. The open PRs #65 and #66 say both are already applied on Supabase; both the script and the SQL check for them and stop with a clear message if they are missing.
2. **The demo user.** Either create it in the dashboard (Authentication > Users > Add user, email `demo@example.com`, a password you choose, auto confirm), or let the script do it (`--create-user`, below). The email must be on `example.com`. Email sign-in must be enabled in Authentication > Providers.
3. **Review and give the go.** The exact statements come from `pnpm demo:sql`, which writes `supabase/seed/demo-account.sql` (git-ignored, about 110 KB, deterministic for a given anchor and email, so what you read is what runs). It is one atomic `do` block: it checks the prerequisites, finds the demo user, sets the Max plan, deletes only that user's rows in the seeded tables, inserts the dataset. It touches no other user and no Storage object. Say "go" and pick a way to run it:
   - **Script (recommended)**, from your computer, with the values in your shell or in `apps/web/.env.local` (gitignored):
     ```bash
     pnpm demo:seed                      # dry run: prints the plan, no network call
     pnpm demo:seed --apply --confirm-project <project-ref> [--create-user] [--reset]
     ```
     It also uploads the four placeholder PDFs to the `documents` bucket, which SQL cannot do. `--reset` first wipes the demo user's rows, back to the pristine state. `--files-only` re-uploads the PDFs.
   - **SQL Editor**: paste the file. The document rows exist but their PDFs do not; run `pnpm demo:seed --apply --confirm-project <ref> --files-only` afterwards if you want them to open.
4. **Vercel variables**, for the **Preview** environment only (and `.env.local` for local runs). Names only, you set the values:

   | Variable | Value |
   |---|---|
   | `DEMO_LOGIN_ENABLED` | `1` |
   | `DEMO_LOGIN_KEY` | 24+ random characters you generate (the secret of the link) |
   | `DEMO_USER_EMAIL` | the demo user's email, on `example.com` |
   | `DEMO_USER_PASSWORD` | its password |

   `SUPABASE_SERVICE_ROLE_KEY` is for the seed script on your computer only. Never put it in Vercel, never in the repo.
5. **Open the demo** on any preview: `https://<preview-url>/auth/demo?key=<DEMO_LOGIN_KEY>`. It signs in and lands on Home. Bookmark it per preview, or keep the key in a note and append it.
6. **Who can reach previews.** Keep Vercel Deployment Protection on for Preview deployments (Standard protection: only members of your Vercel team can open them), and do not enable a protection bypass or public previews. The `?key=` is a second lock, not the first.

Reset or refresh at any time: `pnpm demo:seed --apply --confirm-project <ref> --reset --anchor $(date +%F)`.

## How it stays safe

- **Public demo is read-only, in three layers.** (1) The demo host never reads a session, so no data layer has a scope. (2) Server actions need that scope and answer "sign in" without it. (3) The proxy refuses any writing call (`POST`, `PATCH`, `PUT`, `DELETE`) to `/api/*` on `demo.*` with a 403, even when Supabase is not configured (`isDemoWriteBlocked`, tested).
- **No analytics from demo sessions.** `demo.*` does not even initialise PostHog. For previews, the app blocks analytics for any signed-in user whose email is on `example.com` (the demo account): no capture, no identify, no pageviews or exceptions, no consent banner, and the Settings switch cannot turn it on. The visitor's stored choice is restored on sign-out (`analytics.setBlocked`, tested).
- **`/auth/demo` answers 404 unless** it is explicitly enabled, `VERCEL_ENV` is not `production`, the host is not `demo.*`, the key matches (constant time), and the email is on `example.com`. So the key can only ever open the demo account, never a real one.
- **The seed is guarded**: dry run by default, `--confirm-project` must equal the project ref, the email must be on `example.com`, the SQL has the same guard and deletes only rows of that one user. No secret is in the repo; scripts read environment variables.
- **Nothing real**: tests fail if the dataset contains a non-`.example` URL, an email outside `example.com`, or a company domain.

## Open decisions

1. **Staging project.** Previews and production share one Supabase project today (`supabase/README.md`), so the demo user's rows live next to real users' (isolated by RLS, but they count in any total). Move the demo to the staging project once it exists.
2. **Public demo data.** Serve this dataset from memory on `demo.applyspace.app` (applications, interviews, profile) instead of the WTTJ snapshot? It needs read fixtures for the hub, interviews and profile; the dataset module is ready for it. Proposed as a follow-up.
3. **A demo user per language?** One French persona for now.

## Maintaining it

- Edit `packages/core/src/demo/fixtures.ts` (content) or `dataset.ts` (rows), then run `pnpm --filter @apply/core test` (integrity, constraint and "nothing real" checks) and `pnpm demo:sql` to regenerate the SQL.
- A new table or column in the schema: add it to the dataset and to the prerequisites check in `sql.ts`.
- The generated SQL was run twice, with all 11 migrations replayed, in a local Postgres (PGlite) with stubbed `auth` and `storage` schemas: both runs pass, counts above confirmed. It has not run on a Supabase project.

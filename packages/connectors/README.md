# @apply/connectors

Job board connector contract, pure parsers and a local Playwright probe (Linear APP-77, ADR-004).

- `src/types.ts`: `SearchCriteria`, `JobSummary`, `Job` (common schema) and the `Connector` interface (`search(criteria, page)` returns `JobSummary[]`, `detail(id)` returns `Job`).
- `src/criteria.ts`: `searchCriteriaFromProfile()` maps the saved first search profile columns (`job_titles`, `locations`, `remote_modes`, `contract_types`, `experience_levels`, `salary_min`, `salary_currency`) to `SearchCriteria`. `splitCriteria()` fans out titles x locations.
- `src/platforms/{wttj,hellowork,indeed,linkedin}`: URL builders (with `unverified` flags), pure parsers and a connector factory. Fetching is injected (`fetchText`), so the host (extension, desktop app, probe) owns the browser session.
- `src/probe`: the Playwright probe described below.

Nothing here was run against a real platform. Parsers are tested on **synthetic fixtures** (`test/fixtures`, each labelled) built from the field lists in the Notion report "Job platforms: data access report". Card selectors for HelloWork, Indeed and LinkedIn are assumptions until the probe's saved HTML confirms them; each parser exports its selector table.

```
pnpm --filter connectors lint
pnpm --filter connectors typecheck
pnpm --filter connectors test
```

## Terms of service: read before running the probe

The probe opens real pages in a browser on **your own computer**, with **your own** profile folder. You run it at your own risk.

| Platform | Warning |
|---|---|
| Welcome to the Jungle | robots.txt disallows any URL with a query string, the terms were not reviewed. Keep volume low. |
| HelloWork | robots.txt disallows the search page and any URL with `?`. Terms prohibit automated extraction without a written licence. |
| Indeed | Strong anti-bot measures, `/viewjob` is disallowed. Accounts can be restricted. Use a throwaway or low-stakes session, never your main account. |
| LinkedIn | The User Agreement prohibits scraping. Accounts can be restricted or banned. Prefer logged-out (guest) mode or a throwaway account, never your main profile. |

The probe never asks for, reads or logs cookies, passwords or tokens. You log in by hand in the browser window; the session lives in the profile folder only. Do not copy that folder anywhere, do not commit it, and do not share `probe-output` without reading it first.

## Probe: steps

1. Install once, from the repo root (needs Node 22 and pnpm):

   ```
   pnpm install
   pnpm --filter connectors exec playwright install chromium
   ```

   To use a Chrome you already have instead, set `PROBE_CHROMIUM_PATH` to its executable.

2. Run one search (a visible browser opens):

   ```
   pnpm --filter connectors probe hellowork --query "product designer" --location Paris --pages 2
   ```

   Platforms: `wttj`, `hellowork`, `indeed`, `linkedin`. Options:

   | Option | Meaning |
   |---|---|
   | `--query <text>` | Job title or keyword (required unless `--matrix`) |
   | `--location <text>` | City or place |
   | `--pages <n>` | Listing pages, 1 to 5 (default 1) |
   | `--details <n>` | Also open the first n job pages. Listing pages + details never exceed 5 |
   | `--sort relevance\|date` | Sort order, when the URL can express it |
   | `--remote` | Remote filter |
   | `--matrix` | Run the test matrix, `--pages` per combination |
   | `--profile-dir <path>` | Browser profile (default `~/.apply/probe-profile`, outside the repo) |
   | `--output-dir <path>` | Results folder (default `./probe-output`, gitignored) |
   | `--headless` | Hide the browser. Default is visible so you can log in or solve a captcha |
   | `--no-prompt` | Skip the pause before the first load |

3. When the browser opens on the platform home page, log in by hand if you want to (see the warnings above), or stay logged out. Come back to the terminal and press Enter. The probe then loads pages one at a time.

4. Rules the probe enforces and you cannot change from the command line: 6 to 12 seconds (random) between page loads, at most 5 page loads per search run, stop at the first captcha, block page, login wall or HTTP 403/429. If it stops, solve nothing and re-run later; the report is still written.

5. Read the result in `probe-output/<platform>-<timestamp>/`:

   - `fields-report.md`: URL parameters used and observed, response keys with types, fill rate and one example per field, pagination size, blocks seen, one row per page load.
   - `html/`: raw HTML of each page (CSRF-looking values redacted).
   - `responses/`: every JSON response observed while pages loaded (sensitive keys redacted; request headers are never saved).
   - `run.json`: the raw run record.

6. Paste `fields-report.md` (not the raw folders) into the Notion report page, in the section "Probe harness and how to run it", and open an issue for any selector or parameter that differs from the code.

## Test matrix

From the report: 3 job titles x 4 places x 2 sort orders per platform, with the raw response saved next to the parsed record.

| Axis | Values |
|---|---|
| Job titles | `product designer`, `développeur full-stack`, `data analyst` |
| Places | `Paris`, `Lyon`, `Niort`, remote (no city, remote filter on) |
| Sort | `relevance`, `date` |

```
pnpm --filter connectors probe linkedin --matrix --pages 1
```

That is up to 24 page loads per platform at 6 to 12 seconds each, about 4 minutes. HelloWork and WTTJ cannot express the sort order in a URL parameter we know, so the duplicate combinations are skipped and listed in the report. Run each platform on a different day rather than back to back, and keep `--pages 1` for LinkedIn and Indeed.

Per run the report records: HTTP status, number of cards, page size, fields filled (%), time, and any block or captcha.

## What the probe does not do

It does not read `context.cookies()`, storage state, local storage or request headers (a test fails if such an API appears in `src`). It does not use stealth settings or try to bypass captchas. It does not call any private API on its own: it only loads the pages a visitor would load and records what the page itself requested.

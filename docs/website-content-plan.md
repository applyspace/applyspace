# Website content plan

Linear: WEB-9 (team Website, project Website; formerly APP-138). Site code: `site/`. Copy is English first; French comes later through the same content model (`locale`), starting from the FR reference headline "Votre recherche d'emploi, enfin centralisée".

Titles below are the page part only: the template appends " | applyspace" (Home uses its full title).

## Principles

- Product name is **applyspace** in running text; the logo reads "Apply" (never altered). Domain `applyspace.app`.
- Never use "hunt"/"hunting". Tagline to keep: "Find the right offers, track your applications and prepare your interviews."
- Calm, factual, short sentences. No claim the product does not do today. The site is written as if everything works: no "Soon", "coming soon" or "planned" labels (decision of 10 Oct, launch happens once everything is wired).
- AI features run on the user's own AI accounts (Claude, OpenAI, Gemini). The site never promises "free AI".
- All data lives in the cloud (hosted database, per-user access rules). Never say data or sessions stay on the device. Do not over-claim security.
- One primary call to action everywhere: **Start for free** (app login/onboarding). Secondary: **Sign in**.
- Prices are shown plainly (Free €0, Plus €0.99, Max €3.99 per month), without tags.

## Information architecture

| Route | Purpose | Primary keyword intent |
|---|---|---|
| `/` | Home, short | job search tracker, job application tracker |
| `/product` | Features by theme, one anchor per feature | job application tracking software, job search app |
| `/resources` | Article list (Sanity) | job search guides |
| `/resources/[slug]` | Article template | long tail, per article |
| `/pricing` | Free / Plus / Max + FAQ | job search app pricing |

Routes are generated under `[locale]` (`en` only now, unprefixed URLs). Adding `fr` later means a new content set and `locales` entry; hreflang is generated from that list.

Header: logo (left), nav centre (Product, Resources, Pricing), right: **Sign in** (secondary), **Start for free** (primary). Mobile: logo + menu button, panel with the same links and both buttons.
Footer: Product / Resources / Pricing links, Sign in, copyright, privacy and terms placeholders (pages to write, see Open items).

## Home (`/`)

- **Title tag**: applyspace: your job search, finally in one space (≤ 60 chars)
- **Meta description**: Find the right offers, track your applications and prepare your interviews, all in one space. Free to start. (≤ 155)
- **H1**: Your job search, finally in one space
- Sub: Find the right offers, track your applications and prepare your interviews.
- CTAs: Start for free / See the product
- Hero visual: screenshot placeholder (Applications board).
- **H2 Three jobs, one space** — three cards linking to Product anchors:
  - Find the right offers — Search several job boards from one space with search profiles that follow your criteria. → `/product#offers-search`
  - Track your applications — Board, table, timeline or map: the same applications, the view you need. → `/product#applications-board`
  - Prepare your interviews — Keep every interview, date and note next to its application. → `/product#interview-tracking`
- **H2 How it works** — 1 Import your resume (applyspace fills your profile, you review) · 2 Set your search (titles, places, contracts, salary) · 3 Apply and follow up.
- **H2 Your data stays yours** — Your data is stored in the cloud and scoped to your account. You choose what to import. AI features use your own AI accounts.
- **H2 Start free, upgrade when you need more** — three plan mini cards (applications 15 / 99 / unlimited) → `/pricing`.
- Final CTA band: Start for free.

JSON-LD: Organization, WebSite, SoftwareApplication.

## Product (`/product`)

- **Title**: Product: search, track and prepare in one app | **Meta**: Job offers search, an applications hub with board, table, timeline and map, interview tracking and a resume-powered profile.
- **H1**: Everything for your job search, in one app
- Sticky in-page nav by theme (Find, Track, Prepare, Profile, Control). Each feature is an `<article id="<anchor>">` with H3, 1 to 2 sentences, 3 bullets, a screenshot placeholder with alt text, and a plan tag.

| Theme (H2) | Anchor | Feature (H3) | Copy (summary) | Plan |
|---|---|---|---|---|
| Start | `home-overview` | Home | A calm start page: your next interview, your applications at a glance, your resume. | Free |
| Find | `offers-search` | Job offers search | Offers from the job boards you choose, listed in one space with the sources shown. | Free |
| Find | `search-profiles` | Search profiles | Titles, places worldwide, contracts, salary, sectors and company size. One profile on Free, three on Plus, unlimited on Max. | Free |
| Track | `applications-board` | Board | Columns by status: waiting, interviewing, accepted, rejected, ghosted, withdrawn. Move a card, update a status. | Free |
| Track | `applications-table` | Table | Sort and filter every application; choose your columns. | Free |
| Track | `applications-timeline` | Timeline | See applied dates, replies, interviews and deadlines on a time axis. | Free |
| Track | `applications-map` | Map | Your applications by city, with remote ones listed apart. | Free |
| Track | `application-limits` | Application cap | 15 applications on Free, 99 on Plus, unlimited on Max. | Free |
| Prepare | `interview-tracking` | Interview tracking | Dates, steps and notes attached to each application; upcoming interviews on Home. | Free |
| Prepare | `fit-messages` | Cover letters and fit messages | Write with your own AI account (Claude, OpenAI, Gemini) and edit without limit. | Free |
| Profile | `profile-resume-parser` | Profile and resume parser | Import a PDF or DOCX resume (3 MB max); experiences, education, skills and languages are extracted for you to review. Nothing is saved until you confirm. | Free |
| Profile | `writing-style` | Writing style | Teach applyspace how you write for letters and messages. | Free |
| Control | `settings` | Settings | General, account, privacy, billing, profile, connectors, language (English and French). | Free |
| Control | `privacy` | Privacy by design | Data stored in the cloud, scoped to your account; analytics are opt-in. | Free |

Plus (advanced filters, company insights, network connections, reply tracking, calendar sync) and Max (AI interview simulation, shareable progress page, custom offer source) are listed on Pricing and shown like any other feature.

Closing CTA: Start for free.
JSON-LD: SoftwareApplication with featureList, BreadcrumbList.

## Resources (`/resources`, `/resources/[slug]`)

- **Title**: Resources: guides for a calmer job search | **H1**: Resources | Sub: Practical guides on searching, tracking and interviewing.
- List: card per article (category, title, excerpt, date, reading time). Category filter later.
- Article template: breadcrumb, category, H1, byline + published/updated dates, cover (alt), body (Portable Text: H2/H3, lists, quotes, images with alt, callouts), related articles, CTA band "Track your applications in applyspace".
- JSON-LD: Article (headline, dates, author, image, publisher), BreadcrumbList.
- Seed articles (written, short, to be reviewed by the founder before launch):
  1. How to track your job applications without losing track (statuses, follow-up rhythm)
  2. A simple checklist to prepare a job interview
- Editorial backlog (to brief in Sanity): follow-up email after an interview; how many applications per week; reading a job offer; salary negotiation basics; job search for career changers; ghosted after an interview.

## Pricing (`/pricing`)

- **Title**: Pricing: Free, Plus and Max | **Meta**: Start free with 15 applications. Plus raises the cap to 99 and Max removes limits.
- **H1**: Start free, upgrade when you need more
- Plans (caps match the database triggers):

| | Free | Plus | Max |
|---|---|---|---|
| Price | €0 | €0.99 / mo | €3.99 / mo |
| Applications | 15 | 99 | Unlimited |
| Search profiles | 1 | 3 | Unlimited |
| Interview templates | 1 | 3 | Unlimited |
| Core (tracking, interview prep, resume rewrite, fit messages, job alerts, autofill, AI integrations) | yes | yes | yes |
| Advanced search filters, company insights, network connections, reply tracking, interview calendar sync | no | yes | yes |
| AI interview simulation, shareable progress page, custom offer source | no | no | yes |

Quarterly billing: -15% (not shown on the site). Mismatch to settle: the product decision says archived applications do not count toward the cap, but the database trigger counts every application row. Undecided: the founder is testing the Linear free-plan limit before ruling. The site says only that every saved application counts.
- FAQ (also FAQPage JSON-LD): Is applyspace free? · What counts as an application? · Can I change plan later? · What happens to my data if I go back to Free? (data is kept, possibilities reduced) · Does applyspace pay for AI? (no, use your own AI account) · Where is my data stored? (everything in the cloud, hosted database with per-user access rules).
- CTAs: Start for free on every plan.

## SEO requirements per page

Unique title and description, one H1, logical H2/H3, canonical, Open Graph and Twitter card, JSON-LD as above, image alt, internal links between Home, Product anchors, Pricing and Resources.

## Open items for the founder

- Decided: the app lives on `applyspace.app` itself; the site is what signed-out visitors see. The routing between the two (signed-in vs signed-out on the same origin) is a separate piece of work.
- Privacy policy and terms pages (legal text is not drafted here).
- Real screenshots to replace placeholders.
- French copy.

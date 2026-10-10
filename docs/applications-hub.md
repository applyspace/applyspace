# Applications hub: design

Linear: APP-114 (design), APP-100 (Board), APP-115 (Table), APP-116 (Timeline), APP-117 (Map), APP-118 (create an application). Extends APP-25. Status: proposal, validated by the founder on review of this PR.

Figma was not used: the issue links no file and no account may be created. This document is the design source for the build: information architecture, states, wireframes, data needs. Visual language is the app's own (shadcn base, luma, stone; near-black primary; Fraunces titles, Geist body; Hugeicons; light and dark through the existing tokens).

## 1. Information architecture

| Route | What |
|---|---|
| `/applications` | The hub. One page, four layouts of the same data, switched with `?layout=board\|table\|timeline\|map` (default `board`). |
| `/applications?new=1` | Hub with the "New application" peek (sheet) open. |
| `/applications/new` | Full-page creation form (same form component as the peek). |
| `/applications/[slug]` | Existing detail page, kept. Reached from "Open full page". |

The hub header is shared by all layouts, so switching a layout never loses the filters:

```
Applications  (12 / 15)                     [Board|Table|Timeline|Map]  [+ New application]
[ Search company or title ]  ( Waiting 5 )( Interviewing 2 )( Accepted 1 )( Closed 4 )  [Needs attention]
```

- Count and cap: `used / cap` (Free 15, Plus 99, Max unlimited shows the count only). At the cap the New button is disabled with a hint; the database enforces the same cap.
- Layout switcher: a toggle group (base-ui), keyboard accessible, state in the URL. On mobile it collapses to icons.
- Filters (shared): free text on company, title and location; status chips (multi); "Needs attention" = waiting for 14 days or more, or a deadline within 7 days.
- Selecting an item (card, row, event, pin) opens the same peek sheet; "Open full page" goes to `/applications/[slug]`.

## 2. Status model

The six database statuses stay (no migration of the check constraint). They map to Board columns:

| Status | Column | Tone | Meaning |
|---|---|---|---|
| `waiting` | Waiting for answer | stone | Applied, no reply yet. |
| `interviewing` | Interviewing | blue | At least one interview in progress. |
| `accepted` | Accepted | green | Offer received or accepted. |
| `rejected` | Rejected | red | Declined by the company. |
| `ghosted` | Ghosted | amber | No answer after a long time. |
| `withdrawn` | Withdrawn | muted | The candidate stopped. |

The first three columns are "active", the last three "closed" (muted header). Moving a card between columns (drag, or the status menu on the card) writes `applications.status`. A "To apply" wish list is out of scope: offers keep that role (`offers.user_status`).

## 3. Layouts

### Board (default, APP-100)

```
| Waiting 5   | Interviewing 2 | Accepted 1 | Rejected 2 | Ghosted 1 | Withdrawn 1 |
| [card]      | [card]         | [card]     | [card]     | [card]    | [card]      |
| [card]      | [card]         |            |            |           |             |
```

Card: company logo (Brandfetch by domain, initial fallback), company, job title, location, applied date, badge for the next interview or a close deadline, status menu. Columns scroll vertically, the board scrolls horizontally on desktop. Mobile: a status tab strip, one column at a time.

### Table (APP-115)

Columns: Company, Title, Status, Applied, Location, Next step. Sortable headers (click cycles asc, desc), column chooser (dropdown with checkboxes, remembered per browser), row click opens the peek. Status is a menu cell.

### Timeline (APP-116)

Applications on a time axis, one row per application, markers for applied, reply, interviews, deadline; today line.

```
            Sep            Oct
Acme        o applied ---- o interview(HR) ---- o interview(Final)   | today
Globex      o applied ------------------ x deadline
```

Mobile: a vertical list of dated events grouped by month.

### Map (APP-117)

Applications on a map by location (Geoapify, server side only). Pins with a count when several share a city; selecting a pin lists its applications in a side panel (below the map on mobile). Remote or location-less applications sit in a "Remote and unlocated" list, never dropped.

### Create an application (APP-118)

Two presentations built on one form component, to compare:

- Peek (sheet from the right) opened from the hub: quick capture, stays in context.
- Full page `/applications/new`: room for notes and documents.

Fields: company (required), job title (required), link, location, status (default waiting), applied on (default today), deadline, notes, documents (existing Resources documents). Cap reached: the form shows the cap message and submit is disabled.

## 4. States

| State | Behaviour |
|---|---|
| Loading | The hub is a server component; `loading.tsx` shows skeletons. |
| Empty (no application) | "Track your first application", primary "New application". Same in every layout. |
| Empty (filters match nothing) | "No application matches", button "Clear filters". |
| Empty column | Dashed placeholder. |
| Error (read fails) | `error.tsx`: message and retry. Failed status change: the card returns to its column and an inline message shows. |
| Demo host / signed out | No data layer: the empty state with the New button hidden. |
| Cap reached | Header meter turns amber at 90 percent, New disabled with the plan hint. |
| Migration not yet applied | New columns are optional in the types; the UI falls back (location from the offer or the company headquarters, no link or deadline). Creating with title, company, status, date and notes still works. |

## 5. Shell behaviour

- Desktop: the hub fills the main area of the app shell (sidebar unchanged), header sticky, layouts scroll inside.
- Mobile (below `md`): header wraps in two rows, the switcher shows icons, Board is one column with a status strip, Table scrolls horizontally, Map stacks the panel under the map, the peek is full width.
- The sidebar already lists applications; this work adds no navigation entry.
- Light and dark use existing tokens only (`bg-background`, `border`, `text-muted-foreground`); status tones use light and dark variants.

## 6. Data needs

Existing: `applications` (status, applied_at, notes, cover_letter, offer_id), `companies` (name, domain, headquarters), `offers` (location, url), `interviews` (stage, scheduled_at, outcome), `accounts.plan`.

New (migration `20261010120000_applications_hub.sql`, written, never applied by agents): on `applications` the columns `url`, `location`, `deadline_at`, `responded_at`; a join table `application_documents (application_id, document_id)` with RLS and composite foreign keys; a trigger enforcing the plan cap (Free 15, Plus 99, Max unlimited) in the style of `enforce_plan_limits`.

Reads go through `lib/applications.ts` (Supabase, RLS scoped). Writes are server actions in `app/(auth)/applications/actions.ts`. Geocoding for the Map is a server route using `GEOAPIFY_API_KEY` (server side only); coordinates are not stored.

## 7. Build order

APP-114 (this document), then APP-100 (hub shell, Board, migration), APP-115, APP-116, APP-117, APP-118. Each PR is stacked on the previous one. Analytics events to wire later by APP-130: `application_status_changed`, `application_created`, `applications_layout_changed` (not added here).

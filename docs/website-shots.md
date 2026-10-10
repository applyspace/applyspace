# Website product shots

Linear: WEB-13. Every product visual on the homepage is a slot (`ProductShot`, `apps/web/src/site/components/ui/ProductShot.tsx`). Until its file exists, the slot renders a placeholder with the same ratio, alt text and caption. Once `apps/web/public/site/shots/<name>.avif` exists, the next build serves it through next/image (responsive srcset, lazy below the fold, eager with high fetch priority for the hero). Slots with a mobile crop switch to it below 640px through `<picture>`.

## Capture rules

- Demo account Camille Aubert (40 offers, 20 applications, 18 interviews), fictional `.example` companies only.
- Light theme, 1440x900 app window, no OS chrome, browser zoom 100%, captured at 2x.
- Export AVIF (quality ~60, target under 120 kB for the hero mobile crop and under 200 kB for desktop crops). File name = slot name, kebab-case.
- Alt text and captions live in the content (`apps/web/src/site/content/fallback/pages.ts`, or Sanity); update them if the capture differs.

## Slots

Export size is the 2x pixel size the layout expects (`SHOT_SIZE` in `apps/web/src/site/lib/shots.ts`); any image with the same ratio works.

| Spec | Slot name | Screen and state | Ratio | Export size | Used in |
|---|---|---|---|---|---|
| A1 | `a1-board` | Applications > Board, 20 applications across Saved / Applied / Interview / Offer, one card with an interview date, sidebar visible | 16:10 | 2240x1400 | Hero (Fig. 1, LCP), Applications tab Board (Fig. 3), closing CTA (faded crop, same file) |
| A1 | `a1-board-mobile` | Same board, 3 columns visible | 4:5 | 1080x1350 | Hero and Board tab on phones |
| A2 | `a2-table` | Applications > Table, sorted by last update, salary column visible | 16:10 | 2240x1400 | Applications tab Table |
| A2 | `a2-table-mobile` | Same, mobile crop | 4:5 | 1080x1350 | Table tab on phones |
| A3 | `a3-timeline` | Applications > Timeline, 2 weeks, mixed events | 16:10 | 2240x1400 | Applications tab Timeline |
| A3 | `a3-timeline-mobile` | Same, mobile crop | 4:5 | 1080x1350 | Timeline tab on phones |
| A4 | `a4-map` | Applications > Map, Paris + Lyon + remote pins, stone map style | 16:10 | 2240x1400 | Applications tab Map |
| A4 | `a4-map-mobile` | Same, mobile crop | 4:5 | 1080x1350 | Map tab on phones |
| A5 | `a5-search` | Job offers > search profile "Product Designer, Paris, CDI", 8 results with board icons and Save | 4:3 | 1600x1200 | Job offers (Fig. 2) |
| A5 | `a5-search-mobile` | Result list only | 4:5 | 1080x1350 | Job offers on phones |
| A5 | `a5-search-filters` | Zoomed inset: the filter chip row at 150% | 3:2 | 1200x800 | Job offers inset (hidden on phones) |
| A6 | `a6-interview` | Interview detail, round 2, notes + 3 prepared questions | 4:3 | 1600x1200 | Interviews (Fig. 4) |
| A6 | `a6-interview-mobile` | Same, mobile crop | 4:5 | 1080x1350 | Interviews on phones |
| A6 | `a6-interview-stepper` | Zoomed inset: round stepper (round 1 done, round 2 next) | 3:2 | 1200x800 | Interviews inset (hidden on phones) |
| A7 | `a7-profile-drop` | Profile import, file `camille-aubert-cv.pdf` dropped | 4:3 | 1600x1200 | Profile flow step 1 (Fig. 5) |
| A7 | `a7-profile-parsing` | Profile import, fields appearing | 4:3 | 1600x1200 | Profile flow step 2 |
| A7 | `a7-profile-filled` | Filled profile: experience, education, languages, skills | 4:3 | 1600x1200 | Profile flow step 3 |

Not used on the page today: A8 (Settings > Privacy, optional), V1 (hero card animation, optional) and P1 (founder photo: no founder note, replaced by the product facts band).

## Job board logos

The Job offers section lists Welcome to the Jungle, LinkedIn, Indeed and HelloWork as text. Drop a Brandfetch SVG wordmark at `apps/web/public/site/boards/<key>.svg` to show the logo instead (rendered 24px tall, greyscale): `welcome-to-the-jungle`, `linkedin`, `indeed`, `hellowork`.

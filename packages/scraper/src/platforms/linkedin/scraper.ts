import { BrowserContext } from 'playwright';
import crypto from 'crypto';
import { Job } from '../../types.js';

export async function scrapeLinkedIn(context: BrowserContext, searchUrls: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  for (const url of searchUrls) {
    const jobs = await scrapeLinkedInSingle(context, url);
    allJobs.push(...jobs);
  }
  const seen = new Set<string>();
  return allJobs.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
}

function cleanTitle(raw: string): string {
  const text = raw.replace(/\s+with verification$/i, '').trim();
  // LinkedIn concatenates two spans without separator: "Foo BarFoo Bar"
  // Detect exact duplication and take the first half
  const half = text.length / 2;
  if (Number.isInteger(half) && text.slice(0, half) === text.slice(half)) {
    return text.slice(0, half).trim();
  }
  // Fallback: take first line
  return text.split('\n')[0].trim();
}

async function scrapeLinkedInSingle(context: BrowserContext, searchUrl: string): Promise<Job[]> {
  const page = await context.newPage();
  const jobs: Job[] = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Scroll to load more listings
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(800);
    }

    const cards = await page.$$('.job-card-container, .jobs-search-results__list-item');

    for (const card of cards) {
      try {
        // Title — aria-hidden span contains the clean text without "with verification"
        const titleRaw = await card.$eval(
          '.job-card-list__title--link span[aria-hidden="true"], .job-card-container__link span[aria-hidden="true"], .job-card-list__title, .job-card-container__link',
          (el) => el.textContent?.trim() ?? ''
        );
        const title = cleanTitle(titleRaw);

        // URL
        const url = await card
          .$eval(
            'a.job-card-list__title--link, a.job-card-container__link',
            (el) => (el as HTMLAnchorElement).href
          )
          .catch(() => '');

        if (!title || !url) continue;

        // Company
        const company = await card
          .$eval(
            '.job-card-container__company-name, .artdeco-entity-lockup__subtitle, .job-card-container__primary-description',
            (el) => el.textContent?.trim() ?? ''
          )
          .catch(() => '');

        // Location
        const location = await card
          .$eval(
            '.job-card-container__metadata-item, .artdeco-entity-lockup__caption',
            (el) => el.textContent?.trim() ?? ''
          )
          .catch(() => '');

        // Click to load the detail panel
        await card.click();
        await page.waitForTimeout(1500);

        // Description — try multiple selectors for the detail pane
        const description = await page
          .$eval(
            '.jobs-description__content .jobs-box__html-content, .jobs-description__content, .jobs-description-content__text, .jobs-box__html-content',
            (el) => el.textContent?.trim() ?? ''
          )
          .catch(() => '');

        const salary = await page
          .$eval(
            '.compensation__salary, .salary-main-rail__formatted-wage',
            (el) => el.textContent?.trim()
          )
          .catch(() => undefined);

        const postedAt = await page
          .$eval(
            '.posted-time-ago__text, .jobs-unified-top-card__posted-date, .tvm__text',
            (el) => el.textContent?.trim()
          )
          .catch(() => undefined);

        jobs.push({
          id: crypto.createHash('md5').update(url).digest('hex'),
          title,
          company,
          location,
          salary,
          description,
          url,
          source: 'linkedin',
          postedAt,
          scrapedAt: new Date().toISOString(),
        });
      } catch {
        // Skip malformed card
      }
    }
  } finally {
    await page.close();
  }

  return jobs;
}

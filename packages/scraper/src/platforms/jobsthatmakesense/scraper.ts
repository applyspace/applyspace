import { BrowserContext } from 'playwright';
import crypto from 'crypto';
import { Job } from '../../types.js';

export async function scrapeJobsThatMakeSense(context: BrowserContext, searchUrls: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  for (const url of searchUrls) {
    const jobs = await scrapeJobsThatMakeSenseSingle(context, url);
    allJobs.push(...jobs);
  }
  const seen = new Set<string>();
  return allJobs.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
}

async function scrapeJobsThatMakeSenseSingle(context: BrowserContext, searchUrl: string): Promise<Job[]> {
  const page = await context.newPage();
  const jobs: Job[] = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Scroll to load more listings
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(800);
    }

    const cards = await page.$$('.job-card, [class*="JobCard"], article.job');

    for (const card of cards) {
      try {
        const title = await card.$eval('h2, h3, [class*="title"]', (el) => el.textContent?.trim() ?? '');
        const company = await card.$eval('[class*="company"], [class*="organization"]', (el) => el.textContent?.trim() ?? '').catch(() => '');
        const location = await card.$eval('[class*="location"], [class*="city"]', (el) => el.textContent?.trim() ?? '').catch(() => '');
        const url = await card.$eval('a', (el) => {
          const href = (el as HTMLAnchorElement).href;
          return href.startsWith('http') ? href : `https://jobs.makesense.org${href}`;
        });

        if (!title || !url) continue;

        // Navigate to job page for description
        const jobPage = await context.newPage();
        await jobPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        const description = await jobPage.$eval('[class*="description"], [class*="content"], main article', (el) => el.textContent?.trim() ?? '').catch(() => '');
        const salary = await jobPage.$eval('[class*="salary"], [class*="remuneration"]', (el) => el.textContent?.trim()).catch(() => undefined);
        const postedAt = await jobPage.$eval('time, [class*="date"]', (el) => el.textContent?.trim()).catch(() => undefined);
        await jobPage.close();

        jobs.push({
          id: crypto.createHash('md5').update(url).digest('hex'),
          title,
          company,
          location,
          salary,
          description,
          url,
          source: 'jobsthatmakesense',
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

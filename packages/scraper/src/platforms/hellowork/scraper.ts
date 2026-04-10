import { BrowserContext } from 'playwright';
import crypto from 'crypto';
import { Job } from '../../types.js';

export async function scrapeHelloWork(context: BrowserContext, searchUrls: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  for (const url of searchUrls) {
    const jobs = await scrapeHelloWorkSingle(context, url);
    allJobs.push(...jobs);
  }
  const seen = new Set<string>();
  return allJobs.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
}

async function scrapeHelloWorkSingle(context: BrowserContext, searchUrl: string): Promise<Job[]> {
  const page = await context.newPage();
  const jobs: Job[] = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Scroll to load more listings
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(800);
    }

    const cards = await page.$$('[data-cy="offerCard"], .tw-offer-card, article.offer-card');

    for (const card of cards) {
      try {
        const title = await card.$eval('h2, [data-cy="offerTitle"]', (el) => el.textContent?.trim() ?? '');
        const company = await card.$eval('[data-cy="offerCompany"], .company-name', (el) => el.textContent?.trim() ?? '').catch(() => '');
        const location = await card.$eval('[data-cy="offerLocation"], .offer-location', (el) => el.textContent?.trim() ?? '').catch(() => '');
        const salary = await card.$eval('[data-cy="offerSalary"], .offer-salary', (el) => el.textContent?.trim()).catch(() => undefined);
        const url = await card.$eval('a', (el) => {
          const href = (el as HTMLAnchorElement).href;
          return href.startsWith('http') ? href : `https://www.hellowork.com${href}`;
        });

        if (!title || !url) continue;

        // Navigate to job page for description
        const jobPage = await context.newPage();
        await jobPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        const description = await jobPage.$eval('[data-cy="offerDescription"], .offer-description, .job-description', (el) => el.textContent?.trim() ?? '').catch(() => '');
        const postedAt = await jobPage.$eval('[data-cy="offerDate"] time, .offer-date', (el) => el.textContent?.trim()).catch(() => undefined);
        await jobPage.close();

        jobs.push({
          id: crypto.createHash('md5').update(url).digest('hex'),
          title,
          company,
          location,
          salary,
          description,
          url,
          source: 'hellowork',
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

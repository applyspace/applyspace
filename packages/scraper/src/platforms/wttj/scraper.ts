import { BrowserContext } from 'playwright';
import crypto from 'crypto';
import { Job } from '../../types.js';

export async function scrapeWTTJ(context: BrowserContext, searchUrls: string[]): Promise<Job[]> {
  const allJobs: Job[] = [];
  for (const searchUrl of searchUrls) {
    const jobs = await scrapeWTTJSingle(context, searchUrl);
    allJobs.push(...jobs);
  }
  // Deduplicate by id across all queries
  const seen = new Set<string>();
  return allJobs.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
}

async function scrapeWTTJSingle(context: BrowserContext, searchUrl: string): Promise<Job[]> {
  const page = await context.newPage();
  const jobs: Job[] = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Scroll to load more listings
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(800);
    }

    const cards = await page.$$('[data-testid="search-results-list-item-wrapper"]');

    for (const card of cards) {
      try {
        // Title is in h2
        const title = await card.$eval('h2', (el) => el.textContent?.trim() ?? '').catch(() => '');

        // URL from the job link
        const url = await card
          .$eval('a[href*="/jobs/"]', (el) => {
            const href = (el as HTMLAnchorElement).getAttribute('href') ?? '';
            return `https://www.welcometothejungle.com${href}`;
          })
          .catch(() => '');

        if (!title || !url) continue;

        // Company name from logo image alt (most reliable)
        const company = await card
          .$eval('img[data-testid^="job-thumb-logo"]', (el) => (el as HTMLImageElement).alt ?? '')
          .catch(() => {
            // Fallback: extract company slug from URL
            const match = url.match(/\/companies\/([^/]+)\//);
            return match ? match[1].replace(/-/g, ' ') : '';
          });

        // Full card text for parsing location, salary, contract
        const cardText = await card.evaluate((el) => el.textContent?.trim() ?? '');

        // Salary: stop right after "€" — "Salaire : 45K à 60K €"
        const salaryMatch = cardText.match(/Salaire\s*:?\s*(.+?€)/);
        const salary = salaryMatch ? salaryMatch[1].trim() : undefined;

        // Contract type — no word boundaries (text is concatenated, e.g. "CDIParis")
        const contractMatch = cardText.match(/(CDI|CDD|Freelance|Stage|Alternance|Intérim)/);
        const contract = contractMatch ? contractMatch[1] : undefined;

        // Location: text between contract type and remote policy / salary
        const locationMatch = contract
          ? cardText.match(new RegExp(`${contract}(.+?)(?:Télétravail|Pas de télétravail|Salaire|\\d+ collaborateur)`))
          : null;
        const location = locationMatch ? locationMatch[1].trim() : '';

        // Posted date: "il y a 2 jours", "il y a 7 heures", "hier"
        const postedMatch = cardText.match(/(?:il y a \d+ (?:heure|jour|semaine|mois)s?|hier|aujourd'hui)/i);
        const postedAt = postedMatch ? postedMatch[0] : undefined;

        // Navigate to job page for description
        const jobPage = await context.newPage();
        await jobPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await jobPage.waitForTimeout(1500);

        const description = await jobPage
          .$eval('[data-testid="job-section-description"], [class*="jobDescription"], section[id*="description"] ', (el) => el.textContent?.trim() ?? '')
          .catch(async () => {
            // Broader fallback: grab the main content area
            return jobPage.$eval('main', (el) => el.textContent?.trim().slice(0, 3000) ?? '').catch(() => '');
          });

        await jobPage.close();

        jobs.push({
          id: crypto.createHash('md5').update(url).digest('hex'),
          title,
          company,
          location,
          contract,
          salary,
          description,
          url,
          source: 'wttj',
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

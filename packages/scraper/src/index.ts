import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

import { COOKIES_DIR } from './config.js';
import { openScraperDb } from './db.js';
import { loadCriteriaFromDb, persistJobs, touchPlatformLastScraped } from './persist.js';
import type { Job, Source } from './types.js';
import { buildUrls as buildLinkedInUrls } from './platforms/linkedin/url-builder.js';
import { buildUrls as buildWTTJUrls } from './platforms/wttj/url-builder.js';
import { buildUrls as buildHelloWorkUrls } from './platforms/hellowork/url-builder.js';
import { buildUrls as buildJobsThatMakeSenseUrls } from './platforms/jobsthatmakesense/url-builder.js';
import { scrapeLinkedIn } from './platforms/linkedin/scraper.js';
import { scrapeWTTJ } from './platforms/wttj/scraper.js';
import { scrapeHelloWork } from './platforms/hellowork/scraper.js';
import { scrapeJobsThatMakeSense } from './platforms/jobsthatmakesense/scraper.js';

async function loadCookies(source: Source) {
  const cookiePath = path.join(COOKIES_DIR, `${source}.json`);
  try {
    const raw = await fs.promises.readFile(cookiePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.warn(`  ⚠ No cookies found for ${source} — run \`pnpm auth\` first. Skipping.`);
    return null;
  }
}

async function runScraper(
  source: Source,
  label: string,
  urls: string[],
  scraper: (
    ctx: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>>,
    urls: string[],
  ) => Promise<Job[]>,
): Promise<Job[]> {
  if (urls.length === 0) {
    console.log(`  ∙ ${label}: no URLs for current criteria — skipping`);
    return [];
  }

  const cookies = await loadCookies(source);
  if (!cookies) return [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(cookies);

  console.log(`  → Scraping ${label} (${urls.length} recherche${urls.length > 1 ? 's' : ''})...`);
  let jobs: Job[] = [];
  try {
    jobs = await scraper(context, urls);
    console.log(`  ✓ ${label}: ${jobs.length} offres`);
  } catch (err) {
    console.error(`  ✗ ${label} failed:`, (err as Error).message);
  } finally {
    await browser.close();
  }

  return jobs;
}

async function main() {
  console.log('\nApply — starting scrape\n');

  const handle = openScraperDb();
  try {
    const criteria = loadCriteriaFromDb(handle.db);
    if (criteria.titles.length === 0) {
      console.warn(
        `  ⚠ No search titles configured in the DB — nothing to scrape. ` +
          `Create at least one Search row before running.\n`,
      );
      return;
    }
    console.log(
      `  Searching for: ${criteria.titles.join(', ')} in ${criteria.location}\n`,
    );

    const results = await Promise.allSettled([
      runScraper('linkedin', 'LinkedIn', buildLinkedInUrls(criteria), scrapeLinkedIn),
      runScraper('wttj', 'Welcome to the Jungle', buildWTTJUrls(criteria), scrapeWTTJ),
      runScraper('hellowork', 'HelloWork', buildHelloWorkUrls(criteria), scrapeHelloWork),
      runScraper(
        'jobsthatmakesense',
        'Jobs that Make Sense',
        buildJobsThatMakeSenseUrls(criteria),
        scrapeJobsThatMakeSense,
      ),
    ]);

    const jobs: Job[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    // Dedup within this scrape run. DB `(platformSlug, url)` unique index is a
    // defense in depth, but a transaction retries cheaper if we dedup up-front.
    const seen = new Set<string>();
    const unique = jobs.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));

    const stats = persistJobs(handle.db, unique);

    // Stamp `lastScrapedAt` for every platform that actually returned something,
    // so the Integrations UI can surface "last scrape: 2 min ago".
    const platformsSeen = new Set<Source>(unique.map((j) => j.source));
    for (const slug of platformsSeen) touchPlatformLastScraped(handle.db, slug);

    console.log(
      `\n✓ Persisted to DB: +${stats.inserted} new, ~${stats.updated} updated, ` +
        `+${stats.companiesNew} companies` +
        (stats.skipped ? `, ${stats.skipped} skipped (missing fields)` : '') +
        `.\n`,
    );
  } finally {
    handle.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

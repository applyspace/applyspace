import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { COOKIES_DIR, OUTPUT_DIR, SETTINGS_PATH } from './config.js';
import { Job, ScrapedOutput, SearchCriteria, Source } from './types.js';
import { buildUrls as buildLinkedInUrls } from './platforms/linkedin/url-builder.js';
import { buildUrls as buildWTTJUrls } from './platforms/wttj/url-builder.js';
import { buildUrls as buildHelloWorkUrls } from './platforms/hellowork/url-builder.js';
import { buildUrls as buildJobsThatMakeSenseUrls } from './platforms/jobsthatmakesense/url-builder.js';
import { scrapeLinkedIn } from './platforms/linkedin/scraper.js';
import { scrapeWTTJ } from './platforms/wttj/scraper.js';
import { scrapeHelloWork } from './platforms/hellowork/scraper.js';
import { scrapeJobsThatMakeSense } from './platforms/jobsthatmakesense/scraper.js';

async function loadSettings(): Promise<SearchCriteria> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const s = JSON.parse(raw);
    return {
      titles:           Array.isArray(s.searchTitles)      ? s.searchTitles      : [],
      location:         typeof s.searchLocation === 'string' ? s.searchLocation  : 'France',
      contractTypes:    Array.isArray(s.contractTypes)      ? s.contractTypes     : [],
      remotePreference: Array.isArray(s.remotePreference)   ? s.remotePreference  : [],
      experienceLevels: Array.isArray(s.experienceLevels)   ? s.experienceLevels  : [],
      salaryMin:        typeof s.salaryMin === 'number'      ? s.salaryMin        : undefined,
      salaryMax:        typeof s.salaryMax === 'number'      ? s.salaryMax        : undefined,
    };
  } catch {
    console.warn(`  ⚠ Could not read settings from ${SETTINGS_PATH} — using defaults.`);
    return {
      titles: [],
      location: 'France',
      contractTypes: [],
      remotePreference: [],
    };
  }
}

async function loadCookies(source: Source) {
  const cookiePath = path.join(COOKIES_DIR, `${source}.json`);
  try {
    const raw = await fs.readFile(cookiePath, 'utf-8');
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
  scraper: (ctx: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>>, urls: string[]) => Promise<Job[]>
): Promise<Job[]> {
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

  const criteria = await loadSettings();
  console.log(`  Searching for: ${criteria.titles.length > 0 ? criteria.titles.join(', ') : 'defaults'} in ${criteria.location}\n`);

  const results = await Promise.allSettled([
    runScraper('linkedin', 'LinkedIn', buildLinkedInUrls(criteria), scrapeLinkedIn),
    runScraper('wttj', 'Welcome to the Jungle', buildWTTJUrls(criteria), scrapeWTTJ),
    runScraper('hellowork', 'HelloWork', buildHelloWorkUrls(criteria), scrapeHelloWork),
    runScraper('jobsthatmakesense', 'Jobs that Make Sense', buildJobsThatMakeSenseUrls(criteria), scrapeJobsThatMakeSense),
  ]);

  const jobs: Job[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = jobs.filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));

  const output: ScrapedOutput = {
    scrapedAt: new Date().toISOString(),
    total: unique.length,
    jobs: unique,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, 'jobs.json');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nDone! ${unique.length} jobs written to ${outputPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

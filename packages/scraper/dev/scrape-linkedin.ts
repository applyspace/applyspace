/**
 * Test LinkedIn only — run with: pnpm scrape:linkedin
 */
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { COOKIES_DIR, OUTPUT_DIR, SETTINGS_PATH } from '../src/config.js';
import { scrapeLinkedIn } from '../src/platforms/linkedin/scraper.js';
import { buildUrls } from '../src/platforms/linkedin/url-builder.js';
import type { SearchCriteria } from '../src/types.js';

let criteria: SearchCriteria;
try {
  const raw = JSON.parse(await fs.readFile(SETTINGS_PATH, 'utf-8'));
  criteria = {
    titles:           Array.isArray(raw.searchTitles)      ? raw.searchTitles      : [],
    location:         typeof raw.searchLocation === 'string' ? raw.searchLocation  : 'France',
    contractTypes:    Array.isArray(raw.contractTypes)      ? raw.contractTypes     : [],
    remotePreference: Array.isArray(raw.remotePreference)   ? raw.remotePreference  : [],
    experienceLevels: Array.isArray(raw.experienceLevels)   ? raw.experienceLevels  : [],
  };
} catch {
  criteria = { titles: [], location: 'France', contractTypes: [], remotePreference: [] };
}

const urls = buildUrls(criteria);
const cookies = JSON.parse(await fs.readFile(path.join(COOKIES_DIR, 'linkedin.json'), 'utf-8'));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addCookies(cookies);

console.log(`\n[LinkedIn] Scraping ${urls.length} recherche${urls.length > 1 ? 's' : ''}...`);
urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
console.log();

const jobs = await scrapeLinkedIn(context, urls);
await browser.close();

console.log(`\n✓ ${jobs.length} offres trouvées\n`);

jobs.slice(0, 5).forEach((j, i) => {
  console.log(`--- [${i + 1}] ${j.title}`);
  console.log(`    Société  : ${j.company}`);
  console.log(`    Lieu     : ${j.location}`);
  console.log(`    Contrat  : ${j.contract ?? '?'}`);
  console.log(`    Salaire  : ${j.salary ?? '?'}`);
  console.log(`    Postée   : ${j.postedAt ?? '?'}`);
  console.log(`    URL      : ${j.url}`);
  console.log(`    Desc     : ${j.description.slice(0, 150)}...`);
  console.log();
});

// Save to output
await fs.mkdir(OUTPUT_DIR, { recursive: true });
const out = { scrapedAt: new Date().toISOString(), total: jobs.length, jobs };
await fs.writeFile(path.join(OUTPUT_DIR, 'jobs-linkedin.json'), JSON.stringify(out, null, 2));
console.log(`Saved to ${OUTPUT_DIR}/jobs-linkedin.json`);

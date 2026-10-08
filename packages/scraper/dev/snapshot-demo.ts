/**
 * Refresh the demo snapshot — run with: pnpm --filter @apply/scraper demo:snapshot
 *
 * Scrapes the public WTTJ results for the demo search (product designer,
 * mid-level, France, CDI). No account or cookies needed. Writes
 * apps/web/src/data/demo-offers.json, which the hosted demo loads.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildUrls } from '../src/platforms/wttj/url-builder.js';
import { scrapeWTTJ } from '../src/platforms/wttj/scraper.js';

const MAX_OFFERS = 30;
const OUT = path.resolve(import.meta.dirname, '../../../apps/web/src/data/demo-offers.json');

const urls = buildUrls({
  titles: ['product designer'],
  location: 'France',
  contractTypes: ['CDI'],
  remotePreference: [],
  experienceLevels: ['mid'],
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const jobs = (await scrapeWTTJ(context, urls)).slice(0, MAX_OFFERS);
await browser.close();

await fs.writeFile(
  OUT,
  JSON.stringify({ scrapedAt: new Date().toISOString(), query: 'product designer', jobs }, null, 2) + '\n',
);
console.log(`✓ ${jobs.length} offers written to ${OUT}`);

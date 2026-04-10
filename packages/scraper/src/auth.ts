/**
 * Run with: pnpm auth
 *
 * Opens a visible browser window for each platform.
 * Log in manually, then press Enter in the terminal to save the session cookies.
 * Future scrape runs will reuse these cookies without re-logging in.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { COOKIES_DIR } from './config.js';
import { PLATFORM_AUTH_CONFIG as linkedin } from './platforms/linkedin/auth.js';
import { PLATFORM_AUTH_CONFIG as wttj } from './platforms/wttj/auth.js';
import { PLATFORM_AUTH_CONFIG as hellowork } from './platforms/hellowork/auth.js';
import { PLATFORM_AUTH_CONFIG as jobsthatmakesense } from './platforms/jobsthatmakesense/auth.js';

const PLATFORMS = [linkedin, wttj, hellowork, jobsthatmakesense];

async function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  await fs.mkdir(COOKIES_DIR, { recursive: true });

  for (const platform of PLATFORMS) {
    console.log(`\n[${platform.name}] Opening browser...`);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(platform.loginUrl);

    await waitForEnter(`  → Log in to ${platform.name}, then press Enter to save cookies...`);

    const cookies = await context.cookies();
    const cookiePath = path.join(COOKIES_DIR, `${platform.source}.json`);
    await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
    console.log(`  ✓ Saved ${cookies.length} cookies to ${cookiePath}`);

    await browser.close();
  }

  console.log('\nAll sessions saved. Run `pnpm scrape` to start scraping.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

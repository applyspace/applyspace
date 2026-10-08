#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INDEED_DEFAULT_HOST } from '../platforms/indeed/urls.js';
import { USAGE, parseCli } from './args.js';
import { START_PAGES, TOS_WARNING } from './config.js';
import { clampPages, criteriaFromArgs, planListings, planMatrix } from './plan.js';
import { playwrightDriver } from './playwright-driver.js';
import { runProbe } from './run.js';
import { parseListing } from './analyze.js';

async function main(): Promise<number> {
  const opts = parseCli(process.argv.slice(2));
  if ('help' in opts) {
    console.log(USAGE);
    return 0;
  }
  if ('error' in opts) {
    console.error(`${opts.error}\n\n${USAGE}`);
    return 2;
  }

  const { pages, details } = clampPages(opts.pages, opts.details);
  if (pages !== opts.pages) console.log(`--pages limited to ${pages} (max per run).`);
  if (details !== opts.details) console.log(`--details limited to ${details} (listing pages + details <= 5 per run).`);

  console.log(`\n${TOS_WARNING[opts.platform]}\nYou run this on your own machine, with your own browser profile, at your own risk.\n`);

  const plan = opts.matrix
    ? planMatrix(opts.platform, pages)
    : { runs: [planListings(opts.platform, criteriaFromArgs(opts), pages)], skipped: [] };

  const profileDir = resolve(opts.profileDir);
  await mkdir(profileDir, { recursive: true });
  const host = INDEED_DEFAULT_HOST;
  const rl = opts.prompt ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  try {
    const result = await runProbe(
      {
        platform: opts.platform,
        runs: plan.runs,
        skippedCombinations: plan.skipped,
        profileDir,
        outputDir: resolve(opts.outputDir),
        headless: opts.headless,
        startPage: START_PAGES[opts.platform],
        host,
        details,
        detailUrls: (html) =>
          parseListing(opts.platform, html, host, new Date())
            .map((j) => j.url)
            .filter(Boolean),
      },
      {
        driver: playwrightDriver,
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
        random: Math.random,
        now: () => new Date(),
        log: (m) => console.log(`[probe] ${m}`),
        waitForUser: rl ? async (message) => void (await rl.question(`\n${message}\n`)) : undefined,
      },
    );
    console.log(`\nDone. Report: ${result.reportPath}`);
    if (result.run.stoppedReason) console.log(`Stopped early: ${result.run.stoppedReason}`);
    return result.run.stoppedReason ? 1 : 0;
  } finally {
    rl?.close();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);

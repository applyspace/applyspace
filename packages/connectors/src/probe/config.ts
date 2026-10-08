import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Platform } from '../types.js';

/** Hard limits of the probe. They are not configurable from the command line on purpose. */
export const MIN_DELAY_MS = 6_000;
export const MAX_DELAY_MS = 12_000;
/** Page loads per run, listing pages and detail pages together. */
export const MAX_PAGES_PER_RUN = 5;

export const DEFAULT_PROFILE_DIR = join(homedir(), '.apply', 'probe-profile');
export const DEFAULT_OUTPUT_DIR = './probe-output';

export const MATRIX = {
  titles: ['product designer', 'développeur full-stack', 'data analyst'],
  /** `null` stands for "remote" (no city, remote filter on). */
  places: ['Paris', 'Lyon', 'Niort', null] as Array<string | null>,
  sorts: ['relevance', 'date'] as const,
};

export const START_PAGES: Record<Platform, string> = {
  wttj: 'https://www.welcometothejungle.com/fr',
  hellowork: 'https://www.hellowork.com/fr-fr/',
  indeed: 'https://fr.indeed.com/',
  linkedin: 'https://www.linkedin.com/jobs/',
};

export const TOS_WARNING: Record<Platform, string> = {
  wttj:
    'WTTJ: robots.txt disallows search URLs with a query string and the terms are not reviewed. ' +
    'Automated access may break their terms; use your own session, low volume, at your own risk.',
  hellowork:
    'HelloWork: robots.txt disallows the search page and any URL with "?"; their terms prohibit ' +
    'automated extraction without a written licence. Use at your own risk, low volume.',
  indeed:
    'Indeed: heavy anti-bot measures, /viewjob is disallowed in robots.txt, and automated access ' +
    'can get an account restricted. Use a throwaway or low-stakes session, never your main account.',
  linkedin:
    'LinkedIn: the User Agreement prohibits scraping and accounts can be restricted or banned. ' +
    'Prefer guest mode (logged out) or a throwaway account. Never use your main profile.',
};

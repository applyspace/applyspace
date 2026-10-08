import { parseArgs } from 'node:util';
import { PLATFORMS, type Platform, type SortOrder } from '../types.js';
import { DEFAULT_OUTPUT_DIR, DEFAULT_PROFILE_DIR, MAX_PAGES_PER_RUN } from './config.js';

export interface CliOptions {
  platform: Platform;
  query?: string;
  location?: string;
  pages: number;
  details: number;
  sort?: SortOrder;
  remote: boolean;
  matrix: boolean;
  headless: boolean;
  prompt: boolean;
  profileDir: string;
  outputDir: string;
}

export const USAGE = `Usage: pnpm --filter connectors probe <platform> [options]

Platforms: ${PLATFORMS.join(', ')}

Options:
  --query <text>        Job title or keyword
  --location <text>     City or place (optional)
  --pages <n>           Listing pages to load, 1 to ${MAX_PAGES_PER_RUN} (default 1)
  --details <n>         Also open the first n job pages (listing pages + details <= ${MAX_PAGES_PER_RUN})
  --sort <relevance|date>
  --remote              Add the remote filter
  --matrix              Run the test matrix (3 titles x 4 places x 2 sorts), --pages per combination
  --profile-dir <path>  Browser profile folder (default ${DEFAULT_PROFILE_DIR})
  --output-dir <path>   Where to save results (default ${DEFAULT_OUTPUT_DIR})
  --headless            Hide the browser (default: visible, so you can log in or solve a captcha)
  --no-prompt           Do not pause for manual login before the first load
  --help
`;

export function parseCli(argv: string[]): CliOptions | { help: true } | { error: string } {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        query: { type: 'string' },
        location: { type: 'string' },
        pages: { type: 'string' },
        details: { type: 'string' },
        sort: { type: 'string' },
        remote: { type: 'boolean', default: false },
        matrix: { type: 'boolean', default: false },
        'profile-dir': { type: 'string' },
        'output-dir': { type: 'string' },
        headless: { type: 'boolean', default: false },
        'no-prompt': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  const platform = positionals[0];
  if (!platform || !(PLATFORMS as readonly string[]).includes(platform)) {
    return { error: `Unknown or missing platform "${platform ?? ''}". Expected one of: ${PLATFORMS.join(', ')}` };
  }
  const num = (v: string | undefined, fallback: number): number | null => {
    if (v === undefined) return fallback;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };
  const pages = num(values.pages, 1);
  const details = num(values.details, 0);
  if (pages === null || pages < 1) return { error: '--pages must be a positive integer' };
  if (details === null) return { error: '--details must be a non-negative integer' };
  if (values.sort !== undefined && values.sort !== 'relevance' && values.sort !== 'date') {
    return { error: '--sort must be "relevance" or "date"' };
  }
  if (!values.matrix && !values.query) return { error: '--query is required (or use --matrix)' };
  return {
    platform: platform as Platform,
    query: values.query,
    location: values.location,
    pages,
    details,
    sort: values.sort as SortOrder | undefined,
    remote: values.remote ?? false,
    matrix: values.matrix ?? false,
    headless: values.headless ?? false,
    prompt: !(values['no-prompt'] ?? false),
    profileDir: values['profile-dir'] ?? DEFAULT_PROFILE_DIR,
    outputDir: values['output-dir'] ?? DEFAULT_OUTPUT_DIR,
  };
}

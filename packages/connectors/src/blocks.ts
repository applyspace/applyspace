import type { Platform } from './types.js';

const COMMON = [
  /captcha/i,
  /hcaptcha/i,
  /cf-challenge|cf-turnstile|challenge-platform/i,
  /just a moment\.\.\./i,
  /verify (that )?you are (a )?human/i,
  /unusual traffic/i,
  /access denied/i,
  /pardon our interruption/i,
  /geo\.captcha-delivery\.com|datadome/i,
  /vérifiez que vous êtes un humain|verifiez que vous etes un humain/i,
];

const PER_PLATFORM: Record<Platform, RegExp[]> = {
  wttj: [],
  hellowork: [],
  indeed: [/additional verification required/i, /vérification supplémentaire/i],
  linkedin: [/authwall/i, /let'?s do a quick security check/i, /security verification/i],
};

const URL_HINTS = /(captcha|challenge|authwall|checkpoint|\/login|\/signin|\/uas\/)/i;

export interface BlockCheck {
  blocked: boolean;
  reason: string | null;
}

/** Heuristic block detection used by the probe: status, final URL and page markers. */
export function detectBlock(input: {
  platform: Platform;
  status?: number | null;
  url?: string;
  html?: string;
}): BlockCheck {
  if (input.status === 403 || input.status === 429 || input.status === 999) {
    return { blocked: true, reason: `HTTP ${input.status}` };
  }
  if (input.url && URL_HINTS.test(input.url)) {
    return { blocked: true, reason: `redirected to ${new URL(input.url, 'http://x').pathname}` };
  }
  const html = input.html ?? '';
  // Challenge pages are small; a real results page that merely mentions "captcha" in a script is not a block.
  const patterns = [...COMMON, ...PER_PLATFORM[input.platform]];
  const sample = html.length > 60_000 ? html.slice(0, 60_000) : html;
  for (const re of patterns) {
    if (re.test(sample) && (html.length < 120_000 || /<title>[^<]*(captcha|moment|denied|verif)/i.test(sample))) {
      return { blocked: true, reason: `page matches ${re.source}` };
    }
  }
  return { blocked: false, reason: null };
}

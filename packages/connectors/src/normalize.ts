import type {
  ContractType,
  ExperienceLevel,
  JobLocation,
  RemoteMode,
  Salary,
  SalaryPeriod,
} from './types.js';

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

export function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  return t ? t : null;
}

// --- contract ----------------------------------------------------------------------------

/**
 * Normalises contract wording from any platform. Schema.org `FULL_TIME` (used by WTTJ and as
 * `employmentType` in JSON-LD) carries no fixed-term information and is read as `permanent`.
 * Returns null when the value is empty.
 */
export function normalizeContract(raw: unknown): ContractType | null {
  const list = Array.isArray(raw) ? raw : [raw];
  for (const item of list) {
    const v = typeof item === 'string' ? fold(item) : '';
    if (!v) continue;
    if (/\b(cdi|permanent|full time|fulltime|indefinite)\b/.test(v)) return 'permanent';
    if (/\b(cdd|fixed term|fixedterm|temporary contract|contrat a duree determinee)\b/.test(v))
      return 'fixed_term';
    if (/(alternance|apprenti|apprenticeship|contrat pro|professionalisation)/.test(v))
      return 'apprenticeship';
    if (/\b(stage|stagiaire|intern|internship|trainee)\b/.test(v)) return 'internship';
    if (/(freelance|independant|contractor)/.test(v)) return 'freelance';
    if (/(benevol|volunteer)/.test(v)) return 'volunteer';
    if (/(part time|parttime|temps partiel)/.test(v)) return 'part_time';
    if (/(interim|temporary|\btemp\b|saisonnier|per diem)/.test(v)) return 'temporary';
    if (/^(other|contract|autre)$/.test(v)) return 'other';
  }
  return null;
}

// --- remote policy -----------------------------------------------------------------------

/**
 * Normalises remote wording. WTTJ values seen in the report: `fulltime` (full remote) and
 * `partial` (hybrid). Unknown or empty values return null rather than `onsite`.
 */
export function normalizeRemote(raw: unknown): RemoteMode | null {
  if (typeof raw === 'boolean') return raw ? 'remote' : null;
  if (typeof raw !== 'string') return null;
  const v = fold(raw);
  if (!v || v === 'unknown' || v === 'null') return null;
  if (/(telecommute|fulltime|full remote|100 remote|teletravail|remote)/.test(v)) {
    if (/(partiel|partial|hybrid|occasion|punctual)/.test(v)) return 'hybrid';
    return 'remote';
  }
  if (/(partial|hybrid|hybride|partiel|occasionnel|occasional|punctual|ponctuel)/.test(v))
    return 'hybrid';
  if (/\b(no|none|onsite|on site|sur site|presentiel|aucun)\b/.test(v)) return 'onsite';
  return null;
}

// --- experience ---------------------------------------------------------------------------

/** Maps a duration in months to a level: <24 entry, <60 mid, <120 senior, else lead. */
export function experienceFromMonths(months: number): ExperienceLevel {
  if (months < 24) return 'entry';
  if (months < 60) return 'mid';
  if (months < 120) return 'senior';
  return 'lead';
}

/**
 * LinkedIn seniority labels. "Mid-Senior level" spans mid and senior and is read as senior;
 * the URL builder searches both (see linkedin/urls.ts).
 */
export function normalizeSeniority(raw: unknown): ExperienceLevel | null {
  if (typeof raw !== 'string') return null;
  const v = fold(raw);
  if (/(intern|entry|junior|debutant)/.test(v)) return 'entry';
  if (/associate|confirme|intermediaire|\bmid\b/.test(v) && !/senior/.test(v)) return 'mid';
  if (/(director|executive|lead|directeur|cadre dirigeant)/.test(v)) return 'lead';
  if (/senior/.test(v)) return 'senior';
  return null;
}

// --- salary -------------------------------------------------------------------------------

const PERIOD_ALIASES: Array<[RegExp, SalaryPeriod]> = [
  [/\b(year|yearly|annual|annually|an|annee|annuel|annuelle|ans)\b/, 'year'],
  [/\b(month|monthly|mois|mensuel|mensuelle)\b/, 'month'],
  [/\b(week|weekly|semaine|hebdomadaire)\b/, 'week'],
  [/\b(day|daily|jour|journalier|journee)\b/, 'day'],
  [/\b(hour|hourly|heure|horaire)\b/, 'hour'],
];

export function normalizeSalaryPeriod(raw: unknown): SalaryPeriod | null {
  if (typeof raw !== 'string') return null;
  const v = fold(raw);
  if (!v) return null;
  for (const [re, period] of PERIOD_ALIASES) if (re.test(v)) return period;
  return null;
}

/** French working conventions: 218 days, 1607 legal hours per year. Estimates only. */
const ANNUAL_FACTOR: Record<SalaryPeriod, number> = {
  year: 1,
  month: 12,
  week: 52,
  day: 218,
  hour: 1607,
};

export function annualize(amount: number | null, period: SalaryPeriod | null): number | null {
  if (amount === null || period === null) return null;
  return Math.round(amount * ANNUAL_FACTOR[period]);
}

function currencyFromSymbol(raw: string): string | null {
  if (/€|eur/i.test(raw)) return 'EUR';
  if (/£|gbp/i.test(raw)) return 'GBP';
  if (/\$|usd/i.test(raw)) return 'USD';
  if (/chf/i.test(raw)) return 'CHF';
  return null;
}

export function buildSalary(input: {
  min?: unknown;
  max?: unknown;
  currency?: unknown;
  period?: unknown;
  isEstimated?: boolean;
}): Salary | null {
  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
    return null;
  };
  const min = toNum(input.min);
  const max = toNum(input.max);
  if (min === null && max === null) return null;
  const currency =
    typeof input.currency === 'string' && input.currency.trim()
      ? (currencyFromSymbol(input.currency) ?? input.currency.trim().toUpperCase())
      : null;
  const period = normalizeSalaryPeriod(input.period);
  const salary: Salary = {
    min,
    max,
    currency,
    period,
    yearlyMin: annualize(min ?? max, period),
  };
  if (input.isEstimated !== undefined) salary.isEstimated = input.isEstimated;
  return salary;
}

/** No-break and narrow no-break spaces, which French sites use as thousands separators. */
const SPACES = String.fromCharCode(0xa0, 0x202f);
const SPACE_RE = new RegExp(`[${SPACES}]`, 'g');

function parseAmount(raw: string): number | null {
  // "45 000", "45.000", "45,000", "3 200,50", "45k"
  let s = raw.replace(SPACE_RE, '').replace(/\s/g, '');
  const k = /k$/i.test(s);
  s = s.replace(/k$/i, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return k ? n * 1000 : n;
}

/**
 * Parses display text such as "45 000 € - 60 000 € par an", "À partir de 15 € de l'heure",
 * "$80,000 - $100,000 a year". Returns null when no amount is found.
 */
export function parseSalaryText(raw: unknown): Salary | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(SPACE_RE, ' ');
  if (!/[\d]/.test(text) || !/(€|£|\$|eur|usd|gbp|chf|k\b)/i.test(text)) return null;
  const amounts = [...text.matchAll(/\d[\d\s.,]*\d(?:\s?k)?|\d+(?:\s?k)?/gi)]
    .map((m) => parseAmount(m[0]))
    .filter((n): n is number => n !== null && n > 0);
  if (!amounts.length) return null;
  const hasRange = amounts.length >= 2;
  return buildSalary({
    min: amounts[0],
    max: hasRange ? amounts[1] : null,
    currency: currencyFromSymbol(text),
    period: text,
    isEstimated: /estim/i.test(text) ? true : undefined,
  });
}

// --- dates --------------------------------------------------------------------------------

function toIso(d: Date): string | null {
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const UNIT_MS: Array<[RegExp, number]> = [
  [/^(minute|min)s?$/, 60_000],
  [/^(heure|hour|h)s?$/, 3_600_000],
  [/^(jour|day|j|d)s?$/, 86_400_000],
  [/^(semaine|week|w)s?$/, 7 * 86_400_000],
  [/^(mois|month)s?$/, 30 * 86_400_000],
  [/^(an|annee|year)s?$/, 365 * 86_400_000],
];

/**
 * Normalises a date to ISO 8601 UTC. Accepts ISO strings (with offset), plain dates and relative
 * French/English phrases ("il y a 3 jours", "Posted 2 weeks ago", "hier", "just posted").
 */
export function normalizeDate(raw: unknown, now: Date = new Date()): string | null {
  if (raw instanceof Date) return toIso(raw);
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(text)) return toIso(new Date(text.replace(' ', 'T')));
  const v = fold(text);
  if (/(aujourd|today|just posted|a l instant|vient d etre)/.test(v)) return toIso(startOfDay(now));
  if (/(hier|yesterday)/.test(v)) return toIso(new Date(startOfDay(now).getTime() - 86_400_000));
  const m = v.match(/(\d+)\s*\+?\s*([a-z]+)\s*(ago)?/);
  if (m && /(il y a|ago|posted|publie)/.test(v)) {
    const n = Number(m[1]);
    const unit = m[2] ?? '';
    for (const [re, ms] of UNIT_MS) {
      if (re.test(unit)) {
        const when = new Date(now.getTime() - n * ms);
        return toIso(ms >= 86_400_000 ? startOfDay(when) : when);
      }
    }
  }
  const direct = new Date(text);
  return toIso(direct);
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// --- location -----------------------------------------------------------------------------

export function buildLocation(input: Partial<JobLocation>): JobLocation | null {
  const loc: JobLocation = {};
  for (const key of ['city', 'postalCode', 'region', 'raw'] as const) {
    const v = cleanText(input[key]);
    if (v) loc[key] = v;
  }
  const cc = cleanText(input.countryCode);
  if (cc && /^[A-Za-z]{2}$/.test(cc)) loc.countryCode = cc.toUpperCase();
  if (typeof input.latitude === 'number') loc.latitude = input.latitude;
  if (typeof input.longitude === 'number') loc.longitude = input.longitude;
  return Object.keys(loc).length ? loc : null;
}

/** "Paris (75)", "Lyon, Auvergne-Rhône-Alpes, France", "Niort - 79" -> best effort. */
export function locationFromText(raw: unknown): JobLocation | null {
  const text = cleanText(raw);
  if (!text) return null;
  const postal = text.match(/\b(\d{5})\b/)?.[1];
  const city = text
    .replace(/\(\d{2,3}\)|\s-\s\d{2}$|\b\d{5}\b/g, '')
    .split(',')[0]
    ?.replace(/\s+/g, ' ')
    .trim();
  const loc: Partial<JobLocation> = { raw: text };
  if (city) loc.city = city;
  if (postal) loc.postalCode = postal;
  return buildLocation(loc);
}

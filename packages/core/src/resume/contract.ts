/**
 * Parser contract: the structured output of the resume and LinkedIn parsers
 * (APP-106). Everything is optional and partial results are normal; a parser
 * only fills what it found. Values that cannot be read are dropped, never
 * guessed. The shape mirrors the profile tables (see docs/profile-data-model.md).
 *
 * Pure TypeScript, no I/O, so it runs in the browser, on the server and in tests.
 */

export const PARSED_RESUME_VERSION = 1 as const;

export const CONFIDENCE_VALUES = ['high', 'medium', 'low'] as const;
export type Confidence = (typeof CONFIDENCE_VALUES)[number];

/** Where the data came from; stored with each profile field later (APP-119). */
export const RESUME_SOURCE_VALUES = ['resume', 'linkedin-export'] as const;
export type ResumeSource = (typeof RESUME_SOURCE_VALUES)[number];

/** Same scale as `skills.level` in the database. */
export const PARSED_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type ParsedSkillLevel = (typeof PARSED_SKILL_LEVELS)[number];

export const LANGUAGE_LEVEL_VALUES = ['basic', 'conversational', 'professional', 'native'] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVEL_VALUES)[number];

/** The five onboarding seniority cards, in order. */
export const SENIORITY_VALUES = ['entry', 'junior', 'mid', 'senior', 'lead'] as const;
export type Seniority = (typeof SENIORITY_VALUES)[number];

/** Label of each seniority in the onboarding "roles" step. */
export const SENIORITY_ONBOARDING_LABEL: Record<Seniority, string> = {
  entry: 'Entry level',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead or above',
};

export const LINK_KIND_VALUES = ['linkedin', 'github', 'portfolio', 'other'] as const;
export type LinkKind = (typeof LINK_KIND_VALUES)[number];

/** A single extracted value and how sure the parser is about it. */
export interface Field<T = string> {
  value: T;
  confidence: Confidence;
}

/** Months are `YYYY-MM` strings; a missing month in the source becomes `-01`. */
export interface ParsedExperience {
  companyName?: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  location?: string;
  description?: string;
  confidence: Confidence;
}

export interface ParsedEducation {
  school?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  confidence: Confidence;
}

export interface ParsedSkill {
  name: string;
  level?: ParsedSkillLevel;
  confidence: Confidence;
}

export interface ParsedLanguage {
  name: string;
  level?: LanguageLevel;
  confidence: Confidence;
}

export interface ParsedCertification {
  name: string;
  issuer?: string;
  date?: string;
  confidence: Confidence;
}

export interface ParsedLink {
  url: string;
  kind: LinkKind;
  confidence: Confidence;
}

export interface ParsedResume {
  version: typeof PARSED_RESUME_VERSION;
  source: ResumeSource;
  firstName?: Field;
  lastName?: Field;
  email?: Field;
  phoneNumber?: Field;
  /** Headline or current job title. */
  jobTitle?: Field;
  /** Summary paragraph. */
  description?: Field;
  location?: Field;
  seniority?: Field<Seniority>;
  /** Whole years of professional experience, when it can be computed or is stated. */
  yearsOfExperience?: Field<number>;
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  skills: ParsedSkill[];
  languages: ParsedLanguage[];
  certifications: ParsedCertification[];
  links: ParsedLink[];
}

export function emptyParsedResume(source: ResumeSource = 'resume'): ParsedResume {
  return {
    version: PARSED_RESUME_VERSION,
    source,
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    links: [],
  };
}

// --- normalisation helpers --------------------------------------------------

const MAX_TEXT = 4000;
const MAX_SHORT = 200;
const MAX_ITEMS = 60;

function str(value: unknown, max = MAX_SHORT): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : undefined;
}

function longText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text ? text.slice(0, MAX_TEXT) : undefined;
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' ? values.find((v) => v === value.trim().toLowerCase()) : undefined;
}

export function normalizeConfidence(value: unknown, fallback: Confidence = 'medium'): Confidence {
  return oneOf(CONFIDENCE_VALUES, value) ?? fallback;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, janvier: 1, janv: 1,
  feb: 2, february: 2, fev: 2, fevrier: 2, fevr: 2,
  mar: 3, march: 3, mars: 3,
  apr: 4, april: 4, avr: 4, avril: 4,
  may: 5, mai: 5,
  jun: 6, june: 6, juin: 6,
  jul: 7, july: 7, juil: 7, juillet: 7,
  aug: 8, august: 8, aout: 8,
  sep: 9, sept: 9, september: 9, septembre: 9,
  oct: 10, october: 10, octobre: 10,
  nov: 11, november: 11, novembre: 11,
  dec: 12, december: 12, decembre: 12,
};

/** Lower case without accents. */
export function ascii(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const MIN_YEAR = 1950;

/**
 * Month (`YYYY-MM`) from the date styles found in resumes: `2021-03`, `2021-03-15`,
 * `03/2021`, `Mar 2021`, `mars 2021`, `March, 2021`, `2021`. A bare year becomes
 * January. Returns undefined for anything else (including "present"/"aujourd'hui":
 * use {@link isPresentMarker}).
 */
export function normalizeMonth(value: unknown, now: Date = new Date()): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = ascii(value).replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  const maxYear = now.getUTCFullYear() + 1;
  const make = (year: number, month: number): string | undefined =>
    year >= MIN_YEAR && year <= maxYear && month >= 1 && month <= 12
      ? `${year}-${String(month).padStart(2, '0')}`
      : undefined;

  let m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(text);
  if (m) return make(Number(m[1]), Number(m[2]));
  m = /^(\d{1,2})[/\- ](\d{4})$/.exec(text);
  if (m) return make(Number(m[2]), Number(m[1]));
  m = /^([a-z]+) (\d{4})$/.exec(text);
  if (m && MONTHS[m[1]]) return make(Number(m[2]), MONTHS[m[1]]);
  m = /^(\d{4})$/.exec(text);
  if (m) return make(Number(m[1]), 1);
  return undefined;
}

/** "Present", "Current", "Aujourd'hui", "Ce jour", "en cours"... */
export function isPresentMarker(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^(present|current|now|today|ongoing|aujourd ?hui|ce jour|en cours|actuel|actuellement|a ce jour)$/.test(
    ascii(value).replace(/['’.]/g, ' ').replace(/\s+/g, ' ').trim(),
  );
}

export function normalizeUrl(value: unknown): string | undefined {
  const text = str(value, 300);
  if (!text) return undefined;
  const withScheme = /^https?:\/\//i.test(text)
    ? text
    : /^(www\.|[a-z0-9-]+\.[a-z]{2,}\/)/i.test(text)
      ? `https://${text}`
      : '';
  if (!withScheme) return undefined;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString().replace(/\/$/, '') : undefined;
  } catch {
    return undefined;
  }
}

export function linkKind(url: string): LinkKind {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // Not a URL: other.
  }
  if (host.endsWith('linkedin.com')) return 'linkedin';
  if (host.endsWith('github.com')) return 'github';
  return 'other';
}

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;

export function normalizeEmail(value: unknown): string | undefined {
  const text = str(value, 254)?.toLowerCase();
  return text && EMAIL_RE.test(text) ? text : undefined;
}

export function normalizePhone(value: unknown): string | undefined {
  const text = str(value, 40);
  if (!text) return undefined;
  const digits = text.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? text.replace(/[^\d+()\-. ]/g, '').trim() : undefined;
}

// --- validation of untrusted output (LLM JSON, imports) ---------------------

function field(raw: unknown, normalize: (v: unknown) => string | undefined = (v) => str(v)): Field | undefined {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const value = normalize(obj && 'value' in obj ? obj.value : raw);
  return value ? { value, confidence: normalizeConfidence(obj?.confidence, 'medium') } : undefined;
}

function list(raw: unknown): Record<string, unknown>[] {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, MAX_ITEMS)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
}

function range(item: Record<string, unknown>, now: Date) {
  const startDate = normalizeMonth(item.startDate, now);
  let endDate = normalizeMonth(item.endDate, now);
  const present = item.isCurrent === true || isPresentMarker(item.endDate);
  if (present) endDate = undefined;
  // An end before the start is a parsing mistake: keep the start only.
  if (startDate && endDate && endDate < startDate) endDate = undefined;
  return { startDate, endDate, isCurrent: present ? true : endDate ? false : undefined };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export interface ValidationResult {
  resume: ParsedResume;
  /** What was dropped or corrected, for logs and tests (never carries personal values). */
  issues: string[];
}

/**
 * Turns untrusted JSON (the LLM answer, a stored value) into a clean
 * {@link ParsedResume}. Never throws: unknown keys are ignored, invalid values
 * are dropped, entries without any usable content are removed.
 */
export function validateParsedResume(raw: unknown, now: Date = new Date()): ValidationResult {
  const issues: string[] = [];
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  if (!raw || typeof raw !== 'object') issues.push('input is not an object');
  const resume = emptyParsedResume(oneOf(RESUME_SOURCE_VALUES, input.source) ?? 'resume');

  resume.firstName = field(input.firstName);
  resume.lastName = field(input.lastName);
  resume.email = field(input.email, normalizeEmail);
  resume.phoneNumber = field(input.phoneNumber, normalizePhone);
  resume.jobTitle = field(input.jobTitle);
  resume.location = field(input.location);
  resume.description = field(input.description, longText);

  const seniority = field(input.seniority, (v) => oneOf(SENIORITY_VALUES, v));
  if (seniority) resume.seniority = { value: seniority.value as Seniority, confidence: seniority.confidence };
  const years = input.yearsOfExperience as { value?: unknown; confidence?: unknown } | number | undefined;
  const yearsValue = typeof years === 'number' ? years : years?.value;
  if (typeof yearsValue === 'number' && Number.isFinite(yearsValue) && yearsValue >= 0 && yearsValue <= 60) {
    resume.yearsOfExperience = {
      value: Math.round(yearsValue),
      confidence: normalizeConfidence(typeof years === 'object' ? years?.confidence : undefined),
    };
  }

  for (const item of list(input.experiences)) {
    const e: ParsedExperience = {
      companyName: str(item.companyName),
      jobTitle: str(item.jobTitle),
      location: str(item.location),
      description: longText(item.description),
      ...range(item, now),
      confidence: normalizeConfidence(item.confidence),
    };
    if (e.companyName || e.jobTitle) resume.experiences.push(stripUndefined(e));
    else issues.push('experience without company or title dropped');
  }

  for (const item of list(input.education)) {
    const { startDate, endDate } = range(item, now);
    const e: ParsedEducation = {
      school: str(item.school),
      degree: str(item.degree),
      field: str(item.field),
      description: longText(item.description),
      startDate,
      endDate,
      confidence: normalizeConfidence(item.confidence),
    };
    if (e.school || e.degree) resume.education.push(stripUndefined(e));
    else issues.push('education without school or degree dropped');
  }

  const skills = new Set<string>();
  for (const item of list(input.skills)) {
    const name = str(item.name, 80);
    if (!name || skills.has(name.toLowerCase())) continue;
    skills.add(name.toLowerCase());
    resume.skills.push(
      stripUndefined({ name, level: oneOf(PARSED_SKILL_LEVELS, item.level), confidence: normalizeConfidence(item.confidence) }),
    );
  }

  const langs = new Set<string>();
  for (const item of list(input.languages)) {
    const name = str(item.name, 60);
    if (!name || langs.has(name.toLowerCase())) continue;
    langs.add(name.toLowerCase());
    resume.languages.push(
      stripUndefined({ name, level: oneOf(LANGUAGE_LEVEL_VALUES, item.level), confidence: normalizeConfidence(item.confidence) }),
    );
  }

  for (const item of list(input.certifications)) {
    const name = str(item.name, 160);
    if (!name) continue;
    resume.certifications.push(
      stripUndefined({ name, issuer: str(item.issuer), date: normalizeMonth(item.date, now), confidence: normalizeConfidence(item.confidence) }),
    );
  }

  const urls = new Set<string>();
  for (const item of list(input.links)) {
    const url = normalizeUrl(item.url);
    if (!url || urls.has(url)) continue;
    urls.add(url);
    resume.links.push({ url, kind: oneOf(LINK_KIND_VALUES, item.kind) ?? linkKind(url), confidence: normalizeConfidence(item.confidence) });
  }

  return { resume: stripUndefined(resume), issues };
}

/** True when nothing useful was extracted. */
export function isEmptyResume(r: ParsedResume): boolean {
  return (
    !r.firstName && !r.lastName && !r.email && !r.phoneNumber && !r.jobTitle && !r.description &&
    r.experiences.length === 0 && r.education.length === 0 && r.skills.length === 0
  );
}

/** Whole years between the earliest experience start and today, when experiences have dates. */
export function yearsOfExperienceFrom(experiences: ParsedExperience[], now: Date = new Date()): number | undefined {
  const starts = experiences.map((e) => e.startDate).filter((d): d is string => !!d).sort();
  if (starts.length === 0) return undefined;
  const [y, m] = starts[0].split('-').map(Number);
  const months = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
  return months > 0 ? Math.floor(months / 12) : 0;
}

/** Seniority from title keywords (they win) or from years of experience. */
export function inferSeniority(jobTitle: string | undefined, years: number | undefined): Field<Seniority> | undefined {
  const title = jobTitle ? ascii(jobTitle) : '';
  if (/\b(intern|stagiaire|stage|alternan\w*|apprenti\w*|trainee)\b/.test(title)) return { value: 'entry', confidence: 'medium' };
  if (/\b(junior|jr|graduate|debutant)\b/.test(title)) return { value: 'junior', confidence: 'medium' };
  if (/\b(head of|vp|vice president|director|directeur|directrice|chief|cto|ceo|cpo|principal|staff|lead|manager|responsable)\b/.test(title)) {
    return { value: 'lead', confidence: 'medium' };
  }
  if (/\b(senior|sr|confirme|expert)\b/.test(title)) return { value: 'senior', confidence: 'medium' };
  if (years === undefined) return undefined;
  const value: Seniority = years < 1 ? 'entry' : years < 3 ? 'junior' : years < 6 ? 'mid' : years < 10 ? 'senior' : 'lead';
  return { value, confidence: 'low' };
}

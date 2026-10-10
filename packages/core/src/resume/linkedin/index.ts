import {
  type ParsedLink,
  type ParsedResume,
  type LanguageLevel,
  ascii,
  emptyParsedResume,
  linkKind,
  normalizeEmail,
  normalizeMonth,
  normalizePhone,
  normalizeUrl,
  validateParsedResume,
} from '../contract';
import { finalizeResume } from '../parse/rules';
import { listZipEntries, readZipEntry } from '../extract/zip';
import { csvRecords } from './csv';

/**
 * LinkedIn data export to a {@link ParsedResume} (APP-109).
 *
 * The user requests their own archive in LinkedIn (Settings > Data privacy >
 * Get a copy of your data) and drops the .zip (or single CSV files) here. It is
 * read where the code runs: in the browser nothing leaves the device, and no
 * request to LinkedIn is ever made. Nothing is scraped and no session or cookie
 * is involved (ADR-004). Relying on the user's own export is the supported way
 * to get this data; a session-based capture would need a terms-of-service
 * review first (APP-77) and is out of scope.
 *
 * Files used (matched by name, in any folder of the archive): Profile.csv,
 * Positions.csv, Education.csv, Skills.csv, Languages.csv, Certifications.csv,
 * Email Addresses.csv, PhoneNumbers.csv. Others are ignored.
 */

export const LINKEDIN_MAX_ENTRY_BYTES = 5 * 1024 * 1024;
export const LINKEDIN_MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;

const FILES = {
  profile: 'profile.csv',
  positions: 'positions.csv',
  education: 'education.csv',
  skills: 'skills.csv',
  languages: 'languages.csv',
  certifications: 'certifications.csv',
  emails: 'email addresses.csv',
  phones: 'phonenumbers.csv',
} as const;

export type LinkedInFiles = Partial<Record<keyof typeof FILES, string>>;

export type LinkedInImportResult =
  | { ok: true; resume: ParsedResume; filesRead: string[] }
  | { ok: false; reason: 'not-a-zip' | 'too-large' | 'no-profile-data' };

const PROFICIENCY: [RegExp, LanguageLevel][] = [
  [/native|bilingual/, 'native'],
  [/full professional|professional working/, 'professional'],
  [/limited working/, 'conversational'],
  [/elementary/, 'basic'],
];

function languageLevel(value: string): LanguageLevel | undefined {
  const text = ascii(value);
  return PROFICIENCY.find(([re]) => re.test(text))?.[1];
}

/** "[PERSONAL:https://a.com,BLOG:b.org]" to urls. */
function websites(value: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  for (const part of value.replace(/^\[|\]$/g, '').split(',')) {
    const url = normalizeUrl(part.replace(/^[A-Za-z ]+:(?!\/\/)/, '').trim());
    if (url && !links.some((l) => l.url === url)) links.push({ url, kind: linkKind(url), confidence: 'high' });
  }
  return links;
}

/** Parses the text of the export files. Pure: used by the zip reader and by tests. */
export function parseLinkedInFiles(files: LinkedInFiles, now: Date = new Date()): ParsedResume {
  const resume = emptyParsedResume('linkedin-export');
  const raw: Record<string, unknown> = { source: 'linkedin-export' };
  const high = (value: string | undefined) => (value ? { value, confidence: 'high' as const } : undefined);

  const profile = files.profile ? csvRecords(files.profile, ['first name', 'last name']) [0] : undefined;
  if (profile) {
    raw.firstName = high(profile['first name']);
    raw.lastName = high(profile['last name']);
    raw.jobTitle = high(profile['headline']);
    raw.description = high(profile['summary']);
    raw.location = high(profile['geo location'] || profile['address']);
    resume.links = websites(profile['websites'] ?? '');
  }

  const emails = files.emails ? csvRecords(files.emails, ['email address']) : [];
  const email = emails.find((e) => /^(yes|true)$/i.test(e['primary'] ?? '')) ?? emails.find((e) => /^(yes|true)$/i.test(e['confirmed'] ?? '')) ?? emails[0];
  const emailValue = normalizeEmail(email?.['email address']);
  if (emailValue) raw.email = high(emailValue);
  const phone = (files.phones ? csvRecords(files.phones, ['number']) : []).map((p) => normalizePhone(p['number'])).find(Boolean);
  if (phone) raw.phoneNumber = high(phone);

  raw.experiences = (files.positions ? csvRecords(files.positions, ['company name', 'title']) : []).map((p) => ({
    companyName: p['company name'],
    jobTitle: p['title'],
    location: p['location'],
    description: p['description'],
    startDate: p['started on'],
    endDate: p['finished on'],
    isCurrent: !!p['started on'] && !p['finished on'] ? true : undefined,
    confidence: 'high',
  }));
  raw.education = (files.education ? csvRecords(files.education, ['school name', 'degree name']) : []).map((e) => ({
    school: e['school name'],
    degree: e['degree name'],
    startDate: e['start date'],
    endDate: e['end date'],
    description: e['notes'],
    confidence: 'high',
  }));
  raw.skills = (files.skills ? csvRecords(files.skills, ['name']) : []).map((s) => ({ name: s['name'], confidence: 'high' }));
  raw.languages = (files.languages ? csvRecords(files.languages, ['name', 'proficiency']) : []).map((l) => ({
    name: l['name'],
    level: languageLevel(l['proficiency'] ?? ''),
    confidence: 'high',
  }));
  raw.certifications = (files.certifications ? csvRecords(files.certifications, ['name', 'authority']) : []).map((c) => ({
    name: c['name'],
    issuer: c['authority'],
    date: normalizeMonth(c['started on'], now),
    confidence: 'high',
  }));
  raw.links = resume.links;

  const validated = validateParsedResume(raw, now).resume;
  return finalizeResume(validated, '', now);
}

function baseName(path: string): string {
  return (path.split('/').pop() ?? path).trim().toLowerCase();
}

/** Reads a LinkedIn archive (.zip bytes) and maps it. Never throws. */
export async function parseLinkedInArchive(zip: Uint8Array, now: Date = new Date()): Promise<LinkedInImportResult> {
  if (zip.length > LINKEDIN_MAX_ARCHIVE_BYTES) return { ok: false, reason: 'too-large' };
  const entries = listZipEntries(zip);
  if (!entries) return { ok: false, reason: 'not-a-zip' };
  const files: LinkedInFiles = {};
  const filesRead: string[] = [];
  const decoder = new TextDecoder('utf-8');
  for (const [key, name] of Object.entries(FILES) as [keyof typeof FILES, string][]) {
    const entry = entries.find((e) => baseName(e.name) === name);
    if (!entry) continue;
    const data = await readZipEntry(zip, entry, LINKEDIN_MAX_ENTRY_BYTES);
    if (!data) continue;
    files[key] = decoder.decode(data);
    filesRead.push(entry.name);
  }
  if (filesRead.length === 0) return { ok: false, reason: 'no-profile-data' };
  return { ok: true, resume: parseLinkedInFiles(files, now), filesRead };
}

/** Maps a dropped CSV file name to its slot, for imports of single files. */
export function linkedInFileKey(fileName: string): keyof LinkedInFiles | undefined {
  const name = baseName(fileName);
  return (Object.entries(FILES) as [keyof typeof FILES, string][]).find(([, n]) => n === name)?.[0];
}

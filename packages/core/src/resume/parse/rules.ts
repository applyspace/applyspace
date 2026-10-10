import {
  type Confidence,
  type Field,
  type LanguageLevel,
  type ParsedCertification,
  type ParsedEducation,
  type ParsedExperience,
  type ParsedLanguage,
  type ParsedLink,
  type ParsedResume,
  type ParsedSkill,
  ascii,
  emptyParsedResume,
  inferSeniority,
  isPresentMarker,
  linkKind,
  normalizeEmail,
  normalizeMonth,
  normalizePhone,
  normalizeUrl,
  validateParsedResume,
  yearsOfExperienceFrom,
} from '../contract';
import { type Section, headingKind, sectionLines, splitSections } from '../sections';

/**
 * Deterministic resume parser: the fallback when no LLM is configured (or when
 * it fails) and the baseline of the eval set. It reads the text produced by the
 * extractors, cuts it at the headings and applies patterns for dates, contacts,
 * role lines and languages in English and French. It only fills what it can
 * recognise and marks how sure it is.
 */

const L = 'A-Za-zÀ-ÖØ-öø-ÿ';

const MONTH =
  "(?:janv?(?:ier|uary)?|f[eé](?:vr?(?:ier)?|b(?:ruary)?)|mars?|march|apr(?:il)?|avr(?:il)?|may|mai|juin|june?|juil(?:let)?|july?|ao[uû]t|aug(?:ust)?|sept?(?:embre|ember)?|oct(?:obre|ober)?|nov(?:embre|ember)?|d[eé]c(?:embre|ember)?)";
const DATE = `(?:${MONTH}\\.?,?\\s+(?:19|20)\\d{2}|\\d{1,2}[/.](?:19|20)\\d{2}|(?:19|20)\\d{2}-\\d{2}|(?:19|20)\\d{2})`;
const PRESENT = "(?:present|current|now|today|ongoing|aujourd['’]?\\s?hui|ce jour|en cours|actuel(?:lement)?)";
const SEP = '(?:-|–|—|to|until|through|à|au|jusqu[\'’]à|jusqu[\'’]au)';
const RANGE_RE = new RegExp(`(?:\\b(?:depuis|since|from)\\s+)?(${DATE})\\s*(?:${SEP}\\s*(${DATE}|${PRESENT}))?`, 'i');
const RANGE_ONLY_RE = new RegExp(`(${DATE})\\s*${SEP}\\s*(${DATE}|${PRESENT})`, 'i');

interface Range {
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  /** The matched text, to remove it from the line. */
  text: string;
}

/** A period in a line: "Jan 2020 - Present", "2016 – 2019", "depuis mars 2021", "03/2018 - 06/2020". */
export function findRange(line: string, now: Date, allowSingle = false): Range | null {
  const m = RANGE_ONLY_RE.exec(line) ?? (/\b(depuis|since)\b/i.test(line) || allowSingle ? RANGE_RE.exec(line) : null);
  if (!m) return null;
  const start = normalizeMonth(m[1].replace(/\./g, ' '), now);
  if (!start) return null;
  const endRaw = m[2];
  const current = !!endRaw && isPresentMarker(endRaw.trim());
  const end = endRaw && !current ? normalizeMonth(endRaw.replace(/\./g, ' '), now) : undefined;
  if (!endRaw && !/\b(depuis|since|from)\b/i.test(m[0]) && !allowSingle) return null;
  const isCurrent = current || (!endRaw && /\b(depuis|since)\b/i.test(m[0]));
  return {
    startDate: start,
    endDate: end && end >= start ? end : undefined,
    isCurrent,
    text: m[0],
  };
}

const BULLET_RE = /^\s*(?:[-–—•·▪■◦●*>]|•|\d+[.)])\s+/;
const isBullet = (line: string) => BULLET_RE.test(line);
const stripBullet = (line: string) => line.replace(BULLET_RE, '').trim();

const TITLE_WORDS =
  /\b(engineer|developer|designer|manager|director|lead|head|consultant|analyst|architect|specialist|officer|intern|assistant|coordinator|administrator|scientist|researcher|technician|teacher|professor|accountant|executive|owner|founder|cto|ceo|freelance|ing[eé]nieur|d[eé]veloppeu(?:r|se)|chef|responsable|directeur|directrice|stagiaire|alternan(?:t|te)|charg[eé]e?|conseill(?:er|[eè]re)|g[eé]rant|comptable|enseignant|chercheu(?:r|se)|technicien|apprenti|business|product|project|marketing|sales|account|data|software|full.?stack|front.?end|back.?end|devops|qa|ux|ui)\b/i;

function looksLikeTitle(text: string): boolean {
  return TITLE_WORDS.test(text);
}

/** "Product Designer - Acme Corp - Paris", "Designer at Acme", "Acme | Designer". */
export function splitRole(line: string): { jobTitle?: string; companyName?: string; location?: string } {
  const text = line.replace(/\s+/g, ' ').trim().replace(/^[-–—|,;:\s]+|[-–—|,;:\s]+$/g, '');
  if (!text) return {};
  let parts: string[];
  const at = /\s+(?:at|chez|@|for|pour)\s+/i.exec(text);
  if (at) parts = [text.slice(0, at.index), ...text.slice(at.index + at[0].length).split(/\s+[-–—|·]\s+|\s*\|\s*/)];
  else {
    parts = text.split(/\s+[-–—|·]\s+|\s*\|\s*/);
    if (parts.length === 1) parts = text.split(/,\s+/);
  }
  parts = parts.map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && !looksLikeTitle(parts[0]) && looksLikeTitle(parts[1])) [parts[0], parts[1]] = [parts[1], parts[0]];
  let companyName = parts[1];
  let location = parts[2];
  const paren = companyName ? /^(.*?)\s*\(([^)]+)\)$/.exec(companyName) : null;
  if (paren && !location) {
    companyName = paren[1];
    location = paren[2];
  }
  return { jobTitle: parts[0], companyName, location };
}

function confidenceOf(score: number): Confidence {
  return score >= 3 ? 'high' : score === 2 ? 'medium' : 'low';
}

function bodyOf(lines: string[]): string | undefined {
  const text = lines
    .map((l) => stripBullet(l))
    .filter(Boolean)
    .join('\n')
    .trim();
  return text || undefined;
}

// --- sections ----------------------------------------------------------------

export function parseExperiences(lines: string[], now: Date): ParsedExperience[] {
  interface Anchor {
    at: number;
    range: Range;
    titleLine: string;
    first: number;
    last: number;
  }
  const anchors: Anchor[] = [];
  const used = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || isBullet(line)) continue;
    const range = findRange(line, now);
    if (!range) continue;
    const rest = line.replace(range.text, ' ').replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').replace(/^[-–—|,:·\s]+|[-–—|,:·\s]+$/g, '').trim();
    let titleLine = rest;
    let first = i;
    let last = i;
    if (rest.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 3) {
      const prev = i - 1 >= 0 ? lines[i - 1] : '';
      const prev2 = i - 2 >= 0 ? lines[i - 2] : '';
      const prevOk = prev.trim() && !isBullet(prev) && !used.has(i - 1) && !findRange(prev, now);
      if (prevOk) {
        const prev2Ok = prev2.trim() && !isBullet(prev2) && !used.has(i - 2) && !findRange(prev2, now) && !(i - 3 >= 0 && lines[i - 3].trim() && !isBullet(lines[i - 3]) && prev2.length > 60);
        // "Title / Company / dates": two short lines above the dates.
        if (prev2Ok && prev2.length <= 60 && prev.length <= 60 && !looksLikeTitle(prev) && looksLikeTitle(prev2)) {
          titleLine = `${prev2} - ${prev}`;
          first = i - 2;
        } else {
          titleLine = prev;
          first = i - 1;
        }
      } else if (i + 1 < lines.length && lines[i + 1].trim() && !isBullet(lines[i + 1]) && !findRange(lines[i + 1], now)) {
        titleLine = lines[i + 1];
        last = i + 1;
      }
    }
    if (!titleLine.trim()) continue;
    for (let k = first; k <= last; k++) used.add(k);
    anchors.push({ at: i, range, titleLine, first, last });
  }

  return anchors.map((a, idx) => {
    const end = idx + 1 < anchors.length ? anchors[idx + 1].first : lines.length;
    const description = bodyOf(lines.slice(a.last + 1, end));
    const role = splitRole(a.titleLine);
    const score = (role.jobTitle ? 1 : 0) + (role.companyName ? 1 : 0) + (a.range.startDate ? 1 : 0);
    const e: ParsedExperience = {
      jobTitle: role.jobTitle,
      companyName: role.companyName,
      location: role.location,
      startDate: a.range.startDate,
      endDate: a.range.endDate,
      isCurrent: a.range.isCurrent ? true : a.range.endDate ? false : undefined,
      description,
      confidence: confidenceOf(score),
    };
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined)) as unknown as ParsedExperience;
  });
}

const DEGREE_RE =
  /\b(master|msc|m\.sc|mba|licence|bachelor|bsc|b\.sc|bts|dut|but|deug|doctorat|phd|ph\.d|baccalaur[eé]at|bac|dipl[oô]me|ing[eé]nieur|engineer'?s? degree|certificat|diploma|degree|cap|bep|mast[eè]re|magist[eè]re|cycle)\b/i;
const SCHOOL_RE =
  /\b(universit(?:y|é|e|a|à)|[eé]cole|school|institut|institute|college|coll[eè]ge|lyc[eé]e|academy|acad[eé]mie|insa|hec|essec|escp|edhec|centrale|polytechnique|sorbonne|epitech|supinfo|iut|mines|ponts|telecom|t[eé]l[eé]com|ensimag|ensae|ensta|isep|efrei|ece|esiee|cnam|mit|stanford|polytech|faculty|facult[eé]|gobelins|strate)\b/i;

export function parseEducation(lines: string[], now: Date): ParsedEducation[] {
  const entries: string[][] = [];
  let block: string[] = [];
  const flush = () => {
    if (block.length) entries.push(block);
    block = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const startsEntry = (DEGREE_RE.test(line) || SCHOOL_RE.test(line)) && !isBullet(line);
    const blockHasMain = block.some((b) => DEGREE_RE.test(b) || SCHOOL_RE.test(b));
    const blockHasRange = block.some((b) => findRange(b, now, true));
    // A new degree line after a complete entry starts another one.
    if (block.length && startsEntry && blockHasMain && (blockHasRange || (DEGREE_RE.test(line) && block.some((b) => DEGREE_RE.test(b))))) flush();
    block.push(line);
  }
  flush();

  const out: ParsedEducation[] = [];
  for (const entry of entries) {
    const text = entry.join(' | ');
    const range = findRange(text, now, true);
    const cleaned = (range ? text.replace(range.text, ' ') : text).replace(/[()[\]]/g, ' ');
    const parts = cleaned
      .split(/\s+\|\s+|\s+[-–—]\s+|,\s+|;\s+/)
      .map((p) => p.replace(/^[-–—|,:·\s]+|[-–—|,:·\s]+$/g, '').trim())
      .filter((p) => p.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 2);
    let school: string | undefined;
    let degree: string | undefined;
    const rest: string[] = [];
    for (const p of parts) {
      if (!school && SCHOOL_RE.test(p) && !(DEGREE_RE.test(p) && !degree && !SCHOOL_RE.test(p.replace(DEGREE_RE, '')))) school = p;
      else if (!degree && DEGREE_RE.test(p)) degree = p;
      else rest.push(p);
    }
    if (!school && rest.length) school = rest.shift();
    if (!degree && rest.length) degree = rest.shift();
    if (!school && !degree) continue;
    let field: string | undefined = rest.shift();
    if (degree && !field) {
      const m = /^(\S+(?:\s+\S+)?)\s+(?:in|en|of|:)\s+(.+)$/i.exec(degree);
      if (m && DEGREE_RE.test(m[1])) {
        degree = m[1];
        field = m[2];
      }
    }
    const single = range && !range.isCurrent && !range.endDate ? range.startDate : undefined;
    const e: ParsedEducation = {
      school,
      degree,
      field,
      startDate: single ? undefined : range?.startDate,
      endDate: single ?? range?.endDate,
      confidence: confidenceOf((school ? 1 : 0) + (degree ? 1 : 0) + (range ? 1 : 0)),
    };
    out.push(Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined)) as unknown as ParsedEducation);
  }
  return out;
}

export function parseSkills(lines: string[]): ParsedSkill[] {
  const seen = new Set<string>();
  const out: ParsedSkill[] = [];
  for (const raw of lines) {
    const line = stripBullet(raw).replace(new RegExp(`^[${L}/& +]{2,28}:\\s*`), '');
    for (const item of line.split(/[,;•·|]|\t|\s{3,}/)) {
      const name = stripBullet(item).replace(/^[-–—:\s]+|[-–—:.\s]+$/g, '').trim();
      if (name.length < 1 || name.length > 40 || name.split(/\s+/).length > 4) continue;
      if (!/[A-Za-zÀ-ÿ0-9]/.test(name) || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ name, confidence: 'medium' });
    }
  }
  return out.slice(0, 60);
}

const LANGUAGE_NAMES = [
  'english', 'anglais', 'french', 'francais', 'français', 'spanish', 'espagnol', 'german', 'allemand', 'italian', 'italien',
  'portuguese', 'portugais', 'dutch', 'neerlandais', 'néerlandais', 'chinese', 'chinois', 'mandarin', 'cantonese', 'japanese', 'japonais',
  'korean', 'coreen', 'coréen', 'arabic', 'arabe', 'russian', 'russe', 'hindi', 'turkish', 'turc', 'polish', 'polonais', 'swedish', 'suedois',
  'suédois', 'romanian', 'roumain', 'hebrew', 'hebreu', 'hébreu', 'vietnamese', 'vietnamien', 'greek', 'grec', 'ukrainian', 'ukrainien',
];

function languageLevel(text: string): LanguageLevel | undefined {
  const t = ascii(text);
  if (/\b(native|mother tongue|maternelle?|natif|native speaker|c2)\b/.test(t)) return 'native';
  if (/\b(fluent|courant|bilingual|bilingue|professional|professionnel|advanced|avance|c1|full proficiency)\b/.test(t)) return 'professional';
  if (/\b(intermediate|intermediaire|conversational|b1|b2|upper|moyen|good|bon)\b/.test(t)) return 'conversational';
  if (/\b(basic|elementary|beginner|debutant|notions?|scolaire|a1|a2|limited)\b/.test(t)) return 'basic';
  return undefined;
}

export function parseLanguages(lines: string[]): ParsedLanguage[] {
  const out: ParsedLanguage[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    for (const item of stripBullet(raw).split(/[,;•·|]|\t|\s{3,}/)) {
      const m = new RegExp(`^\\s*([${L}]+)\\b\\s*[-–:(]?\\s*(.*)$`).exec(stripBullet(item));
      if (!m || !LANGUAGE_NAMES.includes(ascii(m[1]).replace('ç', 'c')) && !LANGUAGE_NAMES.includes(m[1].toLowerCase())) continue;
      const name = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const level = languageLevel(m[2]);
      out.push({ name, level, confidence: level ? 'high' : 'medium' });
    }
  }
  return out.map((l) => (l.level ? l : { name: l.name, confidence: l.confidence }));
}

export function parseCertifications(lines: string[], now: Date): ParsedCertification[] {
  const out: ParsedCertification[] = [];
  for (const raw of lines) {
    const line = stripBullet(raw);
    if (!line) continue;
    const range = findRange(line, now, true);
    const text = (range ? line.replace(range.text, ' ') : line).replace(/[()[\]]/g, ' ');
    const [name, issuer] = text
      .split(/\s+[-–—|]\s+|,\s+/)
      .map((p) => p.replace(/^[-–—|,:·\s]+|[-–—|,:·\s]+$/g, '').trim())
      .filter(Boolean);
    if (!name) continue;
    out.push({ name, issuer, date: range?.startDate, confidence: issuer ? 'medium' : 'low' });
  }
  return out.map((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) as unknown as ParsedCertification);
}

// --- header ------------------------------------------------------------------

const EMAIL_FIND = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const URL_FIND = /(?:https?:\/\/|www\.)[^\s|,;)>]+|\b(?:[a-z]{2,3}\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)\/[^\s|,;)>]+/gi;

function findPhone(text: string): string | undefined {
  for (const m of text.matchAll(/(?:\+|00)?\d[\d .()-]{7,}\d/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) continue;
    if (/^(?:19|20)\d{2}\D+(?:19|20)\d{2}$/.test(m[0].trim())) continue;
    return normalizePhone(m[0].trim());
  }
  return undefined;
}

const NAME_TOKEN = new RegExp(`^[${L}][${L}'’-]*$`);

function parseName(line: string): { first: string; last: string; confidence: Confidence } | null {
  const tokens = line.replace(/[|,·•].*$/, '').trim().split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return null;
  if (!tokens.every((t) => NAME_TOKEN.test(t))) return null;
  if (TITLE_WORDS.test(line) || headingKind(line)) return null;
  const upper = (t: string) => t.length > 1 && t === t.toUpperCase();
  const cap = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
  const isCap = (t: string) => /^[A-ZÀ-ÖØ-Þ]/.test(t);
  if (!tokens.every(isCap)) return null;
  // French style "DUPONT Jean": the upper-case surname comes first.
  if (upper(tokens[0]) && !upper(tokens[tokens.length - 1])) {
    const lastTokens = tokens.filter(upper);
    const firstTokens = tokens.filter((t) => !upper(t));
    return { first: firstTokens.join(' '), last: lastTokens.map(cap).join(' '), confidence: 'medium' };
  }
  const norm = (t: string) => (upper(t) ? cap(t) : t);
  if (tokens.length === 2) return { first: norm(tokens[0]), last: norm(tokens[1]), confidence: 'high' };
  return { first: norm(tokens[0]), last: tokens.slice(1).map(norm).join(' '), confidence: 'low' };
}

function f<T>(value: T | undefined, confidence: Confidence): Field<T> | undefined {
  return value === undefined || value === '' ? undefined : { value, confidence };
}

// --- entry point ---------------------------------------------------------------

export interface RulesOptions {
  now?: Date;
}

export function parseResumeWithRules(text: string, options: RulesOptions = {}): ParsedResume {
  const now = options.now ?? new Date();
  const sections: Section[] = splitSections(text.replace(/\r\n?/g, '\n'));
  const resume = emptyParsedResume('resume');
  const header = sectionLines(sections, 'header').filter((l) => l.trim());
  const contact = [...header, ...sectionLines(sections, 'contact')].filter((l) => l.trim());
  const contactText = contact.join('\n');

  const email = EMAIL_FIND.exec(contactText)?.[0] ?? EMAIL_FIND.exec(text)?.[0];
  resume.email = f(normalizeEmail(email), 'high');
  resume.phoneNumber = f(findPhone(contactText), 'high');

  const links: ParsedLink[] = [];
  const seenUrls = new Set<string>();
  for (const m of contactText.matchAll(URL_FIND)) {
    const url = normalizeUrl(m[0].replace(/[.,;]+$/, ''));
    if (!url || seenUrls.has(url) || (email && url.includes(email))) continue;
    seenUrls.add(url);
    links.push({ url, kind: linkKind(url), confidence: 'high' });
  }
  resume.links = links;

  let name = header.map(parseName).find(Boolean);
  // Two-column layouts put the sidebar first: look for a name line followed by a job title anywhere.
  let nameFallbackHeadline: string | undefined;
  if (!name) {
    const all = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
    for (let i = 0; i < all.length - 1 && !name; i++) {
      const candidate = parseName(all[i]);
      const next = all[i + 1];
      if (candidate && next && next.length <= 80 && looksLikeTitle(next) && !EMAIL_FIND.test(next)) {
        name = { ...candidate, confidence: 'low' };
        nameFallbackHeadline = next;
      }
    }
  }
  if (name) {
    resume.firstName = f(name.first, name.confidence);
    resume.lastName = f(name.last, name.confidence);
  }

  // Headline and location: the other lines of the header block.
  const nameLineIdx = name ? header.findIndex((l) => parseName(l)) : -1;
  const other = header.filter((_, i) => i !== nameLineIdx).filter((l) => l.trim());
  const headline = other.find(
    (l) => !EMAIL_FIND.test(l) && !findPhone(l) && !/(https?:|www\.|linkedin|github)/i.test(l) && l.length <= 80 && !/\d{4}/.test(l) && !/[|·•]/.test(l) && !/^[-–—•]/.test(l),
  );
  if (headline) resume.jobTitle = f(headline.trim(), looksLikeTitle(headline) ? 'high' : 'low');
  else if (nameFallbackHeadline) resume.jobTitle = f(nameFallbackHeadline, 'medium');
  for (const l of contact) {
    for (const seg of l.split(/\s*[|·•]\s*/)) {
      const s = seg.trim();
      if (!s || EMAIL_FIND.test(s) || findPhone(s) || /(https?:|www\.|linkedin|github|\.com|\.fr)/i.test(s) || s === headline?.trim()) continue;
      if (/^[A-Za-zÀ-ÿ' -]+(,\s*[A-Za-zÀ-ÿ' -]+)?$/.test(s) && s.length <= 40 && !looksLikeTitle(s) && !parseName(s) && !resume.location) {
        resume.location = f(s, s.includes(',') ? 'medium' : 'low');
      }
    }
  }

  const summary = sectionLines(sections, 'summary').join('\n').replace(/\n{2,}/g, '\n').trim();
  if (summary) resume.description = f(summary, 'medium');

  resume.experiences = parseExperiences(sectionLines(sections, 'experience'), now);
  resume.education = parseEducation(sectionLines(sections, 'education'), now);
  resume.skills = parseSkills(sectionLines(sections, 'skills'));
  resume.languages = parseLanguages(sectionLines(sections, 'languages'));
  resume.certifications = parseCertifications(sectionLines(sections, 'certifications'), now);

  return finalizeResume(resume, text, now);
}

/** Fills what can be derived: headline from the latest role, years and seniority. */
export function finalizeResume(resume: ParsedResume, text: string, now: Date = new Date()): ParsedResume {
  const latest = [...resume.experiences].sort((a, b) =>
    a.isCurrent === b.isCurrent ? (b.startDate ?? '').localeCompare(a.startDate ?? '') : a.isCurrent ? -1 : 1,
  )[0];
  if (!resume.jobTitle && latest?.jobTitle) resume.jobTitle = { value: latest.jobTitle, confidence: 'low' };

  const stated = /(\d{1,2})\s*\+?\s*(?:years?|ans)\s+(?:of\s+)?(?:professional\s+)?(?:experience|d['’]exp[eé]rience|exp[eé]rience)/i.exec(text);
  // Internships and apprenticeships are not counted as professional years.
  const professional = resume.experiences.filter((e) => !/\b(intern|internship|stagiaire|stage|alternan\w*|apprenti\w*|trainee)\b/i.test(e.jobTitle ?? ''));
  const computed = professional.length ? yearsOfExperienceFrom(professional, now) : resume.experiences.length ? 0 : undefined;
  if (!resume.yearsOfExperience) {
    if (stated) resume.yearsOfExperience = { value: Number(stated[1]), confidence: 'high' };
    else if (computed !== undefined) resume.yearsOfExperience = { value: computed, confidence: 'low' };
  }
  if (!resume.seniority) {
    const s = inferSeniority(resume.jobTitle?.value ?? latest?.jobTitle, resume.yearsOfExperience?.value);
    if (s) resume.seniority = s;
  }
  return validateParsedResume(resume, now).resume;
}

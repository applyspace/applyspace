import { type ParsedResume, ascii } from '../contract';

/**
 * Scoring for the parser eval set (APP-108): a resume is flattened to a set of
 * normalised "facts", and the actual facts are compared with the expected ones
 * (precision, recall, F1). The same function scores the rules parser and an
 * LLM run, so the two can be compared on the same synthetic resumes.
 */

const norm = (s: string | undefined) => (s ? ascii(s).replace(/\s+/g, ' ').trim() : '');

export function resumeFacts(r: ParsedResume): Set<string> {
  const facts = new Set<string>();
  const add = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined && value !== '') facts.add(`${key}=${typeof value === 'string' ? norm(value) : value}`);
  };
  add('firstName', r.firstName?.value);
  add('lastName', r.lastName?.value);
  add('email', r.email?.value);
  add('phone', r.phoneNumber?.value.replace(/\D/g, ''));
  add('jobTitle', r.jobTitle?.value);
  add('location', r.location?.value);
  add('seniority', r.seniority?.value);
  add('years', r.yearsOfExperience?.value);
  for (const e of r.experiences) {
    const key = `exp:${norm(e.companyName)}|${norm(e.jobTitle)}`;
    add(key, 'present');
    add(`${key}|start`, e.startDate);
    add(`${key}|end`, e.isCurrent ? 'current' : e.endDate);
  }
  for (const e of r.education) {
    const key = `edu:${norm(e.school)}|${norm(e.degree)}`;
    add(key, 'present');
    add(`${key}|end`, e.endDate);
  }
  for (const s of r.skills) add('skill', s.name);
  for (const l of r.languages) add(`lang:${norm(l.name)}`, l.level ?? 'any');
  for (const c of r.certifications) add('cert', c.name);
  for (const l of r.links) add('link', l.url.replace(/^https?:\/\/(www\.)?/, ''));
  return facts;
}

export interface Score {
  precision: number;
  recall: number;
  f1: number;
  missing: string[];
  unexpected: string[];
}

export function scoreResume(expected: ParsedResume, actual: ParsedResume): Score {
  const want = resumeFacts(expected);
  const got = resumeFacts(actual);
  const hit = [...want].filter((f) => got.has(f)).length;
  const precision = got.size ? hit / got.size : 0;
  const recall = want.size ? hit / want.size : 1;
  return {
    precision,
    recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    missing: [...want].filter((f) => !got.has(f)),
    unexpected: [...got].filter((f) => !want.has(f)),
  };
}

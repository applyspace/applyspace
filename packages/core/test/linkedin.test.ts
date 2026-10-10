import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { parseCsv, csvRecords } from '../src/resume/linkedin/csv.ts';
import { linkedInFileKey, parseLinkedInArchive, parseLinkedInFiles } from '../src/resume/linkedin/index.ts';
import { NOW } from './fixtures.ts';

/** A zip with several entries (some deflated, some stored). Test helper only. */
function buildZip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  let i = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const raw = enc.encode(content);
    const stored = i++ % 2 === 1;
    const data = stored ? raw : deflateRawSync(raw);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, stored ? 0 : 8, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, stored ? 0 : 8, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const PROFILE = [
  'First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers',
  'Nora,Vidal,,,,"Senior Data Engineer, Platform","Builds data platforms.\nLoves clean schemas.",Software,75011,"Paris, Île-de-France, France",,"[PERSONAL:https://noravidal.example.com,GITHUB:github.com/noravidal]",',
].join('\n');

const POSITIONS = [
  'Company Name,Title,Description,Location,Started On,Finished On',
  'Lumen Analytics,Senior Data Engineer,"Owns the ""core"" pipelines, 40 TB/day.","Paris, France",Mar 2021,',
  'Orbit Labs,Data Engineer,Built ETL jobs.,Lyon,Sep 2017,Feb 2021',
].join('\r\n');

const EDUCATION = [
  'School Name,Start Date,End Date,Notes,Degree Name,Activities',
  'Université de Lyon,2013,2016,Graduated with honours,Master Informatique,Chess club',
].join('\n');

const FILES = {
  profile: PROFILE,
  positions: POSITIONS,
  education: EDUCATION,
  skills: 'Name\nSQL\nPython\nSpark\nsql\n',
  languages: 'Name,Proficiency\nFrench,Native or bilingual proficiency\nEnglish,Full professional proficiency\nSpanish,Elementary proficiency\n',
  certifications: 'Name,Url,Authority,Started On,Finished On,License Number\nGCP Data Engineer,https://x.example,Google,Jun 2022,,123\n',
  emails: 'Email Address,Confirmed,Primary,Updated On\nold@example.com,Yes,No,2019\nnora.vidal@example.com,Yes,Yes,2024\n',
  phones: 'Extension,Number,Type\n,+33 6 11 22 33 44,Mobile\n',
};

test('parseCsv handles quotes, doubled quotes, line breaks, CRLF and BOM', () => {
  const rows = parseCsv('﻿a,b\r\n"x,1","he said ""hi"""\n"line1\nline2",z\n');
  assert.deepEqual(rows, [['a', 'b'], ['x,1', 'he said "hi"'], ['line1\nline2', 'z']]);
});

test('csvRecords skips a note before the header', () => {
  const rows = csvRecords('Notes:\n"some note"\nFirst Name,Last Name\nA,B\n', ['first name']);
  assert.deepEqual(rows, [{ 'first name': 'A', 'last name': 'B' }]);
});

test('LinkedIn files map to a ParsedResume', () => {
  const r = parseLinkedInFiles(FILES, NOW);
  assert.equal(r.source, 'linkedin-export');
  assert.equal(r.firstName?.value, 'Nora');
  assert.equal(r.lastName?.value, 'Vidal');
  assert.equal(r.jobTitle?.value, 'Senior Data Engineer, Platform');
  assert.equal(r.description?.value, 'Builds data platforms.\nLoves clean schemas.');
  assert.equal(r.location?.value, 'Paris, Île-de-France, France');
  assert.equal(r.email?.value, 'nora.vidal@example.com');
  assert.equal(r.phoneNumber?.value, '+33 6 11 22 33 44');
  assert.deepEqual(r.links.map((l) => [l.url, l.kind]), [['https://noravidal.example.com', 'other'], ['https://github.com/noravidal', 'github']]);

  assert.equal(r.experiences.length, 2);
  assert.equal(r.experiences[0].companyName, 'Lumen Analytics');
  assert.equal(r.experiences[0].startDate, '2021-03');
  assert.equal(r.experiences[0].isCurrent, true);
  assert.equal(r.experiences[0].description, 'Owns the "core" pipelines, 40 TB/day.');
  assert.equal(r.experiences[1].endDate, '2021-02');
  assert.equal(r.experiences[1].isCurrent, false);

  assert.equal(r.education[0].school, 'Université de Lyon');
  assert.equal(r.education[0].degree, 'Master Informatique');
  assert.equal(r.education[0].endDate, '2016-01');

  assert.deepEqual(r.skills.map((s) => s.name), ['SQL', 'Python', 'Spark']);
  assert.deepEqual(r.languages.map((l) => [l.name, l.level]), [['French', 'native'], ['English', 'professional'], ['Spanish', 'basic']]);
  assert.equal(r.certifications[0].issuer, 'Google');
  assert.equal(r.certifications[0].date, '2022-06');
  assert.equal(r.seniority?.value, 'senior');
  assert.equal(r.yearsOfExperience?.value, 9);
});

test('a zip archive is read locally, files found in any folder, extras ignored', async () => {
  const zip = buildZip({
    'Basic_LinkedInDataExport/Profile.csv': FILES.profile,
    'Basic_LinkedInDataExport/Positions.csv': FILES.positions,
    'Basic_LinkedInDataExport/Connections.csv': 'Notes:\nFirst Name,Last Name\nSomeone,Else\n',
    'Basic_LinkedInDataExport/Skills.csv': FILES.skills,
    'Basic_LinkedInDataExport/Email Addresses.csv': FILES.emails,
  });
  const out = await parseLinkedInArchive(zip, NOW);
  assert.ok(out.ok);
  assert.equal(out.filesRead.length, 4);
  assert.equal(out.resume.firstName?.value, 'Nora');
  assert.equal(out.resume.experiences.length, 2);
  assert.equal(out.resume.email?.value, 'nora.vidal@example.com');
  assert.deepEqual(out.resume.skills.map((s) => s.name), ['SQL', 'Python', 'Spark']);
});

test('bad input is reported, not thrown', async () => {
  assert.deepEqual(await parseLinkedInArchive(new TextEncoder().encode('not a zip at all'), NOW), { ok: false, reason: 'not-a-zip' });
  assert.deepEqual(await parseLinkedInArchive(buildZip({ 'readme.txt': 'hello' }), NOW), { ok: false, reason: 'no-profile-data' });
  const empty = parseLinkedInFiles({}, NOW);
  assert.equal(empty.experiences.length, 0);
});

test('single dropped files are matched by name', () => {
  assert.equal(linkedInFileKey('Positions.csv'), 'positions');
  assert.equal(linkedInFileKey('export/Email Addresses.csv'), 'emails');
  assert.equal(linkedInFileKey('Connections.csv'), undefined);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractResumeText } from '../src/resume/extract/index.ts';
import { parseResume } from '../src/resume/parse/llm.ts';
import { buildDocx, buildPdf, type PdfLine } from './helpers.ts';
import { NOW } from './fixtures.ts';

const column = (texts: string[], x: number, top: number, size = 11): PdfLine[] =>
  texts.map((text, i) => ({ x, y: top - i * 16, text, size }));

test('file to profile: two-column PDF with the sidebar on the left', async () => {
  const sidebar = column(
    ['CONTACT', 'maria.garcia@example.com', '+34 612 345 678', 'Madrid, Spain', '', 'SKILLS', 'Python', 'SQL', 'Tableau', '', 'LANGUAGES', 'Spanish - native', 'English - fluent'],
    40,
    780,
  );
  const main = [
    ...column(['Maria Garcia'], 300, 780, 20),
    ...column(['Senior Data Analyst', '', 'EXPERIENCE', 'Senior Data Analyst - Nova Retail - Madrid', 'Feb 2020 - Present', 'Owns the KPI dashboards.', '', 'Data Analyst - Sol Energy - Sevilla', '2016 - 2020', '', 'EDUCATION', 'MSc Statistics, Universidad de Sevilla, 2014 - 2016'], 300, 750),
  ];
  const extracted = await extractResumeText(buildPdf([[...sidebar, ...main]]));
  assert.ok(extracted.ok);
  const { resume, method } = await parseResume(extracted.text, { now: NOW });
  assert.equal(method, 'rules');
  assert.equal(resume.firstName?.value, 'Maria');
  assert.equal(resume.lastName?.value, 'Garcia');
  assert.equal(resume.email?.value, 'maria.garcia@example.com');
  assert.equal(resume.jobTitle?.value, 'Senior Data Analyst');
  assert.equal(resume.seniority?.value, 'senior');
  assert.deepEqual(resume.skills.map((s) => s.name), ['Python', 'SQL', 'Tableau']);
  assert.deepEqual(resume.languages.map((l) => [l.name, l.level]), [['Spanish', 'native'], ['English', 'professional']]);
  assert.equal(resume.experiences.length, 2);
  assert.equal(resume.experiences[0].companyName, 'Nova Retail');
  assert.equal(resume.experiences[0].isCurrent, true);
  assert.equal(resume.education[0]?.degree, 'MSc Statistics');
});

test('file to profile: DOCX with French headings', async () => {
  const bytes = buildDocx(
    ['Camille Martin', 'Développeuse full stack', 'camille.martin@example.fr | 06 12 34 56 78', 'Expérience', 'Développeuse senior — Orange — Nantes', 'mars 2020 – Aujourd’hui', 'Compétences', 'TypeScript, Go'],
    {},
  );
  const extracted = await extractResumeText(bytes);
  assert.ok(extracted.ok);
  const { resume } = await parseResume(extracted.text, { now: NOW });
  assert.equal(resume.firstName?.value, 'Camille');
  assert.equal(resume.experiences[0].startDate, '2020-03');
  assert.equal(resume.experiences[0].isCurrent, true);
  assert.deepEqual(resume.skills.map((s) => s.name), ['TypeScript', 'Go']);
});

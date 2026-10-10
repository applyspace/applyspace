import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractResumeText } from '../src/resume/extract/index.ts';
import { buildDocx, buildPdf, type PdfLine } from './helpers.ts';

const lines = (texts: string[], x = 50, top = 780, step = 16): PdfLine[] =>
  texts.map((text, i) => ({ x, y: top - i * step, text }));

const SAMPLE = [
  'Jane Doe',
  'Senior Product Designer',
  'jane.doe@example.com | +33 6 12 34 56 78',
  'EXPERIENCE',
  'Product Designer - Acme Corp',
  'Jan 2021 - Present',
  'Formation',
  'Master Informatique, Université de Lyon, 2013 – 2015',
];

async function text(bytes: Uint8Array): Promise<string> {
  const result = await extractResumeText(bytes);
  assert.ok(result.ok, `expected ok, got ${result.ok ? '' : result.reason}`);
  return result.text;
}

test('PDF with a simple font keeps the lines and accents', async () => {
  const out = await text(buildPdf([lines(SAMPLE)]));
  assert.equal(out, SAMPLE.join('\n'));
});

test('PDF with a subset Identity-H font is decoded through its ToUnicode CMap', async () => {
  const out = await text(buildPdf([lines(SAMPLE)], { font: 'type0' }));
  assert.equal(out, SAMPLE.join('\n'));
});

test('PDF with compressed object streams and indirect stream lengths', async () => {
  const out = await text(buildPdf([lines(SAMPLE)], { objectStream: true, indirectLength: true }));
  assert.equal(out, SAMPLE.join('\n'));
});

test('uncompressed content streams are read too', async () => {
  const out = await text(buildPdf([lines(SAMPLE)], { compress: false }));
  assert.equal(out, SAMPLE.join('\n'));
});

test('pages are read in order and a blank line separates paragraphs', async () => {
  const page1: PdfLine[] = [...lines(['First page, first line of text']), { x: 50, y: 700, text: 'After a gap in the layout' }];
  const out = await text(buildPdf([page1, lines(['Second page, only line'])]));
  assert.equal(out, 'First page, first line of text\n\nAfter a gap in the layout\n\nSecond page, only line');
});

test('a two-column layout is read column by column', async () => {
  const left = lines(['CONTACT', 'john@example.com', 'London', 'SKILLS', 'Python', 'Go', 'Kubernetes', 'Docker'], 50);
  const right = lines(['EXPERIENCE', 'Staff Engineer - Gamma', '2018 - Present', 'Built the data platform', 'EDUCATION', 'BSc Computer Science'], 320);
  const out = await text(buildPdf([[...left, ...right]]));
  assert.ok(out.indexOf('Docker') < out.indexOf('EXPERIENCE'), out);
  assert.ok(out.indexOf('CONTACT') < out.indexOf('SKILLS'));
  assert.ok(out.indexOf('EXPERIENCE') < out.indexOf('EDUCATION'));
});

test('words placed one by one on a line are joined with spaces', async () => {
  const words: PdfLine[] = [
    { x: 50, y: 700, text: 'Software' },
    { x: 100, y: 700, text: 'Engineer' },
    { x: 400, y: 700, text: '2019' },
    { x: 50, y: 684, text: 'Paris' },
  ];
  const out = await text(buildPdf([words, ...[[{ x: 50, y: 700, text: 'filler text to pass the minimum size of a readable resume' }]]]));
  assert.ok(out.startsWith('Software Engineer\t2019\nParis'), JSON.stringify(out));
});

test('an image-only PDF is reported as scanned', async () => {
  const result = await extractResumeText(buildPdf([[]], { imageOnly: true }));
  assert.deepEqual(result, { ok: false, reason: 'scanned' });
});

test('a PDF with no text and no image is empty', async () => {
  const result = await extractResumeText(buildPdf([[]]));
  assert.deepEqual(result, { ok: false, reason: 'empty' });
});

test('an encrypted PDF is refused', async () => {
  const result = await extractResumeText(buildPdf([lines(SAMPLE)], { encrypted: true }));
  assert.deepEqual(result, { ok: false, reason: 'encrypted' });
});

test('garbage and legacy formats are refused without throwing', async () => {
  assert.deepEqual(await extractResumeText(new Uint8Array([1, 2, 3])), { ok: false, reason: 'unsupported-format' });
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
  assert.deepEqual(await extractResumeText(ole), { ok: false, reason: 'unsupported-format' });
  const broken = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<< /Type /Page >>\nendobj\n');
  const result = await extractResumeText(broken);
  assert.equal(result.ok, false);
  const big = await extractResumeText(new Uint8Array(10 * 1024 * 1024 + 1));
  assert.deepEqual(big, { ok: false, reason: 'too-large' });
});

test('DOCX paragraphs, accents and table rows', async () => {
  const bytes = buildDocx(['Camille Martin', 'Expérience', 'R&D Lead — Orange'], { rows: [['INSA Rennes', '2013 – 2016']] });
  const out = await text(bytes);
  assert.equal(out, 'Camille Martin\nExpérience\nR&D Lead — Orange\nINSA Rennes\t2013 – 2016');
  assert.equal(await text(buildDocx(['Stored entry'], { deflate: false })), 'Stored entry');
});

test('a zip without word/document.xml is not a resume', async () => {
  const zip = buildDocx(['x'], { entryName: 'xl/workbook.xml' });
  assert.deepEqual(await extractResumeText(zip), { ok: false, reason: 'unsupported-format' });
});

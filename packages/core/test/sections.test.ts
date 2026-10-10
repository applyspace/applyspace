import assert from 'node:assert/strict';
import { test } from 'node:test';
import { headingKind, sectionLines, splitSections } from '../src/resume/sections.ts';

test('headings in English and French, with case, accents and punctuation', () => {
  assert.equal(headingKind('EXPERIENCE'), 'experience');
  assert.equal(headingKind('Work Experience:'), 'experience');
  assert.equal(headingKind('Expérience professionnelle'), 'experience');
  assert.equal(headingKind('FORMATION'), 'education');
  assert.equal(headingKind('Compétences techniques'), 'skills');
  assert.equal(headingKind("Centres d'intérêt"), 'interests');
  assert.equal(headingKind('Langues'), 'languages');
  assert.equal(headingKind('Skills'), 'skills');
});

test('ordinary lines are not headings', () => {
  assert.equal(headingKind('Senior Product Designer - Acme Corp'), null);
  assert.equal(headingKind('Led the experience team.'), null);
  assert.equal(headingKind('jane@example.com'), null);
  assert.equal(headingKind(''), null);
});

test('splitSections cuts the text at the headings', () => {
  const sections = splitSections(
    ['Jane Doe', 'Designer', '', 'EXPERIENCE', 'Acme - Designer', '2019 - 2021', '', 'Formation', 'Master Design', '', 'Compétences', 'Figma, Sketch'].join('\n'),
  );
  assert.deepEqual(sections.map((s) => s.kind), ['header', 'experience', 'education', 'skills']);
  assert.deepEqual(sections[0].lines, ['Jane Doe', 'Designer']);
  assert.deepEqual(sectionLines(sections, 'experience'), ['Acme - Designer', '2019 - 2021']);
  assert.deepEqual(sectionLines(sections, 'languages'), []);
});

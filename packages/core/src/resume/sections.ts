import { ascii } from './contract';

/**
 * Layout hints for resume text: splits it into sections from the headings
 * (English and French). The extractors keep one heading per line and blank
 * lines between blocks, which is all this needs.
 */

export const SECTION_KINDS = [
  'header',
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'certifications',
  'projects',
  'volunteering',
  'publications',
  'interests',
  'contact',
  'other',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

const HEADINGS: Record<Exclude<SectionKind, 'header' | 'other'>, string[]> = {
  summary: [
    'summary', 'professional summary', 'profile', 'professional profile', 'about', 'about me', 'objective', 'career objective',
    'profil', 'profil professionnel', 'a propos', 'a propos de moi', 'presentation', 'objectif', 'objectif professionnel',
    'resume', 'resume professionnel',
  ],
  experience: [
    'experience', 'experiences', 'work experience', 'professional experience', 'employment', 'employment history', 'work history',
    'career', 'career history', 'experience professionnelle', 'experiences professionnelles', 'parcours professionnel', 'parcours',
    'historique professionnel',
  ],
  education: [
    'education', 'education and training', 'academic background', 'academic', 'qualifications', 'formation', 'formations',
    'formation et diplomes', 'diplomes', 'etudes', 'cursus', 'parcours academique', 'parcours scolaire',
  ],
  skills: [
    'skills', 'technical skills', 'key skills', 'core competencies', 'competencies', 'technologies', 'tools', 'expertise',
    'competences', 'competences techniques', 'competences cles', 'outils', 'savoir faire', 'aptitudes',
  ],
  languages: ['languages', 'language skills', 'langues', 'competences linguistiques'],
  certifications: ['certifications', 'certificates', 'certification', 'licenses', 'licenses and certifications', 'certificats', 'habilitations'],
  projects: ['projects', 'personal projects', 'selected projects', 'projets', 'projets personnels', 'realisations'],
  volunteering: ['volunteering', 'volunteer experience', 'volunteer work', 'community', 'benevolat', 'engagement associatif', 'engagements', 'vie associative'],
  publications: ['publications', 'articles', 'talks'],
  interests: ['interests', 'hobbies', 'hobbies and interests', 'centres d interet', 'centre d interet', 'loisirs', 'interets'],
  contact: ['contact', 'contacts', 'contact details', 'personal details', 'personal information', 'coordonnees', 'informations personnelles', 'infos'],
};

const LOOKUP = new Map<string, SectionKind>();
for (const [kind, names] of Object.entries(HEADINGS)) for (const name of names) LOOKUP.set(name, kind as SectionKind);

/** The kind of section a line is the heading of, or null. */
export function headingKind(line: string): SectionKind | null {
  const text = line.trim();
  if (!text || text.length > 48 || /[.@]/.test(text.replace(/\.$/, ''))) return null;
  const key = ascii(text)
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return LOOKUP.get(key) ?? null;
}

export interface Section {
  kind: SectionKind;
  /** The heading as written ('' for the header block). */
  heading: string;
  /** Lines of the body, without the heading; blank lines are kept as ''. */
  lines: string[];
}

export function splitSections(text: string): Section[] {
  const sections: Section[] = [{ kind: 'header', heading: '', lines: [] }];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const kind = headingKind(line);
    if (kind) sections.push({ kind, heading: line.trim(), lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }
  for (const s of sections) {
    while (s.lines.length && !s.lines[0].trim()) s.lines.shift();
    while (s.lines.length && !s.lines[s.lines.length - 1].trim()) s.lines.pop();
  }
  return sections.filter((s) => s.kind === 'header' || s.lines.length > 0 || s.heading);
}

/** Lines of all sections of a kind, joined (a heading may appear twice). */
export function sectionLines(sections: Section[], kind: SectionKind): string[] {
  return sections.filter((s) => s.kind === kind).flatMap((s, i) => (i ? ['', ...s.lines] : s.lines));
}

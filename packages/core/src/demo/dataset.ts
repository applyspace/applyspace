import { buildPlaceholderPdf } from './pdf';
import { demoUuid, makeClock, type DemoClock } from './ids';
import {
  APPLICATIONS,
  COMPANIES,
  DOCUMENTS,
  INTERVIEWS,
  OFFERS,
  type CompanyFixture,
  type OfferFixture,
  type PlatformSlug,
} from './fixtures';

/**
 * The demo account, as database rows. `buildDemoDataset` is pure: the same
 * anchor day and user id always give the same rows, so the seed can be re-run,
 * reset and diffed. Row keys are the SQL column names (snake_case) of the
 * Supabase tables in `supabase/migrations`.
 */

export type Cell = string | number | boolean | null | string[] | unknown[] | { [key: string]: unknown };
export type Row = Record<string, Cell>;

/** Tables the seed writes, in insert order (parents first). Reverse it to delete. */
export const DEMO_TABLES = [
  'profiles',
  'companies',
  'experiences',
  'education',
  'skills',
  'languages',
  'certifications',
  'profile_links',
  'projects',
  'volunteering',
  'publications',
  'documents',
  'searches',
  'offers',
  'offer_sources',
  'applications',
  'application_documents',
  'interviews',
] as const;
export type DemoTable = (typeof DEMO_TABLES)[number];

/** Columns that identify a row, for `insert ... on conflict`. */
export const CONFLICT_COLUMNS: Record<DemoTable | 'search_no_gos', string> = {
  profiles: 'id',
  companies: 'id',
  experiences: 'id',
  education: 'id',
  skills: 'id',
  languages: 'id',
  certifications: 'id',
  profile_links: 'id',
  projects: 'id',
  volunteering: 'id',
  publications: 'id',
  documents: 'id',
  searches: 'id',
  offers: 'id',
  offer_sources: 'id',
  applications: 'id',
  application_documents: 'application_id,document_id',
  interviews: 'id',
  search_no_gos: 'search_id,no_go_id',
};

/** The `accounts` row of the demo user: only the columns the seed sets. */
export interface DemoAccount {
  first_name: string;
  last_name: string;
  full_name: string;
  locale: 'fr' | 'en';
  theme_mode: 'light' | 'dark' | 'system';
  plan: 'max';
  selected_plan: 'max';
  onboarded_at: string;
  availability: 'active' | 'open' | 'paused';
  current_place: { label: string };
  linkedin_url: string;
  website_url: string;
  phone_number: string;
  writing_style: Record<string, unknown>;
}

export interface DemoFile {
  /** Path inside the `documents` Storage bucket, `<user id>/<file>`. */
  path: string;
  bytes: Uint8Array;
}

export interface DemoDataset {
  anchor: string;
  account: DemoAccount;
  tables: Record<DemoTable, Row[]>;
  /** Built-in no-gos attached to searches; resolved to ids by key at seed time. */
  searchNoGos: Array<{ search_id: string; no_go_key: string; user_id: string }>;
  files: DemoFile[];
}

export interface BuildOptions {
  /** Day the dates are relative to, `YYYY-MM-DD` (UTC). */
  anchor: string;
  /** The demo user's auth id. Rows point to it through `user_id`. */
  userId: string;
}

const NO_GO_KEYS = ['gambling', 'fossil-fuels', 'defense'] as const;

const PERSONA = {
  firstName: 'Camille',
  lastName: 'Aubert',
  headline: 'Product Designer, 6 ans en B2B et B2C',
  description:
    "Designer produit basée à Lyon. J'aime les parcours denses, les design systems et les équipes où designers, développeurs et chefs de produit décident ensemble. Je cherche un poste à impact, en CDI, avec une vraie place pour la recherche utilisateur.",
  location: 'Lyon, France',
  linkedin: 'https://www.linkedin.example/in/camille-aubert',
  github: 'https://github.example/camille-aubert',
  portfolio: 'https://camille-aubert.example',
  dribbble: 'https://dribbble.example/camille-aubert',
  /** Reserved fictional range (01 99 00 xx xx). */
  phone: '+33 1 99 00 12 34',
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const PLATFORM_HOST: Record<PlatformSlug, string> = {
  linkedin: 'linkedin.example/jobs/view',
  indeed: 'indeed.example/viewjob',
  glassdoor: 'glassdoor.example/job-listing',
  wttj: 'welcometothejungle.example/fr/jobs',
  hellowork: 'hellowork.example/emplois',
  jobsthatmakesense: 'jobs.makesense.example/offres',
  collectivework: 'collective.example/missions',
  francetravail: 'francetravail.example/offres',
};

const SIZE_LABEL = { startup: 'startup', 'scale-up': 'scale-up', midsize: "entreprise de taille moyenne", large: 'grande entreprise' } as const;

const MISSIONS: Record<OfferFixture['category'], readonly string[]> = {
  product: [
    "Concevoir des parcours de bout en bout, du besoin utilisateur à l'interface finale.",
    'Cadrer les sujets avec le produit et la tech lors d’ateliers courts.',
    'Prototyper, tester auprès d’utilisateurs, puis itérer.',
    'Contribuer au design system et veiller à sa cohérence.',
    'Présenter vos choix à l’équipe et aux parties prenantes.',
  ],
  research: [
    'Mener des entretiens et des tests d’usage tout au long du cycle produit.',
    'Synthétiser les résultats et les partager sous une forme utile aux équipes.',
    'Construire un référentiel de recherche partagé.',
    'Accompagner les designers et les chefs de produit dans leurs hypothèses.',
  ],
  system: [
    'Faire vivre le design system : composants, jetons, documentation.',
    'Travailler avec les développeurs sur la parité design et code.',
    'Accompagner les équipes dans l’adoption et mesurer les usages.',
    'Veiller à l’accessibilité de chaque composant.',
  ],
  lead: [
    'Encadrer une équipe de designers et soutenir leur progression.',
    'Définir la vision design avec la direction produit.',
    'Structurer les rituels, les outils et la qualité du design.',
    'Participer au recrutement et à l’intégration des nouvelles recrues.',
  ],
  content: [
    'Écrire et structurer les contenus de l’interface (messages, états vides, erreurs).',
    'Définir le ton et le guide éditorial du produit.',
    'Travailler au plus près des designers et des chefs de produit.',
  ],
  motion: [
    'Concevoir des animations d’interface et des micro-interactions.',
    'Produire des vidéos courtes pour les lancements de fonctionnalités.',
    'Collaborer avec les designers produit sur la direction visuelle.',
  ],
  service: [
    'Cartographier les parcours de bout en bout, côté usagers et côté agents.',
    'Animer des ateliers de co-conception avec les équipes et les usagers.',
    'Formaliser des recommandations et suivre leur mise en œuvre.',
  ],
  freelance: [
    'Intervenir en autonomie sur un périmètre défini avec le client.',
    'Livrer des maquettes prêtes pour le développement et un court dossier de décisions.',
    'Se coordonner avec l’équipe en place, à distance.',
  ],
};

const PERKS = [
  'Télétravail partiel (2 à 3 jours par semaine)',
  'Titres-restaurant',
  'Mutuelle prise en charge à 70 %',
  'Budget annuel de formation',
  'Participation aux bénéfices',
  'Congés supplémentaires',
  'Forfait mobilité durable',
];

/** `count` entries of `list`, starting at a position derived from `seed`, without repeats. */
function pick<T>(list: readonly T[], seed: number, count: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, list.length); i++) out.push(list[(seed + i * 2) % list.length]);
  return Array.from(new Set(out));
}

function describeOffer(offer: OfferFixture, company: CompanyFixture, index: number): string {
  const lines = [
    `${company.name} (${company.sector}, ${SIZE_LABEL[company.size]}) recrute pour son équipe, à ${offer.city}.`,
    '',
    'Vos missions',
    ...pick(MISSIONS[offer.category], index, 3).map((m) => `- ${m}`),
    '',
    'Votre profil',
    `- ${offer.level === 'senior' || offer.level === 'lead' ? '5 ans et plus' : '2 à 4 ans'} d’expérience sur un poste comparable.`,
    '- Un portfolio qui montre votre démarche, pas seulement le résultat.',
    '- À l’aise avec Figma et le travail en équipe pluridisciplinaire.',
    '',
    'Ce que nous proposons',
    ...pick(PERKS, index, 3).map((p) => `- ${p}`),
    '',
    'Offre fictive créée pour la démonstration d’ApplySpace.',
  ];
  return lines.join('\n');
}

function salaryText(offer: OfferFixture): { min: number | null; max: number | null; raw: string | null } {
  if (!offer.pay) return { min: null, max: null, raw: offer.contract === 'Stage' ? '1 200 € / mois' : null };
  if (offer.contract === 'Freelance') return { min: null, max: null, raw: `${offer.pay[0]} à ${offer.pay[1]} € / jour` };
  const [lo, hi] = offer.pay;
  return { min: lo * 1000, max: hi * 1000, raw: `${lo} 000 à ${hi} 000 € / an` };
}

export function buildDemoDataset({ anchor, userId }: BuildOptions): DemoDataset {
  const clock: DemoClock = makeClock(anchor);
  const u = userId;

  // ---- ids --------------------------------------------------------------
  const id = demoUuid;
  const profileDesigner = id('profile', 'designer');
  const profileResearcher = id('profile', 'researcher');
  const companyId = (key: string) => id('company', key);
  const docId = (key: string) => id('document', key);

  const tables = Object.fromEntries(DEMO_TABLES.map((t) => [t, [] as Row[]])) as Record<DemoTable, Row[]>;

  // ---- profiles ---------------------------------------------------------
  tables.profiles.push(
    {
      id: profileDesigner, user_id: u, job_title: 'Product Designer', is_default: true,
      description: PERSONA.description, headline: PERSONA.headline, seniority: 'senior', years_of_experience: 6,
      location: PERSONA.location, source: 'manual', created_at: clock.at(60), updated_at: clock.at(10),
    },
    {
      id: profileResearcher, user_id: u, job_title: 'UX Researcher', is_default: false,
      description: 'Facette recherche utilisateur : entretiens, tests d’usage, synthèses.',
      headline: 'Recherche utilisateur appliquée au produit', seniority: 'mid', years_of_experience: 3,
      location: PERSONA.location, source: 'manual', created_at: clock.at(45), updated_at: clock.at(20),
    },
  );

  // ---- companies --------------------------------------------------------
  for (const [i, c] of COMPANIES.entries()) {
    tables.companies.push({
      id: companyId(c.key), user_id: u, name: c.name, domain: null, linkedin_handle: null, sector: c.sector,
      size: c.size, headquarters: c.headquarters, description: c.description,
      logo_url: null, created_at: clock.at(70 - (i % 20)), updated_at: clock.at(5),
    });
  }

  // ---- experiences, education, skills, and the rest of the profile --------
  const exp = (key: string, row: Omit<Row, 'id' | 'user_id' | 'profile_id'>) =>
    tables.experiences.push({ id: id('experience', key), user_id: u, profile_id: profileDesigner, ...row });
  exp('bore', {
    company_id: companyId('bore'), title: 'Product Designer', location: 'Lyon, France',
    started_at: '2023-03-01', ended_at: null, is_current: true,
    description: "Design du module de facturation et du design system d'un logiciel de gestion pour PME.",
    employment_type: 'full_time',
    achievements: [
      'Refonte du module de facturation : -50 % de tickets de support liés.',
      'Création de Palette, le design system utilisé par quatre équipes.',
      'Mise en place de tests d’usage mensuels avec dix clients.',
    ],
    skills_used: ['Figma', 'Design system', 'Recherche utilisateur', 'Accessibilité'], source: 'manual',
    created_at: clock.at(60), updated_at: clock.at(10),
  });
  exp('marm', {
    company_id: companyId('marm'), title: 'Product Designer', location: 'Lyon, France',
    started_at: '2020-09-01', ended_at: '2023-02-01', is_current: false,
    description: 'Conception de produits numériques pour des clients de la santé, de la culture et de la mobilité.',
    employment_type: 'full_time',
    achievements: ['Douze projets livrés pour sept clients.', 'Animation de huit design sprints.'],
    skills_used: ['Figma', 'Design sprint', 'Prototypage'], source: 'manual',
    created_at: clock.at(60), updated_at: clock.at(60),
  });
  exp('fil', {
    company_id: companyId('fil'), title: 'Designer UX/UI en alternance', location: 'Lyon, France',
    started_at: '2018-09-01', ended_at: '2020-08-01', is_current: false,
    description: 'Maquettes de sites et d’applications pour des PME, en parallèle du master.',
    employment_type: 'apprenticeship',
    achievements: ['Refonte du site de trois clients.'], skills_used: ['Figma', 'HTML/CSS'], source: 'manual',
    created_at: clock.at(60), updated_at: clock.at(60),
  });

  const edu = (key: string, row: Omit<Row, 'id' | 'user_id' | 'profile_id'>) =>
    tables.education.push({ id: id('education', key), user_id: u, profile_id: profileDesigner, ...row });
  edu('master', {
    school: 'Institut Supérieur de Design Numérique (fictif)', degree: 'Master', field: "Design d'interaction",
    started_at: '2018-09-01', ended_at: '2020-07-01', description: 'Mémoire sur la conception de formulaires longs.',
    source: 'manual', created_at: clock.at(60), updated_at: clock.at(60),
  });
  edu('licence', {
    school: 'Université Horizon (fictive)', degree: 'Licence', field: 'Information-communication',
    started_at: '2015-09-01', ended_at: '2018-06-01', description: null,
    source: 'manual', created_at: clock.at(60), updated_at: clock.at(60),
  });

  const SKILLS: Array<[string, 'beginner' | 'intermediate' | 'advanced' | 'expert']> = [
    ['Figma', 'expert'], ['Design system', 'advanced'], ['Prototypage', 'advanced'],
    ['Recherche utilisateur', 'advanced'], ['Accessibilité (RGAA, WCAG)', 'advanced'],
    ['Animation d’ateliers', 'advanced'], ['Design sprint', 'intermediate'], ['HTML/CSS', 'intermediate'],
    ['UX writing', 'intermediate'], ['Analyse produit', 'intermediate'], ['Notion', 'intermediate'],
    ['Motion design', 'beginner'],
  ];
  for (const [name, level] of SKILLS) {
    tables.skills.push({
      id: id('skill', slug(name)), user_id: u, profile_id: profileDesigner, name, level, source: 'manual',
      created_at: clock.at(60), updated_at: clock.at(60),
    });
  }

  for (const [name, level] of [['Français', 'native'], ['Anglais', 'professional'], ['Espagnol', 'conversational']] as const) {
    tables.languages.push({
      id: id('language', slug(name)), user_id: u, profile_id: profileDesigner, name, level, source: 'manual',
      created_at: clock.at(60), updated_at: clock.at(60),
    });
  }

  const CERTS = [
    ['Accessibilité numérique, niveau 1', 'Organisme de formation (fictif)', '2022-06-01', null, 'https://certificats.example/accessibilite/ca-001'],
    ['Product Discovery', 'Académie Produit (fictive)', '2023-11-01', null, 'https://certificats.example/discovery/ca-002'],
    ['Animation de design sprint', 'Atelier Sprint (fictif)', '2021-03-01', '2026-03-01', null],
  ] as const;
  for (const [name, issuer, issued, expires, url] of CERTS) {
    tables.certifications.push({
      id: id('certification', slug(name)), user_id: u, profile_id: profileDesigner, name, issuer,
      issued_at: issued, expires_at: expires, credential_url: url, source: 'manual',
      created_at: clock.at(60), updated_at: clock.at(60),
    });
  }

  for (const [kind, url, label] of [
    ['linkedin', PERSONA.linkedin, 'LinkedIn'], ['github', PERSONA.github, 'GitHub'],
    ['portfolio', PERSONA.portfolio, 'Portfolio'], ['other', PERSONA.dribbble, 'Dribbble'],
  ] as const) {
    tables.profile_links.push({
      id: id('link', kind), user_id: u, profile_id: profileDesigner, kind, url, label, source: 'manual',
      created_at: clock.at(60), updated_at: clock.at(60),
    });
  }

  tables.projects.push(
    {
      id: id('project', 'palette'), user_id: u, profile_id: profileDesigner, name: 'Palette, un kit UI ouvert',
      description: 'Bibliothèque de composants accessibles et documentés, partagée sous licence ouverte.',
      url: 'https://github.example/camille-aubert/palette', started_at: '2024-01-01', ended_at: null,
      skills_used: ['Figma', 'Design system', 'Accessibilité'], source: 'manual', created_at: clock.at(60), updated_at: clock.at(60),
    },
    {
      id: id('project', 'transports'), user_id: u, profile_id: profileDesigner, name: 'Étude sur les transports du quotidien',
      description: "Vingt entretiens et un prototype pour comprendre comment les habitants combinent vélo, bus et train.",
      url: null, started_at: '2022-02-01', ended_at: '2022-09-01',
      skills_used: ['Recherche utilisateur', 'Prototypage'], source: 'manual', created_at: clock.at(60), updated_at: clock.at(60),
    },
  );
  tables.volunteering.push({
    id: id('volunteering', 'mentor'), user_id: u, profile_id: profileDesigner,
    organization: 'Les Ateliers du Numérique Solidaire (fictif)', role: 'Mentor design', cause: 'Inclusion numérique',
    started_at: '2022-01-01', ended_at: null, description: 'Accompagnement mensuel de personnes en reconversion vers le design.',
    source: 'manual', created_at: clock.at(60), updated_at: clock.at(60),
  });
  tables.publications.push({
    id: id('publication', 'design-system'), user_id: u, profile_id: profileDesigner,
    title: 'Concevoir un design system sans équipe dédiée', publisher: 'Journal du Design Produit (fictif)',
    published_at: '2025-03-01', url: 'https://journal-design.example/design-system-sans-equipe',
    description: "Retour d'expérience sur la création de Palette.", source: 'manual',
    created_at: clock.at(60), updated_at: clock.at(60),
  });

  // ---- documents (+ placeholder files) --------------------------------------
  const files: DemoFile[] = [];
  for (const d of DOCUMENTS) {
    let storagePath: string | null = null;
    let size: number | null = null;
    let mime: string | null = null;
    if (d.file) {
      storagePath = `${u}/${d.file}`;
      const bytes = buildPlaceholderPdf(d.name, [
        'Document fictif créé pour la démonstration d’ApplySpace.',
        `Personne : ${PERSONA.firstName} ${PERSONA.lastName} (fictive).`,
        'Aucune donnée réelle.',
      ]);
      files.push({ path: storagePath, bytes });
      size = bytes.length;
      mime = 'application/pdf';
    }
    tables.documents.push({
      id: docId(d.key), user_id: u, kind: d.kind, name: d.name, storage_path: storagePath, mime_type: mime,
      size_bytes: size, is_primary: d.isPrimary, extracted_text: d.text,
      created_at: clock.at(d.createdDaysAgo), updated_at: clock.at(d.createdDaysAgo),
    });
  }

  // ---- searches ---------------------------------------------------------------
  const search = (
    key: string,
    profile: string,
    titles: string[],
    places: string[],
    row: Omit<Row, 'id' | 'user_id' | 'profile_id' | 'search_title' | 'job_titles' | 'locations'>,
  ) => {
    const searchId = id('search', key);
    tables.searches.push({
      id: searchId, user_id: u, profile_id: profile, search_title: titles[0], job_titles: titles,
      locations: places.map((label) => ({ label })), ...row,
    });
    return searchId;
  };
  const mainSearch = search('main', profileDesigner, ['Product Designer', 'UX/UI Designer', 'Designer produit'],
    ['Lyon, France', 'Paris, France', 'Télétravail (France)'], {
      contract_types: ['CDI'], experience_levels: ['mid', 'senior'], remote_modes: ['hybrid', 'remote'],
      salary_min: 45000, salary_max: 65000, salary_currency: 'EUR', sectors: ['SaaS', 'HealthTech', 'ClimateTech'],
      languages: ['fr', 'en'], enabled_platforms: ['wttj', 'linkedin', 'indeed', 'hellowork', 'jobsthatmakesense'],
      company_sizes: ['11-50', '51-200', '201-1,000'], last_run_at: clock.at(0, 7), created_at: clock.at(55), updated_at: clock.at(0, 7),
    });
  search('senior', profileDesigner, ['Senior Product Designer', 'Lead Product Designer'], ['Paris, France', 'Télétravail (France)'], {
    contract_types: ['CDI'], experience_levels: ['senior', 'lead'], remote_modes: ['hybrid', 'remote'],
    salary_min: 60000, salary_max: 80000, salary_currency: 'EUR', sectors: ['FinTech', 'SaaS'],
    languages: ['fr', 'en'], enabled_platforms: ['linkedin', 'wttj'], company_sizes: ['51-200', '201-1,000'],
    last_run_at: clock.at(0, 7), created_at: clock.at(40), updated_at: clock.at(0, 7),
  });
  search('system', profileDesigner, ['Design System Designer'], ['Télétravail (France)'], {
    contract_types: ['CDI'], experience_levels: ['senior'], remote_modes: ['remote'],
    salary_min: 55000, salary_max: 70000, salary_currency: 'EUR', sectors: ['SaaS'],
    languages: ['fr', 'en'], enabled_platforms: ['wttj', 'linkedin'], company_sizes: ['51-200'],
    last_run_at: clock.at(1, 7), created_at: clock.at(30), updated_at: clock.at(1, 7),
  });
  search('freelance', profileDesigner, ['Freelance Product Designer'], ['Télétravail (France)'], {
    contract_types: ['Freelance'], experience_levels: ['senior', 'lead'], remote_modes: ['remote'],
    salary_min: null, salary_max: null, salary_currency: 'EUR', sectors: [],
    languages: ['fr'], enabled_platforms: ['collectivework', 'linkedin'], company_sizes: [],
    last_run_at: clock.at(2, 7), created_at: clock.at(20), updated_at: clock.at(2, 7),
  });
  search('research', profileResearcher, ['UX Researcher', 'Product Researcher'], ['Lyon, France', 'Lille, France', 'Télétravail (France)'], {
    contract_types: ['CDI'], experience_levels: ['mid'], remote_modes: ['hybrid', 'remote'],
    salary_min: 42000, salary_max: 55000, salary_currency: 'EUR', sectors: ['EdTech', 'HealthTech'],
    languages: ['fr', 'en'], enabled_platforms: ['linkedin', 'glassdoor', 'francetravail'], company_sizes: ['51-200', '201-1,000'],
    last_run_at: clock.at(1, 7), created_at: clock.at(25), updated_at: clock.at(1, 7),
  });
  const searchNoGos = NO_GO_KEYS.map((no_go_key) => ({ search_id: mainSearch, no_go_key, user_id: u }));

  // ---- offers (+ their sources) -------------------------------------------
  const companyByKey = new Map<string, CompanyFixture>(COMPANIES.map((c) => [c.key, c]));
  const offerIds: string[] = [];
  for (const [i, o] of OFFERS.entries()) {
    const company = companyByKey.get(o.co)!;
    const oid = id('offer', String(i));
    offerIds.push(oid);
    const pay = salaryText(o);
    const externalId = `demo-${o.platform}-${String(i + 1).padStart(4, '0')}`;
    const url = `https://${PLATFORM_HOST[o.platform]}/${externalId}`;
    const posted = clock.at(o.postedDaysAgo, 8);
    const seenAgo = Math.min(o.postedDaysAgo, i % 3);
    tables.offers.push({
      id: oid, user_id: u, platform_slug: o.platform, company_id: companyId(o.co), external_id: externalId, url,
      title: o.title, location: `${o.city}, France`, remote_mode: o.remote, contract: o.contract,
      experience_level: o.level, salary_min_eur: pay.min, salary_max_eur: pay.max, salary_raw: pay.raw,
      description: describeOffer(o, company, i), description_html: null, posted_at: posted,
      first_seen_at: clock.at(Math.max(0, o.postedDaysAgo - 1), 10), last_seen_at: clock.at(seenAgo, 7),
      user_status: o.status, dedupe_key: `${o.co}|${slug(o.title)}|${slug(o.city)}`,
      created_at: clock.at(Math.max(0, o.postedDaysAgo - 1), 10), updated_at: clock.at(seenAgo, 7),
    });
    const sources: Array<[PlatformSlug, string]> = [[o.platform, `${externalId}`]];
    if (o.alsoOn) sources.push([o.alsoOn, `demo-${o.alsoOn}-${String(i + 1).padStart(4, '0')}`]);
    for (const [platform, ext] of sources) {
      tables.offer_sources.push({
        id: id('offer-source', `${i}:${platform}`), user_id: u, offer_id: oid, platform_slug: platform,
        external_id: ext, url: `https://${PLATFORM_HOST[platform]}/${ext}`, posted_at: posted,
        first_seen_at: clock.at(Math.max(0, o.postedDaysAgo - 1), 10), last_seen_at: clock.at(seenAgo, 7),
        created_at: clock.at(Math.max(0, o.postedDaysAgo - 1), 10),
      });
    }
  }

  // ---- applications, documents sent, interviews -----------------------------
  const applicationIds: string[] = [];
  for (const [i, a] of APPLICATIONS.entries()) {
    const offer = a.offer !== undefined ? OFFERS[a.offer] : null;
    const coKey = offer ? offer.co : a.co!;
    const title = offer ? offer.title : a.title!;
    const city = offer ? offer.city : a.city!;
    const aid = id('application', String(i));
    applicationIds.push(aid);
    tables.applications.push({
      id: aid, user_id: u, offer_id: a.offer !== undefined ? offerIds[a.offer] : null,
      profile_id: a.profile === 'researcher' ? profileResearcher : profileDesigner, company_id: companyId(coKey),
      job_title: title, applied_at: clock.at(a.appliedDaysAgo, 10), status: a.status,
      cover_letter: null, notes: a.notes,
      url: offer ? `https://${PLATFORM_HOST[offer.platform]}/demo-${offer.platform}-${String(a.offer! + 1).padStart(4, '0')}` : null,
      location: offer && offer.remote === 'remote' ? 'Télétravail (France)' : `${city}, France`,
      deadline_at: a.deadlineInDays !== undefined ? clock.at(a.deadlineInDays, 18) : null,
      responded_at: a.respondedDaysAgo !== undefined ? clock.at(a.respondedDaysAgo, 15) : null,
      created_at: clock.at(a.appliedDaysAgo, 10), updated_at: clock.at(a.respondedDaysAgo ?? a.appliedDaysAgo, 15),
    });
    for (const d of a.docs) {
      tables.application_documents.push({
        application_id: aid, document_id: docId(d), user_id: u, created_at: clock.at(a.appliedDaysAgo, 10),
      });
    }
  }
  for (const [i, iv] of INTERVIEWS.entries()) {
    const upcoming = iv.daysAgo < 0;
    tables.interviews.push({
      id: id('interview', String(i)), user_id: u, application_id: applicationIds[iv.app], stage: iv.stage,
      scheduled_at: clock.at(iv.daysAgo, iv.hour, iv.minute),
      completed_at: upcoming ? null : clock.at(iv.daysAgo, iv.hour + 1, iv.minute),
      outcome: iv.outcome, notes: iv.notes,
      created_at: clock.at(upcoming ? 5 : iv.daysAgo + 3, 9), updated_at: clock.at(Math.max(0, iv.daysAgo), 12),
    });
  }

  const account: DemoAccount = {
    first_name: PERSONA.firstName, last_name: PERSONA.lastName, full_name: `${PERSONA.firstName} ${PERSONA.lastName}`,
    locale: 'fr', theme_mode: 'system', plan: 'max', selected_plan: 'max', onboarded_at: clock.at(58, 9),
    availability: 'open', current_place: { label: PERSONA.location }, linkedin_url: PERSONA.linkedin,
    website_url: PERSONA.portfolio, phone_number: PERSONA.phone, writing_style: {},
  };

  return { anchor, account, tables, searchNoGos, files };
}

/** Row counts per table, for dry runs and docs. */
export function summarize(dataset: DemoDataset): Record<string, number> {
  const out: Record<string, number> = { accounts: 1 };
  for (const table of DEMO_TABLES) out[table] = dataset.tables[table].length;
  out.search_no_gos = dataset.searchNoGos.length;
  out.storage_files = dataset.files.length;
  return out;
}

/**
 * Raw content of the demo account. Everything here is fictional: the persona,
 * the companies, the offers and the people. Company names are invented and any
 * resemblance to a real organisation is a coincidence. Companies have no domain
 * (so no logo is fetched for them) and every URL uses a reserved `.example`
 * host. Dates are not written here: entries carry day offsets that
 * `buildDemoDataset` turns into dates around an anchor day.
 */

export type CompanySize = 'startup' | 'scale-up' | 'midsize' | 'large';
export type RemoteMode = 'onsite' | 'hybrid' | 'remote';
export type OfferStatus = 'new' | 'viewed' | 'passed' | 'applied';
export type ApplicationStatus = 'waiting' | 'interviewing' | 'accepted' | 'rejected' | 'ghosted' | 'withdrawn';
export type InterviewStage = 'HR' | 'Manager' | 'Design Case' | 'Team-Fit' | 'Technical' | 'Final' | 'Other';
export type InterviewOutcome = 'pending' | 'passed' | 'failed' | 'ghosted';
export type OfferCategory = 'product' | 'research' | 'system' | 'lead' | 'content' | 'motion' | 'service' | 'freelance';

export interface CompanyFixture {
  key: string;
  name: string;
  sector: string;
  size: CompanySize;
  headquarters: string;
  description: string;
}

export const COMPANIES: readonly CompanyFixture[] = [
  { key: 'fleur', name: 'Fleurimont Studio', sector: 'Design', size: 'midsize', headquarters: 'Paris, France', description: 'Agence de design produit pour les scale-ups et les institutions.' },
  { key: 'nord', name: 'Nordique Labs', sector: 'SaaS', size: 'scale-up', headquarters: 'Lille, France', description: 'Logiciel de pilotage de projets pour les équipes distribuées.' },
  { key: 'cabe', name: 'Cabestan', sector: 'FinTech', size: 'scale-up', headquarters: 'Paris, France', description: 'Gestion de trésorerie pour les PME.' },
  { key: 'vaga', name: 'Vagabond Cargo', sector: 'Logistique', size: 'midsize', headquarters: 'Marseille, France', description: 'Transport et suivi de marchandises en Méditerranée.' },
  { key: 'pixe', name: 'Pixelière', sector: 'EdTech', size: 'startup', headquarters: 'Lyon, France', description: 'Cours en ligne pour apprendre à coder dès le collège.' },
  { key: 'hexa', name: 'Hexamarée', sector: 'Énergie', size: 'large', headquarters: 'Nantes, France', description: "Production d'énergie marine et services aux collectivités." },
  { key: 'tour', name: 'Tournesol Santé', sector: 'HealthTech', size: 'scale-up', headquarters: 'Toulouse, France', description: 'Suivi à distance des patients atteints de maladies chroniques.' },
  { key: 'quil', name: 'Quillon', sector: 'SaaS', size: 'scale-up', headquarters: 'Bordeaux, France', description: "Plateforme d'emailing et d'automatisation marketing." },
  { key: 'brin', name: 'Brindille', sector: 'E-Commerce', size: 'scale-up', headquarters: 'Paris, France', description: "Place de marché d'objets de seconde main." },
  { key: 'sabl', name: 'Sablier Systèmes', sector: 'SaaS', size: 'midsize', headquarters: 'Grenoble, France', description: 'Logiciels de planification pour les ateliers industriels.' },
  { key: 'kera', name: 'Kéraunos', sector: 'Cybersécurité', size: 'scale-up', headquarters: 'Rennes, France', description: 'Détection des menaces pour les équipes sécurité.' },
  { key: 'alco', name: 'Maison Alcôve', sector: 'Retail', size: 'large', headquarters: 'Paris, France', description: "Mobilier et décoration, 40 boutiques et un site d'e-commerce." },
  { key: 'orbi', name: 'Orbitale Assurances', sector: 'InsurTech', size: 'large', headquarters: 'Paris, France', description: "Assurance habitation et mobilité 100 % en ligne." },
  { key: 'lumi', name: 'Lumina Mobilité', sector: 'Mobilité', size: 'scale-up', headquarters: 'Lyon, France', description: 'Application de trajets partagés et de vélos en libre-service.' },
  { key: 'gara', name: 'Garance & Co', sector: 'Conseil', size: 'midsize', headquarters: 'Lyon, France', description: 'Cabinet de conseil en transformation numérique.' },
  { key: 'zeph', name: 'Zéphyrine', sector: 'Voyage', size: 'scale-up', headquarters: 'Nice, France', description: "Réservation de séjours courts en France et en Europe." },
  { key: 'fabr', name: 'Fabrique Éclair', sector: 'Industrie 4.0', size: 'midsize', headquarters: 'Strasbourg, France', description: "Supervision d'usines connectées." },
  { key: 'coli', name: 'Colibri Climat', sector: 'ClimateTech', size: 'startup', headquarters: 'Paris, France', description: 'Mesure et réduction de l’empreinte carbone des entreprises.' },
  { key: 'nuag', name: 'Nuage Rouge', sector: 'Cloud', size: 'midsize', headquarters: 'Montpellier, France', description: 'Hébergement souverain pour les PME et les collectivités.' },
  { key: 'bons', name: 'Atelier Bonsoir', sector: 'Média', size: 'startup', headquarters: 'Paris, France', description: 'Podcasts et newsletters culturelles.' },
  { key: 'vers', name: 'Verso Habitat', sector: 'PropTech', size: 'scale-up', headquarters: 'Lyon, France', description: 'Gestion locative et travaux pour les copropriétés.' },
  { key: 'tama', name: 'Tamaris Data', sector: 'Data', size: 'scale-up', headquarters: 'Lille, France', description: 'Outils de visualisation de données pour les équipes métier.' },
  { key: 'ruch', name: 'Ruche Civique', sector: 'CivicTech', size: 'startup', headquarters: 'Paris, France', description: 'Consultations citoyennes et budgets participatifs.' },
  { key: 'pavi', name: 'Pavillon Numérique', sector: 'Secteur public', size: 'large', headquarters: 'Paris, France', description: 'Studio numérique au service des administrations.' },
  { key: 'sols', name: 'Solstice Games', sector: 'Jeux vidéo', size: 'midsize', headquarters: 'Montpellier, France', description: 'Jeux mobiles et narratifs.' },
  { key: 'banq', name: 'Banquise', sector: 'E-Commerce', size: 'scale-up', headquarters: 'Nantes, France', description: 'Épicerie en ligne livrée en 24 heures.' },
  { key: 'ondi', name: 'Ondine Paiements', sector: 'FinTech', size: 'scale-up', headquarters: 'Paris, France', description: 'Solutions de paiement pour les commerçants.' },
  { key: 'gran', name: 'Granit Robotique', sector: 'Robotique', size: 'midsize', headquarters: 'Toulouse, France', description: "Robots d'inspection pour les sites industriels." },
  { key: 'lacu', name: 'Lacustre RH', sector: 'HR Tech', size: 'startup', headquarters: 'Annecy, France', description: "Outil d'intégration et de suivi des nouvelles recrues." },
  { key: 'mosa', name: 'Mosaïque Culture', sector: 'Culture', size: 'startup', headquarters: 'Bordeaux, France', description: 'Billetterie et médiation numérique pour les musées.' },
  { key: 'eclo', name: 'Éclosion Biotech', sector: 'HealthTech', size: 'midsize', headquarters: 'Lyon, France', description: 'Logiciels pour les laboratoires de recherche.' },
  { key: 'trai', name: "Trait d'Union Conseil", sector: 'Conseil', size: 'midsize', headquarters: 'Paris, France', description: 'Conseil en design de services pour le secteur public.' },
  // Former employers of the persona (experiences only, no offer).
  { key: 'bore', name: 'Boréal Software', sector: 'SaaS', size: 'scale-up', headquarters: 'Lyon, France', description: 'Éditeur de logiciels de gestion pour les PME.' },
  { key: 'marm', name: 'Studio Marmelade', sector: 'Design', size: 'startup', headquarters: 'Lyon, France', description: 'Studio de design numérique.' },
  { key: 'fil', name: 'Agence Fil Rouge', sector: 'Communication', size: 'startup', headquarters: 'Lyon, France', description: 'Agence de communication digitale.' },
];

export type PlatformSlug =
  | 'linkedin'
  | 'indeed'
  | 'glassdoor'
  | 'wttj'
  | 'hellowork'
  | 'jobsthatmakesense'
  | 'collectivework'
  | 'francetravail';

export type Contract = 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Apprentissage' | 'Alternance' | 'Bénévolat';
export type Level = 'entry' | 'mid' | 'senior' | 'lead';

export interface OfferFixture {
  co: string;
  title: string;
  /** City, as the Map geocodes it. */
  city: string;
  remote: RemoteMode;
  contract: Contract;
  level: Level;
  /** Yearly gross salary in thousands of euros, or a daily rate for freelance missions. */
  pay: readonly [number, number] | null;
  platform: PlatformSlug;
  /** Second platform the same offer is published on, if any. */
  alsoOn?: PlatformSlug;
  postedDaysAgo: number;
  status: OfferStatus;
  category: OfferCategory;
}

export const OFFERS: readonly OfferFixture[] = [
  /* 0 */ { co: 'fleur', title: 'Senior Product Designer', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [58, 68], platform: 'linkedin', alsoOn: 'wttj', postedDaysAgo: 3, status: 'new', category: 'product' },
  /* 1 */ { co: 'nord', title: 'Product Designer', city: 'Lille', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [46, 54], platform: 'wttj', postedDaysAgo: 19, status: 'applied', category: 'product' },
  /* 2 */ { co: 'cabe', title: 'Lead Product Designer', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'lead', pay: [72, 85], platform: 'linkedin', postedDaysAgo: 2, status: 'new', category: 'lead' },
  /* 3 */ { co: 'vaga', title: 'UX/UI Designer', city: 'Marseille', remote: 'onsite', contract: 'CDI', level: 'mid', pay: [40, 48], platform: 'hellowork', postedDaysAgo: 44, status: 'applied', category: 'product' },
  /* 4 */ { co: 'pixe', title: 'Product Designer', city: 'Lyon', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [45, 52], platform: 'wttj', alsoOn: 'linkedin', postedDaysAgo: 16, status: 'applied', category: 'product' },
  /* 5 */ { co: 'hexa', title: 'Designer UX/UI (H/F)', city: 'Nantes', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [42, 50], platform: 'francetravail', postedDaysAgo: 12, status: 'viewed', category: 'product' },
  /* 6 */ { co: 'tour', title: 'Product Designer, parcours patient', city: 'Toulouse', remote: 'remote', contract: 'CDI', level: 'senior', pay: [55, 65], platform: 'indeed', postedDaysAgo: 7, status: 'applied', category: 'product' },
  /* 7 */ { co: 'quil', title: 'Design System Designer', city: 'Bordeaux', remote: 'remote', contract: 'CDI', level: 'senior', pay: [55, 62], platform: 'wttj', postedDaysAgo: 8, status: 'applied', category: 'system' },
  /* 8 */ { co: 'brin', title: 'Product Designer Marketplace', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [50, 58], platform: 'linkedin', postedDaysAgo: 33, status: 'applied', category: 'product' },
  /* 9 */ { co: 'sabl', title: 'UX Researcher', city: 'Grenoble', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [44, 52], platform: 'glassdoor', postedDaysAgo: 10, status: 'applied', category: 'research' },
  /* 10 */ { co: 'kera', title: 'Product Designer', city: 'Rennes', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [46, 55], platform: 'indeed', postedDaysAgo: 1, status: 'new', category: 'product' },
  /* 11 */ { co: 'alco', title: 'Designer UX Retail', city: 'Paris', remote: 'onsite', contract: 'CDD', level: 'mid', pay: [38, 44], platform: 'hellowork', postedDaysAgo: 15, status: 'passed', category: 'product' },
  /* 12 */ { co: 'orbi', title: 'Senior UX Designer', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [56, 66], platform: 'linkedin', postedDaysAgo: 24, status: 'applied', category: 'product' },
  /* 13 */ { co: 'lumi', title: 'Product Designer Mobilité', city: 'Lyon', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [46, 54], platform: 'wttj', postedDaysAgo: 38, status: 'applied', category: 'product' },
  /* 14 */ { co: 'gara', title: 'Consultant UX Design', city: 'Lyon', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [44, 50], platform: 'indeed', postedDaysAgo: 20, status: 'new', category: 'service' },
  /* 15 */ { co: 'zeph', title: 'Product Designer Voyage', city: 'Nice', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [42, 50], platform: 'hellowork', postedDaysAgo: 42, status: 'applied', category: 'product' },
  /* 16 */ { co: 'fabr', title: 'UX Designer B2B industriel', city: 'Strasbourg', remote: 'onsite', contract: 'CDI', level: 'mid', pay: [43, 50], platform: 'glassdoor', postedDaysAgo: 14, status: 'new', category: 'product' },
  /* 17 */ { co: 'coli', title: 'Product Designer Climat', city: 'Paris', remote: 'remote', contract: 'CDI', level: 'mid', pay: [48, 56], platform: 'jobsthatmakesense', alsoOn: 'wttj', postedDaysAgo: 5, status: 'applied', category: 'product' },
  /* 18 */ { co: 'nuag', title: 'Designer Produit', city: 'Montpellier', remote: 'remote', contract: 'CDI', level: 'mid', pay: [45, 52], platform: 'wttj', postedDaysAgo: 13, status: 'viewed', category: 'product' },
  /* 19 */ { co: 'bons', title: 'Motion & Product Designer', city: 'Paris', remote: 'hybrid', contract: 'CDD', level: 'mid', pay: [40, 46], platform: 'linkedin', postedDaysAgo: 17, status: 'passed', category: 'motion' },
  /* 20 */ { co: 'vers', title: 'UX/UI Designer PropTech', city: 'Lyon', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [44, 51], platform: 'hellowork', postedDaysAgo: 3, status: 'new', category: 'product' },
  /* 21 */ { co: 'tama', title: 'Product Designer Data', city: 'Lille', remote: 'remote', contract: 'CDI', level: 'senior', pay: [54, 63], platform: 'linkedin', postedDaysAgo: 13, status: 'applied', category: 'product' },
  /* 22 */ { co: 'ruch', title: 'Service Designer', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [45, 52], platform: 'jobsthatmakesense', postedDaysAgo: 9, status: 'viewed', category: 'service' },
  /* 23 */ { co: 'pavi', title: "Designer d'interface", city: 'Paris', remote: 'onsite', contract: 'CDD', level: 'mid', pay: [41, 47], platform: 'francetravail', postedDaysAgo: 18, status: 'new', category: 'product' },
  /* 24 */ { co: 'sols', title: 'UX Designer Jeux', city: 'Montpellier', remote: 'onsite', contract: 'CDI', level: 'mid', pay: [40, 48], platform: 'indeed', postedDaysAgo: 22, status: 'passed', category: 'product' },
  /* 25 */ { co: 'banq', title: 'Product Designer E-commerce', city: 'Nantes', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [52, 60], platform: 'linkedin', postedDaysAgo: 2, status: 'new', category: 'product' },
  /* 26 */ { co: 'ondi', title: 'Product Designer Paiements', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [60, 72], platform: 'wttj', postedDaysAgo: 6, status: 'applied', category: 'product' },
  /* 27 */ { co: 'gran', title: 'UX Designer Robotique', city: 'Toulouse', remote: 'onsite', contract: 'CDI', level: 'mid', pay: [45, 53], platform: 'glassdoor', postedDaysAgo: 16, status: 'new', category: 'product' },
  /* 28 */ { co: 'lacu', title: 'Content Designer', city: 'Annecy', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [42, 49], platform: 'linkedin', postedDaysAgo: 40, status: 'viewed', category: 'content' },
  /* 29 */ { co: 'mosa', title: 'Product Designer Culture', city: 'Bordeaux', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [41, 48], platform: 'wttj', postedDaysAgo: 21, status: 'new', category: 'product' },
  /* 30 */ { co: 'eclo', title: 'UX Designer Biotech', city: 'Lyon', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [52, 60], platform: 'indeed', postedDaysAgo: 15, status: 'applied', category: 'product' },
  /* 31 */ { co: 'trai', title: 'Senior Service Designer', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [58, 66], platform: 'linkedin', postedDaysAgo: 6, status: 'new', category: 'service' },
  /* 32 */ { co: 'nord', title: 'UX Researcher', city: 'Lille', remote: 'remote', contract: 'CDI', level: 'mid', pay: [44, 50], platform: 'wttj', postedDaysAgo: 3, status: 'new', category: 'research' },
  /* 33 */ { co: 'fleur', title: 'Freelance Product Designer', city: 'Paris', remote: 'remote', contract: 'Freelance', level: 'senior', pay: [500, 600], platform: 'collectivework', postedDaysAgo: 4, status: 'new', category: 'freelance' },
  /* 34 */ { co: 'cabe', title: 'Design Ops Manager', city: 'Paris', remote: 'hybrid', contract: 'CDI', level: 'senior', pay: [62, 74], platform: 'linkedin', postedDaysAgo: 10, status: 'viewed', category: 'lead' },
  /* 35 */ { co: 'pixe', title: 'Freelance UX Researcher', city: 'Lyon', remote: 'remote', contract: 'Freelance', level: 'mid', pay: [420, 520], platform: 'collectivework', postedDaysAgo: 7, status: 'new', category: 'freelance' },
  /* 36 */ { co: 'sabl', title: 'Product Designer', city: 'Grenoble', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [45, 52], platform: 'francetravail', postedDaysAgo: 19, status: 'new', category: 'product' },
  /* 37 */ { co: 'coli', title: 'Mission Design Lead (6 mois)', city: 'Paris', remote: 'remote', contract: 'Freelance', level: 'lead', pay: [600, 700], platform: 'collectivework', postedDaysAgo: 2, status: 'new', category: 'freelance' },
  /* 38 */ { co: 'hexa', title: 'Stage Product Design', city: 'Nantes', remote: 'onsite', contract: 'Stage', level: 'entry', pay: null, platform: 'hellowork', postedDaysAgo: 26, status: 'passed', category: 'product' },
  /* 39 */ { co: 'kera', title: 'Product Designer, équipe Plateforme', city: 'Rennes', remote: 'hybrid', contract: 'CDI', level: 'mid', pay: [48, 56], platform: 'hellowork', postedDaysAgo: 9, status: 'new', category: 'product' },
];

export interface ApplicationFixture {
  /** Index into OFFERS when the application comes from a collected offer. */
  offer?: number;
  /** Company and title for applications logged by hand (no offer). */
  co?: string;
  title?: string;
  city?: string;
  status: ApplicationStatus;
  appliedDaysAgo: number;
  /** UX Researcher applications use the second profile. */
  profile?: 'designer' | 'researcher';
  respondedDaysAgo?: number;
  /** Negative = in the future. */
  deadlineInDays?: number;
  notes: string;
  /** Documents sent along: keys of DOCUMENTS. */
  docs: readonly string[];
}

export const APPLICATIONS: readonly ApplicationFixture[] = [
  { offer: 1, status: 'interviewing', appliedDaysAgo: 18, respondedDaysAgo: 14, notes: "Équipe de 4 designers, forte culture de l'écrit. Contact : la responsable design (prénom fictif : Inès).", docs: ['cvFr', 'letterDirect'] },
  { offer: 3, status: 'ghosted', appliedDaysAgo: 41, respondedDaysAgo: 38, notes: "Un premier appel RH, puis plus aucune nouvelle malgré deux relances.", docs: ['cvFr'] },
  { offer: 4, status: 'interviewing', appliedDaysAgo: 14, respondedDaysAgo: 11, notes: "Produit que j'utilise déjà. Préparer un retour critique sur l'onboarding.", docs: ['cvFr', 'letterWarm', 'portfolio'] },
  { offer: 6, status: 'waiting', appliedDaysAgo: 5, deadlineInDays: -5, notes: "Exercice à rendre avant la date limite si on me le demande.", docs: ['cvFr', 'letterDirect'] },
  { offer: 7, status: 'waiting', appliedDaysAgo: 6, notes: 'Poste 100 % télétravail. Relancer dans une semaine.', docs: ['cvFr', 'portfolio'] },
  { offer: 8, status: 'rejected', appliedDaysAgo: 30, respondedDaysAgo: 12, notes: "Refus après l'étude de cas : ils cherchaient plus d'expérience en marketplace.", docs: ['cvFr', 'letterDirect'] },
  { offer: 9, status: 'waiting', appliedDaysAgo: 8, profile: 'researcher', notes: 'Candidature côté recherche utilisateur.', docs: ['cvFr'] },
  { offer: 12, status: 'interviewing', appliedDaysAgo: 20, respondedDaysAgo: 17, notes: "Trois étapes : RH, manager, étude de cas. Très bon feeling avec le manager.", docs: ['cvFr', 'letterWarm', 'portfolio'] },
  { offer: 13, status: 'accepted', appliedDaysAgo: 33, respondedDaysAgo: 30, notes: "Offre reçue : CDI, 52 k€ fixe. Réponse attendue sous 7 jours.", docs: ['cvFr', 'letterWarm'] },
  { offer: 15, status: 'ghosted', appliedDaysAgo: 38, notes: 'Aucune réponse après la candidature.', docs: ['cvFr'] },
  { offer: 17, status: 'waiting', appliedDaysAgo: 3, notes: "Mission qui a du sens, équipe de 12 personnes.", docs: ['cvFr', 'letterWarm'] },
  { offer: 21, status: 'interviewing', appliedDaysAgo: 11, respondedDaysAgo: 8, notes: 'Beaucoup de data-viz : revoir mes projets de tableaux de bord.', docs: ['cvFr', 'portfolio'] },
  { offer: 26, status: 'waiting', appliedDaysAgo: 4, notes: 'Poste senior, fourchette haute.', docs: ['cvFr', 'letterDirect'] },
  { offer: 30, status: 'withdrawn', appliedDaysAgo: 12, notes: "Retirée : le poste demandait de la présence 5 jours sur 5.", docs: ['cvFr'] },
  { co: 'gara', title: 'UX Designer', city: 'Lyon', status: 'waiting', appliedDaysAgo: 9, notes: 'Candidature spontanée envoyée après un événement local.', docs: ['cvFr', 'letterWarm'] },
  { co: 'trai', title: 'Consultant Design de services', city: 'Paris', status: 'rejected', appliedDaysAgo: 45, respondedDaysAgo: 30, notes: 'Candidature par recommandation. Profil jugé trop produit.', docs: ['cvFr'] },
  { co: 'bons', title: 'Product Designer', city: 'Paris', status: 'ghosted', appliedDaysAgo: 52, notes: 'Contact pris via une newsletter. Jamais de réponse.', docs: ['cvFr'] },
  { co: 'mosa', title: 'Designer produit', city: 'Bordeaux', status: 'rejected', appliedDaysAgo: 27, respondedDaysAgo: 20, notes: 'Retour rapide : budget gelé.', docs: ['cvFr'] },
  { co: 'banq', title: 'UX Designer', city: 'Nantes', status: 'withdrawn', appliedDaysAgo: 22, notes: "J'ai retiré ma candidature : déménagement non souhaité.", docs: ['cvFr'] },
  { co: 'lacu', title: 'Product Designer', city: 'Annecy', status: 'rejected', appliedDaysAgo: 36, respondedDaysAgo: 24, notes: "Refus après l'entretien manager : poste finalement pourvu en interne.", docs: ['cvFr', 'letterDirect'] },
];

export interface InterviewFixture {
  /** Index into APPLICATIONS. */
  app: number;
  stage: InterviewStage;
  /** Days before the anchor; negative = upcoming. */
  daysAgo: number;
  hour: number;
  minute: number;
  outcome: InterviewOutcome;
  notes: string;
}

export const INTERVIEWS: readonly InterviewFixture[] = [
  { app: 0, stage: 'HR', daysAgo: 10, hour: 10, minute: 0, outcome: 'passed', notes: 'Échange cordial de 30 minutes. Fourchette de salaire confirmée.' },
  { app: 0, stage: 'Design Case', daysAgo: -3, hour: 14, minute: 0, outcome: 'pending', notes: "Étude de cas de 2 h à distance. Apporter des exemples de parcours complexes." },
  { app: 2, stage: 'HR', daysAgo: 8, hour: 11, minute: 30, outcome: 'passed', notes: 'Appel avec la responsable recrutement.' },
  { app: 2, stage: 'Manager', daysAgo: -1, hour: 10, minute: 30, outcome: 'pending', notes: 'Visio avec la Head of Design. Préparer 2 projets à présenter.' },
  { app: 7, stage: 'HR', daysAgo: 15, hour: 9, minute: 30, outcome: 'passed', notes: 'Bon premier contact.' },
  { app: 7, stage: 'Manager', daysAgo: 9, hour: 16, minute: 0, outcome: 'passed', notes: 'Discussion sur la méthode de travail et la recherche utilisateur.' },
  { app: 7, stage: 'Design Case', daysAgo: -6, hour: 15, minute: 0, outcome: 'pending', notes: "Restitution devant l'équipe, 45 minutes." },
  { app: 11, stage: 'HR', daysAgo: 4, hour: 14, minute: 0, outcome: 'passed', notes: 'Échange court, ils veulent voir mon portfolio.' },
  { app: 11, stage: 'Team-Fit', daysAgo: -9, hour: 11, minute: 0, outcome: 'pending', notes: "Rencontre avec trois designers de l'équipe." },
  { app: 8, stage: 'HR', daysAgo: 28, hour: 10, minute: 0, outcome: 'passed', notes: 'Très bonne ambiance.' },
  { app: 8, stage: 'Design Case', daysAgo: 22, hour: 14, minute: 0, outcome: 'passed', notes: "Étude de cas sur l'application de covoiturage : bons retours." },
  { app: 8, stage: 'Final', daysAgo: 16, hour: 15, minute: 30, outcome: 'passed', notes: 'Rencontre avec la direction produit, offre orale à la fin.' },
  { app: 5, stage: 'HR', daysAgo: 24, hour: 10, minute: 0, outcome: 'passed', notes: 'RAS.' },
  { app: 5, stage: 'Design Case', daysAgo: 18, hour: 14, minute: 0, outcome: 'failed', notes: "Pas assez d'expérience sur les places de marché, selon le retour reçu." },
  { app: 17, stage: 'HR', daysAgo: 20, hour: 9, minute: 0, outcome: 'failed', notes: 'Budget gelé.' },
  { app: 19, stage: 'HR', daysAgo: 30, hour: 11, minute: 0, outcome: 'passed', notes: 'Poste orienté contenu.' },
  { app: 19, stage: 'Manager', daysAgo: 26, hour: 11, minute: 0, outcome: 'failed', notes: 'Poste pourvu en interne.' },
  { app: 1, stage: 'HR', daysAgo: 35, hour: 15, minute: 0, outcome: 'ghosted', notes: "Entretien passé, plus aucune nouvelle ensuite." },
];

export type DocumentKey = 'cvFr' | 'cvEn' | 'letterDirect' | 'letterWarm' | 'portfolio' | 'certificate';

export interface DocumentFixture {
  key: DocumentKey;
  kind: 'cv' | 'fit_message' | 'other';
  name: string;
  file: string | null;
  isPrimary: boolean;
  createdDaysAgo: number;
  text: string;
}

export const DOCUMENTS: readonly DocumentFixture[] = [
  { key: 'cvFr', kind: 'cv', name: 'CV - Camille Aubert - Product Designer (FR)', file: 'demo-cv-fr.pdf', isPrimary: true, createdDaysAgo: 40, text: 'Camille Aubert, Product Designer. 6 ans d’expérience en design produit B2B et B2C. Boréal Software (2023-aujourd’hui), Studio Marmelade (2020-2023). Figma, design systems, recherche utilisateur, accessibilité.' },
  { key: 'cvEn', kind: 'cv', name: 'Resume - Camille Aubert - Product Designer (EN)', file: 'demo-cv-en.pdf', isPrimary: false, createdDaysAgo: 40, text: 'Camille Aubert, Product Designer. Six years of experience in B2B and B2C product design. Boréal Software (2023-present), Studio Marmelade (2020-2023). Figma, design systems, user research, accessibility.' },
  { key: 'letterDirect', kind: 'fit_message', name: 'Message de motivation - ton direct', file: null, isPrimary: true, createdDaysAgo: 38, text: "Bonjour,\n\nJe conçois des produits numériques depuis six ans, avec une préférence pour les problèmes où la complexité est réelle : parcours longs, données denses, utilisateurs experts. Chez Boréal Software, j'ai mené la refonte du module de facturation, qui a réduit de moitié les tickets de support liés. Je serais heureuse d'en discuter avec vous.\n\nCamille" },
  { key: 'letterWarm', kind: 'fit_message', name: 'Message de motivation - ton chaleureux', file: null, isPrimary: false, createdDaysAgo: 37, text: "Bonjour,\n\nVotre produit m'a donné envie de postuler : on sent le soin apporté aux détails. J'aime travailler en petite équipe, avec des développeurs et des chefs de produit, et mettre les utilisateurs au centre des décisions. Je serais ravie de vous rencontrer.\n\nBien cordialement,\nCamille" },
  { key: 'portfolio', kind: 'other', name: 'Portfolio - sélection 2026', file: 'demo-portfolio.pdf', isPrimary: false, createdDaysAgo: 30, text: 'Sélection de quatre projets : refonte de la facturation, design system Palette, parcours patient, application de mobilité.' },
  { key: 'certificate', kind: 'other', name: 'Attestation accessibilité numérique', file: 'demo-certificate.pdf', isPrimary: false, createdDaysAgo: 120, text: 'Attestation de formation à l’accessibilité numérique (fictive).' },
];

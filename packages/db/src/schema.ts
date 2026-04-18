import { relations, sql } from 'drizzle-orm';
import {
  blob,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// =============================================================================
// Enum unions
//
// Philosophy: every constrained string column stores canonical English tokens,
// validated at write-time by a SQL CHECK constraint, and typed at compile-time
// by a TS string-literal union derived from the same `as const` array.
// Translation happens at render via `apps/web/src/lib/i18n.ts` — never in DB.
// =============================================================================

export const CONTRACT_VALUES = [
  'CDI',
  'CDD',
  'Stage',
  'Freelance',
  'Apprentissage',
] as const;
export type Contract = (typeof CONTRACT_VALUES)[number];

export const EXPERIENCE_LEVEL_VALUES = ['entry', 'mid', 'senior', 'lead'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVEL_VALUES)[number];

export const REMOTE_MODE_VALUES = ['onsite', 'hybrid', 'remote'] as const;
export type RemoteMode = (typeof REMOTE_MODE_VALUES)[number];

export const COMPANY_SIZE_VALUES = ['startup', 'scale-up', 'midsize', 'large'] as const;
export type CompanySize = (typeof COMPANY_SIZE_VALUES)[number];

export const APPLICATION_STATUS_VALUES = [
  'waiting',
  'interviewing',
  'accepted',
  'rejected',
  'ghosted',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number];

export const INTERVIEW_STAGE_VALUES = [
  'HR',
  'Manager',
  'Design Case',
  'Team-Fit',
  'Technical',
  'Final',
  'Other',
] as const;
export type InterviewStage = (typeof INTERVIEW_STAGE_VALUES)[number];

export const INTERVIEW_OUTCOME_VALUES = [
  'pending',
  'passed',
  'failed',
  'ghosted',
] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOME_VALUES)[number];

export const OFFER_USER_STATUS_VALUES = ['new', 'viewed', 'passed', 'applied'] as const;
export type OfferUserStatus = (typeof OFFER_USER_STATUS_VALUES)[number];

export const LOCALE_VALUES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALE_VALUES)[number];

export const THEME_MODE_VALUES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];

// -----------------------------------------------------------------------------
// Helpers to build CHECK constraints from the enum arrays above, so that the
// runtime SQL and the compile-time TS union cannot drift apart.
// -----------------------------------------------------------------------------

/** `column IN ('a','b','c')` — for NOT NULL enum columns. */
function inList(column: string, values: readonly string[]) {
  const quoted = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
  return sql.raw(`${column} IN (${quoted})`);
}

/** `column IS NULL OR column IN (...)` — for nullable enum columns. */
function nullableInList(column: string, values: readonly string[]) {
  const quoted = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
  return sql.raw(`${column} IS NULL OR ${column} IN (${quoted})`);
}

// =============================================================================
// platforms — scraping sources (LinkedIn, WTTJ, HelloWork, JobsThatMakeSense)
// =============================================================================

export const platforms = sqliteTable('platforms', {
  slug: text('slug').primaryKey(),
  label: text('label').notNull(),
  brandColor: text('brand_color'),
  loginUrl: text('login_url').notNull(),
});

// =============================================================================
// profiles — a job-search persona (e.g. "Product Designer", "Volunteer Numeric")
// =============================================================================

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  jobTitle: text('job_title').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// =============================================================================
// companies — deduped on `name` at scrape time
// =============================================================================

export const companies = sqliteTable(
  'companies',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    domain: text('domain'),
    linkedinHandle: text('linkedin_handle'),
    sector: text('sector'),
    size: text('size').$type<CompanySize>(),
    headquarters: text('headquarters'),
    description: text('description'),
    logoUrl: text('logo_url'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    sizeCheck: check('companies_size_check', nullableInList('size', COMPANY_SIZE_VALUES)),
  }),
);

// =============================================================================
// experiences — professional experiences attached to a profile
//
// `companyId` is nullable so the user can log freelance / personal / volunteer
// experiences that don't map to a scraped Company row.
// =============================================================================

export const experiences = sqliteTable(
  'experiences',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    companyId: text('company_id').references(() => companies.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    location: text('location'),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
    description: text('description'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    profileIdx: index('idx_experiences_profile').on(t.profileId),
    companyIdx: index('idx_experiences_company').on(t.companyId),
  }),
);

// =============================================================================
// no_gos — catalog of sectors / topics the user refuses to work in
//
// Stored canonically with both EN and FR labels baked in. `key` is the stable
// slug ("defense", "gambling") used for idempotent seeding of built-ins and
// referenced by the `search_no_gos` join table.
// =============================================================================

export const noGos = sqliteTable('no_gos', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  labelEn: text('label_en').notNull(),
  labelFr: text('label_fr').notNull(),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// =============================================================================
// searches — configured search criteria, one or more per profile
// =============================================================================

export const searches = sqliteTable(
  'searches',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    searchTitle: text('search_title').notNull(),
    location: text('location'),
    contractTypes: text('contract_types', { mode: 'json' }).$type<Contract[]>(),
    experienceLevels: text('experience_levels', { mode: 'json' }).$type<ExperienceLevel[]>(),
    remoteMode: text('remote_mode').$type<RemoteMode>(),
    salaryMinEur: integer('salary_min_eur'),
    salaryMaxEur: integer('salary_max_eur'),
    enabledPlatforms: text('enabled_platforms', { mode: 'json' }).$type<string[]>(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    profileIdx: index('idx_searches_profile').on(t.profileId),
    remoteModeCheck: check(
      'searches_remote_mode_check',
      nullableInList('remote_mode', REMOTE_MODE_VALUES),
    ),
  }),
);

// =============================================================================
// search_no_gos — many-to-many join between searches and the no-go catalog
// =============================================================================

export const searchNoGos = sqliteTable(
  'search_no_gos',
  {
    searchId: text('search_id')
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    noGoId: text('no_go_id')
      .notNull()
      .references(() => noGos.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.searchId, t.noGoId] }),
    noGoIdx: index('idx_search_no_gos_no_go').on(t.noGoId),
  }),
);

// =============================================================================
// offers — scraped job offers
//
// Identity: unique on `(platformSlug, externalId)` (primary dedup) AND on
// `(platformSlug, url)` (defense in depth — e.g. platforms that hide IDs).
// =============================================================================

export const offers = sqliteTable(
  'offers',
  {
    id: text('id').primaryKey(),
    platformSlug: text('platform_slug')
      .notNull()
      .references(() => platforms.slug, { onDelete: 'restrict' }),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    externalId: text('external_id').notNull(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    location: text('location').notNull(),
    remoteMode: text('remote_mode').$type<RemoteMode>(),
    contract: text('contract').$type<Contract>(),
    experienceLevel: text('experience_level').$type<ExperienceLevel>(),
    salaryMinEur: integer('salary_min_eur'),
    salaryMaxEur: integer('salary_max_eur'),
    salaryRaw: text('salary_raw'),
    description: text('description').notNull(),
    descriptionHtml: text('description_html'),
    postedAt: text('posted_at'),
    firstSeenAt: text('first_seen_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
    userStatus: text('user_status')
      .$type<OfferUserStatus>()
      .notNull()
      .default('new'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    externalUnique: uniqueIndex('ux_offers_platform_external').on(
      t.platformSlug,
      t.externalId,
    ),
    urlUnique: uniqueIndex('ux_offers_platform_url').on(t.platformSlug, t.url),
    companyIdx: index('idx_offers_company').on(t.companyId),
    userStatusIdx: index('idx_offers_user_status').on(t.userStatus),
    lastSeenIdx: index('idx_offers_last_seen').on(t.lastSeenAt),
    remoteModeCheck: check(
      'offers_remote_mode_check',
      nullableInList('remote_mode', REMOTE_MODE_VALUES),
    ),
    contractCheck: check(
      'offers_contract_check',
      nullableInList('contract', CONTRACT_VALUES),
    ),
    experienceLevelCheck: check(
      'offers_experience_level_check',
      nullableInList('experience_level', EXPERIENCE_LEVEL_VALUES),
    ),
    userStatusCheck: check(
      'offers_user_status_check',
      inList('user_status', OFFER_USER_STATUS_VALUES),
    ),
  }),
);

// =============================================================================
// applications — candidatures
//
// `offerId` is nullable so the user can log applications that didn't come from
// our scraper. `jobTitle` + `companyId` are dénormalisés (we always want them
// readable even if an offer row is later pruned).
// The unique index on `offerId` enforces "at most one application per offer",
// while still allowing multiple rows with NULL (several off-scrape applications).
// =============================================================================

export const applications = sqliteTable(
  'applications',
  {
    id: text('id').primaryKey(),
    offerId: text('offer_id').references(() => offers.id, { onDelete: 'set null' }),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    jobTitle: text('job_title').notNull(),
    appliedAt: text('applied_at').notNull(),
    status: text('status').$type<ApplicationStatus>().notNull(),
    coverLetter: text('cover_letter'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    offerUnique: uniqueIndex('ux_applications_offer').on(t.offerId),
    profileIdx: index('idx_applications_profile').on(t.profileId),
    companyIdx: index('idx_applications_company').on(t.companyId),
    statusIdx: index('idx_applications_status').on(t.status),
    statusCheck: check(
      'applications_status_check',
      inList('status', APPLICATION_STATUS_VALUES),
    ),
  }),
);

// =============================================================================
// interviews — entretiens liés à une candidature
// =============================================================================

export const interviews = sqliteTable(
  'interviews',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    stage: text('stage').$type<InterviewStage>().notNull(),
    scheduledAt: text('scheduled_at'),
    completedAt: text('completed_at'),
    outcome: text('outcome').$type<InterviewOutcome>(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    applicationIdx: index('idx_interviews_application').on(t.applicationId),
    stageCheck: check('interviews_stage_check', inList('stage', INTERVIEW_STAGE_VALUES)),
    outcomeCheck: check(
      'interviews_outcome_check',
      nullableInList('outcome', INTERVIEW_OUTCOME_VALUES),
    ),
  }),
);

// =============================================================================
// platform_connections — per-platform auth state (cookies, last scrape)
//
// Kept here (rather than in a future Integrations plan) to avoid an extra
// migration later. `cookieBlob` will eventually hold encrypted cookies;
// `cookieFilePath` is the v1 fallback that points at a file on disk.
// =============================================================================

export const platformConnections = sqliteTable('platform_connections', {
  platformSlug: text('platform_slug')
    .primaryKey()
    .references(() => platforms.slug, { onDelete: 'cascade' }),
  connectedAt: text('connected_at'),
  lastScrapedAt: text('last_scraped_at'),
  cookieBlob: blob('cookie_blob'),
  cookieFilePath: text('cookie_file_path'),
});

// =============================================================================
// settings — single-row user settings (`id = 'default'`)
// =============================================================================

export const settings = sqliteTable(
  'settings',
  {
    id: text('id').primaryKey().default('default'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    avatarUrl: text('avatar_url'),
    email: text('email'),
    linkedinUrl: text('linkedin_url'),
    defaultProfileId: text('default_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    locale: text('locale').$type<Locale>().notNull().default('fr'),
    themeMode: text('theme_mode').$type<ThemeMode>().notNull().default('system'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    localeCheck: check('settings_locale_check', inList('locale', LOCALE_VALUES)),
    themeModeCheck: check(
      'settings_theme_mode_check',
      inList('theme_mode', THEME_MODE_VALUES),
    ),
  }),
);

// =============================================================================
// Relations (for Drizzle's `db.query.*` relational API)
// =============================================================================

export const profilesRelations = relations(profiles, ({ many }) => ({
  experiences: many(experiences),
  searches: many(searches),
  applications: many(applications),
}));

export const experiencesRelations = relations(experiences, ({ one }) => ({
  profile: one(profiles, {
    fields: [experiences.profileId],
    references: [profiles.id],
  }),
  company: one(companies, {
    fields: [experiences.companyId],
    references: [companies.id],
  }),
}));

export const searchesRelations = relations(searches, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [searches.profileId],
    references: [profiles.id],
  }),
  noGos: many(searchNoGos),
}));

export const noGosRelations = relations(noGos, ({ many }) => ({
  searches: many(searchNoGos),
}));

export const searchNoGosRelations = relations(searchNoGos, ({ one }) => ({
  search: one(searches, {
    fields: [searchNoGos.searchId],
    references: [searches.id],
  }),
  noGo: one(noGos, {
    fields: [searchNoGos.noGoId],
    references: [noGos.id],
  }),
}));

export const platformsRelations = relations(platforms, ({ many, one }) => ({
  offers: many(offers),
  connection: one(platformConnections),
}));

export const platformConnectionsRelations = relations(
  platformConnections,
  ({ one }) => ({
    platform: one(platforms, {
      fields: [platformConnections.platformSlug],
      references: [platforms.slug],
    }),
  }),
);

export const companiesRelations = relations(companies, ({ many }) => ({
  offers: many(offers),
  applications: many(applications),
  experiences: many(experiences),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  platform: one(platforms, {
    fields: [offers.platformSlug],
    references: [platforms.slug],
  }),
  company: one(companies, {
    fields: [offers.companyId],
    references: [companies.id],
  }),
  application: one(applications, {
    fields: [offers.id],
    references: [applications.offerId],
  }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  offer: one(offers, {
    fields: [applications.offerId],
    references: [offers.id],
  }),
  profile: one(profiles, {
    fields: [applications.profileId],
    references: [profiles.id],
  }),
  company: one(companies, {
    fields: [applications.companyId],
    references: [companies.id],
  }),
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  application: one(applications, {
    fields: [interviews.applicationId],
    references: [applications.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  defaultProfile: one(profiles, {
    fields: [settings.defaultProfileId],
    references: [profiles.id],
  }),
}));

// =============================================================================
// Inferred row types — the single source of truth for TS consumers.
// Import these from `@apply/db` instead of re-declaring row shapes anywhere.
// =============================================================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Experience = typeof experiences.$inferSelect;
export type NewExperience = typeof experiences.$inferInsert;

export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;

export type NoGo = typeof noGos.$inferSelect;
export type NewNoGo = typeof noGos.$inferInsert;

export type SearchNoGo = typeof searchNoGos.$inferSelect;
export type NewSearchNoGo = typeof searchNoGos.$inferInsert;

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type NewPlatformConnection = typeof platformConnections.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

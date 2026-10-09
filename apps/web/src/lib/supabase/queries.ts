import type {
  Application,
  Company,
  Interview,
  Offer,
  Platform,
  Profile,
  Search,
} from '@apply/db/schema';
import type { ApplicationWithRelations, InterviewWithRelations } from '@apply/core/applications';
import type { OfferWithRelations } from '@apply/core/offers';
import { selectAll, selectById, selectIn } from './rows';
import type { SupabaseScope } from './scope';

/**
 * Read side of the data layer for signed-in users. Same return shapes as the
 * SQLite readers in `lib/*.ts`, so pages and components do not care where the
 * data comes from. Rows are scoped by Row Level Security; nothing here filters
 * by user.
 *
 * Related rows are joined in code rather than with PostgREST embeds: the
 * foreign keys are composite (id, user_id), which embeds resolve poorly.
 */

const byKey = <T>(rows: readonly T[], key: (row: T) => string) =>
  new Map(rows.map((row) => [key(row), row]));

// --- profiles, searches, companies, platforms ------------------------------

export const readProfiles = (s: SupabaseScope) =>
  selectAll<Profile>(s, 'profiles', { order: [['job_title', true]] });

export const readProfile = (s: SupabaseScope, id: string) => selectById<Profile>(s, 'profiles', id);

export const readSearches = (s: SupabaseScope) =>
  selectAll<Search>(s, 'searches', {
    order: [
      ['profile_id', true],
      ['search_title', true],
    ],
  });

export const readSearch = (s: SupabaseScope, id: string) => selectById<Search>(s, 'searches', id);

export const readSearchesForProfile = (s: SupabaseScope, profileId: string) =>
  selectAll<Search>(s, 'searches', {
    eq: { profile_id: profileId },
    order: [['search_title', true]],
  });

export const readCompanies = (s: SupabaseScope) =>
  selectAll<Company>(s, 'companies', { order: [['name', true]] });

export const readCompany = (s: SupabaseScope, id: string) => selectById<Company>(s, 'companies', id);

export const readPlatforms = (s: SupabaseScope) =>
  selectAll<Platform>(s, 'platforms', { order: [['slug', true]] });

// --- offers ----------------------------------------------------------------

async function withOfferRelations(s: SupabaseScope, offers: Offer[]): Promise<OfferWithRelations[]> {
  if (offers.length === 0) return [];
  const [companies, platforms] = await Promise.all([
    selectIn<Company>(s, 'companies', 'id', offers.map((o) => o.companyId)),
    readPlatforms(s),
  ]);
  const companyById = byKey(companies, (c) => c.id);
  const platformBySlug = byKey(platforms, (p) => p.slug);
  return offers.flatMap((offer) => {
    const company = companyById.get(offer.companyId);
    const platform = platformBySlug.get(offer.platformSlug);
    return company && platform ? [{ ...offer, company, platform }] : [];
  });
}

export async function readOffers(s: SupabaseScope): Promise<OfferWithRelations[]> {
  const offers = await selectAll<Offer>(s, 'offers', { order: [['last_seen_at', false]] });
  return withOfferRelations(s, offers);
}

export async function readOffer(s: SupabaseScope, id: string): Promise<OfferWithRelations | null> {
  const offer = await selectById<Offer>(s, 'offers', id);
  if (!offer) return null;
  const [withRelations] = await withOfferRelations(s, [offer]);
  return withRelations ?? null;
}

export async function readOffersScrapedAt(s: SupabaseScope): Promise<string | null> {
  const { data, error } = await s.supabase
    .from('offers')
    .select('last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Supabase offers: ${error.message}`);
  return (data?.last_seen_at as string | undefined) ?? null;
}

// --- applications and interviews -------------------------------------------

async function withApplicationRelations(
  s: SupabaseScope,
  applications: Application[],
): Promise<ApplicationWithRelations[]> {
  if (applications.length === 0) return [];
  const [companies, offers] = await Promise.all([
    selectIn<Company>(s, 'companies', 'id', applications.map((a) => a.companyId)),
    selectIn<Offer>(
      s,
      'offers',
      'id',
      applications.flatMap((a) => (a.offerId ? [a.offerId] : [])),
    ),
  ]);
  const companyById = byKey(companies, (c) => c.id);
  const offerById = byKey(offers, (o) => o.id);
  return applications.flatMap((application) => {
    const company = companyById.get(application.companyId);
    if (!company) return [];
    const offer = application.offerId ? (offerById.get(application.offerId) ?? null) : null;
    return [{ ...application, company, offer }];
  });
}

export async function readApplications(s: SupabaseScope): Promise<ApplicationWithRelations[]> {
  const applications = await selectAll<Application>(s, 'applications', {
    order: [['applied_at', false]],
  });
  return withApplicationRelations(s, applications);
}

export async function readApplication(
  s: SupabaseScope,
  id: string,
): Promise<ApplicationWithRelations | null> {
  const application = await selectById<Application>(s, 'applications', id);
  if (!application) return null;
  const [withRelations] = await withApplicationRelations(s, [application]);
  return withRelations ?? null;
}

async function withInterviewRelations(
  s: SupabaseScope,
  interviews: Interview[],
): Promise<InterviewWithRelations[]> {
  if (interviews.length === 0) return [];
  const applications = await selectIn<Application>(
    s,
    'applications',
    'id',
    interviews.map((i) => i.applicationId),
  );
  const companies = await selectIn<Company>(
    s,
    'companies',
    'id',
    applications.map((a) => a.companyId),
  );
  const companyById = byKey(companies, (c) => c.id);
  const applicationById = byKey(applications, (a) => a.id);
  return interviews.flatMap((interview) => {
    const application = applicationById.get(interview.applicationId);
    const company = application ? companyById.get(application.companyId) : undefined;
    return application && company ? [{ ...interview, application: { ...application, company } }] : [];
  });
}

export async function readInterviews(s: SupabaseScope): Promise<InterviewWithRelations[]> {
  const interviews = await selectAll<Interview>(s, 'interviews', {
    order: [['created_at', false]],
  });
  return withInterviewRelations(s, interviews);
}

export async function readInterview(
  s: SupabaseScope,
  id: string,
): Promise<InterviewWithRelations | null> {
  const interview = await selectById<Interview>(s, 'interviews', id);
  if (!interview) return null;
  const [withRelations] = await withInterviewRelations(s, [interview]);
  return withRelations ?? null;
}

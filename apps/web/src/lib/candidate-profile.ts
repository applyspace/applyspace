import { UUID_RE } from '@/lib/supabase/rows';
import type { SupabaseScope } from '@/lib/supabase/scope';
import {
  ACCOUNT_PLAN_VALUES,
  DOCUMENTS_BUCKET,
  type Account,
  type AccountPlan,
  type DocumentEntry,
  type DocumentKind,
  type DocumentUploadInput,
  type EducationEntry,
  type EducationInput,
  type ExperienceEntry,
  type ExperienceInput,
  type FirstSearchInput,
  type FitMessageInput,
  type SkillEntry,
  type SkillInput,
} from '@/types/candidate-profile';

/**
 * Candidate profile data for signed-in users: account, experiences, education,
 * skills and documents. Supabase only (there is no SQLite equivalent), so every
 * function takes the request's `SupabaseScope`; callers without a scope show a
 * read-only state instead. Rows are scoped by Row Level Security.
 *
 * Functions throw on a Supabase error (including "table does not exist" while
 * the migration is not applied). The server actions catch and report it.
 */

/** Profile created on the fly when the user adds profile data before naming a job. */
export const PLACEHOLDER_JOB_TITLE = 'My profile';

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase ${what}: ${result.error.message}`);
  return result.data;
}

const clean = (value: string | null | undefined) => (value ?? '').trim();
const orNull = (value: string | null | undefined) => clean(value) || null;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
/** `YYYY-MM` → `YYYY-MM-01`, or null when empty or malformed. */
export const monthToDate = (month: string | null | undefined) =>
  MONTH_RE.test(clean(month)) ? `${clean(month)}-01` : null;
/** `YYYY-MM-DD` → `YYYY-MM`. */
const dateToMonth = (date: string | null | undefined) => (date ? date.slice(0, 7) : '');

// --- account ---------------------------------------------------------------

type AccountRow = Record<string, unknown>;

function toAccount(row: AccountRow): Account {
  // Accounts created before first/last names existed only have `full_name`.
  const [fallbackFirst = '', ...fallbackRest] = String(row.full_name ?? '').split(' ');
  const plan = ACCOUNT_PLAN_VALUES.includes(row.plan as AccountPlan) ? (row.plan as AccountPlan) : 'free';
  return {
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    firstName: (row.first_name as string | null) ?? fallbackFirst,
    lastName: (row.last_name as string | null) ?? fallbackRest.join(' '),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    onboardedAt: (row.onboarded_at as string | null | undefined) ?? null,
    plan,
    hasOnboardingState: 'onboarded_at' in row,
  };
}

/**
 * The signed-in user's account row, created on first use if the sign-up
 * trigger never ran for them. Selects `*` so it keeps working before the
 * `onboarded_at` and `plan` columns exist.
 */
export async function getAccount({ supabase, user, userId }: SupabaseScope): Promise<Account> {
  const existing = must(
    await supabase.from('accounts').select('*').eq('id', userId).maybeSingle(),
    'accounts',
  );
  if (existing) return toAccount(existing as AccountRow);

  const meta = user.user_metadata ?? {};
  const created = must(
    await supabase
      .from('accounts')
      .insert({
        id: userId,
        email: user.email ?? null,
        full_name: meta.full_name ?? meta.name ?? null,
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
      })
      .select('*')
      .single(),
    'accounts',
  );
  return toAccount(created as AccountRow);
}

export async function updateAccountName(
  s: SupabaseScope,
  name: { firstName: string; lastName: string },
): Promise<void> {
  await getAccount(s); // makes sure the row exists
  const firstName = orNull(name.firstName);
  const lastName = orNull(name.lastName);
  must(
    await s.supabase
      .from('accounts')
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' ') || null,
      })
      .eq('id', s.userId),
    'accounts',
  );
}

/** Marks onboarding as finished (or skipped). Keeps the first date if called again. */
export async function markOnboarded(s: SupabaseScope): Promise<void> {
  await getAccount(s); // makes sure the row exists
  must(
    await s.supabase
      .from('accounts')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', s.userId)
      .is('onboarded_at', null),
    'accounts',
  );
}

/**
 * True when the user still has to go through onboarding. Never throws: if the
 * account cannot be read, or the `onboarded_at` column does not exist yet
 * (migration not applied), the user is treated as onboarded so the app keeps
 * working.
 */
export async function needsOnboarding(s: SupabaseScope): Promise<boolean> {
  try {
    const account = await getAccount(s);
    return account.hasOnboardingState && account.onboardedAt === null;
  } catch {
    return false;
  }
}

// --- default profile and first search ---------------------------------------

interface ProfileRef {
  id: string;
  job_title: string;
}

/** The default profile (`is_default`), else the oldest one. */
async function findDefaultProfile({ supabase }: SupabaseScope): Promise<ProfileRef | null> {
  const rows = must(
    await supabase
      .from('profiles')
      .select('id, job_title')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1),
    'profiles',
  );
  return (rows?.[0] as ProfileRef | undefined) ?? null;
}

/** Experiences, education and skills hang off the default profile; create it on first use. */
async function getOrCreateDefaultProfile(s: SupabaseScope, jobTitle?: string): Promise<ProfileRef> {
  const existing = await findDefaultProfile(s);
  if (existing) return existing;
  const created = must(
    await s.supabase
      .from('profiles')
      .insert({ user_id: s.userId, job_title: jobTitle || PLACEHOLDER_JOB_TITLE, is_default: true })
      .select('id, job_title')
      .single(),
    'profiles',
  );
  return created as ProfileRef;
}

/**
 * Creates the user's search profiles from onboarding: a default `profiles` row
 * named after the first target title (if there is none yet) and one `searches`
 * row per target title, all with the same criteria. The Free plan has a single
 * search profile, so only the first title is kept; Plus keeps them all. Called
 * again, it updates the matching searches instead of adding duplicates (the
 * database also refuses a second search on the Free plan).
 */
export async function saveFirstSearch(s: SupabaseScope, input: FirstSearchInput): Promise<void> {
  const titles = Array.from(new Set(input.titles.map(clean).filter(Boolean)));
  const [firstTitle] = titles;
  if (!firstTitle) throw new Error('A target job title is required');

  const { plan } = await getAccount(s);
  const toSave = plan === 'plus' ? titles : [firstTitle];

  const profile = await getOrCreateDefaultProfile(s, firstTitle);
  // A profile created earlier by the editor only has the placeholder title.
  if (profile.job_title === PLACEHOLDER_JOB_TITLE) {
    must(
      await s.supabase.from('profiles').update({ job_title: firstTitle }).eq('id', profile.id),
      'profiles',
    );
  }

  const values = {
    location: orNull(input.location),
    contract_types: input.contractTypes,
    experience_levels: input.experienceLevels,
  };
  const existing =
    must(
      await s.supabase
        .from('searches')
        .select('id, search_title')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: true }),
      'searches',
    ) ?? [];
  const rows = existing as { id: string; search_title: string }[];

  for (const [index, title] of toSave.entries()) {
    const match = rows.find((r) => r.search_title.toLowerCase() === title.toLowerCase());
    // On Free, the one search is renamed to the (possibly new) first title.
    const target = match ?? (plan === 'free' && index === 0 ? rows[0] : undefined);
    if (target) {
      must(
        await s.supabase.from('searches').update({ search_title: title, ...values }).eq('id', target.id),
        'searches',
      );
    } else {
      must(
        await s.supabase
          .from('searches')
          .insert({ user_id: s.userId, profile_id: profile.id, search_title: title, ...values }),
        'searches',
      );
    }
  }
}

// --- companies ---------------------------------------------------------------

/** Finds the user's company by name (case-insensitive) or creates it. */
async function findOrCreateCompany(s: SupabaseScope, rawName: string): Promise<string | null> {
  const name = clean(rawName);
  if (!name) return null;
  // `ilike` without wildcards is a case-insensitive equality; escape its metacharacters.
  const pattern = name.replace(/[\\%_]/g, (c) => `\\${c}`);
  const found = must(
    await s.supabase.from('companies').select('id').ilike('name', pattern).limit(1),
    'companies',
  );
  const existingId = (found?.[0] as { id: string } | undefined)?.id;
  if (existingId) return existingId;
  const created = must(
    await s.supabase.from('companies').insert({ user_id: s.userId, name }).select('id').single(),
    'companies',
  );
  return (created as { id: string }).id;
}

// --- experiences -------------------------------------------------------------

interface ExperienceRow {
  id: string;
  company_id: string | null;
  title: string;
  location: string | null;
  started_at: string;
  ended_at: string | null;
  is_current: boolean;
  description: string | null;
}

const EXPERIENCE_COLUMNS =
  'id, company_id, title, location, started_at, ended_at, is_current, description';

function toExperience(row: ExperienceRow, companyName: string): ExperienceEntry {
  return {
    id: row.id,
    title: row.title,
    companyId: row.company_id,
    companyName,
    location: row.location ?? '',
    startedAt: dateToMonth(row.started_at),
    endedAt: dateToMonth(row.ended_at),
    isCurrent: row.is_current,
    description: row.description ?? '',
  };
}

/** Experiences of the default profile, most recent first. */
export async function listExperiences(s: SupabaseScope): Promise<ExperienceEntry[]> {
  const profile = await findDefaultProfile(s);
  if (!profile) return [];
  const rows = (must(
    await s.supabase
      .from('experiences')
      .select(EXPERIENCE_COLUMNS)
      .eq('profile_id', profile.id)
      .order('is_current', { ascending: false })
      .order('started_at', { ascending: false }),
    'experiences',
  ) ?? []) as ExperienceRow[];

  const companyIds = Array.from(new Set(rows.flatMap((r) => (r.company_id ? [r.company_id] : []))));
  const companies = companyIds.length
    ? ((must(
        await s.supabase.from('companies').select('id, name').in('id', companyIds),
        'companies',
      ) ?? []) as Array<{ id: string; name: string }>)
    : [];
  const nameById = new Map(companies.map((c) => [c.id, c.name]));
  return rows.map((row) => toExperience(row, (row.company_id && nameById.get(row.company_id)) || ''));
}

export async function upsertExperience(
  s: SupabaseScope,
  input: ExperienceInput,
): Promise<ExperienceEntry> {
  const title = clean(input.title);
  const startedAt = monthToDate(input.startedAt);
  if (!title) throw new InvalidInputError('Add a job title.');
  if (!startedAt) throw new InvalidInputError('Add a start date.');
  const endedAt = input.isCurrent ? null : monthToDate(input.endedAt);
  if (endedAt && endedAt < startedAt) throw new InvalidInputError('The end date is before the start date.');

  const companyId = await findOrCreateCompany(s, input.companyName);
  const values = {
    company_id: companyId,
    title,
    location: orNull(input.location),
    started_at: startedAt,
    ended_at: endedAt,
    is_current: input.isCurrent,
    description: orNull(input.description),
  };

  const row = input.id
    ? must(
        await s.supabase
          .from('experiences')
          .update(values)
          .eq('id', requireId(input.id))
          .select(EXPERIENCE_COLUMNS)
          .single(),
        'experiences',
      )
    : must(
        await s.supabase
          .from('experiences')
          .insert({ user_id: s.userId, profile_id: (await getOrCreateDefaultProfile(s)).id, ...values })
          .select(EXPERIENCE_COLUMNS)
          .single(),
        'experiences',
      );
  return toExperience(row as ExperienceRow, clean(input.companyName));
}

export async function deleteExperience(s: SupabaseScope, id: string): Promise<void> {
  must(await s.supabase.from('experiences').delete().eq('id', requireId(id)), 'experiences');
}

// --- education ---------------------------------------------------------------

interface EducationRow {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  started_at: string | null;
  ended_at: string | null;
  description: string | null;
}

const EDUCATION_COLUMNS = 'id, school, degree, field, started_at, ended_at, description';

function toEducation(row: EducationRow): EducationEntry {
  return {
    id: row.id,
    school: row.school,
    degree: row.degree ?? '',
    field: row.field ?? '',
    startedAt: dateToMonth(row.started_at),
    endedAt: dateToMonth(row.ended_at),
    description: row.description ?? '',
  };
}

/** Education of the default profile, most recent first. */
export async function listEducation(s: SupabaseScope): Promise<EducationEntry[]> {
  // Query first so a missing table is reported even when there is no profile yet.
  const rows = (must(
    await s.supabase
      .from('education')
      .select(`${EDUCATION_COLUMNS}, profile_id`)
      .order('started_at', { ascending: false, nullsFirst: false }),
    'education',
  ) ?? []) as Array<EducationRow & { profile_id: string }>;
  const profile = await findDefaultProfile(s);
  return rows.filter((r) => r.profile_id === profile?.id).map(toEducation);
}

export async function upsertEducation(
  s: SupabaseScope,
  input: EducationInput,
): Promise<EducationEntry> {
  const school = clean(input.school);
  if (!school) throw new InvalidInputError('Add a school.');
  const startedAt = monthToDate(input.startedAt);
  const endedAt = monthToDate(input.endedAt);
  if (startedAt && endedAt && endedAt < startedAt) {
    throw new InvalidInputError('The end date is before the start date.');
  }
  const values = {
    school,
    degree: orNull(input.degree),
    field: orNull(input.field),
    started_at: startedAt,
    ended_at: endedAt,
    description: orNull(input.description),
  };
  const row = input.id
    ? must(
        await s.supabase
          .from('education')
          .update(values)
          .eq('id', requireId(input.id))
          .select(EDUCATION_COLUMNS)
          .single(),
        'education',
      )
    : must(
        await s.supabase
          .from('education')
          .insert({ user_id: s.userId, profile_id: (await getOrCreateDefaultProfile(s)).id, ...values })
          .select(EDUCATION_COLUMNS)
          .single(),
        'education',
      );
  return toEducation(row as EducationRow);
}

export async function deleteEducation(s: SupabaseScope, id: string): Promise<void> {
  must(await s.supabase.from('education').delete().eq('id', requireId(id)), 'education');
}

// --- skills ------------------------------------------------------------------

const SKILL_COLUMNS = 'id, name, level';

/** Skills of the default profile, alphabetical. */
export async function listSkills(s: SupabaseScope): Promise<SkillEntry[]> {
  const rows = (must(
    await s.supabase.from('skills').select(`${SKILL_COLUMNS}, profile_id`).order('name', { ascending: true }),
    'skills',
  ) ?? []) as Array<SkillEntry & { profile_id: string }>;
  const profile = await findDefaultProfile(s);
  return rows
    .filter((r) => r.profile_id === profile?.id)
    .map(({ id, name, level }) => ({ id, name, level }));
}

export async function upsertSkill(s: SupabaseScope, input: SkillInput): Promise<SkillEntry> {
  const name = clean(input.name);
  if (!name) throw new InvalidInputError('Add a skill name.');
  const values = { name, level: input.level };
  const result = input.id
    ? await s.supabase
        .from('skills')
        .update(values)
        .eq('id', requireId(input.id))
        .select(SKILL_COLUMNS)
        .single()
    : await s.supabase
        .from('skills')
        .insert({ user_id: s.userId, profile_id: (await getOrCreateDefaultProfile(s)).id, ...values })
        .select(SKILL_COLUMNS)
        .single();
  // 23505 = unique_violation on (profile_id, lower(name)).
  if (result.error?.code === '23505') throw new InvalidInputError(`"${name}" is already in your skills.`);
  return must(result, 'skills') as SkillEntry;
}

export async function deleteSkill(s: SupabaseScope, id: string): Promise<void> {
  must(await s.supabase.from('skills').delete().eq('id', requireId(id)), 'skills');
}

// --- documents ---------------------------------------------------------------

interface DocumentRow {
  id: string;
  kind: DocumentKind;
  name: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  is_primary: boolean;
  extracted_text: string | null;
  created_at: string;
}

const DOCUMENT_COLUMNS =
  'id, kind, name, storage_path, mime_type, size_bytes, is_primary, extracted_text, created_at';

function toDocument(row: DocumentRow): DocumentEntry {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    isPrimary: row.is_primary,
    extractedText: row.extracted_text,
    createdAt: row.created_at,
  };
}

/** Every document of the user, newest first. */
export async function listDocuments(s: SupabaseScope): Promise<DocumentEntry[]> {
  const rows = (must(
    await s.supabase.from('documents').select(DOCUMENT_COLUMNS).order('created_at', { ascending: false }),
    'documents',
  ) ?? []) as DocumentRow[];
  return rows.map(toDocument);
}

/**
 * Records a file already uploaded to the `documents` bucket by the browser.
 * The first document of a kind becomes the primary one.
 */
export async function insertDocument(
  s: SupabaseScope,
  input: DocumentUploadInput,
  extractedText: string | null,
): Promise<DocumentEntry> {
  // Storage RLS already confines uploads to the user's folder; never record a path outside it.
  if (!input.storagePath.startsWith(`${s.userId}/`)) throw new InvalidInputError('Invalid file path.');
  const others = must(
    await s.supabase.from('documents').select('id').eq('kind', input.kind).eq('is_primary', true).limit(1),
    'documents',
  );
  const row = must(
    await s.supabase
      .from('documents')
      .insert({
        user_id: s.userId,
        kind: input.kind,
        name: clean(input.name) || 'Document',
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        is_primary: (others ?? []).length === 0,
        extracted_text: extractedText,
      })
      .select(DOCUMENT_COLUMNS)
      .single(),
    'documents',
  );
  return toDocument(row as DocumentRow);
}

/** A pasted sample message (no file): the text lives in `extracted_text`. */
export async function upsertFitMessage(s: SupabaseScope, input: FitMessageInput): Promise<DocumentEntry> {
  const text = clean(input.text);
  if (!text) throw new InvalidInputError('Paste a message first.');
  const firstLine = text.split('\n')[0] ?? '';
  const values = {
    name: firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine,
    extracted_text: text,
    size_bytes: Buffer.byteLength(text, 'utf8'),
    mime_type: 'text/plain',
  };
  const row = input.id
    ? must(
        await s.supabase
          .from('documents')
          .update(values)
          .eq('id', requireId(input.id))
          .eq('kind', 'fit_message')
          .select(DOCUMENT_COLUMNS)
          .single(),
        'documents',
      )
    : must(
        await s.supabase
          .from('documents')
          .insert({ user_id: s.userId, kind: 'fit_message', ...values })
          .select(DOCUMENT_COLUMNS)
          .single(),
        'documents',
      );
  return toDocument(row as DocumentRow);
}

/** Makes one document the primary of its kind (e.g. the CV used by default). */
export async function setPrimaryDocument(s: SupabaseScope, id: string): Promise<void> {
  const target = must(
    await s.supabase.from('documents').select('id, kind').eq('id', requireId(id)).maybeSingle(),
    'documents',
  ) as { id: string; kind: DocumentKind } | null;
  if (!target) throw new InvalidInputError('This document no longer exists.');
  // Clear first: a partial unique index allows one primary per kind.
  must(
    await s.supabase
      .from('documents')
      .update({ is_primary: false })
      .eq('kind', target.kind)
      .eq('is_primary', true),
    'documents',
  );
  must(await s.supabase.from('documents').update({ is_primary: true }).eq('id', target.id), 'documents');
}

/** Deletes the row and its file. If it was the primary, the newest remaining one takes over. */
export async function deleteDocument(s: SupabaseScope, id: string): Promise<void> {
  const target = must(
    await s.supabase
      .from('documents')
      .select('id, kind, storage_path, is_primary')
      .eq('id', requireId(id))
      .maybeSingle(),
    'documents',
  ) as { id: string; kind: DocumentKind; storage_path: string | null; is_primary: boolean } | null;
  if (!target) return;

  must(await s.supabase.from('documents').delete().eq('id', target.id), 'documents');
  if (target.storage_path) {
    // Best effort: an orphaned file is harmless and stays private.
    await s.supabase.storage.from(DOCUMENTS_BUCKET).remove([target.storage_path]);
  }
  if (target.is_primary && target.kind !== 'fit_message') {
    const next = must(
      await s.supabase
        .from('documents')
        .select('id')
        .eq('kind', target.kind)
        .order('created_at', { ascending: false })
        .limit(1),
      'documents',
    );
    const nextId = (next?.[0] as { id: string } | undefined)?.id;
    if (nextId) {
      must(await s.supabase.from('documents').update({ is_primary: true }).eq('id', nextId), 'documents');
    }
  }
}

/** Downloads a file of the user from the `documents` bucket. */
export async function downloadDocument(s: SupabaseScope, storagePath: string): Promise<Buffer> {
  const { data, error } = await s.supabase.storage.from(DOCUMENTS_BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Supabase storage: ${error?.message ?? 'empty file'}`);
  return Buffer.from(await data.arrayBuffer());
}

// --- validation --------------------------------------------------------------

/** A problem with what the user typed; its message is safe to show as is. */
export class InvalidInputError extends Error {}

function requireId(id: string): string {
  if (!UUID_RE.test(id)) throw new InvalidInputError('Unknown item.');
  return id;
}

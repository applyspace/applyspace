import type { ExperienceLevel, Locale, RemoteMode } from '@apply/db';
import type { AppSettings } from '@/lib/settings';
import {
  experienceLevelsFromLabels,
  labelFromRemoteMode,
  labelsFromExperienceLevels,
  remoteModeFromLabels,
  slugify,
  toEur,
  toK,
} from '@/lib/settings-mapping';
import { selectIn } from '@/lib/supabase/rows';
import type { SupabaseScope } from '@/lib/supabase/scope';

/**
 * Settings for signed-in users, backed by `accounts`, `profiles`, `searches`
 * and `search_no_gos`. Mirrors the SQLite implementation in `lib/settings.ts`:
 * the flat `AppSettings` shape is composed from the default profile and its
 * first ("primary") search.
 */

interface SearchRow {
  id: string;
  search_title: string;
  location: string | null;
  contract_types: string[] | null;
  experience_levels: ExperienceLevel[] | null;
  remote_mode: RemoteMode | null;
  salary_min_eur: number | null;
  salary_max_eur: number | null;
}

interface ProfileRow {
  id: string;
  job_title: string;
}

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase ${what}: ${result.error.message}`);
  return result.data;
}

/** The default profile (`is_default`), else the oldest one. */
async function getDefaultProfile({ supabase }: SupabaseScope): Promise<ProfileRow | null> {
  const rows = must(
    await supabase
      .from('profiles')
      .select('id, job_title')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1),
    'profiles',
  );
  return (rows?.[0] as ProfileRow | undefined) ?? null;
}

async function getPrimarySearch(
  { supabase }: SupabaseScope,
  profileId: string,
): Promise<SearchRow | null> {
  const rows = must(
    await supabase
      .from('searches')
      .select(
        'id, search_title, location, contract_types, experience_levels, remote_mode, salary_min_eur, salary_max_eur',
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
      .limit(1),
    'searches',
  );
  return (rows?.[0] as SearchRow | undefined) ?? null;
}

export async function readSettings(s: SupabaseScope): Promise<AppSettings> {
  const { supabase, userId } = s;

  const account = must(
    await supabase
      .from('accounts')
      .select('first_name, last_name, full_name, locale')
      .eq('id', userId)
      .maybeSingle(),
    'accounts',
  );
  // Accounts created before first/last names existed only have `full_name`.
  const [fallbackFirst = '', ...fallbackRest] = (account?.full_name ?? '').split(' ');
  const firstName = account?.first_name ?? fallbackFirst;
  const lastName = account?.last_name ?? fallbackRest.join(' ');
  const locale: Locale = account?.locale === 'en' ? 'en' : 'fr';

  const profile = await getDefaultProfile(s);
  const search = profile ? await getPrimarySearch(s, profile.id) : null;

  const searchTitles = profile
    ? (
        must(
          await supabase
            .from('searches')
            .select('search_title')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: true }),
          'searches',
        ) ?? []
      ).map((r) => r.search_title as string)
    : [];

  let noGoLabels: string[] = [];
  if (search) {
    const links =
      must(
        await supabase.from('search_no_gos').select('no_go_id').eq('search_id', search.id),
        'search_no_gos',
      ) ?? [];
    const noGos = await selectIn<{ id: string; labelEn: string; labelFr: string }>(
      s,
      'no_gos',
      'id',
      links.map((l) => l.no_go_id as string),
    );
    noGoLabels = noGos.map((n) => (locale === 'fr' ? n.labelFr : n.labelEn));
  }

  return {
    firstName,
    lastName,
    jobTitle: profile?.job_title ?? '',
    location: search?.location ?? '',
    availability: '',
    searchTitles,
    contractTypes: search?.contract_types ?? [],
    experienceLevels: labelsFromExperienceLevels(search?.experience_levels),
    searchLocation: search?.location ?? '',
    companySizes: [],
    salaryMin: toK(search?.salary_min_eur),
    salaryMax: toK(search?.salary_max_eur),
    remotePreference: labelFromRemoteMode(search?.remote_mode ?? null),
    noGos: noGoLabels,
  };
}

export async function writeSettings(s: SupabaseScope, patch: Partial<AppSettings>): Promise<void> {
  const { supabase, userId, user } = s;

  // --- 1. Names live on the account -----------------------------------------
  if ('firstName' in patch || 'lastName' in patch) {
    const current = must(
      await supabase
        .from('accounts')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle(),
      'accounts',
    );
    const firstName = 'firstName' in patch ? (patch.firstName ?? null) : (current?.first_name ?? null);
    const lastName = 'lastName' in patch ? (patch.lastName ?? null) : (current?.last_name ?? null);
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
    const values = { first_name: firstName, last_name: lastName, full_name: fullName };
    if (current) {
      must(await supabase.from('accounts').update(values).eq('id', userId), 'accounts');
    } else {
      must(
        await supabase.from('accounts').insert({ id: userId, email: user.email ?? null, ...values }),
        'accounts',
      );
    }
  }

  // --- 2. Job title lives on the default profile (created on first use) -----
  const searchFields = [
    'searchLocation',
    'location',
    'contractTypes',
    'experienceLevels',
    'salaryMin',
    'salaryMax',
    'remotePreference',
  ] as const;
  const touchesSearch = searchFields.some((k) => k in patch);
  const touchesProfile = 'jobTitle' in patch;

  let profile = touchesProfile || touchesSearch || 'noGos' in patch ? await getDefaultProfile(s) : null;
  if (touchesProfile && profile) {
    must(
      await supabase
        .from('profiles')
        .update({ job_title: patch.jobTitle ?? '' })
        .eq('id', profile.id),
      'profiles',
    );
    profile = { ...profile, job_title: patch.jobTitle ?? '' };
  }
  if (!profile && (touchesSearch || (touchesProfile && patch.jobTitle))) {
    const created = must(
      await supabase
        .from('profiles')
        .insert({ user_id: userId, job_title: patch.jobTitle || 'My profile', is_default: true })
        .select('id, job_title')
        .single(),
      'profiles',
    );
    profile = created as ProfileRow;
  }
  if (!profile) return;

  // --- 3. Search criteria live on the primary search ------------------------
  let primary = await getPrimarySearch(s, profile.id);
  if (touchesSearch) {
    const values = {
      location:
        'searchLocation' in patch
          ? (patch.searchLocation ?? null)
          : 'location' in patch
            ? (patch.location ?? null)
            : (primary?.location ?? null),
      contract_types:
        'contractTypes' in patch ? (patch.contractTypes ?? []) : (primary?.contract_types ?? null),
      experience_levels:
        'experienceLevels' in patch
          ? experienceLevelsFromLabels(patch.experienceLevels ?? [])
          : (primary?.experience_levels ?? null),
      remote_mode:
        'remotePreference' in patch
          ? remoteModeFromLabels(patch.remotePreference ?? [])
          : (primary?.remote_mode ?? null),
      salary_min_eur: 'salaryMin' in patch ? toEur(patch.salaryMin) : (primary?.salary_min_eur ?? null),
      salary_max_eur: 'salaryMax' in patch ? toEur(patch.salaryMax) : (primary?.salary_max_eur ?? null),
    };
    if (primary) {
      must(await supabase.from('searches').update(values).eq('id', primary.id), 'searches');
    } else {
      const created = must(
        await supabase
          .from('searches')
          .insert({
            user_id: userId,
            profile_id: profile.id,
            search_title: profile.job_title || 'Search',
            ...values,
          })
          .select('id, search_title, location, contract_types, experience_levels, remote_mode, salary_min_eur, salary_max_eur')
          .single(),
        'searches',
      );
      primary = created as SearchRow;
    }
  }

  // --- 4. No-gos are a many-to-many on the primary search -------------------
  if ('noGos' in patch && primary) {
    await reconcileNoGos(s, primary.id, patch.noGos ?? []);
  }
}

/**
 * Matches submitted labels to existing `no_gos` (built-in or the user's own,
 * by EN or FR label) and creates custom ones for unknown labels, then rewrites
 * the join rows for the search.
 */
async function reconcileNoGos(
  { supabase, userId }: SupabaseScope,
  searchId: string,
  labels: readonly string[],
): Promise<void> {
  const visible = must(
    await supabase.from('no_gos').select('id, key, label_en, label_fr'),
    'no_gos',
  ) as Array<{ id: string; key: string; label_en: string; label_fr: string }>;

  const ids: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const match = visible.find((n) => n.label_fr === label || n.label_en === label);
    if (match) {
      ids.push(match.id);
      continue;
    }
    const key = slugify(label) || `custom-${Date.now().toString(36)}`;
    const created = must(
      await supabase
        .from('no_gos')
        .insert({ user_id: userId, key, label_en: label, label_fr: label, is_built_in: false })
        .select('id')
        .single(),
      'no_gos',
    );
    ids.push((created as { id: string }).id);
  }

  must(await supabase.from('search_no_gos').delete().eq('search_id', searchId), 'search_no_gos');
  const unique = Array.from(new Set(ids));
  if (unique.length > 0) {
    must(
      await supabase
        .from('search_no_gos')
        .insert(unique.map((no_go_id) => ({ user_id: userId, search_id: searchId, no_go_id }))),
      'search_no_gos',
    );
  }
}

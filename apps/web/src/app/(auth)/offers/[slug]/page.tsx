import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ContractsIcon,
  UserFullViewIcon,
  Money01Icon,
  Location06Icon,
  HomeWifiIcon,
  FilterHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { readOffers } from '@/lib/offers';
import { readSearches } from '@/lib/searches';
import { matchIdInSlug } from '@/lib/slug';
import { JobTable } from '@/components/jobs/JobTable';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Canonical DB tokens → display labels. Keys include both the current canonical
// values ('CDI', 'entry', 'hybrid'…) and legacy FR/EN strings still found in
// older data, so migrated rows keep rendering sensibly.
const CONTRACT_EN: Record<string, string> = {
  CDI: 'Permanent',
  CDD: 'Fixed-term',
  Stage: 'Internship',
  Freelance: 'Freelance',
  Apprentissage: 'Apprenticeship',
  'Full-Time': 'Permanent',
  'Part-Time': 'Fixed-term',
  Internship: 'Internship',
  Alternance: 'Apprenticeship',
  Bénévolat: 'Volunteering',
  Benevolat: 'Volunteering',
};

const LEVEL_EN: Record<string, string> = {
  entry: 'Junior',
  mid: 'Confirmed',
  senior: 'Senior',
  lead: 'Lead',
  Débutant: 'Junior',
  Confirmé: 'Confirmed',
  Sénior: 'Senior',
  Junior: 'Junior',
  Confirmed: 'Confirmed',
  Senior: 'Senior',
  Lead: 'Lead',
  Manager: 'Manager',
  Founding: 'Founding',
};

const REMOTE_EN: Record<string, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
  Télétravail: 'Remote',
  Teletravail: 'Remote',
  Hybride: 'Hybrid',
  Présentiel: 'On-site',
  Presentiel: 'On-site',
  Remote: 'Remote',
  Hybrid: 'Hybrid',
  'On-site': 'On-site',
  'On-Site': 'On-site',
};

function toEn(map: Record<string, string>) {
  return (raw: string) => map[raw] ?? raw;
}

export default async function SearchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [allOffers, searches] = await Promise.all([
    readOffers(),
    readSearches(),
  ]);

  const id = matchIdInSlug(
    slug,
    searches.map((s) => s.id)
  );
  const search = searches.find((s) => s.id === id);
  if (!search) notFound();

  // Show all scraped offers for this search — same content as the global /offers page.
  const offers = allOffers;

  // Chips come straight from the Search row, not from AppSettings — the
  // per-search criteria are the source of truth (global settings just seed
  // defaults when a search is first created).
  const salaryLabel = (() => {
    const min = search.salaryMinEur;
    const max = search.salaryMaxEur;
    if (min === null && max === null) return null;
    const minK = min !== null ? Math.round(min / 1000) : 0;
    if (max === null || max >= 120_000) return `${minK}k+`;
    const maxK = Math.round(max / 1000);
    return `${minK}k – ${maxK}k`;
  })();

  const contracts = [...new Set((search.contractTypes ?? []).map(toEn(CONTRACT_EN)))];
  const levels = [...new Set((search.experienceLevels ?? []).map(toEn(LEVEL_EN)))];
  const remotePref = search.remoteMode ? [toEn(REMOTE_EN)(search.remoteMode)] : [];

  const title = [search.searchTitle, search.location].filter(Boolean).join(', ');

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10">
        <div
          className="pointer-events-none absolute inset-0 backdrop-blur-lg"
          style={{
            maskImage: 'linear-gradient(to bottom, black 48%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 48%, transparent 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, var(--background) 48%, transparent 100%)',
          }}
        />

        <div className="relative px-20 py-12">
          <div className="flex items-start justify-between gap-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {offers.length}
                </span>
              </div>

              {(contracts.length > 0 || levels.length > 0 || salaryLabel) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {contracts.length > 0 && (
                    <CriteriaRow icon={ContractsIcon} label={contracts.join(', ')} />
                  )}
                  {levels.length > 0 && (
                    <CriteriaRow icon={UserFullViewIcon} label={levels.join(', ')} />
                  )}
                  {salaryLabel && <CriteriaRow icon={Money01Icon} label={salaryLabel} />}
                </div>
              )}

              {(search.location || remotePref.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {search.location && (
                    <CriteriaRow icon={Location06Icon} label={search.location} />
                  )}
                  {remotePref.length > 0 && (
                    <CriteriaRow icon={HomeWifiIcon} label={remotePref.join(', ')} />
                  )}
                </div>
              )}
            </div>

            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'mt-0.5 shrink-0 gap-1.5 text-muted-foreground'
              )}
            >
              <HugeiconsIcon icon={FilterHorizontalIcon} size={14} />
              Edit criteria
            </Link>
          </div>
        </div>
      </div>

      <div className="px-12 pb-16">
        <JobTable offers={offers} />
      </div>
    </div>
  );
}

function CriteriaRow({
  icon,
  label,
}: {
  icon: typeof ContractsIcon;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <HugeiconsIcon icon={icon} size={14} className="shrink-0" />
      {label}
    </span>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ContractsIcon,
  UserFullViewIcon,
  Money01Icon,
  UserMultipleIcon,
  Location06Icon,
  HomeWifiIcon,
  FilterHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { readJobs } from '@/lib/jobs';
import { readSettings } from '@/lib/settings';
import { readOfferGroups } from '@/lib/offer-groups';
import { matchIdInSlug } from '@/lib/slug';
import { JobTable } from '@/components/jobs/JobTable';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CONTRACT_EN: Record<string, string> = {
  CDI: 'Permanent',
  CDD: 'Fixed-term',
  'Full-Time': 'Permanent',
  'Part-Time': 'Fixed-term',
  Freelance: 'Freelance',
  Internship: 'Internship',
  Stage: 'Internship',
  Alternance: 'Apprenticeship',
  Bénévolat: 'Volunteering',
  Benevolat: 'Volunteering',
};

const LEVEL_EN: Record<string, string> = {
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

function mergeCompanySizes(sizes: string[]): string | null {
  if (!sizes.length) return null;
  let min = Infinity;
  for (const s of sizes) {
    const lower = s.startsWith('>')
      ? parseInt(s.slice(1))
      : parseInt(s.split('-')[0]);
    min = Math.min(min, isNaN(lower) ? 0 : lower);
  }
  return min === 0 ? '< 15' : `> ${min}`;
}

export default async function OfferGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ jobs: allJobs }, settings, offerGroups] = await Promise.all([
    readJobs(),
    readSettings(),
    readOfferGroups(),
  ]);

  const id = matchIdInSlug(
    slug,
    offerGroups.map((g) => g.id)
  );
  const group = offerGroups.find((g) => g.id === id);
  if (!group) notFound();

  // Show all scraped jobs for this offer group — same content as the global /offers page.
  const jobs = allJobs;

  const salaryLabel = (() => {
    const { salaryMin, salaryMax } = settings;
    if (salaryMin === null && salaryMax === null) return null;
    const min = salaryMin ?? 0;
    if (!salaryMax || salaryMax >= 120) return `${min}k+`;
    return `${min}k – ${salaryMax}k`;
  })();

  const contracts = [...new Set(settings.contractTypes.map(toEn(CONTRACT_EN)))];
  const levels = [...new Set(settings.experienceLevels.map(toEn(LEVEL_EN)))];
  const remotePref = [...new Set(settings.remotePreference.map(toEn(REMOTE_EN)))];
  const sizeLabel = mergeCompanySizes(settings.companySizes);

  const title = [group.searchTitle, group.location].filter(Boolean).join(', ');

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
                  {jobs.length}
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

              {(sizeLabel || group.location || remotePref.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {sizeLabel && <CriteriaRow icon={UserMultipleIcon} label={sizeLabel} />}
                  {group.location && (
                    <CriteriaRow icon={Location06Icon} label={group.location} />
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
        <JobTable jobs={jobs} />
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

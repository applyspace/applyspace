'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  PinLocation03Icon,
  InternetAntenna03Icon,
  FlashIcon,
  ArrowReloadHorizontalIcon,
  IncognitoIcon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons';
import { finishOnboardingV2 } from '@/app/onboarding/actions';
import { ApplyLogo } from '@/components/brand/ApplyLogo';
import { Button } from '@/components/ui/button';
import { ImportDropzone } from '@/components/onboarding/v2/ImportDropzone';
import { OptionRow } from '@/components/onboarding/v2/OptionRow';
import { ChoiceCard, TagSearch, toggle } from '@/components/onboarding/v2/fields';
import { CompanyStep, ContractStep } from '@/components/onboarding/v2/CriteriaSteps';
import { PlanStep } from '@/components/onboarding/v2/PlanStep';
import { PlatformsStep } from '@/components/onboarding/v2/PlatformsStep';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { suggestJobTitles, suggestPlaces } from '@/lib/suggest';
import { cn } from '@/lib/utils';

type Status = 'active' | 'passive' | 'incognito';
type Workplace = 'onsite' | 'hybrid' | 'remote';

const STATUSES = [
  { value: 'active', icon: FlashIcon, tone: 'amber', title: 'Actively looking', description: 'Prioritize new offers and send alerts.' },
  { value: 'passive', icon: SearchList01Icon, tone: 'sky', title: 'Passively browsing', description: 'Show only the best matches, fewer alerts.' },
  { value: 'incognito', icon: IncognitoIcon, tone: 'stone', title: 'Incognito', description: 'Not looking. No alerts, profile kept private.' },
] as const;

const LEVELS = ['Entry level', 'Junior', 'Mid-level', 'Senior', 'Lead or above'];
const WORKPLACES = [
  { value: 'onsite', icon: PinLocation03Icon, label: 'On-site' },
  { value: 'hybrid', icon: ArrowReloadHorizontalIcon, label: 'Hybrid' },
  { value: 'remote', icon: InternetAntenna03Icon, label: 'Remote' },
] as const;

/** Seniority indicator: five bars of rising height, the first `level` filled. */
function LevelBars({ level }: { level: number }) {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('w-1 rounded-full', i <= level ? 'bg-foreground' : 'bg-foreground/15')} style={{ height: `${40 + i * 12}%` }} />
      ))}
    </span>
  );
}

const STEPS = ['import', 'status', 'role', 'location', 'contract', 'company', 'platforms', 'plan'] as const;
type Step = (typeof STEPS)[number];

/** Why Next is disabled, shown above it. Steps that are always complete have no hint. */
const NEXT_HINTS: Partial<Record<Step, string>> = {
  import: 'Import a file to continue, or skip this step.',
  status: 'Pick a status to continue, or skip this step.',
  role: 'Add at least one job title to continue, or skip this step.',
  location: 'Add at least one place to continue, or skip this step.',
  contract: 'Pick at least one contract type to continue, or skip this step.',
  platforms: 'Pick at least one platform to continue, or skip this step.',
};

/**
 * Onboarding v2 preview (dev only): built with the app's own shadcn components and Hugeicons.
 * Layout rule: content is anchored from the top and never moves when something appears.
 * The current step is in the URL (`?step=role`), so browser Back and a reload keep the user's place.
 */
export function OnboardingV2() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const step = Math.max(0, STEPS.indexOf(searchParams.get('step') as Step));
  const goTo = (next: number) => router.push(`${pathname}?step=${STEPS[next]}`);
  const [finishing, startFinishing] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [contracts, setContracts] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState(0);
  const [currency, setCurrency] = useState('EUR');
  const [sizes, setSizes] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  // "See more" stays open when the user comes back to a step.
  const [moreSectors, setMoreSectors] = useState(false);
  const [morePlatforms, setMorePlatforms] = useState(false);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    posthog.capture('onboarding_step_viewed', { step: STEPS[step], step_index: step });
  }, [step]);

  const advance = (method: 'next' | 'skip') => {
    posthog.capture('onboarding_step_completed', { step: current, step_index: step, method });
    goTo(step + 1);
  };

  /** `onboarding_completed` fires only once the account is stamped (or, signed out, once there is nothing to stamp). */
  const finish = (plan: string) => {
    if (finishing) return;
    setFinishError(null);
    startFinishing(async () => {
      const result = await finishOnboardingV2().catch(() => null);
      if (!result?.ok) {
        setFinishError('We could not finish your onboarding right now. Please try again.');
        return;
      }
      posthog.capture('onboarding_completed', { completion_method: 'plan_selected', plan, signed_in: result.data.signedIn });
      router.push(result.data.next);
    });
  };
  const canNext = {
    import: file !== null,
    status: status !== null,
    role: titles.length > 0,
    location: places.length > 0,
    contract: contracts.length > 0,
    company: true,
    platforms: platforms.length > 0,
    plan: true,
  }[current];

  return (
    <div className={cn('flex flex-col bg-background text-foreground', last ? 'min-h-dvh' : 'h-dvh overflow-hidden')}>
      {/* The plan page scrolls normally, without a visible scrollbar. */}
      <style>{'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}'}</style>
      {!last && (
        <div className="flex justify-center pt-12 pb-[16vh]">
          <ApplyLogo className="h-8 w-auto text-foreground" />
        </div>
      )}

      <main className={cn('mx-auto w-full flex-1 px-6', last ? 'max-w-6xl pt-24' : 'max-w-4xl min-h-0 pt-[2vh]')}>
        {current === 'import' && (
          <>
            <StepHeader title="Start from what you already have" subtitle="Import your resume or LinkedIn profile to prefill your details." />
            <ImportDropzone file={file} onFile={setFile} />
          </>
        )}

        {current === 'status' && (
          <>
            <StepHeader title="What's your job search status?" subtitle="It sets which offers come first and how often we alert you." />
            <div role="radiogroup" aria-label="Job search status" className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              {STATUSES.map((s) => (
                <OptionRow key={s.value} icon={s.icon} tone={s.tone} title={s.title} description={s.description} selected={status === s.value} onSelect={() => setStatus(s.value)} />
              ))}
            </div>
          </>
        )}

        {current === 'role' && (
          <>
            <StepHeader title="Which roles are you after?" subtitle="Your job titles and seniority shape the offers we show you." />
            <TagSearch placeholder="Search a job title" fetchSuggestions={suggestJobTitles} values={titles} onChange={setTitles} />
            <div className="mx-auto mt-10 flex max-w-3xl flex-nowrap justify-center gap-4 border-t pt-10">
              {LEVELS.map((l, i) => (
                <ChoiceCard key={l} selected={levels.includes(l)} onClick={() => setLevels(toggle(levels, l))}>
                  <LevelBars level={i + 1} />
                  {l}
                </ChoiceCard>
              ))}
            </div>
          </>
        )}

        {current === 'location' && (
          <>
            <StepHeader title="Where do you want to work?" subtitle="Pick the places you would consider and the workplace type." />
            <TagSearch placeholder="Search a city, region or country" fetchSuggestions={suggestPlaces} values={places} onChange={setPlaces} />
            <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-4 border-t pt-10">
              {WORKPLACES.map((w) => (
                <ChoiceCard key={w.value} selected={workplaces.includes(w.value)} onClick={() => setWorkplaces(toggle(workplaces, w.value))}>
                  <HugeiconsIcon icon={w.icon} size={20} strokeWidth={1.8} />
                  {w.label}
                </ChoiceCard>
              ))}
            </div>
          </>
        )}

        {current === 'contract' && (
          <ContractStep contracts={contracts} onContracts={setContracts} minSalary={minSalary} onMinSalary={setMinSalary} currency={currency} onCurrency={setCurrency} />
        )}
        {current === 'company' && <CompanyStep sizes={sizes} onSizes={setSizes} sectors={sectors} onSectors={setSectors} showAll={moreSectors} onShowAll={setMoreSectors} />}
        {current === 'platforms' && <PlatformsStep places={places} values={platforms} onChange={setPlatforms} expanded={morePlatforms} onExpanded={setMorePlatforms} />}
        {current === 'plan' && (
          <>
            {finishError && (
              <p role="alert" className="mb-6 text-center text-sm text-destructive">
                {finishError}
              </p>
            )}
            <PlanStep onSelect={finish} />
          </>
        )}
      </main>

      {last ? (
        <div className="pb-[10vh]" />
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-background from-70% to-transparent px-6 pt-10 pb-[10vh]">
          <div className="relative mx-auto flex max-w-xl items-center justify-between">
            <p aria-live="polite" className="absolute inset-x-0 -top-8 text-center text-sm text-muted-foreground">
              {!canNext && NEXT_HINTS[current]}
            </p>
            <Button variant="outline" size="icon-lg" aria-label="Back" className={cn(step === 0 && 'invisible')} onClick={() => goTo(step - 1)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.8} />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="lg" onClick={() => advance('skip')}>
                Skip this step
              </Button>
              <Button size="lg" disabled={!canNext} onClick={() => advance('next')}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

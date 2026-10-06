'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Building03Icon,
  Cancel01Icon,
  ComputerIcon,
  FlashIcon,
  Home03Icon,
  IncognitoIcon,
  Search01Icon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons';
import { ApplyLogo } from '@/components/brand/ApplyLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImportDropzone } from '@/components/onboarding/v2/ImportDropzone';
import { OptionRow } from '@/components/onboarding/v2/OptionRow';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

type Status = 'active' | 'passive' | 'incognito';
type Workplace = 'onsite' | 'hybrid' | 'remote';

const STATUSES = [
  { value: 'active', icon: FlashIcon, title: 'Actively looking', description: 'Prioritize new offers and send alerts.' },
  { value: 'passive', icon: SearchList01Icon, title: 'Passively browsing', description: 'Show only the best matches, fewer alerts.' },
  { value: 'incognito', icon: IncognitoIcon, title: 'Incognito', description: 'Not looking. No alerts, profile kept private.' },
] as const;

const LEVELS = ['Entry level', 'Junior', 'Mid-level', 'Senior', 'Lead or above'];
const WORKPLACES = [
  { value: 'onsite', icon: Building03Icon, label: 'On-site' },
  { value: 'hybrid', icon: Home03Icon, label: 'Hybrid' },
  { value: 'remote', icon: ComputerIcon, label: 'Remote' },
] as const;
const TITLE_SUGGESTIONS = ['Product Designer', 'Senior Product Designer', 'UX Designer', 'UI Designer', 'Design Lead', 'UX Researcher'];
const PLACE_SUGGESTIONS = ['Paris, France', 'Lyon, France', 'Bordeaux, France', 'Nantes, France', 'Île-de-France', 'France', 'Berlin, Germany', 'London, United Kingdom'];

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Searchable field: large search bar, suggestions below, chosen items listed under it (left-aligned). */
function TagSearch({
  placeholder,
  suggestions,
  values,
  onChange,
}: {
  placeholder: string;
  suggestions: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? suggestions.filter((s) => s.toLowerCase().includes(q) && !values.includes(s)).slice(0, 5) : [];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="relative">
        <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.8} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-14 rounded-full pr-6 pl-13 text-base md:text-base"
        />
        {matches.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-3xl bg-popover p-1 text-left shadow-md ring-1 ring-foreground/5">
            {matches.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...values, m]);
                    setQuery('');
                  }}
                  className="w-full rounded-2xl px-4 py-2.5 text-left text-sm hover:bg-muted"
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {values.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-start gap-2">
          {values.map((v) => (
            <Button key={v} variant="secondary" size="lg" onClick={() => onChange(values.filter((x) => x !== v))}>
              {v}
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} data-icon="inline-end" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal selectable card (multi-select). */
function ChoiceCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-14 items-center gap-3 rounded-2xl bg-card px-5 text-base font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
        selected && 'bg-muted ring-2 ring-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

const STEPS = ['import', 'status', 'role', 'location'] as const;

/**
 * Onboarding v2 preview (dev only): built with the app's own shadcn components and Hugeicons.
 * Layout rule: content is anchored from the top and never moves when something appears.
 */
export function OnboardingV2() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);

  const current = STEPS[step];
  const canNext =
    current === 'import' ? file !== null : current === 'status' ? status !== null : current === 'role' ? titles.length > 0 : places.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex justify-center pt-14 pb-12">
        <ApplyLogo className="h-8 w-auto text-foreground" />
      </div>

      <main className="mx-auto w-full max-w-3xl px-6 pb-48">
        {current === 'import' && (
          <>
            <StepHeader title="Start from what you already have" subtitle="Import your CV or LinkedIn profile to prefill your details." />
            <ImportDropzone file={file} onFile={setFile} />
          </>
        )}

        {current === 'status' && (
          <>
            <StepHeader title="What's your job search status?" subtitle="It sets which offers come first and how often we alert you." />
            <div role="radiogroup" aria-label="Job search status" className="mx-auto flex w-full max-w-xl flex-col gap-3">
              {STATUSES.map((s) => (
                <OptionRow key={s.value} icon={s.icon} title={s.title} description={s.description} selected={status === s.value} onSelect={() => setStatus(s.value)} />
              ))}
            </div>
          </>
        )}

        {current === 'role' && (
          <>
            <StepHeader title="Which roles are you after?" subtitle="Your job titles and seniority shape the offers we show you." />
            <TagSearch placeholder="Search a job title" suggestions={TITLE_SUGGESTIONS} values={titles} onChange={setTitles} />
            <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-3 border-t pt-10">
              {LEVELS.map((l) => (
                <ChoiceCard key={l} selected={levels.includes(l)} onClick={() => setLevels(toggle(levels, l))}>
                  {l}
                </ChoiceCard>
              ))}
            </div>
          </>
        )}

        {current === 'location' && (
          <>
            <StepHeader title="Where do you want to work?" subtitle="Pick the places you would consider and the workplace type." />
            <TagSearch placeholder="Search a city, region or country" suggestions={PLACE_SUGGESTIONS} values={places} onChange={setPlaces} />
            <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-3 border-t pt-10">
              {WORKPLACES.map((w) => (
                <ChoiceCard key={w.value} selected={workplaces.includes(w.value)} onClick={() => setWorkplaces(toggle(workplaces, w.value))}>
                  <HugeiconsIcon icon={w.icon} size={20} strokeWidth={1.8} />
                  {w.label}
                </ChoiceCard>
              ))}
            </div>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-20 px-6">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Button variant="outline" size="icon-lg" aria-label="Back" className={cn(step === 0 && 'invisible')} onClick={() => setStep(step - 1)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.8} />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="lg" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}>
              Skip this step
            </Button>
            <Button size="lg" disabled={!canNext} onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

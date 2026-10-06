'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';
import { toggle } from '@/components/onboarding/v2/fields';

type PlatformOption = { name: string; franceOnly?: boolean };

const PLATFORMS: PlatformOption[] = [
  { name: 'LinkedIn' },
  { name: 'Indeed' },
  { name: 'Glassdoor' },
  { name: 'Welcome to the Jungle' },
  { name: 'HelloWork' },
  { name: 'JobsThatMakeSense' },
  { name: 'Collective.work' },
  { name: 'France Travail', franceOnly: true },
];

/** Last criteria step: which job platforms to search. Logos will come from Brandfetch; initials stand in for now. */
export function PlatformsStep({ places, values, onChange }: { places: string[]; values: string[]; onChange: (next: string[]) => void }) {
  const inFrance = places.length === 0 || places.some((p) => /france|paris|lyon|bordeaux|nantes|le-de-france/i.test(p));
  const list = PLATFORMS.filter((p) => !p.franceOnly || inFrance);

  return (
    <>
      <StepHeader title="Where should we look for offers?" subtitle="We search these platforms for you and merge duplicates into one offer." />
      <div role="group" aria-label="Job platforms" className="mx-auto grid max-w-2xl grid-cols-2 gap-4">
        {list.map((p) => {
          const selected = values.includes(p.name);
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(toggle(values, p.name))}
              className={cn(
                'flex h-14 items-center gap-3 rounded-2xl bg-card px-4 text-left text-sm font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
                selected && 'bg-muted ring-2 ring-foreground hover:bg-muted',
              )}
            >
              <Avatar className="size-8 rounded-lg after:rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">{p.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none size-5" />
            </button>
          );
        })}
      </div>
    </>
  );
}

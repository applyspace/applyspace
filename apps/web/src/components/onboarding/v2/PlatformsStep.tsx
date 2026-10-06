'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';
import { toggle } from '@/components/onboarding/v2/fields';

type PlatformOption = { name: string; description: string; franceOnly?: boolean };

const PLATFORMS: PlatformOption[] = [
  { name: 'LinkedIn', description: 'The largest professional network, with offers from companies of every size.' },
  { name: 'Indeed', description: 'A huge worldwide job board covering every sector and level.' },
  { name: 'Glassdoor', description: 'Offers shown with company reviews and salary insights.' },
  { name: 'Welcome to the Jungle', description: 'Tech and startup offers with rich company culture pages.' },
  { name: 'HelloWork', description: 'A leading French job board, strong on local and regional offers.' },
  { name: 'JobsThatMakeSense', description: 'Offers from companies with a social and environmental impact.' },
  { name: 'Collective.work', description: 'Freelance missions and jobs for independent professionals.' },
  { name: 'France Travail', description: 'The French public employment service, with offers across the country.', franceOnly: true },
];

/** Which job platforms to search. Logos will come from Brandfetch; initials stand in for now. */
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
                'flex items-start gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
                selected && 'bg-muted ring-2 ring-foreground hover:bg-muted',
              )}
            >
              <Avatar className="size-10 rounded-xl after:rounded-xl">
                <AvatarFallback className="rounded-xl text-sm">{p.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{p.description}</span>
              </span>
              <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none mt-0.5 size-5" />
            </button>
          );
        })}
      </div>
    </>
  );
}

'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BrandLogo } from '@/components/onboarding/v2/BrandLogo';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { FADE_BOTH, FADE_BOTTOM, useOverflow } from '@/components/onboarding/v2/useOverflow';
import { cn } from '@/lib/utils';
import { toggle } from '@/components/onboarding/v2/fields';

type PlatformOption = { name: string; domain: string; description: string; franceOnly?: boolean };

const PLATFORMS: PlatformOption[] = [
  { name: 'LinkedIn', domain: 'linkedin.com', description: 'The largest professional network, with offers from companies of every size.' },
  { name: 'Indeed', domain: 'indeed.com', description: 'A huge worldwide job board covering every sector and level.' },
  { name: 'Glassdoor', domain: 'glassdoor.com', description: 'Offers shown with company reviews and salary insights.' },
  { name: 'Welcome to the Jungle', domain: 'welcometothejungle.com', description: 'Tech and startup offers with rich company culture pages.' },
  { name: 'HelloWork', domain: 'hellowork.com', description: 'A leading French job board, strong on local and regional offers.' },
  { name: 'JobsThatMakeSense', domain: 'jobsthatmakesense.com', description: 'Offers from companies with a social and environmental impact.' },
  { name: 'Collective.work', domain: 'collective.work', description: 'Freelance missions and jobs for independent professionals.' },
  { name: 'France Travail', domain: 'francetravail.org', description: 'The French public employment service, with offers across the country.', franceOnly: true },
];

/** Shown after "See more". */
const MORE_PLATFORMS: PlatformOption[] = [
  { name: 'Apec', domain: 'apec.fr', description: 'The French platform dedicated to executives and experienced professionals.', franceOnly: true },
  { name: 'Cadremploi', domain: 'cadremploi.fr', description: 'Offers for managers and qualified profiles, mostly in France.', franceOnly: true },
  { name: 'Free-Work', domain: 'free-work.com', description: 'IT and tech missions and permanent roles, with freelance in focus.', franceOnly: true },
  { name: 'Malt', domain: 'malt.fr', description: 'A marketplace connecting freelancers with companies for missions.' },
  { name: 'Wellfound', domain: 'wellfound.com', description: 'Startup jobs with salary and equity shown upfront.' },
  { name: 'Monster', domain: 'monster.com', description: 'A long-running international job board with a wide range of roles.' },
  { name: 'ZipRecruiter', domain: 'ziprecruiter.com', description: 'Matches your profile with offers and pushes it to employers.' },
  { name: 'Jobijoba', domain: 'jobijoba.com', description: 'A French aggregator that gathers offers from many job boards.', franceOnly: true },
];

/** Which job platforms to search. Logos come from Brandfetch; the list scrolls in its own container with a fade at the bottom. */
export function PlatformsStep({
  places,
  values,
  onChange,
  expanded,
  onExpanded,
}: {
  places: string[];
  values: string[];
  onChange: (next: string[]) => void;
  expanded: boolean;
  onExpanded: (next: boolean) => void;
}) {
  const inFrance = places.length === 0 || places.some((p) => /france|paris|lyon|bordeaux|nantes|le-de-france/i.test(p));
  const list = (expanded ? [...PLATFORMS, ...MORE_PLATFORMS] : PLATFORMS).filter((p) => !p.franceOnly || inFrance);
  const { ref: listRef, scrollable, scrolled } = useOverflow<HTMLDivElement>([expanded, inFrance], 60);

  return (
    <>
      <StepHeader title="Where should we look for offers?" subtitle="We search these platforms for you and merge duplicates into one offer." />
      <div className="mx-auto max-w-2xl">
        <div
          ref={listRef}
          data-scrollable={scrollable}
          role="group"
          aria-label="Job platforms"
          className={cn(
            'grid max-h-[max(10rem,calc(100dvh-36rem))] grid-cols-2 gap-4 overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            scrollable && cn('pb-16', scrolled ? FADE_BOTH : FADE_BOTTOM),
          )}
        >
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
                <BrandLogo name={p.name} domain={p.domain} className="size-10 text-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground">{p.description}</span>
                </span>
                <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none mt-0.5 size-5" />
              </button>
            );
          })}
        </div>
        {!expanded && (
          <div className={cn('mb-8 flex justify-center', scrollable ? '-mt-4' : 'mt-4')}>
            <Button variant="ghost" size="lg" onClick={() => onExpanded(true)}>
              See more
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

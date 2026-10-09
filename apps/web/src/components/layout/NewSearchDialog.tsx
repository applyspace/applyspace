'use client';

import { useState, useTransition } from 'react';
import posthog from 'posthog-js';
import { useRouter } from 'next/navigation';
import { Dialog } from '@base-ui/react/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Loading02Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import type { ExperienceLevel } from '@apply/db';
import { createSearch } from '@/app/(auth)/offers/actions';
import { useSettingsModal } from '@/components/settings/SettingsModalProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiChip } from '@/components/ui/multi-chip';
import type { AccountPlan, ContractToken } from '@apply/core/candidate-profile';

// Chip label → canonical token stored in `searches` (same labels as onboarding).
const CONTRACT_OPTIONS: ReadonlyArray<{ value: ContractToken; label: string }> = [
  { value: 'CDI', label: 'Permanent' },
  { value: 'CDD', label: 'Fixed-term' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Apprentissage', label: 'Apprenticeship' },
  { value: 'Stage', label: 'Internship' },
  { value: 'Bénévolat', label: 'Volunteer' },
];

const LEVEL_OPTIONS: ReadonlyArray<{ value: ExperienceLevel; label: string }> = [
  { value: 'entry', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

interface NewSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null when nobody is signed in (demo, desktop). */
  plan: AccountPlan | null;
  /** How many search profiles the user already has. */
  searchCount: number;
}

/**
 * "New search" dialog opened from the sidebar's Offers header. A Free account
 * that already has its one search sees an upgrade message instead of the form.
 */
export function NewSearchDialog({ open, onOpenChange, plan, searchCount }: NewSearchDialogProps) {
  const atLimit = plan === 'free' && searchCount >= 1;
  const [limitHit, setLimitHit] = useState(false);
  const showUpgrade = atLimit || limitHit;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setLimitHit(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-white text-stone-950 outline-none transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold">
                {showUpgrade ? 'Plus plan' : 'New search'}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-stone-600">
                {showUpgrade
                  ? 'More than one search profile.'
                  : 'Apply looks for offers matching these criteria.'}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </Dialog.Close>
          </header>
          {showUpgrade ? (
            <UpgradeMessage onDone={() => onOpenChange(false)} />
          ) : (
            <NewSearchForm
              onPlanLimit={() => setLimitHit(true)}
              onCreated={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UpgradeMessage({ onDone }: { onDone: () => void }) {
  const { openSettings } = useSettingsModal();
  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100">
          <HugeiconsIcon icon={SparklesIcon} size={16} />
        </span>
        <p className="text-sm text-stone-700">
          Free includes one search profile. Plus gives each job title its own search.
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            onDone();
            openSettings('billing');
          }}
        >
          See Plus in Settings
        </Button>
      </div>
    </div>
  );
}

function NewSearchForm({
  onPlanLimit,
  onCreated,
}: {
  onPlanLimit: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Add a job title.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createSearch({
        title,
        location,
        contractTypes: contractTypes as ContractToken[],
        experienceLevels: levels as ExperienceLevel[],
      });
      if (result.ok) {
        posthog.capture('search_created', {
          has_location: Boolean(location.trim()),
          contract_types_count: contractTypes.length,
          experience_levels_count: levels.length,
        });
        onCreated();
        router.push(`/offers/${result.data.slug}`);
        router.refresh();
      } else if (result.reason === 'plan-limit') {
        onPlanLimit();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        <div className="space-y-1.5">
          <Label htmlFor="new-search-title" className="text-xs font-medium text-stone-600">
            Job title
          </Label>
          <Input
            id="new-search-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product Designer"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-search-location" className="text-xs font-medium text-stone-600">
            Location (optional)
          </Label>
          <Input
            id="new-search-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Paris, France"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-stone-600">Contract type</Label>
          <MultiChip options={[...CONTRACT_OPTIONS]} value={contractTypes} onChange={setContractTypes} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-stone-600">Experience level</Label>
          <MultiChip options={[...LEVEL_OPTIONS]} value={levels} onChange={setLevels} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      <footer className="flex justify-end gap-2 border-t border-stone-200 px-6 py-4">
        <Dialog.Close render={<Button type="button" variant="ghost" />}>Cancel</Dialog.Close>
        <Button type="submit" disabled={isPending}>
          {isPending && <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin" />}
          Create search
        </Button>
      </footer>
    </form>
  );
}

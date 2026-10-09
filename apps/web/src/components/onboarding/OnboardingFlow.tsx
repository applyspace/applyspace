'use client';

import { useState, useTransition } from 'react';
import posthog from 'posthog-js';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  File01Icon,
  Linkedin01Icon,
  Loading02Icon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons';
import type { ExperienceLevel } from '@apply/db/schema';
import { completeOnboarding, saveFirstSearch, saveName } from '@/app/onboarding/actions';
import { ApplyLogo } from '@/components/brand/ApplyLogo';
import { DocumentsPanel } from '@/components/profile/DocumentsPanel';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import {
  CONTROL_CLASS,
  Chip,
  Field,
  GHOST_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  TextField,
} from '@/components/profile/fields';
import { cn } from '@/lib/utils';
import type { ActionResult, ContractToken } from '@apply/core/candidate-profile';

const STEPS = ['Your name', 'Your background', 'What you are looking for'] as const;

// Chip label → canonical token stored in `searches`.
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
];

type BackgroundMode = 'cv' | 'manual';

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/**
 * The three onboarding steps. Every step can be skipped, and "Skip for now"
 * in the header ends onboarding from anywhere. Finishing or skipping stamps
 * the account and lands on Home (see `completeOnboarding`).
 */
export function OnboardingFlow({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string;
  initialLastName: string;
}) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  // Step 2
  const [mode, setMode] = useState<BackgroundMode | null>(null);
  // Step 3
  const [titles, setTitles] = useState<string[]>([]);
  const [titleDraft, setTitleDraft] = useState('');
  const [contractTypes, setContractTypes] = useState<ContractToken[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [location, setLocation] = useState('');

  const isLast = step === STEPS.length - 1;

  function goTo(next: number) {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  /** Ends onboarding (finished or skipped): the server stamps the account and redirects to Home. */
  const complete = async (completionMethod: 'completed' | 'skipped') => {
    posthog.capture('onboarding_completed', { completion_method: completionMethod });
    await completeOnboarding();
  };

  const finish = (completionMethod: 'completed' | 'skipped') =>
    startTransition(() => complete(completionMethod));

  /** Runs a save, then `next()`. Without an account (demo) there is nothing to save: move on. */
  function saveThen(save: () => Promise<ActionResult>, next: () => void | Promise<void>) {
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      try {
        result = await save();
      } catch {
        setError('Something went wrong. Try again, or skip this step.');
        return;
      }
      if (result.ok || result.reason === 'signed-out') await next();
      else if (result.reason === 'invalid') setError(result.message);
      else setError('We could not save this right now. Try again, or skip this step.');
    });
  }

  function addTitle() {
    const title = titleDraft.trim();
    if (title && !titles.some((t) => t.toLowerCase() === title.toLowerCase())) setTitles([...titles, title]);
    setTitleDraft('');
  }

  function handleContinue() {
    if (step === 0) {
      if (!firstName.trim() && !lastName.trim()) return goTo(1);
      return saveThen(
        () => saveName({ firstName, lastName }),
        () => goTo(1),
      );
    }
    if (step === 1) return goTo(2);

    // A title still being typed counts.
    const allTitles = titleDraft.trim() ? [...titles, titleDraft.trim()] : titles;
    if (allTitles.length === 0) {
      return setError('Add at least one job title, or skip this step.');
    }
    return saveThen(
      () => saveFirstSearch({ titles: allTitles, contractTypes, experienceLevels, location }),
      () => complete('completed'),
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-950">
      <header className="mx-auto flex h-20 w-full max-w-[64rem] items-center justify-between px-6 sm:px-12">
        <ApplyLogo className="h-7 w-auto text-stone-950" />
        <button type="button" onClick={() => finish('skipped')} disabled={pending} className={GHOST_BUTTON_CLASS}>
          Skip for now
        </button>
      </header>

      <main className="mx-auto w-full max-w-[64rem] px-6 pb-24 pt-8 sm:px-12 sm:pt-14">
        <div className="w-full max-w-[40rem]">
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
          >
            <div className="flex max-w-[12rem] gap-1.5">
              {STEPS.map((name, i) => (
                <span
                  key={name}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i <= step ? 'bg-stone-950' : 'bg-stone-200',
                  )}
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-stone-500">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          {step === 0 && (
            <Step
              title="First, what should we call you?"
              lead="Your name appears on your profile and on the applications you prepare with Apply."
            >
              <div className="grid max-w-[28rem] gap-4 sm:grid-cols-2">
                <TextField
                  label="First name"
                  value={firstName}
                  onChange={setFirstName}
                  autoComplete="given-name"
                  autoFocus
                />
                <TextField
                  label="Last name"
                  value={lastName}
                  onChange={setLastName}
                  autoComplete="family-name"
                />
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step
              title="Tell us about your background"
              lead="Your experience, education and skills help Apply judge how well an offer fits you. Pick how you want to add them."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <ChoiceCard
                  icon={File01Icon}
                  title="Import your CV"
                  description="Upload a PDF or Word file."
                  selected={mode === 'cv'}
                  onClick={() => setMode('cv')}
                />
                <ChoiceCard
                  icon={Linkedin01Icon}
                  title="Import from LinkedIn"
                  description="Bring in your LinkedIn profile."
                  badge="Coming soon"
                  disabled
                />
                <ChoiceCard
                  icon={PencilEdit01Icon}
                  title="Fill it in manually"
                  description="Add each item yourself."
                  selected={mode === 'manual'}
                  onClick={() => setMode('manual')}
                />
              </div>

              {mode === 'cv' && (
                <div className="mt-10 flex flex-col gap-10">
                  <DocumentsPanel showFitMessages={false} />
                  <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                    Your CV is saved to your account. Apply does not fill in your profile from it
                    yet, so add your key experience below, or skip this step and come back to it
                    later in Settings.
                  </p>
                  <ProfileEditor />
                </div>
              )}
              {mode === 'manual' && (
                <div className="mt-10">
                  <ProfileEditor />
                </div>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step
              title="What are you looking for?"
              lead="These essentials create your first search profile. You can refine it later with work mode, company size, salary and no-gos."
            >
              <div className="flex flex-col gap-7">
                <Field label="Target job titles" hint="Press Enter to add several. Free keeps one search (the first title); Plus gives each title its own.">
                  {(id) => (
                    <div className="flex flex-col gap-2">
                      {titles.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                          {titles.map((title) => (
                            <li
                              key={title}
                              className="inline-flex h-9 items-center rounded-full bg-stone-100 pl-3.5 pr-1 text-sm font-medium text-stone-950"
                            >
                              {title}
                              <button
                                type="button"
                                aria-label={`Remove ${title}`}
                                onClick={() => setTitles(titles.filter((t) => t !== title))}
                                className="ml-1 inline-flex size-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-950"
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <input
                        id={id}
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTitle();
                          }
                        }}
                        onBlur={addTitle}
                        placeholder="Product Designer"
                        className={cn(CONTROL_CLASS, 'max-w-[28rem]')}
                        autoFocus
                      />
                    </div>
                  )}
                </Field>

                <ChipGroup label="Contract type">
                  {CONTRACT_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      selected={contractTypes.includes(option.value)}
                      onClick={() => setContractTypes(toggle(contractTypes, option.value))}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </ChipGroup>

                <ChipGroup label="Experience level">
                  {LEVEL_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      selected={experienceLevels.includes(option.value)}
                      onClick={() => setExperienceLevels(toggle(experienceLevels, option.value))}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </ChipGroup>

                <TextField
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Paris, France"
                  className="max-w-[28rem]"
                />
              </div>
            </Step>
          )}

          {error && (
            <p role="alert" className="mt-6 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-6">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                disabled={pending}
                className={GHOST_BUTTON_CLASS}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                Back
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => (isLast ? finish('skipped') : goTo(step + 1))}
              disabled={pending}
              className={GHOST_BUTTON_CLASS}
            >
              Skip this step
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={pending}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isLast ? 'Finish' : 'Continue'}
              <HugeiconsIcon
                icon={pending ? Loading02Icon : ArrowRight01Icon}
                size={16}
                className={pending ? 'animate-spin' : undefined}
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h1
        className="font-[family-name:var(--font-display)] text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[3rem]"
        style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 64' }}
      >
        {title}
      </h1>
      <p className="mt-4 max-w-[34rem] text-sm text-stone-700">{lead}</p>
      <div className="mt-10">{children}</div>
    </section>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 text-xs font-medium text-stone-700">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  badge,
  selected = false,
  disabled = false,
  onClick,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={disabled ? undefined : selected}
      className={cn(
        'flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
        selected
          ? 'border-stone-950 bg-white'
          : 'border-stone-200 bg-white hover:bg-stone-50',
        disabled && 'cursor-not-allowed bg-stone-50 hover:bg-stone-50',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-lg',
            selected ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700',
            disabled && 'text-stone-400',
          )}
        >
          <HugeiconsIcon icon={icon} size={18} />
        </span>
        {badge && (
          <span className="inline-flex h-6 items-center rounded-full bg-stone-200 px-2 text-[11px] font-medium text-stone-600">
            {badge}
          </span>
        )}
      </span>
      <span>
        <span className={cn('block text-sm font-medium', disabled ? 'text-stone-500' : 'text-stone-950')}>
          {title}
        </span>
        <span className={cn('mt-0.5 block text-sm', disabled ? 'text-stone-400' : 'text-stone-600')}>
          {description}
        </span>
      </span>
    </button>
  );
}

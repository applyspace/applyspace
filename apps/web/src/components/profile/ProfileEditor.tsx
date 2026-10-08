'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Add01Icon,
  Briefcase01Icon,
  Cancel01Icon,
  Delete02Icon,
  Idea01Icon,
  InformationCircleIcon,
  Loading02Icon,
  Mortarboard01Icon,
  PencilEdit01Icon,
  SquareLock01Icon,
} from '@hugeicons/core-free-icons';
import {
  loadProfileData,
  removeEducation,
  removeExperience,
  removeSkill,
  saveEducation,
  saveExperience,
  saveSkill,
} from '@/app/onboarding/actions';
import {
  SKILL_LEVEL_VALUES,
  type ActionResult,
  type EducationEntry,
  type EducationInput,
  type ExperienceEntry,
  type ExperienceInput,
  type ProfileData,
  type SkillEntry,
  type SkillInput,
  type SkillLevel,
} from '@/types/candidate-profile';
import {
  CONTROL_CLASS,
  Field,
  GHOST_BUTTON_CLASS,
  IconButton,
  MonthField,
  Notice,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  TEXTAREA_CLASS,
  TextField,
  formatMonth,
} from './fields';

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

const NEW = 'new';

/**
 * The candidate's background: experiences, education and skills, each with
 * add, inline edit and delete. Loads and saves through server actions, so it
 * takes no props and can be dropped into onboarding or the Settings modal.
 * Signed out (demo, desktop) it shows a read-only message; a section whose
 * table is missing shows "not available yet".
 */
export function ProfileEditor() {
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProfileData()
      .then((loaded) => !cancelled && setData(loaded))
      // A failed request is shown like missing tables rather than crashing.
      .catch(() => !cancelled && setData({ status: 'ready', experiences: null, education: null, skills: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-stone-500">
        <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
        Loading your profile
      </div>
    );
  }

  if (data.status === 'signed-out') {
    return (
      <Notice icon={SquareLock01Icon} title="Sign in to edit your profile">
        Your experience, education and skills are saved to your Apply account. This preview is
        read-only.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <ExperienceSection initial={data.experiences} />
      <EducationSection initial={data.education} />
      <SkillsSection initial={data.skills} />
    </div>
  );
}

// --- shared section plumbing -------------------------------------------------

/** List state for one section: which row is being edited, saving and deleting. */
function useCollection<T extends { id: string }, I extends { id?: string }>(
  section: 'experience' | 'education' | 'skill',
  initial: T[] | null,
  save: (input: I) => Promise<ActionResult<T>>,
  remove: (id: string) => Promise<ActionResult>,
) {
  const [items, setItems] = useState<T[]>(initial ?? []);
  /** Id of the row being edited, `NEW` for the add form, null when idle. */
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guarded<R>(work: () => Promise<ActionResult<R>>): Promise<R | undefined> {
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (result.ok) return result.data;
      setError(result.message);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return {
    items,
    editing,
    busy,
    error,
    startEditing(id: string | null) {
      setError(null);
      setEditing(id);
    },
    async submit(input: I) {
      const saved = await guarded(() => save(input));
      if (!saved) return;
      setItems((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setEditing(null);
      posthog.capture('profile_section_saved', { section });
    },
    async destroy(id: string) {
      setBusy(true);
      setError(null);
      try {
        const result = await remove(id);
        if (result.ok) {
          setItems((current) => current.filter((item) => item.id !== id));
          posthog.capture('profile_section_removed', { section });
        } else setError(result.message);
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setBusy(false);
      }
    },
  };
}

function Section({
  title,
  description,
  addLabel,
  onAdd,
  unavailable,
  error,
  children,
}: {
  title: string;
  description: string;
  addLabel: string;
  /** Omit to hide the add button (form already open, or section unavailable). */
  onAdd?: () => void;
  unavailable: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.01em] text-stone-950">{title}</h3>
          <p className="mt-0.5 text-sm text-stone-600">{description}</p>
        </div>
        {onAdd && !unavailable && (
          <button type="button" onClick={onAdd} className={SECONDARY_BUTTON_CLASS}>
            <HugeiconsIcon icon={Add01Icon} size={16} />
            {addLabel}
          </button>
        )}
      </div>
      {unavailable ? (
        <Notice icon={InformationCircleIcon} title={`${title} is not available yet`}>
          We are still setting this up. Nothing is lost: come back a little later.
        </Notice>
      ) : (
        children
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function EmptyState({ icon, children }: { icon: IconSvgElement; children: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-stone-500">
      <HugeiconsIcon icon={icon} size={18} className="shrink-0 text-stone-400" />
      {children}
    </div>
  );
}

function FormShell({
  onSubmit,
  onCancel,
  busy,
  submitLabel,
  children,
}: {
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <form
      className="flex flex-col gap-4 rounded-2xl bg-stone-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
          {busy && <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />}
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={GHOST_BUTTON_CLASS}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Row({
  title,
  subtitle,
  meta,
  description,
  onEdit,
  onDelete,
  busy,
}: {
  title: string;
  subtitle: string;
  meta: string;
  description: string;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-950">{title}</p>
        {subtitle && <p className="truncate text-sm text-stone-600">{subtitle}</p>}
        {meta && <p className="mt-0.5 text-xs text-stone-500">{meta}</p>}
        {description && (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-stone-600">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <IconButton icon={PencilEdit01Icon} label={`Edit ${title}`} onClick={onEdit} disabled={busy} />
        <IconButton icon={Delete02Icon} label={`Delete ${title}`} onClick={onDelete} disabled={busy} />
      </div>
    </li>
  );
}

const LIST_CLASS = 'divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white';

const joinParts = (...parts: string[]) => parts.filter(Boolean).join(' · ');

function period(startedAt: string, endedAt: string, isCurrent = false): string {
  const start = formatMonth(startedAt);
  const end = isCurrent ? 'Present' : formatMonth(endedAt);
  return start && end ? `${start} to ${end}` : start || end;
}

// --- experiences -------------------------------------------------------------

const EMPTY_EXPERIENCE: ExperienceInput = {
  title: '',
  companyName: '',
  location: '',
  startedAt: '',
  endedAt: '',
  isCurrent: false,
  description: '',
};

function ExperienceSection({ initial }: { initial: ExperienceEntry[] | null }) {
  const list = useCollection<ExperienceEntry, ExperienceInput>('experience', initial, saveExperience, removeExperience);

  return (
    <Section
      title="Experience"
      description="The roles you have held, most recent first."
      addLabel="Add experience"
      onAdd={list.editing === NEW ? undefined : () => list.startEditing(NEW)}
      unavailable={initial === null}
      error={list.error}
    >
      {list.editing === NEW && (
        <ExperienceForm
          initial={EMPTY_EXPERIENCE}
          busy={list.busy}
          onSubmit={list.submit}
          onCancel={() => list.startEditing(null)}
        />
      )}
      {list.items.length === 0 && list.editing !== NEW && (
        <EmptyState icon={Briefcase01Icon}>No experience yet. Add your current or latest role to start.</EmptyState>
      )}
      {list.items.length > 0 && (
        <ul className={LIST_CLASS}>
          {list.items.map((item) =>
            list.editing === item.id ? (
              <li key={item.id} className="p-2">
                <ExperienceForm
                  initial={item}
                  busy={list.busy}
                  onSubmit={list.submit}
                  onCancel={() => list.startEditing(null)}
                />
              </li>
            ) : (
              <Row
                key={item.id}
                title={item.title}
                subtitle={joinParts(item.companyName, item.location)}
                meta={period(item.startedAt, item.endedAt, item.isCurrent)}
                description={item.description}
                busy={list.busy}
                onEdit={() => list.startEditing(item.id)}
                onDelete={() => list.destroy(item.id)}
              />
            ),
          )}
        </ul>
      )}
    </Section>
  );
}

function ExperienceForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: ExperienceInput;
  busy: boolean;
  onSubmit: (input: ExperienceInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ExperienceInput>(initial);
  const set = <K extends keyof ExperienceInput>(key: K, value: ExperienceInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <FormShell
      busy={busy}
      onCancel={onCancel}
      onSubmit={() => onSubmit(form)}
      submitLabel={initial.id ? 'Save' : 'Add experience'}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Job title"
          value={form.title}
          onChange={(v) => set('title', v)}
          placeholder="Product Designer"
          required
          autoFocus
        />
        <TextField
          label="Company"
          value={form.companyName}
          onChange={(v) => set('companyName', v)}
          placeholder="Company name"
        />
        <TextField
          label="Location"
          hint="Optional"
          value={form.location}
          onChange={(v) => set('location', v)}
          placeholder="Paris, France"
          className="sm:col-span-2"
        />
        <MonthField label="Start date" value={form.startedAt} onChange={(v) => set('startedAt', v)} />
        <MonthField
          label="End date"
          value={form.isCurrent ? '' : form.endedAt}
          onChange={(v) => set('endedAt', v)}
          disabled={form.isCurrent}
        />
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={form.isCurrent}
          onChange={(e) => set('isCurrent', e.target.checked)}
          className="size-4 rounded accent-stone-950"
        />
        I currently work here
      </label>
      <Field label="Description" hint="Optional">
        {(id) => (
          <textarea
            id={id}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What you owned, shipped and learned."
            className={TEXTAREA_CLASS}
          />
        )}
      </Field>
    </FormShell>
  );
}

// --- education ---------------------------------------------------------------

const EMPTY_EDUCATION: EducationInput = {
  school: '',
  degree: '',
  field: '',
  startedAt: '',
  endedAt: '',
  description: '',
};

function EducationSection({ initial }: { initial: EducationEntry[] | null }) {
  const list = useCollection<EducationEntry, EducationInput>('education', initial, saveEducation, removeEducation);

  return (
    <Section
      title="Education"
      description="Degrees, bootcamps and certifications."
      addLabel="Add education"
      onAdd={list.editing === NEW ? undefined : () => list.startEditing(NEW)}
      unavailable={initial === null}
      error={list.error}
    >
      {list.editing === NEW && (
        <EducationForm
          initial={EMPTY_EDUCATION}
          busy={list.busy}
          onSubmit={list.submit}
          onCancel={() => list.startEditing(null)}
        />
      )}
      {list.items.length === 0 && list.editing !== NEW && (
        <EmptyState icon={Mortarboard01Icon}>No education yet. Add a school or a training course.</EmptyState>
      )}
      {list.items.length > 0 && (
        <ul className={LIST_CLASS}>
          {list.items.map((item) =>
            list.editing === item.id ? (
              <li key={item.id} className="p-2">
                <EducationForm
                  initial={item}
                  busy={list.busy}
                  onSubmit={list.submit}
                  onCancel={() => list.startEditing(null)}
                />
              </li>
            ) : (
              <Row
                key={item.id}
                title={item.school}
                subtitle={joinParts(item.degree, item.field)}
                meta={period(item.startedAt, item.endedAt)}
                description={item.description}
                busy={list.busy}
                onEdit={() => list.startEditing(item.id)}
                onDelete={() => list.destroy(item.id)}
              />
            ),
          )}
        </ul>
      )}
    </Section>
  );
}

function EducationForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: EducationInput;
  busy: boolean;
  onSubmit: (input: EducationInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EducationInput>(initial);
  const set = <K extends keyof EducationInput>(key: K, value: EducationInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <FormShell
      busy={busy}
      onCancel={onCancel}
      onSubmit={() => onSubmit(form)}
      submitLabel={initial.id ? 'Save' : 'Add education'}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="School"
          value={form.school}
          onChange={(v) => set('school', v)}
          placeholder="School or organisation"
          className="sm:col-span-2"
          required
          autoFocus
        />
        <TextField
          label="Degree"
          hint="Optional"
          value={form.degree}
          onChange={(v) => set('degree', v)}
          placeholder="Master's degree"
        />
        <TextField
          label="Field of study"
          hint="Optional"
          value={form.field}
          onChange={(v) => set('field', v)}
          placeholder="Interaction design"
        />
        <MonthField label="Start date" hint="Optional" value={form.startedAt} onChange={(v) => set('startedAt', v)} />
        <MonthField label="End date" hint="Optional" value={form.endedAt} onChange={(v) => set('endedAt', v)} />
      </div>
      <Field label="Description" hint="Optional">
        {(id) => (
          <textarea
            id={id}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Thesis, honours, notable projects."
            className={TEXTAREA_CLASS}
          />
        )}
      </Field>
    </FormShell>
  );
}

// --- skills ------------------------------------------------------------------

const EMPTY_SKILL: SkillInput = { name: '', level: null };

function SkillsSection({ initial }: { initial: SkillEntry[] | null }) {
  const list = useCollection<SkillEntry, SkillInput>('skill', initial, saveSkill, removeSkill);
  const editingSkill = list.items.find((item) => item.id === list.editing);

  return (
    <Section
      title="Skills"
      description="Tools and know-how you want offers matched on."
      addLabel="Add skill"
      onAdd={list.editing === NEW ? undefined : () => list.startEditing(NEW)}
      unavailable={initial === null}
      error={list.error}
    >
      {list.editing !== null && (
        <SkillForm
          // Remount when switching between skills so the form picks up the new values.
          key={list.editing}
          initial={editingSkill ?? EMPTY_SKILL}
          busy={list.busy}
          onSubmit={list.submit}
          onCancel={() => list.startEditing(null)}
        />
      )}
      {list.items.length === 0 && list.editing !== NEW && (
        <EmptyState icon={Idea01Icon}>No skills yet. Add the ones that describe you best.</EmptyState>
      )}
      {list.items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {list.items.map((item) => (
            <li
              key={item.id}
              className="inline-flex h-9 items-center rounded-full border border-stone-200 bg-white pl-3.5 pr-1 text-sm text-stone-950"
            >
              <button
                type="button"
                onClick={() => list.startEditing(item.id)}
                disabled={list.busy}
                title={`Edit ${item.name}`}
                className="font-medium hover:underline"
              >
                {item.name}
                {item.level && (
                  <span className="ml-1.5 font-normal text-stone-500">{SKILL_LEVEL_LABELS[item.level]}</span>
                )}
              </button>
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                onClick={() => list.destroy(item.id)}
                disabled={list.busy}
                className="ml-1 inline-flex size-7 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-950"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function SkillForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: SkillInput;
  busy: boolean;
  onSubmit: (input: SkillInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SkillInput>(initial);

  return (
    <FormShell
      busy={busy}
      onCancel={onCancel}
      onSubmit={() => onSubmit(form)}
      submitLabel={initial.id ? 'Save' : 'Add skill'}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <TextField
          label="Skill"
          value={form.name}
          onChange={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Figma, user research, prototyping"
          required
          autoFocus
        />
        <Field label="Level" hint="Optional">
          {(id) => (
            <select
              id={id}
              value={form.level ?? ''}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  level: SKILL_LEVEL_VALUES.find((l) => l === e.target.value) ?? null,
                }))
              }
              className={`${CONTROL_CLASS} px-2`}
            >
              <option value="">Not set</option>
              {SKILL_LEVEL_VALUES.map((level) => (
                <option key={level} value={level}>
                  {SKILL_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
    </FormShell>
  );
}

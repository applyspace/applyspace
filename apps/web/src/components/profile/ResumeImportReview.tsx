'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, InformationCircleIcon, Loading02Icon } from '@hugeicons/core-free-icons';
import { type ParsedResume, validateParsedResume } from '@apply/core/resume';
import { useLocale } from '@/components/providers/Providers';
import { cn } from '@/lib/utils';
import {
  GHOST_BUTTON_CLASS,
  IconButton,
  MonthField,
  Notice,
  PRIMARY_BUTTON_CLASS,
  TextField,
} from './fields';

/**
 * Review step of a resume or LinkedIn import (APP-110): the user sees what the
 * parser found, edits or removes entries, and only the confirmed draft goes to
 * `onConfirm`. Nothing is written here; the caller saves (`importParsedProfile`)
 * or keeps the draft (onboarding prefill). Entries the parser was unsure about
 * are marked "Please check".
 */

interface ExperienceDraft {
  include: boolean;
  low: boolean;
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}
interface EducationDraft {
  include: boolean;
  low: boolean;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
}
interface SkillDraft {
  include: boolean;
  name: string;
  level: string;
}

function draftsFrom(resume: ParsedResume) {
  return {
    firstName: resume.firstName?.value ?? '',
    lastName: resume.lastName?.value ?? '',
    jobTitle: resume.jobTitle?.value ?? '',
    experiences: resume.experiences.map<ExperienceDraft>((e) => ({
      include: true,
      low: e.confidence === 'low',
      jobTitle: e.jobTitle ?? '',
      companyName: e.companyName ?? '',
      location: e.location ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      isCurrent: e.isCurrent === true,
      description: e.description ?? '',
    })),
    education: resume.education.map<EducationDraft>((e) => ({
      include: true,
      low: e.confidence === 'low',
      school: e.school ?? '',
      degree: e.degree ?? '',
      field: e.field ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      description: e.description ?? '',
    })),
    skills: resume.skills.map<SkillDraft>((s) => ({ include: true, name: s.name, level: s.level ?? '' })),
  };
}

const field = (value: string) => (value.trim() ? { value: value.trim(), confidence: 'high' as const } : undefined);

/** The reviewed draft as a clean ParsedResume (unedited groups such as languages are kept as parsed). */
function resumeFrom(original: ParsedResume, d: ReturnType<typeof draftsFrom>): ParsedResume {
  return validateParsedResume({
    ...original,
    firstName: field(d.firstName),
    lastName: field(d.lastName),
    jobTitle: field(d.jobTitle),
    experiences: d.experiences
      .filter((e) => e.include)
      .map((e) => ({ ...e, confidence: 'high', endDate: e.isCurrent ? undefined : e.endDate })),
    education: d.education.filter((e) => e.include).map((e) => ({ ...e, confidence: 'high' })),
    skills: d.skills.filter((s) => s.include).map((s) => ({ name: s.name, level: s.level || undefined, confidence: 'high' })),
  }).resume;
}

function Check({ children }: { children: string }) {
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{children}</span>;
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-950">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-stone-400">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

export function ResumeImportReview({
  resume,
  onConfirm,
  onCancel,
  busy = false,
  error,
  confirmLabel,
  className,
}: {
  resume: ParsedResume;
  onConfirm: (reviewed: ParsedResume) => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
  confirmLabel?: string;
  className?: string;
}) {
  const { t } = useLocale();
  const copy = t.resumeImport;
  const [draft, setDraft] = useState(() => draftsFrom(resume));

  const patch = <K extends 'experiences' | 'education' | 'skills'>(key: K, index: number, change: Partial<(typeof draft)[K][number]>) =>
    setDraft((d) => ({ ...d, [key]: d[key].map((item, i) => (i === index ? { ...item, ...change } : item)) }));

  const isEmpty = draft.experiences.length + draft.education.length + draft.skills.length === 0 && !draft.firstName && !draft.lastName && !draft.jobTitle;
  const hasLater = resume.languages.length + resume.certifications.length + resume.links.length > 0 || !!resume.description;

  return (
    <div className={cn('space-y-6', className)}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-stone-950">{copy.title}</h2>
        <p className="text-sm text-stone-600">{copy.subtitle}</p>
      </header>

      {isEmpty && <Notice icon={InformationCircleIcon} title={copy.empty} />}

      <Section title={copy.about}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={copy.firstName} value={draft.firstName} onChange={(v) => setDraft({ ...draft, firstName: v })} disabled={busy} />
          <TextField label={copy.lastName} value={draft.lastName} onChange={(v) => setDraft({ ...draft, lastName: v })} disabled={busy} />
          <TextField className="sm:col-span-2" label={copy.jobTitle} value={draft.jobTitle} onChange={(v) => setDraft({ ...draft, jobTitle: v })} disabled={busy} />
        </div>
      </Section>

      {draft.experiences.length > 0 && (
        <Section title={copy.experience} count={draft.experiences.length}>
          <ul className="space-y-3">
            {draft.experiences.map((e, i) => (
              <li key={i} className={cn('space-y-3 rounded-2xl border border-stone-200 p-4', !e.include && 'opacity-50')}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={e.include} disabled={busy} onChange={(ev) => patch('experiences', i, { include: ev.target.checked })} />
                    {copy.include}
                  </label>
                  {e.low && <Check>{copy.check}</Check>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label={copy.position} value={e.jobTitle} onChange={(v) => patch('experiences', i, { jobTitle: v })} disabled={busy || !e.include} />
                  <TextField label={copy.company} value={e.companyName} onChange={(v) => patch('experiences', i, { companyName: v })} disabled={busy || !e.include} />
                  <MonthField label={copy.start} value={e.startDate} onChange={(v) => patch('experiences', i, { startDate: v })} disabled={busy || !e.include} />
                  <MonthField label={copy.end} value={e.isCurrent ? '' : e.endDate} onChange={(v) => patch('experiences', i, { endDate: v })} disabled={busy || !e.include || e.isCurrent} />
                  <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
                    <input type="checkbox" checked={e.isCurrent} disabled={busy || !e.include} onChange={(ev) => patch('experiences', i, { isCurrent: ev.target.checked })} />
                    {copy.current}
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {draft.education.length > 0 && (
        <Section title={copy.education} count={draft.education.length}>
          <ul className="space-y-3">
            {draft.education.map((e, i) => (
              <li key={i} className={cn('space-y-3 rounded-2xl border border-stone-200 p-4', !e.include && 'opacity-50')}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={e.include} disabled={busy} onChange={(ev) => patch('education', i, { include: ev.target.checked })} />
                    {copy.include}
                  </label>
                  {e.low && <Check>{copy.check}</Check>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label={copy.school} value={e.school} onChange={(v) => patch('education', i, { school: v })} disabled={busy || !e.include} />
                  <TextField label={copy.degree} value={e.degree} onChange={(v) => patch('education', i, { degree: v })} disabled={busy || !e.include} />
                  <TextField className="sm:col-span-2" label={copy.field} value={e.field} onChange={(v) => patch('education', i, { field: v })} disabled={busy || !e.include} />
                  <MonthField label={copy.start} value={e.startDate} onChange={(v) => patch('education', i, { startDate: v })} disabled={busy || !e.include} />
                  <MonthField label={copy.end} value={e.endDate} onChange={(v) => patch('education', i, { endDate: v })} disabled={busy || !e.include} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {draft.skills.length > 0 && (
        <Section title={copy.skills} count={draft.skills.filter((s) => s.include).length}>
          <ul className="flex flex-wrap gap-2">
            {draft.skills.map((s, i) =>
              s.include ? (
                <li key={i} className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white py-1 pr-1 pl-3 text-sm text-stone-950">
                  {s.name}
                  <IconButton icon={Cancel01Icon} label={`${copy.remove} ${s.name}`} disabled={busy} onClick={() => patch('skills', i, { include: false })} />
                </li>
              ) : null,
            )}
          </ul>
        </Section>
      )}

      {hasLater && <Notice icon={InformationCircleIcon} title={copy.keptForLater} />}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button type="button" className={GHOST_BUTTON_CLASS} disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </button>
        <button type="button" className={cn(PRIMARY_BUTTON_CLASS)} disabled={busy} onClick={() => onConfirm(resumeFrom(resume, draft))}>
          {busy && <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />}
          {busy ? copy.saving : (confirmLabel ?? copy.confirm)}
        </button>
      </div>
    </div>
  );
}

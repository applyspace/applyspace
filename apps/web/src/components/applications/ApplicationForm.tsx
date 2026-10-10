'use client';

import { useId, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { HUB_STATUSES } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { createApplication } from '@/app/(auth)/applications/actions';
import type { NewApplicationInput } from '@/lib/applicationsCreate';

export interface HubDocument {
  id: string;
  name: string;
}

const control =
  'w-full rounded-2xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none transition-[color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50';

/**
 * Create an application by hand. One form, two presentations: the peek sheet of
 * the hub and the full page `/applications/new`.
 */
export function ApplicationForm({
  today,
  companyNames,
  documents,
  capReached,
  cap,
  initial,
  onCreated,
  onCancel,
}: {
  /** `YYYY-MM-DD` of today, from the server, so the default date is the same on both sides. */
  today: string;
  companyNames: string[];
  documents: HubDocument[];
  capReached: boolean;
  cap: number | null;
  initial?: Partial<NewApplicationInput>;
  onCreated: (created: { id: string; slug: string }) => void;
  onCancel?: () => void;
}) {
  const { t } = useHubT();
  const listId = useId();
  const [values, setValues] = useState<NewApplicationInput>({
    companyName: '',
    jobTitle: '',
    url: '',
    location: '',
    status: 'waiting',
    appliedAt: today,
    deadlineAt: '',
    notes: '',
    documentIds: [],
    offerId: null,
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof NewApplicationInput>(key: K, value: NewApplicationInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createApplication(values);
      if (result.ok) {
        onCreated({ id: result.id, slug: result.slug });
      } else {
        setError(result.reason === 'cap' && cap !== null ? t.capReached(cap) : result.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {capReached && cap !== null && (
        <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t.capReached(cap)}
        </p>
      )}

      <Field label={t.form.company} required>
        {(id) => (
          <>
            <Input
              id={id}
              required
              maxLength={120}
              list={listId}
              value={values.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder={t.form.companyPlaceholder}
              autoComplete="organization"
            />
            <datalist id={listId}>
              {companyNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </>
        )}
      </Field>

      <Field label={t.form.title} required>
        {(id) => (
          <Input id={id} required maxLength={160} value={values.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
        )}
      </Field>

      <Field label={t.form.link}>
        {(id) => (
          <Input
            id={id}
            type="text"
            inputMode="url"
            value={values.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://"
          />
        )}
      </Field>

      <Field label={t.form.location}>
        {(id) => <Input id={id} maxLength={160} value={values.location} onChange={(e) => set('location', e.target.value)} />}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t.form.status}>
          {(id) => (
            <select id={id} className={control} value={values.status} onChange={(e) => set('status', e.target.value)}>
              {HUB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.statuses[s]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.form.appliedOn} required>
          {(id) => (
            <Input id={id} type="date" required value={values.appliedAt} onChange={(e) => set('appliedAt', e.target.value)} />
          )}
        </Field>
        <Field label={t.form.deadline}>
          {(id) => <Input id={id} type="date" value={values.deadlineAt} onChange={(e) => set('deadlineAt', e.target.value)} />}
        </Field>
      </div>

      <Field label={t.form.notes}>
        {(id) => (
          <textarea
            id={id}
            rows={4}
            maxLength={5000}
            className={control}
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">{t.form.documents}</legend>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.form.noDocuments}</p>
        ) : (
          documents.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={values.documentIds.includes(d.id)}
                onCheckedChange={(on) =>
                  set('documentIds', on ? [...values.documentIds, d.id] : values.documentIds.filter((x) => x !== d.id))
                }
              />
              <span className="truncate">{d.name}</span>
            </label>
          ))
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {t.form.cancel}
          </Button>
        )}
        <Button type="submit" disabled={pending || capReached}>
          {pending ? t.form.saving : t.form.submit}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children(id)}
    </div>
  );
}

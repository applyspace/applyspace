'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading02Icon } from '@hugeicons/core-free-icons';
import type { ParsedResume } from '@apply/core/resume';
import { importParsedProfile, parseDocumentResume } from '@/app/(app)/profile-import/actions';
import type { ImportReport } from '@/lib/profileImport';
import { useLocale } from '@/components/providers/Providers';
import { PRIMARY_BUTTON_CLASS } from './fields';
import { ResumeImportReview } from './ResumeImportReview';

/**
 * Profile import from a stored CV (APP-110): parses the text kept with the
 * document, shows the review, and writes only after the user confirms. Merges
 * into the profile (no duplicates when the same resume is imported twice).
 */

type Phase =
  | { name: 'parsing' }
  | { name: 'review'; resume: ParsedResume; saving: boolean; error: string | null }
  | { name: 'done'; report: ImportReport }
  | { name: 'error'; message: string };

export function ResumeImportFlow({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const { t } = useLocale();
  const copy = t.resumeImport;
  const [phase, setPhase] = useState<Phase>({ name: 'parsing' });

  useEffect(() => {
    let cancelled = false;
    parseDocumentResume(documentId)
      .then((result) => {
        if (cancelled) return;
        setPhase(
          result.ok
            ? { name: 'review', resume: result.data.resume, saving: false, error: null }
            : { name: 'error', message: result.reason === 'signed-out' ? copy.signedOut : result.message },
        );
      })
      .catch(() => !cancelled && setPhase({ name: 'error', message: copy.error }));
    return () => {
      cancelled = true;
    };
  }, [documentId, copy.signedOut, copy.error]);

  async function save(reviewed: ParsedResume) {
    if (phase.name !== 'review') return;
    setPhase({ ...phase, saving: true, error: null });
    try {
      const result = await importParsedProfile(reviewed);
      if (!result.ok) {
        setPhase({ name: 'review', resume: phase.resume, saving: false, error: result.reason === 'signed-out' ? copy.signedOut : result.message });
        return;
      }
      posthog.capture('resume_import_confirmed', {
        experiences: result.data.created.experiences,
        education: result.data.created.education,
        skills: result.data.created.skills,
      });
      setPhase({ name: 'done', report: result.data });
    } catch {
      setPhase({ name: 'review', resume: phase.resume, saving: false, error: copy.error });
    }
  }

  if (phase.name === 'parsing') {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-stone-500">
        <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
        {copy.reading}
      </div>
    );
  }

  if (phase.name === 'error') {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-red-600">
          {phase.message}
        </p>
        <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={onClose}>
          {copy.cancel}
        </button>
      </div>
    );
  }

  if (phase.name === 'done') {
    const { created, incomplete, failed } = phase.report;
    const added = created.experiences + created.education + created.skills + (created.name ? 1 : 0) + (created.jobTitle ? 1 : 0);
    const skipped = incomplete.experiences + incomplete.education;
    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-stone-950">{copy.saved}</h3>
        <p className="text-sm text-stone-600">
          {added > 0
            ? copy.added
                .replace('{experiences}', String(created.experiences))
                .replace('{education}', String(created.education))
                .replace('{skills}', String(created.skills))
            : copy.nothingNew}
        </p>
        {skipped > 0 && <p className="text-sm text-stone-500">{copy.incomplete.replace('{n}', String(skipped))}</p>}
        {failed > 0 && <p className="text-sm text-red-600">{copy.failed.replace('{n}', String(failed))}</p>}
        <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={onClose}>
          OK
        </button>
      </div>
    );
  }

  return <ResumeImportReview resume={phase.resume} busy={phase.saving} error={phase.error} onConfirm={save} onCancel={onClose} />;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Loading02Icon } from '@hugeicons/core-free-icons';
import { type OnboardingPrefill, type ParsedResume, onboardingPrefill } from '@apply/core/resume';
import { removeDocument } from '@/app/(app)/onboarding/actions';
import { parseDocumentResume } from '@/app/(app)/profile-import/actions';
import { saveImportedFile } from '@/components/onboarding/v2/saveImportedFile';
import { ResumeImportReview } from '@/components/profile/ResumeImportReview';
import { useLocale } from '@/components/providers/Providers';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

/**
 * Onboarding import step, parser side (APP-120). When a resume is picked it is
 * uploaded to the user's own documents (the existing path, which also keeps its
 * text), parsed on the server, and the role step is prefilled: the job title
 * appears already selected under the search bar and the seniority card is
 * preselected. Everything stays editable, and the prefill never overwrites what
 * the user already chose. The profile rows (experiences, education, skills) are
 * only saved if the user opens the review and confirms it; the caller saves
 * `confirmed` with `importParsedProfile` at the end of onboarding.
 *
 * Signed out (demo, desktop) nothing is uploaded or parsed here, and the step
 * behaves as before.
 */

export type ResumeImportStatus = 'idle' | 'working' | 'ready' | 'unreadable';

export interface ResumeImport {
  status: ResumeImportStatus;
  /** The CV is already stored in the account: the end of onboarding must not upload it again. */
  documentId: string | null;
  resume: ParsedResume | null;
  /** The draft the user reviewed and confirmed (null until then). */
  confirmed: ParsedResume | null;
  confirm: (reviewed: ParsedResume) => void;
}

interface Settled {
  /** The file this result belongs to; while it differs from the picked file, the import is still working. */
  file: File;
  status: 'idle' | 'ready' | 'unreadable';
  documentId: string | null;
  resume: ParsedResume | null;
  confirmed: ParsedResume | null;
}

export function useResumeImport(file: File | null, onPrefill: (prefill: OnboardingPrefill) => void): ResumeImport {
  const [settled, setSettled] = useState<Settled | null>(null);
  const prefill = useRef(onPrefill);
  useEffect(() => {
    prefill.current = onPrefill;
  });
  const stored = useRef<string | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    // A newly picked file replaces the previous one: do not leave the first copy in the account.
    if (stored.current) {
      void removeDocument(stored.current).catch(() => undefined);
      stored.current = null;
    }

    (async () => {
      const saved = await saveImportedFile(file);
      if (cancelled && saved.ok) void removeDocument(saved.documentId).catch(() => undefined);
      if (cancelled) return;
      // Signed out, too large, not a PDF/DOCX or a failed upload: nothing to parse, keep the old behavior.
      if (!saved.ok) return setSettled({ file, status: 'idle', documentId: null, resume: null, confirmed: null });
      stored.current = saved.documentId;
      const parsed = await parseDocumentResume(saved.documentId);
      if (cancelled) return;
      if (!parsed.ok) return setSettled({ file, status: 'unreadable', documentId: saved.documentId, resume: null, confirmed: null });
      setSettled({ file, status: 'ready', documentId: saved.documentId, resume: parsed.data.resume, confirmed: null });
      prefill.current(onboardingPrefill(parsed.data.resume));
    })().catch(() => !cancelled && setSettled({ file, status: 'idle', documentId: stored.current, resume: null, confirmed: null }));

    return () => {
      cancelled = true;
    };
  }, [file]);

  const confirm = useCallback((reviewed: ParsedResume) => setSettled((s) => (s ? { ...s, confirmed: reviewed } : s)), []);

  if (!file) return { status: 'idle', documentId: null, resume: null, confirmed: null, confirm };
  if (!settled || settled.file !== file) return { status: 'working', documentId: null, resume: null, confirmed: null, confirm };
  return { status: settled.status, documentId: settled.documentId, resume: settled.resume, confirmed: settled.confirmed, confirm };
}

/** Compact result under the upload zone, with the review in a side sheet. */
export function ResumePrefillSummary({ importState }: { importState: ResumeImport }) {
  const { t } = useLocale();
  const copy = t.resumeImport;
  const [open, setOpen] = useState(false);
  const { status, resume, confirmed } = importState;

  if (status === 'idle') return null;
  if (status === 'working') {
    return (
      <p role="status" className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
        {copy.reading}
      </p>
    );
  }
  if (status === 'unreadable' || !resume) {
    return <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted-foreground">{copy.readFailed}</p>;
  }

  const name = [resume.firstName?.value, resume.lastName?.value].filter(Boolean).join(' ');
  const counts = copy.found
    .replace('{experiences}', String(resume.experiences.length))
    .replace('{education}', String(resume.education.length))
    .replace('{skills}', String(resume.skills.length));

  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl items-center justify-between gap-4 rounded-3xl bg-muted px-5 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{[name, resume.jobTitle?.value].filter(Boolean).join(' · ') || copy.title}</p>
        <p className="truncate text-muted-foreground">{confirmed ? copy.confirmedNote : counts}</p>
      </div>
      <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
        {confirmed && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={1.8} />}
        {confirmed ? copy.reviewAgain : copy.review}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="overflow-y-auto p-6 sm:max-w-xl">
          <SheetTitle className="sr-only">{copy.title}</SheetTitle>
          <SheetDescription className="sr-only">{copy.subtitle}</SheetDescription>
          <ResumeImportReview
            resume={confirmed ?? resume}
            confirmLabel={copy.confirmForLater}
            onCancel={() => setOpen(false)}
            onConfirm={(reviewed) => {
              importState.confirm(reviewed);
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

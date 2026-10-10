'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useHubT } from '@/lib/applicationsI18n';
import { ApplicationForm, type HubDocument } from './ApplicationForm';

/** Presentation 1 of "new application": a side sheet over the hub (quick capture, stays in context). */
export function NewApplicationPeek({
  open,
  onClose,
  today,
  companyNames,
  documents,
  capReached,
  cap,
}: {
  open: boolean;
  onClose: () => void;
  today: string;
  companyNames: string[];
  documents: HubDocument[];
  capReached: boolean;
  cap: number | null;
}) {
  const { t } = useHubT();
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-base font-semibold">{t.form.pageTitle}</SheetTitle>
          <SheetDescription>{t.form.pageSubtitle}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {open && (
            <ApplicationForm
              today={today}
              companyNames={companyNames}
              documents={documents}
              capReached={capReached}
              cap={cap}
              onCreated={onClose}
              onCancel={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

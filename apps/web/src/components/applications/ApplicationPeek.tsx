'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare01Icon, Location06Icon, Calendar03Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import type { ApplicationStatus } from '@apply/core/applications';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { buttonVariants } from '@/components/ui/button';
import type { HubApplication } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { cn } from '@/lib/utils';
import { CompanyLogo } from './CompanyLogo';
import { StatusMenu } from './StatusMenu';
import { formatDayTime } from './dates';

/** Side view of one application: quick read and status change, with a link to the full page. */
export function ApplicationPeek({
  application,
  onClose,
  onMove,
}: {
  application: HubApplication | null;
  onClose: () => void;
  onMove: (id: string, status: ApplicationStatus) => void;
}) {
  const { t, locale } = useHubT();
  const a = application;

  return (
    <Sheet open={a !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
        {a && (
          <>
            <SheetHeader className="flex flex-row items-start gap-3 border-b px-6 py-5 pr-14">
              <CompanyLogo name={a.companyName} domain={a.companyDomain} className="size-11" />
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-base font-semibold">{a.companyName}</SheetTitle>
                <SheetDescription className="truncate">{a.jobTitle}</SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <StatusMenu status={a.status} onSelect={(s) => onMove(a.id, s)} variant="badge" className="-ml-0.5" />

              <section className="space-y-2.5">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.details}</h3>
                <dl className="space-y-2 text-sm">
                  <Row label={t.appliedOn}>{formatDayTime(a.appliedAt, locale)}</Row>
                  {a.location && (
                    <Row label={t.location} icon={Location06Icon}>
                      {a.location}
                    </Row>
                  )}
                  {a.deadlineAt && (
                    <Row label={t.deadline} icon={Calendar03Icon}>
                      {formatDayTime(a.deadlineAt, locale)}
                    </Row>
                  )}
                  {a.url && (
                    <Row label={t.link} icon={LinkSquare01Icon}>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {t.openLink}
                      </a>
                    </Row>
                  )}
                </dl>
              </section>

              <section className="space-y-2.5">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.interviews}</h3>
                {a.interviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noInterviews}</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {a.interviews.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3">
                        <span>{i.stage}</span>
                        <span className="text-muted-foreground">
                          {i.scheduledAt ? formatDayTime(i.scheduledAt, locale) : t.unscheduled}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2.5">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.notes}</h3>
                <p className={cn('text-sm whitespace-pre-wrap', !a.notes && 'text-muted-foreground')}>
                  {a.notes ?? t.noNotes}
                </p>
              </section>
            </div>

            <div className="border-t px-6 py-4">
              <Link
                href={`/applications/${a.slug}`}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              >
                {t.openFullPage}
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: typeof LinkSquare01Icon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        {icon && <HugeiconsIcon icon={icon} size={14} />}
        {label}
      </dt>
      <dd className="min-w-0 text-right break-words text-foreground">{children}</dd>
    </div>
  );
}

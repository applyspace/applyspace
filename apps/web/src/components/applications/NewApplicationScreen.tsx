'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useHubT } from '@/lib/applicationsI18n';
import type { NewApplicationInput } from '@/lib/applicationsCreate';
import { ApplicationForm, type HubDocument } from './ApplicationForm';

/** Presentation 2 of "new application": a full page with room for notes and documents. */
export function NewApplicationScreen({
  today,
  companyNames,
  documents,
  capReached,
  cap,
  initial,
  fromOffer,
}: {
  today: string;
  companyNames: string[];
  documents: HubDocument[];
  capReached: boolean;
  cap: number | null;
  initial?: Partial<NewApplicationInput>;
  fromOffer: boolean;
}) {
  const { t } = useHubT();
  const router = useRouter();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-8 md:py-10">
      <Link
        href="/applications"
        className="inline-flex w-fit items-center gap-1 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
        {t.form.back}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.form.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{fromOffer ? t.form.fromOffer : t.form.pageSubtitle}</p>
      </header>
      <ApplicationForm
        today={today}
        companyNames={companyNames}
        documents={documents}
        capReached={capReached}
        cap={cap}
        initial={initial}
        onCreated={() => router.push('/applications')}
        onCancel={() => router.push('/applications')}
      />
    </div>
  );
}

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { File01Icon } from '@hugeicons/core-free-icons';
import { HomeCard, HomeCardLabel } from './HomeCard';

const SECONDARY_LINK =
  'inline-flex h-9 items-center rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50';

export function CvCard({
  firstName,
  lastName,
  hasCv,
}: {
  firstName: string;
  lastName: string;
  hasCv: boolean;
}) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return (
    <HomeCard>
      <HomeCardLabel icon={<HugeiconsIcon icon={File01Icon} size={16} />}>
        Profile and CV
      </HomeCardLabel>

      <p className="mt-3 text-xl font-semibold tracking-tight text-stone-950">
        {fullName || 'Your profile'}
      </p>
      <p className="mt-1 text-sm text-stone-700">
        {hasCv
          ? 'Your CV is on file. Keep it up to date in your documents.'
          : 'Keep your CV in your documents so it is ready for every application.'}
      </p>

      {/* `?settings=<tab>` opens the Settings panel on that tab (handled by the navigation). */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/?settings=documents" className={SECONDARY_LINK}>
          Edit CV
        </Link>
        <Link href="/?settings=profile" className={SECONDARY_LINK}>
          Edit profile
        </Link>
      </div>
    </HomeCard>
  );
}

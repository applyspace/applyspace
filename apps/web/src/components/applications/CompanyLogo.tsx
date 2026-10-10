'use client';

import { useState } from 'react';
import { brandSymbolUrl } from '@/lib/brandfetch';
import { cn } from '@/lib/utils';

/** Brandfetch symbol by domain; the first letter of the name stands in when there is no domain or the image fails. */
export function CompanyLogo({
  name,
  domain,
  className,
}: {
  name: string;
  domain: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background text-sm font-medium text-muted-foreground',
        className,
      )}
    >
      {domain !== null && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandSymbolUrl(domain)}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          className="size-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        (name.trim()[0] ?? '?').toUpperCase()
      )}
    </span>
  );
}

'use client';

import { useState } from 'react';
import { brandIconUrl, brandSymbolUrl } from '@/lib/brandfetch';
import { cn } from '@/lib/utils';

/**
 * Brandfetch logo by domain, as a plain <img> (same approach as the sign-in offers list).
 * If it fails to load, the first letter of the name stands in so layout never shifts.
 */
export function BrandLogo({
  name,
  domain,
  src,
  kind = 'icon',
  className,
}: {
  name: string;
  domain: string;
  /** Explicit Brandfetch asset URL, for products that live under a parent brand (e.g. Gmail under google.com). */
  src?: string;
  kind?: 'icon' | 'symbol';
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  return (
    <span
      title={name}
      className={cn('flex shrink-0 items-center justify-center text-xs font-medium text-muted-foreground', className)}
    >
      {missing ? (
        name[0]
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? (kind === 'icon' ? brandIconUrl(domain) : brandSymbolUrl(domain))}
          alt={name}
          width={48}
          height={48}
          className="size-full object-contain"
          onError={() => setMissing(true)}
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setMissing(true);
          }}
        />
      )}
    </span>
  );
}

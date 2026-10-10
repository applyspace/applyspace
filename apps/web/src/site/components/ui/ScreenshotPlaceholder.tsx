import Image from 'next/image';
import type { ImageRef } from '@/site/content/types';
import { cn } from '@/site/lib/cn';

/**
 * Screenshot slot. Shows the Sanity image when the editor uploaded one, otherwise a neutral placeholder.
 * The alt text is always present so the markup is final before the real screenshots exist.
 */
export function ScreenshotPlaceholder({
  alt,
  image,
  label,
  priority = false,
  className,
  slot,
}: {
  alt: string;
  image?: ImageRef;
  label: string;
  priority?: boolean;
  className?: string;
  /** Slot name shown under the label, so the missing file is easy to find (docs/website-shots.md). */
  slot?: string;
}) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.alt || alt}
        width={1600}
        height={1000}
        priority={priority}
        sizes="(min-width: 1024px) 560px, 100vw"
        className={cn('aspect-[16/10] w-full rounded-3xl border border-stone-200 object-cover object-top', className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-3xl bg-stone-100 p-6 text-center', className)}
    >
      <span className="text-xs text-stone-500">{label}</span>
      {slot && <span className="font-mono text-[11px] text-stone-400">{slot}</span>}
    </div>
  );
}

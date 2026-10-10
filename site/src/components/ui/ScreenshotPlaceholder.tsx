import Image from 'next/image';
import type { ImageRef } from '@/content/types';
import { cn } from '@/lib/cn';

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
}: {
  alt: string;
  image?: ImageRef;
  label: string;
  priority?: boolean;
  className?: string;
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
      className={cn('flex aspect-[16/10] w-full items-center justify-center rounded-3xl bg-stone-100 p-6 text-center', className)}
    >
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}

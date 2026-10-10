import Image, { getImageProps } from 'next/image';
import { ScreenshotPlaceholder } from './ScreenshotPlaceholder';
import type { Shot } from '@/site/content/types';
import { ui } from '@/site/content/ui';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';
import { RATIO_CLASS, SHOT_SIZE, SM_RATIO_CLASS, shotSrc } from '@/site/lib/shots';

/**
 * A product visual slot. Renders `public/site/shots/<name>.avif` through next/image once the file exists
 * (with an optional separate mobile crop through <picture>), and the screenshot placeholder until then.
 * Same ratio, alt text and caption in both states, so the layout never changes when the file lands.
 */
export function ProductShot({
  locale,
  shot,
  figure,
  priority = false,
  sizes = '(min-width: 1200px) 1120px, 100vw',
  framed = true,
  className,
  frameClassName,
}: {
  locale: Locale;
  shot: Shot;
  /** Figure number; with a caption, renders "Fig. N - caption". */
  figure?: number;
  priority?: boolean;
  sizes?: string;
  framed?: boolean;
  className?: string;
  frameClassName?: string;
}) {
  const t = ui[locale];
  const src = shotSrc(shot.name);
  const mobileSrc = shot.mobile ? shotSrc(shot.mobile.name) : null;
  const ratio = shot.mobile ? cn(RATIO_CLASS[shot.mobile.ratio], SM_RATIO_CLASS[shot.ratio]) : RATIO_CLASS[shot.ratio];
  const loading = priority ? undefined : 'lazy';
  const imgClass = 'block h-auto w-full';

  let media: React.ReactNode;
  if (src && shot.mobile && mobileSrc) {
    // getImageProps does not preload: the hero sets fetchPriority and eager loading itself.
    const common = { alt: shot.alt, sizes, loading: priority ? 'eager' : 'lazy', fetchPriority: priority ? 'high' : undefined } as const;
    const desktop = getImageProps({ ...common, src, ...SHOT_SIZE[shot.ratio] }).props;
    const mobile = getImageProps({ ...common, src: mobileSrc, ...SHOT_SIZE[shot.mobile.ratio], sizes: '100vw' }).props;
    media = (
      <picture>
        <source media="(max-width: 639px)" srcSet={mobile.srcSet} width={mobile.width} height={mobile.height} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- props from getImageProps, alt included */}
        <img {...desktop} className={imgClass} />
      </picture>
    );
  } else if (src) {
    media = <Image src={src} alt={shot.alt} {...SHOT_SIZE[shot.ratio]} sizes={sizes} preload={priority} loading={loading} fetchPriority={priority ? 'high' : undefined} className={imgClass} />;
  } else {
    media = (
      <ScreenshotPlaceholder
        alt={shot.alt}
        label={`${t.screenshotLabel}: ${shot.caption ?? shot.alt}`}
        slot={shot.mobile ? `${shot.name} / ${shot.mobile.name}` : shot.name}
        className={cn('rounded-none', ratio)}
      />
    );
  }

  const caption = shot.caption && figure !== undefined ? `${t.figure} ${figure} - ${shot.caption}` : shot.caption;

  return (
    <figure className={cn('min-w-0', className)}>
      <div className={cn('overflow-hidden', framed && 'rounded-2xl border border-stone-200 bg-white', frameClassName)}>{media}</div>
      {caption && <figcaption className="mt-3 text-[13px] leading-snug text-stone-600">{caption}</figcaption>}
    </figure>
  );
}

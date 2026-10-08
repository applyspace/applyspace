'use client';

import { useEffect, useRef, useState } from 'react';

/** Fade on the bottom edge of an inner scroll list; once the list is scrolled, the top edge fades too. */
export const FADE_BOTTOM = '[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]';
export const FADE_BOTH = '[mask-image:linear-gradient(to_bottom,transparent,black_2.5rem,black_calc(100%-3rem),transparent)]';

/**
 * True only when the content really overflows its max height. Used to switch on the bottom padding and the fade
 * of inner scroll lists, so a list that fits shows neither a fade nor a scroll area.
 * `pad` is the bottom padding (px) that is only applied while the list is scrollable.
 */
export function useOverflow<T extends HTMLElement>(deps: unknown[], pad = 64) {
  const ref = useRef<T>(null);
  const [scrollable, setScrollable] = useState(false);
  // True once the list is scrolled away from its top: that is when the top edge needs its own fade.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const natural = el.scrollHeight - (el.dataset.scrollable === 'true' ? pad : 0);
      setScrollable(natural > el.clientHeight + 1);
    };
    const onScroll = () => setScrolled(el.scrollTop > 1);
    measure();
    onScroll();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, scrollable, scrolled };
}

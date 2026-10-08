'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * True only when the content really overflows its max height. Used to switch on the bottom padding and the fade
 * of inner scroll lists, so a list that fits shows neither a fade nor a scroll area.
 * `pad` is the bottom padding (px) that is only applied while the list is scrollable.
 */
export function useOverflow<T extends HTMLElement>(deps: unknown[], pad = 64) {
  const ref = useRef<T>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const natural = el.scrollHeight - (el.dataset.scrollable === 'true' ? pad : 0);
      setScrollable(natural > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, scrollable };
}

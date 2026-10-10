'use client';

import { useEffect } from 'react';

/**
 * Section reveal without an animation library: marks `[data-reveal]` elements once they are 20% visible;
 * the CSS in site.css does the 8px rise and fade. Elements already on screen are revealed at once, and
 * nothing is hidden without JavaScript or under prefers-reduced-motion. Renders nothing.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );
    for (const el of els) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute('data-revealed', '');
      else io.observe(el);
    }
    root.setAttribute('data-reveal-ready', '');
    return () => {
      io.disconnect();
      root.removeAttribute('data-reveal-ready');
    };
  }, []);

  return null;
}

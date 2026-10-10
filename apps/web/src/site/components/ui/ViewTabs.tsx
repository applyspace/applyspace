'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

/**
 * ARIA tabs (automatic activation): arrow keys, Home and End move between tabs, the panel follows.
 * Panels are rendered on the server and passed in; inactive ones are `hidden`, so their lazy images
 * only load when shown. Without JavaScript the first view stays visible.
 */
export function ViewTabs({ id, label, tabs, panels }: { id: string; label: string; tabs: { key: string; label: ReactNode }[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number) => {
    setActive(i);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select(keys[e.key]);
  };

  return (
    <div>
      <div className="-mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:px-0">
        <div role="tablist" aria-label={label} className="inline-flex shrink-0 gap-1 rounded-full border border-stone-200 bg-white p-1">
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${tab.key}`}
              aria-selected={i === active}
              aria-controls={`${id}-panel-${tab.key}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKeyDown}
              className={
                i === active
                  ? 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-stone-950 px-3.5 text-sm font-medium text-white sm:px-5'
                  : 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-stone-700 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-950 sm:px-5'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${id}-panel-${tab.key}`}
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={i !== active}
          tabIndex={0}
          className="site-fade-in mt-8 rounded-2xl sm:mt-10"
        >
          {panels[i]}
        </div>
      ))}
    </div>
  );
}

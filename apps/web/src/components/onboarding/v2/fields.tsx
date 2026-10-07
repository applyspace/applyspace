'use client';

import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'motion/react';
import { motionTheme } from '@/lib/motion-theme';
import { cn } from '@/lib/utils';

/** Segmented look for the official ToggleGroup: a muted pill track with a white pill on the selected item, no shadow. */
export const SEGMENT_GROUP = 'rounded-full bg-muted p-1';
export const SEGMENT_ITEM = 'relative isolate rounded-full border-0 bg-transparent px-5 text-muted-foreground hover:bg-background/60 hover:text-foreground aria-pressed:bg-transparent aria-pressed:text-foreground aria-pressed:hover:bg-transparent';

/** First letter in capitals, the rest untouched (acronyms stay as they are). */
export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Small muted label above a group of fields. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm font-medium text-muted-foreground">{children}</p>;
}

/** Searchable field: large search bar, suggestions below, chosen items listed under it (left-aligned). */
export function TagSearch({
  placeholder,
  suggestions,
  fetchSuggestions,
  values,
  onChange,
  wide,
}: {
  placeholder: string;
  /** Static list, filtered locally. Ignored when `fetchSuggestions` is given. */
  suggestions?: string[];
  /** Remote autocomplete, called after a short pause in typing. */
  fetchSuggestions?: (query: string, signal: AbortSignal) => Promise<string[]>;
  values: string[];
  onChange: (next: string[]) => void;
  wide?: boolean;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const [remote, setRemote] = useState<string[]>([]);
  useEffect(() => {
    if (!fetchSuggestions || q.length < 2) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSuggestions(q, controller.signal).then((list) => !controller.signal.aborted && setRemote(list));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, fetchSuggestions]);
  const matches = (fetchSuggestions ? remote : q ? (suggestions ?? []).filter((s) => s.toLowerCase().includes(q)) : []).map(capitalize).filter((s) => !values.includes(s)).slice(0, 5);

  return (
    <div className={cn('mx-auto w-full', !wide && 'max-w-xl')}>
      <div className="relative">
        <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.8} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(capitalize(e.target.value))}
          autoCapitalize="sentences"
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-14 rounded-full pr-6 pl-13 text-base md:text-base"
        />
        {matches.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-3xl bg-popover p-1 text-left ring-1 ring-foreground/5">
            {matches.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...values, m]);
                    setQuery('');
                  }}
                  className="w-full rounded-2xl px-4 py-2.5 text-left text-sm hover:bg-muted"
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {values.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-start gap-2">
          {values.map((v) => (
            <Button key={v} variant="secondary" size="lg" onClick={() => onChange(values.filter((x) => x !== v))}>
              {capitalize(v)}
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} data-icon="inline-end" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact selectable card (multi-select). */
export function ChoiceCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl bg-card px-4 text-sm font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
        selected && 'bg-muted ring-2 ring-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

/** Sliding white pill behind the selected item of a segmented ToggleGroup. Items of one group share `group` so the pill travels between them. */
export function SegmentPill({ group }: { group: string }) {
  return <motion.span layoutId={`segment-${group}`} transition={motionTheme.transitions.ui} className="absolute inset-0 -z-10 rounded-full bg-background" />;
}

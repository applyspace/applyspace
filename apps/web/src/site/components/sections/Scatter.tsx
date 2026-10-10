import { body, h2, sectionTop, wrap } from './styles';
import { FeatureIcon } from '@/site/components/ui/icons';
import type { FragmentKind, Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';

const ICON: Record<FragmentKind, string> = { tab: 'browser', sheet: 'sheet', note: 'note', email: 'mail', calendar: 'calendar' };
/** Quiet offsets on large screens, so the fragments read as scattered without any illustration. */
const OFFSET = ['lg:ml-0', 'lg:ml-12', 'lg:ml-4', 'lg:ml-16', 'lg:ml-8'];

/** The problem as a scenario: one application spread over five tools, drawn as bordered chips. */
export function Scatter({ section }: { section: Extract<Section, { type: 'scatter' }> }) {
  return (
    <section className={cn(wrap, sectionTop)}>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-6">
        <div data-reveal className="lg:col-span-5">
          <h2 className={h2}>{section.title}</h2>
          <p className={cn(body, 'mt-5 max-w-[64ch]')}>{section.body}</p>
        </div>
        <ul aria-hidden className="flex list-none flex-col gap-3 lg:col-span-6 lg:col-start-7">
          {section.fragments.map((f, i) => (
            <li
              key={`${f.kind}-${f.label}`}
              data-reveal
              style={{ '--reveal-step': i } as React.CSSProperties}
              className={cn('flex max-w-md items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3', OFFSET[i % OFFSET.length])}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <FeatureIcon name={ICON[f.kind]} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-stone-500">{f.label}</span>
                <span className="block truncate text-sm text-stone-900">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

'use client';

import { useId } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { cn } from '@/lib/utils';

/**
 * Small form pieces shared by the profile editor, the documents panel and
 * onboarding, so the three look the same: stone outlines, h-9 controls,
 * black primary buttons, fully rounded chips.
 */

export const CONTROL_CLASS =
  'h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition-shadow placeholder:text-stone-400 focus:border-stone-400 focus:ring-3 focus:ring-stone-200 disabled:cursor-not-allowed disabled:opacity-50';

export const TEXTAREA_CLASS = cn(CONTROL_CLASS, 'h-auto min-h-24 resize-y py-2 leading-relaxed');

export const PRIMARY_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-stone-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-50';

export const SECONDARY_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-50';

export const GHOST_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-50';

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  /** Receives the id to put on the control. */
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-stone-700">
        {label}
        {hint && <span className="ml-1.5 font-normal text-stone-400">{hint}</span>}
      </label>
      {children(id)}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  className,
  ...input
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'className' | 'id'>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={CONTROL_CLASS}
          {...input}
        />
      )}
    </Field>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A month picker (month + year) holding a `YYYY-MM` string, '' while incomplete. */
export function MonthField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [year = '', month = ''] = value.split('-');

  function update(nextMonth: string, nextYear: string) {
    onChange(nextMonth || nextYear ? `${nextYear}-${nextMonth}` : '');
  }

  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex gap-2">
          <select
            id={id}
            value={month}
            disabled={disabled}
            onChange={(e) => update(e.target.value, year)}
            className={cn(CONTROL_CLASS, 'px-2', !month && 'text-stone-400')}
          >
            <option value="">Month</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={String(i + 1).padStart(2, '0')}>
                {name}
              </option>
            ))}
          </select>
          <input
            aria-label={`${label}, year`}
            inputMode="numeric"
            maxLength={4}
            placeholder="Year"
            value={year}
            disabled={disabled}
            onChange={(e) => update(month, e.target.value.replace(/\D/g, ''))}
            className={cn(CONTROL_CLASS, 'w-20 shrink-0')}
          />
        </div>
      )}
    </Field>
  );
}

/** "2023-04" → "Apr 2023". */
export function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  const name = MONTHS[Number(month) - 1];
  return name && year ? `${name} ${year}` : '';
}

/** A selectable pill. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors',
        selected
          ? 'border-stone-950 bg-stone-950 text-white'
          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
      )}
    >
      {children}
    </button>
  );
}

/** Soft panel for empty, signed-out and not-available-yet states. */
export function Notice({
  icon,
  title,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
      <HugeiconsIcon icon={icon} size={18} className="mt-0.5 shrink-0 text-stone-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-950">{title}</p>
        {children && <p className="mt-0.5 text-sm text-stone-600">{children}</p>}
      </div>
    </div>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950 disabled:pointer-events-none disabled:opacity-50"
    >
      <HugeiconsIcon icon={icon} size={16} />
    </button>
  );
}

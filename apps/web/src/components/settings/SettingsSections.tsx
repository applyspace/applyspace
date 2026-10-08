'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useAuth, useLocale } from '@/components/providers/Providers';
import { TabPlatforms } from '@/components/settings/TabPlatforms';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { LOCALES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/* ── Shared primitives (stone design system) ──────────────────────── */

const INPUT =
  'h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition-shadow placeholder:text-stone-400 focus:border-stone-400 focus:ring-3 focus:ring-stone-200 read-only:bg-stone-50 read-only:text-stone-500';
const PRIMARY_BUTTON =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-stone-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40';
const SECONDARY_BUTTON =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40';
const CARD = 'rounded-2xl border border-stone-200 bg-white p-5';

function ComingSoon() {
  return (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
      Coming soon
    </span>
  );
}

/** A labelled row: title and hint on the left, control on the right. */
function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-950">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ── General ──────────────────────────────────────────────────────── */

const APPEARANCES = ['Light', 'Dark', 'System'] as const;

export function GeneralSection() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="divide-y divide-stone-200">
      <Row title="Language" hint="The language used across Apply.">
        <div className="flex gap-1 rounded-lg bg-stone-100 p-1" role="radiogroup" aria-label="Language">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={locale === l.value}
              onClick={() => setLocale(l.value)}
              className={cn(
                'h-7 rounded-md px-3 text-sm font-medium transition-colors',
                locale === l.value
                  ? 'bg-white text-stone-950'
                  : 'text-stone-500 hover:text-stone-950',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Row>

      <Row title="Appearance" hint="Dark and system themes are on the way.">
        <div className="flex items-center gap-3">
          <ComingSoon />
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
            {APPEARANCES.map((a) => (
              <button
                key={a}
                type="button"
                disabled
                className={cn(
                  'h-7 cursor-not-allowed rounded-md px-3 text-sm font-medium',
                  a === 'Light'
                    ? 'bg-white text-stone-950'
                    : 'text-stone-400',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </Row>
    </div>
  );
}

/* ── Account ──────────────────────────────────────────────────────── */

const SIGN_IN_PROVIDERS = [
  { id: 'google', label: 'Google', icon: <GoogleIcon className="size-4 shrink-0" /> },
  {
    id: 'linkedin_oidc',
    label: 'LinkedIn',
    icon: <LinkedInIcon className="size-4 shrink-0 text-[#0A66C2]" />,
  },
] as const;

export function AccountSection({ firstName, lastName }: { firstName: string; lastName: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName, lastName });
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  const dirty = form.firstName !== firstName || form.lastName !== lastName;

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus('idle');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus('saved');
        // The sidebar user button reads the name from the server layout.
        router.refresh();
      } catch {
        setStatus('error');
      }
    });
  }

  const providers = user?.providers ?? [];

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-600">First name</span>
            <input
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              autoComplete="given-name"
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-600">Last name</span>
            <input
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              autoComplete="family-name"
              className={INPUT}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-stone-600">Email</span>
          <input
            value={user?.email ?? ''}
            placeholder="Not signed in"
            readOnly
            className={INPUT}
          />
          <span className="text-xs text-stone-500">
            Your email comes from your sign-in provider and cannot be changed here.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={!dirty || isPending} className={PRIMARY_BUTTON}>
            {isPending && <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />}
            Save changes
          </button>
          {status === 'saved' && (
            <span role="status" className="flex items-center gap-1 text-xs text-stone-600">
              <HugeiconsIcon icon={Tick02Icon} size={14} />
              Saved
            </span>
          )}
          {status === 'error' && (
            <span role="alert" className="text-xs text-destructive">
              Could not save. Please try again.
            </span>
          )}
        </div>
      </form>

      <section>
        <h3 className="text-sm font-medium text-stone-950">Sign-in providers</h3>
        <p className="mt-0.5 text-xs text-stone-500">The accounts you can use to sign in to Apply.</p>
        <ul className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200">
          {SIGN_IN_PROVIDERS.map((p) => {
            const connected = providers.includes(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                {p.icon}
                <span className="flex-1 text-sm font-medium text-stone-950">{p.label}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-medium',
                    connected ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-500',
                  )}
                >
                  {connected ? 'Connected' : 'Not connected'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-medium text-stone-950">Delete account</h3>
        <p className="mt-0.5 text-xs text-stone-500">
          Permanently remove your account and all of your data from Apply.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" disabled className={cn(SECONDARY_BUTTON, 'text-destructive')}>
            Delete account
          </button>
          <ComingSoon />
        </div>
      </section>
    </div>
  );
}

/* ── Privacy ──────────────────────────────────────────────────────── */

const PRIVACY_LINKS = ['Privacy Policy', 'Terms of Service', 'Export my data'];

export function PrivacySection() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose text-sm leading-relaxed text-stone-700">
        Your job search is yours. Apply stores your profile, searches and applications so you can
        find them on every device, and your job board sessions stay on your own device. More
        privacy controls will appear here.
      </p>
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200">
        {PRIVACY_LINKS.map((label) => (
          <li key={label}>
            <a
              href="#"
              className="flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50"
            >
              {label}
              <span aria-hidden className="text-stone-400">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Billing ──────────────────────────────────────────────────────── */

const FREE_FEATURES = [
  '1 search profile',
  'Limited tracked applications',
  'Limited fit messages',
  'No advanced connectors',
];
const PLUS_FEATURES = [
  'One search profile per job title',
  'Unlimited tracked applications',
  'Unlimited fit messages',
  'Advanced connectors',
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-stone-700">
          <HugeiconsIcon icon={Tick02Icon} size={16} className="mt-0.5 shrink-0 text-stone-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function BillingSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={cn(CARD, 'flex flex-col')}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-stone-950">Free</h3>
          <span className="rounded-full bg-stone-950 px-2 py-0.5 text-[11px] font-medium text-white">
            Current plan
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-500">Everything you need to get started.</p>
        <FeatureList items={FREE_FEATURES} />
      </div>

      <div className={cn(CARD, 'flex flex-col bg-stone-50')}>
        <h3 className="text-base font-semibold text-stone-950">Plus</h3>
        <p className="mt-1 text-sm text-stone-500">$3.99 / €3.99 per month.</p>
        <FeatureList items={PLUS_FEATURES} />
        <div className="mt-6 flex items-center gap-3">
          <button type="button" disabled className={PRIMARY_BUTTON}>
            Upgrade to Plus
          </button>
          <ComingSoon />
        </div>
      </div>
    </div>
  );
}

/* ── Connectors ───────────────────────────────────────────────────── */

export function ConnectorsSection({ statuses }: { statuses: Record<string, boolean> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className={cn(CARD, 'flex items-start justify-between gap-4 bg-stone-50')}>
        <div>
          <p className="text-sm font-medium text-stone-950">Claude</p>
          <p className="mt-0.5 text-xs text-stone-500">
            Connect Claude to get help writing fit messages in your own tone of voice.
          </p>
        </div>
        <ComingSoon />
      </div>
      <TabPlatforms statuses={statuses} />
    </div>
  );
}

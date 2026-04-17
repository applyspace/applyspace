'use client';

import { useState, useTransition, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick01Icon, Loading02Icon, Upload01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { useLocale } from '@/components/providers/Providers';
import type { AppSettings } from '@/lib/settings';
import type { LinkedInProfile } from '@/types/linkedin';

interface TabProfileProps {
  settings: AppSettings;
}

export function TabProfile({ settings }: TabProfileProps) {
  const { t } = useLocale();
  const tp = t.profile;

  const [form, setForm] = useState({
    firstName: settings.firstName,
    lastName: settings.lastName,
    jobTitle: settings.jobTitle,
    location: settings.location,
    availability: settings.availability,
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  // Load cached LinkedIn avatar on mount
  useEffect(() => {
    fetch('/api/linkedin/profile')
      .then((r) => r.json())
      .then((data: { ok: boolean; profile: LinkedInProfile | null }) => {
        if (data.ok && data.profile?.avatarUrl) setAvatarUrl(data.profile.avatarUrl);
      })
      .catch(() => {});
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleLinkedInSync() {
    setIsSyncing(true);
    setSyncError('');
    try {
      const res = await fetch('/api/linkedin/profile', { method: 'POST' });
      const data: { ok: boolean; profile?: LinkedInProfile; error?: string } = await res.json();
      if (data.ok && data.profile) {
        const p = data.profile;
        setForm((f) => ({
          ...f,
          firstName: p.firstName || f.firstName,
          lastName: p.lastName || f.lastName,
          jobTitle: p.jobTitle || f.jobTitle,
          location: p.location || f.location,
        }));
        if (p.avatarUrl) setAvatarUrl(p.avatarUrl);
        setSaved(false);
      } else {
        setSyncError(tp.syncError);
      }
    } catch {
      setSyncError(tp.syncError);
    } finally {
      setIsSyncing(false);
    }
  }

  const initials =
    (form.firstName?.[0] ?? '') + (form.lastName?.[0] ?? '') || '?';

  return (
    <div className="space-y-6">
      {/* Avatar + LinkedIn sync */}
      <div className="flex items-center gap-5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Profile photo"
            className="h-20 w-20 shrink-0 rounded-full border-2 border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-zinc-200 bg-zinc-50 text-lg font-semibold text-zinc-400">
            {initials.toUpperCase()}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLinkedInSync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-lg border border-[#0A66C2]/30 bg-[#0A66C2]/5 px-4 py-2.5 text-sm font-medium text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? (
              <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
            ) : (
              <LinkedInIcon className="h-4 w-4" />
            )}
            {isSyncing ? tp.syncing : tp.syncLinkedIn}
          </button>
          <p className="text-xs text-zinc-400">{tp.syncDescription}</p>
          {syncError && <p className="text-xs text-red-500">{syncError}</p>}
        </div>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-600">{tp.firstName}</Label>
          <Input
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            placeholder="Aurelien"
            className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-zinc-600">{tp.lastName}</Label>
          <Input
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            placeholder="Louvel"
            className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Job title */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tp.jobTitle}</Label>
        <Input
          value={form.jobTitle}
          onChange={(e) => set('jobTitle', e.target.value)}
          placeholder="Product Designer"
          className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tp.location}</Label>
        <Input
          value={form.location}
          onChange={(e) => set('location', e.target.value)}
          placeholder={tp.locationPlaceholder}
          className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      {/* Availability */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tp.availability}</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(tp.availabilityOptions) as [string, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set('availability', value === form.availability ? '' : value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                form.availability === value
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Resume upload — design only */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tp.cv}</Label>
        <div className="flex cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-8 opacity-50">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <HugeiconsIcon icon={Upload01Icon} size={16} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">{tp.cvUpload}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{tp.cvSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          variant="outline"
          className="border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
        >
          {isPending ? (
            <HugeiconsIcon icon={Loading02Icon} size={16} className="animate-spin" />
          ) : saved ? (
            <><HugeiconsIcon icon={Tick01Icon} size={16} className="text-green-500" /><span className="ml-1 text-green-600">{t.settings.saved}</span></>
          ) : (
            t.settings.save
          )}
        </Button>
      </div>
    </div>
  );
}

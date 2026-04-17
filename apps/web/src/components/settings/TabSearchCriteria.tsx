'use client';

import { useState, useTransition } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick01Icon, Loading02Icon } from '@hugeicons/core-free-icons';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MultiChip } from '@/components/ui/multi-chip';
import { TagInput } from '@/components/ui/tag-input';
import { Slider } from '@/components/ui/slider';
import { useLocale } from '@/components/providers/Providers';
import type { AppSettings } from '@/lib/settings';

// Internal keys — values stored in settings stay in French (platform-compatible)
const CONTRACT_KEYS = ['CDI', 'CDD', 'Freelance', 'Alternance', 'Stage', 'Bénévolat'] as const;
const EXPERIENCE_KEYS = ['Junior', 'Confirmé', 'Senior'] as const;
const COMPANY_SIZE_OPTIONS = [
  { value: '0-15', label: '0 – 15' },
  { value: '15-50', label: '15 – 50' },
  { value: '50-500', label: '50 – 500' },
  { value: '>500', label: '> 500' },
];
const REMOTE_KEYS = ['Télétravail', 'Hybride', 'Présentiel'] as const;

interface TabSearchCriteriaProps {
  settings: AppSettings;
}

export function TabSearchCriteria({ settings }: TabSearchCriteriaProps) {
  const { t } = useLocale();
  const tc = t.criteria;

  const [form, setForm] = useState({
    searchTitles: settings.searchTitles,
    contractTypes: settings.contractTypes,
    experienceLevels: settings.experienceLevels,
    searchLocation: settings.searchLocation,
    companySizes: settings.companySizes,
    salaryMin: settings.salaryMin ?? 0,
    salaryMax: settings.salaryMax ?? 120,
    remotePreference: settings.remotePreference,
    noGos: settings.noGos,
  });
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
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

  // Build localized chip options from internal keys
  const contractOptions = CONTRACT_KEYS.map((k) => ({
    value: k,
    label: t.contractOptions[k],
  }));
  const experienceOptions = EXPERIENCE_KEYS.map((k) => ({
    value: k,
    label: t.experienceOptions[k],
  }));
  const remoteOptions = REMOTE_KEYS.map((k) => ({
    value: k,
    label: t.remoteOptions[k],
  }));
  const noGoPresets: readonly string[] = t.noGoPresets;

  return (
    <div className="space-y-6">
      {/* Job titles */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tc.jobTitles}</Label>
        <p className="text-xs text-zinc-400">{tc.jobTitlesHint}</p>
        <TagInput
          value={form.searchTitles}
          onChange={(v) => set('searchTitles', v)}
          placeholder={tc.jobTitlesPlaceholder}
        />
      </div>

      {/* Contract type */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tc.contractType}</Label>
        <MultiChip
          options={contractOptions}
          value={form.contractTypes}
          onChange={(v) => set('contractTypes', v)}
        />
      </div>

      {/* Experience */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tc.experience}</Label>
        <MultiChip
          options={experienceOptions}
          value={form.experienceLevels}
          onChange={(v) => set('experienceLevels', v)}
        />
      </div>

      {/* Remote preference */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tc.workMode}</Label>
        <MultiChip
          options={remoteOptions}
          value={form.remotePreference}
          onChange={(v) => set('remotePreference', v)}
        />
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tc.location}</Label>
        <Input
          value={form.searchLocation}
          onChange={(e) => set('searchLocation', e.target.value)}
          placeholder={tc.locationPlaceholder}
          className="border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      {/* Company size */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-zinc-600">{tc.companySize}</Label>
        <MultiChip
          options={COMPANY_SIZE_OPTIONS}
          value={form.companySizes}
          onChange={(v) => set('companySizes', v)}
        />
      </div>

      {/* Salary range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-zinc-600">{tc.salaryRange}</Label>
          <span className="text-xs font-medium text-zinc-700">
            {form.salaryMin}k – {form.salaryMax === 120 ? '120k+' : `${form.salaryMax}k`}
          </span>
        </div>
        <Slider
          min={20}
          max={120}
          value={[form.salaryMin, form.salaryMax]}
          onValueChange={(v) => {
            const vals = Array.isArray(v) ? v : [v];
            set('salaryMin', vals[0] ?? form.salaryMin);
            set('salaryMax', vals[1] ?? form.salaryMax);
          }}
        />
        <div className="flex justify-between text-xs text-zinc-400">
          <span>20k</span>
          <span>120k+</span>
        </div>
      </div>

      {/* No-gos */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-zinc-600">{tc.noGos}</Label>
        <p className="text-xs text-zinc-400">{tc.noGosHint}</p>
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {noGoPresets.map((preset, idx) => {
            // Map translated preset to stored value (use EN index to find FR stored value)
            const storedValue = preset; // We'll store displayed value for simplicity
            const active = form.noGos.includes(preset);
            return (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  set(
                    'noGos',
                    active ? form.noGos.filter((x) => x !== preset) : [...form.noGos, preset]
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
                }`}
              >
                {active ? '✕ ' : ''}{preset}
              </button>
            );
          })}
        </div>
        {/* Custom no-gos */}
        <TagInput
          value={form.noGos.filter((x) => !noGoPresets.includes(x))}
          onChange={(custom) =>
            set('noGos', [
              ...form.noGos.filter((x) => noGoPresets.includes(x)),
              ...custom,
            ])
          }
          placeholder={tc.addNoGo}
        />
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

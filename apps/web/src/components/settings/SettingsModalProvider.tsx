'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  SETTINGS_PARAM,
  isSettingsSection as isSection,
  type SettingsSection,
} from '@/lib/settingsSections';

interface SettingsModalContextValue {
  /** The open section, or null when the modal is closed. */
  section: SettingsSection | null;
  openSettings: (section?: SettingsSection) => void;
  closeSettings: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue>({
  section: null,
  openSettings: () => {},
  closeSettings: () => {},
});

export function useSettingsModal() {
  return useContext(SettingsModalContext);
}

/** Rewrites the query string without a server round trip; Next keeps `useSearchParams` in sync. */
function writeParam(section: SettingsSection | null, mode: 'push' | 'replace') {
  const params = new URLSearchParams(window.location.search);
  if (section) params.set(SETTINGS_PARAM, section);
  else params.delete(SETTINGS_PARAM);
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const raw = useSearchParams().get(SETTINGS_PARAM);
  // An unknown value still opens the modal, on its first section.
  const section: SettingsSection | null = raw === null ? null : isSection(raw) ? raw : 'general';

  const openSettings = useCallback(
    (next: SettingsSection = 'general') => writeParam(next, section ? 'replace' : 'push'),
    [section],
  );
  const closeSettings = useCallback(() => writeParam(null, 'push'), []);

  const value = useMemo(
    () => ({ section, openSettings, closeSettings }),
    [section, openSettings, closeSettings],
  );

  return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>;
}

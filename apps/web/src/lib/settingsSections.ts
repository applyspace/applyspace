/** Sections of the Settings modal, in display order. Shared by server and client code. */
export const SETTINGS_SECTIONS = [
  'general',
  'account',
  'privacy',
  'billing',
  'profile',
  'documents',
  'connectors',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** Query param that holds the open section, so the modal is linkable (`?settings=billing`). */
export const SETTINGS_PARAM = 'settings';

export function isSettingsSection(value: string | null | undefined): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value ?? '');
}

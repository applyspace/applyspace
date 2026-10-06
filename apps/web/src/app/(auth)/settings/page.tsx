import { redirect } from 'next/navigation';
import { SETTINGS_PARAM, isSettingsSection } from '@/lib/settingsSections';

/**
 * Settings is a modal now (see `SettingsModal`). This route stays so old links
 * keep working: it opens the modal over the offers. `/settings?section=billing`
 * lands on that section.
 *
 * The target is `/offers` and not `/` because the proxy redirects `/` and
 * drops the query string on the way.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  redirect(`/offers?${SETTINGS_PARAM}=${isSettingsSection(section) ? section : 'general'}`);
}

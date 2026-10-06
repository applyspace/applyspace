'use client';

import { Sidebar } from './Sidebar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { SettingsModalProvider } from '@/components/settings/SettingsModalProvider';
import { useLocalStorageItem } from '@/lib/useLocalStorage';
import type {
  ApplicationWithRelations,
  InterviewWithRelations,
} from '@/types/applications';
import type { SearchWithCount } from '@/types/searches';

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

export function AppShell({
  children,
  searches,
  applications,
  interviews,
  firstName,
  lastName,
  platformStatuses,
}: {
  children: React.ReactNode;
  searches: SearchWithCount[];
  applications: ApplicationWithRelations[];
  interviews: InterviewWithRelations[];
  /** Account name from settings (empty strings when not set). */
  firstName: string;
  lastName: string;
  /** Job board connection status per source, for Settings > Connectors. */
  platformStatuses: Record<string, boolean>;
}) {
  const [savedCollapsed, saveCollapsed] = useLocalStorageItem('apply-sidebar-collapsed');
  const [savedWidth, saveWidth] = useLocalStorageItem('apply-sidebar-width');

  const collapsed = savedCollapsed === 'true';
  const parsedWidth = savedWidth ? parseInt(savedWidth, 10) : NaN;
  const sidebarWidth =
    parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH ? parsedWidth : DEFAULT_WIDTH;

  function toggle() {
    saveCollapsed(String(!collapsed));
  }

  function handleWidthChange(width: number) {
    saveWidth(String(width));
  }

  return (
    <SettingsModalProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggle={toggle}
          width={sidebarWidth}
          onWidthChange={handleWidthChange}
          searches={searches}
          applications={applications}
          interviews={interviews}
          firstName={firstName}
          lastName={lastName}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <SettingsModal firstName={firstName} lastName={lastName} statuses={platformStatuses} />
    </SettingsModalProvider>
  );
}

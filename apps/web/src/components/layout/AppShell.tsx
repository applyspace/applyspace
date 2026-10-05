'use client';

import { Sidebar } from './Sidebar';
import { useLocalStorageItem } from '@/lib/useLocalStorage';
import type {
  ApplicationWithRelations,
  InterviewWithRelations,
} from '@/types/applications';
import type { Profile } from '@/types/profiles';
import type { SearchWithCount } from '@/types/searches';

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

export function AppShell({
  children,
  profiles,
  searches,
  applications,
  interviews,
}: {
  children: React.ReactNode;
  profiles: Profile[];
  searches: SearchWithCount[];
  applications: ApplicationWithRelations[];
  interviews: InterviewWithRelations[];
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        width={sidebarWidth}
        onWidthChange={handleWidthChange}
        profiles={profiles}
        searches={searches}
        applications={applications}
        interviews={interviews}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

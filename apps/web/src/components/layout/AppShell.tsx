'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
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
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem('apply-sidebar-collapsed');
    if (savedCollapsed === 'true') setCollapsed(true);

    const savedWidth = localStorage.getItem('apply-sidebar-width');
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      if (!isNaN(w) && w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('apply-sidebar-collapsed', String(next));
      return next;
    });
  }

  function handleWidthChange(width: number) {
    setSidebarWidth(width);
    localStorage.setItem('apply-sidebar-width', String(width));
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

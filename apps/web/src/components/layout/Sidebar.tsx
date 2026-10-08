'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Briefcase08Icon,
  Home01Icon,
  Chatting01Icon,
  PanelLeftIcon,
  Sent02Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';
import { useLocale } from '@/components/providers/Providers';
import { ApplyLogo } from '@/components/brand/ApplyLogo';
import { UserMenu } from '@/components/layout/UserMenu';
import { NewSearchDialog } from '@/components/layout/NewSearchDialog';
import { entrySlug } from '@/lib/slug';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type {
  ApplicationWithRelations,
  InterviewStage,
  InterviewWithRelations,
} from '@/types/applications';
import type { SearchWithCount } from '@/types/searches';
import type { AccountPlan } from '@/types/candidate-profile';

/* ── Constants ────────────────────────────────────────────────────── */

const COLLAPSED_WIDTH = 56;
export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 360;

/* ── Helpers ────────────────────────────────────────────────────────── */

function daysAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const STAGE_COLORS: Record<InterviewStage, string> = {
  HR: 'bg-teal-100 text-teal-700',
  Manager: 'bg-blue-100 text-blue-700',
  'Design Case': 'bg-pink-100 text-pink-700',
  'Team-Fit': 'bg-violet-100 text-violet-700',
  Technical: 'bg-orange-100 text-orange-700',
  Final: 'bg-emerald-100 text-emerald-700',
  Other: 'bg-zinc-100 text-zinc-700',
};

/* ── Nav primitives ───────────────────────────────────────────── */

/** Short date for an upcoming interview, e.g. "12 Oct". */
function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Simple nav link (no sub-items, no [+] button) — used for Home. */
function NavLink({
  href,
  label,
  icon,
  collapsed,
}: {
  href: string;
  label: string;
  icon: typeof Home01Icon;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  const el = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        collapsed && 'justify-center',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <HugeiconsIcon icon={icon} size={16} className="shrink-0" />
      {!collapsed && label}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={el} />
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return el;
}

/**
 * Nav section — non-clickable label header (xs, medium, muted) with:
 * • icon + optional badges (left of label) + label
 * • a [+] button that fades in on hover
 * • page items rendered below
 */
function NavSection({
  href,
  label,
  icon,
  collapsed,
  addHref,
  onAdd,
  badges,
  children,
}: {
  href: string;
  label: string;
  icon: typeof Home01Icon;
  collapsed: boolean;
  addHref: string;
  /** When set, the [+] button calls this instead of linking to `addHref`. */
  onAdd?: () => void;
  badges?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  // Collapsed: icon links to the section page
  if (collapsed) {
    const el = (
      <Link
        href={href}
        className={cn(
          'flex justify-center rounded-md px-2 py-1.5 transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <HugeiconsIcon icon={icon} size={16} className="shrink-0" />
      </Link>
    );
    return (
      <Tooltip>
        <TooltipTrigger render={el} />
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="mt-3">
      {/* Header row — non-clickable label, [+] on hover */}
      <div className="group/section relative">
        <div className="flex items-center gap-2 px-2 py-1 pr-8">
          <HugeiconsIcon icon={icon} size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          {badges}
        </div>
        {/* [+] button */}
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent focus-visible:opacity-100 group-hover/section:opacity-100"
            aria-label="New search"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} />
          </button>
        ) : (
          <Link
            href={addHref}
            className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover/section:opacity-100"
            aria-label={`Add to ${label}`}
          >
            <HugeiconsIcon icon={Add01Icon} size={12} />
          </Link>
        )}
      </div>

      {/* Page items */}
      {children && <div className="flex flex-col gap-0.5 mt-0.5">{children}</div>}
    </div>
  );
}

/** Section page item — sm text, hover state, optional right element. Clickable when `href` is set. */
function SubItem({
  label,
  right,
  href,
}: {
  label: string;
  right?: React.ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex-1 truncate text-sm text-foreground">{label}</span>
      {right && <span className="shrink-0">{right}</span>}
    </>
  );

  const className =
    'flex items-center gap-2 rounded-md px-2 py-1.5 pr-2 transition-colors hover:bg-accent';

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={cn(className, 'cursor-default')}>{content}</div>;
}

/** Placeholder item when a section has no data yet. */
function EmptySubItem({ label }: { label: string }) {
  return (
    <div className="px-2 py-1.5">
      <span className="text-xs italic text-muted-foreground/40">{label}</span>
    </div>
  );
}

/** Status badge — tight icon + count, placed left of the section label. */
function StatusBadge({
  icon,
  count,
  color,
}: {
  icon: typeof CheckmarkCircle02Icon;
  count: number;
  color: string;
}) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium', color)}>
      <HugeiconsIcon icon={icon} size={10} />
      {count}
    </span>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  searches: SearchWithCount[];
  applications: ApplicationWithRelations[];
  interviews: InterviewWithRelations[];
  /** Account name shown on the user button (empty when not set). */
  firstName: string;
  lastName: string;
  /** Account plan, or null when nobody is signed in (demo, desktop). */
  plan: AccountPlan | null;
}

export function Sidebar({
  collapsed,
  onToggle,
  width,
  onWidthChange,
  searches,
  applications,
  interviews,
  firstName,
  lastName,
  plan,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [isDragging, setIsDragging] = useState(false);
  const [newSearchOpen, setNewSearchOpen] = useState(false);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (e: MouseEvent) => {
        const newWidth = Math.min(
          Math.max(startWidth + (e.clientX - startX), MIN_SIDEBAR_WIDTH),
          MAX_SIDEBAR_WIDTH
        );
        onWidthChange(newWidth);
      };

      const onMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [width, onWidthChange]
  );

  if (pathname === '/login') return null;

  // Applications derived data
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  // "In-flight" = anything not yet concluded (waiting, interviewing, ghosted, withdrawn).
  const pendingWaitingCount = applications.filter(
    (a) => a.status !== 'accepted' && a.status !== 'rejected',
  ).length;
  // Every tracked application, most recent first.
  const trackedApplications = [...applications].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  // Upcoming = not completed yet; scheduled ones first (soonest on top), then unscheduled.
  const upcomingInterviews = interviews
    .filter((i) => !i.completedAt)
    .sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      }
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return 0;
    });

  return (
      <aside
        style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
        className={cn(
          'relative flex h-screen shrink-0 flex-col border-r border-border bg-background px-2 py-4 overflow-hidden',
          !isDragging && 'transition-[width] duration-200 ease-in-out'
        )}
      >
        {/* Logo + toggle */}
        <div
          className={cn(
            'mb-6 px-2',
            collapsed ? 'flex justify-center' : 'flex items-center justify-between gap-2'
          )}
        >
          {!collapsed && (
            <Link href="/" aria-label="Apply home">
              <ApplyLogo className="h-5 w-auto shrink-0" />
            </Link>
          )}
          <button
            onClick={onToggle}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Toggle sidebar"
          >
            <HugeiconsIcon
              icon={PanelLeftIcon}
              size={16}
              className={cn('transition-transform duration-200', collapsed && 'rotate-180')}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {/* Home */}
          <NavLink
            href="/"
            label={t.nav.home ?? 'Home'}
            icon={Home01Icon}
            collapsed={collapsed}
          />

          {/* Offers — one entry per search profile */}
          <NavSection
            href="/offers"
            label={t.nav.offers ?? 'Offers'}
            icon={Briefcase08Icon}
            collapsed={collapsed}
            addHref="/offers"
            onAdd={() => setNewSearchOpen(true)}
          >
            {searches.length > 0 ? (
              searches.map((s) => {
                const label = [s.searchTitle, s.location].filter(Boolean).join(', ');
                return (
                  <SubItem
                    key={s.id}
                    label={label}
                    href={`/offers/${entrySlug([s.searchTitle, s.location ?? undefined], s.id)}`}
                    right={
                      s.count > 0 ? (
                        <span className="rounded bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground">
                          {s.count}
                        </span>
                      ) : null
                    }
                  />
                );
              })
            ) : (
              <EmptySubItem label="No searches yet" />
            )}
          </NavSection>

          {/* Applications */}
          <NavSection
            href="/applications"
            label={t.nav.applications ?? 'Applications'}
            icon={Sent02Icon}
            collapsed={collapsed}
            addHref="/applications"
            badges={
              applications.length > 0 ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  {acceptedCount > 0 && (
                    <StatusBadge
                      icon={CheckmarkCircle02Icon}
                      count={acceptedCount}
                      color="text-emerald-500/70"
                    />
                  )}
                  {rejectedCount > 0 && (
                    <StatusBadge
                      icon={CancelCircleIcon}
                      count={rejectedCount}
                      color="text-red-400/80"
                    />
                  )}
                  {pendingWaitingCount > 0 && (
                    <StatusBadge
                      icon={Clock01Icon}
                      count={pendingWaitingCount}
                      color="text-muted-foreground/70"
                    />
                  )}
                </span>
              ) : null
            }
          >
            {trackedApplications.length > 0 ? (
              trackedApplications.map((app) => (
                <SubItem
                  key={app.id}
                  label={`${app.company.name}, ${app.jobTitle}`}
                  href={`/applications/${entrySlug([app.company.name, app.jobTitle], app.id)}`}
                  right={
                    <span className="text-[10px] text-muted-foreground/60">
                      {daysAgo(app.appliedAt)}
                    </span>
                  }
                />
              ))
            ) : (
              <EmptySubItem label="No applications yet" />
            )}
          </NavSection>

          {/* Interviews */}
          <NavSection
            href="/interviews"
            label={t.nav.interviews ?? 'Interviews'}
            icon={Chatting01Icon}
            collapsed={collapsed}
            addHref="/interviews"
          >
            {upcomingInterviews.length > 0 ? (
              upcomingInterviews.map((interview) => {
                const companyName = interview.application.company.name;
                const jobTitle = interview.application.jobTitle;
                return (
                  <SubItem
                    key={interview.id}
                    label={`${companyName}, ${jobTitle}`}
                    href={`/interviews/${entrySlug([companyName, jobTitle], interview.id)}`}
                    right={
                      <span
                        className={cn(
                          'rounded px-1.5 py-px text-[10px] font-medium',
                          STAGE_COLORS[interview.stage]
                        )}
                      >
                        {interview.scheduledAt
                          ? `${shortDate(interview.scheduledAt)} · ${interview.stage}`
                          : interview.stage}
                      </span>
                    }
                  />
                );
              })
            ) : (
              <EmptySubItem label="No upcoming interviews" />
            )}
          </NavSection>
        </nav>

        <NewSearchDialog
          open={newSearchOpen}
          onOpenChange={setNewSearchOpen}
          plan={plan}
          searchCount={searches.length}
        />

        {/* User button + account menu */}
        <UserMenu collapsed={collapsed} firstName={firstName} lastName={lastName} />

        {/* Resize handle */}
        {!collapsed && (
          <div
            onMouseDown={handleResizeMouseDown}
            className={cn(
              'absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors',
              isDragging ? 'bg-border' : 'hover:bg-border'
            )}
          />
        )}
      </aside>
  );
}

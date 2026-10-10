import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Calendar03Icon,
  CheckListIcon,
  FilterIcon,
  File01Icon,
  Home01Icon,
  JobSearchIcon,
  KanbanIcon,
  LockIcon,
  MapsLocation01Icon,
  Message01Icon,
  Mic01Icon,
  PencilEdit01Icon,
  Settings02Icon,
  Table01Icon,
  ChartLineData01Icon,
  AiBrain01Icon,
  Analytics01Icon,
  AppleIcon,
  BrowserIcon,
  FileUploadIcon,
  Logout03Icon,
  Mail01Icon,
  Note01Icon,
  Tick02Icon,
  UserIcon,
  Xls01Icon,
} from '@hugeicons/core-free-icons';

const ICONS: Record<string, IconSvgElement> = {
  home: Home01Icon,
  search: JobSearchIcon,
  filter: FilterIcon,
  board: KanbanIcon,
  table: Table01Icon,
  timeline: ChartLineData01Icon,
  map: MapsLocation01Icon,
  check: CheckListIcon,
  interview: Mic01Icon,
  message: Message01Icon,
  file: File01Icon,
  pen: PencilEdit01Icon,
  settings: Settings02Icon,
  lock: LockIcon,
  calendar: Calendar03Icon,
  browser: BrowserIcon,
  sheet: Xls01Icon,
  note: Note01Icon,
  mail: Mail01Icon,
  analytics: Analytics01Icon,
  ai: AiBrain01Icon,
  leave: Logout03Icon,
  apple: AppleIcon,
  upload: FileUploadIcon,
  profile: UserIcon,
  tick: Tick02Icon,
};

/** Decorative feature icon by key (Hugeicons, like the app). Unknown keys render nothing. */
export function FeatureIcon({ name, size = 22, className }: { name?: string; size?: number; className?: string }) {
  const icon = name ? ICONS[name] : undefined;
  if (!icon) return null;
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.8} className={className} aria-hidden />;
}

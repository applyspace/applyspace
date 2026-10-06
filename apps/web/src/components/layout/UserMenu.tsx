'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  CircleArrowUp02Icon,
  Download04Icon,
  Globe02Icon,
  HelpCircleIcon,
  InformationCircleIcon,
  Logout01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { useAuth, useLocale } from '@/components/providers/Providers';
import { useSettingsModal } from '@/components/settings/SettingsModalProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALES, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function initialsOf(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

interface UserMenuProps {
  collapsed: boolean;
  firstName: string;
  lastName: string;
}

/** Sidebar footer: the user's name and avatar, opening the account menu. */
export function UserMenu({ collapsed, firstName, lastName }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { locale, setLocale } = useLocale();
  const { openSettings } = useSettingsModal();

  // Account name first, then the sign-in provider's name, then email; "Guest" in demo mode.
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const displayName = fullName || user?.name || user?.email || 'Guest';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={collapsed ? displayName : undefined}
        className={cn(
          'flex w-full items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-accent',
          collapsed ? 'justify-center' : 'gap-2.5',
        )}
      >
        <Avatar size="sm">
          <AvatarImage src={user?.image ?? ''} alt="" />
          <AvatarFallback className="text-[10px]">{initialsOf(displayName)}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <span className="flex-1 truncate text-left text-sm font-medium text-foreground">
            {displayName}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" sideOffset={6} className="min-w-60">
        <DropdownMenuItem onClick={() => openSettings('general')}>
          <HugeiconsIcon icon={Settings01Icon} />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon icon={Globe02Icon} />
            Language
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => setLocale(value as Locale)}
            >
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l.value} value={l.value}>
                  {l.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem render={<a href="#" />}>
          <HugeiconsIcon icon={HelpCircleIcon} />
          Get help
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => openSettings('billing')}>
          <HugeiconsIcon icon={CircleArrowUp02Icon} />
          Upgrade plan
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href="#" />}>
          <HugeiconsIcon icon={Download04Icon} />
          Get apps &amp; extensions
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href="#" />}>
          <HugeiconsIcon icon={InformationCircleIcon} />
          Learn more
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => signOut()}>
          <HugeiconsIcon icon={Logout01Icon} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

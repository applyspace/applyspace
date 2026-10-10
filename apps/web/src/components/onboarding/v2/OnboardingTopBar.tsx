'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { ApplyLogo } from '@/components/brand/ApplyLogo';
import { useAuth } from '@/components/providers/Providers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  linkedin_oidc: 'LinkedIn',
  linkedin: 'LinkedIn',
  email: 'Email',
};

function initialsOf(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Onboarding header: the logo on the left and, when someone is signed in, their
 * avatar and name on the right, opening a menu with the account and "Log out".
 * Onboarding lives outside the app shell, so without this there would be no way
 * to leave a session the user did not mean to keep.
 */
export function OnboardingTopBar() {
  const { user, signOut } = useAuth();
  const displayName = user?.name ?? user?.email ?? null;
  const providers = (user?.providers ?? []).map((p) => PROVIDER_LABELS[p] ?? p).join(', ');

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
      <ApplyLogo className="h-7 w-auto text-foreground" />
      {user && displayName && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-sm outline-none transition-colors hover:bg-accent">
            <Avatar size="sm">
              <AvatarImage src={user.image ?? ''} alt="" />
              <AvatarFallback className="text-[10px]">{initialsOf(displayName)}</AvatarFallback>
            </Avatar>
            <span className="max-w-40 truncate font-medium text-foreground">{displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                {user.email && <span className="truncate text-foreground">{user.email}</span>}
                {providers && <span className="text-xs text-muted-foreground">Signed in with {providers}</span>}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <HugeiconsIcon icon={Logout01Icon} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}

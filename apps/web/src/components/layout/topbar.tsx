'use client';

import { Coins, HardDrive, LogOut, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser, useLogout } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { formatBytes } from '@/lib/utils';

export function Topbar() {
  const { data } = useCurrentUser();
  const cachedUser = useAuthStore((s) => s.user);
  const user = data ?? cachedUser;
  const logout = useLogout();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/30 px-4 backdrop-blur md:px-6">
      <div className="md:hidden">
        <span className="text-sm font-bold">AURA</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Badge variant="default" className="gap-1.5 px-3 py-1">
          <Coins className="h-3.5 w-3.5" />
          {user?.credits ?? 0} credits
        </Badge>
        <Badge
          variant="secondary"
          className="hidden gap-1.5 px-3 py-1 sm:flex"
        >
          <HardDrive className="h-3.5 w-3.5" />
          {formatBytes(user?.storageUsed ?? 0)}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <UserIcon className="h-4 w-4" />
              {user?.role}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-red-400 focus:text-red-400"
              onClick={() => logout.mutate()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

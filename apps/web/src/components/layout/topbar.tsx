'use client';

import Link from 'next/link';
import {
  Search,
  Plus,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  Coins,
  HardDrive,
} from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:px-6">
      <Link href="/create" className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-primary glow-cyan">
          <span className="font-black text-white">A</span>
        </div>
      </Link>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search creations…"
          className="h-10 w-full rounded-xl border border-border/60 bg-card/40 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan/60 focus:glow-cyan"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan sm:flex">
          <Coins className="h-3.5 w-3.5" />
          {user?.credits ?? 0}
        </span>

        <Link
          href="/create"
          title="New creation"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-primary text-white glow-cyan transition hover:brightness-110"
        >
          <Plus className="h-5 w-5" />
        </Link>

        <button
          type="button"
          title="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_hsl(var(--accent))]" />
        </button>

        <Link
          href="/settings"
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
        >
          <Settings className="h-5 w-5" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="ring-2 ring-cyan/40">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" asChild>
              <Link href="/profile">
                <UserIcon className="h-4 w-4" />
                {user?.role ?? 'Profile'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <HardDrive className="h-4 w-4" />
              {formatBytes(user?.storageUsed ?? 0)} used
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

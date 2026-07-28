'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  Coins,
  HardDrive,
  Menu,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import type { Job } from '@axon-ryzr/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser, useLogout } from '@/features/auth/use-auth';
import { useJobs } from '@/features/generation/use-jobs';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { SystemPulse } from '@/components/fx/system-pulse';
import { Logo } from '@/components/ui/logo';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';

function statusIcon(status: Job['status']) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
    case 'RENDERING':
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan" />;
    default:
      return <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

function NotificationsMenu() {
  const { data } = useJobs({ take: 6 });
  const jobs = data?.items ?? [];
  const activeCount = jobs.filter(
    (j) => j.status === 'QUEUED' || j.status === 'RENDERING',
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-muted-foreground outline-none transition hover:border-cyan/50 hover:text-cyan"
      >
        <Bell className="h-5 w-5" />
        {activeCount > 0 && (
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-[0_0_6px_hsl(var(--accent))]">
            {activeCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          <span className="text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
            recent jobs
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {jobs.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          jobs.map((j) => (
            <DropdownMenuItem key={j.id} asChild>
              <Link href="/create" className="flex items-start gap-2.5 py-2">
                {statusIcon(j.status)}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-foreground">
                    {j.prompt}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span
                      className={cn(
                        j.status === 'COMPLETED' && 'text-emerald-400',
                        j.status === 'FAILED' && 'text-red-400',
                        j.status === 'RENDERING' && 'text-cyan',
                      )}
                    >
                      {j.status}
                      {j.status === 'RENDERING' ? ` · ${j.progress}%` : ''}
                    </span>
                    · {formatRelativeTime(j.createdAt)}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const router = useRouter();
  const { data } = useCurrentUser();
  const cachedUser = useAuthStore((s) => s.user);
  const user = data ?? cachedUser;
  const logout = useLogout();
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const [query, setQuery] = useState('');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/gallery?q=${encodeURIComponent(q)}` : '/gallery');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setMobileNav(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href="/create" className="md:hidden">
        <Logo className="h-8 w-8" glow={false} />
      </Link>

      <form onSubmit={submitSearch} className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creations…"
          className="h-10 w-full rounded-xl border border-border/60 bg-card/40 pl-10 pr-16 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan/60 focus:glow-cyan"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <SystemPulse />
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

        <NotificationsMenu />

        <Link
          href="/settings"
          title="Settings"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan sm:flex"
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

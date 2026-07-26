'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  Images,
  FolderKanban,
  Users,
  Code2,
  Settings,
  User as UserIcon,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create', label: 'Creation Hub', icon: Wand2 },
  { href: '/gallery', label: 'My Gallery', icon: Images },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/api', label: 'API', icon: Code2 },
];

const NAV_SECONDARY: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useCurrentUser();
  const cachedUser = useAuthStore((s) => s.user);
  const user = data ?? cachedUser;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AX';

  const renderLink = (item: NavItem) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          active
            ? 'bg-gradient-to-r from-cyan/15 to-primary/10 text-foreground'
            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition-opacity',
            active
              ? 'bg-gradient-to-b from-cyan to-primary opacity-100 shadow-[0_0_8px_hsl(var(--cyan))]'
              : 'opacity-0',
          )}
        />
        <Icon
          className={cn(
            'h-4 w-4 transition-colors',
            active ? 'text-cyan' : 'group-hover:text-foreground',
          )}
        />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-card/30 backdrop-blur md:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 border-b border-border/60 px-5 py-4"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-primary glow-cyan">
          <span className="text-lg font-black text-white">A</span>
        </div>
        <div className="leading-none">
          <p className="text-sm font-black tracking-tight holo-text">AURA</p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            Creative Studio
          </p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Menu
        </p>
        {NAV.map(renderLink)}
        <div className="my-2 h-px bg-border/60" />
        <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          System
        </p>
        {NAV_SECONDARY.map(renderLink)}
      </nav>

      <div className="p-3">
        <Link
          href="/profile"
          className="hud-panel flex items-center gap-3 rounded-xl p-3 transition hover:glow-cyan"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name ?? 'Operator'}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-cyan">
              <Coins className="h-3 w-3" />
              Credits: {user?.credits ?? 0}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

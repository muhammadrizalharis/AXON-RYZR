'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import {
  NAV_MAIN,
  NAV_SYSTEM,
  isAdminRole,
  type NavItem,
} from '@/components/layout/nav-items';

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data } = useCurrentUser();
  const cachedUser = useAuthStore((s) => s.user);
  const user = data ?? cachedUser;
  const admin = isAdminRole(user?.role);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AX';

  const renderLink = (item: NavItem) => {
    if (item.adminOnly && !admin) return null;
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          collapsed && 'justify-center px-2',
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
            'h-4 w-4 shrink-0 transition-colors',
            active ? 'text-cyan' : 'group-hover:text-foreground',
          )}
        />
        {!collapsed && item.label}
      </Link>
    );
  };

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-2 border-b border-border/60 px-5 py-4',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-primary glow-cyan">
          <span className="text-lg font-black text-white">A</span>
        </div>
        {!collapsed && (
          <div className="leading-none">
            <p className="text-sm font-black tracking-tight holo-text">AURA</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              Creative Studio
            </p>
          </div>
        )}
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Menu
          </p>
        )}
        {NAV_MAIN.map(renderLink)}
        <div className="my-2 h-px bg-border/60" />
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            System
          </p>
        )}
        {NAV_SYSTEM.map(renderLink)}
      </nav>

      <div className={cn('p-3', collapsed && 'p-2')}>
        <Link
          href="/profile"
          onClick={onNavigate}
          title={collapsed ? user?.name ?? 'Profile' : undefined}
          className={cn(
            'hud-panel flex items-center gap-3 rounded-xl p-3 transition hover:glow-cyan',
            collapsed && 'justify-center p-2',
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.name ?? 'Operator'}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-cyan">
                <Coins className="h-3 w-3" />
                Credits: {user?.credits ?? 0}
              </p>
            </div>
          )}
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'relative hidden shrink-0 flex-col border-r border-border/60 bg-card/30 backdrop-blur transition-all duration-300 md:flex',
        collapsed ? 'w-[70px]' : 'w-64',
      )}
    >
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={toggleSidebar}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-16 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-cyan/40 bg-background text-cyan shadow-[0_0_10px_hsl(var(--cyan)/0.35)] transition hover:bg-cyan/10"
      >
        {collapsed ? (
          <ChevronsRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronsLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}

export function MobileNav() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMobileNav(false)}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="animate-fade-in absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl">
        <SidebarNav onNavigate={() => setMobileNav(false)} />
      </div>
    </div>
  );
}

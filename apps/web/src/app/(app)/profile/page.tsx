'use client';

import {
  Mail,
  Shield,
  Coins,
  HardDrive,
  CalendarDays,
  BadgeCheck,
} from 'lucide-react';
import { useCurrentUser } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { formatBytes } from '@/lib/utils';

export default function ProfilePage() {
  const { data } = useCurrentUser();
  const cached = useAuthStore((s) => s.user);
  const u = data ?? cached;

  const initials = u?.name
    ? u.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AX';

  const rows = [
    { label: 'Email', value: u?.email ?? '—', icon: Mail },
    { label: 'Role', value: u?.role ?? 'USER', icon: Shield },
    { label: 'Credits', value: String(u?.credits ?? 0), icon: Coins },
    {
      label: 'Storage Used',
      value: formatBytes(u?.storageUsed ?? 0),
      icon: HardDrive,
    },
    {
      label: 'Member Since',
      value: u?.createdAt
        ? new Date(u.createdAt).toLocaleDateString()
        : '—',
      icon: CalendarDays,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        <span className="holo-text">Profile</span>
      </h1>

      <div className="hud-panel rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-black text-white glow-violet">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold text-foreground">
                {u?.name ?? 'Operator'}
              </h2>
              <BadgeCheck className="h-5 w-5 shrink-0 text-cyan" />
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {u?.email}
            </p>
            <span className="mt-1 inline-block rounded-full border border-cyan/30 bg-cyan/10 px-3 py-0.5 text-xs font-medium text-cyan">
              {u?.role ?? 'USER'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.label}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <Icon className="h-4 w-4 shrink-0 text-cyan" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {r.label}
                  </p>
                  <p className="truncate text-sm text-foreground">{r.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

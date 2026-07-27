'use client';

import { useState } from 'react';
import {
  UserCog,
  Search,
  Coins,
  Plus,
  Minus,
  Power,
  ShieldCheck,
  Shield,
  Loader2,
  Save,
  ShieldAlert,
  HardDrive,
  Images,
} from 'lucide-react';
import type { Role } from '@axon-ryzr/shared';
import { useCurrentUser } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { isAdminRole } from '@/components/layout/nav-items';
import {
  useAdminUsers,
  useAdjustCredits,
  useSetActive,
  useSetRole,
  useAdminSettings,
  useUpdateSettings,
} from '@/features/admin/use-admin';
import type { AdminUser } from '@/lib/api/admin';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';

const ROLE_STYLE: Record<string, string> = {
  SUPER_ADMIN: 'border-accent/50 bg-accent/10 text-accent',
  ADMIN: 'border-primary/50 bg-primary/10 text-primary',
  USER: 'border-cyan/40 bg-cyan/10 text-cyan',
};

function RestrictedPanel() {
  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="hud-panel rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10">
          <ShieldAlert className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          User Management Restricted
        </h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-accent/80">
          Administrator Clearance Required
        </p>
      </div>
    </div>
  );
}

function DefaultCreditsCard() {
  const { data } = useAdminSettings();
  const update = useUpdateSettings();
  const [value, setValue] = useState<string>('');

  const current = data?.defaultUserCredits;
  const parsed = Number(value);
  const dirty = value !== '' && Number.isInteger(parsed) && parsed !== current;

  return (
    <div className="hud-panel rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Coins className="h-4 w-4 text-cyan" /> Default Kredit User Baru
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Kredit awal yang diterima setiap akun yang baru mendaftar. Saat ini:{' '}
        <span className="font-mono text-cyan">{current ?? '…'}</span>
      </p>
      <div className="flex max-w-xs gap-2">
        <input
          type="number"
          min={0}
          max={1_000_000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={String(current ?? 100)}
          className="h-10 w-full rounded-xl border border-cyan/25 bg-background/60 px-3 text-sm text-foreground outline-none transition focus:border-cyan focus:glow-cyan"
        />
        <button
          type="button"
          disabled={!dirty || parsed < 0 || update.isPending}
          onClick={() =>
            update.mutate(
              { defaultUserCredits: parsed },
              { onSuccess: () => setValue('') },
            )
          }
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-primary px-4 text-sm font-semibold text-white glow-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {update.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan
        </button>
      </div>
    </div>
  );
}

function CreditsEditor({ user }: { user: AdminUser }) {
  const adjust = useAdjustCredits();
  const [amount, setAmount] = useState('10');
  const n = Math.abs(Number(amount) || 0);

  const apply = (sign: 1 | -1) => {
    if (n < 1) return;
    adjust.mutate({
      id: user.id,
      amount: sign * n,
      reason: sign > 0 ? 'Admin grant (UI)' : 'Admin deduction (UI)',
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 flex items-center gap-1 font-mono text-sm text-cyan">
        <Coins className="h-3.5 w-3.5" />
        {user.credits}
      </span>
      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        title="Jumlah kredit"
        className="h-8 w-16 rounded-lg border border-border/60 bg-background/50 px-2 text-center text-xs text-foreground outline-none focus:border-cyan/60"
      />
      <button
        type="button"
        title={`Tambah ${n} kredit`}
        disabled={adjust.isPending || n < 1}
        onClick={() => apply(1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/40 text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={`Kurangi ${n} kredit`}
        disabled={adjust.isPending || n < 1 || user.credits - n < 0}
        onClick={() => apply(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/40 text-red-400 transition hover:bg-destructive/10 disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function UserRow({
  user,
  selfId,
  isSuper,
}: {
  user: AdminUser;
  selfId?: string;
  isSuper: boolean;
}) {
  const setActive = useSetActive();
  const setRole = useSetRole();

  const isSelf = user.id === selfId;
  const targetIsSuper = user.role === 'SUPER_ADMIN';
  const lockStatus = isSelf || (targetIsSuper && !isSuper);
  const lockRole = isSelf || targetIsSuper || !isSuper;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'grid gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 transition hover:border-cyan/40 lg:grid-cols-[minmax(0,1.4fr)_auto_auto_auto_auto] lg:items-center',
        !user.isActive && 'opacity-60',
      )}
    >
      {/* identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
            {user.name}
            {isSelf && (
              <span className="rounded bg-cyan/10 px-1.5 text-[9px] uppercase tracking-widest text-cyan">
                you
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Images className="h-3 w-3" />
              {user._count?.jobs ?? 0} render
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatBytes(user.storageUsed ?? 0)}
            </span>
            <span>{formatRelativeTime(user.createdAt)}</span>
          </p>
        </div>
      </div>

      {/* role */}
      <div>
        {lockRole ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
              ROLE_STYLE[user.role] ?? ROLE_STYLE.USER,
            )}
          >
            {targetIsSuper ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <Shield className="h-3 w-3" />
            )}
            {user.role}
          </span>
        ) : (
          <select
            value={user.role}
            disabled={setRole.isPending}
            onChange={(e) =>
              setRole.mutate({ id: user.id, role: e.target.value as Role })
            }
            title="Ubah role"
            className={cn(
              'h-8 cursor-pointer rounded-full border bg-background/60 px-3 text-[10px] font-bold uppercase tracking-widest outline-none',
              ROLE_STYLE[user.role] ?? ROLE_STYLE.USER,
            )}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        )}
      </div>

      {/* credits */}
      <CreditsEditor user={user} />

      {/* status */}
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
          user.isActive
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
            : 'border-destructive/50 bg-destructive/10 text-red-400',
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            user.isActive ? 'bg-emerald-400' : 'bg-red-500',
          )}
        />
        {user.isActive ? 'Active' : 'Disabled'}
      </span>

      {/* actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={lockStatus || setActive.isPending}
          title={
            lockStatus
              ? 'Tidak dapat mengubah akun ini'
              : user.isActive
                ? 'Nonaktifkan akun (sesi langsung dicabut)'
                : 'Aktifkan akun'
          }
          onClick={() =>
            setActive.mutate({ id: user.id, active: !user.isActive })
          }
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
            user.isActive
              ? 'border-destructive/40 text-red-400 hover:bg-destructive/10'
              : 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10',
          )}
        >
          {setActive.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
          {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </div>
    </div>
  );
}

export default function UsersAdminPage() {
  const { data: me } = useCurrentUser();
  const cached = useAuthStore((s) => s.user);
  const self = me ?? cached;
  const [q, setQ] = useState('');
  const { data, isLoading } = useAdminUsers({ q: q || undefined, take: 100 });

  if (!isAdminRole(self?.role)) return <RestrictedPanel />;

  const users = data?.items ?? [];
  const isSuper = self?.role === 'SUPER_ADMIN';
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCog className="h-6 w-6 animate-glow-pulse text-cyan" />
          <span className="holo-text font-display">Users</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.total} akun terdaftar · ${activeCount} aktif`
            : 'Kelola akun, kredit, role, dan status.'}
        </p>
      </div>

      <DefaultCreditsCard />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau email…"
          className="h-10 w-full rounded-xl border border-border/60 bg-card/40 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan/60 focus:glow-cyan"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : users.length > 0 ? (
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow key={u.id} user={u} selfId={self?.id} isSuper={isSuper} />
          ))}
        </div>
      ) : (
        <div className="hud-panel flex h-40 items-center justify-center rounded-2xl text-sm text-muted-foreground">
          Tidak ada user yang cocok dengan “{q}”.
        </div>
      )}

      {!isSuper && (
        <p className="text-[11px] text-muted-foreground">
          Catatan: mengubah role hanya dapat dilakukan oleh SUPER_ADMIN.
        </p>
      )}
    </div>
  );
}

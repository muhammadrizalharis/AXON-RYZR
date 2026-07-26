'use client';

import { LogOut, User as UserIcon, Server, ShieldCheck } from 'lucide-react';
import { useCurrentUser, useLogout } from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { env } from '@/lib/env';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm text-foreground">{value ?? '—'}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { data } = useCurrentUser();
  const cached = useAuthStore((s) => s.user);
  const u = data ?? cached;
  const logout = useLogout();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        <span className="holo-text">Settings</span>
      </h1>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserIcon className="h-4 w-4 text-cyan" /> Account
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={u?.name} />
          <Field label="Email" value={u?.email} />
          <Field label="Role" value={u?.role} />
          <Field label="Status" value={u?.isActive ? 'Active' : 'Suspended'} />
        </div>
      </section>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Server className="h-4 w-4 text-cyan" /> System
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="API Endpoint" value={env.apiUrl} />
          <Field label="Realtime Gateway" value={env.socketUrl} />
        </div>
      </section>

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-cyan" /> Session
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Sign out of this device. You&apos;ll need your credentials to return.
        </p>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-destructive/20"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </div>
  );
}

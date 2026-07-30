'use client';

import { useEffect, useState } from 'react';
import {
  LogOut,
  User as UserIcon,
  Server,
  ShieldCheck,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  Gauge,
  Zap,
  Feather,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCurrentUser,
  useLogout,
  useChangePassword,
} from '@/features/auth/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { isAdminRole } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

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

const pwInputCls =
  'h-11 w-full rounded-xl border border-cyan/25 bg-background/60 px-3 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan focus:glow-cyan';

function ChangePasswordSection() {
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const strongEnough =
    next.length >= 8 && /[a-z]/.test(next) && /[A-Z]/.test(next) && /\d/.test(next);
  const canSubmit =
    current.length > 0 && strongEnough && next === confirm && !changePassword.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (next !== confirm) toast.error('Konfirmasi password tidak sama');
      else if (!strongEnough)
        toast.error('Password baru minimal 8 karakter dengan huruf besar, kecil & angka');
      return;
    }
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setConfirm('');
        },
      },
    );
  };

  return (
    <section className="hud-panel rounded-2xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <KeyRound className="h-4 w-4 text-cyan" /> Security — Ganti Password
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Setelah berhasil, semua perangkat lain otomatis keluar. Sesi ini tetap
        aktif.
      </p>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Password saat ini"
            autoComplete="current-password"
            className={pwInputCls}
          />
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Password baru"
          autoComplete="new-password"
          className={pwInputCls}
        />
        <input
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi password baru"
          autoComplete="new-password"
          className={pwInputCls}
        />
        <div className="flex items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-primary px-5 text-sm font-semibold text-white glow-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Ganti Password
          </button>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {show ? 'Sembunyikan' : 'Tampilkan'} password
          </button>
          {next && !strongEnough && (
            <span className="text-[11px] text-amber-400">
              min 8 karakter · huruf besar + kecil + angka
            </span>
          )}
          {confirm && next !== confirm && (
            <span className="text-[11px] text-red-400">konfirmasi tidak sama</span>
          )}
        </div>
      </form>
    </section>
  );
}

type PerfMode = 'auto' | 'full' | 'lite';

function isWeakDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (
    (nav.hardwareConcurrency || 8) <= 4 ||
    (nav.deviceMemory || 8) <= 4 ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function applyPerfMode(mode: PerfMode) {
  const lite = mode === 'lite' || (mode === 'auto' && isWeakDevice());
  document.documentElement.classList.toggle('lite', lite);
}

function PerformanceSection() {
  const [mode, setMode] = useState<PerfMode>('auto');
  const [weak, setWeak] = useState(false);

  useEffect(() => {
    setMode((localStorage.getItem('axon-perf') as PerfMode) || 'auto');
    setWeak(isWeakDevice());
  }, []);

  const choose = (m: PerfMode) => {
    setMode(m);
    localStorage.setItem('axon-perf', m);
    applyPerfMode(m);
    toast.success(
      m === 'lite'
        ? 'Mode Ringan aktif — efek berat dimatikan'
        : m === 'full'
          ? 'Mode Penuh aktif — semua efek visual menyala'
          : 'Mode Auto — menyesuaikan kemampuan perangkat',
    );
  };

  const OPTIONS: Array<{
    value: PerfMode;
    label: string;
    desc: string;
    icon: typeof Zap;
  }> = [
    {
      value: 'auto',
      label: 'Auto',
      desc: weak
        ? 'Perangkat ini terdeteksi ringan — efek dihemat otomatis'
        : 'Perangkat ini kuat — efek penuh otomatis',
      icon: Wand2,
    },
    {
      value: 'full',
      label: 'Penuh',
      desc: 'Semua glow, blur & animasi — untuk perangkat kencang',
      icon: Zap,
    },
    {
      value: 'lite',
      label: 'Ringan',
      desc: 'Tanpa animasi terus-menerus & blur — anti-lag',
      icon: Feather,
    },
  ];

  return (
    <section className="hud-panel rounded-2xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Gauge className="h-4 w-4 text-cyan" /> Performance — Mode Tampilan
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Laptop/HP kentang? Pilih Ringan: tampilan tetap cyberpunk, tapi semua
        efek mahal (blur kaca, glow berdenyut, hujan biner, partikel)
        dimatikan supaya mulus.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={cn(
              'rounded-xl border p-4 text-left transition',
              mode === o.value
                ? 'border-cyan/70 bg-cyan/10 glow-cyan'
                : 'border-border/60 bg-background/40 hover:border-cyan/40',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <o.icon className="h-4 w-4 text-cyan" /> {o.label}
              {mode === o.value && (
                <span className="ml-auto rounded-md border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cyan">
                  Aktif
                </span>
              )}
            </span>
            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">
              {o.desc}
            </span>
          </button>
        ))}
      </div>
    </section>
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

      <ChangePasswordSection />

      <PerformanceSection />

      <section className="hud-panel rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Server className="h-4 w-4 text-cyan" /> System
        </h2>
        {isAdminRole(u?.role) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="API Endpoint" value="Configured — see API page" />
            <Field label="Realtime Gateway" value="Configured · Socket.IO" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            System endpoints are managed by the administrator.
          </p>
        )}
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

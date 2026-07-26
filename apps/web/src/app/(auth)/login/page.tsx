'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  ScanFace,
  Fingerprint,
  ChevronsRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLogin } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Masukkan email yang valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in">
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-primary glow-cyan">
          <span className="text-lg font-black text-white">A</span>
        </div>
        <div className="leading-none">
          <p className="text-lg font-black tracking-tight holo-text">AURA</p>
          <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            Creative Studio
          </p>
        </div>
      </div>

      <div className="grid items-center gap-5 lg:grid-cols-[1fr_minmax(0,470px)_1fr]">
        {/* LEFT — Neural Face Scan */}
        <aside className="hidden flex-col items-center gap-3 lg:flex">
          <div className="hud-grid relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-cyan/25 bg-card/40">
            <div className="animate-scan pointer-events-none absolute inset-x-4 h-px bg-cyan/70 shadow-[0_0_12px_hsl(var(--cyan))]" />
            <ScanFace
              className="animate-glow-pulse h-28 w-28 text-cyan/80"
              strokeWidth={1}
            />
            <span className="absolute bottom-2 rounded bg-background/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] text-cyan/80">
              scanning…
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Neural Face Scan
          </p>
        </aside>

        {/* CENTER — Super Admin Access */}
        <div className="hud-panel rounded-2xl p-6 shadow-2xl sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-primary glow-cyan">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              Super Admin Access
              <Lock className="h-4 w-4 neon-cyan" />
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-accent/80">
              System Access Restricted · Level Omega
            </p>
          </div>

          <form
            onSubmit={handleSubmit((v) => login.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan/70" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@axon.local"
                  className="h-12 w-full rounded-xl border border-cyan/25 bg-background/60 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan focus:glow-cyan"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Security Password
              </label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="h-12 w-full rounded-xl border border-accent/25 bg-background/60 pl-10 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-accent focus:glow-magenta"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent via-primary to-cyan text-sm font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/30 transition hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] disabled:opacity-60"
            >
              {login.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronsRight className="h-4 w-4" />
              )}
              Secure Login
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Belum punya akses?{' '}
            <Link href="/register" className="neon-cyan hover:underline">
              Ajukan akun
            </Link>
          </p>
        </div>

        {/* RIGHT — Biometric */}
        <aside className="hidden flex-col items-center gap-4 lg:flex">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-accent/25 bg-card/40"
            >
              <div
                className="animate-scan pointer-events-none absolute inset-x-3 h-px bg-accent/70 shadow-[0_0_10px_hsl(var(--accent))]"
                style={{ animationDelay: `${i * 0.6}s` }}
              />
              <Fingerprint
                className={cn(
                  'animate-glow-pulse h-14 w-14',
                  i === 0 ? 'text-cyan/80' : 'text-accent/80',
                )}
                strokeWidth={1}
              />
            </div>
          ))}
          <p className="text-center text-[10px] uppercase leading-relaxed tracking-[0.2em] text-muted-foreground">
            Biometric &amp; Neural
            <br />
            Scan Required
          </p>
        </aside>
      </div>

      <p className="mt-7 text-center text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        Authorized Personnel Only · System Access Restricted
      </p>
    </div>
  );
}

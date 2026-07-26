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
  ChevronsRight,
  ChevronsLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLogin } from '@/features/auth/use-auth';
import {
  HudRings,
  WireframeFace,
  FingerprintScan,
  CircuitTrace,
  Corners,
} from '@/components/fx/decor';
import { Typewriter } from '@/components/fx/animated';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Masukkan email yang valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shaking, setShaking] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (v: FormValues) =>
    login.mutate(v, {
      onError: () => {
        setShaking(true);
        setTimeout(() => setShaking(false), 550);
      },
    });

  return (
    <div className="relative mx-auto w-full max-w-6xl animate-fade-in">
      {/* rotating HUD rings behind the card */}
      <HudRings className="left-1/2 top-1/2 hidden h-[580px] w-[580px] -translate-x-1/2 -translate-y-1/2 opacity-80 md:block" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,500px)_1fr]">
        {/* ── LEFT · NEURAL FACE SCAN ─────────────────────────────── */}
        <aside className="hidden flex-col items-center gap-4 lg:flex">
          <div className="relative w-full max-w-[250px] p-4">
            <Corners />
            <p className="mb-2 text-center font-display text-[10px] tracking-[0.35em] text-cyan/90 text-glow">
              NEURAL FACE SCAN
            </p>
            <div className="relative overflow-hidden">
              <WireframeFace className="animate-float mx-auto h-44 w-44" />
              <span className="animate-scan pointer-events-none absolute inset-x-2 h-px bg-cyan shadow-[0_0_14px_hsl(var(--cyan))]" />
            </div>
            <p className="mt-2 text-center font-display text-[9px] tracking-[0.3em] text-cyan/50">
              NEURAL FACE SCAN
            </p>
          </div>
          <div className="w-full max-w-[250px] space-y-1.5 px-4">
            {[82, 64, 91].map((w, i) => (
              <div key={i} className="h-1 overflow-hidden rounded-full bg-cyan/10">
                <div
                  className="bar-sweep h-full rounded-full bg-cyan/40"
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>
        </aside>

        {/* ── CENTER · SUPER ADMIN ACCESS ─────────────────────────── */}
        <div
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            setTilt({ x: py * -5, y: px * 7 });
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className={cn(
            'hud-panel relative rounded-3xl p-6 shadow-[0_0_70px_hsl(var(--primary)/0.28)] sm:p-8',
            shaking && 'animate-shake',
          )}
        >
          <h1 className="flex items-center justify-center gap-3 text-center font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Super Admin Access
            <Lock className="h-5 w-5 neon-magenta" />
          </h1>
          <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-cyan/70">
            <Typewriter text="> AUTHENTICATION MATRIX READY — AWAITING CREDENTIALS_" speed={22} />
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-5"
          >
            {/* email */}
            <div>
              <div className="rounded-2xl bg-gradient-to-r from-cyan/70 via-primary/50 to-accent/70 p-px glow-cyan transition focus-within:shadow-[0_0_26px_hsl(var(--cyan)/0.5)]">
                <div className="flex h-14 items-center gap-3 rounded-[15px] bg-background/85 px-4 backdrop-blur">
                  <Mail className="h-5 w-5 shrink-0 text-cyan" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Super Admin Email"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:tracking-wider placeholder:text-muted-foreground/70"
                    {...register('email')}
                  />
                  <CircuitTrace className="hidden h-6 w-20 shrink-0 text-cyan/50 sm:block" />
                  <Mail className="hidden h-4 w-4 shrink-0 text-accent/50 sm:block" />
                </div>
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* password */}
            <div>
              <div className="rounded-2xl bg-gradient-to-r from-accent/70 via-primary/50 to-cyan/70 p-px glow-magenta transition focus-within:shadow-[0_0_26px_hsl(var(--accent)/0.5)]">
                <div className="flex h-14 items-center gap-3 rounded-[15px] bg-background/85 px-4 backdrop-blur">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-accent" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Security Password"
                    onKeyUp={(e) =>
                      setCapsOn(e.getModifierState?.('CapsLock') ?? false)
                    }
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:tracking-wider placeholder:text-muted-foreground/70"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <CircuitTrace className="hidden h-6 w-14 shrink-0 text-accent/50 sm:block" />
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
              {capsOn && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-amber-400">
                  ⚠ Caps Lock aktif
                </p>
              )}
            </div>

            {/* SECURE LOGIN */}
            <div className="rounded-2xl bg-gradient-to-r from-cyan via-primary to-accent p-[2px] shadow-[0_0_30px_hsl(var(--cyan)/0.45),0_0_30px_hsl(var(--accent)/0.35)] transition hover:shadow-[0_0_48px_hsl(var(--cyan)/0.65),0_0_48px_hsl(var(--accent)/0.55)]">
              <button
                type="submit"
                disabled={login.isPending}
                className="shimmer group flex h-14 w-full items-center justify-center gap-3 rounded-[14px] bg-background/70 font-display text-base font-bold uppercase tracking-[0.3em] text-white backdrop-blur disabled:opacity-60"
              >
                <ChevronsLeft className="h-5 w-5 text-cyan transition group-hover:-translate-x-1" />
                {login.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="text-glow">Secure Login</span>
                )}
                <ChevronsRight className="h-5 w-5 text-accent transition group-hover:translate-x-1" />
              </button>
            </div>
          </form>

          <p className="mt-6 text-center font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Authorized Personnel Only · System Access Restricted
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground/80">
            Belum punya akses?{' '}
            <Link href="/register" className="neon-cyan hover:underline">
              Ajukan akun
            </Link>
          </p>
        </div>

        {/* ── RIGHT · BIOMETRIC ───────────────────────────────────── */}
        <aside className="hidden flex-col items-center gap-5 lg:flex">
          <div className="flex w-full max-w-[250px] items-end gap-4 px-2">
            <div className="relative flex-1 p-3">
              <Corners color="border-cyan/60" />
              <FingerprintScan className="mx-auto h-16 w-16" delay={0} />
            </div>
            <div className="relative flex-[1.4] p-3">
              <Corners color="border-accent/60" />
              <FingerprintScan className="mx-auto h-24 w-24" delay={0.7} accent />
            </div>
          </div>
          <p className="max-w-[240px] text-center font-display text-[9px] uppercase leading-relaxed tracking-[0.28em] text-muted-foreground">
            Biometric and Neural Scan Required
          </p>
          <p className="text-danger-flicker max-w-[250px] text-center font-display text-[10px] font-bold uppercase tracking-[0.2em]">
            System Access Restricted — Level Omega.
          </p>
          <div className="w-full max-w-[220px] space-y-1.5">
            {[70, 45, 88, 58].map((w, i) => (
              <div
                key={i}
                className="h-1 overflow-hidden rounded-full bg-accent/10"
              >
                <div
                  className="bar-sweep h-full rounded-full bg-accent/40"
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

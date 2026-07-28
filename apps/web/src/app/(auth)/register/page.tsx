'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';
import { useRegister } from '@/features/auth/use-auth';

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Masukkan email yang valid'),
  password: z
    .string()
    .min(8, 'Minimal 8 karakter')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Gunakan huruf besar, kecil & angka'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="mx-auto w-full max-w-md animate-fade-in">
      <div className="hud-panel rounded-2xl p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent glow-violet">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Registrasi Operator
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-cyan/80">
            New Access Request · Level Beta
          </p>
        </div>

        <form
          onSubmit={handleSubmit((v) => registerMutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan/70" />
              <input
                type="text"
                autoComplete="name"
                placeholder="Muhammad Rizal Haris"
                className="h-12 w-full rounded-xl border border-cyan/25 bg-background/60 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan focus:glow-cyan"
                {...register('name')}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan/70" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
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
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/70" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
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
            disabled={registerMutation.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan via-primary to-accent text-sm font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/30 transition hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] disabled:opacity-60"
          >
            {registerMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Buat Akun
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/login" className="neon-cyan hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

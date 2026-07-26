'use client';

import Link from 'next/link';
import {
  Coins,
  HardDrive,
  Images,
  CheckCircle2,
  Wand2,
  ArrowRight,
} from 'lucide-react';
import { useCurrentUser } from '@/features/auth/use-auth';
import { useJobs } from '@/features/generation/use-jobs';
import { JobCard } from '@/features/generation/job-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth-store';
import { CountUp, Typewriter } from '@/components/fx/animated';
import { cn, formatBytes } from '@/lib/utils';

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const cachedUser = useAuthStore((s) => s.user);
  const u = user ?? cachedUser;

  const { data, isLoading } = useJobs({ take: 8 });
  const jobs = data?.items ?? [];
  const total = data?.total ?? 0;
  const completed = jobs.filter((j) => j.status === 'COMPLETED').length;

  const stats = [
    {
      label: 'Credits',
      num: u?.credits ?? 0,
      icon: Coins,
      color: 'text-cyan',
    },
    {
      label: 'Storage Used',
      value: formatBytes(u?.storageUsed ?? 0),
      icon: HardDrive,
      color: 'text-primary',
    },
    {
      label: 'Total Renders',
      num: total,
      icon: Images,
      color: 'text-accent',
    },
    {
      label: 'Completed (recent)',
      num: completed,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
  ] as Array<{
    label: string;
    num?: number;
    value?: string;
    icon: typeof Coins;
    color: string;
  }>;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="hud-panel relative overflow-hidden rounded-2xl p-6">
        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan/80">
            Welcome back
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {u?.name ?? 'Operator'}
          </h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            <Typewriter text="Your on-premise generative studio is online. Spin up a new image or video render on the campus GPU." />
          </p>
          <Link
            href="/create"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-primary px-4 py-2.5 text-sm font-semibold text-white glow-cyan transition hover:brightness-110"
          >
            <Wand2 className="h-4 w-4" /> Open Creation Hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="hud-panel rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </span>
                <Icon className={cn('h-5 w-5 animate-glow-pulse', s.color)} />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {s.num !== undefined ? <CountUp value={s.num} /> : s.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent Generations
          </h2>
          <Link href="/gallery" className="text-xs neon-cyan hover:underline">
            View gallery →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            No generations yet.
          </div>
        )}
      </div>
    </div>
  );
}

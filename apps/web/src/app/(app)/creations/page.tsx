'use client';

import { useState } from 'react';
import {
  MonitorPlay,
  Search,
  Play,
  Loader2,
  XCircle,
  ShieldAlert,
  Ban,
  Download,
  Maximize2,
  Coins,
} from 'lucide-react';
import type { Job, JobStatus } from '@axon-ryzr/shared';
import { useCurrentUser } from '@/features/auth/use-auth';
import { isAdminRole } from '@/components/layout/nav-items';
import {
  useAllJobs,
  useAdminCancelJob,
} from '@/features/generation/use-jobs';
import { Lightbox } from '@/components/ui/lightbox';
import { AudioTile } from '@/components/ui/audio-tile';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadFile, extFromMime } from '@/lib/download';
import { humanizeJobError } from '@/lib/error-humanizer';
import { cn, formatRelativeTime } from '@/lib/utils';

const STATUS_FILTERS: Array<{ value: JobStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'RENDERING', label: 'Rendering' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_CLS: Record<Job['status'], string> = {
  QUEUED: 'border-border/60 bg-secondary/60 text-muted-foreground',
  RENDERING: 'border-cyan/40 bg-cyan/10 text-cyan',
  COMPLETED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
  FAILED: 'border-destructive/50 bg-destructive/10 text-red-400',
  CANCELLED: 'border-border/60 bg-secondary/60 text-muted-foreground',
};

function RestrictedPanel() {
  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="hud-panel rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/10">
          <ShieldAlert className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Creations Oversight Restricted
        </h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-accent/80">
          Administrator Clearance Required
        </p>
      </div>
    </div>
  );
}

function OversightCard({ job }: { job: Job }) {
  const adminCancel = useAdminCancelJob();
  const [preview, setPreview] = useState(false);
  const asset = job.assets?.[0];
  const done = job.status === 'COMPLETED' && asset;
  const isActive = job.status === 'QUEUED' || job.status === 'RENDERING';
  const humanError =
    job.status === 'FAILED' ? humanizeJobError(job.error) : null;
  const filename = asset
    ? `axon-${job.id.slice(0, 8)}.${extFromMime(asset.mimeType)}`
    : undefined;

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition hover:border-cyan/50 hover:shadow-[0_0_24px_hsl(var(--cyan)/0.15)]">
        <button
          type="button"
          disabled={!done}
          onClick={() => done && setPreview(true)}
          className={cn(
            'relative block aspect-square w-full bg-secondary/40',
            done && 'cursor-zoom-in',
          )}
        >
          {done ? (
            job.type === 'VIDEO' ? (
              <>
                <video
                  src={asset.url}
                  muted
                  loop
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan/50 bg-background/60 text-cyan backdrop-blur transition group-hover:scale-110">
                    <Play className="ml-0.5 h-5 w-5" />
                  </span>
                </span>
              </>
            ) : job.type === 'AUDIO' ? (
              <AudioTile />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt={job.prompt}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
            )
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
              {isActive ? (
                <Loader2 className="h-8 w-8 animate-spin text-cyan" />
              ) : job.status === 'FAILED' ? (
                <XCircle className="h-7 w-7 text-red-400" />
              ) : null}
              {humanError ? (
                <span className="text-center text-xs text-red-400">
                  {humanError.title}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {job.status}
                  {job.status === 'RENDERING' ? ` · ${job.progress}%` : ''}
                </span>
              )}
            </span>
          )}

          {isActive && (
            <span className="animate-scan pointer-events-none absolute inset-x-6 h-px bg-cyan/70 shadow-[0_0_10px_hsl(var(--cyan))]" />
          )}

          <span className="absolute left-2 top-2 flex gap-1.5">
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest backdrop-blur',
                STATUS_CLS[job.status],
              )}
            >
              {job.status}
            </span>
            <span className="rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
              {job.type}
            </span>
          </span>
          {done && (
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          )}
        </button>

        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-xs font-semibold text-cyan/90"
              title={job.user?.email}
            >
              @{job.user?.name ?? 'unknown'}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
              <Coins className="h-3 w-3" /> {job.creditsCost}
            </span>
          </div>
          <p
            className="line-clamp-2 text-xs text-foreground/90"
            title={job.prompt}
          >
            {job.prompt}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(job.createdAt)}
            </span>
            <div className="flex gap-1">
              {done && filename && (
                <button
                  type="button"
                  title="Download"
                  onClick={() => downloadFile(asset.url, filename)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
              {isActive && (
                <button
                  type="button"
                  title="Batalkan job user ini (kredit dikembalikan ke pemilik)"
                  onClick={() => adminCancel.mutate(job.id)}
                  disabled={adminCancel.isPending}
                  className="flex h-7 items-center gap-1 rounded-lg border border-destructive/40 px-2 text-[10px] font-semibold uppercase text-red-400 transition hover:bg-destructive/10 disabled:opacity-40"
                >
                  {adminCancel.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Ban className="h-3 w-3" />
                  )}
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {preview && done && (
        <Lightbox
          src={asset.url}
          type={job.type}
          alt={`@${job.user?.name ?? 'unknown'} — ${job.prompt}`}
          filename={filename}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

export default function AllCreationsPage() {
  const { data: me } = useCurrentUser();
  const [status, setStatus] = useState<JobStatus | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const { data, isLoading } = useAllJobs({
    status: status === 'ALL' ? undefined : status,
    q: q || undefined,
    take: 48,
  });

  if (me && !isAdminRole(me.role)) return <RestrictedPanel />;

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MonitorPlay className="h-6 w-6 animate-glow-pulse text-cyan" />
          <span className="holo-text font-display">All Creations</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.total} render dari seluruh user — pantau, unduh, atau batalkan.`
            : 'Pantauan penuh semua generasi user.'}
        </p>
      </div>

      <div className="hud-panel flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, email, atau prompt…"
            className="h-10 w-full rounded-xl border border-border/60 bg-background/50 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition',
                status === f.value
                  ? 'border-cyan/60 bg-cyan/10 text-cyan'
                  : 'border-border/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((job) => (
            <OversightCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="hud-panel flex h-64 flex-col items-center justify-center rounded-2xl text-center">
          <MonitorPlay className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Tidak ada job yang cocok dengan filter.
          </p>
        </div>
      )}
    </div>
  );
}

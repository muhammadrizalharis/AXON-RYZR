'use client';

import { useState } from 'react';
import { Download, Loader2, XCircle, Play, Maximize2 } from 'lucide-react';
import type { Job } from '@axon-ryzr/shared';
import { Lightbox } from '@/components/ui/lightbox';
import { useCancelJob } from '@/features/generation/use-jobs';
import { cn, formatRelativeTime } from '@/lib/utils';

const STATUS_CLS: Record<Job['status'], string> = {
  QUEUED: 'border-border/60 bg-secondary/60 text-muted-foreground',
  RENDERING: 'border-cyan/40 bg-cyan/10 text-cyan',
  COMPLETED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
  FAILED: 'border-destructive/50 bg-destructive/10 text-red-400',
  CANCELLED: 'border-border/60 bg-secondary/60 text-muted-foreground',
};

export function JobCard({ job }: { job: Job }) {
  const cancel = useCancelJob();
  const [preview, setPreview] = useState(false);
  const isActive = job.status === 'QUEUED' || job.status === 'RENDERING';
  const asset = job.assets?.[0];
  const done = job.status === 'COMPLETED' && asset;

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
                <video src={asset.url} muted loop className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan/50 bg-background/60 text-cyan backdrop-blur transition group-hover:scale-110">
                    <Play className="ml-0.5 h-5 w-5" />
                  </span>
                </span>
              </>
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
            <span className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
              {isActive ? (
                <Loader2 className="h-8 w-8 animate-spin text-cyan" />
              ) : job.status === 'FAILED' ? (
                <XCircle className="h-8 w-8 text-red-400" />
              ) : null}
              <span className="text-xs text-muted-foreground">
                {job.status === 'FAILED'
                  ? job.error || 'Generation failed'
                  : job.status}
              </span>
            </span>
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
          {isActive && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan to-primary shadow-[0_0_8px_hsl(var(--cyan)/0.6)] transition-all"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <p className="text-right text-[10px] text-cyan">{job.progress}%</p>
            </div>
          )}
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
              {done && (
                <a
                  href={asset.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  title="Download"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() => cancel.mutate(job.id)}
                  disabled={job.status === 'RENDERING'}
                  className="h-7 rounded-lg border border-destructive/40 px-2 text-[10px] font-semibold uppercase text-red-400 transition hover:bg-destructive/10 disabled:opacity-40"
                >
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
          alt={job.prompt}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

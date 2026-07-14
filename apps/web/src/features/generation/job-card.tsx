'use client';

import { Download, Loader2, XCircle } from 'lucide-react';
import type { Job } from '@axon-ryzr/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useCancelJob } from '@/features/generation/use-jobs';
import { formatRelativeTime } from '@/lib/utils';

const STATUS_VARIANT: Record<
  Job['status'],
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  QUEUED: 'secondary',
  RENDERING: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
};

export function JobCard({ job }: { job: Job }) {
  const cancel = useCancelJob();
  const isActive = job.status === 'QUEUED' || job.status === 'RENDERING';
  const asset = job.assets?.[0];

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-square w-full bg-secondary/40">
        {job.status === 'COMPLETED' && asset ? (
          job.type === 'VIDEO' ? (
            <video
              src={asset.url}
              controls
              loop
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.url}
              alt={job.prompt}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
            {isActive ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : job.status === 'FAILED' ? (
              <XCircle className="h-8 w-8 text-red-400" />
            ) : null}
            <span className="text-xs text-muted-foreground">
              {job.status === 'FAILED'
                ? job.error || 'Generation failed'
                : job.status}
            </span>
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge>
          <Badge variant="secondary">{job.type}</Badge>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {isActive && (
          <div className="space-y-1">
            <Progress value={job.progress} />
            <p className="text-right text-[10px] text-muted-foreground">
              {job.progress}%
            </p>
          </div>
        )}
        <p className="line-clamp-2 text-xs text-foreground/90" title={job.prompt}>
          {job.prompt}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(job.createdAt)}
          </span>
          <div className="flex gap-1">
            {job.status === 'COMPLETED' && asset && (
              <a href={asset.url} download target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="h-7 px-2">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
            {isActive && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-red-400"
                onClick={() => cancel.mutate(job.id)}
                disabled={job.status === 'RENDERING'}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

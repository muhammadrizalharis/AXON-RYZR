'use client';

import { Sparkles } from 'lucide-react';
import { GenerationPanel } from '@/features/generation/generation-panel';
import { JobCard } from '@/features/generation/job-card';
import { useJobs } from '@/features/generation/use-jobs';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreatePage() {
  const { data, isLoading } = useJobs({ take: 12 });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          Creation Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Turn your ideas into images and video on the campus GPU.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <GenerationPanel />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent generations
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {data.items.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Sparkles className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No generations yet. Create your first one!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

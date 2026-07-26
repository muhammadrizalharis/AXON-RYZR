'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Images, Search } from 'lucide-react';
import { AssetType } from '@axon-ryzr/shared';
import { AssetCard } from '@/features/gallery/asset-card';
import { useGallery } from '@/features/gallery/use-gallery';
import { useJobs } from '@/features/generation/use-jobs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatBytes } from '@/lib/utils';

type Filter = 'ALL' | AssetType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: AssetType.IMAGE, label: 'Images' },
  { value: AssetType.VIDEO, label: 'Videos' },
];

function GalleryContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').toLowerCase();

  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, isLoading } = useGallery({
    type: filter === 'ALL' ? undefined : filter,
    take: 48,
  });
  // Prompt text lives on jobs — map jobId -> prompt for search.
  const { data: jobsData } = useJobs({ take: 50 });
  const promptByJob = new Map(
    (jobsData?.items ?? []).map((j) => [j.id, j.prompt.toLowerCase()]),
  );

  const items = (data?.items ?? []).filter((a) => {
    if (!q) return true;
    const prompt = a.jobId ? promptByJob.get(a.jobId) ?? '' : '';
    return prompt.includes(q);
  });

  const totalSize = items.reduce((s, a) => s + Number(a.fileSize || 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Images className="h-6 w-6 animate-glow-pulse text-cyan" />
            <span className="holo-text font-display">My Gallery</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length === 1 ? '' : 's'} ·{' '}
            {formatBytes(totalSize)}
            {q && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[11px] text-cyan">
                <Search className="h-3 w-3" /> “{q}”
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm font-medium transition',
                filter === f.value
                  ? 'border-cyan/60 bg-cyan/10 text-cyan glow-cyan'
                  : 'border-border/60 text-muted-foreground hover:border-cyan/40 hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="hud-panel flex h-72 flex-col items-center justify-center rounded-2xl text-center">
          <Images className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {q
              ? `No results for “${q}”.`
              : 'Your gallery is empty. Head to the Creation Hub to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryContent />
    </Suspense>
  );
}

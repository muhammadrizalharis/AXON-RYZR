'use client';

import { useState } from 'react';
import { Images } from 'lucide-react';
import { AssetType } from '@axon-ryzr/shared';
import { AssetCard } from '@/features/gallery/asset-card';
import { useGallery } from '@/features/gallery/use-gallery';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Filter = 'ALL' | AssetType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: AssetType.IMAGE, label: 'Images' },
  { value: AssetType.VIDEO, label: 'Videos' },
];

export default function GalleryPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, isLoading } = useGallery({
    type: filter === 'ALL' ? undefined : filter,
    take: 48,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Images className="h-6 w-6 text-primary" />
            My Gallery
          </h1>
          <p className="text-sm text-muted-foreground">
            All your generated images and videos.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
              className={cn(filter === f.value && 'shadow-none')}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Images className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your gallery is empty. Head to the Creation Hub to get started.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Users, Play, Maximize2, Globe } from 'lucide-react';
import type { Asset } from '@axon-ryzr/shared';
import { useCommunity } from '@/features/gallery/use-gallery';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbox } from '@/components/ui/lightbox';
import { AudioTile } from '@/components/ui/audio-tile';
import { formatRelativeTime } from '@/lib/utils';

function CommunityCard({ asset }: { asset: Asset }) {
  const [preview, setPreview] = useState(false);
  const prompt = asset.job?.prompt ?? 'Untitled creation';

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition hover:border-cyan/50 hover:shadow-[0_0_24px_hsl(var(--cyan)/0.15)]">
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="relative block aspect-video w-full cursor-zoom-in bg-secondary/40"
        >
          {asset.type === 'VIDEO' ? (
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
          ) : asset.type === 'AUDIO' ? (
            <AudioTile />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.url}
              alt={prompt}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          )}
          <span className="absolute left-2 top-2 rounded-md border border-cyan/30 bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan backdrop-blur">
            {asset.type}
          </span>
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </button>

        <div className="p-3">
          <p
            className="line-clamp-1 text-sm font-semibold text-foreground"
            title={prompt}
          >
            {prompt}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate text-cyan/80">
              @{asset.user?.name ?? 'operator'}
            </span>
            <span>{formatRelativeTime(asset.createdAt)}</span>
          </div>
        </div>
      </div>

      {preview && (
        <Lightbox
          src={asset.url}
          type={asset.type}
          alt={prompt}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

export default function CommunityPage() {
  const { data, isLoading } = useCommunity({ take: 30 });
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6 animate-glow-pulse text-cyan" />
          <span className="holo-text font-display">Community</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} karya dibagikan oleh para kreator.` : 'Karya yang dibagikan para kreator.'}
        </p>
      </div>

      <div className="hud-panel flex items-center gap-3 rounded-2xl p-4">
        <Globe className="h-5 w-5 shrink-0 animate-glow-pulse text-cyan" />
        <p className="text-sm text-muted-foreground">
          Bagikan karyamu dari <span className="text-cyan">My Gallery</span> —
          klik ikon globe pada aset untuk menampilkannya di sini.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-2xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((asset) => (
            <CommunityCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="hud-panel flex h-64 flex-col items-center justify-center rounded-2xl text-center">
          <Users className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada karya yang dibagikan. Jadilah yang pertama!
          </p>
        </div>
      )}
    </div>
  );
}

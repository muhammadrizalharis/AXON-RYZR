'use client';

import { useState } from 'react';
import {
  Download,
  Trash2,
  Play,
  Maximize2,
  Globe,
  Loader2,
} from 'lucide-react';
import type { Asset } from '@axon-ryzr/shared';
import { Lightbox } from '@/components/ui/lightbox';
import { AudioTile } from '@/components/ui/audio-tile';
import { useDeleteAsset, useShareAsset } from '@/features/gallery/use-gallery';
import { downloadFile, extFromMime } from '@/lib/download';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';

export function AssetCard({ asset }: { asset: Asset }) {
  const del = useDeleteAsset();
  const share = useShareAsset();
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const resLabel =
    asset.width && asset.height ? `${asset.width}×${asset.height}` : null;
  const filename = `axon-${asset.id.slice(0, 8)}.${extFromMime(asset.mimeType)}`;

  return (
    <>
      <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition hover:border-cyan/50 hover:shadow-[0_0_24px_hsl(var(--cyan)/0.15)]">
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="relative block aspect-square w-full cursor-zoom-in bg-secondary/40"
        >
          {asset.type === 'VIDEO' ? (
            <>
              <video src={asset.url} muted loop className="h-full w-full object-cover" />
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
              alt="Generated asset"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          )}

          <span className="absolute left-2 top-2 flex gap-1.5">
            <span className="rounded-md border border-cyan/30 bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan backdrop-blur">
              {asset.type}
              {resLabel ? ` · ${resLabel}` : ''}
            </span>
            {asset.isPublic && (
              <span className="flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300 backdrop-blur">
                <Globe className="h-3 w-3" /> Public
              </span>
            )}
          </span>
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
          </span>
        </button>

        <div className="flex items-center justify-between gap-2 p-2.5">
          <div className="min-w-0 text-[10px] leading-tight text-muted-foreground">
            <p>{formatRelativeTime(asset.createdAt)}</p>
            <p>{formatBytes(asset.fileSize)}</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              title={
                asset.isPublic
                  ? 'Sembunyikan dari Community'
                  : 'Bagikan ke Community'
              }
              onClick={() =>
                share.mutate({ id: asset.id, isPublic: !asset.isPublic })
              }
              disabled={share.isPending}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border transition',
                asset.isPublic
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                  : 'border-border/60 text-muted-foreground hover:border-cyan/50 hover:text-cyan',
              )}
            >
              {share.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              title="Download"
              onClick={() => downloadFile(asset.url, filename)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-cyan/50 hover:text-cyan"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            {confirmDelete ? (
              <button
                type="button"
                title="Click again to confirm"
                onClick={() => del.mutate(asset.id)}
                onBlur={() => setConfirmDelete(false)}
                disabled={del.isPending}
                className="flex h-8 items-center gap-1 rounded-lg border border-destructive/60 bg-destructive/15 px-2 text-[10px] font-bold uppercase text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" /> Sure?
              </button>
            ) : (
              <button
                type="button"
                title="Delete"
                onClick={() => setConfirmDelete(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-destructive/60 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {preview && (
        <Lightbox
          src={asset.url}
          type={asset.type}
          filename={filename}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

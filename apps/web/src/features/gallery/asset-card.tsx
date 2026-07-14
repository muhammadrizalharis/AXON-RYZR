'use client';

import { Download, Trash2 } from 'lucide-react';
import type { Asset } from '@axon-ryzr/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDeleteAsset } from '@/features/gallery/use-gallery';
import { formatBytes, formatRelativeTime } from '@/lib/utils';

export function AssetCard({ asset }: { asset: Asset }) {
  const del = useDeleteAsset();

  return (
    <Card className="group overflow-hidden">
      <div className="relative aspect-square w-full bg-secondary/40">
        {asset.type === 'VIDEO' ? (
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
            alt="Generated asset"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <Badge variant="secondary" className="absolute left-2 top-2">
          {asset.type}
        </Badge>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <a href={asset.url} download target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary" className="h-8 px-2">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2 text-red-400"
            onClick={() => del.mutate(asset.id)}
            disabled={del.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between p-2 text-[10px] text-muted-foreground">
        <span>{formatRelativeTime(asset.createdAt)}</span>
        <span>{formatBytes(asset.fileSize)}</span>
      </div>
    </Card>
  );
}

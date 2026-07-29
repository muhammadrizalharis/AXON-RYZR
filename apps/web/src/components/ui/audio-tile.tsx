'use client';

import { Music } from 'lucide-react';

/**
 * Decorative tile for AUDIO assets (used where images/videos show a
 * thumbnail). Pure CSS equalizer bars + music glyph on a dark gradient.
 */
export function AudioTile({ label = 'AUDIO TRACK' }: { label?: string }) {
  return (
    <span className="relative flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/25 via-background to-accent/20">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/50 bg-background/60 text-accent backdrop-blur">
        <Music className="h-6 w-6" />
      </span>
      <span className="flex h-6 items-end gap-1">
        {[0.9, 0.5, 1, 0.65, 0.8, 0.4, 0.95].map((h, i) => (
          <span
            key={i}
            className="w-1 animate-pulse rounded-full bg-accent/70"
            style={{
              height: `${h * 100}%`,
              animationDelay: `${i * 120}ms`,
              animationDuration: '900ms',
            }}
          />
        ))}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

'use client';

import { Users, Sparkles, Heart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRAD = [
  'from-cyan/30 to-primary/30',
  'from-primary/30 to-accent/30',
  'from-accent/30 to-cyan/30',
];

const SHOWCASE = [
  { title: 'Neon Metropolis', author: 'AI_Creator_99', likes: 128 },
  { title: 'Golden Hour Peaks', author: 'render_master', likes: 96 },
  { title: 'Astronaut Portrait', author: 'studio_flux', likes: 210 },
  { title: 'Cyber Alleyway', author: 'nightowl', likes: 74 },
  { title: 'Watercolor Dreams', author: 'aqua_ai', likes: 152 },
  { title: 'Motion Genesis', author: 'kinetic', likes: 63 },
];

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6 text-cyan" />
          <span className="holo-text">Community</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Discover creations shared across the studio.
        </p>
      </div>

      <div className="hud-panel flex items-center gap-3 rounded-2xl p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-cyan" />
        <p className="text-sm text-muted-foreground">
          Public sharing is coming soon. Below is a preview of the community
          feed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHOWCASE.map((s, i) => (
          <div
            key={s.title}
            className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition hover:border-cyan/40"
          >
            <div
              className={cn(
                'relative aspect-video bg-gradient-to-br',
                GRAD[i % GRAD.length],
              )}
            >
              <div className="hud-grid absolute inset-0" />
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>@{s.author}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {s.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {s.likes * 3}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

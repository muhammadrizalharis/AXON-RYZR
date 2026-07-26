'use client';

import {
  Sparkles,
  SlidersHorizontal,
  History,
  Library,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { Job } from '@axon-ryzr/shared';
import { GenerationPanel } from '@/features/generation/generation-panel';
import { JobCard } from '@/features/generation/job-card';
import { useJobs } from '@/features/generation/use-jobs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDraftStore } from '@/store/draft-store';
import { cn } from '@/lib/utils';

const PROMPT_LIBRARY = [
  'A serene mountain landscape at golden hour, ultra detailed',
  'Cyberpunk city street, neon reflections, rain, cinematic',
  'Portrait of an astronaut, studio lighting, 85mm lens',
  'Cozy coffee shop interior, warm bokeh, photorealistic',
];

const STYLE_LABEL: Record<string, string> = {
  none: 'None',
  photorealistic: 'Photorealistic',
  cinematic: 'Cinematic',
  anime: 'Anime',
  'digital-art': 'Digital Art',
  '3d-render': '3D Render',
  watercolor: 'Watercolor',
  neon: 'Neon',
};

function WorkspacePanel({ jobs }: { jobs: Job[] }) {
  const aspectRatio = useDraftStore((s) => s.aspectRatio);
  const style = useDraftStore((s) => s.style);
  const resolution = useDraftStore((s) => s.resolution);
  const duration = useDraftStore((s) => s.duration);
  const fps = useDraftStore((s) => s.fps);
  const setPrompt = useDraftStore((s) => s.setPrompt);

  const params = [
    { label: 'Aspect Ratio', value: aspectRatio },
    { label: 'Style', value: STYLE_LABEL[style] ?? style },
    { label: 'Resolution', value: resolution },
    { label: 'Duration', value: `${duration}s` },
    { label: 'FPS', value: String(fps) },
  ];

  const history = jobs.slice(0, 6);
  const usePromptCls =
    'block w-full truncate rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:border-cyan/50 hover:text-foreground';

  return (
    <aside className="space-y-4">
      <div className="hud-panel rounded-2xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-cyan" /> Parameters
          <span className="ml-auto text-[9px] uppercase tracking-widest text-cyan/70">
            live
          </span>
        </h3>
        <ul className="space-y-2">
          {params.map((p) => (
            <li
              key={p.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground">{p.label}</span>
              <span className="rounded-md border border-cyan/20 bg-cyan/5 px-2 py-0.5 font-medium text-cyan">
                {p.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hud-panel rounded-2xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-cyan" /> History
          <span className="ml-auto text-[9px] uppercase tracking-widest text-muted-foreground">
            click to reuse
          </span>
        </h3>
        {history.length ? (
          <ul className="space-y-2">
            {history.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  title={j.prompt}
                  onClick={() => setPrompt(j.prompt)}
                  className={usePromptCls}
                >
                  {j.prompt}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No history yet.</p>
        )}
      </div>

      <div className="hud-panel rounded-2xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Library className="h-4 w-4 text-cyan" /> Prompts Library
          <span className="ml-auto text-[9px] uppercase tracking-widest text-muted-foreground">
            click to use
          </span>
        </h3>
        <ul className="space-y-2">
          {PROMPT_LIBRARY.map((p) => (
            <li key={p}>
              <button
                type="button"
                title={p}
                onClick={() => setPrompt(p)}
                className={cn(usePromptCls, 'whitespace-normal line-clamp-2')}
              >
                {p}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function StatusFooter({ jobs }: { jobs: Job[] }) {
  const active = jobs.filter(
    (j) => j.status === 'QUEUED' || j.status === 'RENDERING',
  );
  const completed = jobs.filter((j) => j.status === 'COMPLETED');
  const failed = jobs.filter((j) => j.status === 'FAILED');
  const avg = active.length
    ? Math.round(
        active.reduce((s, j) => s + (j.progress ?? 0), 0) / active.length,
      )
    : 0;

  const items = [
    {
      label: 'Active Renders',
      value: String(active.length),
      sub: `${avg}%`,
      pct: avg,
      color: 'from-cyan to-primary',
      icon: Activity,
    },
    {
      label: 'Completed',
      value: String(completed.length),
      sub: 'done',
      pct: 100,
      color: 'from-emerald-400 to-cyan',
      icon: CheckCircle2,
    },
    {
      label: 'Failed',
      value: String(failed.length),
      sub: failed.length ? 'check logs' : 'none',
      pct: failed.length ? 100 : 0,
      color: 'from-accent to-primary',
      icon: XCircle,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="hud-panel rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Icon className="h-4 w-4 text-cyan" /> {it.label}
              </span>
              <span className="text-xs text-muted-foreground">{it.sub}</span>
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{it.value}</p>
            <div
              className={cn(
                'mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/60',
                it.label === 'Active Renders' && it.pct > 0 && 'bar-sweep',
              )}
            >
              <div
                className={cn('h-full rounded-full bg-gradient-to-r', it.color)}
                style={{ width: `${it.pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreatePage() {
  const { data, isLoading } = useJobs({ take: 12 });
  const jobs = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 animate-glow-pulse text-cyan" />
          <span className="holo-text font-display">Creation Hub</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe your vision and render it on the campus GPU.
        </p>
      </div>

      <GenerationPanel />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent Generations
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center">
              <Sparkles className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No generations yet. Create your first one!
              </p>
            </div>
          )}
        </div>

        <WorkspacePanel jobs={jobs} />
      </div>

      <StatusFooter jobs={jobs} />
    </div>
  );
}

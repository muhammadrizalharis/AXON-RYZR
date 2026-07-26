'use client';

import { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  ImageIcon,
  Loader2,
  Layers,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from '@/features/projects/use-projects';

const inputCls =
  'h-11 w-full rounded-xl border border-cyan/25 bg-background/60 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan focus:glow-cyan';

export default function ProjectsPage() {
  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleCreate = () => {
    if (name.trim().length < 1) return;
    createProject.mutate(
      { name, description: description || undefined },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FolderKanban className="h-6 w-6 animate-glow-pulse text-cyan" />
          <span className="holo-text font-display">Projects</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Organize your creations into projects.
        </p>
      </div>

      <div className="hud-panel rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus className="h-4 w-4 text-cyan" /> New Project
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Project name — e.g. Campus branding"
            className={inputCls}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Short description (optional)"
            className={inputCls}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createProject.isPending || name.trim().length < 1}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-primary px-5 text-sm font-semibold text-white glow-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createProject.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((project) => (
            <div
              key={project.id}
              className="group rounded-2xl border border-border/60 bg-card/40 p-4 transition hover:border-cyan/50 hover:shadow-[0_0_24px_hsl(var(--cyan)/0.12)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/25 to-primary/25 text-cyan">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
                {confirmId === project.id ? (
                  <button
                    type="button"
                    title="Click again to confirm"
                    onClick={() => deleteProject.mutate(project.id)}
                    onBlur={() => setConfirmId(null)}
                    disabled={deleteProject.isPending}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-destructive/60 bg-destructive/15 px-2 text-[10px] font-bold uppercase text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Sure?
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Delete project"
                    onClick={() => setConfirmId(project.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground opacity-0 transition hover:border-destructive/60 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-cyan">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {project._count?.assets ?? 0} assets
                </span>
                <span>{formatRelativeTime(project.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="hud-panel flex h-48 flex-col items-center justify-center rounded-2xl text-center">
          <FolderKanban className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        </div>
      )}
    </div>
  );
}

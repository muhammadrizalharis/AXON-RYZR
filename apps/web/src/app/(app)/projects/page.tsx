'use client';

import { useState } from 'react';
import { FolderKanban, Plus, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from '@/features/projects/use-projects';

export default function ProjectsPage() {
  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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
          <FolderKanban className="h-6 w-6 text-primary" />
          Projects
        </h1>
        <p className="text-sm text-muted-foreground">
          Organize your creations into projects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pname">Name</Label>
              <Input
                id="pname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Campus branding assets"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Description (optional)</Label>
              <Textarea
                id="pdesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description…"
                className="min-h-[40px] resize-none"
              />
            </div>
          </div>
          <Button
            variant="gradient"
            onClick={handleCreate}
            disabled={createProject.isPending || name.trim().length < 1}
          >
            {createProject.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create project
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{project.name}</p>
                    {project.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-red-400"
                    onClick={() => deleteProject.mutate(project.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {project._count?.assets ?? 0} assets
                  </span>
                  <span>{formatRelativeTime(project.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <FolderKanban className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        </div>
      )}
    </div>
  );
}

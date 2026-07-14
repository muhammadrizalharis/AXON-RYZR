'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api/projects';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

export function useProjects() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    enabled: !!accessToken,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      projectsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Failed to create project')),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Failed to delete project')),
  });
}

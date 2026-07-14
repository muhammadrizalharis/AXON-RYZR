import type { Project } from '@axon-ryzr/shared';
import { apiClient } from '../api-client';

export const projectsApi = {
  list: () =>
    apiClient
      .get<{ items: Project[]; total: number }>('/projects')
      .then((r) => r.data),

  create: (payload: { name: string; description?: string }) =>
    apiClient.post<Project>('/projects', payload).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/projects/${id}`).then((r) => r.data),
};

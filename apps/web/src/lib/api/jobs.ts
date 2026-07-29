import type { Job, JobStatus, Paginated } from '@axon-ryzr/shared';
import { apiClient } from '../api-client';

export const jobsApi = {
  list: (params?: { status?: JobStatus; skip?: number; take?: number }) =>
    apiClient
      .get<Paginated<Job>>('/jobs', { params })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Job>(`/jobs/${id}`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.patch<Job>(`/jobs/${id}/cancel`).then((r) => r.data),

  // ── Admin oversight ──

  listAll: (params?: {
    status?: JobStatus;
    q?: string;
    skip?: number;
    take?: number;
  }) =>
    apiClient
      .get<Paginated<Job>>('/jobs/admin/all', { params })
      .then((r) => r.data),

  adminCancel: (id: string) =>
    apiClient.patch<Job>(`/jobs/admin/${id}/cancel`).then((r) => r.data),
};

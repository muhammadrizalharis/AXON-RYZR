import type { Paginated, Role, User } from '@axon-ryzr/shared';
import { apiClient } from '../api-client';

export type AdminUser = User & {
  _count?: { jobs: number; assets: number };
};

export interface AdminSettings {
  defaultUserCredits: number;
}

export const adminApi = {
  listUsers: (params?: { q?: string; skip?: number; take?: number }) =>
    apiClient
      .get<Paginated<AdminUser>>('/users', { params })
      .then((r) => r.data),

  adjustCredits: (id: string, amount: number, reason?: string) =>
    apiClient
      .patch<AdminUser>(`/users/${id}/credits`, { amount, reason })
      .then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    apiClient
      .patch<AdminUser>(`/users/${id}/${active ? 'activate' : 'deactivate'}`)
      .then((r) => r.data),

  setRole: (id: string, role: Role) =>
    apiClient.patch<AdminUser>(`/users/${id}/role/${role}`).then((r) => r.data),

  getSettings: () =>
    apiClient.get<AdminSettings>('/users/admin/settings').then((r) => r.data),

  updateSettings: (data: AdminSettings) =>
    apiClient
      .patch<AdminSettings>('/users/admin/settings', data)
      .then((r) => r.data),
};

import type { Asset, AssetType, Paginated } from '@axon-ryzr/shared';
import { apiClient } from '../api-client';

export const galleryApi = {
  list: (params?: {
    type?: AssetType;
    projectId?: string;
    skip?: number;
    take?: number;
  }) =>
    apiClient
      .get<Paginated<Asset>>('/gallery', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Asset>(`/gallery/${id}`).then((r) => r.data),

  remove: (id: string) =>
    apiClient
      .delete<{ deleted: boolean; id: string }>(`/gallery/${id}`)
      .then((r) => r.data),

  share: (id: string, isPublic: boolean) =>
    apiClient
      .patch<Asset>(`/gallery/${id}/share`, { isPublic })
      .then((r) => r.data),

  community: (params?: { skip?: number; take?: number }) =>
    apiClient
      .get<Paginated<Asset>>('/community', { params })
      .then((r) => r.data),
};

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AssetType } from '@axon-ryzr/shared';
import { galleryApi } from '@/lib/api/gallery';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

export function useGallery(params?: {
  type?: AssetType;
  projectId?: string;
  skip?: number;
  take?: number;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['gallery', params ?? {}],
    queryFn: () => galleryApi.list(params),
    enabled: !!accessToken,
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => galleryApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Asset deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Delete failed')),
  });
}

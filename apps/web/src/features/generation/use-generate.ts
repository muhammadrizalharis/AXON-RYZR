'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateImagePayload,
  CreateVideoPayload,
} from '@axon-ryzr/shared';
import { generationApi } from '@/lib/api/generation';
import { getApiErrorMessage } from '@/lib/api-client';

export function useGenerateImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateImagePayload) =>
      generationApi.createImage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Image generation queued');
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Failed to queue generation')),
  });
}

export function useGenerateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVideoPayload) =>
      generationApi.createVideo(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Video generation queued');
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Failed to queue generation')),
  });
}

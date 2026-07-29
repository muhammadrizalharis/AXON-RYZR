'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { JobStatus } from '@axon-ryzr/shared';
import { jobsApi } from '@/lib/api/jobs';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

export function useJobs(params?: {
  status?: JobStatus;
  skip?: number;
  take?: number;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['jobs', params ?? {}],
    queryFn: () => jobsApi.list(params),
    enabled: !!accessToken,
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Render dibatalkan — kredit dikembalikan');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Cancel failed')),
  });
}

// ── Admin oversight ──

export function useAllJobs(params?: {
  status?: JobStatus;
  q?: string;
  skip?: number;
  take?: number;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-jobs', params ?? {}],
    queryFn: () => jobsApi.listAll(params),
    enabled: !!accessToken,
    refetchInterval: 10_000, // keep the oversight grid live
  });
}

export function useAdminCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.adminCancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job user dibatalkan — kredit dikembalikan ke pemiliknya');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Cancel failed')),
  });
}

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
      toast.success('Job cancelled');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Cancel failed')),
  });
}

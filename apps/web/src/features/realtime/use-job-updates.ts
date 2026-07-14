'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { JobEventPayload, Paginated, Job } from '@axon-ryzr/shared';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';

/**
 * Subscribes to realtime job updates and patches the cached job list
 * so progress bars and statuses update live without polling.
 */
export function useJobUpdates() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);

    const onUpdate = (event: JobEventPayload) => {
      // Patch every cached jobs query.
      queryClient.setQueriesData<Paginated<Job>>(
        { queryKey: ['jobs'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((job) =>
              job.id === event.jobId
                ? {
                    ...job,
                    status: event.status,
                    progress: event.progress,
                    error: event.error ?? job.error,
                  }
                : job,
            ),
          };
        },
      );

      if (event.status === 'COMPLETED') {
        toast.success('Generation complete');
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['gallery'] });
      } else if (event.status === 'FAILED') {
        toast.error(event.error || 'Generation failed');
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    };

    socket.on('job:update', onUpdate);
    return () => {
      socket.off('job:update', onUpdate);
    };
  }, [accessToken, queryClient]);
}

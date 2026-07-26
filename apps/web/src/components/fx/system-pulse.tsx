'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/** Live backend health beacon — "NEURAL GRID ONLINE". */
export function SystemPulse({ className }: { className?: string }) {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () =>
      (await apiClient.get<{ status: string }>('/health')).data,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });

  const online = !isError && data?.status === 'ok';

  return (
    <span
      title={online ? 'Backend & GPU grid reachable' : 'Backend unreachable'}
      className={cn(
        'hidden items-center gap-2 rounded-full border px-3 py-1.5 font-display text-[10px] tracking-[0.18em] lg:flex',
        online
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-destructive/50 bg-destructive/10 text-red-400',
        className,
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          online ? 'animate-ring-pulse bg-emerald-400' : 'bg-red-500',
        )}
      />
      {online ? 'NEURAL GRID ONLINE' : 'GRID OFFLINE'}
    </span>
  );
}

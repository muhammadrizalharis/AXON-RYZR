'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Role } from '@axon-ryzr/shared';
import { adminApi, type AdminSettings } from '@/lib/api/admin';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

export function useAdminUsers(params?: {
  q?: string;
  skip?: number;
  take?: number;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-users', params ?? {}],
    queryFn: () => adminApi.listUsers(params),
    enabled: !!accessToken,
  });
}

function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };
}

export function useAdjustCredits() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({
      id,
      amount,
      reason,
    }: {
      id: string;
      amount: number;
      reason?: string;
    }) => adminApi.adjustCredits(id, amount, reason),
    onSuccess: (u) => {
      invalidate();
      toast.success(`Kredit ${u.name}: ${u.credits}`);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Gagal mengubah kredit')),
  });
}

export function useSetActive() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.setActive(id, active),
    onSuccess: (u) => {
      invalidate();
      toast.success(
        u.isActive ? `${u.name} diaktifkan` : `${u.name} dinonaktifkan`,
      );
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Gagal mengubah status akun')),
  });
}

export function useSetRole() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      adminApi.setRole(id, role),
    onSuccess: (u) => {
      invalidate();
      toast.success(`${u.name} sekarang ${u.role}`);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Gagal mengubah role')),
  });
}

export function useAdminSettings() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
    enabled: !!accessToken,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminSettings) => adminApi.updateSettings(data),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success(`Default kredit user baru: ${s.defaultUserCredits}`);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Gagal menyimpan pengaturan')),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
} from '@axon-ryzr/shared';
import { authApi } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { disconnectSocket } from '@/lib/socket';

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth({
        user: data.user,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/create');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Login failed')),
  });
}

export function useRegister() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      setAuth({
        user: data.user,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
      toast.success('Account created. Enjoy AURA Creative Studio!');
      router.push('/create');
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Registration failed')),
  });
}

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      clearAuth();
      disconnectSocket();
      queryClient.clear();
      router.push('/login');
    },
  });
}

export function useChangePassword() {
  const setTokens = useAuthStore((s) => s.setTokens);

  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      authApi.changePassword(payload),
    onSuccess: (data) => {
      // Server revokes every session; adopt the fresh pair so we stay logged in.
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      toast.success('Password berhasil diganti. Perangkat lain telah keluar.');
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, 'Gagal mengganti password')),
  });
}

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
    enabled: !!accessToken,
    staleTime: 60_000,
  });
}

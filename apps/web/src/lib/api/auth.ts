import type {
  AuthResponse,
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  User,
} from '@axon-ryzr/shared';
import { apiClient } from '../api-client';

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<AuthTokens>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  logout: () => apiClient.post<void>('/auth/logout').then((r) => r.data),

  me: () => apiClient.get<User>('/users/me').then((r) => r.data),
};

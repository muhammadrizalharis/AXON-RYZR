import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import type { AuthTokens } from '@axon-ryzr/shared';
import { env } from './env';
import { useAuthStore } from '@/store/auth-store';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh-token rotation on 401 ──
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const store = useAuthStore.getState();

    const isAuthRoute = original?.url?.includes('/auth/');

    if (status !== 401 || original?._retry || isAuthRoute) {
      return Promise.reject(error);
    }

    if (!store.refreshToken) {
      store.clearAuth();
      redirectToLogin();
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue requests until the in-flight refresh resolves.
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post<AuthTokens>(
        `${env.apiUrl}/auth/refresh`,
        { refreshToken: store.refreshToken },
      );
      store.setTokens(data.accessToken, data.refreshToken);
      flushQueue(data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      flushQueue(null);
      store.clearAuth();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function redirectToLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

/**
 * Extracts a human-readable message from an API error.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as { message?: string | string[] })
      ?.message;
    if (Array.isArray(msg)) return msg[0];
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

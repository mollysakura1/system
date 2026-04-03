import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from '../config';
import i18n from '../locales';
import router from '../router';
import { useUserStore } from '../store/modules/user';
import { expireSession, isSessionIdleExpired, touchSessionActivity } from './session';

const service = axios.create({
  baseURL: '/api',
  timeout: 15000
});

let refreshPromise: Promise<string> | null = null;

service.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    if (isSessionIdleExpired()) {
      expireSession();
      return Promise.reject(new axios.Cancel('Session idle timeout'));
    }
    config.headers.Authorization = `Bearer ${token}`;
    touchSessionActivity();
  }
  return config;
});

service.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ message: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes('/auth/refresh');
    const userStore = useUserStore();

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
      if (!refreshToken) {
        userStore.clearAuth();
        router.replace('/login');
        return Promise.reject(error);
      }

      try {
        refreshPromise ??= userStore.refreshTokenAction().finally(() => {
          refreshPromise = null;
        });
        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return service(originalRequest);
      } catch {
        userStore.clearAuth();
        router.replace('/login');
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && isRefreshRequest) {
      userStore.clearAuth();
      router.replace('/login');
      return Promise.reject(error);
    }

    ElMessage.error(error.response?.data?.message ?? i18n.global.t('request.failed'));
    return Promise.reject(error);
  }
);

export default service;

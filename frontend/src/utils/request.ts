import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { API_BASE_URL } from '../config/env';
import i18n from '../locales';
import router from '../router';
import { useUserStore } from '../store/modules/user';
import { expireSession, isSessionIdleExpired, touchSessionActivity } from './session';

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true
});

let refreshPromise: Promise<unknown> | null = null;

service.interceptors.request.use((config) => {
  const userStore = useUserStore();
  if (userStore.accessToken && isSessionIdleExpired()) {
    expireSession();
    return Promise.reject(new axios.Cancel('Session idle timeout'));
  }

  if (userStore.accessToken) {
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

      try {
        refreshPromise ??= userStore.refreshTokenAction().finally(() => {
          refreshPromise = null;
        });
        await refreshPromise;
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

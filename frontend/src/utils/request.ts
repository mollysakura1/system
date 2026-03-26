import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { TOKEN_KEY } from '../config';
import i18n from '../locales';
import router from '../router';
import { useUserStore } from '../store/modules/user';

const service = axios.create({
  baseURL: '/api',
  timeout: 15000
});

let refreshPromise: Promise<string> | null = null;

service.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

service.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ message: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const userStore = useUserStore();
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
      }
    }
    ElMessage.error(error.response?.data?.message ?? i18n.global.t('request.failed'));
    return Promise.reject(error);
  }
);

export default service;

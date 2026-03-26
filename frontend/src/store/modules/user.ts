import { defineStore } from 'pinia';
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from '../../config';
import { getMenusApi } from '../../api/system';
import { getProfileApi, loginApi, refreshTokenApi, updateProfileApi } from '../../api/auth';
import type { AppMenu, LoginResult, UserProfile } from '../../types';
import { useAppStore } from './app';
import { useChatStore } from './chat';
import { useMessageStore } from './message';

interface UserState {
  accessToken: string;
  refreshToken: string;
  profile: UserProfile | null;
  menus: AppMenu[];
  permissions: string[];
  dynamicRoutesReady: boolean;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    accessToken: localStorage.getItem(TOKEN_KEY) ?? '',
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) ?? '',
    profile: null,
    menus: [],
    permissions: [],
    dynamicRoutesReady: false
  }),
  getters: {
    role: (state) => state.profile?.role
  },
  actions: {
    setToken(payload: Pick<LoginResult, 'accessToken' | 'refreshToken'>) {
      this.accessToken = payload.accessToken;
      this.refreshToken = payload.refreshToken;
      localStorage.setItem(TOKEN_KEY, payload.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
    },
    async loginAction(payload: { username: string; password: string; captchaId: string; captchaCode: string }) {
      useAppStore().clearVisitedTabs();
      const { data } = await loginApi(payload);
      this.setToken(data);
      this.dynamicRoutesReady = false;
      return data;
    },
    async fetchProfile() {
      const { data } = await getProfileApi();
      this.profile = data;
      this.permissions = data.permissions;
      useChatStore().loadForAccount(data.id);
      return data;
    },
    async updateProfile(payload: Partial<Pick<UserProfile, 'avatar' | 'name' | 'phone' | 'email' | 'address'>> & { password?: string }) {
      const { data } = await updateProfileApi(payload);
      this.profile = {
        ...data,
        permissions: this.permissions
      };
      return data;
    },
    async fetchMenus() {
      const { data } = await getMenusApi();
      this.menus = data;
      return data;
    },
    async refreshTokenAction() {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
      const { data } = await refreshTokenApi(refreshToken);
      this.setToken(data);
      return data.accessToken;
    },
    clearAuth() {
      useAppStore().clearVisitedTabs();
      useChatStore().resetRuntime();
      useMessageStore().reset();
      this.accessToken = '';
      this.refreshToken = '';
      this.profile = null;
      this.menus = [];
      this.permissions = [];
      this.dynamicRoutesReady = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
});

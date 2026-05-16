import { defineStore } from 'pinia';
import { LAST_ACTIVE_AT_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY } from '../../config';
import { getMenusApi } from '../../api/system';
import { getProfileApi, loginApi, logoutApi, refreshTokenApi, updateProfileApi } from '../../api/auth';
import type { AppMenu, UserProfile } from '../../types';
import { useAppStore } from './app';
import { useChatStore } from './chat';
import { useMessageStore } from './message';
import { clearCsrfToken } from '../../utils/security';
import { clearSessionActivity, touchSessionActivity } from '../../utils/session';

interface UserState {
  accessToken: string;
  profile: UserProfile | null;
  menus: AppMenu[];
  permissions: string[];
  dynamicRoutesReady: boolean;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    accessToken: '',
    profile: null,
    menus: [],
    permissions: [],
    dynamicRoutesReady: false
  }),
  getters: {
    role: (state) => state.profile?.role
  },
  actions: {
    markAuthenticated(accessToken: string) {
      this.accessToken = accessToken;
    },
    async loginAction(payload: { username: string; password: string; captchaId: string; captchaCode: string }) {
      useAppStore().clearVisitedTabs();
      const { data } = await loginApi(payload);
      this.markAuthenticated(data.accessToken);
      touchSessionActivity(true);
      this.dynamicRoutesReady = false;
      return data;
    },
    async fetchProfile() {
      const { data } = await getProfileApi();
      this.profile = data;
      this.permissions = data.permissions;
      await useChatStore().loadForAccount(data.id);
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
      const { data } = await refreshTokenApi();
      this.markAuthenticated(data.accessToken);
      touchSessionActivity(true);
      return data;
    },
    async logoutAction() {
      try {
        await logoutApi();
      } finally {
        this.clearAuth();
      }
    },
    clearAuth() {
      clearCsrfToken();
      useAppStore().clearVisitedTabs();
      useChatStore().resetRuntime();
      useMessageStore().reset();
      this.accessToken = '';
      this.profile = null;
      this.menus = [];
      this.permissions = [];
      this.dynamicRoutesReady = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(LAST_ACTIVE_AT_KEY);
      clearSessionActivity();
    }
  }
});

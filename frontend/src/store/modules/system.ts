import { defineStore } from 'pinia';
import {
  createRoleApi,
  createUserApi,
  deleteRoleApi,
  deleteUserApi,
  getLogsApi,
  getRolesApi,
  getUsersApi,
  updateRoleApi,
  updateUserApi
} from '../../api/system';
import type { UserRecord } from '../../types';

type SystemRow = Record<string, string | number | boolean | string[]>;

interface SystemState {
  users: UserRecord[];
  roles: SystemRow[];
  logs: SystemRow[];
  initialized: {
    users: boolean;
    roles: boolean;
    logs: boolean;
  };
}

function createState(): SystemState {
  return {
    users: [],
    roles: [],
    logs: [],
    initialized: {
      users: false,
      roles: false,
      logs: false
    }
  };
}

export const useSystemStore = defineStore('system', {
  state: (): SystemState => createState(),
  getters: {
    roleOptions(state) {
      return state.roles.map((role) => ({
        label: String(role.name),
        value: String(role.code)
      }));
    }
  },
  actions: {
    async ensureUsers(force = false) {
      if (this.initialized.users && !force) return;
      const { data } = await getUsersApi();
      this.users = data.list;
      this.initialized.users = true;
    },
    async ensureRoles() {
      if (this.initialized.roles) return;
      const { data } = await getRolesApi();
      this.roles = data.map((item) => ({
        ...item,
        permissions: this.defaultPermissions(String(item.code))
      }));
      this.initialized.roles = true;
    },
    async ensureLogs() {
      if (this.initialized.logs) return;
      const { data } = await getLogsApi();
      this.logs = data.list;
      this.initialized.logs = true;
    },
    defaultPermissions(code: string) {
      const map: Record<string, string[]> = {
        'super-admin': ['user:create', 'user:edit', 'user:delete', 'role:assign', 'menu:assign', 'system:settings'],
        operator: ['merchant:view', 'product:edit', 'activity:create', 'coupon:manage'],
        analyst: ['dashboard:view', 'orders:view', 'logs:view', 'ai:generate'],
        merchant: ['product:view', 'orders:view', 'activity:view', 'coupon:view']
      };
      return map[code] ?? [];
    },
    async addUser(user: Partial<UserRecord> & { username: string; name: string; role: string; password?: string }) {
      await createUserApi(user);
      await this.ensureUsers(true);
    },
    async updateUser(id: string, patch: Partial<UserRecord> & { password?: string }) {
      await updateUserApi(id, patch);
      await this.ensureUsers(true);
    },
    async removeUser(id: string) {
      await deleteUserApi(id);
      await this.ensureUsers(true);
    },
    async addRole(role: SystemRow) {
      const { data } = await createRoleApi(role);
      this.roles.unshift(data);
    },
    async updateRole(id: string, patch: SystemRow) {
      const { data } = await updateRoleApi(id, patch);
      const index = this.roles.findIndex((item) => String(item.id) === id);
      if (index >= 0) {
        this.roles[index] = data;
      }
    },
    async removeRole(id: string) {
      await deleteRoleApi(id);
      this.roles = this.roles.filter((item) => String(item.id) !== id);
    },
    removeLog(id: string) {
      this.logs = this.logs.filter((item) => String(item.id) !== id);
    }
  }
});

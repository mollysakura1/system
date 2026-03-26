import type { RoleCode } from './auth.js';

export interface AppMenu {
  id: string;
  name: string;
  path: string;
  component?: string;
  icon?: string;
  title: string;
  roles: RoleCode[];
  permissions?: string[];
  children?: AppMenu[];
  keepAlive?: boolean;
  hidden?: boolean;
}

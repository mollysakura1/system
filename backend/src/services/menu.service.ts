import { menus } from '../mock/data.js';
import type { AppMenu } from '../types/menu.js';
import type { RoleCode } from '../types/auth.js';

export function getMenusByRole(role: RoleCode): AppMenu[] {
  const filterMenu = (items: AppMenu[]): AppMenu[] =>
    items
      .filter((item) => item.roles.includes(role))
      .map((item) => ({
        ...item,
        children: item.children ? filterMenu(item.children) : undefined
      }));

  return filterMenu(menus);
}

export function getPermissionCodes(menuList: AppMenu[]): string[] {
  return menuList.flatMap((item) => [
    ...(item.permissions ?? []),
    ...(item.children ? getPermissionCodes(item.children) : [])
  ]);
}

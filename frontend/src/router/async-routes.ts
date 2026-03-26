import type { RouteRecordRaw } from 'vue-router';
import type { AppMenu } from '../types';

const viewModules = import.meta.glob('../views/**/*.vue');

function resolveView(component?: string) {
  return component ? viewModules[`../views/${component}.vue`] : undefined;
}

export function transformMenusToRoutes(menus: AppMenu[]): RouteRecordRaw[] {
  return menus.map((menu) => {
    const route = {
      path: menu.path,
      name: menu.name,
      component: (menu.component
        ? resolveView(menu.component)
        : () => import('../layout/router-view.vue')) as RouteRecordRaw['component'],
      meta: {
        title: menu.title,
        icon: menu.icon,
        keepAlive: menu.keepAlive,
        permissions: menu.permissions ?? []
      }
    } as RouteRecordRaw;

    if (menu.children?.length) {
      route.children = transformMenusToRoutes(menu.children);
      if (!menu.component) {
        route.redirect = menu.children[0].path;
      }
    }

    return route;
  });
}

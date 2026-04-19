import { createRouter, createWebHistory } from 'vue-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { constantRoutes } from './routes';
import { useUserStore } from '../store/modules/user';
import { transformMenusToRoutes } from './async-routes';
import { useAppStore } from '../store/modules/app';
import type { AppMenu } from '../types';

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 })
});

async function ensureDynamicRoutes() {
  const userStore = useUserStore();
  if (userStore.dynamicRoutesReady || !userStore.accessToken) return false;

  const [, menus] = await Promise.all([userStore.fetchProfile(), userStore.fetchMenus()]);
  const routes = transformMenusToRoutes(menus);

  routes.forEach((route) => router.addRoute('Root', route));
  userStore.dynamicRoutesReady = true;
  return true;
}

function hasMenuAccess(menus: AppMenu[], path: string): boolean {
  return menus.some((menu) => {
    if (menu.path === path) return true;
    if (menu.children?.length) return hasMenuAccess(menu.children, path);
    return false;
  });
}

router.beforeEach(async (to, _, next) => {
  NProgress.start();
  const userStore = useUserStore();

  if (to.meta.public) {
    if (to.path === '/login' && userStore.accessToken) {
      next('/dashboard');
      return;
    }
    next();
    return;
  }

  if (!userStore.accessToken) {
    next('/login');
    return;
  }

  try {
    const routeInjected = await ensureDynamicRoutes();

    if (!['/system/settings', '/profile-settings', '/'].includes(to.path) && !hasMenuAccess(userStore.menus, to.path)) {
      next('/403');
      return;
    }

    if (routeInjected) {
      next({ path: to.fullPath, replace: true });
      return;
    }

    if (to.name === 'NotFound') {
      const resolved = router.resolve(to.fullPath);
      if (resolved.name && resolved.name !== 'NotFound') {
        next({ path: to.fullPath, replace: true });
        return;
      }
    }

    const appStore = useAppStore();
    appStore.addVisitedTab({ title: String(to.meta.title ?? 'Page'), path: to.fullPath });
    next();
  } catch {
    userStore.clearAuth();
    next('/login');
  }
});

router.afterEach(() => {
  NProgress.done();
});

export default router;

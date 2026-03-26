import i18n from '../locales';

const routeTitleMap: Record<string, string> = {
  '/login': 'routes.login',
  '/register': '',
  '/dashboard': 'routes.dashboard',
  '/profile-settings': '',
  '/system': 'routes.system',
  '/system/settings': 'routes.settings',
  '/system/users': 'routes.users',
  '/system/roles': 'routes.roles',
  '/system/menus': 'routes.menus',
  '/system/logs': 'routes.logs',
  '/business': 'routes.business',
  '/business/merchants': 'routes.merchants',
  '/business/products': 'routes.products',
  '/business/orders': 'routes.orders',
  '/business/activities': 'routes.activities',
  '/business/coupons': 'routes.coupons',
  '/ai-assistant': 'routes.aiAssistant',
  '/403': 'routes.forbidden',
  '/404': 'routes.notFound'
};

const menuPathTitleMap: Record<string, string> = {
  '/system': 'routes.system',
  '/system/users': 'routes.users',
  '/system/roles': 'routes.roles',
  '/system/menus': 'routes.menus',
  '/system/logs': 'routes.logs',
  '/business': 'routes.business',
  '/business/merchants': 'routes.merchants',
  '/business/products': 'routes.products',
  '/business/orders': 'routes.orders',
  '/business/activities': 'routes.activities',
  '/business/coupons': 'routes.coupons',
  '/dashboard': 'routes.dashboard',
  '/ai-assistant': 'routes.aiAssistant'
};

export function translateRouteTitle(path: string, fallback = '') {
  const key = routeTitleMap[path];
  if (path === '/register') {
    return i18n.global.locale.value === 'en' ? 'Register' : '注册';
  }
  if (path === '/profile-settings') {
    return i18n.global.locale.value === 'en' ? 'Profile Settings' : '个人设置';
  }
  return key ? i18n.global.t(key) : fallback;
}

export function translateMenuTitle(path: string, fallback = '') {
  const key = menuPathTitleMap[path];
  return key ? i18n.global.t(key) : fallback;
}

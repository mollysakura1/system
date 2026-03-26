import type { RouteRecordRaw } from 'vue-router';

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { public: true, title: 'Login' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/register/index.vue'),
    meta: { public: true, title: 'Register' }
  },
  {
    path: '/',
    name: 'Root',
    component: () => import('../layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: '/system/settings',
        name: 'TopSettings',
        component: () => import('../views/system/settings.vue'),
        meta: { title: 'System Settings' }
      },
      {
        path: '/profile-settings',
        name: 'ProfileSettings',
        component: () => import('../views/profile-settings/index.vue'),
        meta: { title: 'Profile Settings' }
      }
    ]
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('../views/error/403.vue'),
    meta: { public: true, title: '403' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/error/404.vue'),
    meta: { title: '404' }
  }
];

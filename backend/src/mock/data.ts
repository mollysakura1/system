import dayjs from 'dayjs';
import type { CurrentUser, RoleCode } from '../types/auth.js';
import type { AppMenu } from '../types/menu.js';

export interface StoredUser extends CurrentUser {}

export interface SiteMessage {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'permission-request' | 'permission-updated' | 'system';
  read: boolean;
  createdAt: string;
}

export const users: StoredUser[] = [
  {
    id: 'u1',
    username: 'admin',
    name: 'Molly Chen',
    role: 'super-admin',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=admin',
    email: 'admin@aiops.com',
    phone: '13800000001',
    address: 'Shanghai Putuo District',
    department: 'Platform'
  },
  {
    id: 'u2',
    username: 'operator',
    name: 'Leo Wang',
    role: 'operator',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=operator',
    email: 'operator@aiops.com',
    phone: '13800000002',
    address: 'Shanghai Xuhui District',
    department: 'Growth'
  },
  {
    id: 'u3',
    username: 'analyst',
    name: 'Iris Zhou',
    role: 'analyst',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=analyst',
    email: 'analyst@aiops.com',
    phone: '13800000003',
    address: 'Shanghai Pudong New Area',
    department: 'BI'
  },
  {
    id: 'u4',
    username: 'merchant',
    name: 'Ava Li',
    role: 'merchant',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=merchant',
    email: 'merchant@aiops.com',
    phone: '13800000004',
    address: 'Hangzhou Binjiang District',
    department: 'Merchant Ops',
    merchantId: 'm1'
  }
];

export const credentialMap: Record<string, { password: string; role: RoleCode; userId: string }> = {
  admin: { password: '123456', role: 'super-admin', userId: 'u1' },
  operator: { password: '123456', role: 'operator', userId: 'u2' },
  analyst: { password: '123456', role: 'analyst', userId: 'u3' },
  merchant: { password: '123456', role: 'merchant', userId: 'u4' }
};

export const menus: AppMenu[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    component: 'dashboard/index',
    icon: 'Odometer',
    title: 'Dashboard',
    roles: ['super-admin', 'operator', 'analyst', 'merchant'],
    keepAlive: true
  },
  {
    id: 'system',
    name: 'System',
    path: '/system',
    title: 'System',
    icon: 'Setting',
    roles: ['super-admin'],
    children: [
      {
        id: 'users',
        name: 'Users',
        path: '/system/users',
        component: 'system/users',
        title: 'Users',
        roles: ['super-admin'],
        permissions: ['user:create', 'user:edit', 'user:delete']
      },
      {
        id: 'roles',
        name: 'Roles',
        path: '/system/roles',
        component: 'system/roles',
        title: 'Roles',
        roles: ['super-admin'],
        permissions: ['role:create', 'role:edit']
      },
      {
        id: 'menus',
        name: 'Menus',
        path: '/system/menus',
        component: 'system/menus',
        title: 'Menus',
        roles: ['super-admin'],
        permissions: ['menu:assign']
      },
      {
        id: 'logs',
        name: 'Logs',
        path: '/system/logs',
        component: 'system/logs',
        title: 'Logs',
        roles: ['super-admin']
      }
    ]
  },
  {
    id: 'business',
    name: 'Business',
    path: '/business',
    title: 'Business',
    icon: 'Shop',
    roles: ['super-admin', 'operator', 'analyst', 'merchant'],
    children: [
      {
        id: 'merchants',
        name: 'Merchants',
        path: '/business/merchants',
        component: 'business/merchants',
        title: 'Merchants',
        roles: ['super-admin', 'operator', 'analyst']
      },
      {
        id: 'products',
        name: 'Products',
        path: '/business/products',
        component: 'business/products',
        title: 'Products',
        roles: ['super-admin', 'operator', 'merchant'],
        permissions: ['product:publish', 'product:edit']
      },
      {
        id: 'orders',
        name: 'Orders',
        path: '/business/orders',
        component: 'business/orders',
        title: 'Orders',
        roles: ['super-admin', 'operator', 'analyst', 'merchant']
      },
      {
        id: 'activities',
        name: 'Activities',
        path: '/business/activities',
        component: 'business/activities',
        title: 'Activities',
        roles: ['super-admin', 'operator', 'merchant'],
        permissions: ['activity:create', 'activity:publish']
      },
      {
        id: 'coupons',
        name: 'Coupons',
        path: '/business/coupons',
        component: 'business/coupons',
        title: 'Coupons',
        roles: ['super-admin', 'operator', 'merchant']
      }
    ]
  },
  {
    id: 'ai',
    name: 'AiAssistant',
    path: '/ai-assistant',
    component: 'ai-assistant/index',
    icon: 'MagicStick',
    title: 'AI Assistant',
    roles: ['super-admin', 'operator', 'analyst', 'merchant'],
    permissions: ['ai:generate']
  }
];

export const roles = [
  { id: 'r1', name: 'Super Admin', code: 'super-admin', description: 'Full platform access' },
  { id: 'r2', name: 'Operator', code: 'operator', description: 'Responsible for campaign, product, and merchant operations' },
  { id: 'r3', name: 'Analyst', code: 'analyst', description: 'Responsible for dashboards, trends, and business diagnosis' },
  { id: 'r4', name: 'Merchant', code: 'merchant', description: 'Responsible for merchant-side business operations' }
];

export const merchants = [
  { id: 'm1', merchantCode: 'MCH2026032601', name: 'Stellar Coffee', channel: 'Private Traffic', owner: 'Ava Li', status: 'Enabled', gmv: 302199, orders: 1542, conversionRate: 6.2 },
  { id: 'm2', merchantCode: 'MCH2026032602', name: 'South Tea House', channel: 'Douyin', owner: 'Leo Wang', status: 'Enabled', gmv: 199830, orders: 1284, conversionRate: 5.1 },
  { id: 'm3', merchantCode: 'MCH2026032603', name: 'Urban Light Meal', channel: 'Meituan', owner: 'Molly Chen', status: 'Disabled', gmv: 120900, orders: 642, conversionRate: 3.5 }
];

export const products = [
  { id: 'p1', productCode: 'PRD2026032601', name: 'Coconut Latte', merchantId: 'm1', category: 'Beverage', price: 26, stock: 122, sales: 8421, status: 'Listed' },
  { id: 'p2', productCode: 'PRD2026032602', name: 'Cold Americano', merchantId: 'm1', category: 'Beverage', price: 19, stock: 233, sales: 7232, status: 'Listed' },
  { id: 'p3', productCode: 'PRD2026032603', name: 'Berry Yogurt Bowl', merchantId: 'm3', category: 'Light Meal', price: 28, stock: 45, sales: 2311, status: 'Unlisted' }
];

export const orders = Array.from({ length: 24 }).map((_, index) => ({
  id: `o${index + 1}`,
  orderNo: `ORD202603${String(1000 + index)}`,
  merchantName: merchants[index % merchants.length].name,
  amount: 68 + index * 7,
  status: ['Pending Payment', 'Paid', 'Completed', 'Refunded'][index % 4],
  channel: ['Private Traffic', 'Douyin', 'Meituan'][index % 3],
  createdAt: dayjs().subtract(index, 'day').format('YYYY-MM-DD HH:mm:ss')
}));

export const activities = [
  { id: 'a1', activityCode: 'ACT2026032601', name: 'Spring User Growth', type: 'Full Reduction', status: 'Ongoing', budget: 50000, roi: 2.8, merchantName: 'Stellar Coffee' },
  { id: 'a2', activityCode: 'ACT2026032602', name: 'Member Day Livestream', type: 'Livestream', status: 'Ended', budget: 28000, roi: 3.6, merchantName: 'South Tea House' },
  { id: 'a3', activityCode: 'ACT2026032603', name: 'New Product Coupon Drop', type: 'Coupon', status: 'Pending Release', budget: 16000, roi: 0, merchantName: 'Urban Light Meal' }
];

export const coupons = [
  { id: 'c1', couponCode: 'CPN2026032601', name: '20-5 New User Coupon', stock: 1000, used: 654, status: 'Delivering' },
  { id: 'c2', couponCode: 'CPN2026032602', name: '39-10 Return Coupon', stock: 800, used: 485, status: 'Delivering' },
  { id: 'c3', couponCode: 'CPN2026032603', name: '59-12 Holiday Coupon', stock: 1500, used: 0, status: 'Pending Delivery' }
];

export const logs = Array.from({ length: 20 }).map((_, index) => ({
  id: `l${index + 1}`,
  operator: users[index % users.length].name,
  module: ['Login', 'Activity Management', 'Permission Config', 'Export Report'][index % 4],
  action: ['Create', 'Edit', 'Delete', 'Export'][index % 4],
  ip: `192.168.1.${index + 10}`,
  createdAt: dayjs().subtract(index, 'hour').format('YYYY-MM-DD HH:mm:ss')
}));

export const aiPrompts = [
  'Analyze why orders dropped over the last 30 days',
  'Summarize this week’s active user trend',
  'Generate a promo copy for a public campaign',
  'Provide operation suggestions based on current performance',
  'Generate a concise weekly operations report'
];

export const siteMessages: SiteMessage[] = [
  {
    id: 'msg-admin-1',
    userId: 'u1',
    title: '本周系统概览',
    content: '本周共上线 3 个新活动，当前有 2 条权限变更申请等待审核。',
    type: 'system',
    read: false,
    createdAt: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'msg-admin-2',
    userId: 'u1',
    title: '商家增长提醒',
    content: '南巷茶铺本周 GMV 较上周提升了 18%，建议继续关注转化趋势。',
    type: 'system',
    read: false,
    createdAt: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'msg-operator-1',
    userId: 'u2',
    title: '活动复盘提醒',
    content: '请在今天 18:00 前完成会员日直播活动的复盘查看。',
    type: 'system',
    read: false,
    createdAt: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'msg-operator-2',
    userId: 'u2',
    title: '券包库存预警',
    content: '新客优惠券的使用率已超过 65%，请关注后续投放节奏。',
    type: 'system',
    read: true,
    createdAt: dayjs().subtract(8, 'hour').format('YYYY-MM-DD HH:mm:ss')
  }
];

export function getUserById(userId: string) {
  return users.find((item) => item.id === userId);
}

export function getUserByUsername(username: string) {
  return users.find((item) => item.username === username);
}

export function createDefaultAvatar(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

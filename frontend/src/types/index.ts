export type RoleCode = 'super-admin' | 'operator' | 'analyst' | 'merchant';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  role: RoleCode;
}

export interface CaptchaResult {
  captchaId: string;
  svg: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: RoleCode;
  avatar: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  merchantId?: string;
  permissions: string[];
}

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  role: RoleCode;
  status: string;
  createdAt: string;
  avatar: string;
  phone: string;
  email: string;
  address: string;
}

export interface SiteMessage {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'permission-request' | 'permission-updated' | 'system';
  read: boolean;
  createdAt: string;
}

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

export interface PaginatedResult<T> {
  list: T[];
  total: number;
}

export interface ChartOverview {
  role: RoleCode;
  metrics: Array<{ key: string; label: string; value: number; yoy: number; unit: string }>;
  quickStats: {
    pendingOrders: number;
    activeCampaigns: number;
    abnormalMerchants: number;
    aiInsights: number;
  };
}

export interface ChartData {
  dates: string[];
  orderTrend: number[];
  gmvTrend: number[];
  categorySales: Array<{ name: string; value: number }>;
  userSources: Array<{ name: string; value: number }>;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  error?: boolean;
  prompt?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessageItem[];
  updatedAt: string;
}

export type BusinessEntityType = 'merchants' | 'products' | 'orders' | 'activities' | 'coupons';

export type RoleCode = 'super-admin' | 'operator' | 'analyst' | 'merchant';

export interface LoginBody {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

export interface RegisterBody {
  username: string;
  name: string;
  password: string;
  role: Exclude<RoleCode, 'super-admin'>;
  captchaId: string;
  captchaCode: string;
}

export interface CaptchaResult {
  captchaId: string;
  svg: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  role: RoleCode;
  type: 'access' | 'refresh';
}

export interface CurrentUser {
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
}

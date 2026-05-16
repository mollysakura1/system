import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { createDefaultAvatar } from '../mock/data.js';
import { createUser, getCredential, getUserById, getUserByUsername } from '../database/db.js';
import { ok } from '../utils/response.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { clearAuthCookies, getCookieValue, REFRESH_TOKEN_COOKIE, setAuthCookies } from '../utils/auth-cookie.js';
import type { CaptchaResult, LoginBody, RegisterBody, RoleCode } from '../types/auth.js';

const router = Router();
const CAPTCHA_EXPIRES_IN = 5 * 60 * 1000;
const captchaStore = new Map<string, { code: string; expiresAt: number }>();

function cleanupCaptchaStore() {
  const now = Date.now();
  for (const [id, item] of captchaStore.entries()) {
    if (item.expiresAt <= now) {
      captchaStore.delete(id);
    }
  }
}

function createCaptchaCode(length = 4) {
  const source = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => source[Math.floor(Math.random() * source.length)]).join('');
}

function createCaptchaSvg(code: string) {
  const width = 132;
  const height = 44;
  const chars = code
    .split('')
    .map((char, index) => {
      const x = 18 + index * 26;
      const y = 28 + (index % 2 === 0 ? -2 : 4);
      const rotate = (Math.random() * 24 - 12).toFixed(2);
      const color = ['#0f766e', '#0891b2', '#2563eb', '#334155'][index % 4];
      return `<text x="${x}" y="${y}" font-size="24" font-weight="700" fill="${color}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
    })
    .join('');

  const lines = Array.from({ length: 4 }, (_, index) => {
    const y1 = 8 + index * 9;
    const y2 = 10 + ((index + 1) % 4) * 9;
    const color = ['#94a3b8', '#67e8f9', '#86efac', '#cbd5e1'][index];
    return `<line x1="8" y1="${y1}" x2="124" y2="${y2}" stroke="${color}" stroke-width="1.2" opacity="0.55" />`;
  }).join('');

  const dots = Array.from({ length: 18 }, () => {
    const cx = Math.floor(Math.random() * 120) + 6;
    const cy = Math.floor(Math.random() * 32) + 6;
    const r = Math.random() * 1.6 + 0.5;
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="#94a3b8" opacity="0.7" />`;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="12" fill="#f8fafc" />
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="11" fill="none" stroke="#cbd5e1" />
      ${lines}
      ${dots}
      ${chars}
    </svg>
  `.trim();
}

function buildCaptcha(): CaptchaResult {
  cleanupCaptchaStore();
  const captchaId = randomUUID();
  const code = createCaptchaCode();
  captchaStore.set(captchaId, {
    code,
    expiresAt: Date.now() + CAPTCHA_EXPIRES_IN
  });

  return {
    captchaId,
    svg: createCaptchaSvg(code),
    expiresIn: CAPTCHA_EXPIRES_IN
  };
}

router.get('/captcha', (_, res) => {
  res.json(ok(buildCaptcha()));
});

router.post('/register', (req, res) => {
  cleanupCaptchaStore();
  const { username, name, password, role, captchaId, captchaCode } = req.body as RegisterBody;
  const normalizedUsername = String(username ?? '').trim();
  const normalizedName = String(name ?? '').trim();
  const normalizedPassword = String(password ?? '').trim();
  const normalizedRole = role as RoleCode;
  const captcha = captchaStore.get(captchaId);

  if (!normalizedUsername || !normalizedName || !normalizedPassword || !normalizedRole) {
    res.status(400).json({ code: 400, message: 'Missing required registration fields', data: null });
    return;
  }

  if (!captchaId || !captchaCode || !captcha || captcha.expiresAt <= Date.now()) {
    if (captchaId) captchaStore.delete(captchaId);
    res.status(400).json({ code: 400, message: 'Captcha has expired, please refresh and try again', data: null });
    return;
  }

  if (captcha.code.toLowerCase() !== String(captchaCode).trim().toLowerCase()) {
    captchaStore.delete(captchaId);
    res.status(400).json({ code: 400, message: 'Incorrect captcha code', data: null });
    return;
  }

  captchaStore.delete(captchaId);

  if (normalizedRole === 'super-admin') {
    res.status(400).json({ code: 400, message: 'Registration does not support super-admin', data: null });
    return;
  }

  if (getCredential(normalizedUsername) || getUserByUsername(normalizedUsername)) {
    res.status(400).json({ code: 400, message: 'Username already exists', data: null });
    return;
  }

  const userId = `u${Date.now()}`;
  createUser({
    id: userId,
    username: normalizedUsername,
    name: normalizedName,
    role: normalizedRole,
    avatar: createDefaultAvatar(normalizedUsername),
    email: `${normalizedUsername}@example.com`,
    phone: '',
    address: '',
    department: normalizedRole === 'merchant' ? 'Merchant Ops' : 'Growth'
  }, normalizedPassword);

  res.json(ok({ userId }));
});

router.post('/login', (req, res) => {
  cleanupCaptchaStore();
  const { username, password, captchaId, captchaCode } = req.body as LoginBody;
  const credential = getCredential(username);
  const captcha = captchaStore.get(captchaId);

  if (!captchaId || !captchaCode || !captcha || captcha.expiresAt <= Date.now()) {
    if (captchaId) captchaStore.delete(captchaId);
    res.status(400).json({ code: 400, message: 'Captcha has expired, please refresh and try again', data: null });
    return;
  }

  if (captcha.code.toLowerCase() !== String(captchaCode).trim().toLowerCase()) {
    captchaStore.delete(captchaId);
    res.status(400).json({ code: 400, message: 'Incorrect captcha code', data: null });
    return;
  }

  captchaStore.delete(captchaId);

  if (!credential || credential.password !== password) {
    res.status(400).json({ code: 400, message: 'Incorrect username or password', data: null });
    return;
  }

  const user = getUserById(credential.userId)!;
  const tokens = {
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
    refreshToken: signRefreshToken({ userId: user.id, role: user.role })
  };

  setAuthCookies(req, res, tokens);
  res.json(ok({
    role: user.role
  }));
});

router.post('/refresh', (req, res) => {
  const refreshToken = getCookieValue(req, REFRESH_TOKEN_COOKIE);

  if (!refreshToken) {
    clearAuthCookies(req, res);
    res.status(401).json({ code: 401, message: 'Missing refresh token', data: null });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokens = {
      accessToken: signAccessToken({ userId: payload.userId, role: payload.role }),
      refreshToken: signRefreshToken({ userId: payload.userId, role: payload.role })
    };

    setAuthCookies(req, res, tokens);
    res.json(ok({ role: payload.role }));
  } catch {
    clearAuthCookies(req, res);
    res.status(401).json({ code: 401, message: 'Refresh token has expired', data: null });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookies(req, res);
  res.json(ok(null));
});

export default router;

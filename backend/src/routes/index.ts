import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import authRoutes from './auth.js';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.js';
import { ok } from '../utils/response.js';
import { activities, aiPrompts, channels, coupons, getUserById, logs, merchants, orders, products, roles, siteMessages, users, credentialMap } from '../mock/data.js';
import { getMenusByRole, getPermissionCodes } from '../services/menu.service.js';
import { getCharts, getOverview } from '../services/dashboard.service.js';
import { buildAiAnalysis } from '../services/ai.service.js';
import type { RoleCode } from '../types/auth.js';

const router = Router();

function buildUserList() {
  return users.map((item) => ({
    id: item.id,
    username: item.username,
    name: item.name,
    role: item.role,
    status: 'Enabled',
    createdAt: '2026-03-26',
    avatar: item.avatar,
    phone: item.phone,
    email: item.email,
    address: item.address
  }));
}

function notifyUser(userId: string, title: string, content: string, type: 'permission-request' | 'permission-updated' | 'system') {
  siteMessages.unshift({
    id: randomUUID(),
    userId,
    title,
    content,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
}

router.use('/auth', authRoutes);

router.get('/user/profile', authMiddleware, (req: AuthRequest, res) => {
  const menuList = getMenusByRole(req.user!.role);
  res.json(ok({
    ...req.user,
    permissions: getPermissionCodes(menuList)
  }));
});

router.patch('/user/profile', authMiddleware, (req: AuthRequest, res) => {
  const currentUser = getUserById(req.user!.id);
  if (!currentUser) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }

  const { avatar, name, phone, email, address, password } = req.body as Record<string, string | undefined>;
  if (typeof avatar === 'string') currentUser.avatar = avatar;
  if (typeof name === 'string' && name.trim()) currentUser.name = name.trim();
  if (typeof phone === 'string') currentUser.phone = phone.trim();
  if (typeof email === 'string') currentUser.email = email.trim();
  if (typeof address === 'string') currentUser.address = address.trim();
  if (typeof password === 'string' && password.trim()) {
    credentialMap[currentUser.username].password = password.trim();
  }

  res.json(ok(currentUser));
});

router.get('/messages', authMiddleware, (req: AuthRequest, res) => {
  const list = siteMessages
    .filter((item) => item.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(ok({ list, total: list.length, unread: list.filter((item) => !item.read).length }));
});

router.post('/messages/:id/read', authMiddleware, (req: AuthRequest, res) => {
  const message = siteMessages.find((item) => item.id === req.params.id && item.userId === req.user!.id);
  if (!message) {
    res.status(404).json({ code: 404, message: 'Message not found', data: null });
    return;
  }
  message.read = true;
  res.json(ok(message));
});

router.post('/messages/permission-request', authMiddleware, (req: AuthRequest, res) => {
  const targetRole = String(req.body?.targetRole ?? '').trim() as RoleCode;
  if (!targetRole || targetRole === req.user!.role) {
    res.status(400).json({ code: 400, message: 'Please choose a different role to request', data: null });
    return;
  }

  users
    .filter((item) => item.role === 'super-admin')
    .forEach((admin) => {
      notifyUser(
        admin.id,
        '权限变更申请',
        `${req.user!.name}（${req.user!.username}）申请将权限角色调整为 ${targetRole}，请及时处理。`,
        'permission-request'
      );
    });

  res.json(ok({ success: true }));
});

router.get('/menus', authMiddleware, (req: AuthRequest, res) => {
  res.json(ok(getMenusByRole(req.user!.role)));
});

router.get('/users', authMiddleware, (_, res) => {
  const list = buildUserList();
  res.json(ok({ list, total: list.length }));
});

router.post('/users', authMiddleware, (req: AuthRequest, res) => {
  if (req.user!.role !== 'super-admin') {
    res.status(403).json({ code: 403, message: 'Forbidden', data: null });
    return;
  }

  const payload = req.body as Record<string, string>;
  const username = String(payload.username ?? '').trim();
  const name = String(payload.name ?? '').trim();
  const role = String(payload.role ?? 'merchant').trim() as RoleCode;

  if (!username || !name) {
    res.status(400).json({ code: 400, message: 'Username and name are required', data: null });
    return;
  }

  if (credentialMap[username]) {
    res.status(400).json({ code: 400, message: 'Username already exists', data: null });
    return;
  }

  const userId = `u${Date.now()}`;
  users.unshift({
    id: userId,
    username,
    name,
    role,
    avatar: payload.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(username)}`,
    email: payload.email || `${username}@example.com`,
    phone: payload.phone || '',
    address: payload.address || '',
    department: role === 'merchant' ? 'Merchant Ops' : 'Growth'
  });
  credentialMap[username] = {
    userId,
    role,
    password: payload.password || '123456'
  };

  res.json(ok({ id: userId }));
});

router.patch('/users/:id', authMiddleware, (req: AuthRequest, res) => {
  if (req.user!.role !== 'super-admin') {
    res.status(403).json({ code: 403, message: 'Forbidden', data: null });
    return;
  }

  const user = getUserById(String(req.params.id));
  if (!user) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }

  const previousRole = user.role;
  const payload = req.body as Record<string, string>;
  if (typeof payload.username === 'string' && payload.username.trim() && payload.username !== user.username) {
    if (credentialMap[payload.username.trim()]) {
      res.status(400).json({ code: 400, message: 'Username already exists', data: null });
      return;
    }
    credentialMap[payload.username.trim()] = credentialMap[user.username];
    delete credentialMap[user.username];
    credentialMap[payload.username.trim()].userId = user.id;
    user.username = payload.username.trim();
  }
  if (typeof payload.name === 'string' && payload.name.trim()) user.name = payload.name.trim();
  if (typeof payload.role === 'string' && payload.role.trim()) {
    user.role = payload.role.trim() as RoleCode;
    credentialMap[user.username].role = user.role;
  }
  if (typeof payload.phone === 'string') user.phone = payload.phone.trim();
  if (typeof payload.email === 'string') user.email = payload.email.trim();
  if (typeof payload.address === 'string') user.address = payload.address.trim();
  if (typeof payload.avatar === 'string' && payload.avatar.trim()) user.avatar = payload.avatar.trim();
  if (typeof payload.password === 'string' && payload.password.trim()) credentialMap[user.username].password = payload.password.trim();

  if (previousRole !== user.role) {
    notifyUser(user.id, '权限已变更', `你的权限角色已由 ${previousRole} 调整为 ${user.role}。`, 'permission-updated');
  }

  res.json(ok(user));
});

router.delete('/users/:id', authMiddleware, (req: AuthRequest, res) => {
  if (req.user!.role !== 'super-admin') {
    res.status(403).json({ code: 403, message: 'Forbidden', data: null });
    return;
  }

  const index = users.findIndex((item) => item.id === String(req.params.id));
  if (index < 0) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }

  const [removed] = users.splice(index, 1);
  delete credentialMap[removed.username];
  res.json(ok({ id: removed.id }));
});

router.get('/roles', authMiddleware, (_, res) => res.json(ok(roles)));
router.get('/dashboard/overview', authMiddleware, (req: AuthRequest, res) => res.json(ok(getOverview(req.user!.role))));
router.get('/dashboard/charts', authMiddleware, (req, res) => res.json(ok(getCharts(Number(req.query.days ?? 7)))));
router.get('/orders', authMiddleware, (_, res) => res.json(ok({ list: orders, total: orders.length })));
router.get('/merchants', authMiddleware, (_, res) => res.json(ok({ list: merchants, total: merchants.length })));
router.get('/products', authMiddleware, (_, res) => res.json(ok({ list: products, total: products.length })));
router.get('/activities', authMiddleware, (_, res) => res.json(ok({ list: activities, total: activities.length })));
router.get('/coupons', authMiddleware, (_, res) => res.json(ok({ list: coupons, total: coupons.length })));
router.get('/channels', authMiddleware, (_, res) => res.json(ok({ list: channels, total: channels.length })));
router.get('/logs', authMiddleware, (_, res) => res.json(ok({ list: logs, total: logs.length })));
router.get('/ai/prompts', authMiddleware, (_, res) => res.json(ok(aiPrompts)));

router.get('/ai/stream', authMiddleware, (req, res) => {
  const prompt = String(req.query.prompt ?? 'Please analyze the latest business metrics');
  const chunks = buildAiAnalysis(prompt);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let index = 0;
  const timer = setInterval(() => {
    if (index < chunks.length) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunks[index] })}\n\n`);
      index += 1;
      return;
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    clearInterval(timer);
    res.end();
  }, 650);

  req.on('close', () => {
    clearInterval(timer);
  });
});

export default router;

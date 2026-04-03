import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import authRoutes from './auth.js';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.js';
import { ok } from '../utils/response.js';
import { activities, aiPrompts, channels, coupons, credentialMap, getUserById, logs, merchants, orders, products, roles, siteMessages, users } from '../mock/data.js';
import { getCharts, getOverview } from '../services/dashboard.service.js';
import { getMenusByRole, getPermissionCodes } from '../services/menu.service.js';
import { streamAiAnalysis, toReadableAiError } from '../services/ai.service.js';
import type { RoleCode } from '../types/auth.js';

const router = Router();

function buildAiBusinessContext(role: string, days = 30) {
  const overview = getOverview(role);
  const charts = getCharts(days);

  return [
    '以下是当前经营数据，请严格基于这些数据进行分析：',
    '',
    '【经营总览】',
    JSON.stringify(overview, null, 2),
    '',
    `【近 ${days} 天图表数据】`,
    JSON.stringify(charts, null, 2)
  ].join('\n');
}

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

type AiFilterOptions = {
  days: number;
  merchant: string;
  channel: string;
};

function buildStructuredAiBusinessContext(role: string, filters: AiFilterOptions) {
  const { days, merchant, channel } = filters;
  const overview = getOverview(role);
  const charts = getCharts(days);
  const merchantOptions = merchants.map((item) => item.name);
  const channelOptions = channels.map((item) => item.name);
  const selectedMerchant = merchant && merchant !== 'all' ? merchant : '全部商家';
  const selectedChannel = channel && channel !== 'all' ? channel : '全部渠道';
  const filteredOrders = orders.filter((item) => {
    const matchMerchant = selectedMerchant === '全部商家' || item.merchantName === selectedMerchant;
    const matchChannel = selectedChannel === '全部渠道' || item.channel === selectedChannel;
    return matchMerchant && matchChannel;
  });
  const filteredMerchants = merchants.filter((item) => {
    const matchMerchant = selectedMerchant === '全部商家' || item.name === selectedMerchant;
    const matchChannel = selectedChannel === '全部渠道' || item.channel === selectedChannel;
    return matchMerchant && matchChannel;
  });

  return [
    '以下是当前经营数据，请严格基于这些数据进行分析：',
    '',
    '【当前筛选条件】',
    JSON.stringify(
      {
        days,
        merchant: selectedMerchant,
        channel: selectedChannel,
        availableMerchants: merchantOptions,
        availableChannels: channelOptions
      },
      null,
      2
    ),
    '',
    '【筛选后的业务摘要】',
    JSON.stringify(
      {
        merchantCount: filteredMerchants.length,
        orderCount: filteredOrders.length,
        totalAmount: filteredOrders.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
        paidOrders: filteredOrders.filter((item) => item.status === '已支付' || item.status === '已完成').length,
        refundOrders: filteredOrders.filter((item) => item.status === '已退款').length,
        merchantNames: filteredMerchants.map((item) => item.name),
        channelNames: Array.from(new Set(filteredOrders.map((item) => item.channel)))
      },
      null,
      2
    ),
    '',
    '【经营总览】',
    JSON.stringify(overview, null, 2),
    '',
    `【近 ${days} 天图表数据】`,
    JSON.stringify(charts, null, 2)
  ].join('\n');
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

router.get('/ai/stream', authMiddleware, async (req: AuthRequest, res) => {
  const prompt = String(req.query.prompt ?? '请基于最近的经营数据给出运营分析').trim();
  const days = Number(req.query.days ?? 30);
  const merchant = String(req.query.merchant ?? 'all').trim();
  const channel = String(req.query.channel ?? 'all').trim();
  const includeContext = String(req.query.includeContext ?? '1') !== '0';
  const businessContext = includeContext
    ? buildStructuredAiBusinessContext(req.user!.role, {
        days: Number.isFinite(days) && days > 0 ? days : 30,
        merchant,
        channel
      })
    : undefined;
  const controller = new AbortController();
  let closed = false;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const writeEvent = (payload: { type: 'chunk' | 'done'; content?: string }) => {
    if (closed || res.writableEnded) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  req.on('close', () => {
    closed = true;
    controller.abort();
  });

  try {
    for await (const chunk of streamAiAnalysis({
      prompt,
      businessContext,
      signal: controller.signal
    })) {
      if (closed) break;
      writeEvent({ type: 'chunk', content: chunk });
    }
  } catch (error) {
    if (!closed) {
      writeEvent({ type: 'chunk', content: toReadableAiError(error) });
    }
  } finally {
    if (!closed) {
      writeEvent({ type: 'done' });
      res.end();
    }
  }
});

export default router;

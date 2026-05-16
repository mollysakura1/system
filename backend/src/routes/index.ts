import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import authRoutes from './auth.js';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.js';
import {
  createMessage,
  createAiChatSession,
  createResource,
  createUser,
  deleteAiChatSession,
  deleteResource,
  deleteUser,
  getAiChatSession,
  getCredential,
  getMessage,
  getResource,
  getUserById,
  getUserByUsername,
  listAiPrompts,
  listAiChatSessions,
  listMessages,
  listResource,
  listUsers,
  markMessageRead,
  updateResource,
  updateUser,
  updateAiChatSession,
  upsertAiChatMessage,
  type AiChatMessage,
  type ResourceRow,
  type ResourceType
} from '../database/db.js';
import { createDefaultAvatar } from '../mock/data.js';
import { ok } from '../utils/response.js';
import { getCharts, getOverview } from '../services/dashboard.service.js';
import { getMenusByRole, getPermissionCodes } from '../services/menu.service.js';
import { streamAiAnalysis, summarizeAiConversationMemory, toReadableAiError } from '../services/ai.service.js';
import { formatAiToolContext, runBusinessAiTools } from '../services/ai-tools.service.js';
import type { RoleCode } from '../types/auth.js';

const router = Router();
const businessResources: ResourceType[] = ['merchants', 'products', 'orders', 'activities', 'coupons', 'channels'];

type AiFilterOptions = {
  days: number;
  merchant: string;
  channel: string;
};

type AiConversationMessagePayload = {
  role: 'user' | 'assistant';
  content: string;
};

const DEFAULT_MAX_CONTEXT_TURNS = 5;
const DEFAULT_MAX_MESSAGE_CHARS = 600;
const DEFAULT_MAX_CONTEXT_CHARS = 2400;
const BUSINESS_MAX_CONTEXT_TURNS = 3;
const BUSINESS_MAX_CONTEXT_CHARS = 1600;

function toUserRecord(user: NonNullable<ReturnType<typeof getUserById>>) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    status: 'Enabled',
    createdAt: '2026-03-26',
    avatar: user.avatar,
    phone: user.phone,
    email: user.email,
    address: user.address
  };
}

function assertSuperAdmin(req: AuthRequest, res: Response) {
  if (req.user!.role === 'super-admin') return true;
  res.status(403).json({ code: 403, message: 'Forbidden', data: null });
  return false;
}

function notifyUser(userId: string, title: string, content: string, type: 'permission-request' | 'permission-updated' | 'system') {
  createMessage({
    id: randomUUID(),
    userId,
    title,
    content,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
}

function normalizeResourcePayload(payload: unknown): ResourceRow {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  return payload as ResourceRow;
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : String(value ?? '');
}

function buildStructuredAiBusinessContext(role: string, filters: AiFilterOptions) {
  const { days, merchant, channel } = filters;
  const overview = getOverview(role);
  const charts = getCharts(days);
  const merchants = listResource('merchants');
  const channels = listResource('channels');
  const orders = listResource('orders');
  const merchantOptions = merchants.map((item) => String(item.name ?? ''));
  const channelOptions = channels.map((item) => String(item.name ?? ''));
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
    JSON.stringify({ days, merchant: selectedMerchant, channel: selectedChannel, availableMerchants: merchantOptions, availableChannels: channelOptions }, null, 2),
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

function normalizeAiConversationMessages(
  value: unknown,
  options: {
    maxTurns?: number;
    maxMessageChars?: number;
    maxContextChars?: number;
  } = {}
): AiConversationMessagePayload[] {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_CONTEXT_TURNS;
  const maxMessageChars = options.maxMessageChars ?? DEFAULT_MAX_MESSAGE_CHARS;
  const maxContextChars = options.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;
  if (!Array.isArray(value)) return [];

  const validMessages = value
    .filter(
      (item): item is AiConversationMessagePayload =>
        typeof item === 'object' &&
        item !== null &&
        (item as { role?: unknown }).role !== undefined &&
        (item as { content?: unknown }).content !== undefined
    )
    .map((item) => ({
      role: (item.role === 'assistant' ? 'assistant' : 'user') as AiConversationMessagePayload['role'],
      content: String(item.content ?? '').trim()
    }))
    .filter((item) => Boolean(item.content));

  const normalized: AiConversationMessagePayload[] = [];

  for (const message of validMessages) {
    const lastMessage = normalized.at(-1);
    if (!lastMessage) {
      if (message.role === 'assistant') continue;
      normalized.push(message);
      continue;
    }
    if (lastMessage.role === message.role) {
      normalized[normalized.length - 1] = message;
      continue;
    }
    normalized.push(message);
  }

  if (normalized.at(-1)?.role === 'user') normalized.pop();

  const recentMessages = normalized.slice(-(maxTurns * 2)).map((message) => ({
    ...message,
    content: message.content.slice(-maxMessageChars)
  }));

  const boundedMessages: AiConversationMessagePayload[] = [];
  let totalChars = 0;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const message = recentMessages[index];
    if (totalChars + message.content.length > maxContextChars && boundedMessages.length) break;
    boundedMessages.unshift(message);
    totalChars += message.content.length;
  }

  return boundedMessages;
}

function parseConversationMessages(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

function parseBooleanFlag(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function handleAiStream(req: AuthRequest, res: Response) {
  const source = req.method === 'POST' ? req.body : req.query;
  const prompt = String(source?.prompt ?? '请基于最近的经营数据给出运营分析').trim();
  const days = Number(source?.days ?? 30);
  const merchant = String(source?.merchant ?? 'all').trim();
  const channel = String(source?.channel ?? 'all').trim();
  const sessionId = String(source?.sessionId ?? '').trim();
  const includeContext = parseBooleanFlag(source?.includeContext, true);
  const historyMessages = normalizeAiConversationMessages(parseConversationMessages(source?.messages), {
    maxTurns: includeContext ? BUSINESS_MAX_CONTEXT_TURNS : DEFAULT_MAX_CONTEXT_TURNS,
    maxContextChars: includeContext ? BUSINESS_MAX_CONTEXT_CHARS : DEFAULT_MAX_CONTEXT_CHARS
  });
  const boundedDays = Number.isFinite(days) && days > 0 ? days : 30;
  const toolResults = includeContext ? runBusinessAiTools(req.user!, prompt, { days: boundedDays }) : [];
  const structuredContext = includeContext
    ? buildStructuredAiBusinessContext(req.user!.role, {
        days: boundedDays,
        merchant,
        channel
      })
    : '';
  const businessContext = includeContext
    ? [formatAiToolContext(toolResults), structuredContext].filter(Boolean).join('\n\n')
    : undefined;
  const memorySummary = sessionId ? (getAiChatSession(req.user!.id, sessionId)?.summary ?? '') : '';
  const controller = new AbortController();
  let closed = false;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const writeEvent = (payload: { type: 'chunk' | 'done' | 'tools'; content?: string; tools?: unknown }) => {
    if (closed || res.writableEnded) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const abortStream = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  req.on('aborted', abortStream);
  res.on('close', abortStream);

  try {
    if (toolResults.length) {
      writeEvent({ type: 'tools', tools: toolResults.map((item) => ({ name: item.name, reason: item.reason })) });
    }

    for await (const chunk of streamAiAnalysis({ prompt, businessContext, memorySummary, historyMessages, signal: controller.signal })) {
      if (closed) break;
      writeEvent({ type: 'chunk', content: chunk });
    }
  } catch (error) {
    if (!closed) writeEvent({ type: 'chunk', content: toReadableAiError(error) });
  } finally {
    if (!closed) {
      writeEvent({ type: 'done' });
      res.end();
    }
  }
}

router.use('/auth', authRoutes);

router.get('/user/profile', authMiddleware, (req: AuthRequest, res) => {
  const menuList = getMenusByRole(req.user!.role);
  res.json(ok({ ...req.user, permissions: getPermissionCodes(menuList) }));
});

router.patch('/user/profile', authMiddleware, (req: AuthRequest, res) => {
  const { avatar, name, phone, email, address, password } = req.body as Record<string, string | undefined>;
  const updated = updateUser(req.user!.id, {
    avatar: typeof avatar === 'string' && avatar.trim() ? avatar.trim() : req.user!.avatar,
    name: typeof name === 'string' && name.trim() ? name.trim() : req.user!.name,
    phone: typeof phone === 'string' ? phone.trim() : req.user!.phone,
    email: typeof email === 'string' ? email.trim() : req.user!.email,
    address: typeof address === 'string' ? address.trim() : req.user!.address,
    password: typeof password === 'string' && password.trim() ? password.trim() : undefined
  });

  if (!updated) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }

  res.json(ok(updated));
});

router.get('/messages', authMiddleware, (req: AuthRequest, res) => {
  const list = listMessages(req.user!.id);
  res.json(ok({ list, total: list.length, unread: list.filter((item) => !item.read).length }));
});

router.get('/messages/:id', authMiddleware, (req: AuthRequest, res) => {
  const message = getMessage(paramValue(req.params.id), req.user!.id);
  if (!message) {
    res.status(404).json({ code: 404, message: 'Message not found', data: null });
    return;
  }
  res.json(ok(message));
});

router.patch('/messages/:id', authMiddleware, (req: AuthRequest, res) => {
  const payload = req.body as { read?: boolean };
  const message =
    payload.read === true
      ? markMessageRead(paramValue(req.params.id), req.user!.id)
      : getMessage(paramValue(req.params.id), req.user!.id);
  if (!message) {
    res.status(404).json({ code: 404, message: 'Message not found', data: null });
    return;
  }
  res.json(ok(message));
});

router.post('/permission-requests', authMiddleware, (req: AuthRequest, res) => {
  const targetRole = String(req.body?.targetRole ?? '').trim() as RoleCode;
  if (!targetRole || targetRole === req.user!.role) {
    res.status(400).json({ code: 400, message: 'Please choose a different role to request', data: null });
    return;
  }

  listUsers()
    .filter((item) => item.role === 'super-admin')
    .forEach((admin) => {
      notifyUser(
        admin.id,
        '权限变更申请',
        `${req.user!.name}（${req.user!.username}）申请将权限角色调整为 ${targetRole}，请及时处理。`,
        'permission-request'
      );
    });

  res.status(201).json(ok({ success: true }));
});

router.get('/menus', authMiddleware, (req: AuthRequest, res) => {
  res.json(ok(getMenusByRole(req.user!.role)));
});

router.get('/users', authMiddleware, (_, res) => {
  const list = listUsers().map(toUserRecord);
  res.json(ok({ list, total: list.length }));
});

router.post('/users', authMiddleware, (req: AuthRequest, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const payload = req.body as Record<string, string>;
  const username = String(payload.username ?? '').trim();
  const name = String(payload.name ?? '').trim();
  const role = String(payload.role ?? 'merchant').trim() as RoleCode;

  if (!username || !name) {
    res.status(400).json({ code: 400, message: 'Username and name are required', data: null });
    return;
  }

  if (getCredential(username) || getUserByUsername(username)) {
    res.status(400).json({ code: 400, message: 'Username already exists', data: null });
    return;
  }

  const userId = `u${Date.now()}`;
  createUser(
    {
      id: userId,
      username,
      name,
      role,
      avatar: payload.avatar || createDefaultAvatar(username),
      email: payload.email || `${username}@example.com`,
      phone: payload.phone || '',
      address: payload.address || '',
      department: role === 'merchant' ? 'Merchant Ops' : 'Growth'
    },
    payload.password || '123456'
  );

  res.status(201).json(ok({ id: userId }));
});

router.get('/users/:id', authMiddleware, (req, res) => {
  const user = getUserById(paramValue(req.params.id));
  if (!user) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }
  res.json(ok(toUserRecord(user)));
});

router.patch('/users/:id', authMiddleware, (req: AuthRequest, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const current = getUserById(paramValue(req.params.id));
  if (!current) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }

  const payload = req.body as Record<string, string>;
  const nextUsername = typeof payload.username === 'string' && payload.username.trim() ? payload.username.trim() : current.username;
  if (nextUsername !== current.username && (getCredential(nextUsername) || getUserByUsername(nextUsername))) {
    res.status(400).json({ code: 400, message: 'Username already exists', data: null });
    return;
  }

  const updated = updateUser(current.id, {
    username: nextUsername,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : current.name,
    role: typeof payload.role === 'string' && payload.role.trim() ? (payload.role.trim() as RoleCode) : current.role,
    phone: typeof payload.phone === 'string' ? payload.phone.trim() : current.phone,
    email: typeof payload.email === 'string' ? payload.email.trim() : current.email,
    address: typeof payload.address === 'string' ? payload.address.trim() : current.address,
    avatar: typeof payload.avatar === 'string' && payload.avatar.trim() ? payload.avatar.trim() : current.avatar,
    password: typeof payload.password === 'string' && payload.password.trim() ? payload.password.trim() : undefined
  });

  if (updated && current.role !== updated.role) {
    notifyUser(updated.id, '权限已变更', `你的权限角色已由 ${current.role} 调整为 ${updated.role}。`, 'permission-updated');
  }

  res.json(ok(updated));
});

router.delete('/users/:id', authMiddleware, (req: AuthRequest, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const removed = deleteUser(paramValue(req.params.id));
  if (!removed) {
    res.status(404).json({ code: 404, message: 'User not found', data: null });
    return;
  }
  res.json(ok({ id: removed.id }));
});

router.get('/roles', authMiddleware, (_, res) => {
  const list = listResource('roles');
  res.json(ok(list));
});
router.post('/roles', authMiddleware, (req: AuthRequest, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const created = createResource('roles', normalizeResourcePayload(req.body));
  res.status(201).json(ok(created));
});
router.get('/roles/:id', authMiddleware, (req, res) => {
  const role = getResource('roles', paramValue(req.params.id));
  if (!role) {
    res.status(404).json({ code: 404, message: 'Role not found', data: null });
    return;
  }
  res.json(ok(role));
});
router.patch('/roles/:id', authMiddleware, (req: AuthRequest, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const updated = updateResource('roles', paramValue(req.params.id), normalizeResourcePayload(req.body));
  if (!updated) {
    res.status(404).json({ code: 404, message: 'Role not found', data: null });
    return;
  }
  res.json(ok(updated));
});
router.delete('/roles/:id', authMiddleware, (req: AuthRequest, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const removed = deleteResource('roles', paramValue(req.params.id));
  if (!removed) {
    res.status(404).json({ code: 404, message: 'Role not found', data: null });
    return;
  }
  res.json(ok({ id: removed.id }));
});
router.get('/dashboard/overview', authMiddleware, (req: AuthRequest, res) => res.json(ok(getOverview(req.user!.role))));
router.get('/dashboard/charts', authMiddleware, (req, res) => res.json(ok(getCharts(Number(req.query.days ?? 7)))));
router.get('/logs', authMiddleware, (_, res) => {
  const list = listResource('logs');
  res.json(ok({ list, total: list.length }));
});
router.get('/ai/prompts', authMiddleware, (_, res) => res.json(ok(listAiPrompts())));

router.get('/ai/sessions', authMiddleware, (req: AuthRequest, res) => {
  const list = listAiChatSessions(req.user!.id);
  res.json(ok({ list, total: list.length }));
});

router.post('/ai/sessions', authMiddleware, (req: AuthRequest, res) => {
  const payload = req.body as { id?: string; title?: string; updatedAt?: string };
  const id = String(payload.id || randomUUID());
  const session = createAiChatSession(req.user!.id, {
    id,
    title: String(payload.title ?? ''),
    updatedAt: String(payload.updatedAt ?? new Date().toISOString())
  });
  res.status(201).json(ok(session));
});

router.get('/ai/sessions/:id', authMiddleware, (req: AuthRequest, res) => {
  const session = getAiChatSession(req.user!.id, paramValue(req.params.id));
  if (!session) {
    res.status(404).json({ code: 404, message: 'Chat session not found', data: null });
    return;
  }
  res.json(ok(session));
});

router.patch('/ai/sessions/:id', authMiddleware, (req: AuthRequest, res) => {
  const payload = req.body as { title?: string; updatedAt?: string };
  const session = updateAiChatSession(req.user!.id, paramValue(req.params.id), {
    title: typeof payload.title === 'string' ? payload.title : undefined,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined
  });
  if (!session) {
    res.status(404).json({ code: 404, message: 'Chat session not found', data: null });
    return;
  }
  res.json(ok(session));
});

router.delete('/ai/sessions/:id', authMiddleware, (req: AuthRequest, res) => {
  const removed = deleteAiChatSession(req.user!.id, paramValue(req.params.id));
  if (!removed) {
    res.status(404).json({ code: 404, message: 'Chat session not found', data: null });
    return;
  }
  res.json(ok({ id: removed.id }));
});

router.post('/ai/sessions/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
  const payload = req.body as Partial<AiChatMessage>;
  const sessionId = paramValue(req.params.id);
  const message = upsertAiChatMessage(req.user!.id, {
    id: String(payload.id || randomUUID()),
    sessionId,
    role: payload.role === 'assistant' ? 'assistant' : 'user',
    content: String(payload.content ?? ''),
    prompt: typeof payload.prompt === 'string' ? payload.prompt : undefined,
    renderMode: payload.renderMode === 'streaming' ? 'streaming' : 'final',
    createdAt: String(payload.createdAt ?? new Date().toISOString())
  });
  if (!message) {
    res.status(404).json({ code: 404, message: 'Chat session not found', data: null });
    return;
  }

  if (payload.role === 'assistant' && String(payload.content ?? '').trim()) {
    const latestSession = getAiChatSession(req.user!.id, sessionId);
    const latestUserMessage = [...(latestSession?.messages ?? [])].reverse().find((item) => item.role === 'user');
    const summary = await summarizeAiConversationMemory({
      previousSummary: latestSession?.summary ?? '',
      userMessage: latestUserMessage?.content ?? '',
      assistantMessage: String(payload.content ?? '')
    });
    updateAiChatSession(req.user!.id, sessionId, { summary, updatedAt: new Date().toISOString() });
  }

  const latest = getAiChatSession(req.user!.id, sessionId);
  res.status(201).json(ok(latest ?? message));
});

businessResources.forEach((resource) => {
  router.get(`/${resource}`, authMiddleware, (_, res) => {
    const list = listResource(resource);
    res.json(ok({ list, total: list.length }));
  });

  router.post(`/${resource}`, authMiddleware, (req, res) => {
    const created = createResource(resource, normalizeResourcePayload(req.body));
    res.status(201).json(ok(created));
  });

  router.get(`/${resource}/:id`, authMiddleware, (req, res) => {
    const item = getResource(resource, paramValue(req.params.id));
    if (!item) {
      res.status(404).json({ code: 404, message: 'Resource not found', data: null });
      return;
    }
    res.json(ok(item));
  });

  router.patch(`/${resource}/:id`, authMiddleware, (req, res) => {
    const updated = updateResource(resource, paramValue(req.params.id), normalizeResourcePayload(req.body));
    if (!updated) {
      res.status(404).json({ code: 404, message: 'Resource not found', data: null });
      return;
    }
    res.json(ok(updated));
  });

  router.delete(`/${resource}/:id`, authMiddleware, (req, res) => {
    const removed = deleteResource(resource, paramValue(req.params.id));
    if (!removed) {
      res.status(404).json({ code: 404, message: 'Resource not found', data: null });
      return;
    }
    res.json(ok({ id: removed.id }));
  });
});

router.get('/ai/stream', authMiddleware, handleAiStream);
router.post('/ai/stream', authMiddleware, handleAiStream);

export default router;

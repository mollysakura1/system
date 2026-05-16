import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs, { type Database, type QueryExecResult, type SqlJsStatic } from 'sql.js';
import {
  activities,
  aiPrompts,
  channels,
  coupons,
  credentialMap,
  logs,
  merchants,
  orders,
  products,
  roles,
  siteMessages,
  users
} from '../mock/data.js';
import type { CurrentUser, RoleCode } from '../types/auth.js';

export type ResourceType = 'merchants' | 'products' | 'orders' | 'activities' | 'coupons' | 'channels' | 'logs' | 'roles';
export type ResourceRow = Record<string, string | number | boolean | null>;

type Credential = {
  username: string;
  password: string;
  role: RoleCode;
  userId: string;
};

type SiteMessage = {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'permission-request' | 'permission-updated' | 'system';
  read: boolean;
  createdAt: string;
};

export type AiChatMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  prompt?: string;
  renderMode: 'streaming' | 'final';
  createdAt: string;
};

export type AiChatSession = {
  id: string;
  userId: string;
  title: string;
  summary: string;
  updatedAt: string;
  messages: AiChatMessage[];
};

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const require = createRequire(import.meta.url);
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.resolve(process.cwd(), 'data/app.sqlite');

function getDb() {
  if (!db) {
    throw new Error('Database is not initialized. Call initDatabase() before handling requests.');
  }

  return db;
}

function persist() {
  const database = getDb();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, Buffer.from(database.export()));
}

function exec(sql: string, params: Array<string | number | null> = []) {
  getDb().run(sql, params);
}

function query(sql: string, params: Array<string | number | null> = []) {
  const result = getDb().exec(sql, params)[0];
  if (!result) return [];

  return result.values.map((values) =>
    result.columns.reduce<Record<string, unknown>>((row, column, index) => {
      row[column] = values[index];
      return row;
    }, {})
  );
}

function queryOne(sql: string, params: Array<string | number | null> = []) {
  return query(sql, params)[0] ?? null;
}

function scalar(sql: string, params: Array<string | number | null> = []) {
  const result: QueryExecResult | undefined = getDb().exec(sql, params)[0];
  return result?.values[0]?.[0] ?? null;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function mapUser(row: Record<string, unknown>): CurrentUser {
  return {
    id: asString(row.id),
    username: asString(row.username),
    name: asString(row.name),
    role: asString(row.role) as RoleCode,
    avatar: asString(row.avatar),
    email: asString(row.email),
    phone: asString(row.phone),
    address: asString(row.address),
    department: asString(row.department),
    merchantId: row.merchant_id ? asString(row.merchant_id) : undefined
  };
}

function mapMessage(row: Record<string, unknown>): SiteMessage {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    title: asString(row.title),
    content: asString(row.content),
    type: asString(row.type) as SiteMessage['type'],
    read: Boolean(row.read),
    createdAt: asString(row.created_at)
  };
}

function mapChatMessage(row: Record<string, unknown>): AiChatMessage {
  return {
    id: asString(row.id),
    sessionId: asString(row.session_id),
    role: asString(row.role) === 'assistant' ? 'assistant' : 'user',
    content: asString(row.content),
    prompt: row.prompt ? asString(row.prompt) : undefined,
    renderMode: asString(row.render_mode) === 'streaming' ? 'streaming' : 'final',
    createdAt: asString(row.created_at)
  };
}

function mapChatSession(row: Record<string, unknown>): AiChatSession {
  const id = asString(row.id);
  return {
    id,
    userId: asString(row.user_id),
    title: asString(row.title),
    summary: asString(row.summary),
    updatedAt: asString(row.updated_at),
    messages: listAiChatMessages(id)
  };
}

function parsePayload(row: Record<string, unknown>): ResourceRow {
  const payload = JSON.parse(asString(row.payload)) as ResourceRow;
  return { id: asString(row.id), ...payload };
}

function createTables() {
  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      merchant_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      user_id TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS site_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS resource_items (
      resource_type TEXT NOT NULL,
      id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (resource_type, id)
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS ai_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL UNIQUE
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  ensureColumn('ai_chat_sessions', 'summary', "TEXT NOT NULL DEFAULT ''");

  exec(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      prompt TEXT,
      render_mode TEXT NOT NULL DEFAULT 'final',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const columns = query(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) return;
  exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function insertResource(type: ResourceType, row: ResourceRow) {
  const id = String(row.id);
  exec(
    'INSERT INTO resource_items (resource_type, id, payload) VALUES (?, ?, ?)',
    [type, id, JSON.stringify({ ...row, id })]
  );
}

function seedDatabase() {
  const seeded = scalar("SELECT value FROM app_meta WHERE key = 'seeded'");
  if (seeded) return;

  users.forEach((user) => {
    exec(
      `INSERT INTO users (id, username, name, role, avatar, email, phone, address, department, merchant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.name,
        user.role,
        user.avatar,
        user.email,
        user.phone,
        user.address,
        user.department,
        user.merchantId ?? null
      ]
    );
  });

  Object.entries(credentialMap).forEach(([username, credential]) => {
    exec(
      'INSERT INTO credentials (username, password, role, user_id) VALUES (?, ?, ?, ?)',
      [username, credential.password, credential.role, credential.userId]
    );
  });

  siteMessages.forEach((message) => {
    exec(
      `INSERT INTO site_messages (id, user_id, title, content, type, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [message.id, message.userId, message.title, message.content, message.type, message.read ? 1 : 0, message.createdAt]
    );
  });

  const seedResources: Record<ResourceType, ResourceRow[]> = {
    merchants,
    products,
    orders,
    activities,
    coupons,
    channels,
    logs,
    roles
  };

  Object.entries(seedResources).forEach(([type, rows]) => {
    rows.forEach((row) => insertResource(type as ResourceType, row));
  });

  aiPrompts.forEach((prompt) => {
    exec('INSERT INTO ai_prompts (content) VALUES (?)', [prompt]);
  });

  exec("INSERT INTO app_meta (key, value) VALUES ('seeded', ?)", [new Date().toISOString()]);
  persist();
}

export async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => wasmPath
    });
  }

  const dbBuffer = existsSync(dbPath) ? readFileSync(dbPath) : undefined;
  db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database();
  exec('PRAGMA foreign_keys = ON');
  createTables();
  seedDatabase();
}

export function getDatabasePath() {
  return dbPath;
}

export function listUsers() {
  return query('SELECT * FROM users ORDER BY created_at DESC, id DESC').map(mapUser);
}

export function getUserById(id: string) {
  const row = queryOne('SELECT * FROM users WHERE id = ?', [id]);
  return row ? mapUser(row) : null;
}

export function getUserByUsername(username: string) {
  const row = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  return row ? mapUser(row) : null;
}

export function getCredential(username: string) {
  const row = queryOne('SELECT username, password, role, user_id as userId FROM credentials WHERE username = ?', [username]);
  return row as Credential | null;
}

export function createUser(user: CurrentUser, password: string) {
  exec(
    `INSERT INTO users (id, username, name, role, avatar, email, phone, address, department, merchant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.username,
      user.name,
      user.role,
      user.avatar,
      user.email,
      user.phone,
      user.address,
      user.department,
      user.merchantId ?? null
    ]
  );
  exec('INSERT INTO credentials (username, password, role, user_id) VALUES (?, ?, ?, ?)', [
    user.username,
    password,
    user.role,
    user.id
  ]);
  persist();
}

export function updateUser(id: string, patch: Partial<CurrentUser> & { password?: string }) {
  const current = getUserById(id);
  if (!current) return null;

  const next = { ...current, ...patch };
  exec(
    `UPDATE users
     SET username = ?, name = ?, role = ?, avatar = ?, email = ?, phone = ?, address = ?, department = ?, merchant_id = ?
     WHERE id = ?`,
    [
      next.username,
      next.name,
      next.role,
      next.avatar,
      next.email,
      next.phone,
      next.address,
      next.department,
      next.merchantId ?? null,
      id
    ]
  );

  if (current.username !== next.username) {
    exec('UPDATE credentials SET username = ? WHERE username = ?', [next.username, current.username]);
  }

  exec('UPDATE credentials SET role = ? WHERE username = ?', [next.role, next.username]);
  if (patch.password) {
    exec('UPDATE credentials SET password = ? WHERE username = ?', [patch.password, next.username]);
  }

  persist();
  return getUserById(id);
}

export function deleteUser(id: string) {
  const current = getUserById(id);
  if (!current) return null;

  exec('DELETE FROM credentials WHERE user_id = ?', [id]);
  exec('DELETE FROM site_messages WHERE user_id = ?', [id]);
  exec('DELETE FROM users WHERE id = ?', [id]);
  persist();
  return current;
}

export function createMessage(message: SiteMessage) {
  exec(
    `INSERT INTO site_messages (id, user_id, title, content, type, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [message.id, message.userId, message.title, message.content, message.type, message.read ? 1 : 0, message.createdAt]
  );
  persist();
}

export function listMessages(userId: string) {
  return query('SELECT * FROM site_messages WHERE user_id = ? ORDER BY datetime(created_at) DESC', [userId]).map(mapMessage);
}

export function getMessage(id: string, userId: string) {
  const row = queryOne('SELECT * FROM site_messages WHERE id = ? AND user_id = ?', [id, userId]);
  return row ? mapMessage(row) : null;
}

export function markMessageRead(id: string, userId: string) {
  exec('UPDATE site_messages SET read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
  persist();
  return getMessage(id, userId);
}

export function listResource(type: ResourceType) {
  return query('SELECT id, payload FROM resource_items WHERE resource_type = ? ORDER BY created_at DESC, id DESC', [type]).map(parsePayload);
}

export function getResource(type: ResourceType, id: string) {
  const row = queryOne('SELECT id, payload FROM resource_items WHERE resource_type = ? AND id = ?', [type, id]);
  return row ? parsePayload(row) : null;
}

export function createResource(type: ResourceType, row: ResourceRow) {
  const id = String(row.id || `${type}-${Date.now()}`);
  const next = { ...row, id };
  exec(
    'INSERT INTO resource_items (resource_type, id, payload, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [type, id, JSON.stringify(next)]
  );
  persist();
  return next;
}

export function updateResource(type: ResourceType, id: string, patch: ResourceRow) {
  const current = getResource(type, id);
  if (!current) return null;

  const next = { ...current, ...patch, id };
  exec(
    'UPDATE resource_items SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE resource_type = ? AND id = ?',
    [JSON.stringify(next), type, id]
  );
  persist();
  return next;
}

export function deleteResource(type: ResourceType, id: string) {
  const current = getResource(type, id);
  if (!current) return null;

  exec('DELETE FROM resource_items WHERE resource_type = ? AND id = ?', [type, id]);
  persist();
  return current;
}

export function listAiPrompts() {
  return query('SELECT content FROM ai_prompts ORDER BY id ASC').map((row) => asString(row.content));
}

export function listAiChatMessages(sessionId: string) {
  return query('SELECT * FROM ai_chat_messages WHERE session_id = ? ORDER BY datetime(created_at) ASC', [sessionId]).map(mapChatMessage);
}

export function listAiChatSessions(userId: string) {
  return query('SELECT * FROM ai_chat_sessions WHERE user_id = ? ORDER BY datetime(updated_at) DESC', [userId]).map(mapChatSession);
}

export function getAiChatSession(userId: string, sessionId: string) {
  const row = queryOne('SELECT * FROM ai_chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
  return row ? mapChatSession(row) : null;
}

export function createAiChatSession(userId: string, session: Pick<AiChatSession, 'id' | 'title' | 'updatedAt'> & { summary?: string }) {
  const now = session.updatedAt || new Date().toISOString();
  exec(
    `INSERT OR IGNORE INTO ai_chat_sessions (id, user_id, title, summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [session.id, userId, session.title, session.summary ?? '', now, now]
  );
  exec('UPDATE ai_chat_sessions SET title = COALESCE(NULLIF(?, \'\'), title), summary = COALESCE(?, summary), updated_at = ? WHERE id = ? AND user_id = ?', [
    session.title,
    session.summary ?? null,
    now,
    session.id,
    userId
  ]);
  persist();
  return getAiChatSession(userId, session.id);
}

export function updateAiChatSession(userId: string, sessionId: string, patch: Partial<Pick<AiChatSession, 'title' | 'summary' | 'updatedAt'>>) {
  const current = getAiChatSession(userId, sessionId);
  if (!current) return null;

  exec('UPDATE ai_chat_sessions SET title = ?, summary = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
    patch.title ?? current.title,
    patch.summary ?? current.summary,
    patch.updatedAt ?? new Date().toISOString(),
    sessionId,
    userId
  ]);
  persist();
  return getAiChatSession(userId, sessionId);
}

export function deleteAiChatSession(userId: string, sessionId: string) {
  const current = getAiChatSession(userId, sessionId);
  if (!current) return null;

  exec('DELETE FROM ai_chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
  persist();
  return current;
}

export function upsertAiChatMessage(userId: string, message: AiChatMessage) {
  const session = getAiChatSession(userId, message.sessionId);
  if (!session) return null;

  exec(
    `INSERT INTO ai_chat_messages (id, session_id, role, content, prompt, render_mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       content = excluded.content,
       prompt = excluded.prompt,
       render_mode = excluded.render_mode`,
    [
      message.id,
      message.sessionId,
      message.role,
      message.content,
      message.prompt ?? null,
      message.renderMode,
      message.createdAt
    ]
  );
  exec('UPDATE ai_chat_sessions SET title = COALESCE(NULLIF(title, \'\'), ?), updated_at = ? WHERE id = ?', [
    message.role === 'user' ? message.content.slice(0, 18) : '',
    new Date().toISOString(),
    message.sessionId
  ]);
  persist();
  return getAiChatSession(userId, message.sessionId);
}

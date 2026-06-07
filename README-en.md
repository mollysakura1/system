# AI Intelligent Operations Management Platform

An enterprise-grade front-end and back-end separated admin project positioned as an AI-driven SaaS merchant operations management platform. It includes authentication, RBAC permissions, dynamic routing, dashboards, business management, internal messaging, profile settings, internationalization, and a real streaming AI assistant powered by the Alibaba Cloud Bailian OpenAI-compatible API.

## 1. Project Overview

- Front end: `Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`
- Back end: `Node.js + Express + TypeScript + JWT + SSE + SQLite`
- AI: the back end connects to the Alibaba Cloud Bailian compatible API, and the front end consumes streaming output through SSE
- Data layer: SQLite persists business data, system data, internal messages, AI chat sessions, messages, and memory summaries
- Cache strategy: SQLite is the source of truth; system management and business center use Pinia session cache; AI chat uses a backend-first model with local cache for speed and fallback

Default SQLite file:

```text
backend/data/app.sqlite
```

This is a binary SQLite database file. Use DB Browser for SQLite or `sqlite3` to inspect it instead of opening it with a text editor.

## 2. Core Features

### 1. Login and Authentication

- Username, password, and image captcha login
- User registration
- Access token is stored only in Pinia memory and sent through `Authorization: Bearer <token>`
- Refresh token is stored in an `httpOnly` Cookie scoped to `/api/auth`
- Automatic access-token refresh through `/api/auth/refresh` on 401; failed refresh clears auth state and redirects to login
- Mutating APIs are protected by CSRF token, request nonce replay protection, and POST idempotency keys
- Automatic session expiration after 1 hour of inactivity
- Route guards, logout cleanup, and unified error handling

### 2. RBAC Permission System

- Supports `super-admin`, `operator`, `analyst`, and `merchant`
- The back end returns menu trees and permission codes by role
- The front end injects routes dynamically based on returned menus
- Supports menu-level, page-level, and button-level permission control
- Supports the custom `v-permission` directive
- User and role management data is persisted in SQLite

### 3. System Management

- User management: create, view, edit, and delete users
- Role management: create, view, edit, delete, and manage permissions
- Menu management: display menu trees and role-menu information
- Log management: view log lists
- System settings: theme, language, and basic preferences

System management data strategy:

- Fetch from the back end when a page needs data for the first time
- Cache only in Pinia for the current browser session
- No persistent `localStorage` cache for system management data

### 4. Dashboard and Business Center

- Dashboard overview metrics
- Order trend and GMV trend charts
- Category sales bar chart and user source pie chart
- Merchant, product, order, activity, coupon, and channel management
- Create, edit, and delete actions go through RESTful APIs and persist to SQLite
- The front end uses Pinia session cache and reloads from the back end after a page refresh

### 5. Internal Messaging and Profile Center

- Top-bar internal messaging entry with unread indicator
- Role-change requests and permission-change notifications
- Profile, avatar, phone, email, address, and password updates
- Internal messages are persisted in SQLite

### 6. AI Operations Assistant

- Session list, new session, and session deletion
- Prompt templates
- Markdown rendering, code highlighting, and DOMPurify HTML sanitization
- Stop generation, regeneration, and error hints
- Toggle for whether business context is sent to AI
- Recent-message window plus backend session summary memory
- Backend-controlled tool calling that retrieves business data from SQLite
- AI sessions, messages, and summary memory are persisted in SQLite
- Local chat cache is used only for fast rendering and backend-failure fallback

## 3. Data Persistence and Cache Strategy

### 1. SQLite Database

The back end initializes SQLite tables on startup and seeds them from the original mock data on first run.

Main tables:

- `users`
- `credentials`
- `site_messages`
- `resource_items`
- `ai_prompts`
- `ai_chat_sessions`
- `ai_chat_messages`

Data mapping:

- Users: `users` and `credentials`
- Merchants, products, orders, activities, coupons, channels, and roles: `resource_items`
- Internal messages: `site_messages`
- AI sessions: `ai_chat_sessions`
- AI messages: `ai_chat_messages`
- AI session summaries: `ai_chat_sessions.summary`

### 2. Front-End Cache Strategy

- System management: backend source of truth, Pinia session cache
- Business center: backend source of truth, Pinia session cache
- AI chat: backend source of truth, local cache for acceleration and fallback
- User preferences such as theme, language, and AI context toggle still use `localStorage`

## 4. Authentication and Write-Request Security

### 1. Token Storage Strategy

Current authentication behavior:

- `accessToken`: returned in the login/refresh response body and stored only in Pinia memory
- `refreshToken`: written by the back end into an `httpOnly` Cookie named `ai_ops_refresh`
- The refresh token Cookie path is scoped to `/api/auth`, so it is not sent with ordinary business APIs
- Business APIs authenticate through `Authorization: Bearer <accessToken>`
- After a browser refresh, Pinia memory is lost; the route guard calls `/api/auth/refresh` first to restore an access token when the refresh Cookie is still valid

This reduces automatic Cookie exposure on business requests while keeping the long-lived refresh token unavailable to front-end JavaScript.

### 2. CSRF Token

Before protected mutating requests, the front end obtains a token from:

```text
GET /api/security/csrf
```

The back end issues a CSRF token, writes it to an `httpOnly` Cookie, and returns it in the response body. Later `POST/PATCH/DELETE` requests automatically include:

```text
X-CSRF-Token: <token>
```

The back end checks the request header token, Cookie token, and token signature.

### 3. Nonce Replay Protection

Authenticated mutating requests automatically include:

```text
X-Request-Nonce: <uuid>
X-Request-Timestamp: <timestamp>
```

The back end validates the timestamp window and records used nonces. Reusing a nonce is rejected.

### 4. POST Idempotency Key

Authenticated `POST` requests automatically include:

```text
Idempotency-Key: <uuid>
```

Repeated POST requests from the same user to the same path with the same idempotency key return the first response instead of creating duplicate records.

## 5. AI Assistant Implementation

### 1. Streaming Output

The front end starts AI streaming through `POST /api/ai/stream`, and the back end returns SSE data with `text/event-stream`. The request body is JSON and includes the current prompt, session, recent context, and whether business context should be sent:

```json
{
  "prompt": "Analyze recent order trends",
  "includeContext": true,
  "sessionId": "session-id",
  "messages": []
}
```

Because this endpoint is an authenticated `POST` request, the front end also sends `Authorization: Bearer <accessToken>`, CSRF token, nonce, replay-protection timestamp, and `Idempotency-Key`.

SSE events consumed by the front end:

```text
data: {"type":"tools","tools":[...]}
data: {"type":"chunk","content":"..."}
data: {"type":"done"}
```

Front-end streaming consumption uses two buffering layers:

- Protocol buffer: `frontend/src/utils/sse.ts` reads the response body with a `ReadableStream` reader and `TextDecoder`, joins complete SSE events by `\n\n`, and parses each `data:` JSON payload.
- Display buffer: the AI page stores parsed text chunks in `streamBuffer` so each token does not immediately trigger a Pinia update, Markdown parsing, and DOM rendering.

Display-layer flush strategy:

- When the page is visible: `requestAnimationFrame` aligns flushing with browser painting, while `STREAM_FLUSH_INTERVAL` keeps a minimum flush interval.
- When the page is hidden: `setTimeout` acts as a background fallback so content does not stay in the buffer indefinitely when rAF is throttled or paused.
- When the page becomes visible again: `visibilitychange` is monitored, and pending `streamBuffer` content is flushed immediately.
- On `done`, errors, stop generation, and component unmount: the current buffer is force-flushed or scheduled work is cleared to avoid losing tail content or letting stale tasks update the page.

### 2. Markdown Rendering Security

AI message rendering is centralized in `frontend/src/components/chat-message.vue`. Assistant responses are handled by render phase:

- Streaming phase: `patchStreamingMarkdown()` runs a lightweight state-machine scan over streaming Markdown, temporarily closing unfinished code fences, inline code, bold markers, link text, and link URLs before Markdown is rendered with `marked`.
- State-machine behavior: it scans character by character, tracks `inFence`, `inInlineCode`, `inStrong`, `inLinkText`, and `inLinkHref`, skips escaped characters, and avoids treating Markdown symbols inside code fences as outer Markdown state changes.
- Table protection: `downgradeIncompleteTables()` is still used to degrade likely incomplete streaming Markdown tables into plain text, reducing layout and parsing issues from half-written tables.
- Final phase: complete Markdown is rendered with `marked`, and code blocks are highlighted with `highlight.js`.
- Before writing to `v-html`: all generated HTML is passed through `DOMPurify.sanitize()` to reduce XSS risk from model output or embedded Markdown HTML.
- User messages: content is HTML-escaped, line breaks are converted, and the result is also sanitized before rendering.

Streaming rendering pipeline:

```text
message.content
-> downgradeIncompleteTables()
-> patchStreamingMarkdown() state-machine patching
-> marked.parse()
-> DOMPurify.sanitize()
-> v-html
```

Final rendering pipeline:

```text
message.content
-> marked.parse()
-> highlight.js
-> DOMPurify.sanitize()
-> v-html
```

### 3. Backend-Controlled Tool Calling

Tool calling is implemented on the back end. The model is not allowed to execute SQL directly.

Flow:

1. The front end sends the user prompt, `sessionId`, recent messages, and `includeContext`
2. The back end selects business tools based on the prompt
3. Tools read controlled data from SQLite
4. The back end builds structured tool results
5. Tool results, session summary, recent messages, and the current prompt are sent to the model
6. The model generates a streaming answer based on those results

Current business retrieval capabilities:

- Orders: count, amount, status grouping, channel grouping, merchant grouping
- Merchants: count, status, channel, GMV
- Products: category, sales, low stock
- Activities: type, status, budget
- Coupons: status and usage
- Channels: type and status
- Dashboard overview and trend data

Tool calling is enabled when the “Send business context to AI” toggle is on. If it is off, the assistant uses ordinary chat, session summary, and recent-message context only.

### 4. Session Summary Memory

After each final assistant response is saved, the back end merges:

- previous summary
- latest user prompt
- latest assistant response

into a concise updated summary stored at:

```text
ai_chat_sessions.summary
```

The next request in the same session automatically reads this summary and sends it to the model.

### 5. Recent Message Window

Before sending a prompt, the front end extracts recent complete turns from the active session:

- Default mode: latest 5 complete turns
- Business-context mode: latest 3 complete turns
- Both front end and back end enforce per-message and total-context length budgets

### 6. Local Chat Cache Limit

AI chat sessions maintain a local copy in `localStorage` for fast rendering and backend-failure fallback. To prevent `localStorage` quota exhaustion after extended use, data is trimmed before being persisted:

- At most the last 20 sessions
- At most the last 100 messages per session
- Each message content truncated to 5000 characters

If the first write attempt fails (e.g., quota exceeded), the session count and message count are halved for a second attempt. If both attempts fail, the write is silently skipped and the next server load serves as the source of truth.

All constants are defined in `frontend/src/config/index.ts`, and the logic is centralized in the `persist()` method without affecting Pinia runtime state.

## 6. Project Structure

```text
vue3-system
├─ frontend
│  ├─ src
│  │  ├─ api
│  │  ├─ components
│  │  ├─ config
│  │  ├─ directives
│  │  ├─ hooks
│  │  ├─ layout
│  │  ├─ locales
│  │  ├─ router
│  │  ├─ store
│  │  ├─ styles
│  │  ├─ types
│  │  ├─ utils
│  │  └─ views
│  └─ vite.config.ts
├─ backend
│  ├─ src
│  │  ├─ database
│  │  ├─ lib
│  │  ├─ middlewares
│  │  ├─ mock
│  │  ├─ routes
│  │  ├─ services
│  │  ├─ types
│  │  └─ utils
│  ├─ data
│  └─ .env.example
├─ README.md
└─ README-en.md
```

## 7. Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Back-End Environment Variables

Create `backend/.env` from `backend/.env.example`:

```bash
ALIYUN_API_KEY=your_bailian_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL=qwen-plus
PORT=3001
```

Optional SQLite path:

```bash
SQLITE_DB_PATH=./data/app.sqlite
```

### 3. Start the Project

```bash
npm run dev
```

Start front end and back end separately:

```bash
npm run dev:frontend
npm run dev:backend
```

### 4. Build and Check

```bash
npm run build
npm run check
```

Default URLs:

- Front end: `http://localhost:5173`
- Back end: `http://localhost:3001`

## 8. Back-End API List

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/captcha`
- `GET /api/security/csrf`

### Users and Permissions

- `GET /api/user/profile`
- `PATCH /api/user/profile`
- `GET /api/menus`
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/roles`
- `POST /api/roles`
- `GET /api/roles/:id`
- `PATCH /api/roles/:id`
- `DELETE /api/roles/:id`

### Dashboard and Business Center

- `GET /api/dashboard/overview`
- `GET /api/dashboard/charts`
- `GET /api/merchants`
- `POST /api/merchants`
- `GET /api/merchants/:id`
- `PATCH /api/merchants/:id`
- `DELETE /api/merchants/:id`

`products`, `orders`, `activities`, `coupons`, and `channels` support the same collection and item RESTful CRUD pattern.

### Messaging and AI

- `GET /api/messages`
- `GET /api/messages/:id`
- `PATCH /api/messages/:id`
- `POST /api/permission-requests`
- `GET /api/ai/prompts`
- `POST /api/ai/stream`
- `GET /api/ai/sessions`
- `POST /api/ai/sessions`
- `GET /api/ai/sessions/:id`
- `PATCH /api/ai/sessions/:id`
- `DELETE /api/ai/sessions/:id`
- `POST /api/ai/sessions/:id/messages`

## 9. Deployment Notes

### Vercel Front End

1. Set `Root Directory` to `frontend`
2. Set `Framework Preset` to `Vite`
3. Set `Build Command` to `npm run build`
4. Set `Output Directory` to `dist`
5. Add:

```bash
VITE_API_BASE_URL=https://your-render-domain.onrender.com/api
```

### Render Back End

1. Set `Root Directory` to `backend`
2. Set `Build Command` to `npm install && npm run build`
3. Set `Start Command` to `npm run start`
4. Configure Alibaba Cloud Bailian and SQLite environment variables

Note: free Render instances may not provide long-term persistent filesystem storage. For production usage, migrate to a hosted database or attach persistent disk storage.

## 10. Demo Accounts

- `admin / 123456`: super admin
- `operator / 123456`: operator
- `analyst / 123456`: analyst
- `merchant / 123456`: merchant

## 11. Future Extensions

- Upgrade SQLite to PostgreSQL/MySQL and introduce an ORM or migration tool
- Add version or `updatedAt` conflict detection for concurrent edits
- Add finer-grained data permissions and tenant isolation
- Add report center, export center, and chart drill-down
- Evolve backend-controlled tools into a fuller function calling / agent workflow
- Add unit tests, end-to-end tests, and CI checks

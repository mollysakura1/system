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
- Cookie-based session flow with access and refresh tokens
- Automatic token refresh on 401; failed refresh clears auth state and redirects to login
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
- Markdown rendering and code highlighting
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

## 4. AI Assistant Implementation

### 1. Streaming Output

The back end exposes `GET /api/ai/stream` and `POST /api/ai/stream` with `text/event-stream`.

SSE events consumed by the front end:

```text
data: {"type":"tools","tools":[...]}
data: {"type":"chunk","content":"..."}
data: {"type":"done"}
```

### 2. Backend-Controlled Tool Calling

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

### 3. Session Summary Memory

After each final assistant response is saved, the back end merges:

- previous summary
- latest user prompt
- latest assistant response

into a concise updated summary stored at:

```text
ai_chat_sessions.summary
```

The next request in the same session automatically reads this summary and sends it to the model.

### 4. Recent Message Window

Before sending a prompt, the front end extracts recent complete turns from the active session:

- Default mode: latest 5 complete turns
- Business-context mode: latest 3 complete turns
- Both front end and back end enforce per-message and total-context length budgets

## 5. Project Structure

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

## 6. Quick Start

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

## 7. Back-End API List

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/captcha`

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
- `GET /api/ai/stream`
- `POST /api/ai/stream`
- `GET /api/ai/sessions`
- `POST /api/ai/sessions`
- `GET /api/ai/sessions/:id`
- `PATCH /api/ai/sessions/:id`
- `DELETE /api/ai/sessions/:id`
- `POST /api/ai/sessions/:id/messages`

## 8. Deployment Notes

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

## 9. Demo Accounts

- `admin / 123456`: super admin
- `operator / 123456`: operator
- `analyst / 123456`: analyst
- `merchant / 123456`: merchant

## 10. Future Extensions

- Upgrade SQLite to PostgreSQL/MySQL and introduce an ORM or migration tool
- Add version or `updatedAt` conflict detection for concurrent edits
- Add finer-grained data permissions and tenant isolation
- Add report center, export center, and chart drill-down
- Evolve backend-controlled tools into a fuller function calling / agent workflow
- Add unit tests, end-to-end tests, and CI checks

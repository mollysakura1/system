# AI Intelligent Operations Management Platform

An enterprise-grade front-end and back-end separated project positioned as an “AI-driven SaaS merchant operations management platform.” The project includes login authentication, RBAC permissions, dynamic routing, business dashboards, business modules, internal messaging, profile settings, internationalization, and a real streaming AI assistant powered by Alibaba Cloud Bailian.

## 1. Project Overview

This project uses a dual-directory front-end and back-end structure:

- Front end: `Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`
- Back end: `Node.js + Express + TypeScript + JWT + SSE`
- AI capability: the back end connects to the Alibaba Cloud Bailian compatible API, while the front end keeps using the existing SSE protocol for streaming consumption
- Data layer: mainly based on in-memory data and local persistence, with priority on runnability, clear structure, and complete features

## 2. Tech Stack

### Front-End Stack

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Element Plus
- Axios
- ECharts
- Vue I18n
- Marked
- Highlight.js

### Back-End Stack

- Node.js
- Express
- TypeScript
- JWT
- SSE
- Dotenv
- OpenAI-compatible client SDK
- Alibaba Cloud Bailian compatible API

## 3. Core Features

### 1. Login and Authentication

- Login page supports username, password, and image captcha
- Registration page supports username, display name, password, confirm password, and image captcha
- Supports `accessToken + refreshToken`
- Axios request layer automatically attaches tokens
- Automatically refreshes tokens on 401 and redirects to login if refresh fails
- Supports automatic session expiration and re-login after 1 hour of inactivity
- Route guards, logout flow, and auth-state cleanup are fully implemented

### 2. Permission System

- Supports four roles: `super-admin`, `operator`, `analyst`, and `merchant`
- The back end returns menu trees by role
- The front end injects routes dynamically based on menus
- Supports menu-level, route-level, and button-level permission control
- Supports the custom permission directive `v-permission`
- Non-admin users are redirected to 403 even if they manually enter system-management URLs

### 3. Admin Layout

- Sidebar + top bar + tab navigation + breadcrumb layout
- The top bar supports theme switching, language switching, internal messages, profile settings, and logout
- Tabs can be closed
- Old tabs are cleared when switching accounts to avoid stale permission state

### 4. System Management

- User management: create, view, edit, and delete with username, name, role, status, and other fields
- Role management: create, view, edit, delete, and permission management
- Menu management: menu tree display and role-menu assignment
- Log management: view and delete
- System settings: language switching, theme configuration, and other basic settings

### 5. Business Center

- Merchant management: unique merchant codes, create, edit, delete, and local persistence
- Product management: unique product codes, create, edit, delete, and local persistence
- Order management: unique order numbers, create, edit, delete, and local persistence
- Activity management: unique activity codes, create, edit, delete, and local persistence
- Coupon management: unique coupon codes, create, edit, delete, and local persistence
- Channel management: create, edit, delete, and link with merchant and order forms

### 6. Data Visualization

- Dashboard metric cards
- Order trend and GMV trend line charts
- Category sales bar chart
- User source pie chart
- Time range filtering
- CSV export support

### 7. AI Operations Assistant

- Session list, new session, and session deletion
- Prompt templates
- Markdown rendering and code highlighting
- User messages support copy and edit
- Assistant messages support regeneration
- Session records are cached separately by account
- Supports stop generation, failure hints, and regeneration
- Supports true streaming display

### 8. Profile Center and Internal Messaging

- Profile settings support avatar, display name, password, phone number, email, and address updates
- Regular users can submit role-change requests
- The role-request section is hidden for super admins
- The top-bar mailbox icon shows unread red dots
- Role-change requests send internal messages to admins
- Role updates performed by admins send internal messages to the target user

### 9. Experience Optimization

- Lazy-loaded routes
- `keep-alive` page caching
- Virtual list
- Dark mode
- Chinese and English internationalization
- Empty, error, and loading state handling
- Improved AI thinking and streaming interaction experience

## 4. Project Structure

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
│  │  ├─ lib
│  │  ├─ middlewares
│  │  ├─ mock
│  │  ├─ routes
│  │  ├─ services
│  │  ├─ types
│  │  └─ utils
│  ├─ .env.example
│  └─ tsconfig.json
├─ package.json
├─ README.md
└─ README-en.md
```

## 5. Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Back-End Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```bash
ALIYUN_API_KEY=your_bailian_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL=qwen-plus
PORT=3001
```

Description:

- `ALIYUN_API_KEY`: Alibaba Cloud Bailian API key
- `ALIYUN_BASE_URL`: Bailian compatible API base URL
- `ALIYUN_MODEL`: default model name
- `PORT`: local back-end port, currently `3001`

### 3. Start the Project

Start front end and back end together:

```bash
npm run dev
```

Start separately:

```bash
npm run dev:frontend
npm run dev:backend
```

### 4. Build the Project

```bash
npm run build
```

### 5. Default URLs

- Front-end URL: `http://localhost:5173`
- Back-end URL: `http://localhost:3001`

## 6. Demo Accounts

- `admin / 123456`: super admin
- `operator / 123456`: operator role
- `analyst / 123456`: analyst role
- `merchant / 123456`: merchant role

## 7. Role Description

### Super Admin

- Can access all modules
- Can manage users, roles, menus, and logs
- Can modify other users’ roles in user management

### Operator

- Focuses on merchant, product, campaign, and order management
- Can use the AI assistant and profile settings

### Analyst

- Focuses on dashboards, order analytics, and AI-assisted analysis
- Can use the AI assistant and profile settings

### Merchant

- Only accesses merchant-related business pages
- Can use the AI assistant and profile settings

## 8. Front-End Pages

- Login page
- Registration page
- Dashboard overview
- User management
- Role management
- Menu management
- Log management
- System settings
- Merchant management
- Product management
- Order management
- Activity management
- Coupon management
- Channel management
- AI operations assistant
- Profile settings
- 403 page
- 404 page

## 9. Key Implementation Notes

### 1. Authentication Flow

- The back end returns tokens through `POST /api/auth/login`
- The back end provides token refresh through `POST /api/auth/refresh`
- The front-end request interceptor injects tokens automatically
- The front end tracks user activity globally, and clears the session and redirects to login after 1 hour of inactivity
- When tokens expire, they are refreshed automatically; if refresh fails, the user is logged out

### 2. RBAC and Dynamic Routing

- The back end returns menus by role through `GET /api/menus`
- The front end generates actual routes dynamically from the menu structure
- `Pinia` centrally manages user profile, menus, permission points, and tab state
- `v-permission` enables button-level permission control

### 3. Business Data Persistence

- Create, edit, and delete operations in the business center are written to browser local storage
- Demo data remains after refresh
- Forms such as orders, activities, merchants, and channels are linked with each other

### 4. AI Assistant and Streaming Output

- `GET /api/ai/prompts` returns prompt templates
- `GET /api/ai/stream` pushes streaming content via SSE
- The front end still consumes the same protocol:
  - `data: {"type":"chunk","content":"..."}`
  - `data: {"type":"done"}`
- Supports stop generation, regeneration, and graceful error fallback

### 5. AI Reads Business Data

Before calling the model, the back end injects business context including:

- overview metrics
- chart data for recent days
- time filter
- merchant filter
- channel filter
- business summary generated from the current filters

### 6. Real Model Integration

- The old mock timer-based output has been replaced by the Alibaba Cloud Bailian compatible API
- Model settings are read from environment variables, with no key exposed to the front end
- If the upstream request fails, the back end returns readable error content and then sends the completion event

## 10. Back-End API List

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/auth/captcha`

### Users and Permissions

- `GET /api/user/profile`
- `PATCH /api/user/profile`
- `GET /api/menus`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/roles`

### Dashboard and Business

- `GET /api/dashboard/overview`
- `GET /api/dashboard/charts`
- `GET /api/merchants`
- `GET /api/products`
- `GET /api/orders`
- `GET /api/activities`
- `GET /api/coupons`
- `GET /api/channels`
- `GET /api/logs`

### Messaging and AI

- `GET /api/messages`
- `POST /api/messages/:id/read`
- `POST /api/messages/permission-request`
- `GET /api/ai/prompts`
- `GET /api/ai/stream`

## 11. AI Streaming Description

The back end returns `text/event-stream` and keeps the following event format unchanged:

- `data: {"type":"chunk","content":"..."}`
- `data: {"type":"done"}`

Back-end flow:

1. Verify login state
2. Read overview data, chart data, and filter conditions
3. Build structured business context
4. Call the Alibaba Cloud Bailian compatible API
5. Forward model stream content to the front end
6. Send `done` on completion
7. Abort safely when the client disconnects

If the Bailian key is missing, the model configuration is invalid, or the network fails, the back end returns readable error content to the front end.

## 12. Internal Messaging and Profile Center

### Profile Settings

- avatar
- display name
- password
- phone number
- email
- address
- role request

### Internal Messaging

- The top-bar mailbox icon shows unread red dots
- Supports viewing messages and marking them as read
- When a user submits a role-change request, the super admin receives an internal message
- When a super admin updates a role, the target user receives an internal message

## 13. Verification Status

- Back-end type checking passed
- Front-end type checking passed
- Back-end build passed
- Front-end build passed
- Login, registration, permissions, business management, and AI streaming flows have been verified locally

## 14. Possible Extensions

- Integrate a real database and ORM
- Support multi-turn conversational memory
- Add finer-grained data permissions and tenant isolation
- Add a report center, export center, and chart drill-down
- Improve unit tests, end-to-end tests, and code quality tooling
- Add real-time notifications, task scheduling, and more AI scenarios

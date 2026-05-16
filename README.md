# AI 智能运营管理平台

一个前后端分离的企业级中后台项目，定位为“AI 驱动的 SaaS 商家运营管理平台”。项目覆盖登录鉴权、RBAC 权限系统、动态路由、经营看板、业务中心、站内信、个人设置、国际化，以及基于阿里云百炼兼容接口的真实流式 AI 助手能力。

## 一、项目概览

- 前端：`Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`
- 后端：`Node.js + Express + TypeScript + JWT + SSE + SQLite`
- AI：后端接入阿里云百炼兼容接口，前端通过 SSE 消费流式输出
- 数据层：后端使用 SQLite 持久化业务数据、系统数据、站内信、AI 会话和摘要记忆
- 缓存策略：后端 SQLite 是真实数据源；前端系统管理和业务中心只使用 Pinia 当前会话缓存；AI 聊天记录采用“后端为准，本地加速和兜底”

默认 SQLite 文件位置：

```text
backend/data/app.sqlite
```

该文件是二进制 SQLite 数据库文件，不适合用记事本打开。建议使用 DB Browser for SQLite 或 `sqlite3` 查看。

## 二、核心功能

### 1. 登录与鉴权

- 用户名、密码、图形验证码登录
- 注册账号
- access token 存放在 Pinia 内存中，请求时通过 `Authorization: Bearer <token>` 发送
- refresh token 存放在 `httpOnly` Cookie 中，并限制在 `/api/auth` 路径下使用
- 401 自动调用 `/api/auth/refresh` 刷新 access token，刷新失败后清理登录态并跳转登录页
- 写接口支持 CSRF token、nonce 防重放和 POST 幂等键保护
- 支持 1 小时无操作自动失效
- 路由守卫、退出登录和异常状态统一处理

### 2. RBAC 权限系统

- 支持 `super-admin`、`operator`、`analyst`、`merchant` 四类角色
- 后端按角色返回菜单树和权限点
- 前端基于菜单动态注入路由
- 支持菜单级、页面级、按钮级权限控制
- 支持 `v-permission` 自定义权限指令
- 用户管理和角色管理数据均写入 SQLite

### 3. 系统管理

- 用户管理：新增、查看、编辑、删除用户
- 角色管理：新增、查看、编辑、删除角色，支持权限配置
- 菜单管理：菜单树展示和角色菜单查看
- 日志管理：日志列表查看
- 系统设置：主题、语言等基础配置

系统管理数据策略：

- 页面首次需要数据时从后端接口拉取
- 当前浏览器会话内使用 Pinia 缓存
- 不再使用 `localStorage` 持久化系统管理数据

### 4. 经营看板与业务中心

- Dashboard 经营总览指标
- 订单趋势、GMV 趋势图
- 品类销售柱状图、用户来源饼图
- 商家、商品、订单、活动、优惠券、渠道管理
- 业务中心新增、编辑、删除均通过 RESTful API 写入 SQLite
- 前端当前会话内使用 Pinia 缓存，页面刷新后重新从后端拉取

### 5. 站内信与个人中心

- 顶栏站内信入口与未读红点
- 角色申请和权限变更消息通知
- 个人资料、头像、手机号、邮箱、地址、密码修改
- 站内信数据写入 SQLite

### 6. AI 运营助手

- 会话列表、新建会话、删除会话
- Prompt 模板
- Markdown 渲染与代码高亮
- 停止生成、重新生成、错误提示
- 支持切换是否发送运营上下文
- 支持最近对话窗口 + 后端摘要记忆
- 支持后端受控工具调用，自动检索 SQLite 业务数据
- AI 会话、消息和摘要记忆写入 SQLite
- 本地聊天缓存仅用于快速显示和后端失败兜底

## 三、数据持久化与缓存策略

### 1. SQLite 数据库

后端启动时会初始化 SQLite 表结构，并在首次运行时从原始 mock 数据写入种子数据。

主要数据表包括：

- `users`
- `credentials`
- `site_messages`
- `resource_items`
- `ai_prompts`
- `ai_chat_sessions`
- `ai_chat_messages`

其中：

- 用户数据写入 `users` 和 `credentials`
- 商家、商品、订单、活动、优惠券、渠道、角色等通用资源写入 `resource_items`
- 站内信写入 `site_messages`
- AI 会话写入 `ai_chat_sessions`
- AI 消息写入 `ai_chat_messages`
- AI 会话摘要存储在 `ai_chat_sessions.summary`

### 2. 前端缓存策略

- 系统管理：后端为准，Pinia 当前会话缓存
- 业务中心：后端为准，Pinia 当前会话缓存
- AI 聊天：后端为准，本地缓存加速和兜底
- 主题、语言、AI 是否发送上下文等用户偏好仍使用 `localStorage`

## 四、认证与写请求安全

### 1. Token 存储策略

当前认证方案为：

- `accessToken`：登录或刷新后由后端响应体返回，前端仅保存在 Pinia 内存中
- `refreshToken`：后端写入 `httpOnly` Cookie，Cookie 名为 `ai_ops_refresh`
- refresh token Cookie 的 path 限制为 `/api/auth`，不会随普通业务接口请求发送
- 普通业务接口通过 `Authorization: Bearer <accessToken>` 鉴权
- 浏览器刷新导致 Pinia 内存丢失时，路由守卫会先调用 `/api/auth/refresh` 尝试换取新的 access token

这样可以减少普通业务请求自动携带 Cookie 的范围，同时避免长期 refresh token 暴露给前端 JS。

### 2. CSRF Token

前端在业务写请求前会请求：

```text
GET /api/security/csrf
```

后端生成 CSRF token，并同时写入 `httpOnly` Cookie 和返回响应体。后续 `POST/PATCH/DELETE` 请求会自动携带：

```text
X-CSRF-Token: <token>
```

后端会校验请求头 token、Cookie token 和签名是否一致。

### 3. Nonce 防重放

所有已登录后的写请求会自动携带：

```text
X-Request-Nonce: <uuid>
X-Request-Timestamp: <timestamp>
```

后端会校验时间窗口，并记录已使用 nonce。重复 nonce 会被拒绝。

### 4. POST 幂等键

所有已登录后的 `POST` 写请求会自动携带：

```text
Idempotency-Key: <uuid>
```

同一用户、同一路径、同一个幂等键的重复 POST 请求会直接返回第一次请求结果，避免重复创建。

## 五、AI 助手实现说明

### 1. 流式输出

前端通过 `POST /api/ai/stream` 发起 AI 流式请求，后端以 `text/event-stream` 返回 SSE 数据。请求体使用 JSON，携带当前问题、会话、最近上下文和是否发送运营上下文：

```json
{
  "prompt": "分析最近订单趋势",
  "includeContext": true,
  "sessionId": "session-id",
  "messages": []
}
```

因为该接口是登录后的 `POST` 写请求，前端会同时携带 `Authorization: Bearer <accessToken>`、CSRF token、nonce、防重放时间戳和 `Idempotency-Key`。

前端消费的 SSE 事件包括：

```text
data: {"type":"tools","tools":[...]}
data: {"type":"chunk","content":"..."}
data: {"type":"done"}
```

### 2. 后端受控工具调用

AI 工具调用在后端实现，不允许模型直接执行 SQL。

流程：

1. 前端发送用户问题、`sessionId`、最近消息和 `includeContext`
2. 后端根据问题关键词选择业务工具
3. 工具从 SQLite 读取受控业务数据
4. 后端生成结构化工具结果
5. 工具结果、会话摘要、最近消息和当前问题一起传给模型
6. 模型基于工具结果生成流式回答

当前支持的业务检索范围：

- 订单：订单数、金额、状态、渠道、商家聚合
- 商家：商家数、状态、渠道、GMV
- 商品：品类、销量、低库存
- 活动：类型、状态、预算
- 优惠券：状态、使用量
- 渠道：类型、状态
- Dashboard 总览和趋势数据

“发送运营上下文”开启时会启用工具调用；关闭后只进行普通对话、会话摘要和最近消息上下文。

### 3. 会话摘要记忆

每次 AI 最终回复保存到后端后，后端会把：

- 旧摘要
- 最新用户问题
- 最新 assistant 回复

合并成新的简洁摘要，并更新到：

```text
ai_chat_sessions.summary
```

后续同一会话继续提问时，后端会自动读取该摘要并传给 AI。

### 4. 最近消息窗口

前端发送问题前，会从当前会话提取最近完整问答作为历史上下文：

- 默认保留最近 5 轮完整问答
- 开启运营上下文时保留最近 3 轮完整问答
- 前后端都会限制单条消息和总上下文长度

## 六、项目结构

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

## 七、快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端环境变量

参考 `backend/.env.example` 创建 `backend/.env`：

```bash
ALIYUN_API_KEY=your_bailian_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL=qwen-plus
PORT=3001
```

可选 SQLite 路径：

```bash
SQLITE_DB_PATH=./data/app.sqlite
```

### 3. 启动项目

```bash
npm run dev
```

分别启动：

```bash
npm run dev:frontend
npm run dev:backend
```

### 4. 构建与检查

```bash
npm run build
npm run check
```

默认访问地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 八、后端主要接口

### 鉴权

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/captcha`
- `GET /api/security/csrf`

### 用户与权限

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

### Dashboard 与业务中心

- `GET /api/dashboard/overview`
- `GET /api/dashboard/charts`
- `GET /api/merchants`
- `POST /api/merchants`
- `GET /api/merchants/:id`
- `PATCH /api/merchants/:id`
- `DELETE /api/merchants/:id`

`products`、`orders`、`activities`、`coupons`、`channels` 同样支持集合和单项 RESTful CRUD。

### 消息与 AI

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

## 九、部署说明

### Vercel 前端

1. `Root Directory` 设置为 `frontend`
2. `Framework Preset` 设置为 `Vite`
3. `Build Command` 设置为 `npm run build`
4. `Output Directory` 设置为 `dist`
5. 配置环境变量：

```bash
VITE_API_BASE_URL=https://your-render-domain.onrender.com/api
```

### Render 后端

1. `Root Directory` 设置为 `backend`
2. `Build Command` 设置为 `npm install && npm run build`
3. `Start Command` 设置为 `npm run start`
4. 配置阿里云百炼和 SQLite 相关环境变量

注意：Render 免费实例文件系统可能不是长期持久化存储。若要生产使用，建议迁移到托管数据库或挂载持久磁盘。

## 十、演示账号

- `admin / 123456`：超级管理员
- `operator / 123456`：运营
- `analyst / 123456`：分析师
- `merchant / 123456`：商家

## 十一、后续可扩展方向

- 将 SQLite 升级为 PostgreSQL/MySQL，并引入 ORM 或迁移工具
- 增加版本号或 `updatedAt` 冲突检测，支持多端并发编辑
- 增加更细粒度的数据权限和租户隔离
- 增加报表中心、导出中心和图表钻取
- 增强 AI 工具调用为更完整的 function calling / agent 工作流
- 增加单元测试、端到端测试和 CI 检查

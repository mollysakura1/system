# AI 智能运营管理平台

一个适合前端实习简历展示和面试讲解的企业级中后台项目，采用前后端分离双目录结构，覆盖登录鉴权、RBAC 权限、动态路由、数据可视化、AI 助手和 SSE 流式输出等核心能力。

## 技术栈

### 前端
- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Element Plus
- Axios
- ECharts
- Vue I18n

### 后端
- Node.js
- Express
- TypeScript
- JWT
- SSE
- Mock / 内存数据

## 功能模块

- 登录鉴权：登录、token 存储、路由守卫、401 拦截、refresh token 刷新
- 权限系统：RBAC 角色模型、动态菜单、动态路由、按钮级权限、自定义 `v-permission`
- 基础后台：Dashboard、用户管理、角色管理、菜单管理、日志管理、系统设置
- 业务中心：商家管理、商品管理、订单管理、活动管理、优惠券管理
- 数据可视化：指标卡片、折线图、柱状图、饼图、时间筛选、CSV 导出
- AI 助手：会话列表、Prompt 模板、Markdown 渲染、代码高亮、本地缓存
- 流式输出：Express SSE 接口、前端逐段拼接、停止生成、重新生成、失败提示
- 体验优化：懒加载、keep-alive、虚拟列表、暗黑模式、国际化、Skeleton、空状态

## 项目结构

```text
ai-ops-management-platform
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
│  │  ├─ middlewares
│  │  ├─ mock
│  │  ├─ routes
│  │  ├─ services
│  │  ├─ types
│  │  └─ utils
│  └─ tsconfig.json
└─ README.md
```

## 启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 同时启动前后端

```bash
npm run dev
```

### 3. 分别启动

```bash
npm run dev:frontend
npm run dev:backend
```

### 4. 构建

```bash
npm run build
```

前端默认地址：`http://localhost:5173`

后端默认地址：`http://localhost:3001`

## 演示账号

- `admin / 123456`：`super-admin`
- `operator / 123456`：`operator`
- `analyst / 123456`：`analyst`
- `merchant / 123456`：`merchant`

## 角色说明

- `super-admin`：可访问所有模块，拥有用户、角色、菜单等完整权限
- `operator`：侧重商家、商品、活动、系统设置等运营模块
- `analyst`：侧重 Dashboard、日志、订单和分析能力
- `merchant`：仅访问与商家经营相关页面和 AI 助手

## 核心实现说明

### 1. 登录鉴权
- 后端 `POST /api/auth/login` 返回 `accessToken + refreshToken`
- 前端 Axios 请求拦截器自动带 token
- 401 时触发 refresh token 刷新，刷新失败则回到登录页

### 2. RBAC + 动态路由
- 后端按角色返回菜单树 `GET /api/menus`
- 前端将菜单配置转换为真实路由并动态注入
- `Pinia user store` 统一管理用户、菜单、权限点
- `v-permission` 指令实现按钮级权限裁剪

### 3. Dashboard 可视化
- `GET /api/dashboard/overview` 返回核心指标
- `GET /api/dashboard/charts` 返回订单趋势、GMV、品类销售、用户来源
- 图表组件按需加载 `echarts`
- 支持 CSV 导出

### 4. AI 助手与 SSE
- `GET /api/ai/prompts` 返回常用 Prompt 模板
- `GET /api/ai/stream` 使用 SSE 分段推送分析内容
- 前端通过 `fetch + ReadableStream` 解析 SSE 协议
- 支持逐段展示、停止生成、重新生成、本地缓存聊天记录
- 服务端处理客户端断开连接并发送完成标志

## 后端接口

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/user/profile`
- `GET /api/menus`
- `GET /api/users`
- `GET /api/roles`
- `GET /api/dashboard/overview`
- `GET /api/dashboard/charts`
- `GET /api/orders`
- `GET /api/merchants`
- `GET /api/products`
- `GET /api/activities`
- `GET /api/coupons`
- `GET /api/logs`
- `GET /api/ai/prompts`
- `GET /api/ai/stream`

## AI 流式输出说明

后端通过 `text/event-stream` 分段推送模拟经营分析文本，每 700ms 输出一段，并在结束时发送：

- `{"type":"chunk","content":"..."}`
- `{"type":"done"}`

前端收到后会实时拼接助手消息内容，并在中断、完成、异常时更新消息状态。

## 简历可写亮点

- 独立搭建 Vue3 + TS + Vite + Express 的前后端分离企业级中后台项目
- 设计并实现 RBAC 权限模型，支持菜单级、路由级、按钮级动态权限控制
- 封装统一请求层、路由守卫和 refresh token 续期机制，完善异常链路
- 构建 Dashboard 可视化系统，完成指标卡片、趋势图、分布图和报表导出
- 接入 AI 运营助手，基于 SSE 实现流式输出、停止生成、重试和本地会话缓存
- 落地暗黑模式、国际化、懒加载、keep-alive 和虚拟列表等工程化体验优化

## 已完成自检

- 后端 TypeScript 类型检查通过
- 前端 TypeScript 类型检查通过
- 前端生产构建通过
- 后端登录、菜单接口、SSE 接口已完成本地烟测

## 可继续扩展

- 接入真实数据库与 ORM
- 接入真实大模型 API，支持上下文多轮会话和引用来源
- 增加更细粒度的组织、租户、数据权限
- 增加图表钻取、报表中心、下载 Excel
- 接入单元测试、E2E 测试、ESLint / Prettier / Husky
- 增加 WebSocket 消息中心和实时告警

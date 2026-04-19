# AI 智能运营管理平台

一个前后端分离的企业级中后台项目，定位为“AI 驱动的 SaaS 商家运营管理平台”。项目覆盖登录鉴权、RBAC 权限系统、动态路由、经营看板、业务中心、站内信、个人设置、国际化，以及基于阿里云百炼的真实流式 AI 助手能力。

## 一、项目概览

- 前端：`Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`
- 后端：`Node.js + Express + TypeScript + JWT + SSE`
- AI 能力：后端接入阿里云百炼兼容接口，前端通过 SSE 消费流式输出
- 数据层：以本地持久化和内存数据为主，优先保证完整功能链路与可运行性

## 二、核心功能

### 1. 登录与鉴权

- 支持用户名、密码、图形验证码登录
- 支持 `accessToken + refreshToken`
- Axios 请求层自动注入 token
- 401 自动刷新 token，刷新失败后回到登录页
- 支持 1 小时无操作自动失效并重新登录
- 已实现路由守卫、登出清理、异常状态统一处理

### 2. RBAC 权限系统

- 支持 `super-admin`、`operator`、`analyst`、`merchant` 四类角色
- 后端按角色返回菜单树与权限点
- 前端基于菜单动态注入路由
- 支持菜单级、页面级、按钮级权限控制
- 支持自定义权限指令 `v-permission`

### 3. 经营看板与业务中心

- Dashboard 经营总览指标卡
- 订单趋势与 GMV 趋势图
- 品类销售柱状图、用户来源饼图
- 商家、商品、订单、活动、优惠券、渠道等业务管理
- 支持筛选、联动、CSV 导出和本地持久化演示数据

### 4. 站内信与个人中心

- 顶栏站内信入口与未读红点
- 角色申请和权限变更消息通知
- 个人资料、头像、手机号、邮箱、地址、密码修改

### 5. AI 运营助手

- 会话列表、新建会话、删除会话
- Prompt 模板
- Markdown 渲染与代码高亮
- 停止生成、重新生成、错误提示
- 会话记录按账号隔离缓存
- 支持切换是否发送运营上下文
- 支持基于最近几轮消息的滑动窗口上下文记忆

## 三、AI 助手实现说明

### 1. 流式输出

- 后端 `GET /api/ai/stream` 通过 `text/event-stream` 推送流式内容
- 前端继续消费以下协议：
  - `data: {"type":"chunk","content":"..."}`
  - `data: {"type":"done"}`
- 支持停止生成、重试与可读错误回退

### 2. 运营上下文注入

在开启“发送运营上下文”时，后端会在调用模型前拼接业务上下文，包括：

- 经营总览指标
- 最近数日图表数据
- 当前筛选条件
- 基于筛选条件生成的业务摘要

关闭该选项时，只发送用户问题，按纯问答模式工作。

### 3. 滑动窗口记忆

项目当前已实现滑动窗口上下文记忆：

- 前端发送问题前，会从当前会话中提取最近的完整问答作为历史上下文
- 默认保留最近 `5` 轮完整问答
- 开启“发送运营上下文”后，历史窗口自动降级为最近 `3` 轮
- 前后端两侧都会再次做规范化与预算限制：
  - 过滤未完成、报错或空消息
  - 消除连续同角色消息
  - 限制单条消息长度
  - 限制总上下文长度

模型输入的组织顺序为：

1. system prompt
2. 可选运营业务上下文
3. 最近几轮历史消息
4. 当前用户问题

## 四、前端性能优化

项目围绕首屏加载和 AI 流式体验做过多轮优化：

### 1. 依赖体积优化

- `Element Plus` 从整库注册改为按需自动导入
- `ECharts` 从整包引入改为 `echarts/core`
- `highlight.js` 改为核心包加常用语言按需注册

### 2. 首屏链路优化

- 站内信请求从 layout 首屏同步路径移除，改为浏览器空闲时预热
- `fetchProfile()` 与 `fetchMenus()` 从串行改为并行
- Dashboard 指标先渲染，图表延后到接近视口时再加载

### 3. AI 渲染优化

- SSE chunk 先进入 buffer，再按小批次 flush，避免每个 chunk 都触发完整渲染
- 消息渲染拆分为：
  - `streaming`：流式阶段轻量渲染
  - `final`：完成后完整 Markdown 与代码高亮
- 流式阶段对未闭合 Markdown 做轻量容错补全，例如代码块 fence、反引号和粗体标记

### 4. 图表首屏缩放修复

- 修复了页面刷新后图表偶发缩在左上角、需要调整窗口大小才恢复的问题
- 现在会在容器尺寸稳定后再初始化图表
- 结合 `ResizeObserver` 与调度后的 `resize()` 自动修正图表尺寸

## 五、项目结构

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
│  └─ .env.example
├─ README.md
└─ README-en.md
```

## 六、快速开始

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

### 3. 启动项目

同时启动前后端：

```bash
npm run dev
```

分别启动：

```bash
npm run dev:frontend
npm run dev:backend
```

### 4. 构建项目

```bash
npm run build
```

默认访问地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 七、部署说明（Vercel + Render）

当前项目采用前后端分离部署：

- GitHub：代码托管与自动部署触发
- Vercel：部署 `frontend` 前端 Vue 3 + Vite 应用
- Render：部署 `backend` 后端 Node.js + Express 服务

### Vercel 前端部署配置

1. 导入 GitHub 仓库
2. `Root Directory` 设为 `frontend`
3. `Framework Preset` 设为 `Vite`
4. `Build Command` 设为 `npm run build`
5. `Output Directory` 设为 `dist`
6. 配置环境变量并重新部署：

```bash
VITE_API_BASE_URL=https://your-render-domain.onrender.com/api
```

说明：

- 项目使用 `createWebHistory()`，因此通过 `frontend/vercel.json` 处理 SPA 路由回退
- 前端通过 `frontend/src/config/env.ts` 读取 API 基础地址

### Render 后端部署配置

1. 新建 `Web Service`
2. 连接同一个 GitHub 仓库
3. `Root Directory` 设为 `backend`
4. `Build Command` 设为 `npm install && npm run build`
5. `Start Command` 设为 `npm run start`
6. 在 Render 后台配置环境变量

推荐环境变量：

```bash
ALIYUN_API_KEY=your_aliyun_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL=qwen-plus
```

推荐部署顺序：

1. 先部署 Render 后端并确认服务地址可用
2. 在 Vercel 中配置 `VITE_API_BASE_URL`
3. 再部署或重部署前端

## 八、后端主要接口

### 鉴权

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/auth/captcha`

### 用户与权限

- `GET /api/user/profile`
- `PATCH /api/user/profile`
- `GET /api/menus`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/roles`

### Dashboard 与业务

- `GET /api/dashboard/overview`
- `GET /api/dashboard/charts`
- `GET /api/merchants`
- `GET /api/products`
- `GET /api/orders`
- `GET /api/activities`
- `GET /api/coupons`
- `GET /api/channels`
- `GET /api/logs`

### 消息与 AI

- `GET /api/messages`
- `POST /api/messages/:id/read`
- `POST /api/messages/permission-request`
- `GET /api/ai/prompts`
- `GET /api/ai/stream`

## 九、后续可扩展方向

- 将当前滑动窗口记忆升级为“最近几轮 + 历史摘要”混合记忆
- 接入真实数据库和 ORM
- 增加更细粒度的数据权限与租户隔离
- 增加报表中心、导出中心和图表钻取
- 完善单元测试、端到端测试与代码质量工具链
- 扩展更多 AI 场景、实时通知与任务调度能力

# AI 智能运营管理平台

一个前后端分离的企业级中后台项目，定位为“AI 驱动的 SaaS 商家运营管理平台”。项目覆盖登录鉴权、RBAC 权限系统、动态路由、经营看板、业务中心、站内信、个人设置、国际化，以及基于阿里云百炼的真实流式 AI 助手能力。

## 一、项目概览

本项目采用前后端双目录结构：

- 前端：`Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`
- 后端：`Node.js + Express + TypeScript + JWT + SSE`
- AI 能力：后端接入阿里云百炼兼容接口，前端继续使用现有 SSE 协议进行流式消费
- 数据层：以内存数据和本地持久化为主，优先保证项目可运行、结构清晰、功能完整

## 二、技术栈

### 前端技术栈

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

### 后端技术栈

- Node.js
- Express
- TypeScript
- JWT
- SSE
- Dotenv
- OpenAI 兼容客户端 SDK
- 阿里云百炼兼容接口

## 三、核心功能

### 1. 登录与鉴权

- 登录页支持用户名、密码、图形验证码登录
- 注册页支持用户名、姓名、密码、确认密码、图形验证码
- 支持 `accessToken + refreshToken`
- Axios 请求层自动携带令牌
- 401 自动刷新令牌，刷新失败自动回到登录页
- 支持 1 小时无操作自动失效并重新登录
- 路由守卫、退出登录、登录态清理已完整实现

### 2. 权限系统

- 支持 `super-admin`、`operator`、`analyst`、`merchant` 四类角色
- 后端按角色返回菜单树
- 前端基于菜单动态注入路由
- 支持菜单级、路由级、按钮级权限控制
- 支持自定义权限指令 `v-permission`
- 非管理员即使手动输入系统管理页面地址，也会被拦截到 403

### 3. 后台框架

- 侧边栏 + 顶栏 + 标签页导航 + 面包屑布局
- 顶栏支持主题切换、语言切换、站内信、个人设置、退出登录
- 标签页支持关闭
- 不同账号切换时会清空旧标签，避免历史权限残留

### 4. 系统管理

- 用户管理：新增、查看、编辑、删除，支持用户名、姓名、角色、状态等字段
- 角色管理：新增、查看、编辑、删除、权限管理
- 菜单管理：菜单树展示、角色菜单分配
- 日志管理：查看、删除
- 系统设置：语言切换、主题配置等基础设置入口

### 5. 业务中心

- 商家管理：支持唯一商家编号、新增、编辑、删除、本地持久化
- 商品管理：支持唯一商品编号、新增、编辑、删除、本地持久化
- 订单管理：支持唯一订单编号、新增、编辑、删除、本地持久化
- 活动管理：支持唯一活动编号、新增、编辑、删除、本地持久化
- 优惠券管理：支持唯一优惠券编号、新增、编辑、删除、本地持久化
- 渠道管理：支持新增、编辑、删除，并与商家、订单表单联动

### 6. 数据可视化

- Dashboard 经营总览指标卡片
- 订单趋势与 GMV 趋势折线图
- 品类销售柱状图
- 用户来源饼图
- 支持时间筛选
- 支持报表导出为 CSV

### 7. AI 运营助手

- 会话列表、新建会话、删除会话
- 常用提示词模板
- Markdown 渲染与代码高亮
- 支持切换是否发送运营上下文给 AI
- 用户消息支持复制、编辑
- 助手消息支持重新生成
- 会话记录按账号隔离缓存
- 支持停止生成、失败提示、重新生成
- 支持流式逐段展示

### 8. 个人中心与站内信

- 个人设置页面支持修改头像、姓名、密码、手机号、电子邮件、地址
- 普通用户可以提交权限变更申请
- 超级管理员隐藏“申请修改权限”区域
- 顶栏站内信入口支持未读红点提示
- 用户申请权限后会向管理员发送站内信
- 管理员修改角色后会向用户发送权限变更站内信

### 9. 体验优化

- 路由懒加载
- `keep-alive` 页面缓存
- 虚拟列表
- 暗黑模式
- 中英文国际化
- 空状态、异常状态、加载状态处理
- AI 思考态与流式渲染体验优化

## 四、项目结构

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

## 五、快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端环境变量

先参考 `backend/.env.example` 新建 `backend/.env`：

```bash
ALIYUN_API_KEY=你的百炼密钥
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL=qwen-plus
PORT=3001
```

说明：

- `ALIYUN_API_KEY`：阿里云百炼接口密钥
- `ALIYUN_BASE_URL`：百炼兼容接口地址
- `ALIYUN_MODEL`：默认模型名称
- `PORT`：后端本地启动端口，当前默认 `3001`

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

### 5. 默认访问地址

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:3001`

## 六、演示账号

- `admin / 123456`：超级管理员
- `operator / 123456`：运营角色
- `analyst / 123456`：分析角色
- `merchant / 123456`：商家角色

## 七、角色说明

### 超级管理员

- 可访问所有模块
- 可管理用户、角色、菜单、日志
- 可在用户管理中修改其他用户角色

### 运营角色

- 侧重商家、商品、活动、订单等业务管理
- 可使用 AI 助手和个人设置

### 分析角色

- 侧重经营看板、订单分析、AI 辅助分析
- 可使用 AI 助手和个人设置

### 商家角色

- 仅访问与商家经营相关页面
- 可使用 AI 助手和个人设置

## 八、前端页面

- 登录页
- 注册页
- Dashboard 经营总览
- 用户管理
- 角色管理
- 菜单管理
- 日志管理
- 系统设置
- 商家管理
- 商品管理
- 订单管理
- 活动管理
- 优惠券管理
- 渠道管理
- AI 运营助手
- 个人设置
- 403 页面
- 404 页面

## 九、核心实现

### 1. 鉴权链路

- 后端 `POST /api/auth/login` 返回登录令牌
- 后端 `POST /api/auth/refresh` 提供令牌续期
- 前端请求拦截器统一注入令牌
- 前端统一记录用户活动时间，连续 1 小时无操作会自动清空登录态并跳回登录页
- 令牌失效后自动刷新，刷新失败自动退出

### 2. RBAC 与动态路由

- 后端 `GET /api/menus` 基于角色返回菜单
- 前端根据菜单结构动态生成真实路由
- `Pinia` 统一管理用户资料、菜单、权限点、标签页状态
- `v-permission` 实现按钮级权限控制

### 3. 业务数据持久化

- 业务中心的新增、编辑、删除操作写入浏览器本地缓存
- 页面刷新后仍保留演示数据
- 订单、活动、商家、渠道等表单存在业务联动

### 4. AI 助手与流式输出

- 后端 `GET /api/ai/prompts` 返回提示词模板
- 后端 `GET /api/ai/stream` 使用 SSE 推送流式内容
- 前端继续消费以下协议：
  - `data: {"type":"chunk","content":"..."}`
  - `data: {"type":"done"}`
- 支持停止生成、重新生成、错误兜底

### 5. AI 读取经营数据

后端在调用模型前会注入业务上下文，包括：

- 经营总览数据
- 最近若干天图表数据
- 时间筛选条件
- 商家筛选条件
- 渠道筛选条件
- 根据筛选条件生成的业务摘要

AI 助手页面支持切换是否发送运营上下文：

- 开启时：后端会将经营数据和筛选信息一并注入模型
- 关闭时：仅发送用户输入内容，作为纯问答模式使用

### 6. 真实模型接入

- 后端已将旧的模拟定时器输出替换为阿里云百炼兼容接口
- 使用环境变量读取模型配置，不在前端暴露密钥
- 上游请求失败时，后端会返回可读错误内容，再发送完成标记

## 十、后端接口

### 鉴权相关

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

### 看板与业务

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

## 十一、AI 流式输出说明

后端返回 `text/event-stream`，并保持以下事件格式不变：

- `data: {"type":"chunk","content":"..."}`
- `data: {"type":"done"}`

后端处理流程：

1. 校验登录态
2. 读取经营总览、图表数据和筛选条件
3. 拼接为结构化业务上下文
4. 调用阿里云百炼兼容接口
5. 将模型流式内容转发给前端
6. 完成时发送 `done`
7. 客户端断开时安全中止

如果百炼密钥缺失、模型配置错误或网络异常，后端会返回可读错误信息给前端。

## 十二、站内信与个人中心

### 个人设置

- 头像
- 姓名
- 密码
- 手机号
- 电子邮件
- 地址
- 权限申请

### 站内信

- 顶栏信封图标显示未读红点
- 支持查看消息与标记已读
- 用户提交权限申请后，超级管理员收到站内信
- 超级管理员修改角色后，目标用户收到站内信

## 十三、自检结果

- 后端类型检查通过
- 前端类型检查通过
- 后端构建通过
- 前端构建通过
- 登录、注册、权限、业务管理、AI 流式输出链路已完成本地联调

## 十四、后续可扩展方向

- 接入真实数据库与 ORM
- 接入多轮对话上下文与历史记忆
- 增加更细粒度的数据权限与租户隔离
- 增加报表中心、导出中心、图表钻取
- 完善单元测试、端到端测试、代码规范工具链
- 增加实时通知、任务调度、更多 AI 场景能力

## 前端性能优化记录

为了改善首屏加载，这个项目完成了四轮前端性能优化，核心目标是减少首屏阻塞、延后非关键资源加载，并降低大体积依赖对首屏的影响。

### 1. 问题定位

- 先通过构建产物和浏览器 trace 定位问题，而不是只凭页面体感判断
- 确认首屏瓶颈主要来自大依赖包、路由鉴权阻塞，以及 dashboard 图表初始化过早
- 初始阶段体积较大的部分主要是 `echarts`、`element-plus` 以及 AI 的 markdown / 代码高亮相关依赖

### 2. 第一轮：压缩核心依赖体积

- 将 `Element Plus` 从全局整库注册改为基于 Vite 插件的自动按需导入
- 将图表渲染从整包 `echarts` 改为 `echarts/core`，只注册项目实际使用到的图表和组件
- 图表 resize 逻辑从重复 `setOption` 改为 `chart.resize()`，减少不必要的重绘

### 3. 第二轮：缩短首屏请求链路

- 将 layout 中的站内信请求移出首屏同步路径
- 改为在浏览器空闲阶段预热消息，而不是在 layout 挂载时立刻请求
- 在路由守卫中把 `fetchProfile()` 和 `fetchMenus()` 从串行改成 `Promise.all(...)` 并行执行

### 4. 第三轮：拆分 AI Markdown 与高亮运行时

- 移除了 `chat-message` 组件中对 `marked`、`highlight.js` 和高亮样式的同步引入
- 改为只有 assistant 消息真正需要富文本渲染时才动态加载 markdown 解析与代码高亮能力
- 将 `highlight.js` 从全量语言包改成 `highlight.js/lib/core` 加少量常用语言按需注册

### 5. 第四轮：让 Dashboard 图表首屏懒加载

- 将 dashboard 的概览指标请求和图表数据请求拆开
- 先渲染指标卡，再在图表区域接近视口时加载图表数据
- 为图表卡片增加 skeleton 占位，并且只有图表卡片激活时才初始化 ECharts
- 移除了对 `element-plus` 的强制公共 chunk 合并，让打包器按实际使用路径自然拆分

### 6. 优化结果

- 前端生产构建在多轮优化后仍可稳定通过
- 原本体积很大的 AI 相关 chunk 被拆成多个按需加载的小 chunk
- `charts` 和 `element-plus` 相比早期构建结果都有明显下降
- dashboard 首屏可以更早展示有效内容，而不是等待图表初始化完成

## 部署说明（Vercel + Render）

当前项目采用前后端分离部署：

- GitHub：用于代码托管与自动部署触发
- Vercel：用于部署 `frontend` 前端 Vue 3 + Vite 应用
- Render：用于部署 `backend` 后端 Node.js + Express 服务

Vercel 前端部署配置：

1. 将 GitHub 仓库导入 Vercel
2. `Root Directory` 设置为 `frontend`
3. `Framework Preset` 选择 `Vite`
4. `Build Command` 设置为 `npm run build`
5. `Output Directory` 设置为 `dist`
6. 在 Vercel 中配置以下环境变量并重新部署：

```bash
VITE_API_BASE_URL=https://your-render-domain.onrender.com/api
```

说明：

- 前端使用 `createWebHistory()`，因此需要 [frontend/vercel.json](frontend/vercel.json) 进行 SPA 路由回退配置
- 前端从 [frontend/src/config/env.ts](frontend/src/config/env.ts) 读取 API 基础地址

Render 后端部署配置：

1. 创建新的 `Web Service`
2. 关联同一个 GitHub 仓库
3. `Root Directory` 设置为 `backend`
4. `Build Command` 设置为 `npm install && npm run build`
5. `Start Command` 设置为 `npm run start`
6. 在 Render 后台配置环境变量

建议环境变量如下：

```bash
ALIYUN_API_KEY=your_aliyun_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_MODEL=qwen-plus
```

部署顺序建议：

1. 先在 Render 部署后端，并确认服务地址可用
2. 在 Vercel 中将 `VITE_API_BASE_URL` 设置为 `https://your-render-domain.onrender.com/api`
3. 重新部署前端

完整访问链路如下：

1. 用户访问 Vercel 前端站点
2. 前端将 API 请求发送到 Render 后端
3. 后端返回登录、看板、业务数据以及 AI 流式响应

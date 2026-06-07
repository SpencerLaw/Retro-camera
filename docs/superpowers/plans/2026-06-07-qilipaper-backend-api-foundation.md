# 齐力纸业后台/API/数据库地基开发计划

**计划日期**：2026 年 6 月 7 日

**目标**：建立齐力纸业后台、API、数据库的第一期地基，让后续官网和小程序都能读取同一套内容数据。

**架构思路**：新建独立项目 `D:\webcode\qilipaper-platform`，采用前台官网、后台管理、统一 API、数据库模型分离的结构。第一期先跑通“后台编辑内容 → 数据库存储 → API 返回 → 前台读取”的最小闭环。

**技术选择**：Next.js App Router、TypeScript、MySQL、Prisma、Tailwind CSS、React、Zod、Node.js。

---

## 一、文件结构

计划新建独立项目：

```text
D:\webcode\qilipaper-platform
```

建议结构：

```text
qilipaper-platform
├─ apps
│  ├─ web
│  ├─ admin
│  └─ api
├─ packages
│  ├─ db
│  ├─ shared
│  └─ ui
├─ docs
└─ README.md
```

## 二、开发任务

### 任务 1：项目初始化

**涉及文件：**
- 新建：`D:\webcode\qilipaper-platform\package.json`
- 新建：`D:\webcode\qilipaper-platform\README.md`
- 新建：`D:\webcode\qilipaper-platform\docs\开发说明.md`

- [x] **步骤 1：创建独立项目目录**

创建 `D:\webcode\qilipaper-platform`。

- [x] **步骤 2：初始化 package.json**

添加 workspace 配置。

- [x] **步骤 3：写入 README**

说明项目包含官网、后台、API、数据库、小程序预留。

### 任务 2：数据库模型

**涉及文件：**
- 新建：`D:\webcode\qilipaper-platform\packages\db\prisma\schema.prisma`
- 新建：`D:\webcode\qilipaper-platform\packages\db\src\index.ts`

- [x] **步骤 1：写管理员和操作日志模型**

包含 `Admin`、`AdminRole`、`AdminAuditLog`。

- [x] **步骤 2：写媒体资源模型**

包含 `MediaAsset`。

- [x] **步骤 3：写页面内容模型**

包含 `Page`、`PageSection`。

- [x] **步骤 4：写 V1.1 业务模型**

包含 `HomeProductLaunch`、`Color`、`ColorFamily`、`CollectionGroup`、`Collection`、`Surface`、`Application`、`DeliveryStep`、`SampleKit`、`DownloadAsset`、`SelectorOption`、`SelectorRule`、`SampleRequest`。

### 任务 3：API 地基

**涉及文件：**
- 新建：`D:\webcode\qilipaper-platform\apps\api\src\routes\public.ts`
- 新建：`D:\webcode\qilipaper-platform\apps\api\src\routes\admin.ts`
- 新建：`D:\webcode\qilipaper-platform\apps\api\src\server.ts`

- [x] **步骤 1：建立公开 API**

先实现：

```text
GET /api/public/home
GET /api/public/pages/:slug
POST /api/public/sample-requests
POST /api/public/material-selector/recommend
```

- [x] **步骤 2：建立后台 API**

先实现：

```text
POST /api/admin/auth/login
GET /api/admin/me
GET /api/admin/pages
PUT /api/admin/pages/:id
GET /api/admin/audit-logs
```

### 任务 4：后台最小闭环

**涉及文件：**
- 新建：`D:\webcode\qilipaper-platform\apps\admin\app\sign-in\page.tsx`
- 新建：`D:\webcode\qilipaper-platform\apps\admin\app\dashboard\page.tsx`
- 新建：`D:\webcode\qilipaper-platform\apps\admin\app\content\home\page.tsx`

- [ ] **步骤 1：后台登录页**

支持管理员邮箱和密码登录。

- [ ] **步骤 2：后台首页**

显示内容统计、样品申请数量、最近操作日志。

- [ ] **步骤 3：首页内容编辑**

先支持编辑首页 V1.1 入口模块。

### 任务 5：官网读取 API

**涉及文件：**
- 新建：`D:\webcode\qilipaper-platform\apps\web\app\page.tsx`
- 新建：`D:\webcode\qilipaper-platform\apps\web\lib\api.ts`

- [ ] **步骤 1：官网读取首页 API**

从 `GET /api/public/home` 获取内容。

- [ ] **步骤 2：验证后台修改后官网变化**

后台修改首页标题，官网刷新后显示新内容。

### 任务 6：部署与文档

**涉及文件：**
- 修改：`D:\webcode\Retro-camera-main\docs\superpowers\specs\齐力纸业项目开发日志.md`
- 修改：`D:\webcode\Retro-camera-main\docs\superpowers\specs\齐力纸业服务器操作审计记录.md`

- [ ] **步骤 1：本地验证**

运行构建和测试。

- [ ] **步骤 2：部署到客户 VPS**

每次完成可验证成果后部署到 VPS。

- [ ] **步骤 3：同步文档**

记录开发动作、验证结果、部署包、服务器操作。

## 三、第一轮验收标准

第一轮后台/API 地基完成后，必须满足：

1. 可以登录后台。
2. 可以上传或选择媒体资源。
3. 可以编辑首页一个模块。
4. 数据保存到数据库。
5. API 能返回该模块数据。
6. 官网能读取并显示该数据。
7. 操作日志能记录编辑动作。
8. 样品申请可以提交并在后台看到。
9. 所有动作有文档记录。
10. 可部署到客户 VPS。

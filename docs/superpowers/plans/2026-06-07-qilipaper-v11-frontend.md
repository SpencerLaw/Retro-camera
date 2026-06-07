# 齐力纸业 V1.1 前端确认版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于客户 V1.1 PDF，在现有齐力纸业前端中补齐可给客户确认的官网页面、路由、首页入口和中英文文案。

**Architecture:** 沿用当前 Vite + React + React Router 项目，先做静态数据驱动的官网 V1.1 前端确认版。新增 V1.1 数据文件集中管理页面内容，后续后台和 API 可以直接按这些数据结构拆模型。

**Tech Stack:** Vite、React 19、TypeScript、React Router、lucide-react、CSS。

---

### Task 1: V1.1 验收脚本

**Files:**
- Create: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\scripts\verify-vanglam-v11.mjs`
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\package.json`

- [ ] **Step 1: 写入缺失页面验收脚本**

脚本检查 App 路由、页面组件导出、中英文导航文案和关键页面文案。

- [ ] **Step 2: 运行脚本确认失败**

Run: `npm run verify:v11`

Expected: FAIL，提示 V1.1 路由和组件尚未补齐。

### Task 2: V1.1 数据与页面组件

**Files:**
- Create: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\vanglamV11Data.ts`
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\VanglamPages.tsx`

- [ ] **Step 1: 新增 V1.1 双语数据**

数据包括 ArtLabel Lab、Delivery System、Material Selector、Sample System、Download Center、Insights、Wine & Spirits Labels、Collections 四层体系。

- [ ] **Step 2: 新增页面组件**

页面组件包括：

```text
VanglamArtLabelLabPage
VanglamDeliverySystemPage
VanglamMaterialSelectorPage
VanglamSampleSystemPage
VanglamDownloadsPage
VanglamInsightsPage
VanglamWineSpiritsLabelsPage
```

### Task 3: 路由、导航和首页入口

**Files:**
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\App.tsx`
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\VanglamLanguage.tsx`
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\VanglamHome.tsx`
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\locales\en.json`
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\locales\zh.json`

- [ ] **Step 1: 注册 `/vanglam/...` 路由**

新增 PDF 对应页面路由，同时保留现有页面。

- [ ] **Step 2: 补中英文导航和按钮**

导航保持精简，主导航覆盖 PDF 的关键入口；辅助入口放入首页和页脚。

- [ ] **Step 3: 首页新增 V1.1 入口区**

首页增加客户能一眼看到的新增模块入口，避免客户找不到 PDF 新内容。

### Task 4: 样式与移动端

**Files:**
- Modify: `D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source\components\vanglam\vanglam.css`

- [ ] **Step 1: 新增 V1.1 页面样式**

样式保持 Quiet Material Editorial：大留白、纸张肌理、低饱和色、细边框、真实材料感。

- [ ] **Step 2: 补移动端布局**

在 1100px、860px、560px 断点下保证无横向滚动、导航可读、卡片不挤压。

### Task 5: 验证与日志

**Files:**
- Modify: `D:\webcode\Retro-camera-main\docs\superpowers\specs\齐力纸业项目开发日志.md`

- [ ] **Step 1: 运行验收脚本**

Run: `npm run verify:v11`

Expected: PASS。

- [ ] **Step 2: 运行构建**

Run: `npm run build`

Expected: PASS。

- [ ] **Step 3: 启动本地预览并截图检查**

Run: `npm run dev -- --host 127.0.0.1 --port 5178`

检查首页、Material Selector、ArtLabel Lab、Download Center 在桌面和移动端可读。

- [ ] **Step 4: 更新开发日志**

记录 2026 年 6 月 7 日 V1.1 前端开发动作、验证命令和下一步。

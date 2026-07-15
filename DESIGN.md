# Retro Camera Design System

本设计契约记录当前项目中“特斯拉皮肤”工作台的既有视觉语言，以及本次图库与三维预览弹窗改动必须遵守的规则。它用于提炼现有界面，不代表对其他业务模块进行统一重设计。

## 1. Atmosphere & Identity

特斯拉皮肤工作台是一间克制、工程化的汽车数字展厅。皮肤图案和车辆本身是视觉主角，界面只提供必要的选择、筛选、设计和下载控制。

识别性来自三个元素：大面积中性色、Tesla Electric Blue 主操作按钮、以及在大型三维预览中被充分展示的车辆。界面不得用装饰性渐变、夸张圆角或持续动效抢夺产品注意力。

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|---|---|---|---|---|
| Canvas | `--surface-canvas` | `#F4F4F4` | `#0B0F16` | 页面背景 |
| Panel | `--surface-panel` | `#FFFFFF` | `#0F172A` | 图库、编辑面板、Dialog Header/Footer |
| Stage | `--surface-stage` | `#E5E7EB` | `#101827` | 三维车辆舞台 |
| Text primary | `--text-primary` | `#171A20` | `#F8FAFC` | 标题、按钮、正文 |
| Text secondary | `--text-secondary` | `#393C41` | `#CBD5E1` | 次级正文 |
| Text muted | `--text-muted` | `#5C5E62` | `#94A3B8` | 提示、统计、来源 |
| Border default | `--border-default` | `#EEEEEE` | `rgba(255,255,255,0.10)` | 卡片、输入框、分隔线 |
| Action primary | `--action-primary` | `#3E6AE1` | `#3E6AE1` | 主要按钮、选中状态、焦点 |
| Action hover | `--action-hover` | `#3457B1` | `#3457B1` | 主要按钮悬停 |
| Brand alert | `--brand-alert` | `#E82127` | `#E82127` | 删除、危险提示、品牌强调 |
| Status success | `--status-success` | `#047857` | `#34D399` | 本地处理、安全提示 |
| Status warning | `--status-warning` | `#B45309` | `#FBBF24` | IP/品牌风险提示 |

### Rules

- Electric Blue 只用于主要操作、选中态和键盘焦点。
- Tesla Red 只用于危险动作和少量品牌提示，不与蓝色争夺主要 CTA。
- 页面使用同一套冷灰中性色，不混入米色或紫色 SaaS 渐变。
- 三维舞台可使用深浅两种中性背景，但不得增加装饰性图案。

## 3. Typography

### Font Stack

- Primary: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono: 不在本模块使用。
- Serif: 不在本模块使用。

### Scale

| Role | Size | Weight | Line Height | Usage |
|---|---:|---:|---:|---|
| Section title | 18px | 700 | 1.3 | 页面和工作区标题 |
| Dialog title | 18px | 700 | 1.3 | 三维预览标题 |
| Body | 14px | 500 | 1.5 | 控件、按钮和说明 |
| Body strong | 14px | 700 | 1.4 | 卡片名称、主要动作 |
| Caption | 12px | 500 | 1.5 | 来源、统计、状态和风险信息 |
| Micro label | 10px | 700 | 1.3 | 缩略图中的短标签 |

### Rules

- 中文按钮保持单行，主要按钮文案不超过六个汉字。
- 不使用全大写装饰标题。
- 卡片和 Dialog 中的中文不得出现单字孤行或基线裁切。
- 正文不得小于 12px，主要交互文本不得小于 14px。

## 4. Spacing & Layout

### Base Unit

所有间距以 4px 为基础单位。

| Token | Value | Usage |
|---|---:|---|
| `--space-1` | 4px | 图标微间距 |
| `--space-2` | 8px | 紧凑控件、卡片网格 |
| `--space-3` | 12px | 默认面板内边距 |
| `--space-4` | 16px | 标准区块内边距 |
| `--space-5` | 20px | Dialog Header/Footer |
| `--space-6` | 24px | 大型内容分隔 |

### Grid

- 最大内容宽度：1440px。
- 页面横向边距：手机 12px，桌面 20px。
- 图库：手机 2 列，`sm` 3 列，`md` 4 列，`xl` 5 列，`2xl` 6 列。
- Dialog：桌面最大 1280px，约 94vw × 92dvh；手机使用全宽和 100dvh。
- 断点沿用 Tailwind：`sm 640`、`md 768`、`lg 1024`、`xl 1280`、`2xl 1536`。

### Rules

- 页面禁止横向滚动。
- 三维 Canvas 必须放在有明确高度的相对定位容器中。
- Dialog Header 和 Footer 固定留在可视区域，只有中间舞台弹性伸缩。
- 使用 `min-h-screen` 或 `100dvh`，不得在移动端依赖固定 `100vh`。

## 5. Components

### Primary Button

- **Structure**: `button` + Lucide 图标 + 单行文本。
- **Spacing**: 高度 44px，水平内边距 12px 或 16px。
- **States**: Electric Blue 默认、深蓝悬停、可见焦点环、按下轻微缩小、禁用降低透明度。
- **Accessibility**: 使用原生 `button`，文本对比度满足 WCAG AA。
- **Motion**: 100 至 200ms，只改变颜色、透明度或 transform。

### Secondary Button

- **Structure**: 原生 `button`，中性背景和细边框。
- **States**: 默认、悬停边框变蓝、焦点环、禁用。
- **Accessibility**: 图标按钮必须提供中文 `aria-label`。

### Gallery Card

- **Structure**: 整张卡片是原生 `button`，内部为方形图片、来源、风险标签、标题和“查看 3D”提示。
- **Variants**: 默认、选中、风险素材。
- **States**: 默认细边框；悬停和键盘焦点使用 Electric Blue；按下轻微缩小；图片等待时保留方形占位，失败时显示简短中文状态。
- **Accessibility**: `aria-label` 同时表达皮肤名称与“查看三维效果”。
- **Motion**: 150ms，不使用持续动画。
- **Loading**: 首次只渲染 24 张卡片，滚动到底部后每批追加 24 张；首行图片优先加载，其他图片在进入视口附近前不得设置 `src`，避免全量图库同时下载原始 PNG。
- **App Shell**: 生产环境使用 Vite/Tailwind 编译后的本地 CSS，不得同步加载 Tailwind CDN 阻塞首屏。

### Gallery Filter Bar

- **Structure**: 车型、标签、搜索、排序和统计共用同一筛选网格。
- **Responsive**: 375px 与 768px 下使用可收缩的单列轨道，所有控件不得由选项或占位文字撑出视口；桌面端再展开为五列。
- **Accessibility**: 排序按钮和下载统计在所有断点都必须完整可见，不能依靠裁切隐藏溢出。

### Mode Switch

- **Structure**: 两个并列按钮，分别对应下载和自定义设计。
- **States**: 选中项使用 Electric Blue，未选中项使用中性表面。
- **Accessibility**: 当前模式通过视觉状态和按钮文本共同表达。

### Preview Dialog

- **Structure**: 原生 `<dialog>`，内部依次为 `header`、三维 `article` 和 `footer`。
- **Variants**: 图库皮肤、自定义皮肤、纯色车身；浅色和深色模式。
- **States**: 关闭、按需加载 Dialog 代码、加载模型、三维就绪、静态图片降级、纹理失败、下载中由现有状态文本反馈。
- **Accessibility**: `showModal()`、`aria-labelledby`、可见关闭按钮、Escape 关闭、遮罩关闭、初始焦点在关闭按钮、关闭后焦点返回触发卡片。
- **Paint Controls**: Footer 内提供黑色/白色车漆两个原生按钮，使用圆形色块、`aria-pressed` 和中文 `aria-label`，不替代蓝色下载主按钮。
- **Motion**: 背景遮罩和内容只允许短暂 opacity/transform 过渡；减少动态效果时停用非必要自动旋转。

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|---|---:|---|---|
| Micro | 100-150ms | ease-out | 卡片按下、按钮反馈 |
| Standard | 200-330ms | ease-in-out | 颜色、边框、Dialog 入场 |
| 3D rotation | continuous while open | OrbitControls damping | 车辆预览 |

### Rules

- 只动画 `transform`、`opacity` 和必要的颜色属性。
- 不动画布局尺寸、边距或定位属性。
- Dialog 关闭后立即停止 `requestAnimationFrame` 并卸载 WebGL 内容。
- 系统设置 `prefers-reduced-motion: reduce` 时关闭自动旋转。
- 用户拖动和滚轮操作必须即时响应，不添加额外状态导致逐帧 React 重渲染。

## 7. Depth & Surface

### Strategy

采用“色调分层 + 细边框 + 单一突出层”的混合策略。

- 图库和编辑区主要通过白色/深色面板与页面底色区分。
- 图库卡片使用 1px 细边框，不使用重阴影。
- Dialog 使用深色半透明遮罩和轻微背景模糊，使车辆舞台成为唯一突出层。
- Dialog 容器允许克制的深阴影；内部 Header、Stage、Footer 通过色调变化分层。
- 三维车辆自身的灯光、材质和地面阴影承担主要空间感，UI 不叠加装饰性光晕。

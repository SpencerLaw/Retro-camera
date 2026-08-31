# Retro Camera Design System

本设计契约记录当前项目中“特斯拉皮肤”工作台的既有视觉语言，以及图库、车型感知自定义编辑器与三维预览弹窗必须遵守的规则。它用于提炼现有界面，不代表对其他业务模块进行统一重设计。

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

### Model-aware Wrap Studio

- **Structure**: 桌面端使用图层栏、1024×1024 中央 UV 画布和属性栏；小于 `xl` 时隐藏两侧栏，使用固定底部“图片 / 布局 / 调整 / 图层”工具 Dock 和底部抽屉。
- **Model contract**: Model 3、Model Y 及不同年款分别加载 Tesla 官方模板。车型选择器始终保留在工作台标题栏，切换车型后重新分析 mask，并对现有图片执行明确的重新适配，不能静默沿用上一车型的位置。
- **Canvas**: 用户图片是可编辑图层，官方 mask 通过非破坏性合成限制有效车身区域；模板轮廓、选中框、吸附线和编辑器背景不得进入 3D 纹理或下载 PNG。
- **Fit actions**: 提供“智能适配 / 完整显示 / 铺满车身 / 居中”，并区分“主体图片”和“连续纹理”。所有适配保持原始宽高比，不允许自动拉伸。
- **Direct manipulation**: 选中图层显示四角等比缩放控制点和旋转手柄；支持拖动、指针位置滚轮缩放、双指缩放、方向键 1px 与 Shift+方向键 10px 微调。
- **History**: 上传、删除、适配、图层排序和一次完整变换写入 Undo/Redo；拖动过程中的每一帧不写历史快照。
- **Upload**: 支持 PNG、JPEG、WebP，单张不超过 20MB；使用对象 URL 和受控工作副本，删除或卸载编辑器时释放 URL。界面必须明确说明图片仅在浏览器本地处理。
- **Responsive**: 375px 下标题和车型选择器不得截断；工具 Dock 固定在视口底部，工具抽屉使用全屏固定遮罩；375、768、1280 均不得产生横向滚动。
- **3D parity**: 2D 编辑、三维预览和下载必须使用同一张 1024×1024 输出纹理；纹理更新防抖，拖动时不得逐帧调用 `toDataURL`。

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

---

# Morning Energy Tree Visual Modes

本节只约束 `public/morning-energy-tree/`。原有“晨光森语”与新增“星芽奇境”是并列的成长视觉；“全班早读 / 小组竞赛”仍是独立的业务模式。

## 1. Atmosphere & Identity

- **晨光森语**：明亮蓝天、太阳、云朵与从树冠进入的光合作用能量，保持当前活泼课堂感。
- **星芽奇境**：严格沿用用户参考图的深钴蓝手绘星空、白色萌芽光纹、薄荷与金绿色水彩雾、鲜绿圆丘，以及由柔软上扬叶片堆叠成的圆润高冠大树；不复制品牌标识或角色。
- 星芽奇境的记忆点是“地底能量球弹出地面，被根系吸引并沿树干点亮树冠”。每次朗读产生的动画都必须表达能量输入，不能成为无意义的持续装饰。

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Forest sky deep | `--forest-sky-deep` | `#0646A4` | 星空顶部的钴蓝底色 |
| Forest sky bright | `--forest-sky-bright` | `#149DCC` | 天空近地平线 |
| Forest mist | `--forest-mist` | `#D7FFF2` | 远景雾与能量光纹 |
| Forest hill light | `--forest-hill-light` | `#B8EE58` | 山丘受光面 |
| Forest hill mid | `--forest-hill-mid` | `#64C85B` | 山丘主体 |
| Forest leaf deep | `--forest-leaf-deep` | `#147847` | 树冠暗部 |
| Forest leaf mid | `--forest-leaf-mid` | `#47B84F` | 树冠主体 |
| Forest leaf light | `--forest-leaf-light` | `#D4F45B` | 针叶高光 |
| Forest energy cyan | `--forest-energy-cyan` | `#8EFFF0` | 能量球外辉光 |
| Forest energy lime | `--forest-energy-lime` | `#D8FF66` | 能量球核心与吸收波 |
| Forest energy gold | `--forest-energy-gold` | `#FFE982` | 强朗读与最终树高光 |
| Forest trunk dark | `--forest-trunk-dark` | `#69412F` | 树干暗部 |
| Forest trunk light | `--forest-trunk-light` | `#C88945` | 树干受光面 |

星芽入口与顶部进度面板的半透明状态色同样必须命名，禁止在组件规则中重复写入 `rgba(...)`：

| Role | Token | Value |
|---|---|---|
| Selector hover | `--forest-selection-hover-border` | `rgba(216, 255, 102, 0.58)` |
| Selector active border | `--forest-selection-active-border` | `rgba(142, 255, 240, 0.82)` |
| Selector active wash | `--forest-selection-active-cyan` / `--forest-selection-active-lime` | `rgba(142, 255, 240, 0.15)` / `rgba(216, 255, 102, 0.08)` |
| Preview glass | `--forest-preview-border` / `--forest-preview-glare` | `rgba(255, 255, 255, 0.18)` / `rgba(255, 255, 255, 0.32)` |
| Selector indicator | `--forest-check-*` | 白色边框、深青内圈与青色辉光 |
| Forest progress stage | `--forest-stage-*` | 青色边框、黄绿光晕与蓝绿面板渐变 |

入口选择器的结构令牌统一使用 `--forest-selector-*`：`overlay/dialog/kicker/card/text/step` 描述颜色角色，`space-1..6` 形成 4px 间距节奏，`type-step/caption/kicker/section/body/card` 约束字号，`radius-preview/card/dialog` 约束圆角。选择器规则不得再写一次性颜色、字号或间距字面量。

色彩必须形成“深青蓝天空 -> 薄荷雾 -> 黄绿山丘 -> 暖棕树干”的冷暖层次，不能退化为单一青色主题。Canvas 中对应颜色可以使用同值常量，CSS 中入口组件使用上述变量。

## 3. Typography

- 沿用早读树现有系统字体，不引入网络字体。
- 模式 Dialog 标题：`clamp(1.8rem, 4vw, 2.75rem)`，900，行高 1.08。
- 分组标题与模式名称：14-18px，800-950；说明文字：12-14px，行高 1.5。
- 教室白板下中文模式名称保持完整词组，不产生单字孤行，并保证远距离可读。

## 4. Spacing & Layout

- 模式 Dialog 最大宽度 820px，最大高度 92dvh，可纵向滚动但页面不得横向滚动。
- 视觉模式选择使用两段式双列选项，面向桌面与教室白板，每项最小交互高度 72px。
- 业务模式卡保持双列；视觉模式先于业务模式呈现，表达“先选树如何成长，再选今天怎样早读”。
- 顶部工具栏允许换行，成长视觉切换不得挤压进度条或倒计时。

## 5. Components

### Growth Visual Selector

- **Structure**：原生按钮组成的 `radiogroup`，两项为“晨光森语 / 星芽奇境”，包含实时缩略景、名称和一句结果描述。
- **States**：默认、悬停、键盘焦点、选中；选中项使用移动高光感、`aria-pressed=true` 和清晰边框共同表达。
- **Behavior**：成长视觉只允许在首次入口选择，确认全班/竞赛后即锁定；早读页内不提供成长视觉切换。顶部“切换模式”只允许切换全班/竞赛，不得重新显示成长视觉选项。
- **Display target**：以教室白板与桌面 Chrome 为目标，重点验收 1280×720、1280×800、1920×1080 与超宽白板；不新增手机端专项布局。减少动态效果时缩略景和选中反馈不做位移。

### Forest Energy Orb

- **Appearance**：参考用户追加的绿色重量球图片，使用荧光黄绿透明球壳、白色弧形高光、青蓝外辉光和居中的克数标签；不得复制图片背景或其他品牌元素。
- **Audio mapping**：小声朗读仍会偶尔出现 1 个 `2-8g` 轻球；声音越大，生成概率、同帧数量和重量共同提升，强朗读可出现 `25-50g` 重球。重量只控制视觉尺寸、弹跳高度、吸收速度与冲击波，不改变业务成长公式。
- **States**：地底蓄能、破土弹升、短暂停驻、根系吸附、树冠回响。
- **Performance**：与现有能量队列共用上限；历史轨迹长度固定；低功耗使用纯色光斑并减少轨迹点，极低功耗一次只生成一个球。
- **Accessibility**：`prefers-reduced-motion` 下取消弹跳和横向摆动，改为短距离淡入吸收；能量反馈仍然可见。

### Starbud Forest Tree

- **Structure**：粗壮弯曲的暖金棕主干、多级上扬枝臂、一个连续的水彩树冠底形，以及由宽而柔软的长叶笔触构成的圆锥形高冠；禁止使用可辨认的圆形/椭圆形深绿叶团、笔直草刺、参考图贴图或截图淡入。树从幼苗开始完全由实时 Canvas 路径逐段生长，最终形态只参考原图的树形、色彩和手绘质感。
- **Canopy anatomy**：树冠顶部收拢成柔圆尖冠，中段最饱满，底部由两侧低垂叶片包住可见枝杈；暗青绿只用于叶片间隙，主体是鲜绿，受光叶片使用黄绿与少量暖金。
- **Painterly material**：背景和树冠使用确定性半透明笔触、叠色和细颗粒形成蜡笔/水彩质感。轮廓先稳定，再随性能档只减少内部笔触密度，不能改变树形。
- **Stages**：种子与萌芽沿用生命周期；主干先向上延伸并持续增粗，一级枝在对应主干节点长成后伸展，二级枝等待父枝大部分完成后接力生长，叶片再从成熟枝端依次舒展；最终阶段只补足连续、圆润而高耸的完整树冠与能量光点。
- **Quality tiers**：高 / 平衡 / 低 / 极低分别降低内部叶片、星尘、雾带和光晕数量；完整树冠轮廓、粗树干、山丘层次与能量反馈在所有档位保持一致。

## 6. Motion & Interaction

| Token | Value | Usage |
|---|---|---|
| `--motion-visual-select` | 180ms ease-out | 入口与工具栏选中反馈，参考 beui `tabs` 的可中断选中态 |
| `orb-emerge` | spring-like, 420-620ms | 地底弹升，带一次收敛回弹 |
| `orb-absorb` | 360-520ms ease-in | 能量球被根系捕获 |
| `root-transfer` | 420-700ms ease-in-out | 能量沿树干进入树冠 |
| `canopy-echo` | 500-900ms ease-out | 树冠吸收后的扩散光波 |

- 参考 beui `shader-background`：减少动态效果时冻结星光和雾带，不移除空间层次。
- 每个粒子必须可被下一帧重定向或自然结束，不排队阻塞输入。
- Canvas 循环只在早读监听期间运行；模式切换不会额外创建第二个 `requestAnimationFrame`。

## 7. Depth & Surface

- 星空由钴蓝纵向色阶、多层手绘水彩雾带、确定性星尘与少量十字星构成；不使用大位图或 WebGL shader。
- 能量球采用“外层柔光 + 彩色壳 + 白色核心 + 短轨迹”四层结构；低功耗降为两层。
- 树冠通过连续柔软底形、青绿暗部叶片、鲜绿主体叶片和黄绿受光长叶建立体积；树干使用深棕外缘、金棕主体与暖黄高光笔触。

## 8. Accessibility, Performance & Accepted Debt

- 所有新增按钮使用原生 `button`、可见焦点、`aria-pressed`/`radiogroup` 语义，触控目标不小于 44px。
- 继续使用当前 Canvas 的 CSS 像素尺寸，不按设备像素比扩张 backing store，避免高分屏内存翻倍。
- 新模式不得创建全屏离屏 Canvas、纹理贴图或无限数组；所有特效必须进入 `FX_LIMITS` 管理并在重置、页面隐藏时释放。
- 可接受债务：Canvas 场景本身尚无屏幕阅读器文本等价物；本次通过可访问的模式控件与现有进度/分贝 DOM 保留关键信息，后续可增加场景状态的 `aria-live` 摘要。

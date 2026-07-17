# Tesla 车型感知自定义车衣工作台设计

日期：2026-07-17

## 目标

把当前“上传框 + 小预览 + 裁剪画布 + 图层卡片 + 属性卡片”的自定义页面重构为一个连续的设计工作台。客户选择 Tesla 车型并上传图片后，系统先依据该车型的官方 UV 模板完成可靠的初始适配，再允许客户在画布中直接移动、缩放、旋转和裁剪，并通过 3D 车型预览确认最终效果。

这里的“智能”定义为车型感知、规则确定且可解释的自动适配，不把普通矩形裁剪或简单蒙版宣称为 AI。

## 调研结论

### Tesla 官方格式

Tesla 官方 `custom-wraps` 仓库为每个车型/年款提供独立模板。官方流程要求选择与车辆完全匹配的模板，在模板白色区域内设计，并导出 512×512 至 1024×1024 的 PNG，单文件不超过 1 MB。

- 官方仓库：https://github.com/teslamotors/custom-wraps
- 官方说明：https://github.com/teslamotors/custom-wraps/blob/master/README.md

不同车型不能安全共用同一套裁剪参数。Model 3、Model 3 2024+、Model Y、Model Y 2025+ Standard 与 Premium 都需要独立模板和对应 3D 模型。

### 成熟开源实现

Tesla Wrap Studio 使用 React、Konva、分层 2D 画布和车型专属模板：

- `EditorCanvas` 在固定 1024×1024 舞台上编辑图层，并以车型模板做 `destination-in` 裁剪。
- `TransformerWrapper` 为选中图片提供缩放和旋转控制点。
- 导出时隐藏编辑辅助元素，并保持严格的 1024×1024 像素映射。
- 画布变化后把同一张纹理同步给对应 3D 车型预览。
- 每个车型都有独立的模板目录和导出文件名。

参考：

- 项目：https://github.com/dtschannen/Tesla-Wrap-Studio
- 编辑器：https://github.com/dtschannen/Tesla-Wrap-Studio/blob/7e40033030a7b58cef52270495a51ea5e98dbcbf/src/editor/EditorCanvas.tsx
- 图片图层：https://github.com/dtschannen/Tesla-Wrap-Studio/blob/7e40033030a7b58cef52270495a51ea5e98dbcbf/src/editor/components/layers/ImageLayer.tsx
- 变换控制：https://github.com/dtschannen/Tesla-Wrap-Studio/blob/7e40033030a7b58cef52270495a51ea5e98dbcbf/src/editor/components/TransformerWrapper.tsx
- 3D 同步：https://github.com/dtschannen/Tesla-Wrap-Studio/blob/7e40033030a7b58cef52270495a51ea5e98dbcbf/src/viewer/GodotViewer.tsx

### UV 映射限制

Tesla 官方目前只公开静态 UV 模板，没有公开车门、引擎盖、车顶等命名面板的 UV 边界。官方仓库 issue #80 也确认社区工具需要自行解释或反向标定每个车型的 UV 区域。因此不能只靠一套通用矩形参数，让任意照片在所有车型上都自动达到专业排版效果。

- https://github.com/teslamotors/custom-wraps/issues/80
- https://github.com/teslamotors/custom-wraps/issues/26

Reddit 的 UV 贴图讨论也反复出现两个风险：左右 UV 重叠会导致文字或标志镜像；普通平面图片跨多个 UV 岛时会被拉伸或切断。因此最终效果必须依靠车型专属模板和 3D 复核，而不是只看平面裁剪框。

- https://www.reddit.com/r/blenderhelp/comments/xhhyd3/how_do_i_flip_this_texture_ive_tried_to_mirror/
- https://www.reddit.com/r/blender/comments/rtvuzp/need_help_with_texture_painting_and_uv_maps/

## 核心产品方案

### 1. 车型先于上传

工作台顶部持续显示当前车型。切换车型时加载对应的：

- Tesla 官方 `template.png`
- 官方 `vehicle_image.png`
- 当前项目已有的 GLTF/OBJ 3D 模型与 UV 通道
- 车型专属车身 mask 和有效 UV 边界
- 后续可扩展的面板区域元数据

首期覆盖当前项目已有的五个车型：

- Model 3（2024 前）
- Model 3（2024+）标准/长续航
- Model Y（2025 前）
- Model Y（2025+）标准版
- Model Y（2025+）长续航

切换车型不能偷偷沿用上一车型的裁剪结果。系统先询问/提示重新适配，并保存每个车型各自的图层变换状态，用户切回时可恢复。

### 2. 工作台布局

桌面端采用三段式布局：

- 左侧：紧凑图层栏，显示缩略图、名称、顺序、隐藏和删除。
- 中央：最大化的 1024×1024 UV 编辑画布。
- 右侧：当前选中图层的属性、车型颜色和适配方式。

移动端优先显示画布，底部固定“图片 / 布局 / 调整 / 图层”四个入口，点击后打开底部工具抽屉。不得横向溢出。

未上传时不再显示独立的小预览框。中央画布本身就是上传空态，支持点击和拖放，并提示 PNG、JPEG、WebP、文件限制和“仅在本地处理”。

### 3. 车型感知自动适配

上传成功后建立图片图层，并根据当前车型 mask 计算有效 UV 包围盒。初始状态使用“智能适配”，规则如下：

1. 保持图片宽高比，不拉伸。
2. 依据图片宽高比和车型有效 UV 区域选择 `contain` 或 `cover` 初始缩放。
3. 默认焦点为图片中心；用户拖动后将用户位置视为明确意图，不再自动改写。
4. 图层始终可以超出 mask，但车身预览和导出只显示 mask 内有效像素。
5. 对过度放大的低分辨率图片显示清晰度警告，不阻止继续操作。

右侧提供四个一键操作：

- 智能适配：恢复车型感知的推荐位置和比例。
- 完整显示：在有效 UV 范围内尽量保留整张图片。
- 铺满车身：覆盖有效 UV 范围，允许边缘被裁切。
- 居中：保留当前缩放，仅把图片中心移到车型有效 UV 中心。

“连续图案”与“主体图片”不能混为一个算法。首期增加明确模式：

- 主体图片：适合照片、人物、Logo，以完整可控和用户精调为主。
- 连续纹理：适合迷彩、渐变、重复花纹，优先铺满整个 UV 模板。

不在首期承诺自动识别人脸或自动判断 Logo 语义。如果未来加入焦点识别，应作为可关闭的增强功能，不能覆盖用户已调整的位置。

### 4. 直接操控

选中图层后在画布上显示边框、四角等比缩放控制点和旋转手柄：

- 拖动图片：移动。
- 拖动四角：等比缩放。
- 拖动旋转手柄：自由旋转。
- 鼠标滚轮：围绕指针位置缩放选中图片。
- 双指手势：移动与缩放。
- 方向键：1 px 微调；Shift + 方向键：10 px 微调。
- 吸附车型 UV 中心线并显示短暂参考线。

同时保留数值滑杆/输入，作为精确控制和无障碍替代操作。

### 5. 裁剪与蒙版

图片图层保留完整原图和非破坏性变换，不在上传阶段真正删除像素。画布渲染分为：

1. 底层车漆颜色。
2. 用户图片与其他图层。
3. 当前车型官方 mask，使用 `destination-in` 限制有效车身区域。
4. 半透明官方模板/UV 轮廓辅助层，仅编辑时显示，不进入导出。
5. 选中框、吸附线等 UI 层，不进入导出或 3D 纹理。

这比普通矩形裁剪更适合 Tesla，因为客户实际编辑的是一张车型专属 UV 纹理，而不是一张汽车侧视图照片。

### 6. 3D 预览

保留当前项目 `TslVehicle3DPreview` 的车型专属 UV 映射能力。编辑画布变更后生成无辅助线纹理，并以约 150–250 ms 防抖更新预览纹理。

首期 3D 仍通过“查看 3D 效果”打开大 Dialog，避免编辑页同时长期运行 2D 和高负载 3D。Dialog 支持前、后、左、右、顶部快捷视角，使客户能快速发现图片断裂、镜像或重要内容落在保险杠接缝的问题。

### 7. 图片读取与性能

- 支持 PNG、JPEG、WebP。
- 校验 MIME、文件大小和图片实际尺寸。
- 使用 `URL.createObjectURL` 和异步图片解码，替代长期保存 Base64。
- 根据浏览器能力使用 `createImageBitmap`。
- 超大图片先生成适合编辑的工作副本，最长边限制在合理范围；导出目标仍为 1024×1024。
- 切换或删除图片时及时 `revokeObjectURL`。
- 拖动过程中只重绘画布，不每一帧执行 `toDataURL`；3D 纹理更新使用防抖。

### 8. 图层与撤销

保留多图层能力，并新增：

- 图层缩略图、隐藏、锁定、排序、复制、删除。
- Undo / Redo，至少记录上传、删除、移动结束、缩放结束、旋转结束、适配模式和图层排序。
- 拖动中的每一帧不进入历史，只在一次手势结束时写入快照。

### 9. 错误与提示

- 不支持格式：说明支持的格式。
- 文件过大：提示压缩或更换图片。
- 图片分辨率不足：显示黄色清晰度提示，不使用阻断式错误。
- 官方模板或 3D 模型加载失败：保留编辑状态并提供重试。
- 切换车型：明确提示当前图片会按新车型重新适配。

## 技术方案

推荐引入 `konva` 与 `react-konva` 承担图层、Transformer、Pointer/Touch 和分层导出。原因是当前原生 Canvas 已经承担多图层、旋转、命中测试和 mask，继续手写缩放手柄、旋转手柄、双指手势与历史系统会显著增加交互缺陷风险；成熟 Tesla Wrap Studio 也采用同一类架构。

不复制 Tesla Wrap Studio 的整套产品或 Godot 预览。只借鉴经过验证的 2D 编辑器模式，继续使用本项目已有的车型来源、视觉设计系统和 Three.js 预览。

建议拆分：

- `components/tsl-skin/TslWrapStudio.tsx`：工作台布局和响应式工具抽屉。
- `components/tsl-skin/TslWrapCanvas.tsx`：Konva Stage、mask、图层和 Transformer。
- `components/tsl-skin/TslWrapLayers.tsx`：图层列表。
- `components/tsl-skin/TslWrapInspector.tsx`：适配、变换、透明度、翻转和车漆。
- `components/tsl-skin/useTslWrapEditor.ts`：状态、历史、上传对象 URL 生命周期。
- `components/tsl-skin/modelProfiles.ts`：车型模板、模型和适配元数据。
- `components/tsl-skin/wrapImage.ts`：图片校验、解码、缩放和导出工具。

`TslSkinApp.tsx` 负责图库/自定义工作区切换和 3D Dialog，不继续包含全部编辑器细节。

## 验收标准

1. 五个现有车型分别加载正确官方模板和对应 3D 模型。
2. 上传横图、竖图、方图后都有合理的车型感知初始位置，且不拉伸。
3. 客户可以在画布中直接移动、四角缩放和旋转。
4. 鼠标、触控和键盘均能完成核心调整。
5. “智能适配 / 完整显示 / 铺满车身 / 居中”行为稳定且可恢复。
6. 2D 编辑、3D 预览和导出 PNG 使用同一份车型纹理。
7. 切换车型不会错误沿用上一车型的 UV 位置。
8. 导出不包含模板线、选中框、吸附线或编辑器背景。
9. 375、768、1280 宽度无横向溢出，手机画布和底部工具可操作。
10. 完成桌面与移动端双路独立视觉 QA，并更新项目 `DESIGN.md`。

## 暂不包含

- 服务端 AI 生图、AI 人脸/主体检测或背景移除。
- 物理车衣生产所需的真实尺寸、出血、切割线和打印 PDF。
- Tesla 尚未公开的精确命名车身面板数据。
- 自动保证任何文字或 Logo 在所有 UV 岛上都不镜像；用户仍需通过 3D 视角确认。

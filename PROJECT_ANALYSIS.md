# Retro Camera 项目分析

## 项目概述

这是一个复古风格的即时相机 Web 应用，使用 React + Vite + TypeScript 构建。应用模拟了经典的拍立得相机体验，具有精美的 UI 设计和丰富的交互功能。

## 技术栈

- **前端框架**: React 19.2.0
- **构建工具**: Vite 6.2.0
- **语言**: TypeScript 5.8.2
- **UI 库**: Lucide React (图标)
- **AI 服务**: Google Gemini API (@google/genai)
- **样式**: Tailwind CSS (内联样式)

## 核心功能

### 1. 相机功能
- **实时摄像头预览**: 使用 `getUserMedia` API 访问设备摄像头
- **高清拍摄**: 支持最高 1920x1080 分辨率
- **方形裁剪**: 自动裁剪为正方形格式（拍立得风格）
- **镜像效果**: 前置摄像头自动镜像显示

### 2. 滤镜系统
应用内置 9 种滤镜效果：
- **原图** (normal): 标准模式
- **鲜艳** (vivid): 高对比度、高饱和度
- **胶片** (soft): 复古胶片风格
- **清新** (clean): 冷色调、低对比度
- **暖阳** (warm): 暖色调、怀旧风格
- **浓郁** (rich): 高饱和度、暖色调
- **赛博** (cyber): 赛博朋克风格
- **糖果** (candy): 粉色调、甜美风格
- **复古** (retro): 强烈棕褐色调

### 3. 照片墙功能
- **拖拽排列**: 照片可以自由拖拽到任意位置
- **层级管理**: 点击照片可提升到最上层
- **旋转效果**: 每张照片随机旋转角度，模拟真实拍立得
- **本地存储**: 使用 localStorage 持久化保存照片
- **删除功能**: 支持删除单张照片

### 4. AI 图片处理
- **Gemini 集成**: 使用 Google Gemini 2.5 Flash Image 模型
- **图片重混**: 支持基于提示词对图片进行 AI 处理

### 5. 交互体验
- **音效反馈**: 
  - 快门声（拍照时）
  - 点击声（切换滤镜时）
  - 机械马达声（照片弹出时）
- **视觉反馈**:
  - 闪光灯效果
  - 照片弹出动画
  - 相机弹出动画
  - 滤镜切换动画

## 项目结构

```
Retro-camera-main/
├── App.tsx                 # 主应用组件，管理照片状态
├── index.tsx               # 应用入口
├── index.html              # HTML 模板
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── package.json            # 项目依赖
├── constants.ts            # 常量定义（滤镜列表等）
├── types.ts                # TypeScript 类型定义
├── components/
│   ├── Camera.tsx          # 相机组件（核心）
│   ├── DraggablePhoto.tsx  # 可拖拽照片组件
│   ├── FilterSelector.tsx  # 滤镜选择器
│   ├── Gallery.tsx         # 相册组件
│   └── PhotoPreview.tsx    # 照片预览组件
├── hooks/
│   └── useCamera.ts        # 摄像头 Hook
└── services/
    └── geminiService.ts    # Gemini AI 服务
```

## 核心组件分析

### Camera.tsx
- 相机 UI 设计，模拟复古拍立得相机
- 包含取景器、快门按钮、滤镜显示器等元素
- 处理拍照逻辑、滤镜切换、音效播放

### useCamera.ts
- 封装摄像头访问逻辑
- 支持前后摄像头切换
- 处理摄像头权限和错误

### DraggablePhoto.tsx
- 实现照片拖拽功能
- 管理照片位置和层级
- 处理照片删除和聚焦

## 环境配置

需要设置环境变量：
- `GEMINI_API_KEY`: Google Gemini API 密钥（用于 AI 图片处理功能）

配置文件：`.env.local`

## 运行方式

1. 安装依赖：`npm install`
2. 配置环境变量：在 `.env.local` 中设置 `GEMINI_API_KEY`
3. 启动开发服务器：`npm run dev`
4. 访问：http://localhost:3000

## 特色亮点

1. **精美的 UI 设计**: 完全模拟复古拍立得相机的外观和交互
2. **流畅的动画**: 照片弹出、闪光灯、滤镜切换等动画效果
3. **音效系统**: 使用 Web Audio API 生成各种音效
4. **本地存储**: 照片自动保存到浏览器本地存储
5. **响应式设计**: 适配不同屏幕尺寸
6. **AI 集成**: 支持使用 Gemini 进行图片处理

## 依赖项

### 生产依赖
- `react`: ^19.2.0
- `react-dom`: ^19.2.0
- `lucide-react`: ^0.554.0 (图标库)
- `@google/genai`: ^1.30.0 (Gemini AI SDK)

### 开发依赖
- `vite`: ^6.2.0
- `@vitejs/plugin-react`: ^5.0.0
- `typescript`: ~5.8.2
- `@types/node`: ^22.14.0

## 浏览器兼容性

- 需要支持 `getUserMedia` API（现代浏览器）
- 需要支持 Web Audio API
- 建议使用 Chrome、Firefox、Safari、Edge 等现代浏览器

## 未来改进方向

1. 添加更多滤镜效果
2. 支持照片导出功能
3. 添加照片编辑功能
4. 支持多设备同步
5. 添加社交分享功能
6. 优化移动端体验


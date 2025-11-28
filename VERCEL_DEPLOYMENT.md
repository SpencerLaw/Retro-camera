# Vercel 部署说明

## 🔐 环境变量配置（重要！）

### 在 Vercel 中设置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入您的项目
3. 点击 **Settings** → **Environment Variables**
4. 添加以下环境变量：

**⚠️ 重要：使用 `GEMINI_API_KEY`（不要加 `VITE_` 前缀）**

```
变量名: GEMINI_API_KEY
值: AIzaSyDRRmj9fq3dCsVGbRZ4rwd4UYcd3xqMxAc
环境: Production, Preview, Development (全部选择)
```

### 为什么不用 `VITE_` 前缀？

- `VITE_` 前缀的环境变量会被 Vite **自动暴露**到客户端代码
- 这会导致 API Key 被任何人看到
- 使用 `GEMINI_API_KEY`（不加前缀）只在服务器端可用，不会暴露到客户端

---

## 📁 项目结构

```
Retro-camera-main/
├── api/                    # Vercel Serverless Functions
│   └── gemini/
│       ├── weather.ts      # 天气 API 代理
│       ├── fortune.ts      # 灵签 API 代理
│       └── remix.ts        # 图片重混 API 代理
├── dist/                   # 构建输出（Vercel 会自动构建）
└── vercel.json            # Vercel 配置
```

---

## 🚀 部署步骤

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "安全修复：使用 Serverless Functions 保护 API Key"
git push origin main
```

### 2. Vercel 自动部署

- Vercel 会自动检测到代码推送
- 自动运行 `npm run build`
- 自动部署到生产环境

### 3. 验证部署

1. 访问您的 Vercel 部署 URL
2. 打开浏览器开发者工具（F12）
3. 检查 Network 标签
4. **确认**：在 JavaScript 文件中**找不到** API Key
5. **确认**：API 调用通过 `/api/gemini/*` 路由

---

## ✅ 安全检查清单

部署后，请确认：

- [ ] 在 Vercel 中设置了 `GEMINI_API_KEY` 环境变量（不加 `VITE_` 前缀）
- [ ] 构建产物中不包含 API Key
- [ ] 浏览器开发者工具中看不到 API Key
- [ ] 所有功能正常工作
- [ ] API 调用通过 `/api/gemini/*` 路由

---

## 🔧 本地开发

### 开发环境变量

创建 `.env.local` 文件（**不要提交到 Git**）：

```env
GEMINI_API_KEY=AIzaSyDRRmj9fq3dCsVGbRZ4rwd4UYcd3xqMxAc
```

### 运行本地开发服务器

```bash
npm run dev
```

### 测试 API 路由

本地开发时，Vercel CLI 会自动处理 API 路由。如果使用 Vite 开发服务器，可能需要使用 Vercel CLI：

```bash
npx vercel dev
```

---

## 📝 注意事项

1. **永远不要**在代码中硬编码 API Key
2. **永远不要**使用 `VITE_` 前缀存储敏感信息
3. **永远不要**提交 `.env.local` 到 Git
4. **确保** `.gitignore` 包含 `.env*` 文件

---

## 🆘 故障排除

### API 调用失败

1. 检查 Vercel 环境变量是否正确设置
2. 检查 API Key 是否有效
3. 查看 Vercel 函数日志：Dashboard → Functions → 查看日志

### 本地开发 API 路由不工作

使用 Vercel CLI 运行：
```bash
npx vercel dev
```

---

**现在您的 API Key 已经安全地保存在服务器端，不会暴露在客户端代码中！** ✅


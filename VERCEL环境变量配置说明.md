# ⚠️ 重要：Vercel 环境变量配置说明

## 🔴 当前问题

您在 Vercel 中配置的是 `VITE_GEMINI_API_KEY`，这是**不安全的**！

**原因：**
- `VITE_` 前缀的环境变量会被 Vite **自动暴露**到客户端代码
- 这意味着您的 API Key 仍然会被打包到前端代码中
- 任何人都可以在浏览器中看到您的 API Key

---

## ✅ 正确的配置方法

### 步骤 1：删除旧的环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入您的项目
3. 点击 **Settings** → **Environment Variables**
4. **删除** `VITE_GEMINI_API_KEY`（如果存在）

### 步骤 2：添加新的环境变量

添加以下环境变量：

```
变量名: GEMINI_API_KEY
值: AIzaSyDRRmj9fq3dCsVGbRZ4rwd4UYcd3xqMxAc
环境: Production, Preview, Development (全部选择)
```

**⚠️ 重要：**
- ✅ 使用 `GEMINI_API_KEY`（**不要**加 `VITE_` 前缀）
- ✅ 选择所有环境（Production, Preview, Development）
- ✅ 点击 **Save**

### 步骤 3：重新部署

1. 在 Vercel Dashboard 中，点击 **Deployments**
2. 找到最新的部署
3. 点击 **...** → **Redeploy**
4. 或者推送新的代码触发自动部署

---

## 🔍 如何验证配置正确

### 方法 1：检查构建产物

1. 部署完成后，访问您的网站
2. 打开浏览器开发者工具（F12）
3. 进入 **Sources** 或 **Network** 标签
4. 搜索 `AIza` 或 `GEMINI_API_KEY`
5. **应该找不到任何 API Key**

### 方法 2：检查 API 调用

1. 打开浏览器开发者工具（F12）
2. 进入 **Network** 标签
3. 使用应用功能（如搜索天气）
4. **应该看到** API 调用通过 `/api/gemini/weather` 路由
5. **不应该看到**直接调用 Google Gemini API

---

## 📋 配置检查清单

- [ ] 删除了 `VITE_GEMINI_API_KEY` 环境变量
- [ ] 添加了 `GEMINI_API_KEY` 环境变量（不加 VITE_ 前缀）
- [ ] 选择了所有环境（Production, Preview, Development）
- [ ] 重新部署了应用
- [ ] 验证构建产物中不包含 API Key
- [ ] 验证所有功能正常工作

---

## 🆘 如果遇到问题

### API 调用失败

1. **检查环境变量名称**：确保是 `GEMINI_API_KEY`（不是 `VITE_GEMINI_API_KEY`）
2. **检查环境变量值**：确保 API Key 正确
3. **检查环境选择**：确保选择了 Production 环境
4. **查看 Vercel 函数日志**：
   - Dashboard → Functions
   - 点击对应的函数
   - 查看日志中的错误信息

### 本地开发

如果需要本地开发，创建 `.env.local` 文件：

```env
GEMINI_API_KEY=AIzaSyDRRmj9fq3dCsVGbRZ4rwd4UYcd3xqMxAc
```

然后使用 Vercel CLI 运行：
```bash
npx vercel dev
```

---

## ✅ 配置完成后

配置完成后，您的 API Key 将：
- ✅ 只存在于 Vercel 服务器端
- ✅ 不会出现在客户端代码中
- ✅ 不会出现在构建产物中
- ✅ 不会被 Git 提交
- ✅ 完全安全！

---

**请立即按照上述步骤重新配置环境变量！**


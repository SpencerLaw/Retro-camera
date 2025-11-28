# 🔴 API 密钥安全分析报告 - 紧急

## ⚠️ 严重安全问题确认

**您的 Gemini API Key 已经暴露在构建后的代码中！**

---

## 🔍 发现的问题

### 1. 构建产物中暴露的 API Key

在 `dist/assets/index-CUrw7ZIQ.js` 文件中发现硬编码的 API Key：

**位置 1（第289行）：**
```javascript
const i="AIzaSyD8SKrVNvkgfJ2gy4bpo4KaUFS6zUdbt5g";
Qr=new Up({apiKey:i})
```

**位置 2（第315行）：**
```javascript
kp=()=>new Up({apiKey:"AIzaSyD8SKrVNvkgfJ2gy4bpo4KaUFS6zUdbt5g"})
```

### 2. 暴露原因分析

#### 问题 1：Vite 配置注入密钥到客户端
`vite.config.ts` 中的 `define` 配置会将 API 密钥直接注入到客户端代码：

```typescript
define: {
  'process.env.API_KEY': JSON.stringify(apiKey),
  'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
}
```

**这意味着：**
- ✅ 密钥会被打包到 `dist/` 目录的 JavaScript 文件中
- ✅ 任何人都可以在浏览器开发者工具中查看源代码
- ✅ 任何人都可以在网络请求中看到密钥
- ✅ 攻击者可以使用您的密钥进行 API 调用，产生费用

#### 问题 2：环境变量命名错误
在 `fortune-sticks/services/geminiService.ts` 和 `services/geminiService.ts` 中：

```typescript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ...
```

**Vite 规则：**
- ⚠️ 所有以 `VITE_` 开头的环境变量**会被自动暴露**到客户端代码
- ⚠️ 这是 Vite 的设计特性，用于前端环境变量

#### 问题 3：直接使用 process.env
在 `nanoworld-weather/services/geminiService.ts` 中：

```typescript
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
```

这个 `process.env.API_KEY` 会被 `vite.config.ts` 的 `define` 注入，最终暴露到客户端。

---

## 🚨 当前风险

### 立即风险
1. **API Key 已暴露**：任何访问您网站的人都可以看到密钥
2. **未授权使用**：攻击者可以使用您的密钥进行 API 调用
3. **费用损失**：可能导致意外的 API 费用
4. **配额耗尽**：可能导致 API 配额被耗尽
5. **安全漏洞**：违反了 API 密钥安全最佳实践

### 如果已部署到 Vercel
- ✅ 构建产物会被部署到 CDN
- ✅ 任何人都可以通过浏览器访问
- ✅ 密钥完全暴露在客户端代码中

---

## ✅ 解决方案（必须立即执行）

### 方案 1：使用 Vercel Serverless Functions（强烈推荐）

这是**唯一安全**的方式，将 API 密钥保存在服务器端。

#### 步骤 1：创建 API 路由

创建 `api/gemini/weather.ts`:
```typescript
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const { city } = req.body;
    
    // 调用 Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the current weather for ${city}...`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    res.status(200).json({ data: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'API call failed' });
  }
}
```

#### 步骤 2：修改前端代码

将 `nanoworld-weather/services/geminiService.ts` 改为：

```typescript
export const fetchWeatherAndContext = async (city: string): Promise<WeatherData> => {
  try {
    const response = await fetch('/api/gemini/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const data = await response.json();
    return JSON.parse(data.data) as WeatherData;
  } catch (error) {
    console.error("Weather Fetch Error:", error);
    throw new Error("Failed to fetch weather data. Please try again.");
  }
};
```

#### 步骤 3：在 Vercel 设置环境变量

1. 登录 Vercel Dashboard
2. 进入您的项目
3. 点击 "Settings" → "Environment Variables"
4. 添加 `GEMINI_API_KEY`（**不要**加 `VITE_` 前缀）
5. 选择所有环境（Production, Preview, Development）
6. 保存

#### 步骤 4：移除 vite.config.ts 中的密钥注入

```typescript
export default defineConfig(({ mode }) => {
  // 移除这些行
  // const env = loadEnv(mode, '.', '');
  // const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  
  return {
    // ... 其他配置
    define: {
      // 移除 API 密钥注入
      // 'process.env.API_KEY': JSON.stringify(apiKey),
      // 'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    },
  };
});
```

#### 步骤 5：修改所有服务文件

**fortune-sticks/services/geminiService.ts:**
```typescript
export const generateFortune = async (language: Language): Promise<FortuneData> => {
  const response = await fetch('/api/gemini/fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language })
  });
  // ... 处理响应
};
```

**services/geminiService.ts:**
```typescript
export const remixImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  const response = await fetch('/api/gemini/remix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, prompt })
  });
  // ... 处理响应
};
```

---

## 🛡️ 如果密钥已暴露（立即执行）

### 1. 立即禁用当前密钥
1. 登录 [Google Cloud Console](https://console.cloud.google.com/)
2. 进入 "APIs & Services" → "Credentials"
3. 找到您的 Gemini API Key
4. **立即删除或禁用**该密钥

### 2. 生成新密钥
1. 在 Google Cloud Console 中创建新的 API Key
2. 设置适当的限制（API 限制、HTTP 引用限制等）
3. 更新 Vercel 环境变量

### 3. 检查使用情况
1. 查看 Google Cloud Console 中的 API 使用报告
2. 检查是否有异常的使用模式
3. 如果发现异常，立即采取行动

---

## 📋 修复检查清单

### 立即执行
- [ ] **禁用当前暴露的 API Key**
- [ ] **生成新的 API Key**
- [ ] **创建 Vercel Serverless Functions**
- [ ] **修改所有前端代码使用 API 路由**
- [ ] **移除 vite.config.ts 中的密钥注入**
- [ ] **移除所有 `VITE_GEMINI_API_KEY` 的使用**
- [ ] **在 Vercel 设置环境变量（不加 `VITE_` 前缀）**
- [ ] **测试所有功能**
- [ ] **重新部署**

### 长期安全措施
- [ ] 设置 API Key 使用限制
- [ ] 启用 API 配额限制
- [ ] 设置 HTTP 引用限制
- [ ] 定期轮换 API Key
- [ ] 监控 API 使用情况

---

## 🔐 最佳实践总结

1. **永远不要**在前端代码中直接使用 API 密钥
2. **永远不要**使用 `VITE_` 前缀存储敏感信息
3. **永远不要**在 `vite.config.ts` 的 `define` 中注入密钥
4. **永远不要**提交 `.env` 文件到 Git
5. **使用** Serverless Functions 或后端 API 作为代理
6. **使用** Vercel 环境变量管理密钥（不加 `VITE_` 前缀）
7. **设置** API Key 使用限制和配额

---

## 📝 当前状态

**🔴 高风险 - 密钥已暴露**

- ✅ 构建产物中包含硬编码的 API Key
- ✅ 密钥可以通过浏览器开发者工具查看
- ✅ 任何人都可以使用您的密钥
- ⚠️ **建议立即修复！**

---

## 📞 需要帮助？

如果您需要我帮您实现 Serverless Functions 的代码，请告诉我。我可以：
1. 创建所有必要的 API 路由
2. 修改前端代码
3. 更新配置文件
4. 确保所有功能正常工作

**请立即采取行动保护您的 API Key！**

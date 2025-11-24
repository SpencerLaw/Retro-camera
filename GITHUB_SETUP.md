# GitHub 推送指南

## 项目已准备就绪！

✅ Git 仓库已初始化
✅ 所有文件已提交
✅ 项目分析文档已创建

## 推送到 GitHub 的步骤

### 方法一：使用 GitHub CLI（推荐）

如果你已安装 GitHub CLI：

```bash
# 创建 GitHub 仓库（会自动设置远程并推送）
gh repo create Retro-camera --public --source=. --remote=origin --push
```

### 方法二：手动操作

1. **在 GitHub 上创建新仓库**
   - 访问 https://github.com/new
   - 仓库名称：`Retro-camera`（或你喜欢的名称）
   - 选择 Public 或 Private
   - **不要**初始化 README、.gitignore 或 license（我们已经有了）

2. **添加远程仓库并推送**
   ```bash
   # 添加远程仓库（将 YOUR_USERNAME 替换为你的 GitHub 用户名）
   git remote add origin https://github.com/YOUR_USERNAME/Retro-camera.git
   
   # 或者使用 SSH（如果你配置了 SSH key）
   # git remote add origin git@github.com:YOUR_USERNAME/Retro-camera.git
   
   # 重命名分支为 main（GitHub 默认分支名）
   git branch -M main
   
   # 推送到 GitHub
   git push -u origin main
   ```

3. **如果遇到认证问题**
   - 使用 Personal Access Token 代替密码
   - 或者配置 SSH key

## 项目信息

- **项目名称**: Retro Camera / Retrolens
- **描述**: 复古风格的即时相机 Web 应用，使用 React + Vite + TypeScript 构建，集成 Google Gemini AI
- **技术栈**: React 19, Vite 6, TypeScript, Gemini AI
- **主要功能**: 
  - 实时摄像头预览和拍照
  - 9 种滤镜效果
  - 可拖拽的照片墙
  - AI 图片处理（Gemini）
  - 本地存储

## 注意事项

⚠️ **重要**: 在推送前，确保 `.env.local` 文件已在 `.gitignore` 中（已包含），不会泄露你的 API 密钥。

## 推送后的操作

推送成功后，你可以：
1. 在 GitHub 仓库设置中添加项目描述和标签
2. 添加 LICENSE 文件（如果需要）
3. 设置 GitHub Pages 部署（如果需要）
4. 添加 Issues 和 Projects 模板

## 快速命令参考

```bash
# 查看当前状态
git status

# 查看远程仓库
git remote -v

# 推送代码
git push -u origin main

# 查看提交历史
git log --oneline
```


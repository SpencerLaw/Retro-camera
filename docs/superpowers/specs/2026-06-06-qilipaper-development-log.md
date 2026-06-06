# 齐力纸业开发日志

本文件用于记录齐力纸业官网、后台和服务器部署的每日开发进度，方便内部复盘，也方便客户查看每天做了哪些事情。

---

## 二零二六年六月六日

### 今日目标

1. 梳理客户 VPS 当前运行环境。
2. 确认旧网站当前是如何运行的。
3. 评估当前 VPS 是否能支撑新前端、后续后台和小程序。
4. 整理 VPS 部署说明文档。
5. 处理服务器异常文件。
6. 备份旧网站源码。
7. 将新官网前端上线到当前域名。

### 已确认的服务器情况

1. 当前服务器为阿里云国际站美国节点。
2. 当前系统为 Alibaba Cloud Linux 3。
3. 当前 Web 服务为 Nginx。
4. 当前数据库为 MySQL。
5. 当前旧网站目录为 `/www/wwwroot/paper-main`。
6. 当前旧网站是 Next.js 项目。
7. 当前域名 `qilipaper.com` 通过 Nginx 代理到本机 `3000` 端口。
8. 当前旧网站由 `www` 用户运行 `npm start` 启动。
9. 当前域名已配置 HTTPS。
10. 当前域名已备案，后续对接小程序更方便。

### 今日安全问题

服务器旧项目目录中发现两个异常文件：

```text
/www/wwwroot/paper-main/.pwned
/www/wwwroot/paper-main/sshddm
```

初步判断：

1. `.pwned` 不是正常项目文件。
2. `sshddm` 是 Linux 可执行文件。
3. `sshddm` 权限为 `777`。
4. 该文件不属于正常 Next.js / 官网项目。
5. 上线新前端时不能复用旧项目目录。

今日处理原则：

1. 先备份旧网站源码。
2. 再隔离异常文件。
3. 确认没有进程占用后从线上目录删除。
4. 新前端使用全新的干净目录上线。

### 今日部署计划

1. 在 VPS 创建备份目录。
2. 备份旧网站源码。
3. 备份 Nginx 配置。
4. 上传新前端静态部署包。
5. 解压到新静态站目录。
6. 修改 Nginx 从反向代理切换为静态站点。
7. 停止旧 Next.js 进程。
8. 重载 Nginx。
9. 验证 `https://qilipaper.com` 是否可以访问新官网。

### 当前状态

截至今日任务完成时：

```text
VPS 盘点已完成
VPS 部署说明已整理
旧网站源码已备份
异常文件已隔离并从旧目录删除
新前端静态包已上传
Nginx 已切换到新静态站点
旧 Next.js 服务已停止
正式域名已访问新前端
```

### 今日实际完成记录

1. 已确认当前旧网站为 Next.js 项目。
2. 已确认当前站点目录为 `/www/wwwroot/paper-main`。
3. 已确认当前 Nginx 原本代理到 `127.0.0.1:3000`。
4. 已备份旧网站源码：

```text
/www/backup/qilipaper/paper-main-source-20260606-220341.tar.gz
```

5. 已备份 Nginx 配置：

```text
/www/backup/qilipaper/node_paper_main.conf.20260606-220341.bak
/www/backup/qilipaper/node_paper_main.conf.before-static-20260606-220509.bak
/www/backup/qilipaper/node_paper_main.conf.fix-vanglam-route-20260606-220624.bak
```

6. 已隔离异常文件：

```text
/www/backup/qilipaper/security-20260606-220341/.pwned
/www/backup/qilipaper/security-20260606-220341/sshddm
```

7. 已从旧站目录删除异常文件：

```text
/www/wwwroot/paper-main/.pwned
/www/wwwroot/paper-main/sshddm
```

8. 已部署新前端到：

```text
/www/wwwroot/qilipaper-vanglam-static
```

9. 已将 Nginx 改为静态站点：

```nginx
root /www/wwwroot/qilipaper-vanglam-static;

location / {
    try_files $uri /index.html;
}
```

10. 已停止旧 Next.js 服务。
11. 已验证以下地址正常返回：

```text
https://qilipaper.com/
https://qilipaper.com/vanglam
https://qilipaper.com/vanglam/color-system
https://qilipaper.com/vanglam/collections
https://qilipaper.com/vanglam/request-sample-kit
```

### 今日结论

二零二六年六月六日任务完成：

```text
安全问题已做基础处理
旧网站源码已备份
新网页前端已上线到当前域名
客户今天要求的目标已完成
```

### 追加完成事项：VPS 清理与端口收紧

在客户要求 VPS 保持简洁后，继续完成以下事项：

1. 删除旧站可再生依赖目录 `node_modules`。
2. 删除旧站可再生构建目录 `.next`。
3. 清理 root 缓存、npm 缓存、临时目录和回收站。
4. 压缩备份旧访问日志并截断线上日志。
5. 删除旧站 0 字节空文件。
6. 将旧 `paper-main.zip` 从网站根目录移动到备份区。
7. 删除空的默认站点目录。
8. 停止并禁用宝塔面板服务。
9. 停止并禁用 FTP 服务。
10. 将 MySQL 改为仅本机监听 `127.0.0.1:3306`。
11. 复查新站访问正常。
12. 清理 SSH 超时后遗留的安全审计脚本进程，并保留清理日志。

清理后结果：

```text
/www/wwwroot 只保留 paper-main 和 qilipaper-vanglam-static
旧站目录约 106M
新站目录约 1.4M
根磁盘已用约 16G，可用约 22G
8888 宝塔端口不再监听
21 FTP 端口不再监听
3306 MySQL 仅本机监听
遗留审计脚本进程已清理
```

### 文档归档

今日形成三份运维与开发记录：

1. 当前 VPS 状态与部署说明：

```text
docs/superpowers/specs/2026-06-06-qilipaper-vps-deployment-notes.md
```

2. VPS 操作审计记录：

```text
docs/superpowers/specs/2026-06-06-qilipaper-vps-operation-audit.md
```

3. 每日开发日志：

```text
docs/superpowers/specs/2026-06-06-qilipaper-development-log.md
```

### 备注

当前客户要求是：新网页前端可以在当前域名跑起来即可。旧网站源码备份一份即可，不要求旧后台继续在线运行。

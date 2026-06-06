# 齐力纸业 VPS 操作审计记录

**记录日期**：二零二六年六月六日
**记录用途**：记录开发方通过 SSH 在客户 VPS 上执行过的操作，方便客户、项目负责人和后续维护人员审计。
**记录原则**：只记录操作目的、命令摘要、影响路径和执行结果，不记录服务器密码、密钥、数据库密码、`.env` 内容等敏感信息。

---

## 一、审计范围

本文件记录二零二六年六月六日对齐力纸业 VPS 执行的服务器操作。

本次操作目标：

1. 盘点服务器当前运行方式。
2. 备份旧网站源码。
3. 备份 Nginx 配置。
4. 处理旧站目录中的可疑文件。
5. 上传并部署新前端静态页面。
6. 切换 Nginx 到新静态站点。
7. 停止旧 Next.js 服务。
8. 验证正式域名访问状态。

本次没有执行的操作：

1. 没有读取 `.env` 文件内容。
2. 没有导出数据库。
3. 没有修改 MySQL 数据。
4. 没有删除旧网站源码目录。
5. 没有删除旧网站数据库。
6. 没有改动宝塔面板账号。
7. 没有改动服务器 root 密码。

---

## 二、操作摘要

| 时间 | 动作 | 影响对象 | 结果 |
| --- | --- | --- | --- |
| 2026-06-06 21:44-21:55 | VPS 只读盘点 | 系统、Nginx、MySQL、Node、站点目录 | 已确认旧站为 Next.js 项目 |
| 2026-06-06 22:03 | 备份旧站源码 | `/www/wwwroot/paper-main` | 已生成 94M 备份包 |
| 2026-06-06 22:03 | 备份 Nginx 配置 | `node_paper_main.conf` | 已生成配置备份 |
| 2026-06-06 22:03 | 隔离可疑文件 | `.pwned`、`sshddm` | 已复制到隔离目录 |
| 2026-06-06 22:03 | 删除线上可疑文件 | 旧站目录 | 已删除，复查不存在 |
| 2026-06-06 22:04 | 上传新前端静态包 | `/www/backup/qilipaper` | 上传成功 |
| 2026-06-06 22:04 | 解压新前端 | `/www/wwwroot/qilipaper-vanglam-static` | 解压成功 |
| 2026-06-06 22:05 | 修改 Nginx 配置 | `qilipaper.com` 站点配置 | 已切到静态目录 |
| 2026-06-06 22:06 | 修复 `/vanglam` 路由 | Nginx `try_files` | 已修复 403 问题 |
| 2026-06-06 22:06 | 停止旧 Next.js 服务 | `npm start`、`next-server` | 已停止 |
| 2026-06-06 22:07 | 验证正式域名 | `qilipaper.com` | 核心路径均返回 200 |
| 2026-06-06 22:10 | 复查安全处理状态 | 可疑文件、进程、Nginx、域名 | 复查通过 |

---

## 三、详细操作记录

### 1. 建立 SSH 连接

**目的**：确认开发方可以通过 SSH 进入 VPS，后续可直接执行盘点、备份和部署。

**命令摘要**：

```bash
ssh root@服务器地址 "hostname; whoami; pwd"
```

**结果**：

```text
hostname: iZrj9gpb2xsv0d9kt1jqtoZ
whoami: root
pwd: /root
```

**备注**：

1. 只使用 SSH 公钥登录。
2. 未在文档中记录 root 密码。
3. 未在文档中记录私钥内容。

---

### 2. 服务器基础盘点

**目的**：确认服务器系统、内存、磁盘、Web 服务和数据库状态。

**命令摘要**：

```bash
hostname
whoami
pwd
date
cat /etc/os-release
uptime
free -h
df -h
```

**确认结果**：

| 项目 | 结果 |
| --- | --- |
| 系统 | Alibaba Cloud Linux 3.2104 U11 |
| 当前用户 | root |
| 内存 | 约 1.8 GiB |
| Swap | 约 1.0 GiB |
| 磁盘 | 40G 云盘，剩余约 20G |
| 当前目录 | `/root` |

**影响范围**：只读查询，无文件变更。

---

### 3. 服务与端口盘点

**目的**：确认当前网站由什么服务承载。

**命令摘要**：

```bash
systemctl status nginx --no-pager -l
systemctl status mysqld --no-pager -l
systemctl status httpd --no-pager -l
systemctl status docker --no-pager -l
ss -tulpn
```

**确认结果**：

| 服务 | 状态 |
| --- | --- |
| Nginx | 运行中 |
| MySQL | 运行中 |
| Apache/httpd | 未安装 |
| Docker | 未安装 |
| 80 | Nginx 监听 |
| 443 | Nginx 监听 |
| 3000 | 旧 Next.js 服务监听 |
| 3306 | MySQL 监听 |
| 8888 | 宝塔面板监听 |

**影响范围**：只读查询，无文件变更。

---

### 4. 旧站目录与 Nginx 配置盘点

**目的**：确认域名绑定、站点目录和旧网站运行方式。

**命令摘要**：

```bash
ls -lah /www
ls -lah /www/wwwroot
ls -lah /www/server/panel/vhost/nginx
grep -R "server_name\|root \|proxy_pass\|try_files\|ssl_certificate" /www/server/panel/vhost/nginx
```

**确认结果**：

```text
旧站目录：/www/wwwroot/paper-main
Nginx 配置：/www/server/panel/vhost/nginx/node_paper_main.conf
域名：qilipaper.com
旧站代理：proxy_pass http://127.0.0.1:3000
```

**影响范围**：只读查询，无文件变更。

---

### 5. 旧 Next.js 进程盘点

**目的**：确认旧站是如何启动的，避免切换时误杀无关服务。

**命令摘要**：

```bash
ps -fp 旧进程号
tr '\0' ' ' < /proc/旧进程号/cmdline
readlink -f /proc/旧进程号/cwd
ps -eo pid,user,cmd | grep -E "next-server|next start|node|npm"
```

**确认结果**：

```text
父进程：www 用户运行 npm start
子进程：next-server v15.3.1
工作目录：/www/wwwroot/paper-main
```

**影响范围**：只读查询，无文件变更。

---

### 6. 发现可疑文件

**目的**：确认旧站目录是否存在异常文件。

**命令摘要**：

```bash
ls -lah /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
stat /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
file /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
sha256sum /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
ps -eo pid,user,cmd | grep -E "sshddm"
```

**确认结果**：

| 文件 | 判断 |
| --- | --- |
| `.pwned` | 非正常项目文件 |
| `sshddm` | Linux 64 位可执行文件，非正常项目文件 |

**重要记录**：

```text
.pwned SHA256: 1060092d1ce0ae5ca5ac11bc1d078c5fa9e263f3fb6c736293a5dbb018e59258
sshddm SHA256: d04380d79168f863515bb6c625de913a2f62e8160d6913c57b83a6cb6b36c5ed
```

**影响范围**：此步骤只读查询，没有删除文件。

---

### 7. 备份旧网站源码

**目的**：按照客户要求，将旧网站源码完整备份一份，后续需要时可查阅或回滚。

**命令摘要**：

```bash
mkdir -p /www/backup/qilipaper

cd /www/wwwroot

tar --warning=no-file-changed \
  --exclude='paper-main/node_modules' \
  --exclude='paper-main/.next' \
  --exclude='paper-main/.pwned' \
  --exclude='paper-main/sshddm' \
  -czf /www/backup/qilipaper/paper-main-source-20260606-220341.tar.gz \
  paper-main
```

**生成文件**：

```text
/www/backup/qilipaper/paper-main-source-20260606-220341.tar.gz
```

**文件大小**：

```text
约 94M
```

**备注**：

1. 备份排除了 `node_modules`。
2. 备份排除了 `.next`。
3. 备份排除了异常文件 `.pwned` 和 `sshddm`。
4. 旧网站原目录没有被删除。

---

### 8. 备份 Nginx 配置

**目的**：切换前保留 Nginx 配置备份，方便回滚。

**命令摘要**：

```bash
cp -a /www/server/panel/vhost/nginx/node_paper_main.conf \
  /www/backup/qilipaper/node_paper_main.conf.20260606-220341.bak
```

后续切换前和修复路由前也分别做了备份：

```text
/www/backup/qilipaper/node_paper_main.conf.before-static-20260606-220509.bak
/www/backup/qilipaper/node_paper_main.conf.fix-vanglam-route-20260606-220624.bak
```

**结果**：配置备份成功。

---

### 9. 隔离可疑文件

**目的**：删除异常文件前先保留隔离副本，方便后续安全排查。

**命令摘要**：

```bash
mkdir -p /www/backup/qilipaper/security-20260606-220341
cp -a /www/wwwroot/paper-main/.pwned /www/backup/qilipaper/security-20260606-220341/.pwned
cp -a /www/wwwroot/paper-main/sshddm /www/backup/qilipaper/security-20260606-220341/sshddm
chmod 600 /www/backup/qilipaper/security-20260606-220341/.pwned
chmod 600 /www/backup/qilipaper/security-20260606-220341/sshddm
```

**隔离目录**：

```text
/www/backup/qilipaper/security-20260606-220341
```

**隔离文件权限**：

```text
.pwned 600
sshddm 600
```

**备注**：

1. 隔离文件保留用于查证。
2. 隔离文件已取消执行权限。
3. 隔离目录不作为网站访问目录。

---

### 10. 删除旧站目录中的可疑文件

**目的**：从线上旧站目录删除异常文件，降低风险。

**删除前检查**：

```bash
ps -eo pid,user,cmd | grep -E "/www/wwwroot/paper-main/sshddm|sshddm" | grep -v grep
```

**检查结果**：

```text
未发现 sshddm 正在运行的进程
```

**命令摘要**：

```bash
rm -f /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
```

**删除后复查**：

```bash
ls -lah /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
```

**复查结果**：

```text
旧站目录中的 .pwned 已删除
旧站目录中的 sshddm 已删除
```

---

### 11. 上传新前端静态部署包

**目的**：把本地构建好的新前端部署包上传到 VPS。

**本地包**：

```text
D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-dist-20260605.zip
```

**服务器保存位置**：

```text
/www/backup/qilipaper/qilipaper-vanglam-dist-20260605.zip
```

**命令摘要**：

```bash
scp qilipaper-vanglam-dist-20260605.zip root@服务器:/www/backup/qilipaper/
```

**结果**：上传成功。

---

### 12. 解压新前端到干净目录

**目的**：不复用旧站目录，使用全新目录承载静态前端。

**命令摘要**：

```bash
mkdir -p /www/wwwroot/qilipaper-vanglam-static.tmp
unzip -oq /www/backup/qilipaper/qilipaper-vanglam-dist-20260605.zip \
  -d /www/wwwroot/qilipaper-vanglam-static.tmp

mv /www/wwwroot/qilipaper-vanglam-static.tmp \
  /www/wwwroot/qilipaper-vanglam-static

chown -R www:www /www/wwwroot/qilipaper-vanglam-static
find /www/wwwroot/qilipaper-vanglam-static -type d -exec chmod 755 {} \;
find /www/wwwroot/qilipaper-vanglam-static -type f -exec chmod 644 {} \;
```

**新站目录**：

```text
/www/wwwroot/qilipaper-vanglam-static
```

**目录内容**：

```text
index.html
assets/
vanglam/
```

**结果**：解压成功，权限已设置。

---

### 13. 切换 Nginx 到新静态站

**目的**：让 `qilipaper.com` 从旧 Next.js 反向代理切换为新静态前端。

**切换前备份**：

```text
/www/backup/qilipaper/node_paper_main.conf.before-static-20260606-220509.bak
```

**配置变更摘要**：

旧配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

新配置：

```nginx
root /www/wwwroot/qilipaper-vanglam-static;

location / {
    try_files $uri $uri/ /index.html;
}
```

**配置检查**：

```bash
/www/server/nginx/sbin/nginx -t
```

**结果**：

```text
nginx configuration test is successful
```

**重载 Nginx**：

```bash
/etc/init.d/nginx reload
```

**结果**：Nginx 重载成功。

---

### 14. 修复 `/vanglam` 路由 403 问题

**问题**：

新静态包中存在 `/vanglam` 静态资源目录。Nginx 使用：

```nginx
try_files $uri $uri/ /index.html;
```

时，访问：

```text
https://qilipaper.com/vanglam
```

会被当作目录访问，返回 403。

**修复前备份**：

```text
/www/backup/qilipaper/node_paper_main.conf.fix-vanglam-route-20260606-220624.bak
```

**修复配置**：

```nginx
location / {
    try_files $uri /index.html;
}
```

**配置检查**：

```bash
/www/server/nginx/sbin/nginx -t
```

**结果**：配置测试通过。

**重载 Nginx**：

```bash
/etc/init.d/nginx reload
```

**结果**：`/vanglam` 路由恢复正常。

---

### 15. 停止旧 Next.js 服务

**目的**：新静态站已经接管正式域名，旧 Next.js 服务不再需要继续占用内存和 3000 端口。

**停止前查询**：

```bash
ps -eo pid,user,cmd | grep -E "npm start|next-server" | grep -v grep
```

**停止命令摘要**：

```bash
pkill -u www -f "next-server"
pkill -u www -f "npm start"
```

**停止后查询**：

```bash
ps -eo pid,user,cmd | grep -E "npm start|next-server" | grep -v grep
ss -tulpn | grep 3000
```

**结果**：

```text
npm start 已停止
next-server 已停止
3000 端口已不再承载旧站
```

---

### 16. 上线验证

**目的**：确认正式域名已访问新前端。

**命令摘要**：

```bash
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/vanglam
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/vanglam/color-system
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/vanglam/collections
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/vanglam/request-sample-kit
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/vanglam/hero-paper.png
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/assets/index-BIY00_Wd.js
```

**验证结果**：

```text
200 https://qilipaper.com/
200 https://qilipaper.com/vanglam
200 https://qilipaper.com/vanglam/color-system
200 https://qilipaper.com/vanglam/collections
200 https://qilipaper.com/vanglam/request-sample-kit
200 https://qilipaper.com/vanglam/hero-paper.png
200 https://qilipaper.com/assets/index-BIY00_Wd.js
```

---

### 17. 安全处理复查

**目的**：确认异常文件已经不在旧站目录、没有异常进程，新站仍然正常。

**命令摘要**：

```bash
ls -lah /www/wwwroot/paper-main/.pwned /www/wwwroot/paper-main/sshddm
ps -eo pid,user,cmd | grep -E "sshddm|/www/wwwroot/paper-main/.pwned|/www/wwwroot/paper-main/sshddm"
find /www/backup/qilipaper/security-20260606-220341 -maxdepth 1 -type f -printf "%f %s bytes %m %u:%g\n"
grep -n "server_name\|qilipaper-vanglam-static\|try_files\|proxy_pass" /www/server/panel/vhost/nginx/node_paper_main.conf
curl -k -L -s -o /dev/null -w "%{http_code}" https://qilipaper.com/
```

**复查结果**：

```text
旧站目录中的 .pwned 不存在
旧站目录中的 sshddm 不存在
未发现 sshddm 相关运行进程
隔离文件权限为 600
Nginx 当前指向 /www/wwwroot/qilipaper-vanglam-static
https://qilipaper.com/ 返回 200
https://qilipaper.com/vanglam 返回 200
https://qilipaper.com/vanglam/color-system 返回 200
```

---

## 四、当前服务器上线后状态

当前线上状态：

```text
qilipaper.com 已运行新前端静态站
旧 Next.js 服务已停止
旧网站源码已备份
异常文件已从旧目录删除
异常文件隔离副本已保留且不可执行
```

当前 Nginx 关键配置：

```nginx
server_name qilipaper.com;
root /www/wwwroot/qilipaper-vanglam-static;

location / {
    try_files $uri /index.html;
}
```

当前新站目录：

```text
/www/wwwroot/qilipaper-vanglam-static
```

当前旧站备份：

```text
/www/backup/qilipaper/paper-main-source-20260606-220341.tar.gz
```

当前异常文件隔离目录：

```text
/www/backup/qilipaper/security-20260606-220341
```

---

## 五、后续注意事项

1. 不要删除 `/www/backup/qilipaper`，其中包含旧站备份、Nginx 备份和异常文件隔离副本。
2. 不要把隔离目录作为网站目录暴露。
3. 后续如果要彻底清理服务器，建议在备份必要源码和数据库后重装 VPS。
4. 后续正式后台上线前，应限制宝塔、SSH、MySQL、FTP 等端口访问来源。
5. 如果客户要求恢复旧站，可根据 Nginx 配置备份和旧站源码备份回滚。
6. 如果继续开发后台，应新建干净项目和数据库结构，不建议复用旧 Next.js 后台作为长期后台。

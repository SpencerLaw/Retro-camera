# 齐力纸业 VPS 现状与新前端部署说明

**整理日期**：二零二六年六月六日
**适用阶段**：新官网前端上线前的服务器交接、备份、部署和回滚
**当前目标**：客户要求新网页前端可以在当前域名 `qilipaper.com` 跑起来。旧网站源码只需要完整备份，不再作为本次上线必须保留的运行系统。

---

## 一、部署目标说明

本次部署目标非常明确：

1. 当前域名 `qilipaper.com` 继续使用。
2. 新官网前端替换当前旧网站前台。
3. 旧网站源码完整备份一份，方便后续查阅或回滚。
4. 当前阶段不要求保留旧网站后台在线运行。
5. 当前阶段不要求继续使用旧网站的数据库、接口和后台管理逻辑。
6. 新官网先以静态前端方式上线。
7. 后续正式后台开发时，再重新规划服务端、数据库、上传、接口和小程序共用后台。

简单理解：

**这次先让客户看到新网页在正式域名上跑起来。旧站先备份，不继续作为线上主站。**

---

## 二、VPS 基础信息

根据服务器盘点结果，目前 VPS 情况如下：

| 项目 | 当前情况 |
| --- | --- |
| 服务器系统 | Alibaba Cloud Linux 3.2104 U11 |
| 登录用户 | `root` |
| Web 面板 | 宝塔面板 |
| Web 服务 | Nginx |
| 数据库 | MySQL 已运行 |
| Docker | 未安装 / 未运行 |
| Node.js | `v22.18.0` |
| npm | `10.9.3` |
| 当前域名 | `qilipaper.com` |
| 当前站点目录 | `/www/wwwroot/paper-main` |
| 当前 Nginx 配置 | `/www/server/panel/vhost/nginx/node_paper_main.conf` |
| 当前访问方式 | Nginx 反向代理到本机 `3000` 端口 |
| 当前旧站类型 | Next.js 项目 |

服务器资源情况：

| 项目 | 当前情况 |
| --- | --- |
| 内存 | 约 1.8 GiB |
| Swap | 约 1.0 GiB |
| 磁盘 | 40G 云盘，已用约 18G，剩余约 20G |
| 负载 | 当前较低 |

---

## 三、当前网站运行方式

当前网站不是普通 HTML 静态站点，而是一个 Next.js 项目。

当前运行链路如下：

```text
用户访问 https://qilipaper.com
        ↓
Nginx 接收 80 / 443 请求
        ↓
Nginx 配置文件 node_paper_main.conf
        ↓
proxy_pass http://127.0.0.1:3000
        ↓
本机 3000 端口的 Next.js 服务
        ↓
/www/wwwroot/paper-main 项目目录
```

当前 3000 端口进程：

```text
www 用户运行 npm start
子进程 next-server v15.3.1
工作目录 /www/wwwroot/paper-main
```

也就是说，当前旧站是通过：

```bash
cd /www/wwwroot/paper-main
npm start
```

启动的。

---

## 四、当前 Nginx 配置要点

当前 Nginx 配置文件：

```text
/www/server/panel/vhost/nginx/node_paper_main.conf
```

关键配置：

```nginx
server_name qilipaper.com;

location / {
    proxy_pass http://127.0.0.1:3000;
}
```

当前 SSL 证书也在这个配置中：

```text
/www/server/panel/vhost/cert/paper_main/fullchain.pem
/www/server/panel/vhost/cert/paper_main/privkey.pem
```

本次上线新静态前端时，不需要重新申请证书。可以继续使用现有 Nginx 和证书，只需要把 `location /` 从反向代理改成静态目录访问。

---

## 五、当前旧项目目录情况

旧项目目录：

```text
/www/wwwroot/paper-main
```

目录内目前包含：

1. Next.js 源码。
2. `.next` 构建产物。
3. `node_modules`。
4. `package.json`。
5. `next.config.ts`。
6. `prisma` 数据库相关目录。
7. `public/uploads` 上传目录。
8. `.env`、`.env.local`、`.env.production` 环境配置文件。
9. 后台页面和 API 目录。

当前旧站功能范围比较多，包括：

1. 前台页面。
2. `/sign-in` 登录页。
3. 后台管理页面。
4. 产品管理。
5. 首页管理。
6. 导航管理。
7. 上传接口。
8. 样品申请接口。
9. MySQL / Prisma 相关逻辑。

本次客户目标只是“新网页前端在当前域名跑起来”，因此旧站这些功能不作为本次上线保留目标。

---

## 六、重要风险提醒

服务器当前存在明显安全风险，需要记录。

在旧项目目录中发现以下可疑文件：

```text
/www/wwwroot/paper-main/.pwned
/www/wwwroot/paper-main/sshddm
```

其中：

1. `.pwned` 内容为 `pwned`。
2. `sshddm` 是 Linux 64 位可执行文件。
3. `sshddm` 文件大小约 3MB。
4. `sshddm` 权限为 `777`。
5. 该文件不属于正常 Next.js 项目文件。

服务器历史上也出现过大量 SSH 登录失败记录。

因此后续部署时要注意：

1. 先备份旧源码。
2. 不要把可疑文件继续带入新站点目录。
3. 新静态站点目录应重新创建，不要直接在旧目录中增量覆盖。
4. 部署完成后建议限制 SSH、宝塔、MySQL、FTP 端口访问来源。
5. 如果条件允许，后续应做一次服务器安全清理。

---

## 七、本次推荐部署方式

由于客户当前只要求新前端跑在正式域名上，推荐使用最简单稳定的方式：

```text
旧 Next.js 项目完整打包备份
        ↓
停止旧 Next.js 进程
        ↓
新建静态站点目录
        ↓
上传新前端 dist 构建产物
        ↓
修改 Nginx 指向静态目录
        ↓
重载 Nginx
        ↓
访问 qilipaper.com 验证
```

推荐新站点目录：

```text
/www/wwwroot/qilipaper-vanglam-static
```

不建议直接把新前端文件放进旧目录：

```text
/www/wwwroot/paper-main
```

原因：

1. 旧目录文件很多，容易混乱。
2. 旧目录有 `.env`、后台源码、数据库配置。
3. 旧目录存在可疑文件。
4. 新站只是静态前端，应该用干净目录承载。

---

## 八、旧网站源码备份方案

备份目录建议：

```text
/www/backup/qilipaper
```

备份文件命名建议：

```text
paper-main-source-YYYYMMDD-HHMMSS.tar.gz
```

备份命令：

```bash
mkdir -p /www/backup/qilipaper

cd /www/wwwroot

tar --warning=no-file-changed \
  --exclude='paper-main/node_modules' \
  --exclude='paper-main/.next/cache' \
  -czf /www/backup/qilipaper/paper-main-source-$(date +%Y%m%d-%H%M%S).tar.gz \
  paper-main
```

说明：

1. 备份包含源码、配置、上传目录、构建配置。
2. 排除 `node_modules`，避免备份过大。
3. 排除 `.next/cache`，避免无意义缓存。
4. `.env` 文件会被备份进去，备份文件不要外传。
5. 备份完成后应查看文件大小，确认备份生成成功。

查看备份：

```bash
ls -lah /www/backup/qilipaper
```

如果需要完整无排除备份，也可以执行：

```bash
cd /www/wwwroot
tar -czf /www/backup/qilipaper/paper-main-full-$(date +%Y%m%d-%H%M%S).tar.gz paper-main
```

但完整备份会比较大。

---

## 九、是否需要数据库备份

客户当前要求是旧网站源码备份一个即可。

严格按客户要求，本次可以只备份源码。

但由于旧项目使用了 MySQL 和 Prisma，如果后续客户突然要求恢复旧后台，只有源码备份可能不够。完整恢复旧系统通常还需要数据库。

因此建议至少做一份数据库备份，作为保险。

查看数据库名称：

```bash
mysql -uroot -p -e "SHOW DATABASES;"
```

如果暂时不知道数据库密码，可以先不做数据库备份。

如果能通过宝塔获取数据库备份，也可以直接在宝塔面板里对相关数据库做备份。

---

## 十、新前端部署包

本地已经准备了两个包：

1. 源码包：

```text
D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-source-20260605.zip
```

2. 静态部署包：

```text
D:\webcode\Retro-camera-main\.codex-tmp\qilipaper-vanglam-dist-20260605.zip
```

本次只需要让新网页前端跑在当前域名，优先使用静态部署包：

```text
qilipaper-vanglam-dist-20260605.zip
```

静态包解压后应包含：

```text
index.html
assets/
vanglam/
```

---

## 十一、新静态站点目录部署步骤

以下命令为正式部署时参考。执行前必须确认旧站已备份。

创建新目录：

```bash
mkdir -p /www/wwwroot/qilipaper-vanglam-static
```

上传静态包到服务器，例如：

```text
/www/wwwroot/qilipaper-vanglam-dist-20260605.zip
```

解压到新目录：

```bash
cd /www/wwwroot/qilipaper-vanglam-static
unzip -o /www/wwwroot/qilipaper-vanglam-dist-20260605.zip
chown -R www:www /www/wwwroot/qilipaper-vanglam-static
find /www/wwwroot/qilipaper-vanglam-static -type d -exec chmod 755 {} \;
find /www/wwwroot/qilipaper-vanglam-static -type f -exec chmod 644 {} \;
```

检查文件：

```bash
ls -lah /www/wwwroot/qilipaper-vanglam-static
```

---

## 十二、停止旧 Next.js 服务

当前旧服务是 `www` 用户运行的：

```text
npm start
next-server
```

当前不是 PM2 管理。

停止旧服务可以通过进程号停止。正式操作前先查看：

```bash
ps -eo pid,user,cmd | grep -E "npm start|next-server" | grep -v grep
```

停止旧服务：

```bash
pkill -u www -f "next-server"
pkill -u www -f "npm start"
```

再次确认：

```bash
ps -eo pid,user,cmd | grep -E "npm start|next-server" | grep -v grep
```

如果没有输出，说明旧 Next 服务已停止。

---

## 十三、Nginx 静态站配置方案

将当前 Nginx 中的：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

改为：

```nginx
root /www/wwwroot/qilipaper-vanglam-static;

location / {
    try_files $uri $uri/ /index.html;
}
```

完整思路：

1. 保留 `server_name qilipaper.com`。
2. 保留 SSL 证书配置。
3. 保留 80 跳转 HTTPS。
4. 删除或注释 `proxy_pass http://127.0.0.1:3000`。
5. 增加静态目录 `root`。
6. 增加 React 前端路由回退 `try_files $uri $uri/ /index.html;`。

修改后检查 Nginx 配置：

```bash
/www/server/nginx/sbin/nginx -t
```

如果显示 `successful`，重载 Nginx：

```bash
/etc/init.d/nginx reload
```

---

## 十四、上线后验证清单

访问正式域名：

```text
https://qilipaper.com
```

检查以下页面：

| 页面 | 路径 | 检查内容 |
| --- | --- | --- |
| 新官网首页 | `/vanglam` 或 `/` | 页面是否正常打开 |
| 色彩系统 | `/vanglam/color-system` | 页面是否正常打开 |
| 产品系列 | `/vanglam/collections` | 页面是否正常打开 |
| 表面工艺 | `/vanglam/surfaces` | 图片是否加载 |
| 应用场景 | `/vanglam/applications` | 页面是否正常 |
| 艺术卡实验室 | `/vanglam/artcard-lab` | 页面是否正常 |
| 纸艺工坊 | `/vanglam/atelier` | 页面是否正常 |
| 资料与工具 | `/vanglam/library-tools` | 页面是否正常 |
| 样品申请 | `/vanglam/request-sample-kit` | 页面是否正常 |

服务器本机检查：

```bash
curl -I https://qilipaper.com
curl -I https://qilipaper.com/vanglam
curl -I https://qilipaper.com/vanglam/color-system
```

Nginx 日志检查：

```bash
tail -n 100 /www/wwwlogs/paper_main.log
tail -n 100 /www/wwwlogs/paper_main.error.log
```

---

## 十五、回滚方案

如果新前端上线后出现严重问题，可以回滚到旧 Next.js 项目。

回滚步骤：

1. 把 Nginx `location /` 改回：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

2. 回到旧项目目录：

```bash
cd /www/wwwroot/paper-main
```

3. 启动旧服务：

```bash
sudo -u www npm start
```

如果没有 `sudo`，可用：

```bash
su -s /bin/bash www -c "cd /www/wwwroot/paper-main && npm start"
```

4. 检查 3000 端口：

```bash
ss -tulpn | grep 3000
```

5. 检查 Nginx 配置并重载：

```bash
/www/server/nginx/sbin/nginx -t
/etc/init.d/nginx reload
```

---

## 十六、后续后台开发说明

这次部署新前端，不代表正式后台已经完成。

后续后台开发应重新规划：

1. 服务端框架。
2. 数据库结构。
3. 后台管理系统。
4. 图片、视频、资料文件上传。
5. 前台内容接口。
6. 样品申请接口。
7. 管理员账号和权限。
8. 操作日志。
9. 官网和小程序共用接口。
10. 服务器部署、备份、安全和维护流程。

当前旧 Next 项目的后台虽然存在，但不是按照新官网后台需求设计的，不建议直接作为新项目长期后台使用。

---

## 十七、建议执行顺序

正式上线时建议严格按以下顺序：

1. 确认客户接受“旧后台不保留在线运行，只备份旧源码”。
2. 备份 `/www/wwwroot/paper-main`。
3. 检查备份文件是否生成成功。
4. 上传新前端静态包。
5. 解压到 `/www/wwwroot/qilipaper-vanglam-static`。
6. 修改 Nginx 指向新静态目录。
7. 停止旧 Next.js 进程。
8. 检查 Nginx 配置。
9. 重载 Nginx。
10. 访问 `https://qilipaper.com` 验证。
11. 记录上线时间和备份文件名。
12. 后续再安排正式后台开发。

---

## 十八、最终判断

当前 VPS 可以承载新前端。

本次如果客户只要求“新网页前端在当前域名跑起来”，最合适的方式是：

```text
备份旧 Next.js 项目
新建干净静态目录
部署新前端 dist
Nginx 从反向代理改为静态站点
保留原 SSL 和域名配置
```

这样改动范围最清晰，出问题也方便回滚。

---

## 十九、当前 VPS 是否能支撑后续业务

当前 VPS 能支撑第一阶段上线和开发，但不建议长期按当前配置承载完整业务。

当前服务器已经具备以下基础能力：

1. 有 Nginx，可以对外提供网站访问。
2. 有 HTTPS 证书，可以满足正式域名访问。
3. 有 Node.js，可以运行后端服务。
4. 有 MySQL，可以保存后台数据。
5. 有宝塔面板，可以管理站点、数据库、SSL 和文件。
6. 有 40G 云盘，当前剩余约 20G。
7. 当前域名已经备案，有利于后续小程序配置合法域名。

所以从技术基础上看，这台 VPS 可以承载：

1. 新官网前端。
2. 第一版后台管理系统。
3. 基础 API 接口。
4. MySQL 数据库。
5. 图片、资料文件的少量上传。
6. 后续小程序调用同一套接口。

但当前配置偏低，适合“第一阶段开发和小流量上线”，不适合长期承载完整业务。

---

## 二十、配置升级建议

当前 VPS 约为：

```text
2 vCPU
2G 内存
40G 云盘
```

第一阶段可以先不升级，原因是：

1. 新官网前端是静态页面，资源消耗很低。
2. 后台还未正式上线。
3. 小程序还未正式接入。
4. 当前访问量预计不大。
5. 先上线展示页可以节省客户前期成本。

但正式后台上线前建议升级。

最低建议：

```text
2 vCPU
4G 内存
80G 云盘
```

更稳建议：

```text
4 vCPU
8G 内存
100G 云盘
```

升级触发条件：

1. 后台正式上线。
2. 客户开始大量上传图片、样册、资料和视频。
3. 小程序开始真实访问接口。
4. 网站每天有稳定访问量。
5. 后台需要保存客户线索、样品申请、下载记录。
6. 需要更稳定的数据库和接口响应。

当前阶段结论：

```text
新前端上线：当前配置够用
后台开发阶段：当前配置基本够用
后台正式上线：建议升级到 2核4G 起步
小程序正式上线：建议 2核4G 起步，访问量起来后升级到 4核8G
```

---

## 二十一、后续 API 与小程序架构建议

后续正式开发时，官网前端、后台、小程序应共用一套服务端。

推荐架构：

```text
qilipaper.com
  ├─ 官网前端：静态页面或前端应用
  ├─ 后台管理：/admin 或 admin.qilipaper.com
  ├─ API 接口：/api 或 api.qilipaper.com
  ├─ 数据库：MySQL
  ├─ 文件资源：图片、视频、样册、技术资料
  └─ 小程序：调用同一套 API
```

接口规划方向：

| 模块 | 官网是否调用 | 小程序是否调用 | 后台是否管理 |
| --- | --- | --- | --- |
| 色彩系统 | 是 | 是 | 是 |
| 产品系列 | 是 | 是 | 是 |
| 表面工艺 | 是 | 是 | 是 |
| 应用场景 | 是 | 是 | 是 |
| 艺术卡实验室 | 是 | 可选 | 是 |
| 纸艺工坊 | 是 | 可选 | 是 |
| 资料与工具 | 是 | 是 | 是 |
| 样品申请 | 是 | 是 | 是 |
| 客户线索 | 否 | 否 | 是 |
| 上传资源 | 间接使用 | 间接使用 | 是 |

后续 API 应至少包含：

1. 内容查询接口。
2. 分类查询接口。
3. 图片资源接口。
4. 资料文件接口。
5. 样品申请提交接口。
6. 客户线索管理接口。
7. 管理员登录接口。
8. 文件上传接口。
9. 小程序读取接口。
10. 操作日志接口。

小程序注意事项：

1. 小程序请求接口必须使用 HTTPS。
2. 请求域名需要在微信公众平台配置为合法域名。
3. 上传文件、下载文件也需要配置对应合法域名。
4. 域名已备案是优势，后续配置小程序会更顺。
5. 建议使用正式域名或独立 API 子域名，不要使用 IP 加端口。

推荐接口域名方式：

```text
https://qilipaper.com/api
```

或：

```text
https://api.qilipaper.com
```

如果客户后续确定做小程序，推荐提前规划 `api.qilipaper.com`，这样官网、小程序、后台边界更清晰。

---

## 二十二、文件存储与 CDN 建议

第一阶段可以把图片和资料放在 VPS 本地目录。

例如：

```text
/www/wwwroot/qilipaper-vanglam-static
/www/wwwroot/qilipaper-uploads
```

但后续如果客户会上传大量图片、视频、样册和技术资料，不建议长期全部放在 VPS 本地。

推荐后续使用：

```text
阿里云 OSS + CDN
```

原因：

1. 图片加载更快。
2. 小程序加载资源更稳定。
3. VPS 磁盘压力更小。
4. 文件备份更方便。
5. 后台上传文件更好管理。
6. 后续迁移服务器时，资源文件不需要跟着搬家。

资源量较小时：

```text
VPS 本地存储即可
```

资源量变大后：

```text
OSS 存储原图、样册、视频
CDN 加速图片、资料下载
VPS 只负责接口和后台逻辑
```

---

## 二十三、安全处理建议

由于服务器已发现异常文件，本次上线前应先处理安全问题。

已发现异常：

```text
/www/wwwroot/paper-main/.pwned
/www/wwwroot/paper-main/sshddm
```

处理原则：

1. 先备份旧站源码。
2. 再隔离异常文件。
3. 确认异常文件没有运行进程。
4. 从线上目录删除异常文件。
5. 新站使用干净目录，不复用旧目录。
6. 后续有时间再做完整服务器安全检查。

建议关闭或限制以下端口：

| 端口 | 当前用途 | 建议 |
| --- | --- | --- |
| 80 | HTTP | 保留 |
| 443 | HTTPS | 保留 |
| 22 | SSH | 只允许开发者固定 IP，或改高位端口 |
| 8888 | 宝塔面板 | 只允许开发者固定 IP |
| 3306 | MySQL | 不对公网开放 |
| 21 | FTP | 不使用时关闭 |
| 888 | 宝塔相关服务 | 不需要公网访问时限制 |

当前最小安全处理：

1. 删除线上目录中的 `.pwned`。
2. 删除线上目录中的 `sshddm`。
3. 让新站跑在全新的静态目录。
4. 不把旧目录继续作为线上站点根目录。

更彻底的安全处理：

1. 备份必要源码和数据库。
2. 重装 VPS。
3. 重新安装 Nginx、MySQL、Node.js。
4. 重新部署新官网和后台。
5. 重新配置安全组、防火墙、宝塔入口。

当前项目阶段可以先做最小安全处理，正式后台上线前建议做更彻底的安全加固。

---

## 二十四、二零二六年六月六日实际执行记录

本节记录本次已经实际完成的服务器操作，方便后续部署、排查和回滚。

### 已完成操作

1. 已通过 SSH 登录 VPS。
2. 已完成旧网站源码备份。
3. 已完成 Nginx 配置备份。
4. 已将异常文件隔离备份。
5. 已从旧站线上目录删除异常文件。
6. 已上传新前端静态部署包。
7. 已解压到全新的静态站点目录。
8. 已将 Nginx 从 Next.js 反向代理切换为静态站点。
9. 已停止旧 Next.js 服务。
10. 已验证正式域名可访问新前端。

### 旧站源码备份

旧站源码备份文件：

```text
/www/backup/qilipaper/paper-main-source-20260606-220341.tar.gz
```

备份大小：

```text
约 94M
```

备份说明：

1. 已备份旧项目源码。
2. 已排除 `node_modules`。
3. 已排除 `.next` 构建目录。
4. 已排除异常文件 `.pwned` 和 `sshddm`。
5. 该备份用于后续查阅或必要时回滚源码。

### Nginx 配置备份

已生成以下 Nginx 配置备份：

```text
/www/backup/qilipaper/node_paper_main.conf.20260606-220341.bak
/www/backup/qilipaper/node_paper_main.conf.before-static-20260606-220509.bak
/www/backup/qilipaper/node_paper_main.conf.fix-vanglam-route-20260606-220624.bak
```

### 异常文件处理记录

异常文件隔离目录：

```text
/www/backup/qilipaper/security-20260606-220341
```

隔离文件：

```text
.pwned
sshddm
```

隔离后权限：

```text
600
```

线上旧目录中异常文件状态：

```text
/www/wwwroot/paper-main/.pwned 已删除
/www/wwwroot/paper-main/sshddm 已删除
```

说明：

1. 删除前已确认 `sshddm` 没有正在运行的进程。
2. 异常文件没有放入新静态站点目录。
3. 新站点使用全新的干净目录。

### 新前端部署目录

新前端静态目录：

```text
/www/wwwroot/qilipaper-vanglam-static
```

目录内容：

```text
index.html
assets/
vanglam/
```

部署包备份位置：

```text
/www/backup/qilipaper/qilipaper-vanglam-dist-20260605.zip
```

### 当前 Nginx 状态

当前 `qilipaper.com` 已指向静态目录：

```nginx
root /www/wwwroot/qilipaper-vanglam-static;

location / {
    try_files $uri /index.html;
}
```

注意：

`try_files` 中没有使用 `$uri/`，因为静态资源目录中存在 `/vanglam` 目录。如果使用 `$uri/`，访问 `/vanglam` 时 Nginx 会把它当作目录并返回 403。

### 旧 Next.js 服务状态

旧服务已停止：

```text
npm start 已停止
next-server 已停止
3000 端口已不再承载旧站
```

### 线上验证结果

以下地址已验证返回 `200`：

```text
https://qilipaper.com/
https://qilipaper.com/vanglam
https://qilipaper.com/vanglam/color-system
https://qilipaper.com/vanglam/collections
https://qilipaper.com/vanglam/request-sample-kit
https://qilipaper.com/vanglam/hero-paper.png
https://qilipaper.com/assets/index-BIY00_Wd.js
```

当前结果：

```text
新网页前端已在当前正式域名跑起来
旧网站源码已备份
异常文件已从旧目录删除
今日上线目标已完成
```

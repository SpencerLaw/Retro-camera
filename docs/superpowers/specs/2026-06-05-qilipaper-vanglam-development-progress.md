# 齐力纸业 VANGLAM 梵澜开发进度与部署迁移记录

**记录日期**：二零二六年六月五日
**项目状态**：前端展示源码已从当前综合项目中拆分，当前仓库后续仅保留开发进度、需求确认和部署记录。
**当前目标**：把齐力纸业官网源码迁移到客户服务器，当前本地综合项目不再继续承载齐力纸业业务源码。

---

## 一、已完成事项

1. 已完成齐力纸业 VANGLAM 官网前端展示页面。
2. 已完成顶部七个主题入口：
   - 色彩系统
   - 产品系列
   - 表面工艺
   - 应用场景
   - 艺术卡实验室
   - 纸艺工坊
   - 资料与工具
3. 已完成样品申请入口页面。
4. 已完成后台开发文档展示页。
5. 已完成后台建设需求确认文档。
6. 已完成前端源码独立拆包。
7. 已完成前端静态部署包构建。
8. 当前综合项目中已移除齐力纸业前台代码入口，后续只保留项目记录文档。

---

## 二、本次拆包结果

本次拆出了两个包：

1. `qilipaper-vanglam-source-20260605.zip`
   - 用途：源码交付、后续继续开发、服务器端重新构建。
   - 内容：独立 Vite + React 前端项目，只包含齐力纸业官网相关页面、资源和运行说明。
   - 不包含：当前综合项目中的其它工具、其它页面、测试项目、历史杂项文件。

2. `qilipaper-vanglam-dist-20260605.zip`
   - 用途：静态站点直接部署。
   - 内容：构建后的 `dist` 文件，可用于宝塔 / Nginx 静态站点目录替换。
   - 适用场景：客户服务器当前使用 Nginx 或 Apache 托管静态前端文件。

---

## 三、源码包包含页面

源码包中保留的页面如下：

| 页面 | 路径 | 用途 |
| --- | --- | --- |
| 官网首页 | `/vanglam` | 官网主入口 |
| 后台开发文档 | `/vanglam/backend-plan` | 给客户查看开发范围和进度 |
| 色彩系统 | `/vanglam/color-system` | 展示色系、标志色、颜色体系 |
| 产品系列 | `/vanglam/collections` | 展示产品系列与材料方向 |
| 表面工艺 | `/vanglam/surfaces` | 展示纹理、工艺、表面效果 |
| 应用场景 | `/vanglam/applications` | 展示包装、标签、艺术卡等应用方向 |
| 艺术卡实验室 | `/vanglam/artcard-lab` | 展示艺术卡和定制纸艺方向 |
| 纸艺工坊 | `/vanglam/atelier` | 展示工坊、生产、样品和品质能力 |
| 资料与工具 | `/vanglam/library-tools` | 展示资料、工具和下载入口 |
| 样品申请 | `/vanglam/request-sample-kit` | 收集样品申请和客户线索 |
| 四十二色色卡 | `/vanglam-42` | 色彩系统扩展展示页 |

---

## 四、客户服务器待盘点事项

上线替换前，需要先弄清客户服务器当前网站是如何运行的。服务器上可能存在旧代码，不能直接覆盖。

需要确认以下内容：

1. 当前服务器使用的是宝塔面板、Nginx、Apache，还是 Node 服务。
2. 当前域名绑定在哪个站点目录。
3. 当前网站根目录在哪里。
4. 当前网站是否有后端接口。
5. 当前网站是否有数据库。
6. 当前网站是否由 PM2、Docker、宝塔 Node 项目或普通静态目录运行。
7. 当前 SSL 证书在哪里配置。
8. 当前站点是否有伪静态 / 前端路由回退规则。
9. 当前旧代码是否需要备份。
10. 新代码替换后如何回滚。

---

## 五、VPS 只读盘点命令

以下命令只用于查看服务器状态，不会删除或覆盖文件。

```bash
hostname
whoami
pwd
date
cat /etc/os-release
free -h
df -h
uptime
```

查看 Web 服务：

```bash
systemctl status nginx --no-pager
systemctl status httpd --no-pager
systemctl status mysqld --no-pager
systemctl status mariadb --no-pager
systemctl status docker --no-pager
```

查看端口：

```bash
ss -tulpn
```

查看宝塔网站目录：

```bash
ls -la /www
ls -la /www/wwwroot
ls -la /www/server/panel/vhost/nginx
ls -la /www/server/panel/vhost/apache
```

查看站点配置：

```bash
grep -R "server_name" /www/server/panel/vhost/nginx 2>/dev/null
grep -R "root " /www/server/panel/vhost/nginx 2>/dev/null
grep -R "qilipaper" /www/server/panel/vhost/nginx /www/wwwroot 2>/dev/null
```

查看 Node / PM2：

```bash
node -v
npm -v
pm2 list
ps aux | grep -E "node|vite|next|nuxt|pm2" | grep -v grep
```

---

## 六、建议部署流程

1. 先盘点服务器，确认旧站点目录和运行方式。
2. 备份旧站点目录，备份名称带日期。
3. 上传 `qilipaper-vanglam-dist-20260605.zip` 到服务器。
4. 解压到临时目录，不直接覆盖线上目录。
5. 检查 `index.html`、`assets`、`vanglam` 静态资源是否完整。
6. 配置 Nginx 前端路由回退：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

7. 切换站点根目录或同步文件到网站根目录。
8. 重载 Nginx。
9. 访问首页和主要栏目进行检查。
10. 如果出现异常，立即恢复旧站点目录。

---

## 七、后续开发方向

第一阶段后续重点不再是继续写静态页面，而是搭建后台和服务端：

1. 搭建统一服务端。
2. 搭建后台管理系统。
3. 建立数据库。
4. 建立图片、视频、文件上传能力。
5. 建立内容接口。
6. 把前台每个页面改成从后台读取内容。
7. 把样品申请改成真实提交到后台。
8. 给后续小程序预留接口。
9. 配置服务器部署、备份、安全和维护流程。

---

## 八、当前保留在本仓库的内容

当前综合项目后续只保留以下与齐力纸业有关的内容：

1. 后台建设需求确认文档。
2. 开发进度与部署迁移记录。
3. 后续服务端开发过程中的计划、变更记录和验收记录。

当前综合项目不再保留以下内容：

1. 齐力纸业前台页面源码。
2. 齐力纸业前台静态图片资源。
3. 齐力纸业前台页面测试代码。
4. 齐力纸业在首页的项目入口卡片。

---

## 九、重要原则

1. 客户服务器上的旧代码先备份，再替换。
2. 不在没有确认站点目录的情况下覆盖服务器文件。
3. 不把服务器账号、密码、面板信息写入代码仓库。
4. 不把客户正式资料混入当前综合项目。
5. 后续所有正式业务开发都围绕客户服务器和独立项目进行。

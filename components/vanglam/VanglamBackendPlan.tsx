import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CloudUpload,
  Database,
  FileText,
  MonitorCog,
  Smartphone,
  Wrench,
  Workflow,
} from 'lucide-react';
import { VanglamFooter } from './VanglamFooter';
import { VanglamNavbar } from './VanglamNavbar';
import './vanglam.css';

const topicRows = [
  { name: '色彩系统', path: '/vanglam/color-system', module: '色系、颜色、标志色、色彩关联' },
  { name: '产品系列', path: '/vanglam/collections', module: '八个产品系列、规格、推荐关系' },
  { name: '表面工艺', path: '/vanglam/surfaces', module: '工艺分类、纹理库、工艺兼容关系' },
  { name: '应用场景', path: '/vanglam/applications', module: '六类应用场景、材料方案、推荐关系' },
  { name: '艺术卡实验室', path: '/vanglam/artcard-lab', module: '作品分类、作品条目、定制入口' },
  { name: '纸艺工坊', path: '/vanglam/atelier', module: '生产制造、样品制作、品质控制、材料理念' },
  { name: '资料与工具', path: '/vanglam/library-tools', module: '资料分类、资料文件、下载按钮、关联关系' },
];

const developerScope = [
  '整体服务端框架',
  '后台登录与权限',
  '七大主题后台入口',
  '首页与按钮维护入口',
  '图片、视频、文件上传入口',
  '数据库、文件存储与接口',
  '前台读取后台内容',
  '基础操作日志',
];

const clientScope = [
  '整理并录入最终中文文案',
  '整理并录入最终外文文案',
  '整理并上传产品、色卡、工艺、场景图片',
  '整理并上传视频资源',
  '整理并上传样册、技术、防伪、定制资料',
  '检查按钮跳转和最终展示内容',
];

const excludedScope = [
  '小程序前端开发',
  '客户正式内容整理、上传和录入执行',
  '复杂客户关系系统',
  '复杂销售分配流程',
  '复杂筛选、推荐、报价流程',
  '第三方业务系统对接',
];

const databaseRows = [
  '管理员、角色、权限',
  '品牌信息、导航、按钮链接',
  '页面基础、页面模块、媒体资源',
  '色系、颜色、标志色',
  '产品系列、产品规格',
  '表面工艺、纹理库',
  '应用场景、场景方案',
  '艺术卡分类、艺术卡作品',
  '纸艺工坊内容',
  '资料分类、资料文件',
  '样品申请、客户线索、跟进记录',
  '跨主题关联、操作日志、页面优化',
];

const maintenanceRows = [
  {
    title: '按月维护',
    body: '每月固定维护费，覆盖基础技术支持、简单问题修复、服务器检查、备份检查、上传异常处理、表单异常处理。',
  },
  {
    title: '按功能维护',
    body: '每次新增页面、功能、接口、小程序能力、复杂筛选、资料留资或统计报表前，先确认需求、价格和周期。',
  },
];

const mapLines = [
  { d: 'M88 250 C150 88 184 70 258 70', className: 'flow-blue', width: 18 },
  { d: 'M88 250 C150 128 184 114 258 114', className: 'flow-blue', width: 18 },
  { d: 'M88 250 C150 166 184 158 258 158', className: 'flow-blue', width: 18 },
  { d: 'M88 250 C150 210 184 202 258 202', className: 'flow-blue', width: 18 },
  { d: 'M88 250 C150 252 184 246 258 246', className: 'flow-blue', width: 18 },
  { d: 'M88 250 C150 296 184 290 258 290', className: 'flow-blue', width: 18 },
  { d: 'M88 250 C150 340 184 334 258 334', className: 'flow-blue', width: 18 },
  { d: 'M330 114 C378 116 406 124 462 142', className: 'flow-cyan', width: 20 },
  { d: 'M330 202 C378 202 406 194 462 184', className: 'flow-cyan', width: 20 },
  { d: 'M330 290 C378 284 406 266 462 238', className: 'flow-cyan', width: 20 },
  { d: 'M540 172 C588 152 614 138 666 138', className: 'flow-green', width: 30 },
  { d: 'M540 216 C588 218 614 222 666 222', className: 'flow-green', width: 28 },
  { d: 'M540 264 C588 298 614 320 666 326', className: 'flow-green', width: 26 },
  { d: 'M735 138 C794 132 838 128 890 126', className: 'flow-gold', width: 28 },
  { d: 'M735 222 C794 220 838 226 890 232', className: 'flow-gold', width: 26 },
  { d: 'M735 326 C794 322 838 312 890 304', className: 'flow-gold', width: 24 },
  { d: 'M735 222 C795 258 840 282 890 304', className: 'flow-rose', width: 14 },
];

const topicNodes = [
  '色彩系统',
  '产品系列',
  '表面工艺',
  '应用场景',
  '艺术卡实验室',
  '纸艺工坊',
  '资料与工具',
];

export const VanglamBackendPlanPage: React.FC = () => {
  return (
    <div className="vanglam-v1-page vanglam-backend-plan-page">
      <VanglamNavbar />
      <main>
        <section className="vanglam-backend-hero" aria-labelledby="backend-plan-title">
          <div>
            <span>后台建设规划图</span>
            <h1 id="backend-plan-title">把官网现有页面，变成客户可维护的后台入口。</h1>
            <p>
              第一期开通服务端框架、后台入口、上传入口、数据库、接口和前台读取关系。客户在后台自行整理、上传、录入和维护正式内容。
            </p>
          </div>
          <div className="vanglam-backend-hero-metrics" aria-label="第一期确认信息">
            <article>
              <CircleDollarSign size={22} strokeWidth={1.4} />
              <span>第一期费用</span>
              <strong>人民币三万元</strong>
            </article>
            <article>
              <Clock3 size={22} strokeWidth={1.4} />
              <span>开发周期</span>
              <strong>六到八周</strong>
            </article>
            <article>
              <Database size={22} strokeWidth={1.4} />
              <span>数据结构</span>
              <strong>三十二张核心表</strong>
            </article>
            <article>
              <Smartphone size={22} strokeWidth={1.4} />
              <span>后续小程序</span>
              <strong>共用同一套后台</strong>
            </article>
          </div>
        </section>

        <section className="vanglam-flow-window" aria-labelledby="backend-flow-title">
          <aside className="vanglam-flow-sidebar" aria-label="后台规划目录">
            <h2>齐力纸业后台</h2>
            {[
              ['总览', Workflow],
              ['七大主题', MonitorCog],
              ['数据库', Database],
              ['上传入口', CloudUpload],
              ['开发边界', FileText],
              ['后续维护', Wrench],
            ].map(([label, Icon]) => {
              const SidebarIcon = Icon as typeof Workflow;
              return (
                <div key={label as string} className="vanglam-flow-sidebar-item">
                  <SidebarIcon size={16} strokeWidth={1.55} />
                  <span>{label as string}</span>
                </div>
              );
            })}
          </aside>

          <div className="vanglam-flow-main">
            <header className="vanglam-flow-heading">
              <div>
                <span>Client Confirmation Map</span>
                <h2 id="backend-flow-title">官网前台到后台服务端的流向</h2>
              </div>
              <strong>开发方做入口 · 客户上传内容</strong>
            </header>

            <div className="vanglam-flow-scroll" aria-label="后台建设流向图">
              <div className="vanglam-flow-canvas">
                <svg className="vanglam-flow-lines" viewBox="0 0 980 430" aria-hidden="true">
                  {mapLines.map((line) => (
                    <path key={line.d} d={line.d} className={line.className} strokeWidth={line.width} />
                  ))}
                </svg>

                <div className="vanglam-flow-node node-source">
                  <span>前台现有页面</span>
                  <strong>文字 / 图片 / 视频 / 按钮 / 栏目 / 文件</strong>
                </div>

                {topicNodes.map((topic, index) => (
                  <div key={topic} className="vanglam-flow-node node-topic" style={{ top: 47 + index * 44 }}>
                    {topic}
                  </div>
                ))}

                <div className="vanglam-flow-node node-module module-one">
                  <span>七大主题维护入口</span>
                  <strong>首页 + 色彩 + 产品 + 工艺 + 场景 + 艺术卡 + 工坊 + 资料</strong>
                </div>
                <div className="vanglam-flow-node node-module module-two">
                  <span>全站可编辑入口</span>
                  <strong>按钮链接 / 栏目排序 / 显示隐藏 / 页面基础信息</strong>
                </div>
                <div className="vanglam-flow-node node-module module-three">
                  <span>资源与线索入口</span>
                  <strong>媒体库 / 样品申请 / 客户线索 / 跟进记录</strong>
                </div>

                <div className="vanglam-flow-node node-core core-db">
                  <Database size={18} strokeWidth={1.45} />
                  <span>主业务数据库</span>
                  <strong>三十二张核心表</strong>
                </div>
                <div className="vanglam-flow-node node-core core-api">
                  <Workflow size={18} strokeWidth={1.45} />
                  <span>服务端接口</span>
                  <strong>官网读取 + 小程序预留</strong>
                </div>
                <div className="vanglam-flow-node node-core core-media">
                  <CloudUpload size={18} strokeWidth={1.45} />
                  <span>统一媒体资源库</span>
                  <strong>图片 / 视频 / 样册 / 技术资料</strong>
                </div>

                <div className="vanglam-flow-node node-output output-web">
                  <span>官网前台</span>
                  <strong>保存后读取后台内容</strong>
                </div>
                <div className="vanglam-flow-node node-output output-mini">
                  <span>后续小程序</span>
                  <strong>共用后台、数据库与资源库</strong>
                </div>
                <div className="vanglam-flow-node node-output output-client">
                  <span>客户运营</span>
                  <strong>整理、上传、录入和维护正式内容</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="vanglam-plan-band" aria-labelledby="plan-topics-title">
          <div className="vanglam-page-section-heading">
            <span>七大主题与后台模块</span>
            <h2 id="plan-topics-title">顶部固定七个主题，每个主题都有后台入口。</h2>
          </div>
          <div className="vanglam-plan-topic-grid">
            {topicRows.map((topic) => (
              <article key={topic.name} className="vanglam-plan-topic-card">
                <span>{topic.path}</span>
                <h3>{topic.name}</h3>
                <p>{topic.module}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="vanglam-plan-split" aria-label="开发边界">
          <article>
            <h2>开发方负责</h2>
            <ul>
              {developerScope.map((item) => (
                <li key={item}><CheckCircle2 size={15} strokeWidth={1.7} />{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2>客户负责</h2>
            <ul>
              {clientScope.map((item) => (
                <li key={item}><CheckCircle2 size={15} strokeWidth={1.7} />{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2>第一期不包含</h2>
            <ul>
              {excludedScope.map((item) => (
                <li key={item}><CheckCircle2 size={15} strokeWidth={1.7} />{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="vanglam-plan-database" aria-labelledby="plan-database-title">
          <div className="vanglam-page-section-heading">
            <span>数据库与关联关系</span>
            <h2 id="plan-database-title">一个主业务数据库，三十二张核心表，官网和小程序共用。</h2>
          </div>
          <div className="vanglam-database-list">
            {databaseRows.map((row, index) => (
              <div key={row}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{row}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="vanglam-maintenance-band" aria-labelledby="maintenance-title">
          <div>
            <span>后续维护</span>
            <h2 id="maintenance-title">维护费用不包含在三万元开发费用内。</h2>
            <p>项目交付后，维护按月维护或按功能维护执行。新增功能在执行前确认需求、价格和周期。</p>
          </div>
          <div className="vanglam-maintenance-cards">
            {maintenanceRows.map((row) => (
              <article key={row.title}>
                <Wrench size={20} strokeWidth={1.4} />
                <h3>{row.title}</h3>
                <p>{row.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="vanglam-plan-final-cta">
          <div>
            <span>第一期确认口径</span>
            <h2>三万元用于搭建框架、入口、上传能力、数据库、接口和前台读取。</h2>
            <p>客户正式内容整理、上传和录入执行属于客户运营工作，不作为服务端框架和后台入口完成的验收标准。</p>
          </div>
          <a href="#backend-flow-title">
            回到规划图 <ArrowRight size={14} strokeWidth={1.6} />
          </a>
        </section>
      </main>
      <VanglamFooter />
    </div>
  );
};

export default VanglamBackendPlanPage;

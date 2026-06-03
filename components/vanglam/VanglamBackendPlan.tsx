import React from 'react';
import { VanglamFooter } from './VanglamFooter';
import { VanglamNavbar } from './VanglamNavbar';
import './vanglam.css';

const overviewRows = [
  ['项目名称', '齐力纸业梵澜官网后台管理系统'],
  ['第一期费用', '人民币三万元'],
  ['开发周期', '六到八周'],
  ['建设方式', '服务端框架、后台入口、上传入口、数据库、接口和前台读取一次搭建'],
  ['数据结构', '三十二张核心表'],
  ['后续小程序', '小程序共用同一套后台、数据库、接口和媒体资源库'],
  ['内容录入', '客户负责正式文字、图片、视频和资料文件的整理、上传、录入和维护'],
];

const topicRows = [
  ['色彩系统', '/vanglam/color-system', '色系、颜色、标志色、色彩关联', '点击顶部“色彩系统”进入'],
  ['产品系列', '/vanglam/collections', '八个产品系列、规格、推荐关系', '点击顶部“产品系列”进入'],
  ['表面工艺', '/vanglam/surfaces', '工艺分类、纹理库、工艺兼容关系', '点击顶部“表面工艺”进入'],
  ['应用场景', '/vanglam/applications', '六类应用场景、材料方案、推荐关系', '点击顶部“应用场景”进入'],
  ['艺术卡实验室', '/vanglam/artcard-lab', '作品分类、作品条目、定制入口', '点击顶部“艺术卡实验室”进入'],
  ['纸艺工坊', '/vanglam/atelier', '生产制造、样品制作、品质控制、材料理念', '点击顶部“纸艺工坊”进入'],
  ['资料与工具', '/vanglam/library-tools', '资料分类、资料文件、下载按钮、关联关系', '点击顶部“资料与工具”进入'],
];

const mindMapRows = [
  {
    name: '色彩系统',
    route: '/vanglam/color-system',
    branches: [
      '前台点击：顶部导航“色彩系统”进入色彩系统页。',
      '后台入口：色系管理、颜色管理、标志色管理、色彩与产品关联。',
      '数据库关联：色系表、颜色表、标志色表、颜色产品关联表、媒体资源表。',
      '资源上传：色卡图、色彩封面图、颜色样张、色彩说明文案。',
      '关联方向：关联产品系列、资料与工具、小程序色彩展示。',
    ],
  },
  {
    name: '产品系列',
    route: '/vanglam/collections',
    branches: [
      '前台点击：顶部导航“产品系列”进入产品系列页。',
      '后台入口：系列管理、规格管理、产品图片、推荐产品关系。',
      '数据库关联：产品系列表、产品规格表、颜色产品关联表、产品工艺关联表、媒体资源表。',
      '资源上传：系列封面、产品样张、规格参数、产品视频。',
      '关联方向：关联色彩系统、表面工艺、应用场景、资料与工具、小程序产品展示。',
    ],
  },
  {
    name: '表面工艺',
    route: '/vanglam/surfaces',
    branches: [
      '前台点击：顶部导航“表面工艺”进入表面工艺页。',
      '后台入口：工艺分类、纹理库、工艺图片、工艺兼容关系。',
      '数据库关联：表面工艺表、纹理库表、产品工艺关联表、媒体资源表。',
      '资源上传：工艺封面、纹理细节图、工艺视频、工艺说明。',
      '关联方向：关联产品系列、应用场景、资料与工具、小程序工艺展示。',
    ],
  },
  {
    name: '应用场景',
    route: '/vanglam/applications',
    branches: [
      '前台点击：顶部导航“应用场景”进入应用场景页。',
      '后台入口：场景分类、场景方案、推荐材料、场景图片。',
      '数据库关联：应用场景表、场景方案表、场景推荐关联表、媒体资源表。',
      '资源上传：场景封面、案例图片、方案说明、应用视频。',
      '关联方向：关联产品系列、表面工艺、艺术卡实验室、小程序场景展示。',
    ],
  },
  {
    name: '艺术卡实验室',
    route: '/vanglam/artcard-lab',
    branches: [
      '前台点击：顶部导航“艺术卡实验室”进入艺术卡实验室页。',
      '后台入口：作品分类、作品条目、作品图片、定制入口。',
      '数据库关联：艺术卡分类表、艺术卡作品表、资料关联表、媒体资源表。',
      '资源上传：作品封面、作品详情图、制作视频、定制说明。',
      '关联方向：关联应用场景、产品系列、资料与工具、小程序作品展示。',
    ],
  },
  {
    name: '纸艺工坊',
    route: '/vanglam/atelier',
    branches: [
      '前台点击：顶部导航“纸艺工坊”进入纸艺工坊页。',
      '后台入口：工坊栏目、生产制造、样品制作、品质控制、材料理念。',
      '数据库关联：纸艺工坊内容表、页面模块表、媒体资源表。',
      '资源上传：工坊图片、生产过程视频、团队或设备图片、栏目文案。',
      '关联方向：关联样品申请、品牌内容、资料与工具、小程序工坊展示。',
    ],
  },
  {
    name: '资料与工具',
    route: '/vanglam/library-tools',
    branches: [
      '前台点击：顶部导航“资料与工具”进入资料与工具页。',
      '后台入口：资料分类、资料文件、下载按钮、资料与主题关联。',
      '数据库关联：资料分类表、资料文件表、资料关联表、按钮链接表、媒体资源表。',
      '资源上传：样册、PDF、技术资料、防伪资料、定制资料、工具封面。',
      '关联方向：关联色彩系统、产品系列、表面工艺、应用场景、小程序资料下载。',
    ],
  },
];

const databaseRows = [
  ['01', '管理员表、角色表、权限表', '后台账号、角色和操作权限'],
  ['02', '品牌信息表、导航表、按钮链接表', '公司信息、顶部七大主题、全站按钮和跳转地址'],
  ['03', '页面基础表、页面模块表、页面优化表', '页面标题、模块顺序、页面描述和分享信息'],
  ['04', '媒体资源表', '图片、视频、样册、技术资料和其他文件资源'],
  ['05', '色系表、颜色表、标志色表', '六大色系、四十二色、首页三款标志色'],
  ['06', '产品系列表、产品规格表', '八个产品系列、克重、厚度、工艺适配等资料'],
  ['07', '表面工艺表、纹理库表', '工艺分类、二百多种纹理、工艺兼容关系'],
  ['08', '应用场景表、场景方案表', '六个应用场景、材料推荐方案'],
  ['09', '艺术卡分类表、艺术卡作品表', '邀请函、贺卡、明信片、纸艺物件等作品'],
  ['10', '纸艺工坊内容表', '生产制造、样品制作、品质控制、材料哲学、创始人故事'],
  ['11', '资料分类表、资料文件表', '颜色搭配库、纸张纹路库、纸样工艺库、定制库、防伪库、特殊工艺库'],
  ['12', '样品申请表、客户线索表、跟进记录表', '样品申请、客户联系方式、销售跟进记录'],
  ['13', '颜色产品关联表、产品工艺关联表、场景推荐关联表、资料关联表', '七大主题之间的推荐关系和资料引用关系'],
  ['14', '操作日志表', '后台关键操作记录'],
];

const developerScope = [
  '搭建整体服务端框架。',
  '搭建后台管理系统。',
  '建立数据库、文件存储、接口和权限。',
  '打通前台页面与后台数据。',
  '做好首页、七大主题、按钮、栏目、图片、视频、文件的维护入口。',
  '做好样品申请、客户线索、媒体资源库和基础操作日志。',
  '预留小程序字段和接口方向。',
];

const clientScope = [
  '整理并录入最终中文文案。',
  '整理并录入最终外文文案。',
  '整理并上传产品、色卡、工艺、场景、艺术卡、工坊图片。',
  '整理并上传视频资源。',
  '整理并上传样册、技术资料、防伪资料和定制资料。',
  '确认每个按钮跳转是否符合业务要求。',
  '确认每个页面最终展示内容。',
];

const excludedScope = [
  '小程序前端开发。',
  '客户正式内容整理、上传和录入执行。',
  '复杂客户关系系统。',
  '复杂销售分配流程。',
  '资料下载留资的复杂规则。',
  '复杂统计报表。',
  '复杂筛选、推荐、报价流程。',
  '第三方业务系统对接。',
];

const workloadGroups = [
  {
    title: '服务端基础框架',
    items: [
      '搭建后台服务运行框架、接口路由、基础配置和部署结构。',
      '建立后台登录、管理员账号、角色权限和接口鉴权。',
      '处理前台官网、后台管理端、后续小程序共用同一套接口的基础结构。',
      '处理接口返回格式、错误提示、基础校验和异常兜底。',
    ],
  },
  {
    title: '后台管理端',
    items: [
      '搭建后台登录入口、管理首页、左侧菜单和七大主题管理入口。',
      '为页面栏目、按钮、文字、图片、视频、资料文件建立新增、编辑、删除、排序和显示开关。',
      '为客户线索、样品申请、跟进记录建立查看、处理和记录入口。',
      '为媒体资源库建立上传、选择、替换、删除和引用入口。',
    ],
  },
  {
    title: '数据库与数据关系',
    items: [
      '按三十二张核心表建立管理员、角色、权限、页面、模块、媒体、产品、工艺、场景、资料、线索等结构。',
      '建立颜色与产品、产品与工艺、场景与产品、资料与主题之间的关联关系。',
      '为首页和七大主题保留排序、显示状态、封面图、简介、详情内容和小程序展示字段。',
      '处理后台保存后前台读取的数据字段对应关系。',
    ],
  },
  {
    title: '文件上传与资源管理',
    items: [
      '支持图片、视频、PDF、样册、技术资料、防伪资料和定制资料上传。',
      '建立资源标题、分类、用途、关联页面、排序和显示状态。',
      '让同一张图片、同一个视频、同一份资料可以被多个页面或主题引用。',
      '处理上传文件在官网和后续小程序中的统一读取方式。',
    ],
  },
  {
    title: '前台页面数据化',
    items: [
      '把官网首页和七大主题页面中展示出来的文字、栏目、按钮、图片和资料入口接入后台数据。',
      '处理前台页面读取后台内容后的展示顺序、显示隐藏、链接跳转和资源显示。',
      '保留现有官网视觉效果，同时把静态内容改成可维护内容。',
      '确保客户后续上传新内容后，官网页面可以按后台数据更新。',
    ],
  },
  {
    title: '小程序预留',
    items: [
      '在数据表中增加小程序显示开关、小程序排序、小程序封面、小程序简介和分享信息。',
      '接口结构按官网和小程序共用方式设计，后续小程序不需要重新搭一套后台。',
      '样品申请、资料读取、产品展示、工艺展示、场景展示可以共用当前后台数据。',
      '后续开发小程序时，直接接入同一套服务端、数据库和媒体资源库。',
    ],
  },
];

const editableRows = [
  ['首页', '品牌文字、主视觉图片、栏目标题、栏目排序、主题入口、按钮文字、按钮链接、推荐内容、样品申请入口。'],
  ['色彩系统', '色系名称、颜色名称、色值、色卡图片、标志色、颜色说明、关联产品、排序和显示状态。'],
  ['产品系列', '系列名称、系列介绍、产品图片、规格参数、克重厚度、推荐工艺、推荐场景、资料关联。'],
  ['表面工艺', '工艺分类、工艺名称、纹理图片、工艺视频、工艺说明、适配产品、排序和显示状态。'],
  ['应用场景', '场景分类、场景名称、方案说明、案例图片、推荐产品、推荐工艺、跳转按钮。'],
  ['艺术卡实验室', '作品分类、作品名称、作品图片、作品说明、定制入口、关联产品和关联场景。'],
  ['纸艺工坊', '工坊栏目、生产制造内容、样品制作内容、品质控制内容、材料理念、图片和视频。'],
  ['资料与工具', '资料分类、资料标题、资料封面、PDF 文件、下载按钮、资料说明、关联主题。'],
  ['客户线索', '样品申请表单、客户姓名、联系方式、需求内容、来源页面、处理状态、跟进记录。'],
  ['全站公共内容', '顶部导航、底部信息、按钮链接、页面标题、SEO 描述、媒体资源、操作日志。'],
];

const deliveryRows = [
  ['后台入口建设', '登录、菜单、七大主题入口、首页入口、资料入口、线索入口、媒体库入口。'],
  ['增删改查能力', '主要内容支持新增、编辑、删除、排序、显示隐藏、保存后前台读取。'],
  ['上传能力', '图片、视频、PDF、样册和技术资料上传，并能关联到对应页面或栏目。'],
  ['接口能力', '官网首页、七大主题页面、样品申请、资料读取、小程序预留接口结构。'],
  ['权限能力', '管理员账号、角色权限、后台登录鉴权、关键操作日志。'],
  ['交付能力', '完成开发、联调、基础测试、上线部署配合和后台使用说明。'],
];

const maintenanceRows = [
  ['按月维护', '每月固定维护费', '基础技术支持、简单问题修复、服务器检查、备份检查、上传异常处理、表单异常处理、后台登录异常处理。'],
  ['按功能维护', '按单次功能报价', '新增页面、新增功能、新增接口、小程序能力扩展、复杂筛选、资料留资、统计报表和第三方系统对接。'],
];

const acceptanceRows = [
  '后台入口是否完整。',
  '图片、视频和文件是否可以上传。',
  '后台保存后前台是否能读取和显示。',
  '按钮链接是否可以修改。',
  '栏目是否可以排序和设置显示。',
  '样品申请是否可以提交并进入后台。',
  '客户线索是否可以查看和记录跟进。',
  '操作日志是否能记录关键操作。',
];

const renderList = (items: string[]) => (
  <ul className="vanglam-doc-list">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const renderMindMap = () => (
  <section id="mind-map" className="vanglam-doc-section vanglam-doc-mindmap-section">
    <h2>七大主题思维导图</h2>
    <p>
      思维导图按照官网首页顶部固定七个主题拆分。每个主题都对应一个前台跳转地址、一个后台维护入口、一组数据库关联、一组图片视频资料上传入口，并预留给后续小程序共用。
    </p>
    <div className="vanglam-doc-mindmap" aria-label="后台建设思维导图">
      <div className="vanglam-doc-mindmap-root">
        <span>总入口</span>
        <strong>齐力纸业梵澜官网后台</strong>
        <p>一个主业务数据库 / 三十二张核心表 / 开发周期六到八周 / 第一期费用人民币三万元</p>
      </div>
      <div className="vanglam-doc-mindmap-grid">
        {mindMapRows.map((topic, index) => (
          <article key={topic.name}>
            <div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{topic.name}</h3>
              <strong>{topic.route}</strong>
            </div>
            <ul>
              {topic.branches.map((branch) => (
                <li key={branch}>{branch}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="vanglam-doc-mindmap-footer">
        <strong>公共关联</strong>
        <p>
          七个主题共用页面基础表、页面模块表、按钮链接表、媒体资源表、样品申请表、客户线索表、操作日志表和小程序显示字段。官网前台、后台管理端和后续小程序端读取同一套数据。
        </p>
      </div>
    </div>
  </section>
);

export const VanglamBackendPlanPage: React.FC = () => {
  return (
    <div className="vanglam-v1-page vanglam-backend-doc-page">
      <VanglamNavbar />
      <main className="vanglam-backend-doc">
        <section className="vanglam-doc-cover" aria-labelledby="backend-plan-title">
          <p>客户确认版 / 后台开发范围</p>
          <h1 id="backend-plan-title">齐力纸业梵澜官网后台建设开发文档</h1>
          <div className="vanglam-doc-meta-grid" aria-label="项目基础信息">
            {overviewRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        {renderMindMap()}

        <div className="vanglam-doc-layout">
          <aside className="vanglam-doc-toc" aria-label="文档目录">
            <a href="#mind-map">七大主题思维导图</a>
            <a href="#goal">一、建设目标</a>
            <a href="#scope">二、开发边界</a>
            <a href="#workload">三、工作量拆解</a>
            <a href="#topics">四、七大主题</a>
            <a href="#database">五、数据库</a>
            <a href="#mini-program">六、小程序关联</a>
            <a href="#price">七、费用周期</a>
            <a href="#maintenance">八、后续维护</a>
            <a href="#acceptance">九、验收标准</a>
          </aside>

          <div className="vanglam-doc-content">
            <section id="goal" className="vanglam-doc-section">
              <h2>一、建设目标</h2>
              <p>
                后台建设目标是把官网已经展示出来的页面、栏目、按钮、图片、视频、资料文件和客户线索做成可维护入口。
                第一期开通服务端框架、后台入口、上传入口、数据库、接口和前台读取关系。
              </p>
              <p>
                官网后续新增内容由客户在后台自行整理、上传、录入和维护。开发方负责把入口、数据结构、接口和前台读取搭好。
              </p>
            </section>

            <section id="scope" className="vanglam-doc-section">
              <h2>二、开发边界</h2>
              <div className="vanglam-doc-scope-grid">
                <article>
                  <h3>开发方负责</h3>
                  {renderList(developerScope)}
                </article>
                <article>
                  <h3>客户负责</h3>
                  {renderList(clientScope)}
                </article>
                <article>
                  <h3>第一期不包含</h3>
                  {renderList(excludedScope)}
                </article>
              </div>
            </section>

            <section id="workload" className="vanglam-doc-section">
              <h2>三、工作量拆解</h2>
              <p>
                第一期人民币三万元对应的是官网后台和服务端基础能力建设，不是单独制作一个资料页面。交付内容覆盖后台管理端、服务端接口、数据库结构、文件上传、前台读取、小程序预留、权限日志和基础部署联调。
              </p>
              <div className="vanglam-doc-workload-grid">
                {workloadGroups.map((group) => (
                  <article key={group.title}>
                    <h3>{group.title}</h3>
                    {renderList(group.items)}
                  </article>
                ))}
              </div>

              <h3>可编辑范围</h3>
              <p>
                官网当前展示出来的每个页面、每个栏目、每个按钮、每张图片、每个视频和每份资料文件，都按后台可维护的方向处理。客户后续负责正式内容整理和录入，开发方负责让这些入口可用、可保存、可读取。
              </p>
              <table className="vanglam-doc-table">
                <thead>
                  <tr>
                    <th>范围</th>
                    <th>后台可维护内容</th>
                  </tr>
                </thead>
                <tbody>
                  {editableRows.map(([scope, content]) => (
                    <tr key={scope}>
                      <td>{scope}</td>
                      <td>{content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>交付能力</h3>
              <table className="vanglam-doc-table">
                <thead>
                  <tr>
                    <th>交付项</th>
                    <th>对应工作</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryRows.map(([item, work]) => (
                    <tr key={item}>
                      <td>{item}</td>
                      <td>{work}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="topics" className="vanglam-doc-section">
              <h2>四、七大主题与后台模块</h2>
              <table className="vanglam-doc-table">
                <thead>
                  <tr>
                    <th>顶部主题</th>
                    <th>前台路径</th>
                    <th>后台模块</th>
                    <th>点击关系</th>
                  </tr>
                </thead>
                <tbody>
                  {topicRows.map(([name, path, module, relation]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{path}</td>
                      <td>{module}</td>
                      <td>{relation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="database" className="vanglam-doc-section">
              <h2>五、数据库建设清单</h2>
              <p>第一期按一个主业务数据库建设，核心结构按三十二张核心表规划，官网和后续小程序共用同一套内容数据。</p>
              <table className="vanglam-doc-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>数据表</th>
                    <th>用途</th>
                  </tr>
                </thead>
                <tbody>
                  {databaseRows.map(([number, name, usage]) => (
                    <tr key={number}>
                      <td>{number}</td>
                      <td>{name}</td>
                      <td>{usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="mini-program" className="vanglam-doc-section">
              <h2>六、小程序关联方式</h2>
              <p>
                后续小程序直接复用官网后台、服务端、数据库、媒体资源库和客户线索库，不再单独开发一套小程序后台。
              </p>
              {renderList([
                '小程序读取同一套七大主题内容。',
                '小程序读取同一套图片、视频、样册和资料文件。',
                '小程序提交的样品申请进入同一个后台。',
                '小程序字段包含是否在小程序显示、小程序排序、小程序封面图、小程序简介和分享信息。',
              ])}
            </section>

            <section id="price" className="vanglam-doc-section">
              <h2>七、费用与开发周期</h2>
              <table className="vanglam-doc-table">
                <tbody>
                  <tr>
                    <th>第一期基础版费用</th>
                    <td>人民币三万元</td>
                  </tr>
                  <tr>
                    <th>开发周期</th>
                    <td>六到八周</td>
                  </tr>
                  <tr>
                    <th>费用包含</th>
                    <td>服务端框架、后台入口、上传入口、数据库、接口、前台读取、权限角色、基础操作日志、小程序字段和接口方向预留。</td>
                  </tr>
                  <tr>
                    <th>费用对应工作</th>
                    <td>完成官网现有页面内容的数据化改造，建立七大主题后台入口，打通图片、视频、PDF、按钮、栏目、客户线索和资料文件的上传、保存、读取和展示关系。</td>
                  </tr>
                  <tr>
                    <th>费用不包含</th>
                    <td>小程序前端开发、客户正式内容整理上传录入、复杂业务系统、复杂筛选推荐、第三方系统对接。</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section id="maintenance" className="vanglam-doc-section">
              <h2>八、后续维护方式</h2>
              <p>后续维护费用不包含在三万元开发费用内。项目交付后维护分为按月维护和按功能维护两种方式。</p>
              <table className="vanglam-doc-table">
                <thead>
                  <tr>
                    <th>维护方式</th>
                    <th>计费方式</th>
                    <th>执行范围</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRows.map(([type, billing, scope]) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td>{billing}</td>
                      <td>{scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="acceptance" className="vanglam-doc-section">
              <h2>九、验收标准</h2>
              <p>
                技术验收看服务端框架、后台入口、上传能力、保存能力和前台读取是否完成，不以客户是否已经完成正式内容整理、上传和录入作为验收前提。
              </p>
              {renderList(acceptanceRows)}
            </section>
          </div>
        </div>
      </main>
      <VanglamFooter />
    </div>
  );
};

export default VanglamBackendPlanPage;

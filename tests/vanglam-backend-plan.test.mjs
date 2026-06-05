import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const navbarSource = fs.readFileSync('components/vanglam/VanglamNavbar.tsx', 'utf8');
const planSource = fs.readFileSync('components/vanglam/VanglamBackendPlan.tsx', 'utf8');
const cssSource = fs.readFileSync('components/vanglam/vanglam.css', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('VANGLAM exposes the backend plan from the top-right navigation', () => {
  assert.match(appSource, /path="\/vanglam\/backend-plan"/);
  assert.match(appSource, /VanglamBackendPlanPage/);
  assert.match(navbarSource, /className="vanglam-plan-link"/);
  assert.match(navbarSource, /to="\/vanglam\/backend-plan"/);
  assert.match(navbarSource, /后台开发文档/);
});

runTest('backend plan page contains the confirmed customer-facing scope', () => {
  for (const text of [
    '人民币三万元',
    '六到八周',
    '三十二张核心表',
    '共用同一套后台',
    '开发方负责',
    '客户负责',
    '第一期不包含',
    '客户正式内容整理、上传和录入执行',
    '按月维护',
    '按功能维护',
    '七大主题思维导图',
    '首页顶部固定七个主题',
    '/vanglam/color-system',
    '/vanglam/library-tools',
    '公共关联',
    '官网前台、后台管理端和后续小程序端',
    '三、工作量拆解',
    '服务端基础框架',
    '后台管理端',
    '数据库与数据关系',
    '文件上传与资源管理',
    '前台页面数据化',
    '可编辑范围',
    '费用对应工作',
    '每个页面、每个栏目、每个按钮、每张图片、每个视频和每份资料文件',
    '报价、下单、订单管理、库存管理、审批流程等公司内部业务功能',
    '销售人员自动分配、客户等级、客户跟进提醒等销售管理功能',
    '下载资料前填写联系方式',
    '按颜色、工艺、克重、用途等多个条件筛选产品',
    '根据场景自动推荐纸张、自动生成报价等功能',
    '四、开发日志与备注',
    'README 风格记录区',
    '项目成交与开发准备',
    '部署目标为客户阿里云 VPS',
    '部署前检查清单',
    '正式改动前备份网站文件、数据库和关键配置',
    '密码和服务器访问资料只用于部署，不写入页面、不写入代码、不提交 Git',
    '开发日志只记录阶段进度、开发事项、部署备注和交付状态',
  ]) {
    assert.match(planSource, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('backend plan mentions the confirmed first phase price only once', () => {
  assert.equal((planSource.match(/人民币三万元/g) || []).length, 1);
  assert.equal((planSource.match(/三万元/g) || []).length, 1);
});

runTest('backend plan uses a development document layout, not a decorative flow map', () => {
  for (const className of [
    '.vanglam-backend-doc',
    '.vanglam-doc-cover',
    '.vanglam-doc-meta-grid',
    '.vanglam-doc-toc',
    '.vanglam-doc-section',
    '.vanglam-doc-mindmap-section',
    '.vanglam-doc-mindmap',
    '.vanglam-doc-mindmap-grid',
    '.vanglam-doc-workload-grid',
    '.vanglam-readme-panel',
    '.vanglam-readme-timeline',
    '.vanglam-readme-checklist',
    '.vanglam-readme-note-grid',
    '.vanglam-doc-table',
  ]) {
    assert.match(cssSource, new RegExp(className.replace('.', '\\.')));
  }
  assert.doesNotMatch(planSource, /\.md/);
  assert.doesNotMatch(planSource, /mapLines|vanglam-flow|flow-blue|node-source/);
});

runTest('backend plan shows the mind map before the main document layout', () => {
  assert.ok(planSource.indexOf('{renderMindMap()}') < planSource.indexOf('className="vanglam-doc-layout"'));
});

runTest('backend plan avoids internal uncertainty language', () => {
  assert.doesNotMatch(planSource, /我的建议|可谈|不建议|建议维护|维护费用建议|稳定版|扩展版|三万元左右/);
});

runTest('backend plan avoids vague customer-facing scope words', () => {
  assert.doesNotMatch(planSource, /复杂业务系统|复杂筛选推荐|复杂客户关系系统|复杂销售分配流程|资料下载留资|资料留资|复杂筛选、推荐、报价流程/);
});

runTest('backend plan does not expose customer credentials in the page source', () => {
  assert.doesNotMatch(planSource, /super@admin\.com|12345678abc|40845193|ed0533d8459c|47\.254\.37\.236/);
});

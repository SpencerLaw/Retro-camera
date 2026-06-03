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
    '总览思维导图',
    '首页顶部固定七个主题',
    '/vanglam/color-system',
    '/vanglam/library-tools',
    '公共关联',
    '官网前台、后台管理端和后续小程序端',
  ]) {
    assert.match(planSource, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('backend plan uses a development document layout, not a decorative flow map', () => {
  for (const className of [
    '.vanglam-backend-doc',
    '.vanglam-doc-cover',
    '.vanglam-doc-meta-grid',
    '.vanglam-doc-toc',
    '.vanglam-doc-section',
    '.vanglam-doc-mindmap',
    '.vanglam-doc-mindmap-grid',
    '.vanglam-doc-table',
  ]) {
    assert.match(cssSource, new RegExp(className.replace('.', '\\.')));
  }
  assert.doesNotMatch(planSource, /\.md/);
  assert.doesNotMatch(planSource, /mapLines|vanglam-flow|flow-blue|node-source/);
});

runTest('backend plan avoids internal uncertainty language', () => {
  assert.doesNotMatch(planSource, /我的建议|可谈|不建议|建议维护|维护费用建议|稳定版|扩展版|三万元左右/);
});

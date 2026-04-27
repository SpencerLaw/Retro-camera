import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('doraemon-monitor/doraemon-monitor.css').toString('latin1');
const source = fs.readFileSync('doraemon-monitor/DoraemonMonitorApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const getRule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `${selector} rule should exist`);
  return match[1];
};

runTest('weekly report modal body supports tablet touch scrolling', () => {
  const bodyRule = getRule('.report-modal-body');
  assert.match(bodyRule, /overflow-y:\s*auto/);
  assert.match(bodyRule, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(bodyRule, /touch-action:\s*pan-y/);
  assert.match(bodyRule, /overscroll-behavior:\s*contain/);
});

runTest('weekly report body is the direct scroll surface', () => {
  assert.match(css, /Report modal final scroll surface/);
  assert.match(css, /\.report-modal-body\s*\{[\s\S]*?overflow-y:\s*auto/);
});

runTest('weekly report detail panes keep touch scrolling inside the dialog', () => {
  for (const selector of ['.report-modal-shell', '.report-day-sidebar', '.report-focus-shell']) {
    const rule = getRule(selector);
    assert.match(rule, /touch-action:\s*pan-y/);
    assert.match(rule, /overscroll-behavior:\s*contain/);
  }
});

runTest('weekly report trend stores real sampled points with elapsed time', () => {
  assert.match(source, /type SessionHistoryPoint = number \| \{/);
  assert.match(source, /REPORT_HISTORY_TARGET_POINTS = 48/);
  assert.match(source, /downsampleReportHistory\(rawHistory, totalSeconds, activeSession\.startedAt\)/);
  assert.match(source, /elapsedSeconds/);
});

runTest('weekly report trend renders a readable time axis', () => {
  assert.match(source, /buildReportTrendData\(record\)/);
  assert.match(source, /formatReportClock\(record\.startedAt\)/);
  assert.match(source, /formatReportClock\(record\.endedAt\)/);
  assert.match(css, /Report trend v2: real sampled timeline/);
  assert.match(css, /\.report-trend-plot/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

runTest('weekly report uses one native modal scroll surface', () => {
  assert.match(source, /currentWeekRecords\.map\(\(record\) =>/);
  assert.match(source, /style=\{\{[\s\S]*?overflowY:\s*'scroll'[\s\S]*?touchAction:\s*'pan-y'/);
  assert.doesNotMatch(source, /onWheelCapture=\{handleReportModalWheel\}/);
  assert.doesNotMatch(source, /onTouchMoveCapture=\{handleReportModalTouchMove\}/);
  assert.match(source, /pointerEvents:\s*'none'/);
});

runTest('weekly report is rendered as a stable subtree instead of a nested component type', () => {
  assert.match(source, /const reportBodyRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /const renderReportDrawer = \(\) =>/);
  assert.match(source, /\{renderReportDrawer\(\)\}/);
  assert.doesNotMatch(source, /const ReportDrawer = \(\) =>/);
  assert.doesNotMatch(source, /<ReportDrawer \/>/);
});

runTest('weekly report close button closes before drag or click handlers can interfere', () => {
  assert.match(source, /type="button"[\s\S]*?onClick=\{closeReport\}/);
  assert.match(source, /onPointerDown=\{\(event\) => \{[\s\S]*?closeReport\(\);[\s\S]*?\}\}/);
  assert.doesNotMatch(source, /onMouseDownCapture=\{handleReportMouseDown\}/);
  assert.doesNotMatch(source, /onPointerMove=\{handleReportPointerMove\}/);
});

runTest('weekly report previous/next semantics match latest-first records', () => {
  assert.match(source, /const hasPreviousReport = selectedReportIndex < selectedReportDay\.records\.length - 1/);
  assert.match(source, /const hasNextReport = selectedReportIndex > 0/);
});

runTest('rebuilt weekly report list has a direct scroll surface', () => {
  assert.match(source, /ref=\{reportBodyRef\}/);
  assert.match(source, /overflowY:\s*'scroll'/);
  assert.match(source, /overscrollBehavior:\s*'contain'/);
  assert.match(source, /touchAction:\s*'pan-y'/);
  assert.doesNotMatch(source, /onMouseDown=\{stopModalMouseDown\}[\s\S]{0,120}Body \(Scrollable\)/);
});

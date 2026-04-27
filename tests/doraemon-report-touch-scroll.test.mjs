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

runTest('weekly report shell is the native scroll surface', () => {
  assert.match(css, /Report modal native shell scroll fix/);
  assert.match(css, /\.report-modal-shell\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /\.report-modal-body\s*\{[\s\S]*?overflow:\s*visible/);
  assert.match(css, /\.report-modal-header\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /Report modal body scroll restore/);
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
  assert.match(source, /buildReportTrendData\(selectedReportRecord\)/);
  assert.match(source, /report-trend-timeline/);
  assert.match(source, /formatTimelineClock\(pts\[index\]\.at\)/);
  assert.match(source, /formatTimelineDuration\(pts\[index\]\.elapsedSeconds\)/);
  assert.match(css, /Report trend v2: real sampled timeline/);
  assert.match(css, /\.report-trend-plot/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

runTest('weekly report uses one modal-level scroll chain for mouse wheel and touch', () => {
  assert.match(css, /Report modal single scroll chain fix/);
  assert.match(css, /\.report-viewer-layout\s*\{[\s\S]*?flex:\s*0 0 auto/);
  assert.match(css, /\.report-focus-shell\s*\{[\s\S]*?overflow:\s*visible/);
  assert.match(css, /\.report-trend-card\s*\{[\s\S]*?touch-action:\s*pan-y/);
  assert.match(css, /\.report-trend-svg,\s*\.report-trend-annotations\s*\{[\s\S]*?pointer-events:\s*none/);
});

runTest('weekly report has wheel and touch fallback scrolling on the modal body', () => {
  assert.match(source, /const reportBodyRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /const reportShellRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /const scrollReportBodyBy = useCallback/);
  assert.match(source, /ref=\{reportShellRef\}/);
  assert.match(source, /target\.closest\('\.report-modal-shell'\)/);
  assert.match(source, /shell\.scrollTop = nextScrollTop/);
  assert.match(source, /onWheelCapture=\{handleReportModalWheel\}/);
  assert.match(source, /onTouchMoveCapture=\{handleReportModalTouchMove\}/);
  assert.match(source, /document\.addEventListener\('wheel', handleDocumentWheel, \{ capture: true, passive: false \}\)/);
  assert.match(source, /document\.addEventListener\('touchmove', handleDocumentTouchMove, \{ capture: true, passive: false \}\)/);
  assert.match(source, /onWheel=\{handleReportModalWheel\}/);
  assert.match(source, /onTouchMove=\{handleReportModalTouchMove\}/);
  assert.match(source, /body\.scrollTop = nextScrollTop/);
});

runTest('weekly report supports pointer drag scrolling for mouse and tablets', () => {
  assert.match(source, /const reportDragRef = useRef/);
  assert.match(source, /const reportMouseDragRef = useRef/);
  assert.match(source, /handleReportPointerDown/);
  assert.match(source, /handleReportPointerMove/);
  assert.match(source, /handleReportMouseMove/);
  assert.match(source, /shell\.scrollTop = drag\.startScrollTop \+ drag\.startY - event\.clientY/);
  assert.match(source, /body\.scrollTop = drag\.startScrollTop \+ drag\.startY - event\.clientY/);
  assert.match(source, /onPointerMove=\{handleReportPointerMove\}/);
  assert.match(source, /onMouseMoveCapture=\{handleReportMouseMove\}/);
});

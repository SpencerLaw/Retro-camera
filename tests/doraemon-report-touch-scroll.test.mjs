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

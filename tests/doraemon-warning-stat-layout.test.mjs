import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('doraemon-monitor/DoraemonMonitorApp.tsx', 'utf8');
const css = fs.readFileSync('doraemon-monitor/doraemon-monitor.css', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('warning stat card uses dedicated layout classes so labels do not collapse under action buttons', () => {
  assert.equal(source.includes('warning-stat-box'), true);
  assert.equal(source.includes('warning-stat-actions'), true);
});

runTest('warning reset help trigger stays attached to the lock button', () => {
  assert.equal(source.includes('warning-reset-settings-stack'), true);
  assert.match(css, /\.warning-reset-settings-stack\s*\{[^}]*position:\s*relative;/s);
  assert.match(css, /warning-reset-help-btn[^\{]*\{[^}]*position:\s*absolute;/s);
});

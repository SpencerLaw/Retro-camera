import assert from 'node:assert/strict';
import fs from 'node:fs';

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

runTest('warning reset dialog is not declared as an inline component inside DoraemonMonitorApp', () => {
  assert.equal(source.includes('const WarningResetDialog = () => {'), false);
});

runTest('warning reset dialog is rendered via a stable helper instead of JSX component remounts', () => {
  assert.equal(source.includes('{renderWarningResetDialog()}'), true);
});

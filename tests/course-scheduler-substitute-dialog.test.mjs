import assert from 'node:assert/strict';
import fs from 'node:fs';

const schedulerSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('course scheduler opens substitute recommendations in a modal dialog', () => {
  assert.match(schedulerSource, /showSubstituteDialog/);
  assert.match(schedulerSource, /setShowSubstituteDialog\(true\)/);
  assert.match(schedulerSource, /role="dialog"/);
  assert.match(schedulerSource, /aria-label="数据诊断及临时代课调配"/);
  assert.match(schedulerSource, /data-ui-surface="substitute-dialog"/);
  assert.match(schedulerSource, /style=\{\{ position: 'fixed', inset: 0 \}\}/);
  assert.match(schedulerSource, /fixed inset-0 z-50 flex items-center justify-center/);
  assert.match(schedulerSource, /aria-label="关闭调配弹窗"/);
});

runTest('course scheduler no longer reserves a right sidebar for substitute recommendations', () => {
  assert.doesNotMatch(schedulerSource, /showRightSidebar/);
  assert.doesNotMatch(schedulerSource, /setShowRightSidebar/);
  assert.doesNotMatch(schedulerSource, /id="right_sidebar"/);
  assert.doesNotMatch(schedulerSource, /<aside\b[^>]*right_sidebar/);
  assert.doesNotMatch(schedulerSource, /w-80[^"'`]*border-l[^"'`]*border-slate-200/);
});

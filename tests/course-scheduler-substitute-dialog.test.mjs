import assert from 'node:assert/strict';
import fs from 'node:fs';

const schedulerSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const schedulerTypes = fs.readFileSync('components/course-scheduler/types.ts', 'utf8');

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

runTest('substitute recommendation cards do not display suitability scores', () => {
  assert.doesNotMatch(schedulerSource, /评分\s*\{rec\.suitabilityScore\}/);
});

runTest('substitute changes capture a structured adjustment note', () => {
  assert.match(schedulerTypes, /export interface ScheduleAdjustmentNote/);
  assert.match(schedulerTypes, /adjustmentNote\?: ScheduleAdjustmentNote/);
  assert.match(schedulerTypes, /adjustmentHistory\?: ScheduleAdjustmentNote\[\]/);
  assert.match(schedulerTypes, /fromTeacherName\?: string/);
  assert.match(schedulerTypes, /toTeacherName\?: string/);
  assert.match(schedulerSource, /substituteReason/);
  assert.match(schedulerSource, /临时有事请假/);
  assert.match(schedulerSource, /adjustmentNote:\s*nextAdjustmentNote/);
  assert.match(schedulerSource, /adjustmentHistory:\s*\[\.\.\.existingHistory,\s*nextAdjustmentNote\]/);
  assert.match(schedulerSource, /originalTeacherName/);
  assert.match(schedulerSource, /substituteTeacherName/);
  assert.match(schedulerSource, /fromTeacherName/);
  assert.match(schedulerSource, /toTeacherName/);
  assert.match(schedulerSource, /summary/);
  assert.match(schedulerSource, /createdAt:\s*new Date\(\)\.toISOString\(\)/);
});

runTest('repeat substitute changes append A-to-B-to-C logs instead of overwriting history', () => {
  assert.match(schedulerSource, /const fromTeacherId = selectedCell\.teacherId/);
  assert.match(schedulerSource, /const fromTeacherName = selectedCell\.teacherName/);
  assert.match(schedulerSource, /const rootOriginalTeacherId = selectedCell\.adjustmentNote\?\.originalTeacherId \|\| selectedCell\.teacherId/);
  assert.match(schedulerSource, /const existingHistory = s\.adjustmentHistory \?\? \(s\.adjustmentNote \? \[s\.adjustmentNote\] : \[\]\)/);
  assert.match(schedulerSource, /chainIndex:\s*existingHistory\.length \+ 1/);
  assert.match(schedulerSource, /const summary = `\$\{fromTeacherName\}老师\$\{reason\}，已临时调配\$\{substituteTeacher\.name\}老师`/);
  assert.match(schedulerSource, /setPendingSubstituteConfirm\(\{[\s\S]*fromTeacherName/);
  assert.match(schedulerSource, /setPendingSubstituteConfirm\(\{[\s\S]*rootOriginalTeacherName/);
});

runTest('substitute apply uses a custom confirmation dialog instead of browser confirm', () => {
  assert.match(schedulerSource, /pendingSubstituteConfirm/);
  assert.match(schedulerSource, /setPendingSubstituteConfirm/);
  assert.match(schedulerSource, /confirmPendingSubstitute/);
  assert.match(schedulerSource, /cancelPendingSubstitute/);
  assert.match(schedulerSource, /data-ui-surface="substitute-confirm-dialog"/);
  assert.match(schedulerSource, /aria-label="确认临时代课调整"/);
  assert.doesNotMatch(schedulerSource, /window\.confirm\('确定要将 \['/);
  assert.doesNotMatch(schedulerSource, /alert\('代课调优成功应用/);
});

runTest('schedule cards expose temporary adjustment labels', () => {
  assert.match(schedulerSource, /schedule-remark-card/);
  assert.match(schedulerSource, /schedule-remark-badge/);
  assert.match(schedulerSource, /schedule-remark-line/);
  assert.match(schedulerSource, /item\.adjustmentNote/);
  assert.match(schedulerSource, /title=\{item\.adjustmentNote\.summary\}/);
});

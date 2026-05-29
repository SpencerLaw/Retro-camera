import assert from 'node:assert/strict';
import fs from 'node:fs';

const schedulerSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const schedulerStyles = fs.readFileSync('components/course-scheduler/CourseSchedulerStyles.css', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('course scheduler management view uses a dense operations layout', () => {
  assert.match(schedulerSource, /managementStats/);
  assert.match(schedulerSource, /当前教师/);
  assert.match(schedulerSource, /授课分工/);
  assert.match(schedulerSource, /走班学生/);
  assert.match(schedulerSource, /硬冲突/);
  assert.match(schedulerSource, /`\$\{warningConflicts\.length\} 条提醒 · \$\{selectedGrade\}课表 \$\{gradeScheduleCount\} 节`/);
  assert.match(schedulerSource, /\{selectedGrade\}年级走班数据将在学生绑定选科组合后自动加载/);
});

runTest('course scheduler management tables fill the available viewport instead of leaving blank space', () => {
  assert.match(schedulerSource, /managementTableShellClass/);
  assert.match(schedulerSource, /managementTableScrollClass/);
  assert.match(schedulerSource, /management-content-area/);
  assert.match(schedulerSource, /management-table-shell/);
  assert.match(schedulerSource, /management-table-scroll/);
  assert.match(schedulerSource, /flex-1 min-h-0/);
  assert.match(schedulerSource, /overflow-auto/);
  assert.match(schedulerSource, /sticky top-0 z-10/);
  assert.match(schedulerStyles, /\.management-content-area/);
  assert.match(schedulerStyles, /\.management-table-shell/);
  assert.match(schedulerStyles, /\.management-table-scroll/);
  assert.match(schedulerStyles, /height:\s*100%/);
  assert.match(schedulerStyles, /min-height:\s*0/);
  assert.doesNotMatch(schedulerSource, /<div className="overflow-x-auto">/);
  assert.doesNotMatch(schedulerSource, /calc\(100vh - 4rem\)|calc\(100vh-4rem\)/);
});

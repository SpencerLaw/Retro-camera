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
  assert.match(schedulerSource, /overflow-y-auto/);
  assert.match(schedulerSource, /overflow-x-auto/);
  assert.match(schedulerSource, /sticky top-0 z-10/);
  assert.match(schedulerStyles, /\.management-content-area/);
  assert.match(schedulerStyles, /\.management-table-shell/);
  assert.match(schedulerStyles, /\.management-table-scroll/);
  assert.match(schedulerStyles, /height:\s*100%/);
  assert.match(schedulerStyles, /min-height:\s*0/);
  assert.doesNotMatch(schedulerSource, /<div className="overflow-x-auto">/);
  assert.doesNotMatch(schedulerSource, /calc\(100vh - 4rem\)|calc\(100vh-4rem\)/);
});

runTest('course scheduler management overview scrolls under the collapsible tab layout', () => {
  assert.match(schedulerSource, /id="data_management" className="[^"]*overflow-y-auto[^"]*" onScroll=\{handleSchedulerScroll\}/);
  assert.match(schedulerSource, /management-content-area [^"]*overflow-visible/);
  assert.doesNotMatch(schedulerSource, /management-content-area [^"]*overflow-hidden/);
  assert.doesNotMatch(schedulerSource, /management-table-shell[^']*flex-1/);
  assert.match(schedulerStyles, /#data_management\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*relative/);
  assert.doesNotMatch(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerSource, /renderSchedulerViewTabs\('expanded'\)/);
  assert.match(schedulerStyles, /\.scheduler-pinned-tabs-host\s*\{[\s\S]*opacity:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-pinned-tabs-host\.is-visible\s*\{[\s\S]*opacity:\s*1/);
  assert.match(schedulerStyles, /\.scheduler-view-tabs--pinned\s*\{[\s\S]*border-radius:\s*999px/);
  assert.doesNotMatch(schedulerStyles, /\.management-header\s*\{[\s\S]*backdrop-filter/);
  assert.match(schedulerStyles, /\.management-content-area\s*\{[\s\S]*height:\s*auto/);
  assert.match(schedulerStyles, /\.management-content-area\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(schedulerStyles, /\.management-table-scroll\s*\{[\s\S]*max-height:\s*none/);
  assert.match(schedulerStyles, /\.management-table-scroll\s*\{[\s\S]*overflow-y:\s*visible/);
});

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

function getCssBlock(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = schedulerStyles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[0];
}

runTest('course scheduler management view uses a dense operations layout', () => {
  assert.match(schedulerSource, /managementStats/);
  assert.match(schedulerSource, /当前教师/);
  assert.match(schedulerSource, /授课分工/);
  assert.match(schedulerSource, /走班学生/);
  assert.match(schedulerSource, /硬冲突/);
  assert.match(schedulerSource, /\$\{warningConflicts\.length\} 条资源提醒/);
  assert.match(schedulerSource, /\$\{preferenceDiagnostics\.length\} 条偏好诊断/);
  assert.match(schedulerSource, /\$\{selectedGrade\}课表 \$\{gradeScheduleCount\} 节/);
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
  const dataManagementStyles = getCssBlock('#data_management');
  const managementHeaderStyles = getCssBlock('.management-header');
  const managementContentStyles = getCssBlock('.management-content-area');
  const managementTableScrollStyles = getCssBlock('.management-table-scroll');
  const schedulerHeaderTabsStyles = getCssBlock('.scheduler-header-tabs');
  const schedulerPinnedTabsStyles = getCssBlock('.scheduler-header-tabs--pinned');

  assert.match(schedulerSource, /id="data_management" className="[^"]*overflow-y-auto[^"]*" onScroll=\{handleSchedulerScroll\}/);
  assert.match(schedulerSource, /management-content-area [^"]*overflow-visible/);
  assert.doesNotMatch(schedulerSource, /management-content-area [^"]*overflow-hidden/);
  assert.doesNotMatch(schedulerSource, /management-table-shell[^']*flex-1/);
  assert.match(dataManagementStyles, /overflow-y:\s*auto/);
  assert.match(managementHeaderStyles, /position:\s*relative/);
  assert.doesNotMatch(managementHeaderStyles, /position:\s*sticky/);
  assert.match(schedulerSource, /scheduler-header-tabs/);
  assert.doesNotMatch(schedulerSource, /renderSchedulerViewTabs\('expanded'\)/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-pinned-tabs-host/);
  assert.match(schedulerHeaderTabsStyles, /display:\s*inline-flex/);
  assert.match(schedulerPinnedTabsStyles, /border-radius:\s*999px/);
  assert.match(managementHeaderStyles, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/);
  assert.match(managementHeaderStyles, /backdrop-filter:\s*blur\(22px\)/);
  assert.match(managementContentStyles, /height:\s*auto/);
  assert.match(managementContentStyles, /overflow:\s*visible/);
  assert.match(managementTableScrollStyles, /max-height:\s*none/);
  assert.match(managementTableScrollStyles, /overflow-y:\s*visible/);
});

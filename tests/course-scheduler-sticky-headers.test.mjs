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

runTest('board scroll collapses the main navigation into a tab layout', () => {
  assert.match(schedulerSource, /const \[isTabLayoutPinned, setIsTabLayoutPinned\]/);
  assert.match(schedulerSource, /handleSchedulerScroll/);
  assert.match(schedulerSource, /renderSchedulerViewTabs/);
  assert.match(schedulerSource, /id="main_grid" className="[^"]*scheduler-board-scroll[^"]*" onScroll=\{handleSchedulerScroll\}/);
  assert.match(schedulerSource, /scheduler-main-header/);
  assert.match(schedulerSource, /scheduler-brand-strip/);
  assert.match(schedulerSource, /scheduler-header-tabs/);
  assert.match(schedulerSource, /scheduler-header-tabs--pinned/);
  assert.match(schedulerSource, /scheduler-view-tabs/);
  assert.match(schedulerSource, /scheduler-view-tab/);
  assert.match(schedulerSource, /scheduler-view-tab is-active/);
  assert.match(schedulerSource, /scheduler-timetable-shell/);
  assert.match(schedulerSource, /scheduler-timetable-rows/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-rows[^"]*overflow-y-auto/);
  assert.doesNotMatch(schedulerSource, /<div className="flex-1 overflow-y-auto divide-y divide-slate-100">/);
  assert.match(schedulerStyles, /\.scheduler-main-header--tabs\s*\{[\s\S]*box-shadow/);
  assert.match(schedulerStyles, /\.scheduler-brand-strip\s*\{[\s\S]*gap:\s*1\.5rem/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs\s*\{[\s\S]*border-radius:\s*12px/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s*\{[\s\S]*border-radius:\s*999px/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s+\.scheduler-view-tab\.is-active\s*\{[\s\S]*background:\s*#2563eb/);
  assert.match(schedulerStyles, /\.scheduler-timetable-rows\s*\{[\s\S]*overflow:\s*visible/);
  assert.doesNotMatch(schedulerSource, /scheduler-pinned-tabs-host/);
  assert.doesNotMatch(schedulerSource, /renderSchedulerViewTabs\('expanded'\)/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-view-tabs--expanded/);
});

runTest('management scroll uses the same collapsible tab layout', () => {
  assert.match(schedulerSource, /id="data_management" className="[^"]*overflow-y-auto[^"]*" onScroll=\{handleSchedulerScroll\}/);
  assert.match(schedulerSource, /scheduler-page-head management-header/);
  assert.doesNotMatch(schedulerSource, /scheduler-app-topbar management-header/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*relative/);
  assert.doesNotMatch(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*sticky/);
});

runTest('content headings scroll away instead of hovering as hollow top bars', () => {
  assert.match(schedulerSource, /scheduler-page-head scheduler-board-head/);
  assert.doesNotMatch(schedulerSource, /scheduler-page-head scheduler-board-head[\s\S]*renderSchedulerViewTabs/);
  assert.doesNotMatch(schedulerSource, /scheduler-page-head management-header[\s\S]*renderSchedulerViewTabs/);
  assert.doesNotMatch(schedulerSource, /scheduler-app-topbar scheduler-board-appbar/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-app-topbar/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-board-appbar/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-board-headboard/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-floating-headboard/);
  assert.doesNotMatch(schedulerSource, /scheduler-floating-headboard/);
});

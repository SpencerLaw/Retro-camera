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

runTest('board page has an app top bar that sticks to the top while the timetable scrolls', () => {
  assert.match(schedulerSource, /id="main_grid" className="[^"]*scheduler-board-scroll/);
  assert.match(schedulerSource, /scheduler-app-topbar scheduler-board-appbar/);
  assert.match(schedulerSource, /scheduler-timetable-shell/);
  assert.match(schedulerSource, /scheduler-timetable-rows/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-rows[^"]*overflow-y-auto/);
  assert.doesNotMatch(schedulerSource, /<div className="flex-1 overflow-y-auto divide-y divide-slate-100">/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*top:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*z-index:\s*40/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*border-bottom/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*box-shadow/);
  assert.match(schedulerStyles, /\.scheduler-board-scroll\s*\{[\s\S]*padding-top:\s*0\s*!important/);
  assert.match(schedulerStyles, /\.scheduler-timetable-rows\s*\{[\s\S]*overflow:\s*visible/);
});

runTest('management page uses the same app top bar sticky behavior', () => {
  assert.match(schedulerSource, /scheduler-app-topbar management-header/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*z-index:\s*40/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*box-shadow/);
});

runTest('app top bars are solid full-width bars rather than hollow rounded floating cards', () => {
  assert.match(schedulerStyles, /\.scheduler-board-appbar\s*\{[\s\S]*margin:\s*0 -1\.5rem 1rem/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*border-radius:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*background:\s*#f8fafc/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*background:\s*rgba/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-app-topbar\s*\{[\s\S]*backdrop-filter/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-board-headboard/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-floating-headboard/);
  assert.doesNotMatch(schedulerSource, /scheduler-floating-headboard/);
});

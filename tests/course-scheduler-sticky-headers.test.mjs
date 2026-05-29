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

runTest('board page has a floating sticky headboard above the timetable', () => {
  assert.match(schedulerSource, /id="main_grid" className="[^"]*scheduler-board-scroll/);
  assert.match(schedulerSource, /scheduler-floating-headboard scheduler-board-headboard/);
  assert.match(schedulerSource, /scheduler-timetable-shell/);
  assert.match(schedulerSource, /scheduler-timetable-rows/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-rows[^"]*overflow-y-auto/);
  assert.doesNotMatch(schedulerSource, /<div className="flex-1 overflow-y-auto divide-y divide-slate-100">/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*top:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*z-index:\s*30/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*backdrop-filter:\s*blur/);
  assert.match(schedulerStyles, /\.scheduler-timetable-rows\s*\{[\s\S]*overflow:\s*visible/);
});

runTest('management page uses the same floating sticky visual language', () => {
  assert.match(schedulerSource, /management-header/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*z-index:\s*30/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*box-shadow/);
});

runTest('floating headers have an obvious glass surface instead of a flat background', () => {
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*background:\s*linear-gradient/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*background:\s*linear-gradient/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*inset 0 1px 0/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*inset 0 1px 0/);
});

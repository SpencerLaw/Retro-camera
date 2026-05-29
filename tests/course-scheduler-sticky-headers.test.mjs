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
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*top:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*z-index:\s*30/);
  assert.match(schedulerStyles, /\.scheduler-floating-headboard\s*\{[\s\S]*backdrop-filter:\s*blur/);
});

runTest('management page uses the same floating sticky visual language', () => {
  assert.match(schedulerSource, /management-header/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*position:\s*sticky/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*z-index:\s*30/);
  assert.match(schedulerStyles, /\.management-header\s*\{[\s\S]*box-shadow/);
});

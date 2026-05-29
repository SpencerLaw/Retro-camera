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

runTest('course scheduler assigns timetable scrollbars by period band', () => {
  assert.match(schedulerSource, /import '\.\/CourseSchedulerStyles\.css';/);
  assert.match(schedulerSource, /course-scheduler-root/);
  assert.match(schedulerSource, /getPeriodScrollbarClass/);
  assert.match(schedulerSource, /period-scrollbar-morning-early/);
  assert.match(schedulerSource, /period-scrollbar-morning-late/);
  assert.match(schedulerSource, /period-scrollbar-afternoon-early/);
  assert.match(schedulerSource, /period-scrollbar-afternoon-late/);
  assert.match(schedulerSource, /getPeriodScrollbarClass\(periodMeta\.num\)/);
});

runTest('course scheduler defines distinct scrollbar colors for each period band', () => {
  assert.match(schedulerStyles, /\.period-scrollbar-morning-early::\-webkit-scrollbar-thumb/);
  assert.match(schedulerStyles, /\.period-scrollbar-morning-late::\-webkit-scrollbar-thumb/);
  assert.match(schedulerStyles, /\.period-scrollbar-afternoon-early::\-webkit-scrollbar-thumb/);
  assert.match(schedulerStyles, /\.period-scrollbar-afternoon-late::\-webkit-scrollbar-thumb/);
  assert.match(schedulerStyles, /scrollbar-color:\s*#f59e0b transparent/);
  assert.match(schedulerStyles, /scrollbar-color:\s*#14b8a6 transparent/);
  assert.match(schedulerStyles, /scrollbar-color:\s*#3b82f6 transparent/);
  assert.match(schedulerStyles, /scrollbar-color:\s*#8b5cf6 transparent/);
});

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

runTest('course scheduler separates the four two-period modules with glass backgrounds', () => {
  assert.match(schedulerSource, /PERIOD_MODULES/);
  assert.match(schedulerSource, /getPeriodModuleClass/);
  assert.match(schedulerSource, /period-module-morning-early/);
  assert.match(schedulerSource, /period-module-morning-late/);
  assert.match(schedulerSource, /period-module-afternoon-early/);
  assert.match(schedulerSource, /period-module-afternoon-late/);
  assert.match(schedulerSource, /period-module-group/);
  assert.match(schedulerSource, /period-module-group-title/);
  assert.match(schedulerSource, /data-period-module/);
  assert.match(schedulerSource, /period-module-row/);
  assert.match(schedulerSource, /period-module-row--start/);
  assert.match(schedulerSource, /period-module-row--end/);
  assert.match(schedulerSource, /period-module-cell/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-rows divide-y/);
  assert.match(schedulerStyles, /\.scheduler-timetable-rows\s*\{[\s\S]*gap:\s*0\.875rem/);
  assert.match(schedulerStyles, /\.period-module-group\s*\{[\s\S]*backdrop-filter:\s*blur\(18px\)/);
  assert.match(schedulerStyles, /\.period-module-group\s*\{[\s\S]*border-radius:\s*18px/);
  assert.match(schedulerStyles, /\.period-module-row \+ \.period-module-row\s*\{[\s\S]*margin-top:\s*0\.45rem/);
  assert.match(schedulerStyles, /\.period-module-morning-early\s*\{[\s\S]*--period-module-bg/);
  assert.match(schedulerStyles, /\.period-module-morning-late\s*\{[\s\S]*--period-module-bg/);
  assert.match(schedulerStyles, /\.period-module-afternoon-early\s*\{[\s\S]*--period-module-bg/);
  assert.match(schedulerStyles, /\.period-module-afternoon-late\s*\{[\s\S]*--period-module-bg/);
});

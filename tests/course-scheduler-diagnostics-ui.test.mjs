import assert from 'node:assert/strict';
import fs from 'node:fs';

const schedulerSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('course scheduler separates hard conflicts from diagnostic warnings in the UI', () => {
  assert.match(schedulerSource, /criticalConflicts = conflicts\.filter/);
  assert.match(schedulerSource, /warningConflicts = conflicts\.filter/);
  assert.match(schedulerSource, /0 处硬冲突/);
  assert.match(schedulerSource, /条提醒/);
  assert.match(schedulerSource, /硬冲突不再与 warning 混算/);
  assert.doesNotMatch(schedulerSource, /\{conflicts\.length\} 处排课冲突/);
  assert.doesNotMatch(schedulerSource, /conflicts\.length \+ ' 处'/);
});

runTest('course scheduler disables substitute choices with load or availability conflicts', () => {
  assert.match(schedulerSource, /rec\.hasLoadConflict/);
  assert.match(schedulerSource, /rec\.hasAvailabilityConflict/);
});

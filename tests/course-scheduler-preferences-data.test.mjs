import assert from 'node:assert/strict';
import fs from 'node:fs';

const typesSource = fs.readFileSync('components/course-scheduler/types.ts', 'utf8');
const preferencesSource = fs.existsSync('components/course-scheduler/courseSchedulerPreferences.ts')
  ? fs.readFileSync('components/course-scheduler/courseSchedulerPreferences.ts', 'utf8')
  : '';
const appSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('scheduler preference types are explicit and JSON-backed', () => {
  assert.match(typesSource, /export interface SchedulingPreferences/);
  assert.match(typesSource, /teacherPeriodBalance: TeacherPeriodBalanceRule\[\]/);
  assert.match(typesSource, /doubleLessonRules: DoubleLessonRule\[\]/);
  assert.match(typesSource, /forbiddenSlotRules: ForbiddenSlotRule\[\]/);
  assert.match(typesSource, /syncLessonRules: SyncLessonRule\[\]/);
  assert.match(typesSource, /export interface PreferenceDiagnostic/);
  assert.match(typesSource, /ruleType: 'teacherPeriodBalance' \| 'doubleLesson' \| 'forbiddenSlot' \| 'syncLesson'/);
});

runTest('scheduler preferences have defaults and normalization helpers', () => {
  assert.match(preferencesSource, /export const createDefaultSchedulingPreferences/);
  assert.match(preferencesSource, /watchedPeriods:\s*\[1,\s*4,\s*5,\s*8\]/);
  assert.match(preferencesSource, /minPerTeacherPerWeek:\s*1/);
  assert.match(preferencesSource, /maxPerTeacherPerWeek:\s*2/);
  assert.match(preferencesSource, /export const normalizeSchedulingPreferences/);
});

runTest('app persists scheduling preferences in existing JSON data flow', () => {
  assert.match(appSource, /schedulingPreferences/);
  assert.match(appSource, /setSchedulingPreferences/);
  assert.match(appSource, /normalizeSchedulingPreferences\(parsed\.schedulingPreferences/);
  assert.match(appSource, /schedulingPreferences,/);
  assert.match(appSource, /setJsonRawText\(JSON\.stringify\(exportData, null, 2\)\)/);
});

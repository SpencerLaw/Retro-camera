import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const stylesSource = fs.readFileSync('components/course-scheduler/CourseSchedulerStyles.css', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('management view exposes scheduler preference settings tab', () => {
  assert.match(appSource, /'preferences'/);
  assert.match(appSource, /排课偏好设置/);
  assert.match(appSource, /renderPreferenceSettingsPanel/);
  assert.match(appSource, /教师重点节次均衡/);
  assert.match(appSource, /连堂偏好/);
  assert.match(appSource, /禁排时段/);
  assert.match(appSource, /同步上课/);
});

runTest('preference settings use dense glass operational panels', () => {
  assert.match(stylesSource, /\.preference-settings-grid/);
  assert.match(stylesSource, /\.preference-rule-panel/);
  assert.match(stylesSource, /\.preference-period-chip/);
  assert.match(stylesSource, /\.preference-diagnostics-list/);
  assert.match(stylesSource, /backdrop-filter:\s*blur\(18px\)/);
});

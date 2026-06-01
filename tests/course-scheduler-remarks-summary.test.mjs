import assert from 'node:assert/strict';
import fs from 'node:fs';

const schedulerSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const schedulerStyles = fs.readFileSync('components/course-scheduler/CourseSchedulerStyles.css', 'utf8');
const schedulerTypes = fs.readFileSync('components/course-scheduler/types.ts', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('schedule adjustment notes are part of the JSON-backed schedule data', () => {
  assert.match(schedulerTypes, /export interface ScheduleAdjustmentNote/);
  assert.match(schedulerTypes, /type:\s*'substitute' \| 'student' \| 'manual'/);
  assert.match(schedulerTypes, /reason:\s*string/);
  assert.match(schedulerTypes, /summary:\s*string/);
  assert.match(schedulerTypes, /createdAt:\s*string/);
  assert.match(schedulerTypes, /adjustmentNote\?: ScheduleAdjustmentNote/);
  assert.match(schedulerTypes, /adjustmentHistory\?: ScheduleAdjustmentNote\[\]/);
  assert.match(schedulerSource, /adjustmentHistory:\s*\[\.\.\.existingHistory,\s*nextAdjustmentNote\]/);
  assert.match(schedulerSource, /schedules/);
  assert.match(schedulerSource, /setSchedules\(parsed\.schedules\)/);
});

runTest('top header has a weekly remarks summary trigger beside the term week badge', () => {
  assert.match(schedulerSource, /showRemarksModal/);
  assert.match(schedulerSource, /setShowRemarksModal\(true\)/);
  assert.match(schedulerSource, /备注汇总/);
  assert.match(schedulerSource, /weeklyRemarks\.length/);
  assert.match(schedulerSource, /MessageSquareText/);
});

runTest('weekly remarks dialog renders a Monday to Friday timeline', () => {
  assert.match(schedulerSource, /data-ui-surface="remarks-summary-dialog"/);
  assert.match(schedulerSource, /aria-label="本周备注汇总"/);
  assert.match(schedulerSource, /remarks-timeline/);
  assert.match(schedulerSource, /remarks-timeline-item/);
  assert.match(schedulerSource, /\.flatMap\(s =>/);
  assert.match(schedulerSource, /const logs = s\.adjustmentHistory && s\.adjustmentHistory\.length > 0/);
  assert.match(schedulerSource, /DAYS\.map/);
  assert.match(schedulerSource, /暂无备注/);
  assert.match(schedulerSource, /PERIODS_METADATA\.find/);
  assert.match(schedulerSource, /adjustmentNote\.summary/);
});

runTest('weekly remarks timeline exposes chain index and teacher handoff details', () => {
  assert.match(schedulerSource, /第\{remark\.adjustmentNote\.chainIndex \|\| 1\}次调配/);
  assert.match(schedulerSource, /remark\.adjustmentNote\.fromTeacherName/);
  assert.match(schedulerSource, /remark\.adjustmentNote\.toTeacherName/);
  assert.match(schedulerSource, /remarks-handoff/);
});

runTest('remarks surfaces use glassy but legible styling', () => {
  assert.match(schedulerStyles, /\.schedule-remark-badge\s*\{/);
  assert.match(schedulerStyles, /\.schedule-remark-line\s*\{/);
  assert.match(schedulerStyles, /\.remarks-summary-panel\s*\{/);
  assert.match(schedulerStyles, /backdrop-filter:\s*blur\(18px\)/);
  assert.match(schedulerStyles, /\.remarks-timeline-item\s*\{/);
  assert.match(schedulerStyles, /\.remarks-handoff\s*\{/);
});

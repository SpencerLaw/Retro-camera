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

runTest('course scheduler keeps the existing timetable and adds a class inspection mode', () => {
  assert.match(schedulerSource, /boardDisplayMode/);
  assert.match(schedulerSource, /'time' \| 'class'/);
  assert.match(schedulerSource, /aria-label="排课检查模式"/);
  assert.match(schedulerSource, /时间视图/);
  assert.match(schedulerSource, /按班级看/);
  assert.match(schedulerSource, /boardDisplayMode === 'time'/);
  assert.match(schedulerSource, /renderClassBoardView\(\)/);
});

runTest('class inspection mode lays out weekdays by class number columns and period rows', () => {
  assert.match(schedulerSource, /getGradeClassNumbers/);
  assert.match(schedulerSource, /getScheduleClassNumber/);
  assert.match(schedulerSource, /getClassViewSchedules/);
  assert.match(schedulerSource, /class-board-number-badge/);
  assert.match(schedulerSource, /class-board-period-label/);
  assert.match(schedulerSource, /gridTemplateColumns/);
  assert.match(schedulerSource, /DAYS\.map\(day =>/);
  assert.match(schedulerSource, /PERIODS_METADATA\.filter\(meta => meta\.type === 'period'\)/);
});

runTest('class inspection cells use subject hue and teacher tone variations', () => {
  assert.match(schedulerSource, /subjectHueMap/);
  assert.match(schedulerSource, /getTeacherToneIndex/);
  assert.match(schedulerSource, /getClassMatrixCellStyle/);
  assert.match(schedulerSource, /--subject-hue/);
  assert.match(schedulerSource, /--teacher-lightness/);
  assert.match(schedulerStyles, /\.class-board-shell/);
  assert.match(schedulerStyles, /\.class-board-day-block\s*\{[\s\S]*backdrop-filter:\s*blur\(20px\)/);
  assert.match(schedulerStyles, /\.class-board-grid/);
  assert.match(schedulerStyles, /\.class-board-course-card/);
  assert.match(schedulerStyles, /background:\s*hsl\(var\(--subject-hue\)/);
  assert.match(schedulerStyles, /border-color:\s*hsl\(var\(--subject-hue\)/);
});

runTest('class inspection course cards show full subject and teacher names instead of abbreviations', () => {
  assert.match(schedulerSource, /<strong>\{item\.subject\}<\/strong>/);
  assert.match(schedulerSource, /<span>\{item\.teacherName\}<\/span>/);
  assert.doesNotMatch(schedulerSource, /<strong>\{getSubjectBriefName\(item\.subject\)\}\{getTeacherBriefName\(item\.teacherName\)\}<\/strong>/);
});

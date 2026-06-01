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

runTest('course scheduler exposes a weekday accordion display mode', () => {
  assert.match(schedulerSource, /useState<'time' \| 'class' \| 'dayCards'>\('time'\)/);
  assert.match(schedulerSource, /expandedDayCard/);
  assert.match(schedulerSource, /setExpandedDayCard/);
  assert.match(schedulerSource, /onClick=\{\(\) => setBoardDisplayMode\('dayCards'\)\}/);
  assert.match(schedulerSource, /aria-pressed=\{boardDisplayMode === 'dayCards'\}/);
  assert.match(schedulerSource, /周卡片/);
});

runTest('weekday accordion expands one day and collapses the others', () => {
  assert.match(schedulerSource, /const renderDayCardsBoardView = \(\) =>/);
  assert.match(schedulerSource, /data-view-mode="weekday-accordion"/);
  assert.match(schedulerSource, /DAYS\.map\(day =>/);
  assert.match(schedulerSource, /const isExpanded = expandedDayCard === day\.num/);
  assert.match(schedulerSource, /aria-expanded=\{isExpanded\}/);
  assert.match(schedulerSource, /setExpandedDayCard\(day\.num\)/);
  assert.match(schedulerSource, /isExpanded \? 'is-expanded' : 'is-collapsed'/);
});

runTest('expanded weekday cards render real schedules and open the substitute dialog', () => {
  assert.match(schedulerSource, /PERIODS_METADATA\.filter\(meta => meta\.type === 'period'\)/);
  assert.match(schedulerSource, /getFilteredSchedules\(day\.num, period\.num\)/);
  assert.match(schedulerSource, /weekday-period-course/);
  assert.match(schedulerSource, /style=\{getClassMatrixCellStyle\(item\)\}/);
  assert.match(schedulerSource, /onClick=\{\(\) => handleSelectCell\(item\)\}/);
  assert.match(schedulerSource, /item\.adjustmentNote/);
});

runTest('weekday accordion has responsive glass cards and animated expansion', () => {
  assert.match(schedulerStyles, /\.day-card-board-shell/);
  assert.match(schedulerStyles, /\.weekday-accordion-row\s*\{[\s\S]*display:\s*flex/);
  assert.match(schedulerStyles, /\.weekday-accordion-card\s*\{[\s\S]*transition:[^;]*flex/);
  assert.match(schedulerStyles, /\.weekday-accordion-card\.is-expanded\s*\{[\s\S]*flex:/);
  assert.match(schedulerStyles, /\.weekday-accordion-card\.is-collapsed/);
  assert.match(schedulerStyles, /\.weekday-period-course/);
  assert.match(schedulerStyles, /@media \(max-width:\s*900px\)[\s\S]*\.weekday-accordion-row/);
});

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

function getCssBlock(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = schedulerStyles.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[0];
}

runTest('top navigation uses reference-style translucent frosted glass', () => {
  const mainHeaderStyles = getCssBlock('.scheduler-main-header');
  const mainHeaderHighlightStyles = getCssBlock('.scheduler-main-header::before');
  const pinnedFilterStyles = getCssBlock('.scheduler-pinned-filter-inner');

  assert.match(mainHeaderStyles, /linear-gradient\(115deg/);
  assert.match(mainHeaderStyles, /rgba\(255,\s*245,\s*230,\s*0\.16\)/);
  assert.match(mainHeaderStyles, /rgba\(255,\s*255,\s*255,\s*0\.07\)/);
  assert.match(mainHeaderStyles, /backdrop-filter:\s*blur\(38px\)\s*saturate\(1\.55\)/);
  assert.match(mainHeaderStyles, /isolation:\s*isolate/);
  assert.match(mainHeaderHighlightStyles, /pointer-events:\s*none/);
  assert.match(mainHeaderHighlightStyles, /linear-gradient\(90deg/);
  assert.match(pinnedFilterStyles, /linear-gradient\(110deg/);
  assert.match(pinnedFilterStyles, /rgba\(255,\s*255,\s*255,\s*0\.07\)/);
  assert.match(schedulerStyles, /\.scheduler-glass-action,\s*\n\.scheduler-term-chip\s*\{[\s\S]*linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.scheduler-board-filters \.scheduler-board-filter-select\s*\{[\s\S]*linear-gradient\(135deg/);
});

runTest('board scroll collapses the main navigation into a tab layout', () => {
  const mainHeaderStyles = getCssBlock('.scheduler-main-header');
  const boardHeadStyles = getCssBlock('.scheduler-board-head');
  const glassControlStyles = schedulerStyles.match(/\.scheduler-glass-action,\s*\n\.scheduler-term-chip\s*\{[\s\S]*?\}/)?.[0] || '';

  assert.match(schedulerSource, /const \[isTabLayoutPinned, setIsTabLayoutPinned\]/);
  assert.match(schedulerSource, /handleSchedulerScroll/);
  assert.match(schedulerSource, /renderSchedulerViewTabs/);
  assert.match(schedulerSource, /id="main_grid" className="[^"]*scheduler-board-scroll[^"]*" onScroll=\{handleSchedulerScroll\}/);
  assert.match(schedulerSource, /scheduler-main-header/);
  assert.match(schedulerSource, /scheduler-brand-strip/);
  assert.match(schedulerSource, /scheduler-header-tabs/);
  assert.match(schedulerSource, /scheduler-header-tabs--pinned/);
  assert.match(schedulerSource, /scheduler-view-tabs/);
  assert.match(schedulerSource, /scheduler-view-tab/);
  assert.match(schedulerSource, /scheduler-view-tab is-active/);
  assert.match(schedulerSource, /scheduler-timetable-shell/);
  assert.match(schedulerSource, /scheduler-timetable-rows/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-rows[^"]*overflow-y-auto/);
  assert.doesNotMatch(schedulerSource, /<div className="flex-1 overflow-y-auto divide-y divide-slate-100">/);
  assert.match(boardHeadStyles, /linear-gradient\(115deg/);
  assert.match(boardHeadStyles, /backdrop-filter:\s*blur\(32px\)/);
  assert.match(schedulerStyles, /\.scheduler-main-header--tabs\s*\{[\s\S]*box-shadow/);
  assert.match(schedulerStyles, /\.course-scheduler-root\s*\{[\s\S]*background-image:/);
  assert.match(mainHeaderStyles, /linear-gradient\(115deg/);
  assert.match(mainHeaderStyles, /backdrop-filter:\s*blur\(38px\)/);
  assert.match(mainHeaderStyles, /border-radius:\s*9999px/);
  assert.match(schedulerSource, /scheduler-glass-action/);
  assert.match(schedulerSource, /scheduler-term-chip/);
  assert.match(glassControlStyles, /linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.scheduler-brand-strip\s*\{[\s\S]*gap:\s*1\.5rem/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs\s*\{[\s\S]*border-radius:\s*12px/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s*\{[\s\S]*border-radius:\s*999px/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s+\.scheduler-view-tab\.is-active\s*\{[\s\S]*background:\s*#2563eb/);
  assert.match(schedulerStyles, /\.scheduler-timetable-rows\s*\{[\s\S]*overflow:\s*visible/);
  assert.doesNotMatch(schedulerSource, /scheduler-pinned-tabs-host/);
  assert.doesNotMatch(schedulerSource, /renderSchedulerViewTabs\('expanded'\)/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-view-tabs--expanded/);
});

runTest('board pinned state exposes schedule filters below the top bar', () => {
  const pinnedFilterStyles = getCssBlock('.scheduler-pinned-filter-inner');
  const boardFilterSelectStyles = getCssBlock('.scheduler-board-filters .scheduler-board-filter-select');

  assert.match(schedulerSource, /renderBoardFilters/);
  assert.match(schedulerSource, /scheduler-pinned-filter-bar/);
  assert.match(schedulerSource, /activeTab === 'board' &&/);
  assert.match(schedulerSource, /isTabLayoutPinned \? 'is-visible' : ''/);
  assert.match(schedulerSource, /renderBoardFilters\('pinned'\)/);
  assert.match(schedulerSource, /renderBoardFilters\('head'\)/);
  assert.match(schedulerSource, /所有科目/);
  assert.match(schedulerSource, /所有选修组合\/类型/);
  assert.match(schedulerSource, /所有任课教师/);
  assert.match(schedulerSource, /所有备课\/走班教室/);
  assert.match(schedulerStyles, /\.scheduler-pinned-filter-bar\s*\{[\s\S]*max-height:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-pinned-filter-bar\.is-visible\s*\{[\s\S]*max-height:\s*4\.5rem/);
  assert.match(pinnedFilterStyles, /linear-gradient\(110deg/);
  assert.match(pinnedFilterStyles, /backdrop-filter:\s*blur\(34px\)/);
  assert.match(boardFilterSelectStyles, /linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.scheduler-board-filters--pinned\s+select\s*\{[\s\S]*min-width:\s*10rem/);
});

runTest('weekday timetable header sticks below the pinned filters', () => {
  const weekdayHeaderStyles = getCssBlock('.scheduler-weekday-header');

  assert.match(schedulerSource, /scheduler-weekday-header/);
  assert.match(schedulerSource, /scheduler-weekday-cell/);
  assert.match(schedulerSource, /周一/);
  assert.match(schedulerSource, /周五/);
  assert.match(weekdayHeaderStyles, /position:\s*sticky/);
  assert.match(weekdayHeaderStyles, /top:\s*-1\.5rem/);
  assert.match(weekdayHeaderStyles, /backdrop-filter:\s*blur\(34px\)/);
  assert.match(weekdayHeaderStyles, /linear-gradient\(115deg/);
  assert.match(weekdayHeaderStyles, /z-index:\s*12/);
  assert.match(schedulerStyles, /\.scheduler-timetable-shell\s*\{[\s\S]*overflow:\s*visible/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-shell[^"]*overflow-hidden/);
});

runTest('management scroll uses the same collapsible tab layout', () => {
  const managementHeaderStyles = getCssBlock('.management-header');

  assert.match(schedulerSource, /id="data_management" className="[^"]*overflow-y-auto[^"]*" onScroll=\{handleSchedulerScroll\}/);
  assert.match(schedulerSource, /scheduler-page-head management-header/);
  assert.doesNotMatch(schedulerSource, /scheduler-app-topbar management-header/);
  assert.match(managementHeaderStyles, /position:\s*relative/);
  assert.match(managementHeaderStyles, /linear-gradient\(115deg/);
  assert.match(managementHeaderStyles, /backdrop-filter:\s*blur\(32px\)/);
  assert.doesNotMatch(managementHeaderStyles, /position:\s*sticky/);
});

runTest('content headings scroll away instead of hovering as hollow top bars', () => {
  assert.match(schedulerSource, /scheduler-page-head scheduler-board-head/);
  assert.doesNotMatch(schedulerSource, /scheduler-page-head scheduler-board-head[\s\S]*renderSchedulerViewTabs/);
  assert.doesNotMatch(schedulerSource, /scheduler-page-head management-header[\s\S]*renderSchedulerViewTabs/);
  assert.doesNotMatch(schedulerSource, /scheduler-app-topbar scheduler-board-appbar/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-app-topbar/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-board-appbar/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-board-headboard/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-floating-headboard/);
  assert.doesNotMatch(schedulerSource, /scheduler-floating-headboard/);
});

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

  assert.match(mainHeaderStyles, /linear-gradient\(128deg/);
  assert.match(mainHeaderStyles, /rgba\(255,\s*255,\s*255,\s*0\.1\)/);
  assert.match(mainHeaderStyles, /backdrop-filter:\s*blur\(22px\)\s*saturate\(1\.36\)/);
  assert.match(mainHeaderStyles, /border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.24\)/);
  assert.match(mainHeaderStyles, /height:\s*auto !important/);
  assert.match(mainHeaderStyles, /min-height:\s*4\.25rem/);
  assert.match(mainHeaderStyles, /width:\s*calc\(100% - 2rem\)/);
  assert.doesNotMatch(mainHeaderStyles, /100vw/);
  assert.match(mainHeaderStyles, /flex-wrap:\s*wrap/);
  assert.match(mainHeaderStyles, /overflow:\s*visible/);
  assert.match(mainHeaderStyles, /row-gap:\s*0\.55rem/);
  assert.match(mainHeaderStyles, /isolation:\s*isolate/);
  assert.match(mainHeaderHighlightStyles, /pointer-events:\s*none/);
  assert.match(mainHeaderHighlightStyles, /radial-gradient\(circle at 18% 10%/);
  assert.doesNotMatch(schedulerSource, /scheduler-main-header[^"]*bg-white[^"]*border-b border-slate-200/);
  assert.match(pinnedFilterStyles, /linear-gradient\(118deg/);
  assert.match(pinnedFilterStyles, /rgba\(255,\s*255,\s*255,\s*0\.1\)/);
  assert.match(pinnedFilterStyles, /border-radius:\s*9999px/);
  assert.match(schedulerStyles, /\.scheduler-glass-action,\s*\n\.scheduler-term-chip\s*\{[\s\S]*linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.scheduler-board-filters \.scheduler-board-filter-select\s*\{[\s\S]*linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.course-scheduler-root::before\s*\{[\s\S]*radial-gradient\(circle at 10% 18%/);
});

runTest('board scroll collapses the main navigation into a tab layout', () => {
  const mainHeaderStyles = getCssBlock('.scheduler-main-header');
  const headerActionsStyles = getCssBlock('.scheduler-header-actions');
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
  assert.match(boardHeadStyles, /linear-gradient\(128deg/);
  assert.match(boardHeadStyles, /backdrop-filter:\s*blur\(18px\)/);
  assert.match(schedulerStyles, /\.scheduler-main-header--tabs\s*\{[\s\S]*box-shadow/);
  assert.match(schedulerStyles, /\.course-scheduler-root\s*\{[\s\S]*background-image:/);
  assert.match(mainHeaderStyles, /linear-gradient\(128deg/);
  assert.match(mainHeaderStyles, /backdrop-filter:\s*blur\(22px\)/);
  assert.match(mainHeaderStyles, /border-radius:\s*9999px/);
  assert.match(schedulerSource, /scheduler-glass-action/);
  assert.match(schedulerSource, /scheduler-term-chip/);
  assert.match(glassControlStyles, /linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.scheduler-brand-strip\s*\{[\s\S]*flex:\s*1 1 34rem/);
  assert.match(schedulerStyles, /\.scheduler-brand-strip\s*\{[\s\S]*gap:\s*1rem/);
  assert.match(headerActionsStyles, /flex:\s*1 1 42rem/);
  assert.match(headerActionsStyles, /justify-content:\s*flex-end/);
  assert.match(headerActionsStyles, /flex-wrap:\s*wrap/);
  assert.match(headerActionsStyles, /overflow:\s*visible/);
  assert.doesNotMatch(headerActionsStyles, /overflow-x:\s*auto/);
  assert.doesNotMatch(schedulerSource, /💾 导入\/导出 JSON/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs\s*\{[\s\S]*border-radius:\s*12px/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s*\{[\s\S]*border-radius:\s*999px/);
  assert.match(schedulerStyles, /\.scheduler-view-tab\.is-active\s*\{[\s\S]*backdrop-filter:\s*blur\(14px\)/);
  assert.match(schedulerStyles, /\.scheduler-view-tab\.is-active::before\s*\{[\s\S]*linear-gradient\(120deg/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s+\.scheduler-view-tab\.is-active\s*\{[\s\S]*linear-gradient\(135deg/);
  assert.match(schedulerStyles, /\.scheduler-header-tabs--pinned\s+\.scheduler-view-tab\.is-active\s*\{[\s\S]*rgba\(37,\s*99,\s*235,\s*0\.22\)/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-header-tabs--pinned\s+\.scheduler-view-tab\.is-active\s*\{[\s\S]*background:\s*#2563eb/);
  assert.match(schedulerStyles, /\.scheduler-timetable-rows\s*\{[\s\S]*overflow:\s*visible/);
  assert.doesNotMatch(schedulerSource, /scheduler-pinned-tabs-host/);
  assert.doesNotMatch(schedulerSource, /renderSchedulerViewTabs\('expanded'\)/);
  assert.doesNotMatch(schedulerStyles, /\.scheduler-view-tabs--expanded/);
});

runTest('board pinned state exposes schedule filters below the top bar', () => {
  const pinnedFilterBarStyles = getCssBlock('.scheduler-pinned-filter-bar');
  const pinnedFilterVisibleStyles = getCssBlock('.scheduler-pinned-filter-bar.is-visible');
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
  assert.match(pinnedFilterBarStyles, /padding:\s*0 1rem/);
  assert.match(pinnedFilterBarStyles, /background:\s*transparent/);
  assert.match(pinnedFilterVisibleStyles, /max-height:\s*6\.5rem/);
  assert.match(pinnedFilterStyles, /width:\s*100%/);
  assert.match(pinnedFilterStyles, /box-sizing:\s*border-box/);
  assert.match(pinnedFilterStyles, /overflow:\s*hidden/);
  assert.match(pinnedFilterStyles, /linear-gradient\(118deg/);
  assert.match(pinnedFilterStyles, /backdrop-filter:\s*blur\(20px\)/);
  assert.doesNotMatch(pinnedFilterStyles, /border-bottom/);
  assert.match(boardFilterSelectStyles, /linear-gradient\(135deg/);
  assert.match(boardFilterSelectStyles, /border-radius:\s*9999px/);
  assert.match(boardFilterSelectStyles, /padding-left:\s*0\.75rem/);
  assert.match(schedulerStyles, /\.scheduler-board-filters--pinned\s+select\s*\{[\s\S]*min-width:\s*0/);
});

runTest('board mode and filters stay inside their glass containers', () => {
  const boardHeadStyles = getCssBlock('.scheduler-board-head');
  const modeToggleStyles = getCssBlock('.scheduler-board-mode-toggle');
  const headerActionsStyles = getCssBlock('.scheduler-header-actions');
  const modeOptionStyles = getCssBlock('.scheduler-board-mode-option');
  const activeModeOptionStyles = getCssBlock('.scheduler-board-mode-option.is-active');
  const boardFilterSelectStyles = getCssBlock('.scheduler-board-filters .scheduler-board-filter-select');
  const pinnedFiltersStyles = getCssBlock('.scheduler-board-filters--pinned');
  const headFiltersStyles = getCssBlock('.scheduler-board-filters--head');

  assert.match(boardHeadStyles, /overflow:\s*hidden/);
  assert.match(schedulerStyles, /\.scheduler-board-head > \.text-left\s*\{[\s\S]*min-width:\s*0/);
  assert.match(schedulerStyles, /\.scheduler-board-head > \.text-left > \.flex\s*\{[\s\S]*flex-wrap:\s*wrap/);
  assert.match(schedulerStyles, /\.scheduler-board-head > \.flex\.items-center\.gap-2\s*\{[\s\S]*min-width:\s*0/);
  assert.match(headFiltersStyles, /flex-wrap:\s*wrap/);
  assert.match(headFiltersStyles, /max-width:\s*100%/);
  assert.match(pinnedFiltersStyles, /min-width:\s*0/);
  assert.match(modeToggleStyles, /max-width:\s*100%/);
  assert.match(modeToggleStyles, /overflow-x:\s*auto/);
  assert.match(modeOptionStyles, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/);
  assert.match(modeOptionStyles, /backdrop-filter:\s*blur\(14px\)/);
  assert.match(activeModeOptionStyles, /rgba\(37,\s*99,\s*235,\s*0\.22\)/);
  assert.match(activeModeOptionStyles, /backdrop-filter:\s*blur\(16px\)/);
  assert.doesNotMatch(activeModeOptionStyles, /#2563eb|#0f766e/);
  assert.match(boardFilterSelectStyles, /appearance:\s*none/);
  assert.match(boardFilterSelectStyles, /border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.24\)/);
  assert.match(boardFilterSelectStyles, /background:[\s\S]*!important/);
  assert.doesNotMatch(schedulerSource, /scheduler-board-filter-select[^"]*bg-slate-50/);
  assert.match(schedulerSource, /scheduler-header-actions flex items-center gap-4/);
  assert.match(headerActionsStyles, /overflow:\s*visible/);
});

runTest('weekday timetable header sticks below the pinned filters', () => {
  const timetableShellStyles = getCssBlock('.scheduler-timetable-shell');
  const timetableShellHighlightStyles = getCssBlock('.scheduler-timetable-shell::before');
  const weekdayHeaderStyles = getCssBlock('.scheduler-weekday-header');
  const weekdayCellDividerStyles = getCssBlock('.scheduler-weekday-cell + .scheduler-weekday-cell');

  assert.match(schedulerSource, /scheduler-weekday-header/);
  assert.match(schedulerSource, /scheduler-weekday-cell/);
  assert.match(schedulerSource, /周一/);
  assert.match(schedulerSource, /周五/);
  assert.match(weekdayHeaderStyles, /position:\s*sticky/);
  assert.match(weekdayHeaderStyles, /top:\s*-1\.5rem/);
  assert.match(weekdayHeaderStyles, /margin:\s*0\.75rem 0\.875rem 0/);
  assert.match(weekdayHeaderStyles, /border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.24\)/);
  assert.match(weekdayHeaderStyles, /border-radius:\s*9999px/);
  assert.match(weekdayHeaderStyles, /rgba\(255,\s*255,\s*255,\s*0\.1\)/);
  assert.match(weekdayHeaderStyles, /backdrop-filter:\s*blur\(20px\)/);
  assert.match(weekdayHeaderStyles, /linear-gradient\(128deg/);
  assert.match(weekdayHeaderStyles, /z-index:\s*12/);
  assert.doesNotMatch(weekdayHeaderStyles, /border-top-left-radius|border-top-right-radius/);
  assert.match(weekdayCellDividerStyles, /border-left:\s*1px solid rgba\(148,\s*163,\s*184,\s*0\.14\)/);
  assert.match(timetableShellStyles, /border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.2\)/);
  assert.match(timetableShellStyles, /border-radius:\s*28px/);
  assert.match(timetableShellStyles, /clip-path:\s*inset\(0 round 28px\)/);
  assert.match(timetableShellStyles, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.1\)/);
  assert.match(timetableShellStyles, /backdrop-filter:\s*blur\(24px\)/);
  assert.match(timetableShellStyles, /0 0 0 1px rgba\(255,\s*255,\s*255,\s*0\.05\)/);
  assert.match(timetableShellHighlightStyles, /radial-gradient\(circle at 12% 12%/);
  assert.doesNotMatch(schedulerSource, /scheduler-timetable-shell bg-white border border-slate-200 rounded-xl shadow-xs/);
  assert.doesNotMatch(schedulerSource, /scheduler-weekday-header grid grid-cols-6 border-b border-slate-200 bg-slate-50\/80/);
  assert.doesNotMatch(schedulerSource, /scheduler-weekday-cell p-3 border-r/);
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

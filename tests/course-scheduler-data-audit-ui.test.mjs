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

runTest('management view exposes a data audit tab backed by scheduler data', () => {
  assert.match(appSource, /buildDataAuditReport/);
  assert.match(appSource, /'audit'/);
  assert.match(appSource, /数据核对/);
  assert.match(appSource, /dataAuditReport/);
  assert.match(appSource, /renderDataAuditPanel/);
});

runTest('data audit panel shows algorithm readiness and issue categories', () => {
  assert.match(appSource, /算法可用性/);
  assert.match(appSource, /课时口径/);
  assert.match(appSource, /教师负荷/);
  assert.match(appSource, /学生数据/);
  assert.match(appSource, /引用完整性/);
  assert.match(appSource, /dataAuditReport\.issues\.map/);
});

runTest('data audit panel exposes real Excel abbreviation mappings and period reconciliation', () => {
  assert.match(appSource, /EXCEL_TIMETABLE_ABBREVIATION_AUDIT/);
  assert.match(appSource, /EXCEL_PERIOD_MISMATCH_AUDIT/);
  assert.match(appSource, /缩写映射核对/);
  assert.match(appSource, /课表缩写/);
  assert.match(appSource, /映射老师/);
  assert.match(appSource, /需人工确认/);
  assert.match(appSource, /节数差异明细/);
  assert.match(appSource, /assignedPeriods/);
  assert.match(appSource, /scheduledPeriods/);
});

runTest('data audit reconciliation tables can be searched and filtered in the UI', () => {
  assert.match(appSource, /dataAuditSearchTerm/);
  assert.match(appSource, /dataAuditMappingStatusFilter/);
  assert.match(appSource, /dataAuditClassNumberFilter/);
  assert.match(appSource, /filteredAbbreviationAuditRows/);
  assert.match(appSource, /filteredPeriodMismatchRows/);
  assert.match(appSource, /搜索缩写、老师、学科/);
  assert.match(appSource, /全部映射状态/);
  assert.match(appSource, /只看需人工确认/);
  assert.match(appSource, /全部班级/);
});

runTest('data audit panel uses dense glass operational styling', () => {
  assert.match(stylesSource, /\.data-audit-grid/);
  assert.match(stylesSource, /\.data-audit-summary-card/);
  assert.match(stylesSource, /\.data-audit-issue-card/);
  assert.match(stylesSource, /\.data-audit-reconciliation-grid/);
  assert.match(stylesSource, /\.data-audit-mapping-table/);
  assert.match(stylesSource, /\.data-audit-filter-bar/);
  assert.match(stylesSource, /backdrop-filter:\s*blur\(20px\)/);
});

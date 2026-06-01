import assert from 'node:assert/strict';
import fs from 'node:fs';

function readIfExists(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
}

const appSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const generatorPath = 'scripts/generate_all_grades_excel_data.mjs';
const generatorSource = readIfExists(generatorPath);
const excelDataPath = 'components/course-scheduler/excelData.ts';
const excelDataSource = readIfExists(excelDataPath);

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('course scheduler reads its initial data from the real Excel data module', () => {
  assert.ok(fs.existsSync(excelDataPath));
  assert.match(appSource, /from '\.\/excelData'/);
  assert.doesNotMatch(appSource, /from '\.\/mockData'/);
  assert.match(appSource, /isTrustedExcelSavedData/);
  assert.match(appSource, /dataSource:\s*createExcelDataSourceSnapshot\(\)/);
  assert.match(excelDataSource, /EXCEL_DATA_SOURCES/);
  assert.match(excelDataSource, /EXCEL_DATASET_ID/);
  assert.match(excelDataSource, /2026春各年级分工表（3\.1）\.xlsx/);
  assert.match(excelDataSource, /高二课程表3\.5\.xlsx/);
});

runTest('generated scheduler data does not contain fabricated contact or student fields', () => {
  assert.doesNotMatch(excelDataSource, /"phone":\s*"138\d+"/);
  assert.doesNotMatch(excelDataSource, /@school\.edu\.cn/);
  assert.doesNotMatch(appSource, /13800000000/);
  assert.doesNotMatch(appSource, /new_teacher@school\.edu\.cn/);
  assert.match(excelDataSource, /EXCEL_DATA_LIMITATIONS/);
  assert.match(excelDataSource, /学生花名册/);
});

runTest('Excel generator writes explicit real-data output without random fabricated values', () => {
  assert.ok(fs.existsSync(generatorPath));
  assert.doesNotMatch(generatorSource, /Math\.random/);
  assert.match(generatorSource, /components\/course-scheduler\/excelData\.ts/);
  assert.match(generatorSource, /phone:\s*''/);
  assert.match(generatorSource, /email:\s*''/);
  assert.match(generatorSource, /EXCEL_DATA_SOURCES/);
});

runTest('Excel generator exports timetable abbreviation and period reconciliation audits', () => {
  assert.match(generatorSource, /abbreviationAudit/);
  assert.match(generatorSource, /periodMismatchAudit/);
  assert.match(generatorSource, /status:\s*'needsReview'/);
  assert.match(excelDataSource, /EXCEL_TIMETABLE_ABBREVIATION_AUDIT/);
  assert.match(excelDataSource, /EXCEL_PERIOD_MISMATCH_AUDIT/);
  assert.match(excelDataSource, /"abbreviation":\s*"英程"/);
  assert.match(excelDataSource, /"teacherName":\s*"张红旗"/);
  assert.match(excelDataSource, /"status":\s*"needsReview"/);
  assert.match(excelDataSource, /"assignedPeriods"/);
  assert.match(excelDataSource, /"scheduledPeriods"/);
});

runTest('scheduler tooling no longer exposes mock data entrypoints or fabricated fallbacks', () => {
  [
    'scripts/generate_all_grades_mockdata.mjs',
    'scripts/generate_mockdata_file.mjs',
    'scripts/parse_to_mockdata.mjs'
  ].forEach(path => assert.equal(fs.existsSync(path), false, `${path} should be renamed to Excel data terminology`));

  [
    'scripts/generate_all_grades_excel_data.mjs',
    'scripts/generate_excel_data_file.mjs',
    'scripts/rewrite_scheduler_app.mjs'
  ].forEach(path => {
    const source = readIfExists(path);
    assert.ok(source, `${path} should exist`);
    assert.doesNotMatch(source, /from ['"]\.\/mockData['"]/);
    assert.doesNotMatch(source, /13800000000/);
    assert.doesNotMatch(source, /new_teacher@school\.edu\.cn/);
    assert.doesNotMatch(source, /@school\.edu\.cn/);
  });
});

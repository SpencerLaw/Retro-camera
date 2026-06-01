import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const generatorSource = fs.readFileSync('scripts/generate_all_grades_mockdata.mjs', 'utf8');
const excelDataPath = 'components/course-scheduler/excelData.ts';
const excelDataSource = fs.existsSync(excelDataPath) ? fs.readFileSync(excelDataPath, 'utf8') : '';

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
  assert.doesNotMatch(generatorSource, /Math\.random/);
  assert.match(generatorSource, /components\/course-scheduler\/excelData\.ts/);
  assert.match(generatorSource, /phone:\s*''/);
  assert.match(generatorSource, /email:\s*''/);
  assert.match(generatorSource, /EXCEL_DATA_SOURCES/);
});

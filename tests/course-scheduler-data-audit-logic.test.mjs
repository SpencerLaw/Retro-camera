import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('components/course-scheduler/courseSchedulerDataAudit.ts', 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { buildDataAuditReport } = await import(moduleUrl);

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const teacher = (overrides = {}) => ({
  id: 'T1',
  name: '李老师',
  subjects: ['数学'],
  maxWeeklyHours: 1,
  maxDailyHours: 6,
  maxConsecutiveLessons: 3,
  unavailablePeriods: [],
  preferences: '',
  phone: '',
  email: '',
  department: '数学组',
  ...overrides,
});

const teachingClass = (overrides = {}) => ({
  id: 'C1',
  name: '高二1班数学班',
  subject: '数学',
  teacherId: 'T1',
  classroomId: 'R1',
  studentCount: 40,
  combination: '物化生',
  classNumber: 1,
  grade: '高二',
  periods: 3,
  ...overrides,
});

const schedule = (overrides = {}) => ({
  id: `S${overrides.day || 1}_${overrides.period || 1}_${overrides.teacherId || 'T1'}`,
  teachingClassId: 'C1',
  teachingClassName: '高二1班数学班',
  subject: '数学',
  teacherId: 'T1',
  teacherName: '李老师',
  classroomId: 'R1',
  classroomName: '高二1班普通教室',
  day: 1,
  period: 1,
  ...overrides,
});

runTest('data audit aggregates load, period mismatch, roster and reference risks', () => {
  const report = buildDataAuditReport({
    selectedGrade: '高二',
    teachers: [
      teacher({ maxWeeklyHours: 1 }),
      teacher({ id: 'T2', name: '王老师', subjects: ['数学'], maxWeeklyHours: 16 }),
    ],
    classrooms: [{ id: 'R1', name: '高二1班普通教室', type: 'ordinary', capacity: 45, assignedSubjects: ['数学'] }],
    teachingClasses: [teachingClass({ periods: 2 })],
    students: [],
    schedules: [
      schedule({ id: 'S1', day: 1, period: 1 }),
      schedule({ id: 'S2', day: 2, period: 1 }),
      schedule({ id: 'S3', teacherId: 'UNKNOWN', teacherName: '未知老师', day: 3, period: 1 }),
    ],
  });

  assert.equal(report.summary.totalIssues, 4);
  assert.ok(report.issues.some(issue => issue.category === 'load' && issue.message.includes('超过上限')));
  assert.ok(report.issues.some(issue => issue.category === 'periods' && issue.message.includes('分工表')));
  assert.ok(report.issues.some(issue => issue.category === 'students' && issue.message.includes('学生走班花名册为空')));
  assert.ok(report.issues.some(issue => issue.category === 'integrity' && issue.message.includes('不存在的教师ID')));
});

runTest('data audit marks a clean bounded grade as ready', () => {
  const report = buildDataAuditReport({
    selectedGrade: '高二',
    teachers: [teacher({ maxWeeklyHours: 4 })],
    classrooms: [{ id: 'R1', name: '高二1班普通教室', type: 'ordinary', capacity: 45, assignedSubjects: ['数学'] }],
    teachingClasses: [teachingClass({ periods: 2 })],
    students: [{ id: 'ST1', name: '学生甲', electiveCombo: '物化生', classes: ['C1'] }],
    schedules: [
      schedule({ id: 'S1', day: 1, period: 1 }),
      schedule({ id: 'S2', day: 2, period: 1 }),
    ],
  });

  assert.equal(report.summary.totalIssues, 0);
  assert.equal(report.summary.readyForAlgorithm, true);
});

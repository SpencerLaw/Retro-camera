import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('components/course-scheduler/courseSchedulerLogic.ts', 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const { detectConflicts, getSubstituteRecommendations } = await import(moduleUrl);

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
  maxDailyHours: 2,
  maxConsecutiveLessons: 2,
  unavailablePeriods: [],
  preferences: '',
  phone: '',
  email: '',
  department: '数学组',
  ...overrides,
});

const room = (overrides = {}) => ({
  id: 'R1',
  name: '高二1班普通教室',
  type: 'ordinary',
  capacity: 45,
  assignedSubjects: ['数学'],
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
  periods: 2,
  ...overrides,
});

const schedule = (overrides = {}) => ({
  id: `S${overrides.day || 1}_${overrides.period || 1}_${overrides.teachingClassId || 'C1'}`,
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

runTest('detectConflicts reports teacher weekly overload instead of silently allowing it', () => {
  const conflicts = detectConflicts(
    [schedule({ id: 'S1', period: 1 }), schedule({ id: 'S2', period: 2 })],
    [teacher({ maxWeeklyHours: 1 })],
    [room()],
    [],
    [],
    { allowTeacherLoadRelaxation: false }
  );

  assert.ok(conflicts.some(c =>
    c.severity === 'warning' &&
    c.type === 'constraint' &&
    c.targetId === 'T1' &&
    c.message.includes('周课时负荷')
  ));
});

runTest('detectConflicts reports teaching class period mismatches against assignment data', () => {
  const conflicts = detectConflicts(
    [schedule({ id: 'S1', period: 1 })],
    [teacher({ maxWeeklyHours: 10 })],
    [room()],
    [teachingClass({ periods: 2 })],
    [{ id: 'ST1', name: '学生甲', electiveCombo: '物化生', classes: ['C1'] }],
    { allowSchedulePeriodMismatch: false }
  );

  assert.ok(conflicts.some(c =>
    c.severity === 'warning' &&
    c.targetId === 'C1' &&
    c.message.includes('课时口径不一致')
  ));
});

runTest('detectConflicts warns when student roster is empty but teaching classes exist', () => {
  const conflicts = detectConflicts(
    [schedule({ id: 'S1', period: 1 })],
    [teacher({ maxWeeklyHours: 10 })],
    [room()],
    [teachingClass()],
    [],
    { allowStudentRosterRelaxation: false }
  );

  assert.ok(conflicts.some(c =>
    c.severity === 'warning' &&
    c.targetId === 'students' &&
    c.message.includes('学生走班花名册为空')
  ));
});

runTest('getSubstituteRecommendations blocks teachers already at weekly capacity', () => {
  const recommendations = getSubstituteRecommendations(
    'TARGET',
    [
      schedule({ id: 'TARGET', teacherId: 'T1', teacherName: '李老师', day: 1, period: 1 }),
      schedule({ id: 'BUSY', teacherId: 'T2', teacherName: '王老师', day: 1, period: 2 }),
    ],
    [
      teacher({ id: 'T1', name: '李老师', maxWeeklyHours: 10 }),
      teacher({ id: 'T2', name: '王老师', maxWeeklyHours: 1 }),
    ]
  );

  const overloaded = recommendations.find(rec => rec.teacher.id === 'T2');
  assert.ok(overloaded);
  assert.equal('suitabilityScore' in overloaded, false);
  assert.equal(overloaded?.hasLoadConflict, true);
  assert.ok(overloaded?.reasons.some(reason => reason.includes('周课时上限')));
});

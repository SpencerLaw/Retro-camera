import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL('dist-test/courseSchedulerPreferences.mjs');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const { detectPreferenceDiagnostics, createDefaultSchedulingPreferences } = await import(moduleUrl.href);

const teachers = [
  { id: 'T1', name: '王老师', subjects: ['语文'], maxWeeklyHours: 16, maxDailyHours: 6, maxConsecutiveLessons: 3, unavailablePeriods: [], preferences: '', phone: '', email: '', department: '语文组' },
  { id: 'T2', name: '李老师', subjects: ['数学'], maxWeeklyHours: 16, maxDailyHours: 6, maxConsecutiveLessons: 3, unavailablePeriods: [], preferences: '', phone: '', email: '', department: '数学组' }
];

const classes = [
  { id: 'C1_CN', name: '高二1班语文班', subject: '语文', teacherId: 'T1', classroomId: 'R1', studentCount: 40, combination: '普通班', classNumber: 1, grade: '高二', periods: 2 },
  { id: 'C2_CN', name: '高二2班语文班', subject: '语文', teacherId: 'T1', classroomId: 'R2', studentCount: 40, combination: '普通班', classNumber: 2, grade: '高二', periods: 2 },
  { id: 'C1_MATH', name: '高二1班数学班', subject: '数学', teacherId: 'T2', classroomId: 'R1', studentCount: 40, combination: '普通班', classNumber: 1, grade: '高二', periods: 1 },
  { id: 'C2_MATH', name: '高二2班数学班', subject: '数学', teacherId: 'T2', classroomId: 'R2', studentCount: 40, combination: '普通班', classNumber: 2, grade: '高二', periods: 1 }
];

const schedules = [
  { id: 'S1', teachingClassId: 'C1_CN', teachingClassName: '高二1班语文班', subject: '语文', teacherId: 'T1', teacherName: '王老师', classroomId: 'R1', classroomName: '高二1班', day: 3, period: 1 },
  { id: 'S2', teachingClassId: 'C1_CN', teachingClassName: '高二1班语文班', subject: '语文', teacherId: 'T1', teacherName: '王老师', classroomId: 'R1', classroomName: '高二1班', day: 3, period: 3 },
  { id: 'S3', teachingClassId: 'C2_CN', teachingClassName: '高二2班语文班', subject: '语文', teacherId: 'T1', teacherName: '王老师', classroomId: 'R2', classroomName: '高二2班', day: 3, period: 4 },
  { id: 'S4', teachingClassId: 'C2_CN', teachingClassName: '高二2班语文班', subject: '语文', teacherId: 'T1', teacherName: '王老师', classroomId: 'R2', classroomName: '高二2班', day: 3, period: 5 },
  { id: 'S5', teachingClassId: 'C1_MATH', teachingClassName: '高二1班数学班', subject: '数学', teacherId: 'T2', teacherName: '李老师', classroomId: 'R1', classroomName: '高二1班', day: 2, period: 8 },
  { id: 'S6', teachingClassId: 'C2_MATH', teachingClassName: '高二2班数学班', subject: '数学', teacherId: 'T2', teacherName: '李老师', classroomId: 'R2', classroomName: '高二2班', day: 2, period: 6 }
];

runTest('teacher period balance reports teachers above max watched periods', () => {
  const preferences = createDefaultSchedulingPreferences();
  const diagnostics = detectPreferenceDiagnostics(schedules, teachers, classes, preferences);
  assert.ok(diagnostics.some(item => item.ruleType === 'teacherPeriodBalance' && item.targetId === 'T1'));
  assert.ok(diagnostics.some(item => item.message.includes('重点节次')));
});

runTest('double lesson diagnostics require adjacent subject lessons for each class', () => {
  const preferences = {
    version: 1,
    teacherPeriodBalance: [],
    forbiddenSlotRules: [],
    syncLessonRules: [],
    doubleLessonRules: [{
      id: 'double-cn',
      name: '周三语文连堂',
      enabled: true,
      grade: '高二',
      subject: '语文',
      day: 3,
      classNumbers: 'all',
      requiredAdjacentCount: 2,
      severity: 'warning'
    }]
  };
  const diagnostics = detectPreferenceDiagnostics(schedules, teachers, classes, preferences);
  assert.ok(diagnostics.some(item => item.ruleType === 'doubleLesson' && item.message.includes('高二1班')));
  assert.equal(diagnostics.some(item => item.ruleType === 'doubleLesson' && item.message.includes('高二2班')), false);
});

runTest('forbidden slot diagnostics catch blocked class and subject placements', () => {
  const preferences = {
    version: 1,
    teacherPeriodBalance: [],
    doubleLessonRules: [],
    syncLessonRules: [],
    forbiddenSlotRules: [{
      id: 'block-cn-p1',
      name: '语文第一节禁排',
      enabled: true,
      scope: 'subject',
      subject: '语文',
      slots: [{ day: 3, period: 1 }],
      severity: 'critical'
    }]
  };
  const diagnostics = detectPreferenceDiagnostics(schedules, teachers, classes, preferences);
  assert.ok(diagnostics.some(item => item.ruleType === 'forbiddenSlot' && item.severity === 'critical' && item.involvedScheduleIds.includes('S1')));
});

runTest('sync lesson diagnostics catch selected classes not in the same slot', () => {
  const preferences = {
    version: 1,
    teacherPeriodBalance: [],
    doubleLessonRules: [],
    forbiddenSlotRules: [],
    syncLessonRules: [{
      id: 'sync-math',
      name: '数学同步',
      enabled: true,
      grade: '高二',
      subject: '数学',
      classNumbers: [1, 2],
      requiredSameSlot: true,
      severity: 'critical'
    }]
  };
  const diagnostics = detectPreferenceDiagnostics(schedules, teachers, classes, preferences);
  assert.ok(diagnostics.some(item => item.ruleType === 'syncLesson' && item.severity === 'critical'));
});

import type { Classroom, ScheduleItem, Student, Teacher, TeachingClass } from './types';

type DataAuditSeverity = 'critical' | 'warning';
type DataAuditCategory = 'integrity' | 'periods' | 'load' | 'students';

export interface DataAuditIssue {
  id: string;
  severity: DataAuditSeverity;
  category: DataAuditCategory;
  title: string;
  message: string;
  suggestedAction: string;
  affectedIds: string[];
}

export interface DataAuditReport {
  selectedGrade: string;
  summary: {
    totalIssues: number;
    criticalCount: number;
    warningCount: number;
    readyForAlgorithm: boolean;
  };
  categoryCounts: Record<DataAuditCategory, number>;
  issues: DataAuditIssue[];
}

interface BuildDataAuditReportInput {
  selectedGrade: string;
  teachers: Teacher[];
  classrooms: Classroom[];
  teachingClasses: TeachingClass[];
  students: Student[];
  schedules: ScheduleItem[];
}

const categoryOrder: DataAuditCategory[] = ['integrity', 'periods', 'load', 'students'];

const createEmptyCategoryCounts = (): Record<DataAuditCategory, number> => ({
  integrity: 0,
  periods: 0,
  load: 0,
  students: 0,
});

const scheduleBelongsToGrade = (item: ScheduleItem, grade: string) => (
  item.teachingClassName.startsWith(grade)
);

export const buildDataAuditReport = ({
  selectedGrade,
  teachers,
  classrooms,
  teachingClasses,
  students,
  schedules,
}: BuildDataAuditReportInput): DataAuditReport => {
  const teachersById = new Map(teachers.map(teacher => [teacher.id, teacher]));
  const classroomsById = new Map(classrooms.map(classroom => [classroom.id, classroom]));
  const teachingClassesById = new Map(teachingClasses.map(teachingClass => [teachingClass.id, teachingClass]));
  const gradeTeachingClasses = teachingClasses.filter(teachingClass => teachingClass.grade === selectedGrade);
  const gradeClassIds = new Set(gradeTeachingClasses.map(teachingClass => teachingClass.id));
  const gradeSchedules = schedules.filter(item => (
    !item.isFinished && (scheduleBelongsToGrade(item, selectedGrade) || gradeClassIds.has(item.teachingClassId))
  ));
  const gradeStudents = students.filter(student => (
    student.classes.some(classId => gradeClassIds.has(classId))
  ));
  const issues: DataAuditIssue[] = [];

  const addIssue = (issue: Omit<DataAuditIssue, 'id'>) => {
    issues.push({
      id: `data_audit_${issues.length + 1}`,
      ...issue,
    });
  };

  const missingTeacherIds = new Set<string>();
  const missingClassroomIds = new Set<string>();
  const missingTeachingClassIds = new Set<string>();
  const subjectMismatchIds = new Set<string>();
  const teacherMismatchIds = new Set<string>();

  for (const item of gradeSchedules) {
    const teacher = teachersById.get(item.teacherId);
    const classroom = classroomsById.get(item.classroomId);
    const teachingClass = teachingClassesById.get(item.teachingClassId);

    if (!teacher) missingTeacherIds.add(item.teacherId);
    if (!classroom) missingClassroomIds.add(item.classroomId);
    if (!teachingClass) {
      missingTeachingClassIds.add(item.teachingClassId);
      continue;
    }

    if (teachingClass.subject !== item.subject) {
      subjectMismatchIds.add(teachingClass.id);
    }

    if (!item.isTemp && teachingClass.teacherId !== item.teacherId) {
      teacherMismatchIds.add(teachingClass.id);
    }
  }

  const referenceMessages: string[] = [];
  const referenceIds: string[] = [];
  if (missingTeacherIds.size > 0) {
    referenceMessages.push(`${missingTeacherIds.size} 个不存在的教师ID`);
    referenceIds.push(...missingTeacherIds);
  }
  if (missingClassroomIds.size > 0) {
    referenceMessages.push(`${missingClassroomIds.size} 个不存在的教室ID`);
    referenceIds.push(...missingClassroomIds);
  }
  if (missingTeachingClassIds.size > 0) {
    referenceMessages.push(`${missingTeachingClassIds.size} 个不存在的教学班ID`);
    referenceIds.push(...missingTeachingClassIds);
  }
  if (subjectMismatchIds.size > 0) {
    referenceMessages.push(`${subjectMismatchIds.size} 个教学班学科不一致`);
    referenceIds.push(...subjectMismatchIds);
  }
  if (teacherMismatchIds.size > 0) {
    referenceMessages.push(`${teacherMismatchIds.size} 个分工表教师与课表教师不一致`);
    referenceIds.push(...teacherMismatchIds);
  }

  if (referenceMessages.length > 0) {
    addIssue({
      severity: missingTeacherIds.size + missingClassroomIds.size + missingTeachingClassIds.size > 0 ? 'critical' : 'warning',
      category: 'integrity',
      title: '引用完整性',
      message: `${selectedGrade}课表存在${referenceMessages.join('、')}，会影响诊断和代课推荐的准确性。`,
      suggestedAction: '先统一教师、教室、教学班ID，再重新运行数据核对。',
      affectedIds: Array.from(new Set(referenceIds)),
    });
  }

  const scheduledByClassId = new Map<string, ScheduleItem[]>();
  for (const item of gradeSchedules) {
    if (!scheduledByClassId.has(item.teachingClassId)) scheduledByClassId.set(item.teachingClassId, []);
    scheduledByClassId.get(item.teachingClassId)!.push(item);
  }

  const periodMismatchClasses = gradeTeachingClasses.filter(teachingClass => {
    if (typeof teachingClass.periods !== 'number' || teachingClass.periods < 0) return false;
    const actual = scheduledByClassId.get(teachingClass.id)?.length || 0;
    return actual !== teachingClass.periods;
  });

  if (periodMismatchClasses.length > 0) {
    const examples = periodMismatchClasses.slice(0, 4).map(teachingClass => {
      const actual = scheduledByClassId.get(teachingClass.id)?.length || 0;
      return `${teachingClass.name} ${teachingClass.periods} vs ${actual}`;
    });
    addIssue({
      severity: 'warning',
      category: 'periods',
      title: '课时口径',
      message: `${periodMismatchClasses.length} 个教学班分工表节数与当前课表格子数不一致：${examples.join('；')}。`,
      suggestedAction: '确认分工表“节数”是否等于周课时；如果包含补充课/调剂课，建议拆成标准周课时与实际排课两个字段。',
      affectedIds: periodMismatchClasses.map(teachingClass => teachingClass.id),
    });
  }

  const scheduledByTeacherId = new Map<string, ScheduleItem[]>();
  for (const item of gradeSchedules) {
    if (!scheduledByTeacherId.has(item.teacherId)) scheduledByTeacherId.set(item.teacherId, []);
    scheduledByTeacherId.get(item.teacherId)!.push(item);
  }

  const overloadedTeachers = teachers
    .filter(teacher => {
      const actual = scheduledByTeacherId.get(teacher.id)?.length || 0;
      return teacher.maxWeeklyHours > 0 && actual > teacher.maxWeeklyHours;
    })
    .map(teacher => ({
      teacher,
      actual: scheduledByTeacherId.get(teacher.id)?.length || 0,
    }));

  if (overloadedTeachers.length > 0) {
    const examples = overloadedTeachers.slice(0, 4).map(({ teacher, actual }) => (
      `${teacher.name} ${actual}/${teacher.maxWeeklyHours}`
    ));
    addIssue({
      severity: 'warning',
      category: 'load',
      title: '教师负荷',
      message: `${overloadedTeachers.length} 位教师超过上限：${examples.join('；')}。请确认这些上限来自真实岗位限制表。`,
      suggestedAction: '把教师上限字段校正为真实值，再让代课推荐排序和自动排课使用该约束。',
      affectedIds: overloadedTeachers.map(({ teacher }) => teacher.id),
    });
  }

  const teachersMissingWeeklyLimits = teachers
    .filter(teacher => (scheduledByTeacherId.get(teacher.id)?.length || 0) > 0 && teacher.maxWeeklyHours <= 0);

  if (teachersMissingWeeklyLimits.length > 0) {
    const examples = teachersMissingWeeklyLimits.slice(0, 4).map(teacher => teacher.name);
    addIssue({
      severity: 'warning',
      category: 'load',
      title: '教师负荷',
      message: `${teachersMissingWeeklyLimits.length} 位有课教师未导入真实周课时上限：${examples.join('；')}。系统不会用默认值替代真实上限。`,
      suggestedAction: '从真实岗位限制表导入周课时上限，或在教师表中手动维护后再启用负荷约束。',
      affectedIds: teachersMissingWeeklyLimits.map(teacher => teacher.id),
    });
  }

  if (gradeTeachingClasses.length > 0 && gradeStudents.length === 0) {
    addIssue({
      severity: 'warning',
      category: 'students',
      title: '学生数据',
      message: `${selectedGrade}学生走班花名册为空，当前无法验证学生是否被安排到同一时段的多个教学班。`,
      suggestedAction: '导入学生名单、选科组合和教学班绑定关系，再启用学生级走班冲突检测。',
      affectedIds: ['students'],
    });
  }

  const categoryCounts = createEmptyCategoryCounts();
  for (const issue of issues) {
    categoryCounts[issue.category] += 1;
  }

  const sortedIssues = [...issues].sort((a, b) => {
    const severityRank = (value: DataAuditSeverity) => value === 'critical' ? 0 : 1;
    return severityRank(a.severity) - severityRank(b.severity)
      || categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
      || a.title.localeCompare(b.title);
  });

  const criticalCount = sortedIssues.filter(issue => issue.severity === 'critical').length;
  const warningCount = sortedIssues.filter(issue => issue.severity === 'warning').length;

  return {
    selectedGrade,
    summary: {
      totalIssues: sortedIssues.length,
      criticalCount,
      warningCount,
      readyForAlgorithm: criticalCount === 0 && warningCount === 0,
    },
    categoryCounts,
    issues: sortedIssues,
  };
};

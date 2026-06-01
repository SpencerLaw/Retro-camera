import type {
  ScheduleItem,
  SchedulingPreferences,
  Teacher,
  TeachingClass,
  PreferenceDiagnostic,
  TeacherPeriodBalanceRule,
  DoubleLessonRule,
  ForbiddenSlotRule,
  SyncLessonRule
} from './types';

export const createDefaultSchedulingPreferences = (): SchedulingPreferences => ({
  version: 1,
  teacherPeriodBalance: [
    {
      id: 'pref-default-teacher-period-balance',
      name: '教师重点节次均衡',
      enabled: true,
      watchedPeriods: [1, 4, 5, 8],
      minPerTeacherPerWeek: 1,
      maxPerTeacherPerWeek: 2,
      severity: 'warning'
    }
  ],
  doubleLessonRules: [],
  forbiddenSlotRules: [],
  syncLessonRules: []
});

const normalizeArray = <T>(value: unknown, fallback: T[] = []): T[] => (
  Array.isArray(value) ? value as T[] : fallback
);

export const normalizeSchedulingPreferences = (value: unknown): SchedulingPreferences => {
  const defaults = createDefaultSchedulingPreferences();
  if (!value || typeof value !== 'object') return defaults;

  const raw = value as Partial<SchedulingPreferences>;
  return {
    version: 1,
    teacherPeriodBalance: normalizeArray<TeacherPeriodBalanceRule>(
      raw.teacherPeriodBalance,
      defaults.teacherPeriodBalance
    ),
    doubleLessonRules: normalizeArray<DoubleLessonRule>(raw.doubleLessonRules),
    forbiddenSlotRules: normalizeArray<ForbiddenSlotRule>(raw.forbiddenSlotRules),
    syncLessonRules: normalizeArray<SyncLessonRule>(raw.syncLessonRules)
  };
};

const getClassNumberForSchedule = (item: ScheduleItem, classesById: Map<string, TeachingClass>) => {
  const teachingClass = classesById.get(item.teachingClassId);
  if (teachingClass?.classNumber) return teachingClass.classNumber;
  const match = item.teachingClassName.match(/(?:初一|初二|初三|高一|高二|高三)(\d+)班/);
  return match ? Number(match[1]) : undefined;
};

const getGradeForSchedule = (item: ScheduleItem, classesById: Map<string, TeachingClass>) => {
  const teachingClass = classesById.get(item.teachingClassId);
  if (teachingClass?.grade) return teachingClass.grade;
  return item.teachingClassName.match(/^(初一|初二|初三|高一|高二|高三)/)?.[1];
};

const sameSlot = (a: { day: number; period: number }, b: { day: number; period: number }) => (
  a.day === b.day && a.period === b.period
);

const uniqueSlots = (items: ScheduleItem[]) => (
  Array.from(
    new Map(items.map(item => [`${item.day}-${item.period}`, { day: item.day, period: item.period }])).values()
  )
);

const classMatchesRule = (
  teachingClass: TeachingClass,
  rule: { grade?: string; subject?: string; classNumbers?: number[] | 'all'; teachingClassIds?: string[] }
) => {
  if (rule.grade && teachingClass.grade !== rule.grade) return false;
  if (rule.subject && teachingClass.subject !== rule.subject) return false;
  if (rule.teachingClassIds?.length && !rule.teachingClassIds.includes(teachingClass.id)) return false;
  if (Array.isArray(rule.classNumbers) && !rule.classNumbers.includes(teachingClass.classNumber || -1)) return false;
  return true;
};

const scheduleMatchesClassScope = (
  item: ScheduleItem,
  rule: { grade?: string; subject?: string; classNumbers?: number[] | 'all'; teachingClassIds?: string[] },
  classesById: Map<string, TeachingClass>
) => {
  const teachingClass = classesById.get(item.teachingClassId);
  if (teachingClass) return classMatchesRule(teachingClass, rule);

  const grade = getGradeForSchedule(item, classesById);
  const classNumber = getClassNumberForSchedule(item, classesById);
  if (rule.grade && grade !== rule.grade) return false;
  if (rule.subject && item.subject !== rule.subject) return false;
  if (rule.teachingClassIds?.length && !rule.teachingClassIds.includes(item.teachingClassId)) return false;
  if (Array.isArray(rule.classNumbers) && !rule.classNumbers.includes(classNumber || -1)) return false;
  return true;
};

const getForbiddenTargetId = (
  item: ScheduleItem,
  rule: ForbiddenSlotRule,
  classesById: Map<string, TeachingClass>
) => {
  if (rule.scope === 'teacher') return item.teacherId;
  if (rule.scope === 'subject') return item.subject;
  if (rule.scope === 'teachingClass') return item.teachingClassId;
  const classNumber = getClassNumberForSchedule(item, classesById);
  return classNumber ? `${getGradeForSchedule(item, classesById) || ''}${classNumber}班` : item.classroomId;
};

const scheduleMatchesForbiddenRule = (
  item: ScheduleItem,
  rule: ForbiddenSlotRule,
  classesById: Map<string, TeachingClass>
) => {
  if (!rule.slots.some(slot => sameSlot(slot, item))) return false;

  const grade = getGradeForSchedule(item, classesById);
  const classNumber = getClassNumberForSchedule(item, classesById);
  if (rule.grade && grade !== rule.grade) return false;
  if (rule.subject && item.subject !== rule.subject) return false;
  if (rule.classNumbers?.length && !rule.classNumbers.includes(classNumber || -1)) return false;

  if (rule.scope === 'teacher') {
    return !rule.targetIds?.length || rule.targetIds.includes(item.teacherId);
  }

  if (rule.scope === 'subject') {
    return !rule.subject || item.subject === rule.subject;
  }

  if (rule.scope === 'teachingClass') {
    return !rule.targetIds?.length || rule.targetIds.includes(item.teachingClassId);
  }

  return !rule.targetIds?.length
    || rule.targetIds.includes(item.teachingClassId)
    || rule.targetIds.includes(item.classroomId)
    || rule.targetIds.includes(String(classNumber));
};

export const detectPreferenceDiagnostics = (
  schedules: ScheduleItem[],
  teachers: Teacher[],
  teachingClasses: TeachingClass[],
  preferences: SchedulingPreferences
): PreferenceDiagnostic[] => {
  const diagnostics: PreferenceDiagnostic[] = [];
  const activeSchedules = schedules.filter(item => !item.isFinished);
  const teachersById = new Map(teachers.map(teacher => [teacher.id, teacher]));
  const classesById = new Map(teachingClasses.map(teachingClass => [teachingClass.id, teachingClass]));
  let counter = 0;

  const pushDiagnostic = (item: Omit<PreferenceDiagnostic, 'id'>) => {
    diagnostics.push({ id: `pref_diag_${counter++}`, ...item });
  };

  for (const rule of preferences.teacherPeriodBalance.filter(rule => rule.enabled)) {
    const scopedSchedules = activeSchedules.filter(item => {
      if (rule.grade && getGradeForSchedule(item, classesById) !== rule.grade) return false;
      if (rule.teacherIds?.length && !rule.teacherIds.includes(item.teacherId)) return false;
      return true;
    });
    const teacherIdsToCheck = rule.teacherIds?.length
      ? rule.teacherIds
      : Array.from(new Set(scopedSchedules.map(item => item.teacherId)));

    for (const teacherId of teacherIdsToCheck) {
      const teacherSchedules = scopedSchedules.filter(item => item.teacherId === teacherId);
      if (teacherSchedules.length === 0) continue;

      const watchedSchedules = teacherSchedules.filter(item => rule.watchedPeriods.includes(item.period));
      const count = watchedSchedules.length;
      const teacherName = teachersById.get(teacherId)?.name || watchedSchedules[0]?.teacherName || teacherId;

      if (typeof rule.maxPerTeacherPerWeek === 'number' && count > rule.maxPerTeacherPerWeek) {
        pushDiagnostic({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: 'teacherPeriodBalance',
          severity: rule.severity,
          targetId: teacherId,
          message: `${teacherName} 本周重点节次已排 ${count} 节，超过上限 ${rule.maxPerTeacherPerWeek} 节`,
          affectedSlots: uniqueSlots(watchedSchedules),
          involvedScheduleIds: watchedSchedules.map(item => item.id),
          suggestedAction: '建议将部分第一、第四、第五或第八节调换到普通节次。'
        });
      }

      if (typeof rule.minPerTeacherPerWeek === 'number' && count < rule.minPerTeacherPerWeek) {
        pushDiagnostic({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: 'teacherPeriodBalance',
          severity: rule.severity,
          targetId: teacherId,
          message: `${teacherName} 本周重点节次仅 ${count} 节，低于下限 ${rule.minPerTeacherPerWeek} 节`,
          affectedSlots: uniqueSlots(watchedSchedules),
          involvedScheduleIds: watchedSchedules.length > 0 ? watchedSchedules.map(item => item.id) : teacherSchedules.map(item => item.id),
          suggestedAction: '建议检查重点节次是否过度集中到其他老师。'
        });
      }
    }
  }

  for (const rule of preferences.doubleLessonRules.filter(rule => rule.enabled)) {
    const targetClasses = teachingClasses.filter(teachingClass => classMatchesRule(teachingClass, rule));
    const requiredAdjacentPairs = Math.max(0, rule.requiredAdjacentCount - 1);

    for (const teachingClass of targetClasses) {
      const classSchedules = activeSchedules
        .filter(item => item.teachingClassId === teachingClass.id)
        .filter(item => item.subject === rule.subject)
        .filter(item => !rule.day || item.day === rule.day)
        .sort((a, b) => a.period - b.period);
      const adjacentPairs = classSchedules.filter((item, index) => {
        const next = classSchedules[index + 1];
        if (!next || next.period !== item.period + 1) return false;
        if (!rule.allowedPairs?.length) return true;
        return rule.allowedPairs.some(([start, end]) => start === item.period && end === next.period);
      });

      if (adjacentPairs.length < requiredAdjacentPairs) {
        pushDiagnostic({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: 'doubleLesson',
          severity: rule.severity,
          targetId: teachingClass.id,
          message: `${teachingClass.name} 未满足${rule.subject}连堂偏好，需要 ${rule.requiredAdjacentCount} 节连续课`,
          affectedSlots: uniqueSlots(classSchedules),
          involvedScheduleIds: classSchedules.map(item => item.id),
          suggestedAction: '建议把同班同学科课程移动到相邻节次。'
        });
      }
    }
  }

  for (const rule of preferences.forbiddenSlotRules.filter(rule => rule.enabled)) {
    for (const item of activeSchedules.filter(schedule => scheduleMatchesForbiddenRule(schedule, rule, classesById))) {
      pushDiagnostic({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: 'forbiddenSlot',
        severity: rule.severity,
        targetId: getForbiddenTargetId(item, rule, classesById),
        message: `${item.teachingClassName} ${item.subject} 安排在禁排时段：周${item.day}第${item.period}节`,
        affectedSlots: [{ day: item.day, period: item.period }],
        involvedScheduleIds: [item.id],
        suggestedAction: '建议调整到非禁排时段，或确认该禁排规则是否仍然有效。'
      });
    }
  }

  for (const rule of preferences.syncLessonRules.filter(rule => rule.enabled && rule.requiredSameSlot)) {
    const matchedSchedules = activeSchedules.filter(item => scheduleMatchesClassScope(item, rule, classesById));
    const slotKeys = new Set(matchedSchedules.map(item => `${item.day}-${item.period}`));

    if (matchedSchedules.length > 1 && slotKeys.size > 1) {
      pushDiagnostic({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: 'syncLesson',
        severity: rule.severity,
        targetId: rule.id,
        message: `${rule.name} 未满足同步上课要求，当前分布在 ${slotKeys.size} 个时段`,
        affectedSlots: uniqueSlots(matchedSchedules),
        involvedScheduleIds: matchedSchedules.map(item => item.id),
        suggestedAction: '建议将选定班级或教学班调整到同一天同一节。'
      });
    }
  }

  return diagnostics;
};

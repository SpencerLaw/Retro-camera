import {
  SchedulingPreferences,
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

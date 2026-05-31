# Course Scheduler Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase 1 of configurable scheduler preferences: local JSON persistence, preference diagnostics, management UI, and tests.

**Architecture:** Add focused preference types and logic beside the existing scheduler logic instead of expanding the already-large app file. `CourseSchedulerApp.tsx` will own React state, persistence, and UI composition; `courseSchedulerPreferences.ts` will own default preferences, normalization, and preference diagnostics.

**Tech Stack:** React 19, TypeScript, Vite, localStorage JSON, existing Node static tests and logic tests.

---

## File Structure

- Modify: `components/course-scheduler/types.ts`
  - Add preference rule types and preference diagnostic types.
- Create: `components/course-scheduler/courseSchedulerPreferences.ts`
  - Normalize missing preferences.
  - Create default teacher-balance preference.
  - Diagnose teacher period balance, double lessons, forbidden slots, and sync lessons.
- Modify: `components/course-scheduler/CourseSchedulerApp.tsx`
  - Add `schedulingPreferences` state.
  - Persist/import/export preferences with the existing JSON backup.
  - Add `排课偏好设置` management sub-tab.
  - Show preference diagnostic counts.
- Modify: `components/course-scheduler/CourseSchedulerStyles.css`
  - Add compact operational styling for preference panels.
- Create: `tests/course-scheduler-preferences-data.test.mjs`
  - Static checks for types, defaults, JSON persistence, and UI wiring.
- Create: `tests/course-scheduler-preferences-logic.test.mjs`
  - Runtime checks for all preference diagnostic rule types.
- Modify: existing course-scheduler tests only if they need new expected strings for the added management tab.

---

### Task 1: Preference Types And Defaults

**Files:**
- Modify: `components/course-scheduler/types.ts`
- Create: `components/course-scheduler/courseSchedulerPreferences.ts`
- Test: `tests/course-scheduler-preferences-data.test.mjs`

- [ ] **Step 1: Write the failing static data test**

Create `tests/course-scheduler-preferences-data.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const typesSource = fs.readFileSync('components/course-scheduler/types.ts', 'utf8');
const preferencesSource = fs.existsSync('components/course-scheduler/courseSchedulerPreferences.ts')
  ? fs.readFileSync('components/course-scheduler/courseSchedulerPreferences.ts', 'utf8')
  : '';
const appSource = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('scheduler preference types are explicit and JSON-backed', () => {
  assert.match(typesSource, /export interface SchedulingPreferences/);
  assert.match(typesSource, /teacherPeriodBalance: TeacherPeriodBalanceRule\[\]/);
  assert.match(typesSource, /doubleLessonRules: DoubleLessonRule\[\]/);
  assert.match(typesSource, /forbiddenSlotRules: ForbiddenSlotRule\[\]/);
  assert.match(typesSource, /syncLessonRules: SyncLessonRule\[\]/);
  assert.match(typesSource, /export interface PreferenceDiagnostic/);
  assert.match(typesSource, /ruleType: 'teacherPeriodBalance' \| 'doubleLesson' \| 'forbiddenSlot' \| 'syncLesson'/);
});

runTest('scheduler preferences have defaults and normalization helpers', () => {
  assert.match(preferencesSource, /export const createDefaultSchedulingPreferences/);
  assert.match(preferencesSource, /watchedPeriods:\s*\[1,\s*4,\s*5,\s*8\]/);
  assert.match(preferencesSource, /minPerTeacherPerWeek:\s*1/);
  assert.match(preferencesSource, /maxPerTeacherPerWeek:\s*2/);
  assert.match(preferencesSource, /export const normalizeSchedulingPreferences/);
});

runTest('app persists scheduling preferences in existing JSON data flow', () => {
  assert.match(appSource, /schedulingPreferences/);
  assert.match(appSource, /setSchedulingPreferences/);
  assert.match(appSource, /normalizeSchedulingPreferences\(parsed\.schedulingPreferences/);
  assert.match(appSource, /schedulingPreferences,/);
  assert.match(appSource, /setJsonRawText\(JSON\.stringify\(exportData, null, 2\)\)/);
});
```

- [ ] **Step 2: Run the data test and verify it fails**

Run:

```bash
node tests/course-scheduler-preferences-data.test.mjs
```

Expected: FAIL because `SchedulingPreferences` and `courseSchedulerPreferences.ts` do not exist yet.

- [ ] **Step 3: Add preference types**

In `components/course-scheduler/types.ts`, after `Conflict`, add:

```ts
export type PreferenceSeverity = 'warning' | 'critical';
export type PreferenceRuleType = 'teacherPeriodBalance' | 'doubleLesson' | 'forbiddenSlot' | 'syncLesson';

export interface SchedulingPreferences {
  version: 1;
  teacherPeriodBalance: TeacherPeriodBalanceRule[];
  doubleLessonRules: DoubleLessonRule[];
  forbiddenSlotRules: ForbiddenSlotRule[];
  syncLessonRules: SyncLessonRule[];
}

export interface TeacherPeriodBalanceRule {
  id: string;
  name: string;
  enabled: boolean;
  grade?: string;
  teacherIds?: string[];
  watchedPeriods: number[];
  minPerTeacherPerWeek?: number;
  maxPerTeacherPerWeek?: number;
  severity: PreferenceSeverity;
}

export interface DoubleLessonRule {
  id: string;
  name: string;
  enabled: boolean;
  grade: string;
  subject: string;
  day?: number;
  classNumbers: number[] | 'all';
  requiredAdjacentCount: number;
  allowedPairs?: Array<[number, number]>;
  severity: PreferenceSeverity;
}

export interface ForbiddenSlotRule {
  id: string;
  name: string;
  enabled: boolean;
  scope: 'teacher' | 'class' | 'subject' | 'teachingClass';
  targetIds?: string[];
  grade?: string;
  classNumbers?: number[];
  subject?: string;
  slots: TimeSlot[];
  severity: PreferenceSeverity;
}

export interface SyncLessonRule {
  id: string;
  name: string;
  enabled: boolean;
  grade: string;
  subject?: string;
  teachingClassIds?: string[];
  classNumbers?: number[];
  requiredSameSlot: boolean;
  severity: PreferenceSeverity;
}

export interface PreferenceDiagnostic {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleType: PreferenceRuleType;
  severity: PreferenceSeverity;
  message: string;
  affectedSlots: TimeSlot[];
  involvedScheduleIds: string[];
  suggestedAction?: string;
}
```

- [ ] **Step 4: Add defaults and normalization**

Create `components/course-scheduler/courseSchedulerPreferences.ts`:

```ts
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

const normalizeArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export const normalizeSchedulingPreferences = (value: unknown): SchedulingPreferences => {
  const defaults = createDefaultSchedulingPreferences();
  if (!value || typeof value !== 'object') return defaults;

  const raw = value as Partial<SchedulingPreferences>;
  return {
    version: 1,
    teacherPeriodBalance: normalizeArray<TeacherPeriodBalanceRule>(raw.teacherPeriodBalance),
    doubleLessonRules: normalizeArray<DoubleLessonRule>(raw.doubleLessonRules),
    forbiddenSlotRules: normalizeArray<ForbiddenSlotRule>(raw.forbiddenSlotRules),
    syncLessonRules: normalizeArray<SyncLessonRule>(raw.syncLessonRules)
  };
};
```

- [ ] **Step 5: Wire app state and JSON persistence minimally**

In `CourseSchedulerApp.tsx`:

```ts
import {
  createDefaultSchedulingPreferences,
  normalizeSchedulingPreferences
} from './courseSchedulerPreferences';
```

Add `SchedulingPreferences` to the type import from `./types`.

Add state beside `conflicts`:

```ts
const [schedulingPreferences, setSchedulingPreferences] = useState<SchedulingPreferences>(createDefaultSchedulingPreferences());
```

On saved data load:

```ts
setSchedulingPreferences(normalizeSchedulingPreferences(parsed.schedulingPreferences));
```

On initial data load and reset:

```ts
const initialSchedulingPreferences = createDefaultSchedulingPreferences();
setSchedulingPreferences(initialSchedulingPreferences);
```

In localStorage save data:

```ts
schedulingPreferences
```

and include it in the effect dependency array.

In JSON export:

```ts
schedulingPreferences
```

In JSON import:

```ts
setSchedulingPreferences(normalizeSchedulingPreferences(parsed.schedulingPreferences));
```

- [ ] **Step 6: Run data test and existing JSON-related tests**

Run:

```bash
node tests/course-scheduler-preferences-data.test.mjs
node tests/course-scheduler-remarks-summary.test.mjs
```

Expected: both PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add components/course-scheduler/types.ts components/course-scheduler/courseSchedulerPreferences.ts components/course-scheduler/CourseSchedulerApp.tsx tests/course-scheduler-preferences-data.test.mjs
git commit -m "feat: add scheduler preference data model"
```

---

### Task 2: Preference Diagnostics Logic

**Files:**
- Modify: `components/course-scheduler/courseSchedulerPreferences.ts`
- Test: `tests/course-scheduler-preferences-logic.test.mjs`

- [ ] **Step 1: Write failing logic tests**

Create `tests/course-scheduler-preferences-logic.test.mjs`:

```js
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
```

- [ ] **Step 2: Add a lightweight build command for the TS module**

Run:

```bash
npx esbuild components/course-scheduler/courseSchedulerPreferences.ts --bundle --platform=node --format=esm --outfile=dist-test/courseSchedulerPreferences.mjs
node tests/course-scheduler-preferences-logic.test.mjs
```

Expected: FAIL because `detectPreferenceDiagnostics` is not implemented.

- [ ] **Step 3: Implement diagnostics**

In `courseSchedulerPreferences.ts`, expand imports:

```ts
import {
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
```

Add helper signatures:

```ts
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

const sameSlot = (a: { day: number; period: number }, b: { day: number; period: number }) => a.day === b.day && a.period === b.period;
```

Add exported function:

```ts
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
    // Implement teacher watched-period counts and push above/below diagnostics.
  }

  for (const rule of preferences.doubleLessonRules.filter(rule => rule.enabled)) {
    // Implement adjacent-period check per matching class.
  }

  for (const rule of preferences.forbiddenSlotRules.filter(rule => rule.enabled)) {
    // Implement forbidden slot matching by scope.
  }

  for (const rule of preferences.syncLessonRules.filter(rule => rule.enabled && rule.requiredSameSlot)) {
    // Implement same-slot check for matching schedules.
  }

  return diagnostics;
};
```

Fill the four loops with simple deterministic logic:

- Teacher balance:
  - Filter schedules by watched periods.
  - Filter by grade if `rule.grade`.
  - Filter by `teacherIds` if provided.
  - Count per teacher.
  - Push warning/critical if count is above max or below min and teacher has any schedule in scope.
- Double lesson:
  - Match schedules by grade, subject, day, and class scope.
  - For each matching class number, sort periods.
  - Find adjacent pairs.
  - Push if adjacent pair count is less than `requiredAdjacentCount - 1`.
- Forbidden slot:
  - Match schedule slots by `sameSlot`.
  - Match scope `teacher`, `class`, `subject`, or `teachingClass`.
  - Push one diagnostic per violating schedule.
- Sync lesson:
  - Match schedules by grade, subject, classNumbers, or teachingClassIds.
  - Compare all matched schedule slot keys.
  - Push one diagnostic if more than one slot key exists.

- [ ] **Step 4: Build and run logic tests**

Run:

```bash
npx esbuild components/course-scheduler/courseSchedulerPreferences.ts --bundle --platform=node --format=esm --outfile=dist-test/courseSchedulerPreferences.mjs
node tests/course-scheduler-preferences-logic.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add components/course-scheduler/courseSchedulerPreferences.ts tests/course-scheduler-preferences-logic.test.mjs
git commit -m "feat: diagnose scheduler preference rules"
```

---

### Task 3: App Diagnostics State And JSON Integration

**Files:**
- Modify: `components/course-scheduler/CourseSchedulerApp.tsx`
- Test: `tests/course-scheduler-preferences-data.test.mjs`

- [ ] **Step 1: Extend failing static test for app diagnostics**

Append to `tests/course-scheduler-preferences-data.test.mjs`:

```js
runTest('app keeps preference diagnostics separate from hard conflicts', () => {
  assert.match(appSource, /preferenceDiagnostics/);
  assert.match(appSource, /detectPreferenceDiagnostics/);
  assert.match(appSource, /preferenceCriticalDiagnostics/);
  assert.match(appSource, /preferenceWarningDiagnostics/);
  assert.match(appSource, /偏好诊断/);
  assert.doesNotMatch(appSource, /排课冲突.*preferenceWarningDiagnostics/);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node tests/course-scheduler-preferences-data.test.mjs
```

Expected: FAIL because app diagnostics state is not wired.

- [ ] **Step 3: Import diagnostics and wire state**

In `CourseSchedulerApp.tsx`, import:

```ts
detectPreferenceDiagnostics
```

Add state:

```ts
const [preferenceDiagnostics, setPreferenceDiagnostics] = useState<PreferenceDiagnostic[]>([]);
```

Add `PreferenceDiagnostic` to the type import.

Create helper:

```ts
const updatePreferenceDiagnostics = (
  currentSchedules: ScheduleItem[],
  currentTeachers: Teacher[],
  currentClasses: TeachingClass[],
  currentPreferences: SchedulingPreferences
) => {
  setPreferenceDiagnostics(detectPreferenceDiagnostics(
    currentSchedules,
    currentTeachers,
    currentClasses,
    currentPreferences
  ));
};
```

Call it after initial load, reset, JSON import, teacher/class updates, and substitute updates wherever `updateConflicts` is already called.

Add derived counts:

```ts
const preferenceCriticalDiagnostics = preferenceDiagnostics.filter(item => item.severity === 'critical');
const preferenceWarningDiagnostics = preferenceDiagnostics.filter(item => item.severity === 'warning');
```

- [ ] **Step 4: Run data test**

Run:

```bash
node tests/course-scheduler-preferences-data.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add components/course-scheduler/CourseSchedulerApp.tsx tests/course-scheduler-preferences-data.test.mjs
git commit -m "feat: wire scheduler preference diagnostics"
```

---

### Task 4: Preference Settings UI

**Files:**
- Modify: `components/course-scheduler/CourseSchedulerApp.tsx`
- Modify: `components/course-scheduler/CourseSchedulerStyles.css`
- Test: `tests/course-scheduler-preferences-ui.test.mjs`

- [ ] **Step 1: Write failing UI structure test**

Create `tests/course-scheduler-preferences-ui.test.mjs`:

```js
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

runTest('management view exposes scheduler preference settings tab', () => {
  assert.match(appSource, /'preferences'/);
  assert.match(appSource, /排课偏好设置/);
  assert.match(appSource, /renderPreferenceSettingsPanel/);
  assert.match(appSource, /教师重点节次均衡/);
  assert.match(appSource, /连堂偏好/);
  assert.match(appSource, /禁排时段/);
  assert.match(appSource, /同步上课/);
});

runTest('preference settings use dense glass operational panels', () => {
  assert.match(stylesSource, /\.preference-settings-grid/);
  assert.match(stylesSource, /\.preference-rule-panel/);
  assert.match(stylesSource, /\.preference-period-chip/);
  assert.match(stylesSource, /\.preference-diagnostics-list/);
  assert.match(stylesSource, /backdrop-filter:\s*blur\(18px\)/);
});
```

- [ ] **Step 2: Run UI test and verify it fails**

Run:

```bash
node tests/course-scheduler-preferences-ui.test.mjs
```

Expected: FAIL because the tab and styles do not exist yet.

- [ ] **Step 3: Add preferences sub-tab**

Change the management tab state:

```ts
const [mgmtSubTab, setMgmtSubTab] = useState<'teachers' | 'assignments' | 'students' | 'preferences'>('teachers');
```

Add a fourth tab button:

```tsx
<button
  onClick={() => setMgmtSubTab('preferences')}
  className={`h-9 px-3 rounded-lg font-bold text-sm border transition-colors ${mgmtSubTab === 'preferences' ? 'bg-sky-600 text-white border-sky-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'}`}
>
  排课偏好设置 ({preferenceDiagnostics.length} 条)
</button>
```

- [ ] **Step 4: Add renderPreferenceSettingsPanel**

Add a function before `return`:

```tsx
const renderPreferenceSettingsPanel = () => (
  <div className="preference-settings-grid">
    <section className="preference-rule-panel">
      <div className="preference-rule-panel-head">
        <span>教师重点节次均衡</span>
        <strong>{schedulingPreferences.teacherPeriodBalance.length} 条规则</strong>
      </div>
      <p>避免同一老师反复排在第一、第四、第五、第八节；默认每周 1-2 次为可接受范围。</p>
      <div className="preference-period-chip-row">
        {[1, 4, 5, 8].map(period => <span key={period} className="preference-period-chip">第{period}节</span>)}
      </div>
    </section>

    <section className="preference-rule-panel">
      <div className="preference-rule-panel-head">
        <span>连堂偏好</span>
        <strong>{schedulingPreferences.doubleLessonRules.length} 条规则</strong>
      </div>
      <p>用于设置某年级某学科在指定星期尽量连续两节，例如周三语文连堂。</p>
    </section>

    <section className="preference-rule-panel">
      <div className="preference-rule-panel-head">
        <span>禁排时段</span>
        <strong>{schedulingPreferences.forbiddenSlotRules.length} 条规则</strong>
      </div>
      <p>用于限制某老师、某班、某学科或某教学班不能出现在指定星期和节次。</p>
    </section>

    <section className="preference-rule-panel">
      <div className="preference-rule-panel-head">
        <span>同步上课</span>
        <strong>{schedulingPreferences.syncLessonRules.length} 条规则</strong>
      </div>
      <p>用于走班选课场景，要求多个班级或教学班必须安排在同一时段。</p>
    </section>

    <section className="preference-rule-panel preference-rule-panel--wide">
      <div className="preference-rule-panel-head">
        <span>偏好诊断</span>
        <strong>{preferenceCriticalDiagnostics.length} 条严重 / {preferenceWarningDiagnostics.length} 条提醒</strong>
      </div>
      <div className="preference-diagnostics-list">
        {preferenceDiagnostics.length > 0 ? preferenceDiagnostics.slice(0, 8).map(item => (
          <div key={item.id} className={`preference-diagnostic-item preference-diagnostic-item--${item.severity}`}>
            <span>{item.ruleName}</span>
            <p>{item.message}</p>
          </div>
        )) : (
          <div className="preference-diagnostic-empty">当前排课偏好诊断无异常</div>
        )}
      </div>
    </section>
  </div>
);
```

Render it in the management content area:

```tsx
{mgmtSubTab === 'preferences' && renderPreferenceSettingsPanel()}
```

- [ ] **Step 5: Add dense glass styles**

Append to `CourseSchedulerStyles.css`:

```css
.preference-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.preference-rule-panel {
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(18px) saturate(1.18);
  -webkit-backdrop-filter: blur(18px) saturate(1.18);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.58);
  padding: 0.9rem;
}

.preference-rule-panel--wide {
  grid-column: 1 / -1;
}

.preference-rule-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.45rem;
}

.preference-rule-panel-head span {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 950;
}

.preference-rule-panel-head strong {
  color: #0369a1;
  font-size: 0.68rem;
  font-weight: 900;
}

.preference-rule-panel p {
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.45;
}

.preference-period-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.7rem;
}

.preference-period-chip {
  border: 1px solid rgba(14, 165, 233, 0.24);
  border-radius: 9999px;
  background: rgba(240, 249, 255, 0.72);
  color: #075985;
  font-size: 0.68rem;
  font-weight: 900;
  padding: 0.28rem 0.55rem;
}

.preference-diagnostics-list {
  display: grid;
  gap: 0.45rem;
}

.preference-diagnostic-item {
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.6);
  padding: 0.65rem;
}

.preference-diagnostic-item span {
  display: block;
  color: #0f172a;
  font-size: 0.74rem;
  font-weight: 950;
}

.preference-diagnostic-item p {
  margin-top: 0.2rem;
  font-size: 0.7rem;
}

.preference-diagnostic-item--critical {
  border-color: rgba(244, 63, 94, 0.26);
  background: rgba(255, 241, 242, 0.62);
}

.preference-diagnostic-item--warning {
  border-color: rgba(245, 158, 11, 0.26);
  background: rgba(255, 251, 235, 0.62);
}

.preference-diagnostic-empty {
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 850;
  padding: 1rem;
  text-align: center;
}
```

- [ ] **Step 6: Run UI and layout tests**

Run:

```bash
node tests/course-scheduler-preferences-ui.test.mjs
node tests/course-scheduler-management-layout.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add components/course-scheduler/CourseSchedulerApp.tsx components/course-scheduler/CourseSchedulerStyles.css tests/course-scheduler-preferences-ui.test.mjs
git commit -m "feat: add scheduler preference settings panel"
```

---

### Task 5: Verification And Push

**Files:**
- No new code files unless verification exposes an issue.

- [ ] **Step 1: Run focused scheduler tests**

Run:

```bash
node tests/course-scheduler-preferences-data.test.mjs
node tests/course-scheduler-preferences-logic.test.mjs
node tests/course-scheduler-preferences-ui.test.mjs
node tests/course-scheduler-diagnostics-logic.test.mjs
node tests/course-scheduler-diagnostics-ui.test.mjs
node tests/course-scheduler-substitute-dialog.test.mjs
node tests/course-scheduler-remarks-summary.test.mjs
node tests/course-scheduler-sticky-headers.test.mjs
node tests/course-scheduler-management-layout.test.mjs
node tests/course-scheduler-class-view.test.mjs
```

Expected: all PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build exits 0. Existing chunk-size and browserslist warnings are acceptable.

- [ ] **Step 3: Browser smoke test**

Open `http://127.0.0.1:5176/course-scheduler` with the in-app browser.

Verify:

- Management tab shows `排课偏好设置`.
- Preference tab shows four rule panels and diagnostics.
- JSON export contains `schedulingPreferences`.
- Existing time view and class inspection view still load.
- Clicking a schedule cell still opens the custom substitute dialog.

- [ ] **Step 4: Final commit if verification changed files**

If any verification fixes were needed:

```bash
git add <changed files>
git commit -m "fix: stabilize scheduler preference phase one"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```

If rejected due to remote updates:

```bash
git fetch origin main
git rebase origin/main --autostash
git push origin main
```

Expected: push succeeds.

---

## Self-Review

- Spec coverage: data model, JSON persistence, diagnostics, UI, tests, and optimizer boundary all have implementation tasks.
- Phase boundary: full automatic optimizer is explicitly not implemented in this plan.
- Type consistency: plan uses `SchedulingPreferences`, `PreferenceDiagnostic`, `detectPreferenceDiagnostics`, `normalizeSchedulingPreferences`, and `createDefaultSchedulingPreferences` consistently across tasks.
- Existing behavior: substitute logging, class view, and conflict wording remain covered by regression tests.

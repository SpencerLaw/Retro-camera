# Course Scheduler Preferences Design

## Goal

Add a configurable scheduling-preferences layer to the course scheduler so school users can enter constraints and preferences before checking or optimizing a timetable. The feature must keep the current timetable views and JSON workflow intact, while making customer rules explicit, saved locally, diagnosable, and eventually usable by an optimizer.

The first implementation phase should focus on configuration, persistence, and diagnostics. Automatic rearrangement should come after the rules are visible and testable.

## Current Context

The scheduler already has local data for teachers, classrooms, teaching classes, students, and schedules. Data is loaded from `course_scheduler_real_data` in `localStorage` when available, can be imported/exported as JSON, and is diagnosed by `detectConflicts`.

Existing schedule views are projections of the same `schedules` state:

- Time view: grouped by day and period.
- Class inspection view: grouped by day, period, and class number.

The new preference layer must use the same source of truth and must be exported/imported with the rest of the JSON backup.

## Product Requirements

Users need to configure these rules while entering or reviewing base data:

- Teacher period balance: avoid the same teacher repeatedly getting first, fourth, fifth, and eighth period. Each teacher having these periods one to two times per week is acceptable.
- Double-lesson rules: for example, Wednesday Chinese should be arranged as two adjacent Chinese lessons for each class.
- Forbidden slots: a subject, class, or teacher can be blocked from specific days and periods.
- Synchronous lessons: selected classes or teaching groups must happen at the same time, especially for elective-class scheduling.
- Compact week review: Monday through Friday should be easy to inspect together or in a dense mode.

The examples above are defaults or templates, not hardcoded business rules.

## Data Model

Add an optional top-level `schedulingPreferences` object to the locally stored and exported JSON.

```ts
interface SchedulingPreferences {
  version: 1;
  teacherPeriodBalance: TeacherPeriodBalanceRule[];
  doubleLessonRules: DoubleLessonRule[];
  forbiddenSlotRules: ForbiddenSlotRule[];
  syncLessonRules: SyncLessonRule[];
}

interface TeacherPeriodBalanceRule {
  id: string;
  name: string;
  enabled: boolean;
  grade?: string;
  teacherIds?: string[];
  watchedPeriods: number[];
  minPerTeacherPerWeek?: number;
  maxPerTeacherPerWeek?: number;
  severity: 'warning' | 'critical';
}

interface DoubleLessonRule {
  id: string;
  name: string;
  enabled: boolean;
  grade: string;
  subject: string;
  day?: number;
  classNumbers: number[] | 'all';
  requiredAdjacentCount: number;
  allowedPairs?: Array<[number, number]>;
  severity: 'warning' | 'critical';
}

interface ForbiddenSlotRule {
  id: string;
  name: string;
  enabled: boolean;
  scope: 'teacher' | 'class' | 'subject' | 'teachingClass';
  targetIds?: string[];
  grade?: string;
  classNumbers?: number[];
  subject?: string;
  slots: Array<{ day: number; period: number }>;
  severity: 'warning' | 'critical';
}

interface SyncLessonRule {
  id: string;
  name: string;
  enabled: boolean;
  grade: string;
  subject?: string;
  teachingClassIds?: string[];
  classNumbers?: number[];
  requiredSameSlot: boolean;
  severity: 'warning' | 'critical';
}
```

Missing `schedulingPreferences` should fall back to a default empty preference set plus optional school-friendly templates.

## Rule Semantics

Hard constraints are violations that should be treated like real scheduling conflicts:

- Teacher, classroom, or student overlap.
- Forbidden slot rules marked as critical.
- Synchronous lesson rules marked as critical.

Soft constraints are diagnostic warnings and optimization goals:

- Teacher period balance.
- Double lesson preference when marked as warning.
- Forbidden slot rules marked as warning.
- Sync rules marked as warning.

This distinction is important because the UI should not label every warning as a hard conflict.

## Diagnostics

Create a dedicated preference diagnostics pass that can run alongside existing conflict detection.

Expected diagnostic outputs:

- Teacher period balance: count watched periods per teacher and report teachers above max or below min.
- Double lesson: for each matched class, verify the required subject appears in adjacent periods on the configured day.
- Forbidden slots: report any schedule item placed in a forbidden slot.
- Synchronous lessons: report matched lessons that are not placed at the same day and period.

Each diagnostic item should include:

- Rule id and rule name.
- Severity.
- Human-readable message.
- Affected day and period.
- Involved schedule ids.
- Suggested next action where possible.

Diagnostics should be shown separately from hard conflict counts, but available in the same diagnostics dialog or a new preference diagnostics section.

## UI

Add a new sub-tab under "学校教学分工与基础数据": `排课偏好设置`.

The tab should be dense and operational rather than decorative:

- Teacher balance panel: watched period selector, grade/teacher scope, min/max weekly count.
- Double lesson panel: grade, subject, weekday, class scope, allowed adjacent pairs.
- Forbidden slots panel: scope selector, target selector, weekday/period grid.
- Sync lesson panel: class or teaching-class selector, subject selector, required same-slot toggle.
- Diagnostics summary: current rule pass/fail counts and a button to inspect details.

The compact week review should remain available from the main board area, not buried inside settings. The existing class inspection view can be extended with a denser Monday-Friday review mode if needed.

## Data Flow

1. Load JSON/localStorage.
2. Normalize missing `schedulingPreferences`.
3. Keep preferences in React state beside teachers, classrooms, teaching classes, students, and schedules.
4. Persist preferences into `course_scheduler_real_data`.
5. Export/import preferences with JSON backup.
6. Re-run preference diagnostics whenever schedules or preferences change.

Manual schedule edits and substitute changes should keep using the same `schedules` array. Preference diagnostics should immediately reflect those changes.

## Optimizer Boundary

Do not attempt a full automatic optimizer in the first implementation phase.

The first phase should ship:

- Data model.
- JSON compatibility.
- Preference settings UI.
- Diagnostics.
- Tests for all rule types.

The second phase can add automatic rearrangement:

- Find violating items.
- Search safe swaps.
- Reject swaps that create teacher, classroom, class, student, or critical preference conflicts.
- Record changes in schedule adjustment history.
- Show before/after diagnostics.

## Testing

Add focused tests before implementation:

- Type/data tests for `SchedulingPreferences` and JSON persistence.
- UI structure tests for the new `排课偏好设置` tab.
- Diagnostic logic tests for teacher period balance.
- Diagnostic logic tests for double lessons.
- Diagnostic logic tests for forbidden slots.
- Diagnostic logic tests for synchronous lessons.
- Regression tests to ensure existing hard conflict wording remains separate from warning text.
- Regression tests to ensure existing time view and class inspection view still use the same schedule data.

## Non-Goals For Phase 1

- No full constraint solver.
- No destructive automatic schedule rewrite.
- No hardcoded "Chinese must be Wednesday" rule.
- No hidden preference data outside JSON/localStorage.
- No change to existing substitute logging behavior except diagnostics reflecting the updated schedule.

## Implementation Defaults

Use these defaults unless the user changes them in the UI:

- Create a default enabled teacher-balance rule for watched periods `[1, 4, 5, 8]`, scoped to all teachers in the current data set.
- Treat teacher-balance and double-lesson rules as warnings by default.
- Treat forbidden slot rules and synchronous lesson rules as critical by default.
- Apply "one to two watched periods per teacher per week" to the current filtered grade when a grade is selected, and to all teachers when no grade scope is selected.
- Allow synchronous lessons to target administrative class numbers or teaching-class ids. The rule should store whichever target type the user selected.

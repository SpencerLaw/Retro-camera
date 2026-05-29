import { Teacher, Classroom, TeachingClass, Student, ScheduleItem, Conflict, SubstituteRecommendation } from './types';

export const detectConflicts = (
  currentSchedules: ScheduleItem[], 
  currentTeachers: Teacher[], 
  currentClassrooms: Classroom[], 
  currentClasses: TeachingClass[],
  students: Student[],
  configSettings: any
): Conflict[] => {
  const conflicts: Conflict[] = [];
  let conflictCounter = 0;

  // Let's index items by Day & Period to find collisions
  const slotMap: { [slotKey: string]: ScheduleItem[] } = {};
  for (const item of currentSchedules) {
    if (item.isFinished) continue; // ignore early finished classes
    const key = `${item.day}-${item.period}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(item);
  }

  for (const [key, items] of Object.entries(slotMap)) {
    const [dayStr, periodStr] = key.split('-');
    const day = parseInt(dayStr);
    const period = parseInt(periodStr);

    // 1. Teacher Conflicts: Same teacher cannot have multiple lessons at the same time
    const teacherMap: { [teacherId: string]: ScheduleItem[] } = {};
    for (const item of items) {
      if (!teacherMap[item.teacherId]) teacherMap[item.teacherId] = [];
      teacherMap[item.teacherId].push(item);
    }
    for (const [teacherId, colliding] of Object.entries(teacherMap)) {
      if (colliding.length > 1) {
        const teacher = currentTeachers.find(t => t.id === teacherId);
        const name = teacher ? teacher.name : "未知教师";
        conflicts.push({
          id: `conflict_${conflictCounter++}`,
          type: 'teacher',
          severity: 'critical',
          message: `教师冲突: ${name} 分配了多个走班教学班（${colliding.map(c => c.teachingClassName).join(' 和 ')}）`,
          targetId: teacherId,
          affectedSlots: [{ day, period }],
          involvedScheduleIds: colliding.map(c => c.id)
        });
      }
    }

    // 2. Classroom Conflicts: Same classroom cannot host multiple lessons at the same time
    const classroomMap: { [classroomId: string]: ScheduleItem[] } = {};
    for (const item of items) {
      if (!classroomMap[item.classroomId]) classroomMap[item.classroomId] = [];
      classroomMap[item.classroomId].push(item);
    }
    for (const [classroomId, colliding] of Object.entries(classroomMap)) {
      if (colliding.length > 1) {
        const classroom = currentClassrooms.find(r => r.id === classroomId);
        const name = classroom ? classroom.name : "未知教室";
        conflicts.push({
          id: `conflict_${conflictCounter++}`,
          type: 'classroom',
          severity: 'critical',
          message: `校舍占用冲突: 教室 ${name} 同时承载了多个课程（${colliding.map(c => c.teachingClassName).join(' 和 ')}）`,
          targetId: classroomId,
          affectedSlots: [{ day, period }],
          involvedScheduleIds: colliding.map(c => c.id)
        });
      }
    }

    // 3. Student Roster Conflicts: Same student cannot be in multiple classes at the same time
    const studentSchedules = new Map<string, ScheduleItem[]>(); // studentId -> ScheduleItem[]
    for (const s of students) {
      for (const item of items) {
        if (s.classes.includes(item.teachingClassId)) {
          if (!studentSchedules.has(s.id)) studentSchedules.set(s.id, []);
          studentSchedules.get(s.id)!.push(item);
        }
      }
    }

    for (const [studentId, studentItems] of studentSchedules.entries()) {
      if (studentItems.length > 1) {
        const student = students.find(s => s.id === studentId);
        const name = student ? student.name : "未知学生";
        conflicts.push({
          id: `conflict_${conflictCounter++}`,
          type: 'student',
          severity: 'critical',
          message: `走班选科冲突: 学生 ${name} (${student?.electiveCombo}) 的教学班（${studentItems.map(c => c.teachingClassName).join(' 和 ')}）排在同一时段，导致学生分身乏术。`,
          targetId: studentId,
          affectedSlots: [{ day, period }],
          involvedScheduleIds: studentItems.map(c => c.id)
        });
      }
    }
  }

  // 4. Teacher Preferences
  if (!configSettings.allowTeacherPrefRelaxation) {
    for (const item of currentSchedules) {
      if (item.isFinished) continue;
      const teacher = currentTeachers.find(t => t.id === item.teacherId);
      if (teacher) {
        const isUnavailable = teacher.unavailablePeriods.some(p => p.day === item.day && p.period === item.period);
        if (isUnavailable) {
          conflicts.push({
            id: `conflict_${conflictCounter++}`,
            type: 'constraint',
            severity: 'warning',
            message: `教师偏好软约束：${teacher.name} 老师在周${item.day}第${item.period}节被手动排了课（${item.teachingClassName}），这属于该教师偏好的不可排时段限制。`,
            targetId: teacher.id,
            affectedSlots: [{ day: item.day, period: item.period }],
            involvedScheduleIds: [item.id]
          });
        }
      }
    }
  }

  // 5. Classroom resource overload
  if (!configSettings.allowClassroomLoadRelaxation) {
    for (const room of currentClassrooms) {
      if (room.type === 'lab' || room.type === 'media') {
        const lessonsCount = currentSchedules.filter(s => s.classroomId === room.id && !s.isFinished).length;
        if (lessonsCount > 10) {
          conflicts.push({
            id: `conflict_${conflictCounter++}`,
            type: 'constraint',
            severity: 'warning',
            message: `高端实验室负载弹性警告：${room.name} 本周被安排了开设走班课程 ${lessonsCount} 节，使用频次较高，建议错峰排放以减少损耗。`,
            targetId: room.id,
            affectedSlots: [],
            involvedScheduleIds: []
          });
        }
      }
    }
  }

  return conflicts;
};

export const getSubstituteRecommendations = (
  scheduleItemId: string,
  schedules: ScheduleItem[],
  teachers: Teacher[]
): SubstituteRecommendation[] => {
  const targetItem = schedules.find(s => s.id === scheduleItemId);

  if (!targetItem) {
    return [];
  }

  const day = targetItem.day;
  const period = targetItem.period;

  const recommendations: SubstituteRecommendation[] = [];

  for (const t of teachers) {
    if (t.id === targetItem.teacherId) continue; 

    const hasConflict = schedules.some(s => s.teacherId === t.id && s.day === day && s.period === period && !s.isFinished);
    const currentWeeklyLoad = schedules.filter(s => s.teacherId === t.id && !s.isFinished).length;

    let score = 50; 
    const reasons: string[] = [];

    const isSameSubject = t.subjects.includes(targetItem.subject);
    if (isSameSubject) {
      score += 35;
      reasons.push(`同科目教师 (教授 ${targetItem.subject})`);
    } else {
      reasons.push(`不同科目教师 (教授 ${t.subjects.join('/')})`);
    }

    const capacityRemaining = t.maxWeeklyHours - currentWeeklyLoad;
    if (capacityRemaining > 4) {
      score += 15;
      reasons.push(`教学周课时充沛 (当前已排 ${currentWeeklyLoad}/${t.maxWeeklyHours} 节)`);
    } else if (capacityRemaining <= 0) {
      score -= 20;
      reasons.push(`已达到最大周课时负荷 (当前已排 ${currentWeeklyLoad}/${t.maxWeeklyHours} 节)`);
    } else {
      score += 5;
      reasons.push(`课时富余较小 (当前已排 ${currentWeeklyLoad}/${t.maxWeeklyHours} 节)`);
    }

    const isSlotInUnavailable = t.unavailablePeriods.some(p => p.day === day && p.period === period);
    if (isSlotInUnavailable) {
      score -= 30;
      reasons.push(`时段冲突: 被标记为教师偏好不可排时段`);
    }

    if (hasConflict) {
      score = 0; 
      reasons.push(`严重冲突: 教师在同一时段有其他课时`);
    }

    score = Math.max(0, Math.min(100, score));

    recommendations.push({
      teacher: t,
      suitabilityScore: score,
      reasons,
      hasConflictOnChosenSlot: hasConflict,
      currentWeeklyLoad
    });
  }

  recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return recommendations.slice(0, 5); 
};
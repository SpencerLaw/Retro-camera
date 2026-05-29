import { Teacher, Classroom, TeachingClass, Student, ScheduleItem, Conflict, SubstituteRecommendation } from './types';

interface DiagnosticsConfig {
  hardStudentConflict?: boolean;
  hardTeacherConflict?: boolean;
  hardClassroomConflict?: boolean;
  allowTeacherPrefRelaxation?: boolean;
  allowClassroomLoadRelaxation?: boolean;
  allowTeacherLoadRelaxation?: boolean;
  allowSchedulePeriodMismatch?: boolean;
  allowStudentRosterRelaxation?: boolean;
  allowDataIntegrityRelaxation?: boolean;
}

const gradePattern = /^(初一|初二|初三|高一|高二|高三)/;

export const detectConflicts = (
  currentSchedules: ScheduleItem[], 
  currentTeachers: Teacher[], 
  currentClassrooms: Classroom[], 
  currentClasses: TeachingClass[],
  students: Student[],
  configSettings: DiagnosticsConfig = {}
): Conflict[] => {
  const conflicts: Conflict[] = [];
  let conflictCounter = 0;
  const activeSchedules = currentSchedules.filter(item => !item.isFinished);
  const teachersById = new Map(currentTeachers.map(t => [t.id, t]));
  const classroomsById = new Map(currentClassrooms.map(r => [r.id, r]));
  const classesById = new Map(currentClasses.map(c => [c.id, c]));

  const pushConflict = (conflict: Omit<Conflict, 'id'>) => {
    conflicts.push({
      id: `conflict_${conflictCounter++}`,
      ...conflict
    });
  };

  // 0. Data integrity checks: broken references make later diagnostics unreliable.
  if (!configSettings.allowDataIntegrityRelaxation) {
    for (const item of activeSchedules) {
      const teacher = teachersById.get(item.teacherId);
      const classroom = classroomsById.get(item.classroomId);
      const teachingClass = classesById.get(item.teachingClassId);

      if (!teacher) {
        pushConflict({
          type: 'constraint',
          severity: 'critical',
          message: `数据完整性错误：课表项 ${item.teachingClassName} 引用了不存在的教师ID ${item.teacherId}。`,
          targetId: item.teacherId,
          affectedSlots: [{ day: item.day, period: item.period }],
          involvedScheduleIds: [item.id]
        });
      }

      if (!classroom) {
        pushConflict({
          type: 'constraint',
          severity: 'critical',
          message: `数据完整性错误：课表项 ${item.teachingClassName} 引用了不存在的教室ID ${item.classroomId}。`,
          targetId: item.classroomId,
          affectedSlots: [{ day: item.day, period: item.period }],
          involvedScheduleIds: [item.id]
        });
      }

      if (!teachingClass) {
        pushConflict({
          type: 'constraint',
          severity: 'critical',
          message: `数据完整性错误：课表项 ${item.teachingClassName} 引用了不存在的教学班ID ${item.teachingClassId}。`,
          targetId: item.teachingClassId,
          affectedSlots: [{ day: item.day, period: item.period }],
          involvedScheduleIds: [item.id]
        });
      } else {
        if (teachingClass.subject !== item.subject) {
          pushConflict({
            type: 'constraint',
            severity: 'warning',
            message: `数据口径提醒：${item.teachingClassName} 的课表学科为 ${item.subject}，但教学分工表记录为 ${teachingClass.subject}。`,
            targetId: teachingClass.id,
            affectedSlots: [{ day: item.day, period: item.period }],
            involvedScheduleIds: [item.id]
          });
        }

        if (!item.isTemp && teachingClass.teacherId !== item.teacherId) {
          const expectedTeacher = teachersById.get(teachingClass.teacherId);
          pushConflict({
            type: 'constraint',
            severity: 'warning',
            message: `数据口径提醒：${item.teachingClassName} 当前课表教师为 ${item.teacherName}，但教学分工表记录为 ${expectedTeacher?.name || teachingClass.teacherId}。`,
            targetId: teachingClass.id,
            affectedSlots: [{ day: item.day, period: item.period }],
            involvedScheduleIds: [item.id]
          });
        }

        if (classroom && teachingClass.studentCount > classroom.capacity) {
          pushConflict({
            type: 'constraint',
            severity: 'warning',
            message: `教室容量提醒：${item.teachingClassName} 学生数 ${teachingClass.studentCount} 人，超过 ${classroom.name} 容量 ${classroom.capacity} 人。`,
            targetId: classroom.id,
            affectedSlots: [{ day: item.day, period: item.period }],
            involvedScheduleIds: [item.id]
          });
        }
      }
    }
  }

  // Let's index items by Day & Period to find collisions
  const slotMap: { [slotKey: string]: ScheduleItem[] } = {};
  for (const item of activeSchedules) {
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
        const teacher = teachersById.get(teacherId);
        const name = teacher ? teacher.name : "未知教师";
        pushConflict({
          type: 'teacher',
          severity: configSettings.hardTeacherConflict === false ? 'warning' : 'critical',
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
        const classroom = classroomsById.get(classroomId);
        const name = classroom ? classroom.name : "未知教室";
        
        // 体育场/操场等户外大型活动空间可以同时容纳多个班级进行体育课，不属于校舍冲突
        if (classroomId === 'R_SPEC_1' || name.includes('体育场') || name.includes('操场')) {
          continue;
        }

        pushConflict({
          type: 'classroom',
          severity: configSettings.hardClassroomConflict === false ? 'warning' : 'critical',
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
        pushConflict({
          type: 'student',
          severity: configSettings.hardStudentConflict === false ? 'warning' : 'critical',
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
      const teacher = teachersById.get(item.teacherId);
      if (teacher) {
        const isUnavailable = teacher.unavailablePeriods.some(p => p.day === item.day && p.period === item.period);
        if (isUnavailable) {
          pushConflict({
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

  // 5. Teacher load constraints
  if (!configSettings.allowTeacherLoadRelaxation) {
    for (const teacher of currentTeachers) {
      const teacherSchedules = activeSchedules
        .filter(s => s.teacherId === teacher.id)
        .sort((a, b) => a.day - b.day || a.period - b.period);
      if (teacherSchedules.length === 0) continue;

      if (teacher.maxWeeklyHours > 0 && teacherSchedules.length > teacher.maxWeeklyHours) {
        pushConflict({
          type: 'constraint',
          severity: 'warning',
          message: `教师周课时负荷提醒：${teacher.name} 老师本周已排 ${teacherSchedules.length} 节，超过当前设置上限 ${teacher.maxWeeklyHours} 节。请确认上限是否为真实岗位值。`,
          targetId: teacher.id,
          affectedSlots: teacherSchedules.map(s => ({ day: s.day, period: s.period })),
          involvedScheduleIds: teacherSchedules.map(s => s.id)
        });
      }

      const byDay = new Map<number, ScheduleItem[]>();
      for (const item of teacherSchedules) {
        if (!byDay.has(item.day)) byDay.set(item.day, []);
        byDay.get(item.day)!.push(item);
      }

      for (const [day, dayItems] of byDay.entries()) {
        if (teacher.maxDailyHours > 0 && dayItems.length > teacher.maxDailyHours) {
          pushConflict({
            type: 'constraint',
            severity: 'warning',
            message: `教师日课时负荷提醒：${teacher.name} 老师周${day}已排 ${dayItems.length} 节，超过每日上限 ${teacher.maxDailyHours} 节。`,
            targetId: teacher.id,
            affectedSlots: dayItems.map(s => ({ day: s.day, period: s.period })),
            involvedScheduleIds: dayItems.map(s => s.id)
          });
        }

        if (teacher.maxConsecutiveLessons > 0) {
          const periods = [...new Set(dayItems.map(s => s.period))].sort((a, b) => a - b);
          let runStart = periods[0];
          let last = periods[0];
          for (let i = 1; i <= periods.length; i++) {
            const current = periods[i];
            if (current === last + 1) {
              last = current;
              continue;
            }

            const runLength = last - runStart + 1;
            if (runLength > teacher.maxConsecutiveLessons) {
              const runItems = dayItems.filter(s => s.period >= runStart && s.period <= last);
              pushConflict({
                type: 'constraint',
                severity: 'warning',
                message: `教师连堂提醒：${teacher.name} 老师周${day}连续排了 ${runLength} 节课，超过连堂上限 ${teacher.maxConsecutiveLessons} 节。`,
                targetId: teacher.id,
                affectedSlots: runItems.map(s => ({ day: s.day, period: s.period })),
                involvedScheduleIds: runItems.map(s => s.id)
              });
            }

            runStart = current;
            last = current;
          }
        }
      }
    }
  }

  // 6. Teaching class planned-period consistency
  if (!configSettings.allowSchedulePeriodMismatch) {
    const scheduleCountByClass = new Map<string, ScheduleItem[]>();
    const scheduledGrades = new Set<string>();
    for (const item of activeSchedules) {
      if (!scheduleCountByClass.has(item.teachingClassId)) scheduleCountByClass.set(item.teachingClassId, []);
      scheduleCountByClass.get(item.teachingClassId)!.push(item);
      const gradeMatch = item.teachingClassName.match(gradePattern);
      if (gradeMatch) scheduledGrades.add(gradeMatch[1]);
    }

    for (const teachingClass of currentClasses) {
      const expectedPeriods = teachingClass.periods;
      if (typeof expectedPeriods !== 'number' || expectedPeriods < 0) continue;
      const classItems = scheduleCountByClass.get(teachingClass.id) || [];
      const shouldAuditClass = classItems.length > 0 || (teachingClass.grade && scheduledGrades.has(teachingClass.grade));
      if (!shouldAuditClass) continue;

      if (classItems.length !== expectedPeriods) {
        pushConflict({
          type: 'constraint',
          severity: 'warning',
          message: `教学班课时口径不一致：${teachingClass.name} 分工表为 ${expectedPeriods} 节，当前课表实际排入 ${classItems.length} 节。`,
          targetId: teachingClass.id,
          affectedSlots: classItems.map(s => ({ day: s.day, period: s.period })),
          involvedScheduleIds: classItems.map(s => s.id)
        });
      }
    }
  }

  // 7. Student roster readiness
  if (!configSettings.allowStudentRosterRelaxation && currentClasses.length > 0 && students.length === 0) {
    pushConflict({
      type: 'constraint',
      severity: 'warning',
      message: `学生走班花名册为空：当前无法验证学生是否被安排到同一时段的多个教学班，请导入或维护学生选科绑定数据。`,
      targetId: 'students',
      affectedSlots: [],
      involvedScheduleIds: []
    });
  }

  // 8. Classroom resource overload
  if (!configSettings.allowClassroomLoadRelaxation) {
    for (const room of currentClassrooms) {
      if (room.type === 'lab' || room.type === 'media') {
        const lessonsCount = activeSchedules.filter(s => s.classroomId === room.id).length;
        if (lessonsCount > 10) {
          pushConflict({
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
    const capacityRemaining = t.maxWeeklyHours - currentWeeklyLoad;
    const hasLoadConflict = t.maxWeeklyHours > 0 && capacityRemaining <= 0;
    const hasAvailabilityConflict = t.unavailablePeriods.some(p => p.day === day && p.period === period);

    let score = 50; 
    const reasons: string[] = [];

    const isSameSubject = t.subjects.includes(targetItem.subject);
    if (isSameSubject) {
      score += 35;
      reasons.push(`同科目教师 (教授 ${targetItem.subject})`);
    } else {
      reasons.push(`不同科目教师 (教授 ${t.subjects.join('/')})`);
    }

    if (capacityRemaining > 4) {
      score += 15;
      reasons.push(`教学周课时充沛 (当前已排 ${currentWeeklyLoad}/${t.maxWeeklyHours} 节)`);
    } else if (hasLoadConflict) {
      score = 0;
      reasons.push(`周课时上限冲突: 已达到最大周课时负荷 (当前已排 ${currentWeeklyLoad}/${t.maxWeeklyHours} 节)`);
    } else {
      score += 5;
      reasons.push(`课时富余较小 (当前已排 ${currentWeeklyLoad}/${t.maxWeeklyHours} 节)`);
    }

    if (hasAvailabilityConflict) {
      score = 0;
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
      hasLoadConflict,
      hasAvailabilityConflict,
      currentWeeklyLoad
    });
  }

  recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return recommendations.slice(0, 5); 
};

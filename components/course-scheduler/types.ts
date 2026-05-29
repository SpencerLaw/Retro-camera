export type Role = 'dean' | 'leader' | 'teacher' | 'student';

export interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  maxWeeklyHours: number;
  maxDailyHours: number;
  maxConsecutiveLessons: number;
  unavailablePeriods: { day: number; period: number }[]; // 1-indexed: Day 1..5, Period 1..8
  preferences: string;
  phone: string;
  email: string;
  department: string;
}

export interface Classroom {
  id: string;
  name: string;
  type: 'ordinary' | 'lab' | 'media' | 'art';
  capacity: number;
  assignedSubjects: string[];
}

export interface TeachingClass {
  id: string;
  name: string; // e.g., "高二物理选考1班"
  subject: string; // e.g., "物理"
  teacherId: string;
  classroomId: string;
  studentCount: number;
  combination: string; // Elective combination tag e.g., "物化生", "物化地"
  classNumber?: number;
  grade?: string;
  periods?: number;
}

export interface Student {
  id: string;
  name: string;
  electiveCombo: string; // e.g., "物化生" (Physics/Chemistry/Biology)
  classes: string[]; // Teaching class IDs this student belongs to
}

export interface TimeSlot {
  day: number; // 1 = Monday to 5 = Friday
  period: number; // 1 to 8 (1-4 Morning, 5-8 Afternoon, can also display Special slots like Morning Reading, Self Study)
}

export interface ScheduleItem {
  id: string;
  teachingClassId: string;
  teachingClassName: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  classroomId: string;
  classroomName: string;
  day: number;
  period: number;
  isTemp?: boolean; // temporary change/swap
  isFinished?: boolean; // e.g., General Technology test finished, early completion
  finishedWeek?: number; // finished after which week
}

export interface Conflict {
  id: string;
  type: 'teacher' | 'classroom' | 'student' | 'constraint';
  severity: 'critical' | 'warning';
  message: string;
  targetId: string; // Teacher ID, Classroom ID, or Teaching Class ID
  affectedSlots: TimeSlot[];
  involvedScheduleIds: string[];
}

export interface TimetableShift {
  id: string;
  subject: string;
  effectiveWeekStart: number;
  reason: string;
}

export interface SubstituteRecommendation {
  teacher: Teacher;
  suitabilityScore: number; // 0-100 rating based on load, overlap, subject matching
  reasons: string[];
  hasConflictOnChosenSlot: boolean;
  hasLoadConflict?: boolean;
  hasAvailabilityConflict?: boolean;
  currentWeeklyLoad: number;
}

export interface ScheduleHistory {
  id: string;
  name: string;
  timestamp: string;
  itemCount: number;
  description: string;
}


export enum TaskCategory {
  STUDY = '自主学习',
  MORNING = '晨间习惯',
  EVENING = '晚间习惯',
  SPORTS = '运动健康',
  DISCIPLINE = '自律管理',
  CHORES = '劳动技能',
  HYGIENE = '个人卫生',
  CREATIVITY = '创意艺术',
  OTHER = '自定义'
}

export type UserRole = 'child' | 'parent';
export type PlanningView = 'today' | 'week' | 'future';

export interface Task {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  timeSlot: string;
  points: number;
  completed: boolean;
  isRequired: boolean;
  date: string;
}

export interface DailySchedule {
  date: string;
  tasks: Task[];
}

export interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  icon: string;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  roomCode: string;
  schedules: DailySchedule[];
  isFocusing?: boolean;
  currentTaskName?: string;
}

export type AppTab = 'home' | 'plan' | 'rewards' | 'me';

export interface AppState {
  children: Child[];
  selectedChildId: string;
  rewards: Reward[];
  role: UserRole;
}

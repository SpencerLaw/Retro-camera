
export enum TaskCategory {
  STUDY = '自主学习',
  DISCIPLINE = '自律习惯',
  CHORES = '家务探索',
  HYGIENE = '个人卫生',
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
}

export type AppTab = 'home' | 'plan' | 'rewards' | 'me';

export interface AppState {
  children: Child[];
  selectedChildId: string;
  rewards: Reward[];
  role: UserRole;
}

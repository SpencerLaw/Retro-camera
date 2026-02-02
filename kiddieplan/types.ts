
export enum TaskCategory {
  LEARNING = '学习自主',
  LIFESTYLE = '生活自律',
  HEALTH = '儿童保健',
  OTHER = '其他'
}

export type UserRole = 'child' | 'parent';
export type PlanningView = 'today' | 'week' | 'future';

export interface Task {
  id: string;
  title: string;
  timeSlot: string;
  period: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
  points: number;
  completed: boolean;
  category: TaskCategory;
  date?: string; // 用于非今日任务
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
  schedules: DailySchedule[];
}

export type AppTab = 'home' | 'plan' | 'rewards' | 'me';

export interface AppState {
  children: Child[];
  selectedChildId: string;
  rewards: Reward[];
  role: UserRole;
}

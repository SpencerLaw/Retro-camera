
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
  schedules: DailySchedule[];
}

export type AppTab = 'home' | 'plan' | 'rewards' | 'me';

export interface AppState {
  children: Child[];
  selectedChildId: string;
  rewards: Reward[];
  role: UserRole;
}

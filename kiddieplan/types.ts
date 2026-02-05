
// 动态分类接口
export interface Category {
  id: string;
  name: string;
  icon: string;
}

// 保持 TaskCategory 类型兼容性（逐步迁移）
export type TaskCategory = string; // 现在是动态 ID

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
  category?: string;
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

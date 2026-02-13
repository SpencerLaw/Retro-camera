
export interface CategoryTemplate {
  title: string;
  points: number;
  timeSlot: string;
  icon: string;
}

// 动态分类接口
export interface Category {
  id: string;
  name: string;
  icon: string;
  templates?: CategoryTemplate[];
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
  accumulatedTime?: number; // 秒为单位
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
  category?: string;
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
  lastFocusDuration?: number; // 正在进行的计时
}

export type AppTab = 'home' | 'plan' | 'rewards' | 'me';

export interface AppState {
  children: Child[];
  selectedChildId: string;
  rewards: Reward[];
  role: UserRole;
}

export interface FocusLog {
  taskId: string;
  taskTitle: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  duration: number;  // Seconds
}

export interface RedemptionLog {
  id: string;
  childId: string;
  rewardName: string;
  pointsCost: number;
  redeemedAt: string; // ISO String
}

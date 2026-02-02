
import { Child, TaskCategory, Reward, Task } from './types';

export const INITIAL_CHILDREN: Child[] = [
  {
    id: '1',
    name: '加一',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    points: 87.8,
    schedules: []
  },
  {
    id: '2',
    name: '小乖',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    points: 45.0,
    schedules: []
  },
  {
    id: '3',
    name: '豆豆',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    points: 12.5,
    schedules: []
  }
];

// Fix: Explicitly typed DEFAULT_TASKS to ensure 'period' uses specific literal types
export const DEFAULT_TASKS: Omit<Task, 'id' | 'completed'>[] = [
  { title: '英语晨听', period: 'morning', points: 5, category: TaskCategory.LEARNING, timeSlot: '08:00 - 08:30' },
  { title: '望远护眼', period: 'morning', points: 2, category: TaskCategory.HEALTH, timeSlot: '09:00 - 09:15' },
  { title: '足球集训', period: 'noon', points: 10, category: TaskCategory.LIFESTYLE, timeSlot: '10:00 - 12:00' },
  { title: '寒假生活作业', period: 'afternoon', points: 8, category: TaskCategory.LEARNING, timeSlot: '14:00 - 15:30' },
  { title: '下期课文预习', period: 'afternoon', points: 5, category: TaskCategory.LEARNING, timeSlot: '16:00 - 17:00' },
  { title: '自主阅读', period: 'evening', points: 5, category: TaskCategory.LEARNING, timeSlot: '19:30 - 20:30' },
  { title: '刷牙洗脸', period: 'night', points: 2, category: TaskCategory.HEALTH, timeSlot: '21:00 - 21:15' },
  { title: '早睡早起', period: 'night', points: 5, category: TaskCategory.LIFESTYLE, timeSlot: '21:30 - 07:30' },
];

export const INITIAL_REWARDS: Reward[] = [
  { id: 'r1', name: '看动画片30分钟', pointsCost: 50, icon: '📺' },
  { id: 'r2', name: '周末游乐园', pointsCost: 500, icon: '🎡' },
  { id: 'r3', name: '美味甜点一份', pointsCost: 100, icon: '🍰' },
  { id: 'r4', name: '买新玩具', pointsCost: 300, icon: '🧸' },
];

export const PERIOD_LABELS = {
  morning: '早起时光',
  noon: '元气上午',
  afternoon: '充实下午',
  evening: '静谧晚上',
  night: '晚安时刻'
};

export const PERIOD_COLORS = {
  morning: 'bg-[#FFF9E1] border-[#FFD95A] text-[#C07F00]',
  noon: 'bg-[#FFE5E5] border-[#FFB1B1] text-[#FF6969]',
  afternoon: 'bg-[#E5F9FF] border-[#B1EFFF] text-[#008BB1]',
  evening: 'bg-[#F2E5FF] border-[#D1B1FF] text-[#6900FF]',
  night: 'bg-[#E5FFF1] border-[#B1FFD1] text-[#00B169]'
};

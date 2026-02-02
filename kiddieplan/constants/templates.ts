import { TaskCategory } from '../types';

export const TASK_TEMPLATES = [
    {
        category: TaskCategory.STUDY,
        tasks: [
            { title: '📖 课前预习', time: '18:30', points: 15, icon: '📚' },
            { title: '✍️ 专注作业', time: '19:00', points: 30, icon: '📝' },
            { title: '🗣️ 英语听力', time: '07:30', points: 20, icon: '🎧' },
            { title: '🧠 错题整理', time: '20:30', points: 25, icon: '🧐' },
            { title: '🧱 课外阅读', time: '21:00', points: 20, icon: '📕' },
            { title: '🎹 乐器/特长练习', time: '17:00', points: 40, icon: '🎼' },
        ]
    },
    {
        category: TaskCategory.DISCIPLINE,
        tasks: [
            { title: '⏰ 准时起床', time: '07:00', points: 10, icon: '⚡' },
            { title: '🧼 整理书桌', time: '21:30', points: 15, icon: '🧹' },
            { title: '🏃 健身运动', time: '17:30', points: 30, icon: '🏀' },
            { title: '👀 自主护眼', time: '16:00', points: 10, icon: '🛡️' },
            { title: '🌙 睡前复盘', time: '21:45', points: 20, icon: '💭' },
            { title: '🎒 整理书包', time: '21:40', points: 10, icon: '🎒' },
        ]
    },
    {
        category: TaskCategory.CHORES,
        tasks: [
            { title: '🍽️ 收纳餐具', time: '18:15', points: 10, icon: '🥣' },
            { title: '🧺 收纳衣物', time: '19:45', points: 15, icon: '👕' },
            { title: '♻️ 垃圾分类', time: '20:00', points: 10, icon: '♻️' },
            { title: '🛋️ 整理客厅', time: '10:00', points: 20, icon: '🏠' },
        ]
    },
    {
        category: TaskCategory.HYGIENE,
        tasks: [
            { title: '🦷 认真刷牙', time: '07:15', points: 10, icon: '🪥' },
            { title: '💦 洗脸护肤', time: '21:50', points: 10, icon: '🧼' },
            { title: '✂️ 修剪指甲', time: '19:00', points: 10, icon: '💅' },
        ]
    }
];

export const DEFAULT_REWARDS = [
    { name: '🍿 电影之夜', pointsCost: 500, icon: '🎬' },
    { name: '🍦 冰淇淋自由', pointsCost: 200, icon: '🍨' },
    { name: '🎮 游戏时间+30min', pointsCost: 300, icon: '🎮' },
    { name: '📚 挑选一本心仪书籍', pointsCost: 400, icon: '📗' },
    { name: '🧸 心愿礼物盲盒', pointsCost: 1000, icon: '🎁' },
    { name: '🎡 周末游乐园', pointsCost: 2000, icon: '🎡' },
];

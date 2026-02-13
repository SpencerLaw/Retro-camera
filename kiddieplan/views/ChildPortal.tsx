import React, { useState, useEffect, useRef } from 'react';
import { LogOut, CheckCircle2, Star, Trophy, Clock, Sparkles, Smile, BookOpen, LayoutGrid, Timer, Gift, User, Home, ListTodo, ShieldCheck, Plus, ArrowLeft, Medal, Zap, RefreshCw } from 'lucide-react';
import { Task, AppTab } from '../types';
import confettis from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface ChildPortalProps {
    token: string;
    onLogout: () => void;
}

const ChildPortal: React.FC<ChildPortalProps> = ({ token, onLogout }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [checkins, setCheckins] = useState<string[]>([]);
    const [streak, setStreak] = useState(0);
    const [coins, setCoins] = useState(0);
    const [rewards, setRewards] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<AppTab>('home');
    const [loading, setLoading] = useState(true);
    const [childProfile, setChildProfile] = useState<{ name: string; avatar: string }>({ name: '宝贝', avatar: '' });
    const [plannerTab, setPlannerTab] = useState(0);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [cloudToast, setCloudToast] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });
    const prevTasksCount = useRef<number>(0);
    const isFirstLoad = useRef(true);

    // Timer state
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const formatBeijingTime = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const y = date.getFullYear();
        const m = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    };

    // Update real-time EVERY SECOND
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Smart Polling Logic for ChildPortal
    const [isIdle, setIsIdle] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // Activity Detection
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
            if (isIdle) setIsIdle(false);
        };
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        const idleChecker = setInterval(() => {
            if (Date.now() - lastActivityRef.current > 60000) { // 1 min idle
                setIsIdle(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            clearInterval(idleChecker);
        };
    }, [isIdle]);

    // Adaptive Polling for new tasks/data
    useEffect(() => {
        let intervalTime = 60000; // Default Idle: 1 min

        if (document.hidden) {
            intervalTime = 300000; // Hidden: 5 min
        } else if (!isIdle) {
            intervalTime = 3000; // Active: 3 sec (Optimized for real-time feel)
        }

        console.log(`Child Polling interval set to: ${intervalTime}ms (${document.hidden ? 'Hidden' : isIdle ? 'Idle' : 'Active'})`);

        const poll = setInterval(() => fetchTodayData(true), intervalTime);
        return () => clearInterval(poll);
    }, [isIdle]);

    // Handle timer state
    useEffect(() => {
        let interval: any;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // REAL-TIME SYNC PULSE: Send current focus duration to backend every 15s
    useEffect(() => {
        if (!isTimerRunning || !activeTaskId) return;

        const syncPulse = setInterval(async () => {
            const task = tasks.find(t => t.id === activeTaskId);
            try {
                await fetch('/api/kiddieplan/client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_focus_status',
                        token,
                        data: { isFocusing: true, taskTitle: task?.title, duration: timerSeconds }
                    })
                });
            } catch (e) {
                console.error('Pulse failed');
            }
        }, 15000);

        return () => clearInterval(syncPulse);
    }, [isTimerRunning, activeTaskId, timerSeconds, tasks, token]);

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRedeemReward = async (reward: any) => {
        if (coins < reward.pointsCost) return;
        try {
            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'redeem_reward', token, data: { rewardId: reward.id, cost: reward.pointsCost } })
            });
            const result = await res.json();
            if (result.success) {
                setCoins(result.points);
                confettis({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FBBF24', '#F472B6', '#60A5FA']
                });
                alert(`🎉 成功兑换 ${reward.name}！快去找爸爸妈妈领取吧。`);
            }
        } catch (err) {
            alert('😭 兑换失败，请稍后再试');
        }
    };

    useEffect(() => {
        fetchTodayData();
    }, []);

    const fetchTodayData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_today_data', token, data: { date: dateStr } })
            });
            const result = await res.json();
            if (result.success) {
                const newTasks = result.data.tasks || [];

                // Detect NEW tasks (ignore first load/decrease)
                if (!isFirstLoad.current && newTasks.length > prevTasksCount.current) {
                    const addedCount = newTasks.length - prevTasksCount.current;
                    setCloudToast({ show: true, count: addedCount });
                    setTimeout(() => setCloudToast(prev => ({ ...prev, show: false })), 5000);
                }

                setTasks(newTasks);
                prevTasksCount.current = newTasks.length;
                isFirstLoad.current = false;

                setCheckins(result.data.checkins || []);
                setStreak(result.data.streak || 0);
                setCoins(result.data.points || 0);
                if (result.data.profile) setChildProfile(result.data.profile);
                if (result.data.rewards) setRewards(result.data.rewards);
            }
        } catch (err) {
            console.error('Fetch failed');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const toggleTimer = async (task: Task) => {
        if (isTimerRunning) {
            // STOP TIMER: Record log
            if (activeTaskId !== task.id) {
                alert('请先停止当前正在进行的任务哦~');
                return;
            }

            const endTime = new Date().toISOString();
            const log = {
                taskId: task.id,
                taskTitle: task.title,
                startTime: startTime!,
                endTime: endTime,
                duration: timerSeconds
            };

            // Sync with backend: 1. Record Log + 2. Clear Status
            try {
                await fetch('/api/kiddieplan/client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'record_focus', token, data: { log } })
                });

                await fetch('/api/kiddieplan/client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_focus_status', token, data: { isFocusing: false } })
                });
            } catch (e) {
                console.error('Stop sync failed');
            }

            // 本地更新 tasks 列表中的 accumulatedTime
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, accumulatedTime: (t.accumulatedTime || 0) + timerSeconds } : t));

            setIsTimerRunning(false);
            setActiveTaskId(null);
            setTimerSeconds(0);
            setStartTime(null);
        } else {
            // START TIMER
            setActiveTaskId(task.id);
            setTimerSeconds(0);
            setStartTime(new Date().toISOString());
            setIsTimerRunning(true);

            // Sync status immediately
            try {
                await fetch('/api/kiddieplan/client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_focus_status',
                        token,
                        data: { isFocusing: true, taskTitle: task.title, duration: 0 }
                    })
                });
            } catch (e) {
                console.error('Start sync failed');
            }
        }
    };

    const handleToggleTask = async (taskId: string) => {
        try {
            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_checkin', token, data: { taskId } })
            });
            const result = await res.json();
            if (result.success) {
                const isCheckingIn = !checkins.includes(taskId);
                setCheckins(result.checkins);
                if (result.points !== undefined) setCoins(result.points);

                if (isCheckingIn) {
                    confettis({
                        particleCount: 100,
                        spread: 60,
                        origin: { y: 0.7 },
                        zIndex: 200,
                        colors: ['#34D399', '#60A5FA', '#FBBF24']
                    });
                }
            }
        } catch (err) {
            alert('😭 传送失败，请重试');
        }
    };

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center font-candy space-y-10">
            <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative"
            >
                <div className="w-24 h-24 bg-white/40 rounded-full animate-ping opacity-30"></div>
                <div className="w-24 h-24 bg-white rounded-[32px] absolute inset-0 flex items-center justify-center shadow-2xl border-4 border-pink-200">
                    <Sparkles className="text-[#FF6B81]" size={40} />
                </div>
            </motion.div>
            <p className="text-3xl text-[#5D4037] opacity-50 font-black">开启梦幻星岛...</p>
        </div>
    );

    const progress = tasks.length > 0 ? Math.round((checkins.length / tasks.length) * 100) : 0;

    const renderDashboardView = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 pb-48"
        >
            {/* Candy Island Dashboard Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border-2 border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                {/* Background Sparkles */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-100/30 to-purple-100/30 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                <div className="relative z-10 flex flex-col gap-8">
                    {/* Welcome Text */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg border-4 border-white rotate-3 group-hover:rotate-0 transition-transform">
                            👋
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 tracking-tight" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                                Hi {childProfile.name} !
                            </h2>
                            <p className="text-gray-400 font-bold text-sm mt-1">今天也是充满元气的一天 ~</p>
                        </div>
                    </div>

                    {/* Stats Grid - Candy Style */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 flex flex-col items-center gap-1 group/item hover:bg-blue-50 transition-colors">
                            <span className="text-2xl group-hover/item:scale-125 transition-transform">🗓️</span>
                            <span className="text-2xl font-black text-blue-600 leading-none">{tasks.length}</span>
                            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">今日任务</span>
                        </div>
                        <div className="bg-pink-50/50 p-4 rounded-3xl border border-pink-100/50 flex flex-col items-center gap-1 group/item hover:bg-pink-50 transition-colors">
                            <span className="text-2xl group-hover/item:scale-125 transition-transform">⚡</span>
                            <span className="text-2xl font-black text-pink-600 leading-none">+{tasks.reduce((acc, t) => acc + t.points, 0)}</span>
                            <span className="text-[10px] font-black text-pink-300 uppercase tracking-widest">预计可得糖果</span>
                        </div>
                        <div className="bg-yellow-50/50 p-4 rounded-3xl border border-yellow-100/50 flex flex-col items-center gap-1 group/item hover:bg-yellow-50 transition-colors">
                            <span className="text-2xl group-hover/item:scale-125 transition-transform">🍭</span>
                            <span className="text-2xl font-black text-yellow-600 leading-none">{coins}</span>
                            <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest">我的糖果库</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Summary Section */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-700 pl-1 flex items-center gap-2">
                    <BookOpen size={18} className="text-pink-400" /> 今日任务概览 (只读)
                </h3>
                {[...tasks].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)).map((task) => {
                    const isCompleted = checkins.includes(task.id);
                    return (
                        <div
                            key={task.id}
                            className={`p-4 rounded-2xl flex items-center justify-between border transition-all relative overflow-hidden
                            ${isCompleted ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-white/50 shadow-sm'}`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCompleted ? 'bg-green-100 text-green-500' : 'bg-pink-50 text-pink-400'}`}>
                                    {isCompleted ? <CheckCircle2 size={22} /> : <Clock size={20} />}
                                </div>
                                <div>
                                    <div className={`font-bold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</div>
                                    <div className="text-[11px] font-medium text-gray-400">{task.timeSlot}</div>
                                </div>
                            </div>
                            {!isCompleted && (
                                <div className="text-[11px] font-bold text-gray-300">
                                    待完成
                                </div>
                            )}
                        </div>
                    );
                })}
                {tasks.length === 0 && (
                    <div className="text-center py-10 text-gray-300 font-bold">今天还没有任务哦，快叫爸爸妈妈发布吧！</div>
                )}
            </div>
        </motion.div>
    );

    const renderPlannerView = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-48 relative"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-700">任务规划时间轴</h2>
                {isTimerRunning && (
                    <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black animate-pulse flex items-center gap-2">
                        <Zap size={14} fill="currentColor" /> 专注中: {formatTime(timerSeconds)}
                    </div>
                )}
            </div>

            <div className="relative pl-8 space-y-8">
                {/* Timeline Axis */}
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 border-l-2 border-dashed border-blue-200"></div>

                {tasks.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)).map((task, idx) => {
                    const isCompleted = checkins.includes(task.id);
                    const isCurrentFocus = activeTaskId === task.id;

                    return (
                        <motion.div
                            layout
                            key={task.id}
                            className="relative"
                        >
                            {/* Node Dot */}
                            <div className={`absolute -left-8 top-5 w-7 h-7 rounded-full border-4 bg-white z-10 flex items-center justify-center shadow-sm transition-colors
                                ${isCompleted ? 'border-green-400 text-green-400' : isCurrentFocus ? 'border-orange-400 text-orange-400 animate-pulse' : 'border-blue-200 text-gray-300'}`}>
                                {isCompleted ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                            </div>

                            <motion.div
                                whileTap={{ scale: 0.98 }}
                                className={`bg-white/80 backdrop-blur-sm p-4 rounded-[28px] border transition-all ${isCompleted ? 'border-transparent opacity-60' : 'border-white/50 shadow-md hover:shadow-lg'}`}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isCompleted ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-400'}`}>
                                                {task.category?.includes('学') ? '📚' : task.category?.includes('玩') ? '🎮' : '🌟'}
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-lg ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-500 px-2 py-0.5 rounded-md">{task.timeSlot}</span>
                                                    <span className="text-[10px] font-black text-orange-400">+{task.points} 🍭</span>
                                                    {((task.accumulatedTime || 0) > 0 || (isCurrentFocus && timerSeconds > 0)) && (
                                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <Timer size={10} /> {formatTime((task.accumulatedTime || 0) + (isCurrentFocus ? timerSeconds : 0))}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div onClick={() => handleToggleTask(task.id)} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all ${isCompleted ? 'border-green-200 bg-green-50 text-green-500' : 'border-gray-100 text-gray-200 hover:border-green-200 hover:text-green-400'}`}>
                                            <CheckCircle2 size={24} />
                                        </div>
                                    </div>

                                    {!isCompleted && (
                                        <div className="flex items-center gap-2 pt-1 border-t border-gray-50 mt-1">
                                            <button
                                                onClick={() => toggleTimer(task)}
                                                disabled={isTimerRunning && !isCurrentFocus}
                                                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2
                                                    ${isCurrentFocus
                                                        ? 'bg-red-500 text-white shadow-[0_4px_0_#991b1b]'
                                                        : 'bg-orange-400 text-white shadow-[0_4px_0_#c2410c] hover:translate-y-0.5 active:shadow-none'}
                                                    ${isTimerRunning && !isCurrentFocus ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                                            >
                                                {isCurrentFocus ? (
                                                    <>结束专注 ({formatTime(timerSeconds)})</>
                                                ) : (
                                                    <>开始专注计时</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                })}
            </div>
            {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 font-bold space-y-4">
                    <div className="text-6xl">🗓️</div>
                    <div>今天暂时没有任务计划哦</div>
                </div>
            )}
        </motion.div>
    );

    return (
        <div className="flex flex-col h-[100dvh] w-full overflow-hidden font-sans relative" style={{ background: 'linear-gradient(160deg, #FFF0F5 0%, #E6F2FF 50%, #FFF5E6 100%)' }}>
            {/* Decorative Blurs */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-pink-200 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-blue-200 rounded-full translate-x-1/2 blur-3xl opacity-40 pointer-events-none"></div>

            {/* Cloud Toast Notification */}
            <AnimatePresence>
                {cloudToast.show && (
                    <motion.div
                        initial={{ y: -100, x: "-50%", opacity: 0, scale: 0.8 }}
                        animate={{ y: 20, x: "-50%", opacity: 1, scale: 1 }}
                        exit={{ y: -100, x: "-50%", opacity: 0, scale: 0.8 }}
                        style={{ left: "50%" }}
                        className="fixed top-12 z-[100] w-[90%] max-w-sm"
                    >
                        <div className="relative">
                            {/* Cloud Shape Visuals */}
                            <div className="absolute -top-4 -left-4 w-12 h-12 bg-white rounded-full blur-xl opacity-60"></div>
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-blue-50 rounded-full blur-xl opacity-60"></div>

                            <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] border-4 border-blue-50 flex items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-10">
                                    <Sparkles size={60} />
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-300 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 animate-bounce">
                                    <Gift size={28} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-blue-500 font-black text-sm uppercase tracking-wider mb-1">新任务驾到！</h4>
                                    <p className="text-[#5D4037] font-bold text-base leading-tight">
                                        爸爸妈妈给你分配了 <span className="text-orange-500 text-lg mx-0.5">{cloudToast.count}</span> 个新任务！
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Area - Everything scrolls under the glassy header */}
            <main className="flex-1 w-full overflow-y-auto no-scrollbar relative scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
                {/* Top Bar - Pixel-Perfect Mirror of Parent Portal */}
                <div className="sticky top-0 p-4 z-40">
                    <header
                        className="px-6 py-4 flex justify-between items-center rounded-3xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.07)]"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(15px) saturate(160%)',
                            WebkitBackdropFilter: 'blur(15px) saturate(160%)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.03), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                    <Sparkles className="text-yellow-500" size={20} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <h1 className="flex flex-col font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-pink-500 to-orange-600 tracking-tight leading-[0.85]" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                                    <span className="text-[14px]">星梦</span>
                                    <span className="text-[22px]">奇旅</span>
                                </h1>
                                <div className="flex flex-col justify-center border-l-2 border-gray-200/30 pl-2 ml-1">
                                    <span className="text-xs font-bold text-gray-400 leading-none mb-0.5">孩子端</span>
                                    <span className="text-[10px] font-black text-gray-400 font-mono tracking-wider leading-none">
                                        {formatBeijingTime(currentTime)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => fetchTodayData()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/30 text-gray-400 font-bold text-xs shadow-sm border border-white/30 hover:text-blue-500 transition-colors"
                                    title="手动同步数据"
                                >
                                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                                    <span className="hidden xs:inline">同步</span>
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onLogout}
                                    className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center text-gray-400 shadow-sm border border-white/30 hover:text-red-400 transition-colors"
                                >
                                    <LogOut size={18} />
                                </motion.button>
                            </div>
                        </div>
                    </header>
                </div>

                <div className="px-5 pt-0 pb-60">
                    <AnimatePresence mode='wait'>
                        {activeTab === 'home' && renderDashboardView()}
                        {activeTab === 'plan' && renderPlannerView()}
                        {activeTab === 'rewards' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 pb-48">
                                <h2 className="text-2xl font-black text-gray-700 text-center">🎁 梦幻宝库</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {rewards.map((reward, i) => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ y: -3, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleRedeemReward(reward)}
                                            className="bg-white/80 backdrop-blur-sm p-5 rounded-3xl flex flex-col items-center gap-3 text-center border border-white/50 shadow-sm cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="text-4xl transform hover:scale-110 transition-transform">{reward.icon || '🎁'}</div>
                                            <div>
                                                <div className="font-bold text-gray-700 text-sm">{reward.name}</div>
                                                <div className="text-[10px] font-bold text-white bg-gradient-to-r from-yellow-400 to-orange-400 px-2 py-0.5 rounded-full mt-1.5 inline-block shadow-sm">
                                                    {reward.pointsCost} 🍭
                                                </div>
                                            </div>
                                            {coins < reward.pointsCost && (
                                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center font-bold text-sm text-gray-400 backdrop-blur-[2px]">
                                                    还差 {reward.pointsCost - coins} 🍭
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'me' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full pb-48 space-y-5 text-center pt-4">
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: 3 }}
                                    className="w-28 h-28 bg-white/80 rounded-3xl shadow-lg flex items-center justify-center text-5xl border border-white/50"
                                >
                                    🏆
                                </motion.div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-700">成就殿堂</h2>
                                    <p className="text-gray-400 font-medium text-sm mt-1">已连续坚持 <span className="font-bold text-pink-500">{streak}</span> 天</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2.5 w-full px-4">
                                    {['🌟', '🎮', '🎨', '🚀', '🌈', '🍦'].map((icon, i) => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ scale: 1.1 }}
                                            className="bg-white/60 p-4 rounded-2xl text-2xl grayscale opacity-60 border border-white/50"
                                        >
                                            {icon}
                                        </motion.div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-300 font-medium px-8">完成更多任务，解锁神秘勋章！</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Bottom Nav - Anchored Bar with Safe Area Support */}
            <div
                className="fixed bottom-0 left-0 right-0 border-t border-white/30 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] flex justify-around items-center z-50 px-6 rounded-t-[40px]"
                style={{
                    height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(25px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(25px) saturate(160%)',
                }}
            >
                {[
                    { id: 'home', icon: Home, label: '主岛' },
                    { id: 'plan', icon: ListTodo, label: '规划' },
                    { id: 'rewards', icon: Gift, label: '宝库' },
                    { id: 'me', icon: User, label: '档案' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AppTab)}
                        className="relative flex flex-col items-center justify-center w-14 h-full gap-0.5"
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="nav-pill"
                                className="absolute inset-1 bg-gradient-to-br from-pink-50 to-pink-100 rounded-[18px]"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className={`relative z-10 transition-colors duration-200 ${activeTab === tab.id ? 'text-pink-500' : 'text-gray-300'}`}>
                            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        </span>
                        <span className={`relative z-10 text-[9px] font-bold transition-colors duration-200 ${activeTab === tab.id ? 'text-pink-500' : 'text-gray-300'}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ChildPortal;

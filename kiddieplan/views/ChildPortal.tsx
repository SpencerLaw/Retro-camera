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

    // Timer state
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

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
            intervalTime = 10000; // Active: 10 sec
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
                setTasks(result.data.tasks || []);
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

            // Sync with backend
            try {
                await fetch('/api/kiddieplan/client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'record_focus', token, data: { log } })
                });
            } catch (e) {
                console.error('Record focus log failed');
            }

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
            className="space-y-6 pb-32"
        >
            {/* Real-time Clock & Hero */}
            <div className="bg-white/70 backdrop-blur-xl rounded-[32px] p-6 border border-white/50 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-pink-100 to-transparent rounded-full -mr-10 -mt-10 blur-2xl opacity-80"></div>

                <div className="flex flex-col items-center text-center relative z-10 py-2">
                    <div className="text-5xl font-black text-gray-700 mb-2 font-mono">
                        {currentTime.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mb-4">
                        {currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                        <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex flex-col items-center">
                            <span className="text-2xl font-black text-blue-500">{tasks.length}</span>
                            <span className="text-[10px] font-bold text-blue-300 uppercase">今日任务</span>
                        </div>
                        <div className="bg-pink-50 px-4 py-2 rounded-2xl border border-pink-100 flex flex-col items-center">
                            <span className="text-2xl font-black text-pink-500">+{tasks.reduce((acc, t) => acc + t.points, 0)}</span>
                            <span className="text-[10px] font-bold text-pink-300 uppercase">可获能量</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Summary Section */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-700 pl-1 flex items-center gap-2">
                    <BookOpen size={18} className="text-pink-400" /> 今日任务概览 (只读)
                </h3>
                {tasks.map((task) => {
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
            className="space-y-6 pb-32 relative"
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
                                                    <>开始专注计时的</>
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
        <div className="flex-1 flex flex-col h-full overflow-hidden font-sans relative" style={{ background: 'linear-gradient(160deg, #FFF0F5 0%, #E6F2FF 50%, #FFF5E6 100%)' }}>
            {/* Decorative Blurs */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-pink-200 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-blue-200 rounded-full translate-x-1/2 blur-3xl opacity-40 pointer-events-none"></div>

            {/* Top Bar - Glassmorphism */}
            <header className="sticky top-0 px-5 py-4 flex justify-between items-center bg-white/60 backdrop-blur-xl border-b border-white/30 shadow-sm z-40">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 rounded-2xl shadow-md text-white">
                        <span className="text-lg">🍭</span>
                        <span className="font-black text-lg">{coins}</span>
                    </div>
                    <span className="text-xs font-bold bg-purple-100/80 backdrop-blur-sm text-purple-500 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span className="opacity-60">Hello {childProfile.name}</span>
                        <span className="w-px h-3 bg-purple-200 mx-0.5"></span>
                        <span>🔥 {streak} 天连续</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fetchTodayData()}
                        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 text-gray-400 font-bold text-xs shadow-sm border border-white/50 hover:text-blue-400 transition-colors"
                        title="手动同步数据"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        <span className="hidden xs:inline">同步</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onLogout}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={18} />
                    </motion.button>
                </div>
            </header>

            {/* Main Area */}
            <main className="flex-1 px-5 overflow-y-auto no-scrollbar pt-2">
                <AnimatePresence mode='wait'>
                    {activeTab === 'home' && renderDashboardView()}
                    {activeTab === 'plan' && renderPlannerView()}
                    {activeTab === 'rewards' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 pb-32">
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
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full pb-32 space-y-5 text-center pt-4">
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
            </main>

            {/* Bottom Nav - Floating Pill Bar */}
            <div className="fixed bottom-5 left-5 right-5 h-[68px] bg-white/80 backdrop-blur-xl border border-white/50 rounded-[24px] shadow-lg flex justify-around items-center z-50 px-3">
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

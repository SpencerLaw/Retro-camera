import React, { useState, useEffect } from 'react';
import { LogOut, CheckCircle2, Star, Trophy, Clock, Sparkles, Smile, BookOpen, LayoutGrid, Timer, Gift, User, Home, ListTodo, ShieldCheck, Plus, ArrowLeft, Medal, Zap } from 'lucide-react';
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

    // Dynamic Tracking Sync
    useEffect(() => {
        if (!isTimerRunning) return;

        const syncTimer = async () => {
            try {
                await fetch('/api/kiddieplan/client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sync_timer',
                        token,
                        data: { seconds: timerSeconds, activeTaskId, isRunning: true }
                    })
                });
            } catch (e) {
                console.error('Sync failed');
            }
        };

        const interval = setInterval(syncTimer, 10000); // Pulse every 10s
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds, activeTaskId, token]);

    // Handle session end sync
    useEffect(() => {
        if (!isTimerRunning && timerSeconds > 0) {
            fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_timer',
                    token,
                    data: { seconds: timerSeconds, activeTaskId, isRunning: false }
                })
            });
        }
    }, [isTimerRunning]);

    useEffect(() => {
        let interval: any;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        } else {
            clearInterval(interval);
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

    const fetchTodayData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_today_data', token })
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
            setLoading(false);
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

    const DashboardView = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 pb-32"
        >
            {/* Hero Card */}
            <div className="bg-white/70 backdrop-blur-xl rounded-[32px] p-6 border border-white/50 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-pink-100 to-transparent rounded-full -mr-10 -mt-10 blur-2xl opacity-80"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <motion.div
                        whileHover={{ scale: 1.08, rotate: 3 }}
                        className="w-20 h-20 rounded-full overflow-hidden border-4 border-pink-200 shadow-lg ring-4 ring-pink-50"
                    >
                        <img src={childProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${token}`} alt="avatar" className="w-full h-full object-cover" />
                    </motion.div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-700 mb-1">{childProfile.name}<span className="text-gray-300"> 的星梦基地</span></h1>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">积极充电中...</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
                    <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl flex flex-col items-center gap-1 border border-blue-100/50">
                        <Timer className="text-blue-500 mb-1" size={22} />
                        <span className="text-xl font-black text-gray-700">{formatTime(timerSeconds)}</span>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">今日专注</span>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-2xl flex flex-col items-center gap-1 border border-purple-100/50">
                        <div className="relative">
                            <Star className="text-purple-500 mb-1" size={22} />
                            {progress === 100 && <motion.div className="absolute -top-1 -right-2 w-3 h-3 bg-yellow-400 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }} />}
                        </div>
                        <span className="text-xl font-black text-gray-700">{progress}%</span>
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">任务能量</span>
                    </motion.div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveTab('plan')}
                    className="bg-gradient-to-br from-pink-400 to-rose-500 p-5 rounded-3xl text-white shadow-lg flex flex-col items-center gap-2 group"
                >
                    <LayoutGrid size={28} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-bold text-sm">我的任务板</span>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`p-5 rounded-3xl shadow-lg flex flex-col items-center gap-2 group transition-all
                     ${isTimerRunning ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white' : 'bg-white text-orange-400 border border-orange-100'}`}
                >
                    <Timer size={28} strokeWidth={2.5} className={`group-hover:scale-110 transition-transform ${isTimerRunning ? 'animate-spin-slow' : ''}`} />
                    <span className="font-bold text-sm">{isTimerRunning ? '专注中...' : '开始专注'}</span>
                </motion.button>
            </div>

            {/* Mini Task List */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-700 pl-1 flex items-center gap-2">
                    <BookOpen size={18} className="text-pink-400" /> 待办事项
                </h3>
                {tasks.slice(0, 3).map((task) => {
                    const isCompleted = checkins.includes(task.id);
                    return (
                        <motion.div
                            layout
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleToggleTask(task.id)}
                            className={`p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer relative overflow-hidden
                            ${isCompleted ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-white/50 shadow-sm hover:shadow-md'}`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCompleted ? 'bg-green-100 text-green-500' : 'bg-pink-50 text-pink-400'}`}>
                                    {isCompleted ? <CheckCircle2 size={22} /> : <div className="w-3.5 h-3.5 rounded-full border-[3px] border-pink-300" />}
                                </div>
                                <div>
                                    <div className={`font-bold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</div>
                                    <div className="text-[11px] font-medium text-gray-400">{task.timeSlot}</div>
                                </div>
                            </div>
                            {!isCompleted && (
                                <div className="bg-yellow-100 text-yellow-600 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm relative z-10">
                                    +{task.points}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );

    const PlannerView = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-5 pb-32"
        >
            <div className="flex bg-white/70 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm border border-white/50">
                {['任务', '周历', '成就'].map((t, i) => (
                    <button key={i} onClick={() => setPlannerTab(i)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${plannerTab === i ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-sm' : 'text-gray-400'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {tasks.map(task => {
                    const isCompleted = checkins.includes(task.id);
                    return (
                        <motion.div
                            layout
                            key={task.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleToggleTask(task.id)}
                            className={`bg-white/80 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${isCompleted ? 'border-transparent opacity-60' : 'border-white/50 shadow-sm hover:shadow-md'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-500' : 'bg-pink-50 text-pink-400'}`}>
                                    {isCompleted ? <CheckCircle2 size={24} /> :
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-3 h-3 bg-pink-400 rounded-full" />}
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</h3>
                                    <p className="text-[11px] font-medium text-gray-400">{task.timeSlot} • {task.points} 🍭</p>
                                </div>
                            </div>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'border-green-200 bg-green-50 text-green-500' : 'border-gray-100 text-gray-200'}`}>
                                <CheckCircle2 size={18} />
                            </div>
                        </motion.div>
                    )
                })}
            </div>
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
                    <span className="text-xs font-bold bg-purple-100 text-purple-500 px-3 py-1.5 rounded-full">
                        🔥 {streak} 天连续
                    </span>
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onLogout}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 hover:text-red-400 transition-colors"
                >
                    <LogOut size={18} />
                </motion.button>
            </header>

            {/* Main Area */}
            <main className="flex-1 px-5 overflow-y-auto no-scrollbar pt-2">
                <AnimatePresence mode='wait'>
                    {activeTab === 'home' && <DashboardView />}
                    {activeTab === 'plan' && <PlannerView />}
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

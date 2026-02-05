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
            className="space-y-8 pb-32"
        >
            {/* Hero Card */}
            <div className="bg-white rounded-[40px] p-6 border-4 border-white shadow-[0_20px_40px_rgba(236,72,153,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-100 rounded-full -mr-16 -mt-16 blur-3xl opacity-60"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 3 }}
                        className="w-24 h-24 rounded-[30px] overflow-hidden border-4 border-pink-100 shadow-lg"
                    >
                        <img src={childProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${token}`} alt="avatar" className="w-full h-full object-cover" />
                    </motion.div>
                    <div>
                        <h1 className="text-3xl font-black text-[#5D4037] mb-1">{childProfile.name}的星梦基地</h1>
                        <div className="flex items-center gap-2">
                            <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                                <Zap size={12} fill="currentColor" /> {streak} 天连续挑战
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-[24px] flex flex-col items-center gap-1">
                        <Timer className="text-blue-400 mb-1" size={24} />
                        <span className="text-2xl font-black text-[#5D4037]">{formatTime(timerSeconds)}</span>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">今日专注</span>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className="bg-purple-50 p-4 rounded-[24px] flex flex-col items-center gap-1">
                        <div className="relative">
                            <Star className="text-purple-400 mb-1" size={24} />
                            {progress === 100 && <motion.div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity }} />}
                        </div>
                        <span className="text-2xl font-black text-[#5D4037]">{progress}%</span>
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">能量值</span>
                    </motion.div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('plan')}
                    className="bg-gradient-to-br from-[#F472B6] to-[#EC4899] p-6 rounded-[32px] text-white shadow-lg shadow-pink-200 flex flex-col items-center gap-2 group"
                >
                    <LayoutGrid size={32} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-black">我的任务板</span>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`p-6 rounded-[32px] shadow-lg flex flex-col items-center gap-2 group transition-all
                     ${isTimerRunning ? 'bg-orange-400 text-white shadow-orange-200' : 'bg-white text-orange-400 shadow-gray-100'}`}
                >
                    <Timer size={32} strokeWidth={3} className={`group-hover:scale-110 transition-transform ${isTimerRunning ? 'animate-spin-slow' : ''}`} />
                    <span className="font-black">{isTimerRunning ? '专注中...' : '开始专注'}</span>
                </motion.button>
            </div>

            {/* Mini Task List */}
            <div className="space-y-4">
                <h3 className="text-xl font-black text-[#5D4037] pl-2 flex items-center gap-2">
                    <BookOpen size={20} className="text-pink-400" /> 待办事项
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
                            className={`p-5 rounded-[24px] flex items-center justify-between border-2 transition-all cursor-pointer relative overflow-hidden
                            ${isCompleted ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-white shadow-sm hover:border-pink-200'}`}
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isCompleted ? 'bg-gray-200 text-white' : 'bg-pink-50 text-pink-400'}`}>
                                    {isCompleted ? <CheckCircle2 size={24} /> : <div className="w-4 h-4 rounded-full border-4 border-pink-300" />}
                                </div>
                                <div>
                                    <div className={`font-black text-lg ${isCompleted ? 'line-through text-gray-400' : 'text-[#5D4037]'}`}>{task.title}</div>
                                    <div className="text-xs font-bold opacity-40 uppercase tracking-wider">{task.timeSlot}</div>
                                </div>
                            </div>
                            {!isCompleted && (
                                <div className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-black shadow-sm relative z-10">
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
            className="space-y-8 pb-32"
        >
            <div className="flex bg-white/60 p-1.5 rounded-[24px] shadow-sm">
                {['任务', '周历', '成就'].map((t, i) => (
                    <button key={i} onClick={() => setPlannerTab(i)} className={`flex-1 py-3 text-xs font-black rounded-[20px] transition-all ${plannerTab === i ? 'bg-[#F472B6] text-white shadow-md' : 'text-[#5D4037] opacity-40'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {tasks.map(task => {
                    const isCompleted = checkins.includes(task.id);
                    return (
                        <motion.div
                            layout
                            key={task.id}
                            onClick={() => handleToggleTask(task.id)}
                            className={`bg-white p-5 rounded-[28px] flex items-center justify-between shadow-sm border-2 ${isCompleted ? 'border-transparent opacity-50 bg-gray-50' : 'border-white hover:border-pink-200'} cursor-pointer`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-500' : 'bg-pink-100 text-pink-500'}`}>
                                    {isCompleted ? <CheckCircle2 size={28} /> :
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-4 h-4 bg-pink-400 rounded-full" />}
                                </div>
                                <div>
                                    <h3 className={`text-lg font-black ${isCompleted ? 'text-gray-400 line-through' : 'text-[#5D4037]'}`}>{task.title}</h3>
                                    <p className="text-xs font-bold text-gray-400">{task.timeSlot} • {task.points} 🍭</p>
                                </div>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'border-green-200 bg-green-50 text-green-500' : 'border-gray-100 text-gray-300'}`}>
                                <CheckCircle2 size={20} />
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-bg-light-pink)] font-sans relative">
            {/* Top Bar */}
            <div className="px-6 py-6 flex justify-between items-center bg-transparent z-10">
                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border-2 border-white/50">
                    <span className="text-xl">🍭</span>
                    <span className="font-black text-[#5D4037] text-lg">{coins}</span>
                </div>
                <button onClick={onLogout} className="w-10 h-10 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-[#5D4037] border-2 border-white/50">
                    <LogOut size={18} />
                </button>
            </div>

            {/* Main Area */}
            <main className="flex-1 px-5 overflow-y-auto no-scrollbar pt-2">
                <AnimatePresence mode='wait'>
                    {activeTab === 'home' && <DashboardView />}
                    {activeTab === 'plan' && <PlannerView />}
                    {activeTab === 'rewards' && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-32">
                            <h2 className="text-3xl font-black text-[#5D4037] text-center">梦幻宝库</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {rewards.map((reward, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ y: -5 }}
                                        onClick={() => handleRedeemReward(reward)}
                                        className="bg-white p-6 rounded-[32px] flex flex-col items-center gap-4 text-center border-4 border-transparent hover:border-yellow-200 shadow-sm cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="text-5xl drop-shadow-sm transform hover:scale-110 transition-transform">{reward.icon || '🎁'}</div>
                                        <div>
                                            <div className="font-black text-[#5D4037]">{reward.name}</div>
                                            <div className="text-xs font-bold text-white bg-yellow-400 px-2 py-0.5 rounded-full mt-2 inline-block shadow-sm">
                                                {reward.pointsCost} 🍭
                                            </div>
                                        </div>
                                        {coins < reward.pointsCost && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-black text-gray-400 rotate-12 backdrop-blur-[1px]">
                                                还差一点点
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                    {activeTab === 'me' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full pb-32 space-y-6 text-center">
                            <div className="w-32 h-32 bg-white rounded-[40px] shadow-xl flex items-center justify-center text-6xl border-4 border-pink-200">
                                🏆
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#5D4037]">成就殿堂</h2>
                                <p className="text-gray-400 font-bold mt-2">已连续坚持 {streak} 天</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 w-full">
                                {['🌟', '🎮', '🎨', '🚀', '🌈', '🍦'].map((icon, i) => (
                                    <div key={i} className="bg-white/50 p-4 rounded-2xl text-2xl grayscale opacity-50 border-2 border-white">{icon}</div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Nav - Floating Bubble Bar */}
            <div className="fixed bottom-6 left-6 right-6 h-20 bg-white border-4 border-white/50 rounded-[30px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex justify-around items-center z-50 px-2">
                {[
                    { id: 'home', icon: Home, label: '主岛' },
                    { id: 'plan', icon: ListTodo, label: '规划' },
                    { id: 'rewards', icon: Gift, label: '宝库' },
                    { id: 'me', icon: User, label: '档案' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AppTab)}
                        className="relative flex flex-col items-center justify-center w-16 h-full"
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="nav-pill"
                                className="absolute inset-0 bg-pink-50 rounded-[20px] m-2"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className={`relative z-10 transition-colors duration-300 ${activeTab === tab.id ? 'text-[#F472B6]' : 'text-gray-300'}`}>
                            <tab.icon size={28} strokeWidth={activeTab === tab.id ? 3 : 2.5} />
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ChildPortal;

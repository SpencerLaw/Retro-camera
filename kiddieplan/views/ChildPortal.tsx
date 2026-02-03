import React, { useState, useEffect } from 'react';
import { LogOut, CheckCircle2, Star, Trophy, Clock, Sparkles, Smile, BookOpen, LayoutGrid, Timer, Gift, User, Home, ListTodo, ShieldCheck, Plus, ArrowLeft, Medal } from 'lucide-react';
import { Task, AppTab } from '../types';

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
        if (coins < reward.cost) return;
        try {
            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'redeem_reward', token, data: { rewardId: reward.id, cost: reward.pointsCost } })
            });
            const result = await res.json();
            if (result.success) {
                setCoins(result.points);
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
                setCheckins(result.checkins);
                if (result.points !== undefined) setCoins(result.points);
            }
        } catch (err) {
            alert('😭 传送失败，请重试');
        }
    };

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center font-candy space-y-10 mesh-gradient">
            <div className="relative">
                <div className="w-24 h-24 bg-white/40 rounded-full animate-ping opacity-30"></div>
                <div className="w-24 h-24 bg-white rounded-[32px] absolute inset-0 animate-float-kawaii flex items-center justify-center shadow-2xl border-4 border-white">
                    <Sparkles className="text-[#FF6B81] animate-spin-slow" size={40} />
                </div>
            </div>
            <p className="text-3xl text-[#5D4037] opacity-50">开启梦幻星岛...</p>
        </div>
    );

    const progress = tasks.length > 0 ? Math.round((checkins.length / tasks.length) * 100) : 0;

    const DashboardView = () => (
        <div className="space-y-12 animate-in fade-in zoom-in-95 duration-1000 pb-28">
            {/* Pro Summary Dashboard - Inspired by 好学伴 */}
            <div className="kawaii-card bg-white/80 p-8 border-4 border-white shadow-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-[35px] overflow-hidden border-4 border-white shadow-xl">
                            <img src={childProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${token}`} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-candy text-[#5D4037]">{childProfile.name}的星梦基地</h1>
                            <p className="text-[10px] font-bold text-[#5D4037/40] tracking-[0.2em] uppercase mt-1">Voyage Day {streak}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: '今日专注', val: formatTime(timerSeconds), icon: '⏱️', color: '#FF6B81', action: () => alert('专注计时进行中！') },
                        { label: '今日任务', val: `${checkins.length}/${tasks.length}`, icon: '📝', color: '#B19CD9', action: () => setActiveTab('plan') },
                        { label: '完成进度', val: `${progress}%`, icon: '📈', color: '#FFA07A', action: () => setActiveTab('plan') },
                        { label: '成就奖牌', val: streak, icon: '🏆', color: '#CBC3E3', action: () => setActiveTab('me') }
                    ].map((item, i) => (
                        <div key={i} onClick={item.action} className="bg-white/80 p-4 rounded-[28px] flex flex-col items-center gap-2 border-2 border-white/50 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm">
                            <span className="text-xl">{item.icon}</span>
                            <div className="text-[14px] font-candy text-[#3E2723]">{item.val}</div>
                            <div className="text-[8px] font-bold text-[#3E2723]/40 uppercase tracking-widest">{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Core Modules Matrix - Warm Colors */}
            <div className="grid grid-cols-3 gap-5">
                {[
                    { id: 'tools', icon: Timer, label: '效率工具', color: '#FF6B81', bg: '#FF6B8120', rot: '-rotate-6', action: () => alert('🚀 专注模式准备启动！点击下方的播放按钮开始计时吧。') },
                    { id: 'plan', icon: LayoutGrid, label: '规划矩阵', color: '#B19CD9', bg: '#E6E6FA30', rot: 'rotate-3', action: () => setActiveTab('plan') },
                    { id: 'medals', icon: ShieldCheck, label: '成就中心', color: '#FFA07A', bg: '#FFB6C140', rot: '-rotate-3', action: () => setActiveTab('me') }
                ].map((mod, i) => (
                    <div
                        key={i}
                        onClick={mod.action}
                        className={`kawaii-card p-8 aspect-square flex flex-col items-center justify-center gap-6 border-white group cursor-pointer hover:scale-110 active:scale-90 transition-all shadow-[0_20px_45px_rgba(93,77,122,0.1)]`}
                        style={{ backgroundColor: mod.bg.replace('/20', '20').replace('/35', '35') }}
                    >
                        <div className={`w-20 h-20 bg-white rounded-[32px] shadow-sm flex items-center justify-center transition-all group-hover:rotate-0 ${mod.rot} border-4 border-white/50`}>
                            <mod.icon size={36} style={{ color: mod.color }} strokeWidth={2.5} />
                        </div>
                        <span className="text-base font-bold text-[#3E2723] tracking-wider">{mod.label}</span>
                    </div>
                ))}
            </div>

            {/* Sub Tools Row - Soft & Healing */}
            <div className="kawaii-card bg-white/90 p-10 flex justify-between items-center border-white shadow-2xl backdrop-blur-md">
                {[
                    { icon: Smile, label: '沟通', color: '#FF6B81', action: () => alert('🏷️ 秘密纸条：妈妈说你今天表现很棒！') },
                    { icon: Gift, label: '奖励', color: '#FFA07A', action: () => setActiveTab('rewards') },
                    { icon: Star, label: '商店', color: '#B19CD9', action: () => setActiveTab('rewards') },
                    { icon: Clock, label: '倒计时', color: '#CBC3E3', action: () => setIsTimerRunning(!isTimerRunning) },
                ].map((tool, i) => (
                    <div key={i} onClick={tool.action} className="flex flex-col items-center gap-4 group cursor-pointer">
                        <div className="w-14 h-14 bg-white rounded-[24px] flex items-center justify-center text-[#5D4D7A]/20 group-hover:shadow-lg transition-all border-4 border-transparent group-hover:border-white shadow-inner">
                            <tool.icon size={28} style={{ color: tool.color }} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-bold text-[#5D4D7A] opacity-40 uppercase tracking-[0.3em]">{tool.label}</span>
                    </div>
                ))}
            </div>

            {/* Mini Tasks Section */}
            <div className="space-y-6">
                <div className="flex justify-between items-center px-4">
                    <h3 className="text-4xl font-candy text-[#3E2723]">梦想挑战</h3>
                    <div onClick={() => setActiveTab('plan')} className="w-12 h-12 rounded-[22px] bg-white flex items-center justify-center text-[#FF6B81] shadow-xl border-4 border-white animate-float-kawaii cursor-pointer hover:scale-110 active:scale-90 transition-all">
                        <Plus size={24} strokeWidth={4} />
                    </div>
                </div>
                <div className="space-y-6">
                    {tasks.map((task, idx) => {
                        const colors = ['#FFB6C1', '#E6E6FA', '#FF6B81', '#F5EDE0'];
                        const isCompleted = checkins.includes(task.id);
                        return (
                            <div key={task.id} className="kawaii-card bg-white p-6 flex items-center justify-between border-white shadow-2xl group hover:translate-x-3 transition-all relative overflow-hidden pl-10">
                                {/* Left Side Tag - inspired by 好学伴 */}
                                <div className="absolute left-0 top-0 bottom-0 w-3 shadow-inner" style={{ backgroundColor: colors[idx % 4] }}></div>

                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-white/80 rounded-[24px] flex items-center justify-center border-4 border-white shadow-inner">
                                        {isCompleted ? <CheckCircle2 className="text-[#8DB580]" size={28} /> : <BookOpen className="text-[#5D4D7A]/20" size={24} />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-lg font-bold text-[#5D4037]">{task.title}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-[#FF6B81] uppercase tracking-[0.2em]">{task.timeSlot}</span>
                                            <span className="w-1 h-1 bg-[#5D4037]/10 rounded-full"></span>
                                            <span className="text-[9px] font-bold text-[#5D4037]/40 uppercase tracking-[0.1em]">计划: 20分钟</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="bg-[#5D4D7A]/5 px-5 py-2.5 rounded-full flex items-center gap-4 border-4 border-white shadow-inner">
                                        <div className="text-[12px] font-mono font-bold text-[#3E2723]">{formatTime(timerSeconds)}</div>
                                        <div className="flex gap-2">
                                            <div onClick={(e) => {
                                                e.stopPropagation();
                                                if (activeTaskId !== task.id) {
                                                    setTimerSeconds(0);
                                                    setActiveTaskId(task.id);
                                                    setIsTimerRunning(true);
                                                } else {
                                                    setIsTimerRunning(!isTimerRunning);
                                                }
                                            }} className={`w-8 h-8 ${activeTaskId === task.id && isTimerRunning ? 'bg-[#FFA07A]' : 'bg-[#8DB580]'} rounded-lg flex items-center justify-center text-white scale-90 hover:scale-100 transition-all cursor-pointer shadow-sm`}>
                                                <Timer size={14} />
                                            </div>
                                            <div onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }} className={`w-8 h-8 ${isCompleted ? 'bg-gray-300' : 'bg-[#FF6B81]'} rounded-lg flex items-center justify-center text-white scale-90 hover:scale-100 transition-all cursor-pointer shadow-sm`}>
                                                <CheckCircle2 size={14} />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleTask(task.id)}
                                        className={`px-8 py-3 rounded-full text-xs font-bold transition-all shadow-xl border-4 border-white ${isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-[#FF6B81] to-[#E6E6FA] text-white hover:scale-105'}`}
                                    >
                                        {isCompleted ? '已探索' : '发射'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const PlannerView = () => {
        const timeSlots = ['早晨', '上午', '下午', '晚上', '睡前'];
        const days = ['一', '二', '三', '四', '五', '六', '日'];

        return (
            <div className="space-y-8 animate-in slide-in-from-right-10 duration-700 pb-20">
                {/* View Tabs - Warm Selection */}
                <div className="flex bg-white/60 p-1.5 rounded-[22px] gap-2 shadow-inner">
                    {['今日安排', '本周规划', '成就记录'].map((t, i) => (
                        <button
                            key={i}
                            onClick={() => setPlannerTab(i)}
                            className={`flex-1 py-3 text-[12px] font-bold rounded-[18px] transition-all ${plannerTab === i ? 'bg-[#FF6B81] text-white shadow-lg' : 'text-[#5D4037] opacity-40'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* 7x5 Grid Overhaul */}
                <div className="kawaii-card bg-white p-6 overflow-hidden border-none shadow-2xl relative">
                    <div className="flex border-b border-[#4D3A29]/5 pb-4 mb-4">
                        <div className="w-14 shrink-0"></div>
                        <div className="flex-1 flex justify-around">
                            {days.map(d => (
                                <span key={d} className="text-[10px] font-bold text-[#4D3A29] opacity-40">{d}</span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {timeSlots.map(slot => (
                            <div key={slot} className="flex gap-4 items-center">
                                <div className="w-14 shrink-0 flex flex-col items-center justify-center">
                                    <div className="text-[11px] font-bold text-[#5D4037]">{slot}</div>
                                    <div className="text-[7px] font-bold text-[#B19CD9] uppercase tracking-widest mt-0.5">Time</div>
                                </div>
                                <div className="flex-1 grid grid-cols-7 gap-2">
                                    {days.map((_, i) => {
                                        const currentDayIdx = (new Date().getDay() + 6) % 7; // Map 0-6 (Sun-Sat) to 0-6 (Mon-Sun)
                                        const hasTask = i === currentDayIdx && tasks.some(t => t.timeSlot.includes(slot) || (slot === '下午' && t.timeSlot.includes('14')) || (slot === '早晨' && t.timeSlot.includes('08')));
                                        return (
                                            <div key={i} className={`aspect-[4/5] rounded-xl transition-all ${hasTask ? 'bg-[#FF6B81]/20 border-[#FF6B81]/30' : 'bg-gray-50'} flex items-center justify-center border-2 border-transparent hover:border-[#B19CD9]/20 shadow-sm relative`}>
                                                <div className={`w-2 h-2 rounded-full ${hasTask ? 'bg-[#FF6B81] animate-pulse' : 'bg-gray-200'}`}></div>
                                                {hasTask && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#FF6B81] rounded-full"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Countdown Card - Honey Wood Style */}
                <div className="bg-gradient-to-r from-[#FFA07A] to-[#FF6B81] p-8 rounded-[40px] flex items-center justify-between text-white shadow-[0_15px_35px_rgba(250,218,209,0.3)] border-b-4 border-white/20">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center ${isTimerRunning ? 'animate-pulse' : ''} border-2 border-white/30`}>
                            <Timer size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                                【{isTimerRunning ? (tasks.find(t => t.id === activeTaskId)?.title || '专注进行中') : '准备启航'}】
                            </div>
                            <div className="text-2xl font-candy tracking-[0.2em] mt-0.5">{formatTime(timerSeconds)}</div>
                        </div>
                    </div>
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="bg-white/20 w-11 h-11 rounded-[15px] flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all">
                        {isTimerRunning ? <Clock size={22} /> : <Home size={22} />}
                    </button>
                </div>

                {/* Task Checklist - Warm Detailed Cards */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-candy text-[#5D4037] px-2 flex items-center gap-3">
                        <ListTodo className="text-[#FF6B81]" size={24} /> 今日详情 ({checkins.length}/{tasks.length})
                    </h3>
                    <div className="space-y-4">
                        {tasks.map(task => {
                            const isCompleted = checkins.includes(task.id);
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`kawaii-card p-5 flex justify-between items-center transition-all duration-300 ${isCompleted ? 'bg-[#D8BFD8]/30 opacity-60' : 'bg-white'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-[22px] flex items-center justify-center transition-all ${isCompleted ? 'bg-[#D8BFD8]/40' : 'bg-white shadow-sm border-2 border-[#FF6B8120]'}`}>
                                            {isCompleted ? <CheckCircle2 size={28} className="text-[#8DB580]" /> : <div className="w-3 h-3 rounded-full bg-[#FF6B81] animate-pulse"></div>}
                                        </div>
                                        <div>
                                            <div className={`text-base font-bold ${isCompleted ? 'line-through text-[#5D4037]/40' : 'text-[#5D4037]'}`}>{task.title}</div>
                                            <div className="text-[11px] font-bold text-[#FF6B81] opacity-70 tracking-wide mt-0.5">{task.timeSlot}</div>
                                        </div>
                                    </div>
                                    {!isCompleted && (
                                        <div className="bg-[#F5EDE0] px-3 py-1.5 rounded-full text-[10px] font-bold text-[#5D4037] shadow-sm flex items-center gap-1 border-2 border-white">
                                            +{task.points} 🍭
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-1000 h-full overflow-hidden bg-[#F5EDE0]/60 relative">
            {/* Top Right Home Button */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={onLogout}
                    className="w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-[#3E2723] shadow-md border-2 border-white backdrop-blur-sm active:scale-90 transition-all"
                >
                    <Home size={18} strokeWidth={2.5} />
                </button>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 px-4 md:px-8 lg:px-12 pt-10 pb-36 overflow-y-auto no-scrollbar">
                {activeTab === 'home' && <DashboardView />}
                {activeTab === 'plan' && <PlannerView />}
                {activeTab === 'rewards' && (
                    <div className="space-y-12 animate-in slide-in-from-right-10 duration-1000 pb-20">
                        <div className="flex justify-between items-end px-4">
                            <div>
                                <h1 className="text-5xl font-candy text-[#5D4037]">梦想宝库</h1>
                                <p className="text-[12px] font-bold text-[#5D4037/40] opacity-60 uppercase tracking-[0.4em] mt-2 leading-none">Magic Reward Hub</p>
                            </div>
                            <div className="bg-white/80 px-8 py-4 rounded-[32px] flex items-center gap-4 shadow-2xl border-4 border-white">
                                <span className="text-2xl">🍭</span>
                                <span className="text-2xl font-candy text-[#5D4037]">{coins.toFixed(0)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            {rewards.length > 0 ? rewards.map((reward, i) => (
                                <div key={i} className="kawaii-card bg-white p-8 flex flex-col items-center gap-6 relative group border-white shadow-2xl hover:translate-y-[-10px] transition-all">
                                    <div className="w-20 h-20 bg-white rounded-[35px] flex items-center justify-center shadow-inner border-4 border-transparent group-hover:border-white transition-all group-hover:scale-110">
                                        <span className="text-5xl">{reward.icon || '🎁'}</span>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <div className="text-base font-bold text-[#3E2723]">{reward.name}</div>
                                        <button
                                            onClick={() => coins >= reward.pointsCost && handleRedeemReward(reward)}
                                            className={`w-full py-4 rounded-full text-[12px] font-bold transition-all shadow-xl border-4 border-white ${coins >= reward.pointsCost ? 'bg-[#FF6B81] text-white' : 'bg-gray-100/50 text-gray-300 opacity-50 cursor-not-allowed'}`}
                                        >
                                            {reward.pointsCost} 🍭 兑换
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 text-center py-20 bg-white/40 rounded-[40px] border-4 border-dashed border-white/60">
                                    <p className="text-sm text-[#3E2723] opacity-40 font-bold italic">宝库空空的，快让爸爸妈妈添加奖励吧 ~</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'me' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700 pb-20">
                        {/* Achievement Summary - Dynamic Warmth */}
                        <div className="kawaii-card bg-gradient-to-br from-[#FF6B81] to-[#FFA07A] p-10 text-white border-none shadow-3xl relative overflow-hidden">
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-white/5 rounded-full"></div>
                            <div className="relative z-10 flex flex-col items-center gap-6">
                                <div className="w-28 h-28 bg-white/20 rounded-[45px] flex items-center justify-center border-4 border-white/30 backdrop-blur-lg shadow-2xl animate-float">
                                    <Medal size={56} className="text-white drop-shadow-lg" strokeWidth={1.5} />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-3xl font-candy tracking-wider">奇旅勋章馆</h2>
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.4em] mt-2 leading-none">Total {streak} Days Streak</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="kawaii-card bg-white p-8 flex flex-col items-center gap-4 border-none shadow-xl">
                                <div className="w-16 h-16 bg-[#D99C52]/10 rounded-[24px] flex items-center justify-center text-5xl">🏆</div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-[#4D3A29]">任务之星</div>
                                    <div className="text-[9px] font-bold text-[#4D3A29] opacity-30 mt-1 uppercase tracking-tighter">100+ Tasks Done</div>
                                </div>
                            </div>
                            <div className="kawaii-card bg-white p-8 flex flex-col items-center gap-4 border-none shadow-xl opacity-30">
                                <div className="w-16 h-16 bg-gray-100 rounded-[24px] flex items-center justify-center text-5xl grayscale">💎</div>
                                <div className="text-center">
                                    <div className="text-sm font-bold text-[#4D3A29] opacity-60">自律大师</div>
                                    <div className="text-[9px] font-bold text-[#4D3A29] opacity-30 mt-1 uppercase tracking-tighter">30 Days Slam</div>
                                </div>
                            </div>
                        </div>

                        <button onClick={onLogout} className="w-full py-5 rounded-[28px] bg-white text-[#FF6B81] font-bold text-xs flex items-center justify-center gap-3 shadow-md hover:bg-[#FF6B81] hover:text-white transition-all border-4 border-white">
                            <LogOut size={18} /> 登出星梦之旅
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Tab Navigation - Pastel Bubble */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-3xl shadow-[0_-25px_60px_rgba(93,77,122,0.1)] px-8 md:px-14 lg:px-20 py-8 md:py-10 flex justify-between items-center rounded-t-[60px] z-[120] border-t-8 border-white">
                {[
                    { id: 'home', icon: Home, label: '主岛' },
                    { id: 'plan', icon: ListTodo, label: '航线' },
                    { id: 'rewards', icon: Sparkles, label: '宝库' },
                    { id: 'me', icon: User, label: '档案' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AppTab)}
                        className={`flex flex-col items-center gap-3 transition-all duration-500 relative ${activeTab === tab.id ? 'text-[#FF6B81] scale-125' : 'text-[#5D4037] opacity-20 hover:opacity-50'}`}
                    >
                        <tab.icon size={28} strokeWidth={activeTab === tab.id ? 4 : 2} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{tab.label}</span>
                        {activeTab === tab.id && (
                            <div className="absolute -bottom-4 w-2 h-2 bg-[#FF6B81] rounded-full shadow-[0_0_10px_#FF6B81]"></div>
                        )}
                    </button>
                ))}

                {/* Floating Action Button - Bubble Center */}
                <div onClick={() => setActiveTab('plan')} className="absolute top-[-40px] left-1/2 -translate-x-1/2 group">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#FF6B81] to-[#B19CD9] rounded-full shadow-[0_15px_35px_rgba(248,228,217,0.6)] flex items-center justify-center text-white border-[8px] border-white active:scale-90 transition-all cursor-pointer group-hover:scale-110 group-hover:rotate-12">
                        <Plus size={36} strokeWidth={4} />
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default ChildPortal;

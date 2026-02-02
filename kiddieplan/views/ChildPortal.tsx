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
    const [activeTab, setActiveTab] = useState<AppTab>('home');
    const [loading, setLoading] = useState(true);
    const [childProfile, setChildProfile] = useState<{ name: string; avatar: string }>({ name: '宝贝', avatar: '' });

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
                    <Sparkles className="text-[#E0C3FC] animate-spin-slow" size={40} />
                </div>
            </div>
            <p className="text-3xl text-[#5D4D7A] opacity-50">开启梦幻星岛...</p>
        </div>
    );

    const progress = tasks.length > 0 ? Math.round((checkins.length / tasks.length) * 100) : 0;

    const DashboardView = () => (
        <div className="space-y-12 animate-in fade-in zoom-in-95 duration-1000 pb-28">
            {/* Pastel Profile Header */}
            <div className="kawaii-card bg-white/40 p-10 flex items-center justify-between border-4 border-white shadow-2xl animate-float-kawaii">
                <div className="flex items-center gap-8">
                    <div className="w-24 h-24 rounded-[48px] overflow-hidden border-8 border-white shadow-2xl">
                        <img src={childProfile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${token}`} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-candy text-[#5D4D7A] tracking-tight">{childProfile.name}的梦想岛</h1>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/60 px-6 py-3 rounded-full flex items-center gap-4 shadow-sm border-4 border-white/50">
                                <span className="text-2xl">🍭</span>
                                <span className="text-3xl font-candy text-[#E0C3FC]">{coins.toFixed(0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Modules Matrix - Warm Colors */}
            <div className="grid grid-cols-3 gap-5">
                {[
                    { id: 'tools', icon: Timer, label: '效率工具', color: '#E0C3FC', bg: '#E0C3FC20', rot: '-rotate-6' },
                    { id: 'plan', icon: LayoutGrid, label: '规划矩阵', color: '#B5FFFC', bg: '#B5FFFC30', rot: 'rotate-3' },
                    { id: 'medals', icon: ShieldCheck, label: '成就中心', color: '#FFDEE9', bg: '#FFDEE940', rot: '-rotate-3' }
                ].map((mod, i) => (
                    <div
                        key={i}
                        onClick={() => mod.id === 'plan' && setActiveTab('plan')}
                        className={`kawaii-card p-8 aspect-square flex flex-col items-center justify-center gap-6 border-white group cursor-pointer hover:scale-110 active:scale-90 transition-all shadow-[0_20px_45px_rgba(93,77,122,0.1)]`}
                        style={{ backgroundColor: mod.bg.replace('/20', '20').replace('/25', '30').replace('/15', '40').replace('/10', '20') }}
                    >
                        <div className={`w-20 h-20 bg-white rounded-[32px] shadow-sm flex items-center justify-center transition-all group-hover:rotate-0 ${mod.rot} border-4 border-white/50`}>
                            <mod.icon size={36} style={{ color: mod.color }} strokeWidth={2.5} />
                        </div>
                        <span className="text-base font-bold text-[#5D4D7A] tracking-wider">{mod.label}</span>
                    </div>
                ))}
            </div>

            {/* Sub Tools Row - Soft & Healing */}
            <div className="kawaii-card bg-white/70 p-10 flex justify-between items-center border-white shadow-2xl backdrop-blur-md">
                {[
                    { icon: Smile, label: '沟通', color: '#E0C3FC' },
                    { icon: Gift, label: '奖励', color: '#FFDEE9' },
                    { icon: Star, label: '商场', color: '#B5FFFC' },
                    { icon: Clock, label: '计时', color: '#FFF9C4' },
                ].map((tool, i) => (
                    <div key={i} className="flex flex-col items-center gap-4 group cursor-pointer">
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
                    <h3 className="text-4xl font-candy text-[#5D4D7A]">梦想挑战</h3>
                    <div className="w-12 h-12 rounded-[22px] bg-white flex items-center justify-center text-[#E0C3FC] shadow-xl border-4 border-white animate-float-kawaii">
                        <Plus size={24} strokeWidth={4} />
                    </div>
                </div>
                <div className="space-y-4">
                    {tasks.slice(0, 3).map(task => (
                        <div key={task.id} className="kawaii-card bg-white p-8 flex justify-between items-center border-white shadow-xl group hover:translate-x-3 transition-all relative overflow-hidden">
                            <div className="flex items-center gap-8">
                                <div className="w-16 h-16 bg-[#B5FFFC]/20 rounded-[28px] flex items-center justify-center border-4 border-white shadow-inner">
                                    <Clock size={28} className="text-[#B5FFFC]" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-[#5D4D7A]">{task.title}</div>
                                    <div className="text-[11px] font-bold text-[#E0C3FC] tracking-[0.2em] mt-2 uppercase">{task.timeSlot}</div>
                                </div>
                            </div>
                            <button className="px-10 py-3 bg-gradient-to-r from-[#E0C3FC] to-[#B5FFFC] text-white text-sm font-bold rounded-full shadow-[0_10px_25px_rgba(224,195,252,0.3)] hover:scale-105 active:scale-95 transition-all">发射</button>
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <div className="text-center py-16 bg-white/30 rounded-[45px] border-4 border-dashed border-white/60">
                            <p className="text-sm text-[#4D3A29] opacity-20 font-bold italic">还没收到家长的密令哦 ~</p>
                        </div>
                    )}
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
                        <button key={i} className={`flex-1 py-3 text-[11px] font-bold rounded-[18px] transition-all ${i === 1 ? 'bg-[#D99C52] text-white shadow-lg' : 'text-[#4D3A29] opacity-40'}`}>
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
                                    <div className="text-[11px] font-bold text-[#4D3A29]">{slot}</div>
                                    <div className="text-[7px] font-bold text-[#D99C52]/40 uppercase tracking-widest mt-0.5">Time</div>
                                </div>
                                <div className="flex-1 grid grid-cols-7 gap-2">
                                    {days.map((_, i) => (
                                        <div key={i} className={`aspect-[4/5] rounded-xl transition-all ${i % 2 === 0 ? 'bg-[#FDF1E1]/50' : 'bg-[#FAF0ED]/50'} flex items-center justify-center border-2 border-transparent hover:border-[#D99C52]/10`}>
                                            <div className="w-2 h-2 rounded-full bg-white shadow-inner"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Countdown Card - Honey Wood Style */}
                <div className="bg-gradient-to-r from-[#D99C52] to-[#E29578] p-8 rounded-[40px] flex items-center justify-between text-white shadow-[0_15px_35px_rgba(217,156,82,0.3)] border-b-4 border-black/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse border-2 border-white/30">
                            <Timer size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest">【下午场】专注中</div>
                            <div className="text-2xl font-candy tracking-[0.2em] mt-0.5">01:44:43</div>
                        </div>
                    </div>
                    <button onClick={() => setActiveTab('home')} className="bg-white/20 w-11 h-11 rounded-[15px] flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all">
                        <ArrowLeft size={22} />
                    </button>
                </div>

                {/* Task Checklist - Warm Detailed Cards */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-candy text-[#4D3A29] px-2 flex items-center gap-3">
                        <ListTodo className="text-[#D99C52]" size={24} /> 今日详情 ({checkins.length}/{tasks.length})
                    </h3>
                    <div className="space-y-4">
                        {tasks.map(task => {
                            const isCompleted = checkins.includes(task.id);
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`kawaii-card p-5 flex justify-between items-center border-none transition-all duration-500 ${isCompleted ? 'bg-[#FFFDF2]/80 opacity-40 grayscale-[0.3]' : 'bg-white shadow-lg'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-[22px] flex items-center justify-center transition-all ${isCompleted ? 'bg-[#8DB580]/20' : 'bg-[#FFFDF2]'}`}>
                                            {isCompleted ? <CheckCircle2 size={28} className="text-[#8DB580]" /> : <div className="w-3 h-3 rounded-full bg-[#D99C52] animate-pulse"></div>}
                                        </div>
                                        <div>
                                            <div className={`text-base font-bold ${isCompleted ? 'line-through text-[#4D3A29]' : 'text-[#4D3A29]'}`}>{task.title}</div>
                                            <div className="text-[11px] font-bold text-[#D99C52] opacity-50 tracking-wide mt-0.5">{task.timeSlot}</div>
                                        </div>
                                    </div>
                                    {!isCompleted && (
                                        <div className="bg-[#FDF1E1] px-3 py-1.5 rounded-full text-[10px] font-bold text-[#D99C52] shadow-sm flex items-center gap-1">
                                            +{task.points} ☀️
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
        <div className="flex-1 flex flex-col animate-in fade-in duration-1000 h-full overflow-hidden bg-[#FFFDF2]/30">
            {/* Main Content Area */}
            <main className="flex-1 px-8 pt-10 pb-36 overflow-y-auto no-scrollbar">
                {activeTab === 'home' && <DashboardView />}
                {activeTab === 'plan' && <PlannerView />}
                {activeTab === 'rewards' && (
                    <div className="space-y-12 animate-in slide-in-from-right-10 duration-1000 pb-20">
                        <div className="flex justify-between items-end px-4">
                            <div>
                                <h1 className="text-5xl font-candy text-[#5D4D7A]">梦想宝库</h1>
                                <p className="text-[12px] font-bold text-[#A2D2FF] opacity-60 uppercase tracking-[0.4em] mt-2 leading-none">Magic Reward Hub</p>
                            </div>
                            <div className="bg-white/80 px-8 py-4 rounded-[32px] flex items-center gap-4 shadow-2xl border-4 border-white">
                                <span className="text-2xl">🍭</span>
                                <span className="text-2xl font-candy text-[#5D4D7A]">{coins.toFixed(0)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            {[
                                { name: '周末电影之夜', cost: 500, icon: '🍿', color: '#E0C3FC' },
                                { name: '额外游戏时间', cost: 200, icon: '🎮', color: '#B5FFFC' },
                                { name: '自选美味晚餐', cost: 300, icon: '🍕', color: '#FFDEE9' },
                                { name: '睡前故事延长', cost: 100, icon: '📚', color: '#FFF9C4' }
                            ].map((reward, i) => (
                                <div key={i} className="kawaii-card bg-white p-8 flex flex-col items-center gap-6 relative group border-white shadow-2xl hover:translate-y-[-10px] transition-all">
                                    <div className="w-20 h-20 bg-white rounded-[35px] flex items-center justify-center shadow-inner border-4 border-transparent group-hover:border-white transition-all group-hover:scale-110">
                                        <span className="text-5xl">{reward.icon}</span>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <div className="text-base font-bold text-[#5D4D7A]">{reward.name}</div>
                                        <button className={`w-full py-3 rounded-full text-[11px] font-bold transition-all shadow-xl border-4 border-white ${coins >= reward.cost ? 'bg-[#E0C3FC] text-white' : 'bg-gray-100/50 text-gray-300 opacity-50 cursor-not-allowed'}`}>
                                            {reward.cost} 🍭 兑换
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'me' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700 pb-20">
                        {/* Achievement Summary - Dynamic Warmth */}
                        <div className="kawaii-card bg-gradient-to-br from-[#7BB0A6] to-[#A2D2FF] p-10 text-white border-none shadow-3xl relative overflow-hidden">
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

                        <button onClick={onLogout} className="w-full py-5 rounded-[28px] bg-white text-[#D99C52] font-bold text-xs flex items-center justify-center gap-3 shadow-md hover:bg-[#D99C52] hover:text-white transition-all border-none">
                            <LogOut size={18} /> 登出星梦之旅
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Tab Navigation - Elegant & Warm */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl shadow-[0_-20px_50px_rgba(93,64,55,0.08)] px-12 py-8 flex justify-between items-center rounded-t-[50px] z-[100] border-t-2 border-white/10">
                {[
                    { id: 'home', icon: Home, label: '主页' },
                    { id: 'plan', icon: ListTodo, label: '规划' },
                    { id: 'rewards', icon: Sparkles, label: '成长' },
                    { id: 'me', icon: User, label: '我' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AppTab)}
                        className={`flex flex-col items-center gap-2 transition-all duration-300 relative ${activeTab === tab.id ? 'text-[#D99C52] scale-110' : 'text-[#4D3A29] opacity-30 group hover:opacity-100'}`}
                    >
                        <tab.icon size={26} strokeWidth={activeTab === tab.id ? 3 : 2} />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{tab.label}</span>
                        {activeTab === tab.id && <div className="absolute -bottom-2 w-1 h-1 bg-[#D99C52] rounded-full"></div>}
                    </button>
                ))}

                {/* Floating Action Button Overhaul */}
                <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 group">
                    <div className="w-16 h-16 bg-gradient-to-tr from-[#D99C52] to-[#E29578] rounded-full shadow-[0_10px_30px_rgba(217,156,82,0.4)] flex items-center justify-center text-white border-[6px] border-[#FFFDF2] active:scale-90 transition-all cursor-pointer group-hover:scale-110">
                        <Plus size={32} strokeWidth={4} />
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default ChildPortal;

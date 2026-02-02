import React, { useState, useEffect } from 'react';
import { LogOut, CheckCircle2, Star, Trophy, Clock, Sparkles, Smile, BookOpen } from 'lucide-react';
import { Task } from '../types';

interface ChildPortalProps {
    token: string;
    onLogout: () => void;
}

const ChildPortal: React.FC<ChildPortalProps> = ({ token, onLogout }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [checkins, setCheckins] = useState<string[]>([]);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

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
            }
        } catch (err) {
            alert('😭 传送失败，请重试');
        }
    };

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center font-candy space-y-6">
            <div className="relative">
                <div className="w-16 h-16 bg-pastel-yellow rounded-full animate-ping opacity-20"></div>
                <div className="w-16 h-16 bg-pastel-yellow rounded-[20px] absolute inset-0 animate-bounce flex items-center justify-center">
                    <Sparkles className="text-white" size={32} />
                </div>
            </div>
            <p className="text-2xl text-macaron opacity-50">正在寻找打卡本...</p>
        </div>
    );

    const progress = tasks.length > 0 ? Math.round((checkins.length / tasks.length) * 100) : 0;

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-700 h-full overflow-hidden">
            {/* Child Header */}
            <div className="p-8 flex justify-between items-start shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-white rounded-[35px] shadow-sm border-4 border-white overflow-hidden animate-float">
                        <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${token.substring(0, 8)}`} alt="me" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-4xl font-candy text-macaron">加油，小旅人！</h2>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-macaron shadow-sm">
                                <Trophy size={14} className="text-[#FFD2A0]" />
                                {streak} 天奇旅
                            </div>
                            <div className="flex items-center gap-1.5 bg-pastel-pink px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm">
                                <Star size={14} className="fill-white" />
                                任务达人
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={onLogout} className="w-12 h-12 kawaii-button bg-white text-macaron/20 hover:text-[#FF8BA0]">
                    <LogOut size={24} />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 px-8 pb-32 overflow-y-auto space-y-10 no-scrollbar">
                {/* Progress Visual */}
                <div className="kawaii-card bg-pastel-yellow/60 p-8 relative group overflow-hidden border-none p-0.5">
                    <div className="p-6 bg-white/40 rounded-[38px] space-y-6">
                        <div className="flex justify-between items-end text-macaron">
                            <div className="space-y-1">
                                <h3 className="font-candy text-4xl">今日成就</h3>
                                <p className="text-[10px] font-bold tracking-widest opacity-40 uppercase">
                                    Current Progress: {progress}%
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-candy">{checkins.length}<span className="text-2xl opacity-30">/{tasks.length}</span></div>
                            </div>
                        </div>

                        {/* Progress Bar (Bubble style) */}
                        <div className="h-10 bg-white/60 rounded-full border-4 border-white shadow-inner relative overflow-hidden">
                            <div
                                className="h-full bg-pastel-pink transition-all duration-1000 ease-out relative shadow-sm"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 animate-pulse"></div>
                                {progress > 20 && (
                                    <div className="absolute inset-0 flex items-center justify-end pr-4 text-[10px] font-bold text-white tracking-widest uppercase">
                                        Keep Going!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-candy text-3xl text-macaron flex items-center gap-3">
                            <Clock className="text-[#B5FFFC]" size={28} /> 计划清单
                        </h3>
                        {progress === 100 && tasks.length > 0 && (
                            <div className="flex items-center gap-2 text-pastel-pink animate-bounce">
                                <Smile size={20} strokeWidth={3} />
                                <span className="text-xs font-bold uppercase tracking-widest">Grand Slam!</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        {tasks.map(task => {
                            const isCompleted = checkins.includes(task.id);
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`w-full kawaii-card p-6 flex items-center justify-between transition-all active:scale-95 group border-none ${isCompleted ? 'bg-white/40 opacity-50 grayscale-[0.5]' : 'bg-white shadow-lg hover:translate-y-[-2px]'}`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-[25px] flex items-center justify-center transition-all bg-pastel-blue/10 border-4 border-white ${isCompleted ? 'bg-pastel-pink/20' : 'group-hover:bg-pastel-blue/20 rotate-[-3deg]'}`}>
                                            {isCompleted ? <CheckCircle2 size={36} className="text-pastel-pink" strokeWidth={3} /> : <div className="w-3 h-3 bg-pastel-blue rounded-full animate-pulse"></div>}
                                        </div>
                                        <div className="text-left space-y-1">
                                            <div className="text-[11px] font-bold text-macaron opacity-30 uppercase tracking-[0.2em]">{task.timeSlot}</div>
                                            <div className={`text-2xl font-bold ${isCompleted ? 'line-through text-macaron opacity-20' : 'text-macaron'}`}>{task.title}</div>
                                        </div>
                                    </div>
                                    {task.isRequired && !isCompleted && (
                                        <div className="bg-pastel-pink text-white text-[9px] font-bold px-4 py-2 rounded-full border-2 border-white shadow-sm uppercase tracking-widest">
                                            必做
                                        </div>
                                    )}
                                </button>
                            );
                        })}

                        {tasks.length === 0 && (
                            <div className="text-center py-24 space-y-6 grayscale-[0.4] opacity-30">
                                <div className="w-32 h-32 bg-white/40 rounded-full mx-auto flex items-center justify-center border-4 border-dashed border-white">
                                    <BookOpen size={64} className="text-macaron" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-candy text-3xl">暂无任务</p>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Sweet Dream Waiting...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Encouragement */}
                <div className="kawaii-card p-6 bg-white/30 border-2 border-dashed border-white text-center">
                    <p className="text-macaron opacity-40 text-xs font-bold italic">
                        💖 每一次打卡，都是通往梦想的小脚印。
                    </p>
                </div>
            </main>

            {/* Achievement Toast (Grand Slam) */}
            {progress === 100 && tasks.length > 0 && (
                <div className="fixed bottom-12 left-0 right-0 pointer-events-none flex justify-center z-50">
                    <div className="kawaii-card bg-pastel-pink/90 px-10 py-5 shadow-2xl animate-in slide-in-from-bottom-24 duration-700 flex items-center gap-6 border-4 border-white">
                        <div className="text-5xl animate-bounce">🍦</div>
                        <div className="text-left">
                            <div className="font-candy text-3xl text-white">大满贯达成！</div>
                            <div className="text-[10px] font-bold text-white opacity-60 uppercase tracking-widest">You are absolutely amazing!</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildPortal;

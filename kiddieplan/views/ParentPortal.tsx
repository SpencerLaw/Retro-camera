import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Calendar, Gift, Settings, Clock, ArrowLeft, Trophy, AlertCircle, Save, Sparkles } from 'lucide-react';
import { Child, Task } from '../types';

interface ParentPortalProps {
    token: string;
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ token, onLogout }) => {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'children' | 'tasks' | 'rewards'>('children');
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

    // Task Editor State
    const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        if (selectedChildId && activeTab === 'tasks') {
            fetchTasks();
        }
    }, [selectedChildId, activeTab]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_config', token })
            });
            const result = await res.json();
            if (result.success) {
                setChildren(result.data.children || []);
                if (result.data.children?.length > 0 && !selectedChildId) {
                    setSelectedChildId(result.data.children[0].id);
                }
            }
        } catch (err) {
            console.error('Fetch failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchTasks = async () => {
        if (!selectedChildId) return;
        try {
            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_today_data', token: btoa(`child:${selectedChildId}`) })
            });
            const result = await res.json();
            if (result.success) {
                setCurrentTasks(result.data.tasks || []);
            }
        } catch (err) {
            console.error('Fetch tasks failed');
        }
    };

    const handleSaveTasks = async () => {
        if (!selectedChildId) return;
        setIsSaving(true);
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'publish_tasks',
                    token,
                    data: { childId: selectedChildId, tasks: currentTasks, date: today }
                })
            });
            const result = await res.json();
            if (result.success) {
                alert('✨ 任务同步成功！孩子可以开始打卡啦 ~');
            }
        } catch (err) {
            alert('保存失败，请检查网络');
        } finally {
            setIsSaving(false);
        }
    };

    const addTask = () => {
        const title = prompt('任务名称？');
        if (!title) return;
        const time = prompt('打卡时间点？', '08:30') || '08:30';
        const newTask: Task = {
            id: `t_${Date.now()}`,
            title,
            timeSlot: time,
            points: 10,
            completed: false,
            isRequired: true,
            date: new Date().toISOString().split('T')[0]
        };
        setCurrentTasks([...currentTasks, newTask]);
    };

    const removeTask = (id: string) => {
        setCurrentTasks(currentTasks.filter(t => t.id !== id));
    };

    const handleAddChild = async () => {
        const name = prompt('请输入小宝贝的妮称：');
        if (!name) return;
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();

        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_child',
                    token,
                    data: { name, avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`, roomCode }
                })
            });
            const result = await res.json();
            if (result.success) {
                setChildren(result.data.children);
                alert(`🌈 添加成功！记得告诉孩子房间码：${roomCode}`);
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('添加失败');
        }
    };

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center font-candy space-y-4">
            <div className="w-12 h-12 bg-pastel-purple rounded-full animate-bounce"></div>
            <p className="text-xl text-macaron opacity-50">开启梦幻面板...</p>
        </div>
    );

    const selectedChild = children.find(c => c.id === selectedChildId);

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 h-full overflow-hidden">
            {/* Header */}
            <div className="p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-3xl flex items-center justify-center shadow-sm border-2 border-white">
                        <Settings className="text-[#E0C3FC]" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-candy text-macaron">家长管理端</h1>
                        <span className="text-[8px] font-bold text-macaron/30 -mt-1 tracking-widest uppercase">Love is Growth</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab !== 'children' && (
                        <button onClick={() => setActiveTab('children')} className="w-10 h-10 kawaii-button bg-white text-macaron">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <button onClick={onLogout} className="w-10 h-10 kawaii-button bg-white text-macaron hover:text-[#FF8BA0]">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 px-6 pb-28 overflow-y-auto space-y-8 no-scrollbar">

                {activeTab === 'children' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        {/* Children Selector */}
                        <div className="kawaii-card bg-white/40 p-6 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-macaron opacity-40 uppercase tracking-widest">我的宝贝们 ({children.length}/3)</h3>
                                {children.length < 3 && (
                                    <button onClick={handleAddChild} className="flex items-center gap-1 text-[10px] font-bold text-macaron bg-white px-3 py-1.5 rounded-full shadow-sm hover:scale-105 transition-all">
                                        <Plus size={12} strokeWidth={3} /> 添加成员
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-8 overflow-x-auto py-2 no-scrollbar">
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedChildId(child.id)}
                                        className={`flex flex-col items-center gap-3 min-w-[80px] transition-all transform ${selectedChildId === child.id ? 'scale-110' : 'opacity-40 grayscale-[0.5]'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-[35px] overflow-hidden border-4 shadow-sm ${selectedChildId === child.id ? 'border-white bg-pastel-yellow' : 'border-transparent bg-white'}`}>
                                            <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-xs font-bold text-macaron">{child.name}</span>
                                    </button>
                                ))}
                                {children.length === 0 && (
                                    <div className="flex-1 text-center py-8 bg-white/30 rounded-[30px] border-2 border-dashed border-white">
                                        <p className="text-xs text-macaron/40 font-bold italic">开启第一个成长日记吧 ~</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedChild && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                {/* Kid Stats */}
                                <div className="kawaii-card bg-pastel-blue/60 p-6 flex justify-between items-center relative overflow-hidden group">
                                    <div className="absolute -right-6 -bottom-6 opacity-10 blur-sm group-hover:rotate-12 transition-transform">
                                        <Trophy size={140} className="text-white" />
                                    </div>
                                    <div className="relative z-10 space-y-1">
                                        <div className="text-[8px] font-bold text-macaron opacity-40 uppercase tracking-widest">进入房间码</div>
                                        <div className="text-5xl font-candy text-macaron tracking-widest bg-white/40 px-4 py-2 rounded-2xl">
                                            {selectedChild.roomCode}
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10 space-y-1">
                                        <div className="text-[8px] font-bold text-macaron opacity-40 uppercase tracking-widest">成长总积分</div>
                                        <div className="text-3xl font-candy text-macaron flex items-center justify-end gap-1">
                                            {selectedChild.points || 0} <span className="text-xs">🍬</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Buttons */}
                                <div className="grid grid-cols-2 gap-6">
                                    <button
                                        onClick={() => setActiveTab('tasks')}
                                        className="kawaii-button aspect-square flex-col gap-4 bg-white hover:bg-white/80"
                                    >
                                        <div className="w-16 h-16 bg-pastel-purple rounded-[25px] flex items-center justify-center shadow-sm">
                                            <Calendar className="text-white" size={32} />
                                        </div>
                                        <span className="text-sm font-bold text-macaron">任务清单</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rewards')}
                                        className="kawaii-button aspect-square flex-col gap-4 bg-white hover:bg-white/80"
                                    >
                                        <div className="w-16 h-16 bg-pastel-orange rounded-[25px] flex items-center justify-center shadow-sm">
                                            <Gift className="text-white" size={32} />
                                        </div>
                                        <span className="text-sm font-bold text-macaron">奖励愿望</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tasks' && selectedChild && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-10">
                        <div className="flex justify-between items-end px-2">
                            <div>
                                <h2 className="text-3xl font-candy text-macaron">今日任务单</h2>
                                <p className="text-[8px] font-bold text-macaron opacity-40 uppercase mt-1">Daily Checklist for {selectedChild.name}</p>
                            </div>
                            <button onClick={addTask} className="kawaii-button bg-pastel-pink px-5 py-2.5 flex items-center gap-1 text-xs text-white">
                                <Plus size={16} strokeWidth={3} /> 新增
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentTasks.map(task => (
                                <div key={task.id} className="kawaii-card bg-white p-5 flex justify-between items-center group border-none">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-pastel-blue/20 rounded-2xl flex items-center justify-center">
                                            <Clock size={18} className="text-macaron opacity-40" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-macaron">{task.title}</div>
                                            <div className="text-[10px] font-bold text-macaron opacity-30 flex items-center gap-2">
                                                <span>{task.timeSlot}</span>
                                                <span className="w-1 h-1 bg-macaron opacity-10 rounded-full"></span>
                                                <span className="text-[#F9F1A5] drop-shadow-sm font-bold">+{task.points} 🍬</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeTask(task.id)} className="w-10 h-10 kawaii-button bg-white text-macaron/20 hover:text-[#FF8BA0] group-hover:opacity-100 transition-all opacity-0">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {currentTasks.length === 0 && (
                                <div className="py-24 text-center space-y-4">
                                    <div className="w-20 h-20 bg-white/30 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-white">
                                        <Sparkles size={32} className="text-macaron opacity-20" />
                                    </div>
                                    <p className="text-sm text-macaron opacity-30 font-bold italic">点击上方“新增”按钮开始吧 ~</p>
                                </div>
                            )}
                        </div>

                        {currentTasks.length > 0 && (
                            <button
                                onClick={handleSaveTasks}
                                disabled={isSaving}
                                className="w-full kawaii-button bg-pastel-purple py-6 text-white text-xl font-candy active:scale-95 transition-all disabled:opacity-50 mt-10"
                            >
                                {isSaving ? <Sparkles className="animate-spin" /> : <><Save size={24} className="mr-2" /> 同步给宝贝</>}
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'rewards' && (
                    <div className="py-32 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-white/40 rounded-full mx-auto flex items-center justify-center mb-6 border-2 border-dashed border-white">
                            <Gift size={40} className="text-macaron opacity-10" />
                        </div>
                        <h3 className="text-2xl font-candy text-macaron opacity-20">奖池功能正在装修中...</h3>
                        <p className="text-[10px] font-bold text-macaron opacity-10 uppercase mt-2">Coming in next dream</p>
                    </div>
                )}
            </main>

            {/* Hint Footer */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-xs">
                <div className="kawaii-card bg-white/90 px-6 py-3 flex items-center gap-3 shadow-xl animate-float border-2 border-white">
                    <AlertCircle size={18} className="text-[#FFDEE9]" />
                    <span className="text-[10px] font-bold text-macaron opacity-60">给孩子适当的自由，自律会更持久哦 ~</span>
                </div>
            </div>
        </div>
    );
};

export default ParentPortal;

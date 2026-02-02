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

    // Custom Dialog State
    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        title: string;
        placeholder: string;
        onConfirm: (val: string) => void;
        defaultValue?: string;
        message?: string;
        highlight?: string;
        hideInput?: boolean;
    }>({
        isOpen: false,
        title: '',
        placeholder: '',
        onConfirm: () => { }
    });

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
                setDialogConfig({
                    isOpen: true,
                    title: '✨ 同步成功！',
                    placeholder: '',
                    message: '所有的奇幻任务都已经准备就绪，孩子可以开始打卡啦 ~',
                    onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                    hideInput: true
                });
            }
        } catch (err) {
            alert('保存失败，请检查网络');
        } finally {
            setIsSaving(false);
        }
    };

    const addTask = (title?: string, time?: string, points?: number) => {
        if (title) {
            // Template usage
            const newTask: Task = {
                id: `t_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                title,
                timeSlot: time || '08:30',
                points: points || 10,
                completed: false,
                isRequired: true,
                date: new Date().toISOString().split('T')[0]
            };
            setCurrentTasks(prev => [...prev, newTask]);
        } else {
            // Manual add
            setDialogConfig({
                isOpen: true,
                title: '✨ 开启新任务',
                placeholder: '输入任务名称，例如：阅读30分钟',
                onConfirm: (val) => {
                    if (!val) return;
                    const newTask: Task = {
                        id: `t_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        title: val,
                        timeSlot: '08:00',
                        points: 10,
                        completed: false,
                        isRequired: true,
                        date: new Date().toISOString().split('T')[0]
                    };
                    setCurrentTasks(prev => [...prev, newTask]);
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        }
    };

    const taskTemplates = [
        { title: '☀️ 早起洗漱', time: '07:30', points: 10, icon: '🦷' },
        { title: '📖 晨读时间', time: '08:30', points: 20, icon: '📚' },
        { title: '✍️ 完成作业', time: '14:00', points: 30, icon: '📝' },
        { title: '🧸 整理玩具', time: '18:00', points: 15, icon: '🧸' },
        { title: '🥛 睡前牛奶', time: '20:30', points: 10, icon: '🥛' },
        { title: '🌙 准时睡觉', time: '21:00', points: 20, icon: '🛌' },
    ];

    const removeTask = (id: string) => {
        setCurrentTasks(currentTasks.filter(t => t.id !== id));
    };

    const handleAddChild = async () => {
        setDialogConfig({
            isOpen: true,
            title: '🌈 欢迎新成员',
            placeholder: '请输入小宝贝的昵称',
            onConfirm: async (name) => {
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
                        setDialogConfig({
                            isOpen: true,
                            title: '🌈 添加成功！',
                            placeholder: '',
                            message: `宝贝的任务日记已开通，记得告诉孩子房间码：`,
                            highlight: roomCode,
                            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                            hideInput: true
                        });
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    alert('添加失败');
                }
            }
        });
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
                        <h1 className="text-2xl font-candy text-macaron">星梦奇旅</h1>
                        <span className="text-[8px] font-bold text-macaron/30 -mt-1 tracking-widest uppercase">Love & Growth Diary</span>
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
                            {currentTasks.length === 0 ? (
                                <div className="space-y-8 py-10">
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 bg-white/30 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-white">
                                            <Sparkles size={32} className="text-macaron opacity-20" />
                                        </div>
                                        <p className="text-sm text-macaron opacity-30 font-bold italic">点击上方“新增”或使用下方模板：</p>
                                    </div>

                                    {/* Template Gallery */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {taskTemplates.map((tmp, i) => (
                                            <button
                                                key={i}
                                                onClick={() => addTask(tmp.title, tmp.time, tmp.points)}
                                                className="kawaii-card bg-white/60 p-4 flex flex-col items-center gap-2 hover:bg-pastel-yellow/40 transition-all border-none group"
                                            >
                                                <span className="text-2xl group-hover:scale-125 transition-transform">{tmp.icon}</span>
                                                <span className="text-[10px] font-bold text-macaron">{tmp.title}</span>
                                                <span className="text-[8px] font-bold text-macaron opacity-30">{tmp.time} • {tmp.points}🍬</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none mt-10">
                                    <div className="col-span-2 text-[10px] font-bold text-macaron opacity-30 uppercase tracking-widest text-center">更多灵感模板</div>
                                    {taskTemplates.slice(0, 4).map((tmp, i) => (
                                        <div key={i} className="kawaii-card bg-white/20 p-3 flex items-center gap-3 grayscale">
                                            <span className="text-lg">{tmp.icon}</span>
                                            <span className="text-[9px] font-bold text-macaron">{tmp.title}</span>
                                        </div>
                                    ))}
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
                    <span className="text-[10px] font-bold text-macaron opacity-60">
                        {[
                            "给孩子适当的自由，自律会更持久哦 ~",
                            "每一个小勋章，都是成长的里程碑 ✨",
                            "多一点耐心，梦幻岛的果实也会更甜 🍬",
                            "陪伴是最好的奖励，别忘了抱抱TA 💖",
                            "自律的背后，是宝贝对生活的热爱 🌈"
                        ][Math.floor(Date.now() / 3600000) % 5]}
                    </span>
                </div>
            </div>

            {/* Custom Dialog */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-macaron/20 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}></div>
                    <div className="kawaii-card bg-white w-full max-w-sm p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 border-4 border-pastel-purple/10">
                        <div className="text-center">
                            <h3 className="text-2xl font-candy text-macaron">{dialogConfig.title}</h3>
                            {dialogConfig.message && (
                                <p className="text-[10px] font-bold text-macaron/60 mt-2 leading-relaxed">
                                    {dialogConfig.message}
                                </p>
                            )}
                            {dialogConfig.highlight && (
                                <div className="text-5xl font-candy text-macaron tracking-widest bg-pastel-yellow/30 px-4 py-3 rounded-2xl mt-4 animate-bounce">
                                    {dialogConfig.highlight}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {!dialogConfig.hideInput && (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder={dialogConfig.placeholder}
                                    className="w-full px-6 py-4 rounded-3xl bg-pastel-purple/5 border-2 border-transparent focus:border-pastel-purple outline-none font-bold text-macaron transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            dialogConfig.onConfirm((e.target as HTMLInputElement).value);
                                        }
                                    }}
                                />
                            )}
                            <div className="flex gap-4">
                                {!dialogConfig.hideInput && (
                                    <button
                                        onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 py-4 text-macaron opacity-40 font-bold hover:opacity-100 transition-all"
                                    >
                                        取消
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement);
                                        dialogConfig.onConfirm(input?.value || '');
                                    }}
                                    className="flex-1 py-4 bg-pastel-purple text-white rounded-2xl font-candy text-lg shadow-lg hover:bg-macaron transition-all"
                                >
                                    {dialogConfig.hideInput ? '太棒了!' : '确定'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPortal;

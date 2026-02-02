import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Plus, Trash2, Calendar, Gift, Settings, Clock, ArrowLeft, Trophy, AlertCircle, Save, Sparkles, LayoutGrid, Edit2, Star, ListTodo } from 'lucide-react';
import { Child, Task, Reward, TaskCategory } from '../types';
import { TASK_TEMPLATES, DEFAULT_REWARDS } from '../constants/templates';

interface ParentPortalProps {
    token: string;
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ token, onLogout }) => {
    const [children, setChildren] = useState<Child[]>([]);
    const [licenseData, setLicenseData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'children' | 'tasks' | 'rewards' | 'registry'>('children');
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

    // Custom Dialog State
    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        title: string;
        placeholder: string;
        onConfirm: (val: string, extra?: string) => void;
        defaultValue?: string;
        defaultExtra?: string;
        showTime?: boolean;
        showAvatarUpload?: boolean;
        message?: string;
        highlight?: string;
        hideInput?: boolean;
    }>({
        isOpen: false,
        title: '',
        placeholder: '',
        onConfirm: () => { }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [currentAvatar, setCurrentAvatar] = useState<string>('');

    // Task/Reward Editor State
    const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<TaskCategory>(TaskCategory.STUDY);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        if (selectedChildId) {
            if (activeTab === 'tasks') fetchTasks();
            if (activeTab === 'rewards') fetchRewards();
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
                setLicenseData(result.data);
                const childrenList = result.data.children || [];
                setChildren(childrenList);
                if (childrenList.length > 0 && !selectedChildId) {
                    setSelectedChildId(childrenList[0].id);
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

    const fetchRewards = async () => {
        if (!selectedChildId) return;
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_rewards', token, data: { childId: selectedChildId } })
            });
            const result = await res.json();
            if (result.success) {
                setRewards(result.data.rewards || DEFAULT_REWARDS);
            }
        } catch (err) {
            console.error('Fetch rewards failed');
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
                    message: '所有的奇律任务都已经准备就绪，孩子可以开始挑战啦 ~',
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

    const handleSaveRewards = async () => {
        if (!selectedChildId) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_rewards',
                    token,
                    data: { childId: selectedChildId, rewards }
                })
            });
            const result = await res.json();
            if (result.success) {
                setDialogConfig({
                    isOpen: true,
                    title: '🎁 奖励已同步',
                    placeholder: '',
                    message: '你设定的“成长银行”奖励项已更新，快去鼓励孩子吧！',
                    onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                    hideInput: true
                });
            }
        } catch (err) {
            alert('同步失败');
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
                onConfirm: (val, time) => {
                    if (!val) return;
                    const newTask: Task = {
                        id: `t_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        title: val,
                        timeSlot: time || '08:00',
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

    const handleAddReward = () => {
        setDialogConfig({
            isOpen: true,
            title: '🎁 新增奖励项',
            placeholder: '输入奖励名称，如：带你去游乐园',
            onConfirm: (name) => {
                if (!name) return;
                const costStr = prompt('所需成长币？', '500');
                if (!costStr) return;
                const newReward: Reward = {
                    id: `r_${Date.now()}`,
                    name,
                    pointsCost: parseInt(costStr) || 100,
                    icon: '🎁'
                };
                setRewards(prev => [...prev, newReward]);
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const editTask = (task: Task) => {
        setDialogConfig({
            isOpen: true,
            title: '📝 编辑任务',
            message: `修改“${task.title}”的设置`,
            placeholder: '任务名称',
            defaultValue: task.title,
            defaultExtra: task.timeSlot,
            showTime: true,
            onConfirm: (newTitle, newTime) => {
                if (!newTitle) return;
                setCurrentTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: newTitle, timeSlot: newTime || t.timeSlot } : t));
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const removeReward = (id: string) => {
        setRewards(prev => prev.filter(r => r.id !== id));
    };

    const processImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = Math.min(img.width, img.height);
                    canvas.width = 256;
                    canvas.height = 256;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 256, 256);
                    canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.8);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const webpBlob = await processImage(file);
            const res = await fetch(`/api/kiddieplan/upload?filename=avatar_${Date.now()}.webp`, {
                method: 'POST',
                headers: { 'Content-Type': 'image/webp' },
                body: webpBlob
            });
            const result = await res.json();
            if (result.success) {
                setCurrentAvatar(result.url);
            }
        } catch (err) {
            alert('头像上传失败');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeTask = (id: string) => {
        setCurrentTasks(currentTasks.filter(t => t.id !== id));
    };

    const handleAddChild = async () => {
        setCurrentAvatar(`https://api.dicebear.com/7.x/adventurer/svg?seed=${Date.now()}`);
        setDialogConfig({
            isOpen: true,
            title: '🌈 欢迎新成员',
            placeholder: '请输入小宝贝的昵称',
            showAvatarUpload: true,
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
                            data: { name, avatar: currentAvatar, roomCode }
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

    const handleEditChild = () => {
        if (!selectedChild) return;
        setCurrentAvatar(selectedChild.avatar);
        setDialogConfig({
            isOpen: true,
            title: '✨ 修改宝贝资料',
            placeholder: '小宝贝的昵称',
            defaultValue: selectedChild.name,
            showAvatarUpload: true,
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    const res = await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_child',
                            token,
                            data: { ...selectedChild, name, avatar: currentAvatar }
                        })
                    });
                    const result = await res.json();
                    if (result.success) {
                        setChildren(result.data.children);
                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    }
                } catch (err) {
                    alert('修改失败');
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
        <div className="flex-1 flex flex-col animate-in fade-in duration-1000 h-full overflow-hidden mesh-gradient">
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
            {/* Header - Pastel Floating Style */}
            <div className="p-8 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white rounded-[28px] flex items-center justify-center shadow-xl border-4 border-white animate-float-kawaii">
                        <Settings className="text-[#E0C3FC] animate-spin-slow" size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-candy text-[#5D4D7A] tracking-tight">星梦奇旅</h1>
                        <p className="text-[10px] font-bold text-[#A2D2FF] mt-1 tracking-[0.3em] uppercase">Dream Maker Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('registry')} className={`w-12 h-12 kawaii-button bg-white text-[#5D4D7A] shadow-lg border-none active:scale-95 ${activeTab === 'registry' ? 'ring-4 ring-[#E0C3FC]' : ''}`}>
                        <LayoutGrid size={22} className={activeTab === 'registry' ? 'text-[#E0C3FC]' : ''} />
                    </button>
                    {activeTab !== 'children' && activeTab !== 'registry' && (
                        <button onClick={() => setActiveTab('children')} className="w-12 h-12 kawaii-button bg-white text-[#5D4D7A] border-white shadow-lg active:scale-90">
                            <ArrowLeft size={22} />
                        </button>
                    )}
                    <button onClick={onLogout} className="w-12 h-12 kawaii-button bg-[#FFDEE9] text-white border-white shadow-lg hover:scale-105 active:scale-90 transition-all">
                        <LogOut size={22} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 px-6 pb-28 overflow-y-auto space-y-8 no-scrollbar">

                {activeTab === 'children' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        {/* Children Selector - Organic Card */}
                        <div className="kawaii-card bg-white/60 p-8 space-y-8 border-[#D99C52]/5 shadow-xl">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[11px] font-bold text-[#5D4D7A] opacity-40 uppercase tracking-[0.3em]">我的宝贝们 ({children.length}/3)</h3>
                                {children.length < 3 && (
                                    <button onClick={handleAddChild} className="flex items-center gap-2 text-[10px] font-bold text-white bg-[#B5FFFC] px-5 py-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-white">
                                        <Plus size={16} strokeWidth={4} /> 添加成员
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-14 overflow-x-auto py-6 no-scrollbar min-h-[160px]">
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedChildId(child.id)}
                                        className={`flex flex-col items-center gap-6 min-w-[110px] transition-all transform duration-500 relative ${selectedChildId === child.id ? 'scale-110' : 'opacity-40 grayscale-[0.3]'}`}
                                    >
                                        <div className={`w-28 h-28 rounded-[48px] overflow-hidden border-4 shadow-2xl transition-all relative ${selectedChildId === child.id ? 'border-[#E0C3FC] scale-105' : 'border-white opacity-40'}`}>
                                            <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                                            {/* Plus Icon Overlay for Selected */}
                                            {selectedChildId === child.id && (
                                                <div className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#E0C3FC] animate-in zoom-in-50 duration-300">
                                                    <Plus size={18} className="text-[#E0C3FC]" strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-sm font-bold tracking-wide ${selectedChildId === child.id ? 'text-[#E0C3FC]' : 'text-[#5D4D7A]'}`}>{child.name}</span>
                                    </button>
                                ))}
                                {children.length === 0 && (
                                    <div className="flex-1 text-center py-10 bg-white/40 rounded-[45px] border-4 border-dashed border-white/60">
                                        <p className="text-xs text-[#4D3A29] opacity-30 font-bold italic">开启第一个成长日记吧 ~</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedChild && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                {/* Kid Stats - Warm Gradient */}
                                <div className="kawaii-card bg-gradient-to-br from-[#E0C3FC] to-[#B5FFFC] p-10 flex justify-between items-center relative overflow-hidden group border-4 border-white shadow-2xl animate-float-kawaii">
                                    <div className="absolute -right-10 -bottom-10 opacity-30 blur-sm group-hover:rotate-45 group-hover:scale-125 transition-all duration-1000">
                                        <Star size={200} className="text-white fill-white" />
                                    </div>
                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="text-[10px] font-bold text-white uppercase tracking-[0.4em] drop-shadow-md">进入房间码</div>
                                            <button onClick={handleEditChild} className="bg-white/20 hover:bg-white/40 text-white px-3 py-1 rounded-full text-[9px] font-bold transition-all border border-white/30 backdrop-blur-md flex items-center gap-1.5 active:scale-90">
                                                <Edit2 size={10} /> 修改资料
                                            </button>
                                        </div>
                                        <div className="text-6xl font-candy text-white tracking-[0.3em] bg-white/30 px-8 py-5 rounded-[40px] backdrop-blur-xl shadow-inner border-2 border-white/40">
                                            {selectedChild.roomCode}
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10 space-y-2">
                                        <div className="text-[9px] font-bold text-white/70 uppercase tracking-widest">成长总积分</div>
                                        <div className="text-4xl font-candy text-white flex items-center justify-end gap-2 drop-shadow-md">
                                            {selectedChild.points || 0} <span className="text-xl">☀️</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Buttons - High Contrast Warmth */}
                                <div className="grid grid-cols-2 gap-8">
                                    <button
                                        onClick={() => setActiveTab('tasks')}
                                        className="kawaii-button aspect-square flex-col gap-6 bg-white hover:bg-white/95 border-none shadow-xl"
                                    >
                                        <div className="w-20 h-20 bg-white rounded-[35px] flex items-center justify-center shadow-xl border-4 border-white bg-gradient-to-tr from-[#E0C3FC] to-[#B5FFFC]">
                                            <Calendar className="text-[#5D4D7A]" size={40} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-base font-bold text-[#5D4D7A] tracking-wider uppercase">任务分配</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rewards')}
                                        className="kawaii-button aspect-square flex-col gap-6 bg-white hover:bg-white/95 border-none shadow-xl"
                                    >
                                        <div className="w-20 h-20 bg-white rounded-[35px] flex items-center justify-center shadow-xl border-4 border-white bg-gradient-to-tr from-[#FFDEE9] to-[#FFF9C4]">
                                            <Gift className="text-[#5D4D7A]" size={40} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-base font-bold text-[#5D4D7A] tracking-wider uppercase">奖励愿望</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tasks' && selectedChild && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-10">
                        <div className="flex justify-between items-end px-2">
                            <div className="flex flex-col">
                                <h2 className="text-4xl font-candy text-[#5D4D7A]">任务分配</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-[10px] font-bold text-[#E0C3FC] uppercase tracking-[0.3em] leading-none">Space Registry for {selectedChild.name}</p>
                                    <button onClick={handleEditChild} className="text-[#E0C3FC] opacity-40 hover:opacity-100 transition-all p-1.5 -m-1.5">
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => addTask()} className="kawaii-button bg-[#B5FFFC] px-8 py-4 flex items-center gap-2 text-sm text-[#5D4D7A] border-white shadow-xl hover:scale-105 active:scale-90">
                                <Plus size={20} strokeWidth={4} /> 手动添加
                            </button>
                        </div>

                        {/* Template Library - Soft Selection */}
                        <div className="space-y-6">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2 scroll-smooth">
                                {Object.values(TaskCategory).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-8 py-4 rounded-[30px] text-[11px] font-bold transition-all whitespace-nowrap border-4 ${selectedCategory === cat ? 'bg-[#E0C3FC] text-white border-white shadow-xl scale-105' : 'bg-white text-[#5D4D7A] border-white/50 opacity-60 hover:opacity-100 shadow-sm'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {TASK_TEMPLATES.find(t => t.category === selectedCategory)?.tasks.map((tmp, i) => (
                                    <button
                                        key={i}
                                        onClick={() => addTask(tmp.title, tmp.time, tmp.points)}
                                        className="kawaii-card bg-white p-6 flex items-center gap-5 hover:bg-[#B5FFFC]/30 transition-all border-white shadow-md group"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-inner border-2 border-[#E0C3FC]/10 group-hover:scale-110 transition-transform">
                                            {tmp.icon}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-base font-bold text-[#5D4D7A]">{tmp.title}</div>
                                            <div className="text-[10px] font-bold text-[#B5FFFC] opacity-80 uppercase tracking-widest mt-1">{tmp.time} • {tmp.points} 🍭</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-[#5D4D7A]/5 my-10 relative">
                            <div className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white/40 backdrop-blur-sm px-4 text-[8px] font-bold text-[#5D4D7A]/20 uppercase tracking-[0.4em]">Review List</div>
                        </div>

                        {/* Current Task Session - Cozy Cards */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-[#5D4D7A] opacity-40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <ListTodo size={12} /> 待发布任务 ({currentTasks.length})
                            </h3>
                            {currentTasks.map(task => (
                                <div key={task.id} className="kawaii-card bg-white p-6 flex justify-between items-center group border-white shadow-xl hover:translate-x-3 transition-transform">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-[#B5FFFC]/20 rounded-[24px] flex items-center justify-center border-2 border-white shadow-inner">
                                            <Clock size={24} className="text-[#B5FFFC]" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#5D4D7A] text-lg">{task.title}</div>
                                            <div className="text-[12px] font-bold text-[#E0C3FC] flex items-center gap-2 mt-1">
                                                <span>{task.timeSlot}</span>
                                                <span className="w-1.5 h-1.5 bg-[#E0C3FC] opacity-40 rounded-full"></span>
                                                <span className="font-bold">{task.points} 🍭</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => editTask(task)} className="w-10 h-10 kawaii-button bg-white text-[#5D4D7A] border-none shadow-sm hover:bg-white active:scale-90 transition-all">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => removeTask(task.id)} className="w-10 h-10 kawaii-button bg-white text-[#FFDEE9] hover:text-[#FFDEE9] border-none shadow-sm hover:bg-white active:scale-90 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {currentTasks.length === 0 && (
                                <div className="text-center py-12 bg-white/20 rounded-[45px] border-4 border-dashed border-white/60">
                                    <p className="text-xs text-[#5D4D7A] opacity-20 font-bold italic">快去挑选一些充满仪式感的任务吧 ~</p>
                                </div>
                            )}
                        </div>

                        {currentTasks.length > 0 && (
                            <button
                                onClick={handleSaveTasks}
                                disabled={isSaving}
                                className="w-full kawaii-button bg-gradient-to-r from-[#E0C3FC] to-[#B5FFFC] py-8 text-white text-2xl font-candy active:scale-95 transition-all disabled:opacity-50 mt-16 shadow-[0_20px_40px_rgba(224,195,252,0.3)] border-4 border-white"
                            >
                                {isSaving ? <Sparkles className="animate-spin text-white" /> : <><Save size={28} className="mr-4" /> 同步梦想宇宙</>}
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'rewards' && selectedChild && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-10">
                        <div className="flex justify-between items-end px-2">
                            <div>
                                <h1 className="text-3xl font-candy text-[#5D4D7A] uppercase tracking-tighter">成长银行奖励项</h1>
                                <p className="text-[10px] font-bold text-[#E0C3FC] mt-1 uppercase tracking-[0.2em] leading-none">Custom Reward Market for {selectedChild.name}</p>
                            </div>
                            <button onClick={handleAddReward} className="kawaii-button bg-[#B5FFFC] px-6 py-3 flex items-center gap-2 text-xs text-[#5D4D7A] shadow-lg border-white">
                                <Plus size={18} strokeWidth={4} /> 新增奖励
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {rewards.map((reward, i) => (
                                <div key={i} className="kawaii-card bg-white p-6 flex flex-col items-center gap-4 relative group border-none shadow-md hover:shadow-xl transition-all">
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => removeReward(reward.id)} className="w-8 h-8 rounded-full bg-[#FFDEE9]/10 flex items-center justify-center text-[#FFDEE9] hover:bg-[#FFDEE9] hover:text-white transition-all shadow-sm">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="w-20 h-20 bg-white rounded-[30px] flex items-center justify-center text-5xl shadow-inner border-2 border-[#FFDEE9]/30">
                                        {reward.icon}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-base font-bold text-[#5D4D7A]">{reward.name}</div>
                                        <div className="text-[14px] font-bold text-[#E0C3FC] mt-2 flex items-center justify-center gap-1.5">
                                            {reward.pointsCost} <span className="text-[10px] uppercase opacity-60">candies 🍭</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {rewards.length > 0 && (
                            <button
                                onClick={handleSaveRewards}
                                disabled={isSaving}
                                className="w-full kawaii-button bg-gradient-to-r from-[#FFDEE9] to-[#E0C3FC] py-8 text-white text-2xl font-candy active:scale-95 transition-all disabled:opacity-50 mt-16 shadow-[0_20px_40px_rgba(255,222,233,0.3)] border-4 border-white"
                            >
                                {isSaving ? <Sparkles className="animate-spin text-white" /> : <><Save size={28} className="mr-4" /> 同步梦想宇宙</>}
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'registry' && licenseData && (
                    <div className="space-y-8 animate-in slide-in-from-top-8 duration-500 pb-20">
                        <div className="text-center space-y-2">
                            <h2 className="text-4xl font-candy text-[#5D4D7A]">全权注册大盘</h2>
                            <p className="text-[10px] font-bold text-[#A2D2FF] opacity-50 uppercase tracking-[0.4em]">Family License Master Console</p>
                        </div>

                        <div className="space-y-6">
                            {(licenseData.children || []).map((kid: any) => {
                                const today = new Date().toISOString().split('T')[0];
                                const daily = licenseData.progress?.[today]?.[kid.id] || { tasks: [], checkins: [] };
                                const completionRate = daily.tasks.length > 0 ? Math.round((daily.checkins.length / daily.tasks.length) * 100) : 0;

                                return (
                                    <div key={kid.id} className="kawaii-card bg-white/80 p-6 border-none shadow-xl flex items-center gap-6 group hover:translate-x-2 transition-transform">
                                        <div className="w-20 h-20 rounded-[30px] border-4 border-white shadow-lg overflow-hidden shrink-0">
                                            <img src={kid.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xl font-candy text-[#5D4D7A]">{kid.name}</h4>
                                                <span className="text-[10px] font-bold text-[#E0C3FC] uppercase tracking-widest">RM: {kid.roomCode}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-3 bg-[#5D4D7A]/5 rounded-full overflow-hidden border border-white">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-[#B5FFFC] to-[#E0C3FC] transition-all duration-1000"
                                                        style={{ width: `${completionRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-[#5D4D7A] opacity-40">{completionRate}%</span>
                                            </div>
                                            <div className="flex gap-4 pt-1">
                                                <div className="text-[9px] font-bold text-[#5D4D7A]/40 uppercase tracking-tighter">
                                                    任务: {daily.checkins.length}/{daily.tasks.length}
                                                </div>
                                                <div className="text-[9px] font-bold text-[#FFDEE9] uppercase tracking-tighter">
                                                    积分: {kid.points || 0} 🍭
                                                </div>
                                                <div className="text-[9px] font-bold text-[#B5FFFC] uppercase tracking-tighter">
                                                    连续: {kid.streak || 0}D
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="kawaii-card bg-gradient-to-br from-[#5D4D7A] to-[#2D1B4E] p-10 text-white border-none shadow-2xl relative overflow-hidden group border-4 border-white">
                            <div className="absolute -top-10 -right-10 opacity-10 animate-spin-slow">
                                <Sparkles size={240} fill="white" />
                            </div>
                            <div className="relative z-10 grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <div className="text-3xl font-candy font-bold">{licenseData.children?.length || 0}</div>
                                    <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">注册成员总数</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-3xl font-candy font-bold">{Object.keys(licenseData.progress || {}).length}</div>
                                    <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">已积累梦幻里程</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-3xl font-candy font-bold">
                                        {(licenseData.children || []).reduce((acc: number, c: any) => acc + (c.points || 0), 0)}
                                    </div>
                                    <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">全家成就聚宝盆</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-3xl font-candy font-bold">✨</div>
                                    <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">数据同步实时在线</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Hint Footer */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-xs">
                <div className="kawaii-card bg-white/90 px-8 py-4 flex items-center gap-4 shadow-2xl animate-float-kawaii border-4 border-white">
                    <AlertCircle size={22} className="text-[#FFDEE9]" />
                    <span className="text-[11px] font-bold text-[#5D4D7A] opacity-60">
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

            {/* Custom Dialog - Pastel Dream Style */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-[#5D4D7A]/10 backdrop-blur-xl animate-in fade-in duration-500"
                        onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}></div>
                    <div className="kawaii-card bg-white/95 w-full max-sm p-12 space-y-10 shadow-3xl animate-in zoom-in-95 duration-300 relative z-10 border-8 border-white">
                        <div className="text-center space-y-5">
                            <h3 className="text-3xl font-candy text-[#5D4D7A]">{dialogConfig.title}</h3>
                            {dialogConfig.message && (
                                <p className="text-[12px] font-bold text-[#5D4D7A]/50 leading-relaxed max-w-[280px] mx-auto">
                                    {dialogConfig.message}
                                </p>
                            )}
                            {dialogConfig.highlight && (
                                <div className="text-6xl font-candy text-[#E0C3FC] tracking-[0.2em] bg-white px-8 py-6 rounded-[40px] mt-8 animate-float-kawaii shadow-inner border-4 border-[#E0C3FC]/10">
                                    {dialogConfig.highlight}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {dialogConfig.showAvatarUpload && (
                                <div className="flex flex-col items-center gap-6 py-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-32 h-32 rounded-[48px] overflow-hidden border-8 border-white shadow-2xl bg-white cursor-pointer hover:scale-105 active:scale-95 transition-all relative group animate-float-kawaii"
                                    >
                                        <img src={currentAvatar} alt="preview" className="w-full h-full object-cover" />
                                        {/* Camera/Plus overlay */}
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                                <Plus size={24} className="text-[#E0C3FC]" strokeWidth={3} />
                                            </div>
                                        </div>
                                        {/* Floating Plus corner icon */}
                                        <div className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-[#E0C3FC] group-hover:scale-110 transition-transform">
                                            <Plus size={20} className="text-[#E0C3FC]" strokeWidth={4} />
                                        </div>
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                                <Sparkles className="text-[#E0C3FC] animate-spin" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-[#E0C3FC]/60 text-white text-[9px] font-bold py-2 opacity-0 group-hover:opacity-100 transition-all text-center backdrop-blur-sm">更换照片</div>
                                    </div>
                                    <p className="text-[11px] font-bold text-[#5D4D7A] opacity-40 flex items-center gap-2">
                                        点击上方头像库 <Plus size={12} strokeWidth={4} /> 定制梦幻头像
                                    </p>
                                </div>
                            )}
                            {!dialogConfig.hideInput && (
                                <>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={dialogConfig.placeholder}
                                        defaultValue={dialogConfig.defaultValue || ''}
                                        id="dialog-title-input"
                                        className="w-full px-8 py-5 rounded-[30px] bg-white/80 border-4 border-transparent focus:border-[#E0C3FC] outline-none font-bold text-[#5D4D7A] placeholder:text-[#5D4D7A]/20 transition-all shadow-inner backdrop-blur-md"
                                    />
                                    {dialogConfig.showTime && (
                                        <div className="space-y-3">
                                            <p className="text-[11px] font-bold text-[#E0C3FC] opacity-70 ml-5 uppercase tracking-widest">执行时间</p>
                                            <input
                                                type="time"
                                                defaultValue={dialogConfig.defaultExtra || '08:00'}
                                                id="dialog-time-input"
                                                className="w-full px-8 py-5 rounded-[30px] bg-white/80 border-4 border-transparent focus:border-[#E0C3FC] outline-none font-bold text-[#5D4D7A] transition-all shadow-inner backdrop-blur-md"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex gap-4">
                            {!dialogConfig.hideInput && (
                                <button
                                    onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-5 text-[#5D4D7A]/30 font-bold hover:opacity-100 transition-all text-sm uppercase tracking-widest"
                                >
                                    取消
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const titleInput = document.getElementById('dialog-title-input') as HTMLInputElement;
                                    const timeInput = document.getElementById('dialog-time-input') as HTMLInputElement;
                                    dialogConfig.onConfirm(titleInput?.value || '', timeInput?.value || '');
                                }}
                                className="flex-1 py-6 bg-gradient-to-r from-[#E0C3FC] to-[#B5FFFC] text-white rounded-[35px] font-candy text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all border-4 border-white"
                            >
                                {dialogConfig.hideInput ? '明白啦 ✨' : '确定'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPortal;

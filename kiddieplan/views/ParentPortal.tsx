import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Plus, Trash2, Calendar, Gift, Settings, Clock, ArrowLeft, Trophy, AlertCircle, Save, Sparkles, LayoutGrid, Edit2, Star, ListTodo, Home } from 'lucide-react';
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
    // Fix: Ref to track latest avatar for closures
    const avatarRef = useRef('');

    // Sync ref with state
    useEffect(() => {
        avatarRef.current = currentAvatar;
    }, [currentAvatar]);

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
        // Fix: Use local variable to avoid stale closure state
        const newAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${Date.now()}`;
        setCurrentAvatar(newAvatar);

        setDialogConfig({
            isOpen: true,
            title: '🌈 欢迎新成员',
            placeholder: '请输入小宝贝的昵称',
            showAvatarUpload: true,
            onConfirm: async (name) => {
                if (!name) return;
                const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
                try {
                    // Fix: Use the current image from the Ref if available (for uploaded), otherwise the local default
                    // But wait, if user uploaded, currentAvatar state WOULDBE updated? 
                    // No, onConfirm closes over the SCOPE of handleAddChild.
                    // We need to use a Ref to track the LATEST currentAvatar for the dialog.
                    // Or better: pass the upload result to a Ref.

                    // Actually, if user Uploads, handleFileChange sets currentAvatar state.
                    // But onConfirm closure still sees the OLD 'newAvatar' or 'empty'.
                    // React State in closures is TRICKY.

                    // BEST FIX: Use a ref to track currentAvatar just for the dialog operation
                    // OR rely on the fact that handleFileChange updates 'currentAvatar' state, 
                    // AND we can access it via a REF.

                    const finalAvatar = avatarRef.current || newAvatar;

                    const res = await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_child',
                            token,
                            data: { name, avatar: finalAvatar, roomCode }
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
        <div className="flex-1 flex flex-col animate-in fade-in duration-1000 h-full overflow-hidden bg-gradient-to-b from-[#F5EDE0] to-[#FFA07A] font-sans">
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />

            {/* Pixar Header - Full Width & High Contrast */}
            <div className="px-6 py-6 flex justify-between items-center shrink-0 bg-white/80 backdrop-blur-md shadow-cute border-b-4 border-[#3E2723]/15">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_6px_0_rgba(0,0,0,0.1)] border-b-4 border-[#eee] transform transition-transform hover:-translate-y-1">
                        <Settings className="text-[#FF6B81] animate-spin-slow" size={32} strokeWidth={3} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-[#5D4037] tracking-tight drop-shadow-sm" style={{ fontFamily: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, sans-serif' }}>星梦奇旅</h1>
                        <p className="text-xs font-black text-[#fff] mt-1 tracking-[0.2em] uppercase bg-[#FF6B81] px-2 py-1 rounded-full inline-block shadow-sm">Dream Maker Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveTab('registry')} className={`w-14 h-14 rounded-2xl bg-white border-b-4 border-[#ddd] flex items-center justify-center text-[#5D4037] shadow-lg active:border-b-0 active:translate-y-1 transition-all ${activeTab === 'registry' ? 'bg-[#12CBC4] text-white border-[#0faba0]' : ''}`}>
                        <LayoutGrid size={24} strokeWidth={3} />
                    </button>
                    {activeTab !== 'children' && activeTab !== 'registry' && (
                        <button onClick={() => setActiveTab('children')} className="w-14 h-14 rounded-2xl bg-white border-b-4 border-[#ddd] flex items-center justify-center text-[#5D4037] shadow-lg active:border-b-0 active:translate-y-1 transition-all">
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                    )}
                    <button onClick={onLogout} title="切换角色 / 返回首页" className="w-14 h-14 rounded-2xl bg-[#FF6B81] border-b-4 border-[#b33939] flex items-center justify-center text-white shadow-lg hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all">
                        <Home size={24} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Main Content - Full Width Container */}
            <main className="flex-1 w-full px-4 pt-6 pb-32 overflow-y-auto space-y-8 no-scrollbar">

                {activeTab === 'children' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        {/* Children Selector - Pixar Card */}
                        <div className="bg-white rounded-[32px] p-6 space-y-6 shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-black/5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-[#5D4037] opacity-60 uppercase tracking-[0.2em]">我的宝贝们 ({children.length}/3)</h3>
                                {children.length < 3 && (
                                    <button onClick={handleAddChild} className="flex items-center gap-2 text-xs font-black text-white bg-[#FF6B81] px-5 py-3 rounded-xl shadow-[0_4px_0_#1e3799] hover:translate-y-px hover:shadow-[0_3px_0_#1e3799] active:translate-y-1 active:shadow-none transition-all">
                                        <Plus size={16} strokeWidth={4} /> 添加成员
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-14 overflow-x-auto py-6 no-scrollbar min-h-[160px]">
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedChildId(child.id)}
                                        className={`flex flex-col items-center gap-4 min-w-[100px] transition-all transform duration-300 relative group ${selectedChildId === child.id ? 'scale-105' : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}`}
                                    >
                                        <div className={`w-28 h-28 rounded-[36px] overflow-hidden border-4 shadow-sm transition-all relative ${selectedChildId === child.id ? 'border-[#FF6B81] shadow-[0_8px_0_rgba(234,32,39,0.2)]' : 'border-transparent'}`}>
                                            <img src={child.avatar} alt={child.name} className="w-full h-full object-cover bg-gray-100" />

                                            {/* Plus Icon Overlay for Selected */}
                                            {selectedChildId === child.id && (
                                                <div className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-[#FF6B81] animate-bounce-slow">
                                                    <Plus size={18} className="text-[#FF6B81]" strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-sm font-black tracking-wide ${selectedChildId === child.id ? 'text-[#5D4037]' : 'text-[#95a5a6]'}`}>{child.name}</span>
                                    </button>
                                ))}
                                {children.length === 0 && (
                                    <div className="flex-1 text-center py-10 bg-white/70 rounded-[45px] border-4 border-dashed border-white/60">
                                        <p className="text-xs text-[#4D3A29] opacity-30 font-bold italic">开启第一个成长日记吧 ~</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedChild && (
                            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                {/* Kid Stats - Warm Gradient */}
                                <div className="kawaii-card bg-gradient-to-br from-[#CBC3E3] to-[#B19CD9] p-10 flex justify-between items-center relative overflow-hidden group border-4 border-white shadow-2xl animate-float-kawaii">
                                    <div className="absolute -right-10 -bottom-10 opacity-30 blur-sm group-hover:rotate-45 group-hover:scale-125 transition-all duration-1000">
                                        <Star size={200} className="text-white fill-white" />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">进入房间码</div>
                                            <button onClick={handleEditChild} className="bg-white text-[#FF6B81] px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5 border-b-2 border-black/10">
                                                <Edit2 size={12} strokeWidth={3} /> 修改资料
                                            </button>
                                        </div>
                                        <div className="text-7xl font-black text-white tracking-[0.1em] drop-shadow-md" style={{ fontFamily: 'monospace' }}>
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
                                        <div className="w-20 h-20 bg-white rounded-[35px] flex items-center justify-center shadow-xl border-4 border-white bg-gradient-to-tr from-[#CBC3E3] to-[#B19CD9]">
                                            <Calendar className="text-[#5D4037]" size={40} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-base font-bold text-[#5D4037] tracking-wider uppercase">任务分配</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rewards')}
                                        className="kawaii-button aspect-square flex-col gap-6 bg-white hover:bg-white/95 border-none shadow-xl"
                                    >
                                        <div className="w-20 h-20 bg-white rounded-[35px] flex items-center justify-center shadow-xl border-4 border-white bg-gradient-to-tr from-[#FFB6C1] to-[#FFF9C4]">
                                            <Gift className="text-[#5D4037]" size={40} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-base font-bold text-[#5D4037] tracking-wider uppercase">奖励愿望</span>
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
                                <h2 className="text-4xl font-candy text-[#5D4037]">任务分配</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-[10px] font-bold text-[#E6E6FA] uppercase tracking-[0.3em] leading-none">Space Registry for {selectedChild.name}</p>
                                    <button onClick={handleEditChild} className="text-[#E6E6FA] opacity-40 hover:opacity-100 transition-all p-1.5 -m-1.5">
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => addTask()} className="kawaii-button bg-[#D8BFD8] px-8 py-4 flex items-center gap-2 text-sm text-[#5D4037] border-white shadow-xl hover:scale-105 active:scale-90">
                                <Plus size={20} strokeWidth={4} /> 手动添加
                            </button>
                        </div>

                        {/* Template Library - Pixar Pills */}
                        <div className="space-y-6">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2 scroll-smooth">
                                {Object.values(TaskCategory).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap border-b-4 ${selectedCategory === cat ? 'bg-[#FF6B81] text-white border-[#1e3799] shadow-lg translate-y-px' : 'bg-white text-[#5D4037] border-[#ccc] hover:bg-gray-50'}`}
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
                                        className="bg-white rounded-2xl p-4 flex items-center gap-4 hover:bg-[#fff0f0] transition-all border-b-4 border-[#eee] active:border-b-0 active:translate-y-1 shadow-[0_4px_0_rgba(0,0,0,0.05)] group"
                                    >
                                        <div className="w-12 h-12 bg-[#FFDAB9Base] rounded-xl flex items-center justify-center text-2xl shadow-inner border-b-4 border-[#F4A460] group-hover:scale-110 transition-transform">
                                            {tmp.icon}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-black text-[#5D4037]">{tmp.title}</div>
                                            <div className="text-[10px] font-bold text-[#FF6B81] opacity-80 uppercase tracking-widest mt-1">{tmp.time} • {tmp.points} 🍭</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-[#3E2723]/10 my-10 relative">
                            <div className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white/70 backdrop-blur-sm px-4 text-[8px] font-bold text-[#3E2723]/40 uppercase tracking-[0.4em]">Review List</div>
                        </div>

                        {/* Current Task Session - Pixar Cards */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-[#5D4037] opacity-50 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <ListTodo size={14} strokeWidth={3} /> 待发布任务 ({currentTasks.length})
                            </h3>
                            {currentTasks.map(task => (
                                <div key={task.id} className="bg-white rounded-2xl p-5 flex justify-between items-center group shadow-[0_6px_0_rgba(0,0,0,0.05)] border-2 border-black/5 hover:translate-x-1 transition-transform">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-[#12CBC4] rounded-xl flex items-center justify-center border-b-4 border-[#0fb9b1] shadow-sm text-white">
                                            <Clock size={24} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <div className="font-black text-[#5D4037] text-lg">{task.title}</div>
                                            <div className="text-xs font-bold text-[#FF6B81] flex items-center gap-2 mt-1">
                                                <span className="bg-[#FF6B81]/10 px-2 py-0.5 rounded text-[10px]">{task.timeSlot}</span>
                                                <span className="w-1.5 h-1.5 bg-[#FF6B81] rounded-full"></span>
                                                <span className="font-black">{task.points} 🍭</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => editTask(task)} className="w-10 h-10 rounded-xl bg-gray-100 text-[#5D4037] border-b-4 border-[#ddd] flex items-center justify-center hover:bg-white active:border-b-0 active:translate-y-1 transition-all">
                                            <Edit2 size={16} strokeWidth={2.5} />
                                        </button>
                                        <button onClick={() => removeTask(task.id)} className="w-10 h-10 rounded-xl bg-[#FDA7DF]/20 text-[#D980FA] border-b-4 border-[#FDA7DF]/30 flex items-center justify-center hover:bg-[#FDA7DF] hover:text-white active:border-b-0 active:translate-y-1 transition-all">
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {currentTasks.length === 0 && (
                                <div className="text-center py-12 bg-white/20 rounded-3xl border-4 border-dashed border-white/60">
                                    <p className="text-sm text-[#5D4037] opacity-40 font-black italic">快去挑选一些充满仪式感的任务吧 ~</p>
                                </div>
                            )}
                        </div>

                        {currentTasks.length > 0 && (
                            <button
                                onClick={handleSaveTasks}
                                disabled={isSaving}
                                className="w-full bg-[#FF6B81] py-6 text-white text-xl font-black rounded-2xl shadow-[0_8px_0_#1e3799] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 mt-12 border-b-8 border-[#1e3799] active:border-b-0"
                            >
                                {isSaving ? <Sparkles className="animate-spin text-white" /> : <><Save size={24} className="mr-3 inline" strokeWidth={3} /> 同步梦想宇宙</>}
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'rewards' && selectedChild && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-10">
                        <div className="flex justify-between items-end px-2">
                            <div>
                                <h1 className="text-3xl font-candy text-[#5D4037] uppercase tracking-tighter">成长银行奖励项</h1>
                                <p className="text-[10px] font-bold text-[#E6E6FA] mt-1 uppercase tracking-[0.2em] leading-none">Custom Reward Market for {selectedChild.name}</p>
                            </div>
                            <button onClick={handleAddReward} className="kawaii-button bg-[#D8BFD8] px-6 py-3 flex items-center gap-2 text-xs text-[#5D4037] shadow-lg border-white">
                                <Plus size={18} strokeWidth={4} /> 新增奖励
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {rewards.map((reward, i) => (
                                <div key={i} className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 relative group shadow-[0_8px_0_rgba(0,0,0,0.05)] border-2 border-black/5 hover:-translate-y-1 transition-transform">
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => removeReward(reward.id)} className="w-8 h-8 rounded-full bg-[#FF6B81]/10 flex items-center justify-center text-[#FF6B81] hover:bg-[#FF6B81] hover:text-white transition-all shadow-sm">
                                            <Trash2 size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <div className="w-20 h-20 bg-[#FDA7DF] rounded-2xl flex items-center justify-center text-5xl shadow-inner border-b-4 border-[#D980FA]">
                                        {reward.icon}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-base font-black text-[#5D4037]">{reward.name}</div>
                                        <div className="text-xs font-bold text-[#FF6B81] mt-2 flex items-center justify-center gap-1.5 bg-[#FF6B81]/10 px-3 py-1 rounded-full">
                                            {reward.pointsCost} <span className="text-[9px] uppercase opacity-60">candies 🍭</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {rewards.length > 0 && (
                            <button
                                onClick={handleSaveRewards}
                                disabled={isSaving}
                                className="w-full bg-[#FF6B81] py-6 text-white text-xl font-black rounded-2xl shadow-[0_8px_0_#b33939] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 mt-12 border-b-8 border-[#b33939] active:border-b-0"
                            >
                                {isSaving ? <Sparkles className="animate-spin text-white" /> : <><Save size={24} className="mr-3 inline" strokeWidth={3} /> 同步梦想宇宙</>}
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'registry' && licenseData && (
                    <div className="space-y-8 animate-in slide-in-from-top-8 duration-500 pb-20">
                        <div className="text-center space-y-2">
                            <h2 className="text-4xl font-candy text-[#5D4037]">全权注册大盘</h2>
                            <p className="text-[10px] font-bold text-[#A2D2FF] opacity-50 uppercase tracking-[0.4em]">Family License Master Console</p>
                        </div>

                        <div className="space-y-4">
                            {(licenseData.children || []).map((kid: any) => {
                                const today = new Date().toISOString().split('T')[0];
                                const daily = licenseData.progress?.[today]?.[kid.id] || { tasks: [], checkins: [] };
                                const completionRate = daily.tasks.length > 0 ? Math.round((daily.checkins.length / daily.tasks.length) * 100) : 0;

                                return (
                                    <div key={kid.id} className="bg-white rounded-3xl p-6 shadow-[0_6px_0_rgba(0,0,0,0.05)] border-2 border-black/5 flex items-center gap-6 group hover:translate-x-1 transition-transform">
                                        <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden shrink-0 bg-gray-100">
                                            <img src={kid.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xl font-black text-[#5D4037]">{kid.name}</h4>
                                                <span className="text-[10px] font-black text-white bg-[#5D4037] px-2 py-1 rounded uppercase tracking-widest">RM: {kid.roomCode}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden border border-black/5 shadow-inner">
                                                    <div
                                                        className="h-full bg-[#FF6B81] rounded-full transition-all duration-1000 relative overflow-hidden"
                                                        style={{ width: `${completionRate}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-[#FF6B81]">{completionRate}%</span>
                                            </div>
                                            <div className="flex gap-4 pt-1">
                                                <div className="text-[10px] font-bold text-[#95a5a6] uppercase tracking-tighter flex items-center gap-1">
                                                    <ListTodo size={10} /> 任务: {daily.checkins.length}/{daily.tasks.length}
                                                </div>
                                                <div className="text-[10px] font-bold text-[#FF6B81] uppercase tracking-tighter flex items-center gap-1">
                                                    <Gift size={10} /> 积分: {kid.points || 0}
                                                </div>
                                                <div className="text-[10px] font-bold text-[#F4A460] uppercase tracking-tighter flex items-center gap-1">
                                                    <Trophy size={10} /> 连续: {kid.streak || 0}D
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-[#5D4037] rounded-[40px] p-10 text-white border-b-8 border-[#1e272e] shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 opacity-5 animate-spin-slow">
                                <Sparkles size={240} fill="white" />
                            </div>
                            <div className="relative z-10 grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <div className="text-4xl font-black text-[#F4A460]">{licenseData.children?.length || 0}</div>
                                    <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">注册成员总数</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-4xl font-black text-[#12CBC4]">{Object.keys(licenseData.progress || {}).length}</div>
                                    <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">已积累梦幻里程</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-4xl font-black text-[#FDA7DF]">
                                        {(licenseData.children || []).reduce((acc: number, c: any) => acc + (c.points || 0), 0)}
                                    </div>
                                    <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">全家成就聚宝盆</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-4xl font-black">✨</div>
                                    <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">数据同步实时在线</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Hint Footer */}
            {/* Hint Footer - Pixar Sticky Note */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-sm px-4">
                <div className="bg-[#fff] px-6 py-4 flex items-center gap-4 shadow-2xl border-b-4 border-l-4 border-black/10 rounded-xl transform -rotate-1 animate-float-kawaii">
                    <AlertCircle size={24} className="text-[#F4A460] shrink-0" strokeWidth={3} />
                    <span className="text-xs font-black text-[#5D4037] leading-relaxed">
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

            {/* Custom Dialog - Pixar Solid Style */}
            {dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-[#5D4037]/80 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}></div>
                    <div className="bg-white w-full max-w-md p-8 space-y-8 shadow-2xl animate-in zoom-in-95 duration-300 relative z-10 rounded-[40px] border-8 border-white ring-4 ring-black/5">
                        <div className="text-center space-y-4">
                            <h3 className="text-3xl font-black text-[#5D4037] tracking-tight">{dialogConfig.title}</h3>
                            {dialogConfig.message && (
                                <p className="text-sm font-bold text-[#5D4037]/60 leading-relaxed max-w-[280px] mx-auto">
                                    {dialogConfig.message}
                                </p>
                            )}
                            {dialogConfig.highlight && (
                                <div className="text-6xl font-black text-[#FF6B81] tracking-[0.2em] bg-gray-50 px-8 py-6 rounded-3xl mt-6 border-4 border-dashed border-[#FF6B81]/20 select-all">
                                    {dialogConfig.highlight}
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            {dialogConfig.showAvatarUpload && (
                                <div className="flex flex-col items-center gap-6 py-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-36 h-36 rounded-[40px] overflow-hidden border-8 border-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] bg-gray-100 cursor-pointer hover:scale-105 active:scale-95 transition-all relative group"
                                    >
                                        <img src={currentAvatar} alt="preview" className="w-full h-full object-cover" />
                                        {/* Camera/Plus overlay */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white p-3 rounded-2xl shadow-lg transform rotate-12">
                                                <Plus size={28} className="text-[#5D4037]" strokeWidth={4} />
                                            </div>
                                        </div>
                                        {/* Floating Plus corner icon */}
                                        <div className="absolute bottom-3 right-3 w-10 h-10 bg-[#FF6B81] rounded-xl flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                                            <Plus size={20} className="text-white" strokeWidth={4} />
                                        </div>
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <Sparkles className="text-[#FF6B81] animate-spin" size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-black text-[#5D4037]/40 flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                                        点击上方头像 <Plus size={12} strokeWidth={4} /> 更换照片
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
                                        className="w-full px-6 py-4 rounded-2xl bg-gray-100 border-b-4 border-transparent focus:border-[#FF6B81] outline-none font-black text-[#5D4037] placeholder:text-[#ccc] transition-all text-lg"
                                    />
                                    {dialogConfig.showTime && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#5D4037]/40 ml-4 uppercase tracking-widest">执行时间</p>
                                            <input
                                                type="time"
                                                defaultValue={dialogConfig.defaultExtra || '08:00'}
                                                id="dialog-time-input"
                                                className="w-full px-6 py-4 rounded-2xl bg-gray-100 border-b-4 border-transparent focus:border-[#FF6B81] outline-none font-black text-[#5D4037] transition-all text-lg"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex gap-4 pt-2">
                            {!dialogConfig.hideInput && (
                                <button
                                    onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-4 text-[#5D4037]/40 font-black hover:text-[#5D4037] transition-all text-sm uppercase tracking-widest hover:bg-gray-100 rounded-xl"
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
                                className="flex-1 py-5 bg-[#FF6B81] text-white rounded-2xl font-black text-xl shadow-[0_6px_0_#1e3799] border-b-4 border-[#1e3799] hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all"
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

import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Plus, Trash2, Calendar, Gift, Settings, Clock, ArrowLeft, Trophy, AlertCircle, Save, Sparkles, LayoutGrid, Edit2, Star, ListTodo, Home, Timer, UserPlus, Check, CalendarCheck, BarChart3 } from 'lucide-react';
import { Child, Task, Reward, TaskCategory } from '../types';
import { TASK_TEMPLATES, DEFAULT_REWARDS } from '../constants/templates';
import { motion, AnimatePresence } from 'framer-motion';

interface ParentPortalProps {
    token: string;
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ token, onLogout }) => {
    const [children, setChildren] = useState<Child[]>([]);
    const [licenseData, setLicenseData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'children' | 'tasks' | 'rewards' | 'registry' | 'checkins' | 'stats'>('children');
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

    // Background polling for Registry/Live Status
    useEffect(() => {
        let timer: any;
        if (activeTab === 'registry' || activeTab === 'children') {
            timer = setInterval(() => fetchConfig(true), 30000); // 30s silent auto-refresh
        }
        return () => clearInterval(timer);
    }, [activeTab]);

    const fetchConfig = async (silent = false) => {
        if (!silent) setLoading(true);
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
                // Only update children if the data has actually changed to avoid unnecessary re-renders
                setChildren(prev => JSON.stringify(prev) !== JSON.stringify(childrenList) ? childrenList : prev);

                if (childrenList.length > 0 && !selectedChildId) {
                    setSelectedChildId(childrenList[0].id);
                }
            }
        } catch (err) {
            console.error('Fetch failed');
        } finally {
            if (!silent) setLoading(false);
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
            placeholder: '输入奖励名称',
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
            message: `修改“${task.title}”`,
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
                            data: { ...selectedChild, name, avatar: currentAvatar || selectedChild.avatar }
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
            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-[var(--color-blue-fun)] rounded-3xl"
            ></motion.div>
            <p className="text-xl text-[#5D4037] opacity-60 font-bold">载入中...</p>
        </div>
    );

    const selectedChild = children.find(c => c.id === selectedChildId);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-bg-light-blue)] font-sans relative">
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />

            {/* Header */}
            <header className="px-6 py-5 flex justify-between items-center bg-gradient-to-r from-[var(--color-blue-fun)] to-blue-500 shadow-md z-20">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide drop-shadow-sm" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>星梦奇旅 (家长端)</h1>
                    </div>
                </div>
                <div className="flex gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLogout}
                        className="p-3 rounded-2xl bg-[#FF6B81] text-white shadow-sm border-b-4 border-[#e93b58] active:border-b-0 active:translate-y-1"
                    >
                        <Home size={24} />
                    </motion.button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full px-4 pt-6 pb-20 overflow-y-auto no-scrollbar space-y-6">

                {activeTab === 'children' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Children List */}
                        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_20px_rgba(0,0,0,0.05)] border-2 border-white/50">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-[#5D4037] flex items-center gap-2">
                                    <span className="text-2xl">👶</span> 我的宝贝
                                </h3>
                                {children.length < 3 && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleAddChild}
                                        className="bg-[var(--color-blue-fun)] text-white px-4 py-2 rounded-full text-xs font-bold shadow-md flex items-center gap-1"
                                    >
                                        <Plus size={16} /> 添加
                                    </motion.button>
                                )}
                            </div>

                            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                                {children.map(child => (
                                    <motion.div
                                        key={child.id}
                                        onClick={() => setSelectedChildId(child.id)}
                                        whileHover={{ y: -5 }}
                                        className={`flex flex-col items-center gap-3 min-w-[100px] cursor-pointer relative ${selectedChildId === child.id ? 'opacity-100' : 'opacity-60 grayscale-[0.3]'}`}
                                    >
                                        <div className={`w-24 h-24 rounded-[32px] overflow-hidden border-4 shadow-sm transition-all relative ${selectedChildId === child.id ? 'border-[var(--color-blue-fun)] shadow-[0_8px_15px_rgba(96,165,250,0.3)]' : 'border-transparent'}`}>
                                            <img src={child.avatar} alt={child.name} className="w-full h-full object-cover bg-gray-100" />
                                            {selectedChildId === child.id && (
                                                <>
                                                    <div className="absolute inset-0 border-4 border-white rounded-[28px] pointer-events-none"></div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditChild();
                                                        }}
                                                        className="absolute -bottom-2 -right-2 bg-white text-[var(--color-blue-fun)] p-2 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform z-10"
                                                    >
                                                        <Edit2 size={14} fill="currentColor" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-sm font-black text-[#5D4037]">{child.name}</span>
                                    </motion.div>
                                ))}
                                {children.length === 0 && (
                                    <div className="w-full py-10 text-center border-4 border-dashed border-gray-200 rounded-[32px]">
                                        <p className="text-gray-400 font-bold">还没有添加宝贝哦 ~</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedChild && (
                            <motion.div
                                key={selectedChildId}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-6"
                            >
                                {/* Dashboard Card */}
                                <div className={`p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl border-4 border-white
                                    ${selectedChild.isFocusing ? 'bg-gradient-to-br from-[var(--color-green-success)] to-emerald-400' : 'bg-gradient-to-br from-[#818CF8] to-[#6366F1]'}`}>
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-10 -mt-10 blur-3xl"></div>

                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                {selectedChild.isFocusing ? (
                                                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                                        <div className="w-2 h-2 bg-white rounded-full"></div> 专注中
                                                    </span>
                                                ) : (
                                                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                        休息中
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-4xl font-black">{selectedChild.roomCode}</h2>
                                            <p className="text-xs opacity-70 font-bold uppercase mt-1 tracking-widest">房间访问码 (Room Code)</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-4xl font-black drop-shadow-md">{selectedChild.points || 0} 🍭</div>
                                            <p className="text-xs opacity-70 font-bold uppercase mt-1 tracking-widest">累计积分</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <motion.button
                                        whileHover={{ y: -5, rotate: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('tasks')}
                                        className="bg-white p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(251,191,36,0.1)] border-2 border-yellow-50 hover:border-[var(--color-yellow-reward)] transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-[var(--color-yellow-reward)] rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
                                            <ListTodo size={32} strokeWidth={3} />
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">任务管理</span>
                                        <span className="text-xs text-gray-400 font-bold">每日习惯养成</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -5, rotate: 1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('rewards')}
                                        className="bg-white p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(248,113,113,0.1)] border-2 border-red-50 hover:border-[var(--color-red-warning)] transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-[var(--color-red-warning)] rounded-2xl flex items-center justify-center text-white shadow-lg -rotate-3 group-hover:-rotate-6 transition-transform">
                                            <Gift size={32} strokeWidth={3} />
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">奖励中心</span>
                                        <span className="text-xs text-gray-400 font-bold">设定心愿清单</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -5, rotate: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('checkins')}
                                        className="bg-white p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(167,139,250,0.1)] border-2 border-purple-50 hover:border-purple-400 transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-purple-400 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
                                            <CalendarCheck size={32} strokeWidth={3} />
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">查看打卡</span>
                                        <span className="text-xs text-gray-400 font-bold">查看历史记录</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -5, rotate: 1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('stats')}
                                        className="bg-white p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(52,211,153,0.1)] border-2 border-emerald-50 hover:border-emerald-400 transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-lg -rotate-3 group-hover:-rotate-6 transition-transform">
                                            <BarChart3 size={32} strokeWidth={3} />
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">详情统计</span>
                                        <span className="text-xs text-gray-400 font-bold">数据报表分析</span>
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'tasks' && selectedChild && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-[#5D4037]">今日任务清单</h2>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => addTask()} className="bg-[var(--color-blue-fun)] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
                                <Plus size={24} />
                            </motion.button>
                        </div>

                        {/* Templates */}
                        <div className="overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                            <div className="flex gap-3 w-max">
                                {Object.values(TaskCategory).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border-2
                                    ${selectedCategory === cat
                                                ? 'bg-[var(--color-blue-fun)] text-white border-[var(--color-blue-fun)] shadow-md'
                                                : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {TASK_TEMPLATES.find(t => t.category === selectedCategory)?.tasks.map((tmp, i) => (
                                <motion.button
                                    key={i}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => addTask(tmp.title, tmp.time, tmp.points)}
                                    className="bg-white p-4 rounded-2xl text-left border-2 border-transparent hover:border-blue-100 shadow-sm"
                                >
                                    <div className="text-2xl mb-2">{tmp.icon}</div>
                                    <div className="font-bold text-[#5D4037] text-sm">{tmp.title}</div>
                                    <div className="text-[10px] text-gray-400 font-bold mt-1">+{tmp.points} 🍭</div>
                                </motion.button>
                            ))}
                        </div>

                        <div className="h-px bg-gray-200 my-4" />

                        {/* Current Tasks */}
                        <div className="space-y-3">
                            {currentTasks.map(task => (
                                <motion.div
                                    layout
                                    key={task.id}
                                    className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-gray-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[var(--color-blue-fun)]">
                                            <Clock size={18} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#5D4037]">{task.title}</h4>
                                            <div className="text-xs text-gray-400 font-bold flex gap-2">
                                                <span>{task.timeSlot}</span>
                                                <span className="text-[var(--color-blue-fun)]">+{task.points} pts</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => editTask(task)} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
                                        <button onClick={() => removeTask(task.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </motion.div>
                            ))}
                            {currentTasks.length === 0 && (
                                <div className="text-center py-10 opacity-50">
                                    <p className="font-bold text-gray-500">空空如也，快添加任务吧！</p>
                                </div>
                            )}
                        </div>

                        {currentTasks.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSaveTasks}
                                disabled={isSaving}
                                className="w-full bg-[#34D399] py-4 rounded-2xl text-white font-black text-lg shadow-[0_8px_0_#059669] active:shadow-none active:translate-y-2 transition-all"
                            >
                                {isSaving ? '同步中...' : '发布任务'}
                            </motion.button>
                        )}
                    </motion.div>
                )}

                {activeTab === 'rewards' && selectedChild && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-[#5D4037]">奖励商店</h2>
                            <motion.button whileTap={{ scale: 0.9 }} onClick={handleAddReward} className="bg-[var(--color-yellow-reward)] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
                                <Plus size={24} />
                            </motion.button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {rewards.map((reward, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -3 }}
                                    className="bg-white p-5 rounded-[28px] flex flex-col items-center gap-3 shadow-[0_6px_10px_rgba(0,0,0,0.03)] border-2 border-transparent hover:border-yellow-100 relative group"
                                >
                                    <button onClick={() => removeReward(reward.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 bg-red-50 p-1.5 rounded-full">
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="text-5xl mb-2 filter drop-shadow-sm">{reward.icon}</div>
                                    <div className="text-center">
                                        <div className="font-bold text-[#5D4037] text-sm mb-1">{reward.name}</div>
                                        <div className="bg-yellow-50 text-[var(--color-yellow-reward)] px-3 py-1 rounded-full text-xs font-black">
                                            {reward.pointsCost} 🍭
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {rewards.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSaveRewards}
                                disabled={isSaving}
                                className="w-full bg-[#F472B6] py-4 rounded-2xl text-white font-black text-lg shadow-[0_8px_0_#DB2777] active:shadow-none active:translate-y-2 transition-all"
                            >
                                {isSaving ? '同步中...' : '更新奖励库'}
                            </motion.button>
                        )}
                    </motion.div>
                )}

                {activeTab === 'checkins' && selectedChild && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-[#5D4037]">打卡历史</h2>
                            <div className="flex items-center gap-2 text-purple-400 bg-purple-50 px-4 py-2 rounded-full text-sm font-bold">
                                <CalendarCheck size={18} />
                                记录近30天
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-black text-gray-400">2026-02-0{5 - i}</span>
                                        <span className="bg-green-100 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">已完成</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-400">
                                            <Trophy size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#5D4037]">全天任务达成</div>
                                            <div className="text-xs text-gray-400 font-bold">获得奖励: 🍭 +50</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'stats' && selectedChild && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
                        <h2 className="text-2xl font-black text-[#5D4037]">统计分析</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-5 rounded-[32px] text-white shadow-lg">
                                <div className="text-xs font-bold opacity-80 mb-1">本周平均专注</div>
                                <div className="text-3xl font-black">4.5h</div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 p-5 rounded-[32px] text-white shadow-lg">
                                <div className="text-xs font-bold opacity-80 mb-1">任务成功率</div>
                                <div className="text-3xl font-black">92%</div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                            <h3 className="font-black text-[#5D4037] mb-4 flex items-center gap-2">
                                <BarChart3 size={18} className="text-emerald-400" />
                                积分趋势 (近7天)
                            </h3>
                            <div className="h-40 flex items-end justify-between gap-2 px-2">
                                {[30, 45, 25, 60, 80, 50, 70].map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${val}%` }}
                                            className="w-full bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors relative"
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-500">{val}</div>
                                        </motion.div>
                                        <span className="text-[10px] font-bold text-gray-400">周{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Dialog Overlay */}
            <AnimatePresence>
                {dialogConfig.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl relative z-60 border-8 border-[var(--color-bg-light-blue)]"
                        >
                            <h3 className="text-2xl font-black text-center text-[#5D4037] mb-2">{dialogConfig.title}</h3>
                            {dialogConfig.message && <p className="text-center text-gray-500 text-sm mb-6">{dialogConfig.message}</p>}
                            {dialogConfig.highlight && (
                                <div className="text-center text-5xl font-black text-[var(--color-blue-fun)] mb-6 font-mono tracking-widest bg-blue-50 py-4 rounded-2xl border-2 border-blue-100">
                                    {dialogConfig.highlight}
                                </div>
                            )}

                            {dialogConfig.showAvatarUpload && (
                                <div className="flex justify-center mb-6">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <img src={currentAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=new`} className="w-24 h-24 rounded-full border-4 border-[var(--color-blue-fun)] bg-gray-100 object-cover" />
                                        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                                            更换头像
                                        </div>
                                        {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full"><Sparkles className="animate-spin text-blue-400" /></div>}
                                    </div>
                                </div>
                            )}

                            {!dialogConfig.hideInput && (
                                <div className="space-y-4">
                                    <input
                                        autoFocus
                                        className="w-full bg-[#F5F7FA] border-2 border-transparent focus:border-[var(--color-blue-fun)] px-6 py-4 rounded-2xl text-lg font-bold text-center outline-none transition-all"
                                        placeholder={dialogConfig.placeholder}
                                        defaultValue={dialogConfig.defaultValue}
                                        id="dialogInput"
                                    />
                                    {dialogConfig.showTime && (
                                        <div className="flex items-center gap-2 bg-[#F5F7FA] px-4 py-3 rounded-2xl">
                                            <Clock size={18} className="text-gray-400" />
                                            <input
                                                type="time"
                                                defaultValue={dialogConfig.defaultExtra || '08:00'}
                                                className="bg-transparent font-bold text-[#5D4037] outline-none flex-1"
                                                id="dialogTime"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('dialogInput') as HTMLInputElement;
                                        const time = document.getElementById('dialogTime') as HTMLInputElement;
                                        dialogConfig.onConfirm(input?.value, time?.value);
                                    }}
                                    className="flex-1 bg-[var(--color-blue-fun)] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                                >
                                    确定
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ParentPortal;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogOut, Plus, Trash2, Calendar, Gift, Settings, Clock, ArrowLeft, Trophy, AlertCircle, Save, Sparkles, LayoutGrid, Edit2, Star, ListTodo, Home, Timer, UserPlus, Check, CalendarCheck, BarChart3, RotateCcw, Zap, Target, RefreshCw } from 'lucide-react';
import { Child, Task, Reward, TaskCategory, Category, CategoryTemplate, FocusLog } from '../types';
import { TASK_TEMPLATES, DEFAULT_REWARDS, DEFAULT_CATEGORIES } from '../constants/templates';
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
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time EVERY SECOND
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatBeijingTime = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const y = date.getFullYear();
        const m = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    };

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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
        showDelete?: boolean;
        onDelete?: () => void;
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

    // Custom Time Picker State
    const [pickerHour, setPickerHour] = useState('08');
    const [pickerMinute, setPickerMinute] = useState('00');

    // Sync picker with dialog default extra
    useEffect(() => {
        if (dialogConfig.isOpen && dialogConfig.showTime) {
            const time = dialogConfig.defaultExtra || '08:00';
            const [h, m] = time.split(':');
            setPickerHour(h || '08');
            setPickerMinute(m || '00');

            // Auto-scroll to selected values
            setTimeout(() => {
                const hEl = document.getElementById(`hour-${h || '08'}`);
                const mEl = document.getElementById(`minute-${m || '00'}`);
                hEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                mEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 100);
        }
    }, [dialogConfig.isOpen, dialogConfig.showTime, dialogConfig.defaultExtra]);

    // Sync ref with state
    useEffect(() => {
        avatarRef.current = currentAvatar;
    }, [currentAvatar]);

    // Task/Reward Editor State
    const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
    const [focusLogs, setFocusLogs] = useState<FocusLog[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [customCategories, setCustomCategories] = useState<Category[]>([]);
    const [hiddenPresets, setHiddenPresets] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const mainScrollRef = useRef<HTMLElement>(null);

    // Live Focus Timer State for Parent View
    const [liveFocusDuration, setLiveFocusDuration] = useState(0);

    useEffect(() => {
        const selectedChild = children.find(c => c.id === selectedChildId);
        if (selectedChild?.isFocusing) {
            // Only update from backend if we don't have a local timer running
            // or if the drift is significant (> 30s) to avoid jitter
            setLiveFocusDuration(prev => {
                const backendVal = selectedChild.lastFocusDuration || 0;
                if (prev === 0 || Math.abs(prev - backendVal) > 30) {
                    return backendVal;
                }
                return prev;
            });

            const interval = setInterval(() => {
                setLiveFocusDuration(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setLiveFocusDuration(0);
        }
    }, [children, selectedChildId]);

    useEffect(() => {
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeTab]);

    useEffect(() => {
        fetchConfig();
    }, []);

    useEffect(() => {
        if (selectedChildId) {
            // 即时清空旧数据，防止数据串屏
            if (activeTab === 'tasks') {
                setCurrentTasks([]);
                fetchTasks();
            }
            if (activeTab === 'rewards') fetchRewards();
            if (activeTab === 'checkins') {
                setFocusLogs([]); // Clear old logs to show fresh loading
                fetchTasks();     // Re-use fetchTasks as it fetches logs too
            }
        }
    }, [selectedChildId, activeTab]);

    // Smart Polling Logic
    const [isIdle, setIsIdle] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // Activity Detection
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
            if (isIdle) setIsIdle(false);
        };
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('keydown', handleActivity);

        const idleChecker = setInterval(() => {
            if (Date.now() - lastActivityRef.current > 60000) { // 1 min idle
                setIsIdle(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            clearInterval(idleChecker);
        };
    }, [isIdle]);

    const fetchConfig = useCallback(async (silent = false) => {
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

                // 加载分类
                let activeCats = result.data.categories || [];
                if (activeCats.length === 0) {
                    activeCats = DEFAULT_CATEGORIES;
                }
                setCustomCategories(activeCats);

                // 如果当前没选中或选中的分类不存在了，默认选第一个
                if (!selectedCategory || !activeCats.find((c: any) => c.id === selectedCategory)) {
                    if (activeCats.length > 0) setSelectedCategory(activeCats[0].id);
                }

                // 加载隐藏的预设
                if (result.data.hiddenPresets) {
                    setHiddenPresets(result.data.hiddenPresets);
                }

                // 核心同步：从 license 聚合对象中提取当前孩子的专注日志
                const today = new Date().toISOString().split('T')[0];
                const dailyData = result.data.progress?.[today]?.[selectedChildId];
                if (dailyData?.focusLogs) {
                    setFocusLogs(prev => JSON.stringify(prev) !== JSON.stringify(dailyData.focusLogs) ? dailyData.focusLogs : prev);
                }
            }
        } catch (err) {
            console.error('Fetch failed');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [token, selectedChildId, selectedCategory]); // Memoized for polling dependency

    // Adaptive Polling
    useEffect(() => {
        let intervalTime = 60000; // Default Idle: 1 min

        if (document.hidden) {
            intervalTime = 300000; // Hidden: 5 min
        } else if (!isIdle) {
            intervalTime = 5000; // Active: 5 sec
        }

        console.log(`Polling interval set to: ${intervalTime}ms (${document.hidden ? 'Hidden' : isIdle ? 'Idle' : 'Active'})`);

        // 全局轮询专注状态，不受标签页限制，确保持续实时监控
        const timer = setInterval(() => fetchConfig(true), intervalTime);
        return () => clearInterval(timer);
    }, [activeTab, isIdle, fetchConfig]); // Added memoization dependencies

    const handleSaveCategories = async (newCategories: Category[], newHiddenPresets?: string[]) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_categories',
                    token,
                    data: {
                        categories: newCategories,
                        hiddenPresets: newHiddenPresets !== undefined ? newHiddenPresets : hiddenPresets
                    }
                })
            });
            const result = await res.json();
            if (result.success) {
                setCustomCategories(newCategories);
                if (newHiddenPresets !== undefined) setHiddenPresets(newHiddenPresets);
            } else {
                alert(result.message);
            }
        } catch (e) {
            console.error(e);
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveCategory = async (name: string, icon: string) => {
        if (!name) return;
        const newCat = { id: `cat_${Date.now()}`, name, icon };
        await handleSaveCategories([...customCategories, newCat]);
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteCategory = async (id: string) => {
        if (window.confirm('确定要删除这个分类吗？')) {
            const newCats = customCategories.filter(c => c.id !== id);
            await handleSaveCategories(newCats);
            // 如果删掉的是当前选中的，切换到第一个
            if (id === selectedCategory && newCats.length > 0) {
                setSelectedCategory(newCats[0].id);
            }
        }
    };

    const handleAddInlineCategory = async () => {
        if (!newCategoryName.trim()) return;
        const newCat: Category = { id: `cat_${Date.now()}`, name: newCategoryName.trim(), icon: '✨', templates: [] };
        await handleSaveCategories([...customCategories, newCat]);
        setNewCategoryName('');
    };

    const handleAddTemplate = (catId: string) => {
        const cat = customCategories.find(c => c.id === catId);
        if (!cat) return;

        setDialogConfig({
            isOpen: true,
            title: `✨ 为 [${cat.name}] 创建模板`,
            placeholder: '任务名称，如：练习踢腿',
            showTime: true,
            defaultExtra: '09:00',
            onConfirm: async (title, time) => {
                if (!title) return;
                const newTemplate: CategoryTemplate = {
                    title,
                    points: 10,
                    timeSlot: time || '08:00',
                    icon: '🎯' // 用户自定义模板默认图标
                };

                const newCategories = customCategories.map(c => {
                    if (c.id === catId) {
                        return { ...c, templates: [...(c.templates || []), newTemplate] };
                    }
                    return c;
                });

                await handleSaveCategories(newCategories);
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteTemplate = async (catId: string, templateTitle: string, isCustom: boolean, templateIndex?: number) => {
        const msg = isCustom ? '确定要删除这个自定义任务模板吗？' : '确定要隐藏这个预设任务模板吗？之后您可以重置设置来找回它。';

        setDialogConfig({
            isOpen: true,
            title: isCustom ? '🗑️ 删除模板' : '🙈 隐藏任务',
            message: msg,
            hideInput: true,
            placeholder: '',
            onConfirm: async () => {
                if (isCustom && templateIndex !== undefined) {
                    const newCategories = customCategories.map(c => {
                        if (c.id === catId) {
                            const newTemplates = [...(c.templates || [])];
                            newTemplates.splice(templateIndex, 1);
                            return { ...c, templates: newTemplates };
                        }
                        return c;
                    });
                    await handleSaveCategories(newCategories);
                } else {
                    // 隐藏预设模板
                    const presetKey = `${catId}:${templateTitle}`;
                    if (!hiddenPresets.includes(presetKey)) {
                        const newHidden = [...hiddenPresets, presetKey];
                        await handleSaveCategories(customCategories, newHidden);
                    }
                }
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const fetchTasks = async () => {
        if (!selectedChildId) return;
        setIsSaving(true);
        try {
            // 从家长 token 中解析出授权码 (licenseCode)
            const decodedParentToken = atob(token);
            const licenseCode = decodedParentToken.split(':')[1];
            const today = new Date().toISOString().split('T')[0];

            // 构造符合 client.ts 预期的 token: child:id:licenseCode
            const childToken = btoa(`child:${selectedChildId}:${licenseCode}`);

            const res = await fetch('/api/kiddieplan/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_today_data', token: childToken, data: { date: today } })
            });
            const result = await res.json();
            if (result.success) {
                setCurrentTasks(result.data.tasks || []);
                setFocusLogs(result.data.focusLogs || []);
            }
        } catch (err) {
            console.error('Fetch tasks failed');
        } finally {
            setIsSaving(false);
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
        if (currentTasks.length === 0) {
            setDialogConfig({
                isOpen: true,
                title: '💡 提示',
                message: '请先添加一些任务再发布哦，给孩子一点动力吧！',
                hideInput: true,
                onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                placeholder: ''
            });
            return;
        }
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
            const finalTime = time || '08:30';
            const isDuplicate = currentTasks.some(t => t.title === title && t.timeSlot === finalTime);

            if (isDuplicate) {
                setDialogConfig({
                    isOpen: true,
                    title: '🚫 任务已重复',
                    message: `“${title}”已经在 ${finalTime} 的清单里了，不需要重复添加哦~`,
                    hideInput: true,
                    onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                    placeholder: ''
                });
                return;
            }

            const newTask: Task = {
                id: `t_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                title,
                timeSlot: finalTime,
                points: points || 10,
                completed: false,
                isRequired: true,
                date: new Date().toISOString().split('T')[0],
                category: selectedCategory
            };
            setCurrentTasks(prev => [...prev, newTask]);
        } else {
            const currentCatName = customCategories.find(c => c.id === selectedCategory)?.name || '自定义';
            const dialogTitle = selectedCategory === 'all' ? '✨ 开启新任务' : `✨ 新增任务 [${currentCatName}]`;

            setDialogConfig({
                isOpen: true,
                title: dialogTitle,
                placeholder: '输入任务名称，例如：阅读30分钟',
                onConfirm: (val, time) => {
                    if (!val) return;
                    const finalTime = time || '08:00';
                    const isDuplicate = currentTasks.some(t => t.title === val && t.timeSlot === finalTime);

                    if (isDuplicate) {
                        alert(`“${val}”已经存在于 ${finalTime} 了哦~`);
                        return;
                    }

                    const newTask: Task = {
                        id: `t_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        title: val,
                        timeSlot: finalTime,
                        points: 10,
                        completed: false,
                        isRequired: true,
                        date: new Date().toISOString().split('T')[0],
                        category: selectedCategory
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

    const handleResetPoints = async () => {
        if (!selectedChild) return;
        setDialogConfig({
            isOpen: true,
            title: '💣 清空糖果确认',
            message: `确定要将 ${selectedChild.name} 的糖果库清零吗？此操作不可撤销哦 ~`,
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    const res = await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_child',
                            token,
                            data: { ...selectedChild, points: 0 }
                        })
                    });
                    const result = await res.json();
                    if (result.success) {
                        setChildren(result.data.children);
                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    }
                } catch (err) {
                    alert('重置失败');
                } finally {
                    setIsSaving(false);
                }
            },
            hideInput: true
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
            showDelete: true,
            onDelete: async () => {
                if (window.confirm(`确定要删除宝贝 ${selectedChild.name} 吗？此操作不可恢复。`)) {
                    try {
                        const res = await fetch('/api/kiddieplan/manage', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'remove_child',
                                token,
                                childId: selectedChild.id
                            })
                        });
                        const result = await res.json();
                        if (result.success) {
                            setChildren(result.data.children);
                            if (result.data.children.length > 0) {
                                setSelectedChildId(result.data.children[0].id);
                            } else {
                                setSelectedChildId(null);
                            }
                            setDialogConfig(prev => ({ ...prev, isOpen: false }));
                        }
                    } catch (err) {
                        alert('删除失败');
                    }
                }
            },
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    const res = await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_child',
                            token,
                            data: { ...selectedChild, name, avatar: avatarRef.current || selectedChild.avatar }
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
        <div className="h-full flex flex-col relative overflow-hidden text-[110%] px-1" style={{ background: 'linear-gradient(160deg, #F0F4FF 0%, #E0E7FF 50%, #F3E8FF 100%)' }}>
            {/* Standard Background Decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#60A5FA]/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-[#FBBF24]/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute top-[30%] left-[60%] w-[30%] h-[30%] bg-[#F87171]/10 rounded-full blur-[80px] pointer-events-none"></div>

            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />

            {/* Main Content Wrapper - Content scrolls UNDER the floating header */}
            <main
                ref={mainScrollRef}
                className="flex-1 w-full overflow-y-auto no-scrollbar relative z-10 scroll-smooth pb-10"
                style={{ scrollBehavior: 'smooth' }}
            >
                {/* Floating Header Wrapper - iOS 26 Extreme Glass Style */}
                <div className="sticky top-0 p-4 z-40">
                    <header
                        className="px-6 py-4 flex justify-between items-center rounded-3xl border border-white/10"
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            backdropFilter: 'blur(6px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(6px) saturate(180%)',
                        }}
                    >
                        {/* Left: Branding & Role (Vertical Stack) */}
                        <div className="flex flex-col">
                            <h1 className="text-[18px] font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 tracking-tight leading-none" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                                星梦奇旅
                            </h1>
                            <span className="text-[10px] font-bold text-gray-400 mt-0.5 leading-none" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>家长端</span>
                        </div>

                        {/* Right: Time & Compact Buttons (Ultra Grouped) */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end mr-0.5">
                                <span className="font-black text-gray-400 font-mono tracking-tighter leading-none" style={{ fontSize: '10.6px' }}>
                                    {formatBeijingTime(currentTime).split(' ')[1]}
                                </span>
                                <span className="font-bold text-gray-300 leading-none mt-0.5" style={{ fontSize: '7.4px' }}>
                                    {formatBeijingTime(currentTime).split(' ')[0]}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => fetchConfig()}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-gray-400 shadow-sm border border-white/20 hover:text-blue-500 transition-colors"
                                    title="同步"
                                >
                                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onLogout}
                                    className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-gray-400 shadow-sm border border-white/20 hover:text-red-400 transition-colors"
                                    title="退出系统"
                                >
                                    <LogOut size={14} />
                                </motion.button>
                            </div>
                        </div>
                    </header>
                </div>

                <div className="px-4 pb-20 space-y-6">
                    {activeTab === 'children' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {/* Children List */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 shadow-[0_8px_20px_rgba(0,0,0,0.03)] border-2 border-white/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 blur-3xl opacity-40"></div>

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

                                <div className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 -mx-2 no-scrollbar">
                                    {children.map(child => (
                                        <motion.div
                                            key={child.id}
                                            onClick={() => setSelectedChildId(child.id)}
                                            whileHover={{ y: -5 }}
                                            className={`flex flex-col items-center gap-3 min-w-[100px] cursor-pointer relative ${selectedChildId === child.id ? 'opacity-100' : 'opacity-60 grayscale-[0.3]'}`}
                                        >
                                            <div className="relative">
                                                <motion.div
                                                    animate={selectedChildId === child.id ? {
                                                        boxShadow: [
                                                            "0 0 10px rgba(255,107,129,0.1)",
                                                            "0 0 25px rgba(255,107,129,0.5)",
                                                            "0 0 10px rgba(255,107,129,0.1)"
                                                        ]
                                                    } : { boxShadow: "0 0 0px rgba(0,0,0,0)" }}
                                                    transition={{
                                                        boxShadow: {
                                                            repeat: Infinity,
                                                            duration: 2.5,
                                                            ease: "easeInOut"
                                                        }
                                                    }}
                                                    className={`w-24 h-24 rounded-full overflow-hidden border-4 transition-all ${selectedChildId === child.id ? 'border-[#FF6B81]' : 'border-transparent shadow-sm'}`}
                                                >
                                                    <img src={child.avatar} alt={child.name} className="w-full h-full object-cover bg-gray-100" />
                                                    {selectedChildId === child.id && (
                                                        <div className="absolute inset-0 border-4 border-white rounded-full pointer-events-none opacity-40"></div>
                                                    )}
                                                </motion.div>

                                                {/* Edit Button Overlay - Persistent mount to avoid double flicker */}
                                                <motion.button
                                                    initial={false}
                                                    animate={{
                                                        scale: selectedChildId === child.id ? 1 : 0,
                                                        opacity: selectedChildId === child.id ? 1 : 0,
                                                        pointerEvents: selectedChildId === child.id ? 'auto' : 'none'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditChild();
                                                    }}
                                                    className="absolute -bottom-1 -right-1 bg-[var(--color-blue-fun)] text-white p-2.5 rounded-full shadow-xl border-4 border-white hover:scale-110 active:scale-95 transition-all z-20"
                                                >
                                                    <Edit2 size={18} fill="currentColor" />
                                                </motion.button>
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
                                    {/* Dual Capsule Dashboard - Action & Rewards Separated */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Left Capsule: Real-time Action */}
                                        <div className={`p-6 rounded-[40px] text-white relative overflow-hidden shadow-xl border-4 border-white flex flex-col justify-between min-h-[160px]
                                            ${selectedChild.isFocusing ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-indigo-400 to-blue-500'}`}>
                                            <div className="absolute top-0 left-0 w-24 h-24 bg-white/20 rounded-full -ml-10 -mt-10 blur-2xl"></div>

                                            <div className="relative z-10 flex items-center gap-2 opacity-90">
                                                <div className="px-2 py-0.5 rounded-lg bg-white/20 border border-white/20 text-[9px] font-black uppercase tracking-widest leading-none">
                                                    房间号
                                                </div>
                                                <span className="text-sm font-black font-mono tracking-tighter">{selectedChild.roomCode}</span>
                                            </div>

                                            <div className="relative z-10 mt-auto">
                                                {selectedChild.isFocusing ? (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">正在进行</div>
                                                        <h2 className="text-xl font-black tracking-tight leading-snug break-words line-clamp-2 drop-shadow-sm min-h-[3rem] flex items-center">
                                                            {selectedChild.currentTaskName}
                                                        </h2>
                                                        <div className="flex items-center gap-1.5 pt-1">
                                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
                                                            <span className="text-sm font-black font-mono tracking-wider opacity-90">{formatTime(liveFocusDuration)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">今日动态</div>
                                                        <h2 className="text-2xl font-black tracking-tight leading-none drop-shadow-sm">正在休息</h2>
                                                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">能量恢复中</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Capsule: Reward Assets */}
                                        <div className="p-6 rounded-[40px] text-white relative overflow-hidden shadow-xl border-4 border-white bg-gradient-to-br from-[#F472B6] to-[#FB923C] flex flex-col justify-between min-h-[160px]">
                                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-10 -mb-10 blur-2xl"></div>

                                            <div className="relative z-10 flex justify-between items-start">
                                                <div className="text-[10px] font-black uppercase tracking-widest opacity-80 pt-1">糖果收益</div>
                                                <motion.button
                                                    whileHover={{ rotate: 180, scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResetPoints();
                                                    }}
                                                    className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/40 transition-all border border-white/30 backdrop-blur-md"
                                                    title="清空收益"
                                                >
                                                    <RotateCcw size={16} />
                                                </motion.button>
                                            </div>

                                            <div className="relative z-10 mt-auto flex items-center gap-2">
                                                <div className="text-5xl font-black tracking-tighter drop-shadow-md leading-none">
                                                    {selectedChild.points || 0}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl leading-none">🍭</span>
                                                    <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70 mt-0.5">糖果收益</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <motion.button
                                            whileHover={{ y: -5, rotate: -1 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setActiveTab('tasks')}
                                            className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(251,191,36,0.05)] border-2 border-white/50 hover:border-yellow-200 transition-all"
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
                                            className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(248,113,113,0.05)] border-2 border-white/50 hover:border-red-200 transition-all"
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
                                            className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(167,139,250,0.05)] border-2 border-white/50 hover:border-purple-200 transition-all"
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
                                            className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-[0_10px_0_rgba(52,211,153,0.05)] border-2 border-white/50 hover:border-emerald-200 transition-all"
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
                            {/* 实时专注状态监控条 */}
                            {selectedChild.isFocusing && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-emerald-50/80 backdrop-blur-md border-2 border-emerald-100 p-4 rounded-[32px] flex items-center justify-between shadow-sm overflow-hidden relative"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200 rounded-full -mr-12 -mt-12 blur-2xl opacity-40"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
                                            <Timer size={24} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">宝贝正在忙碌中...</div>
                                            <div className="text-base font-black text-[#5D4037]">{selectedChild.currentTaskName}</div>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <div className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">{formatTime(liveFocusDuration)}</div>
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase">当前计时</div>
                                    </div>
                                </motion.div>
                            )}

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setActiveTab('children')}
                                        className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-white/30"
                                    >
                                        <ArrowLeft size={20} />
                                    </motion.button>
                                    <h2 className="text-2xl font-black text-[#5D4037]">今日任务清单</h2>
                                </div>
                                {/* Removed global add button as per user request */}
                            </div>

                            {/* Templates */}
                            <div className="flex flex-wrap gap-2 items-center">
                                {/* Category buttons list */}
                                {customCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border-2 flex items-center gap-1
                                    ${selectedCategory === cat.id
                                                ? 'bg-[var(--color-blue-fun)] text-white border-[var(--color-blue-fun)] shadow-md'
                                                : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <span>{cat.icon}</span>
                                        {cat.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setIsManagingCategories(true)}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"
                                >
                                    <Settings size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[100px]">
                                {(() => {
                                    // 1. 获取预设模板
                                    const presetTemplates = TASK_TEMPLATES.find(t => t.category === selectedCategory)?.tasks || [];
                                    const currentCat = customCategories.find(c => c.id === selectedCategory);
                                    const combinedTemplates = [
                                        ...presetTemplates
                                            .filter(t => !hiddenPresets.includes(`${selectedCategory}:${t.title}`))
                                            .map(t => ({ ...t, isCustom: false })),
                                        ...(currentCat?.templates || []).map((t, idx) => ({
                                            ...t,
                                            time: t.timeSlot,
                                            isCustom: true,
                                            idx
                                        }))
                                    ];

                                    return (
                                        <>
                                            {combinedTemplates.map((tmp, i) => (
                                                <div key={`tmp_${i}`} className="relative group">
                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => addTask(tmp.title, tmp.time, tmp.points)}
                                                        className="w-full bg-white p-4 rounded-2xl text-left border-2 border-transparent hover:border-blue-100 shadow-sm flex items-center gap-3"
                                                    >
                                                        <div className="text-2xl flex-shrink-0">{tmp.icon}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-[#5D4037] text-sm truncate">{tmp.title}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold mt-0.5">+{tmp.points} 🍭</div>
                                                        </div>
                                                    </motion.button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTemplate(
                                                                selectedCategory,
                                                                tmp.title,
                                                                tmp.isCustom,
                                                                (tmp as any).isCustom ? (tmp as any).idx : undefined
                                                            );
                                                        }}
                                                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 z-10"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}

                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    handleAddTemplate(selectedCategory);
                                                }}
                                                className="bg-blue-50 p-4 rounded-2xl text-left border-2 border-dashed border-blue-200 hover:bg-blue-100 flex items-center gap-3 justify-center group min-h-[80px]"
                                            >
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--color-blue-fun)] shadow-sm group-hover:scale-110 transition-transform">
                                                    <Plus size={24} />
                                                </div>
                                                <span className="font-bold text-[var(--color-blue-fun)]">
                                                    {selectedCategory === 'all' ? '添加自定义待办' : '定义分类模板'}
                                                </span>
                                            </motion.button>
                                        </>
                                    );
                                })()}
                            </div >

                            <div className="h-px bg-gray-200 my-4" />

                            <div className="relative">
                                {/* Vertical Timeline Axis */}
                                {currentTasks.length > 0 && (
                                    <div className="absolute left-[20px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-blue-200 z-0" />
                                )}

                                <div className="space-y-6 relative z-10">
                                    {[...currentTasks]
                                        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                                        .map((task, idx) => (
                                            <motion.div
                                                layout
                                                key={task.id}
                                                className="flex items-center gap-6"
                                            >
                                                {/* Timeline Node */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-10 h-10 bg-white rounded-full border-2 border-[var(--color-blue-fun)] flex items-center justify-center text-[var(--color-blue-fun)] shadow-sm z-10 relative">
                                                        <Clock size={18} strokeWidth={3} />
                                                    </div>
                                                </div>

                                                {/* Task Card */}
                                                <div className="flex-1 bg-white p-4 rounded-2xl flex justify-between items-center shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-gray-100 hover:border-blue-100 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-[#5D4037]">{task.title}</h4>
                                                        <div className="text-xs text-gray-400 font-bold flex gap-2">
                                                            <span className="text-[var(--color-blue-fun)] bg-blue-50 px-2 py-0.5 rounded-md">{task.timeSlot}</span>
                                                            <span className="text-emerald-400">+{task.points} pts</span>
                                                            {(task.accumulatedTime || 0) > 0 && (
                                                                <span className="text-orange-400 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    <Timer size={10} /> 累计: {formatTime(task.accumulatedTime!)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => editTask(task)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => removeTask(task.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    {currentTasks.length === 0 && (
                                        <div className="text-center py-10 opacity-50 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                            <p className="font-bold text-gray-500">今日尚未添加待办任务</p>
                                            <p className="text-[10px] text-gray-300 mt-1 uppercase font-black">Waiting for your plan</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {
                                currentTasks.length > 0 && (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleSaveTasks}
                                        disabled={isSaving}
                                        className="w-full bg-[#34D399] py-4 rounded-2xl text-white font-black text-lg shadow-[0_8px_0_#059669] active:shadow-none active:translate-y-2 transition-all"
                                    >
                                        {isSaving ? '同步中...' : '发布任务'}
                                    </motion.button>
                                )
                            }
                        </motion.div>
                    )}

                    {activeTab === 'rewards' && selectedChild && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setActiveTab('children')}
                                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100"
                                    >
                                        <ArrowLeft size={20} />
                                    </motion.button>
                                    <h2 className="text-2xl font-black text-[#5D4037]">奖励商店</h2>
                                </div>
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
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setActiveTab('children')}
                                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100"
                                    >
                                        <ArrowLeft size={20} />
                                    </motion.button>
                                    <div>
                                        <h2 className="text-2xl font-black text-[#5D4037]">今日专注记录</h2>
                                        <p className="text-xs text-gray-400 font-bold mt-1">记录孩子每一次努力的时光</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-3xl font-black text-orange-500">
                                        {Math.round(focusLogs.reduce((acc, log) => acc + log.duration, 0) / 60)} <span className="text-sm text-gray-400 font-bold">分钟</span>
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 relative pl-4">
                                {/* Timeline Axis */}
                                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 border-l-2 border-dashed border-gray-200"></div>

                                {focusLogs.length > 0 ? (
                                    focusLogs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map((log, i) => {
                                        const startTime = new Date(log.startTime);
                                        const endTime = new Date(log.endTime);
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="relative flex gap-4"
                                            >
                                                <div className="relative z-10 w-6 h-6 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-orange-500 mt-4 shadow-sm">
                                                    <Zap size={10} fill="currentColor" />
                                                </div>
                                                <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-[#5D4037]">{log.taskTitle}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="bg-orange-50 text-orange-500 px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1">
                                                                    <Timer size={10} /> 专注 {Math.floor(log.duration / 60)} 分 {log.duration % 60} 秒
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-bold text-gray-400">
                                                                {startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                                                <span className="mx-1">-</span>
                                                                {endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                ) : (
                                    <div className="ml-8 py-10 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                        <Target className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                                        <p className="text-gray-400 font-bold text-sm">今天还没有专注记录哦</p>
                                        <p className="text-gray-300 text-xs mt-1">快去提醒宝贝开始任务吧！</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'stats' && selectedChild && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
                            <div className="flex items-center gap-4">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setActiveTab('children')}
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100"
                                >
                                    <ArrowLeft size={20} />
                                </motion.button>
                                <h2 className="text-2xl font-black text-[#5D4037]">统计分析</h2>
                            </div>

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
                                    糖果收益趋势 (近7天)
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
                </div>
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
                                <div className="flex flex-col items-center mb-6">
                                    <div className="relative group cursor-pointer" onClick={() => {
                                        // 重置 file input value 以允许重选相同图片
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                        fileInputRef.current?.click();
                                    }}>
                                        <img src={currentAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=new`} className="w-28 h-28 rounded-full border-4 border-[var(--color-blue-fun)] bg-gray-100 object-cover shadow-lg" />
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                            <Settings size={24} className="mb-1" />
                                            <span className="text-[10px] font-black">更换头像</span>
                                        </div>
                                        {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full"><Sparkles className="animate-spin text-blue-400" /></div>}
                                        <div className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-md text-[var(--color-blue-fun)] border-2 border-[var(--color-blue-fun)]">
                                            <Edit2 size={14} fill="currentColor" />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">点击上方头像修改图片</p>
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
                                        <div className="bg-[#F5F7FA] p-6 rounded-[32px] border-2 border-transparent focus-within:border-blue-100 transition-all">
                                            <div className="flex items-center justify-center gap-4 relative h-32 overflow-hidden">
                                                {/* Hidden input for compatibility */}
                                                <input type="hidden" id="dialogTime" value={`${pickerHour}:${pickerMinute}`} />

                                                {/* Hour Picker */}
                                                <div className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth py-12" id="hourScroll">
                                                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                                                        <div
                                                            key={h}
                                                            id={`hour-${h}`}
                                                            onClick={() => setPickerHour(h)}
                                                            className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all ${pickerHour === h ? 'text-2xl font-black text-blue-500' : 'text-lg font-bold text-gray-300 opacity-50'}`}
                                                        >
                                                            {h}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="text-2xl font-black text-blue-200">:</div>

                                                {/* Minute Picker */}
                                                <div className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth py-12" id="minuteScroll">
                                                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                                                        <div
                                                            key={m}
                                                            id={`minute-${m}`}
                                                            onClick={() => setPickerMinute(m)}
                                                            className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all ${pickerMinute === m ? 'text-2xl font-black text-blue-500' : 'text-lg font-bold text-gray-300 opacity-50'}`}
                                                        >
                                                            {m}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Selection Highlight Bar */}
                                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-12 border-y-2 border-blue-50 pointer-events-none bg-blue-50/10 rounded-xl"></div>
                                            </div>
                                            <div className="flex justify-between mt-4 px-2">
                                                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">小时 (H)</span>
                                                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">分钟 (M)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {dialogConfig.showDelete && (
                                <div className="mt-4">
                                    <button
                                        onClick={dialogConfig.onDelete}
                                        className="w-full py-3 rounded-2xl text-red-500 font-bold text-sm bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> 删除此宝贝
                                    </button>
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
                                        if (uploadingAvatar) {
                                            alert('请等待头像上传完成');
                                            return;
                                        }
                                        const input = document.getElementById('dialogInput') as HTMLInputElement;
                                        const time = document.getElementById('dialogTime') as HTMLInputElement;
                                        dialogConfig.onConfirm(input?.value, time?.value);
                                    }}
                                    disabled={uploadingAvatar || isSaving}
                                    className={`flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all ${uploadingAvatar || isSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[var(--color-blue-fun)] text-white'}`}
                                >
                                    {uploadingAvatar ? '上传中...' : (isSaving ? '处理中...' : '确定')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isManagingCategories && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsManagingCategories(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-white p-6 rounded-[32px] w-full max-w-sm shadow-2xl relative z-60"
                        >
                            <h3 className="text-xl font-black text-[#5D4037] mb-4 text-center">管理任务分类</h3>

                            <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4 pr-1 no-scrollbar">
                                {customCategories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border-2 border-transparent hover:border-blue-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{cat.icon}</span>
                                            <span className="font-bold text-[#5D4037]">{cat.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            disabled={isSaving}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {customCategories.length === 0 && (
                                    <div className="text-center text-gray-400 py-4 text-xs font-bold">暂无分类</div>
                                )}
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="新分类名称 (如: 围棋)"
                                    className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-bold text-[#5D4037] outline-none border-2 border-transparent focus:border-blue-200 transition-colors placeholder:text-gray-300 placeholder:font-normal"
                                    onKeyDown={e => e.key === 'Enter' && handleAddInlineCategory()}
                                />
                                <button
                                    onClick={handleAddInlineCategory}
                                    disabled={isSaving || !newCategoryName.trim()}
                                    className="bg-[var(--color-blue-fun)] text-white w-12 rounded-xl font-bold shadow-md disabled:opacity-50 disabled:shadow-none flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                >
                                    {isSaving ? <Sparkles className="animate-spin" size={20} /> : <Plus size={24} />}
                                </button>
                            </div>

                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => {
                                        if (window.confirm('确定要恢复所有隐藏的系统任务吗？')) {
                                            handleSaveCategories(customCategories, []);
                                        }
                                    }}
                                    className="px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors border-2 border-transparent hover:border-gray-100"
                                >
                                    <RotateCcw size={16} /> 恢复预设
                                </button>
                                <button
                                    onClick={() => setIsManagingCategories(false)}
                                    className="flex-1 py-3 text-[#5D4037] font-black hover:text-blue-500 transition-colors bg-blue-50 rounded-xl"
                                >
                                    完成
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

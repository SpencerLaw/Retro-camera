import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogOut, Plus, Trash2, Calendar, Gift, Settings, Clock, ArrowLeft, Trophy, AlertCircle, Save, Sparkles, LayoutGrid, Edit2, Star, ListTodo, Home, Timer, UserPlus, Check, CalendarCheck, BarChart3, RotateCcw, Zap, Target, RefreshCw, CheckCircle2, ArrowRight, Flame, Menu, ShieldCheck, Camera, Scan, X } from 'lucide-react';
import { Child, Task, Reward, TaskCategory, Category, CategoryTemplate, FocusLog, RedemptionLog, ScannedTask } from '../types';
import { TASK_TEMPLATES, DEFAULT_REWARDS, DEFAULT_CATEGORIES, REWARD_CATEGORIES } from '../constants/templates';
import { performOCR } from '../services/ocrService';
import { motion, AnimatePresence } from 'framer-motion';

interface ParentPortalProps {
    token: string;
    onLogout: () => void;
}

type AppTab = 'children' | 'tasks' | 'rewards' | 'registry' | 'stats' | 'redemption';

const ParentPortal: React.FC<ParentPortalProps> = ({ token, onLogout }) => {
    const [children, setChildren] = useState<Child[]>([]);
    const [licenseData, setLicenseData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeTab, setActiveTab] = useState<AppTab>('children');
    const [rewardSubTab, setRewardSubTab] = useState<'pool' | 'drafts' | 'published'>('pool');
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const selectedChild = children.find(c => c.id === selectedChildId);

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
        onConfirm: (val: string, extra?: string, points?: number) => void;
        defaultValue?: string;
        defaultExtra?: string;
        defaultPoints?: number;
        showTime?: boolean;
        showPoints?: boolean;
        showAvatarUpload?: boolean;
        message?: string;
        highlight?: string;
        hideInput?: boolean;
        showDelete?: boolean;
        onDelete?: () => void;
        showPublish?: boolean;
        onPublish?: (val: string, pts: number) => void;
        publishText?: string;
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
    const [redemptionLogs, setRedemptionLogs] = useState<RedemptionLog[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedRewardCategory, setSelectedRewardCategory] = useState<string>('family');
    const [taskCategories, setTaskCategories] = useState<Category[]>([]);
    const [rewardCategories, setRewardCategories] = useState<Category[]>([]);
    const [managingType, setManagingType] = useState<'tasks' | 'rewards'>('tasks');
    const [hiddenPresets, setHiddenPresets] = useState<string[]>([]);
    const [hiddenRewardPresets, setHiddenRewardPresets] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [isEditingRewardCategory, setIsEditingRewardCategory] = useState(false);
    const [draftRewardCategory, setDraftRewardCategory] = useState<Category | null>(null);
    const [draftCategoryTemplates, setDraftCategoryTemplates] = useState<any[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedStatsDate, setSelectedStatsDate] = useState(formatBeijingTime(new Date()).split(' ')[0]);
    const mainScrollRef = useRef<HTMLElement>(null);
    const tabScrollPositions = useRef<Record<string, number>>({});

    // Smart Polling Logic
    const [isIdle, setIsIdle] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // Live Focus Timer State for Parent View
    const [liveFocusDuration, setLiveFocusDuration] = useState(0);

    const [parentToast, setParentToast] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });
    const prevPendingCount = useRef(0);

    // OCR & Scanning State
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [scannedResults, setScannedResults] = useState<ScannedTask[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const selectedChild = children.find(c => c.id === selectedChildId);
        if (selectedChild?.isFocusing) {
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

    // Background Polling for Updates (Redemption, Sync)
    useEffect(() => {
        const poll = async () => {
            if (isIdle || !selectedChildId) return;
            // Silent sync
            fetchConfig(true);
            fetchRedemptionHistory();
        };

        const interval = setInterval(poll, 30000); // 30s
        return () => clearInterval(interval);
    }, [isIdle, selectedChildId]);

    useEffect(() => {
        // Restore position for NEW activeTab
        const prevPos = tabScrollPositions.current[activeTab] || 0;
        if (mainScrollRef.current) {
            // Use smooth only if it's the first time (top) or specific transition
            // For restoration, auto is more immediate and less jarring
            mainScrollRef.current.scrollTo({ top: prevPos, behavior: prevPos === 0 ? 'smooth' : 'auto' });
        }

        return () => {
            // Save position of PREVIOUS activeTab before it changes
            if (mainScrollRef.current) {
                tabScrollPositions.current[activeTab] = mainScrollRef.current.scrollTop;
            }
        };
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
            if (activeTab === 'stats') {
                setFocusLogs([]); // Clear stale logs before refreshing
                setCurrentTasks([]); // Clear stale tasks before refreshing
                fetchTasks();     // Refresh both tasks and logs
            }
        }
    }, [selectedChildId, activeTab]);

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

                // 发现授权码数据被删除了（例如后台直接清理了记录），强制退出。
                if (childrenList.length === 0 && !result.data.code && result.data.progress && Object.keys(result.data.progress).length === 0) {
                    alert("当前授权数据失效或已被清除，请重新登录");
                    // 彻底清除持久化 Token，防止进入自动登录死循环
                    localStorage.removeItem('kp_parent_token');
                    localStorage.removeItem('kp_parent_auth_time');
                    localStorage.removeItem('kp_token');
                    localStorage.removeItem('kp_role');
                    onLogout();
                    return;
                }

                if (childrenList.length > 0 && !selectedChildId) {
                    setSelectedChildId(childrenList[0].id);
                }

                // 加载分类 (任务)
                let activeTaskCats = result.data.categories || [];
                if (activeTaskCats.length === 0) {
                    activeTaskCats = DEFAULT_CATEGORIES;
                }
                setTaskCategories(activeTaskCats);

                // 加载分类 (奖励)
                let activeRewardCats = result.data.rewardCategories || [];
                if (activeRewardCats.length === 0) {
                    activeRewardCats = REWARD_CATEGORIES;
                }
                setRewardCategories(activeRewardCats);

                // 如果当前没选中或选中的任务分类不存在了，默认选第一个
                if (!selectedCategory || !activeTaskCats.find((c: any) => c.id === selectedCategory)) {
                    if (activeTaskCats.length > 0) setSelectedCategory(activeTaskCats[0].id);
                }

                // 如果当前选中的奖励分类不存在了，默认选第一个
                if (!selectedRewardCategory || !activeRewardCats.find((c: any) => c.id === selectedRewardCategory)) {
                    if (activeRewardCats.length > 0) setSelectedRewardCategory(activeRewardCats[0].id);
                }

                // 加载隐藏的预设
                if (result.data.hiddenPresets) {
                    setHiddenPresets(result.data.hiddenPresets);
                }
                if (result.data.hiddenRewardPresets) {
                    setHiddenRewardPresets(result.data.hiddenRewardPresets);
                }

                // 核心同步：从 license 聚合对象中提取当前孩子的专注日志
                const today = formatBeijingTime(new Date()).split(' ')[0];
                const dailyData = result.data.progress?.[today]?.[selectedChildId];
                const newLogs = dailyData?.focusLogs || [];
                setFocusLogs(prev => JSON.stringify(prev) !== JSON.stringify(newLogs) ? newLogs : prev);

                // 核心修复: 实时同步孩子的任务状态 (包括 completed 标记)
                if (selectedChildId) {
                    const currentChild = childrenList.find((c: Child) => c.id === selectedChildId);
                    if (currentChild && currentChild.tasks) {
                        setCurrentTasks(prev => JSON.stringify(prev) !== JSON.stringify(currentChild.tasks) ? currentChild.tasks : prev);
                    }
                }
            }
        } catch (err) {
            console.error('Fetch failed');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [token, selectedChildId, selectedCategory, onLogout]); // Memoized for polling dependency

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

    const handleSaveCategories = async (newCategories: Category[], newHiddenPresets?: string[], newHiddenRewardPresets?: string[], type: 'tasks' | 'rewards' = 'tasks') => {
        setIsSaving(true);
        // Optimistic UI updates for faster perceived performance, especially for presets
        if (newHiddenPresets !== undefined) setHiddenPresets(newHiddenPresets);
        if (newHiddenRewardPresets !== undefined) setHiddenRewardPresets(newHiddenRewardPresets);
        if (type === 'tasks') setTaskCategories(newCategories);
        else setRewardCategories(newCategories);

        try {
            const payload: any = {
                action: 'save_categories',
                token,
                data: {
                    hiddenPresets: newHiddenPresets || hiddenPresets,
                    hiddenRewardPresets: newHiddenRewardPresets || hiddenRewardPresets
                }
            };

            if (type === 'tasks') {
                payload.data.categories = newCategories;
            } else {
                payload.data.rewardCategories = newCategories;
            }

            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!result.success) {
                alert(result.message);
                // Rollback on failure could be implemented here if critical
            }
        } catch (e) {
            console.error(e);
            alert('保存失败');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveCategory = async (name: string, icon: string, type: 'tasks' | 'rewards') => {
        if (!name) return;
        const targetCats = type === 'tasks' ? taskCategories : rewardCategories;
        const newCat = { id: `cat_${Date.now()}`, name, icon, templates: [] };
        await handleSaveCategories([...targetCats, newCat], undefined, undefined, type);
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteCategory = async (id: string, type: 'tasks' | 'rewards') => {
        setDialogConfig({
            isOpen: true,
            title: '删除分类',
            message: '确定要删除这个分类吗？此操作不可恢复。此外，属于该分类的任务/奖励将不再受分类筛选。',
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                const targetCats = type === 'tasks' ? taskCategories : rewardCategories;
                const newCats = targetCats.filter(c => c.id !== id);
                await handleSaveCategories(newCats, undefined, undefined, type);
                if (type === 'tasks' && id === selectedCategory && newCats.length > 0) {
                    setSelectedCategory(newCats[0].id);
                } else if (type === 'rewards' && id === selectedRewardCategory && newCats.length > 0) {
                    setSelectedRewardCategory(newCats[0].id);
                }
            }
        });
    };

    const handleAddInlineCategory = async () => {
        if (!newCategoryName.trim()) return;
        const targetCats = managingType === 'tasks' ? taskCategories : rewardCategories;
        const newCat: Category = { id: `cat_${Date.now()}`, name: newCategoryName.trim(), icon: '✨', templates: [] };
        await handleSaveCategories([...targetCats, newCat], undefined, undefined, managingType);
        setNewCategoryName('');
    };

    const handleAddTemplate = (catId: string) => {
        const cat = taskCategories.find(c => c.id === catId);
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

                const newCategories = taskCategories.map(c => {
                    if (c.id === catId) {
                        return { ...c, templates: [...(c.templates || []), newTemplate] };
                    }
                    return c;
                });

                await handleSaveCategories(newCategories, undefined, undefined, 'tasks');
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteTemplate = async (catId: string, templateTitle: string, isCustom: boolean, templateIndex?: number) => {
        const msg = isCustom ? '确定要删除这个自定义任务模板吗？' : '确定要隐藏这个预设任务模板吗？之后您可以重置设置来找回它。';

        setDialogConfig({
            isOpen: true,
            title: '隐藏预设',
            message: `确定要不再显示“${templateTitle}”吗？`,
            onConfirm: async () => {
                if (isCustom && templateIndex !== undefined) {
                    const newCategories = taskCategories.map(c => {
                        if (c.id === catId) {
                            const newTemplates = [...(c.templates || [])];
                            newTemplates.splice(templateIndex, 1);
                            return { ...c, templates: newTemplates };
                        }
                        return c;
                    });
                    await handleSaveCategories(newCategories, undefined, undefined, 'tasks');
                } else {
                    // 隐藏预设模板
                    const presetKey = `${catId}:${templateTitle}`;
                    if (!hiddenPresets.includes(presetKey)) {
                        const newHidden = [...hiddenPresets, presetKey];
                        await handleSaveCategories(taskCategories, newHidden, undefined, 'tasks');
                    }
                }
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            },
            hideInput: true
        });
    };

    const handleDeleteRewardTemplate = (category: string, rewardName: string) => {
        setDialogConfig({
            isOpen: true,
            title: '隐藏奖励预设',
            message: `确定要不再显示“${rewardName}”吗？`,
            onConfirm: async () => {
                const presetKey = `${category}:${rewardName}`;
                if (!hiddenRewardPresets.includes(presetKey)) {
                    const newHidden = [...hiddenRewardPresets, presetKey];
                    await handleSaveCategories(rewardCategories, hiddenPresets, newHidden, 'rewards');
                }
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            },
            hideInput: true
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
                // 允许为空数组，不强制加载默认值，防止用户无法清空
                setRewards(result.data.rewards !== undefined ? result.data.rewards : []);
            }
        } catch (err) {
            console.error('Fetch rewards failed');
        }
    };

    const fetchRedemptionHistory = async () => {
        if (!selectedChildId) return;
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_redemption_history', token, data: { childId: selectedChildId } })
            });
            const result = await res.json();
            if (result.success) {
                setRedemptionLogs(result.data || []);
            }
        } catch (err) {
            console.error('Fetch history failed');
        }
    };

    useEffect(() => {
        if (activeTab === 'rewards' && selectedChildId) {
            fetchRedemptionHistory();
        }
    }, [activeTab, selectedChildId]);

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

    const handleSyncWithBackend = async (targetRewards: Reward[], successMessage: string) => {
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_rewards',
                    token,
                    data: { childId: selectedChildId, rewards: targetRewards }
                })
            });
            const result = await res.json();
            if (result.success) {
                setDialogConfig({
                    isOpen: true,
                    title: '🎁 奖励已同步',
                    placeholder: '',
                    message: successMessage,
                    onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                    hideInput: true
                });
            } else {
                throw new Error(result.message || '同步失败');
            }
        } catch (err) {
            alert('同步失败: ' + err);
            throw err;
        }
    };

    const handleSaveRewards = async () => {
        if (!selectedChildId) return;
        setIsSaving(true);
        try {
            await handleSyncWithBackend(rewards, '你设定的“成长银行”奖励项已更新，快去鼓励孩子吧！');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteChild = async () => {
        setDialogConfig({
            isOpen: true,
            title: '删除宝贝',
            message: `确定要删除宝贝 ${selectedChild?.name} 吗?此操作不可恢复。`,
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    setIsSaving(true);
                    const res = await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'remove_child',
                            token,
                            childId: selectedChildId
                        })
                    });
                    const result = await res.json();
                    if (result.success) {
                        const updated = children.filter(c => c.id !== selectedChildId);
                        setChildren(updated);
                        if (updated.length > 0) {
                            setSelectedChildId(updated[0].id);
                        } else {
                            setSelectedChildId(null);
                        }
                    }
                } catch (e) {
                    alert('删除失败');
                } finally {
                    setIsSaving(false);
                }
            },
            hideInput: true
        });
    };

    const addTask = (title?: string, time?: string, points?: number) => {
        const selectedChild = children.find(c => c.id === selectedChildId);

        if (title) {
            const finalTime = time || '08:30';

            setDialogConfig({
                isOpen: true,
                title: '📝 确认添加任务',
                message: `是否要给 ${selectedChild?.name || '宝贝'} 添加“${title}”任务？`,
                hideInput: true,
                onConfirm: () => {
                    const isDuplicate = currentTasks.some(t => t.title === title && t.timeSlot === finalTime);
                    if (isDuplicate) {
                        alert(`“${title}”已经在 ${finalTime} 的清单里了~`);
                    } else {
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
                    }
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            const currentCatName = taskCategories.find(c => c.id === selectedCategory)?.name || '自定义';
            const dialogTitle = selectedCategory === 'all' ? '✨ 开启新任务' : `✨ 新增任务 [${currentCatName}]`;

            setDialogConfig({
                isOpen: true,
                title: dialogTitle,
                placeholder: '输入任务名称，例如：阅读30分钟',
                showPoints: true,
                defaultPoints: 10,
                onConfirm: (val, time, pts) => {
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
                        points: pts || 10,
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

    const handleAddRewardCategory = () => {
        setDialogConfig({
            isOpen: true,
            title: '✨ 新增奖励标签',
            placeholder: '输入标签名称（例如：周末奖赏）',
            onConfirm: async (val) => {
                if (!val) return;
                const newCat: Category = {
                    id: `cat_${Date.now()}`,
                    name: val,
                    icon: '🎯',
                    templates: []
                };
                const updated = [...rewardCategories, newCat];
                setRewardCategories(updated);

                try {
                    await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_categories',
                            token,
                            data: {
                                categories: taskCategories,
                                rewardCategories: updated,
                                hiddenPresets,
                                hiddenRewardPresets
                            }
                        })
                    });
                } catch (e) {
                    console.error('Save failed', e);
                }
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                setSelectedRewardCategory(newCat.id);
            }
        });
    };

    const openRewardCategoryEditor = (catId: string) => {
        const cat = rewardCategories.find(c => c.id === catId);
        if (!cat) return;
        setDraftRewardCategory({ ...cat });
        // Include both existing templates and potentially visible presets as editable items?
        // User wants to see ALL items. Let's merge them for the editor.
        const templates = cat.templates || [];
        // We also show presets that belong to this category so they can be "modified"
        const presets = DEFAULT_REWARDS.filter(r => r.category === catId).map(p => ({ ...p, isPreset: true, id: `preset_${p.name}` }));

        setDraftCategoryTemplates([...presets, ...templates]);
        setIsEditingRewardCategory(true);
    };

    const handleSaveRewardCategoryEditor = async () => {
        if (!draftRewardCategory) return;
        setIsSaving(true);
        try {
            // Distinguish between presets (to hide if "removed" or modified) and templates
            const finalTemplates = draftCategoryTemplates.filter(t => !t.isPreset && t.name.trim() !== '');
            const modifiedPresets = draftCategoryTemplates.filter(t => t.isPreset);

            // Check which presets were "removed" from the editor list
            const currentPresets = DEFAULT_REWARDS.filter(r => r.category === draftRewardCategory.id);
            let newHiddenPresets = [...hiddenRewardPresets];

            currentPresets.forEach(cp => {
                const stillExists = modifiedPresets.some(mp => mp.name === cp.name);
                const identifier = `${draftRewardCategory.id}:${cp.name}`;
                if (!stillExists && !newHiddenPresets.includes(identifier)) {
                    newHiddenPresets.push(identifier);
                } else if (stillExists && newHiddenPresets.includes(identifier)) {
                    newHiddenPresets = newHiddenPresets.filter(h => h !== identifier);
                }
            });

            const updatedCategories = rewardCategories.map(c =>
                c.id === draftRewardCategory.id ? { ...draftRewardCategory, templates: finalTemplates } : c
            );

            await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_categories',
                    token,
                    data: {
                        categories: taskCategories,
                        rewardCategories: updatedCategories,
                        hiddenPresets,
                        hiddenRewardPresets: newHiddenPresets
                    }
                })
            });

            setRewardCategories(updatedCategories);
            setHiddenRewardPresets(newHiddenPresets);
            setIsEditingRewardCategory(false);
            handleSyncWithBackend(rewards, '该分类资源库已同步完成！');
        } catch (e) {
            console.error('Save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    const promptDeleteRewardCategory = () => {
        if (!draftRewardCategory) return;
        setDialogConfig({
            isOpen: true,
            title: '删除整个分类？',
            message: `确定要删除分类“${draftRewardCategory.name}”以及它里面的所有草稿和已发布奖励吗？此操作不可恢复。`,
            onConfirm: async () => {
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                setIsSaving(true);
                try {
                    const updatedCategories = rewardCategories.filter(c => c.id !== draftRewardCategory.id);
                    const updatedRewards = rewards.filter(r => r.category !== draftRewardCategory.id);

                    await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_categories',
                            token,
                            data: { categories: taskCategories, rewardCategories: updatedCategories, hiddenPresets, hiddenRewardPresets }
                        })
                    });
                    await handleSyncWithBackend(updatedRewards, '已彻底删除该分类及全部项目！');

                    setRewardCategories(updatedCategories);
                    setRewards(updatedRewards);
                    if (selectedRewardCategory === draftRewardCategory.id && updatedCategories.length > 0) {
                        setSelectedRewardCategory(updatedCategories[0].id);
                    } else if (updatedCategories.length === 0) {
                        setSelectedRewardCategory('');
                    }
                    setIsEditingRewardCategory(false);
                } catch (e) {
                    console.error('Delete failed', e);
                } finally {
                    setIsSaving(false);
                }
            }
        });
    };

    const openPoolItemDialog = (item: any) => {
        setDialogConfig({
            isOpen: true,
            title: item.isPreset ? '✨ 管理系统奖励' : '🎁 编辑自定义项',
            placeholder: '名称',
            defaultValue: item.name,
            showPoints: true,
            defaultPoints: item.pointsCost || 500,
            showDelete: true,
            onDelete: () => {
                if (item.isPreset) {
                    const newHidden = [...hiddenRewardPresets, `${selectedRewardCategory}:${item.name}`];
                    handleSaveCategories(rewardCategories, undefined, newHidden, 'rewards');
                } else {
                    const newCategories = rewardCategories.map(c => {
                        if (c.id === selectedRewardCategory) {
                            return { ...c, templates: (c.templates || []).filter((t: any) => t.id !== item.id) };
                        }
                        return c;
                    });
                    handleSaveCategories(newCategories, undefined, undefined, 'rewards');
                }
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            },
            onConfirm: (name, _, pts) => {
                if (!name) return;
                if (item.isPreset) {
                    const newHidden = [...hiddenRewardPresets, `${selectedRewardCategory}:${item.name}`];
                    const newTemplate = { id: `r_tpl_${Date.now()}`, name, icon: item.icon, pointsCost: pts || 500 };
                    const newCategories = rewardCategories.map(c => {
                        if (c.id === selectedRewardCategory) {
                            return { ...c, templates: [...(c.templates || []), newTemplate] };
                        }
                        return c;
                    });
                    handleSaveCategories(newCategories, undefined, newHidden, 'rewards');
                } else {
                    const newCategories = rewardCategories.map(c => {
                        if (c.id === selectedRewardCategory) {
                            return {
                                ...c,
                                templates: (c.templates || []).map((t: any) => t.id === item.id ? { ...t, name, pointsCost: pts || 500 } : t)
                            };
                        }
                        return c;
                    });
                    handleSaveCategories(newCategories, undefined, undefined, 'rewards');
                }
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            },
            showPublish: true,
            publishText: '放入待发布',
            onPublish: (name, pts) => {
                const newReward: Reward = {
                    id: `r_${Date.now()}`,
                    name: name || item.name,
                    pointsCost: pts || item.pointsCost || 500,
                    icon: item.icon || '🎁',
                    category: selectedRewardCategory,
                    isPublished: false
                };
                setRewards(prev => [...prev, newReward]);
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                setRewardSubTab('drafts');
            }
        });
    };

    const handleAddPoolReward = () => {
        setDialogConfig({
            isOpen: true,
            title: '🌟 新增奖励模板',
            placeholder: '输入奖励名称',
            showPoints: true,
            defaultPoints: 500,
            onConfirm: (name, _, pts) => {
                if (!name) return;
                const newTemplate = { id: `r_tpl_${Date.now()}`, name, icon: '🎁', pointsCost: pts || 500 };
                const newCategories = rewardCategories.map(c => {
                    if (c.id === selectedRewardCategory) {
                        return { ...c, templates: [...(c.templates || []), newTemplate] };
                    }
                    return c;
                });
                handleSaveCategories(newCategories, undefined, undefined, 'rewards');
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleAddReward = (importedReward?: Partial<Reward>) => {
        // Legacy function - keeping it for compatibility if called from elsewhere, 
        // but redirecting to the new pool item dialog if it's a preset lookalike.
        if (importedReward) {
            openPoolItemDialog({ ...importedReward, isPreset: true });
            return;
        }
        handleAddPoolReward();
    };
    const editTask = (task: Task) => {
        setDialogConfig({
            isOpen: true,
            title: '📝 编辑任务',
            message: `修改“${task.title}”`,
            placeholder: '任务名称',
            defaultValue: task.title,
            defaultExtra: task.timeSlot,
            defaultPoints: task.points,
            showTime: true,
            showPoints: true,
            onConfirm: (newTitle, newTime, newPoints) => {
                if (!newTitle) return;
                setCurrentTasks(prev => prev.map(t => t.id === task.id ? {
                    ...t,
                    title: newTitle,
                    timeSlot: newTime || t.timeSlot,
                    points: newPoints || t.points
                } : t));
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const editReward = (reward: Reward) => {
        setDialogConfig({
            isOpen: true,
            title: '✨ 修改奖励项',
            defaultValue: reward.name,
            defaultPoints: reward.pointsCost,
            showPoints: true,
            onConfirm: (newName, _, newPoints) => {
                if (!newName) return;
                setRewards(prev => prev.map(r => r.id === reward.id ? {
                    ...r,
                    name: newName,
                    pointsCost: newPoints || r.pointsCost
                } : r));
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleRedeemReward = async (reward: Reward) => {
        if (!selectedChild) return;
        if (selectedChild.points < reward.pointsCost) {
            setDialogConfig({
                isOpen: true,
                title: '🍬 糖果不够啦',
                message: `兑换需 ${reward.pointsCost} 糖果，目前只有 ${selectedChild.points} 颗哦，加油呀！`,
                onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                hideInput: true
            });
            return;
        }

        setDialogConfig({
            isOpen: true,
            title: '🎁 确认核销奖励',
            message: `确定要消耗 ${reward.pointsCost} 糖果兑换“${reward.name}”吗？`,
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    const res = await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'save_child',
                            token,
                            data: { ...selectedChild, points: selectedChild.points - reward.pointsCost }
                        })
                    });

                    // 记录核销历史
                    await fetch('/api/kiddieplan/manage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'record_redemption',
                            token,
                            data: {
                                childId: selectedChildId,
                                rewardName: reward.name,
                                pointsCost: reward.pointsCost,
                                remainingPoints: selectedChild.points - reward.pointsCost
                            }
                        })
                    });

                    const result = await res.json();
                    if (result.success) {
                        setChildren(result.data.children);
                        fetchRedemptionHistory(); // Refresh history
                        setDialogConfig({
                            isOpen: true,
                            title: '🎉 兑换成功！',
                            message: `已扣除 ${reward.pointsCost} 糖果，快带宝贝去享受奖励吧！`,
                            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                            hideInput: true,
                            highlight: 'SUCCESS'
                        });
                    }
                } catch (err) {
                    alert('核销失败');
                } finally {
                    setIsSaving(false);
                }
            },
            hideInput: true
        });
    };

    const handleApproveRedemption = async (logId: string) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve_redemption', token, data: { logId } })
            });
            const result = await res.json();
            if (result.success) {
                // 刷新数据以更新积分
                const configRes = await fetch('/api/kiddieplan/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_config', token })
                });
                const config = await configRes.json();
                if (config.success) {
                    setChildren(config.data.children);
                }
                fetchRedemptionHistory();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('审批失败');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRejectRedemption = async (logId: string) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject_redemption', token, data: { logId } })
            });
            const result = await res.json();
            if (result.success) {
                fetchRedemptionHistory();
            }
        } catch (err) {
            alert('拒绝失败');
        } finally {
            setIsSaving(false);
        }
    };

    const removeReward = (id: string) => {
        setDialogConfig({
            isOpen: true,
            title: '删除奖励项',
            message: '确定要删除这个奖励项吗？',
            onConfirm: () => {
                setRewards(prev => prev.filter(r => r.id !== id));
                setDialogConfig(prev => ({ ...prev, isOpen: false }));
            },
            hideInput: true
        });
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
            onDelete: () => {
                setDialogConfig(prev => ({ ...prev, isOpen: false })); // Close current dialog
                handleDeleteChild(); // Open delete confirmation dialog
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
        <div className="flex-1 flex flex-col items-center justify-center font-candy space-y-4" >
            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-[var(--color-blue-fun)] rounded-3xl"
            ></motion.div>
            <p className="text-xl text-[#5D4037] opacity-60 font-bold">载入中...</p>
        </div >
    );

    const selectedChildIdLocal = selectedChildId; // placeholder to satisfy ref logic if needed

    // Dynamic Theme System
    const CHILD_THEMES = [
        { name: 'pink', bg: 'from-pink-100 to-pink-200', ring: 'ring-[#F472B6]', text: 'text-[#F472B6]', border: 'border-pink-300', shadow: 'shadow-pink-300', line: 'bg-[#F472B6]' },
        { name: 'blue', bg: 'from-blue-100 to-blue-200', ring: 'ring-[#60A5FA]', text: 'text-[#60A5FA]', border: 'border-blue-300', shadow: 'shadow-blue-300', line: 'bg-[#60A5FA]' },
        { name: 'violet', bg: 'from-violet-100 to-violet-200', ring: 'ring-[#A78BFA]', text: 'text-[#A78BFA]', border: 'border-violet-300', shadow: 'shadow-violet-300', line: 'bg-[#A78BFA]' },
    ];

    const currentTheme = selectedChild
        ? CHILD_THEMES[children.findIndex(c => c.id === selectedChild.id) % CHILD_THEMES.length]
        : CHILD_THEMES[0];

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            alert('无法启动摄像头，请确保已授权访问');
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    useEffect(() => {
        if (isScanning) {
            startCamera();
        } else {
            stopCamera();
        }
    }, [isScanning]);

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        setIsProcessingOCR(true);
        try {
            const results = await performOCR(imageData);
            setScannedResults(results);
        } catch (err) {
            alert('识别失败，请重试');
        } finally {
            setIsProcessingOCR(false);
        }
    };

    const handleConfirmScannedTasks = async () => {
        if (scannedResults.length === 0 || !selectedChildId) return;

        const today = new Date().toISOString().split('T')[0];
        const newTasks: Task[] = scannedResults.map(res => ({
            id: `t_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: res.title,
            timeSlot: res.time,
            points: res.points,
            completed: false,
            isRequired: true,
            date: today,
            category: selectedCategory || 'all'
        }));

        const updatedTasks = [...currentTasks, ...newTasks];
        setCurrentTasks(updatedTasks);
        
        setIsSaving(true);
        try {
            const res = await fetch('/api/kiddieplan/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'publish_tasks',
                    token,
                    data: { childId: selectedChildId, tasks: updatedTasks, date: today }
                })
            });
            const result = await res.json();
            if (result.success) {
                setScannedResults([]);
                setIsScanning(false);
                stopCamera();
                
                setDialogConfig({
                    isOpen: true,
                    title: '✨ 识别并发布成功！',
                    placeholder: '',
                    message: `已成功从作业中提取并发布 ${newTasks.length} 个任务。`,
                    onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
                    hideInput: true
                });
            } else {
                alert('发布失败: ' + result.message);
            }
        } catch (err) {
            alert('发布失败，请检查网络');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className={`flex flex-col h-full w-full overflow-hidden font-sans relative transition-colors duration-1000 bg-gradient-to-br ${currentTheme.bg}`}
            style={{
                overscrollBehavior: 'none'
            }}
        >
            {/* Decorative Blurs */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-pink-200 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-blue-200 rounded-full translate-x-1/2 blur-3xl opacity-40 pointer-events-none"></div>

            {/* Parent Notification Toast (Cloud) */}
            <AnimatePresence>
                {parentToast.show && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -20 }}
                        onClick={() => {
                            setActiveTab('redemption');
                            setParentToast({ show: false, count: 0 });
                        }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] cursor-pointer"
                    >
                        <div className="relative group">
                            {/* Cloud Body using SVGs for that organic look */}
                            <div className="relative bg-white/90 backdrop-blur-xl px-6 py-4 rounded-[40px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-white flex items-center gap-4 min-w-[280px]">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white/90 rounded-full blur-[2px]" />
                                <div className="absolute -top-2 left-1/3 w-6 h-6 bg-white/90 rounded-full blur-[1px]" />

                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl animate-bounce">
                                    🎁
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-[#5D4037] text-sm">宝贝呼叫家长！</span>
                                    <p className="text-[10px] text-gray-400 font-bold">发出了奖励申请，快去审批吧 ~</p>
                                </div>
                                <div className="ml-2 flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                                    {parentToast.count}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />

            {/* Main Area - Everything scrolls under the glassy header */}
            <main
                ref={mainScrollRef as any}
                onScroll={(e) => {
                    const top = e.currentTarget.scrollTop;
                    // 仅在此处做收缩判断，展开由点击 Header 触发
                    if (top > 40 && !isScrolled) setIsScrolled(true);
                }}
                className="flex-1 w-full overflow-y-auto no-scrollbar relative z-10"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {/* Top Bar - Harmonized with ChildPortal */}
                <div className="sticky top-0 p-4 z-40">
                    <header
                        onClick={() => {
                            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                            if (isScrolled) setIsScrolled(false);
                        }}
                        className={`px-6 transition-all duration-500 flex justify-between items-center rounded-3xl border border-white/20 ${isScrolled ? 'py-3 shadow-sm cursor-pointer hover:bg-white/30' : 'py-4 shadow-none'}`}
                        style={{
                            background: isScrolled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        }}
                    >
                        <div className="flex flex-col cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                            if (isScrolled) setIsScrolled(false);
                        }}>
                            <h1 className={`text-[18px] font-black tracking-tight leading-none flex items-center gap-2 ${currentTheme.text}`} style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                                星梦奇旅
                            </h1>
                            <AnimatePresence>
                                {!isScrolled && (
                                    <motion.span
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="text-[10px] font-bold text-gray-400 mt-0.5 leading-none"
                                        style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}
                                    >
                                        家长端
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Center: Mini Profile when Scrolled */}
                        <AnimatePresence>
                            {isScrolled && selectedChild && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                        if (isScrolled) setIsScrolled(false);
                                    }}
                                    className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/50 shadow-sm cursor-pointer hover:bg-white/60"
                                >
                                    <img
                                        src={selectedChild.avatar}
                                        className="w-6 h-6 rounded-full object-cover border border-white shadow-sm"
                                        alt={selectedChild.name}
                                    />
                                    <span className="text-xs font-black text-gray-700 tracking-tight">
                                        {selectedChild.name}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Right: Scan, Time & Compact Buttons */}
                        <div className="flex items-center gap-2">
                            {/* Universal Scan Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsScanning(true);
                                }}
                                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-blue-200 transition-all"
                                title="拍照识别作业"
                            >
                                <Scan size={20} />
                            </motion.button>

                            <div className="flex items-center gap-3 ml-2">
                                {isScrolled && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsScrolled(false);
                                            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="p-2 bg-white/40 backdrop-blur-md rounded-xl text-gray-500 hover:bg-white/60 transition-colors"
                                    >
                                        <Menu size={20} />
                                    </motion.button>
                                )}
                                <div className="flex flex-col items-end mr-0.5">
                                    <span className="font-black text-gray-400 font-mono tracking-tighter leading-none" style={{ fontSize: '10.6px' }}>
                                        {formatBeijingTime(currentTime).split(' ')[1]}
                                    </span>
                                    <span className="font-bold text-gray-300 leading-none mt-0.5" style={{ fontSize: '7.4px' }}>
                                        {formatBeijingTime(currentTime).split(' ')[0]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </header>
                </div>

                {/* Child Selector Row - Collapsible */}
                <AnimatePresence>
                    {!isScrolled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="overflow-hidden mx-4 mb-6 bg-white/20 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-sm"
                        >
                            <div className={`flex items-start gap-4 overflow-x-auto no-scrollbar pb-2 pt-2 w-full ${children.length === 1 ? 'justify-center' : 'justify-around'}`}>
                                {children.map((child, idx) => {
                                    const isSelected = selectedChildId === child.id;
                                    const theme = CHILD_THEMES[idx % CHILD_THEMES.length];

                                    return (
                                        <motion.div
                                            key={child.id}
                                            className={`flex flex-col items-center gap-1.5 relative min-w-[72px] cursor-pointer p-2 rounded-2xl transition-all duration-300 ${isSelected ? 'bg-white/25 backdrop-blur-md shadow-inner' : 'hover:bg-white/5'}`}
                                            onClick={() => {
                                                setSelectedChildId(child.id);
                                                mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <div className="relative">
                                                <motion.div
                                                    className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all duration-300 relative z-10 bg-white
                                                    ${isSelected ? `${theme.ring} scale-105 shadow-md border-white` : 'border-transparent opacity-60 grayscale-[0.3]'}`}
                                                >
                                                    <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                                                </motion.div>

                                                {/* Edit Button */}
                                                {isSelected && (
                                                    <motion.button
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        onClick={(e) => { e.stopPropagation(); handleEditChild(); }}
                                                        className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-gray-500 shadow-sm flex items-center justify-center border border-gray-100 z-20`}
                                                    >
                                                        <Edit2 size={10} />
                                                    </motion.button>
                                                )}
                                            </div>

                                            <span className={`text-[10px] font-black transition-colors ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {child.name}
                                            </span>

                                            {/* Simple Active Dot */}
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="active-dot"
                                                    className={`w-1.5 h-1.5 rounded-full ${theme.bg.replace('from-', 'bg-').split(' ')[0]}`}
                                                />
                                            )}
                                        </motion.div>
                                    );
                                })}

                                {/* Add Button - Max 3 Children */}
                                {children.length < 3 && (
                                    <div className="flex flex-col items-center gap-2 min-w-[64px] opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-2" onClick={() => handleAddChild()}>
                                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-white/20">
                                            <Plus className="text-gray-400" size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">添加</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="px-4 pb-4 space-y-6">
                    {(activeTab === 'children' && selectedChild) && (
                        <motion.div
                            key={selectedChildId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/20 backdrop-blur-2xl p-4 md:p-8 rounded-[40px] border border-white/10 shadow-xl relative overflow-hidden"
                        >
                            {/* Dashboard Content - Z-Index raised to sit on top of glass */}
                            <div className="relative z-10 space-y-6">

                                {/* Dual Capsule Dashboard - Action & Rewards Separated */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Left Capsule: Real-time Action */}
                                    <div className={`p-6 rounded-[40px] text-white relative overflow-hidden shadow-xl border border-white/20 flex flex-col justify-between min-h-[160px] bg-gradient-to-br ${currentTheme.bg.replace('from-', 'from-white/10 to-').replace('50', '500').replace('100/30', '400')}`}>
                                        {/* Theme-based gradient override for the card */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.name === 'pink' ? 'from-pink-400 to-rose-500' : currentTheme.name === 'blue' ? 'from-blue-400 to-indigo-500' : 'from-violet-400 to-purple-500'} z-0`}></div>

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
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">正在进行</div>
                                                        {liveFocusDuration > 0 && (
                                                            <div className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                                                                <Timer size={10} /> {formatTime(liveFocusDuration)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h2 className="text-xl font-black tracking-tight leading-snug break-words line-clamp-2 drop-shadow-sm min-h-[3rem] flex items-center">
                                                        {selectedChild.currentTaskName}
                                                    </h2>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">今日动态</div>
                                                    </div>
                                                    <h2 className="text-2xl font-black tracking-tight leading-none drop-shadow-sm">正在休息</h2>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Capsule: Reward Assets */}
                                    <div className="p-6 rounded-[40px] text-white relative overflow-hidden shadow-xl border border-white/20 bg-gradient-to-br from-[#F472B6] to-[#FB923C] flex flex-col justify-between min-h-[160px]">
                                        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-10 -mb-10 blur-2xl"></div>

                                        <div className="relative z-10 flex justify-between items-start">
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 pt-1">糖果收益</div>
                                            <motion.button
                                                whileHover={{ rotate: 180, scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDialogConfig({
                                                        isOpen: true,
                                                        title: '重置糖果收益',
                                                        message: '确定要重置当前宝贝的所有糖果吗？此操作无法撤销。',
                                                        hideInput: true,
                                                        onConfirm: () => handleResetPoints()
                                                    });
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

                                {/* Quick Action: Scan Homework */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsScanning(true)}
                                    className="w-full py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white rounded-[32px] flex items-center justify-center gap-3 shadow-lg shadow-blue-200/50 font-black text-lg border border-white/20"
                                >
                                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <Scan size={24} strokeWidth={3} />
                                    </div>
                                    <span>作业拍照识别</span>
                                    <div className="ml-auto mr-4 opacity-50">
                                        <ArrowRight size={20} />
                                    </div>
                                </motion.button>

                                {/* Action Grid (Redesigned: 2x2 Grid, Clean & Symmetric) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <motion.button
                                        whileHover={{ y: -5, rotate: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('tasks')}
                                        className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-sm border border-white/10 hover:border-white/40 transition-all font-candy"
                                    >
                                        <div className="w-16 h-16 bg-[var(--color-yellow-reward)] rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
                                            <ListTodo size={32} strokeWidth={3} />
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">任务管理</span>
                                        <span className="text-xs text-gray-400 font-bold">每日习惯养成</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -5, rotate: 1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('rewards')}
                                        className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-sm border border-white/10 hover:border-white/40 transition-all font-candy relative"
                                    >
                                        <div className="w-16 h-16 bg-[var(--color-red-warning)] rounded-2xl flex items-center justify-center text-white shadow-lg -rotate-3 relative">
                                            <Gift size={32} strokeWidth={3} />
                                            {redemptionLogs.filter(l => l.status === 'pending').length > 0 && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm ring-2 ring-red-100"
                                                >
                                                    {redemptionLogs.filter(l => l.status === 'pending').length}
                                                </motion.div>
                                            )}
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">奖励中心</span>
                                        <span className="text-xs text-gray-400 font-bold">设定心愿清单</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -5, rotate: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('redemption')}
                                        className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-sm border border-white/10 hover:border-white/40 transition-all font-candy relative"
                                    >
                                        <div className="w-16 h-16 bg-pink-400 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 relative">
                                            <Trophy size={32} strokeWidth={3} />
                                            {redemptionLogs.filter(l => l.status === 'pending').length > 0 && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm ring-2 ring-red-100 animate-pulse"
                                                >
                                                    {redemptionLogs.filter(l => l.status === 'pending').length}
                                                </motion.div>
                                            )}
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">核销记录</span>
                                        <span className="text-xs text-gray-400 font-bold">糖果账单历史</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ y: -5, rotate: 1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveTab('stats')}
                                        className="bg-white/80 backdrop-blur-lg p-6 rounded-[32px] flex flex-col items-center gap-4 shadow-sm border border-white/10 hover:border-white/40 transition-all font-candy"
                                    >
                                        <div className="w-16 h-16 bg-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-lg -rotate-3">
                                            <BarChart3 size={32} strokeWidth={3} />
                                        </div>
                                        <span className="font-black text-[#5D4037] text-lg">统计分析</span>
                                        <span className="text-xs text-gray-400 font-bold">成长数据报表</span>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {activeTab === 'tasks' && selectedChild && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">


                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setActiveTab('children')}
                                        className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-white/30 relative"
                                    >
                                        <ArrowLeft size={20} />
                                        {redemptionLogs.filter(l => l.status === 'pending').length > 0 && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm" />
                                        )}
                                    </motion.button>
                                    <h2 className="text-2xl font-black text-[#5D4037]">今日任务清单</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsScanning(true)}
                                        className="h-10 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all font-bold text-sm"
                                    >
                                        <Scan size={18} />
                                        <span>拍照识别</span>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Templates */}
                            <div className="flex flex-wrap gap-2 items-center">
                                {/* Category buttons list */}
                                {taskCategories.map(cat => (
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
                                    onClick={() => {
                                        setManagingType('tasks');
                                        setIsManagingCategories(true);
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"
                                >
                                    <Settings size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[100px]">
                                {(() => {
                                    // 1. 获取预设模板
                                    const presetTemplates = TASK_TEMPLATES.find(t => t.category === selectedCategory)?.tasks || [];
                                    const currentCat = taskCategories.find(c => c.id === selectedCategory);
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
                                                        <div className="text-xs text-gray-400 font-bold flex flex-wrap gap-2">
                                                            <span className="text-[var(--color-blue-fun)] bg-blue-50 px-2 py-0.5 rounded-md">{task.timeSlot}</span>
                                                            <span className="text-emerald-400">+{task.points} 🍭</span>
                                                            {task.accumulatedTime && task.accumulatedTime > 0 && (
                                                                <span className="text-orange-400 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    <Timer size={10} /> {formatTime(task.accumulatedTime)}
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
                                            <p className="text-[10px] text-gray-300 mt-1 uppercase font-black">期待你的计划</p>
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
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setActiveTab('children')}
                                        className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-white/30 relative"
                                    >
                                        <ArrowLeft size={20} />
                                        {redemptionLogs.filter(l => l.status === 'pending').length > 0 && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm" />
                                        )}
                                    </motion.button>
                                    <h2 className="text-2xl font-black text-[#5D4037]">奖励分库配置</h2>
                                </div>
                            </div>

                            {/* Reward Category Templates & Add Button */}
                            <div className="flex flex-wrap gap-2 items-center">
                                {rewardCategories.map(cat => (
                                    <div key={cat.id} className="relative group">
                                        <button
                                            onClick={() => setSelectedRewardCategory(cat.id)}
                                            className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap
                                        ${selectedRewardCategory === cat.id
                                                    ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-[0_2px_10px_rgba(249,115,22,0.15)] -translate-y-0.5'
                                                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200 shadow-sm'}`}
                                        >
                                            <span className="text-base">{cat.icon}</span>
                                            {cat.name}
                                        </button>
                                        {selectedRewardCategory === cat.id && (
                                            <motion.button
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openRewardCategoryEditor(cat.id);
                                                }}
                                                className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white z-20 hover:scale-110 active:scale-95 transition-all"
                                                title="管理分类与下属奖励"
                                            >
                                                <Edit2 size={12} fill="currentColor" />
                                            </motion.button>
                                        )}
                                    </div>
                                ))}
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleAddRewardCategory}
                                    className="px-4 py-2.5 rounded-2xl text-xs font-black bg-white text-emerald-500 shadow-sm border border-emerald-200 flex items-center gap-1 hover:bg-emerald-50 hover:border-emerald-300 transition-colors whitespace-nowrap"
                                >
                                    <Plus size={14} /> 新增标签
                                </motion.button>
                            </div>

                            {/* Sub-tabs Navigation */}
                            <div className="flex bg-gray-100/50 p-1.5 rounded-2xl gap-1.5 relative border border-gray-200/50">
                                {[
                                    { id: 'pool', label: '奖励分库', icon: <LayoutGrid size={16} /> },
                                    { id: 'drafts', label: '待发布', icon: <Edit2 size={16} /> },
                                    { id: 'published', label: '已发布', icon: <ShieldCheck size={16} /> }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setRewardSubTab(tab.id as any)}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 relative z-10
                                            ${rewardSubTab === tab.id
                                                ? 'text-orange-600 shadow-sm bg-white'
                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'}`}
                                    >
                                        {tab.icon} {tab.label}
                                        {tab.id === 'drafts' && rewards.filter(r => !r.isPublished).length > 0 && (
                                            <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-sm">
                                                {rewards.filter(r => !r.isPublished).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {rewardSubTab === 'pool' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="flex justify-between items-center mb-[-0.5rem] mt-2">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">
                                            {rewardCategories.find(c => c.id === selectedRewardCategory)?.name || '未分类'} 资源池
                                        </h3>
                                        <button
                                            onClick={() => handleAddPoolReward()}
                                            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-orange-400 to-orange-500 shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <Plus size={14} strokeWidth={3} /> 新增奖励项
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-[100px]">
                                        {/* Combined List: Defaults + Custom Templates */}
                                        {[
                                            ...DEFAULT_REWARDS
                                                .filter(r => r.category === selectedRewardCategory)
                                                .filter(r => !hiddenRewardPresets.some(h => h === `${selectedRewardCategory}:${r.name}`))
                                                .map(r => ({ ...r, isPreset: true })),
                                            ...(rewardCategories.find(c => c.id === selectedRewardCategory)?.templates || [])
                                                .map((r: any) => ({ ...r, isPreset: false }))
                                        ].map((item, i) => (
                                            <div key={`pool_item_${i}`} className="relative group">
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => openPoolItemDialog(item)}
                                                    className="w-full bg-gradient-to-br from-white to-[#FDFBF7] p-5 rounded-[20px] text-left border border-orange-50 hover:border-orange-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(249,115,22,0.08)] transition-all flex items-center gap-4 group-hover:-translate-y-1"
                                                >
                                                    <div className="text-3xl flex-shrink-0 drop-shadow-sm">{item.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-black text-[#5D4037] text-sm tracking-wide truncate">{item.name}</div>
                                                        <div className="text-xs font-black mt-1 flex items-center gap-1">
                                                            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                                {item.pointsCost} 🍭
                                                            </span>
                                                            {item.isPreset && <span className="text-[9px] text-gray-300 font-bold uppercase ml-1">系统</span>}
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Edit2 size={14} />
                                                    </div>
                                                </motion.button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Empty state specifically for the pool */}
                                    {DEFAULT_REWARDS.filter(r => r.category === selectedRewardCategory).filter(r => !hiddenRewardPresets.includes(`${selectedRewardCategory}:${r.name}`)).length === 0 &&
                                        (rewardCategories.find(c => c.id === selectedRewardCategory)?.templates || []).length === 0 && (
                                            <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                <div className="text-4xl mb-3 opacity-20">📦</div>
                                                <p className="font-bold text-gray-400 text-sm">该分类下暂无奖励资源</p>
                                                <p className="text-[10px] text-gray-300 mt-1 uppercase font-black">点击上方按钮添加您需要的奖励</p>
                                            </div>
                                        )}
                                </motion.div>
                            )}

                            {rewardSubTab === 'drafts' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                    <div className="flex items-center justify-between pl-1">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">待发布清单</h3>
                                        {rewards.filter(r => !r.isPublished).length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setDialogConfig({
                                                        isOpen: true,
                                                        title: '🎁 确认发布奖励',
                                                        message: `将把这 ${rewards.filter(r => !r.isPublished).length} 项奖励同步给孩子吗？`,
                                                        hideInput: true,
                                                        onConfirm: async () => {
                                                            setIsSaving(true);
                                                            try {
                                                                const updatedRewards = rewards.map(r => ({ ...r, isPublished: true }));
                                                                setRewards(updatedRewards);
                                                                await handleSyncWithBackend(updatedRewards, '奖励已在孩子端闪亮登场！');
                                                                setRewardSubTab('published');
                                                            } catch (e) { alert('发布失败'); }
                                                            finally { setIsSaving(false); setDialogConfig(prev => ({ ...prev, isOpen: false })); }
                                                        }
                                                    });
                                                }}
                                                className="text-xs font-black text-orange-500 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
                                            >
                                                <Zap size={14} fill="currentColor" /> 发布全部
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {rewards.filter(r => !r.isPublished).map((reward) => (
                                            <motion.div
                                                key={reward.id}
                                                layout
                                                className="bg-gradient-to-br from-white to-[#FDFBF7] p-5 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-orange-50 flex justify-between items-center group hover:shadow-[0_8px_24px_rgba(249,115,22,0.08)] hover:-translate-y-0.5 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-3xl flex-shrink-0 drop-shadow-sm">
                                                        {reward.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black text-[#5D4037] text-sm tracking-wide truncate">{reward.name}</h4>
                                                        <div className="text-xs font-black mt-1 flex items-center gap-1">
                                                            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                                {reward.pointsCost} 🍭
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => editReward(reward)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => removeReward(reward.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {rewards.filter(r => !r.isPublished).length === 0 && (
                                            <div className="text-center py-10 opacity-50 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                <p className="font-bold text-gray-500 text-sm">暂无待发布的分类奖励</p>
                                                <p className="text-[10px] text-gray-300 mt-1 uppercase font-black">请从“当前奖励”添加或“新增奖励项”</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {rewardSubTab === 'published' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">已发布奖励 (孩子端可见)</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {rewards.filter(r => r.isPublished).map((reward) => {
                                            const redemptions = redemptionLogs.filter(l => l.rewardName === reward.name);
                                            const pendingCount = redemptions.filter(l => l.status === 'pending').length;
                                            const approvedCount = redemptions.filter(l => l.status === 'approved').length;

                                            return (
                                                <motion.div
                                                    key={reward.id}
                                                    layout
                                                    className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-[0_4px_10px_rgba(0,0,0,0.03)] border border-gray-100 relative group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-2xl w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center grayscale group-hover:grayscale-0 transition-all">
                                                            {reward.icon}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-[#5D4037]">{reward.name}</h4>
                                                                {pendingCount > 0 && (
                                                                    <motion.button
                                                                        whileTap={{ scale: 0.9 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveTab('redemption');
                                                                        }}
                                                                        className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce hover:bg-red-600 transition-colors cursor-pointer"
                                                                    >
                                                                        {pendingCount} 个待处理
                                                                    </motion.button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <div className="text-[10px] text-gray-400 font-bold">{reward.pointsCost} 🍭</div>
                                                                <div className="text-[10px] text-emerald-500 font-black">已兑现 {approvedCount} 次</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setDialogConfig({
                                                                    isOpen: true,
                                                                    title: '取消发布',
                                                                    message: `确定要撤销“${reward.name}”的发布吗？孩子端将不再可见。`,
                                                                    hideInput: true,
                                                                    onConfirm: async () => {
                                                                        const updatedRewards = rewards.map(r => r.id === reward.id ? { ...r, isPublished: false } : r);
                                                                        setRewards(updatedRewards);
                                                                        await handleSyncWithBackend(updatedRewards, '已撤销发布');
                                                                        setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                                    }
                                                                });
                                                            }}
                                                            className="p-2 text-gray-300 hover:text-orange-400 transition-colors"
                                                            title="下架"
                                                        >
                                                            <LogOut size={16} className="rotate-180" />
                                                        </button>
                                                        <button onClick={() => removeReward(reward.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        {rewards.filter(r => r.isPublished).length === 0 && (
                                            <div className="text-center py-20 opacity-50 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-2xl">
                                                    📢
                                                </div>
                                                <p className="font-bold text-gray-400 text-sm">还没有发布的奖励哦</p>
                                                <p className="text-[10px] text-gray-300 mt-1 uppercase font-black">发布后孩子即可在宝库中兑换</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'redemption' && selectedChild && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setActiveTab('children')}
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 relative"
                                >
                                    <ArrowLeft size={20} />
                                    {redemptionLogs.filter(l => l.status === 'pending').length > 0 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm" />
                                    )}
                                </motion.button>
                                <h2 className="text-2xl font-black text-[#5D4037]">奖励核销审批</h2>
                            </div>

                            <div className="bg-gradient-to-br from-pink-400 to-pink-500 p-6 rounded-[40px] text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <div className="relative z-10 flex justify-between items-center">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80">当前糖果结余</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-4xl font-black">{selectedChild.points || 0}</span>
                                            <span className="text-2xl">🍭</span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <Trophy size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* 待审批列表 */}
                            {redemptionLogs.some(l => l.status === 'pending') && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={16} /> 待审批申请
                                    </h3>
                                    {redemptionLogs.filter(l => l.status === 'pending').map((log) => (
                                        <div key={log.id} className="bg-white p-5 rounded-[32px] border-2 border-orange-200 shadow-md relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl">🎁</div>
                                                    <div>
                                                        <div className="font-black text-[#5D4037] text-lg">{log.rewardName}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold">{new Date(log.redeemedAt).toLocaleString('zh-CN')}</div>
                                                    </div>
                                                </div>
                                                <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-xl text-sm font-black">
                                                    {log.pointsCost} 🍭
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleRejectRedemption(log.id)}
                                                    disabled={isSaving}
                                                    className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-400 font-bold text-sm hover:bg-gray-50 transition-colors"
                                                >
                                                    拒绝
                                                </button>
                                                <button
                                                    onClick={() => handleApproveRedemption(log.id)}
                                                    disabled={isSaving}
                                                    className="flex-[2] py-3 rounded-xl bg-orange-500 text-white font-black text-sm shadow-lg shadow-orange-100 hover:bg-orange-600 transition-colors"
                                                >
                                                    批准发放
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 历史记录 */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">核销历史记录</h3>
                                {redemptionLogs.filter(l => l.status !== 'pending').length > 0 ? (
                                    redemptionLogs.filter(l => l.status !== 'pending').map((log) => (
                                        <div key={log.id} className="bg-white/85 backdrop-blur-md p-5 rounded-[28px] border border-white/50 shadow-sm relative overflow-hidden group">
                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-black text-[#5D4037] text-base">{log.rewardName}</div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${log.status === 'approved' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                                                        {log.status === 'approved' ? '已批准' : '已拒绝'}
                                                    </span>
                                                </div>
                                                <div className={`px-3 py-1 rounded-xl text-xs font-black shadow-sm ${log.status === 'approved' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400 line-through'}`}>
                                                    -{log.pointsCost} 🍭
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
                                                <span className="text-[10px] text-gray-400 font-bold">
                                                    {new Date(log.redeemedAt).toLocaleString('zh-CN')}
                                                </span>
                                                {log.status === 'approved' && (
                                                    <span className="text-sm font-black text-orange-400 font-mono">{log.remainingPoints ?? '---'} 🍭</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    redemptionLogs.every(l => l.status === 'pending') && (
                                        <div className="text-center py-10 opacity-30">
                                            <p className="font-bold text-xs">暂无处理过的核销记录</p>
                                        </div>
                                    )
                                )}
                                {redemptionLogs.length === 0 && (
                                    <div className="text-center py-20 opacity-50 bg-gray-50/30 rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-200 text-3xl">
                                            📜
                                        </div>
                                        <div>
                                            <p className="text-gray-400 font-black text-sm">还没有核销记录哦</p>
                                            <p className="text-gray-300 text-[10px] mt-1">达成的小心愿都会记录在这里 ~</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'stats' && selectedChild && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setActiveTab('children')}
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 relative"
                                >
                                    <ArrowLeft size={20} />
                                    {redemptionLogs.filter(l => l.status === 'pending').length > 0 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm" />
                                    )}
                                </motion.button>
                                <h2 className="text-2xl font-black text-[#5D4037]">成长看板</h2>
                            </div>

                            {/* Dashboard Components */}
                            {(() => {
                                try {
                                    const statsDate = selectedStatsDate;
                                    const baselineData = (licenseData as any)?.progress?.[statsDate]?.[selectedChildId] || { checkins: [], focusLogs: [] };
                                    // 去重合并 focusLogs，兼容历史脏数据
                                    const todayStr = formatBeijingTime(new Date()).split(' ')[0];
                                    const tasksForStats = (statsDate === todayStr)
                                        ? currentTasks
                                        : ((baselineData.tasks && baselineData.tasks.length > 0) ? baselineData.tasks : currentTasks);

                                    const rawFocusLogs: any[] = (statsDate === todayStr)
                                        ? [...focusLogs, ...(baselineData.focusLogs || [])]
                                        : (baselineData.focusLogs || []);
                                    const mergedMap: Record<string, any> = {};
                                    const silentOnes: any[] = [];
                                    for (const log of rawFocusLogs) {
                                        if (log.type === 'silent') { silentOnes.push(log); continue; }
                                        const key = log.taskId || log.taskTitle || '_unknown';
                                        if (!mergedMap[key]) { mergedMap[key] = { ...log }; }
                                        else {
                                            const ex = mergedMap[key];
                                            const exS = ex.startTime ? new Date(ex.startTime).getTime() : Infinity;
                                            const newS = log.startTime ? new Date(log.startTime).getTime() : Infinity;
                                            const exE = ex.endTime ? new Date(ex.endTime).getTime() : 0;
                                            const newE = log.endTime ? new Date(log.endTime).getTime() : 0;
                                            mergedMap[key] = { ...ex, startTime: newS < exS ? log.startTime : ex.startTime, endTime: newE > exE ? log.endTime : ex.endTime, duration: (ex.duration || 0) + (log.duration || 0) };
                                        }
                                    }
                                    const dedupedFocusLogs = [...Object.values(mergedMap), ...silentOnes];
                                    const dayData = { ...baselineData, tasks: tasksForStats, focusLogs: dedupedFocusLogs };

                                    return (
                                        <div className="space-y-6">
                                            {/* 1. Calendar Navigation */}
                                            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[40px] border-2 border-white shadow-xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 blur-2xl opacity-40"></div>
                                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-100 rounded-full -ml-12 -mb-12 blur-2xl opacity-40"></div>

                                                <div className="flex justify-between items-center mb-6 relative z-10">
                                                    <h3 className="text-lg font-black text-[#5D4037] flex items-center gap-2">
                                                        <Calendar size={20} className="text-blue-500" />
                                                        成长日历
                                                    </h3>
                                                    <span className="text-xs font-bold text-gray-400 bg-white/50 px-3 py-1 rounded-full border border-white">
                                                        {new Date().getFullYear()}年{new Date().getMonth() + 1}月
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-7 gap-2 relative z-10">
                                                    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                                                        <div key={d} className="text-center text-[10px] font-black text-gray-300 pb-2">{d}</div>
                                                    ))}
                                                    {(() => {
                                                        const now = new Date();
                                                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                                                        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                                        const cells = [];
                                                        for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
                                                        for (let d = 1; d <= daysInMonth; d++) {
                                                            const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                                                            const isSelected = dateStr === selectedStatsDate;
                                                            const isTodayActual = dateStr === formatBeijingTime(new Date()).split(' ')[0];
                                                            const hasData = (licenseData as any)?.progress?.[dateStr]?.[selectedChildId]?.checkins?.length > 0;
                                                            cells.push(
                                                                <motion.button
                                                                    key={d}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={() => setSelectedStatsDate(dateStr)}
                                                                    className={`h-11 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300
                                                                        ${isSelected
                                                                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg scale-110 z-10 ring-2 ring-white'
                                                                            : 'bg-white/40 hover:bg-white text-gray-500 border border-white/40'}`}
                                                                >
                                                                    <span className="text-xs font-black">{d}</span>
                                                                    {isTodayActual && (
                                                                        <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase shadow-sm
                                                                            ${isSelected ? 'bg-white text-blue-500' : 'bg-blue-500 text-white'}`}>
                                                                            今日
                                                                        </div>
                                                                    )}
                                                                    {hasData && !isSelected && !isTodayActual && (
                                                                        <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                                                                    )}
                                                                </motion.button>
                                                            );
                                                        }
                                                        return cells;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* 2. Completion Gauge */}
                                            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[40px] shadow-xl border-2 border-white relative overflow-hidden text-center">
                                                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full -mr-20 -mt-20 blur-3xl opacity-30"></div>
                                                <div className="relative z-10">
                                                    <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-6 flex items-center justify-center gap-2 opacity-80">
                                                        <Target size={14} className="text-orange-400" />
                                                        今日任务完成率
                                                    </div>

                                                    <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
                                                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                                            <circle cx="50" cy="50" r="42" fill="none" stroke="#F1F5F9" strokeWidth="8" strokeLinecap="round" />
                                                            <motion.circle
                                                                cx="50" cy="50" r="42" fill="none"
                                                                stroke="url(#orangeGradientStats)" strokeWidth="8"
                                                                strokeLinecap="round"
                                                                initial={{ strokeDasharray: "0 264" }}
                                                                animate={{ strokeDasharray: `${(dayData.checkins.length / (dayData.tasks.length || 1)) * 263.89} 264` }}
                                                            />
                                                            <defs>
                                                                <linearGradient id="orangeGradientStats" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                    <stop offset="0%" stopColor="#FBBF24" />
                                                                    <stop offset="100%" stopColor="#F97316" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <div className="text-6xl font-black text-[#5D4037] flex items-baseline">
                                                                {dayData.tasks.length > 0 ? Math.round((dayData.checkins.length / dayData.tasks.length) * 100) : 0}
                                                                <span className="text-2xl ml-1 text-gray-300">%</span>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                                                已完成 {dayData.checkins.length} / {dayData.tasks.length}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Active Timeline (Premium Heat Track Redesigned) */}
                                            <div className="bg-white/70 backdrop-blur-2xl p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/80 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0"></div>

                                                <div className="flex justify-between items-center mb-10 relative z-10">
                                                    <div>
                                                        <h4 className="text-xl font-black text-[#5D4037] flex items-center gap-2">
                                                            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                                                                <Clock size={20} className="text-orange-500" />
                                                            </div>
                                                            活跃时间分布
                                                        </h4>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-12">记录每日 06:00 - 22:00 专注轨迹</p>
                                                    </div>
                                                    <div className="px-4 py-2 bg-white/40 backdrop-blur-md rounded-[20px] border border-white/60 shadow-sm flex flex-col items-center min-w-[80px]">
                                                        <span className="text-lg font-black text-orange-600 leading-none">{dayData.focusLogs?.length || 0}</span>
                                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">打卡频次</span>
                                                    </div>
                                                </div>

                                                <div className="relative px-2">
                                                    {/* Data Track */}
                                                    <div className="h-10 w-full bg-gray-100/50 rounded-2xl relative p-1.5 border border-white/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden flex items-center">
                                                        <div className="absolute inset-0 flex gap-[2px] px-2 py-2">
                                                            {Array.from({ length: 48 }).map((_, i) => {
                                                                const sMins = (6 * 60) + (i * 20); // 20-min chunks
                                                                const eMins = sMins + 20;
                                                                const isActive = (dayData.focusLogs || []).some((log: any) => {
                                                                    if (!log.startTime) return false;
                                                                    const sh = new Date(log.startTime).getHours();
                                                                    const sm = new Date(log.startTime).getMinutes();
                                                                    const lStart = sh * 60 + sm;
                                                                    let lEnd = lStart + 5;
                                                                    if (log.endTime) {
                                                                        const eh = new Date(log.endTime).getHours();
                                                                        const em = new Date(log.endTime).getMinutes();
                                                                        lEnd = eh * 60 + em;
                                                                    }
                                                                    if (lEnd <= lStart) lEnd = lStart + 5;
                                                                    return lEnd > sMins && lStart < eMins;
                                                                });

                                                                return (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={false}
                                                                        animate={{
                                                                            scaleY: isActive ? 1 : 0.4,
                                                                            opacity: isActive ? 1 : 0.1
                                                                        }}
                                                                        className={`flex-1 rounded-full transition-all duration-1000 ${isActive ? 'bg-gradient-to-t from-orange-400 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-gray-400'}`}
                                                                    ></motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Time Markers */}
                                                    <div className="flex justify-between mt-6 px-1">
                                                        {[6, 10, 14, 18, 22].map(h => (
                                                            <div key={h} className="text-center group">
                                                                <div className="text-[10px] font-black text-gray-400 font-mono transition-colors group-hover:text-orange-500">{h.toString().padStart(2, '0')}:00</div>
                                                                <div className="w-[1px] h-1 bg-gray-200 mx-auto mt-1 rounded-full"></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 4. Day Task Detail List */}
                                            <div className="bg-white/92 backdrop-blur-2xl p-8 rounded-[40px] shadow-xl border-2 border-white">
                                                <div className="flex items-center gap-3 mb-8">
                                                    <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                                                        <ListTodo size={20} />
                                                    </div>
                                                    <h4 className="font-black text-[#5D4037] text-lg">当日任务详情</h4>
                                                </div>

                                                <div className="space-y-3">
                                                    {dayData.tasks.length > 0 ? (
                                                        [...dayData.tasks]
                                                            .sort((a: any, b: any) => (a.timeSlot || '').localeCompare(b.timeSlot || ''))
                                                            .map((task: any) => {
                                                                const isDone = dayData.checkins.includes(task.id);
                                                                const taskLog = dayData.focusLogs.find((l: any) => l.taskId === task.id || l.taskTitle === task.title);

                                                                const fmt = (val: string | number) => {
                                                                    if (!val) return '--:--';
                                                                    try {
                                                                        let d: Date;
                                                                        if (typeof val === 'string' && val.includes(' ') && !val.includes('T')) {
                                                                            d = new Date(val.replace(' ', 'T'));
                                                                        } else {
                                                                            d = new Date(val);
                                                                        }
                                                                        if (isNaN(d.getTime())) return '--:--';
                                                                        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                                    } catch (e) { return '--:--'; }
                                                                };

                                                                return (
                                                                    <div key={task.id} className={`p-5 rounded-[32px] border transition-all flex items-center justify-between
                                                                         ${isDone ? 'bg-emerald-50/20 border-emerald-100 shadow-sm' : 'bg-white/50 border-gray-50 shadow-none'}`}>
                                                                        <div className="flex items-center gap-5">
                                                                            <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center text-2xl shadow-inner
                                                                                 ${isDone ? 'bg-white text-emerald-500 ring-4 ring-emerald-50' : 'bg-gray-50 text-gray-200'}`}>
                                                                                {isDone ? '✨' : '📅'}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <div className={`font-black text-lg ${isDone ? 'text-emerald-700' : 'text-gray-400'}`}>{task.title}</div>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{task.timeSlot}</span>
                                                                                    {taskLog && (
                                                                                        <span className="text-[10px] font-black text-orange-500 bg-orange-100/50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-orange-100">
                                                                                            <Clock size={10} /> {fmt(taskLog.startTime)}
                                                                                            {(taskLog.endTime && taskLog.endTime !== taskLog.startTime) ? ` - ${fmt(taskLog.endTime)}` : ''}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex flex-col items-end gap-1">
                                                                            {(() => {
                                                                                const duration = task.accumulatedTime || (taskLog ? taskLog.duration : 0);
                                                                                if (isDone && duration === 0) {
                                                                                    return <div className="text-orange-500 text-xs font-black mb-1">秒打卡</div>;
                                                                                } else if (duration > 0) {
                                                                                    return (
                                                                                        <div className="flex items-baseline gap-1 text-orange-500">
                                                                                            <span className="text-xl font-black">{formatTime(duration)}</span>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                            {isDone && <span className="text-[10px] font-black text-emerald-500 bg-white px-3 py-1 rounded-full border border-emerald-50 shadow-sm uppercase tracking-tighter">打卡成功</span>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                    ) : (
                                                        <div className="py-20 text-center bg-gray-50/20 rounded-[40px] border-2 border-dashed border-gray-100">
                                                            <div className="text-6xl mb-4 opacity-10">💤</div>
                                                            <p className="text-gray-300 font-bold text-xs uppercase tracking-[0.2em]">没有任务挑战哦</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } catch (err) {
                                    return <div className="p-8 text-center text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">加载看板失败</div>;
                                }
                            })()}
                        </motion.div>
                    )}
                </div>
            </main >

            {/* Dialog Overlay */}
            <AnimatePresence>
                {
                    dialogConfig.isOpen && (
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

                                        {dialogConfig.showPoints && (
                                            <div className="flex items-center gap-4 bg-[#F5F7FA] px-6 py-4 rounded-2xl border-2 border-transparent focus-within:border-blue-100 transition-all mt-4">
                                                <span className="text-2xl">🍭</span>
                                                <input
                                                    type="number"
                                                    id="dialogPoints"
                                                    defaultValue={dialogConfig.defaultPoints || 10}
                                                    className="flex-1 bg-transparent border-none outline-none font-black text-lg text-[#5D4037]"
                                                    placeholder="奖励糖果数"
                                                />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">奖励点数</span>
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

                                <div className="mt-8 flex flex-col gap-3">
                                    {dialogConfig.showPublish && (
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('dialogInput') as HTMLInputElement;
                                                const points = document.getElementById('dialogPoints') as HTMLInputElement;
                                                dialogConfig.onPublish?.(input?.value, parseInt(points?.value) || 0);
                                            }}
                                            className="w-full py-4 rounded-2xl font-black bg-orange-500 text-white shadow-lg shadow-orange-100 active:scale-95 transition-all text-lg"
                                        >
                                            {dialogConfig.publishText || '发布'}
                                        </button>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                                            className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (uploadingAvatar) {
                                                    setDialogConfig({
                                                        isOpen: true,
                                                        title: '请稍候',
                                                        message: '头像正在上传中，请稍后再试。',
                                                        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
                                                    });
                                                    return;
                                                }
                                                const input = document.getElementById('dialogInput') as HTMLInputElement;
                                                const time = document.getElementById('dialogTime') as HTMLInputElement;
                                                const points = document.getElementById('dialogPoints') as HTMLInputElement;
                                                dialogConfig.onConfirm(input?.value, time?.value, parseInt(points?.value) || 0);
                                            }}
                                            disabled={uploadingAvatar || isSaving}
                                            className={`flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all ${uploadingAvatar || isSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[var(--color-blue-fun)] text-white'}`}
                                        >
                                            {uploadingAvatar ? '上传中...' : (isSaving ? '确定保存' : '确定')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

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
                            <h3 className="text-xl font-black text-[#5D4037] mb-4 text-center">
                                管理{managingType === 'tasks' ? '任务' : '奖励'}分类
                            </h3>

                            <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4 pr-1 no-scrollbar">
                                {(managingType === 'tasks' ? taskCategories : rewardCategories).map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border-2 border-transparent hover:border-blue-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{cat.icon}</span>
                                            <span className="font-bold text-[#5D4037]">{cat.name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setDialogConfig({
                                                        isOpen: true,
                                                        title: '修改分类',
                                                        placeholder: '分类名称 (如: 围棋)',
                                                        defaultValue: cat.name,
                                                        showAvatarUpload: false,
                                                        onConfirm: async (name, icon) => {
                                                            if (!name) return;
                                                            const targetCats = managingType === 'tasks' ? taskCategories : rewardCategories;
                                                            const newCats = targetCats.map(c => c.id === cat.id ? { ...c, name, icon: icon || c.icon } : c);
                                                            await handleSaveCategories(newCats, undefined, undefined, managingType);
                                                            setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                        },
                                                        defaultExtra: cat.icon // 借用 defaultExtra 传递图标
                                                    });
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-white rounded-lg transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, managingType)}
                                                disabled={isSaving}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(managingType === 'tasks' ? taskCategories : rewardCategories).length === 0 && (
                                    <div className="text-center text-gray-400 py-4 text-xs font-bold">暂无分类</div>
                                )}
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="新分类名称 (如: 围棋)"
                                    className="flex-1 bg-gray-50 px-4 py-3 rounded-xl font-bold text-[#5D4037] outline-none border-2 border-transparent focus:border-blue-200 transition-colors placeholder:text-gray-300 placeholder:font-normal min-w-0"
                                    onKeyDown={e => e.key === 'Enter' && handleAddInlineCategory()}
                                />
                                <button
                                    onClick={handleAddInlineCategory}
                                    disabled={isSaving || !newCategoryName.trim()}
                                    className="bg-[var(--color-blue-fun)] text-white w-12 flex-shrink-0 rounded-xl font-bold shadow-md disabled:opacity-50 disabled:shadow-none flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                >
                                    {isSaving ? <Sparkles className="animate-spin" size={20} /> : <Plus size={24} />}
                                </button>
                            </div>

                            <div className="flex gap-3 mb-4">
                                {managingType === 'tasks' && (
                                    <button
                                        onClick={() => {
                                            setDialogConfig({
                                                isOpen: true,
                                                title: '恢复预设分类',
                                                message: '确定要恢复所有隐藏的系统任务吗？',
                                                onConfirm: () => {
                                                    handleSaveCategories(taskCategories, [], undefined, 'tasks');
                                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                },
                                                hideInput: true
                                            });
                                        }}
                                        className="px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors border-2 border-transparent hover:border-gray-100"
                                    >
                                        <RotateCcw size={16} /> 恢复预设
                                    </button>
                                )}
                                {managingType === 'rewards' && (
                                    <button
                                        onClick={() => {
                                            setDialogConfig({
                                                isOpen: true,
                                                title: '恢复预设奖励',
                                                message: '确定要恢复所有隐藏的系统预设奖励吗？',
                                                onConfirm: () => {
                                                    handleSaveCategories(rewardCategories, undefined, [], 'rewards');
                                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                },
                                                hideInput: true
                                            });
                                        }}
                                        className="px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors border-2 border-transparent hover:border-gray-100"
                                    >
                                        <RotateCcw size={16} /> 恢复所有预设
                                    </button>
                                )}
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

            <AnimatePresence>
                {isEditingRewardCategory && draftRewardCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsEditingRewardCategory(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-white p-5 sm:p-6 rounded-[32px] w-full max-w-lg shadow-2xl relative z-60 flex flex-col max-h-[85vh]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-[#5D4037]">
                                    综合编辑：{draftRewardCategory.name}
                                </h3>
                                <button
                                    onClick={promptDeleteRewardCategory}
                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    title="删除此分类及旗下所有奖励"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            {/* Category Banner Editor */}
                            <div className="flex gap-4 mb-6">
                                <input
                                    value={draftRewardCategory?.icon || '🎁'}
                                    onChange={e => setDraftRewardCategory(prev => prev ? { ...prev, icon: e.target.value } : prev)}
                                    className="w-12 h-12 bg-white rounded-xl text-center text-2xl border-2 border-transparent focus:border-orange-200 outline-none shadow-sm"
                                    placeholder="🎯"
                                />
                                <input
                                    value={draftRewardCategory?.name || ''}
                                    onChange={e => setDraftRewardCategory(prev => prev ? { ...prev, name: e.target.value } : prev)}
                                    className="flex-1 bg-white px-4 py-3 rounded-xl font-black text-[#5D4037] border-2 border-transparent focus:border-orange-200 outline-none shadow-sm"
                                    placeholder="分类名称"
                                />
                            </div>

                            {/* Rewards Editor List */}
                            <div className="flex-1 overflow-y-auto min-h-[200px] mb-6 space-y-3 pr-2 no-scrollbar">
                                <div className="text-sm font-bold text-gray-400 mb-2 flex justify-between items-center">
                                    <span>旗下所有奖励项目配置</span>
                                    <span className="text-xs bg-orange-100 text-orange-500 px-2 py-1 rounded-full">{draftCategoryTemplates.length} 项</span>
                                </div>

                                {draftCategoryTemplates.length === 0 ? (
                                    <div className="text-center py-8 opacity-50 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <p className="font-bold text-gray-400 text-sm">该标签下暂无内容</p>
                                    </div>
                                ) : (
                                    draftCategoryTemplates.map((item, idx) => (
                                        <div key={item.id || idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100 focus-within:border-orange-200 transition-colors">
                                            <input
                                                value={item.name}
                                                onChange={e => {
                                                    const newArr = [...draftCategoryTemplates];
                                                    newArr[idx] = { ...newArr[idx], name: e.target.value };
                                                    setDraftCategoryTemplates(newArr);
                                                }}
                                                className="flex-[2] bg-white px-3 py-2 rounded-lg text-sm font-bold text-[#5D4037] outline-none shadow-sm min-w-0"
                                                placeholder="输入奖励项目..."
                                            />
                                            <div className="flex-1 bg-white px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm shrink-0 min-w-[80px]">
                                                <span className="text-xs">🍬</span>
                                                <input
                                                    type="number"
                                                    value={item.pointsCost || ''}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newArr = [...draftCategoryTemplates];
                                                        newArr[idx] = { ...newArr[idx], pointsCost: val };
                                                        setDraftCategoryTemplates(newArr);
                                                    }}
                                                    className="w-full bg-transparent text-sm font-black text-orange-500 outline-none shrink-0"
                                                    placeholder="数值"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newArr = draftCategoryTemplates.filter((_, i) => i !== idx);
                                                    setDraftCategoryTemplates(newArr);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center shrink-0 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}

                                <button
                                    onClick={() => {
                                        const newTemplate = {
                                            id: `r_tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                                            name: '',
                                            pointsCost: 500,
                                            icon: draftRewardCategory?.icon || '🎁',
                                            isPreset: false
                                        };
                                        setDraftCategoryTemplates([...draftCategoryTemplates, newTemplate]);
                                    }}
                                    className="w-full py-3 mt-4 rounded-xl border-2 border-dashed border-orange-200 text-orange-500 font-bold text-sm bg-orange-50/50 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> 新增奖励内容
                                </button>
                            </div>

                            <div className="flex gap-3 shrink-0">
                                <button
                                    onClick={() => setIsEditingRewardCategory(false)}
                                    className="flex-1 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 transition-colors"
                                    disabled={isSaving}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveRewardCategoryEditor}
                                    disabled={isSaving}
                                    className={`flex-[2] py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all ${isSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white'}`}
                                >
                                    {isSaving ? '处理中...' : '确定保存'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Scanning Modal */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center font-candy overflow-hidden"
                    >
                        {/* Status Bar Decor */}
                        <div className="absolute top-0 w-full h-12 bg-black/20 z-10"></div>

                        {/* Close Button */}
                        <button
                            onClick={() => {
                                stopCamera();
                                setIsScanning(false);
                                setScannedResults([]);
                            }}
                            className="absolute top-12 right-6 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20 hover:bg-white/20 transition-all"
                        >
                            <X size={24} />
                        </button>

                        {/* Title & Hint */}
                        <div className="absolute top-24 text-center z-10 w-full px-10">
                            <h3 className="text-white text-xl font-black drop-shadow-md">作业拍照识别</h3>
                            <p className="text-white/60 text-xs font-bold mt-2">请对准作业内容，清晰拍摄</p>
                        </div>

                        {/* Camera Preview Area */}
                        <div className="relative w-full flex-1 flex items-center justify-center">
                            <div className="relative w-[85%] max-w-[400px] aspect-[3/4] rounded-[40px] overflow-hidden border-2 border-white/30 bg-gray-900 shadow-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                
                                {/* Scanning Effect */}
                                {isProcessingOCR && (
                                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-scan-line"></div>
                                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                                    </div>
                                )}

                                {/* Capture Indicator */}
                                {!isProcessingOCR && (
                                    <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-[38px] m-6"></div>
                                )}
                            </div>
                        </div>

                        {/* Results Overlay */}
                        <AnimatePresence>
                            {scannedResults.length > 0 && !isProcessingOCR && (
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    className="absolute bottom-0 w-full bg-white rounded-t-[40px] p-8 pb-12 z-30 max-h-[80%] overflow-y-auto no-scrollbar shadow-[0_-20px_50px_rgba(0,0,0,0.2)]"
                                >
                                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
                                    
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-xl font-black text-[#5D4037]">识别到 {scannedResults.length} 个任务</h4>
                                        <button 
                                            onClick={() => setScannedResults([])}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        {scannedResults.map((result, idx) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center group hover:bg-blue-50 transition-colors">
                                                <div className="flex-1">
                                                    <input 
                                                        type="text" 
                                                        value={result.title}
                                                        onChange={(e) => {
                                                            const newResults = [...scannedResults];
                                                            newResults[idx].title = e.target.value;
                                                            setScannedResults(newResults);
                                                        }}
                                                        className="bg-transparent font-bold text-[#5D4037] border-none focus:ring-0 p-0 w-full"
                                                    />
                                                    <div className="flex gap-4 mt-1">
                                                        <span className="text-[10px] font-black text-blue-500 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <Clock size={10} /> {result.time}
                                                        </span>
                                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-md">
                                                            +{result.points} 🍭
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newResults = scannedResults.filter((_, i) => i !== idx);
                                                        setScannedResults(newResults);
                                                    }}
                                                    className="p-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setScannedResults([])}
                                            className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-lg shadow-sm hover:bg-gray-200 transition-all"
                                        >
                                            重新拍摄
                                        </button>
                                        <button
                                            onClick={handleConfirmScannedTasks}
                                            className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-lg shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={20} />
                                            一键导入并发布
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Capture Button */}
                        {!isProcessingOCR && scannedResults.length === 0 && (
                            <div className="absolute bottom-12 w-full flex items-center justify-center z-20">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleCapture}
                                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-8 border-white/20 shadow-2xl"
                                >
                                    <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                        <Camera size={28} strokeWidth={3} />
                                    </div>
                                </motion.button>
                            </div>
                        )}

                        {/* Processing Status */}
                        {isProcessingOCR && (
                            <div className="absolute bottom-12 w-full flex flex-col items-center gap-4 z-20">
                                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl flex items-center gap-3 border border-white/10">
                                    <RefreshCw className="text-blue-400 animate-spin" size={20} />
                                    <span className="text-white font-bold">正在离线解析作业内容...</span>
                                </div>
                            </div>
                        )}

                        <canvas ref={canvasRef} className="hidden" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ParentPortal;

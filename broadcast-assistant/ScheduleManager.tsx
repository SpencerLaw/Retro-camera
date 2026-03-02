import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Trash2, Clock, CheckCircle2, Check, AlertTriangle, ToggleLeft, ToggleRight, ListTodo, FileText, Upload, Plus, X } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import * as mammoth from 'mammoth';

export interface ScheduleTask {
    id: string;
    date: string;
    time: string;
    content: string;
    isPlayed: boolean;
    channelCode: string;
}

interface ScheduleManagerProps {
    license: string;
    activeChannelCode: string;
    isDark: boolean;
}

export const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`backdrop-blur-2xl bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)] ${className}`}>
        {children}
    </div>
);

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ license, activeChannelCode, isDark }) => {
    const t = useTranslations();
    const [tasks, setTasks] = useState<ScheduleTask[]>([]);
    const [importText, setImportText] = useState('');
    const [isAutoEnabled, setIsAutoEnabled] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isParsingDocx, setIsParsingDocx] = useState(false);
    const [previewTasks, setPreviewTasks] = useState<ScheduleTask[] | null>(null);

    // Initialize from local storage
    useEffect(() => {
        const savedTasks = localStorage.getItem('br_schedule_tasks');
        const savedEnabled = localStorage.getItem('br_auto_broadcast_enabled');
        if (savedTasks) {
            try { setTasks(JSON.parse(savedTasks)); } catch (e) { setTasks([]); }
        }
        if (savedEnabled === 'true') {
            setIsAutoEnabled(true);
        }
    }, []);

    // Timer logic for automated broadcast
    useEffect(() => {
        let timer: NodeJS.Timeout;

        const checkSchedule = async () => {
            if (!isAutoEnabled) return;

            // Use refs or current state (be careful with closures in setInterval, so we use functional state updates if mutating, 
            // but since we need to read tasks and then update, let's keep it safe. Actually, better read from localStorage directly 
            // or use a ref for latest tasks to avoid stale closures, wait, the dependency array has tasks and isAutoEnabled.
            // But if we put tasks in dependency array, setInterval resets often.
        };

        return () => clearInterval(timer);
    }, [isAutoEnabled, tasks, license]);

    // We will rewrite the timer to avoid resetting by using a Ref for latest tasks
    const tasksRef = useRef(tasks);
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);
    const enabledRef = useRef(isAutoEnabled);
    useEffect(() => { enabledRef.current = isAutoEnabled; }, [isAutoEnabled]);

    useEffect(() => {
        const timer = setInterval(async () => {
            if (!enabledRef.current || isSending) return;

            const now = new Date();
            const currentTasks = tasksRef.current;
            let hasChanges = false;
            let updatedTasks = [...currentTasks];

            for (let i = 0; i < currentTasks.length; i++) {
                const task = currentTasks[i];
                if (task.isPlayed) continue;

                // Validate and parse date/time
                // task.date format expected: YYYY-MM-DD or similar
                // task.time format expected: HH:mm
                try {
                    // Try to parse securely
                    const dateParts = task.date.split(/[-/.]/);
                    let year, month, day;
                    if (dateParts[0].length === 4) {
                        [year, month, day] = dateParts;
                    } else if (dateParts.length === 3) {
                        // Assuming MM/DD/YYYY or DD/MM/YYYY, rely on Date constructor for fallbacks, but let's encourage YYYY-MM-DD
                        year = new Date().getFullYear().toString(); // Fallback
                    }

                    // Simple approach: construct a parsable string
                    const formattedDateStr = `${task.date.replace(/\//g, '-')}T${task.time}:00`;
                    const taskDate = new Date(formattedDateStr);

                    if (isNaN(taskDate.getTime())) {
                        // Try fallback if user entered something like '10月20日'
                        continue;
                    }

                    if (now >= taskDate) {
                        // Time to play!
                        setIsSending(true);
                        console.log(`[Auto-Broadcast] Triggering task: ${task.content}`);

                        try {
                            const resp = await fetch('/api/broadcast/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    license,
                                    code: task.channelCode || activeChannelCode,
                                    text: task.content,
                                    isEmergency: false,
                                })
                            });

                            const data = await resp.json();
                            if (data.success) {
                                // Mark as played
                                updatedTasks[i] = { ...task, isPlayed: true };
                                hasChanges = true;

                                // Dispatch a custom event so Sender.tsx can update history if needed
                                window.dispatchEvent(new CustomEvent('br_schedule_played', {
                                    detail: { content: task.content, channelCode: task.channelCode || activeChannelCode }
                                }));
                            }
                        } catch (err) {
                            console.error('[Auto-Broadcast] Failed to send', err);
                        } finally {
                            setIsSending(false);
                        }
                    }
                } catch (e) {
                    // Ignore parse errors silently in the background
                }
            }

            if (hasChanges) {
                setTasks(updatedTasks);
                localStorage.setItem('br_schedule_tasks', JSON.stringify(updatedTasks));
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(timer);
    }, [license, activeChannelCode, isSending]);

    const handleToggleAuto = () => {
        const next = !isAutoEnabled;
        setIsAutoEnabled(next);
        localStorage.setItem('br_auto_broadcast_enabled', next ? 'true' : 'false');
    };

    const handleImport = () => {
        if (!importText.trim()) return;

        // Parse TSV (Tab-Separated Values)
        const lines = importText.trim().split('\n');
        const newTasks: ScheduleTask[] = [];

        lines.forEach(line => {
            // Split by tab or multiple spaces
            const parts = line.split(/\t| {2,}/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                // Assuming [Date, Time, Content]
                let date = parts[0];
                let time = parts[1];
                let content = parts.slice(2).join(' '); // Rejoin remaining parts as content

                // Clean up date/time (e.g. replace dots with hyphens)
                date = date.replace(/\./g, '-').replace(/\//g, '-');
                // Ensure time is HH:mm format, e.g. fix '8:30' to '08:30'
                if (time.length === 4 && time.includes(':')) {
                    time = '0' + time;
                }

                newTasks.push({
                    id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    date,
                    time,
                    content,
                    isPlayed: false,
                    channelCode: activeChannelCode
                });
            } else if (parts.length === 2 && parts[0].includes(' ')) {
                // Maybe they pasted "YYYY-MM-DD HH:mm" in one column, "content" in another
                const dateTimeParts = parts[0].split(' ');
                if (dateTimeParts.length === 2) {
                    newTasks.push({
                        id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        date: dateTimeParts[0],
                        time: dateTimeParts[1],
                        content: parts[1],
                        isPlayed: false,
                        channelCode: activeChannelCode
                    });
                }
            }
        });

        if (newTasks.length > 0) {
            setPreviewTasks(newTasks);
            setImportText('');
            setShowImport(false);
        } else {
            alert('未能识别有效的数据，请确保格式为: 日期(Tab)时间(Tab)内容，并检查是否有制表符或多个空格分隔。');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingDocx(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;

            const lines = text.split('\n').map(l => l.trim()).filter(l => l);

            const newTasks: ScheduleTask[] = [];
            let currentWeekStart: Date | null = null;
            let currentDateStr = '';
            let currentContentLines: string[] = [];

            const dayMap: Record<string, number> = { '一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6 };

            const flushCurrentTask = () => {
                if (currentDateStr && currentContentLines.length > 0) {
                    let title = currentContentLines[0];
                    let content = currentContentLines.slice(1).join(' ');

                    if (content.length > 10) {
                        newTasks.push({
                            id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                            date: currentDateStr,
                            time: '15:55',
                            content: `【${title}】${content}`,
                            isPlayed: false,
                            channelCode: activeChannelCode
                        });
                    } else if (title.length > 10) {
                        newTasks.push({
                            id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                            date: currentDateStr,
                            time: '15:55',
                            content: title,
                            isPlayed: false,
                            channelCode: activeChannelCode
                        });
                    }
                }
                currentContentLines = [];
            };

            let i = 0;
            const currentYear = new Date().getFullYear();
            while (i < lines.length) {
                const line = lines[i];

                if (line === '时间' && i + 1 < lines.length) {
                    const timeLine = lines[i + 1];
                    const match = timeLine.match(/(\d+)月(\d+)日/);
                    if (match) {
                        currentWeekStart = new Date(currentYear, parseInt(match[1]) - 1, parseInt(match[2]));
                    }
                    i++;
                    continue;
                }

                const dayMatch = line.match(/^周(一|二|三|四|五|六|日)/);
                if (dayMatch && currentWeekStart) {
                    flushCurrentTask();

                    const dayIndex = dayMap[dayMatch[1]];
                    const taskDate = new Date(currentWeekStart);
                    taskDate.setDate(taskDate.getDate() + dayIndex);

                    const yyyy = taskDate.getFullYear();
                    const mm = String(taskDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(taskDate.getDate()).padStart(2, '0');
                    currentDateStr = `${yyyy}-${mm}-${dd}`;

                    i++;
                    continue;
                }

                if (line.includes('年春季学期') || line === '周次' || line.match(/^第\d+周/) || line === '班级' || line.includes('年级1班') || line === '授课教师学生代表签字' || line === '离' || line === '校' || line === '前' || line === '1' || line === '分' || line === '钟' || line === '离校前1分钟' || line.match(/^假期.*安全教育/)) {
                    i++;
                    continue;
                }

                if (currentDateStr) {
                    currentContentLines.push(line);
                }

                i++;
            }

            flushCurrentTask();

            if (newTasks.length > 0) {
                setPreviewTasks(newTasks);
                setShowImport(false);
            } else {
                alert('从文档中未能提取到有效任务，请确认是否为标准的 Word 表格格式。');
            }

        } catch (error) {
            console.error('Docx parse error', error);
            alert('解析 Word 文档失败，请重试');
        } finally {
            setIsParsingDocx(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDelete = (id: string) => {
        const updated = tasks.filter(t => t.id !== id);
        setTasks(updated);
        localStorage.setItem('br_schedule_tasks', JSON.stringify(updated));
    };

    const handleConfirmPreview = () => {
        if (!previewTasks || previewTasks.length === 0) {
            setPreviewTasks(null);
            return;
        }

        const combined = [...tasks, ...previewTasks];
        combined.sort((a, b) => {
            const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
            const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
            return (isNaN(timeA) ? Number.MAX_SAFE_INTEGER : timeA) - (isNaN(timeB) ? Number.MAX_SAFE_INTEGER : timeB);
        });

        setTasks(combined);
        localStorage.setItem('br_schedule_tasks', JSON.stringify(combined));
        const addedCount = previewTasks.length;
        setPreviewTasks(null);
        alert(`成功入库 ${addedCount} 条播放任务！系统将等待并自动执行。`);
    };

    const updatePreviewTask = (id: string, field: keyof ScheduleTask, value: string) => {
        if (!previewTasks) return;
        setPreviewTasks(previewTasks.map(pt => pt.id === id ? { ...pt, [field]: value } : pt));
    };

    const deletePreviewTask = (id: string) => {
        if (!previewTasks) return;
        setPreviewTasks(previewTasks.filter(pt => pt.id !== id));
    };

    const handleClearAll = () => {
        if (window.confirm(t('broadcast.sender.clearHistoryConfirm') || '确定清空所有排期数据吗？')) {
            setTasks([]);
            localStorage.removeItem('br_schedule_tasks');
        }
    };

    return (
        <GlassCard className="p-8 mt-8 border-2 border-indigo-500/20 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-2 border-b border-black/5 dark:border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                        <Calendar size={24} className="sm:w-7 sm:h-7" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black tracking-tight truncate">{t('broadcast.sender.scheduler') || '定时播报计划'}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {tasks.length} {t('broadcast.sender.rules') || 'TASKS'}
                            </span>
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30 italic truncate">v2.1</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleToggleAuto}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm border ${isAutoEnabled
                            ? 'bg-green-500 text-white border-green-400 shadow-green-500/20'
                            : 'bg-white dark:bg-white/5 text-gray-400 border-black/5 hover:border-black/10'}`}
                    >
                        {isAutoEnabled ? <ToggleRight size={20} className="sm:w-6 sm:h-6" /> : <ToggleLeft size={20} className="sm:w-6 sm:h-6" />}
                        <span className="whitespace-nowrap">{isAutoEnabled ? '已运行' : '已暂停'}</span>
                    </button>
                    {tasks.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20 shrink-0"
                            title="清空所有任务"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Actions / Import Section */}
            {!showImport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={() => setShowImport(true)}
                        className="group relative flex flex-row sm:flex-col items-center sm:justify-center p-6 sm:p-8 rounded-3xl border-2 border-dashed border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all text-indigo-500 overflow-hidden text-left sm:text-center"
                    >
                        <Upload size={28} className="mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">从 Excel 粘贴导入</span>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                            <FileText size={40} />
                        </div>
                    </button>

                    <label className="group relative flex flex-row sm:flex-col items-center sm:justify-center p-6 sm:p-8 rounded-3xl border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-emerald-600 dark:text-emerald-400 cursor-pointer overflow-hidden text-left sm:text-center">
                        {isParsingDocx ? (
                            <div className="flex items-center mr-4 sm:mr-0">
                                <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin sm:mb-3"></span>
                            </div>
                        ) : (
                            <FileText size={28} className="mr-4 sm:mr-0 sm:mb-3 group-hover:scale-110 transition-transform shrink-0" />
                        )}
                        <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">
                            {isParsingDocx ? '正在深度解析...' : '导入 Word 表格'}
                        </span>
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                            <Upload size={40} />
                        </div>
                        <input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isParsingDocx}
                        />
                    </label>
                </div>
            )}

            {/* Results Preview Overlay */}
            {previewTasks && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 shadow-2xl rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-indigo-50/30 dark:bg-indigo-500/5 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                                    <ListTodo size={24} className="text-indigo-500" />
                                    请核对解析结果
                                </h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">
                                    共解析出 <span className="text-indigo-500 font-bold">{previewTasks.length}</span> 条播报任务，您可以直接在此修改或删除，确认后点导入。
                                </p>
                            </div>
                            <button onClick={() => setPreviewTasks(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <span className="text-2xl font-light leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50 dark:bg-black/20">
                            {previewTasks.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 font-bold">已清空列表。</div>
                            ) : (
                                <div className="space-y-3">
                                    {previewTasks.map((pt) => (
                                        <div key={pt.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-black/5 dark:border-white/5 shadow-sm group">
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <input
                                                    type="date"
                                                    value={pt.date}
                                                    onChange={e => updatePreviewTask(pt.id, 'date', e.target.value)}
                                                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold outline-none w-full min-w-[130px]"
                                                />
                                                <input
                                                    type="time"
                                                    value={pt.time}
                                                    onChange={e => updatePreviewTask(pt.id, 'time', e.target.value)}
                                                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold outline-none w-full min-w-[100px]"
                                                />
                                            </div>
                                            <input
                                                value={pt.content}
                                                onChange={e => updatePreviewTask(pt.id, 'content', e.target.value)}
                                                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold outline-none flex-1 w-full"
                                                placeholder="播报内容"
                                            />
                                            <button
                                                onClick={() => deletePreviewTask(pt.id)}
                                                className="sm:opacity-0 sm:group-hover:opacity-100 flex-none p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 sm:p-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-gray-900 flex justify-end gap-3">
                            <button
                                onClick={() => setPreviewTasks(null)}
                                className="px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-colors text-gray-600"
                            >
                                放弃
                            </button>
                            <button
                                onClick={handleConfirmPreview}
                                disabled={previewTasks.length === 0}
                                className="px-8 py-3 rounded-xl font-bold bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                            >
                                确认导入 ({previewTasks.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Panel */}
            {showImport && (
                <div className="mt-2 p-6 rounded-3xl bg-indigo-500/5 border-2 border-dashed border-indigo-500/20 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-indigo-500">智能解析导入</h4>
                        <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-white dark:bg-black/20 rounded-xl p-3 font-mono text-[10px] overflow-x-auto text-gray-500 mb-4 border border-black/5">
                        <p className="mb-2 opacity-60">格式：日期 - 时间 - 内容 (支持从 Excel 直接复制粘贴)</p>
                    </div>

                    <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="请在此处粘贴表格内容..."
                        rows={6}
                        className="w-full bg-white dark:bg-black/40 border border-indigo-500/20 rounded-2xl p-4 font-mono text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-gray-200"
                    />

                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowImport(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-500">取消</button>
                        <button onClick={handleImport} disabled={!importText.trim()} className="flex-[2] py-3 rounded-xl bg-indigo-500 text-white font-bold disabled:opacity-30">解析并任务导入</button>
                    </div>
                </div>
            )}

            {/* Task List Section */}
            {tasks.length > 0 && (
                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-40">待播报任务队列</h4>
                        <div className="h-[1px] flex-1 mx-4 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto px-1 custom-scrollbar">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`group p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-row items-center gap-3 sm:gap-4 ${task.isPlayed
                                    ? 'bg-gray-50/50 dark:bg-white/[0.02] border-transparent opacity-50 grayscale'
                                    : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 hover:border-indigo-500/40 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex-none flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-black/20 text-indigo-500 font-mono shadow-inner shrink-0">
                                    {task.isPlayed ? (
                                        <CheckCircle2 size={20} className="text-green-500 sm:w-6 sm:h-6" />
                                    ) : (
                                        <>
                                            <span className="text-[8px] sm:text-[9px] uppercase font-black opacity-40 leading-none mb-1">{task.date.slice(-5)}</span>
                                            <span className="text-xs sm:text-sm font-black tracking-tighter leading-none">{task.time}</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs sm:text-sm font-bold truncate ${task.isPlayed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {task.content}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                                        <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${task.isPlayed ? 'text-green-500' : 'text-indigo-500 opacity-60'}`}>
                                            {task.isPlayed ? 'PLAYED' : 'PENDING'}
                                        </span>
                                        <span className="text-[8px] sm:text-[10px] opacity-20 font-black">/</span>
                                        <span className="text-[8px] sm:text-[10px] font-mono opacity-40 font-bold uppercase truncate max-w-[80px]">Room {task.channelCode}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 sm:p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all sm:opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </GlassCard>
    );
};

export default ScheduleManager;


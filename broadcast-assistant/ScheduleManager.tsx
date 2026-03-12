import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Trash2, Clock, CheckCircle2, Check, AlertTriangle, ToggleLeft, ToggleRight, ListTodo, FileText, Upload, Plus, X, Loader2 } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import * as mammoth from 'mammoth';
import CustomDialog, { DialogType } from './components/CustomDialog';
import GlassCard from './components/GlassCard';

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

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ license, activeChannelCode, isDark }) => {
    const t = useTranslations();
    const [tasks, setTasks] = useState<ScheduleTask[]>([]);
    const [importText, setImportText] = useState('');
    const [isAutoEnabled, setIsAutoEnabled] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isParsingDocx, setIsParsingDocx] = useState(false);
    const [previewTasks, setPreviewTasks] = useState<ScheduleTask[] | null>(null);

    // Custom Dialog State
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: DialogType;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
    const openDialog = (title: string, message: string, type: DialogType, onConfirm: () => void) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

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
    }, [license]);

    // Timer logic for automated broadcast
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

                try {
                    const formattedDateStr = `${task.date.replace(/\//g, '-')}T${task.time}:00`;
                    const taskDate = new Date(formattedDateStr);

                    if (isNaN(taskDate.getTime())) continue;

                    if (now >= taskDate) {
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
                                updatedTasks[i] = { ...task, isPlayed: true };
                                hasChanges = true;

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
                    // Ignore parse errors silently
                }
            }

            if (hasChanges) {
                setTasks(updatedTasks);
                localStorage.setItem('br_schedule_tasks', JSON.stringify(updatedTasks));
            }
        }, 10000);

        return () => clearInterval(timer);
    }, [license, activeChannelCode, isSending]);

    const handleToggleAuto = () => {
        const next = !isAutoEnabled;
        setIsAutoEnabled(next);
        localStorage.setItem('br_auto_broadcast_enabled', next ? 'true' : 'false');
    };

    const handleImport = () => {
        if (!importText.trim()) return;

        const lines = importText.trim().split('\n');
        const newTasks: ScheduleTask[] = [];

        lines.forEach(line => {
            const parts = line.split(/\t| {2,}/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                let date = parts[0];
                let time = parts[1];
                let content = parts.slice(2).join(' ');
                date = date.replace(/\./g, '-').replace(/\//g, '-');
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
            openDialog(t('broadcast.sender.scheduler'), t('broadcast.sender.parseFailedExcel'), 'error', closeDialog);
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
                openDialog(t('broadcast.sender.scheduler'), t('broadcast.sender.parseFailedWord'), 'error', closeDialog);
            }

        } catch (error) {
            console.error('Docx parse error', error);
            openDialog(t('broadcast.sender.scheduler'), t('broadcast.sender.parseError'), 'error', closeDialog);
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
        openDialog(t('broadcast.sender.scheduler'), t('broadcast.sender.importSuccess').replace('{count}', String(addedCount)), 'success', closeDialog);
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
        openDialog(
            t('broadcast.sender.scheduler'),
            t('broadcast.sender.clearHistoryConfirm') || '确定清空所有排期数据吗？',
            'warning',
            () => {
                setTasks([]);
                localStorage.removeItem('br_schedule_tasks');
                closeDialog();
            }
        );
    };

    return (
        <GlassCard className="p-10 mt-12 border border-white/40 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-10 px-2 border-b border-black/[0.03] dark:border-white/[0.03] pb-8">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20 shrink-0">
                        <Calendar size={32} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white truncate">{t('broadcast.sender.scheduler')}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full whitespace-nowrap">
                                {tasks.length} {t('broadcast.sender.rules')}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 italic">V2.5 PRO</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleToggleAuto}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 border shadow-sm ${isAutoEnabled
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20 active:scale-95'
                            : 'bg-white/40 dark:bg-white/5 text-slate-400 border-white/20 hover:border-blue-400/30'}`}
                    >
                        {isAutoEnabled ? <ToggleRight size={22} className="text-white" /> : <ToggleLeft size={22} className="opacity-40" />}
                        <span className="whitespace-nowrap">{isAutoEnabled ? t('broadcast.sender.running') : t('broadcast.sender.paused')}</span>
                    </button>
                    {tasks.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="w-14 h-14 flex items-center justify-center text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-[1.25rem] transition-all duration-300 border border-transparent hover:border-rose-500/20 shrink-0"
                            title={t('broadcast.sender.clearAll')}
                        >
                            <Trash2 size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* Actions / Import Section */}
            {!showImport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                    <button
                        onClick={() => setShowImport(true)}
                        className="group relative flex flex-row sm:flex-col items-center sm:justify-center p-8 sm:p-12 rounded-[2.5rem] border border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all duration-500 text-indigo-500 overflow-hidden text-left sm:text-center"
                    >
                        <Upload size={32} className="mr-5 sm:mr-0 sm:mb-4 group-hover:scale-110 transition-transform duration-700 shrink-0" />
                        <span className="font-black uppercase tracking-[0.25em] text-[11px]">{t('broadcast.sender.importExcelTitle')}</span>
                        <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 rotate-12">
                            <FileText size={80} />
                        </div>
                    </button>

                    <label className="group relative flex flex-row sm:flex-col items-center sm:justify-center p-8 sm:p-12 rounded-[2.5rem] border border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all duration-500 text-emerald-600 dark:text-emerald-400 cursor-pointer overflow-hidden text-left sm:text-center">
                        {isParsingDocx ? (
                            <div className="flex items-center mr-5 sm:mr-0 sm:mb-4">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                        ) : (
                            <FileText size={32} className="mr-5 sm:mr-0 sm:mb-4 group-hover:scale-110 transition-transform duration-700 shrink-0" />
                        )}
                        <span className="font-black uppercase tracking-[0.25em] text-[11px]">
                            {isParsingDocx ? t('broadcast.sender.parsing') : t('broadcast.sender.importWordTitle')}
                        </span>
                        <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 -rotate-12">
                            <Upload size={80} />
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
                                    {t('broadcast.sender.verifyResults')}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">
                                    {t('broadcast.sender.verifyDesc').replace('{count}', String(previewTasks.length))}
                                </p>
                            </div>
                            <button onClick={() => setPreviewTasks(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <span className="text-2xl font-light leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50 dark:bg-black/20">
                            {previewTasks.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 font-bold">{t('broadcast.sender.emptyList')}</div>
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
                                                placeholder={t('broadcast.sender.contentPlaceholder')}
                                            />
                                            <button
                                                onClick={() => deletePreviewTask(pt.id)}
                                                className="sm:opacity-0 sm:group-hover:opacity-100 flex-none p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 sm:p-6 border-t border-black/5 dark:border-white/5 bg-white dark:bg-gray-900 flex justify-between gap-3">
                            <button
                                onClick={() => setPreviewTasks(null)}
                                className="px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-colors text-gray-600"
                            >
                                {t('broadcast.sender.abandon')}
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPreviewTasks([])}
                                    className="px-6 py-3 rounded-xl font-bold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors text-red-500"
                                >
                                    {t('broadcast.sender.clearAll')}
                                </button>
                                <button
                                    onClick={handleConfirmPreview}
                                    disabled={previewTasks.length === 0}
                                    className="px-8 py-3 rounded-xl font-bold bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                                >
                                    {t('broadcast.sender.confirmImport').replace('{count}', String(previewTasks.length))}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Panel */}
            {showImport && (
                <div className="mt-2 p-6 rounded-3xl bg-indigo-500/5 border-2 border-dashed border-indigo-500/20 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-indigo-500">{t('broadcast.sender.smartParseHeader')}</h4>
                        <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-white dark:bg-black/20 rounded-xl p-3 font-mono text-[10px] overflow-x-auto text-gray-500 mb-4 border border-black/5">
                        <p className="mb-2 opacity-60">{t('broadcast.sender.formatPrompt')}</p>
                    </div>

                    <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={t('broadcast.sender.pastePlaceholder')}
                        rows={6}
                        className="w-full bg-white dark:bg-black/40 border border-indigo-500/20 rounded-2xl p-4 font-mono text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition dark:text-gray-200"
                    />

                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowImport(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-500">{t('broadcast.sender.abandon')}</button>
                        <button onClick={handleImport} disabled={!importText.trim()} className="flex-[2] py-3 rounded-xl bg-indigo-500 text-white font-bold disabled:opacity-30">{t('broadcast.sender.importWordTitle')}</button>
                    </div>
                </div>
            )}

            {/* Task List Section */}
            {tasks.length > 0 && (
                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-xs font-black uppercase tracking-widest opacity-40">{t('broadcast.sender.queueHeader')}</h4>
                        <div className="h-[1px] flex-1 mx-4 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto px-1 custom-scrollbar scroll-smooth">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`group p-6 rounded-[2rem] border transition-all duration-500 flex flex-row items-center gap-5 ${task.isPlayed
                                    ? 'bg-slate-50/50 dark:bg-white/[0.02] border-transparent opacity-40 grayscale-sm'
                                    : 'bg-white/40 dark:bg-white/[0.03] border-white/40 dark:border-white/10 hover:border-indigo-500/40 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)]'
                                    }`}
                            >
                                <div className={`flex-none flex flex-col items-center justify-center w-16 h-16 rounded-2xl font-mono transition-colors duration-500 shrink-0 ${task.isPlayed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100/80 dark:bg-black/20 text-indigo-500 shadow-inner'}`}>
                                    {task.isPlayed ? (
                                        <CheckCircle2 size={28} />
                                    ) : (
                                        <>
                                            <span className="text-[10px] uppercase font-black opacity-40 leading-none mb-1.5">{task.date.slice(-5)}</span>
                                            <span className="text-base font-black tracking-tight leading-none">{task.time}</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-base font-bold truncate leading-relaxed transition-all ${task.isPlayed ? 'text-slate-400 line-through opacity-70' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                        {task.content}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${task.isPlayed ? 'text-emerald-500' : 'text-indigo-500/60'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${task.isPlayed ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
                                            {task.isPlayed ? 'COMPLETED' : 'SCHEDULED'}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 font-mono truncate max-w-[120px]">Room · {task.channelCode}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all duration-300 sm:opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <CustomDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                onConfirm={dialog.onConfirm}
                onCancel={closeDialog}
                isDark={isDark}
            />
        </GlassCard>
    );
};

export default ScheduleManager;

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Trash2, Clock, CheckCircle2, Check, AlertTriangle, ToggleLeft, ToggleRight, ListTodo, FileText } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

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
            const combined = [...tasks, ...newTasks];
            // Sort by Date + Time
            combined.sort((a, b) => {
                const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
                const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
                return (isNaN(timeA) ? Number.MAX_SAFE_INTEGER : timeA) - (isNaN(timeB) ? Number.MAX_SAFE_INTEGER : timeB);
            });

            setTasks(combined);
            localStorage.setItem('br_schedule_tasks', JSON.stringify(combined));
            setImportText('');
            setShowImport(false);
            alert(`成功装载 ${newTasks.length} 条播放任务！`);
        } else {
            alert('未能识别有效的数据，请确保格式为: 日期(Tab)时间(Tab)内容，并检查是否有制表符或多个空格分隔。');
        }
    };

    const handleDelete = (id: string) => {
        const updated = tasks.filter(t => t.id !== id);
        setTasks(updated);
        localStorage.setItem('br_schedule_tasks', JSON.stringify(updated));
    };

    const handleClearAll = () => {
        if (window.confirm(t('broadcast.sender.clearHistoryConfirm') || '确定清空所有排期数据吗？')) {
            setTasks([]);
            localStorage.removeItem('br_schedule_tasks');
        }
    };

    return (
        <GlassCard className="p-8 mt-8 border-2 border-indigo-500/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight">{t('broadcast.sender.scheduler') || '定时播报计划'}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">
                            {tasks.length} {t('broadcast.sender.rules') || 'TASKS LOADED'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleToggleAuto}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isAutoEnabled
                            ? 'bg-green-500/10 text-green-500 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                    >
                        {isAutoEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {t('broadcast.sender.autoBroadcast') || '自动播报'} {isAutoEnabled ? (t('broadcast.sender.enabled') || 'ON') : (t('broadcast.sender.disabled') || 'OFF')}
                    </button>
                    {tasks.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors bg-white/5 rounded-lg"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Import UI */}
            <div className="mb-6">
                {!showImport ? (
                    <button
                        onClick={() => setShowImport(true)}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-500 font-bold bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <FileText size={18} />
                        {t('broadcast.sender.importExcel') || '从 Excel 导入计划'}
                    </button>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                            <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                💡 {t('broadcast.sender.howToImportTitle') || '如何从 Excel 导入？'}
                            </h4>
                            <p className="text-xs text-indigo-500/80 leading-relaxed">
                                {t('broadcast.sender.scheduleHelper') || '系统支持纯本地自动播报（不占用云端）。无需传文件，只需直接打开您的 Excel 课表：'}
                            </p>
                            <div className="mt-3 bg-white dark:bg-black/20 rounded-lg p-3 font-mono text-xs overflow-x-auto text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/5">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-white/10 opacity-60">
                                            <th className="py-1 min-w-[100px]">A列: 日期</th>
                                            <th className="py-1 min-w-[80px]">B列: 时间</th>
                                            <th className="py-1">C列: 播报内容</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="py-1">2026-03-01</td>
                                            <td className="py-1">08:00</td>
                                            <td className="py-1">第一周安全教育：防溺水...</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1">2026-03-01</td>
                                            <td className="py-1">15:30</td>
                                            <td className="py-1">放学提示：请注意交通安全...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-indigo-500/80 mt-3 font-bold">
                                👉 {t('broadcast.sender.copyPasteInstruction') || '选中 Excel 中的这三列（不要全选整张表），按 Ctrl+C 复制，然后直接通过 Ctrl+V 粘贴到下方框中即可。'}
                            </p>
                        </div>

                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder={t('broadcast.sender.pasteExcelHere') || '请在此处使用 Ctrl+C 和 Ctrl+V 粘贴您的表格...'}
                            rows={6}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all dark:text-gray-300 whitespace-pre"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImport(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-white/5 font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-300"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importText.trim()}
                                className="flex-[2] py-3 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {t('broadcast.sender.parseBtn') || '智能解析并保存'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tasks List */}
            {tasks.length > 0 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`group p-4 rounded-2xl border transition-all flex items-center gap-4 ${task.isPlayed
                                ? 'bg-gray-50/50 dark:bg-white/[0.02] border-transparent opacity-60 grayscale'
                                : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/10 hover:border-indigo-500/30 shadow-sm'
                                }`}
                        >
                            <div className="flex-none flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gray-50 dark:bg-black/20 text-indigo-500 font-mono">
                                {task.isPlayed ? (
                                    <CheckCircle2 size={24} className="text-green-500" />
                                ) : (
                                    <>
                                        <span className="text-[10px] uppercase font-bold opacity-50 mb-0.5">{task.date.slice(-5)}</span>
                                        <span className="text-sm font-black tracking-tight">{task.time}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${task.isPlayed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {task.content}
                                </p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1 flex items-center gap-1">
                                    {task.isPlayed
                                        ? <><Check size={10} /> {t('broadcast.sender.played') || '已播报'} </>
                                        : <><Clock size={10} /> {t('broadcast.sender.pending') || '待执行'} </>
                                    }
                                    · ROOM {task.channelCode}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(task.id)}
                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
    );
};

export default ScheduleManager;

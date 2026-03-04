import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, History, Send, Clock, ChevronRight, AlertTriangle, CheckCircle2, AlertCircle, Copy, RefreshCw, Loader2, Info, Radio, Repeat, X } from 'lucide-react';
import { getLicensePrefix } from './utils/licenseManager';
import { useTranslations } from '../hooks/useTranslations';
import ScheduleManager from './ScheduleManager';
import GlassCard from './components/GlassCard';
import { DialogType } from './components/CustomDialog';

interface Message {
    id: string;
    text: string;
    isEmergency: boolean;
    repeatCount?: number;
    voice?: string;
    timestamp: string;
    channelName?: string;
}

interface Channel {
    id: string;
    name: string;
    code: string;
}

interface SenderProps {
    license: string;
    isDark: boolean;
    onExitToSelection?: () => void;
    onOpenDialog?: (title: string, message: string, type: DialogType, onConfirm: () => void) => void;
}

const Sender: React.FC<SenderProps> = ({ license, isDark, onExitToSelection, onOpenDialog }) => {
    const t = useTranslations();
    const licensePrefix = getLicensePrefix(license);

    const openDialog = onOpenDialog || ((title: string, msg: string, type: DialogType, onConfirm: () => void) => {
        if (confirm(msg)) onConfirm();
    });
    const closeDialog = () => { };

    const [channels, setChannels] = useState<Channel[]>(() => {
        const saved = localStorage.getItem('br_channels');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [{ id: 'default', name: t('broadcast.sender.unknownClass'), code: Math.floor(100000 + Math.random() * 900000).toString() }];
    });

    const [activeChannelId, setActiveChannelId] = useState(() => {
        return localStorage.getItem('br_active_channel_id') || 'default';
    });

    const [editingChannel, setEditingChannel] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editCode, setEditCode] = useState('');

    const [inputText, setInputText] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [repeatCount, setRepeatCount] = useState<number | string>(1);

    const [history, setHistory] = useState<Message[]>([]);
    const [status, setStatus] = useState<{ type: 'loading' | 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

    const [showReplayDialog, setShowReplayDialog] = useState(false);
    const [replayData, setReplayData] = useState<{
        text: string;
        repeatCount: number;
        voice: string;
        isEmergency: boolean;
        channelName?: string;
    } | null>(null);

    const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
    const channelCode = activeChannel?.code || '';

    useEffect(() => {
        const savedHistory = localStorage.getItem('br_sender_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                setHistory([]);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('br_channels', JSON.stringify(channels));
    }, [channels]);

    useEffect(() => {
        localStorage.setItem('br_active_channel_id', activeChannelId);
    }, [activeChannelId]);

    // Auto-activate room on server
    useEffect(() => {
        if (channelCode && license) {
            fetch('/api/broadcast/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: channelCode, license })
            }).catch(console.error);
        }
    }, [channelCode, license]);

    const addChannel = () => {
        const newId = Date.now().toString();
        const newChannel: Channel = {
            id: newId,
            name: `${t('broadcast.sender.addClass')} ${channels.length + 1}`,
            code: Math.floor(100000 + Math.random() * 900000).toString()
        };
        setChannels([...channels, newChannel]);
        setActiveChannelId(newId);
    };

    const deleteChannel = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (channels.length <= 1) return;
        openDialog(
            t('broadcast.sender.deleteChannel'),
            t('broadcast.sender.clearHistoryConfirm'),
            'warning',
            async () => {
                const channelToDelete = channels.find(c => c.id === id);
                if (channelToDelete) {
                    try {
                        await fetch('/api/broadcast/deactivate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: channelToDelete.code, license })
                        });
                    } catch (error) {
                        console.error('Failed to deactivate room:', error);
                    }
                }

                const nextChannels = channels.filter(c => c.id !== id);
                setChannels(nextChannels);
                if (activeChannelId === id) {
                    setActiveChannelId(nextChannels[0].id);
                }
            }
        );
    };

    const startEditing = (channel: Channel, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingChannel(channel.id);
        setEditName(channel.name);
        setEditCode(channel.code);
    };

    const saveEdit = async () => {
        if (!editingChannel) return;
        const newName = editName.trim() || t('broadcast.sender.unknownClass');
        const newCode = editCode.toUpperCase().trim();

        setChannels(channels.map(c =>
            c.id === editingChannel ? { ...c, name: newName, code: newCode } : c
        ));

        try {
            fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license,
                    code: newCode,
                    text: '', // Silent update
                    channelName: newName,
                    isEmergency: false
                })
            });
        } catch (e) {
            console.error('Metadata sync failed:', e);
        }

        setEditingChannel(null);
    };

    const generateRandomChannel = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setEditCode(newCode);
    };

    const handleSend = async () => {
        if (!channelCode.trim() || !inputText.trim()) {
            setStatus({ type: 'error', msg: t('broadcast.sender.missingField') });
            return;
        }

        setStatus({ type: 'loading', msg: t('broadcast.sender.broadcasting') });

        try {
            const resp = await fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license,
                    code: channelCode.trim(),
                    text: inputText.trim(),
                    isEmergency,
                    channelName: activeChannel?.name || t('broadcast.sender.unknownClass'),
                    repeatCount: isLooping ? -1 : (parseInt(String(repeatCount)) || 1),
                    voice: ''
                }),
            });

            const data = await resp.json();

            if (data.success) {
                const newMessage: Message = {
                    id: data.messageId,
                    text: inputText.trim(),
                    isEmergency,
                    voice: '',
                    repeatCount: isLooping ? -1 : (parseInt(String(repeatCount)) || 1),
                    timestamp: new Date().toLocaleTimeString(window.navigator.language, { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    channelName: activeChannel.name
                };

                const newHistory = [newMessage, ...history].slice(0, 30);
                setHistory(newHistory);
                localStorage.setItem('br_sender_history', JSON.stringify(newHistory));

                setInputText('');
                setIsEmergency(false);
                setStatus({ type: 'success', msg: t('broadcast.sender.broadcastDelivered') });

                setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
            } else {
                throw new Error(data.error || 'Server Error');
            }
        } catch (err: any) {
            setStatus({ type: 'error', msg: t('broadcast.sender.failedToSend') });
        }
    };

    const handleReplay = (text: string, isEmergencyMsg: boolean, voice?: string, repeat?: number, originalChannelName?: string) => {
        setReplayData({
            text,
            isEmergency: isEmergencyMsg,
            voice: voice || 'zh-CN-XiaoxiaoNeural',
            repeatCount: repeat || 1,
            channelName: originalChannelName
        });
        setShowReplayDialog(true);
    };

    const executeReplay = async () => {
        if (!replayData) return;
        setShowReplayDialog(false);
        setStatus({ type: 'loading', msg: t('broadcast.sender.broadcasting') });
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const resp = await fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license,
                    code: channelCode.trim(),
                    text: replayData.text.trim(),
                    isEmergency: replayData.isEmergency,
                    channelName: replayData.channelName || activeChannel?.name || t('broadcast.sender.unknownClass'),
                    repeatCount: replayData.repeatCount,
                    voice: ''
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await resp.json();
            if (data.success) {
                const newMessage: Message = {
                    id: data.messageId,
                    text: replayData.text.trim(),
                    isEmergency: replayData.isEmergency,
                    voice: '',
                    repeatCount: replayData.repeatCount,
                    timestamp: new Date().toLocaleTimeString(window.navigator.language, { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    channelName: replayData.channelName || activeChannel.name
                };

                const newHistory = [newMessage, ...history].slice(0, 30);
                setHistory(newHistory);
                localStorage.setItem('br_sender_history', JSON.stringify(newHistory));
                setStatus({ type: 'success', msg: t('broadcast.sender.broadcastDelivered') });
                setTimeout(() => setStatus(prev => prev.type === 'success' ? { type: null, msg: '' } : prev), 3000);
            } else {
                throw new Error(data.error || 'Server Error');
            }
        } catch (err: any) {
            console.error('Replay failed:', err);
            setStatus({ type: 'error', msg: err.name === 'AbortError' ? '发送超时，请重试' : (t('broadcast.sender.failedToSend') || '发送失败') });
            setTimeout(() => setStatus(prev => prev.type === 'error' ? { type: null, msg: '' } : prev), 3000);
        }
    };

    const clearHistory = () => {
        openDialog(
            t('broadcast.sender.timeline'),
            t('broadcast.sender.clearHistoryConfirm'),
            'warning',
            () => {
                setHistory([]);
                localStorage.removeItem('br_sender_history');
            }
        );
    };

    const clearCloudRooms = async () => {
        openDialog(
            t('broadcast.sender.manageClasses'),
            t('broadcast.sender.clearAllRoomsConfirm'),
            'warning',
            async () => {
                setStatus({ type: 'loading', msg: t('broadcast.sender.clearing') });
                try {
                    const resp = await fetch('/api/broadcast/cleanup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ license })
                    });
                    const data = await resp.json();
                    if (data.success) {
                        const defaultChannel = {
                            id: 'default',
                            name: t('broadcast.sender.unknownClass'),
                            code: Math.floor(100000 + Math.random() * 900000).toString()
                        };
                        setChannels([defaultChannel]);
                        setActiveChannelId('default');
                        localStorage.removeItem('br_channels');
                        setStatus({ type: 'success', msg: t('broadcast.sender.clearSuccess') });
                        setTimeout(() => {
                            setStatus({ type: null, msg: '' });
                            onExitToSelection?.();
                        }, 1500);
                    } else {
                        throw new Error(data.error);
                    }
                } catch (err) {
                    setStatus({ type: 'error', msg: t('broadcast.sender.clearFailed') });
                    setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
                }
            }
        );
    };

    const copyRoomId = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(channelCode);
        setStatus({ type: 'success', msg: t('broadcast.sender.copySuccess') });
        setTimeout(() => setStatus({ type: null, msg: '' }), 2000);
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto px-4 pb-20 origin-top scale-95 md:scale-100 transition-transform">
            {/* Channel Management Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-30">{t('broadcast.sender.manageClasses')}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearCloudRooms}
                            className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center hover:bg-orange-500 hover:text-white transition active:scale-90"
                            title={t('broadcast.sender.clearAllRooms')}
                        >
                            <AlertTriangle size={18} />
                        </button>
                        <button
                            onClick={addChannel}
                            className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition active:scale-90"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-nowrap overflow-x-auto gap-4 py-2 px-1 no-scrollbar scroll-smooth">
                    {channels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannelId(channel.id)}
                            className={`flex-none px-6 py-4 rounded-3xl border transition duration-300 flex items-center gap-3 relative group ${activeChannelId === channel.id
                                ? 'bg-gradient-to-r from-pink-500/90 to-rose-500/90 backdrop-blur-md border-pink-500/30 text-white scale-105'
                                : 'bg-white/50 dark:bg-white/5 border-black/5 dark:border-white/5 text-gray-400 hover:bg-white/80 dark:hover:bg-white/10'
                                }`}
                        >
                            <div className="text-left">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeChannelId === channel.id ? 'opacity-80 text-white' : 'opacity-40'}`}>{t('broadcast.sender.room')} {channel.code}</p>
                                <p className="text-sm font-bold truncate max-w-[120px]">{channel.name}</p>
                            </div>
                            <div className={`flex items-center gap-1 ${activeChannelId === channel.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                <div
                                    onClick={(e) => startEditing(channel, e)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <Edit2 size={14} />
                                </div>
                                {channels.length > 1 && (
                                    <div
                                        onClick={(e) => deleteChannel(channel.id, e)}
                                        className={`p-1.5 rounded-lg transition-colors ${activeChannelId === channel.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-500/20 text-red-500/60 hover:text-red-500'}`}
                                    >
                                        <Trash2 size={14} />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Channel Details / Editor */}
            {editingChannel ? (
                <GlassCard className="p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300 border-2 border-blue-500/30">
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('broadcast.sender.className')}</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className={`w-full p-4 rounded-2xl border bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-400 outline-none font-bold transition-all`}
                                placeholder={t('broadcast.sender.unknownClass')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('broadcast.sender.roomCode')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                    className={`flex-1 p-4 rounded-2xl border bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-400 outline-none font-mono font-black transition-all`}
                                    maxLength={8}
                                />
                                <button
                                    onClick={generateRandomChannel}
                                    className="p-4 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setEditingChannel(null)}
                            className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                        >
                            {t('broadcast.sender.cancel')}
                        </button>
                        <button
                            onClick={saveEdit}
                            className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {t('broadcast.sender.save')}
                        </button>
                    </div>
                </GlassCard>
            ) : (
                <GlassCard className="p-10 space-y-8 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity -rotate-12 translate-x-4 -translate-y-4">
                        <Radio size={120} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">{t('broadcast.sender.activeRoom')}</p>
                            <h2 className="text-3xl font-black">{activeChannel?.name}</h2>
                        </div>
                        <div
                            onClick={copyRoomId}
                            className="flex flex-col items-end cursor-pointer hover:scale-105 transition-transform"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-1">Code</p>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
                                <span className="font-mono font-black text-xl tracking-wider text-blue-600">{activeChannel?.code}</span>
                                <Copy size={14} className="text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-2">
                            <Plus size={10} /> {t('broadcast.sender.messageContent')}
                        </label>
                        <div className="relative rounded-[2.5rem] p-8 transition-all border-2 bg-slate-50 border-slate-100 focus-within:border-blue-300 focus-within:bg-white group-focus-within:shadow-xl">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full bg-transparent font-bold outline-none resize-none min-h-[160px] text-2xl leading-relaxed text-slate-800 placeholder:text-slate-300"
                                placeholder={t('broadcast.sender.inputPlaceholder')}
                            />
                            <div className="absolute bottom-6 right-8 opacity-10 pointer-events-none group-focus-within:opacity-20 transition-opacity">
                                <History size={64} />
                            </div>
                        </div>
                    </div>

                    {/* ─ 重复次数 + 循环策略 合并一行 ─ */}
                    <div className="flex items-center justify-between gap-1 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-100 mb-3 overflow-x-auto scrollbar-hide">
                        {/* 减少, 数值, 增加 */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setRepeatCount(Math.max(1, (parseInt(String(repeatCount)) || 1) - 1))}
                                disabled={isLooping}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-90 transition-all disabled:opacity-30"
                            >
                                <ChevronRight className="rotate-180" size={18} />
                            </button>

                            <div className="w-12 sm:w-16 flex flex-col items-center justify-center">
                                <span className={`font-black text-2xl leading-none ${isLooping ? 'text-slate-300' : 'text-blue-500'}`}>
                                    {isLooping ? '∞' : repeatCount}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 whitespace-nowrap scale-[0.85] origin-top mt-1">
                                    {t('broadcast.sender.repeatCount')}
                                </span>
                            </div>

                            <button
                                onClick={() => setRepeatCount(Math.min(99, (parseInt(String(repeatCount)) || 1) + 1))}
                                disabled={isLooping}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-90 transition-all disabled:opacity-30"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* 分隔 */}
                        <div className="w-px h-6 sm:h-8 bg-slate-200 shrink-0 mx-1 sm:mx-2" />

                        {/* 策略切换 */}
                        <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-slate-100">
                            <button
                                onClick={() => setIsLooping(false)}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all ${!isLooping ? 'bg-blue-500 border-blue-400 text-white shadow-md shadow-blue-500/20' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                            >
                                <Repeat size={16} />
                            </button>
                            <button
                                onClick={() => setIsLooping(true)}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all ${isLooping ? 'bg-blue-500 border-blue-400 text-white shadow-md shadow-blue-500/20' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
                            >
                                <span className="text-xl font-black leading-none">∞</span>
                            </button>
                        </div>
                    </div>

                    {/* ─ 紧急 + 发起 ─ */}
                    <div className="flex items-stretch gap-2 sm:gap-3">
                        {/* 紧急播报（图标+文字，不换行） */}
                        <button
                            onClick={() => setIsEmergency(!isEmergency)}
                            className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all duration-500 border-2 whitespace-nowrap ${isEmergency
                                ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20'
                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        >
                            <AlertTriangle size={16} className={isEmergency ? 'animate-pulse' : ''} />
                            <span>{t('broadcast.sender.emergency')}</span>
                            <div className={`ml-1 w-7 h-4 rounded-full relative transition-colors shrink-0 ${isEmergency ? 'bg-white/30' : 'bg-gray-300'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm ${isEmergency ? 'right-0.5' : 'left-0.5'}`} />
                            </div>
                        </button>

                        {/* 发起播报 */}
                        <button
                            onClick={handleSend}
                            disabled={status.type === 'loading'}
                            className="flex-1 rounded-xl sm:rounded-2xl bg-blue-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2 group whitespace-nowrap"
                        >
                            {status.type === 'loading' ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    <span>{t('broadcast.sender.initBroadcast')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* History Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-30">{t('broadcast.sender.history')}</h3>
                    <button
                        onClick={clearHistory}
                        className="text-[10px] font-black text-red-500/40 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                        {t('broadcast.sender.clearHistory')}
                    </button>
                </div>
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300 space-y-4">
                            <History size={48} className="opacity-20" />
                            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50">{t('broadcast.sender.noHistory')}</p>
                        </div>
                    ) : (
                        history.map((msg) => (
                            <button
                                key={msg.id}
                                onClick={() => handleReplay(msg.text, msg.isEmergency, msg.voice, msg.repeatCount, msg.channelName)}
                                className={`w-full group p-6 rounded-[2rem] border transition-all hover:scale-[1.01] text-left flex items-start gap-4 ${msg.isEmergency
                                    ? 'bg-red-50/50 border-red-100 hover:border-red-200'
                                    : 'bg-white/50 border-slate-100 hover:border-blue-200 hover:bg-white'}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${msg.isEmergency ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors'}`}>
                                    {msg.isEmergency ? <AlertTriangle size={20} /> : <History size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{msg.timestamp} · {msg.channelName}</p>
                                        {msg.repeatCount && msg.repeatCount !== 1 && (
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                                                {msg.repeatCount === -1 ? '∞' : `x${msg.repeatCount}`}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-base font-bold line-clamp-2 leading-relaxed ${msg.isEmergency ? 'text-red-600' : 'text-slate-700'}`}>
                                        {msg.text}
                                    </p>
                                </div>
                                <div className="self-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="text-slate-300" size={20} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Schedule Manager Section */}
            <ScheduleManager
                license={license}
                activeChannelCode={channelCode}
                isDark={isDark}
            />

            {/* Status Toast */}
            {status.msg && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4">
                    <div className={`px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${status.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                        status.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                            'bg-blue-600/90 border-blue-500 text-white'
                        }`}>
                        {status.type === 'loading' && <Loader2 className="animate-spin" size={18} />}
                        {status.type === 'success' && <CheckCircle2 size={18} />}
                        {status.type === 'error' && <AlertCircle size={18} />}
                        <span className="text-xs font-black uppercase tracking-widest">{status.msg}</span>
                    </div>
                </div>
            )}

            {/* Replay Quick-Editor Dialog */}
            {showReplayDialog && replayData && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 transition-all">
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-xl" onClick={() => setShowReplayDialog(false)} />
                    <div className="relative w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 p-6 flex flex-col max-h-[90vh] overflow-hidden">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 shrink-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                                    <Repeat size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">重发播报</h2>
                                    <p className="text-xs font-semibold text-indigo-500/80 uppercase tracking-wider">{replayData.channelName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowReplayDialog(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Text Editor Area */}
                        <div className="relative flex-1 min-h-[120px] mb-6 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all overflow-hidden z-10 flex flex-col">
                            <textarea
                                value={replayData.text}
                                onChange={(e) => setReplayData({ ...replayData, text: e.target.value })}
                                className="w-full h-full flex-1 bg-transparent p-5 font-bold outline-none resize-none text-xl leading-relaxed text-slate-800 dark:text-white placeholder:text-slate-300"
                                placeholder="输入播报文字..."
                            />
                            <div className="absolute right-3 bottom-3 opacity-10 pointer-events-none">
                                <History size={64} />
                            </div>
                        </div>

                        {/* Controls Bottom Row - Completely Horizontal */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 z-10">

                            {/* Loops Control */}
                            <div className="flex items-center h-14 bg-slate-100 dark:bg-white/5 rounded-2xl p-1 border border-slate-200 dark:border-white/10 w-fit shrink-0">
                                <button
                                    onClick={() => setReplayData({ ...replayData, repeatCount: Math.max(1, replayData.repeatCount - 1) })}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-500 shadow-sm hover:text-indigo-600 transition-colors"
                                >
                                    <ChevronRight className="rotate-180" size={18} />
                                </button>
                                <div className="w-12 text-center flex flex-col justify-center">
                                    <span className="font-bold text-lg leading-none text-slate-800 dark:text-white">
                                        {replayData.repeatCount === -1 ? '∞' : replayData.repeatCount}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setReplayData({ ...replayData, repeatCount: Math.min(99, replayData.repeatCount + 1) })}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-500 shadow-sm hover:text-indigo-600 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Emergency Toggle */}
                            <button
                                onClick={() => setReplayData({ ...replayData, isEmergency: !replayData.isEmergency })}
                                className={`flex items-center gap-2 h-14 px-5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap shrink-0 group ${replayData.isEmergency
                                    ? 'bg-red-50 dark:bg-red-500/20 text-red-600 border border-red-200 dark:border-red-500/30'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200'
                                    }`}
                            >
                                <AlertTriangle size={18} className={replayData.isEmergency ? 'animate-pulse' : ''} />
                                <span>紧急模式</span>
                                <div className={`ml-2 w-8 h-4 rounded-full relative transition-colors ${replayData.isEmergency ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all overflow-hidden ${replayData.isEmergency ? 'right-0.5' : 'left-0.5'}`} />
                                </div>
                            </button>

                            {/* Submit Button */}
                            <button
                                onClick={executeReplay}
                                className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 group min-w-[120px]"
                            >
                                <span>确认重发</span>
                                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sender;

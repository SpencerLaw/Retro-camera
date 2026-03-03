import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, History, Send, Clock, ChevronRight, AlertTriangle, CheckCircle2, Copy, RefreshCw, Loader2, Info, Radio, Repeat } from 'lucide-react';
import { getLicensePrefix } from './utils/licenseManager';
import { useTranslations } from '../hooks/useTranslations';
import ScheduleManager from './ScheduleManager';
import GlassCard from './components/GlassCard';
import CustomDialog, { DialogType } from './components/CustomDialog';

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

const Sender: React.FC<{ license: string, isDark: boolean }> = ({ license, isDark }) => {
    const t = useTranslations();
    const licensePrefix = getLicensePrefix(license);

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
    // currentTime removed to prevent whole-page re-renders every second
    const [isEmergency, setIsEmergency] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [repeatCount, setRepeatCount] = useState<number | string>(1);

    const [history, setHistory] = useState<Message[]>([]);
    const [status, setStatus] = useState<{ type: 'loading' | 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

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
        // Clock moved to separate component
    }, []);

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
                // Find the channel to get its room code
                const channelToDelete = channels.find(c => c.id === id);

                // Deactivate the room in the database
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
                closeDialog();
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

        // Push name sync to KV immediately
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
                closeDialog();
            }
        );
    };

    const clearCloudRooms = async () => {
        openDialog(
            t('broadcast.sender.manageClasses'),
            t('broadcast.sender.clearAllRoomsConfirm'),
            'warning',
            async () => {
                closeDialog();
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
                        setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
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
                                ? 'bg-gradient-to-r from-pink-500/90 to-rose-500/90 backdrop-blur-md border-pink-500/30 text-white shadow-xl scale-105 shadow-pink-500/20'
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
                <GlassCard className="p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-2 border-blue-500/30">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('broadcast.sender.className')}</label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition dark:text-white"
                                placeholder={t('broadcast.sender.classNamePlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('broadcast.sender.roomCode')}</label>
                            <div className="relative">
                                <input
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                    className="w-full bg-gray-100 dark:bg-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition dark:text-white uppercase tracking-widest"
                                    placeholder={t('broadcast.sender.roomCodePlaceholder')}
                                    maxLength={8}
                                />
                                <button
                                    onClick={generateRandomChannel}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setEditingChannel(null)}
                            className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 font-bold hover:bg-gray-200 transition"
                        >
                            {t('broadcast.sender.abandon') || '取消'}
                        </button>
                        <button
                            onClick={saveEdit}
                            className="flex-1 py-4 rounded-2xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition"
                        >
                            {t('broadcast.sender.on') || '保存'}
                        </button>
                    </div>
                </GlassCard>
            ) : (
                <GlassCard className="p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between group relative overflow-hidden gap-4">
                    <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-gradient-to-b from-blue-500 to-purple-600"></div>
                    <div className="space-y-1 min-w-0 flex-1 w-full">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                            <Radio size={12} className="text-blue-500" /> {activeChannel?.name}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-4xl sm:text-6xl font-black tracking-tighter italic bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent px-1 min-w-0 sm:min-w-[200px] break-all">
                                {channelCode}
                            </div>
                            <button onClick={copyRoomId} className="p-2 text-gray-400 hover:text-blue-500 transition-colors sm:opacity-0 group-hover:opacity-100 flex-shrink-0">
                                <Copy size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-black/5 dark:border-white/5 pt-3 sm:pt-0">
                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black tracking-widest uppercase truncate">
                            {t('broadcast.sender.active')}
                        </div>
                        <div className="text-[10px] font-bold opacity-30 ml-auto sm:ml-0">{t('broadcast.sender.senderId')}: {license.slice(-4).toUpperCase()}</div>
                    </div>
                </GlassCard>
            )}

            {/* Input Section */}
            <GlassCard className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="relative group">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('broadcast.sender.broadcastPlaceholder')}
                        rows={4}
                        autoFocus
                        className="w-full bg-transparent border-none text-2xl font-bold tracking-tight outline-none resize-none placeholder:opacity-20 transition min-h-[140px] dark:text-white"
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                </div>

                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mt-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                        <button
                            onClick={() => setIsEmergency(!isEmergency)}
                            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition ${isEmergency
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                        >
                            <AlertTriangle size={18} /> {t('broadcast.sender.emergencyMode')}
                        </button>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20">
                            <button
                                onClick={() => setIsLooping(!isLooping)}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition border shadow-sm ${isLooping
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                            >
                                <Repeat size={16} className={isLooping ? 'animate-spin' : ''} />
                                {t('broadcast.sender.autoLoop')}: {isLooping ? t('broadcast.sender.on') : t('broadcast.sender.off')}
                            </button>

                            {!isLooping && (
                                <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-3 sm:py-1 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                    <span className="text-xs text-gray-500 font-bold whitespace-nowrap">{t('broadcast.sender.repeatCount')}:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={repeatCount}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') setRepeatCount('');
                                            else {
                                                const num = parseInt(val);
                                                if (!isNaN(num)) setRepeatCount(Math.min(99, num));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (repeatCount === '' || Number(repeatCount) < 1) setRepeatCount(1);
                                        }}
                                        className="w-12 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-center font-bold text-sm outline-none px-1 text-blue-600 dark:text-blue-400 py-1 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            )}


                        </div>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={status.type === 'loading'}
                        className="px-8 lg:px-12 py-4 lg:py-5 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-bold text-base lg:text-xl hover:scale-[1.02] active:scale-95 shadow-xl transition disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3 w-full xl:w-auto"
                    >
                        {status.type === 'loading' ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        {t('broadcast.sender.launch')}
                    </button>
                </div>

                {status.type && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-bold border animate-in fade-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}>
                        {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {status.msg}
                    </div>
                )}
            </GlassCard>

            {/* History Section */}
            <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <History size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">{t('broadcast.sender.timeline')}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">{t('broadcast.sender.last30Sessions')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={clearHistory}
                            className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                            title={t('broadcast.sender.wipeLogs')}
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto px-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-12 opacity-20">
                            <Send size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-bold tracking-tighter">{t('broadcast.sender.silentAirwaves')}</p>
                        </div>
                    ) : (
                        history.map((msg) => (
                            <div key={msg.id} className="group p-5 rounded-3xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-white/10 transition flex items-start gap-4">
                                <div className="pt-1">
                                    {msg.isEmergency ? (
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                            <AlertTriangle size={14} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Clock size={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black opacity-30 uppercase">{msg.timestamp}</span>
                                            {msg.channelName && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 opacity-60">
                                                    {msg.channelName}
                                                </span>
                                            )}
                                        </div>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-20 transition-opacity" />
                                    </div>
                                    <p className={`text-base font-semibold leading-relaxed ${msg.isEmergency ? 'text-red-500' : 'opacity-80'}`}>{msg.text}</p>
                                </div>
                                <button
                                    onClick={() => handleReplay(msg.text, msg.isEmergency, msg.voice, msg.repeatCount, msg.channelName)}
                                    className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 opacity-0 group-hover:opacity-100 transition hover:bg-blue-500 hover:text-white"
                                    title={t('broadcast.sender.replayAction')}
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>

            {/* Auto Schedule Section */}
            <ScheduleManager license={license} activeChannelCode={channelCode} isDark={isDark} />

            {/* Replay/Edit Dialog */}
            {showReplayDialog && replayData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowReplayDialog(false)}></div>
                    <GlassCard className="relative w-full max-w-lg p-8 space-y-8 shadow-2xl border-2 border-blue-500/20 scale-100 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Edit2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">编辑并重新播报</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">历史记录二次编辑</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReplayDialog(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30">播报内容</label>
                                <textarea
                                    value={replayData.text}
                                    onChange={(e) => setReplayData({ ...replayData, text: e.target.value })}
                                    className="w-full bg-gray-100 dark:bg-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition dark:text-white min-h-[120px] text-lg lg:text-xl"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-30">循环次数</label>
                                    <div className="flex items-center gap-4 bg-gray-100 dark:bg-white/5 p-2 rounded-2xl">
                                        <button
                                            onClick={() => setReplayData({ ...replayData, repeatCount: Math.max(1, replayData.repeatCount - 1) })}
                                            className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition"
                                        >
                                            -
                                        </button>
                                        <span className="flex-1 text-center font-black text-xl text-blue-500">
                                            {replayData.repeatCount === -1 ? '∞' : replayData.repeatCount}
                                        </span>
                                        <button
                                            onClick={() => setReplayData({ ...replayData, repeatCount: Math.min(99, replayData.repeatCount + 1) })}
                                            className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition"
                                        >
                                            +
                                        </button>
                                    </div>

                                </div>
                            </div>

                            <button
                                onClick={() => setReplayData({ ...replayData, isEmergency: !replayData.isEmergency })}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition ${replayData.isEmergency
                                    ? 'bg-red-500 text-white shadow-lg'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
                            >
                                <AlertTriangle size={18} /> 紧急模式: {replayData.isEmergency ? '已开启' : '已关闭'}
                            </button>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setShowReplayDialog(false)}
                                className="flex-1 py-5 rounded-3xl bg-gray-100 dark:bg-white/5 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition text-gray-400"
                            >
                                取消
                            </button>
                            <button
                                onClick={executeReplay}
                                className="flex-[2] py-5 rounded-3xl bg-blue-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition"
                            >
                                立即重发
                            </button>
                        </div>
                    </GlassCard>
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
        </div>
    );
};

export default Sender;

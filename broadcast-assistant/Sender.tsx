import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Edit2, History, Send, Clock, ChevronRight, ChevronUp, ChevronDown, AlertTriangle, CheckCircle2, AlertCircle, Copy, RefreshCw, Loader2, Info, Radio, Repeat, X, Bug } from 'lucide-react';
import { getLicensePrefix } from './utils/licenseManager';
import { useTranslations } from '../hooks/useTranslations';
import ScheduleManager from './ScheduleManager';
import GlassCard from './components/GlassCard';
import { DialogType } from './components/CustomDialog';
import FishAudioDebug from './components/FishAudioDebug';

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
    fishAudioVoice?: string;
    onSelectFishVoice?: (voiceId: string) => void;
}

const Sender: React.FC<SenderProps> = ({ license, isDark, onExitToSelection, onOpenDialog, fishAudioVoice, onSelectFishVoice }) => {
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
        return [];
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
    const [isLoadingCloud, setIsLoadingCloud] = useState(true);

    const [showReplayDialog, setShowReplayDialog] = useState(false);
    const [replayData, setReplayData] = useState<{
        text: string;
        repeatCount: number;
        voice: string;
        isEmergency: boolean;
        channelName?: string;
    } | null>(null);

    const [showFishAudioDebug, setShowFishAudioDebug] = useState(false);

    const hasSyncedFromCloud = useRef(false);

    // Lock body scroll when replay dialog is open to prevent underlying page from scrolling
    useEffect(() => {
        if (showReplayDialog) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [showReplayDialog]);

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
        localStorage.setItem('br_active_channel_id', activeChannelId);
    }, [activeChannelId]);

    // Initial & Polling cloud sync: Load channels for this license from cloud
    useEffect(() => {
        if (!license) {
            setIsLoadingCloud(false);
            return;
        }

        setIsLoadingCloud(true);
        const controller = new AbortController();

        const syncFromCloud = async (isPoll = false) => {
            try {
                const resp = await fetch(`/api/broadcast/get-channels?license=${license}`, {
                    signal: controller.signal,
                    cache: 'no-store'
                });
                const data = await resp.json();
                if (data.channels && Array.isArray(data.channels)) {
                    // Only update if cloud has content AND (it's initial load OR cloud significantly differs)
                    // This prevents overwriting unsaved local changes during a poll
                    const cloudLen = data.channels.length;
                    if (cloudLen > 0) {
                        hasSyncedFromCloud.current = true;
                        setChannels(data.channels);
                        if (activeChannelId === 'default' || !data.channels.find((c: any) => c.id === activeChannelId)) {
                            setActiveChannelId(data.channels[0].id);
                        }
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error('Cloud sync failed:', err);
            } finally {
                if (!isPoll) setIsLoadingCloud(false);
            }
        };

        syncFromCloud(false);

        // Set up polling every 20 seconds to keep multi-browser sessions in sync
        const pollInterval = setInterval(() => syncFromCloud(true), 20000);

        return () => {
            controller.abort();
            clearInterval(pollInterval);
        };
    }, [license]);

    // Save to cloud whenever channels change
    useEffect(() => {
        localStorage.setItem('br_channels', JSON.stringify(channels));

        // Don't save if we are still initial loading from cloud or if the change itself came from cloud
        if (isLoadingCloud) return;

        if (hasSyncedFromCloud.current) {
            hasSyncedFromCloud.current = false;
            return; // Skip one save cycle to avoid circular sync
        }

        if (license) {
            fetch('/api/broadcast/save-channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license, channels })
            }).catch(e => console.error('Cloud save failed:', e));
        }
    }, [channels, license, isLoadingCloud]);

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

    const addChannel = async () => {
        const newId = Date.now().toString();
        setStatus({ type: 'loading', msg: '正在分配唯一房间号...' });

        try {
            let uniqueCode = '';
            let attempts = 0;
            while (attempts < 10) {
                const candidate = Math.floor(100000 + Math.random() * 900000).toString();
                const resp = await fetch(`/api/broadcast/check-code?code=${candidate}`);
                if (!resp.ok) throw new Error('Network response was not ok');
                const { inUse } = await resp.json();
                if (!inUse) {
                    uniqueCode = candidate;
                    break;
                }
                attempts++;
            }

            if (!uniqueCode) {
                setStatus({ type: 'error', msg: '生成唯一房间号失败，请重试' });
                return;
            }

            const newChannel: Channel = {
                id: newId,
                name: `${t('broadcast.sender.addClass')} ${channels.length + 1}`,
                code: uniqueCode
            };
            setChannels([...channels, newChannel]);
            setActiveChannelId(newId);
            setStatus({ type: 'success', msg: '新房间已创建并同步至云端' });
            setTimeout(() => setStatus({ type: null, msg: '' }), 2000);
        } catch (err) {
            console.error('Failed to add channel:', err);
            setStatus({ type: 'error', msg: '连接服务器失败，请检查网络' });
            setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
        }
    };

    const deleteChannel = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
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
                    setActiveChannelId(nextChannels.length > 0 ? nextChannels[0].id : '');
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

        // Unique check if code changed
        const currentChannel = channels.find(c => c.id === editingChannel);
        if (currentChannel && currentChannel.code !== newCode) {
            try {
                const checkResp = await fetch(`/api/broadcast/check-code?code=${newCode}`);
                if (!checkResp.ok) throw new Error('Network error');
                const { inUse } = await checkResp.json();
                if (inUse) {
                    setStatus({ type: 'error', msg: '该房间号已被其他教室占用，请更换' });
                    return;
                }
            } catch (err) {
                console.error('Check code failed:', err);
                setStatus({ type: 'error', msg: '验证房间号失败，请检查网络' });
                return;
            }
        }

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

    const generateRandomChannel = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setStatus({ type: 'loading', msg: '检索可用号码...' });
        try {
            let uniqueCode = '';
            let attempts = 0;
            while (attempts < 10) {
                const candidate = Math.floor(100000 + Math.random() * 900000).toString();
                const resp = await fetch(`/api/broadcast/check-code?code=${candidate}`);
                if (!resp.ok) throw new Error('Network error');
                const { inUse } = await resp.json();
                if (!inUse) {
                    uniqueCode = candidate;
                    break;
                }
                attempts++;
            }
            if (uniqueCode) {
                setEditCode(uniqueCode);
                setStatus({ type: null, msg: '' });
            } else {
                setStatus({ type: 'error', msg: '未找到可用号码' });
            }
        } catch (err) {
            console.error('Generate random failed:', err);
            setStatus({ type: 'error', msg: '查询失败，请检查网络' });
        }
    };

    const handleSend = async () => {
        if (!channelCode.trim() || !inputText.trim()) {
            setStatus({ type: 'error', msg: t('broadcast.sender.missingField') });
            return;
        }

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
                    text: inputText.trim(),
                    isEmergency,
                    channelName: activeChannel?.name || t('broadcast.sender.unknownClass'),
                    repeatCount: isLooping ? -1 : (parseInt(String(repeatCount)) || 1),
                    voice: fishAudioVoice ? `fish:${fishAudioVoice}` : ''
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await resp.json();

            if (data.success) {
                const newMessage: Message = {
                    id: data.messageId,
                    text: inputText.trim(),
                    isEmergency,
                    voice: fishAudioVoice ? `fish:${fishAudioVoice}` : '',
                    repeatCount: isLooping ? -1 : (parseInt(String(repeatCount)) || 1),
                    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
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
                    voice: replayData.voice || (fishAudioVoice ? `fish:${fishAudioVoice}` : '')
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
                    voice: replayData.voice || (fishAudioVoice ? `fish:${fishAudioVoice}` : ''),
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
            '确定要清空当前频道的播报记录吗？(其他频道的记录不受影响)',
            'warning',
            () => {
                const filteredHistory = history.filter(m => m.channelName !== activeChannel?.name);
                setHistory(filteredHistory);
                localStorage.setItem('br_sender_history', JSON.stringify(filteredHistory));
            }
        );
    };

    const clearCloudRooms = async () => {
        openDialog(
            t('broadcast.sender.manageClasses'),
            '确定要清空云端数据库中所有关联的房间吗？此操作不可撤销。(注：该操作是安全的，仅会清理当前设备生成的这些房间数据，不会影响其他用户的房间。)',
            'warning',
            async () => {
                setStatus({ type: 'loading', msg: t('broadcast.sender.clearing') });
                try {
                    const resp = await fetch('/api/broadcast/clear-license-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ license })
                    });
                    const data = await resp.json();
                    if (data.success) {
                        setChannels([]);
                        setActiveChannelId('');
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

    const handleSelectFishVoice = (voiceId: string) => {
        onSelectFishVoice?.(voiceId);
        setStatus({ type: 'success', msg: '音色设置成功！下次播报将生效' });
        setTimeout(() => setStatus({ type: null, msg: '' }), 2000);
        setShowFishAudioDebug(false);
    };

    return (
        <>
            {showFishAudioDebug && (
                <FishAudioDebug
                    onClose={() => setShowFishAudioDebug(false)}
                    onSelectVoice={handleSelectFishVoice}
                    theme={isDark ? 'dark' : 'light'}
                />
            )}
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

                    <div className="flex flex-col gap-3 py-2 px-1">
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannelId(channel.id)}
                                className={`w-full px-6 py-4 rounded-3xl border transition duration-300 flex items-center justify-between gap-3 relative group ${activeChannelId === channel.id
                                    ? 'bg-gradient-to-r from-pink-500/90 to-rose-500/90 backdrop-blur-md border-pink-500/30 text-white shadow-lg shadow-pink-500/20'
                                    : 'bg-white/50 dark:bg-white/5 border-black/5 dark:border-white/5 text-gray-400 hover:bg-white/80 dark:hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-left flex-1 min-w-0">
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

                {/* Active Channel Details / Editor / Empty State */}
                {channels.length === 0 ? (
                    <GlassCard className="p-12 space-y-6 text-center shadow-2xl overflow-hidden relative group border-2 border-dashed border-slate-200 dark:border-white/10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
                            <Radio size={240} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h2 className="text-2xl font-black text-slate-700 dark:text-slate-200">欢迎使用广播助手</h2>
                            <p className="text-sm font-semibold text-slate-500 max-w-sm mx-auto leading-relaxed">
                                目前您还没有任何广播频道。请先创建一个频道（虚拟房间），以便学生们通过 6 位房间码加入接收广播。
                            </p>
                            <button
                                onClick={addChannel}
                                className="mt-4 px-8 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-2"
                            >
                                <Plus size={16} />
                                {t('broadcast.sender.addClass')}
                            </button>
                        </div>
                    </GlassCard>
                ) : editingChannel ? (
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

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-40 ml-2">
                                <Plus size={12} /> {t('broadcast.sender.messageContent')}
                            </label>
                            <div className="relative rounded-[2.5rem] p-8 transition-all border-2 bg-slate-50 border-slate-100 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-2xl">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="w-full bg-transparent font-bold outline-none resize-none min-h-[320px] text-3xl leading-relaxed text-slate-800 placeholder:text-slate-300"
                                    placeholder={t('broadcast.sender.inputPlaceholder')}
                                />
                                <div className="absolute bottom-6 right-8 opacity-10 pointer-events-none group-focus-within:opacity-20 transition-opacity">
                                    <History size={64} />
                                </div>
                            </div>
                        </div>

                        {/* ─── 核心控制区 ─── */}
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                            {/* 左侧：播放次数与模式 (一体化高斯模糊容器) */}
                            <div className="flex-1 flex items-center bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 p-1.5 shadow-sm">
                                {/* 次数调节器 */}
                                <div className={`flex items-center gap-1 bg-white/80 dark:bg-zinc-900/50 rounded-xl p-1 transition-all ${isLooping ? 'opacity-40 grayscale pointer-events-none' : 'shadow-sm'}`}>
                                    <button
                                        onClick={() => setRepeatCount(Math.max(1, (parseInt(String(repeatCount)) || 1) - 1))}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all text-slate-500"
                                    >
                                        <ChevronDown size={18} />
                                    </button>
                                    <div className="min-w-[40px] flex flex-col items-center">
                                        <span className="text-lg font-black text-blue-600 tabular-nums">
                                            {isLooping ? '∞' : repeatCount}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter -mt-1 opacity-60">
                                            {t('broadcast.sender.repeatCount')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setRepeatCount(Math.min(99, (parseInt(String(repeatCount)) || 1) + 1))}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all text-slate-500"
                                    >
                                        <ChevronUp size={18} />
                                    </button>
                                </div>

                                {/* 分隔线 */}
                                <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-3 opacity-50" />

                                <button
                                    onClick={() => setIsLooping(!isLooping)}
                                    className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl transition-all duration-300 px-2 ${isLooping
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                >
                                    <Repeat
                                        size={18}
                                        className={`shrink-0 ${isLooping ? 'animate-spin' : ''}`}
                                        style={isLooping ? { animationDuration: '3s' } : {}}
                                    />
                                    <span className={`text-xs font-black uppercase tracking-widest whitespace-nowrap ${isLooping ? 'opacity-100' : 'opacity-60'}`}>
                                        {isLooping ? t('broadcast.sender.looping') : t('broadcast.sender.once')}
                                    </span>
                                </button>
                            </div>

                            {/* 右侧：紧急开关 + 发送按钮 */}
                            <div className="flex gap-3 items-stretch">
                                {/* 紧急开关按钮 */}
                                <button
                                    onClick={() => setIsEmergency(!isEmergency)}
                                    className={`relative group px-3 sm:px-5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-500 border-2 shrink-0 ${isEmergency
                                        ? 'bg-red-500 border-red-400 text-white shadow-xl shadow-red-500/25 scale-105 z-10'
                                        : 'bg-white/50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-400 hover:border-red-200 dark:hover:border-red-900/30'}`}
                                >
                                    <AlertTriangle size={18} className={isEmergency ? 'animate-bounce' : 'group-hover:text-red-400'} />
                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 whitespace-nowrap">
                                        {t('broadcast.sender.emergency')}
                                    </span>
                                    {isEmergency && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />}
                                </button>

                                {/* 发起播报大按钮 */}
                                <button
                                    onClick={handleSend}
                                    disabled={status.type === 'loading'}
                                    className="min-w-[140px] sm:min-w-[180px] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 overflow-hidden group"
                                >
                                    {status.type === 'loading' ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <Send size={18} className="group-hover:translate-x-12 group-hover:-translate-y-12 transition-all duration-500 ease-in-out" />
                                                <Send size={18} className="absolute inset-0 -translate-x-12 translate-y-12 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 ease-in-out opacity-0 group-hover:opacity-100" />
                                            </div>
                                            <span>{t('broadcast.sender.initBroadcast')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
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
                        {(() => {
                            const filteredHistory = history.filter(msg => msg.channelName === activeChannel?.name);
                            if (filteredHistory.length === 0) {
                                return (
                                    <div className="py-20 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                        <History size={48} className="opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50">{t('broadcast.sender.noHistory')}</p>
                                    </div>
                                );
                            }
                            return filteredHistory.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => handleReplay(msg.text, msg.isEmergency, msg.voice, msg.repeatCount, msg.channelName)}
                                    className={`w-full group p-6 rounded-[2rem] border transition-all hover:scale-[1.01] text-left flex items-start gap-4 ${msg.isEmergency
                                        ? 'bg-red-50/50 border-red-100 hover:border-red-200'
                                        : 'bg-white/50 border-slate-100 hover:border-blue-200 hover:bg-white'}`}
                                >
                                    <button
                                        onClick={() => setShowFishAudioDebug(true)}
                                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition hover:scale-105 active:scale-95 backdrop-blur-2xl ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/40' : 'bg-white/60 border-white shadow-sm hover:bg-white text-slate-400'}`}
                                        title="Fish Audio 调试"
                                    >
                                        <Bug size={18} />
                                    </button>
                                    <button
                                        onClick={onExitToSelection}
                                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition hover:scale-105 active:scale-95 backdrop-blur-2xl ${isDark ? 'bg-white/5 border-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-white/60 border-white text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-500'}`}
                                    >
                                        <X size={16} />
                                    </button>
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
                            ));
                        })()}
                    </div>
                </div>

                {/* Schedule Manager Section */}
                {channels.length > 0 && (
                    <ScheduleManager
                        license={license}
                        activeChannelCode={channelCode}
                        isDark={isDark}
                    />
                )}

            </div>

            {/* Status Toast - Moved outside scaled container to fix fixed positioning */}
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

            {/* Replay Quick-Editor Dialog - Moved outside scaled container to fix fixed positioning */}
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
                            <div className="flex flex-col items-center justify-between bg-slate-100 dark:bg-white/5 rounded-2xl p-1 border border-slate-200 dark:border-white/10 shrink-0">
                                <button
                                    onClick={() => setReplayData({ ...replayData, repeatCount: Math.min(99, replayData.repeatCount + 1) })}
                                    className="w-10 h-8 rounded-t-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-500 shadow-sm hover:text-indigo-600 transition-colors"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <div className="w-10 flex-[1] flex flex-col justify-center items-center py-1">
                                    <span className="font-bold text-sm leading-none text-slate-800 dark:text-white">
                                        {replayData.repeatCount === -1 ? '∞' : replayData.repeatCount}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setReplayData({ ...replayData, repeatCount: Math.max(1, replayData.repeatCount - 1) })}
                                    className="w-10 h-8 rounded-b-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-500 shadow-sm hover:text-indigo-600 transition-colors"
                                >
                                    <ChevronDown size={16} />
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
        </>
    );
};

export default Sender;

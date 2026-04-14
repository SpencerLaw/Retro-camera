import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
        console.warn('onOpenDialog prop is missing, falling back to instant confirm for development');
        onConfirm(); 
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

    useEffect(() => {
        setIsLoadingCloud(false);
    }, []);

    // Save to local whenever channels change
    useEffect(() => {
        localStorage.setItem('br_channels', JSON.stringify(channels));
    }, [channels]);

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

        const currentChannel = channels.find(c => c.id === editingChannel);
        if (!currentChannel) return;

        const performSave = async () => {
            if (currentChannel.code !== newCode) {
                // Deactivate old code to prevent leaks
                try {
                    await fetch('/api/broadcast/deactivate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: currentChannel.code, license })
                    });
                } catch (err) {
                    console.error('Failed to deactivate old code:', err);
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

        // Unique check if code changed
        if (currentChannel.code !== newCode) {
            try {
                const checkResp = await fetch(`/api/broadcast/check-code?code=${newCode}&license=${encodeURIComponent(license || '')}`);
                if (!checkResp.ok) throw new Error('Network error');
                const { inUse } = await checkResp.json();
                if (inUse) {
                    openDialog(
                        t('broadcast.sender.editChannel') || '修改频道',
                        '该教室码已经被其他教室占用，请确认是否继续使用？',
                        'confirm',
                        performSave
                    );
                    return;
                }
            } catch (err) {
                console.error('Check code failed:', err);
                setStatus({ type: 'error', msg: '验证房间号失败，请检查网络' });
                return;
            }
        }

        await performSave();
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
            <div className="space-y-3 md:space-y-8 max-w-2xl mx-auto px-3 md:px-4 pb-16 md:pb-20 origin-top transition-transform">
                {/* Channel Management Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-30">{t('broadcast.sender.manageClasses')}</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={addChannel}
                                className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition active:scale-90"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-1">
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannelId(channel.id)}
                                className={`w-full px-6 py-5 rounded-[2rem] border transition-all duration-500 flex items-center justify-between gap-3 relative group ${activeChannelId === channel.id
                                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600 border-white/20 text-white shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] scale-[1.02] z-10'
                                    : 'bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/5 text-slate-400 hover:bg-white/60 dark:hover:bg-white/10 shadow-sm'
                                    }`}
                            >
                                <div className="text-left flex-1 min-w-0">
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 ${activeChannelId === channel.id ? 'opacity-70 text-white' : 'opacity-40'}`}>{t('broadcast.sender.room')} {channel.code}</p>
                                    <p className={`text-sm font-bold truncate ${activeChannelId === channel.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{channel.name}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 ${activeChannelId === channel.id ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-x-1 md:group-hover:translate-x-0'}`}>
                                    <div
                                        onClick={(e) => startEditing(channel, e)}
                                        className={`p-2 rounded-xl transition-colors ${activeChannelId === channel.id ? 'hover:bg-white/20' : 'md:hover:bg-blue-500/10 text-blue-500'}`}
                                    >
                                        <Edit2 size={15} />
                                    </div>
                                    {channels.length > 1 && (
                                        <div
                                            onClick={(e) => deleteChannel(channel.id, e)}
                                            className={`p-2 rounded-xl transition-colors ${activeChannelId === channel.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-500/10 text-red-500/60 hover:text-red-500'}`}
                                        >
                                            <Trash2 size={15} />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Channel Details / Editor / Empty State */}
                {channels.length === 0 ? (
                    <GlassCard className="p-6 md:p-12 space-y-4 md:space-y-6 text-center shadow-2xl overflow-hidden relative group border-2 border-dashed border-slate-200 dark:border-white/10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] dark:opacity-[0.05] pointer-events-none hidden md:block">
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
                ) : (
                    <GlassCard className="p-4 sm:p-6 md:p-10 space-y-4 md:space-y-8 shadow-2xl relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity -rotate-12 translate-x-4 -translate-y-4 hidden md:block">
                            <Radio size={120} />
                        </div>

                        <div className="space-y-3 md:space-y-4">
                            <label className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400/80 ml-1 md:ml-2">
                                <Plus size={12} className="text-blue-500" /> {t('broadcast.sender.messageContent')}
                            </label>
                            <div className="relative rounded-2xl md:rounded-[3rem] p-4 md:p-10 transition-all border border-white/40 bg-white/30 dark:bg-black/20 focus-within:bg-white/50 focus-within:border-blue-400/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] focus-within:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.1)] group">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="w-full bg-transparent font-bold outline-none resize-none min-h-[120px] md:min-h-[350px] text-xl md:text-3xl leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                    placeholder={t('broadcast.sender.inputPlaceholder')}
                                />
                                <div className="absolute bottom-4 right-4 md:bottom-8 md:right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-focus-within:opacity-10 transition-opacity">
                                    <History size={80} className="scale-75 md:scale-100 origin-bottom-right" />
                                </div>
                            </div>
                        </div>

                        {/* ─── 控制区：第一行（次数 + 模式 + 紧急）─── */}
                        <div className="flex items-stretch gap-2">
                            {/* 次数调节器 - 横排紧凑版 */}
                            <div className={`flex-1 flex items-center justify-center gap-0 bg-white/50 dark:bg-black/20 backdrop-blur rounded-xl border border-white/40 dark:border-white/10 transition-all overflow-hidden ${isLooping ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                <button
                                    onClick={() => setRepeatCount(Math.max(1, (parseInt(String(repeatCount)) || 1) - 1))}
                                    className="h-full px-2.5 flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/10 active:scale-90 transition-all text-slate-400 hover:text-blue-500"
                                >
                                    <ChevronDown size={14} />
                                </button>
                                <span className="text-sm font-black text-blue-500 tabular-nums w-6 text-center leading-none">
                                    {isLooping ? '∞' : repeatCount}
                                </span>
                                <button
                                    onClick={() => setRepeatCount(Math.min(99, (parseInt(String(repeatCount)) || 1) + 1))}
                                    className="h-full px-2.5 flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/10 active:scale-90 transition-all text-slate-400 hover:text-blue-500"
                                >
                                    <ChevronUp size={14} />
                                </button>
                            </div>

                            {/* 单次/循环切换 */}
                            <button
                                onClick={() => setIsLooping(!isLooping)}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border transition-all duration-300 px-2 py-2.5 ${isLooping
                                    ? 'bg-blue-500 text-white shadow-[0_8px_20px_-4px_rgba(59,130,246,0.4)] border-transparent'
                                    : 'bg-white/30 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border-white/40 dark:border-white/10'}`}
                            >
                                <Repeat size={13} className={`shrink-0 ${isLooping ? 'animate-spin' : ''}`} style={isLooping ? { animationDuration: '4s' } : {}} />
                                <span className="text-[10px] font-black whitespace-nowrap">
                                    {isLooping ? '循环' : '单次'}
                                </span>
                            </button>

                            {/* 紧急播报切换 */}
                            <button
                                onClick={() => setIsEmergency(!isEmergency)}
                                className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border transition-all duration-300 ${isEmergency
                                    ? 'bg-red-500 text-white shadow-[0_8px_20px_-4px_rgba(239,68,68,0.4)] border-transparent'
                                    : 'bg-white/30 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border-white/40 dark:border-white/10 hover:border-red-400/50 hover:text-red-500'}`}
                            >
                                <AlertTriangle size={13} className={isEmergency ? 'animate-bounce' : ''} />
                                <span className="text-[10px] font-black whitespace-nowrap">紧急</span>
                                {isEmergency && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-40" />}
                            </button>
                        </div>

                        {/* ─── 控制区：第二行（发起播报，全宽）─── */}
                        <button
                            onClick={handleSend}
                            disabled={status.type === 'loading'}
                            className="w-full py-4 md:py-5 rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm md:text-xs uppercase tracking-[0.25em] shadow-[0_15px_35px_-8px_rgba(59,130,246,0.45)] hover:shadow-[0_25px_50px_-10px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden group disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {status.type === 'loading' ? (
                                <Loader2 className="animate-spin" size={22} />
                            ) : (
                                <>
                                    <div className="relative">
                                        <Send size={18} className="group-hover:translate-x-12 group-hover:-translate-y-12 transition-all duration-500" />
                                        <Send size={18} className="absolute inset-0 -translate-x-12 translate-y-12 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 opacity-0 group-hover:opacity-100" />
                                    </div>
                                    <span>{t('broadcast.sender.initBroadcast')}</span>
                                </>
                            )}
                        </button>
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
                    <div className="grid grid-cols-1 gap-4">
                        {(() => {
                            const filteredHistory = history.filter(msg => msg.channelName === activeChannel?.name);
                            if (filteredHistory.length === 0) {
                                return (
                                    <div className="py-24 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                        <History size={60} className="opacity-[0.05]" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{t('broadcast.sender.noHistory')}</p>
                                    </div>
                                );
                            }
                            return filteredHistory.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => handleReplay(msg.text, msg.isEmergency, msg.voice, msg.repeatCount, msg.channelName)}
                                    className={`w-full group p-5 sm:p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.01] text-left flex items-start gap-4 md:gap-6 relative overflow-hidden ${msg.isEmergency
                                        ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                        : 'bg-white/40 dark:bg-white/[0.03] border-white/40 dark:border-white/10 hover:border-blue-400/50 hover:bg-white/60 shadow-sm'}`}
                                >
                                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-700 group-hover:scale-110 ${msg.isEmergency ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100/50 dark:bg-white/5 text-slate-400 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/20'}`}>
                                        {msg.isEmergency ? <AlertTriangle size={20} className="md:w-6 md:h-6" /> : <History size={20} className="md:w-6 md:h-6" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{msg.timestamp}</span>
                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/60">{msg.channelName}</span>
                                            </div>
                                            {msg.repeatCount && msg.repeatCount !== 1 && (
                                                <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 text-slate-500">
                                                    {msg.repeatCount === -1 ? '∞' : `x${msg.repeatCount}`}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-lg font-bold line-clamp-2 leading-relaxed transition-colors ${msg.isEmergency ? 'text-red-600' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                            {msg.text}
                                        </p>
                                    </div>
                                    <div className="self-center p-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <ChevronRight className="text-blue-500" size={24} />
                                    </div>
                                    {/* Subtle background glow for emergency messages */}
                                    {msg.isEmergency && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />}
                                </button>
                            ));
                        })()}
                    </div>
                </div>

                {/* Schedule Manager Section - temporarily hidden */}
                {/* {channels.length > 0 && (
                    <ScheduleManager
                        license={license}
                        activeChannelCode={channelCode}
                        isDark={isDark}
                    />
                )} */}

            </div>

            {/* Status Toast - Moved outside scaled container to fix fixed positioning */}
            {status.msg && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className={`px-10 py-5 rounded-[2rem] shadow-[0_30px_70px_-10px_rgba(0,0,0,0.3)] flex items-center gap-4 backdrop-blur-[32px] border border-white/40 ${status.type === 'success' ? 'bg-emerald-500/80 border-emerald-400/50 text-white' :
                        status.type === 'error' ? 'bg-rose-500/80 border-rose-400/50 text-white' :
                            'bg-blue-600/80 border-blue-500/50 text-white'
                        }`}>
                        {status.type === 'loading' && <Loader2 className="animate-spin" size={20} />}
                        {status.type === 'success' && <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center"><CheckCircle2 size={18} /></div>}
                        {status.type === 'error' && <div className="w-6 h-6 rounded-full bg-rose-400/20 flex items-center justify-center"><AlertCircle size={18} /></div>}
                        <span className="text-[11px] font-black uppercase tracking-[0.25em]">{status.msg}</span>
                    </div>
                </div>
            )}

            {/* Edit Channel Quick-Editor Dialog */}
            {editingChannel && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all" style={{ position: 'fixed' }}>
                    <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-xl" onClick={() => setEditingChannel(null)} />
                    <div className="relative w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 p-6 sm:p-8 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                        
                        <div className="flex justify-between items-center mb-8 shrink-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                                    <Edit2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">编辑班级</h2>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingChannel(null)}
                                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('broadcast.sender.className')}</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 dark:text-white border-slate-100 dark:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-blue-400 outline-none font-bold transition-all"
                                    placeholder={t('broadcast.sender.unknownClass')}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('broadcast.sender.roomCode')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editCode}
                                        onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                        className="flex-1 p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 dark:text-white border-slate-100 dark:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-blue-400 outline-none font-mono font-black transition-all"
                                        maxLength={8}
                                    />
                                    <button
                                        onClick={generateRandomChannel}
                                        className="px-5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shrink-0"
                                    >
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setEditingChannel(null)}
                                className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                                {t('broadcast.sender.cancel')}
                            </button>
                            <button
                                onClick={saveEdit}
                                className="flex-[1.5] py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {t('broadcast.sender.save')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Replay Quick-Editor Dialog - Moved outside scaled container... */}
            {showReplayDialog && replayData && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-all" style={{ position: 'fixed' }}>
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
                </div>,
                document.body
            )}
        </>
    );
};

export default Sender;

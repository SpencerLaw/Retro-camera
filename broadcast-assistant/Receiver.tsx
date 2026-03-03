import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, AlertCircle, Tv, Signal, Wifi, WifiOff, X, Copy, Info, Sun, Moon, ArrowLeft, RefreshCw, History, Clock, Settings, Radio, Zap } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { ttsManager } from './utils/ttsManager';
import CustomDialog, { DialogType } from './components/CustomDialog';
import GlassCard from './components/GlassCard';

interface Message {
    id: string;
    text: string;
    isEmergency: boolean;
    timestamp: string;
    repeatCount?: number;
    channelName?: string;
    voice?: string;
}

const ClockDisplay = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <span>{time.toLocaleTimeString()}</span>;
};

const BackgroundAmbience = React.memo(({ isDark, isEmergency }: { isDark: boolean; isEmergency: boolean }) => {
    if (isEmergency) return <div className={`absolute inset-0 z-0 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`} />;
    return (
        <div
            className="absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none overflow-hidden"
            style={{
                background: isDark
                    ? 'radial-gradient(circle at 70% 20%, rgba(30, 58, 138, 0.05), transparent 50%), radial-gradient(circle at 20% 80%, rgba(88, 28, 135, 0.05), transparent 50%)'
                    : 'radial-gradient(circle at 70% 20%, rgba(219, 39, 119, 0.1), transparent 50%), radial-gradient(circle at 20% 80%, rgba(147, 51, 234, 0.08), transparent 50%)'
            }}
        />
    );
});
BackgroundAmbience.displayName = 'BackgroundAmbience';

const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: { sentence: string, isActive: boolean, isPast: boolean, isEmergency: boolean, textLength: number, activeSentenceRef: React.RefObject<HTMLDivElement> }) => {
    return (
        <div
            ref={isActive ? activeSentenceRef : null}
            className={`relative block py-4 md:py-6 w-full break-words select-none text-center transform-gpu transition duration-500 ${isActive ? (isEmergency ? 'text-white font-black scale-105' : 'text-blue-500 dark:text-cyan-400 font-black scale-105') : isPast ? 'opacity-30' : 'opacity-10'} ${textLength > 300 ? 'text-lg md:text-2xl' : textLength > 100 ? 'text-xl md:text-4xl' : 'text-3xl md:text-7xl'}`}
        >
            {sentence}
        </div>
    );
});
SentenceItem.displayName = 'SentenceItem';

const Receiver: React.FC<{ isDark: boolean; toggleTheme: () => void; onExit: () => void }> = ({ isDark, toggleTheme, onExit }) => {
    const t = useTranslations();

    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room')?.toUpperCase().trim() || '';
    const urlAutoStart = urlParams.get('autostart') === '1';

    const [fullRoomId, setFullRoomId] = useState(() => {
        return urlRoom || localStorage.getItem('br_receiver_room') || '';
    });
    const [isJoined, setIsJoined] = useState(false);
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [syncedChannelName, setSyncedChannelName] = useState<string>(() => {
        const saved = localStorage.getItem(`br_synced_name_${localStorage.getItem('br_receiver_room') || ''}`);
        return saved || '';
    });
    const [volumeBoost, setVolumeBoost] = useState(() => parseFloat(localStorage.getItem('br_volume_boost') || '1.5'));

    useEffect(() => {
        localStorage.setItem('br_volume_boost', volumeBoost.toString());
    }, [volumeBoost]);

    const [isListening, setIsListening] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showSettings, setShowSettings] = useState(false);

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

    const [isPlaying, setIsPlaying] = useState(false);

    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);

    const prefetchedBlobs = useRef<Record<string, string>>({});
    const playbackIdRef = useRef(0);
    const lastPlayedId = useRef<string | null>(null);
    const pollingTimer = useRef<NodeJS.Timeout | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeSentenceRef = useRef<HTMLSpanElement>(null);
    const rescueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isUserScrollingRef = useRef(false);

    useEffect(() => {
        const savedHistory = localStorage.getItem('br_receiver_history');
        if (savedHistory) {
            try { setReceivedHistory(JSON.parse(savedHistory)); } catch (e) { setReceivedHistory([]); }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('br_receiver_history', JSON.stringify(receivedHistory.slice(-30)));
    }, [receivedHistory]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (isJoined && fullRoomId) {
            const savedName = localStorage.getItem(`br_synced_name_${fullRoomId.trim().toUpperCase()}`);
            if (savedName) setSyncedChannelName(savedName);

            const savedLastId = localStorage.getItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`);
            if (savedLastId) lastPlayedId.current = savedLastId;
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fullRoomId, isJoined]);

    const pendingPlayouts = useRef<number>(0);
    useEffect(() => {
        if (urlAutoStart && fullRoomId && !isJoined) {
            localStorage.setItem('br_receiver_room', fullRoomId);
            const timer = setTimeout(() => setIsJoined(true), 500);
            return () => clearTimeout(timer);
        }
    }, [fullRoomId, isJoined, urlAutoStart]);

    const sentences = React.useMemo(() => {
        if (!currentMsg?.text) return [];
        const parts = currentMsg.text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g);
        return parts ? parts : [currentMsg.text];
    }, [currentMsg?.text]);

    const scrollToActive = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (activeSentenceRef.current && !isUserScrollingRef.current) {
            activeSentenceRef.current.scrollIntoView({ behavior, block: 'center' });
        }
    }, []);

    useEffect(() => {
        scrollToActive('smooth');
    }, [activeSentenceIndex, scrollToActive]);

    useEffect(() => {
        if (currentMsg?.id) {
            const timer = setTimeout(() => scrollToActive('auto'), 50);
            return () => clearTimeout(timer);
        }
    }, [currentMsg?.id, scrollToActive]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            if (!isPlaying) return;
            isUserScrollingRef.current = true;
            if (rescueTimeoutRef.current) clearTimeout(rescueTimeoutRef.current);
            rescueTimeoutRef.current = setTimeout(() => {
                isUserScrollingRef.current = false;
                scrollToActive();
            }, 1000);
        };
        container.addEventListener('wheel', handleScroll, { passive: true });
        container.addEventListener('touchmove', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('wheel', handleScroll);
            container.removeEventListener('touchmove', handleScroll);
            if (rescueTimeoutRef.current) clearTimeout(rescueTimeoutRef.current);
        };
    }, [isPlaying, scrollToActive]);

    const speak = useCallback(async (text: string, isEmergency: boolean, repeatCount: number = 1, id: string, voiceOverride?: string) => {
        lastPlayedId.current = id;
        if (fullRoomId) {
            localStorage.setItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`, id);
        }

        const currentPlaybackId = ++playbackIdRef.current;
        pendingPlayouts.current = repeatCount === -1 ? 999 : repeatCount;
        setIsPlaying(true);
        ttsManager.clearPool();
        prefetchedBlobs.current = {};

        const playMessageCycles = async () => {
            while (pendingPlayouts.current > 0 || pendingPlayouts.current === 999) {
                if (playbackIdRef.current !== currentPlaybackId) break;
                const currentSentences = text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [text];

                if (playbackIdRef.current !== currentPlaybackId) {
                    ttsManager.stop();
                    break;
                }

                for (let i = 0; i < currentSentences.length; i++) {
                    if (playbackIdRef.current !== currentPlaybackId) break;

                    setActiveSentenceIndex(i);
                    const sentence = currentSentences[i];
                    const nextSentence = currentSentences[i + 1];
                    const targetVoice = voiceOverride || 'native';

                    const ttsOptions = {
                        engine: 'edge' as const,
                        voice: targetVoice,
                        rate: isEmergency ? 0.85 : 1.0,
                        volume: volumeBoost,
                    };

                    // Handle Prefetching
                    if (nextSentence && !prefetchedBlobs.current[nextSentence]) {
                        ttsManager.prefetch(nextSentence, ttsOptions).then(url => {
                            if (url && playbackIdRef.current === currentPlaybackId) {
                                prefetchedBlobs.current[nextSentence] = url;
                            }
                        });
                    }

                    let url = prefetchedBlobs.current[sentence];

                    if (url && playbackIdRef.current === currentPlaybackId) {
                        await new Promise<void>((resolve) => {
                            let settled = false;
                            const settle = () => {
                                if (settled) return;
                                settled = true;
                                clearInterval(monitor);
                                // CRITICAL: Revoke after use and prevent reuse of stale blob
                                delete prefetchedBlobs.current[sentence];
                                resolve();
                            };
                            const monitor = setInterval(() => {
                                if (playbackIdRef.current !== currentPlaybackId) {
                                    ttsManager.stop();
                                    settle();
                                }
                            }, 200);
                            ttsManager.playBlob(url as string, sentence, {
                                ...ttsOptions,
                                onEnd: settle
                            }).catch(() => settle());
                        });
                    } else if (playbackIdRef.current === currentPlaybackId) {
                        await ttsManager.speak(sentence, ttsOptions);
                    }
                }

                if (pendingPlayouts.current !== 999) pendingPlayouts.current--;
                if (pendingPlayouts.current > 0 || pendingPlayouts.current === 999) {
                    if (playbackIdRef.current !== currentPlaybackId) break;
                    setActiveSentenceIndex(-1);
                    await new Promise(r => setTimeout(r, 3000));
                }
            }

            if (playbackIdRef.current === currentPlaybackId) {
                setIsPlaying(false);
                setActiveSentenceIndex(-1);
            }
        };

        playMessageCycles();
    }, [fullRoomId, volumeBoost]);

    const fetchMessage = useCallback(async () => {
        if (!fullRoomId.trim()) return;
        try {
            const resp = await fetch(`/api/broadcast/fetch?code=${fullRoomId.trim().toUpperCase()}`);
            if (resp.status === 404) {
                setError(t('broadcast.receiver.invalidRoom'));
                setCurrentMsg(null);
                setIsJoined(false);
                return;
            }
            const data = await resp.json();
            if (data.message) {
                const msg = data.message as Message;
                if (msg.channelName) {
                    setSyncedChannelName(msg.channelName);
                    localStorage.setItem(`br_synced_name_${fullRoomId}`, msg.channelName);
                }
                if (!msg.text) {
                    lastPlayedId.current = msg.id;
                    localStorage.setItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`, msg.id);
                    return;
                }
                if (msg.id !== lastPlayedId.current) {
                    setReceivedHistory(prev => {
                        const exists = prev.some(h => h.id === msg.id);
                        if (exists) return prev;
                        return [...prev, msg].slice(-30);
                    });
                }
                setCurrentMsg(msg);
                if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && msg.id !== lastPlayedId.current) {
                    new Notification(msg.isEmergency ? t('broadcast.receiver.notification.emergency') : t('broadcast.receiver.notification.normal'), {
                        body: msg.text,
                        icon: '/favicon.ico'
                    });
                }
                if (isListening && msg.id !== lastPlayedId.current) {
                    speak(msg.text, msg.isEmergency, msg.repeatCount || 1, msg.id, msg.voice);
                }
            } else if (!isPlaying && pendingPlayouts.current <= 0) {
                setCurrentMsg(null);
            }
            setError(null);
        } catch (err) {
            console.error('Polling error:', err);
        }
    }, [fullRoomId, isListening, speak, t, isPlaying]);

    useEffect(() => {
        let isActive = true;
        const poll = async () => {
            if (!isJoined || !isActive) return;
            await fetchMessage();
            if (isActive) pollingTimer.current = setTimeout(poll, 3000);
        };
        if (isJoined) poll();
        return () => {
            isActive = false;
            if (pollingTimer.current) clearTimeout(pollingTimer.current);
            ttsManager.stop();
            ttsManager.stopSilentLoop();
        };
    }, [isJoined, fetchMessage]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    useEffect(() => {
        if (!isListening) {
            playbackIdRef.current++;
            ttsManager.stop();
            ttsManager.clearPool();
            pendingPlayouts.current = 0;
            setIsPlaying(false);
            setActiveSentenceIndex(-1);
        }
    }, [isListening]);

    const handleStart = async () => {
        if (!fullRoomId.trim()) {
            setError(t('broadcast.receiver.missingChannel'));
            return;
        }
        setError('');
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        try {
            const response = await fetch(`/api/broadcast/fetch?code=${encodeURIComponent(fullRoomId.trim())}`);
            if (!response.ok) {
                if (response.status === 404) setError(t('broadcast.receiver.channelNotFound'));
                else setError(t('broadcast.receiver.verificationFailed'));
                return;
            }
            setIsJoined(true);
            ttsManager.startSilentLoop();
            const joinChime = new Audio('data:audio/wav;base64,UklGRjAAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
            joinChime.volume = 0.5;
            joinChime.play().catch(() => { });
            localStorage.setItem('br_receiver_room', fullRoomId.trim().toUpperCase());
            setIsListening(true);
        } catch (err) {
            setError(t('broadcast.receiver.networkError'));
        }
    };

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                    <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDark ? 'bg-purple-600' : 'bg-pink-400'}`}></div>
                </div>
                <GlassCard className="max-w-2xl w-full p-10 rounded-[2.5rem] relative z-50 animate-in zoom-in duration-500">
                    <button onClick={onExit} className="absolute top-8 left-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition active:scale-95 cursor-pointer z-50">
                        <ArrowLeft size={24} />
                    </button>
                    <button onClick={toggleTheme} className="absolute top-8 right-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-orange-500 transition active:scale-95">
                        {isDark ? <Sun size={24} /> : <Moon size={24} />}
                    </button>
                    <div className="flex flex-col items-center text-center space-y-8 mt-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                            <Tv size={36} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">{t('broadcast.receiver.joinChannel')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('broadcast.receiver.joinDesc')}</p>
                        </div>
                        {urlAutoStart && fullRoomId && (
                            <button onClick={handleStart} className="w-full py-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-3xl font-black text-2xl hover:scale-[1.02] active:scale-95 transition shadow-2xl shadow-purple-500/30 flex flex-col items-center justify-center gap-2 animate-pulse" style={{ animationDuration: '2s' }}>
                                <Radio size={32} />
                                <span>一键进入教室</span>
                                <span className="text-lg opacity-80 tracking-widest font-mono">{fullRoomId}</span>
                            </button>
                        )}
                        <div className="w-full space-y-4">
                            <div className="relative">
                                <input type="text" value={fullRoomId} onChange={(e) => setFullRoomId(e.target.value.toUpperCase())} placeholder={t('broadcast.receiver.channelPlaceholder')} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 text-2xl font-black text-center outline-none focus:ring-4 focus:ring-blue-500/20 transition placeholder:opacity-20 dark:text-white uppercase tracking-widest" maxLength={8} />
                                <button onClick={handleStart} className="w-full mt-4 py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xl hover:scale-[1.02] active:scale-95 transition shadow-xl shadow-black/10 flex items-center justify-center gap-3 group">
                                    <Radio size={24} className="group-hover:animate-pulse" />
                                    {localStorage.getItem('br_receiver_room') === fullRoomId ? (t('broadcast.sender.on') || '继续进入') : t('broadcast.receiver.initializeLive')}
                                </button>
                            </div>
                            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center justify-center gap-2"><AlertCircle size={14} />{error}</div>}
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-1000 ${currentMsg?.isEmergency ? 'bg-red-600 text-white' : (isDark ? 'bg-[#050505] text-white' : 'bg-[#F5F5F7] text-black')}`}>
            <BackgroundAmbience isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
            <div className="p-8 flex justify-between items-center bg-transparent relative z-50 pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-[8px]">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">
                            {(() => {
                                const hour = new Date().getHours();
                                let greeting = t('broadcast.receiver.greeting.hello');
                                if (hour >= 5 && hour < 12) greeting = t('broadcast.receiver.greeting.morning');
                                else if (hour >= 12 && hour < 18) greeting = t('broadcast.receiver.greeting.afternoon');
                                else if (hour >= 18 || hour < 5) greeting = t('broadcast.receiver.greeting.evening');
                                const name = syncedChannelName || currentMsg?.channelName || fullRoomId || (isOnline ? t('broadcast.receiver.online') : t('broadcast.receiver.signalLost'));
                                return `${greeting}，${name}`;
                            })()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-[8px] font-mono text-sm font-black tabular-nums min-w-[120px] justify-center pointer-events-auto">
                        <Clock size={16} className="opacity-40" />
                        <ClockDisplay />
                    </div>
                    <button onClick={() => setIsListening(!isListening)} className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition bg-white/5 backdrop-blur-[8px] hover:scale-110 active:scale-95 cursor-pointer ${isListening ? 'text-green-500 scale-110 shadow-lg shadow-green-500/20' : 'text-gray-400'}`}>
                        {isListening ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>

                </div>
                <div className="flex gap-4 pointer-events-auto">
                    <button onClick={toggleTheme} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-95 transition bg-white/20 text-orange-500 cursor-pointer">
                        {isDark ? <Sun size={24} /> : <Moon size={24} />}
                    </button>
                    <button onClick={toggleFullscreen} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-95 transition bg-white/20 cursor-pointer text-gray-400">
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                    <button onClick={() => { setIsJoined(false); setIsListening(false); localStorage.removeItem('br_receiver_room'); }} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-500/80 hover:scale-110 active:scale-95 hover:text-white transition bg-white/20 cursor-pointer text-gray-400">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className={`flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-10 text-center relative z-10 w-full h-full ${isFullscreen ? '' : 'origin-top scale-[0.98] sm:scale-100'} transition-transform`}>
                {currentMsg ? (
                    <div ref={scrollContainerRef} className="w-full h-full flex flex-col items-center animate-in fade-in duration-1000 px-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {currentMsg.isEmergency && (
                            <div className="flex flex-col items-center gap-4 md:gap-6 animate-pulse shrink-0">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
                                    <AlertCircle size={48} className="text-white md:w-16 md:h-16" />
                                </div>
                                <div className="text-2xl md:text-5xl font-black tracking-[0.3em] md:tracking-[0.5em] uppercase text-white drop-shadow-lg">{t('broadcast.receiver.criticalBroadcast')}</div>
                            </div>
                        )}
                        <div className="flex flex-col items-center w-full max-w-5xl mx-auto my-auto py-20 pb-[220px] md:pb-[280px]">
                            {sentences.map((sentence, sIdx) => (
                                <SentenceItem
                                    key={sIdx}
                                    sentence={sentence}
                                    isActive={sIdx === activeSentenceIndex}
                                    isPast={activeSentenceIndex === -1 ? false : sIdx < activeSentenceIndex}
                                    isEmergency={!!currentMsg.isEmergency}
                                    textLength={currentMsg.text.length}
                                    activeSentenceRef={activeSentenceRef}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-6 md:space-y-8 animate-in fade-in duration-1000 relative z-0 flex flex-col items-center justify-center h-full pb-[220px] md:pb-[280px]">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-gray-400/20 animate-[spin_20s_linear_infinite]"></div>
                            <div className="m-8 w-24 h-24 md:w-32 md:h-32 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-xl shadow-inner">
                                <Signal size={48} className="opacity-30 animate-pulse text-indigo-500" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-2xl md:text-5xl font-black tracking-widest uppercase italic opacity-20">{t('broadcast.receiver.downlinkSync') || '下行接收信号中'}</p>
                            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] opacity-40"><Wifi size={14} /> {t('broadcast.receiver.standbySource') || '稳定连接待机'}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 left-0 right-0 z-50 pointer-events-none flex flex-col items-center">
                <div className="w-[98vw] max-w-5xl mb-2 pointer-events-auto">
                    <GlassCard className="p-4 rounded-[2rem] overflow-hidden flex flex-col border border-white/20 shadow-2xl bg-white/90 dark:bg-black/80">
                        <div className="flex items-center justify-between mb-3 shrink-0 px-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2 text-orange-500"><History size={14} /> {t('broadcast.sender.timeline')}</h4>
                            {isPlaying && <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 animate-pulse"><RefreshCw size={12} className="animate-spin" />同步中...</div>}
                            <button onClick={() => { openDialog(t('broadcast.sender.timeline'), '确定清空所有历史记录吗？', 'warning', () => { setReceivedHistory([]); localStorage.removeItem('br_receiver_history'); closeDialog(); }); }} className="text-[10px] font-bold text-red-500 hover:opacity-100 opacity-60 px-3 py-1 rounded-full hover:bg-red-500/10 transition uppercase tracking-widest">清除</button>
                        </div>
                        <div className="flex flex-row gap-3 overflow-x-auto custom-scrollbar pb-1 px-1 snap-x">
                            {receivedHistory.length === 0 ? (
                                <div className="flex items-center justify-center py-4 px-6 opacity-40 italic w-full"><p className="text-[10px] font-bold">暂无历史播报</p></div>
                            ) : (
                                [...receivedHistory].reverse().map((msg) => (
                                    <button key={msg.id} onClick={() => { const performSwitch = () => { setCurrentMsg(msg); speak(msg.text, msg.isEmergency, msg.repeatCount || 1, msg.id, msg.voice); closeDialog(); }; if (!isPlaying) performSwitch(); else openDialog(t('broadcast.sender.history'), '当前正在播放，确定要切换到这条历史记录吗？', 'warning', performSwitch); }} className="flex-none w-56 text-left p-3 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition border border-transparent hover:border-white/30 group active:scale-[0.98] snap-start shadow-sm">
                                        <div className="flex justify-between items-center mb-1.5"><span className="text-[9px] font-bold opacity-50">{new Date(msg.timestamp && !isNaN(parseInt(msg.timestamp)) ? parseInt(msg.timestamp) : Date.now()).toLocaleTimeString()}</span>{msg.isEmergency && <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase scale-75 origin-right">SOS</span>}</div>
                                        <p className="text-[11px] font-bold truncate leading-relaxed text-gray-800 dark:text-gray-200">{msg.text}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
                <div className="pointer-events-auto opacity-20 hover:opacity-100 transition-opacity"><p className="text-[9px] font-black uppercase tracking-[0.4em] italic drop-shadow-md">Broadcast Node Active // Secure Sync</p></div>
            </div>

            <CustomDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                onConfirm={dialog.onConfirm}
                onCancel={closeDialog}
                isDark={isDark}
                isEmergency={!!currentMsg?.isEmergency}
            />
        </div>
    );
};

export default Receiver;

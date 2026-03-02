import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, AlertCircle, Tv, Signal, Wifi, WifiOff, X, Copy, Info, Sun, Moon, ArrowLeft, RefreshCw, History, Clock } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { ttsManager } from './utils/ttsManager';

interface Message {
    id: string;
    text: string;
    isEmergency: boolean;
    timestamp: string;
    repeatCount?: number;
    channelName?: string;
}

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`backdrop-blur-2xl bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ${className}`}>
        {children}
    </div>
);

const Receiver: React.FC<{ isDark: boolean; toggleTheme: () => void; onExit: () => void }> = ({ isDark, toggleTheme, onExit }) => {
    const t = useTranslations();
    const [fullRoomId, setFullRoomId] = useState(localStorage.getItem('br_last_full_room_rx') || '');
    const [isJoined, setIsJoined] = useState(false);
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [syncedChannelName, setSyncedChannelName] = useState<string>(() => {
        const saved = localStorage.getItem(`br_synced_name_${localStorage.getItem('br_last_full_room_rx') || ''}`);
        return saved || '';
    });
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isListening, setIsListening] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showSettings, setShowSettings] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [charIndex, setCharIndex] = useState(0);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);

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

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(timer);
        };
    }, []);

    const pendingPlayouts = useRef<number>(0);

    // Helper to split text into sentences for Karaoke effect
    const sentences = React.useMemo(() => {
        if (!currentMsg?.text) return [];
        // Extract raw sentences while keeping punctuation attached. 
        // We use match to find parts, which is safer than split with capture groups to guarantee 1:1 length mapping.
        const parts = currentMsg.text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g);
        return parts ? parts : [currentMsg.text];
    }, [currentMsg?.text]);

    const activeSentenceIndex = React.useMemo(() => {
        let count = 0;
        for (let i = 0; i < sentences.length; i++) {
            const len = sentences[i].length;
            if (charIndex >= count && charIndex < count + len) return i;
            count += len;
        }
        return -1;
    }, [charIndex, sentences]);

    // Auto-scroll logic: Only trigger if user is NOT manual scrolling
    const scrollToActive = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (activeSentenceRef.current && !isUserScrollingRef.current) {
            activeSentenceRef.current.scrollIntoView({
                behavior,
                block: 'center'
            });
        }
    }, []);

    // Effect 1: Trigger on sentence change (during reading)
    useEffect(() => {
        scrollToActive('smooth');
    }, [activeSentenceIndex, scrollToActive]);

    // Effect 2: Trigger IMMEDIATELY when a new message arrives (fix delayed display)
    useEffect(() => {
        if (currentMsg?.id) {
            // Give a tiny timeout for DOM to render the new message sentences
            const timer = setTimeout(() => scrollToActive('auto'), 50);
            return () => clearTimeout(timer);
        }
    }, [currentMsg?.id, scrollToActive]);

    // Scroll Rescue Logic: Detect manual scroll and return after 1s
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

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (rescueTimeoutRef.current) clearTimeout(rescueTimeoutRef.current);
        };
    }, [isPlaying, scrollToActive]);

    const speak = useCallback((text: string, isEmergency: boolean, repeatCount: number = 1, id: string) => {
        // Update Ref IMMEDIATELY to prevent race condition with polling
        lastPlayedId.current = id;
        if (fullRoomId) {
            localStorage.setItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`, id);
        }

        pendingPlayouts.current = repeatCount === -1 ? 999 : repeatCount;
        setIsPlaying(true);

        const playNext = () => {
            if (pendingPlayouts.current <= 0) {
                setIsPlaying(false);
                return;
            }

            ttsManager.speak(text, {
                engine: 'edge',
                voice: 'zh-CN-YunxiNeural',
                rate: isEmergency ? 0.85 : 1.0,
                onStart: () => {
                    setCharIndex(0);
                },
                onBoundary: (idx) => {
                    setCharIndex(idx);
                },
                onEnd: () => {
                    // Force complete highlight of all characters during the 3-second delay
                    setCharIndex(text.length + 100);

                    if (pendingPlayouts.current > 0 && pendingPlayouts.current !== 999) {
                        pendingPlayouts.current--;
                    }
                    if (pendingPlayouts.current > 0) {
                        // User requested exactly 3 seconds delay between repeats
                        setTimeout(() => playNext(), 3000);
                    } else {
                        setIsPlaying(false);
                        setCharIndex(0);
                    }
                }
            });
        };

        playNext();
    }, [fullRoomId]);

    const fetchMessage = useCallback(async () => {
        if (!fullRoomId.trim()) return;

        try {
            const resp = await fetch(`/api/broadcast/fetch?code=${fullRoomId.trim().toUpperCase()}`);

            if (resp.status === 404) {
                setError('无效的房间号');
                setCurrentMsg(null);
                setIsJoined(false); // Force exit to join screen
                return;
            }

            const data = await resp.json();

            if (data.message) {
                const msg = data.message as Message;

                // Persist the channel name locally
                if (msg.channelName) {
                    setSyncedChannelName(msg.channelName);
                    localStorage.setItem(`br_synced_name_${fullRoomId}`, msg.channelName);
                }

                // If it's a "silent sync" (no text), just update the name and return
                if (!msg.text) {
                    lastPlayedId.current = msg.id;
                    localStorage.setItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`, msg.id);
                    return;
                }

                // Add to history if new
                if (msg.id !== lastPlayedId.current) {
                    setReceivedHistory(prev => {
                        const exists = prev.some(h => h.id === msg.id);
                        if (exists) return prev;
                        return [...prev, msg].slice(-30);
                    });
                }

                setCurrentMsg(msg);

                // Notifications when hidden
                if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && msg.id !== lastPlayedId.current) {
                    new Notification(msg.isEmergency ? '【紧急广播】' : '校园广播提示', {
                        body: msg.text,
                        icon: '/favicon.ico'
                    });
                }

                if (isListening && msg.id !== lastPlayedId.current) {
                    speak(msg.text, msg.isEmergency, msg.repeatCount ?? 1, msg.id);
                }
            } else if (!isPlaying && pendingPlayouts.current <= 0) {
                // Only clear if completely NOT playing, to prevent message disappearing during repeats
                setCurrentMsg(null);
            }
            setError(null);
        } catch (err: any) {
            console.error('Polling error:', err);
        }
    }, [fullRoomId, isListening, speak]);

    useEffect(() => {
        let isActive = true;

        const poll = async () => {
            if (!isJoined || !isActive) return;
            await fetchMessage();
            if (isActive) {
                // Background-friendly: if tab is hidden, we keep polling but can adjust frequency if needed.
                // browsers usually throttle to 1s min in bg, which is fine for our 3s poll.
                pollingTimer.current = setTimeout(poll, 3000);
            }
        };

        if (isJoined) {
            poll();
        }

        return () => {
            isActive = false;
            if (pollingTimer.current) clearTimeout(pollingTimer.current);
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
            ttsManager.stop();
            pendingPlayouts.current = 0;
        }
    }, [isListening]);

    const handleStart = async () => {
        if (!fullRoomId.trim()) {
            setError(t('broadcast.receiver.missingChannel'));
            return;
        }

        // Clear previous error
        setError('');

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Validate room before joining
        try {
            const response = await fetch(`/api/broadcast/fetch?code=${encodeURIComponent(fullRoomId.trim())}`);

            if (!response.ok) {
                // Room is invalid or not active
                if (response.status === 404) {
                    setError(t('broadcast.receiver.channelNotFound'));
                } else {
                    setError('验证失败，请重试');
                }
                return;
            }

            // Success! 
            setIsJoined(true);

            // CRITICAL: Unlock audio context for background playback
            ttsManager.startSilentLoop();

            // Play a short join chime to "bless" the audio context with a user gesture
            const joinChime = new Audio('data:audio/wav;base64,UklGRjAAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
            joinChime.volume = 0.5;
            joinChime.play().catch(() => { });

            // Save room code
            localStorage.setItem('br_receiver_room', fullRoomId.trim().toUpperCase());
            setIsListening(true);
        } catch (err) {
            setError('网络错误，请检查连接');
        }
    };

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`}>
                {/* Background Ambience - Same as License Page */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                    <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDark ? 'bg-purple-600' : 'bg-pink-400'}`}></div>
                </div>

                <GlassCard className="max-w-2xl w-full p-10 rounded-[2.5rem] relative z-50 animate-in zoom-in duration-500">
                    {/* Top Controls inside Card */}
                    <button
                        onClick={onExit}
                        className="absolute top-8 left-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all active:scale-95 cursor-pointer z-50"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="absolute top-8 right-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-orange-500 transition-all active:scale-95"
                    >
                        {isDark ? <Sun size={24} /> : <Moon size={24} />}
                    </button>

                    <div className="flex flex-col items-center text-center space-y-8 mt-4">
                        {/* Icon */}
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                            <Tv size={36} />
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">{t('broadcast.receiver.joinChannel')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('broadcast.receiver.joinDesc')}</p>
                        </div>

                        {/* Input Section */}
                        <div className="w-full space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fullRoomId}
                                    onChange={(e) => {
                                        const start = e.target.selectionStart;
                                        const end = e.target.selectionEnd;
                                        const val = e.target.value.toUpperCase();
                                        setFullRoomId(val);
                                        requestAnimationFrame(() => {
                                            if (e.target) e.target.setSelectionRange(start, end);
                                        });
                                    }}
                                    placeholder={t('broadcast.receiver.channelPlaceholder')}
                                    className="w-full h-14 bg-gray-100 dark:bg-white/5 border-none rounded-2xl px-6 text-center text-lg font-mono font-bold tracking-widest focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition-all uppercase"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center justify-center gap-2">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleStart}
                            className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-lg shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Volume2 size={20} />
                            {t('broadcast.receiver.initializeLive')}
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-all duration-1000 ${currentMsg?.isEmergency
            ? 'bg-red-600 text-white'
            : (isDark ? 'bg-[#050505] text-white' : 'bg-white text-black')
            }`}>
            {/* Background Ambience - iOS 26 Style (Extremely subtle) */}
            {!currentMsg?.isEmergency && (
                <div className="absolute inset-0 z-0 opacity-[0.05] transition-all duration-1000 pointer-events-none">
                    <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[180px] ${isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}></div>
                    <div className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[180px] ${isDark ? 'bg-purple-900/40' : 'bg-purple-100'}`}></div>
                </div>
            )}
            {/* HUD Header for Active Room (kept as overlay) */}
            <div className="p-8 flex justify-between items-center bg-transparent relative z-50 pointer-events-none">
                <div className="flex items-center gap-6 pointer-events-auto">
                    <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">
                            {(() => {
                                const hour = currentTime.getHours();
                                let greeting = "您好";
                                if (hour >= 5 && hour < 12) greeting = "上午好";
                                else if (hour >= 12 && hour < 18) greeting = "下午好";
                                else greeting = "晚上好";

                                const name = syncedChannelName || currentMsg?.channelName || fullRoomId || (isOnline ? t('broadcast.receiver.online') : t('broadcast.receiver.signalLost'));
                                return `${greeting}，${name}`;
                            })()}
                        </span>
                    </div>
                    {/* Receiver Digital Clock */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md font-mono text-sm font-black tabular-nums min-w-[100px] justify-center">
                        <Clock size={16} className="opacity-40" />
                        {currentTime.toLocaleTimeString([], { hour12: false })}
                    </div>
                    <button
                        onClick={() => setIsListening(!isListening)}
                        className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all bg-white/10 backdrop-blur-md hover:scale-110 active:scale-95 cursor-pointer ${isListening ? 'text-green-500 scale-110 shadow-lg shadow-green-500/20' : 'text-gray-400'}`}
                    >
                        {isListening ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                    <button
                        onClick={toggleTheme}
                        className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-95 transition-all bg-white/10 backdrop-blur-md text-orange-500 cursor-pointer"
                    >
                        {isDark ? <Sun size={24} /> : <Moon size={24} />}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 active:scale-95 transition-all bg-white/10 backdrop-blur-md cursor-pointer"
                    >
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                    <button
                        onClick={() => setIsJoined(false)}
                        className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-500 hover:scale-110 active:scale-95 hover:text-white transition-all bg-white/10 backdrop-blur-md cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>


            {/* Main Broadcast Area */}
            <div className={`flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-10 text-center relative z-10 w-full h-full overflow-hidden ${isFullscreen ? '' : 'origin-top scale-[0.98] sm:scale-100'} transition-transform`}>
                {currentMsg ? (
                    <div
                        ref={scrollContainerRef}
                        className="w-full h-full flex flex-col items-center space-y-4 md:space-y-8 animate-in fade-in zoom-in-95 duration-1000 px-4 py-16 overflow-y-auto custom-scrollbar"
                    >
                        {currentMsg.isEmergency && (
                            <div className="flex flex-col items-center gap-4 md:gap-6 animate-pulse shrink-0">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
                                    <AlertCircle size={48} className="text-white md:w-16 md:h-16" />
                                </div>
                                <div className="text-2xl md:text-5xl font-black tracking-[0.3em] md:tracking-[0.5em] uppercase text-white drop-shadow-lg">
                                    {t('broadcast.receiver.criticalBroadcast')}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-center w-full max-w-6xl mx-auto py-[20vh]">
                            {sentences.map((sentence, sIdx) => {
                                const isActive = sIdx === activeSentenceIndex;
                                const isPast = activeSentenceIndex === -1 ? false : sIdx < activeSentenceIndex;

                                // Calculate the absolute start index of this sentence
                                const sentenceStartIndex = sentences.slice(0, sIdx).join('').length;

                                return (
                                    <span
                                        key={sIdx}
                                        ref={isActive ? activeSentenceRef : null}
                                        className={`block transition-all duration-500 py-6 md:py-10 w-full break-words select-none text-center ${isActive
                                            ? (currentMsg.isEmergency ? 'text-white font-black opacity-100' : 'text-orange-500 font-black opacity-100 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]')
                                            : isPast
                                                ? 'opacity-40 blur-[0.5px]'
                                                : 'opacity-20 blur-[1px]'
                                            } ${currentMsg.text.length > 300 ? 'text-lg md:text-2xl' :
                                                currentMsg.text.length > 100 ? 'text-xl md:text-4xl' :
                                                    'text-3xl md:text-6xl'
                                            }`}
                                        style={{
                                            willChange: 'opacity, filter, color'
                                        }}
                                    >
                                        {sentence}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-8 animate-in fade-in duration-1000 relative z-0 flex flex-col items-center justify-center h-full pb-[25vh]">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-gray-400/20 animate-[spin_20s_linear_infinite]"></div>
                            <div className="m-8 w-24 h-24 md:w-32 md:h-32 rounded-full GlassContainer border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-xl shadow-inner">
                                <Signal size={48} className="opacity-30 animate-pulse text-indigo-500" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-2xl md:text-5xl font-black tracking-widest uppercase italic opacity-20">{t('broadcast.receiver.downlinkSync') || '下行接收信号中'}</p>
                            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] opacity-40">
                                <Wifi size={14} /> {t('broadcast.receiver.standbySource') || '稳定连接待机'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* HUD Footer & Always Visible History (Floating to prevent squishing text) */}
            <div className="absolute bottom-4 left-0 right-0 z-50 pointer-events-none flex flex-col items-center">
                <div className="w-[98vw] max-w-5xl mb-2 pointer-events-auto">
                    <GlassCard className="p-4 rounded-[2rem] overflow-hidden flex flex-col border border-white/20 shadow-2xl backdrop-blur-xl bg-white/40 dark:bg-black/40">
                        <div className="flex items-center justify-between mb-3 shrink-0 px-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2 text-orange-500">
                                <History size={14} /> 历史播报小组件
                            </h4>
                            {isPlaying && (
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 animate-pulse">
                                    <RefreshCw size={12} className="animate-spin" />
                                    同步中...
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (window.confirm('确定清空所有历史记录吗？')) {
                                        setReceivedHistory([]);
                                        localStorage.removeItem('br_receiver_history');
                                    }
                                }}
                                className="text-[10px] font-bold text-red-500 hover:opacity-100 opacity-60 px-3 py-1 rounded-full hover:bg-red-500/10 transition-all uppercase tracking-widest"
                            >
                                清除
                            </button>
                        </div>

                        <div className="flex flex-row gap-3 overflow-x-auto custom-scrollbar pb-1 px-1 snap-x">
                            {receivedHistory.length === 0 ? (
                                <div className="flex items-center justify-center py-4 px-6 opacity-40 italic w-full">
                                    <p className="text-[10px] font-bold">暂无历史播报</p>
                                </div>
                            ) : (
                                [...receivedHistory].reverse().map((msg) => (
                                    <button
                                        key={msg.id}
                                        onClick={() => {
                                            if (!isPlaying || window.confirm('当前正在播放，确定要切换到这条历史记录吗？')) {
                                                setCurrentMsg(msg);
                                                speak(msg.text, msg.isEmergency, 1, msg.id);
                                            }
                                        }}
                                        className="flex-none w-56 text-left p-3 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-all border border-transparent hover:border-white/30 group active:scale-[0.98] snap-start shadow-sm"
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[9px] font-bold opacity-50">{new Date(parseInt(msg.timestamp)).toLocaleTimeString()}</span>
                                            {msg.isEmergency && <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase scale-75 origin-right">SOS</span>}
                                        </div>
                                        <p className="text-[11px] font-bold truncate leading-relaxed text-gray-800 dark:text-gray-200">{msg.text}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>

                <div className="pointer-events-auto opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] italic drop-shadow-md">
                        Broadcast Node Active // Secure Sync
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Receiver;

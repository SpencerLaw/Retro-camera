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
        return currentMsg.text.split(/([。！？；\.!\?;]+)/g).reduce((acc: string[], cur, i) => {
            if (i % 2 === 0) acc.push(cur);
            else if (acc.length > 0) acc[acc.length - 1] += cur;
            return acc;
        }, []).filter(s => s.trim());
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

    // Auto-scroll logic: Trigger ONLY on sentence change
    useEffect(() => {
        if (activeSentenceRef.current) {
            activeSentenceRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [activeSentenceIndex]);

    const speak = useCallback((text: string, isEmergency: boolean, repeatCount: number = 1, id: string) => {
        pendingPlayouts.current = repeatCount === -1 ? 999 : repeatCount;
        lastPlayedId.current = id;
        if (fullRoomId) {
            localStorage.setItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`, id);
        }
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
                    if (pendingPlayouts.current > 0 && pendingPlayouts.current !== 999) {
                        pendingPlayouts.current--;
                    }
                    if (pendingPlayouts.current > 0) {
                        setTimeout(() => playNext(), 1500);
                    } else {
                        setIsPlaying(false);
                        setCharIndex(0);
                    }
                }
            });
        };

        playNext();
    }, []);

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
                    lastPlayedId.current = msg.id;
                    localStorage.setItem(`br_last_played_id_${fullRoomId.trim().toUpperCase()}`, msg.id);
                }
            } else if (!isPlaying) {
                // Only clear if not playing, to prevent message disappearing due to expiration
                setCurrentMsg(null);
            }
            setError(null);
        } catch (err: any) {
            console.error('Polling error:', err);
        }
    }, [fullRoomId, isListening, speak]);

    useEffect(() => {
        if (isJoined) {
            fetchMessage();
            pollingTimer.current = setInterval(fetchMessage, 3000);
        }
        return () => {
            if (pollingTimer.current) clearInterval(pollingTimer.current);
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
                    setError(t('broadcast.receiver.invalidRoom') || '无效的房间号');
                } else {
                    setError('验证失败，请重试');
                }
                return;
            }

            // Room is valid, proceed to join
            localStorage.setItem('br_last_full_room_rx', fullRoomId);
            setIsJoined(true);
            setIsListening(true);
            // Wake up TTS for iOS
            const wakeUp = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(wakeUp);
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

                        <div className="flex flex-col items-center w-full max-w-6xl mx-auto py-[40vh]">
                            {sentences.map((sentence, sIdx) => {
                                const isActive = sIdx === activeSentenceIndex;
                                const isPast = activeSentenceIndex === -1 ? false : sIdx < activeSentenceIndex;

                                return (
                                    <span
                                        key={sIdx}
                                        ref={isActive ? activeSentenceRef : null}
                                        className={`block transition-all duration-700 py-6 md:py-10 w-full break-words select-none origin-center text-center ${isActive
                                            ? `scale-110 font-black opacity-100 ${currentMsg.isEmergency ? 'text-white' : 'text-blue-500'} drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]`
                                            : isPast
                                                ? 'opacity-30 blur-[1px] font-bold scale-95'
                                                : 'opacity-10 blur-[2px] font-bold scale-90'
                                            } ${currentMsg.text.length > 300 ? 'text-xl md:text-3xl' :
                                                currentMsg.text.length > 100 ? 'text-2xl md:text-5xl' :
                                                    'text-4xl md:text-7xl'
                                            }`}
                                    >
                                        {sentence}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-10 animate-in fade-in duration-1000">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-gray-400/20 animate-[spin_20s_linear_infinite]"></div>
                            <div className="m-8 w-32 h-32 rounded-full GlassContainer border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-xl shadow-inner">
                                <Signal size={60} className="opacity-20 animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic opacity-10">{t('broadcast.receiver.downlinkSync')}</p>
                            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.4em] opacity-30">
                                <Wifi size={14} /> {t('broadcast.receiver.standbySource')}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* HUD Footer & History Drawer */}
            <div className="relative z-50">
                {showSettings && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[95vw] max-w-2xl mb-6 animate-in slide-in-from-bottom-6 duration-500">
                        <GlassCard className="p-8 rounded-[2.5rem] overflow-hidden max-h-[65vh] flex flex-col border-2 border-white/20">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <h4 className="text-sm font-black uppercase tracking-widest opacity-60 flex items-center gap-3 text-indigo-500">
                                    <History size={18} /> {t('broadcast.sender.timeline') || '历史播报记录'}
                                </h4>
                                <button
                                    onClick={() => {
                                        setReceivedHistory([]);
                                        localStorage.removeItem('br_receiver_history');
                                    }}
                                    className="text-xs font-bold text-red-500 hover:opacity-70 px-4 py-1.5 rounded-full hover:bg-red-500/10 transition-all"
                                >
                                    {t('broadcast.sender.wipeLogs') || '清除全部'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-3">
                                {receivedHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                                        <History size={48} className="mb-4" />
                                        <p className="text-lg font-bold">暂无历史播报</p>
                                    </div>
                                ) : (
                                    [...receivedHistory].reverse().map((msg) => (
                                        <button
                                            key={msg.id}
                                            onClick={() => {
                                                setCurrentMsg(msg);
                                                speak(msg.text, msg.isEmergency);
                                                setShowSettings(false);
                                            }}
                                            className="w-full text-left p-5 rounded-3xl bg-black/5 dark:bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group active:scale-[0.98]"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold opacity-40">{new Date(parseInt(msg.timestamp)).toLocaleString()}</span>
                                                {msg.isEmergency && <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase scale-90">EMERGENCY</span>}
                                            </div>
                                            <p className="text-sm font-bold truncate group-hover:whitespace-normal transition-all leading-relaxed mr-4">{msg.text}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>
                )}

                <div className="p-10 flex justify-center pb-12">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`px-8 py-3 rounded-full GlassContainer border text-[10px] font-black uppercase tracking-[0.35em] flex items-center gap-4 transition-all ${showSettings
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 opacity-100 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                            : 'border-white/20 bg-white/5 backdrop-blur-md opacity-40 hover:opacity-100'
                            }`}
                    >
                        <RefreshCw size={14} className={isPlaying ? 'animate-spin' : ''} />
                        {isPlaying ? '正在播报中...' : (t('broadcast.receiver.broadcastMode') || '广播播报模式 // 运行中')}
                        <History size={14} className={showSettings ? 'scale-125' : ''} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Receiver;

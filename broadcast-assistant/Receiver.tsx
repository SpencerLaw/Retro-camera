import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Loader2, Volume2, VolumeX, AlertCircle, Tv, Signal, X, History, Clock, Radio, Zap, Moon, Sun, Maximize, Minimize, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { getBCLicense } from './utils/licenseManager';
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
declare global {
    interface Window {
        electronAPI?: { showWindow: (isEmergency: boolean) => void };
    }
}

const ClockDisplay = React.memo(() => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <span className="tabular-nums">{time.toLocaleTimeString()}</span>;
});

// ─── Premium Radar Visualizer ────────────────────────────────────────────────
const IdleVisualizer = React.memo(({ isEmergency }: { isEmergency: boolean }) => {
    const accent = isEmergency ? '#ef4444' : '#ec4899';
    const accentAlpha = (a: number) => isEmergency ? `rgba(239,68,68,${a})` : `rgba(236,72,153,${a})`;

    return (
        <div className="relative flex items-center justify-center select-none" style={{ width: 280, height: 280 }}>

            {/* ── Ambient glow ── */}
            <div className="absolute rounded-full blur-[120px] opacity-15 animate-pulse"
                style={{ width: '140%', height: '140%', background: `radial-gradient(circle, ${accentAlpha(0.25)}, transparent 70%)` }} />

            {/* ── Ring 1: outermost slow CW ── */}
            <div className="absolute inset-0 rounded-full animate-[spin_80s_linear_infinite]"
                style={{ border: `1px dashed ${accentAlpha(0.18)}` }} />

            {/* ── Ring 2: medium CCW ── */}
            <div className="absolute rounded-full animate-[spin_38s_linear_infinite_reverse]"
                style={{ inset: 14, border: `1px solid ${accentAlpha(0.12)}` }} />

            {/* ── Ring 3: solid inner ── */}
            <div className="absolute rounded-full"
                style={{ inset: 30, border: `1px solid ${accentAlpha(0.08)}` }} />

            {/* ── Crosshair lines ── */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-full h-[0.5px] opacity-[0.05]" style={{ background: accent }} />
                <div className="absolute h-full w-[0.5px] opacity-[0.05]" style={{ background: accent }} />
            </div>

            {/* ── Radar sweep (comet tail) ── */}
            <div className="absolute rounded-full animate-[spin_3s_linear_infinite]"
                style={{
                    inset: 8,
                    background: `conic-gradient(from 0deg, ${accentAlpha(0)} 0%, ${accentAlpha(0)} 55%, ${accentAlpha(0.3)} 78%, ${accentAlpha(0.8)} 98%, ${accentAlpha(0)} 100%)`,
                    filter: 'blur(1.5px)',
                }} />

            {/* ── Leading edge dot (same inset as sweep so positions match exactly) ── */}
            <div className="absolute z-50 animate-[spin_3s_linear_infinite]" style={{ inset: 8 }}>
                <div className="absolute w-3 h-3 rounded-full"
                    style={{
                        top: '-6px',
                        left: '50%',
                        background: accent,
                        boxShadow: `0 0 20px 8px ${accentAlpha(1)}`,
                        transform: 'translateX(-50%)',
                    }} />
            </div>

            {/* ── Core orb ── */}
            <div className="relative z-10 flex items-center justify-center rounded-full border border-white/10"
                style={{
                    width: 96,
                    height: 96,
                    background: `radial-gradient(circle at 35% 35%, ${accentAlpha(0.8)}, ${accentAlpha(0.5)} 50%, ${accentAlpha(0.3)})`,
                    boxShadow: `0 0 0 1px ${accentAlpha(0.2)}, 0 0 30px 6px ${accentAlpha(0.2)}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}>
                {/* Highlight */}
                <div className="absolute rounded-full bg-white/15 blur-sm" style={{ width: '60%', height: '40%', top: '12%', left: '15%' }} />
                <Signal size={34} className="relative z-10 text-white animate-pulse" style={{ opacity: 0.55 }} />
            </div>
        </div>
    );
});

// ─── Active EQ Visualizer ───
const ActiveVisualizer = ({ isEmergency }: { isEmergency: boolean }) => (
    <div className="flex items-center justify-center gap-1.5 h-16 pointer-events-none">
        {[0.6, 1, 0.8, 1.2, 0.7].map((h, i) => (
            <div
                key={i}
                className={`w-3 rounded-full animate-[pulse_1s_ease-in-out_infinite] ${isEmergency ? 'bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]'}`}
                style={{
                    height: `${h * 100}%`,
                    animationDelay: `${i * 0.15}s`,
                    opacity: 0.8 - i * 0.1
                }}
            />
        ))}
    </div>
);

// ─── Sentence Item ───
interface SentenceItemProps {
    sentence: string;
    isActive: boolean;
    isPast: boolean;
    isEmergency: boolean;
    textLength: number;
    activeSentenceRef: React.RefObject<HTMLDivElement>;
    theme: 'light' | 'dark';
}

const SentenceItem: React.FC<SentenceItemProps> = ({
    sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef, theme
}) => {
    const scaleFactor = Math.max(0.6, Math.min(1.2, 200 / (textLength || 1)));

    let textColor = '';
    if (isEmergency) {
        textColor = isActive ? '#fca5a5' : 'rgba(127, 29, 29, 0.4)';
    } else {
        if (theme === 'dark') {
            textColor = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
        } else {
            textColor = isActive ? '#1e293b' : 'rgba(203, 213, 225, 0.6)';
        }
    }

    return (
        <div
            ref={isActive ? activeSentenceRef : null}
            style={{
                transform: isActive ? 'scale(1.1)' : isPast ? 'scale(0.9)' : 'scale(0.95)',
                opacity: isActive ? 1 : isPast ? 0.4 : 0.2,
                filter: isPast ? 'blur(1px)' : 'none',
                transition: 'all 0.7s ease-in-out'
            }}
            className="py-6 px-10 text-center select-none"
        >
            <p
                style={{
                    fontSize: `${scaleFactor * (isActive ? 32 : 24)}px`,
                    color: textColor,
                    transition: 'all 0.5s ease-in-out'
                }}
                className="font-black tracking-tight leading-relaxed"
            >
                {sentence}
            </p>
        </div>
    );
};

// ─── Shared Sentence Splitter ───
const splitSentences = (text: string): string[] => {
    return (text || '').split(/([。！？；.!?;\n])/).reduce((acc: string[], curr: string, i: number, arr: string[]) => {
        // 合并标点符号到前一个句子
        if (i % 2 === 1) {
            if (acc.length > 0) acc[acc.length - 1] += curr;
        } else if (curr.trim().length > 0) {
            acc.push(curr.trim());
        }
        return acc;
    }, []).filter(s => s.trim().length > 0);
};

const BROADCAST_POLL_VISIBLE_MS = 10000;
const BROADCAST_POLL_HIDDEN_MS = 30000;

const buildBroadcastFetchUrl = (roomId: string) => {
    const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `/api/broadcast/fetch?code=${encodeURIComponent(roomId.toUpperCase())}&t=${cacheBust}`;
};

const fetchBroadcastState = async (roomId: string): Promise<{ status: number; ok: boolean; data: any }> => {
    const url = buildBroadcastFetchUrl(roomId);

    if (typeof window.fetch === 'function') {
        const response = await window.fetch(url, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        });

        return {
            status: response.status,
            ok: response.ok,
            data: await response.json(),
        };
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.onload = () => {
            let data: any = {};
            try {
                data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            } catch (error) {
                data = {};
            }
            resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, data });
        };
        xhr.onerror = reject;
        xhr.ontimeout = reject;
        xhr.timeout = 12000;
        xhr.send();
    });
};

// ─── Main Component ──────────────────────────────────────────────────────────
interface ReceiverProps {
    isDark: boolean;
    onExit?: () => void;
    onOpenDialog?: (title: string, msg: string, type: DialogType, onConfirm: () => void) => void;
}

const Receiver: React.FC<ReceiverProps> = ({ isDark, onExit, onOpenDialog }) => {
    const t = useTranslations();
    const [isJoined, setIsJoined] = useState(() => {
        const urlRoom = new URLSearchParams(window.location.search).get('room') || '';
        if (urlRoom.length === 6 && /^\d{6}$/.test(urlRoom)) {
            localStorage.setItem('br_receiver_roomId', urlRoom);
            return true;
        }
        const saved = localStorage.getItem('br_receiver_roomId');
        return !!saved && saved.length >= 6;
    });
    const [roomId, setRoomId] = useState(() => {
        const urlRoom = new URLSearchParams(window.location.search).get('room') || '';
        if (urlRoom.length === 6 && /^\d{6}$/.test(urlRoom)) return urlRoom;
        return localStorage.getItem('br_receiver_roomId') || '';
    });
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isListening, setIsListening] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [theme, setTheme] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');
    const [displayChannelName, setDisplayChannelName] = useState('');
    const [msgQueue, setMsgQueue] = useState<Message[]>([]);
    const [needsActivation, setNeedsActivation] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [localTime, setLocalTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const activeRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const isPlayingRef = useRef(false);
    const engine = useRef({
        lastId: localStorage.getItem('br_receiver_last_id') || '',
        isJoined: !!localStorage.getItem('br_receiver_roomId'),
        isListening: true
    });

    const fullRoomId = roomId.padStart(6, '0');

    // Update clock every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    const handleActivate = useCallback(() => {
        ttsManager.startSilentLoop();
        setNeedsActivation(false);
    }, []);

    const handleDownload = useCallback(() => {
        setIsDownloading(true);
        setTimeout(() => setIsDownloading(false), 3500);
    }, []);

    const handleExit = useCallback(() => {
        if (!isJoined) {
            onExit?.();
            return;
        }

        setShowExitConfirm(true);
    }, [isJoined, onExit]);

    // Also resume audio on any global click once joined
    useEffect(() => {
        if (!isJoined) return;
        const autoResume = () => {
            if (ttsManager.startSilentLoop) ttsManager.startSilentLoop();
        };
        window.addEventListener('click', autoResume);
        return () => window.removeEventListener('click', autoResume);
    }, [isJoined]);

    // Effect for auto-scrolling to the active sentence
    useEffect(() => {
        if (activeSentenceIndex !== -1 && activeRef.current) {
            try {
                activeRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            } catch (err) {
                console.warn('Scroll failed:', err);
            }
        }
    }, [activeSentenceIndex]);

    useEffect(() => {
        const savedHistory = localStorage.getItem('br_receiver_history');
        if (savedHistory) setReceivedHistory(JSON.parse(savedHistory));
    }, []);

    const runPlayback = useCallback(async (msg: Message) => {
        if (!engine.current.isListening) return;
        isPlayingRef.current = true;
        setCurrentMsg(msg);
        setIsPlaying(true);
        setActiveSentenceIndex(-1);

        try {
            const sentences = splitSentences(msg.text);
            const repeat = msg.repeatCount || 1;

            for (let r = 0; r < (repeat === -1 ? 999 : repeat); r++) {
                for (let i = 0; i < sentences.length; i++) {
                    if (!engine.current.isJoined) break;
                    setActiveSentenceIndex(i);

                    try {
                        const startTime = Date.now();
                        const isFishVoice = msg.voice?.startsWith('fish:');
                        const fishVoiceId = isFishVoice ? msg.voice?.split(':')[1] : null;

                        if (isFishVoice && fishVoiceId) {
                            try {
                                await ttsManager.speak(sentences[i], {
                                    voice: fishVoiceId,
                                    engine: 'fish',
                                    volume: 1,
                                    license: getBCLicense() || undefined
                                });
                            } catch (e) {
                                console.error('Fish Audio Playback failed, falling back to Edge TTS:', e);
                                await ttsManager.speak(sentences[i], {
                                    voice: 'zh-CN-XiaoxiaoNeural',
                                    engine: 'edge',
                                    volume: 1
                                });
                            }
                        } else {
                            await ttsManager.speak(sentences[i], {
                                voice: msg.voice || 'zh-CN-XiaoxiaoNeural',
                                engine: 'edge',
                                volume: 1
                            });
                        }

                        const duration = Date.now() - startTime;
                        if (duration < 500) {
                            const showDelay = Math.max(2500, sentences[i].length * 200);
                            await new Promise(res => setTimeout(res, showDelay));
                        }
                    } catch (ttsErr) {
                        console.warn('TTS Speak Failed (Autoplay blocked?):', ttsErr);
                        if (!engine.current.isJoined) break;
                        const delayMs = Math.max(2500, sentences[i].length * 200);
                        await new Promise(res => setTimeout(res, delayMs));
                    }
                }
            }
        } catch (e) {
            console.error('Playback Error:', e);
        } finally {
            isPlayingRef.current = false;
            setIsPlaying(false);
            setActiveSentenceIndex(-1);

            setTimeout(() => {
                if (!isPlayingRef.current) {
                    setCurrentMsg(null);
                }
            }, 1500);
        }
    }, []);

    // Queue worker: process messages one by one
    useEffect(() => {
        if (msgQueue.length > 0 && !isPlayingRef.current && isListening) {
            const nextMsg = msgQueue[0];
            setMsgQueue(prev => prev.slice(1));
            runPlayback(nextMsg);
        }
    }, [msgQueue, isListening, runPlayback, isPlaying]);

    useEffect(() => {
        if (!isJoined) return;
        let failCount = 0;
        const poll = async () => {
            if (!engine.current.isJoined) return;

            const pollInterval = document.visibilityState === 'visible' ? BROADCAST_POLL_VISIBLE_MS : BROADCAST_POLL_HIDDEN_MS;

            try {
                const r = await fetchBroadcastState(fullRoomId);

                if (r.status === 404) {
                    failCount++;
                    if (failCount >= 3) {
                        engine.current.isJoined = false;
                        ttsManager.cancelAll();
                        setIsJoined(false);
                        return;
                    }
                } else if (r.ok) {
                    const data = r.data;

                    if (data.roomDeleted) {
                        engine.current.isJoined = false;
                        ttsManager.cancelAll();
                        setIsJoined(false);
                        return;
                    }

                    if (data.notFound) {
                        failCount++;
                        if (failCount >= 15) {
                            engine.current.isJoined = false;
                            ttsManager.cancelAll();
                            setIsJoined(false);
                            return;
                        }
                    }

                    if (!data.notFound) {
                        failCount = 0;
                    }

                    const msg = data.message as Message;
                    if (msg) {
                        failCount = 0;
                        if (msg.id !== engine.current.lastId) {
                            engine.current.lastId = msg.id;
                            localStorage.setItem('br_receiver_last_id', msg.id);
                            if (msg.channelName) setDisplayChannelName(msg.channelName);
                            if (msg.text && msg.text.trim()) {
                                if (engine.current.isListening) {
                                    setMsgQueue(prev => {
                                        if (msg.isEmergency) return [msg, ...prev];
                                        return [...prev, msg];
                                    });
                                    // 触发 Electron 弹窗唤醒
                                    if (window.electronAPI) {
                                        window.electronAPI.showWindow(msg.isEmergency);
                                    }
                                }
                                setReceivedHistory(prev => {
                                    const next = [...prev, msg].slice(-20);
                                    setTimeout(() => localStorage.setItem('br_receiver_history', JSON.stringify(next)), 0);
                                    return next;
                                });
                            }
                        }
                    } else if (!isPlayingRef.current) {
                        setCurrentMsg(null);
                    }
                } else {
                    failCount = 0;
                }
            } catch (e) {
                failCount = 0;
            }
            if (engine.current.isJoined) setTimeout(poll, pollInterval);
        };
        poll();
        ttsManager.startSilentLoop();

        if (typeof navigator !== 'undefined' && (navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
            setNeedsActivation(true);
        }

        return () => { engine.current.isJoined = false; ttsManager.cancelAll(); setMsgQueue([]); };
    }, [isJoined, fullRoomId, runPlayback]);

    const channelName = displayChannelName || receivedHistory[receivedHistory.length - 1]?.channelName || '';
    const emergency = !!currentMsg?.isEmergency;

    return (
        <div className={`fixed inset-0 w-full h-[100dvh] z-[100] flex flex-col items-center justify-center p-6 overflow-hidden transition-all duration-1000 ${emergency ? 'bg-rose-950 text-white' : (theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-950')
            }`}>
            {/* ─── Premium Animated Backdrop ─── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] blur-[160px] rounded-full animate-pulse ${emergency ? 'bg-rose-500/20' : 'bg-indigo-500/10'}`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] blur-[160px] rounded-full animate-pulse transition-colors duration-[7s] ${emergency ? 'bg-rose-600/15' : 'bg-purple-500/10'}`} />
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse duration-[5s]" />
            </div>

            {/* ─── Back Button (Only when not joined) ─── */}
            {!isJoined && onExit && (
                <button
                    onClick={handleExit}
                    className={`absolute top-6 left-6 z-[110] w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg border ${theme === 'dark' ? 'bg-white/10 border-white/10 hover:bg-white/20 text-white' : 'bg-white/70 border-white hover:bg-white text-slate-700'}`}
                    title={t('broadcast.returnDashboard') || '返回'}
                >
                    <ArrowLeft size={20} />
                </button>
            )}

            {/* ─── Floating Glass Header ─── */}
            {isJoined && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
                    <GlassCard className="px-8 py-4 flex items-center justify-between border-white/[0.08] dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-5">
                            {onExit && (
                                <button
                                    onClick={handleExit}
                                    className={`w-10 h-10 -ml-4 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 ${theme === 'dark' ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                                    title={t('broadcast.returnDashboard') || '返回'}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isJoined ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-200/50 dark:bg-white/5 text-slate-400'}`}>
                                {isPlaying ? <Radio className="animate-pulse" size={24} /> : <Tv size={24} />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-black tracking-tight truncate leading-none mb-1.5">{channelName || t('broadcast.receiver.monitoring')}</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Room · {fullRoomId}</span>
                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-indigo-500/60 dark:text-indigo-400/60">
                                        <Clock size={10} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] tabular-nums">{localTime}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!window.electronAPI && (
                                <a
                                    href="/ClassBroadcast_Setup.exe"
                                    download="班级广播桌面端.exe"
                                    onClick={handleDownload}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-amber-400/80 hover:text-amber-400' : 'hover:bg-slate-50 text-amber-500/80 hover:text-amber-500'}`}
                                    title="下载高级桌面版(自带最小化强制霸屏功能)"
                                >
                                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                </a>
                            )}
                            <button
                                onClick={toggleTheme}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-slate-50'}`}
                            >
                                {theme === 'dark' ? <Sun size={18} className="text-amber-400/60" /> : <Moon size={18} className="text-slate-400" />}
                            </button>
                            <button
                                onClick={() => {
                                    const val = !isListening;
                                    setIsListening(val);
                                    engine.current.isListening = val;
                                }}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isListening ? 'text-emerald-500' : 'text-rose-500 opacity-40'}`}
                            >
                                {isListening ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            <main className="relative flex-1 w-full max-w-4xl flex flex-col items-center justify-center z-10 min-h-0">
                {!isJoined ? (
                    <div className="w-full max-w-md space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="text-center space-y-4">
                            <div className="flex justify-center mb-8">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 rotate-3">
                                    <Tv size={40} />
                                </div>
                            </div>
                            <h1 className="text-5xl font-black tracking-tighter text-slate-800 dark:text-white italic uppercase">{t('broadcast.receiver.joinTitle')}</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 opacity-60 px-4">{t('broadcast.receiver.enterSixDigit')}</p>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                maxLength={6}
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.replace(/\D/g, ''))}
                                placeholder="000 000"
                                className={`w-full h-28 text-center text-6xl font-black rounded-[2.5rem] border-2 transition-all outline-none tracking-tighter sm:tracking-normal ${theme === 'dark'
                                    ? 'bg-black/20 border-white/5 text-white focus:border-indigo-500/50'
                                    : 'bg-white/50 border-slate-100 text-slate-900 focus:border-indigo-400/50 focus:bg-white shadow-inner'
                                    }`}
                            />
                            <div className="absolute -top-3 -right-3 w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 animate-bounce">
                                <Zap size={20} fill="currentColor" />
                            </div>
                        </div>

                        <button
                            disabled={roomId.length < 6}
                            onClick={() => {
                                localStorage.setItem('br_receiver_roomId', roomId);
                                engine.current.isJoined = true;
                                setIsJoined(true);
                                setMsgQueue([]);
                            }}
                            className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] transition-all duration-500 shadow-2xl ${roomId.length === 6
                                ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-95 active:translate-y-0'
                                : 'bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {t('broadcast.receiver.joinButton')}
                        </button>

                        {!window.electronAPI && (
                            <div className="pt-8 text-center w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                                <a 
                                    href="/ClassBroadcast_Setup.exe" 
                                    download="班级广播桌面端.exe"
                                    onClick={handleDownload}
                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg hover:scale-105 active:scale-95 ${theme === 'dark' ? 'bg-white/10 text-white/80 hover:text-white hover:bg-white/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                >
                                    {isDownloading ? <Loader2 size={14} className="text-amber-400 animate-spin" /> : <Zap size={14} className="text-amber-400" />}
                                    {isDownloading ? '正在下载...' : '下载高级桌面版 (支持最小化强制霸屏弹窗)'}
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex-1 flex flex-col min-h-0 relative z-10 pt-24 pb-32">
                        {currentMsg && currentMsg.text.trim() ? (
                            <div className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col scroll-smooth">
                                <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col items-center justify-center px-6 py-32 space-y-10 text-center">
                                    {isPlaying && (
                                        <div className="flex justify-center shrink-0">
                                            <ActiveVisualizer isEmergency={emergency} />
                                        </div>
                                    )}
                                    {splitSentences(currentMsg.text).map((s, i) => (
                                        <SentenceItem
                                            key={`${currentMsg.id}-${i}`}
                                            sentence={s}
                                            isActive={i === activeSentenceIndex}
                                            isPast={activeSentenceIndex !== -1 && i < activeSentenceIndex}
                                            isEmergency={emergency}
                                            textLength={currentMsg.text.length}
                                            activeSentenceRef={activeRef}
                                            theme={theme}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-in zoom-in-95 duration-1000 min-h-0">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-400/5 blur-[100px] rounded-full scale-150 animate-pulse" />
                                    <IdleVisualizer isEmergency={false} />
                                </div>
                                <div className="text-center space-y-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-500 animate-pulse">{t('broadcast.receiver.monitoring')}</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ─── Premium Glass Footer ─── */}
            {isJoined && !isPlaying && !currentMsg && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-8 z-50">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`w-full group px-8 py-5 rounded-[2rem] backdrop-blur-[24px] border transition-all duration-500 flex items-center justify-between shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/70 border-white hover:bg-white shadow-xl'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-white/5 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                <History size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('broadcast.receiver.historyTitle')}</span>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-inner ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}>{receivedHistory.length}</div>
                    </button>
                </div>
            )}

            {/* ─── History Drawer ─── */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                    <div className={`relative w-full max-w-2xl max-h-[70vh] rounded-t-[3rem] border-t border-x p-10 flex flex-col gap-8 shadow-[0_-40px_100px_-20px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full duration-700 ${theme === 'dark' ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-white'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl tracking-tight">{t('broadcast.receiver.historyTitle')}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mt-0.5">{receivedHistory.length} BROADCASTS RECORDED</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistory(false)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                                <X size={24} className="opacity-40" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                            {receivedHistory.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                                    <History size={48} strokeWidth={1} />
                                    <p className="text-xs font-black uppercase tracking-[0.3em]">No records found</p>
                                </div>
                            ) : (
                                [...receivedHistory].reverse().map((m, idx) => (
                                    <div key={m.id} className={`p-6 rounded-3xl border transition-all ${m.isEmergency ? 'bg-rose-500/5 border-rose-500/20' : (theme === 'dark' ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black opacity-30 tabular-nums">
                                                    {(() => {
                                                        const ts = parseInt(m.timestamp);
                                                        return isNaN(ts) ? m.timestamp : new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                    })()}
                                                </span>
                                                {m.isEmergency && <span className="text-[9px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-full">EMERGENCY</span>}
                                            </div>
                                            <div className={`w-1.5 h-1.5 rounded-full ${m.isEmergency ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                        </div>
                                        <p className="text-base font-bold leading-relaxed">{m.text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setReceivedHistory([]);
                                localStorage.removeItem('br_receiver_history');
                            }}
                            className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-[0.98]"
                        >
                            {t('broadcast.sender.clearHistory') || '清空记录'}
                        </button>
                    </div>
                </div>
            )}
            {/* ─── Activation Overlay ─── */}
            {needsActivation && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="max-w-xs w-full text-center space-y-10 p-10">
                        <div className="relative mx-auto w-28 h-28 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-[0_0_100px_rgba(99,102,241,0.2)]">
                            <Volume2 size={48} />
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-20" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black text-white tracking-tight">激活播报系统</h3>
                            <p className="text-xs text-white/40 leading-relaxed font-bold uppercase tracking-wider">
                                点击下方按钮以建立音频连接
                            </p>
                        </div>
                        <button
                            onClick={handleActivate}
                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-600 to-purple-600 text-white font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 transition-all"
                        >
                            点击开始
                        </button>
                    </div>
                </div>
            )}

            <audio ref={audioRef} className="hidden" />

            <CustomDialog
                isOpen={showExitConfirm}
                title={t('broadcast.receiver.exitConfirmTitle') || '退出教室'}
                message={t('broadcast.receiver.exitConfirmDesc') || '确认要退出并清除当前记录的教室码吗？退出后下次进入需要重新输入。'}
                type="confirm"
                onConfirm={() => {
                    localStorage.removeItem('br_receiver_roomId');
                    localStorage.removeItem('br_receiver_last_id');
                    setIsJoined(false);
                    setRoomId('');
                    setShowExitConfirm(false);
                    onExit?.();
                }}
                onCancel={() => setShowExitConfirm(false)}
                isDark={theme === 'dark'}
            />

            {/* Custom Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.3); }
                `
            }} />
        </div>
    );
};

export default Receiver;

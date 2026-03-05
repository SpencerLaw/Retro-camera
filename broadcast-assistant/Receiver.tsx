import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, AlertCircle, Tv, Signal, X, History, Clock, Radio, Zap, Moon, Sun, Maximize, Minimize, ChevronUp, ChevronDown } from 'lucide-react';
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

// ─── Main Component ──────────────────────────────────────────────────────────
interface ReceiverProps {
    isDark: boolean;
    onExit?: () => void;
    onOpenDialog?: (title: string, msg: string, type: DialogType, onConfirm: () => void) => void;
}

const Receiver: React.FC<ReceiverProps> = ({ isDark, onExit, onOpenDialog }) => {
    const t = useTranslations();
    const [isJoined, setIsJoined] = useState(() => {
        // Check URL ?room= param first, then fall back to localStorage
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

    const activeRef = useRef<HTMLDivElement>(null);
    const isPlayingRef = useRef(false);
    const engine = useRef({
        lastId: '',
        isJoined: !!localStorage.getItem('br_receiver_roomId'),
        isListening: true
    });

    const fullRoomId = roomId.padStart(6, '0');

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    const handleActivate = useCallback(() => {
        ttsManager.startSilentLoop();
        setNeedsActivation(false);
    }, []);

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
                            let fishSuccess = false;
                            try {
                                // 使用 Fish Audio 代理接口进行播放
                                const ttsResp = await fetch('/api/broadcast/fish-tts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        text: sentences[i],
                                        reference_id: fishVoiceId,
                                        format: 'mp3',
                                        model: 's1'
                                    })
                                });

                                if (ttsResp.ok) {
                                    const blob = await ttsResp.blob();
                                    const url = URL.createObjectURL(blob);
                                    const audio = new Audio(url);
                                    await new Promise((resolve, reject) => {
                                        audio.onended = resolve;
                                        audio.onerror = reject;
                                        audio.play().catch(reject);
                                    });
                                    fishSuccess = true;
                                }
                            } catch (e) {
                                console.error('Fish Audio Playback failed, falling back to Edge TTS:', e);
                            }

                            if (!fishSuccess) {
                                // Fallback to default Edge TTS
                                await ttsManager.speak(sentences[i], {
                                    voice: 'zh-CN-XiaoxiaoNeural',
                                    engine: 'edge',
                                    volume: 1
                                });
                            }
                        } else {
                            // 默认使用 Edge TTS
                            await ttsManager.speak(sentences[i], {
                                voice: msg.voice || 'zh-CN-XiaoxiaoNeural',
                                engine: 'edge',
                                volume: 1
                            });
                        }

                        // 额外防御：如果 speak 瞬间就被 resolve 了（通常是由于浏览器 autoplay 拦截），
                        // 我们需要手动补足一个视觉展示时间，否则循环瞬间结束，消息会闪现消失。
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

            // 读完了，如果需要恢复雷达显示，必须清空 currentMsg
            // 加一点小延迟，让用户在这个句子上停留一会儿再刷掉
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
        const poll = async () => {
            if (!engine.current.isJoined) return;
            try {
                const r = await fetch(`/api/broadcast/fetch?code=${fullRoomId.toUpperCase()}&t=${Date.now()}`);

                // 检测房间是否已被教师端删除
                if (r.status === 404) {
                    engine.current.isJoined = false;
                    ttsManager.cancelAll();
                    localStorage.removeItem('br_receiver_roomId');
                    setIsJoined(false);
                    return;
                }

                if (r.ok) {
                    const data = await r.json();

                    // 服务端返回 roomDeleted / notFound 标志
                    if (data.roomDeleted || data.notFound) {
                        engine.current.isJoined = false;
                        ttsManager.cancelAll();
                        localStorage.removeItem('br_receiver_roomId');
                        setIsJoined(false);
                        return;
                    }

                    const msg = data.message as Message;

                    if (msg) {
                        // 有效消息：判断是不是新消息
                        if (msg.id !== engine.current.lastId) {
                            engine.current.lastId = msg.id;
                            if (msg.channelName) setDisplayChannelName(msg.channelName);
                            if (msg.text && msg.text.trim()) {
                                if (engine.current.isListening) {
                                    setMsgQueue(prev => {
                                        // 紧急消息插队到最前面，普通消息排队
                                        if (msg.isEmergency) return [msg, ...prev];
                                        return [...prev, msg];
                                    });
                                }
                                setReceivedHistory(prev => {
                                    const next = [...prev, msg].slice(-20);
                                    setTimeout(() => localStorage.setItem('br_receiver_history', JSON.stringify(next)), 0);
                                    return next;
                                });
                            }
                        }
                    } else {
                        // 如果后端返回 message 为 null (即 KV 被清除或过期)
                        // 且当前没有任何播报在进行中，那么我们回到安全的 idle 状态
                        if (!isPlayingRef.current) {
                            setCurrentMsg(null);
                        }
                    }
                }
            } catch (e) { }
            if (engine.current.isJoined) setTimeout(poll, 2000);
        };
        poll();
        ttsManager.startSilentLoop();

        // Initial check for activation
        if (typeof navigator !== 'undefined' && (navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) {
            setNeedsActivation(true);
        }

        return () => { engine.current.isJoined = false; ttsManager.cancelAll(); setMsgQueue([]); };
    }, [isJoined, fullRoomId, runPlayback]);

    // Duplicate effect removed

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 6) return '凌晨好';
        if (h < 12) return '上午好';
        if (h < 14) return '中午好';
        if (h < 18) return '下午好';
        return '晚上好';
    }, []);

    // The most recently known channel name comes from displayChannelName state
    const channelName = displayChannelName || receivedHistory[receivedHistory.length - 1]?.channelName || '';

    // ── Join Screen ──────────────────────────────────────────────────────────
    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center p-6 transition-colors duration-1000 ${theme === 'dark' ? 'bg-[#0a0a0f]' : 'bg-slate-100'}`}>
                {/* 退出按钮 */}
                {onExit && (
                    <button
                        onClick={onExit}
                        className={`absolute top-8 left-8 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm border ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-white/80 border-slate-200 text-slate-500 hover:text-slate-800'}`}
                    >
                        <X size={20} />
                    </button>
                )}

                {/* bg blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-pink-600/10 blur-[160px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-rose-600/10 blur-[160px] rounded-full animate-pulse" />
                </div>

                <div className={`relative z-10 w-full max-w-md p-10 rounded-[3rem] border backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] ${theme === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-white'}`}>
                    {/* Icon */}
                    <div className="flex justify-center mb-10">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-[0_12px_40px_rgba(236,72,153,0.4)] rotate-6">
                                <Tv size={44} />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                                <Radio size={14} className="text-white animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <h1 className={`text-4xl font-extrabold text-center mb-3 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        加入接收端
                    </h1>
                    <p className={`text-center mb-10 text-sm font-medium ${theme === 'dark' ? 'text-white/30' : 'text-slate-500'}`}>
                        输入 6 位房间号码开始接收广播
                    </p>

                    <div className="space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={6}
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className={`w-full h-24 text-center text-6xl font-black rounded-3xl border-2 transition-all outline-none ${theme === 'dark'
                                    ? 'bg-black/20 border-white/5 text-white focus:border-pink-500/50'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-pink-400 focus:bg-white'
                                    }`}
                            />
                            <div className="absolute -right-3 -top-3 w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg animate-bounce">
                                <Zap size={16} />
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
                            className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${roomId.length === 6
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/25 hover:scale-[1.02] active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                }`}
                        >
                            初始化信号接收
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const emergency = !!currentMsg?.isEmergency;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col overflow-hidden transition-all duration-1000 ${emergency ? 'bg-red-950 text-white' : (theme === 'dark' ? 'bg-[#0a0a0f] text-white' : 'bg-slate-100 text-slate-900')}`}>

            {/* ── Atmospheric BG ─────────────────────────────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {emergency ? (
                    <>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-900/80 via-red-950 to-black" />
                        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-red-500/20 blur-[120px] animate-pulse" />
                        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-red-600/15 blur-[120px] animate-pulse" />
                    </>
                ) : theme === 'dark' ? (
                    <>
                        <div className="absolute -top-60 -left-40 w-[700px] h-[700px] rounded-full bg-pink-900/20 blur-[160px] animate-pulse" />
                        <div className="absolute -bottom-60 -right-40 w-[700px] h-[700px] rounded-full bg-rose-900/20 blur-[160px] animate-pulse" />
                    </>
                ) : (
                    <>
                        <div className="absolute -top-60 left-0 w-full h-[500px] bg-gradient-to-b from-pink-100/60 to-transparent" />
                    </>
                )}
                {isPlaying && (
                    <div className={`absolute inset-0 ${emergency ? 'bg-red-500/5' : 'bg-pink-500/3'} animate-pulse`} />
                )}
            </div>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="relative z-50 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col -space-y-1">
                        <p className={`text-base font-black tracking-tight ${theme === 'dark' || emergency ? 'text-white' : 'text-slate-800'}`}>
                            {greeting}！
                            <span className={`ml-2 ${theme === 'dark' || emergency ? 'text-pink-400' : 'text-pink-500'}`}>
                                {channelName || '等待识别频道名...'}
                            </span>
                        </p>
                        <div className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase ${theme === 'dark' || emergency ? 'text-white/20' : 'text-slate-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-blue-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                            ROOM · {fullRoomId}
                        </div>
                    </div>

                    <div className="h-8 w-px bg-current opacity-10 mx-2" />

                    <button
                        onClick={() => {
                            const val = !isListening;
                            setIsListening(val);
                            engine.current.isListening = val;
                        }}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-2xl ${isListening ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : (theme === 'dark' || emergency ? 'bg-white/5 border-white/10 text-white/30' : 'bg-white/60 border-white text-slate-400 shadow-sm')}`}
                    >
                        {isListening ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition hover:scale-105 active:scale-95 backdrop-blur-2xl ${theme === 'dark' || emergency ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-white shadow-sm hover:bg-white'}`}
                    >
                        {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-500" />}
                    </button>
                    <button
                        onClick={() => { engine.current.isJoined = false; setIsJoined(false); ttsManager.cancelAll(); }}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition hover:scale-105 active:scale-95 backdrop-blur-2xl ${theme === 'dark' || emergency ? 'bg-white/5 border-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-white/60 border-white text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-500'}`}
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────────── */}
            <main className="relative flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden z-10">
                {currentMsg && currentMsg.text.trim() ? (
                    /* ── Playback view: teleprompter style centered highlight ── */
                    <div className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col pt-[30vh] pb-[40vh]" style={{ scrollBehavior: 'smooth' }}>
                        <div className="max-w-4xl mx-auto w-full flex-none flex flex-col px-8 space-y-2">
                            {/* 班级频道标签 */}
                            {channelName && (
                                <div className="flex justify-center mb-8">
                                    <div className={`flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-black ${emergency
                                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                        : (theme === 'dark' ? 'bg-pink-500/10 border-pink-500/20 text-pink-300' : 'bg-pink-50 border-pink-200 text-pink-600')
                                        }`}>
                                        <Radio size={12} className="animate-pulse" />
                                        <span>{channelName}</span>
                                    </div>
                                </div>
                            )}
                            {/* 音频可视化 */}
                            {isPlaying && (
                                <div className="flex justify-center mb-8">
                                    <ActiveVisualizer isEmergency={emergency} />
                                </div>
                            )}
                            {/* 句子列表：当前句居中高亮 */}
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
                    /* ── Idle view: radar ── */
                    <div className="flex flex-col items-center justify-center gap-12 px-8">
                        <IdleVisualizer isEmergency={false} />
                        <div className="text-center space-y-4">
                            <div className="space-y-1">
                                <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-pink-500/60 animate-pulse mb-8`}>
                                    正在扫描信号...
                                </p>
                                <h2 className={`text-4xl md:text-5xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    信号捕获中...
                                </h2>
                            </div>
                            <div className={`flex items-center gap-3 justify-center text-[10px] font-mono font-bold tracking-widest ${theme === 'dark' ? 'text-white/15' : 'text-slate-400'}`}>
                                <ClockDisplay />
                                <span className="opacity-30">·</span>
                                频道 {fullRoomId}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── History Footer：只在 idle 状态显示 ───────────────────────── */}
            {!isPlaying && !currentMsg && (
                <footer className={`absolute bottom-0 left-0 right-0 z-50 border-t transition-all duration-500 ${showHistory ? 'translate-y-0' : 'translate-y-[calc(100%-44px)]'} ${theme === 'dark' || emergency ? 'border-white/5 bg-black/60 backdrop-blur-3xl' : 'border-black/5 bg-white/70 backdrop-blur-3xl'}`}>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`absolute -top-6 left-1/2 -translate-x-1/2 h-12 px-8 rounded-t-[2rem] flex items-center gap-3 text-sm font-black uppercase tracking-widest transition border border-b-0 ${theme === 'dark' || emergency ? 'bg-black/60 backdrop-blur-3xl border-white/10 text-white/50 hover:text-white' : 'bg-white/70 backdrop-blur-3xl border-black/5 text-slate-500 hover:text-slate-800'}`}
                    >
                        <History size={14} />
                        <span>播报记录</span>
                        {showHistory ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>

                    <div className="max-w-screen-xl mx-auto p-5">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === 'dark' || emergency ? 'text-white/20' : 'text-slate-400'}`}>
                                最近 {receivedHistory.length} 条广播
                            </span>
                            <button
                                onClick={() => { setReceivedHistory([]); localStorage.removeItem('br_receiver_history'); }}
                                className="text-[10px] font-black text-red-500/30 hover:text-red-500 transition px-3 py-1.5 rounded-xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5"
                            >
                                清空记录
                            </button>
                        </div>

                        <div className="flex flex-row gap-4 overflow-x-auto pb-1 snap-x scrollbar-hide min-h-[100px] items-center">
                            {receivedHistory.length === 0 ? (
                                <div className={`w-full text-center py-10 text-xs font-black uppercase tracking-[0.4em] ${theme === 'dark' || emergency ? 'text-white/10' : 'text-slate-300'}`}>
                                    暂无广播记录
                                </div>
                            ) : (
                                [...receivedHistory].reverse().map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMsgQueue(prev => [...prev, m])}
                                        className={`flex-none w-72 p-5 rounded-2xl text-left transition-all border group snap-start ${m.isEmergency
                                            ? 'bg-red-500/10 border-red-500/15 hover:bg-red-500/20 hover:border-red-500/40'
                                            : (theme === 'dark'
                                                ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-violet-500/25'
                                                : 'bg-white/60 border-white hover:bg-white hover:border-violet-300 shadow-sm')
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest font-mono ${theme === 'dark' || emergency ? 'text-white/25' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const ts = parseInt(m.timestamp);
                                                    return isNaN(ts) ? m.timestamp : new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {m.isEmergency && <Zap size={10} className="text-red-400 fill-red-400" />}
                                                <div className={`w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform ${m.isEmergency ? 'bg-red-400' : 'bg-pink-400'}`} />
                                            </div>
                                        </div>
                                        <p className={`text-sm font-semibold line-clamp-2 leading-relaxed transition-colors ${m.isEmergency ? 'text-red-300' : (theme === 'dark' ? 'text-white/60 group-hover:text-pink-300' : 'text-slate-600 group-hover:text-pink-600')}`}>
                                            {m.text}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </footer>
            )}
            {/* ── Activation Overlay ────────────────────────────────────── */}
            {needsActivation && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="max-w-xs w-full text-center space-y-8 p-10">
                        <div className="relative mx-auto w-24 h-24 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 animate-pulse">
                            <Volume2 size={48} />
                            <div className="absolute inset-0 rounded-full border-2 border-pink-500/50 animate-ping" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">激活语音播报</h3>
                            <p className="text-sm text-white/50 leading-relaxed font-medium">
                                由于浏览器安全策略限制，需要您点击下方按钮以建立音频连接。
                            </p>
                        </div>
                        <button
                            onClick={handleActivate}
                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all"
                        >
                            点击激活
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Receiver;

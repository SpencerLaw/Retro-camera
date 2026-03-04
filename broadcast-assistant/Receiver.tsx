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
    const accent = isEmergency ? '#ef4444' : '#8b5cf6';
    const accentAlpha = (a: number) => isEmergency ? `rgba(239,68,68,${a})` : `rgba(139,92,246,${a})`;

    return (
        <div className="relative flex items-center justify-center select-none" style={{ width: 360, height: 360 }}>

            {/* ── Ambient glow ── */}
            <div className="absolute rounded-full blur-[120px] opacity-15 animate-pulse"
                style={{ width: 500, height: 500, background: accent }} />

            {/* ── Ring 1: outermost slow CW ── */}
            <div className="absolute inset-0 rounded-full animate-[spin_80s_linear_infinite]"
                style={{ border: `1px dashed ${accentAlpha(0.18)}` }} />

            {/* ── Ring 2: medium CCW ── */}
            <div className="absolute rounded-full animate-[spin_38s_linear_infinite_reverse]"
                style={{ inset: 18, border: `1px solid ${accentAlpha(0.12)}` }} />

            {/* ── Ring 3: solid inner ── */}
            <div className="absolute rounded-full"
                style={{ inset: 38, border: `1px solid ${accentAlpha(0.08)}` }} />

            {/* ── Crosshair lines ── */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* horizontal */}
                <div className="absolute w-full h-px" style={{ background: `linear-gradient(to right, transparent 0%, ${accentAlpha(0.12)} 20%, ${accentAlpha(0.25)} 50%, ${accentAlpha(0.12)} 80%, transparent 100%)` }} />
                {/* vertical */}
                <div className="absolute h-full w-px" style={{ background: `linear-gradient(to bottom, transparent 0%, ${accentAlpha(0.12)} 20%, ${accentAlpha(0.25)} 50%, ${accentAlpha(0.12)} 80%, transparent 100%)` }} />
            </div>

            {/* ── Radar sweep (comet tail) ── */}
            <div className="absolute rounded-full animate-[spin_3s_linear_infinite]"
                style={{
                    inset: 12,
                    background: `conic-gradient(from 0deg, ${accentAlpha(0)} 0%, ${accentAlpha(0)} 55%, ${accentAlpha(0.3)} 78%, ${accentAlpha(0.8)} 98%, ${accentAlpha(0)} 100%)`,
                    filter: 'blur(1.5px)',
                }} />

            {/* ── Leading edge dot (sweeps with the beam) ── */}
            <div className="absolute animate-[spin_3s_linear_infinite]" style={{ inset: 12 }}>
                <div className="absolute w-3 h-3 rounded-full top-[4px] left-1/2 -translate-x-1/2 shadow-lg"
                    style={{ background: accent, boxShadow: `0 0 10px 4px ${accentAlpha(0.6)}` }} />
            </div>

            {/* ── Orbit tick marks ── */}
            <div className="absolute inset-0 animate-[spin_80s_linear_infinite]">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <div key={deg} className="absolute w-1.5 h-1.5 rounded-full top-[-3px] left-1/2 -translate-x-1/2"
                        style={{
                            background: accentAlpha(0.4),
                            transform: `rotate(${deg}deg) translateY(${180 - 3}px) translateX(-50%)`,
                            transformOrigin: '50% 183px',
                        }} />
                ))}
            </div>

            {/* ── Data readout decorations ── */}
            {['12', '03', '06', '09'].map((label, i) => {
                const positions = [
                    { top: '4px', left: '50%', transform: 'translateX(-50%)' },
                    { top: '50%', right: '4px', transform: 'translateY(-50%)' },
                    { bottom: '4px', left: '50%', transform: 'translateX(-50%)' },
                    { top: '50%', left: '4px', transform: 'translateY(-50%)' },
                ] as const;
                return (
                    <div key={label} className="absolute font-mono text-[8px] font-black tracking-widest"
                        style={{ color: accentAlpha(0.25), ...positions[i] }}>
                        {label}
                    </div>
                );
            })}

            {/* ── Core orb ── */}
            <div className="relative z-10 flex items-center justify-center rounded-full border border-white/10"
                style={{
                    width: 120,
                    height: 120,
                    background: `radial-gradient(circle at 35% 35%, ${accentAlpha(0.8)}, ${accentAlpha(0.5)} 50%, ${accentAlpha(0.3)})`,
                    boxShadow: `0 0 0 1px ${accentAlpha(0.2)}, 0 0 40px 8px ${accentAlpha(0.2)}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}>
                {/* Highlight */}
                <div className="absolute rounded-full bg-white/15 blur-sm" style={{ width: '60%', height: '40%', top: '12%', left: '15%' }} />
                <Signal size={42} className="relative z-10 text-white animate-pulse" style={{ opacity: 0.55 }} />
            </div>
        </div>
    );
});

// ─── Active Visualizer (playing state) ───────────────────────────────────────
const ActiveVisualizer = React.memo(({ isEmergency }: { isEmergency: boolean }) => {
    const bars = isEmergency ? 9 : 7;
    const c = isEmergency
        ? { bar: 'bg-gradient-to-t from-red-600 to-rose-400', shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)]' }
        : { bar: 'bg-gradient-to-t from-violet-600 to-cyan-400', shadow: 'shadow-[0_0_30px_rgba(139,92,246,0.4)]' };

    return (
        <div className={`flex items-end justify-center gap-2 h-24 ${c.shadow}`}>
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    className={`w-2 rounded-full ${c.bar} animate-bounce`}
                    style={{
                        height: `${30 + Math.sin((i / bars) * Math.PI) * 55}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.6 + (i % 3) * 0.2}s`,
                    }}
                />
            ))}
        </div>
    );
});

// ─── Sentence Item ────────────────────────────────────────────────────────────
const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: any) => (
    <div
        ref={isActive ? activeSentenceRef : null}
        className={`py-8 px-4 w-full text-center transition-all duration-700 transform origin-center ${isActive
            ? (isEmergency
                ? 'text-white font-black scale-110'
                : 'text-violet-400 font-black scale-110 drop-shadow-[0_0_40px_rgba(139,92,246,0.5)]')
            : isPast
                ? 'opacity-20 scale-95 blur-[0.5px]'
                : 'opacity-8 scale-90'
            } ${textLength > 300 ? 'text-2xl md:text-4xl' : 'text-4xl md:text-7xl'}`}
    >
        {sentence}
    </div>
));

// ─── Main component ───────────────────────────────────────────────────────────
const Receiver: React.FC<{ isDark: boolean; toggleTheme: () => void; onExit: () => void }> = ({ isDark, toggleTheme, onExit }) => {
    const t = useTranslations();
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room')?.toUpperCase().trim();

    // Core States
    const [fullRoomId, setFullRoomId] = useState(() => roomFromUrl || localStorage.getItem('br_receiver_room') || '');
    const [isJoined, setIsJoined] = useState(!!roomFromUrl || !!localStorage.getItem('br_receiver_room'));
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(() => localStorage.getItem('br_listening') !== 'false');
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' as DialogType, onConfirm: () => { } });
    const [showHistory, setShowHistory] = useState(false);

    // Engine Control Ref
    const engine = useRef({ lastId: '', isJoined: isJoined, isListening: isListening, pId: 0 });
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => { engine.current.isJoined = isJoined; }, [isJoined]);
    useEffect(() => { engine.current.isListening = isListening; localStorage.setItem('br_listening', isListening ? 'true' : 'false'); }, [isListening]);

    useEffect(() => {
        const saved = localStorage.getItem('br_receiver_history');
        if (saved) try { setReceivedHistory(JSON.parse(saved).slice(-20)); } catch (e) { }
    }, []);

    const splitSentences = useCallback((text: string) => {
        if (!text) return [];
        return text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g)?.map(p => p.trim()).filter(p => p.length > 0) || [text];
    }, []);

    const runPlayback = useCallback(async (msg: Message) => {
        ttsManager.cancelAll();
        const pId = ttsManager.getActivePlaybackId();
        engine.current.pId = pId;
        setIsPlaying(true);
        const sentences = splitSentences(msg.text);
        let repeats = (msg.repeatCount === -1 || msg.repeatCount! > 50) ? 99 : (msg.repeatCount || 1);

        try {
            while (repeats > 0 && ttsManager.getActivePlaybackId() === pId) {
                for (let i = 0; i < sentences.length; i++) {
                    if (ttsManager.getActivePlaybackId() !== pId) break;
                    setActiveSentenceIndex(i);
                    await new Promise(r => setTimeout(r, 100));
                    await ttsManager.speak(sentences[i], {
                        engine: 'edge',
                        voice: msg.voice || 'zh-CN-XiaoxiaoNeural',
                        rate: msg.isEmergency ? 0.85 : 1.0,
                        volume: 1.5
                    });
                    if (ttsManager.getActivePlaybackId() !== pId) break;
                    await new Promise(r => setTimeout(r, 300));
                }
                repeats--;
                if (repeats > 0 && ttsManager.getActivePlaybackId() === pId) {
                    setActiveSentenceIndex(-1);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        } finally {
            if (ttsManager.getActivePlaybackId() === pId) {
                setIsPlaying(false);
                setActiveSentenceIndex(-1);
            }
        }
    }, [splitSentences]);

    useEffect(() => {
        if (!isJoined) return;
        const poll = async () => {
            if (!engine.current.isJoined) return;
            try {
                const r = await fetch(`/api/broadcast/fetch?code=${fullRoomId.toUpperCase()}&t=${Date.now()}`);
                if (r.ok) {
                    const data = await r.json();
                    const msg = data.message as Message;
                    if (msg && msg.id !== engine.current.lastId) {
                        engine.current.lastId = msg.id;
                        setCurrentMsg(msg);
                        setReceivedHistory(prev => {
                            const next = [...prev, msg].slice(-20);
                            setTimeout(() => localStorage.setItem('br_receiver_history', JSON.stringify(next)), 0);
                            return next;
                        });
                        if (engine.current.isListening) runPlayback(msg);
                    } else if (!msg && !isPlaying) {
                        setCurrentMsg(null);
                    }
                }
            } catch (e) { }
            if (engine.current.isJoined) setTimeout(poll, 3000);
        };
        poll();
        ttsManager.startSilentLoop();
        return () => { engine.current.isJoined = false; ttsManager.cancelAll(); };
    }, [isJoined, fullRoomId, runPlayback]);

    useEffect(() => {
        if (activeRef.current) activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeSentenceIndex]);

    const sentences = useMemo(() => splitSentences(currentMsg?.text || ''), [currentMsg?.text, splitSentences]);

    // ── Join Screen ──────────────────────────────────────────────────────────
    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center p-6 transition-colors duration-1000 ${isDark ? 'bg-[#0a0a0f]' : 'bg-slate-100'}`}>
                {/* bg blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/10 blur-[160px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[160px] rounded-full animate-pulse" />
                </div>

                <div className={`relative z-10 w-full max-w-md p-10 rounded-[3rem] border backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-white'}`}>
                    {/* Icon */}
                    <div className="flex justify-center mb-10">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_12px_40px_rgba(139,92,246,0.4)] rotate-6">
                                <Tv size={44} />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                                <Radio size={14} className="text-white animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-8 space-y-2">
                        <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>接入课堂广播</h1>
                        <p className={`text-sm font-medium ${isDark ? 'text-white/30' : 'text-slate-400'}`}>输入您的教室代码以连接至广播频道</p>
                    </div>

                    <div className="space-y-4">
                        <div className={`rounded-2xl p-1 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                            <input
                                type="text"
                                value={fullRoomId}
                                onChange={e => setFullRoomId(e.target.value.toUpperCase())}
                                className={`w-full bg-transparent p-5 text-3xl font-black text-center outline-none uppercase tracking-[0.3em] ${isDark ? 'text-white placeholder:text-white/15' : 'text-slate-900 placeholder:text-slate-300'}`}
                                placeholder="XXXXXX"
                                maxLength={8}
                            />
                        </div>
                        <button
                            onClick={() => { if (fullRoomId) { setIsJoined(true); localStorage.setItem('br_receiver_room', fullRoomId); } }}
                            className="w-full py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_12px_32px_rgba(139,92,246,0.35)] flex items-center justify-center gap-3"
                        >
                            <Radio size={24} /> 进入教室
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Classroom Screen ─────────────────────────────────────────────────────
    const emergency = !!currentMsg?.isEmergency;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col overflow-hidden transition-all duration-1000 ${emergency ? 'bg-red-950 text-white' : (isDark ? 'bg-[#0a0a0f] text-white' : 'bg-slate-100 text-slate-900')}`}>

            {/* ── Atmospheric BG ─────────────────────────────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {emergency ? (
                    <>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-900/80 via-red-950 to-black" />
                        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-red-500/20 blur-[120px] animate-pulse" />
                        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-red-600/15 blur-[120px] animate-pulse" />
                    </>
                ) : isDark ? (
                    <>
                        <div className="absolute -top-60 -left-40 w-[700px] h-[700px] rounded-full bg-violet-900/20 blur-[160px] animate-pulse" />
                        <div className="absolute -bottom-60 -right-40 w-[700px] h-[700px] rounded-full bg-blue-900/20 blur-[160px] animate-pulse" />
                    </>
                ) : (
                    <>
                        <div className="absolute -top-60 left-0 w-full h-[500px] bg-gradient-to-b from-violet-100/60 to-transparent" />
                    </>
                )}
                {isPlaying && (
                    <div className={`absolute inset-0 ${emergency ? 'bg-red-500/5' : 'bg-violet-500/3'} animate-pulse`} />
                )}
            </div>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="relative z-50 flex items-center justify-between px-6 py-4">
                {/* Left: room badge + clock + mute */}
                <div className="flex items-center gap-3">
                    {/* Room badge */}
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-2xl ${isDark || emergency ? 'bg-white/5 border-white/10' : 'bg-white/60 border-white shadow-sm'}`}>
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-blue-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                        <Radio size={16} className={emergency ? 'text-red-400' : 'text-violet-400'} />
                        <span className={`text-base font-black tracking-[0.2em] ${isDark || emergency ? 'text-white' : 'text-slate-800'}`}>{fullRoomId}</span>
                    </div>
                    {/* Clock */}
                    <div className={`px-4 py-3 rounded-2xl border backdrop-blur-xl font-mono text-sm font-bold ${isDark || emergency ? 'bg-white/5 border-white/10 text-white/50' : 'bg-white/60 border-white text-slate-500 shadow-sm'}`}>
                        <ClockDisplay />
                    </div>
                    {/* Mute toggle */}
                    <button
                        onClick={() => setIsListening(!isListening)}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-2xl ${isListening ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : (isDark || emergency ? 'bg-white/5 border-white/10 text-white/30' : 'bg-white/60 border-white text-slate-400 shadow-sm')}`}
                    >
                        {isListening ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                </div>

                {/* Right: theme + exit */}
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition hover:scale-105 active:scale-95 backdrop-blur-2xl ${isDark || emergency ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-white shadow-sm hover:bg-white'}`}
                    >
                        {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-500" />}
                    </button>
                    <button
                        onClick={() => { setIsJoined(false); ttsManager.cancelAll(); }}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition hover:scale-105 active:scale-95 backdrop-blur-2xl ${isDark || emergency ? 'bg-white/5 border-white/10 text-white/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-white/60 border-white text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-500'}`}
                    >
                        <X size={18} />
                    </button>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────────────── */}
            <main className="relative flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden z-10 px-8">
                {currentMsg ? (
                    /* ── Playing: scrolling sentences ── */
                    <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col">
                        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center py-8">
                            {/* Live EQ bars */}
                            {isPlaying && (
                                <div className="flex justify-center mb-10">
                                    <ActiveVisualizer isEmergency={emergency} />
                                </div>
                            )}
                            {sentences.map((s, i) => (
                                <SentenceItem
                                    key={`${currentMsg.id}-${i}`}
                                    sentence={s}
                                    isActive={i === activeSentenceIndex}
                                    isPast={activeSentenceIndex !== -1 && i < activeSentenceIndex}
                                    isEmergency={emergency}
                                    textLength={currentMsg.text.length}
                                    activeSentenceRef={activeRef}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ── Idle: radar + status ── */
                    <div className="flex flex-col items-center justify-center gap-10">
                        <IdleVisualizer isEmergency={false} />
                        <div className="text-center space-y-3">
                            <p className={`text-sm font-black uppercase tracking-[0.5em] ${isDark ? 'text-white/15' : 'text-slate-400/60'} animate-pulse`}>
                                等待广播信号
                            </p>
                            <div className={`flex items-center gap-3 justify-center text-[10px] font-mono font-bold tracking-widest ${isDark ? 'text-white/10' : 'text-slate-300'}`}>
                                <span className="inline-block w-12 h-px bg-current" />
                                CHANNEL · {fullRoomId} · ACTIVE
                                <span className="inline-block w-12 h-px bg-current" />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── History Footer ───────────────────────────────────────────── */}
            <footer className={`relative z-50 border-t transition-all duration-500 ${showHistory ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'} ${isDark || emergency ? 'border-white/5 bg-black/30 backdrop-blur-2xl' : 'border-black/5 bg-white/40 backdrop-blur-2xl'}`}>
                {/* Collapse toggle pill */}
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`absolute -top-5 left-1/2 -translate-x-1/2 h-10 px-6 rounded-t-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition border border-b-0 ${isDark || emergency ? 'bg-black/30 backdrop-blur-2xl border-white/5 text-white/30 hover:text-white/60' : 'bg-white/60 backdrop-blur-2xl border-black/5 text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={12} />
                    <span>播报记录</span>
                    {showHistory ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>

                <div className="max-w-screen-xl mx-auto p-5">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark || emergency ? 'text-white/20' : 'text-slate-400'}`}>
                            最近 {receivedHistory.length} 条广播
                        </span>
                        <button
                            onClick={() => { setReceivedHistory([]); localStorage.removeItem('br_receiver_history'); }}
                            className="text-[10px] font-black text-red-500/30 hover:text-red-500 transition px-3 py-1.5 rounded-xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5"
                        >
                            清空记录
                        </button>
                    </div>

                    {/* History cards */}
                    <div className="flex flex-row gap-4 overflow-x-auto pb-1 snap-x scrollbar-hide min-h-[100px] items-center">
                        {receivedHistory.length === 0 ? (
                            <div className={`w-full text-center py-10 text-xs font-black uppercase tracking-[0.4em] ${isDark || emergency ? 'text-white/10' : 'text-slate-300'}`}>
                                暂无广播记录
                            </div>
                        ) : (
                            [...receivedHistory].reverse().map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => runPlayback(m)}
                                    className={`flex-none w-72 p-5 rounded-2xl text-left transition-all border group snap-start ${m.isEmergency
                                        ? 'bg-red-500/10 border-red-500/15 hover:bg-red-500/20 hover:border-red-500/40'
                                        : (isDark
                                            ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-violet-500/25'
                                            : 'bg-white/60 border-white hover:bg-white hover:border-violet-300 shadow-sm')
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest font-mono ${isDark || emergency ? 'text-white/25' : 'text-slate-400'}`}>
                                            {new Date(parseInt(m.timestamp) || Date.now()).toLocaleTimeString()}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {m.isEmergency && <Zap size={10} className="text-red-400 fill-red-400" />}
                                            <div className={`w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform ${m.isEmergency ? 'bg-red-400' : 'bg-violet-400'}`} />
                                        </div>
                                    </div>
                                    <p className={`text-sm font-semibold line-clamp-2 leading-relaxed transition-colors ${m.isEmergency ? 'text-red-300' : (isDark ? 'text-white/60 group-hover:text-violet-300' : 'text-slate-600 group-hover:text-violet-600')}`}>
                                        {m.text}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </footer>

            <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} onCancel={() => setDialog({ ...dialog, isOpen: false })} isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
        </div>
    );
};

export default Receiver;

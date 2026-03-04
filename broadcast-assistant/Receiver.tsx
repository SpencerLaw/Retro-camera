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

const RadarScanner = React.memo(({ isPlaying, isEmergency }: { isPlaying: boolean; isEmergency: boolean }) => {
    return (
        <div className="relative flex items-center justify-center w-72 h-72 md:w-96 md:h-96">
            {/* Background Glow */}
            <div className={`absolute -inset-20 blur-[100px] opacity-20 rounded-full ${isEmergency ? 'bg-red-600' : 'bg-blue-600'} animate-pulse`} />

            {/* Outer Rotating Circles */}
            <div className={`absolute inset-0 rounded-full border border-dashed ${isEmergency ? 'border-red-500/20' : 'border-blue-500/20'} animate-[spin_60s_linear_infinite]`} />
            <div className={`absolute inset-6 rounded-full border-2 border-dashed ${isEmergency ? 'border-red-400/10' : 'border-blue-400/10'} animate-[spin_30s_linear_infinite_reverse] opacity-50`} />
            <div className={`absolute inset-12 rounded-full border border-white/5 animate-[spin_40s_linear_infinite]`} />

            {/* Glass Rings */}
            <div className={`absolute inset-16 rounded-full border border-white/10 backdrop-blur-[2px] shadow-inner`} />
            <div className={`absolute inset-24 rounded-full border border-white/5`} />

            {/* Dynamic Scanning Beam */}
            {!isPlaying && (
                <div className="absolute inset-4 rounded-full animate-[spin_3s_linear_infinite]"
                    style={{
                        background: `conic-gradient(from 0deg, transparent 0%, transparent 70%, ${isEmergency ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'} 100%)`,
                        filter: 'blur(2px)'
                    }} />
            )}

            {/* Core Shield */}
            <div className={`relative z-10 w-36 h-36 md:w-48 md:h-48 rounded-full flex items-center justify-center overflow-hidden transition-all duration-1000 ${isEmergency
                ? 'bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
                : 'bg-gradient-to-br from-blue-500 to-indigo-700 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
                } ${isPlaying ? 'scale-110' : 'scale-100 opacity-90'} border border-white/20`}>
                {/* Internal Reflections */}
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/20 rotate-45 blur-xl" />

                <Signal size={isPlaying ? 80 : 64} className={`text-white transition-all duration-700 ${isPlaying ? 'animate-bounce drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'animate-pulse opacity-60'}`} />
            </div>

            {/* Active Particles */}
            {isPlaying && (
                <div className="absolute inset-[-20%]">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={`absolute w-2 h-2 rounded-full ${isEmergency ? 'bg-red-400' : 'bg-blue-400'} animate-ping`}
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.5}s`
                            }} />
                    ))}
                </div>
            )}
        </div>
    );
});

const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: any) => (
    <div
        ref={isActive ? activeSentenceRef : null}
        className={`py-8 px-4 w-full text-center transition-all duration-700 transform origin-center ${isActive ? (isEmergency ? 'text-white font-black scale-110' : 'text-blue-600 dark:text-cyan-400 font-black scale-110 drop-shadow-[0_0_30px_rgba(37,99,235,0.3)]') : isPast ? 'opacity-30 scale-95 blur-[0.5px]' : 'opacity-10 scale-90'} ${textLength > 300 ? 'text-2xl md:text-4xl' : 'text-4xl md:text-7xl'}`}
    >
        {sentence}
    </div>
));

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
    const [showHistory, setShowHistory] = useState(true);

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

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center p-6 transition-colors duration-1000 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`}>
                <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
                </div>
                <GlassCard className="max-w-xl w-full p-12 rounded-[3.5rem] relative z-10 border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">
                    <div className="flex flex-col items-center text-center space-y-10">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl rotate-3">
                            <Tv size={48} />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight dark:text-white">欢迎，接入点已就绪</h2>
                        <div className="w-full space-y-6">
                            <input type="text" value={fullRoomId} onChange={e => setFullRoomId(e.target.value.toUpperCase())} className="w-full bg-black/5 dark:bg-white/5 border-2 border-transparent focus:border-blue-500 rounded-3xl p-8 text-4xl font-black text-center outline-none transition dark:text-white uppercase tracking-[0.2em] shadow-inner" placeholder="ROOM" maxLength={8} />
                            <button onClick={() => { if (fullRoomId) { setIsJoined(true); localStorage.setItem('br_receiver_room', fullRoomId); } }} className="w-full py-8 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-4">
                                <Radio size={32} /> 进入教室
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col overflow-hidden transition-colors duration-1000 ${currentMsg?.isEmergency ? 'bg-red-600 text-white' : (isDark ? 'bg-[#050505] text-white' : 'bg-[#F5F5F7] text-black')}`}>
            {/* Atmospheric Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
                <div className={`absolute top-0 left-0 w-full h-full ${isDark ? 'bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20' : 'bg-gradient-to-br from-blue-50 via-white to-pink-50'}`} />
                {isPlaying && (
                    <div className={`absolute inset-0 ${currentMsg?.isEmergency ? 'bg-red-500/10' : 'bg-blue-500/5'} animate-pulse`} />
                )}
            </div>

            {/* Top Navigation */}
            <header className="relative z-50 p-8 flex justify-between items-center bg-gradient-to-b from-black/5 to-transparent">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-white/10 dark:bg-black/40 border border-white/20 px-8 py-4 rounded-[2rem] backdrop-blur-2xl shadow-xl">
                        <Radio size={24} className={isJoined ? 'text-green-500 animate-pulse' : 'text-gray-400'} />
                        <span className="text-2xl font-black tracking-widest">{fullRoomId}</span>
                        <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`} />
                    </div>
                    <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl font-mono text-lg font-bold opacity-80 shadow-inner">
                        <ClockDisplay />
                    </div>
                    <button onClick={() => setIsListening(!isListening)} className={`w-16 h-16 rounded-full border border-white/20 flex items-center justify-center transition-all duration-500 backdrop-blur-2xl hover:scale-110 active:scale-95 ${isListening ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white/5 text-gray-400'}`}>
                        {isListening ? <Volume2 size={32} /> : <VolumeX size={32} />}
                    </button>
                </div>
                <div className="flex gap-4">
                    <button onClick={toggleTheme} className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition backdrop-blur-2xl">
                        {isDark ? <Sun size={24} className="text-orange-400" /> : <Moon size={24} />}
                    </button>
                    <button onClick={() => { setIsJoined(false); ttsManager.cancelAll(); }} className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition backdrop-blur-2xl text-gray-400">
                        <X size={24} />
                    </button>
                </div>
            </header>

            {/* Main Content Area - FLEX GROW to push history down */}
            <main className="relative flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden z-10 px-10 py-20 pb-10">
                {currentMsg ? (
                    <div className="w-full h-full overflow-y-auto scrollbar-hide px-4 flex flex-col">
                        <div className="max-w-6xl mx-auto py-10 pb-32 w-full flex-1 flex flex-col justify-center">
                            {sentences.map((s, i) => (
                                <SentenceItem key={`${currentMsg.id}-${i}`} sentence={s} isActive={i === activeSentenceIndex} isPast={activeSentenceIndex !== -1 && i < activeSentenceIndex} isEmergency={!!currentMsg.isEmergency} textLength={currentMsg.text.length} activeSentenceRef={activeRef} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-12 scale-[0.85] md:scale-100 lg:scale-110 transition-transform duration-700">
                        <RadarScanner isPlaying={false} isEmergency={false} />
                        <div className="space-y-4 text-center mt-4">
                            <p className="text-3xl md:text-5xl font-black tracking-[0.4em] uppercase italic opacity-20 animate-pulse bg-gradient-to-r from-transparent via-current to-transparent bg-clip-text">正在监听下行链路</p>
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-[1px] w-8 bg-current opacity-20" />
                                <p className="text-xs font-mono font-bold opacity-30 tracking-widest uppercase">Secure Channel Active // {fullRoomId}</p>
                                <div className="h-[1px] w-8 bg-current opacity-20" />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* History Section - FIXED at bottom but part of layout flow */}
            <footer className={`relative z-50 p-6 bg-black/5 backdrop-blur-md border-t border-white/10 transition-all duration-500 ${showHistory ? 'translate-y-0' : 'translate-y-[85%]'}`}>
                {/* Toggle Button */}
                <button onClick={() => setShowHistory(!showHistory)} className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/10 backdrop-blur-xl border border-white/20 border-b-0 rounded-t-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    {showHistory ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>

                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6 px-4">
                        <div className="flex items-center gap-3">
                            <History size={18} className="text-blue-500" />
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] opacity-60">播报历史轨迹</h4>
                        </div>
                        <button onClick={() => { setReceivedHistory([]); localStorage.removeItem('br_receiver_history'); }} className="text-[10px] font-black text-red-500/40 hover:text-red-500 transition px-4 py-2 rounded-full border border-red-500/10 hover:bg-red-500/5">重置历史记录</button>
                    </div>

                    <div className="flex flex-row gap-6 overflow-x-auto pb-4 px-2 snap-x custom-scrollbar min-h-[120px]">
                        {receivedHistory.length === 0 ? (
                            <div className="py-12 px-6 opacity-10 italic w-full text-center font-black tracking-[0.5em] text-lg uppercase">当前暂无数据包</div>
                        ) : (
                            [...receivedHistory].reverse().map(m => (
                                <button key={m.id} onClick={() => runPlayback(m)} className="flex-none w-80 p-6 bg-white/5 dark:bg-white/5 rounded-[2rem] text-left hover:bg-blue-500/5 dark:hover:bg-white/10 transition-all border border-white/5 hover:border-blue-500/30 group snap-start shadow-xl">
                                    <div className="flex justify-between items-center mb-3 font-mono text-[10px] opacity-40 font-black tracking-widest uppercase">
                                        {new Date(parseInt(m.timestamp) || Date.now()).toLocaleTimeString()}
                                        {m.isEmergency && <Zap size={12} className="text-red-500 fill-red-500" />}
                                    </div>
                                    <div className="text-base font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{m.text}</div>
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

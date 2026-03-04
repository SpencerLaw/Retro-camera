import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, AlertCircle, Tv, Signal, X, History, Clock, Radio, Zap, Moon, Sun, Maximize, Minimize } from 'lucide-react';
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

const BackgroundAmbience = React.memo(({ isEmergency, isDark }: { isEmergency: boolean; isDark: boolean }) => {
    if (isEmergency) return <div className="absolute inset-0 z-0 bg-red-600/30 animate-pulse pointer-events-none" />;
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
            <div className={`absolute top-0 left-0 w-full h-full ${isDark ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20' : 'bg-gradient-to-br from-blue-100 to-pink-100'}`} />
            <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-purple-400/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
    );
});

const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: any) => (
    <div
        ref={isActive ? activeSentenceRef : null}
        className={`py-6 w-full text-center transition-all duration-500 transform ${isActive ? (isEmergency ? 'text-white font-black scale-110' : 'text-blue-600 dark:text-cyan-400 font-black scale-110 drop-shadow-lg') : isPast ? 'opacity-30 blur-[1px]' : 'opacity-10'} ${textLength > 300 ? 'text-2xl md:text-3xl' : textLength > 100 ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'}`}
    >
        {sentence}
    </div>
));

const Receiver: React.FC<{ isDark: boolean; toggleTheme: () => void; onExit: () => void }> = ({ isDark, toggleTheme, onExit }) => {
    const t = useTranslations();
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room')?.toUpperCase().trim();

    // States
    const [fullRoomId, setFullRoomId] = useState(() => roomFromUrl || localStorage.getItem('br_receiver_room') || '');
    const [isJoined, setIsJoined] = useState(!!roomFromUrl || !!localStorage.getItem('br_receiver_room'));
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(() => localStorage.getItem('br_listening') !== 'false');
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' as DialogType, onConfirm: () => {} });

    // Internal Control Ref
    const engine = useRef({
        lastId: '',
        isJoined: isJoined,
        isListening: isListening,
        pId: 0,
    });
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => { engine.current.isJoined = isJoined; }, [isJoined]);
    useEffect(() => { 
        engine.current.isListening = isListening;
        localStorage.setItem('br_listening', isListening ? 'true' : 'false');
    }, [isListening]);

    useEffect(() => {
        const saved = localStorage.getItem('br_receiver_history');
        if (saved) try { setReceivedHistory(JSON.parse(saved).slice(-20)); } catch(e){}
    }, []);

    // Improved Sentence Splitting
    const splitSentences = useCallback((text: string) => {
        if (!text) return [];
        // Split by major punctuation while keeping them
        const parts = text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g);
        return parts ? parts.map(p => p.trim()).filter(p => p.length > 0) : [text];
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
                    await new Promise(r => setTimeout(r, 50));
                    
                    await ttsManager.speak(sentences[i], {
                        engine: 'edge',
                        voice: msg.voice || 'zh-CN-XiaoxiaoNeural',
                        rate: msg.isEmergency ? 0.85 : 1.0,
                        volume: 1.5
                    });
                    
                    if (ttsManager.getActivePlaybackId() !== pId) break;
                    await new Promise(r => setTimeout(r, 200)); // Gap
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
            } catch (e) {}
            if (engine.current.isJoined) setTimeout(poll, 3000);
        };
        poll();
        ttsManager.startSilentLoop();
        return () => { engine.current.isJoined = false; ttsManager.cancelAll(); };
    }, [isJoined, fullRoomId, runPlayback]);

    useEffect(() => {
        if (activeRef.current) activeRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, [activeSentenceIndex]);

    const handleStart = () => {
        if (!fullRoomId.trim()) return;
        setIsJoined(true);
        localStorage.setItem('br_receiver_room', fullRoomId.toUpperCase());
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const sentences = useMemo(() => splitSentences(currentMsg?.text || ''), [currentMsg?.text, splitSentences]);

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`}>
                <BackgroundAmbience isEmergency={false} isDark={isDark} />
                <GlassCard className="max-w-2xl w-full p-12 rounded-[3rem] relative z-10 border border-white/20 shadow-2xl animate-in zoom-in duration-500">
                    <button onClick={onExit} className="absolute top-10 left-10 p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
                        <X size={24} className="text-gray-400" />
                    </button>
                    <div className="flex flex-col items-center text-center space-y-10">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl transform rotate-3">
                            <Tv size={48} />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-4xl font-black tracking-tight dark:text-white">{t('broadcast.receiver.joinChannel')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">输入教室房间码，开始接收广播</p>
                        </div>
                        <div className="w-full space-y-6">
                            <input type="text" value={fullRoomId} onChange={e => setFullRoomId(e.target.value.toUpperCase())} className="w-full bg-black/5 dark:bg-white/5 border-2 border-transparent focus:border-blue-500 rounded-[2rem] p-8 text-4xl font-black text-center outline-none transition dark:text-white uppercase tracking-widest shadow-inner" placeholder="0000" maxLength={8} />
                            <button onClick={handleStart} className="w-full py-8 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-2xl hover:scale-[1.02] active:scale-95 transition shadow-xl shadow-blue-500/30 flex items-center justify-center gap-4">
                                <Radio size={32} className="animate-pulse" />
                                {t('broadcast.receiver.initializeLive')}
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-1000 ${currentMsg?.isEmergency ? 'bg-red-600 text-white' : (isDark ? 'bg-[#050505] text-white' : 'bg-[#F5F5F7] text-black')}`}>
            <BackgroundAmbience isEmergency={!!currentMsg?.isEmergency} isDark={isDark} />
            
            <div className="p-8 flex justify-between items-center bg-transparent relative z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-white/10 dark:bg-black/20 border border-white/20 px-8 py-4 rounded-3xl backdrop-blur-xl shadow-lg">
                        <Radio size={24} className={isJoined ? 'text-green-500 animate-pulse' : 'text-gray-400'} />
                        <span className="text-2xl font-black tracking-widest">{fullRoomId}</span>
                        <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`} />
                    </div>
                    <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md font-mono text-lg font-bold opacity-80 shadow-sm">
                        <ClockDisplay />
                    </div>
                    <button onClick={() => setIsListening(!isListening)} className={`w-16 h-16 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 backdrop-blur-xl hover:scale-110 active:scale-95 ${isListening ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/5 text-gray-400'}`}>
                        {isListening ? <Volume2 size={32} /> : <VolumeX size={32} />}
                    </button>
                </div>
                <div className="flex gap-4">
                    <button onClick={toggleTheme} className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition backdrop-blur-md">
                        {isDark ? <Sun size={24} className="text-orange-400" /> : <Moon size={24} />}
                    </button>
                    <button onClick={toggleFullscreen} className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition backdrop-blur-md text-gray-400">
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                    <button onClick={() => { setIsJoined(false); localStorage.removeItem('br_receiver_room'); ttsManager.cancelAll(); }} className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition backdrop-blur-md text-gray-400">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-10 overflow-hidden relative z-10">
                {currentMsg ? (
                    <div className="w-full h-full overflow-y-auto scrollbar-hide px-4">
                        <div className="max-w-6xl mx-auto py-40 pb-[300px]">
                            {sentences.map((s, i) => (
                                <SentenceItem key={i} sentence={s} isActive={i === activeSentenceIndex} isPast={activeSentenceIndex !== -1 && i < activeSentenceIndex} isEmergency={!!currentMsg.isEmergency} textLength={currentMsg.text.length} activeSentenceRef={activeRef} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-10">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500/20 animate-[spin_30s_linear_infinite]" />
                            <div className="m-10 w-48 h-48 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-2xl shadow-inner">
                                <Signal size={80} className="opacity-20 animate-pulse text-blue-500" />
                            </div>
                        </div>
                        <p className="text-4xl md:text-6xl font-black tracking-[0.3em] uppercase italic opacity-10 animate-pulse">SIGNAL SEARCHING</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-10 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
                <div className="w-[95vw] max-w-6xl pointer-events-auto">
                    <GlassCard className="p-6 rounded-[2.5rem] bg-white/80 dark:bg-black/60 border border-white/20 shadow-2xl backdrop-blur-2xl overflow-hidden">
                        <div className="flex items-center justify-between mb-4 px-4">
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-50 flex items-center gap-2"><History size={16} /> {t('broadcast.sender.timeline')}</h4>
                            <div className="h-[1px] flex-1 bg-white/10 mx-6" />
                            <button onClick={() => { setReceivedHistory([]); localStorage.removeItem('br_receiver_history'); }} className="text-[10px] font-extrabold text-red-500/60 hover:text-red-500 transition px-4 py-2 rounded-full hover:bg-red-500/10">CLEAR HISTORY</button>
                        </div>
                        <div className="flex flex-row gap-4 overflow-x-auto pb-2 px-2 snap-x custom-scrollbar">
                            {receivedHistory.length === 0 ? (
                                <div className="py-10 px-6 opacity-20 italic w-full text-center font-bold tracking-widest text-sm">NO BROADCAST LOGS</div>
                            ) : (
                                [...receivedHistory].reverse().map(m => (
                                    <button key={m.id} onClick={() => runPlayback(m)} className="flex-none w-72 p-5 bg-white dark:bg-white/5 rounded-3xl text-left hover:bg-blue-500/5 dark:hover:bg-white/10 transition-all border border-transparent hover:border-blue-500/20 group snap-start shadow-sm">
                                        <div className="flex justify-between items-center mb-2 font-mono text-[10px] opacity-40 font-bold tracking-tighter uppercase">
                                            {new Date(parseInt(m.timestamp) || Date.now()).toLocaleTimeString()}
                                            {m.isEmergency && <Zap size={10} className="text-red-500 fill-red-500" />}
                                        </div>
                                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{m.text}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>

            <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} onCancel={() => setDialog({...dialog, isOpen: false})} isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
        </div>
    );
};

export default Receiver;

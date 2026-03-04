import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, AlertCircle, Tv, Signal, Wifi, X, RefreshCw, History, Clock, Radio } from 'lucide-react';
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

const BackgroundAmbience = React.memo(({ isEmergency }: { isDark: boolean; isEmergency: boolean }) => {
    if (!isEmergency) return null;
    return <div className="absolute inset-0 z-0 bg-red-600/20 animate-pulse pointer-events-none" />;
});
BackgroundAmbience.displayName = 'BackgroundAmbience';

const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: { sentence: string, isActive: boolean, isPast: boolean, isEmergency: boolean, textLength: number, activeSentenceRef: React.RefObject<HTMLDivElement> }) => {
    return (
        <div
            ref={isActive ? activeSentenceRef : null}
            className={`relative block py-4 md:py-6 w-full break-words select-none text-center transition-all duration-300 ${isActive ? (isEmergency ? 'text-white font-black scale-105' : 'text-blue-500 dark:text-cyan-400 font-black scale-105') : isPast ? 'opacity-30' : 'opacity-10'} ${textLength > 300 ? 'text-lg md:text-2xl' : textLength > 100 ? 'text-xl md:text-4xl' : 'text-3xl md:text-7xl'}`}
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

    // --- 1. All States ---
    const [fullRoomId, setFullRoomId] = useState(() => urlRoom || localStorage.getItem('br_receiver_room') || '');
    const [isJoined, setIsJoined] = useState(() => !!urlRoom || !!localStorage.getItem('br_receiver_room'));
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [syncedChannelName, setSyncedChannelName] = useState(() => {
        const saved = localStorage.getItem(`br_synced_name_${localStorage.getItem('br_receiver_room') || ''}`);
        return saved || '';
    });
    const [volumeBoost] = useState(() => parseFloat(localStorage.getItem('br_volume_boost') || '1.5'));
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(() => {
        const saved = localStorage.getItem('br_listening');
        return saved === null ? true : saved !== 'false';
    });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>(() => {
        try {
            const saved = localStorage.getItem('br_receiver_history');
            return saved ? JSON.parse(saved).slice(-30) : [];
        } catch (e) { return []; }
    });
    const [needsInteraction, setNeedsInteraction] = useState(false);
    const [receiverStatus, setReceiverStatus] = useState<'idle' | 'listening' | 'playing' | 'error'>('listening');
    const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; type: DialogType; onConfirm: () => void; }>({
        isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { }
    });

    // --- 2. All Refs ---
    const isPlayingRef = useRef(false);
    const isListeningRef = useRef(isListening);
    const lastPlayedId = useRef<string | null>(null);
    const pollingTimer = useRef<NodeJS.Timeout | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeSentenceRef = useRef<HTMLDivElement>(null);
    const isUserScrollingRef = useRef(false);
    const rescueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingPlayouts = useRef<number>(0);

    // Sync refs with state
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { 
        isListeningRef.current = isListening; 
        localStorage.setItem('br_listening', isListening ? 'true' : 'false');
    }, [isListening]);

    // --- 3. Callbacks ---
    const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
    const openDialog = (title: string, message: string, type: DialogType, onConfirm: () => void) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

    const saveHistory = useCallback((history: Message[]) => {
        try { localStorage.setItem('br_receiver_history', JSON.stringify(history.slice(-30))); } catch (e) { }
    }, []);

    const scrollToActive = useCallback(() => {
        if (activeSentenceRef.current && !isUserScrollingRef.current) {
            activeSentenceRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
    }, []);

    const speak = useCallback(async (text: string, isEmergency: boolean, repeatCount: number = 1, id: string, voiceOverride?: string) => {
        if (lastPlayedId.current === id && isPlayingRef.current) return;
        
        ttsManager.cancelAll();
        const currentPlaybackId = ttsManager.getActivePlaybackId();
        lastPlayedId.current = id;
        
        if (fullRoomId) localStorage.setItem(`br_last_played_id_${fullRoomId.toUpperCase()}`, id);

        pendingPlayouts.current = (repeatCount === -1 || repeatCount > 100) ? 999 : Math.max(1, repeatCount);
        setIsPlaying(true);
        setReceiverStatus('playing');

        const playMessageCycles = async () => {
            const currentSentences = text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [text];
            if (currentSentences.length === 0) return;
            
            try {
                while (pendingPlayouts.current > 0 || pendingPlayouts.current === 999) {
                    if (ttsManager.getActivePlaybackId() !== currentPlaybackId) break;

                    for (let i = 0; i < currentSentences.length; i++) {
                        if (ttsManager.getActivePlaybackId() !== currentPlaybackId) break;
                        
                        await new Promise(r => setTimeout(r, 50));
                        setActiveSentenceIndex(i);
                        
                        const sentence = currentSentences[i].trim();
                        if (!sentence) continue;

                        const ttsOptions = {
                            engine: voiceOverride === 'native' ? 'native' as const : 'edge' as const,
                            voice: voiceOverride || 'zh-CN-XiaoxiaoNeural',
                            rate: isEmergency ? 0.85 : 1.0,
                            volume: volumeBoost,
                        };

                        try {
                            await ttsManager.speak(sentence, ttsOptions);
                        } catch (e) {
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    if (pendingPlayouts.current !== 999) pendingPlayouts.current--;
                    if (pendingPlayouts.current > 0 || pendingPlayouts.current === 999) {
                        if (ttsManager.getActivePlaybackId() !== currentPlaybackId) break;
                        setActiveSentenceIndex(-1);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            } finally {
                if (ttsManager.getActivePlaybackId() === currentPlaybackId) {
                    setIsPlaying(false);
                    setActiveSentenceIndex(-1);
                    setReceiverStatus('listening');
                }
            }
        };

        playMessageCycles();
    }, [fullRoomId, volumeBoost]);

    const fetchMessage = useCallback(async () => {
        if (!fullRoomId.trim()) return;
        try {
            const resp = await fetch(`/api/broadcast/fetch?code=${fullRoomId.toUpperCase()}`);
            if (resp.status === 404) {
                setError(t('broadcast.receiver.invalidRoom'));
                setIsJoined(false);
                return;
            }
            const data = await resp.json();
            if (data.message) {
                const msg = data.message as Message;
                if (msg.channelName) setSyncedChannelName(msg.channelName);
                
                if (msg.id !== lastPlayedId.current) {
                    setReceivedHistory(prev => {
                        if (prev.some(h => h.id === msg.id)) return prev;
                        const newHistory = [...prev, msg].slice(-30);
                        saveHistory(newHistory);
                        return newHistory;
                    });
                    
                    setCurrentMsg(msg);
                    if (isListeningRef.current) {
                        speak(msg.text, msg.isEmergency, msg.repeatCount || 1, msg.id, msg.voice);
                    }
                }
            } else if (!isPlayingRef.current) {
                setCurrentMsg(null);
                setReceiverStatus('listening');
            }
            setError(null);
        } catch (err) {
            setReceiverStatus('error');
        }
    }, [fullRoomId, speak, t, saveHistory]);

    // --- 4. All Effects ---
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        scrollToActive();
    }, [activeSentenceIndex, scrollToActive]);

    useEffect(() => {
        let isActive = true;
        const poll = async () => {
            if (!isJoined || !isActive) return;
            await fetchMessage();
            if (isActive) pollingTimer.current = setTimeout(poll, 3000);
        };
        if (isJoined) poll();
        return () => { isActive = false; if (pollingTimer.current) clearTimeout(pollingTimer.current); };
    }, [isJoined, fetchMessage]);

    useEffect(() => {
        if (urlAutoStart && fullRoomId && !isJoined) {
            const timer = setTimeout(() => setIsJoined(true), 500);
            return () => clearTimeout(timer);
        }
    }, [fullRoomId, isJoined, urlAutoStart]);

    useEffect(() => {
        return () => { ttsManager.cancelAll(); ttsManager.stopSilentLoop(); };
    }, []);

    const handleStart = async () => {
        if (!fullRoomId.trim()) { setError(t('broadcast.receiver.missingChannel')); return; }
        setIsJoined(true);
        localStorage.setItem('br_receiver_room', fullRoomId.toUpperCase());
        setIsListening(true);
    };

    const sentences = useMemo(() => {
        if (!currentMsg?.text) return [];
        return currentMsg.text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [currentMsg.text];
    }, [currentMsg?.text]);

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`}>
                <GlassCard className="max-w-2xl w-full p-10 rounded-[2.5rem] relative animate-in zoom-in duration-500">
                    <button onClick={onExit} className="absolute top-8 left-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 cursor-pointer">
                        <X size={24} />
                    </button>
                    <div className="flex flex-col items-center text-center space-y-8 mt-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                            <Tv size={36} />
                        </div>
                        <h2 className="text-3xl font-extrabold dark:text-white">{t('broadcast.receiver.joinChannel')}</h2>
                        <div className="w-full space-y-4">
                            <input type="text" value={fullRoomId} onChange={(e) => setFullRoomId(e.target.value.toUpperCase())} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 text-2xl font-black text-center outline-none focus:ring-4 focus:ring-blue-500/20 dark:text-white uppercase tracking-widest" maxLength={8} />
                            <button onClick={handleStart} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xl hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-3">
                                <Radio size={24} /> {t('broadcast.receiver.initializeLive')}
                            </button>
                            {error && <div className="text-red-500 text-sm flex items-center justify-center gap-2"><AlertCircle size={14} />{error}</div>}
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-1000 ${currentMsg?.isEmergency ? 'bg-red-600 text-white' : (isDark ? 'bg-[#050505] text-white' : 'bg-[#F5F5F7] text-black')}`}>
            <BackgroundAmbience isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
            
            <div className="p-8 flex justify-between items-center bg-transparent relative z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-black/10 dark:bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                        <Radio size={20} className="text-green-500 animate-pulse" />
                        <span className="text-xl font-black tracking-widest">{fullRoomId}</span>
                        <div className={`w-2 h-2 rounded-full ${receiverStatus === 'playing' ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></div>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-[8px]">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">
                            {syncedChannelName || fullRoomId} - {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/5 font-mono text-sm font-black min-w-[120px] justify-center">
                        <Clock size={16} className="opacity-40" />
                        <ClockDisplay />
                    </div>
                    <button onClick={() => setIsListening(!isListening)} className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition bg-white/5 ${isListening ? 'text-green-500' : 'text-gray-400'}`}>
                        {isListening ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setIsJoined(false); localStorage.removeItem('br_receiver_room'); ttsManager.cancelAll(); }} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-red-500 transition bg-white/20 text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative z-10 w-full h-full overflow-hidden">
                {currentMsg ? (
                    <div ref={scrollContainerRef} className="w-full h-full flex flex-col items-center px-4 overflow-y-auto scrollbar-hide">
                        <div className="flex flex-col items-center w-full max-w-5xl mx-auto my-auto py-20 pb-[280px]">
                            {sentences.map((sentence, sIdx) => (
                                <SentenceItem key={sIdx} sentence={sentence} isActive={sIdx === activeSentenceIndex} isPast={activeSentenceIndex === -1 ? false : sIdx < activeSentenceIndex} isEmergency={!!currentMsg.isEmergency} textLength={currentMsg.text.length} activeSentenceRef={activeSentenceRef} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-8 flex flex-col items-center justify-center h-full pb-[280px]">
                        <div className="w-32 h-32 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-xl">
                            <Signal size={48} className="opacity-30 animate-pulse text-indigo-500" />
                        </div>
                        <p className="text-2xl md:text-5xl font-black tracking-widest uppercase italic opacity-20">SIGNAL SEARCHING...</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 left-0 right-0 z-50 flex flex-col items-center">
                <div className="w-[98vw] max-w-5xl mb-2">
                    <GlassCard className="p-4 rounded-[2rem] bg-white/90 dark:bg-black/80">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-2 text-orange-500"><History size={14} /> {t('broadcast.sender.timeline')}</h4>
                            <button onClick={() => { setReceivedHistory([]); localStorage.removeItem('br_receiver_history'); }} className="text-[10px] font-bold text-red-500 px-3 py-1 rounded-full hover:bg-red-500/10 transition uppercase tracking-widest">CLEAR</button>
                        </div>
                        <div className="flex flex-row gap-3 overflow-x-auto pb-1 px-1">
                            {receivedHistory.length === 0 ? (
                                <div className="py-4 px-6 opacity-40 italic w-full text-center"><p className="text-[10px] font-bold">暂无历史播报</p></div>
                            ) : (
                                [...receivedHistory].reverse().map((msg) => (
                                    <button key={msg.id} onClick={() => { setCurrentMsg(msg); speak(msg.text, msg.isEmergency, msg.repeatCount || 1, msg.id, msg.voice); }} className="flex-none w-56 text-left p-3 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 transition shadow-sm">
                                        <div className="flex justify-between items-center mb-1.5"><span className="text-[9px] font-bold opacity-50">{new Date(parseInt(msg.timestamp) || Date.now()).toLocaleTimeString()}</span></div>
                                        <p className="text-[11px] font-bold truncate text-gray-800 dark:text-gray-200">{msg.text}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>

            <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} onCancel={closeDialog} isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
        </div>
    );
};

export default Receiver;

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, AlertCircle, Tv, Signal, X, History, Clock, Radio } from 'lucide-react';
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

const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: { sentence: string, isActive: boolean, isPast: boolean, isEmergency: boolean, textLength: number, activeSentenceRef: React.RefObject<HTMLDivElement> }) => {
    return (
        <div
            ref={isActive ? activeSentenceRef : null}
            className={`relative block py-4 md:py-6 w-full break-words select-none text-center ${isActive ? (isEmergency ? 'text-white font-black' : 'text-blue-600 dark:text-cyan-400 font-black') : isPast ? 'opacity-30' : 'opacity-10'} ${textLength > 300 ? 'text-lg md:text-2xl' : textLength > 100 ? 'text-xl md:text-4xl' : 'text-3xl md:text-7xl'}`}
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

    // Core States
    const [fullRoomId, setFullRoomId] = useState(() => urlRoom || localStorage.getItem('br_receiver_room') || '');
    const [isJoined, setIsJoined] = useState(() => !!urlRoom || !!localStorage.getItem('br_receiver_room'));
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [syncedChannelName, setSyncedChannelName] = useState(() => localStorage.getItem(`br_synced_name_${localStorage.getItem('br_receiver_room') || ''}`) || '');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(() => localStorage.getItem('br_listening') !== 'false');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);
    const [receiverStatus, setReceiverStatus] = useState<'idle' | 'listening' | 'playing' | 'error'>('listening');
    const [error, setError] = useState<string | null>(null);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' as DialogType, onConfirm: () => {} });

    // Refs
    const isPlayingRef = useRef(false);
    const isListeningRef = useRef(isListening);
    const lastPlayedId = useRef<string | null>(null);
    const pollingTimer = useRef<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeSentenceRef = useRef<HTMLDivElement>(null);
    const pendingPlayouts = useRef<number>(0);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { 
        isListeningRef.current = isListening; 
        localStorage.setItem('br_listening', isListening ? 'true' : 'false');
    }, [isListening]);

    useEffect(() => {
        const savedHistory = localStorage.getItem('br_receiver_history');
        if (savedHistory) try { setReceivedHistory(JSON.parse(savedHistory).slice(-30)); } catch(e){}
    }, []);

    const speak = useCallback(async (text: string, isEmergency: boolean, repeatCount: number = 1, id: string, voiceOverride?: string) => {
        if (lastPlayedId.current === id && isPlayingRef.current) return;
        
        ttsManager.cancelAll();
        const currentPlaybackId = ttsManager.getActivePlaybackId();
        lastPlayedId.current = id;
        
        const countLimit = (repeatCount === -1 || repeatCount > 50) ? 99 : Math.max(1, repeatCount);
        pendingPlayouts.current = countLimit;
        setIsPlaying(true);
        setReceiverStatus('playing');

        const playMessageCycles = async () => {
            const currentSentences = text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [text];
            try {
                while (pendingPlayouts.current > 0) {
                    if (ttsManager.getActivePlaybackId() !== currentPlaybackId) break;
                    for (let i = 0; i < currentSentences.length; i++) {
                        if (ttsManager.getActivePlaybackId() !== currentPlaybackId) break;
                        setActiveSentenceIndex(i);
                        await new Promise(r => setTimeout(r, 100)); // Yield to UI
                        
                        const sentence = currentSentences[i].trim();
                        if (!sentence) continue;

                        await ttsManager.speak(sentence, {
                            engine: voiceOverride === 'native' ? 'native' : 'edge',
                            voice: voiceOverride || 'zh-CN-XiaoxiaoNeural',
                            rate: isEmergency ? 0.85 : 1.0,
                            volume: 1.5,
                        });
                    }
                    pendingPlayouts.current--;
                    if (pendingPlayouts.current > 0 && ttsManager.getActivePlaybackId() === currentPlaybackId) {
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
    }, []);

    const fetchMessage = useCallback(async () => {
        if (!fullRoomId.trim()) return;
        try {
            const resp = await fetch(`/api/broadcast/fetch?code=${fullRoomId.toUpperCase()}&t=${Date.now()}`);
            if (resp.status === 404) return;
            const data = await resp.json();
            if (data && data.message) {
                const msg = data.message as Message;
                if (msg.id !== lastPlayedId.current) {
                    lastPlayedId.current = msg.id;
                    setCurrentMsg(msg);
                    setReceivedHistory(prev => {
                        const newHist = [...prev, msg].slice(-30);
                        localStorage.setItem('br_receiver_history', JSON.stringify(newHist));
                        return newHist;
                    });
                    if (isListeningRef.current) speak(msg.text, msg.isEmergency, msg.repeatCount || 1, msg.id, msg.voice);
                }
            } else if (!isPlayingRef.current) {
                setCurrentMsg(null);
                setReceiverStatus('listening');
            }
        } catch (err) {}
    }, [fullRoomId, speak]);

    useEffect(() => {
        if (!isJoined) return;
        const poll = async () => {
            await fetchMessage();
            pollingTimer.current = setTimeout(poll, 3000);
        };
        poll();
        ttsManager.startSilentLoop();
        return () => { if (pollingTimer.current) clearTimeout(pollingTimer.current); };
    }, [isJoined, fetchMessage]);

    useEffect(() => {
        if (activeSentenceRef.current) activeSentenceRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, [activeSentenceIndex]);

    const handleStart = () => {
        if (!fullRoomId.trim()) return;
        setIsJoined(true);
        localStorage.setItem('br_receiver_room', fullRoomId.toUpperCase());
    };

    const sentences = useMemo(() => (currentMsg?.text || '').match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [currentMsg?.text || ''], [currentMsg?.text]);

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center ${isDark ? 'bg-black' : 'bg-gray-100'}`}>
                <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl text-center">
                    <Tv size={48} className="mx-auto mb-6 text-blue-500" />
                    <h2 className="text-2xl font-bold mb-6 dark:text-white">{t('broadcast.receiver.joinChannel')}</h2>
                    <input type="text" value={fullRoomId} onChange={(e) => setFullRoomId(e.target.value.toUpperCase())} className="w-full p-4 mb-4 rounded-xl border dark:bg-black dark:text-white text-center text-xl font-bold" placeholder="ROOM CODE" />
                    <button onClick={handleStart} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg">ENTER</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 flex flex-col ${currentMsg?.isEmergency ? 'bg-red-600 text-white' : (isDark ? 'bg-black text-white' : 'bg-gray-50 text-black')}`}>
            <div className="p-6 flex justify-between items-center bg-black/5">
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-white/10 rounded-lg font-bold">{fullRoomId}</div>
                    <div className={`w-3 h-3 rounded-full ${receiverStatus === 'playing' ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`} />
                    <ClockDisplay />
                    <button onClick={() => setIsListening(!isListening)} className="p-2 bg-white/10 rounded-full">{isListening ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
                </div>
                <button onClick={() => { setIsJoined(false); ttsManager.cancelAll(); }} className="p-2 bg-red-500/20 text-red-500 rounded-full"><X size={20} /></button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
                {currentMsg ? (
                    <div ref={scrollContainerRef} className="w-full h-full overflow-y-auto pb-[200px]">
                        <div className="max-w-4xl mx-auto pt-20">
                            {sentences.map((sentence, sIdx) => (
                                <SentenceItem key={sIdx} sentence={sentence} isActive={sIdx === activeSentenceIndex} isPast={activeSentenceIndex === -1 ? false : sIdx < activeSentenceIndex} isEmergency={!!currentMsg.isEmergency} textLength={currentMsg.text.length} activeSentenceRef={activeSentenceRef} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center opacity-20"><Signal size={64} className="mx-auto mb-4 animate-pulse" /><p className="text-2xl font-black">WAITING FOR SIGNAL...</p></div>
                )}
            </div>

            <div className="p-4 bg-black/5 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto flex gap-3 overflow-x-auto">
                    {receivedHistory.slice().reverse().map(msg => (
                        <div key={msg.id} className="flex-none w-48 p-3 bg-white/10 rounded-lg text-sm truncate opacity-60">{msg.text}</div>
                    ))}
                </div>
            </div>

            <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} onCancel={() => setDialog({ ...dialog, isOpen: false })} isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
        </div>
    );
};

export default Receiver;

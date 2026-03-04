import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, AlertCircle, Tv, Signal, X, History, Clock, Radio } from 'lucide-react';
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

const SentenceItem = React.memo(({ sentence, isActive, isPast, isEmergency, textLength, activeSentenceRef }: any) => (
    <div
        ref={isActive ? activeSentenceRef : null}
        className={`py-4 w-full text-center transition-all ${isActive ? (isEmergency ? 'text-white font-black scale-105' : 'text-blue-600 font-black scale-105') : isPast ? 'opacity-30' : 'opacity-10'} ${textLength > 300 ? 'text-2xl' : 'text-4xl'}`}
    >
        {sentence}
    </div>
));

const Receiver: React.FC<{ isDark: boolean; toggleTheme: () => void; onExit: () => void }> = ({ isDark, toggleTheme, onExit }) => {
    const t = useTranslations();
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room')?.toUpperCase().trim();

    // 1. Minimal State
    const [fullRoomId, setFullRoomId] = useState(() => roomFromUrl || localStorage.getItem('br_receiver_room') || '');
    const [isJoined, setIsJoined] = useState(!!roomFromUrl || !!localStorage.getItem('br_receiver_room'));
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isListening, setIsListening] = useState(() => localStorage.getItem('br_listening') !== 'false');
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [receivedHistory, setReceivedHistory] = useState<Message[]>([]);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' as DialogType, onConfirm: () => {} });

    // 2. Control Refs (Not triggering re-renders)
    const engine = useRef({
        lastId: '',
        isJoined: isJoined,
        isListening: isListening,
        currentPlaybackId: 0,
        polling: false
    });
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLDivElement>(null);

    // Sync Ref
    useEffect(() => { engine.current.isJoined = isJoined; }, [isJoined]);
    useEffect(() => { 
        engine.current.isListening = isListening;
        localStorage.setItem('br_listening', isListening ? 'true' : 'false');
    }, [isListening]);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem('br_receiver_history');
        if (saved) try { setReceivedHistory(JSON.parse(saved).slice(-20)); } catch(e){}
    }, []);

    // 3. Play Logic
    const runPlayback = useCallback(async (msg: Message) => {
        ttsManager.cancelAll();
        const pId = ttsManager.getActivePlaybackId();
        engine.current.currentPlaybackId = pId;
        
        setIsPlaying(true);
        const sentences = msg.text.match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [msg.text];
        let repeats = (msg.repeatCount === -1 || msg.repeatCount! > 50) ? 99 : (msg.repeatCount || 1);

        try {
            while (repeats > 0 && ttsManager.getActivePlaybackId() === pId) {
                for (let i = 0; i < sentences.length; i++) {
                    if (ttsManager.getActivePlaybackId() !== pId) break;
                    setActiveSentenceIndex(i);
                    await new Promise(r => setTimeout(r, 100)); // Browser breath
                    await ttsManager.speak(sentences[i].trim(), {
                        engine: 'edge',
                        voice: msg.voice || 'zh-CN-XiaoxiaoNeural',
                        rate: msg.isEmergency ? 0.85 : 1.0,
                        volume: 1.5
                    });
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
    }, []);

    // 4. Unified Engine Effect
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

    // Scroll
    useEffect(() => {
        if (activeRef.current) activeRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, [activeSentenceIndex]);

    const sentences = useMemo(() => (currentMsg?.text || '').match(/[^。！？；\.!\?;]+[。！？；\.!\?;]*/g) || [currentMsg?.text || ''], [currentMsg?.text]);

    if (!isJoined) {
        return (
            <div className={`fixed inset-0 flex items-center justify-center ${isDark ? 'bg-black' : 'bg-gray-100'}`}>
                <div className="p-10 bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl text-center w-full max-w-lg">
                    <Tv size={64} className="mx-auto mb-8 text-blue-500" />
                    <input type="text" value={fullRoomId} onChange={e => setFullRoomId(e.target.value.toUpperCase())} className="w-full p-6 mb-6 rounded-3xl border-2 dark:bg-black dark:text-white text-center text-3xl font-black" placeholder="ROOM CODE" maxLength={8} />
                    <button onClick={() => { if(fullRoomId) { setIsJoined(true); localStorage.setItem('br_receiver_room', fullRoomId); } }} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black text-2xl hover:scale-[1.02] active:scale-95 transition">JOIN CLASSROOM</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 flex flex-col transition-colors duration-500 ${currentMsg?.isEmergency ? 'bg-red-600 text-white' : (isDark ? 'bg-black text-white' : 'bg-gray-50 text-black')}`}>
            <div className="p-8 flex justify-between items-center bg-black/5">
                <div className="flex items-center gap-6">
                    <div className="px-6 py-3 bg-white/10 rounded-2xl font-black text-xl tracking-widest">{fullRoomId}</div>
                    <div className={`w-4 h-4 rounded-full ${isPlaying ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`} />
                    <div className="text-xl font-mono font-bold opacity-60"><ClockDisplay /></div>
                    <button onClick={() => setIsListening(!isListening)} className={`p-4 rounded-full transition ${isListening ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400'}`}>{isListening ? <Volume2 size={28} /> : <VolumeX size={28} />}</button>
                </div>
                <button onClick={() => { setIsJoined(false); ttsManager.cancelAll(); }} className="p-4 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition"><X size={28} /></button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-10 overflow-hidden relative">
                {currentMsg ? (
                    <div className="w-full h-full overflow-y-auto scrollbar-hide">
                        <div className="max-w-5xl mx-auto py-40">
                            {sentences.map((s, i) => (
                                <SentenceItem key={i} sentence={s} isActive={i === activeSentenceIndex} isPast={activeSentenceIndex !== -1 && i < activeSentenceIndex} isEmergency={!!currentMsg.isEmergency} textLength={currentMsg.text.length} activeSentenceRef={activeRef} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center opacity-10"><Signal size={120} className="mx-auto mb-8 animate-pulse" /><p className="text-5xl font-black tracking-widest">LISTENING...</p></div>
                )}
            </div>

            <div className="p-6 bg-black/5">
                <div className="max-w-6xl mx-auto flex gap-4 overflow-x-auto pb-2">
                    {receivedHistory.slice().reverse().map(m => (
                        <button key={m.id} onClick={() => runPlayback(m)} className="flex-none w-64 p-4 bg-white/5 rounded-2xl text-left hover:bg-white/10 transition border border-white/5">
                            <div className="text-[10px] opacity-40 mb-1 font-bold">{new Date(parseInt(m.timestamp) || Date.now()).toLocaleTimeString()}</div>
                            <div className="text-sm font-bold truncate">{m.text}</div>
                        </button>
                    ))}
                </div>
            </div>

            <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} onCancel={() => setDialog({...dialog, isOpen: false})} isDark={isDark} isEmergency={!!currentMsg?.isEmergency} />
        </div>
    );
};

export default Receiver;

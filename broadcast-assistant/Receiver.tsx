import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, AlertCircle, Tv, Signal, Wifi, WifiOff, X, Copy, Info } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

interface Message {
    id: string;
    text: string;
    isEmergency: boolean;
    timestamp: string;
}

const Receiver: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const t = useTranslations();
    const [fullRoomId, setFullRoomId] = useState(localStorage.getItem('br_last_full_room_rx') || '');
    const [isJoined, setIsJoined] = useState(false);
    const [currentMsg, setCurrentMsg] = useState<Message | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const lastPlayedId = useRef<string | null>(null);
    const pollingTimer = useRef<NodeJS.Timeout | null>(null);

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

    const speak = useCallback((text: string, isEmergency: boolean) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = isEmergency ? 0.85 : 1.0;
        if (isEmergency) {
            let count = 0;
            utterance.onend = () => {
                count++;
                if (count < 3) {
                    setTimeout(() => window.speechSynthesis.speak(utterance), 1200);
                }
            };
        }
        window.speechSynthesis.speak(utterance);
    }, []);

    const fetchMessage = useCallback(async () => {
        if (!fullRoomId.trim()) return;

        try {
            const resp = await fetch(`/api/broadcast/fetch?code=${fullRoomId.trim().toUpperCase()}`);
            const data = await resp.json();

            if (data.message) {
                const msg = data.message as Message;
                setCurrentMsg(msg);
                if (isListening && msg.id !== lastPlayedId.current) {
                    speak(msg.text, msg.isEmergency);
                    lastPlayedId.current = msg.id;
                }
            } else {
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

    const handleStart = () => {
        if (!fullRoomId.trim()) {
            setError(t('broadcast.receiver.missingChannel'));
            return;
        }
        localStorage.setItem('br_last_full_room_rx', fullRoomId);
        setIsJoined(true);
        setIsListening(true);
        // Wake up TTS for iOS
        const wakeUp = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(wakeUp);
    };

    const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
        <div className={`backdrop-blur-2xl bg-white/70 dark:bg-black/60 border border-white/20 dark:border-white/10 shadow-2xl ${className}`}>
            {children}
        </div>
    );

    if (!isJoined) {
        return (
            <GlassCard className="max-w-md mx-auto p-12 rounded-[3rem] text-center space-y-10 animate-in zoom-in duration-500 mt-10">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl shadow-purple-500/20">
                    <Tv size={48} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight dark:text-white">{t('broadcast.receiver.joinChannel')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed px-6">{t('broadcast.receiver.joinDesc')}</p>
                </div>

                <div className="space-y-6">
                    <div className="relative group">
                        <input
                            type="text"
                            value={fullRoomId}
                            onChange={(e) => setFullRoomId(e.target.value.toUpperCase())}
                            placeholder="例如: 8859"
                            className="w-full h-16 bg-gray-100 dark:bg-white/5 border-none rounded-2xl text-center text-xl font-bold tracking-wider focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition-all text-purple-600"
                        />
                        <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    </div>

                    {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">{error}</p>}

                    <button
                        onClick={handleStart}
                        className="w-full h-16 rounded-[1.5rem] bg-black dark:bg-white text-white dark:text-black font-extrabold text-xl shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                    >
                        <Volume2 size={24} className="group-hover:scale-110 transition-transform" />
                        {t('broadcast.receiver.initializeLive')}
                    </button>
                </div>

                <div className="flex items-center gap-2 justify-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <Info size={12} /> Format: 4-Digit Number
                </div>
            </GlassCard>
        );
    }

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transition-all duration-1000 ${currentMsg?.isEmergency
            ? 'bg-red-600 text-white'
            : (isDark ? 'bg-black text-white' : 'bg-white text-black')
            }`}>
            {/* HUD Header */}
            <div className="p-8 flex justify-between items-center bg-transparent relative z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 px-6 py-2 rounded-full GlassContainer border border-white/20">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">
                            {fullRoomId} // {isOnline ? t('broadcast.receiver.online') : t('broadcast.receiver.signalLost')}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsListening(!isListening)}
                        className={`w-12 h-12 rounded-full GlassContainer border border-white/20 flex items-center justify-center transition-all ${isListening ? 'text-green-500 scale-110' : 'text-gray-400'}`}
                    >
                        {isListening ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>
                </div>

                <div className="flex gap-4">
                    <button onClick={toggleFullscreen} className="w-12 h-12 rounded-full GlassContainer border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                    <button onClick={() => setIsJoined(false)} className="w-12 h-12 rounded-full GlassContainer border border-white/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Background Ambience */}
            {!currentMsg?.isEmergency && (
                <div className="absolute inset-0 z-0 opacity-20 transition-all duration-1000">
                    <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[180px] ${isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}></div>
                    <div className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[180px] ${isDark ? 'bg-purple-900/40' : 'bg-pink-100'}`}></div>
                </div>
            )}

            {/* Main Broadcast Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-24 text-center relative z-10">
                {currentMsg ? (
                    <div className="space-y-12 animate-in fade-in zoom-in-95 duration-1000">
                        {currentMsg.isEmergency && (
                            <div className="flex flex-col items-center gap-6 animate-pulse">
                                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
                                    <AlertCircle size={64} className="text-white" />
                                </div>
                                <div className="text-3xl md:text-5xl font-black tracking-[0.5em] uppercase text-white drop-shadow-lg">
                                    {t('broadcast.receiver.criticalBroadcast')}
                                </div>
                            </div>
                        )}
                        <h1 className={`font-black tracking-tighter leading-[1.05] drop-shadow-sm select-none transition-all duration-500 ${currentMsg.text.length > 40 ? 'text-6xl md:text-8xl lg:text-9xl' : 'text-8xl md:text-10xl lg:text-11xl'
                            }`}>
                            {currentMsg.text}
                        </h1>
                    </div>
                ) : (
                    <div className="text-center space-y-10 animate-in fade-in duration-1000">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-gray-300 dark:border-white/10 animate-[spin_20s_linear_infinite]"></div>
                            <div className="m-8 w-32 h-32 rounded-full GlassContainer border border-white/20 flex items-center justify-center">
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

            {/* HUD Footer */}
            <div className="p-10 flex justify-center pb-12 relative z-20">
                <div className="px-8 py-3 rounded-full GlassContainer border border-white/20 text-[10px] font-black uppercase tracking-[0.35em] opacity-30 flex items-center gap-4">
                    <span className="flex gap-1">
                        {[...Array(4)].map((_, i) => <div key={i} className="w-1 h-3 bg-current opacity-40 rounded-full"></div>)}
                    </span>
                    {t('broadcast.receiver.realtimeDecryption')}
                </div>
            </div>
        </div>
    );
};

export default Receiver;

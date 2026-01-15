import React, { useState, useEffect } from 'react';
import { Send, History, Trash2, AlertTriangle, CheckCircle2, RefreshCw, Radio, Clock, ChevronRight, Loader2, Copy } from 'lucide-react';
import { getLicensePrefix } from './utils/licenseManager';
import { useTranslations } from '../hooks/useTranslations';

interface Message {
    id: string;
    text: string;
    isEmergency: boolean;
    timestamp: string;
}

const Sender: React.FC<{ license: string, isDark: boolean }> = ({ license, isDark }) => {
    const t = useTranslations();
    const licensePrefix = getLicensePrefix(license);

    const [channelCode, setChannelCode] = useState(() => {
        return localStorage.getItem('br_last_channel') || Math.floor(1000 + Math.random() * 9000).toString();
    });

    const [inputText, setInputText] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);
    const [history, setHistory] = useState<Message[]>([]);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; msg: string }>({ type: null, msg: '' });

    useEffect(() => {
        const savedHistory = localStorage.getItem('br_sender_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                setHistory([]);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('br_last_channel', channelCode);
    }, [channelCode]);

    const generateRandomChannel = () => {
        const newCode = Math.floor(1000 + Math.random() * 9000).toString();
        setChannelCode(newCode);
    };

    const handleSend = async () => {
        if (!channelCode.trim() || !inputText.trim()) {
            setStatus({ type: 'error', msg: t('broadcast.sender.missingField') });
            return;
        }

        setStatus({ type: 'loading', msg: t('broadcast.sender.broadcasting') });

        try {
            const resp = await fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license,
                    code: channelCode.trim(),
                    text: inputText.trim(),
                    isEmergency,
                }),
            });

            const data = await resp.json();

            if (data.success) {
                const newMessage: Message = {
                    id: data.messageId,
                    text: inputText.trim(),
                    isEmergency,
                    timestamp: new Date().toLocaleTimeString(window.navigator.language, { hour12: false, hour: '2-digit', minute: '2-digit' }),
                };

                const newHistory = [newMessage, ...history].slice(0, 30);
                setHistory(newHistory);
                localStorage.setItem('br_sender_history', JSON.stringify(newHistory));

                setInputText('');
                setIsEmergency(false);
                setStatus({ type: 'success', msg: t('broadcast.sender.broadcastDelivered') });

                setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
            } else {
                throw new Error(data.error || 'Server Error');
            }
        } catch (err: any) {
            setStatus({ type: 'error', msg: t('broadcast.sender.failedToSend') });
        }
    };

    const clearHistory = () => {
        if (window.confirm(t('broadcast.sender.clearHistoryConfirm'))) {
            setHistory([]);
            localStorage.removeItem('br_sender_history');
        }
    };

    const copyRoomId = () => {
        const roomId = `${licensePrefix}-${channelCode}`;
        navigator.clipboard.writeText(roomId);
        setStatus({ type: 'success', msg: 'Room ID Copied' });
        setTimeout(() => setStatus({ type: null, msg: '' }), 2000);
    };

    const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
        <div className={`backdrop-blur-xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-[2rem] shadow-sm ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="space-y-8 max-w-2xl mx-auto px-4">
            {/* Channel Section */}
            <GlassCard className="p-8 flex items-center justify-between group">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                        <Radio size={12} className="text-blue-500" /> {t('broadcast.sender.currentChannel')}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-5xl font-black tracking-tighter italic bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent px-1">
                            {licensePrefix}-{channelCode}
                        </div>
                        <button onClick={copyRoomId} className="p-2 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Copy size={20} />
                        </button>
                    </div>
                </div>
                <button
                    onClick={generateRandomChannel}
                    className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:rotate-180 transition-all duration-700 active:scale-90"
                >
                    <RefreshCw size={24} className="text-gray-500" />
                </button>
            </GlassCard>

            {/* Input Section */}
            <GlassCard className="p-10 space-y-8">
                <div className="relative group">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('broadcast.sender.broadcastPlaceholder')}
                        rows={4}
                        autoFocus
                        className="w-full bg-transparent border-none text-2xl font-bold tracking-tight outline-none resize-none placeholder:opacity-20 transition-all min-h-[140px] dark:text-white"
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsEmergency(!isEmergency)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEmergency
                            ? 'bg-red-500 text-white shadow-[0_10px_20px_-5px_rgba(239,68,68,0.5)] scale-105'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                    >
                        <AlertTriangle size={18} /> {t('broadcast.sender.emergencyMode')}
                    </button>

                    <button
                        onClick={handleSend}
                        disabled={status.type === 'loading'}
                        className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-bold text-lg hover:opacity-90 shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-3"
                    >
                        {status.type === 'loading' ? <Loader2 size={24} className="animate-spin" /> : <Send size={20} />}
                        {t('broadcast.sender.launch')}
                    </button>
                </div>

                {status.type && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-bold border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}>
                        {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {status.msg}
                    </div>
                )}
            </GlassCard>

            {/* History Section */}
            <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <History size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">{t('broadcast.sender.timeline')}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">{t('broadcast.sender.last30Sessions')}</p>
                        </div>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                        title={t('broadcast.sender.wipeLogs')}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto px-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-12 opacity-20">
                            <Send size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-bold tracking-tighter">{t('broadcast.sender.silentAirwaves')}</p>
                        </div>
                    ) : (
                        history.map((msg) => (
                            <div key={msg.id} className="group p-5 rounded-3xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-white/10 transition-all flex items-start gap-4">
                                <div className="pt-1">
                                    {msg.isEmergency ? (
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                            <AlertTriangle size={14} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Clock size={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black opacity-30 uppercase">{msg.timestamp}</span>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-20 transition-opacity" />
                                    </div>
                                    <p className={`text-base font-semibold leading-relaxed ${msg.isEmergency ? 'text-red-500' : 'opacity-80'}`}>{msg.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default Sender;

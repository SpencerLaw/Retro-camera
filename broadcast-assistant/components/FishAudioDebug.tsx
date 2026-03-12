import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Loader2, Volume2, Save, Info, Music, AlertCircle, Eye, EyeOff, Search, Sparkles, RefreshCw } from 'lucide-react';
import { getBCLicense } from '../utils/licenseManager';

interface FishAudioDebugProps {
    onClose: () => void;
    onSelectVoice: (voiceId: string) => void;
    theme: 'light' | 'dark';
}

interface VoiceModel {
    _id: string;
    title: string;
    tags: string[];
}

const RECOMMENDED_VOICES = [
    { name: '默认音色 (免费 EdgeTTS)', id: '' },
    { name: '王琨 (专业广播)', id: '4f201abba2574feeae11e5ebf737859e' },
    { name: '女大学生 (自然亲切)', id: '5c353fdb312f4888836a9a5680099ef0' },
];

const FishAudioDebug: React.FC<FishAudioDebugProps> = ({ onClose, onSelectVoice, theme }) => {
    const [text, setText] = useState('我当然知道那不是我的月亮，但有一刻，月亮的确照在了我身上。可生活不是电影，我也缺少点运气。我悄然触摸你，却未曾料想，你像蒲公英散开了，到处啊，都是你的模样。');
    const [refId, setRefId] = useState(() => {
        const license = getBCLicense();
        return localStorage.getItem(`br_fish_voice_${license || 'DEMO-ONLY'}`) || RECOMMENDED_VOICES[0].id;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [isCheckingWallet, setIsCheckingWallet] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<VoiceModel[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setErrorMsg(null);
        try {
            // 如果 reference_id 为空，调用 Edge TTS 测试接口
            const endpointUrl = refId.trim() === '' ? '/api/broadcast/tts' : '/api/broadcast/fish-tts';
            const bodyPayload = refId.trim() === ''
                ? { text: text.trim(), voice: 'zh-CN-XiaoxiaoNeural', rate: 1 }
                : {
                    text: text.trim(),
                    reference_id: refId.trim(),
                    format: 'mp3',
                    license: getBCLicense()
                };

            const response = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData.error || errorData.message || `HTTP Error ${response.status}`;
                throw new Error(msg);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
            }
        } catch (error: any) {
            console.error('Fish Audio TTS Error:', error);
            setErrorMsg(error.message || '未知错误');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWalletBalance = async () => {
        setIsCheckingWallet(true);
        try {
            const resp = await fetch('/api/broadcast/fish-wallet');
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.credit !== undefined) {
                    setWalletBalance(Number(data.credit));
                } else {
                    console.error('Invalid wallet payload:', data);
                }
            }
        } catch (e) {
            console.error('Failed to fetch wallet balance:', e);
        } finally {
            setIsCheckingWallet(false);
        }
    };

    useEffect(() => {
        fetchWalletBalance();
    }, []);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[12px] animate-in fade-in duration-500">
            <div className={`relative w-full max-w-lg overflow-hidden rounded-[3rem] border shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] transition-all max-h-[90vh] flex flex-col backdrop-blur-[32px] ${theme === 'dark' ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white/80 border-white/30 text-slate-900'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-black/[0.03] dark:border-white/[0.03] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                            <Music size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl tracking-tight">Fish Audio 调试</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40 mt-0.5">TTS Debug Tool</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-3 rounded-2xl transition-all active:scale-90 ${theme === 'dark' ? 'hover:bg-white/5 text-white/40' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    {/* Wallet Balance Display */}
                    <div className={`p-6 rounded-[2rem] border flex items-center justify-between gap-6 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">账户剩余额度</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black tracking-tight text-indigo-500 tabular-nums">
                                    {walletBalance !== null ? walletBalance.toFixed(2) : '--'}
                                </span>
                                <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Credits</span>
                            </div>
                        </div>
                        <button
                            onClick={fetchWalletBalance}
                            disabled={isCheckingWallet}
                            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white/40' : 'bg-white border border-slate-100 hover:bg-white text-indigo-600'
                                }`}
                        >
                            <RefreshCw size={18} className={isCheckingWallet ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Text Area */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 px-2">播报文本</label>
                        <div className={`relative rounded-[2.5rem] p-8 border transition-all ${theme === 'dark' ? 'bg-black/30 border-white/5 focus-within:border-indigo-500/50' : 'bg-white/60 border-slate-100 shadow-inner'}`}>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full min-h-[120px] bg-transparent outline-none font-bold resize-none text-base leading-relaxed placeholder:text-slate-300"
                                placeholder="输入要转语音的文字..."
                            />
                        </div>
                    </div>

                    {/* Voice Selection */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 px-2">音色选择</label>
                        <div className="flex flex-wrap gap-3">
                            {RECOMMENDED_VOICES.map(voice => (
                                <button
                                    key={voice.id}
                                    onClick={() => setRefId(voice.id)}
                                    className={`px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all border ${refId === voice.id
                                        ? 'bg-indigo-500 border-indigo-400 text-white shadow-xl shadow-indigo-500/30 -translate-y-0.5'
                                        : (theme === 'dark' ? 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10' : 'bg-white/60 border-slate-100 text-slate-500 hover:bg-white hover:shadow-md')
                                        }`}
                                >
                                    {voice.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {errorMsg && (
                        <div className={`p-6 rounded-[2rem] border flex items-start gap-4 animate-in slide-in-from-top-4 duration-500 ${theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">播放失败</p>
                                <p className="text-xs font-semibold leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    <div className={`p-6 rounded-[2rem] border flex items-start gap-4 ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50/50 border-indigo-100 text-indigo-600'}`}>
                        <Info size={20} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold leading-relaxed opacity-80">
                            提示：已为您推荐高质量中文音色。您可以查询余额以确保播报正常运行。
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-black/[0.03] dark:border-white/[0.03] bg-black/[0.02] shrink-0">
                    <div className="flex gap-4">
                        <button
                            onClick={handlePlay}
                            disabled={isLoading || !text.trim() || !refId.trim()}
                            className={`flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.25em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl ${isLoading
                                ? 'bg-slate-500/20 text-slate-400'
                                : 'bg-white/80 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-white/20 active:scale-95'
                                }`}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                            测试试听
                        </button>

                        <button
                            onClick={() => onSelectVoice(refId)}
                            className="flex-[1.5] py-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black uppercase tracking-[0.25em] text-[10px] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            使用该音色！
                        </button>
                    </div>
                </div>

                <audio ref={audioRef} className="hidden" />
            </div>
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

export default FishAudioDebug;

import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Loader2, Volume2, Save, Info, Music, AlertCircle, Eye, EyeOff, Search, Sparkles } from 'lucide-react';

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
    { name: '嘉岚3.0 (高保真女声)', id: 'fbe02f8306fc4d3d915e9871722a39d5' },
    { name: '王琨 (专业广播)', id: '4f201abba2574feeae11e5ebf737859e' },
    { name: '女大学生 (自然亲切)', id: '5c353fdb312f4888836a9a5680099ef0' },
];

const FishAudioDebug: React.FC<FishAudioDebugProps> = ({ onClose, onSelectVoice, theme }) => {
    const [text, setText] = useState('我当然知道那不是我的月亮，但有一刻，月亮的确照在了我身上。可生活不是电影，我也缺少点运气。我悄然触摸你，却未曾料想，你像蒲公英散开了，到处啊，都是你的模样。');
    const [refId, setRefId] = useState(RECOMMENDED_VOICES[0].id);
    const [isLoading, setIsLoading] = useState(false);
    const [showId, setShowId] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<VoiceModel[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = async () => {
        if (!text.trim() || !refId.trim()) return;
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const response = await fetch('/api/broadcast/fish-tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text.trim(),
                    reference_id: refId.trim(),
                    format: 'mp3',
                    model: 's1'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error ${response.status}`);
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

    const searchVoices = async (query: string) => {
        if (!query.trim() && !searchResults.length) {
            // Optional: Initial fetch for popular voices
        }
        setIsSearching(true);
        try {
            const url = `/api/broadcast/fetch-fish-models?tags=chinese&query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.items || []);
            }
        } catch (error) {
            console.error('Search Voices Error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Removed search effect as per requirement

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`relative w-full max-w-lg overflow-hidden rounded-[2rem] border shadow-2xl transition-all h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-[#1a1a24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Music size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-lg">Fish Audio 调试</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">TTS Debug Tool</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {/* Text Area */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-30 px-1">播报文本</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className={`w-full min-h-[100px] p-4 rounded-2xl border outline-none font-bold transition-all resize-none text-sm ${theme === 'dark' ? 'bg-black/20 border-white/5 focus:border-indigo-500/50' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-400'
                                }`}
                            placeholder="输入要转语音的文字..."
                        />
                    </div>

                    {/* Reference ID & Library */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">音色选择 (Reference ID)</label>
                            <button
                                onClick={() => setShowId(!showId)}
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors"
                            >
                                {showId ? '隐藏 ID' : '显示 ID'}
                            </button>
                        </div>

                        {/* Presets (Recommended) */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 opacity-40 px-1">
                                <Sparkles size={10} />
                                <span className="text-[9px] font-black uppercase tracking-widest">推荐中文音色</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {RECOMMENDED_VOICES.map(voice => (
                                    <button
                                        key={voice.id}
                                        onClick={() => setRefId(voice.id)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${refId === voice.id
                                            ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                            : (theme === 'dark' ? 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        {voice.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Library Removed */}

                        {/* Input Display (Visible ID if enabled) */}
                        <div className="relative pt-2">
                            <input
                                type={showId ? "text" : "password"}
                                value={refId}
                                readOnly
                                className={`w-full p-4 rounded-2xl border outline-none font-mono text-[10px] transition-all opacity-60 ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                                    }`}
                                placeholder="选择上面的音色或搜索..."
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                {showId ? <EyeOff size={14} className="opacity-30" /> : <Eye size={14} className="opacity-30" />}
                            </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600'
                            }`}>
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[11px] font-black uppercase tracking-widest">播放失败</p>
                                <p className="text-[11px] font-medium leading-relaxed">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium leading-relaxed">
                            提示：已为您推荐高质量中文音色。您也可以通过搜索发现更多有趣的音色。
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/5 shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={handlePlay}
                            disabled={isLoading || !text.trim() || !refId.trim()}
                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-xl ${isLoading
                                ? 'bg-slate-500 opacity-50 cursor-not-allowed'
                                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                }`}
                        >
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Play size={18} fill="currentColor" />
                            )}
                            测试试听
                        </button>

                        <button
                            onClick={() => onSelectVoice(refId)}
                            className="flex-[1.5] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/25 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
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
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.3); }
            `}} />
        </div>
    );
};

export default FishAudioDebug;

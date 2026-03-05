import React, { useState, useRef } from 'react';
import { X, Play, Loader2, Volume2, Save, Info, Music, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FishAudioDebugProps {
    onClose: () => void;
    theme: 'light' | 'dark';
}

const PRESET_VOICES = [
    { name: '小晓 (默认)', id: '8ef4a238714b45718ce04243307c57a7' },
    { name: '元气男声', id: '802e3bc2b27e49c2995d23ef70e6ac89' },
    { name: '甜美女生', id: '36f45610e6e741639f7833075678440c' }, // Updated ID
];

const FishAudioDebug: React.FC<FishAudioDebugProps> = ({ onClose, theme }) => {
    const [text, setText] = useState('这是 Fish Audio 的智能播报测试，听起来怎么样？');
    const [refId, setRefId] = useState(PRESET_VOICES[0].id);
    const [isLoading, setIsLoading] = useState(false);
    const [showId, setShowId] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`relative w-full max-w-lg overflow-hidden rounded-[2rem] border shadow-2xl transition-all ${theme === 'dark' ? 'bg-[#1a1a24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
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

                <div className="p-8 space-y-6">
                    {/* Text Area */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-30 px-1">播报文本</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className={`w-full min-h-[120px] p-4 rounded-2xl border outline-none font-bold transition-all resize-none ${theme === 'dark' ? 'bg-black/20 border-white/5 focus:border-indigo-500/50' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-400'
                                }`}
                            placeholder="输入要转语音的文字..."
                        />
                    </div>

                    {/* Reference ID */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-30 px-1">音色选择 (Reference ID)</label>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-2">
                            {PRESET_VOICES.map(voice => (
                                <button
                                    key={voice.id}
                                    onClick={() => setRefId(voice.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${refId === voice.id
                                        ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                        : (theme === 'dark' ? 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                                        }`}
                                >
                                    {voice.name}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <input
                                type={showId ? "text" : "password"}
                                value={refId}
                                onChange={(e) => setRefId(e.target.value)}
                                className={`w-full p-4 rounded-2xl border outline-none font-mono text-xs transition-all pr-12 ${theme === 'dark' ? 'bg-black/20 border-white/5 focus:border-indigo-500/50' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-400'
                                    }`}
                                placeholder="手动输入音色 ID..."
                            />
                            <button
                                onClick={() => setShowId(!showId)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity"
                            >
                                {showId ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
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
                        <p className="text-[11px] font-medium leading-relaxed">
                            调试说明：此工具直接调用 Fish Audio 云端 API。首次加载可能稍慢。API 使用独立计费，请节约使用。
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/5">
                    <button
                        onClick={handlePlay}
                        disabled={isLoading || !text.trim()}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-xl ${isLoading
                            ? 'bg-slate-500 opacity-50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25 hover:scale-[1.02] active:scale-95'
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Play size={18} fill="currentColor" />
                        )}
                        开始转换语音
                    </button>
                </div>

                <audio ref={audioRef} className="hidden" />
            </div>
        </div>
    );
};

export default FishAudioDebug;

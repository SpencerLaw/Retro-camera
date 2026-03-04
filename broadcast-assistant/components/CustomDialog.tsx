import React from 'react';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import GlassCard from './GlassCard';

export type DialogType = 'info' | 'confirm' | 'error' | 'success' | 'warning';

interface CustomDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDark?: boolean;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
    isOpen,
    title,
    message,
    type = 'info',
    confirmText = '确定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    isDark = true
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 size={32} className="text-green-500" />;
            case 'error': return <AlertCircle size={32} className="text-red-500" />;
            case 'warning': return <AlertCircle size={32} className="text-orange-500" />;
            case 'confirm': return <HelpCircle size={32} className="text-blue-500" />;
            default: return <Info size={32} className="text-blue-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-3xl" onClick={onCancel}></div>

            <div className="relative w-full max-w-lg p-10 space-y-10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)] rounded-[3rem] border border-black/5 bg-white text-slate-900 animate-in zoom-in-95 duration-300">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                            {getIcon()}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black tracking-tight">{title}</h3>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 italic">{type.toUpperCase()} NOTIFICATION</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className={`p-6 rounded-3xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-100/50 border-white/20'}`}>
                        <p className="text-lg font-bold leading-relaxed opacity-80 whitespace-pre-wrap">{message}</p>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    {type === 'confirm' || type === 'warning' ? (
                        <>
                            <button
                                onClick={onCancel}
                                className="flex-1 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent text-gray-400"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-[1.5] py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl transition hover:scale-[1.02] active:scale-95 text-white ${type === 'warning' ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/20'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onConfirm}
                            className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl transition hover:scale-[1.02] active:scale-95 text-white ${type === 'error' ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/20' :
                                type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-600/20' :
                                    'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/20'
                                }`}
                        >
                            已明白
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;

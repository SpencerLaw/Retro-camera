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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCancel}></div>

            <div className={`relative w-full max-w-md p-8 space-y-6 shadow-2xl rounded-[2rem] border scale-100 animate-in zoom-in-95 duration-300 ${isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">{title}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">{type.toUpperCase()} MODE</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-base font-bold leading-relaxed opacity-80 whitespace-pre-wrap">{message}</p>
                </div>

                <div className="flex gap-4 pt-2">
                    {type === 'confirm' || type === 'warning' ? (
                        <>
                            <button
                                onClick={onCancel}
                                className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-[1.5] py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition hover:scale-[1.02] active:scale-95 text-white ${type === 'warning' ? 'bg-red-500 shadow-red-500/20' : 'bg-blue-500 shadow-blue-500/20'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onConfirm}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition hover:scale-[1.02] active:scale-95 text-white ${type === 'error' ? 'bg-red-500 shadow-red-500/20' :
                                type === 'success' ? 'bg-green-600 shadow-green-600/20' :
                                    'bg-blue-500 shadow-blue-500/20'
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

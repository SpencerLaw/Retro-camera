import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';

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
    isEmergency?: boolean;
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
}) => {
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 size={28} className="text-green-500" />;
            case 'error': return <AlertCircle size={28} className="text-red-500" />;
            case 'warning': return <AlertCircle size={28} className="text-orange-500" />;
            case 'confirm': return <HelpCircle size={28} className="text-blue-500" />;
            default: return <Info size={28} className="text-blue-500" />;
        }
    };

    const iconBg =
        type === 'error' ? 'bg-red-50' :
            type === 'success' ? 'bg-green-50' :
                type === 'warning' ? 'bg-orange-50' :
                    'bg-blue-50';

    const accentBar =
        type === 'warning' || type === 'error'
            ? 'from-red-500 to-rose-500'
            : type === 'success'
                ? 'from-green-500 to-emerald-500'
                : 'from-blue-500 to-indigo-500';

    const confirmCls =
        type === 'warning' || type === 'error'
            ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-600/20'
            : type === 'success'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-600/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/20';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-10">
            {/* Dark scrim – always dark so white card always pops against any bg */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Card */}
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_80px_-8px_rgba(0,0,0,0.35)] border border-black/[0.06] overflow-hidden animate-in zoom-in-95 fade-in duration-200">

                {/* Colour-coded top strip */}
                <div className={`h-1 w-full bg-gradient-to-r ${accentBar}`} />

                <div className="p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-0.5">
                                {type.toUpperCase()} · NOTIFICATION
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <p className="text-base font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{message}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        {(type === 'confirm' || type === 'warning') ? (
                            <>
                                <button
                                    onClick={onCancel}
                                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={`flex-[1.5] py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all ${confirmCls}`}
                                >
                                    {confirmText}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onConfirm}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all ${confirmCls}`}
                            >
                                已明白
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Send, Tv, Key, CheckCircle2, AlertCircle,
    Loader2, LogOut, Sun, Moon, LayoutGrid, Radio, Bug
} from 'lucide-react';
import Sender from './Sender';
import Receiver from './Receiver';
import FishAudioDebug from './components/FishAudioDebug';
import { isBCVerified, verifyLicense, clearBCLicense, getBCLicense } from './utils/licenseManager';
import { useTranslations } from '../hooks/useTranslations';
import CustomDialog, { DialogType } from './components/CustomDialog';

const GlassContainer = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`backdrop-blur-[10px] bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[2rem] ${className}`}>
        {children}
    </div>
);

const BroadcastApp: React.FC<{ forceReceiver?: boolean }> = ({ forceReceiver = false }) => {
    const navigate = useNavigate();
    const t = useTranslations();
    const [mode, setModeRaw] = useState<'selection' | 'sender' | 'receiver' | 'license'>(() => {
        if (forceReceiver) return 'receiver';
        const params = new URLSearchParams(window.location.search);
        if (params.get('receiver') === '1') return 'receiver';
        // 恢复上次的模式（仅恢复 sender 和 receiver，不恢复 selection）
        const saved = localStorage.getItem('bc_mode') as 'sender' | 'receiver' | null;
        if (saved === 'sender' || saved === 'receiver') return saved;
        return 'selection';
    });

    // 包裹 setMode，同时持久化到 localStorage
    const setMode = (m: 'selection' | 'sender' | 'receiver' | 'license') => {
        if (m === 'sender' || m === 'receiver') {
            localStorage.setItem('bc_mode', m);
        } else {
            localStorage.removeItem('bc_mode');
        }
        setModeRaw(m);
    };
    const [theme, setTheme] = useState<'light' | 'dark'>(
        localStorage.getItem('bc_theme') as 'light' | 'dark' ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
    const [licenseInput, setLicenseInput] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [showFishDebug, setShowFishDebug] = useState(false);
    const [fishAudioVoice, setFishAudioVoice] = useState(() => {
        const license = getBCLicense();
        return localStorage.getItem(`br_fish_voice_${license || 'DEMO-ONLY'}`) || '';
    });

    // Custom Dialog State
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: DialogType;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
    const openDialog = (title: string, message: string, type: DialogType, onConfirm: () => void) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('bc_theme', theme);
    }, [theme]);

    const handleVerify = async () => {
        if (!licenseInput.trim()) return;
        setVerifying(true);
        setError('');
        const result = await verifyLicense(licenseInput);
        if (result.success) {
            setMode('sender');
        } else {
            setError(result.message || t('broadcast.license.invalidCode'));
        }
        setVerifying(false);
    };

    const handleLogout = async () => {
        openDialog(
            t('broadcast.teacherMode'),
            t('broadcast.logoutConfirm'),
            'confirm',
            async () => {
                await clearBCLicense();
                setMode('selection');
                closeDialog();
            }
        );
    };

    const handleSelectFishVoice = (voiceId: string) => {
        setFishAudioVoice(voiceId);
        const license = getBCLicense();
        localStorage.setItem(`br_fish_voice_${license || 'DEMO-ONLY'}`, voiceId);
        setShowFishDebug(false);
    };

    const handleTeacherMode = async () => {
        if (isBCVerified()) {
            // Re-validate license to ensure it's still active
            const currentLicense = getBCLicense();
            if (currentLicense) {
                setVerifying(true);
                const result = await verifyLicense(currentLicense, false);
                setVerifying(false);

                if (result.success) {
                    setMode('sender');
                } else {
                    // License is no longer valid, clear it and show license screen
                    await clearBCLicense();
                    setError(result.message || 'License is no longer valid');
                    setMode('license');
                }
            } else {
                setMode('license');
            }
        } else {
            setMode('license');
        }
    };

    if (mode === 'license') {
        return (
            <div className={`min-h-[100dvh] transition-colors duration-500 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-[#F5F5F7] text-gray-900'}`}>
                {/* Optimized background */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay"
                    style={{
                        background: theme === 'dark'
                            ? 'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.05), transparent 40%), radial-gradient(circle at 100% 100%, rgba(147, 51, 234, 0.05), transparent 40%)'
                            : 'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.1), transparent 40%), radial-gradient(circle at 100% 100%, rgba(147, 51, 234, 0.1), transparent 40%)'
                    }}
                />

                <GlassContainer className="max-w-2xl w-full p-10 rounded-[2.5rem] relative">
                    <button onClick={() => setMode('selection')} className="absolute top-8 left-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition active:scale-95">
                        <ArrowLeft size={24} />
                    </button>

                    <button
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className="absolute top-8 right-8 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-orange-500 transition active:scale-95"
                    >
                        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                    </button>

                    <div className="flex flex-col items-center text-center space-y-8 mt-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <Key size={36} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">{t('broadcast.licenseTitle')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('broadcast.licenseSubtitle')}</p>
                        </div>

                        <div className="w-full space-y-4">
                            <input
                                type="text"
                                value={licenseInput}
                                onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                                placeholder={t('broadcast.licensePlaceholder')}
                                className="w-full h-14 bg-gray-100 dark:bg-white/5 border-none rounded-2xl px-6 text-center font-mono text-lg font-bold tracking-widest focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition uppercase"
                            />
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center justify-center gap-2">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:opacity-90 transition flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {verifying ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={22} className="group-hover:scale-110 transition-transform" />}
                            {verifying ? t('broadcast.verifying') : t('broadcast.verify')}
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors"
                        >
                            {t('broadcast.returnDashboard')}
                        </button>
                    </div>
                </GlassContainer>
            </div>
        );
    }

    if (mode === 'receiver') {
        return <Receiver isDark={theme === 'dark'} toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} onExit={() => setMode('selection')} onOpenDialog={openDialog} />;
    }

    return (
        <div className={`min-h-screen transition-colors duration-1000 ${theme === 'dark' ? 'bg-[#0a0a0f] text-white' : 'bg-slate-50 text-slate-900'} font-sans`}>
            {/* iOS 26 极简背景氛围 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-0 right-0 w-[50%] h-[50%] rounded-full blur-[120px] opacity-[0.03] transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-200'}`}></div>
                <div className={`absolute bottom-0 left-0 w-[50%] h-[50%] rounded-full blur-[120px] opacity-[0.03] transition-colors ${theme === 'dark' ? 'bg-purple-600' : 'bg-purple-200'}`}></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-16">
                <header className="relative flex items-center justify-center mb-6 md:mb-16 min-h-[48px]">
                    <div className="absolute left-2 md:left-4">
                        <button
                            onClick={() => mode === 'selection' ? navigate('/') : setMode('selection')}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full GlassContainer flex items-center justify-center hover:scale-110 active:scale-95 transition dark:bg-white/10"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center px-12 md:px-0">
                        <h1 className="text-xl md:text-3xl font-extrabold tracking-tighter text-center">
                            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                                {t('home.broadcast.title')}
                            </span>
                        </h1>
                    </div>

                    <div className="absolute right-1 md:right-4 flex gap-0.5 md:gap-2">
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="w-9 h-9 md:w-12 md:h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-white/40 dark:hover:bg-white/20 transition text-orange-500"
                        >
                            {theme === 'light' ? <Moon size={16} className="md:w-5 md:h-5" /> : <Sun size={16} className="md:w-5 md:h-5" />}
                        </button>
                        <button
                            onClick={() => setShowFishDebug(true)}
                            className="w-9 h-9 md:w-12 md:h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-indigo-500/10 text-indigo-500 transition active:scale-95"
                            title="Fish Audio TTS 调试"
                        >
                            <Bug size={16} className="md:w-5 md:h-5" />
                        </button>
                        {isBCVerified() && (
                            <button
                                onClick={handleLogout}
                                className="w-9 h-9 md:w-12 md:h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition"
                            >
                                <LogOut size={16} className="md:w-5 md:h-5" />
                            </button>
                        )}
                    </div>
                </header>

                <main className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
                    {mode === 'selection' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Mode Cards */}
                            {[
                                {
                                    m: 'sender' as const,
                                    title: t('broadcast.teacherMode'),
                                    sub: t('broadcast.teacherSubtitle'),
                                    desc: t('broadcast.teacherDesc'),
                                    icon: <Radio size={72} />,
                                    color: 'from-blue-500 to-indigo-600',
                                    handler: handleTeacherMode
                                },
                                {
                                    m: 'receiver' as const,
                                    title: t('broadcast.classroomMode'),
                                    sub: t('broadcast.classroomSubtitle'),
                                    desc: t('broadcast.classroomDesc'),
                                    icon: <Tv size={72} />,
                                    color: 'from-purple-500 to-pink-600',
                                    handler: () => setMode('receiver')
                                }
                            ].map((item) => (
                                <button
                                    key={item.m}
                                    onClick={item.handler}
                                    className="group relative h-[550px] p-16 rounded-[4rem] overflow-hidden transition duration-500 hover:-translate-y-4 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col text-left border border-white/10"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-[0.03] group-hover:opacity-10 dark:opacity-[0.08] dark:group-hover:opacity-20 transition-opacity`}></div>
                                    <div className="relative z-10 flex-1">
                                        <div className={`w-36 h-36 rounded-[2.5rem] bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                                            {item.icon}
                                        </div>
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <span className={`text-sm font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity`}>{item.sub}</span>
                                        <h2 className="text-5xl font-extrabold tracking-tight">{item.title}</h2>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg leading-relaxed max-w-[280px]">{item.desc}</p>
                                    </div>
                                    <div className="absolute top-12 right-12 opacity-0 group-hover:opacity-20 transition-opacity -rotate-12 scale-150">
                                        {item.icon}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'sender' && (
                        <Sender
                            license={getBCLicense() || 'DEMO-ONLY'}
                            isDark={theme === 'dark'}
                            onExitToSelection={() => setMode('selection')}
                            onOpenDialog={openDialog}
                            fishAudioVoice={fishAudioVoice}
                            onSelectFishVoice={setFishAudioVoice}
                        />
                    )}
                    {mode === 'receiver' && (
                        <Receiver
                            isDark={theme === 'dark'}
                            onOpenDialog={openDialog}
                        />
                    )}
                </main>

            </div>

            <CustomDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                onConfirm={() => { dialog.onConfirm(); closeDialog(); }}
                onCancel={closeDialog}
                isDark={theme === 'dark'}
            />

            {showFishDebug && (
                <FishAudioDebug
                    onClose={() => setShowFishDebug(false)}
                    onSelectVoice={handleSelectFishVoice}
                    theme={theme}
                />
            )}
        </div>
    );
};

export default BroadcastApp;

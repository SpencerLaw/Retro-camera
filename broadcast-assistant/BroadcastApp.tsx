import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Send, Tv, Key, CheckCircle2, AlertCircle,
    Loader2, LogOut, Sun, Moon, LayoutGrid, Radio
} from 'lucide-react';
import Sender from './Sender';
import Receiver from './Receiver';
import { isBCVerified, verifyLicense, clearBCLicense, getBCLicense } from './utils/licenseManager';
import { useTranslations } from '../hooks/useTranslations';

const BroadcastApp: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslations();
    const [mode, setMode] = useState<'selection' | 'sender' | 'receiver' | 'license'>('selection');
    const [theme, setTheme] = useState<'light' | 'dark'>(
        localStorage.getItem('bc_theme') as 'light' | 'dark' ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
    const [licenseInput, setLicenseInput] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

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

    const handleLogout = () => {
        if (window.confirm(t('broadcast.logoutConfirm'))) {
            clearBCLicense();
            setMode('selection');
        }
    };

    const handleTeacherMode = () => {
        if (isBCVerified()) {
            setMode('sender');
        } else {
            setMode('license');
        }
    };

    const GlassContainer = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
        <div className={`backdrop-blur-3xl bg-white/95 dark:bg-black/80 border border-white/60 dark:border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] ${className}`}>
            {children}
        </div>
    );

    if (mode === 'license') {
        return (
            <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-[#F5F5F7]'}`}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                    <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${theme === 'dark' ? 'bg-purple-600' : 'bg-pink-400'}`}></div>
                </div>

                <GlassContainer className="max-w-md w-full p-10 rounded-[2.5rem] relative">
                    <button onClick={() => setMode('selection')} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center text-center space-y-8">
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
                                className="w-full h-14 bg-gray-100 dark:bg-white/5 border-none rounded-2xl px-6 text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
                            />
                            {error && <p className="text-red-500 text-xs font-medium flex items-center justify-center gap-1"><AlertCircle size={14} /> {error}</p>}
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
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

    return (
        <div className={`min-h-screen transition-colors duration-700 ${theme === 'dark' ? 'bg-[#000] text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'} font-sans`}>
            {/* Apple 风格流光背景 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className={`absolute top-0 left-1/4 w-[60%] h-[40%] rounded-full blur-[150px] opacity-10 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-200'}`}></div>
                <div className={`absolute bottom-0 right-1/4 w-[60%] h-[40%] rounded-full blur-[150px] opacity-10 transition-colors ${theme === 'dark' ? 'bg-purple-600' : 'bg-pink-100'}`}></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 lg:py-16">
                <header className="flex items-center justify-between mb-16 px-4">
                    <button
                        onClick={() => mode === 'selection' ? navigate('/') : setMode('selection')}
                        className="w-12 h-12 rounded-full GlassContainer flex items-center justify-center hover:scale-110 active:scale-95 transition-all dark:bg-white/10"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tighter flex items-center gap-2">
                            {t('home.broadcast.title').split(' ')[0]} <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">{t('home.broadcast.title').split(' ').slice(1).join(' ') || 'Assistant'}</span>
                        </h1>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="w-12 h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-white/40 dark:hover:bg-white/20 transition-all text-orange-500"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        {isBCVerified() && (
                            <button
                                onClick={handleLogout}
                                className="w-12 h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all"
                            >
                                <LogOut size={20} />
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
                                    className="group relative h-[500px] p-16 rounded-[4rem] overflow-hidden transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col text-left border border-white/10"
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

                    {mode === 'sender' && <Sender license={getBCLicense() || 'DEMO-ONLY'} isDark={theme === 'dark'} />}
                    {mode === 'receiver' && <Receiver isDark={theme === 'dark'} />}
                </main>

            </div>
        </div>
    );
};

export default BroadcastApp;

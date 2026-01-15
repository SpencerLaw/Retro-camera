import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Send, Tv, Info, Key, CheckCircle2, AlertCircle,
    Loader2, LogOut, Sun, Moon, LayoutGrid, Radio
} from 'lucide-react';
import Sender from './Sender';
import Receiver from './Receiver';
import { isBCVerified, verifyLicense, clearBCLicense, getBCLicense } from './utils/licenseManager';

const BroadcastApp: React.FC = () => {
    const navigate = useNavigate();
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

    useEffect(() => {
        if (!isBCVerified()) {
            setMode('license');
        }
    }, []);

    const handleVerify = async () => {
        if (!licenseInput.trim()) return;
        setVerifying(true);
        setError('');
        const result = await verifyLicense(licenseInput);
        if (result.success) {
            setMode('selection');
        } else {
            setError(result.message || 'Verification Failed');
        }
        setVerifying(false);
    };

    const handleLogout = () => {
        if (window.confirm('Sign out from this license?')) {
            clearBCLicense();
            setMode('license');
        }
    };

    // Apple 风格的高级毛玻璃背景
    const GlassContainer = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
        <div className={`backdrop-blur-2xl bg-white/70 dark:bg-black/60 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] ${className}`}>
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
                    <div className="flex flex-col items-center text-center space-y-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <Key size={36} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">Active Product</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Enter your license code to release the magic.</p>
                        </div>

                        <div className="w-full space-y-4">
                            <input
                                type="text"
                                value={licenseInput}
                                onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
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
                            {verifying ? 'Verifying...' : 'Continue'}
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </GlassContainer>
            </div>
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-700 ${theme === 'dark' ? 'bg-[#000] text-white' : 'bg-[#FBFBFD] text-[#1D1D1F]'} font-sans`}>
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
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40 mb-1">Apple Eco Ecosystem</span>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tighter flex items-center gap-2">
                            Broadcast <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Assistant</span>
                        </h1>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="w-12 h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-white/40 dark:hover:bg-white/20 transition-all text-orange-500"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-12 h-12 rounded-full GlassContainer flex items-center justify-center hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <main className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
                    {mode === 'selection' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Mode Cards */}
                            {[
                                {
                                    m: 'sender' as const,
                                    title: 'Teacher Mode',
                                    sub: 'Control Room',
                                    desc: 'Launch professional broadcasts with real-time feedback.',
                                    icon: <Radio size={56} />,
                                    color: 'from-blue-500 to-indigo-600'
                                },
                                {
                                    m: 'receiver' as const,
                                    title: 'Classroom Mode',
                                    sub: 'Live Station',
                                    desc: 'Immersive display with zero-latency audio sync.',
                                    icon: <Tv size={56} />,
                                    color: 'from-purple-500 to-pink-600'
                                }
                            ].map((item) => (
                                <button
                                    key={item.m}
                                    onClick={() => setMode(item.m)}
                                    className="group relative h-[380px] p-12 rounded-[3.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col text-left border border-white/10"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-[0.03] group-hover:opacity-10 dark:opacity-[0.08] dark:group-hover:opacity-20 transition-opacity`}></div>
                                    <div className="relative z-10 flex-1">
                                        <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                                            {item.icon}
                                        </div>
                                    </div>
                                    <div className="relative z-10 space-y-3">
                                        <span className={`text-xs font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity`}>{item.sub}</span>
                                        <h2 className="text-4xl font-extrabold tracking-tight">{item.title}</h2>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-[240px]">{item.desc}</p>
                                    </div>
                                    <div className="absolute top-12 right-12 opacity-0 group-hover:opacity-20 transition-opacity -rotate-12 scale-150">
                                        {item.icon}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'sender' && <Sender license={getBCLicense() || ''} isDark={theme === 'dark'} />}
                    {mode === 'receiver' && <Receiver license={getBCLicense() || ''} isDark={theme === 'dark'} />}
                </main>

                {mode === 'selection' && (
                    <footer className="mt-24 text-center space-y-8 animate-in fade-in duration-1000 delay-300 px-4">
                        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500">
                            <LayoutGrid size={14} /> System Infrastructure
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left opacity-60 hover:opacity-100 transition-opacity px-10">
                            <div className="space-y-3">
                                <h4 className="font-bold text-sm tracking-tight">Enterprise Security</h4>
                                <p className="text-[13px] leading-relaxed">Multi-tenant isolation powered by license key hashing and end-to-end channel segregation.</p>
                            </div>
                            <div className="space-y-3 border-x border-gray-100 dark:border-white/5 md:px-10">
                                <h4 className="font-bold text-sm tracking-tight">Global Proximity</h4>
                                <p className="text-[13px] leading-relaxed">Seamlessly operating through Vercel Global Edge Network with zero-config accessibility in China.</p>
                            </div>
                            <div className="space-y-3 md:pl-10">
                                <h4 className="font-bold text-sm tracking-tight">Audio Synthesis</h4>
                                <p className="text-[13px] leading-relaxed">Smart text-to-speech engine with emergency bypass and repetitive broadcast logic.</p>
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default BroadcastApp;

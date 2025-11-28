import React, { useState, useEffect } from 'react';
import { GameState, FortuneData, Language } from './types';
import { generateFortune } from './services/geminiService';
import { RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';

// --- Translations ---
const translations = {
  'zh-TW': {
    title: '靈簽',
    subtitle: '誠心祈求 • 指點迷津',
    buttonIdle: '點擊抽簽',
    buttonShaking: '誠心祈禱中...',
    buttonRevealing: '解簽中...',
    meaning: '解曰',
    again: '再抽一次',
    loading: '正在讀取天機...',
    backHome: '返回首頁'
  },
  'zh-CN': {
    title: '灵签',
    subtitle: '诚心祈求 • 指点迷津',
    buttonIdle: '点击抽签',
    buttonShaking: '诚心祈祷中...',
    buttonRevealing: '解签中...',
    meaning: '解曰',
    again: '再抽一次',
    loading: '正在读取天机...',
    backHome: '返回首页'
  },
  'en': {
    title: 'Fortune',
    subtitle: 'Seek Wisdom • Find Destiny',
    buttonIdle: 'Draw Stick',
    buttonShaking: 'Praying...',
    buttonRevealing: 'Interpreting...',
    meaning: 'Meaning',
    again: 'Draw Again',
    loading: 'Divining...',
    backHome: 'Back Home'
  },
  'ja': {
    title: 'おみくじ',
    subtitle: '誠心誠意 • 運命を知る',
    buttonIdle: 'おみくじを引く',
    buttonShaking: '祈祷中...',
    buttonRevealing: '解読中...',
    meaning: '運勢',
    again: 'もう一度引く',
    loading: '天命を読み取っています...',
    backHome: 'ホームに戻る'
  }
};

interface FortuneAppProps {
  onBackHome: () => void;
}

// Map global language to fortune app language
const mapGlobalToFortuneLang = (globalLang: GlobalLanguage): Language => {
  if (globalLang === 'zh-CN') return 'zh-CN';
  if (globalLang === 'zh-TW') return 'zh-TW';
  if (globalLang === 'ja') return 'ja';
  return 'en';
};

const FortuneApp: React.FC<FortuneAppProps> = ({ onBackHome }) => {
  const { language: globalLanguage } = useLanguage();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  
  const language = mapGlobalToFortuneLang(globalLanguage);
  const t = translations[language];

  // Stick configuration with randomized animation props for independent movement
  const [stickConfig] = useState(() => 
    [...Array(24)].map((_, i) => ({
      height: 70 + Math.random() * 50,
      rotation: (i - 12) * 3 + (Math.random() * 6 - 3),
      color: i % 2 === 0 ? 'bg-[#d4a373]' : 'bg-[#c19a6b]',
      // Random animation props for chaos
      animDuration: `${0.08 + Math.random() * 0.12}s`,
      animDelay: `-${Math.random() * 0.5}s`
    }))
  );

  const handleShake = async () => {
    if (gameState !== 'idle') return;

    setGameState('shaking');

    // 1. Start API call
    const fortunePromise = generateFortune(language);

    // 2. Artificial delay (min 2.5s for shaking)
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const [data] = await Promise.all([fortunePromise, minDelay]);
      setFortune(data);
      setGameState('dropping');
      
      // 3. Wait for drop animation (1.2s) then show result
      setTimeout(() => {
        setGameState('revealed');
      }, 1500);

    } catch (e) {
      console.error(e);
      setGameState('idle');
    }
  };

  const handleReset = () => {
    setGameState('idle');
    setFortune(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#2b0a0a] flex flex-col items-center justify-center relative overflow-hidden font-serif text-[#fdf6e3]">
      
      {/* --- Background Layers --- */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5e0a0a] via-[#3d0404] to-[#1a0202] z-0"></div>
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
           }}>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-600/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      {/* --- Back Home Button --- */}
      <button
        onClick={onBackHome}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/80 hover:bg-white border-2 border-[#1293EE] backdrop-blur-sm transition-all text-[#1293EE] hover:text-[#0d6ab8] shadow-lg"
      >
        <ArrowLeft size={24} />
      </button>


      {/* --- Main Content --- */}

      {/* Title */}
      <div className={`z-10 mb-12 text-center transition-all duration-500 ${gameState === 'revealed' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="inline-block relative mb-2">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] to-[#bf953f] tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-serif">
            {t.title}
            </h1>
            <div className="absolute -top-4 -right-8 w-12 h-12 border-2 border-red-500/60 rounded-full flex items-center justify-center opacity-60 rotate-12">
                <span className="text-red-500/60 text-xs font-bold writing-vertical-rl">大吉</span>
            </div>
        </div>
        <p className="text-[#e6cca0] text-lg md:text-xl tracking-[0.5em] font-light uppercase opacity-80">{t.subtitle}</p>
      </div>

      {/* SVG Scene */}
      <div className={`relative z-10 w-[300px] h-[400px] flex justify-center items-end transition-all duration-500 ${gameState === 'revealed' ? 'blur-sm scale-90 opacity-50' : ''}`}>
        
        {/* Falling Stick - Starts hidden inside, then pops out */}
        {gameState === 'dropping' && (
           <div className="absolute top-[40px] left-1/2 -translate-x-1/2 z-20 animate-drop origin-bottom">
             <StickSVG label={language === 'zh-TW' || language === 'zh-CN' ? fortune?.title.split(' ')[0] : '?'} />
           </div>
        )}

        {/* Container (Qian Tong) */}
        <div className={`relative z-10 transition-transform duration-300 origin-bottom ${gameState === 'shaking' ? 'rotate-[0deg]' : 'rotate-0'}`}>
            
            <div 
              className={`origin-bottom cursor-pointer ${gameState === 'shaking' ? 'animate-shake' : 'hover:-translate-y-1 transition-transform duration-300'}`}
              onClick={handleShake}
            >
              <ContainerSVG title={language === 'zh-CN' ? '灵签' : '靈簽'} />
              
              {/* Sticks inside */}
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[140px] h-[120px] overflow-hidden z-0 pointer-events-none mask-image-gradient">
                  <div className="flex justify-center items-end w-full h-full relative">
                      {stickConfig.map((conf, i) => (
                        <div 
                          key={i} 
                          className={`absolute bottom-0 w-[6px] rounded-t-sm border-x border-[#8c6b4a] shadow-inner ${conf.color} ${gameState === 'shaking' ? 'animate-jostle' : ''}`}
                          style={{ 
                            height: `${conf.height}px`, 
                            left: `calc(50% + ${(i - 12) * 5}px)`,
                            transform: `rotate(${conf.rotation}deg)`,
                            transformOrigin: 'bottom center',
                            animationDuration: gameState === 'shaking' ? conf.animDuration : '0s',
                            animationDelay: gameState === 'shaking' ? conf.animDelay : '0s',
                            zIndex: i % 3
                          }}
                        />
                      ))}
                  </div>
              </div>
           </div>
        </div>
      </div>

      {/* Action Button */}
      <div className={`z-20 mt-16 transition-all duration-500 ${gameState === 'revealed' ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100'}`}>
        <button 
          onClick={handleShake}
          disabled={gameState !== 'idle'}
          className="group relative px-16 py-4 overflow-hidden rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] opacity-100 border border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.3)]"></div>
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-3 text-[#3d0404] font-bold text-xl tracking-wider">
            {gameState === 'shaking' ? (
               <>
                 <Loader2 className="animate-spin" size={24} />
                 <span>{t.buttonShaking}</span>
               </>
            ) : (
               <span>{gameState === 'idle' ? t.buttonIdle : t.buttonRevealing}</span>
            )}
          </div>
        </button>
      </div>

      {/* --- Result Modal --- */}
      {gameState === 'revealed' && fortune && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          
          <div className="bg-[#fdf6e3] w-full max-w-md rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden border-y-[16px] border-x-4 border-[#8B0000] relative flex flex-col max-h-[90vh] animate-appear">
            
            <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-[#d4af37] rounded-tl-3xl opacity-80 pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-[#d4af37] rounded-tr-3xl opacity-80 pointer-events-none"></div>
            <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-[#d4af37] rounded-bl-3xl opacity-80 pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-[#d4af37] rounded-br-3xl opacity-80 pointer-events-none"></div>

            <div className="p-8 flex flex-col items-center text-[#2c2c2c] overflow-y-auto custom-scrollbar relative">
              
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                 <div className="text-9xl font-serif font-bold text-black rotate-12">運</div>
              </div>

              <div className="bg-[#e6cca0] w-14 h-64 mb-6 rounded-full flex items-center justify-center border border-[#8c6b4a] shadow-xl relative group transform transition-transform hover:scale-105 shrink-0">
                <div className="absolute inset-1 border border-[#8c6b4a]/30 rounded-full"></div>
                <span className={`text-2xl font-bold text-[#8B0000] tracking-widest font-serif select-none drop-shadow-sm ${['zh-TW', 'zh-CN', 'ja'].includes(language) ? 'writing-vertical' : '-rotate-90 whitespace-nowrap'}`}>
                  {fortune.title.split(' ')[0]}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-[#8B0000] mb-2 text-center font-serif leading-tight">{fortune.title}</h2>
              
              <div className="flex items-center gap-3 mb-6 w-full justify-center opacity-40">
                 <div className="h-[2px] w-16 bg-black"></div>
                 <div className="w-3 h-3 rotate-45 border border-black bg-transparent"></div>
                 <div className="h-[2px] w-16 bg-black"></div>
              </div>

              <div className="bg-[#f0e6d2] p-6 rounded-sm border border-[#d6c4a8] mb-6 w-full shadow-inner relative">
                <div className={`flex justify-center font-serif font-bold text-[#3d2b1f] ${['zh-TW', 'zh-CN', 'ja'].includes(language) ? 'gap-6 md:gap-8 text-lg md:text-xl flex-row-reverse' : 'flex-col gap-2 text-center text-lg italic'}`}>
                  
                  {['zh-TW', 'zh-CN', 'ja'].includes(language) 
                    ? [...fortune.poem].reverse().map((line, i) => (
                        <div key={i} className="writing-vertical-rl tracking-[0.2em] leading-loose h-40 border-l border-black/5 pl-2">
                          {line}
                        </div>
                      ))
                    : fortune.poem.map((line, i) => (
                        <div key={i} className="leading-relaxed">
                          {line}
                        </div>
                      ))
                  }
                </div>
              </div>

              <div className="text-center space-y-6 w-full relative z-10">
                 <div className="relative inline-block min-w-[50%]">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B0000] text-[#fdf6e3] text-xs px-3 py-0.5 rounded-full shadow border border-[#fdf6e3] tracking-wider">
                      {t.meaning}
                    </span>
                    <div className="border border-[#8B0000]/20 rounded px-4 py-4 bg-[#fffdf5] shadow-sm">
                        <p className="text-xl font-bold text-[#3d0404]">{fortune.meaning}</p>
                    </div>
                 </div>
                 
                 <div className="text-left bg-[#fffdf5] p-5 rounded text-sm md:text-base leading-relaxed text-[#4a3b32] border-l-4 border-[#8B0000]/60 shadow-sm">
                    <p className={['zh-TW', 'zh-CN', 'ja'].includes(language) ? 'indent-8 text-justify' : 'text-left'}>
                      {fortune.interpretation}
                    </p>
                 </div>
              </div>

            </div>

            <div className="p-5 bg-[#f0e6d2] flex justify-center border-t border-[#d6c4a8]">
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-8 py-3 bg-[#3d0404] text-[#fdf6e3] rounded hover:bg-[#5e0a0a] transition-all hover:shadow-lg active:scale-95 group"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                <span className="tracking-widest font-bold">{t.again}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .writing-vertical {
            writing-mode: vertical-rl;
            text-orientation: upright;
        }
        .writing-vertical-rl {
            writing-mode: vertical-rl;
        }
      `}</style>
    </div>
  );
};

// --- SVG Components ---

const StickSVG: React.FC<{ label?: string }> = ({ label }) => (
  <svg width="40" height="240" viewBox="0 0 40 240" className="drop-shadow-lg">
    <path d="M10,0 L30,0 L30,240 L10,240 Z" fill="#d4a373" stroke="#8c6b4a" strokeWidth="1" />
    <rect x="10" y="10" width="20" height="15" fill="#8B0000" opacity="0.9" />
    <rect x="10" y="215" width="20" height="15" fill="#8B0000" opacity="0.9" />
    <path d="M15,30 L15,210" stroke="#b08d55" strokeWidth="1" opacity="0.5" />
    <path d="M25,30 L25,210" stroke="#b08d55" strokeWidth="1" opacity="0.5" />
    {label && (
       <text x="20" y="120" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#5c4033" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', fontFamily: 'serif' }}>
         {label}
       </text>
    )}
  </svg>
);

const ContainerSVG: React.FC<{ title: string }> = ({ title }) => (
  <svg width="200" height="260" viewBox="0 0 200 260" className="drop-shadow-2xl">
    <defs>
      <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3d2b1f" />
        <stop offset="30%" stopColor="#5c4033" />
        <stop offset="60%" stopColor="#8c6b4a" />
        <stop offset="100%" stopColor="#3d2b1f" />
      </linearGradient>
      <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1a120d" />
        <stop offset="100%" stopColor="#2b1d16" />
      </linearGradient>
    </defs>

    <ellipse cx="100" cy="40" rx="75" ry="22" fill="url(#innerGrad)" stroke="#2b1d16" strokeWidth="2" />
    <path d="M25,40 L35,230 C35,250 165,250 165,230 L175,40" fill="url(#woodGrad)" stroke="#2b1d16" strokeWidth="2" />
    <path d="M28,100 Q100,120 172,100" fill="none" stroke="#2b1d16" strokeWidth="2" opacity="0.3" />
    <path d="M32,160 Q100,180 168,160" fill="none" stroke="#2b1d16" strokeWidth="2" opacity="0.3" />
    <path d="M25,40 Q100,65 175,40" fill="none" stroke="#2b1d16" strokeWidth="3" strokeLinecap="round" />
    <path d="M50,50 L60,220" stroke="#ffffff" strokeWidth="8" opacity="0.03" strokeLinecap="round" filter="blur(2px)" />

    {/* Label Plate */}
    <rect x="82" y="75" width="36" height="100" fill="#8B0000" stroke="#5c0000" strokeWidth="1" />
    <rect x="85" y="78" width="30" height="94" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.8" />
    
    <text x="100" y="125" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#FFD700" style={{ fontFamily: 'serif', writingMode: 'vertical-rl', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
      {title}
    </text>
  </svg>
);

export default FortuneApp;


import React from 'react';
import { Camera, Sparkles, Heart, Globe, Cloud } from 'lucide-react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
import { useTranslations } from '../hooks/useTranslations';

interface HomePageProps {
  onSelectProject: (project: 'camera' | 'fortune' | 'couple' | 'doraemon' | 'weather') => void;
}

const languageLabels: Record<GlobalLanguage, string> = {
  'en': 'EN',
  'zh-CN': '简体',
  'zh-TW': '繁體',
  'ja': '日本語'
};

export const HomePage: React.FC<HomePageProps> = ({ onSelectProject }) => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 py-8 relative overflow-y-auto overflow-x-hidden">
      {/* Kawaii Sky Background - Pastel Gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#FFE5EC] via-[#FFF0F5] to-[#E6F3FF]"></div>

      {/* Floating Cute Clouds */}
      <div className="fixed inset-0 opacity-60 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-32 bg-white/80 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-40 right-20 w-80 h-40 bg-white/70 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-72 h-36 bg-white/75 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '3s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-28 bg-white/65 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '5s' }}></div>
      </div>

      {/* Sparkles and Stars */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <div className="text-2xl opacity-60">✨</div>
          </div>
        ))}
        {[...Array(15)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <div className="text-xl opacity-50">⭐</div>
          </div>
        ))}
      </div>

      {/* Rainbow Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#FFB5E8]/10 via-[#B5DEFF]/10 to-[#FFFFD1]/10"></div>

      {/* Soft Glow Overlay */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 30% 20%, #FFB5E8 0%, transparent 50%), radial-gradient(circle at 70% 80%, #B5DEFF 0%, transparent 50%)',
        }}
      />
      
      {/* Global Language Switcher - Kawaii Style */}
      <div className="fixed top-6 right-6 z-50">
        <div className="relative group">
          <button
            className="p-3 rounded-full bg-gradient-to-br from-[#FFB5E8] to-[#FFC6FF] hover:from-[#FFC6FF] hover:to-[#FFD1FF] shadow-[0_8px_20px_rgba(255,182,193,0.5)] border-3 border-white transition-all hover:scale-110 hover:shadow-[0_12px_30px_rgba(255,182,193,0.7)] flex items-center gap-2 px-5 font-bold hover:rotate-3"
          >
            <Globe size={22} className="text-white drop-shadow-md" />
            <span className="text-sm font-marker text-white drop-shadow-md">{languageLabels[language]}</span>
          </button>
          <div className="absolute right-0 mt-3 w-32 py-2 bg-white/98 backdrop-blur-xl border-3 border-[#FFB5E8] rounded-2xl shadow-[0_12px_24px_rgba(255,182,193,0.4)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
            {(Object.keys(languageLabels) as GlobalLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gradient-to-r hover:from-[#FFE5EC] hover:to-[#FFF0F5] transition-colors rounded-lg font-bold ${
                  language === lang ? 'text-[#FF69B4] bg-gradient-to-r from-[#FFE5EC] to-[#FFF0F5]' : 'text-[#FF8DC7]'
                }`}
              >
                {languageLabels[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl my-8">
        {/* Title - Super Kawaii Style with Bouncy Effect */}
        <div className="text-center mb-8 md:mb-16">
          <div className="relative inline-block">
            {/* Cute floating hearts */}
            <div className="absolute -top-8 -left-8 text-4xl animate-bounce" style={{ animationDuration: '2s' }}>💗</div>
            <div className="absolute -top-6 -right-10 text-3xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>💖</div>
            <h1
              className="font-marker text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-4 animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #FF6B9D 0%, #FFA8E4 25%, #FFD4F0 50%, #B5DEFF 75%, #A0D8FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 30px rgba(255,182,193,0.3)',
                filter: 'drop-shadow(0 4px 12px rgba(255,105,180,0.3)) drop-shadow(0 0 20px rgba(255,182,193,0.2))',
                animationDuration: '3s'
              }}
            >
              {t('home.title')} ✨
            </h1>
          </div>
          <p
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl px-4 font-marker font-bold"
            style={{
              background: 'linear-gradient(90deg, #FF8DC7 0%, #FFA8E4 50%, #B5DEFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 8px rgba(255,182,193,0.3))'
            }}
          >
            {t('home.subtitle')} 🌈
          </p>
        </div>

        {/* Project Cards - Super Kawaii Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8 lg:gap-6 px-4">
          {/* Retro Camera Card - Cute Pink */}
          <div
            onClick={() => onSelectProject('camera')}
            className="group relative bg-gradient-to-br from-[#FFD6E8] via-[#FFC1E3] to-[#FFB5E8] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(255,105,180,0.3)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(255,105,180,0.5)] hover:rotate-2"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute floating hearts decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>💕</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#FFB5E8] to-[#FFC6FF] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(255,105,180,0.3)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#FFE5F0]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Camera size={72} className="text-[#FF69B4] drop-shadow-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-marker text-4xl text-[#D5006D] mb-3 font-bold drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.camera.title')}</h2>
              <p className="text-base text-[#B8005C] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.camera.subtitle')}
              </p>
              <p className="text-sm text-[#A0004D] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.camera.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#FF69B4] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(255,105,180,0.3)] border-[3px] border-[#FFE5F0] hover:bg-gradient-to-r hover:from-[#FFE5F0] hover:to-white">
                  Enter → 💖
                </div>
              </div>
            </div>
          </div>

          {/* Fortune Sticks Card - Cute Golden */}
          <div
            onClick={() => onSelectProject('fortune')}
            className="group relative bg-gradient-to-br from-[#FFF8DC] via-[#FFEAA7] to-[#FDCB6E] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(253,203,110,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(253,203,110,0.6)] hover:rotate-2"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute star decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>🌟</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#FDCB6E] to-[#FFEAA7] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(253,203,110,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#FFF8DC]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Sparkles size={72} className="text-[#FDCB6E] drop-shadow-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-serif text-4xl text-[#D4A017] mb-3 font-bold drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.fortune.title')}</h2>
              <p className="text-base text-[#B8860B] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.fortune.subtitle')}
              </p>
              <p className="text-sm text-[#9A7D0A] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.fortune.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#FDCB6E] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(253,203,110,0.4)] border-[3px] border-[#FFF8DC] hover:bg-gradient-to-r hover:from-[#FFF8DC] hover:to-white">
                  Enter → ✨
                </div>
              </div>
            </div>
          </div>

          {/* Weather Card - Cute Sky Blue */}
          <div
            onClick={() => onSelectProject('weather')}
            className="group relative bg-gradient-to-br from-[#E0F7FA] via-[#B2EBF2] to-[#80DEEA] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(128,222,234,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(128,222,234,0.6)] hover:rotate-2"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute cloud decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>☁️</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#80DEEA] to-[#B2EBF2] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(128,222,234,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#E0F7FA]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Cloud size={72} className="text-[#4DD0E1] drop-shadow-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#00838F] mb-3 drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.weather.title')}</h2>
              <p className="text-base text-[#00695C] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.weather.subtitle')}
              </p>
              <p className="text-sm text-[#004D40] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.weather.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#4DD0E1] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(128,222,234,0.4)] border-[3px] border-[#E0F7FA] hover:bg-gradient-to-r hover:from-[#E0F7FA] hover:to-white">
                  Enter → 🌤️
                </div>
              </div>
            </div>
          </div>

          {/* Couple Game Card - Cute Purple */}
          <div
            onClick={() => onSelectProject('couple')}
            className="group relative bg-gradient-to-br from-[#E1BEE7] via-[#CE93D8] to-[#BA68C8] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(186,104,200,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(186,104,200,0.6)] hover:rotate-2"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute hearts decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>💝</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#BA68C8] to-[#CE93D8] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(186,104,200,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#E1BEE7]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Heart size={72} className="text-[#AB47BC] drop-shadow-lg" fill="#AB47BC" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#7B1FA2] mb-3 drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.couple.title')}</h2>
              <p className="text-base text-[#6A1B9A] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.couple.subtitle')}
              </p>
              <p className="text-sm text-[#4A148C] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.couple.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#AB47BC] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(186,104,200,0.4)] border-[3px] border-[#E1BEE7] hover:bg-gradient-to-r hover:from-[#E1BEE7] hover:to-white">
                  Enter → 💗
                </div>
              </div>
            </div>
          </div>

          {/* Doraemon Monitor Card - Cute Blue */}
          <div
            onClick={() => onSelectProject('doraemon')}
            className="group relative bg-gradient-to-br from-[#BBDEFB] via-[#90CAF9] to-[#64B5F6] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(100,181,246,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(100,181,246,0.6)] hover:rotate-2"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute bell decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>🔔</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#64B5F6] to-[#90CAF9] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon - Doraemon Face */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(100,181,246,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#BBDEFB]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Simple Doraemon Face */}
                <svg viewBox="0 0 100 100" className="w-28 h-28">
                  {/* Face */}
                  <circle cx="50" cy="50" r="48" fill="#42A5F5" stroke="#1E88E5" strokeWidth="2"/>
                  <circle cx="50" cy="60" r="35" fill="white" stroke="#90CAF9" strokeWidth="1.5"/>

                  {/* Eyes */}
                  <ellipse cx="35" cy="35" rx="11" ry="13" fill="white" stroke="#1E88E5" strokeWidth="1.5"/>
                  <ellipse cx="65" cy="35" rx="11" ry="13" fill="white" stroke="#1E88E5" strokeWidth="1.5"/>
                  <circle cx="38" cy="37" r="4" fill="#0D47A1"/>
                  <circle cx="62" cy="37" r="4" fill="#0D47A1"/>
                  <circle cx="40" cy="35" r="1.5" fill="#FFF"/>
                  <circle cx="64" cy="35" r="1.5" fill="#FFF"/>

                  {/* Nose */}
                  <circle cx="50" cy="48" r="7" fill="#EF5350" stroke="#E53935" strokeWidth="1.5"/>
                  <line x1="50" y1="55" x2="50" y2="70" stroke="#1E88E5" strokeWidth="1.5"/>

                  {/* Mouth */}
                  <path d="M 30,65 Q 50,85 70,65" fill="none" stroke="#1E88E5" strokeWidth="2" strokeLinecap="round"/>

                  {/* Bell */}
                  <circle cx="50" cy="90" r="8" fill="#FFD54F" stroke="#FFA726" strokeWidth="1.5"/>
                  <circle cx="50" cy="92" r="2" fill="#0D47A1"/>
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#0D47A1] mb-3 drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.doraemon.title')}</h2>
              <p className="text-base text-[#1565C0] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.doraemon.subtitle')}
              </p>
              <p className="text-sm text-[#1976D2] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.doraemon.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#42A5F5] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(100,181,246,0.4)] border-[3px] border-[#BBDEFB] hover:bg-gradient-to-r hover:from-[#BBDEFB] hover:to-white">
                  Enter → 🤖
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note - Kawaii Style */}
        <div className="text-center mt-12 space-y-3">
          {/* Version Badge with Kawaii Effect */}
          <div className="flex justify-center">
            <div className="relative group">
              {/* Rainbow Glow Shadow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-[#FFB5E8] via-[#B5DEFF] to-[#FFEAA7] rounded-full blur-lg opacity-70 group-hover:opacity-100 animate-pulse transition-opacity duration-300" style={{ animationDuration: '3s' }}></div>

              {/* Container */}
              <div
                className="relative px-8 py-3 bg-white rounded-full border-[4px] border-gradient-to-r from-[#FFB5E8] to-[#B5DEFF] shadow-[0_8px_24px_rgba(255,182,193,0.4)] group-hover:shadow-[0_12px_32px_rgba(255,182,193,0.6)] transition-all duration-300 group-hover:scale-110"
                style={{
                  background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #FFB5E8, #B5DEFF, #FFEAA7) border-box',
                  border: '4px solid transparent'
                }}
              >
                <span className="relative font-bold text-base tracking-wider bg-gradient-to-r from-[#FF69B4] via-[#4DD0E1] to-[#FDCB6E] bg-clip-text text-transparent">
                  v1.0.0 ✨
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

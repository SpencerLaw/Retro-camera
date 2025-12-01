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
      {/* Pixar-style Sky Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#87CEEB] via-[#98D8E8] to-[#B0E0E6]"></div>
      
      {/* Soft Clouds Layer */}
      <div className="fixed inset-0 opacity-40">
        <div className="absolute top-20 left-10 w-96 h-32 bg-white/60 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-40 right-20 w-80 h-40 bg-white/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-72 h-36 bg-white/55 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>
      </div>
      
      {/* Warm Sunlight Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#FFD700]/20 via-transparent to-[#FFA500]/15"></div>
      
      {/* Subtle Texture Overlay */}
      <div 
        className="fixed inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.3'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Global Language Switcher - Pixar Style */}
      <div className="fixed top-6 right-6 z-50">
        <div className="relative group">
          <button 
            className="p-3 rounded-2xl bg-white/95 hover:bg-white shadow-[0_8px_16px_rgba(0,0,0,0.15)] border-2 border-[#4A90E2] transition-all text-[#2C3E50] hover:text-[#1A252F] hover:scale-105 hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] flex items-center gap-2 px-4 font-bold"
            style={{ transform: 'perspective(1000px) rotateX(0deg)' }}
          >
            <Globe size={20} />
            <span className="text-sm font-marker">{languageLabels[language]}</span>
          </button>
          <div className="absolute right-0 mt-2 w-32 py-2 bg-white/95 backdrop-blur-xl border-2 border-[#4A90E2] rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
            {(Object.keys(languageLabels) as GlobalLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-[#E8F4F8] transition-colors rounded-lg font-bold ${
                  language === lang ? 'text-[#2C3E50] bg-[#E8F4F8]' : 'text-[#5A6C7D]'
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
        {/* Title - Pixar Style with 3D Effect */}
        <div className="text-center mb-8 md:mb-16">
          <h1 
            className="font-marker text-5xl sm:text-6xl md:text-7xl lg:text-9xl mb-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
            style={{
              color: '#2C3E50',
              textShadow: '0 4px 0 #1A252F, 0 8px 16px rgba(0,0,0,0.3), 0 0 40px rgba(255,255,255,0.5)',
              transform: 'perspective(1000px) rotateX(5deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {t('home.title')}
          </h1>
          <p 
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl px-4 font-marker font-bold"
            style={{
              color: '#34495E',
              textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(255,255,255,0.4)'
            }}
          >
            {t('home.subtitle')}
          </p>
        </div>

        {/* Project Cards - Pixar 3D Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8 lg:gap-6 px-4">
          {/* Retro Camera Card - Pink/Peach */}
          <div 
            onClick={() => onSelectProject('camera')}
            className="group relative bg-gradient-to-br from-[#FFB6C1] via-[#FFA8B8] to-[#FF9BB5] rounded-3xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-4 border-white/80"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(-5deg) rotateY(5deg) scale(1.1) translateY(-8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)';
            }}
          >
            {/* 3D Shadow Effect */}
            <div className="absolute -inset-2 bg-[#FF9BB5]/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div 
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 border-4 border-white"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Camera size={64} className="text-[#FF6B9D] drop-shadow-md" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-marker text-4xl text-[#8B4A6B] mb-3 font-bold drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">{t('home.camera.title')}</h2>
              <p className="text-base text-[#7A3A5A] mb-4 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {t('home.camera.subtitle')}
              </p>
              <p className="text-sm text-[#6B2A4A] leading-relaxed font-medium drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]">
                {t('home.camera.description')}
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-white/60">
                <div className="inline-block px-4 py-2 bg-white/90 text-[#8B4A6B] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-md border-2 border-white">
                  Enter →
                </div>
              </div>
            </div>
          </div>

          {/* Fortune Sticks Card - Golden/Yellow */}
          <div 
            onClick={() => onSelectProject('fortune')}
            className="group relative bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#FFB800] rounded-3xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-4 border-white/80"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(-5deg) rotateY(5deg) scale(1.1) translateY(-8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)';
            }}
          >
            {/* 3D Shadow Effect */}
            <div className="absolute -inset-2 bg-[#FFB800]/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div 
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 border-4 border-white"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Sparkles size={64} className="text-[#FF8C00] drop-shadow-md" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-serif text-4xl text-[#B8860B] mb-3 font-bold drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">{t('home.fortune.title')}</h2>
              <p className="text-base text-[#A6750A] mb-4 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {t('home.fortune.subtitle')}
              </p>
              <p className="text-sm text-[#956509] leading-relaxed font-medium drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]">
                {t('home.fortune.description')}
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-white/60">
                <div className="inline-block px-4 py-2 bg-white/90 text-[#B8860B] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-md border-2 border-white">
                  Enter →
                </div>
              </div>
            </div>
          </div>

          {/* Weather Card - Sky Blue/Turquoise */}
          <div
            onClick={() => onSelectProject('weather')}
            className="group relative bg-gradient-to-br from-[#4ECDC4] via-[#44A08D] to-[#3A8B7F] rounded-3xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-4 border-white/80"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(-5deg) rotateY(5deg) scale(1.1) translateY(-8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)';
            }}
          >
            {/* 3D Shadow Effect */}
            <div className="absolute -inset-2 bg-[#3A8B7F]/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div 
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 border-4 border-white"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Cloud size={64} className="text-[#2C5F52] drop-shadow-md" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#1A4D3E] mb-3 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">{t('home.weather.title')}</h2>
              <p className="text-base text-[#0F3D2E] mb-4 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {t('home.weather.subtitle')}
              </p>
              <p className="text-sm text-[#0A2D1F] leading-relaxed font-medium drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]">
                {t('home.weather.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-white/60">
                <div className="inline-block px-4 py-2 bg-white/90 text-[#1A4D3E] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-md border-2 border-white">
                  Enter →
                </div>
              </div>
            </div>
          </div>

          {/* Couple Game Card - Purple/Pink Gradient */}
          <div
            onClick={() => onSelectProject('couple')}
            className="group relative bg-gradient-to-br from-[#C77DFF] via-[#9D4EDD] to-[#7B2CBF] rounded-3xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-4 border-white/80"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(-5deg) rotateY(5deg) scale(1.1) translateY(-8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)';
            }}
          >
            {/* 3D Shadow Effect */}
            <div className="absolute -inset-2 bg-[#7B2CBF]/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 border-4 border-white"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Heart size={64} className="text-[#7B2CBF] drop-shadow-md" fill="#7B2CBF" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#5A1F8F] mb-3 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">{t('home.couple.title')}</h2>
              <p className="text-base text-[#4A1A7F] mb-4 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {t('home.couple.subtitle')}
              </p>
              <p className="text-sm text-[#3A156F] leading-relaxed font-medium drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]">
                {t('home.couple.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-white/60">
                <div className="inline-block px-4 py-2 bg-white/90 text-[#5A1F8F] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-md border-2 border-white">
                  Enter →
                </div>
              </div>
            </div>
          </div>

          {/* Doraemon Monitor Card - Blue */}
          <div
            onClick={() => onSelectProject('doraemon')}
            className="group relative bg-gradient-to-br from-[#5DADE2] via-[#3498DB] to-[#2980B9] rounded-3xl p-8 cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2 shadow-[0_12px_24px_rgba(0,0,0,0.2)] border-4 border-white/80"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(-5deg) rotateY(5deg) scale(1.1) translateY(-8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0px)';
            }}
          >
            {/* 3D Shadow Effect */}
            <div className="absolute -inset-2 bg-[#2980B9]/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Icon - Doraemon Face */}
            <div className="relative z-10 flex justify-center mb-6">
              <div 
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 border-4 border-white"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Simple Doraemon Face */}
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  {/* Face */}
                  <circle cx="50" cy="50" r="48" fill="#3498DB" stroke="#2980B9" strokeWidth="1.5"/>
                  <circle cx="50" cy="60" r="35" fill="white" stroke="#5DADE2" strokeWidth="1"/>

                  {/* Eyes */}
                  <ellipse cx="35" cy="35" rx="10" ry="12" fill="white" stroke="#2980B9" strokeWidth="1"/>
                  <ellipse cx="65" cy="35" rx="10" ry="12" fill="white" stroke="#2980B9" strokeWidth="1"/>
                  <circle cx="38" cy="37" r="3" fill="#1A5490"/>
                  <circle cx="62" cy="37" r="3" fill="#1A5490"/>
                  <circle cx="39" cy="35" r="1" fill="#FFF"/>
                  <circle cx="63" cy="35" r="1" fill="#FFF"/>

                  {/* Nose */}
                  <circle cx="50" cy="48" r="6" fill="#E74C3C" stroke="#C0392B" strokeWidth="1"/>
                  <line x1="50" y1="54" x2="50" y2="70" stroke="#2980B9" strokeWidth="1"/>

                  {/* Mouth */}
                  <path d="M 30,65 Q 50,85 70,65" fill="none" stroke="#2980B9" strokeWidth="1.5" strokeLinecap="round"/>

                  {/* Bell */}
                  <circle cx="50" cy="90" r="7" fill="#F1C40F" stroke="#F39C12" strokeWidth="1"/>
                  <circle cx="50" cy="92" r="1.5" fill="#1A5490"/>
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#1A5490] mb-3 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)]">{t('home.doraemon.title')}</h2>
              <p className="text-base text-[#154A7A] mb-4 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {t('home.doraemon.subtitle')}
              </p>
              <p className="text-sm text-[#103A6A] leading-relaxed font-medium drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]">
                {t('home.doraemon.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-white/60">
                <div className="inline-block px-4 py-2 bg-white/90 text-[#1A5490] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-md border-2 border-white">
                  Enter →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note - Pixar Style */}
        <div className="text-center mt-12 space-y-3">
          {/* Version Badge with 3D Effect */}
          <div className="flex justify-center">
            <div className="relative group">
              {/* 3D Shadow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#5DADE2] via-[#9D4EDD] to-[#FFB6C1] rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Container */}
              <div 
                className="relative px-8 py-3 bg-white/95 rounded-2xl border-4 border-[#4A90E2] shadow-[0_8px_16px_rgba(0,0,0,0.2)]"
                style={{ transform: 'perspective(1000px) rotateX(0deg)' }}
              >
                <span className="relative text-[#2C3E50] font-bold text-sm tracking-wider">
                  v1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
      {/* Base Gradient Background - Claude Orange */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#FF6B35] via-[#F7931E] to-[#FF8C42]"></div>
      
      {/* Secondary Gradient Layer */}
      <div className="fixed inset-0 bg-gradient-to-tr from-[#FF8C42]/60 via-[#FF6B35]/50 to-[#F7931E]/60"></div>
      
      {/* Frosted Glass Effect - Matte Texture */}
      <div 
        className="fixed inset-0 backdrop-blur-2xl"
        style={{
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")
          `,
        }}
      ></div>
      
      {/* Matte Texture Overlay */}
      <div 
        className="fixed inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.3'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      ></div>
      
      {/* Glass Morphism Layer */}
      <div className="fixed inset-0 backdrop-blur-xl bg-white/10"></div>
      
      {/* Subtle Pattern Overlay */}
      <div 
        className="fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Floating Glass Orbs - Orange Accents */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-[#FF8C42]/30 to-[#FF6B35]/25 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-[#F7931E]/35 to-[#FF8C42]/25 rounded-full blur-3xl opacity-45 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-br from-[#FF6B35]/25 to-[#F7931E]/30 rounded-full blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Global Language Switcher */}
      <div className="fixed top-6 right-6 z-50">
        <div className="relative group">
          <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/30 transition-all text-white hover:text-white shadow-lg flex items-center gap-2 px-4">
            <Globe size={20} />
            <span className="text-sm font-marker drop-shadow-md">{languageLabels[language]}</span>
          </button>
          <div className="absolute right-0 mt-2 w-32 py-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
            {(Object.keys(languageLabels) as GlobalLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/20 transition-colors rounded-lg ${
                  language === lang ? 'text-white font-bold' : 'text-white/90'
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
        {/* Title */}
        <div className="text-center mb-8 md:mb-16">
          <h1 className="font-marker text-5xl sm:text-6xl md:text-7xl lg:text-9xl text-white mb-4 drop-shadow-2xl" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(255,255,255,0.2)' }}>
            {t('home.title')}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 font-marker px-4 drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            {t('home.subtitle')}
          </p>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8 lg:gap-6 px-4">
          {/* Retro Camera Card */}
          <div 
            onClick={() => onSelectProject('camera')}
            className="group relative backdrop-blur-xl bg-white/20 rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-2xl border border-white/30"
          >
            {/* Card Background Pattern */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-5"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/cork-board.png")`,
              }}
            />
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-[#FFE5F1] via-[#FFD6E8] to-[#FFC8E0] rounded-full flex items-center justify-center shadow-md transform group-hover:rotate-12 transition-transform duration-300 border-2 border-[#FFE5F1]/50">
                <Camera size={64} className="text-[#FF9EC4] drop-shadow-sm" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-marker text-4xl text-[#D4A5A5] mb-3">{t('home.camera.title')}</h2>
              <p className="text-lg text-[#C99A9A] mb-4 opacity-90">
                {t('home.camera.subtitle')}
              </p>
              <p className="text-sm text-[#B88A8A] opacity-80 leading-relaxed">
                {t('home.camera.description')}
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t border-dashed border-[#FFD6E8]/40">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#FFE5F1] to-[#FFD6E8] text-[#D4A5A5] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FFE5F1]/0 via-[#FFD6E8]/15 to-[#FFC8E0]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>

          {/* Fortune Sticks Card */}
          <div 
            onClick={() => onSelectProject('fortune')}
            className="group relative backdrop-blur-xl bg-white/20 rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-2xl border border-white/30"
          >
            {/* Card Background Pattern */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD54F' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-[#FFECB3] via-[#FFE082] to-[#FFD54F] rounded-full flex items-center justify-center shadow-md transform group-hover:rotate-12 transition-transform duration-300 border-2 border-[#FFECB3]/50">
                <Sparkles size={64} className="text-[#F57F17] drop-shadow-sm" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-serif text-4xl text-[#F9A825] mb-3 font-bold">{t('home.fortune.title')}</h2>
              <p className="text-lg text-[#FBC02D] mb-4 opacity-90">
                {t('home.fortune.subtitle')}
              </p>
              <p className="text-sm text-[#FDD835] opacity-85 leading-relaxed">
                {t('home.fortune.description')}
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t border-dashed border-[#FFE082]/40">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#FFECB3] to-[#FFE082] text-[#F57F17] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#FFECB3]/0 via-[#FFE082]/15 to-[#FFD54F]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>

          {/* Weather Card */}
          <div
            onClick={() => onSelectProject('weather')}
            className="group relative backdrop-blur-xl bg-white/20 rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-2xl border border-white/30"
          >
            {/* Card Background Pattern */}
            <div
              className="absolute inset-0 rounded-2xl opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 20 Q10 15 20 20 T40 20 V40 H0 Z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-[#B2DFDB] via-[#80CBC4] to-[#4DB6AC] rounded-full flex items-center justify-center shadow-md transform group-hover:rotate-12 transition-transform duration-300 border-2 border-[#B2DFDB]/50">
                <Cloud size={64} className="text-white drop-shadow-sm" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#66BB6A] mb-3 drop-shadow-sm">{t('home.weather.title')}</h2>
              <p className="text-lg text-[#81C784] mb-4 opacity-90">
                {t('home.weather.subtitle')}
              </p>
              <p className="text-sm text-[#A5D6A7] opacity-85 leading-relaxed">
                {t('home.weather.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t border-dashed border-[#B2DFDB]/40">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#B2DFDB] to-[#80CBC4] text-white rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#B2DFDB]/0 via-[#80CBC4]/15 to-[#4DB6AC]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>


          {/* Couple Game Card - Disabled */}
          <div
            className="relative bg-gradient-to-br from-[#FF00C0] via-[#8000FF] to-[#00C0FF] rounded-2xl p-8 cursor-not-allowed transform border-4 border-white/30 shadow-xl opacity-40 grayscale"
          >
            {/* Card Background Pattern */}
            <div
              className="absolute inset-0 rounded-2xl opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border-2 border-white/30">
                <Heart size={64} className="text-white" fill="white" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-white mb-3 drop-shadow-lg">{t('home.couple.title')}</h2>
              <p className="text-lg text-white/90 mb-4 opacity-90">
                {t('home.couple.subtitle')}
              </p>
              <p className="text-sm text-white/80 opacity-90 leading-relaxed">
                {t('home.couple.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-dashed border-white/30 opacity-50">
                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-bold border border-white/30">
                  Enter →
                </div>
              </div>
            </div>
          </div>

          {/* Doraemon Monitor Card */}
          <div
            onClick={() => onSelectProject('doraemon')}
            className="group relative backdrop-blur-xl bg-white/20 rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-2xl border border-white/30"
          >
            {/* Card Background Pattern */}
            <div
              className="absolute inset-0 rounded-2xl opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Icon - Doraemon Face */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-md transform group-hover:rotate-12 transition-transform duration-300 border-2 border-[#90CAF9]/50 relative">
                {/* Simple Doraemon Face */}
                <svg viewBox="0 0 100 100" className="w-24 h-24">
                  {/* Face */}
                  <circle cx="50" cy="50" r="48" fill="#64B5F6" stroke="#42A5F5" strokeWidth="1.5"/>
                  <circle cx="50" cy="60" r="35" fill="white" stroke="#90CAF9" strokeWidth="1"/>

                  {/* Eyes */}
                  <ellipse cx="35" cy="35" rx="10" ry="12" fill="white" stroke="#42A5F5" strokeWidth="1"/>
                  <ellipse cx="65" cy="35" rx="10" ry="12" fill="white" stroke="#42A5F5" strokeWidth="1"/>
                  <circle cx="38" cy="37" r="3" fill="#1976D2"/>
                  <circle cx="62" cy="37" r="3" fill="#1976D2"/>
                  <circle cx="39" cy="35" r="1" fill="#FFF"/>
                  <circle cx="63" cy="35" r="1" fill="#FFF"/>

                  {/* Nose */}
                  <circle cx="50" cy="48" r="6" fill="#EF5350" stroke="#E53935" strokeWidth="1"/>
                  <line x1="50" y1="54" x2="50" y2="70" stroke="#42A5F5" strokeWidth="1"/>

                  {/* Mouth */}
                  <path d="M 30,65 Q 50,85 70,65" fill="none" stroke="#42A5F5" strokeWidth="1.5" strokeLinecap="round"/>

                  {/* Bell */}
                  <circle cx="50" cy="90" r="7" fill="#FFD54F" stroke="#FFC107" strokeWidth="1"/>
                  <circle cx="50" cy="92" r="1.5" fill="#1976D2"/>
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#1976D2] mb-3 drop-shadow-sm">{t('home.doraemon.title')}</h2>
              <p className="text-lg text-[#42A5F5] mb-4 opacity-90">
                {t('home.doraemon.subtitle')}
              </p>
              <p className="text-sm text-[#64B5F6] opacity-85 leading-relaxed">
                {t('home.doraemon.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t border-dashed border-[#90CAF9]/40">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#90CAF9] to-[#64B5F6] text-white rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#90CAF9]/0 via-[#64B5F6]/15 to-[#42A5F5]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 space-y-3">
          {/* Version Badge with Glass Morphism and Glow Effect */}
          <div className="flex justify-center">
            <div className="relative group">
              {/* Animated Glow Border */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur-sm opacity-60 group-hover:opacity-100 animate-pulse"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur-md opacity-40 group-hover:opacity-80"></div>
              
              {/* Glass Morphism Container */}
              <div className="relative px-8 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                <span className="relative text-white font-bold text-sm tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
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


import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Sparkles, Heart, Globe, Cloud, Boxes, BookOpen, Wand2 } from 'lucide-react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
import { useTranslations } from '../hooks/useTranslations';

const languageLabels: Record<GlobalLanguage, string> = {
  'en': 'EN',
  'zh-CN': '简体',
  'zh-TW': '繁體',
  'ja': '日本語'
};

export const HomePage: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();

  return (
    <div className="w-full pb-8 relative">
      {/* Kawaii Sky Background - Pastel Gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#FFE5EC] via-[#FFF0F5] to-[#E6F3FF] -z-50"></div>

      {/* Floating Cute Clouds */}
      <div className="fixed inset-0 opacity-60 pointer-events-none -z-40">
        <div className="absolute top-20 left-10 w-96 h-32 bg-white/80 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-40 right-20 w-80 h-40 bg-white/70 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-72 h-36 bg-white/75 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '3s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-28 bg-white/65 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '5s' }}></div>
      </div>

      {/* Sparkles and Stars */}
      <div className="fixed inset-0 pointer-events-none -z-30">
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
      <div className="fixed inset-0 bg-gradient-to-br from-[#FFB5E8]/10 via-[#B5DEFF]/10 to-[#FFFFD1]/10 -z-20"></div>

      {/* Soft Glow Overlay */}
      <div
        className="fixed inset-0 opacity-20 -z-10"
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
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-8">
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
          {/* Doraemon Monitor Card - Cute Blue */}
          <Link
            to="/doraemon"
            className="group relative bg-gradient-to-br from-[#BBDEFB] via-[#90CAF9] to-[#64B5F6] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(100,181,246,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(100,181,246,0.6)] hover:rotate-2 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute bell decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>🔔</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#64B5F6] to-[#90CAF9] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon - Anypok Doraemon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(100,181,246,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#BBDEFB]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Doraemon - 经典形象 */}
                <svg viewBox="0 0 200 200" className="w-28 h-28">
                  {/* 头部背景 (蓝色) */}
                  <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2"/>

                  {/* 脸部 (白色) */}
                  <circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>

                  {/* 眼睛 (左 & 右) */}
                  <ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
                  <ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>

                  {/* 眼珠 (对眼效果) */}
                  <circle cx="88" cy="70" r="4" fill="#000000"/>
                  <circle cx="112" cy="70" r="4" fill="#000000"/>

                  {/* 鼻子 (红色) */}
                  <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2"/>
                  {/* 鼻子高光 */}
                  <circle cx="97" cy="89" r="3" fill="#FFFFFF" opacity="0.8"/>

                  {/* 嘴巴 */}
                  <line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2"/>
                  <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>

                  {/* 胡须 (左边) */}
                  <line x1="30" y1="95" x2="80" y2="105" stroke="#333" strokeWidth="2"/>
                  <line x1="25" y1="115" x2="80" y2="115" stroke="#333" strokeWidth="2"/>
                  <line x1="30" y1="135" x2="80" y2="125" stroke="#333" strokeWidth="2"/>

                  {/* 胡须 (右边) */}
                  <line x1="170" y1="95" x2="120" y2="105" stroke="#333" strokeWidth="2"/>
                  <line x1="175" y1="115" x2="120" y2="115" stroke="#333" strokeWidth="2"/>
                  <line x1="170" y1="135" x2="120" y2="125" stroke="#333" strokeWidth="2"/>

                  {/* 项圈 (红色) */}
                  <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2"/>

                  {/* 铃铛 (黄色) */}
                  <circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2"/>
                  <line x1="86" y1="180" x2="114" y2="180" stroke="#333" strokeWidth="2"/>
                  <line x1="85" y1="183" x2="115" y2="183" stroke="#333" strokeWidth="2"/>
                  <circle cx="100" cy="192" r="3" fill="#333"/>
                  <line x1="100" y1="192" x2="100" y2="200" stroke="#333" strokeWidth="2"/>
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
          </Link>

          {/* Homework Crush - Cute Green */}
          <a
            href="/homework-crush/index.html"
            className="group relative bg-gradient-to-br from-[#C8E6C9] via-[#A5D6A7] to-[#81C784] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(102,187,106,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(102,187,106,0.6)] hover:rotate-2 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute leaves decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>🌱</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#81C784] to-[#A5D6A7] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(102,187,106,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#C8E6C9]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <BookOpen size={72} className="text-[#4CAF50] drop-shadow-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#2E7D32] mb-3 drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.homeworkCrush.title')}</h2>
              <p className="text-base text-[#388E3C] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.homeworkCrush.subtitle')}
              </p>
              <p className="text-sm text-[#1B5E20] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.homeworkCrush.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#4CAF50] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(102,187,106,0.4)] border-[3px] border-[#A5D6A7] hover:bg-gradient-to-r hover:from-[#A5D6A7] hover:to-white">
                  Enter → 📝
                </div>
              </div>
            </div>
          </a>

          {/* Magic Roll Call - Cosmic Purple/Blue */}
          <a
            href="/magic-roll-call/index.html"
            className="group relative bg-gradient-to-br from-[#1a0b2e] via-[#302b63] to-[#24243e] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(48,43,99,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(48,43,99,0.6)] hover:rotate-2 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute stars decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>🔮</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#00f260] to-[#0575e6] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-[#302b63] rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.3)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#4a4380]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Wand2 size={72} className="text-[#00f260] drop-shadow-[0_0_15px_rgba(0,242,96,0.8)]" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#00f260] mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ textShadow: '0 0 10px rgba(0,242,96,0.5)' }}>{t('home.magicRollCall.title')}</h2>
              <p className="text-base text-[#76e4ff] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {t('home.magicRollCall.subtitle')}
              </p>
              <p className="text-sm text-[#bcaae3] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {t('home.magicRollCall.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/20">
                <div className="inline-block px-6 py-3 bg-[#302b63] text-[#00f260] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.3)] border-[3px] border-[#00f260] hover:bg-gradient-to-r hover:from-[#00f260] hover:to-[#0575e6] hover:text-white">
                  Enter → ✨
                </div>
              </div>
            </div>
          </a>

          {/* Couple Game Card - Cute Purple */}
          <Link
            to="/couple"
            className="group relative bg-gradient-to-br from-[#E1BEE7] via-[#CE93D8] to-[#BA68C8] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(186,104,200,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(186,104,200,0.6)] hover:rotate-2 block"
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
          </Link>

          {/* Retro Camera Card - Disabled */}
          <div
            className="group relative bg-gradient-to-br from-[#E0E0E0] via-[#D0D0D0] to-[#C0C0C0] rounded-[2.5rem] p-8 cursor-not-allowed transform transition-all duration-500 grayscale opacity-80 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-[#F5F5F5] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-[6px] border-[#D0D0D0]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Camera size={72} className="text-[#999999]" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-marker text-4xl text-[#666666] mb-3 font-bold">{t('home.camera.title')}</h2>
              <p className="text-base text-[#777777] mb-4 font-semibold">
                {t('home.camera.subtitle')}
              </p>
              <p className="text-sm text-[#888888] leading-relaxed font-medium">
                {t('home.camera.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/50">
                <div className="inline-block px-6 py-3 bg-[#EEEEEE] text-[#999999] rounded-full text-base font-bold border-[3px] border-[#DDDDDD]">
                  {t('home.restricted')}
                </div>
              </div>
            </div>
          </div>

          {/* Particle Flow Card - Cute Galaxy Purple */}
          <Link
            to="/particles"
            className="group relative bg-gradient-to-br from-[#D1C4E9] via-[#B39DDB] to-[#9575CD] rounded-[2.5rem] p-8 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:-translate-y-4 shadow-[0_12px_30px_rgba(149,117,205,0.4)] border-[5px] border-white/90 hover:shadow-[0_20px_40px_rgba(149,117,205,0.6)] hover:rotate-2 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Cute sparkles decoration */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce opacity-0 group-hover:opacity-100 transition-opacity" style={{ animationDuration: '1.5s' }}>✨</div>

            {/* Kawaii Glow Effect */}
            <div className="absolute -inset-3 bg-gradient-to-r from-[#9575CD] to-[#B39DDB] rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>

            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(149,117,205,0.4)] transform group-hover:rotate-12 group-hover:scale-125 transition-all duration-500 border-[6px] border-[#D1C4E9]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Boxes size={72} className="text-[#7E57C2] drop-shadow-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#5E35B1] mb-3 drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]">{t('home.particles.title')}</h2>
              <p className="text-base text-[#512DA8] mb-4 font-semibold drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)]">
                {t('home.particles.subtitle')}
              </p>
              <p className="text-sm text-[#4527A0] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(255,255,255,0.6)]">
                {t('home.particles.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/70">
                <div className="inline-block px-6 py-3 bg-white text-[#7E57C2] rounded-full text-base font-bold transform group-hover:scale-125 transition-transform duration-300 shadow-[0_4px_12px_rgba(149,117,205,0.4)] border-[3px] border-[#D1C4E9] hover:bg-gradient-to-r hover:from-[#D1C4E9] hover:to-white">
                  Enter → ✨
                </div>
              </div>
            </div>
          </Link>

          {/* Fortune Sticks Card - Disabled/Restricted */}
          <div
            className="group relative bg-gradient-to-br from-[#E0E0E0] via-[#D0D0D0] to-[#C0C0C0] rounded-[2.5rem] p-8 cursor-not-allowed transform transition-all duration-500 grayscale opacity-80 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-[#F5F5F5] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-[6px] border-[#D0D0D0]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Sparkles size={72} className="text-[#999999]" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-serif text-4xl text-[#666666] mb-3 font-bold">{t('home.fortune.title')}</h2>
              <p className="text-base text-[#777777] mb-4 font-semibold">
                {t('home.fortune.subtitle')}
              </p>
              <p className="text-sm text-[#888888] leading-relaxed font-medium">
                {t('home.fortune.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/50">
                <div className="inline-block px-6 py-3 bg-[#EEEEEE] text-[#999999] rounded-full text-base font-bold border-[3px] border-[#DDDDDD]">
                  {t('home.restricted')}
                </div>
              </div>
            </div>
          </div>

          {/* Weather Card - Disabled/Gray */}
          <div
            className="group relative bg-gradient-to-br from-[#E0E0E0] via-[#D0D0D0] to-[#C0C0C0] rounded-[2.5rem] p-8 cursor-not-allowed grayscale opacity-80 block"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div
                className="w-36 h-36 bg-[#F5F5F5] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-[6px] border-[#D0D0D0]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Cloud size={72} className="text-[#999999]" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-[#666666] mb-3">{t('home.weather.title')}</h2>
              <p className="text-base text-[#777777] mb-4 font-semibold">
                {t('home.weather.subtitle')}
              </p>
              <p className="text-sm text-[#888888] leading-relaxed font-medium">
                {t('home.weather.description')}
              </p>

              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-[3px] border-white/50">
                <div className="inline-block px-6 py-3 bg-[#EEEEEE] text-[#999999] rounded-full text-base font-bold border-[3px] border-[#DDDDDD]">
                  {t('home.comingSoon')}
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

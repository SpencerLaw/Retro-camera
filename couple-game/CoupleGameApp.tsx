import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
// Import JSON files - Vite handles these as modules
// @ts-ignore
import translationsData from './public/translations.json';
// @ts-ignore
import daresEn from './public/dares.en.json';
// @ts-ignore
import daresZh from './public/dares.zh.json';
// @ts-ignore
import daresJa from './public/dares.ja.json';
import './CoupleGameStyles.css';

interface CoupleGameAppProps {
  onBackHome: () => void;
}

type Language = 'en' | 'zh' | 'ja';
type Stage = 'ambiguous' | 'advanced' | 'passionate' | null;

// Map global language to couple game language
const mapGlobalToCoupleLang = (globalLang: GlobalLanguage): Language => {
  if (globalLang === 'zh-CN' || globalLang === 'zh-TW') return 'zh';
  if (globalLang === 'ja') return 'ja';
  return 'en';
};

const daresByLang: Record<Language, any> = {
  en: daresEn,
  zh: daresZh,
  ja: daresJa,
};

const translations = translationsData as Record<Language, Record<string, string>>;

const CoupleGameApp: React.FC<CoupleGameAppProps> = ({ onBackHome }) => {
  const { language: globalLanguage } = useLanguage();
  const currentLang = mapGlobalToCoupleLang(globalLanguage);
  const [currentStage, setCurrentStage] = useState<Stage>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentDare, setCurrentDare] = useState<string>('');

  const t = (key: string): string => {
    return translations[currentLang]?.[key] || key;
  };

  const handleGenerate = () => {
    if (isAnimating || !currentStage) {
      if (!currentStage) {
        setCurrentDare(t('selectStage'));
      }
      return;
    }

    const dares = daresByLang[currentLang][currentStage];
    if (!dares || dares.length === 0) {
      setCurrentDare(t('noDares'));
      return;
    }

    setIsAnimating(true);
    setCurrentDare('');
    
    // Simple animation - fade out, change, fade in
    setTimeout(() => {
      const randomDare = dares[Math.floor(Math.random() * dares.length)];
      setCurrentDare(randomDare);
      setIsAnimating(false);
    }, 600);
  };

  useEffect(() => {
    if (!currentDare && !isAnimating) {
      setCurrentDare(t('initialMsg'));
    }
  }, [currentLang, currentStage, currentDare, isAnimating, t]);

  return (
    <div className="couple-game-app">
      {/* Back Button - Same style as other modules */}
      <button
        onClick={onBackHome}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 p-2 sm:p-3 rounded-full bg-white/95 hover:bg-white border-2 sm:border-3 border-pink-500 backdrop-blur-sm transition-all text-pink-500 hover:text-pink-600 shadow-xl hover:scale-110"
      >
        <ArrowLeft size={20} className="sm:hidden" />
        <ArrowLeft size={24} className="hidden sm:block" />
      </button>

      <div className="couple-game-main-container">
        <h1>{t('title')}</h1>

        <div className="couple-game-stage-buttons">
          <button
            className={`couple-game-stage-btn ${currentStage === 'ambiguous' ? 'active' : ''}`}
            onClick={() => setCurrentStage('ambiguous')}
            disabled={isAnimating}
            data-i18n="ambiguous"
          >
            {t('ambiguous')}
          </button>
          <button
            className={`couple-game-stage-btn ${currentStage === 'advanced' ? 'active' : ''}`}
            onClick={() => setCurrentStage('advanced')}
            disabled={isAnimating}
            data-i18n="advanced"
          >
            {t('advanced')}
          </button>
          <button
            className={`couple-game-stage-btn ${currentStage === 'passionate' ? 'active' : ''}`}
            onClick={() => setCurrentStage('passionate')}
            disabled={isAnimating}
            data-i18n="passionate"
          >
            {t('passionate')}
          </button>
        </div>

        <div className="couple-game-container">
          <div className={`couple-game-dare-display ${isAnimating ? 'animating' : ''}`}>
            <p>{currentDare || t('initialMsg')}</p>
          </div>
        </div>

        <button
          className="couple-game-generate-btn"
          onClick={handleGenerate}
          disabled={isAnimating}
        >
          {isAnimating ? t('spinning') : t('start')}
        </button>
      </div>
    </div>
  );
};

export default CoupleGameApp;


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
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDare, setCurrentDare] = useState<string>('');
  const slotReelRef = useRef<HTMLDivElement>(null);
  const activeTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const t = (key: string): string => {
    return translations[currentLang]?.[key] || key;
  };

  // Clear all active timeouts to prevent memory leaks
  const clearAllTimeouts = () => {
    activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    activeTimeoutsRef.current = [];
  };

  // Helper to track and create timeouts
  const addTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = setTimeout(callback, delay);
    activeTimeoutsRef.current.push(timeout);
    return timeout;
  };

  const handleSpin = () => {
    if (isSpinning || !currentStage) {
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

    // Clear any existing timeouts before starting new animation
    clearAllTimeouts();
    
    setIsSpinning(true);
    const finalDare = dares[Math.floor(Math.random() * dares.length)];

    // 滚动动画效果
    let changeCount = 0;
    const totalChanges = 70;
    let currentSpeed = 30;

    const changeContent = () => {
      changeCount++;
      const randomDare = dares[Math.floor(Math.random() * dares.length)];
      
      if (slotReelRef.current) {
        const p = slotReelRef.current.querySelector('p');
        if (p) {
          p.style.transition = `all ${Math.min(currentSpeed * 0.4, 100)}ms ease-out`;
          p.style.opacity = '0.4';
          p.style.transform = 'scale(0.92)';
        }

        addTimeout(() => {
          if (slotReelRef.current) {
            slotReelRef.current.innerHTML = `<p style="opacity: 0.4; transform: scale(0.92); transition: all ${Math.min(currentSpeed * 0.6, 150)}ms ease-in-out;">${randomDare}</p>`;
            
            addTimeout(() => {
              const newP = slotReelRef.current?.querySelector('p');
              if (newP) {
                newP.style.opacity = '1';
                newP.style.transform = 'scale(1)';
              }
            }, 20);
          }
        }, Math.min(currentSpeed * 0.3, 50));

        const progress = changeCount / totalChanges;
        if (progress < 0.35) {
          currentSpeed = 30 + (progress / 0.35) * 20;
        } else if (progress < 0.55) {
          currentSpeed = 50 + ((progress - 0.35) / 0.2) * 30;
        } else if (progress < 0.75) {
          currentSpeed = 80 + ((progress - 0.55) / 0.2) * 60;
        } else if (progress < 0.92) {
          currentSpeed = 140 + ((progress - 0.75) / 0.17) * 120;
        } else {
          currentSpeed = 260 + ((progress - 0.92) / 0.08) * 140;
        }

        if (changeCount >= totalChanges) {
          // 最终结果
          addTimeout(() => {
            if (slotReelRef.current) {
              slotReelRef.current.innerHTML = `<p class="final-result" style="opacity: 0.4; transform: scale(0.92); transition: all 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);">${finalDare}</p>`;
              addTimeout(() => {
                const finalP = slotReelRef.current?.querySelector('p');
                if (finalP) {
                  finalP.style.opacity = '1';
                  finalP.style.transform = 'scale(1)';
                }
                setIsSpinning(false);
                setCurrentDare(finalDare);
              }, 50);
            }
          }, currentSpeed);
          return;
        }

        addTimeout(() => changeContent(), currentSpeed);
      }
    };

    if (slotReelRef.current) {
      slotReelRef.current.innerHTML = `<p>${dares[Math.floor(Math.random() * dares.length)]}</p>`;
    }
    addTimeout(() => changeContent(), 100);
  };

  useEffect(() => {
    return () => {
      // Clear all active timeouts on unmount to prevent memory leaks
      clearAllTimeouts();
    };
  }, []);

  useEffect(() => {
    if (slotReelRef.current && !isSpinning && !currentDare) {
      slotReelRef.current.innerHTML = `<p>${t('initialMsg')}</p>`;
    }
  }, [currentLang, currentStage, isSpinning, currentDare, t]);

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
            disabled={isSpinning}
            data-i18n="ambiguous"
          >
            {t('ambiguous')}
          </button>
          <button
            className={`couple-game-stage-btn ${currentStage === 'advanced' ? 'active' : ''}`}
            onClick={() => setCurrentStage('advanced')}
            disabled={isSpinning}
            data-i18n="advanced"
          >
            {t('advanced')}
          </button>
          <button
            className={`couple-game-stage-btn ${currentStage === 'passionate' ? 'active' : ''}`}
            onClick={() => setCurrentStage('passionate')}
            disabled={isSpinning}
            data-i18n="passionate"
          >
            {t('passionate')}
          </button>
        </div>

        <div className="couple-game-container">
          <div className="couple-game-dare-display">
            <div id="slot-reel" ref={slotReelRef}>
              <p>{t('initialMsg')}</p>
            </div>
          </div>
        </div>

        <button
          className="couple-game-generate-btn"
          onClick={handleSpin}
          disabled={isSpinning}
        >
          {isSpinning ? t('spinning') : t('start')}
        </button>
      </div>
    </div>
  );
};

export default CoupleGameApp;

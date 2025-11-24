import React, { useState, useEffect, useRef } from 'react';
import { Home } from 'lucide-react';
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
  const changeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const t = (key: string): string => {
    return translations[currentLang]?.[key] || key;
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

    setIsSpinning(true);
    const finalDare = dares[Math.floor(Math.random() * dares.length)];

    // Slot machine animation
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

        setTimeout(() => {
          if (slotReelRef.current) {
            slotReelRef.current.innerHTML = `<p style="opacity: 0.4; transform: scale(0.92); transition: all ${Math.min(currentSpeed * 0.6, 150)}ms ease-in-out;">${randomDare}</p>`;
            
            setTimeout(() => {
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
          // Final result
          setTimeout(() => {
            if (slotReelRef.current) {
              slotReelRef.current.innerHTML = `<p class="final-result" style="opacity: 0.4; transform: scale(0.92); transition: all 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);">${finalDare}</p>`;
              setTimeout(() => {
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

        changeIntervalRef.current = setTimeout(() => changeContent(), currentSpeed);
      }
    };

    if (slotReelRef.current) {
      slotReelRef.current.innerHTML = `<p>${dares[Math.floor(Math.random() * dares.length)]}</p>`;
    }
    setTimeout(() => changeContent(), 100);
  };

  useEffect(() => {
    return () => {
      if (changeIntervalRef.current) {
        clearTimeout(changeIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (slotReelRef.current && !isSpinning && !currentDare) {
      slotReelRef.current.innerHTML = `<p>${t('initialMsg')}</p>`;
    }
  }, [currentLang, currentStage, isSpinning, currentDare, t]);

  return (
    <div className="couple-game-app">
      <div className="couple-game-top-controls">
        <button onClick={onBackHome} className="couple-game-back-btn">
          <Home size={18} />
          <span>{t('backHome') || 'Back Home'}</span>
        </button>
      </div>

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
          <div className="couple-game-slot-container">
            <div className="couple-game-slot-window">
              <div id="slot-reel" ref={slotReelRef}>
                <p>{t('initialMsg')}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          id="spin-btn"
          className="couple-game-spin-btn"
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


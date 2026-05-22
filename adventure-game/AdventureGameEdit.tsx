import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Download, Upload, Plus, Trash2, X } from 'lucide-react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
import { createAdventureDaresExport, normalizeAdventureDaresImport } from './adventureDaresLogic';
// @ts-ignore
import daresEn from './public/dares.en.json';
// @ts-ignore
import daresZh from './public/dares.zh.json';
// @ts-ignore
import daresTw from './public/dares.zh-TW.json';
// @ts-ignore
import daresJa from './public/dares.ja.json';
// @ts-ignore
import translationsData from './public/translations.json';
import './AdventureGameStyles.css';

type Language = 'en' | 'zh' | 'zh-TW' | 'ja';
type Stage = 'stage1' | 'stage2' | 'stage3';

const translations = translationsData as Record<Language, Record<string, string>>;
const IMPORT_GUIDE_CONFIRMED_KEY = 'adventure_import_guide_confirmed';

const mapGlobalToAdventureLang = (globalLang: GlobalLanguage): Language => {
  if (globalLang === 'zh-CN') return 'zh';
  if (globalLang === 'zh-TW') return 'zh-TW';
  if (globalLang === 'ja') return 'ja';
  return 'en';
};

const defaultDares: Record<Language, Record<Stage, string[]>> = {
  en: daresEn,
  zh: daresZh,
  'zh-TW': daresTw,
  ja: daresJa,
};

const AdventureGameEdit: React.FC = () => {
  const navigate = useNavigate();
  const { language: globalLanguage } = useLanguage();
  const currentLang = mapGlobalToAdventureLang(globalLanguage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeStage, setActiveStage] = useState<Stage>('stage1');
  const [dares, setDares] = useState<Record<Stage, string[]>>({
    stage1: [],
    stage2: [],
    stage3: []
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);

  const t = (key: string): string => {
    return translations[currentLang]?.[key] || key;
  };

  // Load from localStorage or fall back to defaults
  useEffect(() => {
    const loadDares = () => {
      const stored = localStorage.getItem(`pixar_game_dares_${currentLang}`);
      if (stored) {
        try {
          setDares(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored dares", e);
          setDares(defaultDares[currentLang]);
        }
      } else {
        setDares(defaultDares[currentLang]);
      }
    };
    loadDares();
  }, [currentLang]);

  const handleSave = () => {
    localStorage.setItem(`pixar_game_dares_${currentLang}`, JSON.stringify(dares));
    setHasChanges(false);
    alert(t('saveSuccess'));
  };

  const handleReset = () => {
    if (confirm(t('resetConfirm'))) {
      setDares(defaultDares[currentLang]);
      localStorage.removeItem(`pixar_game_dares_${currentLang}`);
      setHasChanges(false);
    }
  };

  const handleDownload = () => {
    const exportPayload = createAdventureDaresExport(dares, currentLang);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dares.${currentLang}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const openImportPicker = () => {
    fileInputRef.current?.click();
  };

  const handleImportClick = () => {
    if (localStorage.getItem(IMPORT_GUIDE_CONFIRMED_KEY) === 'true') {
      openImportPicker();
      return;
    }

    setShowImportGuide(true);
  };

  const confirmImportGuide = () => {
    localStorage.setItem(IMPORT_GUIDE_CONFIRMED_KEY, 'true');
    setShowImportGuide(false);
    openImportPicker();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const importedDares = normalizeAdventureDaresImport(JSON.parse(text)) as Record<Stage, string[]>;
      setDares(importedDares);
      setHasChanges(true);
      alert(t('importSuccess'));
    } catch (error) {
      alert(t('importFailed'));
    }
  };

  const updateDare = (index: number, value: string) => {
    const newDares = { ...dares };
    newDares[activeStage][index] = value;
    setDares(newDares);
    setHasChanges(true);
  };

  const addDare = () => {
    const newDares = { ...dares };
    newDares[activeStage].push("");
    setDares(newDares);
    setHasChanges(true);
  };

  const removeDare = (index: number) => {
    const newDares = { ...dares };
    newDares[activeStage].splice(index, 1);
    setDares(newDares);
    setHasChanges(true);
  };

  return (
    <div className="couple-game-app">
      <div className="couple-game-main-container" style={{ maxWidth: '800px', position: 'relative' }}>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/90 hover:bg-blue-50 border-2 border-blue-400 transition-all text-blue-500 hover:text-blue-600 shadow-sm hover:scale-110"
          title={t('editBack')}
          aria-label={t('editBack')}
        >
          <ArrowLeft size={24} />
        </button>

        {/* Close Button (X) inside the dialog container */}
        <button
          onClick={() => navigate('/adventure')}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/90 hover:bg-red-50 border-2 border-red-400 transition-all text-red-400 hover:text-red-500 shadow-sm hover:scale-110 hover:rotate-90"
          title={t('editClose')}
        >
          <X size={24} />
        </button>

        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '1.5rem', 
          color: '#FF9F43', 
          webkitTextStroke: '0px', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          fontFamily: '"Varela Round", "Fredoka", sans-serif',
          fontWeight: '800'
        }}>
          {t('editTitle')}
        </h1>
        
        <div className="couple-game-stage-buttons">
          {(['stage1', 'stage2', 'stage3'] as Stage[]).map((stage) => (
            <button
              key={stage}
              className={`couple-game-stage-btn ${activeStage === stage ? 'active' : ''}`}
              onClick={() => setActiveStage(stage)}
            >
              {stage === 'stage1' ? t('stageEasy') : stage === 'stage2' ? t('stageNormal') : t('stageHard')}
            </button>
          ))}
        </div>

        <div className="bg-white/50 rounded-xl p-4 mb-4 overflow-y-auto" style={{ maxHeight: '50vh', textAlign: 'left' }}>
          {dares[activeStage]?.map((dare, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center">
              <span className="font-bold w-6 text-gray-500">{index + 1}.</span>
              <input
                type="text"
                value={dare}
                onChange={(e) => updateDare(index, e.target.value)}
                className="flex-1 p-2 rounded-lg border-2 border-pink-200 focus:border-pink-500 outline-none transition-colors bg-white/80"
              />
              <button 
                onClick={() => removeDare(index)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button 
            onClick={addDare}
            className="w-full py-2 border-2 border-dashed border-pink-300 text-pink-500 rounded-lg hover:bg-pink-50 transition-colors flex justify-center items-center gap-2 font-bold"
          >
            <Plus size={20} /> {t('addNew')}
          </button>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <p className="w-full text-center text-sm font-bold text-gray-500 px-2">
            {t('importHint')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-purple-500 text-white font-bold shadow-lg hover:bg-purple-600 transition-all hover:scale-105"
          >
            <Upload size={20} /> {t('import')}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-white font-bold shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
          >
            <Save size={20} /> {t('save')}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-500 text-white font-bold shadow-lg hover:bg-yellow-600 transition-all hover:scale-105"
          >
            <RotateCcw size={20} /> {t('reset')}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-500 text-white font-bold shadow-lg hover:bg-blue-600 transition-all hover:scale-105"
          >
            <Download size={20} /> {t('export')}
          </button>
        </div>
      </div>

      {showImportGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adventure-import-guide-title"
            className="w-full max-w-md rounded-[28px] border-4 border-purple-300 bg-white p-6 text-left shadow-2xl"
          >
            <div className="mb-4 flex items-center gap-3 text-purple-600">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Upload size={24} />
              </div>
              <h2 id="adventure-import-guide-title" className="m-0 text-xl font-black text-purple-600">
                {t('importGuideTitle')}
              </h2>
            </div>
            <p className="mb-5 whitespace-pre-line text-sm font-bold leading-6 text-gray-600">
              {t('importGuideBody')}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowImportGuide(false)}
                className="rounded-full border-2 border-gray-200 px-5 py-3 font-bold text-gray-500 transition-colors hover:bg-gray-50"
              >
                {t('importGuideCancel')}
              </button>
              <button
                onClick={confirmImportGuide}
                className="rounded-full bg-purple-500 px-5 py-3 font-bold text-white shadow-lg transition-all hover:bg-purple-600 hover:scale-105"
              >
                {t('importGuideConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdventureGameEdit;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Download, Plus, Trash2 } from 'lucide-react';
import { useLanguage, GlobalLanguage } from '../contexts/LanguageContext';
// @ts-ignore
import daresEn from './public/dares.en.json';
// @ts-ignore
import daresZh from './public/dares.zh.json';
// @ts-ignore
import daresJa from './public/dares.ja.json';
import './AdventureGameStyles.css';

type Language = 'en' | 'zh' | 'ja';
type Stage = 'stage1' | 'stage2' | 'stage3';

const mapGlobalToAdventureLang = (globalLang: GlobalLanguage): Language => {
  if (globalLang === 'zh-CN' || globalLang === 'zh-TW') return 'zh';
  if (globalLang === 'ja') return 'ja';
  return 'en';
};

const defaultDares: Record<Language, Record<Stage, string[]>> = {
  en: daresEn,
  zh: daresZh,
  ja: daresJa,
};

const AdventureGameEdit: React.FC = () => {
  const navigate = useNavigate();
  const { language: globalLanguage } = useLanguage();
  const currentLang = mapGlobalToAdventureLang(globalLanguage);
  
  const [activeStage, setActiveStage] = useState<Stage>('stage1');
  const [dares, setDares] = useState<Record<Stage, string[]>>({
    stage1: [],
    stage2: [],
    stage3: []
  });
  const [hasChanges, setHasChanges] = useState(false);

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
    alert('保存成功！Saved!');
  };

  const handleReset = () => {
    if (confirm('确定要重置回默认内容吗？Are you sure you want to reset to defaults?')) {
      setDares(defaultDares[currentLang]);
      localStorage.removeItem(`pixar_game_dares_${currentLang}`);
      setHasChanges(false);
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dares, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dares.${currentLang}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
      <button
        onClick={() => navigate('/adventure')}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-50 p-2 sm:p-3 rounded-full bg-white/95 hover:bg-white border-2 sm:border-3 border-pink-500 backdrop-blur-sm transition-all text-pink-500 hover:text-pink-600 shadow-xl hover:scale-110"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="couple-game-main-container" style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>内容编辑器 (Content Editor)</h1>
        
        <div className="couple-game-stage-buttons">
          {(['stage1', 'stage2', 'stage3'] as Stage[]).map((stage) => (
            <button
              key={stage}
              className={`couple-game-stage-btn ${activeStage === stage ? 'active' : ''}`}
              onClick={() => setActiveStage(stage)}
            >
              {stage === 'stage1' ? '简单 (Easy)' : stage === 'stage2' ? '普通 (Normal)' : '困难 (Hard)'}
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
            <Plus size={20} /> 添加一条 (Add New)
          </button>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-white font-bold shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
          >
            <Save size={20} /> 保存 (Save)
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-500 text-white font-bold shadow-lg hover:bg-yellow-600 transition-all hover:scale-105"
          >
            <RotateCcw size={20} /> 重置 (Reset)
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-500 text-white font-bold shadow-lg hover:bg-blue-600 transition-all hover:scale-105"
          >
            <Download size={20} /> 导出 (Export)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdventureGameEdit;
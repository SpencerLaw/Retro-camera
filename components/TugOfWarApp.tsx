import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, Settings as SettingsIcon, Play, RotateCcw, Check, Trophy } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import confetti from 'canvas-confetti';

type Operator = 'add' | 'sub' | 'mul' | 'div';

interface GameSettings {
  operators: Operator[];
  maxNumber: number;
  winScore: number;
}

interface Problem {
  num1: number;
  num2: number;
  operator: Operator;
  answer: number;
}

// 生成随机题目
const generateProblem = (settings: GameSettings): Problem => {
  const { operators, maxNumber } = settings;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let num1 = 0, num2 = 0, answer = 0;

  switch (operator) {
    case 'add':
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * maxNumber) + 1;
      answer = num1 + num2;
      break;
    case 'sub':
      // 确保结果为正数
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
      break;
    case 'mul':
      // 乘法限制一下范围，否则太难了，这里取 maxNumber 的平方根或固定 12 以内
      const mulMax = Math.min(maxNumber, 12);
      num1 = Math.floor(Math.random() * (mulMax - 1)) + 2;
      num2 = Math.floor(Math.random() * (mulMax - 1)) + 2;
      answer = num1 * num2;
      break;
    case 'div':
      // 通过乘法反推除法，确保能整除
      const divMax = Math.min(maxNumber, 12);
      const factor2 = Math.floor(Math.random() * (divMax - 1)) + 2;
      const result = Math.floor(Math.random() * (divMax - 1)) + 2;
      num1 = factor2 * result;
      num2 = factor2;
      answer = result;
      break;
  }

  return { num1, num2, operator, answer };
};

const getOpSymbol = (op: Operator) => {
  switch (op) {
    case 'add': return '+';
    case 'sub': return '-';
    case 'mul': return '×';
    case 'div': return '÷';
  }
};

// 数字小键盘组件
const Keypad = ({ onInput, onClear, onSubmit, team, t }: {
  onInput: (val: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  team: 'blue' | 'red';
  t: (key: string) => string;
}) => {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', t('tugOfWar.clear'), '0', t('tugOfWar.confirm')];

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[320px]">
      {buttons.map((btn) => {
        let btnClass = "h-[56px] rounded-xl text-[22px] font-bold shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center ";
        if (btn === t('tugOfWar.clear')) {
          btnClass += "bg-slate-200 text-slate-800 hover:bg-slate-300";
        } else if (btn === t('tugOfWar.confirm')) {
          btnClass += `col-span-2 text-white ${team === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`;
        } else {
          btnClass += "bg-white text-slate-800 hover:bg-slate-50";
        }

        return (
          <button
            key={btn}
            onClick={() => {
              if (btn === t('tugOfWar.clear')) onClear();
              else if (btn === t('tugOfWar.confirm')) onSubmit();
              else onInput(btn);
            }}
            className={btnClass}
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
};

export const TugOfWarApp = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  
  const [showSettings, setShowSettings] = useState(true);
  const [settings, setSettings] = useState<GameSettings>({
    operators: ['add'],
    maxNumber: 10,
    winScore: 10
  });

  const [score, setScore] = useState(0);
  const [blueProblem, setBlueProblem] = useState<Problem | null>(null);
  const [redProblem, setRedProblem] = useState<Problem | null>(null);
  const [blueInput, setBlueInput] = useState('');
  const [redInput, setRedInput] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'blue_wins' | 'red_wins'>('playing');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 初始化游戏题目
  const startGame = () => {
    if (settings.operators.length === 0) return;
    setBlueProblem(generateProblem(settings));
    setRedProblem(generateProblem(settings));
    setScore(0);
    setBlueInput('');
    setRedInput('');
    setGameState('playing');
    setTimeElapsed(0);
    setShowSettings(false);
  };

  // 计时器逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!showSettings && gameState === 'playing') {
      timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showSettings, gameState]);

  // 全屏逻辑
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  // 胜利音效
  useEffect(() => {
    if (gameState !== 'playing') {
      const color = gameState === 'blue_wins' ? '#2563eb' : '#dc2626';
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [color, '#ffffff', '#fbbf24']
      });
    }
  }, [gameState]);

  const handleBlueSubmit = useCallback(() => {
    if (gameState !== 'playing' || !blueProblem) return;
    if (parseInt(blueInput) === blueProblem.answer) {
      const newScore = score - 1;
      setScore(newScore);
      setBlueProblem(generateProblem(settings));
      setBlueInput('');
      if (newScore <= -settings.winScore) setGameState('blue_wins');
    } else {
      setBlueInput('');
    }
  }, [blueInput, blueProblem, score, gameState, settings]);

  const handleRedSubmit = useCallback(() => {
    if (gameState !== 'playing' || !redProblem) return;
    if (parseInt(redInput) === redProblem.answer) {
      const newScore = score + 1;
      setScore(newScore);
      setRedProblem(generateProblem(settings));
      setRedInput('');
      if (newScore >= settings.winScore) setGameState('red_wins');
    } else {
      setRedInput('');
    }
  }, [redInput, redProblem, score, gameState, settings]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] text-[#1E293B] font-sans select-none overflow-hidden relative">
      {/* 顶部区域 */}
      <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <div className="text-[24px] font-black tracking-tight bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
            {t('tugOfWar.title')}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!showSettings && (
             <div className="font-mono text-[20px] font-bold text-slate-500 bg-slate-100 px-4 py-1 rounded-xl border border-slate-200">
               {Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:{(timeElapsed % 60).toString().padStart(2, '0')}
             </div>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
            <SettingsIcon size={24} />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showSettings ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-40 bg-slate-50/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl border border-white/50">
              <h2 className="text-3xl font-black mb-8 text-center text-slate-800">{t('tugOfWar.settingsTitle')}</h2>
              
              <div className="space-y-8">
                {/* 运算符选择 */}
                <div>
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 block">{t('tugOfWar.operators')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['add', 'sub', 'mul', 'div'] as Operator[]).map(op => (
                      <button
                        key={op}
                        onClick={() => {
                          const newOps = settings.operators.includes(op) 
                            ? settings.operators.filter(i => i !== op)
                            : [...settings.operators, op];
                          if (newOps.length > 0) setSettings({...settings, operators: newOps});
                        }}
                        className={`py-4 rounded-2xl font-bold transition-all border-2 ${
                          settings.operators.includes(op) 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {t(`tugOfWar.${op}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 数字范围选择 */}
                <div>
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 block">{t('tugOfWar.range')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        onClick={() => setSettings({...settings, maxNumber: val})}
                        className={`py-3 rounded-2xl font-bold transition-all border-2 ${
                          settings.maxNumber === val 
                            ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {t(`tugOfWar.within${val}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 胜利分数 */}
                <div>
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 block">{t('tugOfWar.winCondition')}</label>
                  <div className="flex items-center gap-6">
                    <input 
                      type="range" min="5" max="30" step="5"
                      value={settings.winScore}
                      onChange={(e) => setSettings({...settings, winScore: parseInt(e.target.value)})}
                      className="flex-1 accent-red-500"
                    />
                    <span className="w-16 text-2xl font-black text-red-600">{settings.winScore}{t('tugOfWar.points')}</span>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-2xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Play fill="white" size={24} />
                  {t('tugOfWar.startGame')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 min-h-0">
            {/* 中间区域：拔河视觉表现 */}
            <div className="h-[100px] bg-white flex items-center justify-center relative border-b border-slate-200 shrink-0 px-[40px] md:px-[80px]">
              <div className="w-full h-3 bg-slate-200 rounded-full relative">
                {/* 刻度线 */}
                {[...Array(settings.winScore * 2 + 1)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-300"
                    style={{ left: `${(i / (settings.winScore * 2)) * 100}%` }}
                  />
                ))}
                
                {/* 胜利线区域 */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-200"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-red-600 rounded-full shadow-lg shadow-red-200"></div>

                {/* 红心标记 */}
                <motion.div
                  className="absolute top-1/2 w-[48px] h-[48px] bg-white border-[6px] border-red-500 rounded-full shadow-xl z-10 flex items-center justify-center"
                  animate={{
                    left: `calc(50% + ${(score / settings.winScore) * 50}%)`,
                    y: '-50%',
                    x: '-50%'
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className="text-red-500 text-2xl">❤️</div>
                </motion.div>
              </div>
            </div>

            {/* 下半部分：对战区 */}
            <main className="flex-1 grid grid-cols-2 min-h-0">
              {/* 蓝队 */}
              <section className="bg-[#EFF6FF] border-r border-slate-200 flex flex-col items-center p-6 overflow-y-auto">
                <div className="px-6 py-2 bg-blue-600 text-white rounded-full font-black text-lg mb-6 shadow-lg shadow-blue-100">
                  {t('tugOfWar.blueTeam')}
                </div>
                
                {blueProblem && (
                  <div className="bg-white rounded-3xl p-6 w-full max-w-[340px] shadow-xl border-2 border-white text-center mb-6 flex flex-col items-center transition-all">
                    <div className="text-[42px] md:text-[52px] font-black text-slate-800 leading-none mb-4">
                      {blueProblem.num1} <span className="text-blue-500">{getOpSymbol(blueProblem.operator)}</span> {blueProblem.num2}
                    </div>
                    <div className="h-[64px] w-full bg-slate-50 rounded-2xl text-[44px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100">
                      {blueInput || '?'}
                    </div>
                  </div>
                )}
                
                <Keypad
                  onInput={(val) => setBlueInput(prev => (prev.length < 4 ? prev + val : prev))}
                  onClear={() => setBlueInput('')}
                  onSubmit={handleBlueSubmit}
                  team="blue"
                  t={t}
                />
              </section>

              {/* 红队 */}
              <section className="bg-[#FEF2F2] flex flex-col items-center p-6 overflow-y-auto">
                <div className="px-6 py-2 bg-red-600 text-white rounded-full font-black text-lg mb-6 shadow-lg shadow-red-100">
                  {t('tugOfWar.redTeam')}
                </div>
                
                {redProblem && (
                  <div className="bg-white rounded-3xl p-6 w-full max-w-[340px] shadow-xl border-2 border-white text-center mb-6 flex flex-col items-center transition-all">
                    <div className="text-[42px] md:text-[52px] font-black text-slate-800 leading-none mb-4">
                      {redProblem.num1} <span className="text-red-500">{getOpSymbol(redProblem.operator)}</span> {redProblem.num2}
                    </div>
                    <div className="h-[64px] w-full bg-slate-50 rounded-2xl text-[44px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100">
                      {redInput || '?'}
                    </div>
                  </div>
                )}
                
                <Keypad
                  onInput={(val) => setRedInput(prev => (prev.length < 4 ? prev + val : prev))}
                  onClear={() => setRedInput('')}
                  onSubmit={handleRedSubmit}
                  team="red"
                  t={t}
                />
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 游戏结束弹窗 */}
      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center z-[60] text-white p-6"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center shadow-[0_0_80px_rgba(255,255,255,0.2)] max-w-lg w-full"
            >
              <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 ${gameState === 'blue_wins' ? 'bg-blue-100' : 'bg-red-100'}`}>
                <Trophy size={64} className={gameState === 'blue_wins' ? 'text-blue-600' : 'text-red-600'} />
              </div>
              <h2 className={`text-5xl font-black mb-4 ${gameState === 'blue_wins' ? 'text-blue-600' : 'text-red-600'}`}>
                {gameState === 'blue_wins' ? t('tugOfWar.blueWins') : t('tugOfWar.redWins')}
              </h2>
              <p className="text-slate-400 font-bold text-xl mb-10">{t('tugOfWar.restart')}</p>
              
              <div className="flex flex-col w-full gap-4">
                <button
                  onClick={startGame}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xl font-black shadow-xl hover:scale-[1.05] transition-all flex items-center justify-center gap-3"
                >
                  <RotateCcw size={24} />
                  {t('tugOfWar.restart')}
                </button>
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setGameState('playing');
                  }}
                  className="w-full py-5 bg-slate-100 text-slate-600 rounded-2xl text-xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                >
                  <SettingsIcon size={24} />
                  {t('tugOfWar.backToSettings')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TugOfWarApp;

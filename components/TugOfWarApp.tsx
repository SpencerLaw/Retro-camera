import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, Settings as SettingsIcon, Play, RotateCcw, Trophy, Snowflake, Sword, ShieldCheck, Zap } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import confetti from 'canvas-confetti';

type Operator = 'add' | 'sub' | 'mul' | 'div';
type GameMode = 'classic' | 'target';
type PowerUpType = 'freeze' | 'double' | 'shield';

interface GameSettings {
  operators: Operator[];
  maxNumber: number;
  winScore: number;
  gameMode: GameMode;
  powerUpsEnabled: boolean;
  allowedPowerUps: PowerUpType[];
  powerUpTrigger: number;
}

interface Problem {
  num1: number;
  num2: number;
  operator: Operator;
  answer: number;
}

// 安全计算算式结果
const evaluateExpression = (expr: string): number | null => {
  try {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitized}`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

// 生成随机题目
const generateProblem = (settings: GameSettings): Problem => {
  const { operators, maxNumber, gameMode } = settings;
  
  if (gameMode === 'target') {
    // 凑数模式：直接给出一个目标数字，并要求使用特定的运算符
    const requiredOp = operators.length > 0 ? operators[Math.floor(Math.random() * operators.length)] : 'add';
    let target = 0;
    
    if (requiredOp === 'mul') {
      // 乘法：确保目标数字是两个大于1的整数的乘积，避免出现质数
      const mulMax = Math.min(maxNumber, 12);
      const f1 = Math.floor(Math.random() * (mulMax - 1)) + 2;
      const f2 = Math.floor(Math.random() * (mulMax - 1)) + 2;
      target = f1 * f2;
    } else if (requiredOp === 'div') {
      // 除法：目标数字适中即可，因为总可以用 target * N ÷ N 凑出
      target = Math.floor(Math.random() * Math.min(maxNumber, 20)) + 2;
    } else if (requiredOp === 'sub') {
      // 减法：目标数字不宜过大
      target = Math.floor(Math.random() * maxNumber) + 1;
    } else {
      // 加法：正常给出目标
      target = Math.floor(Math.random() * (maxNumber * 2)) + 5;
    }

    return { num1: 0, num2: 0, operator: requiredOp, answer: target };
  }

  const operator = operators[Math.floor(Math.random() * operators.length)];
  let num1 = 0, num2 = 0, answer = 0;

  switch (operator) {
    case 'add':
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * maxNumber) + 1;
      answer = num1 + num2;
      break;
    case 'sub':
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
      break;
    case 'mul':
      const mulMax = Math.min(maxNumber, 12);
      num1 = Math.floor(Math.random() * (mulMax - 1)) + 2;
      num2 = Math.floor(Math.random() * (mulMax - 1)) + 2;
      answer = num1 * num2;
      break;
    case 'div':
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
const Keypad = ({ onInput, onClear, onSubmit, team, t, mode, isFrozen }: {
  onInput: (val: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  team: 'blue' | 'red';
  t: (key: string) => string;
  mode: GameMode;
  isFrozen: boolean;
}) => {
  const numButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const opButtons = ['+', '-', '×', '÷'];
  
  return (
    <div className="relative w-full max-w-[340px]">
      <div className={`grid grid-cols-3 gap-2 transition-all ${isFrozen ? 'opacity-20 grayscale pointer-events-none blur-sm' : ''}`}>
        {numButtons.slice(0, 9).map((btn) => (
          <button
            key={btn}
            onClick={() => onInput(btn)}
            className="h-[56px] rounded-xl text-[22px] font-bold bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-50 transition-all"
          >
            {btn}
          </button>
        ))}
        <button
          onClick={onClear}
          className="h-[56px] rounded-xl text-[20px] font-bold bg-slate-200 text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-300 transition-all"
        >
          {t('tugOfWar.clear')}
        </button>
        <button
          onClick={() => onInput('0')}
          className="h-[56px] rounded-xl text-[22px] font-bold bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-50 transition-all"
        >
          0
        </button>
        <button
          onClick={onSubmit}
          className={`h-[56px] rounded-xl text-[20px] font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none transition-all ${team === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-800/20' : 'bg-red-600 hover:bg-red-700 shadow-red-800/20'}`}
        >
          {t('tugOfWar.confirm')}
        </button>

        {/* 凑数模式下的运算符 */}
        {mode === 'target' && (
          <div className="col-span-3 grid grid-cols-4 gap-2 mt-2">
            {opButtons.map(op => (
              <button
                key={op}
                onClick={() => onInput(op)}
                className="h-[50px] rounded-xl text-[22px] font-black bg-slate-800 text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none hover:bg-slate-700 transition-all"
              >
                {op}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {isFrozen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl overflow-hidden">
          {/* 物理阻挡层 - 拦截所有点击 */}
          <div className="absolute inset-0 bg-blue-100/40 backdrop-blur-[2px] pointer-events-auto cursor-not-allowed" />
          
          {/* 霜冻视觉效果 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none border-4 border-blue-300/50 rounded-2xl"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-45c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm13-24c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm39 75c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-58-19c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-6-48c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm25-10c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm14 32c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm16 47c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-26-2c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-42-17c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-3-28c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm24-21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z\' fill=\'%23ffffff\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
            }}
          />

          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative flex flex-col items-center gap-2 z-10"
          >
            <div className="bg-white/90 p-4 rounded-full shadow-2xl">
              <Snowflake size={60} className="text-blue-500 animate-spin-slow" />
            </div>
            <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-2xl font-black shadow-xl uppercase tracking-tighter border-4 border-white">
              FROZEN!
            </span>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Team Member Animation
const TeamMember = ({ team, index }: { team: 'blue' | 'red', index: number }) => {
  const color = team === 'blue' ? '#3B82F6' : '#EF4444';
  const darkColor = team === 'blue' ? '#1D4ED8' : '#B91C1C';
  
  return (
    <motion.div
      animate={{ 
        rotate: team === 'blue' ? [-10, 0, -10] : [10, 0, 10],
        x: team === 'blue' ? [-2, 2, -2] : [2, -2, 2]
      }}
      transition={{ repeat: Infinity, duration: 0.6, delay: index * 0.2, ease: "easeInOut" }}
      className={`relative z-10 ${team === 'red' ? '-scale-x-100' : ''}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      <svg width="60" height="70" viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 40 L15 65" stroke={darkColor} strokeWidth="8" strokeLinecap="round" />
        <path d="M30 40 L45 65" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <path d="M30 40 L20 20" stroke={color} strokeWidth="9" strokeLinecap="round" />
        <path d="M25 25 L45 35" stroke={darkColor} strokeWidth="7" strokeLinecap="round" />
        <path d="M22 22 L40 32" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <circle cx="15" cy="12" r="10" fill={color} />
        <path d="M18 10 L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 16 Q21 14 23 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
};

const TugOfWarAnimation = ({ score, winScore }: { score: number, winScore: number }) => {
  const progress = (score / winScore) * 50; // -50% to +50%

  return (
    <div className="h-[140px] bg-white flex items-center justify-center relative border-b border-slate-200 shrink-0 overflow-hidden">
      {/* Background marks */}
      <div className="absolute inset-0 flex justify-center items-end pb-4 opacity-20 pointer-events-none w-full">
        <div className="w-[80%] flex justify-between">
          {[...Array(winScore * 2 + 1)].map((_, i) => (
            <div key={i} className={`w-0.5 ${i === winScore ? 'bg-red-500 h-10' : 'bg-slate-400 h-6'}`} />
          ))}
        </div>
      </div>

      <motion.div 
        className="w-full relative h-[100px] flex items-center justify-center"
        animate={{ x: `${progress}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {/* Rope */}
        <div className="absolute top-[32px] w-[200%] h-4 bg-amber-700/90 rounded-full shadow-sm border-y border-amber-900/40">
          <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #000 5px, #000 10px)' }}></div>
        </div>

        {/* Center Flag */}
        <div className="absolute top-[32px] left-1/2 -translate-x-1/2 w-6 h-16 bg-red-500 shadow-md z-20 border-2 border-white" style={{ transformOrigin: 'top center', rotate: '-5deg' }} />

        {/* Blue Team */}
        <div className="absolute top-0 right-1/2 pr-[15%] flex gap-2">
          {[0, 1, 2].map((i) => (
            <TeamMember key={`blue-${i}`} team="blue" index={i} />
          ))}
        </div>

        {/* Red Team */}
        <div className="absolute top-0 left-1/2 pl-[15%] flex gap-2">
          {[0, 1, 2].map((i) => (
            <TeamMember key={`red-${i}`} team="red" index={i} />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export const TugOfWarApp = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  
  // 配置状态
  const [showSettings, setShowSettings] = useState(true);
  const [settings, setSettings] = useState<GameSettings>({
    operators: ['add'],
    maxNumber: 10,
    winScore: 10,
    gameMode: 'classic',
    powerUpsEnabled: true,
    allowedPowerUps: ['freeze', 'double', 'shield'],
    powerUpTrigger: 3
  });

  // 核心游戏状态
  const [score, setScore] = useState(0);
  const [blueProblem, setBlueProblem] = useState<Problem | null>(null);
  const [redProblem, setRedProblem] = useState<Problem | null>(null);
  const [blueInput, setBlueInput] = useState('');
  const [redInput, setRedInput] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'blue_wins' | 'red_wins'>('playing');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 连击与道具状态
  const [blueStreak, setBlueStreak] = useState(0);
  const [redStreak, setRedStreak] = useState(0);
  const [blueItems, setBlueItems] = useState<PowerUpType[]>([]);
  const [redItems, setRedItems] = useState<PowerUpType[]>([]);
  const [blueFrozenUntil, setBlueFrozenUntil] = useState(0);
  const [redFrozenUntil, setRedFrozenUntil] = useState(0);
  const [blueDoubleActive, setBlueDoubleActive] = useState(false);
  const [redDoubleActive, setRedDoubleActive] = useState(false);
  const [blueShieldActive, setBlueShieldActive] = useState(false);
  const [redShieldActive, setRedShieldActive] = useState(false);

  // 连击特效计时器
  const [lastBlueCorrect, setLastBlueCorrect] = useState(0);
  const [lastRedCorrect, setLastRedCorrect] = useState(0);

  // 核心循环：计时器
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!showSettings && gameState === 'playing') {
      timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showSettings, gameState]);

  // 核心循环：冻结检查
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (blueFrozenUntil > Date.now() || redFrozenUntil > Date.now()) {
      timer = setInterval(() => {
        const now = Date.now();
        if (blueFrozenUntil > 0 && blueFrozenUntil <= now) setBlueFrozenUntil(0);
        if (redFrozenUntil > 0 && redFrozenUntil <= now) setRedFrozenUntil(0);
      }, 100);
    }
    return () => clearInterval(timer);
  }, [blueFrozenUntil, redFrozenUntil]);

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

  // 游戏开始/重置
  const startGame = () => {
    if (settings.operators.length === 0 && settings.gameMode === 'classic') return;
    setBlueProblem(generateProblem(settings));
    setRedProblem(generateProblem(settings));
    setScore(0);
    setBlueInput('');
    setRedInput('');
    setBlueStreak(0);
    setRedStreak(0);
    setBlueItems([]);
    setRedItems([]);
    setBlueFrozenUntil(0);
    setRedFrozenUntil(0);
    setBlueDoubleActive(false);
    setRedDoubleActive(false);
    setBlueShieldActive(false);
    setRedShieldActive(false);
    setGameState('playing');
    setTimeElapsed(0);
    setShowSettings(false);
  };

  // 道具掉落逻辑
  const checkPowerUpDrop = (team: 'blue' | 'red', newStreak: number) => {
    if (settings.powerUpsEnabled && newStreak > 0 && newStreak % settings.powerUpTrigger === 0) {
      const available = settings.allowedPowerUps;
      if (available.length > 0) {
        const drop = available[Math.floor(Math.random() * available.length)];
        if (team === 'blue') setBlueItems(prev => [...prev, drop].slice(-3)); // 最多存3个
        else setRedItems(prev => [...prev, drop].slice(-3));
      }
    }
  };

  // 使用道具
  const handleUseItem = (team: 'blue' | 'red', type: PowerUpType, index: number) => {
    if (gameState !== 'playing') return;
    
    // 消耗道具
    if (team === 'blue') setBlueItems(prev => prev.filter((_, i) => i !== index));
    else setRedItems(prev => prev.filter((_, i) => i !== index));

    const opponent = team === 'blue' ? 'red' : 'blue';
    const isOpponentShielded = opponent === 'blue' ? blueShieldActive : redShieldActive;

    switch (type) {
      case 'freeze':
        if (isOpponentShielded) {
          if (opponent === 'blue') setBlueShieldActive(false);
          else setRedShieldActive(false);
        } else {
          if (opponent === 'blue') setBlueFrozenUntil(Date.now() + 3000);
          else setRedFrozenUntil(Date.now() + 3000);
        }
        break;
      case 'double':
        if (team === 'blue') setBlueDoubleActive(true);
        else setRedDoubleActive(true);
        break;
      case 'shield':
        if (team === 'blue') setBlueShieldActive(true);
        else setRedShieldActive(true);
        break;
    }
  };

  // 提交答案核心逻辑
  const processAnswer = (team: 'blue' | 'red', input: string, problem: Problem) => {
    let isCorrect = false;
    if (settings.gameMode === 'classic') {
      isCorrect = parseInt(input) === problem.answer;
    } else {
      const result = evaluateExpression(input);
      const requiredSymbol = getOpSymbol(problem.operator);
      isCorrect = result !== null && Math.abs(result - problem.answer) < 0.01 && input.includes(requiredSymbol);
    }

    if (isCorrect) {
      const opponent = team === 'blue' ? 'red' : 'blue';
      const isOpponentShielded = opponent === 'blue' ? blueShieldActive : redShieldActive;
      
      let pullPower = 1;
      const currentStreak = team === 'blue' ? blueStreak + 1 : redStreak + 1;
      
      // 连击加成 (>=5进入狂暴)
      if (currentStreak >= 5) pullPower += 1;
      
      // 双倍道具加成
      const isDoubleActive = team === 'blue' ? blueDoubleActive : redDoubleActive;
      if (isDoubleActive) {
        pullPower *= 2;
        if (team === 'blue') setBlueDoubleActive(false);
        else setRedDoubleActive(false);
      }

      // 如果对方有盾，抵消拉力
      if (isOpponentShielded) {
        pullPower = 0;
        if (opponent === 'blue') setBlueShieldActive(false);
        else setRedShieldActive(false);
      }

      const newScore = team === 'blue' ? score - pullPower : score + pullPower;
      
      // 更新状态
      setScore(newScore);
      if (team === 'blue') {
        setBlueStreak(currentStreak);
        setBlueProblem(generateProblem(settings));
        setBlueInput('');
        setLastBlueCorrect(Date.now());
        checkPowerUpDrop('blue', currentStreak);
      } else {
        setRedStreak(currentStreak);
        setRedProblem(generateProblem(settings));
        setRedInput('');
        setLastRedCorrect(Date.now());
        checkPowerUpDrop('red', currentStreak);
      }

      // 胜利判定
      if (newScore <= -settings.winScore) setGameState('blue_wins');
      if (newScore >= settings.winScore) setGameState('red_wins');

    } else {
      // 答错
      if (team === 'blue') {
        setBlueInput('');
        setBlueStreak(0);
      } else {
        setRedInput('');
        setRedStreak(0);
      }
    }
  };

  const handleBlueSubmit = useCallback(() => {
    if (gameState !== 'playing' || !blueProblem || blueFrozenUntil > Date.now()) return;
    processAnswer('blue', blueInput, blueProblem);
  }, [blueInput, blueProblem, score, gameState, settings, blueFrozenUntil, blueDoubleActive, redShieldActive, blueStreak]);

  const handleRedSubmit = useCallback(() => {
    if (gameState !== 'playing' || !redProblem || redFrozenUntil > Date.now()) return;
    processAnswer('red', redInput, redProblem);
  }, [redInput, redProblem, score, gameState, settings, redFrozenUntil, redDoubleActive, blueShieldActive, redStreak]);

  // 视觉辅助函数
  const getItemIcon = (type: PowerUpType) => {
    switch (type) {
      case 'freeze': return <Snowflake className="text-blue-400" />;
      case 'double': return <Sword className="text-amber-500" />;
      case 'shield': return <ShieldCheck className="text-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] text-[#1E293B] font-sans select-none overflow-hidden relative">
      {/* 顶部区域 */}
      <header className="h-[70px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <div className="text-[24px] font-black tracking-tight bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
            {t('tugOfWar.title')} 2.0
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
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-40 bg-slate-50/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl border border-white/50 my-auto">
              <h2 className="text-3xl font-black mb-8 text-center text-slate-800">{t('tugOfWar.settingsTitle')}</h2>
              
              <div className="space-y-6">
                {/* 模式选择 */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button 
                    onClick={() => setSettings({...settings, gameMode: 'classic'})}
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${settings.gameMode === 'classic' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}
                  >
                    {t('tugOfWar.modeClassic')}
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, gameMode: 'target'})}
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${settings.gameMode === 'target' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}
                  >
                    {t('tugOfWar.modeTarget')}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">{t('tugOfWar.operators')}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['add', 'sub', 'mul', 'div'] as Operator[]).map(op => (
                      <button
                        key={op}
                        onClick={() => {
                          const newOps = settings.operators.includes(op) ? settings.operators.filter(i => i !== op) : [...settings.operators, op];
                          if (newOps.length > 0) setSettings({...settings, operators: newOps});
                        }}
                        className={`py-3 rounded-xl font-bold transition-all border-2 ${settings.operators.includes(op) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500'}`}
                      >
                        {getOpSymbol(op)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">{t('tugOfWar.range')}</label>
                    <select 
                      value={settings.maxNumber}
                      onChange={(e) => setSettings({...settings, maxNumber: parseInt(e.target.value)})}
                      className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-500"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">{t('tugOfWar.winCondition')}</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="5" max="30" step="5" value={settings.winScore} onChange={(e) => setSettings({...settings, winScore: parseInt(e.target.value)})} className="flex-1 accent-red-500" />
                      <span className="font-black text-red-600 w-8">{settings.winScore}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-black text-slate-700">{t('tugOfWar.enablePowerUps')}</label>
                    <button 
                      onClick={() => setSettings({...settings, powerUpsEnabled: !settings.powerUpsEnabled})}
                      className={`w-14 h-8 rounded-full transition-all relative ${settings.powerUpsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.powerUpsEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {settings.powerUpsEnabled && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-6 overflow-hidden">
                      <div className="grid grid-cols-3 gap-3">
                        {(['freeze', 'double', 'shield'] as PowerUpType[]).map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              const newAllowed = settings.allowedPowerUps.includes(p) ? settings.allowedPowerUps.filter(i => i !== p) : [...settings.allowedPowerUps, p];
                              setSettings({...settings, allowedPowerUps: newAllowed});
                            }}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settings.allowedPowerUps.includes(p) ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white opacity-60'}`}
                          >
                            <div className={`p-2 rounded-full ${settings.allowedPowerUps.includes(p) ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                              {getItemIcon(p)}
                            </div>
                            <div className="flex flex-col items-center text-center">
                              <span className={`text-xs font-black uppercase ${settings.allowedPowerUps.includes(p) ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {t(`tugOfWar.prop${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 leading-tight">
                                {t(`tugOfWar.prop${p.charAt(0).toUpperCase() + p.slice(1)}Desc`)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={16} className="text-amber-500 fill-current" />
                          <h4 className="text-sm font-black text-amber-700">{t('tugOfWar.howToGetItems')}</h4>
                        </div>
                        <p className="text-xs font-bold text-amber-600/80 leading-relaxed">
                          {t('tugOfWar.howToGetItemsDesc')}
                        </p>
                        <div className="mt-3 flex items-center justify-between bg-white/50 p-2 rounded-xl border border-amber-200/50">
                          <span className="text-xs font-black text-amber-700">{t('tugOfWar.triggerCondition')}</span>
                          <select 
                            value={settings.powerUpTrigger}
                            onChange={(e) => setSettings({...settings, powerUpTrigger: parseInt(e.target.value)})}
                            className="bg-white border-none rounded-lg px-2 py-1 text-xs font-black text-amber-600 shadow-sm outline-none"
                          >
                            <option value="2">每连对 2 题</option>
                            <option value="3">每连对 3 题</option>
                            <option value="5">每连对 5 题</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-2xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Play fill="white" size={24} /> {t('tugOfWar.startGame')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 min-h-0">
            {/* 拔河核心视觉 */}
            <TugOfWarAnimation score={score} winScore={settings.winScore} />

            <main className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden">
              {/* 蓝队 */}
              <section className="bg-[#EFF6FF] border-r border-slate-200 flex flex-col items-center p-4 md:p-6 overflow-y-auto relative">
                {/* 状态指示器 */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {blueShieldActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-500 text-white p-2 rounded-full shadow-lg"><ShieldCheck size={20} /></motion.div>}
                  {blueDoubleActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-amber-500 text-white p-2 rounded-full shadow-lg"><Sword size={20} /></motion.div>}
                </div>

                <div className="flex flex-col items-center mb-4">
                  <div className="px-6 py-1 bg-blue-600 text-white rounded-full font-black text-sm mb-2 shadow-lg">{t('tugOfWar.blueTeam')}</div>
                  <AnimatePresence>
                    {blueStreak >= 2 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className={`font-black italic ${blueStreak >= 5 ? 'text-red-500 text-2xl' : 'text-orange-500 text-lg'}`}
                      >
                        {blueStreak >= 5 && <Zap size={20} className="inline mr-1 fill-current" />}
                        {t('tugOfWar.combo', {n: blueStreak})}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {blueProblem && (
                  <div className="bg-white rounded-3xl p-5 w-full max-w-[340px] shadow-xl border-2 border-white text-center mb-4">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                      {settings.gameMode === 'target' ? t('tugOfWar.targetNumber') : ''}
                    </div>
                    <div className="text-[40px] md:text-[50px] font-black text-slate-800 leading-none mb-4">
                      {settings.gameMode === 'target' ? (
                        <div className="flex flex-col items-center">
                          <div>{blueProblem.answer}</div>
                          <div className="text-sm font-bold text-blue-500 mt-2">{t('tugOfWar.mustUse')}{getOpSymbol(blueProblem.operator)}</div>
                        </div>
                      ) : (
                        <>{blueProblem.num1} <span className="text-blue-500">{getOpSymbol(blueProblem.operator)}</span> {blueProblem.num2}</>
                      )}
                    </div>
                    <div className="h-[60px] w-full bg-slate-50 rounded-2xl text-[36px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100 overflow-hidden px-2">
                      {blueInput || (settings.gameMode === 'target' ? '?' : '?')}
                    </div>
                  </div>
                )}

                {/* 道具栏 */}
                <div className="flex flex-col items-center mb-4">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{blueItems.length > 0 ? "点击使用道具 TAP TO USE" : "等待连击掉落"}</div>
                  <div className="flex gap-2 h-12">
                    <AnimatePresence>
                      {blueItems.map((item, i) => (
                        <motion.button 
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          key={`${item}-${i}`} 
                          onClick={() => handleUseItem('blue', item, i)}
                          className="w-12 h-12 bg-white rounded-xl shadow-lg border-2 border-blue-200 flex items-center justify-center relative overflow-hidden group"
                        >
                          <motion.div 
                            animate={{ y: [0, -2, 0] }} 
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            {getItemIcon(item)}
                          </motion.div>
                          <div className="absolute inset-0 bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    {blueItems.length === 0 && <div className="w-12 h-12 rounded-xl border-2 border-dashed border-blue-100 flex items-center justify-center text-blue-100"><Zap size={20} /></div>}
                  </div>
                </div>
                
                <Keypad onInput={(val) => setBlueInput(prev => (prev.length < 15 ? prev + val : prev))} onClear={() => setBlueInput('')} onSubmit={handleBlueSubmit} team="blue" t={t} mode={settings.gameMode} isFrozen={blueFrozenUntil > Date.now()} />
              </section>

              {/* 红队 */}
              <section className="bg-[#FEF2F2] flex flex-col items-center p-4 md:p-6 overflow-y-auto relative">
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {redShieldActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-500 text-white p-2 rounded-full shadow-lg"><ShieldCheck size={20} /></motion.div>}
                  {redDoubleActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-amber-500 text-white p-2 rounded-full shadow-lg"><Sword size={20} /></motion.div>}
                </div>

                <div className="flex flex-col items-center mb-4">
                  <div className="px-6 py-1 bg-red-600 text-white rounded-full font-black text-sm mb-2 shadow-lg">{t('tugOfWar.redTeam')}</div>
                  <AnimatePresence>
                    {redStreak >= 2 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className={`font-black italic ${redStreak >= 5 ? 'text-red-500 text-2xl' : 'text-orange-500 text-lg'}`}
                      >
                        {redStreak >= 5 && <Zap size={20} className="inline mr-1 fill-current" />}
                        {t('tugOfWar.combo', {n: redStreak})}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {redProblem && (
                  <div className="bg-white rounded-3xl p-5 w-full max-w-[340px] shadow-xl border-2 border-white text-center mb-4">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                      {settings.gameMode === 'target' ? t('tugOfWar.targetNumber') : ''}
                    </div>
                    <div className="text-[40px] md:text-[50px] font-black text-slate-800 leading-none mb-4">
                      {settings.gameMode === 'target' ? (
                        <div className="flex flex-col items-center">
                          <div>{redProblem.answer}</div>
                          <div className="text-sm font-bold text-red-500 mt-2">{t('tugOfWar.mustUse')}{getOpSymbol(redProblem.operator)}</div>
                        </div>
                      ) : (
                        <>{redProblem.num1} <span className="text-red-500">{getOpSymbol(redProblem.operator)}</span> {redProblem.num2}</>
                      )}
                    </div>
                    <div className="h-[60px] w-full bg-slate-50 rounded-2xl text-[36px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100 overflow-hidden px-2">
                      {redInput || (settings.gameMode === 'target' ? '?' : '?')}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mb-4 h-12">
                  {redItems.map((item, i) => (
                    <button 
                      key={i} onClick={() => handleUseItem('red', item, i)}
                      className="w-12 h-12 bg-white rounded-xl shadow-md border-2 border-red-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                      {getItemIcon(item)}
                    </button>
                  ))}
                </div>
                
                <Keypad onInput={(val) => setRedInput(prev => (prev.length < 15 ? prev + val : prev))} onClear={() => setRedInput('')} onSubmit={handleRedSubmit} team="red" t={t} mode={settings.gameMode} isFrozen={redFrozenUntil > Date.now()} />
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center z-[60] text-white p-6"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="bg-white rounded-[3rem] p-8 md:p-12 flex flex-col items-center text-center shadow-2xl max-w-lg w-full"
            >
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-6 md:mb-8 ${gameState === 'blue_wins' ? 'bg-blue-100' : 'bg-red-100'}`}>
                <Trophy size={64} className={gameState === 'blue_wins' ? 'text-blue-600' : 'text-red-600'} />
              </div>
              <h2 className={`text-4xl md:text-5xl font-black mb-4 ${gameState === 'blue_wins' ? 'text-blue-600' : 'text-red-600'}`}>
                {gameState === 'blue_wins' ? t('tugOfWar.blueWins') : t('tugOfWar.redWins')}
              </h2>
              <div className="flex flex-col w-full gap-4 mt-6 md:mt-10">
                <button onClick={startGame} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xl font-black shadow-xl hover:scale-[1.05] transition-all flex items-center justify-center gap-3">
                  <RotateCcw size={24} /> {t('tugOfWar.restart')}
                </button>
                <button onClick={() => { setShowSettings(true); setGameState('playing'); }} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                  <SettingsIcon size={24} /> {t('tugOfWar.backToSettings')}
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

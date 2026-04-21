import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, Settings as SettingsIcon, Play, RotateCcw, Trophy, Snowflake, Sword, ShieldCheck, Zap, Lock, Key, ShieldAlert, Upload, FileText, Trash2, Edit2, X, Plus, Save, BarChart2, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import confetti from 'canvas-confetti';
import * as mammoth from 'mammoth';
import { isTugLicenseVerified, verifyTugLicense } from './TugOfWarLicenseManager';
import { getTugOfWarProductConfig } from './tugOfWarProductConfig.js';
import {
  buildBilingualChallengePool,
  buildWordPool,
  createBilingualChallengeProblem,
  isBilingualChallengeAnswerCorrect,
  isWordAnswerCorrect,
  nextBilingualChallengeFromPool,
  nextWordFromPool,
  parseBilingualWordListText,
  parseWordListText,
} from './tugOfWarWordLogic.js';
import { getParticleCount, getSpectacleGlyphs, getSpectacleIntensity } from './tugOfWarSpectacleLogic.js';

type Operator = 'add' | 'sub' | 'mul' | 'div';
type SubjectMode = 'math' | 'word';
type TugOfWarVariant = SubjectMode;
type GameMode = 'classic' | 'target';
type PowerUpType = 'freeze' | 'double' | 'shield';

interface TugOfWarProductConfig {
  subjectMode: SubjectMode;
  title: string;
  licensePrefix: string;
  storagePrefix: string;
  deviceInfo?: string;
}

interface GameSettings {
  subjectMode: SubjectMode;
  operators: Operator[];
  maxNumber: number;
  winScore: number;
  gameRule?: 'tug_of_war' | 'speedrun';
  speedrunTarget?: number;
  gameMode: GameMode;
  powerUpsEnabled: boolean;
  allowedPowerUps: PowerUpType[];
  powerUpTrigger: number;
}

interface MathProblem {
  type: 'math';
  num1: number;
  num2: number;
  operator: Operator;
  answer: number;
}

interface WordProblem {
  type: 'word';
  mode?: 'spelling' | 'challenge';
  prompt?: string;
  answer: string;
  letters: string[];
}

export interface WeightedWord {
  text: string;
  weight: number;
}

export interface BilingualChallengePair {
  chinese: string;
  english: string;
}

export interface SavedWordBank {
  id: string;
  name: string;
  words: WeightedWord[];
  challengePairs?: BilingualChallengePair[];
  createdAt: number;
}

export interface TeamStats {
  correct: number;
  wrong: number;
}

export interface QuestionStat {
  text: string;
  total: TeamStats;
  blue: TeamStats;
  red: TeamStats;
}

export interface MatchRecord {
  id: string;
  date: number;
  winner: 'blue' | 'red';
  mode: 'math' | 'word';
  duration: number;
  stats: Record<string, QuestionStat>;
}

type Problem = MathProblem | WordProblem;

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
const generateMathProblem = (settings: GameSettings): MathProblem => {
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

    return { type: 'math', num1: 0, num2: 0, operator: requiredOp, answer: target };
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

  return { type: 'math', num1, num2, operator, answer };
};

const generateProblem = (settings: GameSettings): Problem | null => {
  return generateMathProblem(settings);
};

const getOpSymbol = (op: Operator) => {
  switch (op) {
    case 'add': return '+';
    case 'sub': return '-';
    case 'mul': return '×';
    case 'div': return '÷';
  }
};

const formatElapsedTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes <= 0) return `${remainingSeconds}秒`;
  return `${minutes}分${remainingSeconds}秒`;
};

const FrozenSquareOverlay = () => (
  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
    <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
      <div className="absolute inset-0 bg-blue-100/40 backdrop-blur-[2px] pointer-events-auto cursor-not-allowed" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 pointer-events-none border-4 border-blue-300/50 rounded-2xl"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.38\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative z-10 aspect-square w-[92px] md:w-[112px] rounded-2xl bg-white/95 border-4 border-blue-300 shadow-2xl flex flex-col items-center justify-center gap-1 px-2 text-center"
    >
      <Snowflake size={42} className="text-blue-500 animate-spin-slow shrink-0" />
      <span className="text-[15px] md:text-[17px] font-black text-blue-700 leading-tight whitespace-nowrap">
        冰冻中！！
      </span>
    </motion.div>
  </div>
);

// 数字小键盘组件
const Keypad = ({ onInput, onClear, onSubmit, team, t, mode, isFrozen, requiredOp }: {
  onInput: (val: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  team: 'blue' | 'red';
  t: (key: string) => string;
  mode: GameMode;
  isFrozen: boolean;
  requiredOp?: string;
}) => {
  const numButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const opButtons = mode === 'target' && requiredOp ? [requiredOp] : ['+', '-', '×', '÷'];
  
  return (
    <div className="relative w-full max-w-[340px]">
      <div className={`grid grid-cols-3 gap-2 transition-all ${isFrozen ? 'opacity-20 grayscale pointer-events-none blur-sm' : ''}`}>
        {numButtons.slice(0, 9).map((btn) => (
          <button
            key={btn}
            onClick={() => onInput(btn)}
            className="h-[44px] md:h-[52px] rounded-xl text-[20px] md:text-[22px] font-bold bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-50 transition-all"
          >
            {btn}
          </button>
        ))}
        <button
          onClick={onClear}
          className="h-[44px] md:h-[52px] rounded-xl text-[18px] md:text-[20px] font-bold bg-slate-200 text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-300 transition-all"
        >
          {t('tugOfWar.clear')}
        </button>
        <button
          onClick={() => onInput('0')}
          className="h-[44px] md:h-[52px] rounded-xl text-[20px] md:text-[22px] font-bold bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-50 transition-all"
        >
          0
        </button>
        <button
          onClick={onSubmit}
          className={`h-[44px] md:h-[52px] rounded-xl text-[18px] md:text-[20px] font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none transition-all ${team === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-800/20' : 'bg-red-600 hover:bg-red-700 shadow-red-800/20'}`}
        >
          {t('tugOfWar.confirm')}
        </button>

        {/* 凑数模式下的运算符 */}
        {mode === 'target' && (
          <div className={`col-span-3 grid gap-2 mt-1 md:mt-2 ${opButtons.length === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
            {opButtons.map(op => (
              <button
                key={op}
                onClick={() => onInput(op)}
                className="h-[40px] md:h-[48px] rounded-xl text-[20px] md:text-[22px] font-black bg-slate-800 text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                {op} {opButtons.length === 1 && <span className="text-sm font-bold text-slate-300">({t('tugOfWar.mustUse').replace(': ', '')})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {isFrozen && <FrozenSquareOverlay />}
    </div>
  );
};

// 英语拼词字母键盘组件
// 动态列数规则：尽量控制在 2 行以内，按钮随之缩小
const getLetterCols = (count: number) => {
  if (count <= 8) return 4;
  if (count <= 10) return 5;
  if (count <= 12) return 6;
  return 7;
};

const LetterKeypad = ({ problem, pickedIndices, onPick, onClear, onSubmit, team, t, isFrozen }: {
  problem: WordProblem;
  pickedIndices: number[];
  onPick: (index: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  team: 'blue' | 'red';
  t: (key: string) => string;
  isFrozen: boolean;
}) => {
  const picked = new Set(pickedIndices);
  const cols = getLetterCols(problem.letters.length);

  // 列数越多，按钮越小
  const btnH = cols <= 5 ? 'h-[42px] md:h-[50px]' : cols === 6 ? 'h-[38px] md:h-[44px]' : 'h-[34px] md:h-[40px]';
  const btnText = cols <= 5 ? 'text-[18px] md:text-[22px]' : cols === 6 ? 'text-[15px] md:text-[18px]' : 'text-[13px] md:text-[15px]';

  // 冻结遮罩与数学键盘完全一致：外层 relative，整体一个容器，absolute inset-0 覆盖全部
  return (
    <div className="relative w-full max-w-[380px]">
      {/* 整个键盘区（字母 + 操作）统一控制冻结状态 */}
      <div className={`flex flex-col gap-2 transition-all ${isFrozen ? 'opacity-20 grayscale pointer-events-none blur-sm' : ''}`}>

        {/* 字母按钮区：动态列数，使用 inline style 避免 Tailwind purge 问题 */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {problem.letters.map((letter, index) => {
            const disabled = picked.has(index);
            return (
              <button
                key={`${letter}-${index}`}
                onClick={() => onPick(index)}
                disabled={disabled}
                className={`${btnH} rounded-xl ${btnText} font-black shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none transition-all ${
                  disabled
                    ? 'bg-slate-100 text-slate-300 shadow-none'
                    : 'bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* 操作按钮区：固定 2 列，始终整齐，且与字母区等宽 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClear}
            className="h-[44px] md:h-[52px] rounded-xl text-[16px] md:text-[18px] font-bold bg-slate-200 text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none hover:bg-slate-300 transition-all"
          >
            {t('tugOfWar.clear')}
          </button>
          <button
            onClick={onSubmit}
            className={`h-[44px] md:h-[52px] rounded-xl text-[16px] md:text-[18px] font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none transition-all ${team === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-800/20' : 'bg-red-600 hover:bg-red-700 shadow-red-800/20'}`}
          >
            {t('tugOfWar.confirm')}
          </button>
        </div>
      </div>

      {/* 冻结遮罩：absolute inset-0 覆盖整个键盘（含字母区+操作区），与数学键盘一致 */}
      {isFrozen && <FrozenSquareOverlay />}
    </div>
  );
};

type WordEncouragement = {
  tone: 'leader' | 'trailing';
  title: string;
  subtitle: string;
};

const getWordEncouragement = ({
  subjectMode,
  gameRule,
  progress,
  opponentProgress,
  target,
  streak,
  tugAdvantage,
}: {
  subjectMode: SubjectMode;
  gameRule?: 'tug_of_war' | 'speedrun';
  progress: number;
  opponentProgress: number;
  target: number;
  streak: number;
  tugAdvantage: number;
}): WordEncouragement | null => {
  if (subjectMode !== 'word') return null;

  if (gameRule === 'speedrun') {
    const safeTarget = Math.max(1, target);
    const progressRate = progress / safeTarget;
    const gap = opponentProgress - progress;

    if (progressRate >= 0.7 && progress >= opponentProgress) {
      return { tone: 'leader', title: "You're awesome!", subtitle: '快到了！' };
    }

    if (gap >= 2) {
      return { tone: 'trailing', title: 'Keep going!', subtitle: '别放弃，你可以追上！' };
    }

    if (progressRate >= 0.5) {
      return { tone: 'leader', title: 'Almost there!', subtitle: '继续保持！' };
    }
  }

  if (streak >= 3) {
    return { tone: 'leader', title: "You're awesome!", subtitle: '连续答对，太棒了！' };
  }

  if (tugAdvantage <= -4) {
    return { tone: 'trailing', title: 'You can do it!', subtitle: '别放弃，下一题追上！' };
  }

  return null;
};

const getCorrectBurstLabels = (subjectMode: SubjectMode) => (
  subjectMode === 'word'
    ? ['Good!', 'Great!', 'Nice!', 'Super!']
    : ['+', '-', 'x', '=']
);

const TeamSpectacleLayer = ({ team, subjectMode, intensity, streak, lastCorrectAt, encouragement, isTugRule }: {
  team: 'blue' | 'red';
  subjectMode: SubjectMode;
  intensity: number;
  streak: number;
  lastCorrectAt: number;
  encouragement?: WordEncouragement | null;
  isTugRule: boolean;
}) => {
  const glyphs = getSpectacleGlyphs(subjectMode);
  const particleCount = getParticleCount(intensity, false);
  const compactCount = getParticleCount(intensity, true);
  const correctBurstLabels = getCorrectBurstLabels(subjectMode);
  const accent = team === 'blue' ? '#2563EB' : '#DC2626';
  const softAccent = team === 'blue' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(220, 38, 38, 0.18)';
  const ribbonAngle = team === 'blue' ? '115deg' : '65deg';
  const burstSideClass = team === 'blue' ? 'left-4 md:left-10' : 'right-4 md:right-10';
  const burstAlignClass = team === 'blue' ? 'justify-start' : 'justify-end';

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none motion-reduce:hidden" aria-hidden="true">
      {isTugRule && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: 0.12 + (intensity * 0.42) }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundImage: `linear-gradient(${ribbonAngle}, transparent 0%, ${softAccent} 35%, transparent 68%)`,
          }}
        />
      )}

      {isTugRule && streak >= 2 && (
        <motion.div
          className="absolute inset-x-[-20%] top-[12%] h-12 md:h-16 skew-y-[-6deg]"
          animate={{
            x: team === 'blue' ? ['-8%', '8%', '-8%'] : ['8%', '-8%', '8%'],
            opacity: [0.12, 0.24 + (intensity * 0.34), 0.12],
          }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 18px, ${softAccent} 18px 34px)`,
          }}
        />
      )}

      {isTugRule && Array.from({ length: particleCount }).map((_, index) => {
        const compactHidden = index >= compactCount ? 'hidden sm:block' : '';
        const left = team === 'blue'
          ? 10 + ((index * 13) % 58)
          : 32 + ((index * 11) % 58);
        const top = 14 + ((index * 17) % 70);
        const duration = 2.8 + ((index % 4) * 0.45);
        const delay = (index % 7) * 0.18;

        return (
          <motion.span
            key={`${team}-spark-${index}`}
            className={`absolute text-sm md:text-xl font-black select-none ${compactHidden}`}
            style={{ left: `${left}%`, top: `${top}%`, color: accent, opacity: 0 }}
            animate={{
              y: team === 'blue' ? [8, -18, 8] : [-8, 18, -8],
              x: team === 'blue' ? [-4, 8, -4] : [4, -8, 4],
              rotate: [-10, 10, -10],
              opacity: [0, intensity * 0.62, 0],
              scale: [0.82, 1.05 + (intensity * 0.25), 0.82],
            }}
            transition={{ repeat: Infinity, duration, delay, ease: 'easeInOut' }}
          >
            {glyphs[index % glyphs.length]}
          </motion.span>
        );
      })}

      <AnimatePresence>
        {encouragement && (
          <motion.div
            key={`${team}-encouragement-${encouragement.tone}-${encouragement.title}`}
            className={`absolute top-[12%] md:top-[15%] ${team === 'blue' ? 'left-4 md:left-8' : 'right-4 md:right-8'} max-w-[min(72%,260px)] rounded-2xl border-2 bg-white/88 px-3 py-2 md:px-4 md:py-3 text-center shadow-2xl backdrop-blur-sm`}
            initial={{ opacity: 0, y: 14, scale: 0.88, rotate: team === 'blue' ? -2 : 2 }}
            animate={{
              opacity: [0, 1, 1, 0.88],
              y: [14, -4, 0, -3],
              scale: [0.88, 1.04, 1, 1.02],
              rotate: team === 'blue' ? [-2, 1, -1] : [2, -1, 1],
            }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
            style={{
              borderColor: encouragement?.tone === 'leader' ? accent : encouragement?.tone === 'trailing' ? '#F59E0B' : accent,
              color: encouragement?.tone === 'leader' ? accent : encouragement?.tone === 'trailing' ? '#B45309' : accent,
            }}
          >
            <div className="text-[13px] md:text-lg font-black leading-tight break-words">
              {encouragement.title}
            </div>
            <div className="mt-0.5 text-[11px] md:text-sm font-black leading-tight text-slate-700 break-words">
              {encouragement.subtitle}
            </div>
          </motion.div>
        )}

        {lastCorrectAt > 0 && (
          <motion.div
            key={`${team}-burst-${lastCorrectAt}`}
            className={`absolute top-[38%] ${burstSideClass} max-w-[min(78%,340px)] flex items-center ${burstAlignClass}`}
            initial={{ opacity: 0, scale: 0.4, y: 8 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.25, 1.7], y: [8, -8, -20] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <div
              className="flex max-w-full flex-wrap justify-center gap-1 md:gap-2 rounded-2xl border-2 bg-white/75 px-3 py-2 shadow-xl backdrop-blur-sm"
              style={{ borderColor: accent, color: accent }}
            >
              {correctBurstLabels.map((label, index) => (
                <motion.span
                  key={`${label}-${index}`}
                  className="text-sm md:text-xl font-black leading-tight break-words"
                  animate={{ y: [0, -8, 0], rotate: [-8, 8, 0] }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const fireTeamConfetti = (team: 'blue' | 'red', subjectMode: SubjectMode, streak: number) => {
  const isBlue = team === 'blue';
  const isWordMode = subjectMode === 'word';
  const particleCount = Math.min(18 + (Math.max(1, streak) * 4), streak >= 5 ? 48 : 34);

  confetti({
    particleCount,
    angle: isBlue ? 55 : 125,
    spread: streak >= 5 ? 70 : 48,
    startVelocity: streak >= 5 ? 34 : 25,
    gravity: 1.05,
    ticks: 85,
    scalar: isWordMode ? 0.82 : 0.76,
    origin: { x: isBlue ? 0.24 : 0.76, y: 0.62 },
    colors: isWordMode
      ? (isBlue ? ['#2563EB', '#14B8A6', '#FACC15'] : ['#DC2626', '#F97316', '#FACC15'])
      : (isBlue ? ['#2563EB', '#60A5FA', '#FACC15'] : ['#DC2626', '#FB7185', '#FACC15']),
  });
};

const fireVictoryCelebration = (winner: 'blue' | 'red', subjectMode: SubjectMode) => {
  const duration = 2600;
  const end = Date.now() + duration;
  const isBlue = winner === 'blue';
  const colors = isBlue
    ? ['#2563EB', '#60A5FA', '#FACC15', '#FFFFFF']
    : ['#DC2626', '#F87171', '#FACC15', '#FFFFFF'];

  confetti({
    particleCount: 70,
    spread: 95,
    startVelocity: 46,
    origin: { x: isBlue ? 0.3 : 0.7, y: 0.45 },
    colors,
    scalar: subjectMode === 'word' ? 1 : 0.92,
    ticks: 160,
  });

  const timer = window.setInterval(() => {
    if (Date.now() > end) {
      window.clearInterval(timer);
      return;
    }

    confetti({
      particleCount: 42,
      angle: isBlue ? 60 : 120,
      spread: 70,
      startVelocity: 38,
      origin: { x: Math.random() * 0.8 + 0.1, y: Math.random() * 0.28 + 0.12 },
      colors,
      scalar: subjectMode === 'word' ? 0.95 : 0.86,
      ticks: 130,
    });
  }, 260);
};

// Team Member Animation
const TeamMember = ({ team, index }: { team: 'blue' | 'red', index: number }) => {
  const color = team === 'blue' ? '#3B82F6' : '#EF4444';
  const darkColor = team === 'blue' ? '#1D4ED8' : '#B91C1C';
  
  return (
    <motion.div
      initial={{ scaleX: team === 'red' ? -1 : 1 }}
      animate={{ 
        rotate: team === 'blue' ? [-10, 0, -10] : [10, 0, 10], // 双方都向各自的后方倾斜
        x: team === 'blue' ? [-2, 2, -2] : [2, -2, 2],         // 微小位移
        scaleX: team === 'red' ? -1 : 1
      }}
      transition={{ repeat: Infinity, duration: 0.6, delay: index * 0.2, ease: "easeInOut" }}
      className="relative z-10"
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
  const tension = Math.min(1, Math.abs(score) / Math.max(1, winScore));
  const leadingTeam = score < 0 ? 'blue' : score > 0 ? 'red' : null;

  return (
    <div className="h-[90px] md:h-[120px] bg-white flex items-center justify-center relative border-b border-slate-200 shrink-0 overflow-hidden">
      {leadingTeam && (
        <motion.div
          className="absolute inset-x-0 top-0 h-2 md:h-3"
          animate={{ opacity: [0.35, 0.75, 0.35], x: leadingTeam === 'blue' ? ['4%', '-4%', '4%'] : ['-4%', '4%', '-4%'] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          style={{
            backgroundImage: leadingTeam === 'blue'
              ? `linear-gradient(90deg, rgba(37,99,235,${0.25 + tension * 0.5}), transparent)`
              : `linear-gradient(270deg, rgba(220,38,38,${0.25 + tension * 0.5}), transparent)`,
          }}
        />
      )}

      {/* Background marks */}
      <div className="absolute inset-0 flex justify-center items-end pb-2 md:pb-4 opacity-20 pointer-events-none w-full">
        <div className="w-[80%] flex justify-between">
          {[...Array(winScore * 2 + 1)].map((_, i) => (
            <div key={i} className={`w-0.5 ${i === winScore ? 'bg-red-500 h-8 md:h-10' : 'bg-slate-400 h-4 md:h-6'}`} />
          ))}
        </div>
      </div>

      <motion.div 
        className="w-full relative h-[70px] md:h-[100px] flex items-center justify-center scale-75 md:scale-100"
        animate={{ x: `${progress}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {/* Rope */}
        <div className="absolute top-[32px] w-[200%] h-4 bg-amber-700/90 rounded-full shadow-sm border-y border-amber-900/40 overflow-hidden">
          <motion.div 
            animate={{ x: [-20, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="w-full h-full opacity-30" 
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #000 5px, #000 10px)' }}
          />
        </div>

        {/* Center Flag */}
        <motion.div 
          animate={{ rotate: [-8, 8, -8], x: [-1, 1, -1] }}
          transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
          className="absolute top-[32px] left-1/2 -translate-x-1/2 w-6 h-16 bg-red-500 shadow-md z-20 border-2 border-white" 
          style={{ transformOrigin: 'top center' }} 
        />

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

export const TugOfWarApp = ({ variant = 'math' }: { variant?: TugOfWarVariant }) => {
  const navigate = useNavigate();
  const t = useTranslations();
  const productConfig = getTugOfWarProductConfig(variant) as TugOfWarProductConfig;
  
  // 授权状态
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [licenseInput, setLicenseInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  // 配置状态
  const [showSettings, setShowSettings] = useState(true);

  // 初始化检查授权
  useEffect(() => {
    setIsVerified(isTugLicenseVerified(productConfig));
  }, [productConfig]);

  const handleVerify = async () => {
    if (!licenseInput.trim()) return;
    setVerifying(true);
    setError('');
    const result = await verifyTugLicense(productConfig, licenseInput);
    if (result.success) {
      setIsVerified(true);
    } else {
      setError(result.message || '验证失败');
    }
    setVerifying(false);
  };
  const [settings, setSettings] = useState<GameSettings>({
    subjectMode: productConfig.subjectMode,
    operators: ['add'],
    maxNumber: 10,
    winScore: 10,
    gameRule: 'tug_of_war',
    speedrunTarget: 10,
    gameMode: 'classic',
    powerUpsEnabled: true,
    allowedPowerUps: ['freeze', 'double', 'shield'],
    powerUpTrigger: 3
  });
  
  const [savedBanks, setSavedBanks] = useState<SavedWordBank[]>(() => {
    try {
      const stored = localStorage.getItem('tugOfWar_savedBanks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeBankId, setActiveBankId] = useState<string | null>(savedBanks.length > 0 ? savedBanks[0].id : null);
  const [wordBank, setWordBank] = useState<WeightedWord[]>(savedBanks.length > 0 ? savedBanks[0].words : []);
  const [challengePairs, setChallengePairs] = useState<BilingualChallengePair[]>(
    savedBanks.length > 0 ? (savedBanks[0].challengePairs || []) : []
  );
  const [editingBank, setEditingBank] = useState<SavedWordBank | null>(null);

  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>(() => {
    try {
      const stored = localStorage.getItem('tugOfWar_matchHistory');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [historyViewMode, setHistoryViewMode] = useState<'combined' | 'split'>('combined');
  const currentMatchStatsRef = useRef<Record<string, QuestionStat>>({});

  useEffect(() => {
    localStorage.setItem('tugOfWar_savedBanks', JSON.stringify(savedBanks));
  }, [savedBanks]);

  useEffect(() => {
    localStorage.setItem('tugOfWar_matchHistory', JSON.stringify(matchHistory));
  }, [matchHistory]);

  // 蓝红队各自独立的洗牌词池，保证每个单词都能出现
  const blueWordPoolRef = useRef<string[]>([]);
  const redWordPoolRef = useRef<string[]>([]);
  const blueChallengePoolRef = useRef<BilingualChallengePair[]>([]);
  const redChallengePoolRef = useRef<BilingualChallengePair[]>([]);
  const [wordImportMessage, setWordImportMessage] = useState('');
  const [isParsingWordFile, setIsParsingWordFile] = useState(false);

  // 核心游戏状态
  const [score, setScore] = useState(0);
  const [blueProblem, setBlueProblem] = useState<Problem | null>(null);
  const [redProblem, setRedProblem] = useState<Problem | null>(null);
  const [blueInput, setBlueInput] = useState('');
  const [redInput, setRedInput] = useState('');
  const [bluePickedLetterIndices, setBluePickedLetterIndices] = useState<number[]>([]);
  const [redPickedLetterIndices, setRedPickedLetterIndices] = useState<number[]>([]);
  const [blueProgress, setBlueProgress] = useState(0);
  const [redProgress, setRedProgress] = useState(0);
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
    if (!showSettings && gameState === 'playing' && isVerified) {
      timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showSettings, gameState, isVerified]);

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

  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingWordFile(true);
    setWordImportMessage('');

    try {
      const isDocx = file.name.toLowerCase().endsWith('.docx');
      const text = isDocx
        ? (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
        : await (async () => { const buf = await file.arrayBuffer(); try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch(e) { return new TextDecoder('gbk').decode(buf); } })();
      const words = parseWordListText(text).slice(0, 300) as WeightedWord[];
      const importedChallengePairs = parseBilingualWordListText(text).slice(0, 300) as BilingualChallengePair[];

      if (words.length === 0) {
        setWordImportMessage(t('tugOfWar.wordImportEmpty'));
        return;
      }

      const dateStr = `${new Date().getMonth() + 1}月${new Date().getDate()}日`;
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const bankName = fileName.length > 15 ? dateStr + ' 词库' : fileName;

      const newBank: SavedWordBank = {
        id: Math.random().toString(36).substring(2, 9),
        name: bankName,
        words,
        challengePairs: importedChallengePairs,
        createdAt: Date.now(),
      };

      setSavedBanks(prev => [newBank, ...prev]);
      setActiveBankId(newBank.id);
      setWordBank(words);
      setChallengePairs(importedChallengePairs);

      setWordImportMessage(`${t('tugOfWar.wordImportSuccess', { count: words.length })}；挑战配对 ${importedChallengePairs.length} 组`);
    } catch (error) {
      console.error('Word list parse error', error);
      setWordImportMessage(t('tugOfWar.wordImportError'));
    } finally {
      setIsParsingWordFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const clearTeamInput = (team: 'blue' | 'red') => {
    if (team === 'blue') {
      setBlueInput('');
      setBluePickedLetterIndices([]);
    } else {
      setRedInput('');
      setRedPickedLetterIndices([]);
    }
  };

  const handleLetterPick = (team: 'blue' | 'red', index: number) => {
    const problem = team === 'blue' ? blueProblem : redProblem;
    const picked = team === 'blue' ? bluePickedLetterIndices : redPickedLetterIndices;
    if (!problem || problem.type !== 'word' || picked.includes(index)) return;

    if (team === 'blue') {
      setBluePickedLetterIndices(prev => [...prev, index]);
      setBlueInput(prev => prev + problem.letters[index]);
    } else {
      setRedPickedLetterIndices(prev => [...prev, index]);
      setRedInput(prev => prev + problem.letters[index]);
    }
  };

  // 游戏开始/重置
  const startGame = () => {
    if (settings.subjectMode === 'math' && settings.operators.length === 0 && settings.gameMode === 'classic') return;
    if (settings.subjectMode === 'word' && wordBank.length === 0) {
      setWordImportMessage(t('tugOfWar.wordImportEmpty'));
      return;
    }
    if (settings.subjectMode === 'word' && settings.gameRule === 'speedrun' && challengePairs.length === 0) {
      setWordImportMessage('挑战模式需要导入“中文 + 英文”的双语词表，例如：苹果 apple');
      return;
    }

    // 英文模式：初始化蓝红队各自的洗牌词池
    if (settings.subjectMode === 'word') {
      if (settings.gameRule === 'speedrun') {
        blueChallengePoolRef.current = buildBilingualChallengePool(challengePairs);
        redChallengePoolRef.current = buildBilingualChallengePool(challengePairs);
        setBlueProblem(nextBilingualChallengeFromPool(blueChallengePoolRef.current, challengePairs) as Problem | null);
        setRedProblem(nextBilingualChallengeFromPool(redChallengePoolRef.current, challengePairs) as Problem | null);
      } else {
        blueWordPoolRef.current = buildWordPool(wordBank);
        redWordPoolRef.current = buildWordPool(wordBank);
        setBlueProblem(nextWordFromPool(blueWordPoolRef.current, wordBank) as Problem | null);
        setRedProblem(nextWordFromPool(redWordPoolRef.current, wordBank) as Problem | null);
      }
    } else {
      setBlueProblem(generateProblem(settings));
      setRedProblem(generateProblem(settings));
    }
    setScore(0);
    setBlueProgress(0);
    setRedProgress(0);
    setBlueInput('');
    setRedInput('');
    setBluePickedLetterIndices([]);
    setRedPickedLetterIndices([]);
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
    setLastBlueCorrect(0);
    setLastRedCorrect(0);
    setGameState('playing');
    setTimeElapsed(0);
    currentMatchStatsRef.current = {};
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
    let questionKey = '';
    
    if (problem.type === 'word') {
      isCorrect = problem.mode === 'challenge'
        ? isBilingualChallengeAnswerCorrect(input, problem.answer)
        : isWordAnswerCorrect(input, problem.answer);
      questionKey = problem.mode === 'challenge' && problem.prompt
        ? `${problem.prompt} -> ${problem.answer}`
        : problem.answer;
    } else if (settings.gameMode === 'classic') {
      isCorrect = parseInt(input) === problem.answer;
      questionKey = `${problem.num1} ${getOpSymbol(problem.operator)} ${problem.num2}`;
    } else {
      const result = evaluateExpression(input);
      const requiredSymbol = getOpSymbol(problem.operator);
      isCorrect = result !== null && Math.abs(result - problem.answer) < 0.01 && input.includes(requiredSymbol);
      questionKey = `凑数: 目标 ${problem.answer}`;
    }

    // 记录统计数据
    if (!currentMatchStatsRef.current[questionKey]) {
      currentMatchStatsRef.current[questionKey] = {
        text: questionKey,
        total: { correct: 0, wrong: 0 },
        blue: { correct: 0, wrong: 0 },
        red: { correct: 0, wrong: 0 }
      };
    }
    const stat = currentMatchStatsRef.current[questionKey];
    if (isCorrect) {
      stat.total.correct += 1;
      stat[team].correct += 1;
    } else {
      stat.total.wrong += 1;
      stat[team].wrong += 1;
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

      // 更新状态与判定胜利
      let winner: 'blue' | 'red' | null = null;
      if (settings.gameRule === 'speedrun') {
        const bp = team === 'blue' ? blueProgress + pullPower : blueProgress;
        const rp = team === 'red' ? redProgress + pullPower : redProgress;
        setBlueProgress(bp);
        setRedProgress(rp);
        if (bp >= (settings.speedrunTarget || 10)) winner = 'blue';
        if (rp >= (settings.speedrunTarget || 10)) winner = 'red';
      } else {
        const newScore = team === 'blue' ? score - pullPower : score + pullPower;
        setScore(newScore);
        if (newScore <= -settings.winScore) winner = 'blue';
        if (newScore >= settings.winScore) winner = 'red';
      }
      
      fireTeamConfetti(team, settings.subjectMode, currentStreak);
      if (team === 'blue') {
        setBlueStreak(currentStreak);
        setBlueProblem(
          settings.subjectMode === 'word' && settings.gameRule === 'speedrun'
            ? nextBilingualChallengeFromPool(blueChallengePoolRef.current, challengePairs) as Problem | null
            : settings.subjectMode === 'word'
            ? nextWordFromPool(blueWordPoolRef.current, wordBank) as Problem | null
            : generateProblem(settings)
        );
        clearTeamInput('blue');
        setLastBlueCorrect(Date.now());
        checkPowerUpDrop('blue', currentStreak);
      } else {
        setRedStreak(currentStreak);
        setRedProblem(
          settings.subjectMode === 'word' && settings.gameRule === 'speedrun'
            ? nextBilingualChallengeFromPool(redChallengePoolRef.current, challengePairs) as Problem | null
            : settings.subjectMode === 'word'
            ? nextWordFromPool(redWordPoolRef.current, wordBank) as Problem | null
            : generateProblem(settings)
        );
        clearTeamInput('red');
        setLastRedCorrect(Date.now());
        checkPowerUpDrop('red', currentStreak);
      }

      if (winner) {
        fireVictoryCelebration(winner, settings.subjectMode);
        setGameState(`${winner}_wins` as any);
        const newRecord: MatchRecord = {
          id: Math.random().toString(36).substring(2, 9),
          date: Date.now(),
          winner,
          mode: settings.subjectMode,
          duration: timeElapsed,
          stats: { ...currentMatchStatsRef.current }
        };
        setMatchHistory(prev => [newRecord, ...prev]);
      }

    } else {
      // 答错
      if (team === 'blue') {
        clearTeamInput('blue');
        setBlueStreak(0);
      } else {
        clearTeamInput('red');
        setRedStreak(0);
      }
    }
  };

  const handleBlueSubmit = useCallback(() => {
    if (gameState !== 'playing' || !blueProblem || blueFrozenUntil > Date.now()) return;
    processAnswer('blue', blueInput, blueProblem);
  }, [blueInput, blueProblem, score, gameState, settings, wordBank, challengePairs, blueFrozenUntil, blueDoubleActive, redShieldActive, blueStreak]);

  const handleRedSubmit = useCallback(() => {
    if (gameState !== 'playing' || !redProblem || redFrozenUntil > Date.now()) return;
    processAnswer('red', redInput, redProblem);
  }, [redInput, redProblem, score, gameState, settings, wordBank, challengePairs, redFrozenUntil, redDoubleActive, blueShieldActive, redStreak]);

  const spectacleNow = Date.now();
  const blueSpectacleIntensity = getSpectacleIntensity({
    team: 'blue',
    score,
    winScore: settings.winScore,
    streak: blueStreak,
    lastCorrectAt: lastBlueCorrect,
    now: spectacleNow,
  });
  const redSpectacleIntensity = getSpectacleIntensity({
    team: 'red',
    score,
    winScore: settings.winScore,
    streak: redStreak,
    lastCorrectAt: lastRedCorrect,
    now: spectacleNow,
  });
  const blueWordEncouragement = getWordEncouragement({
    subjectMode: settings.subjectMode,
    gameRule: settings.gameRule,
    progress: blueProgress,
    opponentProgress: redProgress,
    target: settings.speedrunTarget || 10,
    streak: blueStreak,
    tugAdvantage: -score,
  });
  const redWordEncouragement = getWordEncouragement({
    subjectMode: settings.subjectMode,
    gameRule: settings.gameRule,
    progress: redProgress,
    opponentProgress: blueProgress,
    target: settings.speedrunTarget || 10,
    streak: redStreak,
    tugAdvantage: score,
  });

  // 视觉辅助函数
  const getItemIcon = (type: PowerUpType) => {
    switch (type) {
      case 'freeze': return <Snowflake className="text-blue-400" />;
      case 'double': return <Sword className="text-amber-500" />;
      case 'shield': return <ShieldCheck className="text-emerald-500" />;
    }
  };

  const getPowerUpTeacherDescription = (type: PowerUpType) => {
    switch (type) {
      case 'freeze': return '锁住对方键盘 3 秒';
      case 'double': return '下次答对加倍推进';
      case 'shield': return '抵挡一次对方道具';
    }
  };

  // 如果授权状态未知，显示加载中
  if (isVerified === null) return <div className="h-screen w-screen bg-slate-50 flex items-center justify-center font-black text-slate-400">Loading...</div>;

  // 如果未授权，显示授权界面
  if (!isVerified) {
    return (
      <div className="h-screen w-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans select-none overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 relative z-10"
        >
          <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
              <Lock size={40} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">{productConfig.title}</h1>
            <p className="text-slate-400 font-bold mb-8 text-sm uppercase tracking-widest">需要授权码解锁完整版</p>

            <div className="w-full space-y-6">
              <div className="group rounded-3xl border-2 border-slate-100 bg-slate-50 p-2 shadow-sm transition-all focus-within:border-blue-500 focus-within:bg-white">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div
                    aria-label="授权码前缀"
                    className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-blue-600 shadow-sm sm:min-w-[106px]"
                  >
                    <Key size={19} className="shrink-0" />
                    <span className="font-mono text-xl font-black tracking-wider">{productConfig.licensePrefix}</span>
                  </div>
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                    placeholder="输入完整授权码"
                    aria-label={`${productConfig.title}授权码`}
                    className="min-w-0 flex-1 rounded-2xl bg-transparent px-3 py-3 text-lg font-black text-slate-800 outline-none placeholder:text-slate-300 sm:text-xl"
                  />
                </div>
                <div className="px-3 pb-1 pt-2 text-left text-xs font-bold text-slate-400">
                  授权码需以 {productConfig.licensePrefix} 开头
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100"
                >
                  <ShieldAlert size={18} className="shrink-0" />
                  <span className="text-sm font-bold leading-tight">{error}</span>
                </motion.div>
              )}

              <button
                onClick={handleVerify}
                disabled={verifying || !licenseInput.trim()}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-xl font-black shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 transition-all flex items-center justify-center gap-3"
              >
                {verifying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>正在激活...</span>
                  </div>
                ) : (
                  <>解锁完整版</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] text-[#1E293B] font-sans select-none overflow-hidden relative">
      {/* 顶部悬浮控制 - 仅在游戏时显示 */}
      {!showSettings && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-50 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setShowSettings(true)} 
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-600 hover:bg-white transition-all border border-slate-200"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-600 hover:bg-white transition-all border border-slate-200"
            >
              <SettingsIcon size={20} />
            </button>
          </div>

          <div className="pointer-events-auto flex gap-2">
            <div className="font-mono text-lg font-bold text-slate-600 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-slate-200 shadow-lg">
              {Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </div>
            <button 
              onClick={toggleFullscreen} 
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-600 hover:bg-white transition-all border border-slate-200"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* 词库编辑弹窗 */}
      <AnimatePresence>
        {editingBank && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Edit2 size={20} className="text-blue-600" /> 调节频率：{editingBank.name}
                </h3>
                <button onClick={() => setEditingBank(null)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 bg-blue-50 shrink-0 border-b border-blue-100 flex items-center gap-2">
                <input 
                  type="text" 
                  id="newWordInput"
                  placeholder="手动添加新单词..." 
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-transparent focus:border-blue-300 outline-none font-bold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim();
                      if (val.length >= 2) {
                        setEditingBank(prev => prev ? { ...prev, words: [{ text: val, weight: 1 }, ...prev.words] } : null);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('newWordInput') as HTMLInputElement;
                    const val = input.value.trim();
                    if (val.length >= 2) {
                      setEditingBank(prev => prev ? { ...prev, words: [{ text: val, weight: 1 }, ...prev.words] } : null);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white font-black rounded-xl flex items-center gap-1 hover:bg-blue-700 shrink-0"
                >
                  <Plus size={18} /> 添加
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {editingBank.words.map((w, i) => (
                  <div key={`${w.text}-${i}`} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-black text-slate-700 text-lg lowercase tracking-wider">{w.text}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-9">
                        <button 
                          onClick={() => setEditingBank(prev => prev ? { ...prev, words: prev.words.map((cw, ci) => ci === i ? { ...cw, weight: Math.max(1, cw.weight - 1) } : cw) } : null)}
                          className="w-9 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 font-black text-xl"
                        >-</button>
                        <div className="w-12 text-center font-black text-blue-600 text-sm border-x border-slate-200 h-full flex items-center justify-center bg-slate-50">
                          {w.weight}x
                        </div>
                        <button 
                          onClick={() => setEditingBank(prev => prev ? { ...prev, words: prev.words.map((cw, ci) => ci === i ? { ...cw, weight: cw.weight + 1 } : cw) } : null)}
                          className="w-9 h-full flex items-center justify-center text-blue-600 hover:bg-blue-50 active:bg-blue-100 font-black text-xl"
                        >+</button>
                      </div>
                      <button 
                        onClick={() => setEditingBank(prev => prev ? { ...prev, words: prev.words.filter((_, ci) => ci !== i) } : null)}
                        className="w-9 h-9 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {editingBank.words.length === 0 && (
                  <div className="text-center text-slate-400 py-10 font-bold">词库空了，加点单词吧~</div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                <button 
                  onClick={() => {
                    setSavedBanks(prev => prev.map(b => b.id === editingBank.id ? editingBank : b));
                    if (activeBankId === editingBank.id) {
                      setWordBank(editingBank.words);
                      setChallengePairs(editingBank.challengePairs || []);
                    }
                    setEditingBank(null);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 shadow-md flex items-center justify-center gap-2"
                >
                  <Save size={20} /> 完成编辑并保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-slate-50 rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 md:p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <BarChart2 size={28} className="text-blue-600" /> 全局比赛数据面板
                </h3>
                <div className="flex items-center gap-4">
                  {matchHistory.length > 0 && (
                    <button 
                      onClick={() => {
                        if (confirm('确定要清空所有比赛记录吗？')) {
                          setMatchHistory([]);
                          setSelectedMatchId(null);
                        }
                      }}
                      className="text-red-500 hover:text-red-600 font-bold text-sm flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} /> 清空记录
                    </button>
                  )}
                  <button onClick={() => setShowHistory(false)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Column: Match List */}
                <div className="w-full md:w-1/3 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
                  {matchHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-3">
                      <Trophy size={48} className="opacity-20" />
                      <p className="font-bold">暂无比赛记录，快去完成一局吧！</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {matchHistory.map(record => {
                        const isSelected = record.id === selectedMatchId;
                        const dateObj = new Date(record.date);
                        const dateStr = `${dateObj.getMonth()+1}/${dateObj.getDate()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                        
                        return (
                          <div 
                            key={record.id}
                            onClick={() => setSelectedMatchId(record.id)}
                            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-black text-white ${record.winner === 'blue' ? 'bg-blue-500' : 'bg-red-500'}`}>
                                {record.winner === 'blue' ? '蓝队胜' : '红队胜'}
                              </span>
                              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                <Clock size={12} /> {record.duration}s
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                              <Calendar size={16} className="text-slate-400" /> {dateStr}
                            </div>
                            <div className="mt-2 text-xs text-slate-500 font-medium">
                              模式: {record.mode === 'math' ? '数学' : '英文拼词'} | 题目数: {Object.keys(record.stats).length}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Match Details */}
                <div className="flex-1 bg-slate-50/50 overflow-y-auto relative">
                  {selectedMatchId && matchHistory.find(m => m.id === selectedMatchId) ? (
                    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
                      {/* View Mode Toggle */}
                      <div className="flex justify-center mb-6">
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                          <button 
                            onClick={() => setHistoryViewMode('combined')}
                            className={`px-6 py-2 rounded-lg font-black text-sm transition-all ${historyViewMode === 'combined' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            合并总计看
                          </button>
                          <button 
                            onClick={() => setHistoryViewMode('split')}
                            className={`px-6 py-2 rounded-lg font-black text-sm transition-all ${historyViewMode === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            红蓝分开看
                          </button>
                        </div>
                      </div>

                      {/* Stat Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.values(matchHistory.find(m => m.id === selectedMatchId)!.stats).map(stat => (
                          <div key={stat.text} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <div className="text-lg font-black text-slate-800 mb-4 uppercase tracking-wider truncate" title={stat.text}>
                              {stat.text}
                            </div>
                            
                            {historyViewMode === 'combined' ? (
                              <div className="flex items-center gap-4">
                                <div className="flex-1 bg-green-50 rounded-xl p-3 flex flex-col items-center border border-green-100">
                                  <span className="text-xs font-bold text-green-600 mb-1 flex items-center gap-1"><CheckCircle2 size={14}/> 正确</span>
                                  <span className="text-2xl font-black text-green-700">{stat.total.correct}</span>
                                </div>
                                <div className="flex-1 bg-red-50 rounded-xl p-3 flex flex-col items-center border border-red-100">
                                  <span className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1"><XCircle size={14}/> 错误</span>
                                  <span className="text-2xl font-black text-red-700">{stat.total.wrong}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Blue Team Row */}
                                <div className="flex items-center gap-3">
                                  <div className="w-12 text-center text-xs font-black text-blue-600 bg-blue-50 py-1 rounded">蓝队</div>
                                  <div className="flex-1 flex gap-2">
                                    <div className="flex-1 bg-green-50/50 rounded-lg py-1 px-2 flex justify-between border border-green-100/50 text-sm">
                                      <span className="text-green-600 font-bold text-xs">对</span><span className="text-green-700 font-black">{stat.blue.correct}</span>
                                    </div>
                                    <div className="flex-1 bg-red-50/50 rounded-lg py-1 px-2 flex justify-between border border-red-100/50 text-sm">
                                      <span className="text-red-600 font-bold text-xs">错</span><span className="text-red-700 font-black">{stat.blue.wrong}</span>
                                    </div>
                                  </div>
                                </div>
                                {/* Red Team Row */}
                                <div className="flex items-center gap-3">
                                  <div className="w-12 text-center text-xs font-black text-red-600 bg-red-50 py-1 rounded">红队</div>
                                  <div className="flex-1 flex gap-2">
                                    <div className="flex-1 bg-green-50/50 rounded-lg py-1 px-2 flex justify-between border border-green-100/50 text-sm">
                                      <span className="text-green-600 font-bold text-xs">对</span><span className="text-green-700 font-black">{stat.red.correct}</span>
                                    </div>
                                    <div className="flex-1 bg-red-50/50 rounded-lg py-1 px-2 flex justify-between border border-red-100/50 text-sm">
                                      <span className="text-red-600 font-bold text-xs">错</span><span className="text-red-700 font-black">{stat.red.wrong}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                      {matchHistory.length > 0 ? '👈 请在左侧选择一场比赛查看详情' : ''}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-8 w-full max-w-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/50 max-h-[90vh] overflow-y-auto relative"
            >

              <button onClick={() => navigate('/')} className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-400 hover:text-slate-600 transition-colors z-10">
                <ArrowLeft size={24} />
              </button>

              <h2 className="text-3xl font-black mb-6 text-center text-slate-800">
                {productConfig.title} · {t('tugOfWar.settingsTitle')}
              </h2>
              
              <div className="space-y-5">
                {settings.subjectMode === 'math' ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">数学怎么玩</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        <button
                          onClick={() => setSettings({...settings, gameMode: 'classic'})}
                          className={`min-h-[72px] rounded-xl font-black transition-all flex flex-col items-center justify-center gap-1 px-3 text-center ${settings.gameMode === 'classic' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}
                        >
                          <span className="text-base leading-none">经典计算</span>
                          <span className={`text-[11px] leading-snug ${settings.gameMode === 'classic' ? 'text-slate-600' : 'text-slate-400'}`}>直接算答案，答对就拉绳子</span>
                        </button>
                        <button
                          onClick={() => setSettings({...settings, gameMode: 'target'})}
                          className={`min-h-[72px] rounded-xl font-black transition-all flex flex-col items-center justify-center gap-1 px-3 text-center ${settings.gameMode === 'target' ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}
                        >
                          <span className="text-base leading-none">凑数达人</span>
                          <span className={`text-[11px] leading-snug ${settings.gameMode === 'target' ? 'text-slate-600' : 'text-slate-400'}`}>凑出目标数字，答对就拉绳子</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">这局用哪些符号</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['add', 'sub', 'mul', 'div'] as Operator[]).map(op => (
                          <button
                            key={op}
                            onClick={() => {
                              const newOps = settings.operators.includes(op) ? settings.operators.filter(i => i !== op) : [...settings.operators, op];
                              if (newOps.length > 0) setSettings({...settings, operators: newOps});
                            }}
                            className={`py-2.5 rounded-xl font-bold transition-all border-2 ${settings.operators.includes(op) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500'}`}
                          >
                            {getOpSymbol(op)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-3xl border border-blue-100 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-black text-slate-800 flex items-center gap-2">
                          <FileText size={18} className="text-blue-600" />
                          {t('tugOfWar.wordImportTitle')}
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">{t('tugOfWar.wordImportHint')}</p>
                        <p className="text-xs font-bold text-blue-500 mt-1 leading-relaxed">
                          挑战模式请导入双语行：苹果 apple、banana 香蕉。课堂上只显示中文，学生点击字母拼英文。
                        </p>
                      </div>
                    </div>
                    <label className="w-full py-3 bg-white text-blue-700 rounded-2xl font-black shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-100">
                      <Upload size={18} />
                      {isParsingWordFile ? t('tugOfWar.wordParsing') : t('tugOfWar.wordImportButton')}
                      <input
                        type="file"
                        accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleWordFileUpload}
                        disabled={isParsingWordFile}
                        className="hidden"
                      />
                    </label>
                    {wordImportMessage && (
                      <div className="text-xs font-black text-blue-700 bg-white/70 rounded-2xl px-3 py-2">
                        {wordImportMessage}
                      </div>
                    )}
                    
                    {savedBanks.length > 0 && (
                      <div className="pt-2 border-t border-blue-200/50">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">本地词库列表 (点击选择)</div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {savedBanks.map(bank => (
                            <div 
                              key={bank.id} 
                              onClick={() => { setActiveBankId(bank.id); setWordBank(bank.words); setChallengePairs(bank.challengePairs || []); }}
                              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${activeBankId === bank.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-blue-100 text-slate-600 hover:border-blue-300'}`}
                            >
                              <div className="flex flex-col">
                                <span className="font-black text-sm">{bank.name}</span>
                                <span className={`text-[10px] font-bold ${activeBankId === bank.id ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {bank.words.length} 个单词 · 挑战 {bank.challengePairs?.length || 0} 组
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingBank(bank); }}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeBankId === bank.id ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-slate-100 hover:bg-blue-100 text-blue-600'}`}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSavedBanks(prev => prev.filter(b => b.id !== bank.id));
                                    if (activeBankId === bank.id) {
                                      setActiveBankId(null);
                                      setWordBank([]);
                                      setChallengePairs([]);
                                    }
                                  }}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeBankId === bank.id ? 'bg-blue-700 hover:bg-blue-800 text-blue-200' : 'bg-slate-100 hover:bg-red-100 text-red-500'}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {settings.subjectMode === 'word' && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">英文单词怎么玩</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setSettings({...settings, gameRule: 'tug_of_war'})} className={`py-2 rounded-xl text-xs font-bold transition-all ${settings.gameRule === 'tug_of_war' || !settings.gameRule ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>拼词拔河</button>
                        <button onClick={() => setSettings({...settings, gameRule: 'speedrun'})} className={`py-2 rounded-xl text-xs font-bold transition-all ${settings.gameRule === 'speedrun' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>中英挑战</button>
                      </div>
                      <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-relaxed text-slate-600">
                        <div className="mb-2 font-black text-blue-700">英文单词玩法说明</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="rounded-xl border border-blue-100 bg-white/80 p-2">
                            <div className="font-black text-slate-800">拼词拔河：</div>
                            <div>导入英文单词，学生点击字母拼出答案；答对就把绳子往自己队拉，先拉到设定格数就赢。</div>
                          </div>
                          <div className="rounded-xl border border-blue-100 bg-white/80 p-2">
                            <div className="font-black text-slate-800">中英挑战：</div>
                            <div>导入中英词表，课堂只显示中文，学生点击英文字母拼英文；先做完设定题数的一队赢，用时越短越厉害。</div>
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] font-black text-blue-500">以上说明只针对英文单词模式。</div>
                      </div>
                    </div>
                  </div>
                )}

                {settings.subjectMode === 'word' && settings.gameRule === 'speedrun' && (
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 mt-2">
                    <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 block">挑战做几题</label>
                    <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-blue-200 shadow-sm">
                      <input type="range" min="5" max="50" step="5" value={settings.speedrunTarget || 10} onChange={e => setSettings({...settings, speedrunTarget: parseInt(e.target.value)})} className="flex-1 accent-blue-600" />
                      <span className="font-black text-blue-600 w-8 text-center text-lg">{settings.speedrunTarget || 10}</span>
                    </div>
                    <div className="mt-2 text-xs font-black text-blue-700 bg-white/70 rounded-xl px-3 py-2">
                      当前双语挑战配对：{challengePairs.length} 组。做完这个数量就赢，不看拉绳子的分数；耗时越短越强。
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {settings.subjectMode === 'math' ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">题目数字最大到几</label>
                      <select
                        value={settings.maxNumber}
                        onChange={(e) => setSettings({...settings, maxNumber: parseInt(e.target.value)})}
                        className="w-full p-2.5 bg-slate-100 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-500 text-sm"
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">当前词库</label>
                      <div className="h-[42px] bg-slate-100 rounded-xl font-black text-slate-700 flex items-center justify-center text-sm border-2 border-transparent">
                        {settings.gameRule === 'speedrun'
                          ? `挑战配对 ${challengePairs.length} 组`
                          : t('tugOfWar.wordBankCount', { count: wordBank.length })}
                      </div>
                    </div>
                  )}
                  {(settings.subjectMode !== 'word' || settings.gameRule !== 'speedrun') && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">拉到几格获胜</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <input type="range" min="5" max="30" step="5" value={settings.winScore} onChange={(e) => setSettings({...settings, winScore: parseInt(e.target.value)})} className="flex-1 accent-red-500" />
                        <span className="font-black text-red-600 w-10 text-center text-sm">{settings.winScore} 格</span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-500">数字越大，比赛越久。</div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-black text-slate-700 text-sm">{t('tugOfWar.enablePowerUps')}</label>
                    <button 
                      onClick={() => setSettings({...settings, powerUpsEnabled: !settings.powerUpsEnabled})}
                      className={`w-12 h-7 rounded-full transition-all relative ${settings.powerUpsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.powerUpsEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  {settings.powerUpsEnabled && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['freeze', 'double', 'shield'] as PowerUpType[]).map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              const newAllowed = settings.allowedPowerUps.includes(p) ? settings.allowedPowerUps.filter(i => i !== p) : [...settings.allowedPowerUps, p];
                              setSettings({...settings, allowedPowerUps: newAllowed});
                            }}
                            className={`min-h-[96px] p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center ${settings.allowedPowerUps.includes(p) ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white opacity-60'}`}
                          >
                            <div className={`p-1.5 rounded-full ${settings.allowedPowerUps.includes(p) ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                              {getItemIcon(p)}
                            </div>
                            <span className={`text-[10px] font-black uppercase ${settings.allowedPowerUps.includes(p) ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {t(`tugOfWar.prop${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                            </span>
                            <span className={`text-[11px] font-bold leading-snug ${settings.allowedPowerUps.includes(p) ? 'text-slate-600' : 'text-slate-400'}`}>
                              {getPowerUpTeacherDescription(p)}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-500 fill-current" />
                            <span className="text-[10px] font-black text-amber-700">{t('tugOfWar.triggerCondition')}</span>
                          </div>
                          <select 
                            value={settings.powerUpTrigger}
                            onChange={(e) => setSettings({...settings, powerUpTrigger: parseInt(e.target.value)})}
                            className="bg-white border-none rounded-lg px-2 py-1 text-[10px] font-black text-amber-600 shadow-sm outline-none"
                          >
                            <option value="2">每连对 2 题</option>
                            <option value="3">每连对 3 题</option>
                            <option value="5">每连对 5 题</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-3 border border-slate-200 text-xs font-bold text-slate-600 leading-relaxed">
                        <div className="font-black text-slate-800 mb-2 flex items-center gap-2">
                          <ShieldAlert size={15} className="text-blue-600" />
                          怎么获得、怎么使用
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                          道具使用方法：连续答对达到上面的条件会掉落道具；获得后，在队伍下方道具栏点击道具即可使用。
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  onClick={startGame}
                  disabled={settings.subjectMode === 'word' && (wordBank.length === 0 || (settings.gameRule === 'speedrun' && challengePairs.length === 0))}
                  className={`w-full py-4 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-2xl text-lg font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed`}
                >
                  <Play fill="white" size={20} /> {t('tugOfWar.startGame')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 min-h-0">
            {/* 中间区域：拔河核心视觉 或 竞速进度条 */}
            {settings.gameRule === 'speedrun' ? (
              <div className="h-[90px] md:h-[120px] bg-slate-900 border-b border-slate-700 flex items-center justify-center relative shrink-0 shadow-inner px-8">
                <div className="w-full max-w-4xl flex flex-col gap-4">
                  <div className="w-full bg-slate-800 rounded-full h-5 md:h-6 relative overflow-hidden border border-slate-700 shadow-inner">
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (blueProgress / (settings.speedrunTarget || 10)) * 100)}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] md:text-xs font-black text-white mix-blend-difference">
                      蓝队进度: {Math.floor(blueProgress)} / {settings.speedrunTarget || 10}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-5 md:h-6 relative overflow-hidden border border-slate-700 shadow-inner">
                    <div className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-300" style={{ width: `${Math.min(100, (redProgress / (settings.speedrunTarget || 10)) * 100)}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] md:text-xs font-black text-white mix-blend-difference">
                      红队进度: {Math.floor(redProgress)} / {settings.speedrunTarget || 10}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <TugOfWarAnimation score={score} winScore={settings.winScore} />
            )}

            <main className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0 overflow-y-auto md:overflow-hidden">
              {/* 蓝队 */}
              <section className="bg-[#EFF6FF] md:border-r border-b md:border-b-0 border-slate-200 flex flex-col items-center p-3 md:p-4 justify-between relative overflow-hidden min-h-[560px] md:min-h-0">
                <TeamSpectacleLayer
                  team="blue"
                  subjectMode={settings.subjectMode}
                  intensity={blueSpectacleIntensity}
                  streak={blueStreak}
                  lastCorrectAt={lastBlueCorrect}
                  encouragement={blueWordEncouragement}
                  isTugRule={settings.gameRule !== 'speedrun'}
                />
                {/* 状态指示器 */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {blueShieldActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg"><ShieldCheck size={16} /></motion.div>}
                  {blueDoubleActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg"><Sword size={16} /></motion.div>}
                </div>

                <div className="flex flex-col items-center w-full">
                  <div className="px-4 py-1 bg-blue-600 text-white rounded-full font-black text-xs mb-1 shadow-md">{t('tugOfWar.blueTeam')}</div>
                  <div className="h-6">
                    <AnimatePresence>
                      {blueStreak >= 2 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className={`font-black italic ${blueStreak >= 5 ? 'text-red-500 text-lg' : 'text-orange-500 text-sm'}`}
                        >
                          {blueStreak >= 5 && <Zap size={16} className="inline mr-1 fill-current" />}
                          {t('tugOfWar.combo', {n: blueStreak})}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {blueProblem && (
                  <div className="bg-white rounded-2xl p-3 w-full max-w-[320px] shadow-lg border border-blue-100 text-center">
                    {blueProblem.type === 'word' ? (
                      <>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 h-3">
                          {blueProblem.mode === 'challenge' ? '看中文 · 拼英文' : t('tugOfWar.spellPrompt')} · {t('tugOfWar.wordLetters', { count: blueProblem.answer.length })}
                        </div>
                        {blueProblem.mode === 'challenge' && (
                          <div className="min-h-[48px] mb-2 rounded-xl bg-blue-50 border-2 border-blue-100 px-3 py-2 flex items-center justify-center text-[22px] md:text-[28px] font-black text-blue-700 leading-tight break-words">
                            {blueProblem.prompt}
                          </div>
                        )}
                        <div className="min-h-[58px] flex flex-wrap items-center justify-center gap-1 mb-2">
                          {blueProblem.answer.split('').map((_, index) => (
                            <div key={`blue-slot-${index}`} className="w-7 md:w-8 h-9 md:h-10 rounded-lg bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-[18px] md:text-[22px] font-black text-blue-700">
                              {blueInput[index] || ''}
                            </div>
                          ))}
                        </div>
                        <div className="h-[34px] w-full bg-slate-50 rounded-xl text-[16px] md:text-[18px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100 overflow-hidden px-2">
                          {blueInput || t('tugOfWar.wordInputPlaceholder')}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 h-3">
                          {settings.gameMode === 'target' ? t('tugOfWar.targetNumber') : ''}
                        </div>
                        <div className="text-[28px] md:text-[40px] font-black text-slate-800 leading-none mb-2 min-h-[40px] flex items-center justify-center">
                          {settings.gameMode === 'target' ? (
                            <div className="flex flex-col items-center">
                              <div>{blueProblem.answer}</div>
                              <div className="text-[10px] font-bold text-blue-500">{t('tugOfWar.mustUse')}{getOpSymbol(blueProblem.operator)}</div>
                            </div>
                          ) : (
                            <>{blueProblem.num1} <span className="text-blue-500">{getOpSymbol(blueProblem.operator)}</span> {blueProblem.num2}</>
                          )}
                        </div>
                        <div className="h-[44px] md:h-[52px] w-full bg-slate-50 rounded-xl text-[24px] md:text-[30px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100 overflow-hidden px-2">
                          {blueInput || '?'}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 道具栏 */}
                <div className="flex flex-col items-center w-full">
                  {settings.powerUpsEnabled && (
                    <div className="text-[10px] font-black text-blue-400 mb-1">连续答对获得 · 点击道具使用</div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 min-h-[52px]">
                    <AnimatePresence>
                      {blueItems.map((item, i) => (
                        <motion.button 
                          initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                          key={`${item}-${i}`} 
                          onClick={() => handleUseItem('blue', item, i)}
                          className="h-[48px] px-3 bg-white rounded-xl shadow-md border-2 border-blue-400 flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                          <div className="scale-110">
                            {getItemIcon(item)}
                          </div>
                          <span className="text-sm font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md shadow-sm">
                            {t(`tugOfWar.prop${item.charAt(0).toUpperCase() + item.slice(1)}`)}
                          </span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    {blueItems.length === 0 && <div className="h-[48px] w-[48px] rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center text-blue-200 opacity-50"><Zap size={24} /></div>}
                  </div>
                </div>
                
                {blueProblem?.type === 'word' ? (
                  <LetterKeypad
                    problem={blueProblem}
                    pickedIndices={bluePickedLetterIndices}
                    onPick={(index) => handleLetterPick('blue', index)}
                    onClear={() => clearTeamInput('blue')}
                    onSubmit={handleBlueSubmit}
                    team="blue"
                    t={t}
                    isFrozen={blueFrozenUntil > Date.now()}
                  />
                ) : (
                  <Keypad onInput={(val) => setBlueInput(prev => (prev.length < 15 ? prev + val : prev))} onClear={() => clearTeamInput('blue')} onSubmit={handleBlueSubmit} team="blue" t={t} mode={settings.gameMode} isFrozen={blueFrozenUntil > Date.now()} requiredOp={blueProblem?.type === 'math' ? getOpSymbol(blueProblem.operator) : undefined} />
                )}
              </section>

              {/* 红队 */}
              <section className="bg-[#FEF2F2] flex flex-col items-center p-3 md:p-4 justify-between relative overflow-hidden min-h-[560px] md:min-h-0">
                <TeamSpectacleLayer
                  team="red"
                  subjectMode={settings.subjectMode}
                  intensity={redSpectacleIntensity}
                  streak={redStreak}
                  lastCorrectAt={lastRedCorrect}
                  encouragement={redWordEncouragement}
                  isTugRule={settings.gameRule !== 'speedrun'}
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {redShieldActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg"><ShieldCheck size={16} /></motion.div>}
                  {redDoubleActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg"><Sword size={16} /></motion.div>}
                </div>

                <div className="flex flex-col items-center w-full">
                  <div className="px-4 py-1 bg-red-600 text-white rounded-full font-black text-xs mb-1 shadow-md">{t('tugOfWar.redTeam')}</div>
                  <div className="h-6">
                    <AnimatePresence>
                      {redStreak >= 2 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className={`font-black italic ${redStreak >= 5 ? 'text-red-500 text-lg' : 'text-orange-500 text-sm'}`}
                        >
                          {redStreak >= 5 && <Zap size={16} className="inline mr-1 fill-current" />}
                          {t('tugOfWar.combo', {n: redStreak})}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {redProblem && (
                  <div className="bg-white rounded-2xl p-3 w-full max-w-[320px] shadow-lg border border-red-100 text-center">
                    {redProblem.type === 'word' ? (
                      <>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 h-3">
                          {redProblem.mode === 'challenge' ? '看中文 · 拼英文' : t('tugOfWar.spellPrompt')} · {t('tugOfWar.wordLetters', { count: redProblem.answer.length })}
                        </div>
                        {redProblem.mode === 'challenge' && (
                          <div className="min-h-[48px] mb-2 rounded-xl bg-red-50 border-2 border-red-100 px-3 py-2 flex items-center justify-center text-[22px] md:text-[28px] font-black text-red-700 leading-tight break-words">
                            {redProblem.prompt}
                          </div>
                        )}
                        <div className="min-h-[58px] flex flex-wrap items-center justify-center gap-1 mb-2">
                          {redProblem.answer.split('').map((_, index) => (
                            <div key={`red-slot-${index}`} className="w-7 md:w-8 h-9 md:h-10 rounded-lg bg-red-50 border-2 border-red-100 flex items-center justify-center text-[18px] md:text-[22px] font-black text-red-700">
                              {redInput[index] || ''}
                            </div>
                          ))}
                        </div>
                        <div className="h-[34px] w-full bg-slate-50 rounded-xl text-[16px] md:text-[18px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100 overflow-hidden px-2">
                          {redInput || t('tugOfWar.wordInputPlaceholder')}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 h-3">
                          {settings.gameMode === 'target' ? t('tugOfWar.targetNumber') : ''}
                        </div>
                        <div className="text-[28px] md:text-[40px] font-black text-slate-800 leading-none mb-2 min-h-[40px] flex items-center justify-center">
                          {settings.gameMode === 'target' ? (
                            <div className="flex flex-col items-center">
                              <div>{redProblem.answer}</div>
                              <div className="text-[10px] font-bold text-red-500">{t('tugOfWar.mustUse')}{getOpSymbol(redProblem.operator)}</div>
                            </div>
                          ) : (
                            <>{redProblem.num1} <span className="text-red-500">{getOpSymbol(redProblem.operator)}</span> {redProblem.num2}</>
                          )}
                        </div>
                        <div className="h-[44px] md:h-[52px] w-full bg-slate-50 rounded-xl text-[24px] md:text-[30px] font-black text-slate-700 flex items-center justify-center border-2 border-slate-100 overflow-hidden px-2">
                          {redInput || '?'}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col items-center w-full">
                  {settings.powerUpsEnabled && (
                    <div className="text-[10px] font-black text-red-400 mb-1">连续答对获得 · 点击道具使用</div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 min-h-[52px]">
                    <AnimatePresence>
                      {redItems.map((item, i) => (
                        <motion.button 
                          initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                          key={`${item}-${i}`} 
                          onClick={() => handleUseItem('red', item, i)}
                          className="h-[48px] px-3 bg-white rounded-xl shadow-md border-2 border-red-400 flex items-center justify-center gap-2 hover:bg-red-50 active:scale-95 transition-all"
                        >
                          <div className="scale-110">
                            {getItemIcon(item)}
                          </div>
                          <span className="text-sm font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-md shadow-sm">
                            {t(`tugOfWar.prop${item.charAt(0).toUpperCase() + item.slice(1)}`)}
                          </span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    {redItems.length === 0 && <div className="h-[48px] w-[48px] rounded-xl border-2 border-dashed border-red-200 flex items-center justify-center text-red-200 opacity-50"><Zap size={24} /></div>}
                  </div>
                </div>
                
                {redProblem?.type === 'word' ? (
                  <LetterKeypad
                    problem={redProblem}
                    pickedIndices={redPickedLetterIndices}
                    onPick={(index) => handleLetterPick('red', index)}
                    onClear={() => clearTeamInput('red')}
                    onSubmit={handleRedSubmit}
                    team="red"
                    t={t}
                    isFrozen={redFrozenUntil > Date.now()}
                  />
                ) : (
                  <Keypad onInput={(val) => setRedInput(prev => (prev.length < 15 ? prev + val : prev))} onClear={() => clearTeamInput('red')} onSubmit={handleRedSubmit} team="red" t={t} mode={settings.gameMode} isFrozen={redFrozenUntil > Date.now()} requiredOp={redProblem?.type === 'math' ? getOpSymbol(redProblem.operator) : undefined} />
                )}
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center z-[60] text-white p-6 overflow-hidden"
          >
            <div className={`absolute inset-0 opacity-30 ${gameState === 'blue_wins' ? 'bg-blue-500' : 'bg-red-500'}`} />
            {['🎉', '⭐', '✨', '🎊', '🏆', '✨', '⭐', '🎉'].map((mark, index) => (
              <motion.div
                key={`${mark}-${index}`}
                className="absolute text-3xl md:text-5xl font-black select-none"
                initial={{
                  opacity: 0,
                  x: `${(index * 13) % 92}vw`,
                  y: '105vh',
                  rotate: -20,
                  scale: 0.7,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: ['105vh', `${18 + ((index * 9) % 62)}vh`, '-12vh'],
                  rotate: [-20, 18, 36],
                  scale: [0.7, 1.25, 0.9],
                }}
                transition={{
                  duration: 2.6 + (index % 3) * 0.4,
                  delay: index * 0.12,
                  repeat: Infinity,
                  repeatDelay: 0.35,
                  ease: 'easeOut',
                }}
              >
                {mark}
              </motion.div>
            ))}
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className={`relative overflow-hidden bg-white rounded-[3rem] p-8 md:p-12 flex flex-col items-center text-center shadow-[0_40px_120px_rgba(0,0,0,0.45)] max-w-lg w-full border-4 ${gameState === 'blue_wins' ? 'border-blue-200' : 'border-red-200'}`}
            >
              <div className={`absolute inset-x-0 top-0 h-2 ${gameState === 'blue_wins' ? 'bg-blue-500' : 'bg-red-500'}`} />
              <motion.div
                className={`absolute -top-20 w-48 h-48 rounded-full blur-3xl opacity-40 ${gameState === 'blue_wins' ? 'bg-blue-300' : 'bg-red-300'}`}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.55, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.3 }}
              />
              <motion.div
                className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-6 md:mb-8 ${gameState === 'blue_wins' ? 'bg-blue-100' : 'bg-red-100'}`}
                animate={{ scale: [1, 1.14, 1], rotate: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
              >
                <motion.div
                  className={`absolute inset-0 rounded-full border-4 ${gameState === 'blue_wins' ? 'border-blue-300' : 'border-red-300'}`}
                  animate={{ scale: [1, 1.45], opacity: [0.65, 0] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                />
                <Trophy size={64} className={gameState === 'blue_wins' ? 'text-blue-600' : 'text-red-600'} />
              </motion.div>
              <h2 className={`text-4xl md:text-5xl font-black mb-4 ${gameState === 'blue_wins' ? 'text-blue-600' : 'text-red-600'}`}>
                {gameState === 'blue_wins' ? t('tugOfWar.blueWins') : t('tugOfWar.redWins')}
              </h2>
              {settings.gameRule === 'speedrun' && (
                <div className="mt-4 mb-2 bg-slate-100 rounded-2xl py-3 px-6 text-xl font-bold text-slate-700 shadow-inner">
                  ⏱️ 耗时：{formatElapsedTime(timeElapsed)}
                </div>
              )}
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

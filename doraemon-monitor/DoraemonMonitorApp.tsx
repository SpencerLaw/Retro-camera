import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { isVerified } from './utils/licenseManager';
import LicenseInput from './components/LicenseInput';
import './doraemon-monitor.css';

const DoraemonMonitorApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [isLicensed, setIsLicensed] = useState(false); // 授权状态
  const [isStarted, setIsStarted] = useState(false);
  const [currentDb, setCurrentDb] = useState(40);
  const [limit, setLimit] = useState(60);
  const [warnCount, setWarnCount] = useState(0);
  const [quietTime, setQuietTime] = useState(0);
  const [state, setState] = useState<'calm' | 'warning' | 'alarm'>('calm');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const quietTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thresholdStartRef = useRef(0);
  const recoverStartRef = useRef(0);
  const wakeLockRef = useRef<any>(null);

  // 检查授权状态
  useEffect(() => {
    setIsLicensed(isVerified());
  }, []);

  // 授权成功回调
  const handleLicenseVerified = () => {
    setIsLicensed(true);
  };

  // 启动应用
  const initApp = async () => {
    setIsLoading(true);
    setError('');

    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) throw new Error(t('doraemon.errors.browserNotSupported'));

      if (!audioContextRef.current) audioContextRef.current = new AC();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false }
      });

      if (stream.getAudioTracks().length > 0) {
        stream.getAudioTracks()[0].onended = () => {
          alert(t('doraemon.errors.micDisconnected'));
          window.location.reload();
        };
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      micRef.current = audioContextRef.current.createMediaStreamSource(stream);
      micRef.current.connect(analyserRef.current);

      setIsStarted(true);
      startQuietTimer();
      loop();

      // 屏幕常亮
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (e) {}
      }
    } catch (err: any) {
      let msg = t('doraemon.errors.startFailed');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg += t('doraemon.errors.permissionDenied');
      } else if (err.name === 'NotFoundError') {
        msg += t('doraemon.errors.noMicFound');
      } else {
        msg += t('doraemon.errors.unknownError') + err.message;
      }

      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 主循环
  const loop = () => {
    if (!analyserRef.current) return;

    animationRef.current = requestAnimationFrame(loop);

    // 自动保活
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // 获取音量
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const x = (data[i] - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    let rawDb = rms > 0 ? (Math.log10(rms) * 20 + 100) : 30;
    rawDb = Math.max(35, Math.min(120, rawDb));
    if (rawDb < 40) rawDb += (Math.random() - 0.5);

    setCurrentDb(prev => prev + (rawDb - prev) * 0.2);
  };

  // 逻辑判断
  useEffect(() => {
    if (!isStarted) return;

    const now = Date.now();

    if (currentDb > limit) {
      recoverStartRef.current = 0;
      if (thresholdStartRef.current === 0) thresholdStartRef.current = now;

      if (now - thresholdStartRef.current > 2000) {
        if (state !== 'alarm') triggerAlarm(true);
      } else if (now - thresholdStartRef.current > 800 && state === 'calm') {
        setState('warning');
      }
    } else {
      thresholdStartRef.current = 0;
      if (state === 'alarm') {
        if (recoverStartRef.current === 0) recoverStartRef.current = now;
        if (now - recoverStartRef.current > 3000) triggerAlarm(false);
      } else if (state !== 'calm') {
        setState('calm');
      }
    }
  }, [currentDb, limit, state, isStarted]);

  // 触发/解除报警
  const triggerAlarm = (isStart: boolean) => {
    if (isStart) {
      setState('alarm');
      setWarnCount(prev => prev + 1);
      resetQuietTimer();
      beep(600, 'square');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      setState('calm');
      beep(500, 'sine');
      startQuietTimer();
    }
  };

  // 蜂鸣器
  const beep = (freq: number, type: OscillatorType) => {
    if (!audioContextRef.current) return;
    const o = audioContextRef.current.createOscillator();
    const g = audioContextRef.current.createGain();
    o.connect(g);
    g.connect(audioContextRef.current.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.3;
    g.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
    o.start();
    o.stop(audioContextRef.current.currentTime + 0.5);
  };

  // 安静时长计时器
  const startQuietTimer = () => {
    if (quietTimerRef.current) clearInterval(quietTimerRef.current);
    quietTimerRef.current = setInterval(() => {
      setQuietTime(prev => prev + 1);
    }, 1000);
  };

  const resetQuietTimer = () => {
    if (quietTimerRef.current) clearInterval(quietTimerRef.current);
    setQuietTime(0);
  };

  // 清理
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (quietTimerRef.current) clearInterval(quietTimerRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const barPercent = Math.min(100, Math.max(0, (currentDb - 30) * 1.5));
  const limitBarPercent = ((limit - 30) * 1.5);

  let dbColor = '#1293EE';
  if (state === 'alarm') dbColor = '#FFF';
  else if (currentDb > limit) dbColor = '#DD0000';
  else if (currentDb > limit - 5) dbColor = '#FACE05';

  // 如果未授权，显示授权页面
  if (!isLicensed) {
    return <LicenseInput onVerified={handleLicenseVerified} />;
  }

  // 如果未启动，显示启动页
  if (!isStarted) {
    return (
      <div className="doraemon-start-layer">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/')}
          className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/80 hover:bg-white border-2 border-[#1293EE] backdrop-blur-sm transition-all text-[#1293EE] hover:text-[#0d6ab8] shadow-lg"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="text-8xl mb-5" style={{ filter: 'drop-shadow(0 0 20px rgba(18,147,238,0.4))' }}>🤖</div>
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-[#1293EE] to-[#8E54E9] bg-clip-text text-transparent">Anypok Doraemon</h1>

        <button
          className="doraemon-btn-big"
          onClick={initApp}
          disabled={isLoading}
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? (
            <span className="text-2xl">{t('doraemon.starting')}<br/>{t('doraemon.pleaseAllowPermission')}</span>
          ) : (
            <>
              <span>{t('doraemon.startQuiet')}</span>
              <span>{t('doraemon.studyBegin')}</span>
            </>
          )}
        </button>

        {error && (
          <div className="doraemon-error-box">
            {error}
          </div>
        )}

        <div className="mt-10 text-lg opacity-70">
          ({t('doraemon.pleaseAllowMic')})
        </div>
      </div>
    );
  }

  // 主应用
  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/80 hover:bg-white border-2 border-[#1293EE] backdrop-blur-sm transition-all text-[#1293EE] hover:text-[#0d6ab8] shadow-lg"
      >
        <ArrowLeft size={24} />
      </button>

      {/* 巨型警告文字 */}
      {state === 'alarm' && (
        <div className="doraemon-giant-text">{t('doraemon.quiet')}</div>
      )}

      {/* 顶部栏 */}
      <header className="doraemon-header">
        <div className="doraemon-info-box">
          <span className="info-label">{t('doraemon.quietDuration')}</span>
          <span className="info-value">{formatTime(quietTime)}</span>
        </div>
        <button className="doraemon-btn-icon" onClick={() => setIsDarkMode(!isDarkMode)}>
          🌓
        </button>
        <div className="doraemon-info-box" style={{ color: 'var(--dora-red)', borderColor: 'rgba(221,0,0,0.3)' }}>
          <span className="info-label">{t('doraemon.warningCount')}</span>
          <span className="info-value">{warnCount}</span>
        </div>
      </header>

      {/* 主内容 */}
      <main className="doraemon-main-content">
        {/* Gemini Nano Doraemon - Futuristic 3D Style */}
        <div className="doraemon-wrapper">
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              {/* 经典蓝到科技紫的渐变 */}
              <linearGradient id="doraBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#1293EE', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#8E54E9', stopOpacity: 1 }} />
              </linearGradient>
              
              {/* 肚子与脸部的珍珠白渐变 */}
              <radialGradient id="pearlWhite" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#E3F2FD', stopOpacity: 1 }} />
              </radialGradient>

              {/* 核心光环发光滤镜 */}
              <filter id="nanoGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <g>
              {/* 1. 蓝色身体主体 (Gemini 纳米涂层) */}
              <circle cx="100" cy="100" r="95" fill="url(#doraBlue)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              
              {/* 2. 肚子与面部白色区域 */}
              <circle cx="100" cy="115" r="75" fill="url(#pearlWhite)" />
              <ellipse cx="70" cy="75" rx="25" ry="30" fill="url(#pearlWhite)" />
              <ellipse cx="130" cy="75" rx="25" ry="30" fill="url(#pearlWhite)" />

              {/* 3. AI 矩阵眼睛 - 动态展示状态 */}
              {state === 'alarm' ? (
                /* 报警：红色危险矩阵 */
                <g fill="#FF5252">
                  <rect x="60" y="65" width="20" height="20" rx="4" filter="url(#nanoGlow)" />
                  <rect x="120" y="65" width="20" height="20" rx="4" filter="url(#nanoGlow)" />
                </g>
              ) : state === 'warning' ? (
                /* 警告：眯眯眼扫描模式 */
                <g stroke="#FACE05" strokeWidth="4" strokeLinecap="round">
                  <line x1="60" y1="75" x2="80" y2="75" filter="url(#nanoGlow)" />
                  <line x1="120" y1="75" x2="140" y2="75" filter="url(#nanoGlow)" />
                </g>
              ) : (
                /* 平时：青色呼吸感纳米眼 */
                <g>
                  <circle cx="70" cy="75" r="8" fill="#4DD0E1" filter="url(#nanoGlow)" />
                  <circle cx="130" cy="75" r="8" fill="#4DD0E1" filter="url(#nanoGlow)" />
                  <circle cx="70" cy="75" r="3" fill="white" />
                  <circle cx="130" cy="75" r="3" fill="white" />
                </g>
              )}

              {/* 4. 标志性红鼻子 (带有微弱光泽) */}
              <circle cx="100" cy="95" r="12" fill="#DD0000" filter="url(#nanoGlow)" />
              <circle cx="96" cy="90" r="4" fill="white" opacity="0.4" />
              <line x1="100" y1="107" x2="100" y2="140" stroke="#333" strokeWidth="2" opacity="0.5" />

              {/* 5. 简约胡须 (科技线条感) */}
              <g stroke="#333" strokeWidth="1.5" opacity="0.4">
                <line x1="55" y1="105" x2="25" y2="100" />
                <line x1="55" y1="115" x2="20" y2="115" />
                <line x1="55" y1="125" x2="25" y2="130" />
                <line x1="145" y1="105" x2="175" y2="100" />
                <line x1="145" y1="115" x2="180" y2="115" />
                <line x1="145" y1="125" x2="175" y2="130" />
              </g>

              {/* 6. 核心能量铃铛 (代替普通铃铛) */}
              <circle cx="100" cy="180" r="18" fill="#FACE05" filter="url(#nanoGlow)" />
              <circle cx="100" cy="180" r="14" fill="none" stroke="#FF8F00" strokeWidth="1" strokeDasharray="4 2">
                <animateTransform attributeName="transform" type="rotate" from="0 100 180" to="360 100 180" dur="5s" repeatCount="indefinite" />
              </circle>
              <circle cx="100" cy="185" r="4" fill="#333" />

              {/* 7. 动态声波嘴巴 */}
              <path 
                d={state === 'alarm' ? "M60,150 Q100,190 140,150" : "M70,150 Q100,165 130,150"} 
                fill="none" 
                stroke="#333" 
                strokeWidth="3" 
                strokeLinecap="round"
                opacity={state === 'calm' ? 0.3 : 0.8}
              />
            </g>
          </svg>
        </div>

        {/* 分贝显示 */}
        <div className="doraemon-meter-box">
          <div className="doraemon-db-val" style={{ color: dbColor }}>
            {Math.round(currentDb)}
          </div>
          <div className="doraemon-db-label">{t('doraemon.currentDecibel')}</div>
          <div className="doraemon-bar-container">
            <div className="doraemon-bar-limit" style={{ left: `${limitBarPercent}%` }} />
            <div className="doraemon-bar-fill" style={{ width: `${barPercent}%`, background: dbColor }} />
          </div>
        </div>
      </main>

      {/* 底部控制 */}
      <footer className="doraemon-footer">
        <div className="doraemon-panel">
          <div className="doraemon-slider-box">
            <div className="doraemon-slider-top">
              <span className="doraemon-lbl-title">{t('doraemon.alarmThreshold')}</span>
              <span className="doraemon-lbl-val">{limit} dB</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="doraemon-slider"
            />
          </div>
          <button
            className="doraemon-btn-reset"
            onClick={() => setWarnCount(0)}
          >
            {t('doraemon.resetCount')}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DoraemonMonitorApp;

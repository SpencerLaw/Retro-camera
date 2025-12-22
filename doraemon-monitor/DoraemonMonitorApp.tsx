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
        
        <div className="text-8xl mb-5">🍌</div>
        <h1 className="text-4xl mb-8 opacity-90">Anypok Monitor</h1>

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
        {/* Banana Monitor Character - High Quality SVG */}
        <div className="doraemon-wrapper">
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              {/* 香蕉身体渐变 */}
              <linearGradient id="bananaBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FFEB3B', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#FDD835', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#FBC02D', stopOpacity: 1 }} />
              </linearGradient>
              
              {/* 阴影效果 */}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.3" />
              </filter>
              
              {/* 高光效果 */}
              <radialGradient id="highlight" cx="30%" cy="30%" r="50%">
                <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 0.6 }} />
                <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0 }} />
              </radialGradient>
            </defs>

            <g filter="url(#softShadow)">
              {/* 香蕉主体 - 稍微弯曲的可爱造型 */}
              <path 
                d="M40,60 Q20,100 40,140 Q60,180 100,185 Q140,180 160,140 Q180,100 160,60 Q140,20 100,25 Q60,20 40,60" 
                fill="url(#bananaBody)" 
                stroke="#EAB308" 
                strokeWidth="1"
              />
              
              {/* 顶部香蕉柄 */}
              <path 
                d="M90,25 L110,25 L105,5 L95,5 Z" 
                fill="#8B4513" 
              />

              {/* 脸部白色区域 (猫脸部分) */}
              <ellipse cx="100" cy="95" rx="55" ry="45" fill="white" opacity="0.9" />

              {/* 眼睛 - 根据状态剧烈变化 */}
              {state === 'alarm' ? (
                /* 报警：大大的泪目或震惊眼 */
                <g>
                  <circle cx="75" cy="85" r="14" fill="#000" />
                  <circle cx="125" cy="85" r="14" fill="#000" />
                  <circle cx="70" cy="80" r="5" fill="white" />
                  <circle cx="120" cy="80" r="5" fill="white" />
                </g>
              ) : state === 'warning' ? (
                /* 警告：眯眯眼 */
                <g stroke="#000" strokeWidth="4" strokeLinecap="round" fill="none">
                  <path d="M65,85 Q75,75 85,85" />
                  <path d="M115,85 Q125,75 135,85" />
                </g>
              ) : (
                /* 安静：超萌无辜大眼 */
                <g>
                  <circle cx="75" cy="85" r="12" fill="#1A1A1A" />
                  <circle cx="125" cy="85" r="12" fill="#1A1A1A" />
                  {/* 眼中高光 */}
                  <circle cx="78" cy="80" r="4" fill="white" />
                  <circle cx="128" cy="80" r="4" fill="white" />
                  <circle cx="72" cy="88" r="2" fill="white" opacity="0.6" />
                  <circle cx="122" cy="88" r="2" fill="white" opacity="0.6" />
                </g>
              )}

              {/* 鼻子 */}
              <circle cx="100" cy="105" r="4" fill="#FF80AB" />

              {/* 嘴巴 - 动态 */}
              {state === 'alarm' ? (
                /* 报警：张大嘴巴 (哭泣或尖叫) */
                <ellipse cx="100" cy="125" rx="15" ry="18" fill="#D32F2F" />
              ) : state === 'warning' ? (
                /* 警告：o型嘴 */
                <circle cx="100" cy="125" r="6" fill="none" stroke="#333" strokeWidth="2" />
              ) : (
                /* 安静：小巧的猫咪胡须嘴 */
                <path d="M85,120 Q100,130 115,120" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* 身体高光 */}
              <path 
                d="M60,50 Q100,40 140,50" 
                fill="none" 
                stroke="white" 
                strokeWidth="4" 
                strokeLinecap="round" 
                opacity="0.3" 
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

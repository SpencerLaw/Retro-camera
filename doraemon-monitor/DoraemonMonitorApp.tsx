import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { isVerified, getSavedLicenseCode, verifyLicenseCode, clearLicense } from './utils/licenseManager';
import LicenseInput from './components/LicenseInput';
import './doraemon-monitor.css';

const DoraemonMonitorApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  
  // 核心授权状态
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // 业务逻辑状态
  const [isStarted, setIsStarted] = useState(false);
  const [currentDb, setCurrentDb] = useState(40);
  const [limit, setLimit] = useState(60);
  const [warnCount, setWarnCount] = useState(0);
  const [quietTime, setQuietTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [state, setState] = useState<'calm' | 'warning' | 'alarm'>('calm');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);
  const thresholdStartRef = useRef(0);
  const recoverStartRef = useRef(0);

  // 1. 核心安全校验：开屏即查，失效即踢
  useEffect(() => {
    const code = getSavedLicenseCode();
    if (isVerified() && code) {
      verifyLicenseCode(code).then(res => {
        if (res.success) {
          setIsLicensed(true);
        } else {
          setAuthError(res.message);
          clearLicense();
          // 4秒倒计时强行踢回首页
          setTimeout(() => { window.location.replace('/'); }, 4000);
        }
      });
    } else {
      setIsLicensed(false);
    }
  }, []);

  // 2. Web Worker 处理计时（防止后台休眠）
  useEffect(() => {
    const workerBlob = new Blob([`
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (interval) clearInterval(interval);
          interval = setInterval(() => { self.postMessage('tick'); }, 100);
        } else if (e.data === 'stop') {
          if (interval) clearInterval(interval);
        }
      }
    `], { type: 'application/javascript' });
    
    workerRef.current = new Worker(URL.createObjectURL(workerBlob));
    workerRef.current.onmessage = () => { analyzeAudio(); };

    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, []);

  const analyzeAudio = () => {
    if (!analyserRef.current) return;
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
    setCurrentDb(prev => prev + (rawDb - prev) * 0.5);
  };

  const initApp = async () => {
    setIsLoading(true);
    setError('');
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) audioContextRef.current = new AC();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false }
      });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      micRef.current = audioContextRef.current.createMediaStreamSource(stream);
      micRef.current.connect(analyserRef.current);
      
      const muteGain = audioContextRef.current.createGain();
      muteGain.gain.value = 0;
      analyserRef.current.connect(muteGain);
      muteGain.connect(audioContextRef.current.destination);

      setIsStarted(true);
      if (workerRef.current) workerRef.current.postMessage('start');
      if ('wakeLock' in navigator) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (e) {}
      }
    } catch (err: any) {
      setError(t('doraemon.errors.startFailed') + ': ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 状态监测：calm -> warning -> alarm
  useEffect(() => {
    if (!isStarted) return;
    const now = Date.now();
    if (currentDb > limit) {
      recoverStartRef.current = 0;
      if (thresholdStartRef.current === 0) thresholdStartRef.current = now;
      if (now - thresholdStartRef.current > 2000) {
        if (state !== 'alarm') { setState('alarm'); setWarnCount(prev => prev + 1); setQuietTime(0); }
      } else if (now - thresholdStartRef.current > 800 && state === 'calm') {
        setState('warning');
      }
    } else {
      thresholdStartRef.current = 0;
      if (state === 'alarm') {
        if (recoverStartRef.current === 0) recoverStartRef.current = now;
        if (now - recoverStartRef.current > 3000) setState('calm');
      } else if (state !== 'calm') {
        setState('calm');
      }
    }
  }, [currentDb, limit, state, isStarted]);

  // 时间统计
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStarted) {
      interval = setInterval(() => {
        setTotalTime(prev => prev + 1);
        if (state !== 'alarm') setQuietTime(prev => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStarted, state]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- UI 组件恢复 ---

  const renderVisualizer = () => {
    const BAR_COUNT = 80;
    const time = Date.now() / 1000;
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    return (
      <div className="visualizer-container">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const dist = Math.abs(i - BAR_COUNT / 2);
          const norm = 1 - (dist / (BAR_COUNT / 2));
          const dbPower = Math.pow(Math.max(0, (currentDb - 35) / 45), 1.5);
          const wave = Math.sin(i * 0.35 + time * 8) * 0.15;
          const height = 12 + (320 * norm * (dbPower + wave + 0.05));
          return <div key={i} className="wave-bar" style={{ height: `${height}px`, background: `hsl(${hue}, 85%, 55%)`, opacity: 0.2 + norm * 0.8 }} />;
        })}
      </div>
    );
  };

  const NoiseLevelReference = () => {
    const levels = [
      { min: 0, max: 20, icon: "🤫", label: "极度安静" },
      { min: 20, max: 40, icon: "🍃", label: "非常安静" },
      { min: 40, max: 60, icon: "💬", label: "正常背景" },
      { min: 60, max: 80, icon: "🚗", label: "中等响度" },
      { min: 80, max: 100, icon: "⚠️", label: "响亮有害" },
      { min: 100, max: 120, icon: "📢", label: "非常响亮" },
    ];
    const pointerPos = Math.min(100, (currentDb / 120) * 100);
    return (
      <div className="db-reference-panel">
        <div className="reference-title">分贝参考</div>
        <div className="vertical-meter-container">
          <div className="meter-bar-bg">
            <div className="current-level-pointer" style={{ bottom: `${pointerPos}%` }} />
          </div>
          <div className="level-nodes">
            {levels.map((l, idx) => (
              <div key={idx} className="level-node" style={{ color: currentDb >= l.min && currentDb < l.max ? '#00d4ff' : '#94a3b8' }}>
                {l.icon} {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const DoraemonSVG = () => (
    <svg viewBox="0 0 200 200" className="doraemon-svg">
      <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      <ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      <ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      {state === 'alarm' ? (
        <g stroke="#333" strokeWidth="4"><line x1="74" y1="62" x2="90" y2="78"/><line x1="90" y1="62" x2="74" y2="78"/><line x1="110" y1="62" x2="126" y2="78"/><line x1="126" y1="62" x2="110" y2="78"/></g>
      ) : state === 'warning' ? (
        <g><circle cx="82" cy="70" r="3" fill="#000"/><circle cx="118" cy="70" r="3" fill="#000"/><path d="M80 50 Q100 40 120 50" fill="none" stroke="#333" strokeWidth="2"/></g>
      ) : (
        <g><circle cx="88" cy="70" r="4" fill="#000"/><circle cx="112" cy="70" r="4" fill="#000"/></g>
      )}
      <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      <line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2"/>
      {state === 'alarm' ? <ellipse cx="100" cy="155" rx="30" ry="25" fill="#D9002E" stroke="#333" strokeWidth="2"/> : <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none"/>}
      <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2"/>
    </svg>
  );

  // --- 隔离页渲染 ---

  if (authError) {
    return (
      <div className="doraemon-app dark-mode alarm-mode" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '3.5rem', color: '#ff416c', marginBottom: '20px' }}>⚠️ 授权失效</h1>
        <p style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '10px' }}>{authError}</p>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>4秒后自动返回首页...</p>
      </div>
    );
  }

  if (isLicensed === null) {
    return (
      <div className="doraemon-app dark-mode" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: '60px', height: '60px', border: '5px solid #222', borderTopColor: '#00f260', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ marginLeft: '20px', fontSize: '1.5rem', color: '#00f260' }}>正在启动魔法验证...</div>
      </div>
    );
  }

  if (isLicensed === false) {
    return <LicenseInput onVerified={() => setIsLicensed(true)} />;
  }

  if (!isStarted) {
    return (
      <div className="doraemon-start-layer">
        <button onClick={() => navigate('/')} className="back-btn"><ArrowLeft size={32} /></button>
        <div className="doraemon-start-icon"><DoraemonSVG /></div>
        <h1 className="start-title">Anypok Doraemon</h1>
        <button className="doraemon-btn-big" onClick={initApp} disabled={isLoading}>
          {isLoading ? <span>{t('doraemon.starting')}...</span> : <><span className="btn-main-text">{t('doraemon.startQuiet')}</span><span className="btn-sub-text">{t('doraemon.studyBegin')}</span></>}
        </button>
        {error && <div className="doraemon-error-box">{error}</div>}
      </div>
    );
  }

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      {state === 'alarm' && <div className="doraemon-giant-text">{t('doraemon.quiet')}</div>}
      <header className="doraemon-header">
        <button onClick={() => navigate('/')} className="icon-btn"><ArrowLeft size={28} /></button>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={toggleFullscreen} className="icon-btn">{isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">{isDarkMode ? '🌞' : '🌙'}</button>
        </div>
      </header>
      <main className="doraemon-main">
        {renderVisualizer()}
        <NoiseLevelReference />
        <div className="center-display">
          <div className="doraemon-wrapper" style={{ transform: `scale(${1 + (currentDb - 40) / 200})` }}><DoraemonSVG /></div>
          <div className="db-display"><span className="db-number">{Math.round(currentDb)}</span><span className="db-unit">dB</span></div>
        </div>
        <div className="right-panel">
          <div className="stat-box">🤫 <span>{t('doraemon.quietDuration')}</span> <strong>{formatTime(quietTime)}</strong></div>
          <div className="stat-box">⏱️ <span>{t('doraemon.totalDuration')}</span> <strong>{formatTime(totalTime)}</strong></div>
          <div className={`stat-box ${warnCount > 0 ? 'warning' : ''}`}>⚠️ <span>{t('doraemon.warningCount')}</span> <strong>{warnCount}</strong></div>
          <div className="controls-box">
            <div className="slider-header"><span>分贝阈值</span> <span>{limit} dB</span></div>
            <input type="range" min="40" max="90" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="threshold-slider" />
            <button className="reset-btn" onClick={() => setWarnCount(0)}>重置警告次数</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoraemonMonitorApp;

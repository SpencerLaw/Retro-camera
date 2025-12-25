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
  
  // 授权状态
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // 业务状态
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
  const wakeLockRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);
  const thresholdStartRef = useRef(0);
  const recoverStartRef = useRef(0);

  // 1. 安全心跳校验
  useEffect(() => {
    const code = getSavedLicenseCode();
    if (isVerified() && code) {
      verifyLicenseCode(code).then(res => {
        if (res.success) {
          setIsLicensed(true);
        } else {
          setAuthError(res.message);
          clearLicense();
          setTimeout(() => { window.location.replace('/'); }, 4000);
        }
      });
    } else {
      setIsLicensed(false);
    }
  }, []);

  // 2. 计时 Worker
  useEffect(() => {
    const workerBlob = new Blob([`
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AC();
      analyserRef.current = audioContextRef.current.createAnalyser();
      micRef.current = audioContextRef.current.createMediaStreamSource(stream);
      micRef.current.connect(analyserRef.current);
      setIsStarted(true);
      if (workerRef.current) workerRef.current.postMessage('start');
    } catch (err: any) {
      setError("无法访问麦克风: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isStarted) return;
    const now = Date.now();
    if (currentDb > limit) {
      recoverStartRef.current = 0;
      if (thresholdStartRef.current === 0) thresholdStartRef.current = now;
      if (now - thresholdStartRef.current > 2000) {
        if (state !== 'alarm') { setState('alarm'); setWarnCount(prev => prev + 1); setQuietTime(0); }
      } else if (now - thresholdStartRef.current > 800 && state === 'calm') { setState('warning'); }
    } else {
      thresholdStartRef.current = 0;
      if (state === 'alarm') {
        if (recoverStartRef.current === 0) recoverStartRef.current = now;
        if (now - recoverStartRef.current > 3000) setState('calm');
      } else if (state !== 'calm') { setState('calm'); }
    }
  }, [currentDb, limit, isStarted]);

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

  // --- 恢复版 UI 组件 ---

  const NoiseLevelReference = () => {
    const levels = [
      { min: 0, max: 20, icon: "🤫", label: "0–20 dB 极度安静", desc: "几乎听不到声音" },
      { min: 20, max: 40, icon: "🍃", label: "20–40 dB 非常安静", desc: "轻声细语" },
      { min: 40, max: 60, icon: "💬", label: "40–60 dB 正常背景", desc: "普通交谈" },
      { min: 60, max: 80, icon: "🚗", label: "60–80 dB 中等响度", desc: "繁忙街道音" },
      { min: 80, max: 100, icon: "⚠️", label: "80–100 dB 响亮有害", desc: "极其嘈杂" },
      { min: 100, max: 120, icon: "📢", label: "100–120 dB 非常响亮", desc: "震耳欲聋" },
    ];
    const pointerPos = Math.min(100, (currentDb / 120) * 100);
    return (
      <div className="db-reference-panel" style={{ width: '280px', padding: '20px' }}>
        <div className="reference-title" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>分贝等级参考</div>
        <div className="vertical-meter-container" style={{ height: '400px' }}>
          <div className="meter-bar-bg">
            <div className="current-level-pointer" style={{ bottom: `${pointerPos}%`, transition: 'bottom 0.3s' }} />
          </div>
          <div className="level-nodes" style={{ gap: '15px' }}>
            {levels.map((l, idx) => (
              <div key={idx} className="level-node" style={{ color: currentDb >= l.min && currentDb < l.max ? '#00d4ff' : '#94a3b8', opacity: currentDb >= l.min && currentDb < l.max ? 1 : 0.6 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{l.icon} {l.label}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Visualizer = () => {
    const BAR_COUNT = 80;
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    return (
      <div className="visualizer-container" style={{ opacity: 0.6 }}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const dist = Math.abs(i - BAR_COUNT / 2);
          const norm = 1 - (dist / (BAR_COUNT / 2));
          const height = 15 + (Math.pow(currentDb/60, 2) * 200 * norm * (0.8 + Math.random()*0.4));
          return <div key={i} className="wave-bar" style={{ height: `${height}px`, background: `hsl(${hue}, 85%, 55%)` }} />;
        })}
      </div>
    );
  };

  const DoraemonSVG = () => (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      <ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      <ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      {state === 'alarm' ? (
        <g stroke="#333" strokeWidth="5"><line x1="70" y1="60" x2="90" y2="80"/><line x1="90" y1="60" x2="70" y2="80"/><line x1="110" y1="60" x2="130" y2="80"/><line x1="130" y1="60" x2="110" y2="80"/></g>
      ) : (
        <g><circle cx={state === 'warning' ? 82 : 88} cy="70" r={state === 'warning' ? 3 : 4} fill="#000"/><circle cx={state === 'warning' ? 118 : 112} cy="70" r={state === 'warning' ? 3 : 4} fill="#000"/></g>
      )}
      <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      <line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2"/>
      {state === 'alarm' ? <ellipse cx="100" cy="155" rx="30" ry="25" fill="#D9002E" stroke="#333" strokeWidth="2"/> : <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none"/>}
      <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2"/>
    </svg>
  );

  // --- 隔离与启动页 ---

  if (authError) {
    return (
      <div className="doraemon-app dark-mode alarm-mode" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', color: '#ff416c' }}>⚠️ 授权失效</h1>
        <p style={{ fontSize: '2rem', margin: '20px 0' }}>{authError}</p>
        <p style={{ color: '#666' }}>4秒后自动返回首页...</p>
      </div>
    );
  }

  if (isLicensed === null) {
    return (
      <div className="doraemon-app dark-mode" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: '80px', height: '60px' }}></div>
        <h2 style={{ color: '#00f260' }}>🔮 正在验证魔法授权...</h2>
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
        <div className="doraemon-start-icon" style={{ width: '250px', height: '250px' }}><DoraemonSVG /></div>
        <h1 className="start-title" style={{ fontSize: '3.5rem' }}>Doraemon Monitor</h1>
        <button className="doraemon-btn-big" onClick={initApp} disabled={isLoading} style={{ padding: '25px 60px' }}>
          {isLoading ? <span>正在召唤...</span> : <><span className="btn-main-text" style={{ fontSize: '2rem' }}>开启监测</span><span className="btn-sub-text">点击开始自习守护</span></>}
        </button>
        {error && <div className="doraemon-error-box">{error}</div>}
      </div>
    );
  }

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      {state === 'alarm' && <div className="doraemon-giant-text" style={{ fontSize: '12vw' }}>{t('doraemon.quiet')}</div>}
      
      <header className="doraemon-header" style={{ padding: '20px 40px' }}>
        <button onClick={() => navigate('/')} className="icon-btn"><ArrowLeft size={32} /></button>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={toggleFullscreen} className="icon-btn"><Maximize size={32} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">{isDarkMode ? '🌞' : '🌙'}</button>
        </div>
      </header>

      <main className="doraemon-main" style={{ padding: '0 60px', gap: '40px' }}>
        <Visualizer />
        
        {/* 左侧：描述丰富的参考面板 */}
        <NoiseLevelReference />

        {/* 中心：极大的分贝显示 */}
        <div className="center-display" style={{ flex: 1.5 }}>
          <div className="doraemon-wrapper" style={{ width: '350px', height: '350px', transform: `scale(${1 + (currentDb - 40) / 150})`, transition: 'transform 0.1s' }}>
            <DoraemonSVG />
          </div>
          <div className="db-display" style={{ marginTop: '30px' }}>
            <span className="db-number" style={{ fontSize: '8rem' }}>{Math.round(currentDb)}</span>
            <span className="db-unit" style={{ fontSize: '2rem' }}>dB</span>
          </div>
        </div>

        {/* 右侧：极大化的统计卡片 */}
        <div className="right-panel" style={{ width: '320px', gap: '25px' }}>
          <div className="stat-box" style={{ padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>🤫 安静时长</span>
            <strong style={{ fontSize: '3rem', color: '#00f260', marginTop: '10px' }}>{formatTime(quietTime)}</strong>
          </div>
          <div className="stat-box" style={{ padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>⏱️ 监测总计</span>
            <strong style={{ fontSize: '3rem', color: '#0575e6', marginTop: '10px' }}>{formatTime(totalTime)}</strong>
          </div>
          <div className={`stat-box ${warnCount > 0 ? 'warning' : ''}`} style={{ padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>⚠️ 警告次数</span>
            <strong style={{ fontSize: '3rem', color: '#ff416c', marginTop: '10px' }}>{warnCount}</strong>
          </div>

          <div className="controls-box" style={{ padding: '25px', marginTop: '10px' }}>
            <div className="slider-header" style={{ marginBottom: '15px' }}>
              <span style={{ fontSize: '1.2rem' }}>分贝阈值</span>
              <span style={{ fontSize: '1.5rem', color: '#00f260', fontWeight: 'bold' }}>{limit} dB</span>
            </div>
            <input type="range" min="40" max="90" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="threshold-slider" style={{ height: '12px' }} />
            <button className="reset-btn" onClick={() => setWarnCount(0)} style={{ marginTop: '20px', padding: '12px', fontSize: '1rem' }}>清空记录</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoraemonMonitorApp;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, RotateCcw, HelpCircle, X } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { isVerified, getSavedLicenseCode, verifyLicenseCode, clearLicense } from './utils/licenseManager';
import LicenseInput from './components/LicenseInput';
import './doraemon-monitor.css';

const DoraemonMonitorApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentDb, setCurrentDb] = useState(40);
  const [limit, setLimit] = useState(60);
  const [warnCount, setWarnCount] = useState(0);
  const [maxDb, setMaxDb] = useState(0);
  const [quietTime, setQuietTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [state, setState] = useState<'calm' | 'warning' | 'alarm'>('calm');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [timeStr, setTimeStr] = useState('');
  const [sensitivity, setSensitivity] = useState(50);
  const [showHelp, setShowHelp] = useState(false);
  const sensitivityRef = useRef(50);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const thresholdStartRef = useRef(0);
  const recoverStartRef = useRef(0);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const date = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
      const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      setTimeStr(`${date} ${time}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const code = getSavedLicenseCode();
    if (isVerified() && code) {
      verifyLicenseCode(code).then(res => {
        if (res.success) setIsLicensed(true);
        else {
          setAuthError(res.message);
          clearLicense();
          // Start countdown
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                window.location.replace('/');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      });
    } else setIsLicensed(false);
  }, []);

  useEffect(() => {
    const workerBlob = new Blob([`
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') { if (interval) clearInterval(interval); interval = setInterval(() => self.postMessage('tick'), 100); }
        else if (e.data === 'stop') { if (interval) clearInterval(interval); }
      }
    `], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(workerBlob));
    workerRef.current.onmessage = () => analyzeAudio();
    return () => workerRef.current?.terminate();
  }, []);

  const analyzeAudio = () => {
    if (!analyserRef.current) return;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const x = (data[i] - 128) / 128; sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    let rawDb = rms > 0 ? (Math.log10(rms) * 20 + 100) : 30;
    
    // Apply sensitivity adjustment
    const adj = (sensitivityRef.current - 50) * 0.5;
    rawDb += adj;

    rawDb = Math.max(35, Math.min(120, rawDb));
    setCurrentDb(prev => {
      const next = prev + (rawDb - prev) * 0.5;
      setMaxDb(m => Math.max(m, next));
      return next;
    });
    if (document.hidden) document.title = t('doraemon.monitorTitle').replace('{db}', Math.round(rawDb).toString());
    else document.title = t('doraemon.appTitle');
  };

  const initApp = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AC();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      const muteGain = context.createGain();
      muteGain.gain.value = 0;
      analyser.connect(muteGain);
      muteGain.connect(context.destination);
      setIsStarted(true);
      workerRef.current?.postMessage('start');
    } catch (err: any) { setError(t('doraemon.authFailed') + err.message); } finally { setIsLoading(false); }
  };

  const playAlarmSound = () => {
    if (!audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Double beep alarm
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t); // A5
      osc.frequency.setValueAtTime(880, t + 0.1);
      osc.frequency.setValueAtTime(0, t + 0.15); // Pause
      osc.frequency.setValueAtTime(880, t + 0.25);
      osc.frequency.setValueAtTime(880, t + 0.35);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.35);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);

      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
    if (!isStarted) return;
    const now = Date.now();
    if (currentDb > limit) {
      recoverStartRef.current = 0;
      if (thresholdStartRef.current === 0) thresholdStartRef.current = now;
      if (now - thresholdStartRef.current > 2000) {
        if (state !== 'alarm') {
          setState('alarm');
          setWarnCount(prev => prev + 1);
          setQuietTime(0);
          playAlarmSound();
        }
      }
      else if (now - thresholdStartRef.current > 800 && state === 'calm') setState('warning');
    } else {
      thresholdStartRef.current = 0;
      if (state === 'alarm') { if (recoverStartRef.current === 0) recoverStartRef.current = now; if (now - recoverStartRef.current > 3000) setState('calm'); }
      else if (state !== 'calm') setState('calm');
    }
  }, [currentDb, limit, isStarted]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStarted) interval = setInterval(() => { setTotalTime(prev => prev + 1); if (state !== 'alarm') setQuietTime(prev => prev + 1); }, 1000);
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

  const NoiseLevelReference = () => {
    const levels = [
      { min: 0, max: 20, label: t('doraemon.levels.l0') },
      { min: 20, max: 40, label: t('doraemon.levels.l20') },
      { min: 40, max: 60, label: t('doraemon.levels.l40') },
      { min: 60, max: 80, label: t('doraemon.levels.l60') },
      { min: 80, max: 100, label: t('doraemon.levels.l80') },
      { min: 100, max: 120, label: t('doraemon.levels.l100') },
    ];
    const pointerPos = Math.min(100, Math.max(0, (currentDb / 120) * 100));

    // 移除内联颜色逻辑，依赖 CSS 类
    const activeTextColor = isDarkMode ? '#fff' : '#0f172a';
    const textColor = isDarkMode ? '#94a3b8' : '#475569';

    return (
      <div className="db-reference-panel">
        <div className="reference-title">{t('doraemon.dbReference')}</div>
        <div className="vertical-meter-container">
          <div style={{ position: 'relative', width: '12px' }}>
            <div className="meter-bar-bg">
              <div className="meter-gradient-fill"></div>
            </div>
            <div
              className="current-level-pointer"
              style={{
                bottom: `${pointerPos}%`
              }}
            >
              <div style={{ position: 'absolute', right: '-12px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid ${isDarkMode ? '#00d4ff' : '#0575e6'}` }} />
            </div>
          </div>
          <div className="level-nodes">
            {levels.reverse().map((l, i) => (
              <div key={i} style={{
                color: currentDb >= l.min && currentDb < l.max ? activeTextColor : textColor,
                opacity: currentDb >= l.min && currentDb < l.max ? 1 : 0.5,
                fontWeight: currentDb >= l.min && currentDb < l.max ? 'bold' : 'normal',
                fontSize: '0.9rem'
              }}>
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- 核心强化：深色高显眼声纹波浪 ---
  const Visualizer = () => {
    const BAR_COUNT = 80; // 减少数量以提高性能和适应性
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    // 在白天模式下使用更深的颜色和更高的不透明度
    const opacity = isDarkMode ? 0.7 : 0.5;
    const mainColor = `hsl(${hue}, 95%, 50%)`; // 极高饱和度
    const glowColor = `hsla(${hue}, 95%, 50%, 0.6)`;

    return (
      <div className="visualizer-container">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const dist = Math.abs(i - BAR_COUNT / 2);
          const norm = 1 - (dist / (BAR_COUNT / 2));
          const dbPower = Math.pow(Math.max(0, (currentDb - 35) / 45), 1.5);
          const wave = Math.sin(i * 0.35 + Date.now() / 150) * 0.15;

          // 优化：边缘高度自然收尾 (Taper height at edges)
          const taperedNorm = Math.pow(norm, 1.5);
          const height = 10 + (80 * taperedNorm * (dbPower + wave + 0.05));

          return (
            <div key={i} className="wave-bar" style={{
              height: `${Math.min(100, height)}%`, // 使用百分比高度
              background: `linear-gradient(to top, transparent, ${mainColor})`,
              opacity: (opacity + norm * 0.3) * Math.min(1, norm * 2), // 边缘渐隐
              boxShadow: `0 0 ${15 * norm}px ${glowColor}`,
            }} />
          );
        })}
      </div>
    );
  };

  const DoraemonSVG = () => (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2" /><circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2" /><ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2" /><ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2" />
      {state === 'alarm' ? (
        <g stroke="#333" strokeWidth="5"><line x1="70" y1="60" x2="90" y2="80" /><line x1="90" y1="60" x2="70" y2="80" /><line x1="110" y1="60" x2="130" y2="80" /><line x1="130" y1="60" x2="110" y2="80" /></g>
      ) : (
        <g><circle cx={state === 'warning' ? 82 : 88} cy="70" r={state === 'warning' ? 3 : 4} fill="#000" /><circle cx={state === 'warning' ? 118 : 112} cy="70" r={state === 'warning' ? 3 : 4} fill="#000" /></g>
      )}
      <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2" /><line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2" />
      {state === 'alarm' ? <ellipse cx="100" cy="155" rx="30" ry="25" fill="#D9002E" stroke="#333" strokeWidth="2" /> : <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none" />}
      <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2" /><circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2" />
    </svg>
  );

  if (authError) return <div className="doraemon-app dark-mode alarm-mode" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}><h1 style={{ fontSize: '4.4rem', color: '#ff416c' }}>{t('doraemon.authExpired')}</h1><p style={{ fontSize: '2.2rem', margin: '20px 0' }}>{authError}</p><p style={{ color: '#666', fontSize: '1.1rem' }}>{t('doraemon.returnHome').replace('{seconds}', countdown.toString())}</p></div>;
  if (isLicensed === null) return <div className="doraemon-app dark-mode" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" style={{ width: '80px', height: '60px' }}></div><h2 style={{ color: '#00f260' }}>{t('doraemon.verifying')}</h2></div>;
  if (isLicensed === false) return <LicenseInput onVerified={() => setIsLicensed(true)} />;
  if (!isStarted) return <div className="doraemon-start-layer"><button onClick={() => navigate('/')} className="back-btn"><ArrowLeft size={32} /></button><div className="doraemon-start-icon" style={{ width: '250px', height: '250px' }}><DoraemonSVG /></div><h1 className="start-title" style={{ fontSize: '3.5rem' }}>{t('doraemon.title')}</h1><button className="doraemon-btn-big" onClick={initApp} disabled={isLoading} style={{ padding: '25px 60px' }}>{isLoading ? <span>{t('doraemon.summoning')}</span> : <><span className="btn-main-text" style={{ fontSize: '2rem' }}>{t('doraemon.startMonitor')}</span><span className="btn-sub-text">{t('doraemon.startMonitorSub')}</span></>}</button>{error && <div className="doraemon-error-box">{error}</div>}</div>;

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      {state === 'alarm' && <div className="doraemon-giant-text">{t('doraemon.quiet')}</div>}
      <header className="doraemon-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate('/')} className="icon-btn"><ArrowLeft size={32} /></button>
          <div style={{ fontSize: '1.26rem', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#333' }}>{timeStr}</div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={toggleFullscreen} className="icon-btn"><Maximize size={32} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">{isDarkMode ? '🌞' : '🌙'}</button>
        </div>
      </header>
      <main className="doraemon-main">
        <NoiseLevelReference />
        <div className="center-display">
          <div className="doraemon-wrapper" style={{ transform: `scale(${1 + (currentDb - 40) / 150})` }}><DoraemonSVG /></div>
          <div className="db-display"><span className="db-number">{Math.round(currentDb)}</span><span className="db-unit">dB</span></div>
          <Visualizer />
        </div>
        <div className="right-panel">
          <div className="stat-box">
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.quietTime')}</span>
              <strong className="stat-value" style={{ color: isDarkMode ? '#00f260' : '#059669' }}>{formatTime(quietTime)}</strong>
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.totalTime')}</span>
              <strong className="stat-value" style={{ color: isDarkMode ? '#0575e6' : '#2563eb' }}>{formatTime(totalTime)}</strong>
            </div>
          </div>
          <div className={`stat-box stat-box-with-action ${warnCount > 0 ? 'warning' : ''}`}>
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.warnCount')}</span>
              <strong className="stat-value" style={{ color: '#dc2626' }}>{warnCount}</strong>
            </div>
            <button
              className="reset-icon-btn"
              onClick={() => { setWarnCount(0); }}
              title={t('doraemon.resetCount')}
            >
              <RotateCcw size={20} />
            </button>
          </div>
          <div className="stat-box">
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.maxDb')}</span>
              <strong className="stat-value" style={{ color: isDarkMode ? '#ff00ff' : '#d946ef' }}>{Math.round(maxDb)}</strong>
            </div>
          </div>
          
          <div className="controls-box" style={{ position: 'relative' }}>
            <div className="slider-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{t('doraemon.sensitivity')}</span>
                <button 
                  onClick={() => setShowHelp(!showHelp)} 
                  className="help-icon-btn"
                  title={t('doraemon.helpTitle')}
                >
                  <HelpCircle size={16} />
                </button>
              </div>
              <span className="threshold-value" style={{ color: isDarkMode ? '#00f260' : '#059669' }}>{sensitivity}%</span>
            </div>
            
            {showHelp && (
              <div className="help-tooltip">
                <div className="help-header">
                  <span>{t('doraemon.helpAdviceTitle')}</span>
                  <button onClick={() => setShowHelp(false)} className="close-help-btn">
                    <X size={14} />
                  </button>
                </div>
                <div className="help-content">
                  <p><strong>{t('doraemon.helpAdviceMute')}</strong>{t('doraemon.helpAdviceMuteDesc')}</p>
                  <p><strong>{t('doraemon.helpAdviceRead')}</strong>{t('doraemon.helpAdviceReadDesc')}</p>
                </div>
                <div className="help-footer" onClick={() => setShowHelp(false)}>
                  {t('doraemon.tapToClose')}
                </div>
              </div>
            )}

            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sensitivity} 
              onChange={(e) => setSensitivity(Number(e.target.value))} 
              className="threshold-slider" 
            />
          </div>

          <div className="controls-box">
            <div className="slider-header">
              <span>{t('doraemon.threshold')}</span>
              <span className="threshold-value" style={{ color: isDarkMode ? '#00f260' : '#059669' }}>{limit} dB</span>
            </div>
            <input type="range" min="40" max="90" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="threshold-slider" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoraemonMonitorApp;


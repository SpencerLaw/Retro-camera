import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { isVerified, getSavedLicenseCode, verifyLicenseCode } from './utils/licenseManager';
import LicenseInput from './components/LicenseInput';
import './doraemon-monitor.css';

const DoraemonMonitorApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [isLicensed, setIsLicensed] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [currentDb, setCurrentDb] = useState(40);
  const [limit, setLimit] = useState(60);
  const [warnCount, setWarnCount] = useState(0);
  const [quietTime, setQuietTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [state, setState] = useState<'calm' | 'warning' | 'alarm'>('calm');
  const [isDarkMode, setIsDarkMode] = useState(true); // 默认黑夜模式
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const quietTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thresholdStartRef = useRef(0);
  const recoverStartRef = useRef(0);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const localVerified = isVerified();
    setIsLicensed(localVerified);
    if (localVerified) {
      const code = getSavedLicenseCode();
      if (code) {
        verifyLicenseCode(code).then(res => {
          if (res.success) console.log('License heartbeat success');
          else console.warn('License heartbeat failed:', res.message);
        });
      }
    }
  }, []);

  const handleLicenseVerified = () => setIsLicensed(true);

  const analyzeAudio = () => {
    if (!analyserRef.current) return;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
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
    setCurrentDb(prev => prev + (rawDb - prev) * 0.5);
  };

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
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = setInterval(analyzeAudio, 100);
      loop();
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

  const loop = () => {
    animationRef.current = requestAnimationFrame(loop);
  };

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

  const triggerAlarm = (isStart: boolean) => {
    if (isStart) {
      setState('alarm');
      setWarnCount(prev => prev + 1);
      setQuietTime(0);
      beep(600, 'square');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      setState('calm');
      beep(500, 'sine');
    }
  };

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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStarted) {
      interval = setInterval(() => {
        setTotalTime(prev => prev + 1);
        if (state !== 'alarm') {
          setQuietTime(prev => prev + 1);
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStarted, state]);

  // 处理页面可见性变化 - 确保最小化时继续监听
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (audioContextRef.current) {
        if (document.hidden) {
          // 页面隐藏时，确保AudioContext继续运行
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
        } else {
          // 页面可见时，恢复AudioContext
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 定期检查并恢复AudioContext（防止浏览器强制暂停）
    const keepAliveInterval = setInterval(() => {
      if (isStarted && audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(keepAliveInterval);
    };
  }, [isStarted]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 噪音等级参考组件
  const NoiseLevelReference = () => {
    const levels = [
      { min: 0, max: 20, label: "0–20 dB 极度安静", desc: "几乎听不到", icon: "🤫" },
      { min: 20, max: 40, label: "20–40 dB 非常安静", desc: "轻声细语", icon: "🍃" },
      { min: 40, max: 60, label: "40–60 dB 正常背景音", desc: "普通交谈", icon: "💬" },
      { min: 60, max: 80, label: "60–80 dB 中等响度", desc: "繁忙街道", icon: "🚗" },
      { min: 80, max: 100, label: "80–100 dB 响亮（有害）", desc: "极其嘈杂", icon: "⚠️" },
      { min: 100, max: 120, label: "100–120 dB 非常响亮", desc: "震耳欲聋", icon: "📢" },
    ];
    const pointerBottom = Math.min(100, Math.max(0, (currentDb / 120) * 100));

    return (
      <div className="db-reference-panel">
        <div className="reference-title">分贝参考</div>
        <div className="vertical-meter-container">
          <div className="meter-bar-bg">
            <div className="meter-gradient-fill" />
            <div className="current-level-pointer" style={{ bottom: `${pointerBottom}%` }} />
          </div>
          <div className="level-nodes">
            {levels.map((level, idx) => (
              <div key={idx} className="level-node">
                <div className="node-content">
                  <div className="node-label" style={{
                    color: currentDb >= level.min && currentDb < level.max ? '#00d4ff' : undefined,
                    fontWeight: currentDb >= level.min && currentDb < level.max ? 800 : 600
                  }}>
                    {level.icon} {level.label}
                  </div>
                  <div className="node-desc">{level.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="reference-footer">仅供参考</div>
      </div>
    );
  };

  // 生成频谱条
  const renderVisualizer = () => {
    const BAR_COUNT = 80;
    const time = Date.now() / 1000;
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    const mainColor = `hsl(${hue}, 85%, 55%)`;
    const glowColor = `hsla(${hue}, 85%, 50%, 0.5)`;

    return (
      <div className="visualizer-container">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const distanceFromCenter = Math.abs(i - BAR_COUNT / 2);
          const normalizedDistance = 1 - (distanceFromCenter / (BAR_COUNT / 2));
          const dbPower = Math.pow(Math.max(0, (currentDb - 35) / 45), 1.5);
          const wave = Math.sin(i * 0.35 + time * 8) * 0.15;
          const totalFactor = Math.max(0.03, (dbPower + wave) * (0.8 + Math.random() * 0.2));
          const targetHeight = 12 + (320 * normalizedDistance * totalFactor);
          const style = {
            height: `${targetHeight}px`,
            background: `linear-gradient(to top, transparent 0%, ${mainColor} 100%)`,
            boxShadow: `0 0 20px ${glowColor}`,
            opacity: 0.15 + (normalizedDistance * 0.85),
          };
          return <div key={i} className="wave-bar" style={style} />;
        })}
      </div>
    );
  };

  // 哆啦A梦SVG组件
  const DoraemonSVG = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" className={className}>
      <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      <ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      <ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
      {state === 'alarm' ? (
        <g stroke="#333" strokeWidth="4" strokeLinecap="round">
          <line x1="74" y1="62" x2="90" y2="78"/><line x1="90" y1="62" x2="74" y2="78"/>
          <line x1="110" y1="62" x2="126" y2="78"/><line x1="126" y1="62" x2="110" y2="78"/>
        </g>
      ) : state === 'warning' ? (
        <g><circle cx="82" cy="70" r="3" fill="#000"/><circle cx="118" cy="70" r="3" fill="#000"/></g>
      ) : (
        <g><circle cx="88" cy="70" r="4" fill="#000"/><circle cx="112" cy="70" r="4" fill="#000"/></g>
      )}
      <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      <circle cx="97" cy="89" r="3" fill="#FFF" opacity="0.8"/>
      <line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2"/>
      {state === 'alarm' ? (
        <ellipse cx="100" cy="155" rx="30" ry="25" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      ) : state === 'warning' ? (
        <path d="M 65 145 Q 75 155 85 145 Q 95 155 105 145 Q 115 155 125 145 Q 135 155 135 145" stroke="#333" strokeWidth="2" fill="none"/>
      ) : (
        <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none"/>
      )}
      <line x1="30" y1="95" x2="80" y2="105" stroke="#333" strokeWidth="2"/>
      <line x1="25" y1="115" x2="80" y2="115" stroke="#333" strokeWidth="2"/>
      <line x1="30" y1="135" x2="80" y2="125" stroke="#333" strokeWidth="2"/>
      <line x1="170" y1="95" x2="120" y2="105" stroke="#333" strokeWidth="2"/>
      <line x1="175" y1="115" x2="120" y2="115" stroke="#333" strokeWidth="2"/>
      <line x1="170" y1="135" x2="120" y2="125" stroke="#333" strokeWidth="2"/>
      <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2"/>
      <line x1="86" y1="180" x2="114" y2="180" stroke="#333" strokeWidth="2"/>
      <line x1="85" y1="183" x2="115" y2="183" stroke="#333" strokeWidth="2"/>
      <circle cx="100" cy="192" r="3" fill="#333"/>
      <line x1="100" y1="192" x2="100" y2="200" stroke="#333" strokeWidth="2"/>
    </svg>
  );

  if (!isLicensed) {
    return <LicenseInput onVerified={handleLicenseVerified} />;
  }

  if (!isStarted) {
    return (
      <div className="doraemon-start-layer">
        <button
          onClick={() => navigate('/')}
          className="back-btn"
        >
          <ArrowLeft size={28} />
        </button>

        <div className="doraemon-start-icon">
          <DoraemonSVG />
        </div>

        <h1 className="start-title">Anypok Doraemon</h1>

        <button
          className="doraemon-btn-big"
          onClick={initApp}
          disabled={isLoading}
        >
          {isLoading ? (
            <span>{t('doraemon.starting')}...</span>
          ) : (
            <>
              <span className="btn-main-text">{t('doraemon.startQuiet')}</span>
              <span className="btn-sub-text">{t('doraemon.studyBegin')}</span>
            </>
          )}
        </button>

        {error && <div className="doraemon-error-box">{error}</div>}

        <div className="start-hint">
          {t('doraemon.pleaseAllowMic')}
        </div>
      </div>
    );
  }

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      {state === 'alarm' && (
        <div className="doraemon-giant-text">{t('doraemon.quiet')}</div>
      )}

      {/* 简洁顶部栏 - 只有返回和主题切换 */}
      <header className="doraemon-header">
        <button onClick={() => navigate('/')} className="icon-btn">
          <ArrowLeft size={28} />
        </button>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">
          {isDarkMode ? '🌞' : '🌙'}
        </button>
      </header>

      {/* 主内容区 */}
      <main className="doraemon-main">
        {/* 声纹可视化背景 */}
        {renderVisualizer()}

        {/* 左侧分贝参考 */}
        <NoiseLevelReference />

        {/* 中心区域：哆啦A梦 + 分贝 */}
        <div className="center-display">
          <div className="doraemon-wrapper" style={{ transform: `scale(${1 + (currentDb - 40) / 200})` }}>
            <DoraemonSVG />
          </div>

          <div className="db-display">
            <span className="db-number">{Math.round(currentDb)}</span>
            <span className="db-unit">dB</span>
          </div>
        </div>

        {/* 右侧统计和控制 */}
        <div className="right-panel">
          <div className="stat-box">
            <div className="stat-icon">🤫</div>
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.quietDuration')}</span>
              <span className="stat-value">{formatTime(quietTime)}</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.totalDuration')}</span>
              <span className="stat-value">{formatTime(totalTime)}</span>
            </div>
          </div>

          <div className={`stat-box ${warnCount > 0 ? 'warning' : ''}`}>
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.warningCount')}</span>
              <span className="stat-value">{warnCount}</span>
            </div>
          </div>

          <div className="controls-box">
            <div className="slider-header">
              <span>{t('doraemon.alarmThreshold')}</span>
              <span className="threshold-value">{limit} dB</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="threshold-slider"
            />
            <button className="reset-btn" onClick={() => setWarnCount(0)}>
              {t('doraemon.resetCount')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoraemonMonitorApp;

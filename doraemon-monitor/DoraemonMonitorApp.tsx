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
        
        <div className="text-8xl mb-5">🤖</div>
        <h1 className="text-4xl font-bold mb-8 text-[#1293EE]">Anypok Doraemon</h1>

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
        {/* Adorable Doraemon */}
        <div className="doraemon-wrapper">
          <svg viewBox="0 0 200 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              {/* 蓝色渐变 - 明亮清新 */}
              <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#42A5F5" />
                <stop offset="50%" stopColor="#29B6F6" />
                <stop offset="100%" stopColor="#1E88E5" />
              </linearGradient>

              {/* 高光 */}
              <radialGradient id="shineGrad" cx="35%" cy="30%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* 铃铛金属光泽 */}
              <radialGradient id="goldGrad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#FFC107" />
                <stop offset="100%" stopColor="#FF8F00" />
              </radialGradient>

              {/* 柔和阴影 */}
              <filter id="shadow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.2"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g filter="url(#shadow)">
              {/* 蓝色圆润身体 */}
              <circle cx="100" cy="100" r="80" fill="url(#bodyGradient)" stroke="#1565C0" strokeWidth="2"/>

              {/* 白色大脸 - 圆润可爱 */}
              <circle cx="100" cy="85" r="65" fill="white"/>

              {/* 大眼睛 - 经典椭圆形 */}
              <ellipse cx="70" cy="65" rx="18" ry="23" fill="white" stroke="#000" strokeWidth="2.5"/>
              <ellipse cx="130" cy="65" rx="18" ry="23" fill="white" stroke="#000" strokeWidth="2.5"/>

              {/* 眼珠 - 根据状态变化 */}
              {state === 'alarm' ? (
                // 报警：X_X 晕眩眼
                <g stroke="#000" strokeWidth="4" strokeLinecap="round">
                  <line x1="62" y1="60" x2="78" y2="70"/>
                  <line x1="78" y1="60" x2="62" y2="70"/>
                  <line x1="122" y1="60" x2="138" y2="70"/>
                  <line x1="138" y1="60" x2="122" y2="70"/>
                </g>
              ) : state === 'warning' ? (
                // 警告：紧张小眼
                <g>
                  <circle cx="70" cy="68" r="5" fill="#000"/>
                  <circle cx="130" cy="68" r="5" fill="#000"/>
                </g>
              ) : (
                // 平常：有神的大眼睛
                <g>
                  <ellipse cx="70" cy="70" rx="8" ry="10" fill="#000"/>
                  <ellipse cx="130" cy="70" rx="8" ry="10" fill="#000"/>
                  {/* 眼睛高光 */}
                  <circle cx="73" cy="66" r="3.5" fill="white"/>
                  <circle cx="133" cy="66" r="3.5" fill="white"/>
                  <circle cx="68" cy="73" r="1.5" fill="white" opacity="0.6"/>
                  <circle cx="128" cy="73" r="1.5" fill="white" opacity="0.6"/>
                </g>
              )}

              {/* 红鼻子 - 圆润有光泽 */}
              <circle cx="100" cy="95" r="12" fill="#FF5252" stroke="#D32F2F" strokeWidth="1.5"/>
              <circle cx="96" cy="91" r="4" fill="white" opacity="0.7"/>

              {/* 鼻子到嘴的竖线 */}
              <line x1="100" y1="107" x2="100" y2="125" stroke="#000" strokeWidth="3" strokeLinecap="round"/>

              {/* 胡须 - 经典6根 */}
              <g stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                <line x1="20" y1="90" x2="50" y2="93"/>
                <line x1="15" y1="100" x2="50" y2="100"/>
                <line x1="20" y1="110" x2="50" y2="107"/>
                <line x1="180" y1="90" x2="150" y2="93"/>
                <line x1="185" y1="100" x2="150" y2="100"/>
                <line x1="180" y1="110" x2="150" y2="107"/>
              </g>

              {/* 嘴巴 - 根据状态变化 */}
              {state === 'alarm' ? (
                // 报警：大嘴巴大喊
                <g>
                  <ellipse cx="100" cy="145" rx="25" ry="30" fill="#E53935" stroke="#000" strokeWidth="3"/>
                  <ellipse cx="100" cy="150" rx="18" ry="20" fill="#C62828"/>
                </g>
              ) : state === 'warning' ? (
                // 警告：担心的波浪嘴
                <path d="M 75 135 Q 85 145 95 135 Q 105 145 115 135 Q 125 145 125 135"
                      stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/>
              ) : (
                // 平常：经典大笑
                <path d="M 60 125 Q 100 165 140 125"
                      stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/>
              )}

              {/* 白色肚皮 */}
              <ellipse cx="100" cy="145" rx="55" ry="60" fill="white"/>

              {/* 四次元口袋 */}
              <path d="M 70 145 Q 70 170 100 170 Q 130 170 130 145"
                    fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
              <line x1="70" y1="145" x2="130" y2="145" stroke="#000" strokeWidth="3"/>

              {/* 红色项圈 */}
              <ellipse cx="100" cy="180" rx="60" ry="8" fill="#F44336" stroke="#D32F2F" strokeWidth="2"/>

              {/* 金色铃铛 */}
              <g transform="translate(100, 188)">
                {/* 铃铛主体 */}
                <circle r="12" fill="url(#goldGrad)" stroke="#E65100" strokeWidth="2"/>
                {/* 铃铛横线 */}
                <line x1="-9" y1="-1" x2="9" y2="-1" stroke="#E65100" strokeWidth="1.5"/>
                <line x1="-10" y1="2" x2="10" y2="2" stroke="#E65100" strokeWidth="1.5"/>
                {/* 铃铛舌头 */}
                <circle cy="5" r="2.5" fill="#424242"/>
                <line x1="0" y1="7.5" x2="0" y2="11" stroke="#424242" strokeWidth="2" strokeLinecap="round"/>
                {/* 铃铛高光 */}
                <circle cx="-4" cy="-4" r="3" fill="white" opacity="0.8"/>
              </g>

              {/* 整体高光效果 */}
              <ellipse cx="70" cy="60" rx="40" ry="30" fill="url(#shineGrad)" opacity="0.6"/>
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

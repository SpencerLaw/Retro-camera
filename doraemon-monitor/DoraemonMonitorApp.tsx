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
        {/* Classic Doraemon - Cute & Cheerful Style */}
        <div className="doraemon-wrapper">
          <svg viewBox="0 0 200 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              {/* 身体：经典天蓝色渐变 */}
              <radialGradient id="doraBody" cx="40%" cy="40%" r="80%">
                <stop offset="0%" style={{ stopColor: '#42A5F5', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#1976D2', stopOpacity: 1 }} />
              </radialGradient>

              {/* 脸/肚子：纯白色渐变 */}
              <radialGradient id="doraWhite" cx="50%" cy="40%" r="80%">
                <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#F5F5F5', stopOpacity: 1 }} />
              </radialGradient>

              {/* 铃铛：金属质感 */}
              <radialGradient id="bellGold" cx="35%" cy="35%" r="70%">
                <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#FFA000', stopOpacity: 1 }} />
              </radialGradient>

              {/* 柔和阴影 */}
              <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="3" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g filter="url(#softShadow)">
              {/* 1. 蓝色身体 */}
              <circle cx="100" cy="95" r="85" fill="url(#doraBody)" stroke="#1565C0" strokeWidth="2" />

              {/* 2. 白色肚皮 */}
              <ellipse cx="100" cy="120" rx="62" ry="68" fill="url(#doraWhite)" />

              {/* 3. 四次元口袋 */}
              <ellipse cx="100" cy="135" rx="32" ry="28" fill="none" stroke="#333" strokeWidth="2.5" />

              {/* 4. 白色脸部 */}
              <ellipse cx="100" cy="70" rx="75" ry="55" fill="url(#doraWhite)" />

              {/* 5. 眼睛 - 经典大眼 */}
              <g>
                {/* 左眼 */}
                <ellipse cx="70" cy="50" rx="20" ry="24" fill="white" stroke="#333" strokeWidth="2.2" />
                {/* 右眼 */}
                <ellipse cx="130" cy="50" rx="20" ry="24" fill="white" stroke="#333" strokeWidth="2.2" />

                {/* 眼珠 - 根据状态改变 */}
                {state === 'alarm' ? (
                  // 报警：惊恐的 X_X 眼
                  <g stroke="#333" strokeWidth="5" strokeLinecap="round" fill="none">
                    <path d="M60,43 L80,57" />
                    <path d="M80,43 L60,57" />
                    <path d="M120,43 L140,57" />
                    <path d="M140,43 L120,57" />
                  </g>
                ) : state === 'warning' ? (
                  // 警告：紧张的小圆眼
                  <g fill="#000">
                    <circle cx="70" cy="50" r="5" />
                    <circle cx="130" cy="50" r="5" />
                  </g>
                ) : (
                  // 平时：可爱的正常眼神
                  <g>
                    <ellipse cx="72" cy="54" rx="7" ry="9" fill="#000" />
                    <ellipse cx="128" cy="54" rx="7" ry="9" fill="#000" />
                    {/* 眼睛高光 */}
                    <circle cx="75" cy="51" r="3" fill="white" />
                    <circle cx="131" cy="51" r="3" fill="white" />
                  </g>
                )}
              </g>

              {/* 6. 红色鼻子 */}
              <circle cx="100" cy="75" r="13" fill="#F44336" stroke="#C62828" strokeWidth="1.5" />
              <circle cx="96" cy="71" r="4" fill="white" opacity="0.7" /> {/* 鼻子高光 */}

              {/* 鼻子到嘴的竖线 */}
              <line x1="100" y1="88" x2="100" y2="120" stroke="#333" strokeWidth="2.5" />

              {/* 7. 胡须 - 经典三根 */}
              <g stroke="#333" strokeWidth="2.5" strokeLinecap="round">
                {/* 左胡须 */}
                <line x1="25" y1="82" x2="55" y2="87" />
                <line x1="20" y1="95" x2="55" y2="95" />
                <line x1="25" y1="108" x2="55" y2="103" />
                {/* 右胡须 */}
                <line x1="175" y1="82" x2="145" y2="87" />
                <line x1="180" y1="95" x2="145" y2="95" />
                <line x1="175" y1="108" x2="145" y2="103" />
              </g>

              {/* 8. 嘴巴 - 根据状态改变 */}
              {state === 'alarm' ? (
                // 报警：大张口
                <g>
                  <path d="M60,120 Q100,185 140,120" fill="#E53935" stroke="#333" strokeWidth="3" />
                  <ellipse cx="100" cy="150" rx="25" ry="15" fill="#C62828" />
                </g>
              ) : state === 'warning' ? (
                // 警告：担心的嘴型
                <path d="M70,135 Q85,145 100,135 Q115,145 130,135" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
              ) : (
                // 平时：经典大笑
                <path d="M50,120 Q100,170 150,120" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
              )}

              {/* 9. 红色项圈 */}
              <ellipse cx="100" cy="180" rx="65" ry="12" fill="#E53935" stroke="#C62828" strokeWidth="2" />

              {/* 10. 金色铃铛 */}
              <g transform="translate(100, 195)">
                {/* 铃铛主体 */}
                <circle r="15" fill="url(#bellGold)" stroke="#FF6F00" strokeWidth="2" />
                {/* 铃铛横纹 */}
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#FF6F00" strokeWidth="1.5" />
                <line x1="-13" y1="4" x2="13" y2="4" stroke="#FF6F00" strokeWidth="1.5" />
                {/* 铃铛舌 */}
                <circle cy="6" r="3" fill="#333" />
                <rect x="-1" y="9" width="2" height="5" rx="1" fill="#333" />
                {/* 铃铛高光 */}
                <circle cx="-5" cy="-5" r="4" fill="white" opacity="0.6" />
              </g>
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

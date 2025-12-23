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
  const [isLicensed, setIsLicensed] = useState(false); // 授权状态
  const [isStarted, setIsStarted] = useState(false);
  const [currentDb, setCurrentDb] = useState(40);
  const [limit, setLimit] = useState(60);
  const [warnCount, setWarnCount] = useState(0);
  const [quietTime, setQuietTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
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
    const localVerified = isVerified();
    setIsLicensed(localVerified);

    // 如果本地已验证，静默发送心跳以更新活跃时间
    if (localVerified) {
      const code = getSavedLicenseCode();
      if (code) {
        verifyLicenseCode(code).then(res => {
          if (res.success) {
            console.log('License heartbeat success');
          } else {
            console.warn('License heartbeat failed:', res.message);
          }
        });
      }
    }
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

    setCurrentDb(prev => prev + (rawDb - prev) * 0.5);
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
      setQuietTime(0); // 报警时重置安静时长
      beep(600, 'square');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      setState('calm');
      beep(500, 'sine');
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

  // 计时器逻辑
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
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStarted, state]);

  // 清理
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
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

    // 计算指针位置 (0-120 映射到 0-100%)
    const pointerBottom = Math.min(100, Math.max(0, (currentDb / 120) * 100));

    return (
      <div className="glass-card db-reference-panel">
        <div className="reference-title">噪音分贝级别参考</div>
        <div className="vertical-meter-container">
          <div className="meter-bar-bg">
            <div className="meter-gradient-fill" />
            <div className="current-level-pointer" style={{ bottom: `${pointerBottom}%` }} />
          </div>
          <div className="level-nodes">
            {levels.map((level, idx) => (
              <div key={idx} className="level-node">
                <div className="node-line" />
                <div className="node-content">
                  <div className="node-label" style={{ color: currentDb >= level.min && currentDb < level.max ? 'var(--accent-blue)' : 'inherit' }}>
                    {level.label} {level.icon}
                  </div>
                  <div className="node-desc">{level.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="reference-footer">分贝值仅供参考</div>
      </div>
    );
  };

  const barPercent = Math.min(100, Math.max(0, (currentDb - 30) * 1.5));
  const limitBarPercent = ((limit - 30) * 1.5);

  let dbColor = '#1293EE';
  if (state === 'alarm') dbColor = '#FFF';
  else if (currentDb > limit) dbColor = '#DD0000';
  else if (currentDb > limit - 5) dbColor = '#FACE05';

  // 生成极度炫酷的频谱条
  const renderVisualizer = () => {
    const BAR_COUNT = 60;
    const time = Date.now() / 1000; // 获取当前秒数
    
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    const mainColor = `hsl(${hue}, 90%, 65%)`;
    const darkColor = `hsl(${hue}, 90%, 40%)`;
    const glowColor = `hsla(${hue}, 90%, 60%, 0.7)`;

    return (
      <div className="visualizer-container">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const distanceFromCenter = Math.abs(i - BAR_COUNT / 2);
          const normalizedDistance = 1 - (distanceFromCenter / (BAR_COUNT / 2));
          
          // 灵敏度强化
          const dbPower = Math.pow(Math.max(0, (currentDb - 35) / 45), 1.5);
          
          // 新增：正弦流动波逻辑，即使安静时也会轻微起伏
          const wave = Math.sin(i * 0.3 + time * 10) * 0.15;
          const randomPulse = 0.8 + Math.random() * 0.4;
          
          // 最终比例：分贝基础 + 流动波 + 随机脉冲
          const totalFactor = Math.max(0.05, (dbPower + wave) * randomPulse);
          const targetHeight = 15 + (350 * normalizedDistance * totalFactor);
          
          const style = {
            height: `${targetHeight}px`,
            background: `linear-gradient(to top, ${darkColor} 0%, ${mainColor} 100%)`,
            boxShadow: `0 0 20px ${glowColor}`,
            opacity: 0.2 + (normalizedDistance * 0.8),
            transitionDelay: `${distanceFromCenter * 0.005}s`
          };
          
          return <div key={i} className="wave-bar" style={style} />;
        })}
      </div>
    );
  };

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

  // 计算进度条颜色和宽度
  const progressPercent = Math.min(100, Math.max(0, (currentDb - 30) * 1.5));
  
  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      {/* 巨型警告文字 */}
      {state === 'alarm' && (
        <div className="doraemon-giant-text">{t('doraemon.quiet')}</div>
      )}

      {/* 顶部栏 */}
      <header className="doraemon-header">
        <button
          onClick={() => navigate('/')}
          className="theme-toggle-btn"
          style={{ marginRight: 'auto' }}
        >
          <ArrowLeft size={24} color="var(--text-primary)" />
        </button>

        <div className="glass-card stat-card" style={{ marginRight: '1rem' }}>
          <span className="stat-label">{t('doraemon.quietDuration')}</span>
          <span className="stat-value">{formatTime(quietTime)}</span>
        </div>

        <div className="glass-card stat-card" style={{ marginRight: '1rem' }}>
          <span className="stat-label">{t('doraemon.totalDuration')}</span>
          <span className="stat-value">{formatTime(totalTime)}</span>
        </div>
        
        <div className="glass-card stat-card">
           <span className="stat-label" style={{ color: state === 'calm' ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
             {t('doraemon.warningCount')}
           </span>
           <span className="stat-value" style={{ color: state === 'calm' ? 'var(--text-primary)' : 'var(--accent-red)' }}>
             {warnCount}
           </span>
        </div>

        <button 
          className="theme-toggle-btn" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ marginLeft: '1rem' }}
        >
          {isDarkMode ? '🌞' : '🌙'}
        </button>
      </header>

      {/* 主内容 */}
      <main className="doraemon-main-content" style={{ flexDirection: 'row', gap: '4rem', padding: '0 5%' }}>
        {/* 左侧参考面板 */}
        <NoiseLevelReference />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* 背景可视化波纹 */}
          {renderVisualizer()}

          {/* 哆啦A梦 (缩放动画) */}
          <div className="doraemon-wrapper" style={{ transform: `scale(${1 + (currentDb - 40) / 200})` }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* ... (keep existing SVG content) ... */}
            {/* 头部背景 (蓝色) */}
            <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2"/>

            {/* 脸部 (白色) */}
            <circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>

            {/* 眼睛 (左 & 右) */}
            <ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>
            <ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2"/>

            {/* 眼珠 - 根据状态变化 */}
            {state === 'alarm' ? (
              // 报警：X_X 眼
              <g stroke="#333" strokeWidth="4" strokeLinecap="round">
                <line x1="74" y1="62" x2="90" y2="78"/>
                <line x1="90" y1="62" x2="74" y2="78"/>
                <line x1="110" y1="62" x2="126" y2="78"/>
                <line x1="126" y1="62" x2="110" y2="78"/>
              </g>
            ) : state === 'warning' ? (
              // 警告：紧张小眼珠
              <g>
                <circle cx="82" cy="70" r="3" fill="#000000"/>
                <circle cx="118" cy="70" r="3" fill="#000000"/>
              </g>
            ) : (
              // 平常：对眼效果
              <g>
                <circle cx="88" cy="70" r="4" fill="#000000"/>
                <circle cx="112" cy="70" r="4" fill="#000000"/>
              </g>
            )}

            {/* 鼻子 (红色) */}
            <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2"/>
            {/* 鼻子高光 */}
            <circle cx="97" cy="89" r="3" fill="#FFFFFF" opacity="0.8"/>

            {/* 嘴巴 - 根据状态变化 */}
            <line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2"/>
            {state === 'alarm' ? (
              // 报警：大张嘴
              <ellipse cx="100" cy="155" rx="30" ry="25" fill="#D9002E" stroke="#333" strokeWidth="2"/>
            ) : state === 'warning' ? (
              // 警告：波浪嘴
              <path d="M 65 145 Q 75 155 85 145 Q 95 155 105 145 Q 115 155 125 145 Q 135 155 135 145"
                    stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>
            ) : (
              // 平常：笑容弧线
              <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round"/>
            )}

            {/* 胡须 (左边) */}
            <line x1="30" y1="95" x2="80" y2="105" stroke="#333" strokeWidth="2"/>
            <line x1="25" y1="115" x2="80" y2="115" stroke="#333" strokeWidth="2"/>
            <line x1="30" y1="135" x2="80" y2="125" stroke="#333" strokeWidth="2"/>

            {/* 胡须 (右边) */}
            <line x1="170" y1="95" x2="120" y2="105" stroke="#333" strokeWidth="2"/>
            <line x1="175" y1="115" x2="120" y2="115" stroke="#333" strokeWidth="2"/>
            <line x1="170" y1="135" x2="120" y2="125" stroke="#333" strokeWidth="2"/>

            {/* 项圈 (红色) */}
            <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2"/>

            {/* 铃铛 (黄色) */}
            <circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2"/>
            <line x1="86" y1="180" x2="114" y2="180" stroke="#333" strokeWidth="2"/>
            <line x1="85" y1="183" x2="115" y2="183" stroke="#333" strokeWidth="2"/>
            <circle cx="100" cy="192" r="3" fill="#333"/>
            <line x1="100" y1="192" x2="100" y2="200" stroke="#333" strokeWidth="2"/>
          </svg>
        </div>

        {/* 巨大的分贝数字 */}
        <div className="db-display-container">
           <div className="db-value-huge">
             {Math.round(currentDb)}
           </div>
           <div className="db-label-small">{t('doraemon.currentDecibel')}</div>
        </div>
      </div>
    </main>

      {/* 底部控制 */}
      <footer className="doraemon-footer">
        <div className="glass-card controls-card">
          <div className="slider-row">
            <span className="slider-label">{t('doraemon.alarmThreshold')}</span>
            <span className="slider-value-display">{limit} dB</span>
          </div>
          
          <input
            type="range"
            min="40"
            max="90"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="custom-slider"
          />

          <button
            className="reset-btn"
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

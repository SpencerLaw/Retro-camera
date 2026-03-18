import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, RotateCcw, HelpCircle, X, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { isVerified, getSavedLicenseCode, verifyLicenseCode, clearLicense } from './utils/licenseManager';
import LicenseInput from './components/LicenseInput';
import './doraemon-monitor.css';

type MonitorState = 'calm' | 'alarm';
type MicTestStage = 'idle' | 'quiet' | 'active' | 'done';
type MicTestHealth = 'good' | 'flat' | 'noisy' | 'weak';

interface CaptureSettings {
  echoCancellation: boolean | null;
  noiseSuppression: boolean | null;
  autoGainControl: boolean | null;
}

interface MicTestResult {
  quietAvg: number;
  activeAvg: number;
  dynamicRange: number;
  overallMin: number;
  overallMax: number;
  recommendedSensitivity: number;
  recommendedLimit: number;
  health: MicTestHealth;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const DoraemonMonitorApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentDb, setCurrentDb] = useState(40);
  const [ambientDb, setAmbientDb] = useState(40);
  const [activityDb, setActivityDb] = useState(0);
  const [signalRange, setSignalRange] = useState(0);
  const [limit, setLimit] = useState(60);
  const [warnCount, setWarnCount] = useState(0);
  const [maxDb, setMaxDb] = useState(0);
  const [quietTime, setQuietTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [state, setState] = useState<MonitorState>('calm');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [timeStr, setTimeStr] = useState('');
  const [sensitivity, setSensitivity] = useState(50);
  const [showHelp, setShowHelp] = useState(false);
  const [showThresholdHelp, setShowThresholdHelp] = useState(false);
  const [captureSettings, setCaptureSettings] = useState<CaptureSettings | null>(null);
  const [micTestStage, setMicTestStage] = useState<MicTestStage>('idle');
  const [micTestCountdown, setMicTestCountdown] = useState(0);
  const [micTestResult, setMicTestResult] = useState<MicTestResult | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('doraemon_muted') === 'true';
    }
    return false;
  });
  const sensitivityRef = useRef(50);
  const micTestStageRef = useRef<MicTestStage>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const muteGainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const analyzeAudioRef = useRef<() => void>(() => {});
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmIgnoreUntilRef = useRef(0);
  const lastAlarmPlayedAtRef = useRef(0);
  const noiseFloorRef = useRef(40);
  const environmentDbRef = useRef(40);
  const recentDbRef = useRef<number[]>([]);
  const micTestStartRef = useRef(0);
  const quietTestSamplesRef = useRef<number[]>([]);
  const activeTestSamplesRef = useRef<number[]>([]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    micTestStageRef.current = micTestStage;
  }, [micTestStage]);

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

  const stopAudioMonitoring = useCallback(() => {
    workerRef.current?.postMessage('stop');
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    muteGainRef.current?.disconnect();
    muteGainRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    alarmIgnoreUntilRef.current = 0;
    lastAlarmPlayedAtRef.current = 0;
    environmentDbRef.current = 40;
  }, []);

  const finishMicTest = useCallback(() => {
    const quietAvg = average(quietTestSamplesRef.current);
    const activeAvg = average(activeTestSamplesRef.current);
    const allSamples = [...quietTestSamplesRef.current, ...activeTestSamplesRef.current];
    const overallMin = allSamples.length ? Math.min(...allSamples) : 0;
    const overallMax = allSamples.length ? Math.max(...allSamples) : 0;
    const dynamicRange = Math.max(0, activeAvg - quietAvg);

    let health: MicTestHealth = 'good';
    if (quietAvg >= 54) {
      health = 'noisy';
    } else if (dynamicRange < 3) {
      health = 'flat';
    } else if (dynamicRange < 6) {
      health = 'weak';
    }

    let recommendedSensitivity = sensitivityRef.current;
    if (health === 'noisy') {
      recommendedSensitivity = clamp(Math.round(sensitivityRef.current - 6), 30, 70);
    } else if (health === 'flat') {
      recommendedSensitivity = clamp(Math.round(sensitivityRef.current + 8), 35, 75);
    } else if (health === 'weak') {
      recommendedSensitivity = clamp(Math.round(sensitivityRef.current + 4), 35, 72);
    }

    const recommendedLimit = clamp(
      Math.round(quietAvg + Math.max(6, Math.min(10, dynamicRange * 0.9 || 6))),
      50,
      75
    );

    setMicTestResult({
      quietAvg,
      activeAvg,
      dynamicRange,
      overallMin,
      overallMax,
      recommendedSensitivity,
      recommendedLimit,
      health
    });
    setMicTestStage('done');
    setMicTestCountdown(0);
  }, []);

  const startMicTest = useCallback(() => {
    if (!isStarted) return;
    quietTestSamplesRef.current = [];
    activeTestSamplesRef.current = [];
    micTestStartRef.current = Date.now();
    setMicTestResult(null);
    setMicTestStage('quiet');
    setMicTestCountdown(8);
  }, [isStarted]);

  const applyMicTestRecommendation = useCallback(() => {
    if (!micTestResult) return;
    setSensitivity(micTestResult.recommendedSensitivity);
    setLimit(micTestResult.recommendedLimit);
  }, [micTestResult]);

  useEffect(() => {
    analyzeAudioRef.current = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => undefined);
      }

      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const x = (data[i] - 128) / 128;
        sum += x * x;
      }

      const rms = Math.sqrt(sum / data.length);
      const baseDb = clamp(rms > 0 ? (Math.log10(rms) * 20 + 100) : 35, 35, 120);
      const isIgnoringOwnAlarm = Date.now() < alarmIgnoreUntilRef.current;

      if (!Number.isFinite(noiseFloorRef.current) || noiseFloorRef.current <= 0) {
        noiseFloorRef.current = baseDb;
      }

      if (!isIgnoringOwnAlarm) {
        const floorGap = baseDb - noiseFloorRef.current;
        const floorFollowRate = floorGap < 0 ? 0.08 : floorGap < 2 ? 0.03 : floorGap < 6 ? 0.01 : 0.003;
        noiseFloorRef.current += (baseDb - noiseFloorRef.current) * floorFollowRate;
        noiseFloorRef.current = clamp(noiseFloorRef.current, 30, 80);
      }

      const sensitivityScale = 1 + ((sensitivityRef.current - 50) / 50) * 0.65;
      const adjustedDb = clamp(
        noiseFloorRef.current + (baseDb - noiseFloorRef.current) * sensitivityScale,
        35,
        120
      );
      const effectiveDb = isIgnoringOwnAlarm ? environmentDbRef.current : adjustedDb;

      if (!isIgnoringOwnAlarm) {
        environmentDbRef.current = adjustedDb;
      }

      recentDbRef.current.push(effectiveDb);
      if (recentDbRef.current.length > 40) {
        recentDbRef.current.shift();
      }

      const minRecent = Math.min(...recentDbRef.current);
      const maxRecent = Math.max(...recentDbRef.current);
      const recentRange = maxRecent - minRecent;
      const liveActivity = clamp(effectiveDb - noiseFloorRef.current, 0, 60);

      setAmbientDb(noiseFloorRef.current);
      setActivityDb(liveActivity);
      setSignalRange(recentRange);
      setCurrentDb(effectiveDb);
      setMaxDb(m => Math.max(m, effectiveDb));

      if (document.hidden) {
        document.title = t('doraemon.monitorTitle').replace('{db}', Math.round(effectiveDb).toString());
      } else {
        document.title = t('doraemon.appTitle');
      }

      const stage = micTestStageRef.current;
      if (stage === 'quiet' || stage === 'active') {
        const elapsed = Date.now() - micTestStartRef.current;
        const nextStage: MicTestStage = elapsed < 4000 ? 'quiet' : elapsed < 8000 ? 'active' : 'done';

        if (nextStage === 'quiet') {
          quietTestSamplesRef.current.push(effectiveDb);
        } else if (nextStage === 'active') {
          activeTestSamplesRef.current.push(effectiveDb);
          if (stage !== 'active') {
            setMicTestStage('active');
          }
        } else {
          finishMicTest();
          return;
        }

        setMicTestCountdown(Math.max(0, Math.ceil((8000 - elapsed) / 1000)));
      }
    };
  }, [finishMicTest, t]);

  useEffect(() => {
    const workerBlob = new Blob([`
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (interval) clearInterval(interval);
          interval = setInterval(() => self.postMessage('tick'), 100);
        } else if (e.data === 'stop') {
          if (interval) clearInterval(interval);
          interval = null;
        }
      };
    `], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(workerBlob));
    workerRef.current.onmessage = () => analyzeAudioRef.current();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => () => stopAudioMonitoring(), [stopAudioMonitoring]);

  const initApp = async () => {
    setIsLoading(true);
    setError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(t('doraemon.errors.startFailed') + t('doraemon.errors.browserNotSupported'));
      setIsLoading(false);
      return;
    }

    stopAudioMonitoring();
    setState('calm');
    setWarnCount(0);
    setMaxDb(0);
    setQuietTime(0);
    setTotalTime(0);
    setCurrentDb(40);
    setAmbientDb(40);
    setActivityDb(0);
    setSignalRange(0);
    setMicTestStage('idle');
    setMicTestCountdown(0);
    setMicTestResult(null);
    recentDbRef.current = [];
    noiseFloorRef.current = 40;
    environmentDbRef.current = 40;

    try {
      const supported = navigator.mediaDevices.getSupportedConstraints?.() || {};
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: supported.echoCancellation ? true : undefined,
          noiseSuppression: supported.noiseSuppression ? false : undefined,
          autoGainControl: supported.autoGainControl ? false : undefined,
          channelCount: supported.channelCount ? 1 : undefined
        }
      });

      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings?.() || {};
      streamRef.current = stream;
      setCaptureSettings({
        echoCancellation: typeof settings.echoCancellation === 'boolean' ? settings.echoCancellation : null,
        noiseSuppression: typeof settings.noiseSuppression === 'boolean' ? settings.noiseSuppression : null,
        autoGainControl: typeof settings.autoGainControl === 'boolean' ? settings.autoGainControl : null
      });

      track.onended = () => {
        stopAudioMonitoring();
        setIsStarted(false);
        setError(t('doraemon.errors.micDisconnected'));
      };

      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AC();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);
      const muteGain = context.createGain();
      muteGain.gain.value = 0;
      muteGainRef.current = muteGain;
      analyser.connect(muteGain);
      muteGain.connect(context.destination);
      setIsStarted(true);
      workerRef.current?.postMessage('start');
    } catch (err: any) {
      const name = err.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError(t('doraemon.errors.startFailed') + t('doraemon.errors.permissionDenied'));
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'DeviceNotFoundError') {
        setError(t('doraemon.errors.startFailed') + t('doraemon.errors.noMicFound'));
      } else {
        setError(t('doraemon.errors.startFailed') + t('doraemon.errors.unknownError') + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('doraemon_muted', String(next));
      if (next && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };
  const playAlarmSound = useCallback((withSpeech = true) => {
    if (!audioContextRef.current || isMuted) return;

    try {
      if (withSpeech && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(t('doraemon.quiet'));
        msg.lang = 'zh-CN';
        msg.rate = 1;
        msg.pitch = 0.85;
        msg.volume = 0.85;
        window.speechSynthesis.speak(msg);
      }

      if (navigator.vibrate) {
        navigator.vibrate([160, 80, 160]);
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined);
      }

      const currentTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, currentTime);
      osc.frequency.exponentialRampToValueAtTime(523.25, currentTime + 0.08);
      osc.frequency.setValueAtTime(440, currentTime + 0.16);
      osc.frequency.exponentialRampToValueAtTime(523.25, currentTime + 0.24);

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.12, currentTime + 0.03);
      gain.gain.linearRampToValueAtTime(0.12, currentTime + 0.22);
      gain.gain.linearRampToValueAtTime(0, currentTime + 0.28);

      osc.start(currentTime);
      osc.stop(currentTime + 0.28);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  }, [isMuted, t]);

  useEffect(() => {
    if (!isStarted) return;

    if (currentDb >= limit) {
      if (state !== 'alarm') {
        setState('alarm');
        setWarnCount(prev => prev + 1);
        setQuietTime(0);
      }
      return;
    }

    if (state !== 'calm') {
      setState('calm');
    }
  }, [currentDb, isStarted, limit, state]);

  useEffect(() => {
    if (state === 'alarm' && !isMuted) {
      const playLoop = () => {
        const now = Date.now();
        playAlarmSound(true);
        lastAlarmPlayedAtRef.current = now;
        alarmIgnoreUntilRef.current = now + 900;
      };

      if (Date.now() - lastAlarmPlayedAtRef.current > 1200) {
        playLoop();
      }

      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => {
          if (Date.now() - lastAlarmPlayedAtRef.current < 1200) return;
          playLoop();
        }, 1500);
      }
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [state, playAlarmSound, isMuted]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStarted) interval = setInterval(() => { setTotalTime(prev => prev + 1); if (state !== 'alarm') setQuietTime(prev => prev + 1); }, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [isStarted, state]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const captureModeText = captureSettings
    ? [
        `${t('doraemon.micTest.echo')}:${captureSettings.echoCancellation === true ? t('doraemon.micTest.on') : captureSettings.echoCancellation === false ? t('doraemon.micTest.off') : t('doraemon.micTest.unknown')}`,
        `${t('doraemon.micTest.noiseSuppression')}:${captureSettings.noiseSuppression === true ? t('doraemon.micTest.on') : captureSettings.noiseSuppression === false ? t('doraemon.micTest.off') : t('doraemon.micTest.unknown')}`,
        `${t('doraemon.micTest.autoGain')}:${captureSettings.autoGainControl === true ? t('doraemon.micTest.on') : captureSettings.autoGainControl === false ? t('doraemon.micTest.off') : t('doraemon.micTest.unknown')}`
      ].join(' · ')
    : '';

  const MicTestPanel = () => (
    <div className="controls-box diagnostic-box">
      <div className="slider-header">
        <span>{t('doraemon.micTest.title')}</span>
        <button
          className="diagnostic-action-btn"
          onClick={startMicTest}
          disabled={micTestStage === 'quiet' || micTestStage === 'active'}
        >
          {micTestStage === 'quiet' || micTestStage === 'active'
            ? t('doraemon.micTest.testing')
            : micTestResult
              ? t('doraemon.micTest.rerun')
              : t('doraemon.micTest.start')}
        </button>
      </div>

      <div className="diagnostic-grid">
        <div className="diagnostic-chip">
          <span>{t('doraemon.micTest.ambient')}</span>
          <strong>{Math.round(ambientDb)} dB</strong>
        </div>
        <div className="diagnostic-chip">
          <span>{t('doraemon.micTest.activity')}</span>
          <strong>{activityDb.toFixed(1)} dB</strong>
        </div>
        <div className="diagnostic-chip">
          <span>{t('doraemon.micTest.range')}</span>
          <strong>{signalRange.toFixed(1)} dB</strong>
        </div>
      </div>

      {captureModeText && <div className="capture-mode-note">{captureModeText}</div>}

      {(micTestStage === 'quiet' || micTestStage === 'active') && (
        <div className="mic-test-runner">
          <strong>{micTestStage === 'quiet' ? t('doraemon.micTest.stageQuiet') : t('doraemon.micTest.stageActive')}</strong>
          <p>{micTestStage === 'quiet' ? t('doraemon.micTest.stageQuietDesc') : t('doraemon.micTest.stageActiveDesc')}</p>
          <div className="mic-test-countdown">{micTestCountdown}s</div>
        </div>
      )}

      {micTestResult && (
        <div className={`mic-test-result ${micTestResult.health}`}>
          <div className="mic-test-result-title">
            {t(`doraemon.micTest.health.${micTestResult.health}`)}
          </div>
          <div className="mic-test-result-desc">
            {t(`doraemon.micTest.healthDesc.${micTestResult.health}`)}
          </div>
          <div className="mic-test-result-grid">
            <div>
              <span>{t('doraemon.micTest.quietAvg')}</span>
              <strong>{micTestResult.quietAvg.toFixed(1)} dB</strong>
            </div>
            <div>
              <span>{t('doraemon.micTest.activeAvg')}</span>
              <strong>{micTestResult.activeAvg.toFixed(1)} dB</strong>
            </div>
            <div>
              <span>{t('doraemon.micTest.dynamicRange')}</span>
              <strong>{micTestResult.dynamicRange.toFixed(1)} dB</strong>
            </div>
            <div>
              <span>{t('doraemon.micTest.overallRange')}</span>
              <strong>{micTestResult.overallMin.toFixed(1)}-{micTestResult.overallMax.toFixed(1)}</strong>
            </div>
          </div>
          <div className="mic-test-recommend">
            <div>{t('doraemon.micTest.recommendedSensitivity').replace('{value}', String(micTestResult.recommendedSensitivity))}</div>
            <div>{t('doraemon.micTest.recommendedThreshold').replace('{value}', String(micTestResult.recommendedLimit))}</div>
          </div>
          <button className="diagnostic-apply-btn" onClick={applyMicTestRecommendation}>
            {t('doraemon.micTest.apply')}
          </button>
        </div>
      )}
    </div>
  );

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

    // 恢复内联颜色逻辑
    // const activeTextColor = isDarkMode ? '#fff' : '#0f172a';
    // const textColor = isDarkMode ? '#94a3b8' : '#475569';
    // 改回这里
    const activeTextColor = '#0096E1';
    const textColor = isDarkMode ? '#94a3b8' : '#475569';

    return (
      <div className="reference-stack">
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
                <div style={{ position: 'absolute', right: '-12px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid #0096E1` }} />
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
        <MicTestPanel />
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
        <g><circle cx="88" cy="70" r="4" fill="#000" /><circle cx="112" cy="70" r="4" fill="#000" /></g>
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
          <button
            onClick={toggleMute}
            className="icon-btn"
            style={{ color: isMuted ? '#ff416c' : 'inherit' }}
            title={isMuted ? t('doraemon.unmute') : t('doraemon.mute')}
          >
            {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
          </button>
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

          <div className="controls-box" style={{ position: 'relative' }}>
            <div className="slider-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{t('doraemon.threshold')}</span>
                <button
                  onClick={() => setShowThresholdHelp(!showThresholdHelp)}
                  className="help-icon-btn"
                  title={t('doraemon.helpTitle')}
                >
                  <HelpCircle size={16} />
                </button>
              </div>
              <span className="threshold-value" style={{ color: isDarkMode ? '#00f260' : '#059669' }}>{limit} dB</span>
            </div>

            {showThresholdHelp && (
              <div className="help-tooltip">
                <div className="help-header">
                  <span>{t('doraemon.thresholdHelpTitle')}</span>
                  <button onClick={() => setShowThresholdHelp(false)} className="close-help-btn">
                    <X size={14} />
                  </button>
                </div>
                <div className="help-content">
                  <p><strong>{t('doraemon.threshold')}</strong>{t('doraemon.thresholdHelpDesc')}</p>
                </div>
                <div className="help-footer" onClick={() => setShowThresholdHelp(false)}>
                  {t('doraemon.tapToClose')}
                </div>
              </div>
            )}

            <input type="range" min="40" max="90" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="threshold-slider" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoraemonMonitorApp;


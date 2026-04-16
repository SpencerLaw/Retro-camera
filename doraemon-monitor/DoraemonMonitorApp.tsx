import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, RotateCcw, HelpCircle, X, Volume2, VolumeX, ChevronUp, ChevronDown, CalendarDays, Lock } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { isVerified, getSavedLicenseCode, verifyLicenseCode, clearLicense } from './utils/licenseManager';
import { shouldStopModalMouseDown } from './utils/modalPointerGuards.js';
import {
  clearWarningResetPasswordRecord,
  loadWarningResetPasswordRecord,
  saveWarningResetPasswordRecord,
  shouldRequireWarningResetPassword,
  validateWarningResetPasswordChange,
  validateWarningResetPasswordRemoval,
  verifyWarningResetPassword
} from './utils/warningResetPassword.js';
import LicenseInput from './components/LicenseInput';
import './doraemon-monitor.css';

type MonitorState = 'calm' | 'alarm';
type MicTestStage = 'idle' | 'quiet' | 'active' | 'done';
type MicTestHealth = 'good' | 'flat' | 'noisy' | 'weak';
type ReportWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
type WarningResetDialogMode = 'manage' | 'verify' | 'help' | 'clear';

interface WarningResetPasswordRecord {
  hash: string;
  updatedAt: string;
}

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

interface SessionReport {
  id: string;
  startedAt: string;
  endedAt: string | null;
  peakDb: number;
  quietSeconds: number;
  totalSeconds: number;
  warnCount: number;
  threshold: number;
  sensitivity: number;
  history?: number[]; // 新增字段：本场波动历史
}

const REPORT_STORAGE_KEY = 'doraemon_session_reports_v1';
const MAX_STORED_REPORTS = 180;
const REPORT_WEEKDAYS: Array<{ key: ReportWeekday; offset: number }> = [
  { key: 'mon', offset: 0 },
  { key: 'tue', offset: 1 },
  { key: 'wed', offset: 2 },
  { key: 'thu', offset: 3 },
  { key: 'fri', offset: 4 }
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toDateKey = (dateLike: string | Date) => {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : new Date(dateLike);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentWeekMonday = (baseDate = new Date()) => {
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diffToMonday);
  return monday;
};

const loadStoredReports = (): SessionReport[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SessionReport => (
        item && typeof item.id === 'string' && typeof item.startedAt === 'string'
      ))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, MAX_STORED_REPORTS);
  } catch {
    return [];
  }
};

const getReportWeekdayKey = (dateLike: Date | string): ReportWeekday | null => {
  const day = new Date(dateLike).getDay();
  if (day === 1) return 'mon';
  if (day === 2) return 'tue';
  if (day === 3) return 'wed';
  if (day === 4) return 'thu';
  if (day === 5) return 'fri';
  return null;
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
  const [isMicTestOpen, setIsMicTestOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeReportDay, setActiveReportDay] = useState<ReportWeekday>('mon');
  const [reportPage, setReportPage] = useState(0);
  const [sessionReports, setSessionReports] = useState<SessionReport[]>(() => loadStoredReports());
  const [captureSettings, setCaptureSettings] = useState<CaptureSettings | null>(null);
  const [micTestStage, setMicTestStage] = useState<MicTestStage>('idle');
  const [micTestResult, setMicTestResult] = useState<MicTestResult | null>(null);
  const [quietSnapshotAvg, setQuietSnapshotAvg] = useState<number | null>(null);
  const [activeSnapshotAvg, setActiveSnapshotAvg] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('doraemon_muted') === 'true';
    }
    return false;
  });
  const [warningResetPasswordRecord, setWarningResetPasswordRecord] = useState<WarningResetPasswordRecord | null>(() => loadWarningResetPasswordRecord());
  const [isWarningResetDialogOpen, setIsWarningResetDialogOpen] = useState(false);
  const [warningResetDialogMode, setWarningResetDialogMode] = useState<WarningResetDialogMode>('manage');
  const [warningResetCurrentPassword, setWarningResetCurrentPassword] = useState('');
  const [warningResetPasswordInput, setWarningResetPasswordInput] = useState('');
  const [warningResetPasswordConfirm, setWarningResetPasswordConfirm] = useState('');
  const [warningResetPasswordError, setWarningResetPasswordError] = useState('');
  const warningResetPasswordEnabled = shouldRequireWarningResetPassword(warningResetPasswordRecord);
  const isOverlayOpen = isMicTestOpen || isReportOpen || isWarningResetDialogOpen;
  const visualState: MonitorState = isOverlayOpen ? 'calm' : state;
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
  const alarmPendingSinceRef = useRef<number | null>(null);
  const alarmIgnoreUntilRef = useRef(0);
  const lastAlarmPlayedAtRef = useRef(0);
  const noiseFloorRef = useRef(40);
  const environmentDbRef = useRef(40);
  const recentDbRef = useRef<number[]>([]);
  const limitRef = useRef(60);
  const currentDbRef = useRef(40);
  const maxDbRef = useRef(0);
  const warnCountRef = useRef(0);
  const quietTimeRef = useRef(0);
  const totalTimeRef = useRef(0);
  const sessionReportsRef = useRef<SessionReport[]>(loadStoredReports());
  const activeSessionRef = useRef<{ id: string; startedAt: string } | null>(null);
  const sessionHistoryRef = useRef<number[]>([]); // 场次波动历史采样

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  useEffect(() => {
    micTestStageRef.current = micTestStage;
  }, [micTestStage]);

  useEffect(() => {
    currentDbRef.current = currentDb;
  }, [currentDb]);

  useEffect(() => {
    maxDbRef.current = maxDb;
  }, [maxDb]);

  useEffect(() => {
    warnCountRef.current = warnCount;
  }, [warnCount]);

  useEffect(() => {
    quietTimeRef.current = quietTime;
  }, [quietTime]);

  useEffect(() => {
    totalTimeRef.current = totalTime;
  }, [totalTime]);

  useEffect(() => {
    sessionReportsRef.current = sessionReports;
  }, [sessionReports]);

  useEffect(() => {
    const selectedDayCount = sessionReports.filter(
      report => getReportWeekdayKey(report.startedAt) === activeReportDay
    ).length;
    setReportPage(prev => Math.min(prev, Math.max(0, selectedDayCount - 1)));
  }, [activeReportDay, sessionReports]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMicTestOpen(false);
      setIsReportOpen(false);
      setShowHelp(false);
      setShowThresholdHelp(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const persistSessionReports = useCallback((nextReports: SessionReport[]) => {
    sessionReportsRef.current = nextReports;
    setSessionReports(nextReports);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(nextReports));
    }
  }, []);

  const beginSessionTracking = useCallback(() => {
    activeSessionRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date().toISOString()
    };
    sessionHistoryRef.current = [];
  }, []);

  const finalizeCurrentSession = useCallback(() => {
    const activeSession = activeSessionRef.current;
    if (!activeSession) return;

    const endedAt = new Date();
    const totalSeconds = totalTimeRef.current;
    
    // 压缩采样点至最多 20 个，平衡视觉与存储
    const rawHistory = sessionHistoryRef.current;
    const samplingRate = Math.max(1, Math.floor(rawHistory.length / 15));
    const history = rawHistory.filter((_, i) => i % samplingRate === 0).slice(0, 20);

    const nextRecord: SessionReport = {
      id: activeSession.id,
      startedAt: activeSession.startedAt,
      endedAt: endedAt.toISOString(),
      peakDb: Math.round(Math.max(maxDbRef.current, currentDbRef.current)),
      quietSeconds: Math.max(0, quietTimeRef.current),
      totalSeconds,
      warnCount: Math.max(0, warnCountRef.current),
      threshold: limitRef.current,
      sensitivity: sensitivityRef.current,
      history: history.length > 2 ? history : undefined
    };

    const nextReports = [
      nextRecord,
      ...sessionReportsRef.current.filter(report => report.id !== nextRecord.id)
    ]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, MAX_STORED_REPORTS);

    persistSessionReports(nextReports);
    activeSessionRef.current = null;
    sessionHistoryRef.current = [];
  }, [persistSessionReports]);

  const stopAudioMonitoring = useCallback(() => {
    workerRef.current?.postMessage('stop');
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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
    let health: MicTestHealth = quietAvg >= 54 ? 'noisy' : dynamicRange < 3 ? 'flat' : dynamicRange < 6 ? 'weak' : 'good';
    
    let recommendedSensitivity = sensitivityRef.current;
    if (health === 'noisy') recommendedSensitivity = clamp(Math.round(sensitivityRef.current - 6), 30, 70);
    else if (health === 'flat') recommendedSensitivity = clamp(Math.round(sensitivityRef.current + 8), 35, 75);
    else if (health === 'weak') recommendedSensitivity = clamp(Math.round(sensitivityRef.current + 4), 35, 72);

    const recommendedLimit = clamp(Math.round(quietAvg + Math.max(6, Math.min(10, dynamicRange * 0.9 || 6))), 50, 75);
    setMicTestResult({ quietAvg, activeAvg, dynamicRange, overallMin, overallMax, recommendedSensitivity, recommendedLimit, health });
    setMicTestStage('done');
  }, []);

  const startMicTest = useCallback(() => {
    if (!isStarted) return;
    setMicTestStage('quiet');
    setMicTestResult(null);
    setQuietSnapshotAvg(null);
    setActiveSnapshotAvg(null);
  }, [isStarted]);

  useEffect(() => {
    analyzeAudioRef.current = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume().catch(() => undefined);

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

      if (!isIgnoringOwnAlarm) {
        const floorGap = baseDb - noiseFloorRef.current;
        const floorFollowRate = floorGap < 0 ? 0.08 : floorGap < 2 ? 0.03 : floorGap < 6 ? 0.01 : 0.003;
        noiseFloorRef.current += (baseDb - noiseFloorRef.current) * floorFollowRate;
        noiseFloorRef.current = clamp(noiseFloorRef.current, 30, 80);
      }

      const ratio = sensitivityRef.current / 100;
      const adjustedDb = clamp(noiseFloorRef.current + (Math.max(0, baseDb - noiseFloorRef.current - (2 + (1 - ratio) * 11)) * (0.16 + ratio * 2.04)), 35, 120);
      const effectiveDb = isIgnoringOwnAlarm ? environmentDbRef.current : adjustedDb;

      if (!isIgnoringOwnAlarm) environmentDbRef.current = adjustedDb;
      recentDbRef.current.push(effectiveDb);
      if (recentDbRef.current.length > 40) recentDbRef.current.shift();

      setAmbientDb(noiseFloorRef.current);
      setActivityDb(clamp(adjustedDb - noiseFloorRef.current, 0, 60));
      setSignalRange(Math.max(...recentDbRef.current) - Math.min(...recentDbRef.current));
      setCurrentDb(effectiveDb);
      setMaxDb(m => Math.max(m, effectiveDb));

      // 实时采样：大约每 2.5 秒记录一次
      if (activeSessionRef.current && Date.now() % 2500 < 150) {
        sessionHistoryRef.current.push(effectiveDb);
      }
    };
  }, [t]);

  useEffect(() => {
    const workerBlob = new Blob([`let i = null; self.onmessage = e => { if (e.data === 'start') { if (i) clearInterval(i); i = setInterval(() => self.postMessage('t'), 100); } else if (e.data === 'stop') { clearInterval(i); i = null; } };`], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(workerBlob));
    workerRef.current.onmessage = () => analyzeAudioRef.current();
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const handlePageHide = () => { finalizeCurrentSession(); stopAudioMonitoring(); };
    window.addEventListener('pagehide', handlePageHide);
    return () => { window.removeEventListener('pagehide', handlePageHide); finalizeCurrentSession(); stopAudioMonitoring(); };
  }, [finalizeCurrentSession, stopAudioMonitoring]);

  const initApp = async () => {
    setIsLoading(true);
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError(t('doraemon.errors.startFailed')); setIsLoading(false); return; }
    finalizeCurrentSession(); stopAudioMonitoring();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;
      const analyser = context.createAnalyser(); analyser.fftSize = 512; analyserRef.current = analyser;
      const source = context.createMediaStreamSource(stream); sourceRef.current = source; source.connect(analyser);
      const muteGain = context.createGain(); muteGain.gain.value = 0; muteGainRef.current = muteGain; analyser.connect(muteGain); muteGain.connect(context.destination);
      beginSessionTracking(); setIsStarted(true); workerRef.current?.postMessage('start');
    } catch (err: any) { setError(t('doraemon.errors.startFailed')); } finally { setIsLoading(false); }
  };

  const playAlarmSound = useCallback((withSpeech = true) => {
    if (!audioContextRef.current || isMuted) return;
    try {
      if (withSpeech && window.speechSynthesis) { window.speechSynthesis.cancel(); const msg = new SpeechSynthesisUtterance(t('doraemon.quiet')); msg.lang = 'zh-CN'; window.speechSynthesis.speak(msg); }
      const ctx = audioContextRef.current; if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square'; osc.frequency.setValueAtTime(440, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.12, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.28);
    } catch (e) {}
  }, [isMuted, t]);

  useEffect(() => {
    if (!isStarted) return;
    if (currentDb >= limit) {
      if (state === 'alarm') return;
      if (alarmPendingSinceRef.current === null) { alarmPendingSinceRef.current = Date.now(); return; }
      if (Date.now() - alarmPendingSinceRef.current >= 2000) {
        setState('alarm'); setWarnCount(prev => prev + 1);
        setQuietTime(0); alarmPendingSinceRef.current = null;
      }
    } else { alarmPendingSinceRef.current = null; if (state !== 'calm') setState('calm'); }
  }, [currentDb, isStarted, limit, state]);

  useEffect(() => {
    if (state === 'alarm' && !isMuted && !isOverlayOpen) {
      const loop = () => { playAlarmSound(true); lastAlarmPlayedAtRef.current = Date.now(); alarmIgnoreUntilRef.current = Date.now() + 900; };
      if (!alarmIntervalRef.current) alarmIntervalRef.current = setInterval(loop, 1500);
    } else { if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; } }
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, [state, playAlarmSound, isMuted, isOverlayOpen]);

  useEffect(() => {
    let i: any = null;
    if (isStarted) i = setInterval(() => { setTotalTime(t => t + 1); if (state !== 'alarm') setQuietTime(q => q + 1); }, 1000);
    return () => clearInterval(i);
  }, [isStarted, state]);

  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatReportClock = (d: string) => { const date = new Date(d); return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`; };
  const formatReportDate = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;

  const weekStart = getCurrentWeekMonday();
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 4); weekEnd.setHours(23, 59, 59, 999);

  const reportDayGroups = REPORT_WEEKDAYS.map(({ key, offset }) => {
    const date = new Date(weekStart); date.setDate(weekStart.getDate() + offset);
    const dayKey = toDateKey(date);
    const records = sessionReports.filter(r => toDateKey(r.startedAt) === dayKey);
    return { key, label: t(`doraemon.report.days.${key}`), dateLabel: formatReportDate(date), records };
  });

  const selectedReportDay = reportDayGroups.find(g => g.key === activeReportDay) ?? reportDayGroups[0];
  const selectedReportIndex = clamp(reportPage, 0, Math.max(0, selectedReportDay.records.length - 1));
  const selectedReportRecord = selectedReportDay.records[selectedReportIndex] ?? null;
  const hasPreviousReport = selectedReportIndex > 0;
  const hasNextReport = selectedReportIndex < selectedReportDay.records.length - 1;

  const handleSelectReportDay = (e: any, k: any) => { e.preventDefault(); setActiveReportDay(k); setReportPage(0); };
  const handleReportSessionMove = (e: any, d: any) => { e.preventDefault(); setReportPage(p => clamp(p + d, 0, selectedReportDay.records.length - 1)); };

  const ReportDrawer = () => {
    if (!isReportOpen) return null;
    return (
      <div className="report-modal-layer open">
        <button type="button" className="report-modal-backdrop" onClick={() => setIsReportOpen(false)} />
        <div className="report-modal-shell" onClick={e => e.stopPropagation()}>
          <div className="report-modal-header">
            <div className="report-drawer-heading"><CalendarDays size={18} /><div><strong>{t('doraemon.report.title')}</strong><p>仅保存在本地</p></div></div>
            <button className="report-modal-close" onClick={() => setIsReportOpen(false)}><X size={16} /></button>
          </div>
          <div className="report-modal-body">
            <div className="report-modal-week">{formatReportDate(weekStart)} - {formatReportDate(weekEnd)}</div>
            <div className="report-summary-grid">
              <div className="report-summary-card"><span>总场次</span><strong>{sessionReports.length}</strong></div>
              <div className="report-summary-card peak"><span>周峰值</span><strong>{sessionReports.length ? Math.max(...sessionReports.map(r => r.peakDb)) : 0}dB</strong></div>
            </div>
            <div className="report-viewer-layout">
              <div className="report-day-sidebar">
                {reportDayGroups.map(g => (
                  <button key={g.key} className={`report-day-chip ${g.key === selectedReportDay.key ? 'selected' : ''}`} onPointerDown={e => handleSelectReportDay(e, g.key)}>
                    <div className="report-day-chip-copy"><span>{g.label}</span><small>{g.dateLabel}</small></div>
                    <strong>{g.records.length}</strong>
                  </button>
                ))}
              </div>
              <section className="report-focus-shell">
                <div className="report-day-header">
                  <div><strong>{selectedReportDay.label}</strong><span>{selectedReportDay.dateLabel}</span></div>
                  <span className="report-day-count">{selectedReportDay.records.length} 场记录</span>
                </div>
                {selectedReportRecord ? (
                  <>
                    <div className="report-nav-row">
                      <button className="report-nav-btn" onPointerDown={e => handleReportSessionMove(e, -1)} disabled={!hasPreviousReport}>上一场</button>
                      <span className="report-nav-status">{selectedReportIndex + 1} / {selectedReportDay.records.length}</span>
                      <button className="report-nav-btn" onPointerDown={e => handleReportSessionMove(e, 1)} disabled={!hasNextReport}>下一场</button>
                    </div>
                    <article className="report-focus-card">
                      <div className="report-focus-top">
                        <div className="report-time-cell"><strong>{formatReportClock(selectedReportRecord.startedAt)} - {selectedReportRecord.endedAt ? formatReportClock(selectedReportRecord.endedAt) : "运行中"}</strong></div>
                        <span className="report-peak-pill">{selectedReportRecord.peakDb} dB</span>
                      </div>

                      {/* 本场精简曲线图 */}
                      <div className="report-session-trend">
                        {(() => {
                          const h = selectedReportRecord.history || [];
                          if (h.length < 2) return <div className="trend-empty-hint">结束本场后生成分贝曲线</div>;
                          const hMax = Math.max(...h), hMin = Math.min(...h);
                          const cMax = Math.max(hMax, selectedReportRecord.threshold + 5), cMin = Math.min(hMin, 35);
                          const r = Math.max(1, cMax - cMin);
                          const pts = h.map((v, i) => `${(i / (h.length - 1)) * 100},${100 - ((v - cMin) / r) * 100}`).join(' ');
                          return (
                            <div className="trend-mini-wrapper">
                              <div className="trend-labels"><span>{hMax} Max</span><span>{hMin} Min</span></div>
                              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="trend-mini-svg">
                                <path d={`M ${pts}`} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="0" y1={100 - ((selectedReportRecord.threshold - cMin) / r) * 100} x2="100" y2={100 - ((selectedReportRecord.threshold - cMin) / r) * 100} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                              </svg>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="report-focus-grid">
                        <div className="report-session-metric"><span>时长</span><strong>{formatTime(selectedReportRecord.totalSeconds)}</strong></div>
                        <div className="report-session-metric"><span>安静</span><strong>{formatTime(selectedReportRecord.quietSeconds)}</strong></div>
                        <div className="report-session-metric"><span>警告</span><strong>{selectedReportRecord.warnCount}</strong></div>
                        <div className="report-session-metric"><span>配置</span><strong>{selectedReportRecord.threshold}dB</strong></div>
                      </div>
                    </article>
                  </>
                ) : <div className="report-empty-state">暂无记录</div>}
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWarningResetDialog = () => {
    if (!isWarningResetDialogOpen) return null;
    return (
      <div className="floating-modal-layer open">
        <button type="button" className="floating-modal-backdrop" onClick={() => setIsWarningResetDialogOpen(false)} />
        <div className="floating-modal-shell">
           <div className="floating-modal-header"><strong>提醒重置设置</strong><button onClick={() => setIsWarningResetDialogOpen(false)}><X size={16} /></button></div>
           <div className="floating-modal-body">
             {/* 极简版重置界面 */}
             <button className="warning-reset-primary-btn" onClick={() => { setWarnCount(0); setIsWarningResetDialogOpen(false); }}>确认重置次数</button>
           </div>
        </div>
      </div>
    );
  };

  const NoiseLevelReference = () => (
    <div className="db-reference-panel">
      <div className="reference-title">环境参考</div>
      <div className="vertical-meter-container">
        <div className="level-nodes">
          <div style={{ color: currentDb >= 80 ? '#0096E1' : '#94a3b8' }}>喧闹</div>
          <div style={{ color: currentDb >= 60 && currentDb < 80 ? '#0096E1' : '#94a3b8' }}>正常</div>
          <div style={{ color: currentDb >= 40 && currentDb < 60 ? '#0096E1' : '#94a3b8' }}>安静</div>
          <div style={{ color: currentDb < 40 ? '#0096E1' : '#94a3b8' }}>极静</div>
        </div>
      </div>
    </div>
  );

  const Visualizer = () => (
    <div className="visualizer-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="wave-bar" style={{ height: `${20 + Math.random() * (currentDb - 35)}%`, opacity: 0.6, background: '#3b82f6' }} />
      ))}
    </div>
  );

  const DoraemonSVG = () => (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2" /><circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2" />
      <circle cx="82" cy="70" r="15" fill="#FFF" stroke="#333" strokeWidth="2" /><circle cx="118" cy="70" r="15" fill="#FFF" stroke="#333" strokeWidth="2" />
      <circle cx="88" cy="70" r="4" fill="#000" /><circle cx="112" cy="70" r="4" fill="#000" />
      <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2" />
      {state === 'alarm' ? <ellipse cx="100" cy="155" rx="30" ry="20" fill="#D9002E" stroke="#333" /> : <path d="M 60 140 Q 100 180 140 140" stroke="#333" strokeWidth="3" fill="none" />}
    </svg>
  );

  if (isLicensed === false) return <LicenseInput onVerified={() => setIsLicensed(true)} />;
  if (!isStarted) return <div className="doraemon-start-layer"><button onClick={() => navigate('/')} className="back-btn"><ArrowLeft size={32} /></button><div style={{ width: 200, height: 200 }}><DoraemonSVG /></div><h1>哆啦A梦纪律监测</h1><button className="doraemon-btn-big" onClick={initApp}>开启监测</button></div>;

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${state === 'alarm' ? 'alarm-mode' : ''}`}>
      <header className="doraemon-header">
        <button onClick={() => navigate('/')} className="icon-btn"><ArrowLeft size={32} /></button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{timeStr}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setIsReportOpen(true)} className="report-header-btn">查看报告</button>
          <button onClick={toggleMute} className="icon-btn">{isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">{isDarkMode ? '🌞' : '🌙'}</button>
        </div>
      </header>
      <main className="doraemon-main">
        <NoiseLevelReference />
        <div className="center-display">
          <div className="doraemon-wrapper" style={{ transform: `scale(${1 + (currentDb - 40) / 200})` }}><DoraemonSVG /></div>
          <div className="db-display"><strong>{Math.round(currentDb)}</strong><span>dB</span></div>
          <Visualizer />
        </div>
        <div className="right-panel">
          <div className="stat-box"><span>安静时长</span><strong>{formatTime(quietTime)}</strong></div>
          <div className="stat-box"><span>监测总长</span><strong>{formatTime(totalTime)}</strong></div>
          <div className="stat-box" onClick={() => setIsWarningResetDialogOpen(true)} style={{ cursor: 'pointer' }}><span>警告次数</span><strong style={{ color: '#ef4444' }}>{warnCount}</strong></div>
          <div className="stat-box"><span>本次峰值</span><strong>{Math.round(maxDb)}</strong></div>
          <div className="controls-box"><span>灵敏度: {sensitivity}%</span><input type="range" value={sensitivity} onChange={e => setSensitivity(+e.target.value)} /></div>
          <div className="controls-box"><span>阈值: {limit}dB</span><input type="range" min="40" max="90" value={limit} onChange={e => setLimit(+e.target.value)} /></div>
        </div>
      </main>
      <ReportDrawer />
      {renderWarningResetDialog()}
    </div>
  );
};

export default DoraemonMonitorApp;

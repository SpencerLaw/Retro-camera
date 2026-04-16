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
  history?: number[]; // 本场采样历史
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
const average = (values: number[]) => values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

const toDateKey = (dateLike: string | Date) => {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

const getCurrentWeekMonday = (baseDate = new Date()) => {
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return monday;
};

const loadStoredReports = (): SessionReport[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const getReportWeekdayKey = (dateLike: Date | string): ReportWeekday | null => {
  const d = new Date(dateLike).getDay();
  return d === 1 ? 'mon' : d === 2 ? 'tue' : d === 3 ? 'wed' : d === 4 ? 'thu' : d === 5 ? 'fri' : null;
};

/**
 * 曲线平滑路径构建 (参考早读树算法)
 */
const buildSmoothCurvePath = (points: Array<{x: number, y: number}>) => {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i !== points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6);
    const cp1y = p1.y + ((p2.y - p0.y) / 6);
    const cp2x = p2.x - ((p3.x - p1.x) / 6);
    const cp2y = p2.y - ((p3.y - p1.y) / 6);

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
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
  const [isMuted, setIsMuted] = useState<boolean>(() => typeof window !== 'undefined' ? localStorage.getItem('doraemon_muted') === 'true' : false);
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
  const micTestWindowRef = useRef<number[]>([]);
  const quietTestSamplesRef = useRef<number[]>([]);
  const activeTestSamplesRef = useRef<number[]>([]);
  const limitRef = useRef(60);
  const currentDbRef = useRef(40);
  const maxDbRef = useRef(0);
  const warnCountRef = useRef(0);
  const quietTimeRef = useRef(0);
  const totalTimeRef = useRef(0);
  const sessionReportsRef = useRef<SessionReport[]>(loadStoredReports());
  const activeSessionRef = useRef<{ id: string; startedAt: string } | null>(null);
  const sessionHistoryRef = useRef<number[]>([]);
  const sampleCounterRef = useRef(0);

  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { limitRef.current = limit; }, [limit]);
  useEffect(() => { micTestStageRef.current = micTestStage; }, [micTestStage]);
  useEffect(() => { currentDbRef.current = currentDb; }, [currentDb]);
  useEffect(() => { maxDbRef.current = maxDb; }, [maxDb]);
  useEffect(() => { warnCountRef.current = warnCount; }, [warnCount]);
  useEffect(() => { quietTimeRef.current = quietTime; }, [quietTime]);
  useEffect(() => { totalTimeRef.current = totalTime; }, [totalTime]);
  useEffect(() => { sessionReportsRef.current = sessionReports; }, [sessionReports]);

  useEffect(() => {
    const dCount = sessionReports.filter(r => getReportWeekdayKey(r.startedAt) === activeReportDay).length;
    setReportPage(prev => Math.min(prev, Math.max(0, dCount - 1)));
  }, [activeReportDay, sessionReports]);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(`${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`);
    };
    updateTime(); const t = setInterval(updateTime, 1000); return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const code = getSavedLicenseCode();
    if (isVerified() && code) {
      verifyLicenseCode(code).then(res => {
        if (res.success) setIsLicensed(true);
        else {
          setAuthError(res.message); clearLicense();
          const t = setInterval(() => setCountdown(p => { if(p<=1){clearInterval(t);window.location.replace('/');return 0;}return p-1;}), 1000);
        }
      });
    } else setIsLicensed(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsMicTestOpen(false); setIsReportOpen(false); setShowHelp(false); setShowThresholdHelp(false); } };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const persistSessionReports = useCallback((next: SessionReport[]) => {
    sessionReportsRef.current = next; setSessionReports(next);
    if (typeof window !== 'undefined') localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const beginSessionTracking = useCallback(() => {
    activeSessionRef.current = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, startedAt: new Date().toISOString() };
    sessionHistoryRef.current = []; sampleCounterRef.current = 0;
  }, []);

  const finalizeCurrentSession = useCallback(() => {
    const active = activeSessionRef.current; if (!active) return;
    const endedAt = new Date();
    const totalSeconds = totalTimeRef.current;
    const raw = [...sessionHistoryRef.current];
    let history: number[] | undefined = undefined;
    if (raw.length > 0) {
      const rate = Math.max(1, Math.floor(raw.length / 20));
      history = raw.filter((_, i) => i % rate === 0).slice(0, 20);
    }
    const next: SessionReport = {
      id: active.id, startedAt: active.startedAt, endedAt: endedAt.toISOString(),
      peakDb: Math.round(maxDbRef.current), quietSeconds: quietTimeRef.current, totalSeconds,
      warnCount: warnCountRef.current, threshold: limitRef.current, sensitivity: sensitivityRef.current,
      history: (history && history.length >= 2) ? history : undefined
    };
    const reports = [next, ...sessionReportsRef.current.filter(r => r.id !== next.id)].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, MAX_STORED_REPORTS);
    persistSessionReports(reports); activeSessionRef.current = null; sessionHistoryRef.current = [];
  }, [persistSessionReports]);

  const stopAudioMonitoring = useCallback(() => {
    workerRef.current?.postMessage('stop');
    if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    sourceRef.current?.disconnect(); sourceRef.current = null;
    muteGainRef.current?.disconnect(); muteGainRef.current = null;
    analyserRef.current?.disconnect(); analyserRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => undefined); audioContextRef.current = null; }
    alarmIgnoreUntilRef.current = 0; lastAlarmPlayedAtRef.current = 0; environmentDbRef.current = 40;
  }, []);

  const finishMicTest = useCallback(() => {
    const qAvg = average(quietTestSamplesRef.current);
    const aAvg = average(activeTestSamplesRef.current);
    const dRange = Math.max(0, aAvg - qAvg);
    let h: MicTestHealth = qAvg >= 54 ? 'noisy' : dRange < 3 ? 'flat' : dRange < 6 ? 'weak' : 'good';
    let rS = sensitivityRef.current;
    if (h === 'noisy') rS = clamp(Math.round(rS - 6), 30, 70);
    else if (h === 'flat') rS = clamp(Math.round(rS + 8), 35, 75);
    else if (h === 'weak') rS = clamp(Math.round(rS + 4), 35, 72);
    const rL = clamp(Math.round(qAvg + Math.max(6, Math.min(10, dRange * 0.9 || 6))), 50, 75);
    setMicTestResult({ quietAvg: qAvg, activeAvg: aAvg, dynamicRange: dRange, overallMin: 0, overallMax: 0, recommendedSensitivity: rS, recommendedLimit: rL, health: h });
    micTestStageRef.current = 'done'; setMicTestStage('done');
  }, []);

  const startMicTest = useCallback(() => {
    if (!isStarted) return;
    quietTestSamplesRef.current = []; activeTestSamplesRef.current = []; micTestWindowRef.current = [];
    micTestStageRef.current = 'quiet'; setMicTestResult(null); setQuietSnapshotAvg(null); setActiveSnapshotAvg(null); setMicTestStage('quiet');
  }, [isStarted]);

  const captureQuietMicTest = useCallback(() => {
    if (!isStarted) return;
    const snap = micTestWindowRef.current.length ? [...micTestWindowRef.current] : [currentDb];
    quietTestSamplesRef.current = snap; activeTestSamplesRef.current = []; micTestWindowRef.current = [];
    micTestStageRef.current = 'active'; setQuietSnapshotAvg(average(snap)); setMicTestStage('active');
  }, [currentDb, isStarted]);

  const captureActiveMicTest = useCallback(() => {
    if (!isStarted || quietTestSamplesRef.current.length === 0) return;
    const snap = micTestWindowRef.current.length ? [...micTestWindowRef.current] : [currentDb];
    activeTestSamplesRef.current = snap; setActiveSnapshotAvg(average(snap)); finishMicTest();
  }, [currentDb, finishMicTest, isStarted]);

  const applyMicTestRecommendation = useCallback(() => { if (micTestResult) { setSensitivity(micTestResult.recommendedSensitivity); setLimit(micTestResult.recommendedLimit); } }, [micTestResult]);

  useEffect(() => {
    analyzeAudioRef.current = () => {
      const a = analyserRef.current; if (!a) return;
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume().catch(() => undefined);
      const data = new Uint8Array(a.fftSize); a.getByteTimeDomainData(data);
      let s = 0; for (let i = 0; i < data.length; i++) { const x = (data[i] - 128) / 128; s += x * x; }
      const rms = Math.sqrt(s / data.length);
      const bDb = clamp(rms > 0 ? (Math.log10(rms) * 20 + 100) : 35, 35, 120);
      const isIgnoring = Date.now() < alarmIgnoreUntilRef.current;
      if (!isIgnoring) {
        const gap = bDb - noiseFloorRef.current;
        const rate = gap < 0 ? 0.08 : gap < 2 ? 0.03 : gap < 6 ? 0.01 : 0.003;
        noiseFloorRef.current += (bDb - noiseFloorRef.current) * rate;
        noiseFloorRef.current = clamp(noiseFloorRef.current, 30, 80);
      }
      const ratio = sensitivityRef.current / 100;
      const dAbove = Math.max(0, bDb - noiseFloorRef.current - (2 + (1 - ratio) * 11));
      const scale = 0.16 + ratio * 2.04;
      const adjDb = clamp(noiseFloorRef.current + (dAbove * scale), 35, 120);
      const eDb = isIgnoring ? environmentDbRef.current : adjDb;
      if (!isIgnoring) environmentDbRef.current = adjDb;
      recentDbRef.current.push(eDb); if (recentDbRef.current.length > 40) recentDbRef.current.shift();
      setAmbientDb(noiseFloorRef.current); setActivityDb(clamp(dAbove * scale, 0, 60)); setSignalRange(Math.max(...recentDbRef.current) - Math.min(...recentDbRef.current));
      currentDbRef.current = eDb; setCurrentDb(eDb); setMaxDb(m => { const n = Math.max(m, eDb); maxDbRef.current = n; return n; });
      if (activeSessionRef.current) { sampleCounterRef.current++; if (sampleCounterRef.current >= 25) { sessionHistoryRef.current.push(Math.round(eDb)); sampleCounterRef.current = 0; } }
      const st = micTestStageRef.current; if (st === 'quiet' || st === 'active') { micTestWindowRef.current.push(eDb); if (micTestWindowRef.current.length > 15) micTestWindowRef.current.shift(); }
    };
  }, [finishMicTest, t]);

  useEffect(() => {
    const b = new Blob([`let i = null; self.onmessage = e => { if (e.data === 'start') { if (i) clearInterval(i); i = setInterval(() => self.postMessage('t'), 100); } else if (e.data === 'stop') { clearInterval(i); i = null; } };`], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(b));
    workerRef.current.onmessage = () => analyzeAudioRef.current();
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  useEffect(() => {
    const h = () => { finalizeCurrentSession(); stopAudioMonitoring(); };
    window.addEventListener('pagehide', h); return () => { window.removeEventListener('pagehide', h); finalizeCurrentSession(); stopAudioMonitoring(); };
  }, [finalizeCurrentSession, stopAudioMonitoring]);

  const initApp = async () => {
    setIsLoading(true); setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setError(t('doraemon.errors.startFailed') + t('doraemon.errors.browserNotSupported')); setIsLoading(false); return; }
    finalizeCurrentSession(); stopAudioMonitoring();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = s; const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); audioContextRef.current = ctx;
      const a = ctx.createAnalyser(); a.fftSize = 512; analyserRef.current = a;
      const src = ctx.createMediaStreamSource(s); sourceRef.current = src; src.connect(a);
      const mG = ctx.createGain(); mG.gain.value = 0; muteGainRef.current = mG; a.connect(mG); mG.connect(ctx.destination);
      beginSessionTracking(); setIsStarted(true); workerRef.current?.postMessage('start');
    } catch (e) { setError(t('doraemon.errors.startFailed')); } finally { setIsLoading(false); }
  };

  const toggleMute = () => { setIsMuted(p => { const n = !p; localStorage.setItem('doraemon_muted', String(n)); if (n && window.speechSynthesis) window.speechSynthesis.cancel(); return n; }); };
  const playAlarmSound = useCallback((wS = true) => {
    if (!audioContextRef.current || isMuted) return;
    try {
      if (wS && window.speechSynthesis) { window.speechSynthesis.cancel(); const m = new SpeechSynthesisUtterance(t('doraemon.quiet')); m.lang = 'zh-CN'; window.speechSynthesis.speak(m); }
      const ctx = audioContextRef.current; if (ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
      o.type = 'square'; o.frequency.setValueAtTime(440, ctx.currentTime); o.start(); o.stop(ctx.currentTime + 0.28);
      g.gain.setValueAtTime(0.12, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.28);
    } catch (e) {}
  }, [isMuted, t]);

  useEffect(() => {
    if (!isStarted) return;
    if (currentDb >= limit) {
      if (state === 'alarm') return;
      if (alarmPendingSinceRef.current === null) { alarmPendingSinceRef.current = Date.now(); return; }
      if (Date.now() - alarmPendingSinceRef.current >= 2000) { setState('alarm'); setWarnCount(p => { const n = p + 1; warnCountRef.current = n; return n; }); setQuietTime(0); quietTimeRef.current = 0; alarmPendingSinceRef.current = null; }
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
    if (isStarted) i = setInterval(() => { setTotalTime(p => { const n = p + 1; totalTimeRef.current = n; return n; }); if (state !== 'alarm') setQuietTime(p => { const n = p + 1; quietTimeRef.current = n; return n; }); }, 1000);
    return () => clearInterval(i);
  }, [isStarted, state]);

  const toggleFullscreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatReportClock = (d: string) => { const dt = new Date(d); return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`; };
  const formatReportDate = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  
  const formatPreciseClock = (dateLike: string | number | Date) => {
    const d = new Date(dateLike);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const weekStart = getCurrentWeekMonday();
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 4); weekEnd.setHours(23, 59, 59, 999);
  const reportDayGroups = REPORT_WEEKDAYS.map(({ key, offset }) => {
    const dt = new Date(weekStart); dt.setDate(weekStart.getDate() + offset);
    const dk = toDateKey(dt); const rcs = sessionReports.filter(r => toDateKey(r.startedAt) === dk);
    return { key, label: t(`doraemon.report.days.${key}`), dateLabel: formatReportDate(dt), records: rcs };
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

                      {/* 本场精简曲线图 (参考早读树优化) */}
                      <div className="report-session-trend">
                        {(() => {
                          const h = selectedReportRecord.history || [];
                          if (h.length < 2) return <div className="trend-empty-hint">结束本场后生成分贝曲线</div>;
                          
                          const hMax = Math.max(...h);
                          const hMin = Math.min(...h);
                          const peakIdx = h.indexOf(hMax);
                          const lowIdx = h.indexOf(hMin);
                          
                          const cMax = Math.max(hMax + 5, (selectedReportRecord.threshold || 60) + 10);
                          const cMin = Math.max(0, Math.min(hMin - 5, 30));
                          const r = Math.max(20, cMax - cMin);
                          
                          const width = 100;
                          const height = 100;
                          const pts = h.map((v, i) => ({
                            x: (i / (h.length - 1)) * width,
                            y: height - ((v - cMin) / r) * height
                          }));

                          const linePath = buildSmoothCurvePath(pts);
                          const thresholdY = height - (((selectedReportRecord.threshold || 60) - cMin) / r) * height;

                          const startTime = new Date(selectedReportRecord.startedAt).toLocaleTimeString('zh-CN', { hour12: false });
                          const endTime = selectedReportRecord.endedAt ? new Date(selectedReportRecord.endedAt).toLocaleTimeString('zh-CN', { hour12: false }) : "进行中";

                          return (
                            <div className="trend-morning-tree-wrapper">
                              {/* 极值气泡 - 最高 */}
                              <div className="trend-bubble peak" style={{ left: `${pts[peakIdx].x}%`, top: `${pts[peakIdx].y}%` }}>
                                <span>最高 {hMax}dB</span>
                              </div>
                              
                              {/* 极值气泡 - 最低 */}
                              <div className="trend-bubble low" style={{ left: `${pts[lowIdx].x}%`, top: `${pts[lowIdx].y}%` }}>
                                <span>最低 {hMin}dB</span>
                              </div>

                              <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="trend-morning-tree-svg">
                                <defs>
                                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0096E1" stopOpacity="0.24" />
                                    <stop offset="100%" stopColor="#0096E1" stopOpacity="0" />
                                  </linearGradient>
                                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                  </filter>
                                </defs>

                                {/* 背景参考线 */}
                                <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                                <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                                
                                {/* 阈值虚线 */}
                                <line x1="0" y1={thresholdY} x2="100" y2={thresholdY} stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
                                
                                {/* 填充区域 */}
                                <path d={fillPath} fill="url(#areaGradient)" />
                                
                                {/* 核心曲线 */}
                                <path d={linePath} fill="none" stroke="#0096E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                                
                                {/* 标记点 */}
                                <circle cx={pts[peakIdx].x} cy={pts[peakIdx].y} r="2" fill="#fff" />
                                <circle cx={pts[lowIdx].x} cy={pts[lowIdx].y} r="2" fill="#fff" />
                              </svg>
                              
                              <div className="trend-morning-tree-footer">
                                <span>开始 {startTime}</span>
                                <span>结束 {endTime}</span>
                              </div>
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

  const NoiseLevelReference = () => {
    const pointerPos = Math.min(100, Math.max(0, currentDb));
    return (
      <div className="db-reference-panel">
        <div className="reference-title">{t('doraemon.dbReference')}</div>
        <div className="vertical-meter-container">
          <div style={{ position: 'relative', width: '12px' }}>
            <div className="meter-bar-bg"><div className="meter-gradient-fill"></div></div>
            <div className="current-level-pointer" style={{ bottom: `${pointerPos}%` }}><div style={{ position: 'absolute', right: '-12px', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid #0096E1` }} /></div>
          </div>
          <div className="level-nodes">
            {[t('doraemon.levels.l80'), t('doraemon.levels.l60'), t('doraemon.levels.l40'), t('doraemon.levels.l20'), t('doraemon.levels.l0')].map((l, i) => (
              <div key={i} style={{ color: isDarkMode ? '#94a3b8' : '#475569', opacity: 0.5, fontSize: '0.9rem' }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Visualizer = () => {
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    return (
      <div className="visualizer-container">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="wave-bar" style={{ height: `${10 + Math.random() * (currentDb - 30)}%`, background: `hsl(${hue}, 95%, 50%)`, opacity: 0.6 }} />
        ))}
      </div>
    );
  };

  const DoraemonSVG = () => (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <circle cx="100" cy="100" r="90" fill="#0096E1" stroke="#333" strokeWidth="2" /><circle cx="100" cy="115" r="70" fill="#FFFFFF" stroke="#333" strokeWidth="2" /><ellipse cx="82" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2" /><ellipse cx="118" cy="70" rx="18" ry="22" fill="#FFFFFF" stroke="#333" strokeWidth="2" />
      {visualState === 'alarm' ? (
        <g stroke="#333" strokeWidth="5"><line x1="70" y1="60" x2="90" y2="80" /><line x1="90" y1="60" x2="70" y2="80" /><line x1="110" y1="60" x2="130" y2="80" /><line x1="130" y1="60" x2="110" y2="80" /></g>
      ) : (
        <g><circle cx="88" cy="70" r="4" fill="#000" /><circle cx="112" cy="70" r="4" fill="#000" /></g>
      )}
      <circle cx="100" cy="92" r="10" fill="#D9002E" stroke="#333" strokeWidth="2" /><line x1="100" y1="102" x2="100" y2="145" stroke="#333" strokeWidth="2" />
      {visualState === 'alarm' ? <ellipse cx="100" cy="155" rx="30" ry="25" fill="#D9002E" stroke="#333" strokeWidth="2" /> : <path d="M 55 135 Q 100 185 145 135" stroke="#333" strokeWidth="2" fill="none" />}
      <path d="M 30 165 Q 100 200 170 165 L 170 180 Q 100 215 30 180 Z" fill="#D9002E" stroke="#333" strokeWidth="2" /><circle cx="100" cy="185" r="15" fill="#F3C018" stroke="#333" strokeWidth="2" />
    </svg>
  );

  const renderWarningResetDialog = () => {
    if (!isWarningResetDialogOpen) return null;
    return (
      <div className="floating-modal-layer open">
        <button type="button" className="floating-modal-backdrop" onClick={() => setIsWarningResetDialogOpen(false)} />
        <div className="floating-modal-shell" style={{ padding: '30px' }}>
           <h2 style={{ marginBottom: '20px' }}>确认重置警告次数？</h2>
           <button className="warning-reset-primary-btn" onClick={() => { setWarnCount(0); setIsWarningResetDialogOpen(false); }}>确认重置</button>
        </div>
      </div>
    );
  };

  if (isLicensed === false) return <LicenseInput onVerified={() => setIsLicensed(true)} />;
  if (!isStarted) return <div className="doraemon-start-layer"><button onClick={() => navigate('/')} className="back-btn"><ArrowLeft size={32} /></button><div style={{ width: 250, height: 250 }}><DoraemonSVG /></div><h1>{t('doraemon.title')}</h1><button className="doraemon-btn-big" onClick={initApp}>{t('doraemon.startMonitor')}</button></div>;

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${visualState === 'alarm' ? 'alarm-mode' : ''}`}>
      <header className="doraemon-header">
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => navigate('/')} className="icon-btn"><ArrowLeft size={32} /></button>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{timeStr}</div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setIsReportOpen(true)} className="report-header-btn">查看报告</button>
          <button onClick={toggleMute} className="icon-btn">{isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">{isDarkMode ? '🌞' : '🌙'}</button>
        </div>
      </header>
      <main className="doraemon-main">
        <NoiseLevelReference />
        <div className="center-display">
          <div className="doraemon-wrapper" style={{ transform: `scale(${1 + (currentDb - 40) / 150})` }}><DoraemonSVG /></div>
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

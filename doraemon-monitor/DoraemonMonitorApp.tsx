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
import { useDragScroll } from './hooks/useDragScroll';
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

type SessionHistoryPoint = number | {
  db: number;
  elapsedSeconds: number;
  at?: string;
};

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
  history?: SessionHistoryPoint[];
}

const REPORT_STORAGE_KEY = 'doraemon_session_reports_v1';
const MAX_STORED_REPORTS = 180;
const REPORT_HISTORY_TARGET_POINTS = 48;
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

const downsampleReportHistory = (values: number[], totalSeconds: number, startedAt: string): SessionHistoryPoint[] => {
  if (values.length <= 0) return [];

  const step = Math.max(1, Math.ceil(values.length / REPORT_HISTORY_TARGET_POINTS));
  const sampled = values.filter((_, index) => index % step === 0).slice(0, REPORT_HISTORY_TARGET_POINTS);
  const startMs = new Date(startedAt).getTime();
  const duration = Math.max(1, totalSeconds || values.length);
  const denominator = Math.max(1, sampled.length - 1);

  return sampled.map((db, index) => {
    const elapsedSeconds = Math.round((index / denominator) * duration);
    return {
      db: Math.round(db),
      elapsedSeconds,
      at: new Date(startMs + elapsedSeconds * 1000).toISOString()
    };
  });
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

    return parsed
      .filter((item): item is SessionReport => (
        item &&
        typeof item.id === 'string' &&
        typeof item.startedAt === 'string'
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
  const intervalPeakRef = useRef(0); // 用于抓取采样间隔内的最高分贝
  const reportBodyRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const focusShellRef = useRef<HTMLElement | null>(null);

  useDragScroll(sidebarRef);
  useDragScroll(focusShellRef);

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
    sampleCounterRef.current = 0;
    intervalPeakRef.current = 0;
  }, []);

  const finalizeCurrentSession = useCallback(() => {
    const activeSession = activeSessionRef.current;
    if (!activeSession) return;

    const endedAt = new Date();
    const inferredDuration = Math.max(
      1,
      Math.round((endedAt.getTime() - new Date(activeSession.startedAt).getTime()) / 1000)
    );
    const totalSeconds = totalTimeRef.current;
    
    // 保存本场曲线的真实采样点，用于周报时间轴展示。
    const rawHistory = [...sessionHistoryRef.current];
    const history = downsampleReportHistory(rawHistory, totalSeconds, activeSession.startedAt);

    const nextRecord: SessionReport = {
      id: activeSession.id,
      startedAt: activeSession.startedAt,
      endedAt: endedAt.toISOString(),
      peakDb: Math.round(maxDbRef.current),
      quietSeconds: Math.max(0, quietTimeRef.current),
      totalSeconds,
      warnCount: Math.max(0, warnCountRef.current),
      threshold: limitRef.current,
      sensitivity: sensitivityRef.current,
      history: history.length >= 2 ? history : undefined
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
    sampleCounterRef.current = 0;
    intervalPeakRef.current = 0;
  }, [persistSessionReports]);

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
    micTestStageRef.current = 'done';
    setMicTestStage('done');
  }, []);

  const startMicTest = useCallback(() => {
    if (!isStarted) return;
    quietTestSamplesRef.current = [];
    activeTestSamplesRef.current = [];
    micTestWindowRef.current = [];
    micTestStageRef.current = 'quiet';
    setMicTestResult(null);
    setQuietSnapshotAvg(null);
    setActiveSnapshotAvg(null);
    setMicTestStage('quiet');
  }, [isStarted]);

  const captureQuietMicTest = useCallback(() => {
    if (!isStarted) return;

    const snapshot = micTestWindowRef.current.length ? [...micTestWindowRef.current] : [currentDb];
    quietTestSamplesRef.current = snapshot;
    activeTestSamplesRef.current = [];
    micTestWindowRef.current = [];
    micTestStageRef.current = 'active';
    setMicTestResult(null);
    setQuietSnapshotAvg(average(snapshot));
    setActiveSnapshotAvg(null);
    setMicTestStage('active');
  }, [currentDb, isStarted]);

  const captureActiveMicTest = useCallback(() => {
    if (!isStarted || quietTestSamplesRef.current.length === 0) return;

    const snapshot = micTestWindowRef.current.length ? [...micTestWindowRef.current] : [currentDb];
    activeTestSamplesRef.current = snapshot;
    setActiveSnapshotAvg(average(snapshot));
    finishMicTest();
  }, [currentDb, finishMicTest, isStarted]);

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

      const sensitivityRatio = sensitivityRef.current / 100;
      const rawDelta = Math.max(0, baseDb - noiseFloorRef.current);
      const noiseGate = 2 + ((1 - sensitivityRatio) * 11);
      const deltaAboveGate = Math.max(0, rawDelta - noiseGate);
      const sensitivityScale = 0.16 + (sensitivityRatio * 2.04);
      const adjustedDb = clamp(
        noiseFloorRef.current + (deltaAboveGate * sensitivityScale),
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
      const liveActivity = clamp(deltaAboveGate * sensitivityScale, 0, 60);

      setAmbientDb(noiseFloorRef.current);
      setActivityDb(liveActivity);
      setSignalRange(recentRange);
      currentDbRef.current = effectiveDb;
      setCurrentDb(effectiveDb);
      setMaxDb(m => {
        const next = Math.max(m, effectiveDb);
        maxDbRef.current = next;
        return next;
      });

      if (document.hidden) {
        document.title = t('doraemon.monitorTitle').replace('{db}', Math.round(effectiveDb).toString());
      } else {
        document.title = t('doraemon.appTitle');
      }

      // 强化采样逻辑：记录区间内的峰值
      if (activeSessionRef.current) {
        intervalPeakRef.current = Math.max(intervalPeakRef.current, effectiveDb);
        sampleCounterRef.current++;
        if (sampleCounterRef.current >= 25) {
          sessionHistoryRef.current.push(Math.round(intervalPeakRef.current));
          sampleCounterRef.current = 0;
          intervalPeakRef.current = 0;
        }
      }

      const stage = micTestStageRef.current;
      if (stage === 'quiet' || stage === 'active') {
        micTestWindowRef.current.push(effectiveDb);
        if (micTestWindowRef.current.length > 15) {
          micTestWindowRef.current.shift();
        }
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

  useEffect(() => {
    const handlePageHide = () => {
      finalizeCurrentSession();
      stopAudioMonitoring();
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      finalizeCurrentSession();
      stopAudioMonitoring();
    };
  }, [finalizeCurrentSession, stopAudioMonitoring]);

  const initApp = async () => {
    setIsLoading(true);
    setError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(t('doraemon.errors.startFailed') + t('doraemon.errors.browserNotSupported'));
      setIsLoading(false);
      return;
    }

    finalizeCurrentSession();
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
    setMicTestResult(null);
    setQuietSnapshotAvg(null);
    setActiveSnapshotAvg(null);
    recentDbRef.current = [];
    noiseFloorRef.current = 40;
    environmentDbRef.current = 40;
    micTestWindowRef.current = [];
    currentDbRef.current = 40;
    maxDbRef.current = 0;
    warnCountRef.current = 0;
    quietTimeRef.current = 0;
    totalTimeRef.current = 0;

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
        finalizeCurrentSession();
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
      beginSessionTracking();
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
      if (state === 'alarm') {
        return;
      }

      if (alarmPendingSinceRef.current === null) {
        alarmPendingSinceRef.current = Date.now();
        return;
      }

      if (Date.now() - alarmPendingSinceRef.current >= 2000) {
        setState('alarm');
        setWarnCount(prev => {
          const next = prev + 1;
          warnCountRef.current = next;
          return next;
        });
        setQuietTime(0);
        quietTimeRef.current = 0;
        alarmPendingSinceRef.current = null;
      }
      return;
    }

    alarmPendingSinceRef.current = null;
    if (state !== 'calm') {
      setState('calm');
    }
  }, [currentDb, isStarted, limit, state]);

  useEffect(() => {
    if (!isStarted) {
      alarmPendingSinceRef.current = null;
    }
  }, [isStarted]);

  useEffect(() => {
    if (state === 'alarm' && !isMuted && !isOverlayOpen) {
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
  }, [state, playAlarmSound, isMuted, isOverlayOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isStarted) {
      interval = setInterval(() => {
        setTotalTime(prev => {
          const next = prev + 1;
          totalTimeRef.current = next;
          return next;
        });

        if (state !== 'alarm') {
          setQuietTime(prev => {
            const next = prev + 1;
            quietTimeRef.current = next;
            return next;
          });
        }
      }, 1000);
    }
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

  const formatReportClock = (dateLike: string) => {
    const date = new Date(dateLike);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatReportDate = (date: Date) => {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  };

  const formatTimelineClock = (dateLike: string | number | Date) => {
    const date = new Date(dateLike);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatTimelineDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const m = Math.floor(safeSeconds / 60);
    const s = safeSeconds % 60;
    return m > 0 ? `${m}分${s.toString().padStart(2, '0')}秒` : `${s}秒`;
  };

  const formatPreciseClock = (dateLike: string | number | Date) => {
    const d = new Date(dateLike);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const buildReportTrendData = (record: SessionReport) => {
    const raw = record.history || [];
    const startMs = new Date(record.startedAt).getTime();
    const endMs = record.endedAt ? new Date(record.endedAt).getTime() : Date.now();
    const durationSeconds = Math.max(
      1,
      record.totalSeconds || Math.round((endMs - startMs) / 1000) || raw.length
    );
    const denominator = Math.max(1, raw.length - 1);

    return raw
      .map((item, index) => {
        if (typeof item === 'number') {
          const elapsedSeconds = Math.round((index / denominator) * durationSeconds);
          return {
            db: item,
            elapsedSeconds,
            at: startMs + elapsedSeconds * 1000
          };
        }

        const elapsedSeconds = Math.max(0, Number(item.elapsedSeconds) || 0);
        const at = item.at ? new Date(item.at).getTime() : startMs + elapsedSeconds * 1000;
        return {
          db: Number(item.db) || 0,
          elapsedSeconds,
          at
        };
      })
      .filter(point => point.db > 0);
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

  const liveSessionPreview: SessionReport | null = activeSessionRef.current
    ? {
        id: activeSessionRef.current.id,
        startedAt: activeSessionRef.current.startedAt,
        endedAt: null,
        peakDb: Math.round(Math.max(maxDb, currentDb)),
        quietSeconds: quietTime,
        totalSeconds: totalTime,
        warnCount,
        threshold: limit,
        sensitivity
      }
    : null;

  const weekStart = getCurrentWeekMonday();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  weekEnd.setHours(23, 59, 59, 999);

  const currentWeekRecords = sessionReports.filter(report => {
    const startedAt = new Date(report.startedAt).getTime();
    return startedAt >= weekStart.getTime() && startedAt <= weekEnd.getTime();
  });

  const liveInCurrentWeek = liveSessionPreview
    && (() => {
      const startedAt = new Date(liveSessionPreview.startedAt).getTime();
      return startedAt >= weekStart.getTime() && startedAt <= weekEnd.getTime();
    })();

  const weeklyRecords = liveInCurrentWeek
    ? [liveSessionPreview!, ...currentWeekRecords.filter(report => report.id !== liveSessionPreview!.id)]
    : currentWeekRecords;

  const weeklyPeak = weeklyRecords.length
    ? Math.max(...weeklyRecords.map(report => report.peakDb))
    : 0;

  const reportDayGroups = REPORT_WEEKDAYS.map(({ key, offset }) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const dayKey = toDateKey(date);
    const records = weeklyRecords
      .filter(report => toDateKey(report.startedAt) === dayKey)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return {
      key,
      label: t(`doraemon.report.days.${key}`),
      dateLabel: formatReportDate(date),
      records
    };
  });
  const firstReportDayWithData = reportDayGroups.find(group => group.records.length > 0)?.key ?? 'mon';
  const selectedReportDay = reportDayGroups.find(group => group.key === activeReportDay) ?? reportDayGroups[0];
  const selectedReportIndex = clamp(reportPage, 0, Math.max(0, selectedReportDay.records.length - 1));
  const selectedReportRecord = selectedReportDay.records[selectedReportIndex] ?? null;
  const hasPreviousReport = selectedReportIndex > 0;
  const hasNextReport = selectedReportIndex < selectedReportDay.records.length - 1;
  const todayReportWeekday = getReportWeekdayKey(new Date());
  const defaultReportDay = reportDayGroups.find(group => group.key === todayReportWeekday && group.records.length > 0)?.key
    ?? todayReportWeekday
    ?? firstReportDayWithData;

  const captureModeText = captureSettings
    ? [
        `${t('doraemon.micTest.echo')}:${captureSettings.echoCancellation === true ? t('doraemon.micTest.on') : captureSettings.echoCancellation === false ? t('doraemon.micTest.off') : t('doraemon.micTest.unknown')}`,
        `${t('doraemon.micTest.noiseSuppression')}:${captureSettings.noiseSuppression === true ? t('doraemon.micTest.on') : captureSettings.noiseSuppression === false ? t('doraemon.micTest.off') : t('doraemon.micTest.unknown')}`,
        `${t('doraemon.micTest.autoGain')}:${captureSettings.autoGainControl === true ? t('doraemon.micTest.on') : captureSettings.autoGainControl === false ? t('doraemon.micTest.off') : t('doraemon.micTest.unknown')}`
      ].join(' · ')
    : '';
  const hasMicTestProgress = quietSnapshotAvg !== null || activeSnapshotAvg !== null || micTestResult !== null || micTestStage !== 'idle';
  const quietCapturedText = quietSnapshotAvg === null
    ? t('doraemon.micTest.pending')
    : t('doraemon.micTest.captured').replace('{value}', quietSnapshotAvg.toFixed(1));
  const activeCapturedText = activeSnapshotAvg === null
    ? t('doraemon.micTest.pending')
    : t('doraemon.micTest.captured').replace('{value}', activeSnapshotAvg.toFixed(1));
  const isMicTestOnQuietStep = quietSnapshotAvg === null;
  const currentMicTestTitle = micTestResult
    ? t(`doraemon.micTest.health.${micTestResult.health}`)
    : isMicTestOnQuietStep
      ? t('doraemon.micTest.stageQuiet')
      : t('doraemon.micTest.stageActive');
  const currentMicTestDesc = micTestResult
    ? t(`doraemon.micTest.healthDesc.${micTestResult.health}`)
    : isMicTestOnQuietStep
      ? t('doraemon.micTest.stageQuietDesc')
      : t('doraemon.micTest.stageActiveDesc');
  const closeMicTest = useCallback(() => {
    setIsMicTestOpen(false);
  }, []);
  const closeReport = useCallback(() => {
    setIsReportOpen(false);
  }, []);
  const openMicTest = useCallback(() => {
    setIsReportOpen(false);
    setShowHelp(false);
    setShowThresholdHelp(false);
    startMicTest();
    setIsMicTestOpen(true);
  }, [startMicTest]);
  const openReport = useCallback(() => {
    setIsMicTestOpen(false);
    setShowHelp(false);
    setShowThresholdHelp(false);
    setActiveReportDay(defaultReportDay);
    setReportPage(0);
    setIsReportOpen(true);
  }, [defaultReportDay]);
  const handleSelectReportDay = (event: React.SyntheticEvent, dayKey: ReportWeekday) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveReportDay(dayKey);
    setReportPage(0);
  };
  const handleReportSessionMove = (event: React.SyntheticEvent, direction: -1 | 1) => {
    event.preventDefault();
    event.stopPropagation();
    setReportPage(prev => clamp(prev + direction, 0, Math.max(0, selectedReportDay.records.length - 1)));
  };
  const stopModalPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };
  const stopModalMouseDown = (event: React.MouseEvent) => {
    if (!shouldStopModalMouseDown(event.target)) return;
    event.stopPropagation();
  };
  const handleOpenMicTest = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openMicTest();
  };
  const resetWarnCount = useCallback(() => {
    warnCountRef.current = 0;
    setWarnCount(0);
  }, []);
  const closeWarningResetDialog = useCallback(() => {
    setIsWarningResetDialogOpen(false);
    setWarningResetDialogMode('manage');
    setWarningResetCurrentPassword('');
    setWarningResetCurrentPassword('');
    setWarningResetPasswordInput('');
    setWarningResetPasswordConfirm('');
    setWarningResetPasswordError('');
  }, []);
  const openWarningResetDialog = useCallback((mode: WarningResetDialogMode) => {
    setIsMicTestOpen(false);
    setIsReportOpen(false);
    setShowHelp(false);
    setShowThresholdHelp(false);
    setWarningResetDialogMode(mode);
    setWarningResetCurrentPassword('');
    setWarningResetPasswordInput('');
    setWarningResetPasswordConfirm('');
    setWarningResetPasswordError('');
    setIsWarningResetDialogOpen(true);
  }, []);
  const handleOpenWarningResetSettings = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openWarningResetDialog('manage');
  };
  const handleOpenWarningResetHelp = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openWarningResetDialog('help');
  };
  const handleWarningResetDialogClose = (event?: React.SyntheticEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    closeWarningResetDialog();
  };
  const handleResetWarnCount = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (warningResetPasswordEnabled) {
      openWarningResetDialog('verify');
      return;
    }

    resetWarnCount();
  };
  const getWarningResetValidationMessage = (code: string | null) => {
    if (code === 'current-password') return t('doraemon.warningResetPassword.currentPasswordError');
    if (code === 'mismatch') return t('doraemon.warningResetPassword.mismatchError');
    if (code === 'empty') return t('doraemon.warningResetPassword.emptyError');
    return '';
  };
  const handleSaveWarningResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const validationError = await validateWarningResetPasswordChange({
      existingRecord: warningResetPasswordRecord,
      currentPassword: warningResetCurrentPassword,
      nextPassword: warningResetPasswordInput,
      confirmPassword: warningResetPasswordConfirm,
    });
    if (validationError) {
      setWarningResetPasswordError(getWarningResetValidationMessage(validationError));
      return;
    }

    const nextRecord = await saveWarningResetPasswordRecord(warningResetPasswordInput);
    setWarningResetPasswordRecord(nextRecord);
    closeWarningResetDialog();
  };
  const handleRequestWarningResetPasswordClear = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    openWarningResetDialog('clear');
  };
  const handleConfirmWarningResetPasswordClear = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const validationError = await validateWarningResetPasswordRemoval({
      existingRecord: warningResetPasswordRecord,
      currentPassword: warningResetCurrentPassword,
    });
    if (validationError) {
      setWarningResetPasswordError(getWarningResetValidationMessage(validationError));
      return;
    }

    clearWarningResetPasswordRecord();
    setWarningResetPasswordRecord(null);
    closeWarningResetDialog();
  };
  const handleVerifyWarningReset = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const verified = await verifyWarningResetPassword(warningResetPasswordInput, warningResetPasswordRecord);
    if (!verified) {
      setWarningResetPasswordError(t('doraemon.warningResetPassword.verifyError'));
      return;
    }

    resetWarnCount();
    closeWarningResetDialog();
  };

  const MicTestContent = () => (
    <div className="diagnostic-box mic-test-window">
      <div className="slider-header mic-test-window-topbar">
        <span>{t('doraemon.micTest.guide')}</span>
        <span className="mic-test-inline-hint">
          {quietSnapshotAvg === null ? '01' : activeSnapshotAvg === null ? '02' : 'OK'}
        </span>
      </div>

      <div className="diagnostic-grid mic-test-grid">
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

      <div className={`mic-test-focus-card ${micTestResult ? micTestResult.health : isMicTestOnQuietStep ? 'quiet' : 'active'}`}>
        <strong>{currentMicTestTitle}</strong>
        <p>{currentMicTestDesc}</p>
        {!micTestResult && (
          <button
            className="mic-test-main-action"
            type="button"
            onClick={isMicTestOnQuietStep ? captureQuietMicTest : captureActiveMicTest}
            disabled={!isStarted || (!isMicTestOnQuietStep && quietSnapshotAvg === null)}
          >
            {isMicTestOnQuietStep ? t('doraemon.micTest.captureQuiet') : t('doraemon.micTest.captureActive')}
          </button>
        )}
      </div>

      <div className="mic-test-capture-status">
        <div className={`mic-test-step compact ${quietSnapshotAvg !== null ? 'captured' : 'active'}`}>
          <div className="mic-test-step-copy">
            <strong>{t('doraemon.micTest.stageQuiet')}</strong>
            <span className={`mic-test-step-badge ${quietSnapshotAvg !== null ? 'captured' : 'pending'}`}>
              {quietCapturedText}
            </span>
          </div>
        </div>

        <div className={`mic-test-step compact ${activeSnapshotAvg !== null ? 'captured' : micTestStage === 'active' ? 'active' : ''}`}>
          <div className="mic-test-step-copy">
            <strong>{t('doraemon.micTest.stageActive')}</strong>
            <span className={`mic-test-step-badge ${activeSnapshotAvg !== null ? 'captured' : 'pending'}`}>
              {activeCapturedText}
            </span>
          </div>
        </div>
      </div>

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
          <div className="mic-test-result-actions">
            <button className="diagnostic-apply-btn" type="button" onClick={applyMicTestRecommendation}>
              {t('doraemon.micTest.apply')}
            </button>
            <button className="diagnostic-step-btn secondary" type="button" onClick={startMicTest}>
              {t('doraemon.micTest.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const MicTestLauncher = () => (
    <div className="controls-box mic-test-launcher-box">
      <div className="mic-test-launcher-copy">
        <strong>{t('doraemon.micTest.title')}</strong>
        <p>{t('doraemon.micTest.windowHint')}</p>
      </div>
      <div className="mic-test-launcher-meta">
        <span>{Math.round(ambientDb)} dB</span>
        <span>{signalRange.toFixed(1)} dB</span>
      </div>
      <button
        className="mic-test-launcher-btn"
        type="button"
        onMouseDown={stopModalMouseDown}
        onClick={handleOpenMicTest}
      >
        {t('doraemon.micTest.openWindow')}
      </button>
    </div>
  );

  const MicTestModal = () => {
    if (!isMicTestOpen) return null;

    return (
      <div className="floating-modal-layer open">
        <button
          type="button"
          className="floating-modal-backdrop"
          onClick={closeMicTest}
          aria-label={t('doraemon.micTest.closeWindow')}
        />
        <div
          className="floating-modal-shell"
          onClick={stopModalPropagation}
          onMouseDown={stopModalMouseDown}
        >
        <div className="floating-modal-header">
          <div>
            <strong>{t('doraemon.micTest.title')}</strong>
            <p>{t('doraemon.micTest.windowHint')}</p>
          </div>
          <button
            className="floating-close-btn"
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeMicTest();
            }}
            onClick={(event) => {
              event.stopPropagation();
              closeMicTest();
            }}
            title={t('doraemon.micTest.closeWindow')}
          >
            <X size={16} />
          </button>
        </div>
        <div className="floating-modal-body">
          <MicTestContent />
        </div>
      </div>
      </div>
    );
  };

  const ReportDrawer = () => {
    if (!isReportOpen) return null;

    return (
      <div className="report-modal-layer open">
        <button
          type="button"
          className="report-modal-backdrop"
          onClick={closeReport}
          aria-label={t('doraemon.report.hide')}
        />
        <div
          className="report-modal-shell"
          onClick={stopModalPropagation}
          onMouseDown={stopModalMouseDown}
        >
          <div className="report-modal-header">
            <div className="report-drawer-heading">
              <div className="report-drawer-icon">
                <CalendarDays size={18} />
              </div>
              <div>
                <strong>{t('doraemon.report.title')}</strong>
                <p>{t('doraemon.report.localOnly')}</p>
              </div>
            </div>
            <button
              className="report-modal-close"
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeReport();
              }}
              onClick={(event) => {
                event.stopPropagation();
                closeReport();
              }}
              title={t('doraemon.report.hide')}
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={reportBodyRef}
            className="report-modal-body"
          >
            <div className="report-modal-week">
              {formatReportDate(weekStart)} - {formatReportDate(weekEnd)}
            </div>

            <div className="report-summary-grid">
              <div className="report-summary-card">
                <span>{t('doraemon.report.summarySessions')}</span>
                <strong>{weeklyRecords.length}</strong>
              </div>
              <div className="report-summary-card peak">
                <span>{t('doraemon.report.summaryPeak')}</span>
                <strong>{weeklyRecords.length ? `${Math.round(weeklyPeak)} dB` : '--'}</strong>
              </div>
            </div>

            <div className="report-viewer-layout">
              <div className="report-day-sidebar" ref={sidebarRef}>
                {reportDayGroups.map(group => (
                  <button
                    key={group.key}
                    type="button"
                    className={`report-day-chip ${group.records.length ? 'has-data' : ''} ${group.key === selectedReportDay.key ? 'selected' : ''}`}
                    onPointerDown={(event) => handleSelectReportDay(event, group.key)}
                  >
                    <div className="report-day-chip-copy">
                      <span>{group.label}</span>
                      <small>{group.dateLabel}</small>
                    </div>
                    <strong>{group.records.length}</strong>
                  </button>
                ))}
              </div>

              <section className="report-focus-shell" ref={focusShellRef}>
                <div className="report-day-header">
                  <div>
                    <strong>{selectedReportDay.label}</strong>
                    <span>{selectedReportDay.dateLabel}</span>
                  </div>
                  <span className={`report-day-count ${selectedReportDay.records.length ? 'has-data' : ''}`}>
                    {t('doraemon.report.sessionCount').replace('{count}', String(selectedReportDay.records.length))}
                  </span>
                </div>

                {selectedReportRecord ? (
                  <>
                    <div className="report-nav-row">
                      <button
                        type="button"
                        className="report-nav-btn"
                        onPointerDown={(event) => handleReportSessionMove(event, -1)}
                        disabled={!hasPreviousReport}
                      >
                        {t('doraemon.report.prevPage')}
                      </button>
                      <span className="report-nav-status">
                        {t('doraemon.report.pageStatus')
                          .replace('{current}', String(selectedReportIndex + 1))
                          .replace('{total}', String(selectedReportDay.records.length))}
                      </span>
                      <button
                        type="button"
                        className="report-nav-btn"
                        onPointerDown={(event) => handleReportSessionMove(event, 1)}
                        disabled={!hasNextReport}
                      >
                        {t('doraemon.report.nextPage')}
                      </button>
                    </div>

                    <article className="report-focus-card">
                      <div className="report-focus-top">
                        <div className="report-time-cell">
                          <strong>{formatReportClock(selectedReportRecord.startedAt)} - {selectedReportRecord.endedAt ? formatReportClock(selectedReportRecord.endedAt) : t('doraemon.report.ongoing')}</strong>
                          {selectedReportRecord.endedAt === null && (
                            <span className="report-live-badge">{t('doraemon.report.live')}</span>
                          )}
                        </div>
                        <span className="report-peak-pill">{Math.round(selectedReportRecord.peakDb)} dB</span>
                      </div>

                      {/* 本场分贝曲线：基于真实采样点，并按上课时刻显示时间轴。 */}
                      <div className="report-session-trend">
                        {(() => {
                          const samples = buildReportTrendData(selectedReportRecord);
                          if (samples.length < 2) return <div className="trend-empty-hint">结束本场后生成波动曲线</div>;
                          
                          const values = samples.map(point => point.db);
                          const hMax = Math.max(...values);
                          const hMin = Math.min(...values);
                          const peakIdx = values.indexOf(hMax);
                          const lowIdx = values.indexOf(hMin);
                          const currentThreshold = selectedReportRecord.threshold || 60;
                          
                          const cMax = Math.ceil(Math.max(hMax + 8, currentThreshold + 12) / 5) * 5;
                          const cMin = Math.max(0, Math.floor(Math.min(hMin - 8, currentThreshold - 18, 30) / 5) * 5);
                          const r = Math.max(20, cMax - cMin);
                          
                          const width = 100;
                          const height = 100;
                          const pts = samples.map((sample, i) => ({
                            x: (i / (samples.length - 1)) * width,
                            y: height - ((sample.db - cMin) / r) * height,
                            db: sample.db,
                            at: sample.at,
                            elapsedSeconds: sample.elapsedSeconds
                          }));

                          const linePath = buildSmoothCurvePath(pts);
                          const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
                          const thresholdY = height - ((currentThreshold - cMin) / r) * height;

                          const timelineTickIndexes = [0, Math.floor((pts.length - 1) / 2), pts.length - 1]
                            .filter((value, index, array) => array.indexOf(value) === index);
                          const yAxisTicks = [cMax, Math.round((cMax + cMin) / 2), cMin];
                          const averageDb = Math.round(average(values));
                          const peakPoint = pts[peakIdx];
                          const lowPoint = pts[lowIdx];
                          const trendId = selectedReportRecord.id.replace(/[^a-zA-Z0-9_-]/g, '');
                          const areaGradientId = `reportAreaGradient-${trendId}`;
                          const markerGlowId = `reportMarkerGlow-${trendId}`;

                          return (
                            <div className="report-trend-card">
                              <div className="report-trend-header">
                                <div>
                                  <strong>本场声音走势</strong>
                                  <span>{formatTimelineClock(selectedReportRecord.startedAt)} - {selectedReportRecord.endedAt ? formatTimelineClock(selectedReportRecord.endedAt) : '进行中'}</span>
                                </div>
                                <div className="report-trend-stats">
                                  <span>最高 {Math.round(hMax)} dB</span>
                                  <span>平均 {averageDb} dB</span>
                                </div>
                              </div>

                              <div className="report-trend-plot">
                                <div className="report-trend-y-axis" aria-hidden="true">
                                  {yAxisTicks.map(tick => <span key={tick}>{tick}</span>)}
                                </div>
                                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="report-trend-svg">
                                <defs>
                                  <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.36" />
                                    <stop offset="52%" stopColor="#22c55e" stopOpacity="0.16" />
                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                                  </linearGradient>
                                  <filter id={markerGlowId}>
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                  </filter>
                                </defs>

                                {yAxisTicks.map(tick => {
                                  const y = height - ((tick - cMin) / r) * height;
                                  return <line key={tick} x1="0" y1={y} x2="100" y2={y} className="report-trend-grid-line" />;
                                })}

                                {timelineTickIndexes.map(index => (
                                  <line key={index} x1={pts[index].x} y1="0" x2={pts[index].x} y2="100" className="report-trend-grid-line vertical" />
                                ))}
                                
                                <line x1="0" y1={thresholdY} x2="100" y2={thresholdY} className="report-trend-threshold" />
                                
                                <path d={fillPath} fill={`url(#${areaGradientId})`} />
                                <path d={linePath} className="report-trend-line-shadow" />
                                <path d={linePath} className="report-trend-line" />
                                
                                <g filter={`url(#${markerGlowId})`}>
                                  <circle cx={peakPoint.x} cy={peakPoint.y} r="3.1" className="report-trend-peak-dot" />
                                  <circle cx={lowPoint.x} cy={lowPoint.y} r="2.6" className="report-trend-low-dot" />
                                </g>
                              </svg>
                              
                                <div className="report-trend-annotations">
                                  <span className="report-trend-label peak" style={{ left: `${peakPoint.x}%`, top: `${peakPoint.y}%` }}>
                                    最高 {Math.round(hMax)} dB · {formatTimelineClock(peakPoint.at)}
                                  </span>
                                  <span className="report-trend-label low" style={{ left: `${lowPoint.x}%`, top: `${lowPoint.y}%` }}>
                                    最低 {Math.round(hMin)} dB
                                  </span>
                                  <span className="report-trend-label threshold" style={{ top: `${thresholdY}%` }}>
                                    阈值 {currentThreshold} dB
                                  </span>
                                </div>
                              </div>

                              <div className="report-trend-timeline">
                                {timelineTickIndexes.map(index => (
                                  <span key={index}>
                                    <strong>{formatTimelineClock(pts[index].at)}</strong>
                                    <small>{formatTimelineDuration(pts[index].elapsedSeconds)}</small>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="report-focus-grid">
                        <div className="report-session-metric">
                          <span>{t('doraemon.report.columns.duration')}</span>
                          <strong>{formatTime(selectedReportRecord.totalSeconds)}</strong>
                        </div>
                        <div className="report-session-metric">
                          <span>{t('doraemon.report.columns.quiet')}</span>
                          <strong>{formatTime(selectedReportRecord.quietSeconds)}</strong>
                        </div>
                        <div className="report-session-metric">
                          <span>{t('doraemon.report.columns.warnings')}</span>
                          <strong>{selectedReportRecord.warnCount}</strong>
                        </div>
                        <div className="report-session-metric">
                          <span>{t('doraemon.report.columns.settings')}</span>
                          <strong>{`${selectedReportRecord.threshold} dB / ${selectedReportRecord.sensitivity}%`}</strong>
                        </div>
                      </div>

                      <div className="report-settings-band">
                        {t('doraemon.report.settings')
                          .replace('{limit}', String(selectedReportRecord.threshold))
                          .replace('{sensitivity}', String(selectedReportRecord.sensitivity))}
                      </div>
                    </article>
                  </>
                ) : (
                  <div className="report-empty-state">{t('doraemon.report.empty')}</div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWarningResetDialog = () => {
    if (!isWarningResetDialogOpen) return null;

    const dialogTitle = warningResetDialogMode === 'verify'
      ? t('doraemon.warningResetPassword.verifyTitle')
      : warningResetDialogMode === 'help'
        ? t('doraemon.warningResetPassword.helpTitle')
        : warningResetDialogMode === 'clear'
          ? t('doraemon.warningResetPassword.clearTitle')
          : t('doraemon.warningResetPassword.manageTitle');
    const dialogDescription = warningResetDialogMode === 'verify'
      ? t('doraemon.warningResetPassword.verifyDesc')
      : warningResetDialogMode === 'help'
        ? t('doraemon.warningResetPassword.helpDesc')
        : warningResetDialogMode === 'clear'
          ? t('doraemon.warningResetPassword.clearDesc')
          : warningResetPasswordEnabled
            ? t('doraemon.warningResetPassword.manageDescSet')
            : t('doraemon.warningResetPassword.manageDescEmpty');

    return (
      <div className="floating-modal-layer open">
        <button
          type="button"
          className="floating-modal-backdrop"
          onClick={closeWarningResetDialog}
          aria-label={dialogTitle}
        />
        <div
          className="floating-modal-shell warning-reset-dialog-shell"
          onClick={stopModalPropagation}
          onMouseDown={stopModalMouseDown}
        >
          <div className="floating-modal-header">
            <div className="warning-reset-dialog-heading">
              <div className={`warning-reset-dialog-icon ${warningResetPasswordEnabled ? 'protected' : ''}`}><Lock size={18} /></div>
              <div>
                <strong>{dialogTitle}</strong>
                <p>{dialogDescription}</p>
              </div>
            </div>
            <button
              className="floating-close-btn"
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeWarningResetDialog();
              }}
              onClick={(event) => {
                event.stopPropagation();
                closeWarningResetDialog();
              }}
              title={t('doraemon.warningResetPassword.cancel')}
            >
              <X size={16} />
            </button>
          </div>
          <div className="floating-modal-body warning-reset-dialog-body">
            <div className={`warning-reset-status-pill ${warningResetPasswordEnabled ? 'protected' : 'open'}`}>
              {warningResetPasswordEnabled
                ? t('doraemon.warningResetPassword.enabled')
                : t('doraemon.warningResetPassword.disabled')}
            </div>

            {warningResetDialogMode === 'help' ? (
              <div className="warning-reset-help-copy">
                <p>{t('doraemon.warningResetPassword.helpDesc')}</p>
                <div className="warning-reset-actions">
                  <button type="button" className="warning-reset-secondary-btn" onClick={handleWarningResetDialogClose}>
                    {t('doraemon.warningResetPassword.cancel')}
                  </button>
                </div>
              </div>
            ) : warningResetDialogMode === 'verify' ? (
              <form className="warning-reset-form" onSubmit={handleVerifyWarningReset}>
                <label className="warning-reset-label">
                  <span>{t('doraemon.warningResetPassword.inputLabel')}</span>
                  <input
                    className="warning-reset-input"
                    type="password"
                    value={warningResetPasswordInput}
                    onChange={(event) => {
                      setWarningResetPasswordInput(event.target.value);
                      setWarningResetPasswordError('');
                    }}
                    placeholder={t('doraemon.warningResetPassword.inputPlaceholder')}
                    autoFocus
                  />
                </label>
                {warningResetPasswordError && <div className="warning-reset-error">{warningResetPasswordError}</div>}
                <div className="warning-reset-actions">
                  <button type="button" className="warning-reset-secondary-btn" onClick={handleWarningResetDialogClose}>
                    {t('doraemon.warningResetPassword.cancel')}
                  </button>
                  <button type="submit" className="warning-reset-primary-btn">
                    {t('doraemon.warningResetPassword.confirmReset')}
                  </button>
                </div>
              </form>
            ) : warningResetDialogMode === 'clear' ? (
              <form className="warning-reset-form" onSubmit={handleConfirmWarningResetPasswordClear}>
                <label className="warning-reset-label">
                  <span>{t('doraemon.warningResetPassword.currentPasswordLabel')}</span>
                  <input
                    className="warning-reset-input"
                    type="password"
                    value={warningResetCurrentPassword}
                    onChange={(event) => {
                      setWarningResetCurrentPassword(event.target.value);
                      setWarningResetPasswordError('');
                    }}
                    placeholder={t('doraemon.warningResetPassword.currentPasswordPlaceholder')}
                    autoFocus
                  />
                </label>
                {warningResetPasswordError && <div className="warning-reset-error">{warningResetPasswordError}</div>}
                <div className="warning-reset-actions">
                  <button type="button" className="warning-reset-secondary-btn" onClick={handleWarningResetDialogClose}>
                    {t('doraemon.warningResetPassword.cancel')}
                  </button>
                  <button type="submit" className="warning-reset-danger-btn">
                    {t('doraemon.warningResetPassword.confirmClear')}
                  </button>
                </div>
              </form>
            ) : (
              <form className="warning-reset-form" onSubmit={handleSaveWarningResetPassword}>
                {warningResetPasswordEnabled && (
                  <label className="warning-reset-label">
                    <span>{t('doraemon.warningResetPassword.currentPasswordLabel')}</span>
                    <input
                      className="warning-reset-input"
                      type="password"
                      value={warningResetCurrentPassword}
                      onChange={(event) => {
                        setWarningResetCurrentPassword(event.target.value);
                        setWarningResetPasswordError('');
                      }}
                      placeholder={t('doraemon.warningResetPassword.currentPasswordPlaceholder')}
                      autoFocus
                    />
                  </label>
                )}
                <label className="warning-reset-label">
                  <span>{t('doraemon.warningResetPassword.inputLabel')}</span>
                  <input
                    className="warning-reset-input"
                    type="password"
                    value={warningResetPasswordInput}
                    onChange={(event) => {
                      setWarningResetPasswordInput(event.target.value);
                      setWarningResetPasswordError('');
                    }}
                    placeholder={t('doraemon.warningResetPassword.inputPlaceholder')}
                    autoFocus={!warningResetPasswordEnabled}
                  />
                </label>
                <label className="warning-reset-label">
                  <span>{t('doraemon.warningResetPassword.confirmLabel')}</span>
                  <input
                    className="warning-reset-input"
                    type="password"
                    value={warningResetPasswordInput}
                    onChange={(event) => {
                      setWarningResetPasswordConfirm(event.target.value);
                      setWarningResetPasswordError('');
                    }}
                    placeholder={t('doraemon.warningResetPassword.confirmPlaceholder')}
                  />
                </label>
                {warningResetPasswordError && <div className="warning-reset-error">{warningResetPasswordError}</div>}
                <div className="warning-reset-actions">
                  {warningResetPasswordEnabled && (
                    <button type="button" className="warning-reset-danger-btn" onClick={handleRequestWarningResetPasswordClear}>
                      {t('doraemon.warningResetPassword.clear')}
                    </button>
                  )}
                  <button type="button" className="warning-reset-secondary-btn" onClick={handleWarningResetDialogClose}>
                    {t('doraemon.warningResetPassword.cancel')}
                  </button>
                  <button type="submit" className="warning-reset-primary-btn">
                    {warningResetPasswordEnabled
                      ? t('doraemon.warningResetPassword.update')
                      : t('doraemon.warningResetPassword.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  const NoiseLevelReference = () => {
    const levels = [
      { min: 0, max: 20, label: t('doraemon.levels.l0') },
      { min: 20, max: 40, label: t('doraemon.levels.l20') },
      { min: 40, max: 60, label: t('doraemon.levels.l40') },
      { min: 60, max: 80, label: t('doraemon.levels.l60') },
      { min: 80, max: 120, label: t('doraemon.levels.l80') },
    ];
    const pointerPos = Math.min(100, Math.max(0, currentDb));
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
      </div>
    );
  };

  const Visualizer = () => {
    const BAR_COUNT = 80;
    const hue = Math.max(0, 200 - (currentDb - 40) * 4);
    const tick = Date.now();
    const opacity = isDarkMode ? 0.7 : 0.5;
    const mainColor = `hsl(${hue}, 95%, 50%)`;
    const glowColor = `hsla(${hue}, 95%, 50%, 0.6)`;

    return (
      <div className="visualizer-container">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const dist = Math.abs(i - BAR_COUNT / 2);
          const norm = 1 - (dist / (BAR_COUNT / 2));
          const dbPower = Math.pow(Math.max(0, (currentDb - 35) / 45), 1.5);
          const wave = Math.sin(i * 0.35 + tick / 150) * 0.15;
          const taperedNorm = Math.pow(norm, 1.5);
          const height = 10 + (80 * taperedNorm * (dbPower + wave + 0.05));

          return (
            <div key={i} className="wave-bar" style={{
              height: `${Math.min(100, height)}%`,
              background: `linear-gradient(to top, transparent, ${mainColor})`,
              opacity: (opacity + norm * 0.3) * Math.min(1, norm * 2),
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

  if (authError) return <div className="doraemon-app dark-mode alarm-mode" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}><h1 style={{ fontSize: '4.4rem', color: '#ff416c' }}>{t('doraemon.authExpired')}</h1><p style={{ fontSize: '2.2rem', margin: '20px 0' }}>{authError}</p><p style={{ color: '#666', fontSize: '1.1rem' }}>{t('doraemon.returnHome').replace('{seconds}', countdown.toString())}</p></div>;
  if (isLicensed === null) return <div className="doraemon-app dark-mode" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" style={{ width: '80px', height: '60px' }}></div><h2 style={{ color: '#00f260' }}>{t('doraemon.verifying')}</h2></div>;
  if (isLicensed === false) return <LicenseInput onVerified={() => setIsLicensed(true)} />;
  if (!isStarted) return <div className="doraemon-start-layer"><button onClick={() => navigate('/')} className="back-btn"><ArrowLeft size={32} /></button><div className="doraemon-start-icon" style={{ width: '250px', height: '250px' }}><DoraemonSVG /></div><h1 className="start-title" style={{ fontSize: '3.5rem' }}>{t('doraemon.title')}</h1><button className="doraemon-btn-big" onClick={initApp} disabled={isLoading} style={{ padding: '25px 60px' }}>{isLoading ? <span>{t('doraemon.summoning')}</span> : <><span className="btn-main-text" style={{ fontSize: '2rem' }}>{t('doraemon.startMonitor')}</span><span className="btn-sub-text">{t('doraemon.startMonitorSub')}</span></>}</button>{error && <div className="doraemon-error-box">{error}</div>}</div>;

  return (
    <div className={`doraemon-app ${isDarkMode ? 'dark-mode' : ''} ${visualState === 'alarm' ? 'alarm-mode' : ''}`}>
      {visualState === 'alarm' && <div className="doraemon-giant-text">{t('doraemon.quiet')}</div>}
      <header className="doraemon-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => navigate('/')} className="icon-btn"><ArrowLeft size={32} /></button>
          <div style={{ fontSize: '1.26rem', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#333' }}>{timeStr}</div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            type="button"
            onClick={openReport}
            className="report-header-btn"
            title={t('doraemon.report.show')}
          >
            {t('doraemon.report.trigger')}
          </button>
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
          <div className={`stat-box stat-box-with-action warning-stat-box ${warnCount > 0 ? 'warning' : ''}`}>
            <div className="stat-content">
              <span className="stat-label">{t('doraemon.warnCount')}</span>
              <strong className="stat-value" style={{ color: '#dc2626' }}>{warnCount}</strong>
            </div>
            <div className="stat-action-row warning-stat-actions">
              <button
                className="reset-icon-btn"
                onClick={handleResetWarnCount}
                title={t('doraemon.resetCount')}
              >
                <RotateCcw size={20} />
              </button>
              <div className="warning-reset-settings-stack">
                <button
                  className={`warning-reset-settings-btn ${warningResetPasswordEnabled ? 'protected' : ''}`}
                  onClick={handleOpenWarningResetSettings}
                  title={t('doraemon.warningResetPassword.settingsTrigger')}
                >
                  <Lock size={18} />
                </button>
                <button
                  className="help-icon-btn warning-reset-help-btn"
                  onClick={handleOpenWarningResetHelp}
                  title={t('doraemon.warningResetPassword.helpTrigger')}
                >
                  <HelpCircle size={14} />
                </button>
              </div>
            </div>
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
      {renderWarningResetDialog()}
      <ReportDrawer />
    </div>
  );
};

export default DoraemonMonitorApp;

/**
 * Morning Energy Tree - Enhanced Version 3.1 (Stable & Fixes)
 * 
 * Features:
 * 1. Session Timer & Game Logic (Preserved)
 * 2. Visual Upgrade: Lush Foliage, Gradient Trunk, Wind Animation
 * 3. Environment: Animated Clouds, Birds, Sun
 * 4. Fixes: Auto-reset on finish, smoother animation, canvas-only shake
 */

/* --- Constants & State --- */
const AUTH_KEY = 'morning_tree_auth';
const LICENSE_PREFIX = 'ZD';
const REPORT_STORAGE_KEY = 'morning_tree_weekly_reports_v1';
const TASK_STORAGE_KEY = 'morning_tree_weekly_tasks_v1';
const MAX_STORED_REPORTS = 100;
const MAX_TASK_SLOTS = 6;
const REPORT_WEEKDAYS = [
    { key: 'mon', offset: 0 },
    { key: 'tue', offset: 1 },
    { key: 'wed', offset: 2 },
    { key: 'thu', offset: 3 },
    { key: 'fri', offset: 4 }
];

const STATE = {
    isListening: false,
    energy: 0,
    sensitivity: 50,
    currentDB: 30,
    treeColor: '#4caf50',
    isSuperMode: false,
    hasManifested: false,
    superModeTimer: null,

    // Timer System
    sessionDuration: 30, // minutes
    remainingTime: 30 * 60,
    timerInterval: null,

    // Growth calibration: 1 min loud reading = full tree
    baseGrowthRate: 1.67 / 60,

    // Localization context
    language: localStorage.getItem('global-language') || 'en',
    translations: null,

    // Weekly report tracking
    sessionStartedAt: null,
    curveBuffer: [],
    reportActiveDay: null,
    reportActiveSession: 0,

    // Weekly task board
    taskActiveDay: null,
    taskDrafts: null,
    taskStripPreviewDay: null,
    frameNow: 0
};

// Aesthetic Config
const FOLIAGE_COLORS = ['#43a047', '#66bb6a', '#a5d6a7', '#81c784'];
const GOLDEN_COLORS = ['#ffd700', '#ffecb3', '#fff9c4', '#fff59d'];
const ENERGY_SKY_COLORS = ['#fff176', '#ffe082', '#fff59d', '#ffecb3'];
const ENERGY_TECH_COLORS = ['#7df9ff', '#8cf7d9', '#d2ff72', '#f7ff9c'];
const SOIL_FLOW_COLORS = ['#59f0ff', '#5de2c8', '#9be15d', '#d8ff66'];
const FX_LIMITS = {
    sparkles: 88,
    energyParticles: 22,
    trunkTransfers: 16,
    soilTransfers: 18
};

/* --- DOM Elements --- */
const $ = (id) => document.getElementById(id);
const gatekeeper = $('gatekeeper-screen');
const appContainer = $('app-container');
const canvas = $('tree-canvas');
const ctx = canvas.getContext('2d');
const energyFill = $('energy-fill');
const micBtn = $('mic-toggle-btn');
const dbValue = $('db-value');
const dbDisplay = document.querySelector('.db-display');
const countdownTime = $('countdown-time');
const durationSelect = $('duration-select');
const customDuration = $('custom-duration');
const taskStrip = $('task-strip');
const taskStripTitle = $('task-strip-title');
const taskStripMeta = $('task-strip-meta');
const taskStripEmpty = $('task-strip-empty');
const taskStripTimeline = $('task-strip-timeline');
const taskStripNoteWrap = $('task-strip-note-wrap');
const taskStripNoteTitle = $('task-strip-note-title');
const taskStripNote = $('task-strip-note');
const taskStripDay = $('task-strip-day');
const taskStripDateTime = $('task-strip-datetime');
const taskStripPrev = $('task-strip-prev');
const taskStripNext = $('task-strip-next');
const taskTriggerBtn = $('task-trigger-btn');
const taskModal = $('task-modal');
const taskBackdrop = $('task-backdrop');
const taskCloseBtn = $('task-close-btn');
const taskWeekLabel = $('task-week-label');
const taskDayChipRow = $('task-day-chip-row');
const taskDayPanel = $('task-day-panel');
const taskAddSlotBtn = $('task-add-slot-btn');
const taskSaveBtn = $('task-save-btn');
const reportTriggerBtn = $('report-trigger-btn');
const reportModal = $('report-modal');
const reportBackdrop = $('report-backdrop');
const reportCloseBtn = $('report-close-btn');
const reportWeekLabel = $('report-week-label');
const reportSummaryCount = $('report-summary-count');
const reportSummaryPeak = $('report-summary-peak');
const reportDayChipRow = $('report-day-chip-row');
const reportDayList = $('report-day-list');

// Help Tooltip Toggle
const helpTrigger = $('help-trigger');
const helpTooltip = $('help-tooltip');
const dbStatus = $('db-status');
const ringBar = $('ring-bar');
let taskSaveFeedbackTimer = null;
let taskStripResetTimer = null;
let taskStripClockTimer = null;

if (helpTrigger) {
    helpTrigger.onclick = (e) => {
        e.stopPropagation();
        helpTooltip.classList.toggle('hidden');
    };
    helpTooltip.onclick = () => helpTooltip.classList.add('hidden');
    document.addEventListener('click', () => helpTooltip.classList.add('hidden'));
}

function loadStoredReports() {
    try {
        const raw = localStorage.getItem(REPORT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(item =>
            item &&
            typeof item.id === 'string' &&
            typeof item.startedAt === 'string' &&
            typeof item.endedAt === 'string' &&
            typeof item.durationSeconds === 'number' &&
            Array.isArray(item.curve)
        ).map(item => ({
            ...item,
            manifested: Boolean(item.manifested)
        }));
    } catch (error) {
        console.error('Failed to load morning tree reports:', error);
        return [];
    }
}

function persistReports(reports) {
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports.slice(0, MAX_STORED_REPORTS)));
}

function createDefaultTaskSlot(index = 0) {
    const startHour = index === 0 ? '07' : '07';
    const startMinute = index === 0 ? '30' : `${Math.min(59, 40 + ((index - 1) * 10))}`.padStart(2, '0');
    const endMinute = `${Math.min(59, parseInt(startMinute, 10) + 9)}`.padStart(2, '0');
    return {
        start: `${startHour}:${startMinute}`,
        end: `${startHour}:${endMinute}`,
        content: ''
    };
}

function createDefaultTaskDay() {
    return {
        tasks: [createDefaultTaskSlot(0)],
        noteTitle: '',
        noteBody: '',
        updatedAt: null
    };
}

function createDefaultWeeklyTasks() {
    return REPORT_WEEKDAYS.reduce((acc, { key }) => {
        acc[key] = createDefaultTaskDay();
        return acc;
    }, {});
}

function normalizeTaskSlot(slot, index = 0) {
    return {
        start: typeof slot?.start === 'string' ? slot.start : createDefaultTaskSlot(index).start,
        end: typeof slot?.end === 'string' ? slot.end : createDefaultTaskSlot(index).end,
        content: typeof slot?.content === 'string' ? slot.content : ''
    };
}

function normalizeTaskDay(dayTask) {
    const fallback = createDefaultTaskDay();
    const rawSlots = Array.isArray(dayTask?.tasks) ? dayTask.tasks.slice(0, MAX_TASK_SLOTS) : fallback.tasks;
    const normalizedSlots = rawSlots.length ? rawSlots.map((slot, index) => normalizeTaskSlot(slot, index)) : fallback.tasks;
    while (normalizedSlots.length > 1) {
        const lastSlot = normalizedSlots[normalizedSlots.length - 1];
        if ((lastSlot.content || '').trim() || (lastSlot.start || '').trim() || (lastSlot.end || '').trim()) break;
        normalizedSlots.pop();
    }
    return {
        tasks: normalizedSlots,
        noteTitle: typeof dayTask?.noteTitle === 'string' ? dayTask.noteTitle : '',
        noteBody: typeof dayTask?.noteBody === 'string' ? dayTask.noteBody : '',
        updatedAt: typeof dayTask?.updatedAt === 'string' ? dayTask.updatedAt : null
    };
}

function loadStoredTasks() {
    const defaults = createDefaultWeeklyTasks();
    try {
        const raw = localStorage.getItem(TASK_STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return REPORT_WEEKDAYS.reduce((acc, { key }) => {
            acc[key] = normalizeTaskDay(parsed?.[key]);
            return acc;
        }, {});
    } catch (error) {
        console.error('Failed to load morning tree tasks:', error);
        return defaults;
    }
}

function persistTasks(taskMap) {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskMap));
}

function toDateKey(dateLike) {
    const date = new Date(dateLike);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentWeekMonday(baseDate = new Date()) {
    const monday = new Date(baseDate);
    monday.setHours(0, 0, 0, 0);
    const day = monday.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diffToMonday);
    return monday;
}

function formatShortDate(dateLike) {
    const date = new Date(dateLike);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

function formatClock(dateLike) {
    const date = new Date(dateLike);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatPreciseClock(dateLike) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '--:--:--';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.max(0, seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function parseClockMinutes(value) {
    if (typeof value !== 'string' || !value.includes(':')) return null;
    const [hours, minutes] = value.split(':').map(part => parseInt(part, 10));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return (hours * 60) + minutes;
}

function getCurrentWeekdayKey(baseDate = new Date()) {
    const day = baseDate.getDay();
    if (day === 0 || day === 6) return null;
    return REPORT_WEEKDAYS[Math.max(0, Math.min(4, day - 1))]?.key || 'mon';
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatTaskStripDateTime(dateLike = new Date()) {
    const date = new Date(dateLike);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function compressCurve(points, maxPoints = 40) {
    if (!points.length) return [];
    if (points.length <= maxPoints) return points.map(point => Math.round(point));

    const chunkSize = Math.ceil(points.length / maxPoints);
    const compressed = [];

    for (let i = 0; i < points.length; i += chunkSize) {
        const chunk = points.slice(i, i + chunkSize);
        const average = chunk.reduce((sum, value) => sum + value, 0) / chunk.length;
        compressed.push(Math.round(average));
    }

    return compressed;
}

function getCurveStats(report) {
    const values = Array.isArray(report.curve) && report.curve.length
        ? report.curve.map(point => Math.round(point))
        : [40, 42, 41];
    const peakSource = typeof report.peakDb === 'number' ? report.peakDb : Math.max(...values);
    const lowSource = typeof report.lowDb === 'number' ? report.lowDb : Math.min(...values);
    const averageSource = typeof report.averageDb === 'number'
        ? report.averageDb
        : values.reduce((sum, value) => sum + value, 0) / values.length;
    const peakCurveValue = Math.max(...values);
    const lowCurveValue = Math.min(...values);

    return {
        values,
        peakValue: Math.round(peakSource),
        lowValue: Math.round(lowSource),
        averageValue: Math.round(averageSource),
        peakIndex: Math.max(0, values.indexOf(peakCurveValue)),
        lowIndex: Math.max(0, values.indexOf(lowCurveValue))
    };
}

function formatCurveTickLabel(report, ratio) {
    const start = new Date(report.startedAt);
    const fallbackDuration = Math.max(1, report.durationSeconds || 0) * 1000;
    if (Number.isNaN(start.getTime())) {
        return formatDuration(Math.round((report.durationSeconds || 0) * ratio));
    }

    const endCandidate = report.endedAt ? new Date(report.endedAt).getTime() : NaN;
    const end = Number.isFinite(endCandidate) && endCandidate > start.getTime()
        ? endCandidate
        : start.getTime() + fallbackDuration;

    const tickTime = start.getTime() + ((end - start.getTime()) * ratio);
    return formatPreciseClock(tickTime);
}

function buildSmoothCurvePath(points) {
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
}

function buildCurveBadge(point, label, tone, position, bounds) {
    const badgeWidth = clamp((label.length * 7.4) + 20, 74, 138);
    const badgeHeight = 24;
    const isRightSide = point.x > bounds.midX;
    const badgeX = clamp(
        point.x + (isRightSide ? -badgeWidth - 12 : 12),
        bounds.left,
        bounds.right - badgeWidth
    );
    const badgeY = clamp(
        point.y + (position === 'top' ? -badgeHeight - 14 : 14),
        bounds.top,
        bounds.bottom - badgeHeight
    );
    const connectorX = clamp(
        point.x + (isRightSide ? -6 : 6),
        bounds.left,
        bounds.right
    );
    const connectorY = position === 'top' ? badgeY + badgeHeight : badgeY;

    return `
        <g>
            <path d="M ${point.x} ${point.y} L ${connectorX} ${connectorY}" stroke="${tone}" stroke-opacity="0.58" stroke-width="1.4" />
            <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="12" fill="rgba(17, 28, 61, 0.84)" stroke="${tone}" stroke-opacity="0.36" />
            <text x="${badgeX + (badgeWidth / 2)}" y="${badgeY + 16}" fill="${tone}" font-size="11" font-weight="800" text-anchor="middle">${label}</text>
        </g>
    `;
}

function buildCurveSVG(report) {
    const stats = getCurveStats(report);
    const sourceValues = stats.values.length === 1 ? [stats.values[0], stats.values[0]] : stats.values;
    const values = sourceValues.map(value => Math.round(value));
    const width = 720;
    const height = 242;
    const paddingLeft = 78;
    const paddingRight = 58;
    const paddingTop = 34;
    const paddingBottom = 74;
    const plotLeft = paddingLeft;
    const plotRight = width - paddingRight;
    const plotTop = paddingTop;
    const plotBottom = height - paddingBottom;
    const graphWidth = plotRight - plotLeft;
    const graphHeight = plotBottom - plotTop;
    const baselineY = plotBottom;
    const peakLabel = t('morningTree.report.peak') || '峰值';
    const lowLabel = t('morningTree.report.low') || '低值';
    const gradientId = `report-curve-line-${Math.random().toString(36).slice(2, 8)}`;
    const areaId = `report-curve-area-${Math.random().toString(36).slice(2, 8)}`;
    const glowId = `report-curve-glow-${Math.random().toString(36).slice(2, 8)}`;
    const graphMin = Math.min(...values);
    const graphMax = Math.max(...values);
    const paddedMax = Math.max(78, stats.peakValue + 6, graphMax + 4);
    const paddedMin = Math.max(0, Math.min(40, stats.lowValue - 6, graphMin - 4));
    const range = Math.max(16, paddedMax - paddedMin);
    const step = values.length > 1 ? graphWidth / (values.length - 1) : 0;

    const points = values.map((value, index) => {
        const x = plotLeft + (index * step);
        const normalized = (value - paddedMin) / range;
        const y = plotTop + (graphHeight * (1 - normalized));
        return { x, y, value };
    });

    const linePath = buildSmoothCurvePath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
    const peakPoint = points[Math.min(points.length - 1, Math.max(0, stats.peakIndex))] || points[0];
    const lowPoint = points[Math.min(points.length - 1, Math.max(0, stats.lowIndex))] || points[0];
    const chartBounds = {
        left: plotLeft + 6,
        right: plotRight - 6,
        top: plotTop + 2,
        bottom: baselineY - 28,
        midX: plotLeft + (graphWidth / 2)
    };

    const horizontalGrid = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const y = plotTop + (graphHeight * ratio);
        const labelValue = Math.round(paddedMax - (range * ratio));
        return `
            <line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />
            <text x="${plotLeft - 12}" y="${y + 4}" fill="rgba(255,255,255,0.46)" font-size="11" text-anchor="end">${labelValue}</text>
        `;
    }).join('');

    const tickRatios = [0, 0.33, 0.66, 1];
    const timeGrid = tickRatios.map((ratio, index) => {
        const x = plotLeft + (graphWidth * ratio);
        const anchor = index === 0 ? 'start' : index === tickRatios.length - 1 ? 'end' : 'middle';
        return `
            <line x1="${x}" y1="${plotTop}" x2="${x}" y2="${baselineY}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="3 7" />
            <text x="${x}" y="${height - 18}" fill="rgba(255,255,255,0.6)" font-size="10.5" text-anchor="${anchor}">${formatCurveTickLabel(report, ratio)}</text>
        `;
    }).join('');

    const peakBadge = buildCurveBadge(peakPoint, `${peakLabel} ${stats.peakValue} dB`, '#ff9bd6', 'top', chartBounds);
    const lowBadge = buildCurveBadge(lowPoint, `${lowLabel} ${stats.lowValue} dB`, '#8cf7d9', 'bottom', chartBounds);

    return `
        <svg class="report-curve-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#8bf7ff" />
                    <stop offset="50%" stop-color="#75ffd5" />
                    <stop offset="100%" stop-color="#d9ff71" />
                </linearGradient>
                <linearGradient id="${areaId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#7df9ff" stop-opacity="0.34" />
                    <stop offset="65%" stop-color="#7df9ff" stop-opacity="0.1" />
                    <stop offset="100%" stop-color="#7df9ff" stop-opacity="0.02" />
                </linearGradient>
                <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <rect x="${plotLeft}" y="${plotTop}" width="${graphWidth}" height="${graphHeight}" rx="20" fill="rgba(255,255,255,0.03)" />
            ${horizontalGrid}
            ${timeGrid}
            <path d="${areaPath}" fill="url(#${areaId})" stroke="none"></path>
            <path d="${linePath}" fill="none" stroke="rgba(125,249,255,0.18)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId})"></path>
            <path d="${linePath}" fill="none" stroke="url(#${gradientId})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
            <circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="6.5" fill="#ff9bd6" stroke="#ffffff" stroke-width="2.4" />
            <circle cx="${lowPoint.x}" cy="${lowPoint.y}" r="6.5" fill="#8cf7d9" stroke="#ffffff" stroke-width="2.4" />
            <circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="11" fill="none" stroke="rgba(255, 155, 214, 0.24)" stroke-width="2" />
            <circle cx="${lowPoint.x}" cy="${lowPoint.y}" r="11" fill="none" stroke="rgba(140, 247, 217, 0.24)" stroke-width="2" />
            ${peakBadge}
            ${lowBadge}
        </svg>
    `;
}

function startReportSession() {
    STATE.sessionStartedAt = new Date().toISOString();
    STATE.curveBuffer = [Math.round(STATE.currentDB || 40)];
}

function captureReportPoint() {
    if (!STATE.isListening || !STATE.sessionStartedAt) return;
    STATE.curveBuffer.push(Math.round(STATE.currentDB || 40));
}

function finalizeReportSession() {
    if (!STATE.sessionStartedAt) return;

    const startedAt = STATE.sessionStartedAt;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
    const rawCurve = STATE.curveBuffer.length
        ? STATE.curveBuffer.map(point => Math.round(point))
        : [Math.round(STATE.currentDB || 40)];
    const curve = compressCurve(rawCurve, 40);
    const peakDb = Math.max(...rawCurve);
    const lowDb = Math.min(...rawCurve);
    const averageDb = Math.round(rawCurve.reduce((sum, value) => sum + value, 0) / rawCurve.length);

    STATE.sessionStartedAt = null;
    STATE.curveBuffer = [];

    if (durationSeconds < 5) return;

    const nextRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt,
        endedAt,
        durationSeconds,
        curve,
        peakDb,
        lowDb,
        averageDb,
        manifested: Boolean(STATE.hasManifested)
    };

    const nextReports = [
        nextRecord,
        ...loadStoredReports()
    ]
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, MAX_STORED_REPORTS);

    persistReports(nextReports);
    renderWeeklyReport();
}

function getWeeklyDayGroups(reports, monday) {
    return REPORT_WEEKDAYS.map(({ key, offset }) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + offset);
        const dayKey = toDateKey(date);
        const records = reports
            .filter(report => toDateKey(report.startedAt) === dayKey)
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        return {
            key,
            date,
            dateLabel: formatShortDate(date),
            label: t(`morningTree.report.days.${key}`) || key,
            records
        };
    });
}

function pickDefaultReportDay(dayGroups) {
    const today = REPORT_WEEKDAYS[new Date().getDay() === 0 ? 0 : Math.max(0, Math.min(4, new Date().getDay() - 1))]?.key || 'mon';
    return dayGroups.find(group => group.key === today && group.records.length)?.key
        || dayGroups.find(group => group.records.length)?.key
        || 'mon';
}

function renderReportDaySidebar(dayGroups, selectedKey) {
    if (!reportDayChipRow) return;

    reportDayChipRow.innerHTML = dayGroups.map(group => `
        <button
            type="button"
            class="report-day-chip ${group.records.length ? 'has-data' : ''} ${group.key === selectedKey ? 'selected' : ''}"
            data-report-day="${group.key}"
        >
            <div class="report-day-chip-copy">
                <span>${group.label}</span>
                <small>${group.dateLabel}</small>
            </div>
            <strong>${group.records.length}</strong>
        </button>
    `).join('');

    reportDayChipRow.querySelectorAll('[data-report-day]').forEach(button => {
        button.onpointerdown = (event) => {
            event.preventDefault();
            const nextDay = button.getAttribute('data-report-day');
            if (!nextDay) return;
            STATE.reportActiveDay = nextDay;
            STATE.reportActiveSession = 0;
            renderWeeklyReport();
        };
    });
}

function renderReportFocus(selectedDay) {
    if (!reportDayList) return;

    const sessionCountLabel = `${selectedDay.records.length}${t('morningTree.report.sessionSuffix') || '场'}`;
    const selectedIndex = clamp(STATE.reportActiveSession || 0, 0, Math.max(0, selectedDay.records.length - 1));
    STATE.reportActiveSession = selectedIndex;
    const selectedReport = selectedDay.records[selectedIndex] || null;

    if (!selectedReport) {
        reportDayList.innerHTML = `
            <div class="report-day-header">
                <div>
                    <strong>${selectedDay.label}</strong>
                    <span>${selectedDay.dateLabel}</span>
                </div>
                <span class="report-day-count">${sessionCountLabel}</span>
            </div>
            <div class="report-empty-state">${t('morningTree.report.empty') || '当天还没有早读记录'}</div>
        `;
        return;
    }

    const stats = getCurveStats(selectedReport);
    const hasPrev = selectedIndex > 0;
    const hasNext = selectedIndex < selectedDay.records.length - 1;

    reportDayList.innerHTML = `
        <div class="report-day-header">
            <div>
                <strong>${selectedDay.label}</strong>
                <span>${selectedDay.dateLabel}</span>
            </div>
            <span class="report-day-count has-data">${sessionCountLabel}</span>
        </div>

        <div class="report-nav-row">
            <button type="button" class="report-nav-btn" data-report-nav="-1" ${hasPrev ? '' : 'disabled'}>
                ${t('morningTree.report.prevSession') || '上一场'}
            </button>
            <span class="report-nav-status">
                ${(t('morningTree.report.sessionStatus') || '第 {current} / {total} 场')
                    .replace('{current}', String(selectedIndex + 1))
                    .replace('{total}', String(selectedDay.records.length))}
                ${selectedReport.manifested ? '<span class="report-nav-tree" aria-hidden="true">🌳</span>' : ''}
            </span>
            <button type="button" class="report-nav-btn" data-report-nav="1" ${hasNext ? '' : 'disabled'}>
                ${t('morningTree.report.nextSession') || '下一场'}
            </button>
        </div>

        <article class="report-focus-card">
            <div class="report-focus-top">
                <div class="report-session-copy">
                    <strong>${formatPreciseClock(selectedReport.startedAt)} - ${formatPreciseClock(selectedReport.endedAt)}</strong>
                    <span>${formatShortDate(selectedReport.startedAt)}</span>
                </div>
                <div class="report-focus-pills">
                    ${selectedReport.manifested ? `<span class="report-success-pill">🌳 ${t('morningTree.report.manifested') || '显灵成功'}</span>` : ''}
                    <span class="report-duration-pill">${formatDuration(selectedReport.durationSeconds)}</span>
                </div>
            </div>

            <div class="report-curve-panel">
                <div class="report-curve-head">
                    <span class="report-curve-label">${t('morningTree.report.curve') || '早读曲线'}</span>
                    <span class="report-curve-hint">${t('morningTree.report.curveHint') || '峰值 / 低值 / 真实时刻'}</span>
                </div>
                <div class="report-curve-frame">
                    ${buildCurveSVG(selectedReport)}
                </div>
            </div>

            <div class="report-metric-grid">
                <div class="report-metric-card">
                    <span>${t('morningTree.report.duration') || '早读时长'}</span>
                    <strong>${formatDuration(selectedReport.durationSeconds)}</strong>
                </div>
                <div class="report-metric-card peak">
                    <span>${t('morningTree.report.peak') || '峰值'}</span>
                    <strong>${stats.peakValue} dB</strong>
                </div>
                <div class="report-metric-card low">
                    <span>${t('morningTree.report.low') || '低值'}</span>
                    <strong>${stats.lowValue} dB</strong>
                </div>
                <div class="report-metric-card">
                    <span>${t('morningTree.report.average') || '均值'}</span>
                    <strong>${stats.averageValue} dB</strong>
                </div>
            </div>
        </article>
    `;

    reportDayList.querySelectorAll('[data-report-nav]').forEach(button => {
        button.onpointerdown = (event) => {
            event.preventDefault();
            const direction = parseInt(button.getAttribute('data-report-nav'), 10) || 0;
            STATE.reportActiveSession = clamp(
                STATE.reportActiveSession + direction,
                0,
                Math.max(0, selectedDay.records.length - 1)
            );
            renderWeeklyReport();
        };
    });
}

function renderWeeklyReport() {
    if (!reportWeekLabel || !reportDayChipRow || !reportDayList) return;

    const monday = getCurrentWeekMonday();
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const reports = loadStoredReports().filter(report => {
        const startedAt = new Date(report.startedAt).getTime();
        return startedAt >= monday.getTime() && startedAt <= friday.getTime();
    });
    const weeklyPeak = reports.length
        ? Math.max(...reports.map(report => getCurveStats(report).peakValue))
        : 0;
    const dayGroups = getWeeklyDayGroups(reports, monday);
    const defaultDay = pickDefaultReportDay(dayGroups);

    if (!STATE.reportActiveDay || !dayGroups.some(group => group.key === STATE.reportActiveDay)) {
        STATE.reportActiveDay = defaultDay;
    }

    reportWeekLabel.textContent = `${formatShortDate(monday)} - ${formatShortDate(friday)}`;
    if (reportSummaryCount) reportSummaryCount.textContent = `${reports.length}`;
    if (reportSummaryPeak) reportSummaryPeak.textContent = reports.length ? `${weeklyPeak} dB` : '--';

    renderReportDaySidebar(dayGroups, STATE.reportActiveDay);
    const selectedDay = dayGroups.find(group => group.key === STATE.reportActiveDay) || dayGroups[0];
    renderReportFocus(selectedDay);
}

function openReportModal() {
    if (taskModal?.classList.contains('open')) closeTaskModal();
    STATE.reportActiveDay = null;
    STATE.reportActiveSession = 0;
    renderWeeklyReport();
    reportModal.classList.add('open');
    reportModal.setAttribute('aria-hidden', 'false');
}

function closeReportModal() {
    reportModal.classList.remove('open');
    reportModal.setAttribute('aria-hidden', 'true');
}

function initReportUI() {
    if (!reportTriggerBtn || !reportModal) return;

    reportTriggerBtn.onclick = openReportModal;
    reportBackdrop.onclick = closeReportModal;
    reportCloseBtn.onclick = closeReportModal;

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (taskModal?.classList.contains('open')) closeTaskModal();
        if (reportModal?.classList.contains('open')) closeReportModal();
    });

    renderWeeklyReport();
}

function getTaskDayGroups(taskMap, monday = getCurrentWeekMonday()) {
    return REPORT_WEEKDAYS.map(({ key, offset }) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + offset);
        return {
            key,
            date,
            dateLabel: formatShortDate(date),
            label: t(`morningTree.report.days.${key}`) || key,
            payload: normalizeTaskDay(taskMap?.[key])
        };
    });
}

function getMeaningfulTaskSlots(dayTask) {
    return (dayTask?.tasks || []).filter(slot =>
        (slot.content || '').trim() || (slot.start || '').trim() || (slot.end || '').trim()
    );
}

function resolveCurrentTaskSlot(dayTask, now = new Date()) {
    const slots = getMeaningfulTaskSlots(dayTask)
        .map(slot => ({
            ...slot,
            startMinutes: parseClockMinutes(slot.start),
            endMinutes: parseClockMinutes(slot.end)
        }))
        .filter(slot => Number.isFinite(slot.startMinutes) && Number.isFinite(slot.endMinutes))
        .sort((a, b) => a.startMinutes - b.startMinutes);

    if (!slots.length) return { phase: 'empty', current: null, next: null };

    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const active = slots.find(slot => nowMinutes >= slot.startMinutes && nowMinutes <= slot.endMinutes);
    if (active) {
        const next = slots.find(slot => slot.startMinutes > active.endMinutes) || null;
        return { phase: 'active', current: active, next };
    }

    const upcoming = slots.find(slot => slot.startMinutes > nowMinutes);
    if (upcoming) {
        return { phase: 'upcoming', current: upcoming, next: slots.find(slot => slot.startMinutes > upcoming.endMinutes) || null };
    }

    return { phase: 'finished', current: slots[slots.length - 1], next: null };
}

function getWeekdayIndex(key) {
    return REPORT_WEEKDAYS.findIndex(day => day.key === key);
}

function scheduleTaskStripReset() {
    if (taskStripResetTimer) {
        clearTimeout(taskStripResetTimer);
        taskStripResetTimer = null;
    }

    if (!STATE.taskStripPreviewDay || !getCurrentWeekdayKey()) return;

    taskStripResetTimer = setTimeout(() => {
        STATE.taskStripPreviewDay = null;
        taskStripResetTimer = null;
        updateTaskStrip();
    }, 3000);
}

function shiftTaskStripDay(direction) {
    const currentKey = getCurrentWeekdayKey();
    const keys = REPORT_WEEKDAYS.map(day => day.key);
    const baseKey = STATE.taskStripPreviewDay || currentKey || 'mon';
    const baseIndex = Math.max(0, getWeekdayIndex(baseKey));
    const nextIndex = (baseIndex + direction + keys.length) % keys.length;
    STATE.taskStripPreviewDay = keys[nextIndex];
    updateTaskStrip();
    scheduleTaskStripReset();
}

function updateTaskStrip() {
    if (!taskStrip || !taskStripTitle || !taskStripMeta || !taskStripTimeline) return;

    const weekdayKey = getCurrentWeekdayKey();
    const displayDayKey = STATE.taskStripPreviewDay || weekdayKey;
    if (!displayDayKey) {
        taskStrip.classList.add('hidden');
        if (taskStripEmpty) taskStripEmpty.classList.add('hidden');
        if (taskStripTimeline) taskStripTimeline.classList.add('hidden');
        if (taskStripNoteWrap) taskStripNoteWrap.classList.add('hidden');
        return;
    }

    const tasks = STATE.taskDrafts || loadStoredTasks();
    const dayTask = normalizeTaskDay(tasks[displayDayKey]);
    const slots = getMeaningfulTaskSlots(dayTask)
        .map(slot => ({
            ...slot,
            startMinutes: parseClockMinutes(slot.start),
            endMinutes: parseClockMinutes(slot.end)
        }))
        .sort((a, b) => {
            const left = Number.isFinite(a.startMinutes) ? a.startMinutes : Number.MAX_SAFE_INTEGER;
            const right = Number.isFinite(b.startMinutes) ? b.startMinutes : Number.MAX_SAFE_INTEGER;
            return left - right;
        });
    const dayLabel = t(`morningTree.report.days.${displayDayKey}`) || displayDayKey;
    const noteTitle = (dayTask.noteTitle || '').trim();
    const noteBody = (dayTask.noteBody || '').trim();
    const noteHeading = noteTitle || (t('morningTree.tasks.noteDefaultTitle') || '每日感悟');
    const noteText = noteBody || (noteTitle ? '' : (t('morningTree.tasks.noteDefaultBody') || '可在这里输入一段励志短文、每日提醒，或当日早读目标。'));
    const currentWeekdayIndex = getWeekdayIndex(weekdayKey);
    const displayWeekdayIndex = getWeekdayIndex(displayDayKey);
    const now = new Date();
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();

    taskStrip.classList.remove('hidden');
    if (taskStripDay) taskStripDay.textContent = dayLabel;
    if (taskStripDateTime) taskStripDateTime.textContent = formatTaskStripDateTime(now);

    if (taskStripNoteWrap && taskStripNote && taskStripNoteTitle) {
        if (noteHeading || noteText) {
            taskStripNoteTitle.textContent = noteHeading;
            taskStripNote.textContent = noteText;
            taskStripNoteWrap.classList.remove('hidden');
        } else {
            taskStripNote.textContent = '';
            taskStripNoteTitle.textContent = '';
            taskStripNoteWrap.classList.add('hidden');
        }
    }

    if (!slots.length) {
        taskStripTimeline.innerHTML = '';
        taskStripTimeline.classList.add('hidden');
        if (taskStripEmpty) taskStripEmpty.classList.remove('hidden');
        taskStripTitle.textContent = t('morningTree.tasks.emptyToday') || '今日暂无早读任务';
        taskStripMeta.textContent = (t('morningTree.tasks.emptyHint') || '点击右侧今日任务，设置周一到周五内容')
            .replace('{day}', dayLabel);
        return;
    }

    if (taskStripEmpty) taskStripEmpty.classList.add('hidden');
    taskStripTimeline.classList.remove('hidden');

    taskStripTimeline.innerHTML = slots.map(slot => {
        let state = 'pending';
        let stateLabel = t('morningTree.tasks.upcoming') || '即将开始';

        if (displayWeekdayIndex !== -1 && currentWeekdayIndex !== -1) {
            if (displayWeekdayIndex < currentWeekdayIndex) {
                state = 'done';
                stateLabel = '已完成';
            } else if (displayWeekdayIndex === currentWeekdayIndex) {
                if (Number.isFinite(slot.endMinutes) && nowMinutes > slot.endMinutes) {
                    state = 'done';
                    stateLabel = '已完成';
                } else if (Number.isFinite(slot.startMinutes) && Number.isFinite(slot.endMinutes) && nowMinutes >= slot.startMinutes && nowMinutes <= slot.endMinutes) {
                    state = 'active';
                    stateLabel = '进行中';
                }
            }
        }

        return `
            <div class="task-strip-timeline-item is-${state}">
                <span class="task-strip-timeline-marker">${state === 'done' ? '&#10003;' : ''}</span>
                <div class="task-strip-timeline-content">
                    <div class="task-strip-timeline-time">${escapeHtml(slot.start || '--:--')} - ${escapeHtml(slot.end || '--:--')}</div>
                    <strong>${escapeHtml(slot.content || (t('morningTree.tasks.pendingTask') || '请填写任务内容'))}</strong>
                    <span class="task-strip-timeline-state">${stateLabel}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderTaskDaySidebar(dayGroups, selectedKey) {
    if (!taskDayChipRow) return;

    taskDayChipRow.innerHTML = dayGroups.map(group => {
        const slotCount = getMeaningfulTaskSlots(group.payload).length;
        return `
            <button
                type="button"
                class="report-day-chip ${slotCount ? 'has-data' : ''} ${group.key === selectedKey ? 'selected' : ''}"
                data-task-day="${group.key}"
            >
                <div class="report-day-chip-copy">
                    <span>${group.label}</span>
                    <small>${group.dateLabel}</small>
                </div>
                <strong>${slotCount}</strong>
            </button>
        `;
    }).join('');

    taskDayChipRow.querySelectorAll('[data-task-day]').forEach(button => {
        button.onpointerdown = (event) => {
            event.preventDefault();
            const nextDay = button.getAttribute('data-task-day');
            if (!nextDay) return;
            STATE.taskActiveDay = nextDay;
            renderTaskBoard();
        };
    });
}

function updateTaskDraftField(dayKey, field, value, slotIndex = null) {
    if (!STATE.taskDrafts) STATE.taskDrafts = loadStoredTasks();
    if (!STATE.taskDrafts[dayKey]) STATE.taskDrafts[dayKey] = createDefaultTaskDay();

    if (slotIndex === null) {
        STATE.taskDrafts[dayKey][field] = value;
    } else {
        const nextSlots = STATE.taskDrafts[dayKey].tasks || [];
        if (!nextSlots[slotIndex]) nextSlots[slotIndex] = createDefaultTaskSlot(slotIndex);
        nextSlots[slotIndex][field] = value;
        STATE.taskDrafts[dayKey].tasks = nextSlots;
    }
    STATE.taskDrafts[dayKey].updatedAt = new Date().toISOString();
    updateTaskStrip();
}

function syncVisibleTaskFieldsIntoDrafts() {
    if (!taskModal?.classList.contains('open') || !taskDayPanel) return;

    taskDayPanel.querySelectorAll('[data-task-field]').forEach(field => {
        const dayKey = field.getAttribute('data-task-day');
        const taskField = field.getAttribute('data-task-field');
        const slotIndexAttr = field.getAttribute('data-task-slot');
        const slotIndex = slotIndexAttr === null ? null : parseInt(slotIndexAttr, 10);
        if (!dayKey || !taskField) return;
        updateTaskDraftField(dayKey, taskField, field.value, Number.isFinite(slotIndex) ? slotIndex : null);
    });
}

function flashTaskSaveButton() {
    if (!taskSaveBtn) return;

    if (taskSaveFeedbackTimer) {
        clearTimeout(taskSaveFeedbackTimer);
        taskSaveFeedbackTimer = null;
    }

    taskSaveBtn.classList.add('saved');
    taskSaveBtn.textContent = t('morningTree.tasks.savedState') || '已保存';

    taskSaveFeedbackTimer = setTimeout(() => {
        taskSaveBtn.classList.remove('saved');
        taskSaveBtn.textContent = t('morningTree.tasks.save') || '保存到本机';
        taskSaveFeedbackTimer = null;
    }, 1600);
}

function saveTaskDrafts(showSavedToast = false) {
    if (!STATE.taskDrafts) STATE.taskDrafts = loadStoredTasks();
    syncVisibleTaskFieldsIntoDrafts();
    persistTasks(STATE.taskDrafts);
    updateTaskStrip();
    if (taskModal?.classList.contains('open')) renderTaskBoard();
    if (showSavedToast) {
        flashTaskSaveButton();
    }
}

function renderTaskBoard() {
    if (!taskWeekLabel || !taskDayPanel) return;
    if (!STATE.taskDrafts) STATE.taskDrafts = loadStoredTasks();

    const monday = getCurrentWeekMonday();
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const dayGroups = getTaskDayGroups(STATE.taskDrafts, monday);
    const weekdayKey = getCurrentWeekdayKey() || 'mon';
    if (!STATE.taskActiveDay || !dayGroups.some(group => group.key === STATE.taskActiveDay)) {
        STATE.taskActiveDay = weekdayKey;
    }

    taskWeekLabel.textContent = `${formatShortDate(monday)} - ${formatShortDate(friday)}`;
    renderTaskDaySidebar(dayGroups, STATE.taskActiveDay);

    const selectedDay = dayGroups.find(group => group.key === STATE.taskActiveDay) || dayGroups[0];
    const selectedTask = normalizeTaskDay(selectedDay.payload);
    const slots = selectedTask.tasks.length ? selectedTask.tasks : [createDefaultTaskSlot(0)];
    const slotCountLabel = `${getMeaningfulTaskSlots(selectedTask).length}${t('morningTree.tasks.itemSuffix') || '项'}`;

    taskDayPanel.innerHTML = `
        <div class="report-day-header">
            <div>
                <strong>${selectedDay.label}</strong>
                <span>${selectedDay.dateLabel}</span>
            </div>
            <span class="report-day-count ${getMeaningfulTaskSlots(selectedTask).length ? 'has-data' : ''}">${slotCountLabel}</span>
        </div>

        <article class="report-focus-card task-focus-card">
            <div class="task-section-grid">
                <section class="task-panel-card">
                    <div class="task-panel-head">
                        <div>
                            <strong>${t('morningTree.tasks.scheduleTitle') || '早读任务时间轴'}</strong>
                            <span>${t('morningTree.tasks.scheduleSub') || '支持老师按时间段维护任务，自动在当天显示'}</span>
                        </div>
                    </div>
                    <div class="task-slot-list">
                        ${slots.map((slot, index) => `
                            <div class="task-slot-row">
                                <div class="task-slot-times">
                                    <input type="time" class="task-input time" data-task-field="start" data-task-day="${selectedDay.key}" data-task-slot="${index}" value="${slot.start || ''}">
                                    <span class="task-slot-separator">-</span>
                                    <input type="time" class="task-input time" data-task-field="end" data-task-day="${selectedDay.key}" data-task-slot="${index}" value="${slot.end || ''}">
                                </div>
                                <button type="button" class="task-remove-btn" data-task-remove="${index}" ${slots.length <= 1 ? 'disabled' : ''}>✕</button>
                                <textarea class="task-textarea task-textarea-inline" data-task-field="content" data-task-day="${selectedDay.key}" data-task-slot="${index}" placeholder="${t('morningTree.tasks.taskPlaceholder') || '例如：背诵《木兰诗》第 4 部分'}">${slot.content || ''}</textarea>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <section class="task-panel-card">
                    <div class="task-panel-head">
                        <div>
                            <strong>${t('morningTree.tasks.inspirationTitle') || '每日感悟 / 励志短文'}</strong>
                            <span>${t('morningTree.tasks.inspirationSub') || '可输入一句话标题和一段励志短文，面向学生展示'}</span>
                        </div>
                    </div>
                    <div class="task-note-form">
                        <input type="text" class="task-input" data-task-field="noteTitle" data-task-day="${selectedDay.key}" value="${selectedTask.noteTitle || ''}" placeholder="${t('morningTree.tasks.noteTitlePlaceholder') || '例如：想，都是问题；做，才有答案'}">
                        <textarea class="task-textarea" data-task-field="noteBody" data-task-day="${selectedDay.key}" placeholder="${t('morningTree.tasks.noteBodyPlaceholder') || '在这里输入当天想展示给学生的短文、感悟或激励语。'}">${selectedTask.noteBody || ''}</textarea>
                    </div>
                </section>
            </div>
        </article>
    `;

    taskDayPanel.querySelectorAll('[data-task-field]').forEach(field => {
        const eventName = field.type === 'time' ? 'change' : 'input';
        field.addEventListener(eventName, (event) => {
            const target = event.currentTarget;
            const dayKey = target.getAttribute('data-task-day');
            const taskField = target.getAttribute('data-task-field');
            const slotIndexAttr = target.getAttribute('data-task-slot');
            const slotIndex = slotIndexAttr === null ? null : parseInt(slotIndexAttr, 10);
            if (!dayKey || !taskField) return;
            updateTaskDraftField(dayKey, taskField, target.value, Number.isFinite(slotIndex) ? slotIndex : null);
        });
    });

    taskDayPanel.querySelectorAll('[data-task-remove]').forEach(button => {
        button.onpointerdown = (event) => {
            event.preventDefault();
            const index = parseInt(button.getAttribute('data-task-remove'), 10);
            const activeDay = STATE.taskActiveDay;
            if (!activeDay || !Number.isFinite(index) || !STATE.taskDrafts?.[activeDay]) return;
            const nextSlots = [...STATE.taskDrafts[activeDay].tasks];
            nextSlots.splice(index, 1);
            STATE.taskDrafts[activeDay].tasks = nextSlots.length ? nextSlots : [createDefaultTaskSlot(0)];
            STATE.taskDrafts[activeDay].updatedAt = new Date().toISOString();
            renderTaskBoard();
            updateTaskStrip();
        };
    });
}

function openTaskModal() {
    if (reportModal?.classList.contains('open')) closeReportModal();
    STATE.taskDrafts = loadStoredTasks();
    STATE.taskActiveDay = getCurrentWeekdayKey() || 'mon';
    renderTaskBoard();
    taskModal.classList.add('open');
    taskModal.setAttribute('aria-hidden', 'false');
}

function closeTaskModal() {
    saveTaskDrafts(false);
    taskModal.classList.remove('open');
    taskModal.setAttribute('aria-hidden', 'true');
}

function initTaskUI() {
    if (!taskTriggerBtn || !taskModal) return;

    taskTriggerBtn.onclick = openTaskModal;
    taskBackdrop.onclick = closeTaskModal;
    taskCloseBtn.onclick = closeTaskModal;

    if (taskAddSlotBtn) {
        taskAddSlotBtn.onclick = () => {
            if (!STATE.taskDrafts) STATE.taskDrafts = loadStoredTasks();
            const activeDay = STATE.taskActiveDay || getCurrentWeekdayKey() || 'mon';
            const dayTask = normalizeTaskDay(STATE.taskDrafts[activeDay]);
            if (dayTask.tasks.length >= MAX_TASK_SLOTS) return;
            dayTask.tasks.push(createDefaultTaskSlot(dayTask.tasks.length));
            dayTask.updatedAt = new Date().toISOString();
            STATE.taskDrafts[activeDay] = dayTask;
            renderTaskBoard();
        };
    }

    if (taskSaveBtn) {
        taskSaveBtn.onclick = () => saveTaskDrafts(true);
    }

    if (taskStripPrev) {
        taskStripPrev.onclick = () => shiftTaskStripDay(-1);
    }

    if (taskStripNext) {
        taskStripNext.onclick = () => shiftTaskStripDay(1);
    }

    if (taskStripClockTimer) {
        clearInterval(taskStripClockTimer);
    }
    taskStripClockTimer = setInterval(() => {
        updateTaskStrip();
    }, 30000);

    updateTaskStrip();
}


/* --- 1. Gatekeeper Logic --- */
function initGatekeeper() {
    const savedAuth = localStorage.getItem(AUTH_KEY);
    if (savedAuth && savedAuth.startsWith(LICENSE_PREFIX)) {
        showApp();
    } else {
        $('verify-btn').onclick = verifyLicense;
        $('license-input').onkeyup = (e) => {
            if (e.key === 'Enter') verifyLicense();
        };
    }
}

function verifyLicense() {
    const input = $('license-input').value.trim().toUpperCase();
    const errorMsg = $('auth-error');

    // 🚨 前端预检
    if (!input.startsWith(LICENSE_PREFIX) || input.length < 6) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "❌ 授权码无效：授权码必须以 'ZD' 开头且长度不少于 6 位";
        gatekeeper.querySelector('.auth-card').animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
        return;
    }

    if (input.startsWith(LICENSE_PREFIX) && input.length >= 5) {
        localStorage.setItem(AUTH_KEY, input);
        showApp();
    }
}

function showApp() {
    gatekeeper.style.opacity = '0';
    setTimeout(() => {
        gatekeeper.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initCanvas();
        resizeCanvas();
        initTimer();
        initEnvironment();
        updateTaskStrip();
    }, 500);
}

/* --- 2. Timer System --- */
function initTimer() {
    updateTimerDisplay();

    durationSelect.onchange = (e) => {
        const value = e.target.value;
        if (value === 'custom') {
            customDuration.classList.remove('hidden');
        } else {
            customDuration.classList.add('hidden');
            STATE.sessionDuration = parseInt(value);
            STATE.remainingTime = STATE.sessionDuration * 60;
            updateTimerDisplay();
        }
    };

    customDuration.onchange = (e) => {
        const mins = parseInt(e.target.value) || 30;
        STATE.sessionDuration = Math.max(1, Math.min(120, mins));
        STATE.remainingTime = STATE.sessionDuration * 60;
        updateTimerDisplay();
    };
}

function startTimer() {
    if (STATE.timerInterval) return;
    STATE.timerInterval = setInterval(() => {
        if (STATE.remainingTime > 0) {
            captureReportPoint();
            STATE.remainingTime--;
            updateTimerDisplay();
            if (STATE.remainingTime === 0) {
                showToast(t('morningTree.timeEndToast') || "⏰ 早读时间结束！");
                stopMic();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(STATE.remainingTime / 60);
    const secs = STATE.remainingTime % 60;
    countdownTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (ringBar) {
        const totalSec = STATE.sessionDuration * 60;
        // elapsed 0→1 as time passes; with pathLength="100", 100 is full
        const elapsed = totalSec > 0 ? (1 - (STATE.remainingTime / totalSec)) : 0;
        const fillAmount = elapsed * 100;

        // Use dasharray to fill (Segment 1 = solid color, Segment 2 = gap)
        // With pathLength=100, this creates the fill effect under the mask
        ringBar.style.strokeDasharray = `${fillAmount} 100`;
    }

    updateTaskStrip();
}

/* --- 3. Audio Logic --- */
let audioCtx, analyser, dataArray, source, audioStream;

async function toggleMic() {
    if (STATE.isListening) {
        stopMic();
    } else {
        await startMic();
    }
}

async function startMic() {
    try {
        // FIX: If previous session finished, reset everything
        if (STATE.remainingTime === 0) {
            resetGame();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });

        audioStream = stream;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.fftSize);

        STATE.isListening = true;
        micBtn.textContent = '暂停早读';
        micBtn.classList.add('active');
        dbDisplay.classList.add('active');

        if (audioCtx.state === 'suspended') await audioCtx.resume();

        startReportSession();
        startTimer();
        loop();
    } catch (err) {
        console.error("Mic Error:", err);
        alert(t('morningTree.micError') || "无法访问麦克风，请检查权限设置。");
    }
}

function stopMic() {
    if (source) source.disconnect();
    source = null;
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    if (audioCtx) {
        audioCtx.close().catch(() => undefined);
        audioCtx = null;
    }
    analyser = null;
    dataArray = null;
    finalizeReportSession();
    STATE.isListening = false;
    micBtn.textContent = '开始早读';
    micBtn.classList.remove('active');
    dbDisplay.classList.remove('active');
    dbValue.textContent = '--';
    if (STATE.timerInterval) {
        clearInterval(STATE.timerInterval);
        STATE.timerInterval = null;
    }
}

function resetGame() {
    STATE.sessionStartedAt = null;
    STATE.curveBuffer = [];
    STATE.reportActiveSession = 0;
    STATE.energy = 0;
    STATE.isSuperMode = false;
    STATE.hasManifested = false;
    STATE.treeColor = '#4caf50';
    if (STATE.superModeTimer) {
        clearTimeout(STATE.superModeTimer);
        STATE.superModeTimer = null;
    }
    STATE.remainingTime = STATE.sessionDuration * 60;
    updateTimerDisplay();
    sparkles.length = 0;
    energyParticles.length = 0;
    trunkTransfers.length = 0;
    soilTransfers.length = 0;
    resetMeadowPlants();
}

function calculateDB() {
    if (!STATE.isListening || !analyser) return 30;
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const x = (dataArray[i] - 128) / 128;
        sum += x * x;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    let db = 30;
    if (rms > 0) db = (Math.log10(rms) * 20) + 100;

    const adj = (STATE.sensitivity - 50) * 0.5;
    db += adj;
    if (db < 30) db = 30;
    if (db > 120) db = 120;

    return db;
}

/* --- 4. Game Logic --- */
function updateState() {
    if (!STATE.isListening) return;

    const targetDB = calculateDB();
    STATE.currentDB += (targetDB - STATE.currentDB) * 0.3;

    const displayDB = Math.round(STATE.currentDB);
    dbValue.textContent = displayDB;

    if (STATE.currentDB > 85) {
        dbValue.style.color = '#ff6b6b';
        dbDisplay.style.borderColor = 'rgba(255, 107, 107, 0.8)';
        if (dbStatus) { dbStatus.textContent = '📢 太吵了'; dbStatus.style.color = '#ff6b6b'; }
    } else if (STATE.currentDB > 70) {
        dbValue.style.color = '#4caf50';
        dbDisplay.style.borderColor = 'rgba(76, 175, 80, 0.8)';
        if (dbStatus) { dbStatus.textContent = '📚 朗读中'; dbStatus.style.color = '#4caf50'; }
    } else if (STATE.currentDB > 50) {
        dbValue.style.color = '#fff';
        dbDisplay.style.borderColor = 'rgba(255,255,255,0.4)';
        if (dbStatus) { dbStatus.textContent = '🔇 很安静'; dbStatus.style.color = 'rgba(255,255,255,0.7)'; }
    } else {
        dbValue.style.color = '#fff';
        dbDisplay.style.borderColor = 'rgba(255,255,255,0.4)';
        if (dbStatus) { dbStatus.textContent = '等待中'; dbStatus.style.color = 'rgba(255,255,255,0.5)'; }
    }

    if (STATE.hasManifested) {
        STATE.energy = 100;
        energyFill.style.width = '100%';
        return;
    }

    const READING_THRESHOLD = 70;
    if (STATE.currentDB >= READING_THRESHOLD) {
        const volumeBonus = Math.min((STATE.currentDB - READING_THRESHOLD) / 20, 1);
        const rate = STATE.baseGrowthRate * (1 + volumeBonus);
        STATE.energy += rate;

        // FIX: Reduced shake threshold and diverted to canvas only
        if (STATE.currentDB > 100) shakeCanvas(2);
    } else {
        STATE.energy -= 0.05;
    }

    if (STATE.energy < 0) STATE.energy = 0;
    if (STATE.energy > 100) STATE.energy = 100;

    energyFill.style.width = STATE.energy + '%';

    if (STATE.energy >= 100 && !STATE.isSuperMode && !STATE.hasManifested) triggerSuperMode();
}

function triggerSuperMode() {
    if (STATE.superModeTimer) {
        clearTimeout(STATE.superModeTimer);
        STATE.superModeTimer = null;
    }
    STATE.isSuperMode = true;
    STATE.hasManifested = true;
    STATE.energy = 100;
    STATE.treeColor = '#ffd700';
    showToast(t('morningTree.superModeToast') || "🎉 能量树显灵了！全班棒棒哒！ 🎉");

    STATE.superModeTimer = setTimeout(() => {
        STATE.isSuperMode = false;
        STATE.energy = 100;
        STATE.treeColor = '#ffd700';
        STATE.superModeTimer = null;
    }, 5000);
}

// FIX: Renamed to shakeCanvas and targeting canvas only
function shakeCanvas(intensity = 2) {
    canvas.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`;
    setTimeout(() => {
        canvas.style.transform = 'none';
    }, 50);
}

function showToast(msg) {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = 'achievement-text';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

/* --- 5. AESTHETIC Visualization Engine --- */

// --- Environment Systems (Clouds, Birds) ---
const clouds = [];
const birds = [];
const sparkles = [];
const energyParticles = [];
const trunkTransfers = [];
const soilTransfers = [];
const meadowPlants = [];

function pushLimitedEffect(queue, item, maxSize) {
    if (!item) return;
    if (queue.length >= maxSize) {
        queue.splice(0, queue.length - maxSize + 1);
    }
    queue.push(item);
}

function spawnSparkle(x, y, color = '#fff') {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    pushLimitedEffect(sparkles, new Sparkle(x, y, color), getFxLimit('sparkles'));
}

function getFxLoad() {
    return energyParticles.length + trunkTransfers.length + soilTransfers.length + (sparkles.length * 0.3);
}

function getRenderMode(treeSize = 0) {
    const fxLoad = getFxLoad();
    const energyPressure = Math.max(0, STATE.energy - 72) * 0.24;
    const treePressure = Math.max(0, treeSize - 188) / 13;
    const totalPressure = fxLoad + energyPressure + treePressure;

    return {
        fxLoad,
        totalPressure,
        lowPower: totalPressure > 48,
        ultraLowPower: totalPressure > 64
    };
}

function getFxLimit(type, treeSize = 0) {
    const renderMode = getRenderMode(treeSize);
    const baseLimit = FX_LIMITS[type];
    if (!baseLimit) return 0;
    if (renderMode.ultraLowPower) return Math.max(8, Math.round(baseLimit * 0.72));
    if (renderMode.lowPower) return Math.max(10, Math.round(baseLimit * 0.9));
    return baseLimit;
}

function shouldRenderCanopyCluster(depth, len, angle, renderMode) {
    if (!renderMode.lowPower && STATE.energy < 82) return true;

    const density = renderMode.ultraLowPower ? 0.48 : renderMode.lowPower ? 0.68 : 0.84;
    const leafSeed = Math.abs(Math.sin((depth * 1.91) + (len * 0.083) + (angle * 0.047)));
    return leafSeed <= density;
}

class Cloud {
    constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
    }
    reset() {
        this.x = -250 - Math.random() * 200;
        this.y = Math.random() * (canvas.height / 3.5);
        this.speed = Math.random() * 0.2 + 0.15;
        this.size = Math.random() * 0.5 + 0.4;
        this.opacity = Math.random() * 0.2 + 0.1;
    }
    update() {
        this.x += this.speed;
        this.y += Math.sin(Date.now() / 3000 + this.x) * 0.05; // Subtle bobbing
        if (this.x > canvas.width + 250) this.reset();
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.size, this.size);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;

        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.bezierCurveTo(-50, 40, -50, 0, 0, 0);
        ctx.bezierCurveTo(20, -35, 80, -35, 100, 0);
        ctx.bezierCurveTo(160, 0, 160, 40, 100, 40);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class Bird {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = -Math.random() * 500;
        this.y = 50 + Math.random() * (canvas.height / 3);
        this.speed = 2 + Math.random() * 2;
        this.size = 0.5 + Math.random() * 0.5;
        this.wingPhase = Math.random() * Math.PI * 2;
    }
    update() {
        this.x += this.speed;
        this.wingPhase += 0.2;
        if (this.x > canvas.width + 50) this.reset();
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.size, this.size);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const wingY = Math.sin(this.wingPhase) * 5;
        ctx.moveTo(-10, -wingY);
        ctx.quadraticCurveTo(0, 5, 10, -wingY);
        ctx.stroke();
        ctx.restore();
    }
}

class Sparkle {
    constructor(x, y, color = '#fff') {
        this.x = x;
        this.y = y;
        this.vy = -(Math.random() * 2 + 1);
        this.life = 1;
        this.size = 1.5 + Math.random() * 2.5;
        this.color = color;
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function getEnergyAnchors(treeSize) {
    const trunkBaseY = canvas.height - 26;
    const canopyY = canvas.height - 40 - (treeSize * 0.7);
    const rootReach = 70 + (treeSize * 0.18);

    return {
        source: { x: canvas.width - 100, y: 100 },
        beamControl: { x: canvas.width * 0.72, y: canvas.height * 0.2 },
        canopy: { x: canvas.width / 2, y: canopyY },
        trunkBase: { x: canvas.width / 2, y: trunkBaseY },
        soilLeft: { x: (canvas.width / 2) - rootReach, y: trunkBaseY + 28 },
        soilRight: { x: (canvas.width / 2) + rootReach, y: trunkBaseY + 28 }
    };
}

function pointOnQuadratic(start, control, end, t) {
    const inv = 1 - t;
    return {
        x: (inv * inv * start.x) + (2 * inv * t * control.x) + (t * t * end.x),
        y: (inv * inv * start.y) + (2 * inv * t * control.y) + (t * t * end.y)
    };
}

function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

function tangentOnQuadratic(start, control, end, t) {
    return {
        x: (2 * (1 - t) * (control.x - start.x)) + (2 * t * (end.x - control.x)),
        y: (2 * (1 - t) * (control.y - start.y)) + (2 * t * (end.y - control.y))
    };
}

function drawEnergyAura(x, y, radius, color, alpha = 0.2) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) return;

    const safeAlpha = Number.isFinite(alpha) ? Math.max(0, alpha) : 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = safeAlpha;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.18, color);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawParticleTrail(points, color, baseSize, alpha = 0.7) {
    if (points.length < 2) return;
    const renderMode = getRenderMode();
    const step = renderMode.ultraLowPower ? 2 : 1;

    for (let i = 0; i < points.length; i += step) {
        const point = points[i];
        const ratio = (i + 1) / points.length;
        const size = Math.max(0.8, baseSize * (0.25 + ratio * 0.7));
        ctx.globalAlpha = alpha * ratio * ratio;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class SkyEnergy {
    constructor(x, y, targetX, targetY, controlPoint, trunkBase, strength = 0.5) {
        this.start = { x, y };
        this.control = {
            x: controlPoint.x + ((Math.random() - 0.5) * 80),
            y: controlPoint.y + ((Math.random() - 0.5) * 40)
        };
        this.target = { x: targetX, y: targetY };
        this.trunkBase = trunkBase;
        this.strength = strength;
        this.size = 1.8 + (Math.random() * 3.4 * strength);
        this.life = 1;
        this.phase = Math.random() * Math.PI * 2;
        this.hue = ENERGY_TECH_COLORS[Math.floor(Math.random() * ENERGY_TECH_COLORS.length)];
        this.progress = 0;
        this.speed = 0.0048 + (strength * 0.006);
        this.history = [];
        this.x = x;
        this.y = y;
    }
    update() {
        this.phase += 0.08 + (this.strength * 0.03);
        this.progress += this.speed;

        const eased = easeInOutSine(Math.min(1, this.progress));
        const base = pointOnQuadratic(this.start, this.control, this.target, eased);
        const tangent = tangentOnQuadratic(this.start, this.control, this.target, eased);
        const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
        const normalX = -tangent.y / tangentLength;
        const normalY = tangent.x / tangentLength;
        const wobble = Math.sin(this.phase) * (18 + (this.strength * 12)) * (1 - (eased * 0.82));

        this.x = base.x + (normalX * wobble);
        this.y = base.y + (normalY * wobble);
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 9) this.history.shift();

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 18 || this.progress >= 1) {
            spawnSparkle(this.x, this.y, '#c8fff7');
            pushLimitedEffect(
                trunkTransfers,
                new TrunkTransfer(this.x, this.y, this.trunkBase.x, this.trunkBase.y, this.strength, this.hue),
                getFxLimit('trunkTransfers')
            );
            return false;
        }

        this.life = Math.max(0.2, 1 - (eased * 0.35));
        return this.y < canvas.height + 80;
    }
    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawParticleTrail(this.history, this.hue, this.size, Math.max(0.18, this.life * 0.68));

        ctx.globalAlpha = Math.max(0.22, this.life * 0.78);
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 5.2);
        glow.addColorStop(0, this.hue);
        glow.addColorStop(0.45, 'rgba(255,255,255,0.85)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 5.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.min(1, this.life + 0.15);
        ctx.fillStyle = this.hue;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.min(1, this.life + 0.1);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1.2, this.size * 0.42), 0, Math.PI * 2);
        ctx.fill();

        const orbitAngle = this.phase * 1.6;
        ctx.globalAlpha = Math.max(0.12, this.life * 0.42);
        ctx.fillStyle = '#dffcff';
        ctx.beginPath();
        ctx.arc(
            this.x + Math.cos(orbitAngle) * this.size * 2.3,
            this.y + Math.sin(orbitAngle) * this.size * 2.3,
            Math.max(0.7, this.size * 0.24),
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    }
}

class TrunkTransfer {
    constructor(startX, startY, endX, endY, strength, color) {
        this.start = { x: startX, y: startY };
        this.end = { x: endX + ((Math.random() - 0.5) * 10), y: endY };
        this.control = {
            x: ((startX + endX) / 2) + ((Math.random() - 0.5) * 12),
            y: startY + ((endY - startY) * 0.38)
        };
        this.t = 0;
        this.speed = 0.016 + (strength * 0.026);
        this.life = 1;
        this.size = 2.2 + (strength * 2.8);
        this.color = color;
        this.strength = strength;
        this.history = [];
    }
    update() {
        this.t += this.speed;
        if (this.t >= 1) {
            spawnSparkle(this.end.x, this.end.y, '#d8ff66');
            const soilLimit = getFxLimit('soilTransfers');
            const remainingSlots = soilLimit - soilTransfers.length;
            if (remainingSlots >= 2) {
                pushLimitedEffect(soilTransfers, new SoilTransfer(this.end.x, this.end.y, -1, this.strength, this.color), soilLimit);
                pushLimitedEffect(soilTransfers, new SoilTransfer(this.end.x, this.end.y, 1, this.strength, this.color), soilLimit);
            } else if (remainingSlots === 1) {
                pushLimitedEffect(
                    soilTransfers,
                    new SoilTransfer(this.end.x, this.end.y, Math.random() < 0.5 ? -1 : 1, this.strength, this.color),
                    soilLimit
                );
            }
            return false;
        }
        this.life = Math.max(0.25, 1 - (this.t * 0.45));
        return true;
    }
    draw() {
        const eased = easeInOutSine(Math.min(1, this.t));
        const head = pointOnQuadratic(this.start, this.control, this.end, eased);
        this.history.push({ x: head.x, y: head.y });
        if (this.history.length > 8) this.history.shift();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawParticleTrail(this.history, this.color, this.size * 0.9, this.life * 0.76);

        ctx.globalAlpha = this.life;
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, this.size * 4.6);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.35, this.color);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.size * 4.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.min(1, this.life + 0.12);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.size * 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(head.x, head.y, Math.max(1.1, this.size * 0.36), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class SoilTransfer {
    constructor(startX, startY, direction, strength, color) {
        const safeStrength = Number.isFinite(strength) ? strength : 0;
        const spread = 68 + (Math.random() * 54) + (safeStrength * 22);
        this.start = { x: startX, y: startY };
        this.end = { x: startX + (direction * spread), y: startY + 24 + Math.random() * 18 };
        this.control = {
            x: startX + (direction * (26 + Math.random() * 24)),
            y: startY + 16 + Math.random() * 14
        };
        this.t = 0;
        this.speed = 0.018 + (safeStrength * 0.024);
        this.life = 1;
        this.size = 1.6 + (safeStrength * 1.9);
        this.strength = safeStrength;
        this.color = SOIL_FLOW_COLORS[Math.floor(Math.random() * SOIL_FLOW_COLORS.length)] || color;
        this.history = [];
    }
    update() {
        this.t += this.speed;
        if (this.t >= 1) {
            spawnSparkle(this.end.x, this.end.y, this.color);
            feedMeadowGrowth(this.end.x, this.strength, this.color);
            return false;
        }
        this.life = Math.max(0.2, 1 - (this.t * 0.55));
        return true;
    }
    draw() {
        const eased = easeInOutSine(Math.min(1, this.t));
        const head = pointOnQuadratic(this.start, this.control, this.end, eased);
        this.history.push({ x: head.x, y: head.y });
        if (this.history.length > 7) this.history.shift();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawParticleTrail(this.history, this.color, this.size * 0.82, this.life * 0.64);

        ctx.globalAlpha = this.life * 0.82;
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, this.size * 3.8);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.4, this.color);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.size * 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = this.life * 0.9;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function initMeadowPlants() {
    meadowPlants.length = 0;
    const centerX = canvas.width / 2;
    const baseY = canvas.height - 12;
    const petalPalette = ['#ffe082', '#ffcc80', '#ffd1f5', '#d0ff71', '#9ff4ff', '#ffc5df'];

    [-1, 1].forEach(side => {
        for (let i = 0; i < 11; i++) {
            const lane = i % 2;
            const offset = 72 + (i * 22) + Math.random() * 16;
            const flowerBias = i < 4 ? 0.72 : 0.54;
            meadowPlants.push({
                side,
                kind: Math.random() < flowerBias ? 'flower' : 'grass',
                x: centerX + (side * offset),
                baseY: baseY + lane * 4 + Math.random() * 7,
                growth: Math.random() * 0.05,
                stemHeight: 16 + Math.random() * 30,
                bloomSize: 6 + Math.random() * 6,
                bloomCount: 1 + (Math.random() < 0.58 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0),
                swayPhase: Math.random() * Math.PI * 2,
                pulse: 0,
                energyColor: SOIL_FLOW_COLORS[Math.floor(Math.random() * SOIL_FLOW_COLORS.length)],
                petalColor: petalPalette[Math.floor(Math.random() * petalPalette.length)]
            });
        }
    });
}

function resetMeadowPlants() {
    meadowPlants.forEach(plant => {
        plant.growth = Math.random() * 0.04;
        plant.pulse = 0;
        plant.energyColor = SOIL_FLOW_COLORS[Math.floor(Math.random() * SOIL_FLOW_COLORS.length)];
    });
}

function feedMeadowGrowth(sourceX, strength, color) {
    if (!Number.isFinite(sourceX) || !meadowPlants.length) return;

    const safeStrength = Number.isFinite(strength) ? strength : 0;
    const petalPalette = ['#ffe082', '#ffcc80', '#ffd1f5', '#d0ff71', '#9ff4ff', '#ffc5df'];
    const nearby = meadowPlants
        .map(plant => ({ plant, dist: Math.abs(plant.x - sourceX) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 7);

    nearby.forEach(({ plant, dist }) => {
        const distanceFactor = Math.max(0.22, 1 - (dist / 140));
        const currentGrowth = Number.isFinite(plant.growth) ? plant.growth : 0;
        const currentPulse = Number.isFinite(plant.pulse) ? plant.pulse : 0;
        plant.growth = Math.min(1, currentGrowth + distanceFactor * (0.08 + safeStrength * 0.12));
        plant.pulse = Math.min(1, currentPulse + 0.45 + safeStrength * 0.34);
        plant.energyColor = color || plant.energyColor;

        if (plant.kind === 'grass' && safeStrength > 0.22 && currentGrowth > 0.2 && dist < 180) {
            const bloomChance = 0.14 + safeStrength * 0.14;
            if (Math.random() < bloomChance) {
                plant.kind = 'flower';
                plant.bloomSize = 6 + Math.random() * 6;
                plant.bloomCount = 1 + (Math.random() < 0.64 ? 1 : 0) + (Math.random() < 0.28 ? 1 : 0);
                plant.petalColor = petalPalette[Math.floor(Math.random() * petalPalette.length)];
            }
        }
    });
}

function drawGrassBlade(plant, sway, heightScale) {
    const bladeHeight = plant.stemHeight * heightScale * plant.growth;
    if (bladeHeight <= 1) return;

    ctx.beginPath();
    ctx.moveTo(plant.x, plant.baseY);
    ctx.quadraticCurveTo(
        plant.x + sway * 0.45,
        plant.baseY - bladeHeight * 0.65,
        plant.x + sway,
        plant.baseY - bladeHeight
    );
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#78d870';
    ctx.stroke();
}

function drawFlowerCluster(x, y, blossomSize, petalColor) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = petalColor;
        ctx.beginPath();
        ctx.ellipse(0, -blossomSize * 0.72, blossomSize * 0.52, blossomSize * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = '#fff5b7';
    ctx.beginPath();
    ctx.arc(0, 0, blossomSize * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawFlowerPlant(plant, sway, lowPowerMode = false) {
    const growth = plant.growth;
    const stemHeight = plant.stemHeight * growth;
    if (stemHeight <= 1) return;

    const bloomX = plant.x + sway;
    const bloomY = plant.baseY - stemHeight;

    ctx.beginPath();
    ctx.moveTo(plant.x, plant.baseY);
    ctx.quadraticCurveTo(plant.x + sway * 0.35, plant.baseY - stemHeight * 0.55, bloomX, bloomY);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5abf59';
    ctx.stroke();

    ctx.save();
    ctx.translate(plant.x, plant.baseY - stemHeight * 0.45);
    ctx.rotate(-0.6);
    ctx.fillStyle = 'rgba(135, 214, 117, 0.82)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 * growth, 4 * growth, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(plant.x, plant.baseY - stemHeight * 0.28);
    ctx.rotate(0.65);
    ctx.fillStyle = 'rgba(135, 214, 117, 0.72)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 * growth, 3.6 * growth, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (growth < 0.55) return;

    const blossomSize = plant.bloomSize * growth;
    drawEnergyAura(bloomX, bloomY, 5 + plant.pulse * 7, plant.energyColor, 0.05 + plant.pulse * 0.08);

    drawFlowerCluster(bloomX, bloomY, blossomSize, plant.petalColor);

    const bloomCount = lowPowerMode ? 1 : Math.max(1, plant.bloomCount || 1);
    for (let i = 1; i < bloomCount; i++) {
        const direction = i % 2 === 0 ? 1 : -1;
        const offsetX = direction * (6 + i * 4 + plant.pulse * 2);
        const offsetY = 4 + i * 3;
        const miniSize = blossomSize * (0.5 - i * 0.07 + plant.pulse * 0.04);
        if (miniSize <= 1.6) continue;

        drawFlowerCluster(bloomX + offsetX, bloomY + offsetY, miniSize, plant.petalColor);
    }
}

function drawMeadowPlants() {
    const passiveGrowth = Math.max(0, (STATE.currentDB - 56) / 12000);
    const time = Date.now() / 950;
    const lowPowerMode = getRenderMode(80 + (STATE.energy * 1.6)).lowPower;

    meadowPlants.forEach((plant, index) => {
        const baseGrowth = Number.isFinite(plant.growth) ? plant.growth : 0;
        const basePulse = Number.isFinite(plant.pulse) ? plant.pulse : 0;
        if (!Number.isFinite(plant.x) || !Number.isFinite(plant.baseY) || !Number.isFinite(plant.swayPhase)) return;

        plant.growth = Math.min(1, Math.max(0, baseGrowth + passiveGrowth));
        plant.pulse = Math.min(1, Math.max(0, basePulse - 0.016));

        if (plant.growth < 0.03) return;

        const sway = Math.sin(time + plant.swayPhase + index * 0.18) * (lowPowerMode ? 2.4 : 3 + plant.growth * 4);
        drawEnergyAura(
            plant.x,
            plant.baseY - 4,
            (lowPowerMode ? 3.6 : 5) + plant.pulse * (lowPowerMode ? 4.2 : 7),
            plant.energyColor,
            (lowPowerMode ? 0.025 : 0.04) + plant.pulse * (lowPowerMode ? 0.03 : 0.06)
        );

        ctx.save();
        ctx.lineCap = 'round';
        if (plant.kind === 'flower') {
            drawFlowerPlant(plant, sway, lowPowerMode);
        } else {
            drawGrassBlade(plant, sway, 1);
            drawGrassBlade(plant, sway * 0.72 - 6, 0.82);
            drawGrassBlade(plant, sway * 0.65 + 5, 0.74);
            if (!lowPowerMode && (plant.growth > 0.42 || plant.pulse > 0.24)) {
                drawGrassBlade(plant, sway * 0.38 + 8, 0.62);
            }
        }
        ctx.restore();
    });
}

function spawnSkyEnergy(treeSize, anchors) {
    if (!STATE.isListening) return;
    const activation = Math.max(0, (STATE.currentDB - 56) / 26);
    const renderMode = getRenderMode(treeSize);
    const particleLimit = getFxLimit('energyParticles', treeSize);
    if (activation <= 0) return;
    if (energyParticles.length >= particleLimit) return;

    const backlogRatio = energyParticles.length / particleLimit;
    const spawnFactor = renderMode.ultraLowPower ? 0.72 : renderMode.lowPower ? 0.94 : 1.2;
    const shouldSpawn = Math.random() < Math.min(
        0.92,
        ((0.22 + activation * 0.34) * (1 - backlogRatio * 0.45)) * spawnFactor
    );
    if (!shouldSpawn) return;

    const availableSlots = Math.max(0, particleLimit - energyParticles.length);
    if (!availableSlots) return;
    let spawnCount = 1;
    if (!renderMode.ultraLowPower && Math.random() < (0.2 + activation * 0.24)) {
        spawnCount += 1;
    }
    if (!renderMode.lowPower && activation > 0.48 && Math.random() < 0.26) {
        spawnCount += 1;
    }
    spawnCount = Math.min(availableSlots, spawnCount);
    for (let i = 0; i < spawnCount; i++) {
        const targetX = anchors.canopy.x + ((Math.random() - 0.5) * treeSize * 0.16);
        const targetY = anchors.canopy.y + ((Math.random() - 0.5) * treeSize * 0.08);
        const sourceBand = Math.max(90, canvas.width * 0.18);
        const sourceX = canvas.width - 100 + ((Math.random() - 0.5) * sourceBand);
        const sourceY = 90 + (Math.random() * 110);

        pushLimitedEffect(
            energyParticles,
            new SkyEnergy(sourceX, sourceY, targetX, targetY, anchors.beamControl, anchors.trunkBase, activation),
            particleLimit
        );
    }
}

function drawEnergyFlow(treeSize) {
    const activation = Math.max(0, (STATE.currentDB - 56) / 26);
    const anchors = getEnergyAnchors(treeSize);
    const renderMode = getRenderMode(treeSize);
    const hasFlow = activation > 0.04 || energyParticles.length || trunkTransfers.length || soilTransfers.length;
    if (activation > 0.05 && (!renderMode.ultraLowPower || Math.random() < 0.72)) {
        spawnSkyEnergy(treeSize, anchors);
    }

    if (hasFlow) {
        const flowAlpha = Math.min(0.85, 0.18 + activation * 0.55);
        const auraScale = renderMode.ultraLowPower ? 0.64 : renderMode.lowPower ? 0.86 : 1.08;
        drawEnergyAura(anchors.canopy.x, anchors.canopy.y, (14 + (activation * 14)) * auraScale, '#8cf7d9', (0.12 + flowAlpha * 0.2) * auraScale);
        drawEnergyAura(anchors.trunkBase.x, anchors.trunkBase.y, (13 + (activation * 16)) * auraScale, '#d8ff66', (0.1 + flowAlpha * 0.2) * auraScale);

        if (!renderMode.ultraLowPower) {
            drawEnergyAura(anchors.soilLeft.x, anchors.soilLeft.y, (8 + (activation * 6)) * auraScale, '#59f0ff', (0.08 + flowAlpha * 0.12) * auraScale);
            drawEnergyAura(anchors.soilRight.x, anchors.soilRight.y, (8 + (activation * 6)) * auraScale, '#d8ff66', (0.08 + flowAlpha * 0.12) * auraScale);
        }

        if (!renderMode.lowPower) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.max(0.18, flowAlpha * 0.38);
            const soilGlow = ctx.createRadialGradient(anchors.trunkBase.x, anchors.trunkBase.y + 10, 0, anchors.trunkBase.x, anchors.trunkBase.y + 10, 130);
            soilGlow.addColorStop(0, 'rgba(216, 255, 102, 0.55)');
            soilGlow.addColorStop(0.4, 'rgba(89, 240, 255, 0.18)');
            soilGlow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = soilGlow;
            ctx.beginPath();
            ctx.ellipse(anchors.trunkBase.x, anchors.trunkBase.y + 10, 130, 34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    for (let i = energyParticles.length - 1; i >= 0; i--) {
        if (!energyParticles[i].update()) {
            energyParticles.splice(i, 1);
        } else {
            energyParticles[i].draw();
        }
    }

    for (let i = trunkTransfers.length - 1; i >= 0; i--) {
        if (!trunkTransfers[i].update()) {
            trunkTransfers.splice(i, 1);
        } else {
            trunkTransfers[i].draw();
        }
    }

    for (let i = soilTransfers.length - 1; i >= 0; i--) {
        if (!soilTransfers[i].update()) {
            soilTransfers.splice(i, 1);
        } else {
            soilTransfers[i].draw();
        }
    }
}


function initCanvas() {
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (meadowPlants.length) initMeadowPlants();
}

function initEnvironment() {
    clouds.length = 0;
    birds.length = 0;
    sparkles.length = 0;
    energyParticles.length = 0;
    trunkTransfers.length = 0;
    soilTransfers.length = 0;
    initMeadowPlants();
    for (let i = 0; i < 5; i++) clouds.push(new Cloud());
    for (let i = 0; i < 3; i++) birds.push(new Bird());
}

// Enhanced Recursive Tree
function drawEnhancedTree(startX, startY, len, angle, branchWidth, depth, renderMode = { lowPower: false, ultraLowPower: false }) {
    ctx.beginPath();
    ctx.save();
    const frameTime = (STATE.frameNow || Date.now()) / 1000;

    ctx.lineCap = 'round';
    ctx.lineWidth = branchWidth;

    if (depth < 2) {
        const grad = ctx.createLinearGradient(0, 0, 0, -len);
        grad.addColorStop(0, '#4e342e');
        grad.addColorStop(0.5, '#795548');
        grad.addColorStop(1, '#8d6e63');
        ctx.strokeStyle = grad;
    } else {
        ctx.strokeStyle = '#6d4c41';
    }

    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI / 180);

    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, -len / 2, 0, -len);
    ctx.stroke();

    // 🌳 LUSH FOLIAGE (CLUMPS) 🌳
    if (depth >= 4 || (len < 10 && depth > 2)) {
        if (STATE.energy > 15 && shouldRenderCanopyCluster(depth, len, angle, renderMode)) {
            const baseSize = (STATE.energy / 100) * 12 + 3;
            const leafPulse = renderMode.lowPower ? 1 : 1.5;
            const size = baseSize + Math.sin(frameTime + depth) * leafPulse;

            const colorSet = (STATE.isSuperMode || STATE.hasManifested) ? GOLDEN_COLORS : FOLIAGE_COLORS;
            const colorIndex = (depth * 3) % colorSet.length;
            const color = colorSet[colorIndex];

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(0, -len, size, 0, Math.PI * 2);
            ctx.fill();

            if (!renderMode.lowPower) {
                ctx.beginPath();
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.arc(-size * 0.3, -len - size * 0.3, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    const minBranchLen = renderMode.ultraLowPower ? 18 : renderMode.lowPower ? 15 : STATE.energy > 86 ? 11.5 : 10;
    if (len < minBranchLen) {
        ctx.restore();
        return;
    }

    // Branching with Wind
    let wind = 0;
    if (STATE.currentDB > 50) {
        wind = Math.sin(frameTime + depth) * ((STATE.currentDB - 50) / 30) * (depth * 0.5);
    }

    let volumeFactor = (STATE.currentDB - 30) / 70;
    if (volumeFactor < 0) volumeFactor = 0;

    let spread = 20 + (volumeFactor * 10);

    ctx.translate(0, -len);

    const branchCount = 2;
    for (let i = 0; i < branchCount; i++) {
        const dir = i === 0 ? -1 : 1;
        const branchSeed = ((depth + 1) * 1.37) + (i * 2.11) + (len * 0.031) + (angle * 0.017);
        const offset = Math.sin(branchSeed * 3.17) * (renderMode.lowPower ? 2.3 : 4.1);
        const branchAngle = (spread * dir) + wind + offset;
        const lengthSpread = renderMode.ultraLowPower ? 0.018 : 0.03;
        const lengthFactor = 0.71 + (((Math.sin(branchSeed * 5.41) + 1) / 2) * lengthSpread);

        drawEnhancedTree(0, 0, len * lengthFactor, branchAngle, branchWidth * 0.7, depth + 1, renderMode);
    }

    if (!renderMode.lowPower && depth < 3 && len > 42 && STATE.energy > 60 && Math.random() < 0.1) {
        drawEnhancedTree(0, 0, len * 0.6, wind, branchWidth * 0.6, depth + 1, renderMode);
    }

    ctx.restore();
}

function loop() {
    updateState();
    STATE.frameNow = Date.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#4facfe');
    skyGradient.addColorStop(1, '#00f2fe');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const sunScale = 1 + Math.sin(now / 1000) * 0.05;
    ctx.save();
    ctx.translate(canvas.width - 100, 100);
    ctx.scale(sunScale, sunScale);

    // Sun Rays
    ctx.beginPath();
    const sunGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 150);
    sunGrad.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
    sunGrad.addColorStop(1, 'rgba(255, 235, 59, 0)');
    ctx.fillStyle = sunGrad;
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.fillStyle = '#fff176';
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    clouds.forEach(cloud => {
        cloud.update();
        cloud.draw();
    });

    birds.forEach(bird => {
        bird.update();
        bird.draw();
    });

    const treeSize = 80 + (STATE.energy * 1.6);
    const renderMode = getRenderMode(treeSize);

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height - 80, canvas.width, canvas.height);
    ctx.fillStyle = '#66bb6a';
    ctx.fill();

    if (treeSize > 60) {
        drawEnhancedTree(canvas.width / 2, canvas.height - 20, treeSize, 0, treeSize / 9, 0, renderMode);
    } else {
        ctx.beginPath();
        const startX = canvas.width / 2;
        const startY = canvas.height - 30;
        ctx.fillStyle = '#795548';
        ctx.ellipse(startX, startY, 10, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX - 5, startY - 15, startX - 15, startY - 20);
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawEnergyFlow(treeSize);
    drawMeadowPlants();

    const superSparkleChance = renderMode.ultraLowPower ? 0.06 : renderMode.lowPower ? 0.12 : 0.22;
    if (STATE.isSuperMode && Math.random() < superSparkleChance) {
        spawnSparkle(Math.random() * canvas.width, Math.random() * canvas.height);
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
        if (!sparkles[i].update()) {
            sparkles.splice(i, 1);
        } else {
            sparkles[i].draw();
        }
    }

    if (STATE.isListening) {
        requestAnimationFrame(loop);
    }
}


/* --- 6. Initialization & Localization --- */
async function initLocalization() {
    try {
        const lang = STATE.language;
        const response = await fetch(`/locales/${lang}.json`);
        STATE.translations = await response.json();
        translateUI();
    } catch (err) {
        console.error('Failed to load translations:', err);
    }
}

function t(key) {
    if (!STATE.translations) return null;
    const keys = key.split('.');
    let value = STATE.translations;
    for (const k of keys) {
        if (value[k] === undefined) return null;
        value = value[k];
    }
    return value;
}

function translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (translated) el.innerHTML = translated;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = t(key);
        if (translated) el.placeholder = translated;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const translated = t(key);
        if (translated) el.title = translated;
    });

    updateTaskStrip();
    renderWeeklyReport();
    if (taskModal?.classList.contains('open')) renderTaskBoard();
}

// Init
initLocalization().then(() => {
    initGatekeeper();
    initTaskUI();
    initReportUI();
});
micBtn.onclick = toggleMic;
if ($('reset-btn')) $('reset-btn').onclick = resetGame;

window.addEventListener('pagehide', () => {
    saveTaskDrafts(false);
    if (STATE.isListening) stopMic();
});

// 3-level sensitivity buttons
document.querySelectorAll('.sens-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.sens-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.sensitivity = parseInt(btn.dataset.sens);
    };
});

// Fallback: keep slider support if it exists
if ($('sensitivity-slider')) $('sensitivity-slider').oninput = (e) => { STATE.sensitivity = parseInt(e.target.value); };

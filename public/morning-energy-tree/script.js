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
const MAX_STORED_REPORTS = 100;
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
    reportActiveSession: 0
};

// Aesthetic Config
const FOLIAGE_COLORS = ['#43a047', '#66bb6a', '#a5d6a7', '#81c784'];
const GOLDEN_COLORS = ['#ffd700', '#ffecb3', '#fff9c4', '#fff59d'];
const ENERGY_SKY_COLORS = ['#fff176', '#ffe082', '#fff59d', '#ffecb3'];
const ENERGY_TECH_COLORS = ['#7df9ff', '#8cf7d9', '#d2ff72', '#f7ff9c'];
const SOIL_FLOW_COLORS = ['#59f0ff', '#5de2c8', '#9be15d', '#d8ff66'];

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
        );
    } catch (error) {
        console.error('Failed to load morning tree reports:', error);
        return [];
    }
}

function persistReports(reports) {
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports.slice(0, MAX_STORED_REPORTS)));
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

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.max(0, seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

function formatElapsedLabel(durationSeconds, ratio) {
    const elapsed = Math.round(durationSeconds * ratio);
    return formatDuration(elapsed);
}

function buildCurveSVG(report) {
    const stats = getCurveStats(report);
    const values = stats.values;
    const width = 420;
    const height = 180;
    const paddingLeft = 38;
    const paddingRight = 18;
    const paddingTop = 16;
    const paddingBottom = 34;
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;
    const peakLabel = t('morningTree.report.peak') || '峰值';
    const lowLabel = t('morningTree.report.low') || '低值';
    const gradientId = `report-curve-line-${Math.random().toString(36).slice(2, 8)}`;
    const areaId = `report-curve-area-${Math.random().toString(36).slice(2, 8)}`;
    const paddedMax = Math.max(78, stats.peakValue + 4, Math.max(...values) + 3);
    const paddedMin = Math.max(0, Math.min(34, stats.lowValue - 4, Math.min(...values) - 3));
    const range = Math.max(14, paddedMax - paddedMin);
    const step = values.length > 1 ? graphWidth / (values.length - 1) : 0;

    const points = values.map((value, index) => {
        const x = paddingLeft + (index * step);
        const y = paddingTop + (graphHeight * (1 - ((value - paddedMin) / range)));
        return { x, y };
    });
    const linePoints = points.map(point => `${point.x},${point.y}`).join(' ');
    const areaPoints = `${paddingLeft},${height - paddingBottom} ${linePoints} ${width - paddingRight},${height - paddingBottom}`;
    const peakPoint = points[stats.peakIndex] || points[0];
    const lowPoint = points[stats.lowIndex] || points[0];

    const horizontalGrid = Array.from({ length: 4 }, (_, index) => {
        const ratio = index / 3;
        const y = paddingTop + (graphHeight * ratio);
        const labelValue = Math.round(paddedMax - (range * ratio));
        return `
            <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
            <text x="${paddingLeft - 8}" y="${y + 4}" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="end">${labelValue}</text>
        `;
    }).join('');

    const timeGrid = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const x = paddingLeft + (graphWidth * ratio);
        return `
            <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${height - paddingBottom}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
            <text x="${x}" y="${height - 10}" fill="rgba(255,255,255,0.62)" font-size="10" text-anchor="middle">${formatElapsedLabel(report.durationSeconds, ratio)}</text>
        `;
    }).join('');

    return `
        <svg class="report-curve-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#86f7ff" />
                    <stop offset="55%" stop-color="#80ffd5" />
                    <stop offset="100%" stop-color="#d0ff71" />
                </linearGradient>
                <linearGradient id="${areaId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#7df9ff" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#7df9ff" stop-opacity="0.03" />
                </linearGradient>
            </defs>
            <rect x="${paddingLeft}" y="${paddingTop}" width="${graphWidth}" height="${graphHeight}" rx="18" fill="rgba(255,255,255,0.02)" />
            ${horizontalGrid}
            ${timeGrid}
            <polyline fill="url(#${areaId})" stroke="none" points="${areaPoints}"></polyline>
            <polyline fill="none" stroke="url(#${gradientId})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${linePoints}"></polyline>
            <circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="5.5" fill="#ff8fd0" stroke="#ffffff" stroke-width="2" />
            <circle cx="${lowPoint.x}" cy="${lowPoint.y}" r="5.5" fill="#8cf7d9" stroke="#ffffff" stroke-width="2" />
            <text x="${peakPoint.x}" y="${peakPoint.y - 12}" fill="#ff9fda" font-size="11" font-weight="700" text-anchor="middle">${peakLabel} ${stats.peakValue} dB</text>
            <text x="${lowPoint.x}" y="${lowPoint.y + 20}" fill="#8cf7d9" font-size="11" font-weight="700" text-anchor="middle">${lowLabel} ${stats.lowValue} dB</text>
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
        averageDb
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
            </span>
            <button type="button" class="report-nav-btn" data-report-nav="1" ${hasNext ? '' : 'disabled'}>
                ${t('morningTree.report.nextSession') || '下一场'}
            </button>
        </div>

        <article class="report-focus-card">
            <div class="report-focus-top">
                <div class="report-session-copy">
                    <strong>${formatClock(selectedReport.startedAt)} - ${formatClock(selectedReport.endedAt)}</strong>
                    <span>${formatShortDate(selectedReport.startedAt)}</span>
                </div>
                <span class="report-duration-pill">${formatDuration(selectedReport.durationSeconds)}</span>
            </div>

            <div class="report-curve-panel">
                <div class="report-curve-head">
                    <span class="report-curve-label">${t('morningTree.report.curve') || '早读曲线'}</span>
                    <span class="report-curve-hint">${t('morningTree.report.curveHint') || '峰值 / 低值 / 时间分刻'}</span>
                </div>
                ${buildCurveSVG(selectedReport)}
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
        if (event.key === 'Escape') closeReportModal();
    });

    renderWeeklyReport();
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
        micBtn.textContent = '⏸';
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
    micBtn.textContent = '🎤';
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

    if (STATE.energy >= 100 && !STATE.isSuperMode) triggerSuperMode();
}

function triggerSuperMode() {
    STATE.isSuperMode = true;
    STATE.treeColor = '#ffd700';
    showToast(t('morningTree.superModeToast') || "🎉 能量树显灵了！全班棒棒哒！ 🎉");

    setTimeout(() => {
        STATE.isSuperMode = false;
        STATE.energy = 80;
        STATE.treeColor = '#4caf50';
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

    for (let i = 0; i < points.length; i++) {
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
        if (this.history.length > 10) this.history.shift();

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 18 || this.progress >= 1) {
            sparkles.push(new Sparkle(this.x, this.y, '#c8fff7'));
            trunkTransfers.push(new TrunkTransfer(this.x, this.y, this.trunkBase.x, this.trunkBase.y, this.strength, this.hue));
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
            sparkles.push(new Sparkle(this.end.x, this.end.y, '#d8ff66'));
            soilTransfers.push(new SoilTransfer(this.end.x, this.end.y, -1, this.strength, this.color));
            soilTransfers.push(new SoilTransfer(this.end.x, this.end.y, 1, this.strength, this.color));
            return false;
        }
        this.life = Math.max(0.25, 1 - (this.t * 0.45));
        return true;
    }
    draw() {
        const eased = easeInOutSine(Math.min(1, this.t));
        const head = pointOnQuadratic(this.start, this.control, this.end, eased);
        this.history.push({ x: head.x, y: head.y });
        if (this.history.length > 9) this.history.shift();

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
            sparkles.push(new Sparkle(this.end.x, this.end.y, this.color));
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
        if (this.history.length > 8) this.history.shift();

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

    [-1, 1].forEach(side => {
        for (let i = 0; i < 6; i++) {
            const offset = 88 + (i * 28) + Math.random() * 18;
            meadowPlants.push({
                side,
                kind: Math.random() < 0.38 ? 'flower' : 'grass',
                x: centerX + (side * offset),
                baseY: baseY + Math.random() * 6,
                growth: Math.random() * 0.04,
                stemHeight: 18 + Math.random() * 26,
                bloomSize: 7 + Math.random() * 5,
                swayPhase: Math.random() * Math.PI * 2,
                pulse: 0,
                energyColor: SOIL_FLOW_COLORS[Math.floor(Math.random() * SOIL_FLOW_COLORS.length)],
                petalColor: ['#ffe082', '#ffcc80', '#ffd1f5', '#d0ff71'][Math.floor(Math.random() * 4)]
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
    const nearby = meadowPlants
        .map(plant => ({ plant, dist: Math.abs(plant.x - sourceX) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 4);

    nearby.forEach(({ plant, dist }) => {
        const distanceFactor = Math.max(0.22, 1 - (dist / 140));
        const currentGrowth = Number.isFinite(plant.growth) ? plant.growth : 0;
        const currentPulse = Number.isFinite(plant.pulse) ? plant.pulse : 0;
        plant.growth = Math.min(1, currentGrowth + distanceFactor * (0.05 + safeStrength * 0.09));
        plant.pulse = Math.min(1, currentPulse + 0.35 + safeStrength * 0.28);
        plant.energyColor = color || plant.energyColor;
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

function drawFlowerPlant(plant, sway) {
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

    ctx.save();
    ctx.translate(bloomX, bloomY);
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = plant.petalColor;
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

function drawMeadowPlants() {
    const passiveGrowth = Math.max(0, (STATE.currentDB - 58) / 15000);
    const time = Date.now() / 950;

    meadowPlants.forEach((plant, index) => {
        const baseGrowth = Number.isFinite(plant.growth) ? plant.growth : 0;
        const basePulse = Number.isFinite(plant.pulse) ? plant.pulse : 0;
        if (!Number.isFinite(plant.x) || !Number.isFinite(plant.baseY) || !Number.isFinite(plant.swayPhase)) return;

        plant.growth = Math.min(1, Math.max(0, baseGrowth + passiveGrowth));
        plant.pulse = Math.min(1, Math.max(0, basePulse - 0.016));

        if (plant.growth < 0.03) return;

        const sway = Math.sin(time + plant.swayPhase + index * 0.18) * (3 + plant.growth * 4);
        drawEnergyAura(plant.x, plant.baseY - 4, 5 + plant.pulse * 7, plant.energyColor, 0.04 + plant.pulse * 0.06);

        ctx.save();
        ctx.lineCap = 'round';
        if (plant.kind === 'flower') {
            drawFlowerPlant(plant, sway);
        } else {
            drawGrassBlade(plant, sway, 1);
            drawGrassBlade(plant, sway * 0.72 - 6, 0.82);
            drawGrassBlade(plant, sway * 0.65 + 5, 0.74);
        }
        ctx.restore();
    });
}

function spawnSkyEnergy(treeSize, anchors) {
    if (!STATE.isListening) return;
    const activation = Math.max(0, (STATE.currentDB - 56) / 26);
    if (activation <= 0) return;

    const shouldSpawn = Math.random() < (0.24 + activation * 0.42);
    if (!shouldSpawn) return;

    const spawnCount = Math.random() < (0.22 + activation * 0.3) ? 2 : 1;
    for (let i = 0; i < spawnCount; i++) {
        const targetX = anchors.canopy.x + ((Math.random() - 0.5) * treeSize * 0.16);
        const targetY = anchors.canopy.y + ((Math.random() - 0.5) * treeSize * 0.08);
        const sourceBand = Math.max(90, canvas.width * 0.18);
        const sourceX = canvas.width - 100 + ((Math.random() - 0.5) * sourceBand);
        const sourceY = 90 + (Math.random() * 110);

        energyParticles.push(new SkyEnergy(sourceX, sourceY, targetX, targetY, anchors.beamControl, anchors.trunkBase, activation));
    }
}

function drawEnergyFlow(treeSize) {
    const activation = Math.max(0, (STATE.currentDB - 56) / 26);
    const anchors = getEnergyAnchors(treeSize);
    const hasFlow = activation > 0.04 || energyParticles.length || trunkTransfers.length || soilTransfers.length;
    if (activation > 0.05) {
        spawnSkyEnergy(treeSize, anchors);
    }

    if (hasFlow) {
        const flowAlpha = Math.min(0.85, 0.18 + activation * 0.55);
        drawEnergyAura(anchors.canopy.x, anchors.canopy.y, 14 + (activation * 14), '#8cf7d9', 0.12 + flowAlpha * 0.2);
        drawEnergyAura(anchors.trunkBase.x, anchors.trunkBase.y, 13 + (activation * 16), '#d8ff66', 0.1 + flowAlpha * 0.2);
        drawEnergyAura(anchors.soilLeft.x, anchors.soilLeft.y, 8 + (activation * 6), '#59f0ff', 0.08 + flowAlpha * 0.12);
        drawEnergyAura(anchors.soilRight.x, anchors.soilRight.y, 8 + (activation * 6), '#d8ff66', 0.08 + flowAlpha * 0.12);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.max(0.16, flowAlpha * 0.34);
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
function drawEnhancedTree(startX, startY, len, angle, branchWidth, depth) {
    ctx.beginPath();
    ctx.save();

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
        if (STATE.energy > 15) {
            const baseSize = (STATE.energy / 100) * 12 + 3;
            // FIX: Slower wind animation (Date.now() / 1000 instead of / 500)
            const size = baseSize + Math.sin(Date.now() / 1000 + depth) * 1.5;

            const colorSet = STATE.isSuperMode ? GOLDEN_COLORS : FOLIAGE_COLORS;
            const colorIndex = (depth * 3) % colorSet.length;
            const color = colorSet[colorIndex];

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(0, -len, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.arc(-size * 0.3, -len - size * 0.3, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (len < 10) {
        ctx.restore();
        return;
    }

    // Branching with Wind
    let wind = 0;
    if (STATE.currentDB > 50) {
        // FIX: Slower wind (Date.now() / 1000)
        wind = Math.sin(Date.now() / 1000 + depth) * ((STATE.currentDB - 50) / 30) * (depth * 0.5);
    }

    let volumeFactor = (STATE.currentDB - 30) / 70;
    if (volumeFactor < 0) volumeFactor = 0;

    let spread = 20 + (volumeFactor * 10);

    ctx.translate(0, -len);

    const branchCount = 2;
    for (let i = 0; i < branchCount; i++) {
        const dir = i === 0 ? -1 : 1;
        const offset = (Math.random() - 0.5) * 5;
        const branchAngle = (spread * dir) + wind + offset;
        const lengthFactor = 0.72 + (Math.random() * 0.05);

        drawEnhancedTree(0, 0, len * lengthFactor, branchAngle, branchWidth * 0.7, depth + 1);
    }

    if (depth < 3 && STATE.energy > 60 && Math.random() < 0.3) {
        drawEnhancedTree(0, 0, len * 0.6, wind, branchWidth * 0.6, depth + 1);
    }

    ctx.restore();
}

function loop() {
    updateState();

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

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height - 80, canvas.width, canvas.height);
    ctx.fillStyle = '#66bb6a';
    ctx.fill();

    if (treeSize > 60) {
        drawEnhancedTree(canvas.width / 2, canvas.height - 20, treeSize, 0, treeSize / 9, 0);
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

    if (STATE.isSuperMode && Math.random() < 0.2) {
        sparkles.push(new Sparkle(Math.random() * canvas.width, Math.random() * canvas.height));
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
}

// Init
initLocalization().then(() => {
    initGatekeeper();
    initReportUI();
});
micBtn.onclick = toggleMic;
if ($('reset-btn')) $('reset-btn').onclick = resetGame;

window.addEventListener('pagehide', () => {
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

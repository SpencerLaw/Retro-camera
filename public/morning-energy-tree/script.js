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
const FOREST_STORAGE_KEY = 'morning_tree_daily_forest_v1';
const COMPETITION_STORAGE_KEY = 'morning_tree_competition_config_v1';
const MAX_STORED_REPORTS = 100;
const MAX_STORED_FOREST_DAYS = 180;
const MAX_TASK_SLOTS = 6;
const MIN_COMPETITION_GROUPS = 3;
const MAX_COMPETITION_GROUPS = 5;
const REPORT_WEEKDAYS = [
    { key: 'mon', offset: 0 },
    { key: 'tue', offset: 1 },
    { key: 'wed', offset: 2 },
    { key: 'thu', offset: 3 },
    { key: 'fri', offset: 4 },
    { key: 'sat', offset: 5 },
    { key: 'sun', offset: 6 }
];
const DEFAULT_SESSION_DURATION_MINUTES = 30;
const DEFAULT_SESSION_DURATION_SECONDS = DEFAULT_SESSION_DURATION_MINUTES * 60;
const MIN_SYNCED_GROWTH_SECONDS = 8 * 60;
const MAX_SYNCED_GROWTH_SECONDS = 60 * 60;
const SESSION_GROWTH_DURATION_FACTOR = 1.55;
const DEFAULT_GROWTH_PER_SECOND = 100 / (DEFAULT_SESSION_DURATION_SECONDS * SESSION_GROWTH_DURATION_FACTOR);
const WATER_STABLE_SECONDS = 30;
const FERTILIZER_READING_SECONDS = 90;
const WATER_ENERGY_BONUS = 0.25;
const FERTILIZER_ENERGY_BONUS = 0.6;
const FINAL_TREE_HOLD_MS = 30_000;
const TREE_LIFECYCLE_STAGES = [
    { key: 'seed', minEnergy: 0 },
    { key: 'sprout', minEnergy: 14 },
    { key: 'branches', minEnergy: 32 },
    { key: 'leaves', minEnergy: 52 },
    { key: 'flowers', minEnergy: 72 },
    { key: 'fruit', minEnergy: 88 },
    { key: 'final', minEnergy: 100 }
];
const APP_MODES = {
    CLASS: 'class',
    COMPETITION: 'competition'
};

function hasReadingModeSelected(mode = STATE.activeMode) {
    return mode === APP_MODES.CLASS || mode === APP_MODES.COMPETITION;
}

function isCompetitionRoundActive() {
    return Boolean(STATE.competitionRoundActive || STATE.activeMode === APP_MODES.COMPETITION);
}

const STATE = {
    isListening: false,
    energy: 0,
    visualEnergy: 0,
    sensitivity: 50,
    currentDB: 30,
    readingHoldSeconds: 0,
    lastFrameAt: null,
    treeColor: '#4caf50',
    isSuperMode: false,
    hasManifested: false,
    finalVisualReady: false,
    superModeTimer: null,
    finalHoldUntil: null,

    // Timer System
    sessionDuration: DEFAULT_SESSION_DURATION_MINUTES, // minutes
    remainingTime: DEFAULT_SESSION_DURATION_SECONDS,
    timerInterval: null,

    // Growth calibration: syncs visual progress with the selected morning-reading duration.
    baseGrowthRate: DEFAULT_GROWTH_PER_SECOND,

    // Localization context
    language: localStorage.getItem('global-language') || 'en',
    translations: null,

    // Weekly report tracking
    sessionStartedAt: null,
    curveBuffer: [],
    energyCurveBuffer: [],
    manifestedAt: null,
    manifestedElapsedSeconds: null,
    reportEffectiveReadingSeconds: 0,
    reportPeakEnergy: 0,
    rewardState: null,
    activeMode: null,
    competitionConfig: null,
    competitionSession: null,
    competitionLastResult: null,
    activeCompetitionGroupId: null,
    lastCompletedCompetitionGroupId: null,
    competitionRoundActive: false,
    reportActiveDay: null,
    reportActiveSession: 0,
    forestActiveDateKey: null,

    // Weekly task board
    taskActiveDay: null,
    taskDrafts: null,
    taskStripPreviewDay: null,
    competitionLastRenderAt: 0,
    rewardLastRenderAt: 0,
    activeRewardHelp: null,
    frameNow: 0
};

// Aesthetic Config
const FOLIAGE_COLORS = ['#43a047', '#66bb6a', '#a5d6a7', '#81c784'];
const GOLDEN_COLORS = ['#ffd700', '#ffecb3', '#fff9c4', '#fff59d'];
const ENERGY_SKY_COLORS = ['#fff176', '#ffe082', '#fff59d', '#ffecb3'];
const ENERGY_TECH_COLORS = ['#7df9ff', '#8cf7d9', '#d2ff72', '#f7ff9c'];
const SOIL_FLOW_COLORS = ['#59f0ff', '#5de2c8', '#9be15d', '#d8ff66'];
const REWARD_WATER_COLORS = ['#8deeff', '#5bd6ff', '#c9f8ff', '#7df9ff'];
const REWARD_FERTILIZER_COLORS = ['#fff176', '#d8ff66', '#9be15d', '#ffcc80'];
const BLOOM_TREE_LEAF_COLORS = ['#2f8a4b', '#43a85b', '#61bd68', '#86cc72', '#b7dc7a'];
const BLOOM_TREE_FINAL_COLORS = ['#1f6f3a', '#2f8848', '#42a45a', '#65bb67', '#94cc72'];
const BLOOM_TREE_FLOWER_COLORS = ['#ffd1f5', '#ffb7dc', '#fff3a3', '#ffcc80', '#ffffff'];
const TREE_SOIL_COLORS = {
    dark: '#5b3a2a',
    mid: '#7a4b32',
    light: '#a3693b',
    root: '#d0ad72'
};
const FX_LIMITS = {
    sparkles: 88,
    energyParticles: 22,
    trunkTransfers: 16,
    soilTransfers: 18,
    rewardEffects: 120
};
const READING_THRESHOLD = 70;
const QUIET_ENERGY_DECAY_RATE = 0.05;
const SAPLING_TREE_SIZE = 38;
const MATURE_TREE_SIZE = 240;
const VISUAL_ENERGY_GROWTH_RATE = 1.25;
const VISUAL_ENERGY_CATCHUP_RATE = 0.025;
const VISUAL_ENERGY_DECAY_RATE = 4.5;
const VISUAL_FINAL_STAGE_START = 88;
const VISUAL_FINAL_COMPLETE_ENERGY = 99.7;
const SENSITIVITY_MIN = 35;
const SENSITIVITY_MAX = 85;
const SENSITIVITY_DEFAULT = 50;
const FRAME_DELTA_FALLBACK_SECONDS = 1 / 60;
const MAX_FRAME_DELTA_SECONDS = 0.35;

function clampEnergy(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function normalizeDeltaSeconds(deltaSeconds) {
    const numericValue = Number(deltaSeconds);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return FRAME_DELTA_FALLBACK_SECONDS;
    return numericValue;
}

function getSessionGrowthRate(sessionDurationMinutes = STATE.sessionDuration) {
    const minutes = Number(sessionDurationMinutes);
    const durationSeconds = Number.isFinite(minutes) && minutes > 0
        ? minutes * 60
        : DEFAULT_SESSION_DURATION_SECONDS;
    const syncedSeconds = clamp(
        durationSeconds,
        MIN_SYNCED_GROWTH_SECONDS,
        MAX_SYNCED_GROWTH_SECONDS
    );

    return 100 / (syncedSeconds * SESSION_GROWTH_DURATION_FACTOR);
}

function syncSessionGrowthRate(sessionDurationMinutes = STATE.sessionDuration) {
    STATE.baseGrowthRate = getSessionGrowthRate(sessionDurationMinutes);
    return STATE.baseGrowthRate;
}

function getFrameDeltaSeconds(now = Date.now()) {
    if (!STATE.lastFrameAt) return FRAME_DELTA_FALLBACK_SECONDS;
    const elapsedSeconds = normalizeDeltaSeconds((now - STATE.lastFrameAt) / 1000);
    return Math.min(elapsedSeconds, MAX_FRAME_DELTA_SECONDS);
}

function getNextEnergy(currentEnergy, currentDB, baseGrowthRate, options = {}) {
    const profile = getSensitivityProfile(options.sensitivity ?? SENSITIVITY_DEFAULT);
    const deltaSeconds = normalizeDeltaSeconds(options.deltaSeconds);
    const readingHoldSeconds = Number.isFinite(options.readingHoldSeconds)
        ? options.readingHoldSeconds
        : profile.minimumReadingSeconds;
    const safeBaseGrowthRate = Number.isFinite(baseGrowthRate) ? baseGrowthRate : DEFAULT_GROWTH_PER_SECOND;

    if (currentDB >= profile.readingThreshold && readingHoldSeconds >= profile.minimumReadingSeconds) {
        const volumeBonus = Math.min((currentDB - profile.readingThreshold) / 22, 1);
        const rate = safeBaseGrowthRate * profile.growthMultiplier * (1 + volumeBonus);
        return clampEnergy(currentEnergy + (rate * deltaSeconds));
    }

    return clampEnergy(currentEnergy - (QUIET_ENERGY_DECAY_RATE * profile.quietDecayMultiplier * deltaSeconds));
}

function getNextVisualEnergy(currentEnergy, targetEnergy, deltaSeconds = FRAME_DELTA_FALLBACK_SECONDS) {
    const current = clampEnergy(Number.isFinite(currentEnergy) ? currentEnergy : targetEnergy);
    const target = clampEnergy(targetEnergy);
    const diff = target - current;
    const distance = Math.abs(diff);
    if (distance <= 0.03) return target;

    const frameSeconds = normalizeDeltaSeconds(deltaSeconds);
    const rate = diff > 0
        ? VISUAL_ENERGY_GROWTH_RATE + (distance * VISUAL_ENERGY_CATCHUP_RATE)
        : VISUAL_ENERGY_DECAY_RATE;
    const step = Math.min(distance, rate * frameSeconds);

    return clampEnergy(current + Math.sign(diff) * step);
}

function getTreeDisplayEnergy() {
    const visualEnergy = Number.isFinite(STATE.visualEnergy) ? STATE.visualEnergy : STATE.energy;
    return clampEnergy(visualEnergy);
}

function updateVisualEnergy(deltaSeconds = FRAME_DELTA_FALLBACK_SECONDS) {
    const targetEnergy = STATE.hasManifested ? 100 : STATE.energy;
    STATE.visualEnergy = getNextVisualEnergy(getTreeDisplayEnergy(), targetEnergy, deltaSeconds);
    return STATE.visualEnergy;
}

function getFinalRevealProgress(visualEnergy = getTreeDisplayEnergy()) {
    return clamp(
        (clampEnergy(visualEnergy) - VISUAL_FINAL_STAGE_START) /
        Math.max(1, 100 - VISUAL_FINAL_STAGE_START),
        0,
        1
    );
}

function getFinalTreeMorphProgress(stageOrReveal = 0) {
    const rawProgress = typeof stageOrReveal === 'number'
        ? stageOrReveal
        : Number(stageOrReveal?.finalReveal) || 0;
    const progress = clamp(rawProgress, 0, 1);
    return progress * progress * (3 - (2 * progress));
}

function getTreeDisplayLifecycleStage(visualEnergy = getTreeDisplayEnergy()) {
    const displayEnergy = clampEnergy(visualEnergy);
    const displayManifested = STATE.hasManifested && displayEnergy >= VISUAL_FINAL_STAGE_START;
    const lifecycleStage = getTreeLifecycleStage({
        finalEnergy: displayEnergy,
        manifested: displayManifested
    });

    if (lifecycleStage.key !== 'final') return lifecycleStage;

    return {
        ...lifecycleStage,
        finalReveal: getFinalRevealProgress(displayEnergy)
    };
}

function maybeAnnounceFinalTree(lifecycleStage) {
    if (!STATE.hasManifested || STATE.finalVisualReady) return;
    if (getTreeDisplayEnergy() < VISUAL_FINAL_COMPLETE_ENERGY || lifecycleStage?.key !== 'final') return;

    STATE.finalVisualReady = true;
    showToast(t('morningTree.superModeToast') || "🎉 能量树显灵了！全班棒棒哒！ 🎉");
}

function getTreeSizeForEnergy(energy) {
    const normalizedEnergy = clampEnergy(energy) / 100;
    return SAPLING_TREE_SIZE + ((MATURE_TREE_SIZE - SAPLING_TREE_SIZE) * normalizedEnergy);
}

function getTreeRenderSize(energy, viewport = {}) {
    const logicalSize = getTreeSizeForEnergy(energy);
    const viewportHeight = Number.isFinite(viewport.height)
        ? viewport.height
        : Number.isFinite(canvas?.height)
            ? canvas.height
            : window.innerHeight;
    const viewportWidth = Number.isFinite(viewport.width)
        ? viewport.width
        : Number.isFinite(canvas?.width)
            ? canvas.width
            : window.innerWidth;
    const heightCap = clamp(viewportHeight * 0.18, 118, 172);
    const widthCap = clamp(viewportWidth * 0.16, 112, 176);
    const renderCap = Math.min(heightCap, widthCap);

    return Math.min(logicalSize, renderCap);
}

function clampSensitivity(value) {
    const numericValue = Number.parseInt(value, 10);
    if (!Number.isFinite(numericValue)) return SENSITIVITY_DEFAULT;
    return Math.max(SENSITIVITY_MIN, Math.min(SENSITIVITY_MAX, numericValue));
}

function getSensitivityDbOffset(sensitivity) {
    const safeSensitivity = clampSensitivity(sensitivity);
    const delta = safeSensitivity - 50;
    return delta < 0 ? delta * 0.42 : delta * 0.3;
}

function applySensitivityToDb(rawDb, sensitivity) {
    const safeDb = Number.isFinite(rawDb) ? rawDb : 30;
    return Math.max(30, Math.min(120, safeDb + getSensitivityDbOffset(sensitivity)));
}

function getSensitivityProfile(sensitivity) {
    const safeSensitivity = clampSensitivity(sensitivity);
    const lowRatio = safeSensitivity < SENSITIVITY_DEFAULT
        ? (SENSITIVITY_DEFAULT - safeSensitivity) / (SENSITIVITY_DEFAULT - SENSITIVITY_MIN)
        : 0;
    const highRatio = safeSensitivity > SENSITIVITY_DEFAULT
        ? (safeSensitivity - SENSITIVITY_DEFAULT) / (SENSITIVITY_MAX - SENSITIVITY_DEFAULT)
        : 0;

    return {
        readingThreshold: READING_THRESHOLD + (lowRatio * 4) - (highRatio * 4),
        growthMultiplier: Math.max(0.4, 1 - (lowRatio * 0.55) + (highRatio * 0.25)),
        minimumReadingSeconds: Math.max(0.2, 0.45 + (lowRatio * 0.75) - (highRatio * 0.2)),
        quietDecayMultiplier: Math.max(0.65, 1 + (lowRatio * 0.35) - (highRatio * 0.15))
    };
}

/* --- DOM Elements --- */
const $ = (id) => document.getElementById(id);
const gatekeeper = $('gatekeeper-screen');
const appContainer = $('app-container');
const canvas = $('tree-canvas');
const ctx = canvas.getContext('2d');
const modePicker = $('mode-picker');
const modeChoiceButtons = document.querySelectorAll('[data-mode-choice]');
const currentModeBadge = $('current-mode-badge');
const modeSwitchBtn = $('mode-switch-btn');
const energyFill = $('energy-fill');
const rewardEnergyFloat = $('reward-energy-float');
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
const forestTriggerBtn = $('forest-trigger-btn');
const forestModal = $('forest-modal');
const forestBackdrop = $('forest-backdrop');
const forestCloseBtn = $('forest-close-btn');
const forestWeekLabel = $('forest-week-label');
const forestMapGrid = $('forest-map-grid');
const forestDetail = $('forest-detail');
const forestBody = $('forest-body');
const competitionPanel = $('competition-panel');
const competitionGroupCount = $('competition-group-count');
const competitionList = $('competition-list');
const competitionEditBtn = $('competition-edit-btn');
const competitionEditor = $('competition-editor');
const competitionFields = $('competition-fields');
const competitionSaveBtn = $('competition-save-btn');
const competitionResetBtn = $('competition-reset-btn');
const competitionSummary = $('competition-summary');
const rewardPanel = $('reward-panel');
const rewardLivePanel = $('reward-live-panel');

// Help Tooltip Toggle
const helpTrigger = $('help-trigger');
const helpTooltip = $('help-tooltip');
const dbStatus = $('db-status');
const ringBar = $('ring-bar');
const sensitivitySlider = $('sensitivity-slider');
const sensitivityValue = $('sensitivity-value');
const sensitivityHint = $('sensitivity-hint');
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

function getTreeLifecycleStage(source) {
    const sourceObject = typeof source === 'object' && source !== null ? source : { finalEnergy: source };
    const rawEnergy = Number(
        sourceObject.finalEnergy ?? sourceObject.energy ?? sourceObject.peakEnergy ?? sourceObject.energyScore ?? 0
    );
    const energy = clampEnergy(Number.isFinite(rawEnergy) ? rawEnergy : 0);
    const manifested = Boolean(sourceObject.manifested) || energy >= 100;
    const stageIndex = manifested
        ? TREE_LIFECYCLE_STAGES.length - 1
        : TREE_LIFECYCLE_STAGES.reduce((bestIndex, stage, index) => (
            energy >= stage.minEnergy ? index : bestIndex
        ), 0);
    const stage = TREE_LIFECYCLE_STAGES[stageIndex];
    const nextStage = TREE_LIFECYCLE_STAGES[stageIndex + 1] || null;
    const prevStage = TREE_LIFECYCLE_STAGES[Math.max(0, stageIndex - 1)];
    const rangeStart = stage.minEnergy;
    const rangeEnd = nextStage?.minEnergy ?? 100;
    const progress = nextStage
        ? clamp((energy - rangeStart) / Math.max(1, rangeEnd - rangeStart), 0, 1)
        : 1;

    return {
        ...stage,
        index: stageIndex,
        energy: Math.round(energy),
        labelKey: `morningTree.lifecycle.${stage.key}`,
        previousKey: prevStage?.key || stage.key,
        nextKey: nextStage?.key || null,
        progress
    };
}

function getAudioActivation(currentDB, profile = getSensitivityProfile(STATE.sensitivity), readingHoldSeconds = STATE.readingHoldSeconds) {
    const safeDb = Number.isFinite(currentDB) ? currentDB : 30;
    const threshold = Number.isFinite(profile?.readingThreshold) ? profile.readingThreshold : READING_THRESHOLD;
    const holdSeconds = Number.isFinite(readingHoldSeconds) ? Math.max(0, readingHoldSeconds) : 0;
    const minimumHold = Number.isFinite(profile?.minimumReadingSeconds) ? Math.max(0.1, profile.minimumReadingSeconds) : 0.45;
    const dbRatio = clamp((safeDb - (threshold - 8)) / 36, 0, 1.35);
    const holdRatio = clamp(holdSeconds / (minimumHold + 0.8), 0, 1);
    const stabilityBoost = 0.58 + (holdRatio * 0.42);
    const intensity = clamp(dbRatio * stabilityBoost, 0, 1.42);

    return {
        intensity,
        dbRatio,
        holdRatio,
        orbCount: Math.max(0, Math.round(1 + (intensity * 5))),
        glow: clamp(0.14 + (intensity * 0.68), 0.14, 1),
        speed: clamp(0.8 + (intensity * 1.1), 0.8, 2.4)
    };
}

function getFinalTreeVisualState(options = {}) {
    const stage = options.stage || null;
    const manifested = options.manifested ?? STATE.hasManifested;
    const isFinalStage = stage?.key === 'final';
    if (!manifested && !isFinalStage) {
        return {
            active: false,
            intensity: 0,
            brightness: 1,
            canopyAlpha: 1,
            flowerAlpha: 1,
            branchAlpha: 1,
            glowAlpha: 0,
            quiet: false
        };
    }

    const sensitivity = options.sensitivity ?? STATE.sensitivity;
    const currentDB = Number.isFinite(options.currentDB) ? options.currentDB : STATE.currentDB;
    const readingHoldSeconds = Number.isFinite(options.readingHoldSeconds)
        ? Math.max(0, options.readingHoldSeconds)
        : STATE.readingHoldSeconds;
    const activation = getAudioActivation(currentDB, getSensitivityProfile(sensitivity), readingHoldSeconds);
    const voiceIntensity = clamp(activation.intensity / 1.18, 0, 1);
    const steadyVoice = clamp((voiceIntensity * 0.7) + (activation.holdRatio * 0.3), 0, 1);
    const pulse = (Math.sin(((STATE.frameNow || Date.now()) / 1000) * 2.2) + 1) / 2;

    return {
        active: true,
        intensity: steadyVoice,
        brightness: clamp(0.46 + steadyVoice * 0.54, 0.46, 1),
        canopyAlpha: clamp(0.58 + steadyVoice * 0.42, 0.58, 1),
        flowerAlpha: clamp(0.52 + steadyVoice * 0.48, 0.52, 1),
        branchAlpha: clamp(0.7 + steadyVoice * 0.3, 0.7, 1),
        glowAlpha: clamp(0.02 + steadyVoice * 0.28 + pulse * steadyVoice * 0.05, 0.02, 0.35),
        quiet: steadyVoice < 0.18,
        pulse
    };
}

function updateFinalEnergyVisuals(finalVisualState = null) {
    if (!appContainer || !dbDisplay) return null;

    if (!STATE.hasManifested) {
        delete appContainer.dataset.finalVoice;
        appContainer.style?.setProperty?.('--final-voice-intensity', '0');
        dbDisplay.classList.remove('final-tree-quiet', 'final-tree-steady', 'final-tree-glow');
        return null;
    }

    const visualState = finalVisualState || getFinalTreeVisualState({ stage: { key: 'final' } });
    const intensity = clamp(Number(visualState?.intensity) || 0, 0, 1);
    const finalVoice = intensity >= 0.58
        ? 'glow'
        : intensity >= 0.22
            ? 'steady'
            : 'quiet';

    appContainer.dataset.finalVoice = finalVoice;
    appContainer.style?.setProperty?.('--final-voice-intensity', intensity.toFixed(2));
    dbDisplay.classList.toggle('final-tree-quiet', finalVoice === 'quiet');
    dbDisplay.classList.toggle('final-tree-steady', finalVoice === 'steady');
    dbDisplay.classList.toggle('final-tree-glow', finalVoice === 'glow');

    return finalVoice;
}

function createSessionRewardState() {
    return {
        waterCount: 0,
        fertilizerCount: 0,
        stableReadingSeconds: 0,
        nextWaterAt: WATER_STABLE_SECONDS,
        nextFertilizerAt: FERTILIZER_READING_SECONDS
    };
}

function getNextRewardTarget(count, intervalSeconds) {
    const safeCount = Math.max(0, Math.round(Number(count) || 0));
    return (safeCount + 1) * intervalSeconds;
}

function updateSessionRewards(rewardState, options = {}) {
    const state = rewardState || createSessionRewardState();
    const deltaSeconds = normalizeDeltaSeconds(options.deltaSeconds);
    const effectiveReadingSeconds = Number.isFinite(options.effectiveReadingSeconds)
        ? Math.max(0, options.effectiveReadingSeconds)
        : 0;
    const isReadingLoudly = Boolean(options.isReadingLoudly);

    if (isReadingLoudly) {
        state.stableReadingSeconds = (state.stableReadingSeconds || 0) + deltaSeconds;
        while (
            state.stableReadingSeconds >= (state.nextWaterAt || WATER_STABLE_SECONDS)
        ) {
            state.waterCount = (state.waterCount || 0) + 1;
            state.nextWaterAt = getNextRewardTarget(state.waterCount, WATER_STABLE_SECONDS);
        }
    } else if (!isReadingLoudly) {
        state.stableReadingSeconds = Math.max(0, (state.stableReadingSeconds || 0) - (deltaSeconds * 0.5));
    }

    if (isReadingLoudly) {
        while (
            effectiveReadingSeconds >= (state.nextFertilizerAt || FERTILIZER_READING_SECONDS)
        ) {
            state.fertilizerCount = (state.fertilizerCount || 0) + 1;
            state.nextFertilizerAt = getNextRewardTarget(state.fertilizerCount, FERTILIZER_READING_SECONDS);
        }
    }

    return state;
}

function getRewardEnergyBonus(previousCounts = {}, nextState = {}) {
    const previousWaterCount = Math.max(0, Math.round(Number(previousCounts.waterCount) || 0));
    const previousFertilizerCount = Math.max(0, Math.round(Number(previousCounts.fertilizerCount) || 0));
    const nextWaterCount = Math.max(0, Math.round(Number(nextState.waterCount) || 0));
    const nextFertilizerCount = Math.max(0, Math.round(Number(nextState.fertilizerCount) || 0));
    const waterBonus = Math.max(0, nextWaterCount - previousWaterCount) * WATER_ENERGY_BONUS;
    const fertilizerBonus = Math.max(0, nextFertilizerCount - previousFertilizerCount) * FERTILIZER_ENERGY_BONUS;

    return {
        waterBonus,
        fertilizerBonus,
        totalBonus: waterBonus + fertilizerBonus
    };
}

function applyRewardEnergyBonus(currentEnergy, rewardBonus = {}) {
    const totalBonus = Number.isFinite(rewardBonus.totalBonus) ? rewardBonus.totalBonus : 0;
    return clampEnergy((Number.isFinite(currentEnergy) ? currentEnergy : 0) + totalBonus);
}

function getRewardBonusLabel(rewardBonus = {}) {
    const parts = [];
    const waterBonus = Number(rewardBonus.waterBonus) || 0;
    const fertilizerBonus = Number(rewardBonus.fertilizerBonus) || 0;

    if (waterBonus > 0) {
        parts.push(`${t('morningTree.rewards.water') || '浇水'} +${waterBonus}%`);
    }
    if (fertilizerBonus > 0) {
        parts.push(`${t('morningTree.rewards.fertilizer') || '施肥'} +${fertilizerBonus}%`);
    }

    return parts.join(' · ');
}

function flashRewardEnergyBonus(rewardBonus = {}) {
    if (!(rewardBonus.totalBonus > 0)) return;

    const waterTriggerCount = rewardBonus.waterBonus > 0
        ? Math.max(1, Math.round(rewardBonus.waterBonus / WATER_ENERGY_BONUS))
        : 0;
    const fertilizerTriggerCount = rewardBonus.fertilizerBonus > 0
        ? Math.max(1, Math.round(rewardBonus.fertilizerBonus / FERTILIZER_ENERGY_BONUS))
        : 0;

    if (waterTriggerCount > 0) {
        spawnRewardAnimation('water', waterTriggerCount);
    }
    if (fertilizerTriggerCount > 0) {
        spawnRewardAnimation('fertilizer', fertilizerTriggerCount);
    }

    if (!energyFill) return;

    energyFill.classList.remove('reward-boost');
    // Restart the short flash even if water and fertilizer trigger close together.
    void energyFill.offsetWidth;
    energyFill.classList.add('reward-boost');
    setTimeout(() => energyFill.classList.remove('reward-boost'), 1300);

    if (rewardEnergyFloat) {
        const label = getRewardBonusLabel(rewardBonus);
        rewardEnergyFloat.textContent = label || `+${rewardBonus.totalBonus}%`;
        rewardEnergyFloat.classList.remove('show');
        void rewardEnergyFloat.offsetWidth;
        rewardEnergyFloat.classList.add('show');
        setTimeout(() => rewardEnergyFloat.classList.remove('show'), 2400);
    }
}

function getRewardProgress(rewardState = createSessionRewardState(), effectiveReadingSeconds = STATE.reportEffectiveReadingSeconds) {
    const state = rewardState || createSessionRewardState();
    const stableReadingSeconds = Math.max(0, Number(state.stableReadingSeconds) || 0);
    const readingSeconds = Math.max(0, Number(effectiveReadingSeconds) || 0);
    const waterCount = Math.max(0, Math.round(Number(state.waterCount) || 0));
    const fertilizerCount = Math.max(0, Math.round(Number(state.fertilizerCount) || 0));
    const waterTargetSeconds = Math.max(
        WATER_STABLE_SECONDS,
        Number.isFinite(state.nextWaterAt)
            ? state.nextWaterAt
            : getNextRewardTarget(waterCount, WATER_STABLE_SECONDS)
    );
    const fertilizerTargetSeconds = Math.max(
        FERTILIZER_READING_SECONDS,
        Number.isFinite(state.nextFertilizerAt)
            ? state.nextFertilizerAt
            : getNextRewardTarget(fertilizerCount, FERTILIZER_READING_SECONDS)
    );
    const waterBaseSeconds = Math.max(0, waterCount * WATER_STABLE_SECONDS);
    const fertilizerBaseSeconds = Math.max(0, fertilizerCount * FERTILIZER_READING_SECONDS);

    return {
        waterCount,
        fertilizerCount,
        stableReadingSeconds,
        effectiveReadingSeconds: readingSeconds,
        waterTargetSeconds,
        fertilizerTargetSeconds,
        waterRemainingSeconds: Math.ceil(Math.max(0, waterTargetSeconds - stableReadingSeconds)),
        fertilizerRemainingSeconds: Math.ceil(Math.max(0, fertilizerTargetSeconds - readingSeconds)),
        waterProgressRatio: clamp((stableReadingSeconds - waterBaseSeconds) / Math.max(1, waterTargetSeconds - waterBaseSeconds), 0, 1),
        fertilizerProgressRatio: clamp((readingSeconds - fertilizerBaseSeconds) / Math.max(1, fertilizerTargetSeconds - fertilizerBaseSeconds), 0, 1),
        waterComplete: false,
        fertilizerComplete: false
    };
}

function formatRewardSeconds(seconds) {
    return `${Math.max(0, Math.round(Number(seconds) || 0))}s`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getRewardHelpContent(type) {
    const fallback = {
        water: {
            title: '浇水触发条件',
            condition: `声音进入稳定朗读区后每连续保持 ${WATER_STABLE_SECONDS} 秒触发一次，不设上限。`,
            effect: `每次自动浇水，并让成长进度 +${WATER_ENERGY_BONUS}%。`,
            blocker: '如果没有触发，多半是声音断续，或还没有连续保持在朗读区。'
        },
        fertilizer: {
            title: '施肥触发条件',
            condition: `本场有效朗读每累计 ${FERTILIZER_READING_SECONDS} 秒触发一次，不设上限。`,
            effect: `每次自动施肥，并让成长进度 +${FERTILIZER_ENERGY_BONUS}%。`,
            blocker: '如果已经很响但没有触发，请看是否还没有累计到下一次施肥时间。'
        }
    };
    const key = type === 'fertilizer' ? 'fertilizer' : 'water';
    const copy = fallback[key] || fallback.water;
    return {
        title: t(`morningTree.rewards.${key}HelpTitle`) || copy.title,
        condition: t(`morningTree.rewards.${key}HelpCondition`) || copy.condition,
        effect: t(`morningTree.rewards.${key}HelpEffect`) || copy.effect,
        blocker: t(`morningTree.rewards.${key}HelpBlocker`) || copy.blocker
    };
}

function getRewardHelpId(type) {
    return `reward-help-${type === 'fertilizer' ? 'fertilizer' : 'water'}`;
}

function isRewardHelpType(type) {
    return type === 'water' || type === 'fertilizer';
}

function setActiveRewardHelp(type) {
    if (!isRewardHelpType(type)) return;
    STATE.activeRewardHelp = STATE.activeRewardHelp === type ? null : type;
    renderRewardPanel();
}

function renderRewardHelp(type) {
    if (STATE.activeRewardHelp !== type) return '';

    const help = getRewardHelpContent(type);
    const conditionLabel = t('morningTree.rewards.conditionLabel') || '触发条件';
    const effectLabel = t('morningTree.rewards.effectLabel') || '成长奖励';
    const blockerLabel = t('morningTree.rewards.blockerLabel') || '为什么没触发';

    return `
        <div id="${getRewardHelpId(type)}" class="reward-card-help" role="note">
            <strong>${escapeHtml(help.title)}</strong>
            <p><span>${escapeHtml(conditionLabel)}：</span>${escapeHtml(help.condition)}</p>
            <p><span>${escapeHtml(effectLabel)}：</span>${escapeHtml(help.effect)}</p>
            <p><span>${escapeHtml(blockerLabel)}：</span>${escapeHtml(help.blocker)}</p>
        </div>
    `;
}

function renderRewardCard(type, options = {}) {
    const isActive = STATE.activeRewardHelp === type;
    const helpId = getRewardHelpId(type);
    const tapHint = t('morningTree.rewards.tapHint') || '点击查看条件';
    const bonusText = options.bonusText ? `<span class="reward-bonus-pill">${escapeHtml(options.bonusText)}</span>` : '';

    return `
        <div class="reward-item ${type}">
            <button class="reward-stat-card ${type} ${options.complete ? 'complete' : ''}" type="button" data-reward-help="${type}" aria-expanded="${isActive ? 'true' : 'false'}" aria-controls="${helpId}" style="--reward-progress: ${Math.round((options.progressRatio || 0) * 100)}%">
                <div class="reward-stat-top">
                    <span class="reward-symbol" aria-hidden="true">${escapeHtml(options.symbol || '')}</span>
                    <span>${escapeHtml(options.title || '')}</span>
                    <strong id="${escapeHtml(options.countId || '')}">${escapeHtml(options.countText || '')}</strong>
                    <span class="reward-help-mark" aria-hidden="true">?</span>
                </div>
                <div class="reward-progress-track"><span></span></div>
                <small>${escapeHtml(options.status || '')}</small>
                <div class="reward-card-foot">
                    ${bonusText}
                    <span>${escapeHtml(tapHint)}</span>
                </div>
            </button>
            ${renderRewardHelp(type)}
        </div>
    `;
}

function renderRewardPanel() {
    if (!rewardLivePanel) return;

    const progress = getRewardProgress(STATE.rewardState || createSessionRewardState(), STATE.reportEffectiveReadingSeconds);
    const timesSuffix = t('morningTree.rewards.timesSuffix') || '次';
    const waterStatus = `${formatRewardSeconds(progress.stableReadingSeconds)} / ${formatRewardSeconds(progress.waterTargetSeconds)}`;
    const fertilizerStatus = `${formatRewardSeconds(progress.effectiveReadingSeconds)} / ${formatRewardSeconds(progress.fertilizerTargetSeconds)}`;

    rewardLivePanel.innerHTML = [
        renderRewardCard('water', {
            symbol: '水',
            title: t('morningTree.rewards.water') || '浇水',
            countId: 'reward-water-count',
            countText: `${progress.waterCount}${timesSuffix}`,
            status: waterStatus,
            progressRatio: progress.waterProgressRatio,
            bonusText: `${t('morningTree.rewards.bonusLabel') || '奖励'} +${WATER_ENERGY_BONUS}%/${t('morningTree.rewards.eachSuffix') || '次'}`
        }),
        renderRewardCard('fertilizer', {
            symbol: '肥',
            title: t('morningTree.rewards.fertilizer') || '施肥',
            countId: 'reward-fertilizer-count',
            countText: `${progress.fertilizerCount}${timesSuffix}`,
            status: fertilizerStatus,
            progressRatio: progress.fertilizerProgressRatio,
            bonusText: `${t('morningTree.rewards.bonusLabel') || '奖励'} +${FERTILIZER_ENERGY_BONUS}%/${t('morningTree.rewards.eachSuffix') || '次'}`
        })
    ].join('');
}

function announceRewardChanges(previousCounts, nextState) {
    if (!previousCounts || !nextState || !STATE.isListening) return;

    if ((nextState.waterCount || 0) > (previousCounts.waterCount || 0)) {
        const template = t('morningTree.rewards.waterToast') || '第 {count} 次浇水：稳定朗读奖励 +{bonus}%';
        showToast(template
            .replace('{count}', String(nextState.waterCount || 0))
            .replace('{bonus}', String(WATER_ENERGY_BONUS)));
    }
    if ((nextState.fertilizerCount || 0) > (previousCounts.fertilizerCount || 0)) {
        const template = t('morningTree.rewards.fertilizerToast') || '第 {count} 次施肥：有效朗读奖励 +{bonus}%';
        showToast(template
            .replace('{count}', String(nextState.fertilizerCount || 0))
            .replace('{bonus}', String(FERTILIZER_ENERGY_BONUS)));
    }
}

function initRewardUI() {
    if (!rewardLivePanel) return;

    rewardLivePanel.addEventListener('click', (event) => {
        const trigger = event.target.closest?.('[data-reward-help]');
        if (!trigger || !rewardLivePanel.contains(trigger)) return;
        setActiveRewardHelp(trigger.dataset.rewardHelp);
    });
}

function createDefaultCompetitionGroups() {
    return Array.from({ length: MAX_COMPETITION_GROUPS }, (_, index) => ({
        id: `group-${index + 1}`,
        name: `第${index + 1}组`
    }));
}

function normalizeCompetitionGroups(rawGroups) {
    const source = Array.isArray(rawGroups) && rawGroups.length
        ? rawGroups
        : createDefaultCompetitionGroups();
    const normalized = [];
    const usedIds = new Set();

    source.slice(0, MAX_COMPETITION_GROUPS).forEach((group, index) => {
        const fallbackId = `group-${index + 1}`;
        const rawId = typeof group?.id === 'string' && group.id.trim()
            ? group.id.trim()
            : fallbackId;
        const id = usedIds.has(rawId) ? fallbackId : rawId;
        usedIds.add(id);
        normalized.push({
            id,
            name: typeof group?.name === 'string' && group.name.trim()
                ? group.name.trim().slice(0, 12)
                : `第${index + 1}组`
        });
    });

    while (normalized.length < MAX_COMPETITION_GROUPS) {
        const index = normalized.length;
        normalized.push({
            id: `group-${index + 1}`,
            name: `第${index + 1}组`
        });
    }

    return normalized.slice(0, MAX_COMPETITION_GROUPS);
}

function normalizeCompetitionConfig(rawConfig = {}) {
    const groups = normalizeCompetitionGroups(rawConfig.groups);
    const groupCount = clamp(
        Number.parseInt(rawConfig.groupCount ?? MIN_COMPETITION_GROUPS, 10) || MIN_COMPETITION_GROUPS,
        MIN_COMPETITION_GROUPS,
        MAX_COMPETITION_GROUPS
    );

    return {
        groupCount,
        groups
    };
}

function loadCompetitionConfig() {
    try {
        const raw = localStorage.getItem(COMPETITION_STORAGE_KEY);
        if (!raw) return normalizeCompetitionConfig();
        return normalizeCompetitionConfig(JSON.parse(raw));
    } catch (error) {
        console.error('Failed to load morning tree competition config:', error);
        return normalizeCompetitionConfig();
    }
}

function persistCompetitionConfig(config) {
    const normalized = normalizeCompetitionConfig(config);
    localStorage.setItem(COMPETITION_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function getActiveCompetitionGroups(config = STATE.competitionConfig || loadCompetitionConfig()) {
    const normalized = normalizeCompetitionConfig(config);
    return normalized.groups.slice(0, normalized.groupCount);
}

function createCompetitionSession(config = STATE.competitionConfig || loadCompetitionConfig()) {
    const startedAt = new Date().toISOString();
    const groups = getActiveCompetitionGroups(config).map(group => ({
        id: group.id,
        name: group.name,
        peakDb: 0,
        challengeSeconds: 0,
        readingSeconds: 0,
        triggeredSeconds: 0,
        attempts: 0,
        lastPeakAt: null,
        attemptStartedAt: null,
        attemptEndedAt: null,
        completedAt: null
    }));

    return {
        startedAt,
        activeGroupId: null,
        activeAttemptStartedAt: null,
        lastCompletedGroupId: null,
        groups
    };
}

function syncCompetitionSessionWithConfig(session, config = STATE.competitionConfig || loadCompetitionConfig()) {
    if (!session) return createCompetitionSession(config);
    const activeGroups = getActiveCompetitionGroups(config);
    const existingGroups = Array.isArray(session.groups) ? session.groups : [];
    session.groups = activeGroups.map(group => {
        const existing = existingGroups.find(item => item.id === group.id) || {};
        return {
            id: group.id,
            name: group.name,
            peakDb: Math.max(0, Math.round(Number(existing.peakDb) || 0)),
            challengeSeconds: Math.max(0, Number(existing.challengeSeconds) || 0),
            readingSeconds: Math.max(0, Number(existing.readingSeconds) || 0),
            triggeredSeconds: Math.max(0, Number(existing.triggeredSeconds) || 0),
            attempts: Math.max(0, Math.round(Number(existing.attempts) || 0)),
            lastPeakAt: existing.lastPeakAt || null,
            attemptStartedAt: existing.attemptStartedAt || null,
            attemptEndedAt: existing.attemptEndedAt || null,
            completedAt: existing.completedAt || null
        };
    });

    if (!session.startedAt) session.startedAt = new Date().toISOString();
    if (session.activeGroupId && !session.groups.some(group => group.id === session.activeGroupId)) {
        session.activeGroupId = null;
        session.activeAttemptStartedAt = null;
    }
    if (session.lastCompletedGroupId && !session.groups.some(group => group.id === session.lastCompletedGroupId)) {
        session.lastCompletedGroupId = null;
    }
    return session;
}

function hasCompetitionGroupCompleted(group) {
    if (!group) return false;
    if (group.completedAt || group.attemptEndedAt) return true;
    const hasAttemptMarkers = Boolean(group.attemptStartedAt || group.attemptEndedAt || group.completedAt);
    if (hasAttemptMarkers) return false;
    return (
        Number(group.peakDb) > 0 ||
        Number(group.readingSeconds) > 0 ||
        Number(group.triggeredSeconds) > 0
    );
}

function getCompetitionCompletion(sessionLike) {
    const groups = Array.isArray(sessionLike?.groups)
        ? sessionLike.groups
        : Array.isArray(sessionLike?.rankings)
            ? sessionLike.rankings
            : [];
    const completedCount = groups.filter(hasCompetitionGroupCompleted).length;
    return {
        total: groups.length,
        completedCount,
        isComplete: groups.length > 0 && completedCount >= groups.length
    };
}

function getCompetitionRankings(sessionLike) {
    const groups = Array.isArray(sessionLike?.groups)
        ? sessionLike.groups
        : Array.isArray(sessionLike?.rankings)
            ? sessionLike.rankings
            : [];
    return groups
        .map(group => ({
            id: group.id,
            name: group.name,
            peakDb: Math.max(0, Math.round(Number(group.peakDb) || 0)),
            challengeSeconds: Math.max(0, Math.round(Number(group.challengeSeconds) || 0)),
            readingSeconds: Math.max(0, Math.round(Number(group.readingSeconds) || 0)),
            triggeredSeconds: Math.max(0, Math.round(Number(group.triggeredSeconds) || 0)),
            attempts: Math.max(0, Math.round(Number(group.attempts) || 0)),
            lastPeakAt: group.lastPeakAt || null,
            attemptStartedAt: group.attemptStartedAt || null,
            attemptEndedAt: group.attemptEndedAt || null,
            completedAt: group.completedAt || null,
            isComplete: hasCompetitionGroupCompleted(group)
        }))
        .sort((a, b) => (
            (b.peakDb - a.peakDb)
            || (Number(b.isComplete) - Number(a.isComplete))
            || (b.readingSeconds - a.readingSeconds)
            || a.name.localeCompare(b.name)
        ));
}

function getCompetitionWinner(sessionLike) {
    if (!getCompetitionCompletion(sessionLike).isComplete) return null;
    const [winner] = getCompetitionRankings(sessionLike);
    return winner && winner.peakDb > 0 ? winner : null;
}

function getNextPendingCompetitionGroup(sessionLike, afterGroupId = null) {
    const groups = Array.isArray(sessionLike?.groups) ? sessionLike.groups : [];
    if (!groups.length) return null;
    const startIndex = afterGroupId
        ? Math.max(0, groups.findIndex(group => group.id === afterGroupId) + 1)
        : 0;
    const orderedGroups = [
        ...groups.slice(startIndex),
        ...groups.slice(0, startIndex)
    ];
    return orderedGroups.find(group => !hasCompetitionGroupCompleted(group)) || null;
}

function getOrCreateCompetitionSession() {
    STATE.competitionConfig = normalizeCompetitionConfig(STATE.competitionConfig || loadCompetitionConfig());
    STATE.competitionSession = syncCompetitionSessionWithConfig(
        STATE.competitionSession || createCompetitionSession(STATE.competitionConfig),
        STATE.competitionConfig
    );
    return STATE.competitionSession;
}

function startCompetitionGroupAttempt(session, groupId, startedAt = new Date().toISOString()) {
    if (!session || !groupId) return null;
    const group = session.groups?.find(item => item.id === groupId);
    if (!group) return null;

    session.activeGroupId = groupId;
    session.activeAttemptStartedAt = startedAt;
    group.attempts = Math.max(0, Math.round(Number(group.attempts) || 0)) + 1;
    group.attemptStartedAt = startedAt;
    group.attemptEndedAt = null;
    group.completedAt = null;
    STATE.lastCompletedCompetitionGroupId = null;
    return group;
}

function finishCompetitionGroupAttempt(session, groupId, endedAt = new Date().toISOString()) {
    if (!session || !groupId) return null;
    const group = session.groups?.find(item => item.id === groupId);
    if (!group) return null;

    group.attemptEndedAt = endedAt;
    group.completedAt = endedAt;
    session.lastCompletedGroupId = groupId;
    if (session.activeGroupId === groupId) {
        session.activeGroupId = null;
        session.activeAttemptStartedAt = null;
    }
    STATE.lastCompletedCompetitionGroupId = groupId;
    return group;
}

function buildCompetitionReportPayload(sessionLike, mode = STATE.activeMode) {
    const shouldBuild = mode === APP_MODES.COMPETITION || mode === true || mode === 'class-competition';
    if (!shouldBuild || !sessionLike) return null;
    const rankings = getCompetitionRankings(sessionLike);
    const completion = getCompetitionCompletion(sessionLike);
    const winner = completion.isComplete ? (rankings.find(group => group.peakDb > 0) || null) : null;
    const lastCompletedGroupId = sessionLike.lastCompletedGroupId || STATE.lastCompletedCompetitionGroupId || null;
    const lastCompletedGroup = lastCompletedGroupId
        ? rankings.find(group => group.id === lastCompletedGroupId) || null
        : null;

    return {
        mode: APP_MODES.COMPETITION,
        groupCount: rankings.length,
        completedCount: completion.completedCount,
        isComplete: completion.isComplete,
        winnerId: winner?.id || null,
        winnerName: winner?.name || null,
        winnerPeakDb: winner?.peakDb || 0,
        lastCompletedGroupId: lastCompletedGroup?.id || null,
        lastCompletedGroupName: lastCompletedGroup?.name || null,
        lastCompletedGroupPeakDb: lastCompletedGroup?.peakDb || 0,
        rankings,
        startedAt: sessionLike.startedAt || null,
        endedAt: new Date().toISOString()
    };
}

function updateCompetitionSessionMetrics(session, activeGroupId, options = {}) {
    if (!session || !activeGroupId || !isCompetitionRoundActive()) return session;
    const group = session.groups?.find(item => item.id === activeGroupId);
    if (!group) return session;

    const deltaSeconds = normalizeDeltaSeconds(options.deltaSeconds);
    const currentDB = Number.isFinite(options.currentDB) ? options.currentDB : 30;
    const isAboveReadingThreshold = Boolean(options.isAboveReadingThreshold);
    const isReadingLoudly = Boolean(options.isReadingLoudly);
    const shouldScorePeak = isAboveReadingThreshold || isReadingLoudly;

    group.challengeSeconds = Math.max(0, (Number(group.challengeSeconds) || 0) + deltaSeconds);
    if (!group.attemptStartedAt) {
        group.attemptStartedAt = session.activeAttemptStartedAt || new Date().toISOString();
    }
    group.attempts = Math.max(1, Math.round(Number(group.attempts) || 0));

    if (shouldScorePeak) {
        group.triggeredSeconds = Math.max(0, (group.triggeredSeconds || 0) + deltaSeconds);
        const roundedDb = Math.round(currentDB);
        if (roundedDb > (group.peakDb || 0)) {
            group.peakDb = roundedDb;
            group.lastPeakAt = new Date().toISOString();
        }
    }

    if (isReadingLoudly) {
        group.readingSeconds = Math.max(0, (group.readingSeconds || 0) + deltaSeconds);
    }

    return session;
}

function loadStoredForest() {
    try {
        const raw = localStorage.getItem(FOREST_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(item => item && typeof item.dateKey === 'string')
            .map(item => ({
                ...item,
                sessionCount: Math.max(1, Number.parseInt(item.sessionCount || 1, 10)),
                treeStage: item.treeStage?.key ? item.treeStage : getTreeLifecycleStage(item),
                rewards: {
                    waterCount: Math.max(0, Math.round(Number(item.rewards?.waterCount) || 0)),
                    fertilizerCount: Math.max(0, Math.round(Number(item.rewards?.fertilizerCount) || 0))
                },
                competition: item.competition && typeof item.competition === 'object'
                    ? item.competition
                    : null
            }));
    } catch (error) {
        console.error('Failed to load morning tree forest:', error);
        return [];
    }
}

function persistForest(forest) {
    const normalized = Array.isArray(forest) ? forest : [];
    localStorage.setItem(
        FOREST_STORAGE_KEY,
        JSON.stringify(normalized
            .sort((a, b) => new Date(b.startedAt || b.dateKey).getTime() - new Date(a.startedAt || a.dateKey).getTime())
            .slice(0, MAX_STORED_FOREST_DAYS))
    );
}

function getTreeSnapshotFromReport(report) {
    const finalEnergy = getReportEnergyValue(report, 'finalEnergy', report?.manifested ? 100 : 0);
    const peakEnergy = getReportEnergyValue(report, 'peakEnergy', finalEnergy);
    const treeStage = getTreeLifecycleStage({
        finalEnergy: Math.max(finalEnergy, peakEnergy),
        manifested: Boolean(report?.manifested)
    });

    return {
        dateKey: toDateKey(report.startedAt),
        dateLabel: formatShortDate(report.startedAt),
        startedAt: report.startedAt,
        endedAt: report.endedAt,
        sessionCount: 1,
        durationSeconds: Math.max(0, Math.round(Number(report.durationSeconds) || 0)),
        readingSeconds: Math.max(0, Math.round(Number(report.readingSeconds) || 0)),
        peakDb: Math.max(0, Math.round(Number(report.peakDb) || 0)),
        averageDb: Math.max(0, Math.round(Number(report.averageDb) || 0)),
        finalEnergy,
        peakEnergy,
        manifested: Boolean(report.manifested),
        manifestedAt: report.manifestedAt || null,
        manifestedElapsedSeconds: Number.isFinite(report.manifestedElapsedSeconds) ? report.manifestedElapsedSeconds : null,
        treeStage,
        rewards: {
            waterCount: Math.max(0, Math.round(Number(report.rewards?.waterCount) || 0)),
            fertilizerCount: Math.max(0, Math.round(Number(report.rewards?.fertilizerCount) || 0))
        },
        competition: report.competition && typeof report.competition === 'object'
            ? report.competition
            : null
    };
}

function mergeForestSnapshots(existing, incoming) {
    if (!existing) return incoming;
    const finalEnergy = Math.max(existing.finalEnergy || 0, incoming.finalEnergy || 0);
    const peakEnergy = Math.max(existing.peakEnergy || 0, incoming.peakEnergy || 0);
    const manifested = Boolean(existing.manifested || incoming.manifested);

    return {
        ...existing,
        ...incoming,
        sessionCount: (existing.sessionCount || 1) + 1,
        durationSeconds: (existing.durationSeconds || 0) + (incoming.durationSeconds || 0),
        readingSeconds: (existing.readingSeconds || 0) + (incoming.readingSeconds || 0),
        peakDb: Math.max(existing.peakDb || 0, incoming.peakDb || 0),
        averageDb: Math.round(((existing.averageDb || 0) + (incoming.averageDb || 0)) / 2),
        finalEnergy,
        peakEnergy,
        manifested,
        manifestedAt: incoming.manifestedAt || existing.manifestedAt || null,
        manifestedElapsedSeconds: Number.isFinite(incoming.manifestedElapsedSeconds)
            ? incoming.manifestedElapsedSeconds
            : existing.manifestedElapsedSeconds ?? null,
        treeStage: getTreeLifecycleStage({ finalEnergy: Math.max(finalEnergy, peakEnergy), manifested }),
        rewards: {
            waterCount: (existing.rewards?.waterCount || 0) + (incoming.rewards?.waterCount || 0),
            fertilizerCount: (existing.rewards?.fertilizerCount || 0) + (incoming.rewards?.fertilizerCount || 0)
        },
        competition: incoming.competition || existing.competition || null
    };
}

function upsertForestDayRecord(report) {
    const incoming = getTreeSnapshotFromReport(report);
    const forest = loadStoredForest();
    const index = forest.findIndex(item => item.dateKey === incoming.dateKey);
    if (index >= 0) {
        forest[index] = mergeForestSnapshots(forest[index], incoming);
    } else {
        forest.push(incoming);
    }
    persistForest(forest);
    return incoming;
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
    const index = day === 0 ? 6 : day - 1;
    return REPORT_WEEKDAYS[Math.max(0, Math.min(REPORT_WEEKDAYS.length - 1, index))]?.key || 'mon';
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

function getReportEnergyValue(report, key, fallback = 0) {
    const value = Number(report?.[key]);
    if (Number.isFinite(value)) return Math.round(clampEnergy(value));
    return fallback;
}

function getReportReadingSeconds(report) {
    const readingSeconds = Number(report?.readingSeconds);
    if (Number.isFinite(readingSeconds)) return Math.max(0, Math.round(readingSeconds));
    return null;
}

function getReportActiveRatio(report) {
    const activeRatio = Number(report?.activeRatio);
    if (Number.isFinite(activeRatio)) return clamp(activeRatio, 0, 1);
    const readingSeconds = getReportReadingSeconds(report);
    const durationSeconds = Number(report?.durationSeconds);
    if (readingSeconds !== null && Number.isFinite(durationSeconds) && durationSeconds > 0) {
        return clamp(readingSeconds / durationSeconds, 0, 1);
    }
    return null;
}

function getManifestedElapsedSeconds(report) {
    const elapsed = Number(report?.manifestedElapsedSeconds);
    if (Number.isFinite(elapsed) && elapsed >= 0) return Math.round(elapsed);
    if (report?.manifestedAt && report?.startedAt) {
        const start = new Date(report.startedAt).getTime();
        const manifestedAt = new Date(report.manifestedAt).getTime();
        if (Number.isFinite(start) && Number.isFinite(manifestedAt) && manifestedAt >= start) {
            return Math.round((manifestedAt - start) / 1000);
        }
    }
    return null;
}

function getManifestedDisplay(report) {
    if (!report?.manifested) {
        return {
            value: t('morningTree.report.notManifested') || '未长成',
            hint: t('morningTree.report.notManifestedHint') || '本场未达到满能量'
        };
    }

    const elapsedSeconds = getManifestedElapsedSeconds(report);
    if (report.manifestedAt) {
        return {
            value: formatPreciseClock(report.manifestedAt),
            hint: `${t('morningTree.report.elapsedToManifest') || '用时'} ${formatDuration(elapsedSeconds || 0)}`
        };
    }

    if (elapsedSeconds !== null) {
        return {
            value: formatDuration(elapsedSeconds),
            hint: t('morningTree.report.elapsedOnlyHint') || '旧记录仅保存了用时'
        };
    }

    return {
        value: t('morningTree.report.manifested') || '显灵成功',
        hint: t('morningTree.report.legacyManifestedHint') || '旧记录未保存具体时间'
    };
}

function getManifestedRatio(report) {
    const elapsedSeconds = getManifestedElapsedSeconds(report);
    const durationSeconds = Number(report?.durationSeconds);
    if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
    return clamp(elapsedSeconds / durationSeconds, 0, 1);
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
    const manifestedRatio = getManifestedRatio(report);
    const manifestedX = manifestedRatio === null ? null : plotLeft + (graphWidth * manifestedRatio);
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
    const manifestedMarker = manifestedX === null ? '' : `
        <g>
            <line x1="${manifestedX}" y1="${plotTop - 6}" x2="${manifestedX}" y2="${baselineY + 10}" stroke="#ffe082" stroke-width="2" stroke-dasharray="5 6" stroke-linecap="round" />
            <rect x="${clamp(manifestedX - 34, plotLeft, plotRight - 68)}" y="${plotTop - 28}" width="68" height="22" rx="11" fill="rgba(66, 45, 10, 0.82)" stroke="rgba(255, 224, 130, 0.58)" />
            <text x="${clamp(manifestedX, plotLeft + 34, plotRight - 34)}" y="${plotTop - 13}" fill="#ffe082" font-size="10.5" font-weight="900" text-anchor="middle">${t('morningTree.report.manifestPoint') || '长成'}</text>
        </g>
    `;

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
            ${manifestedMarker}
        </svg>
    `;
}

function startReportSession(options = {}) {
    STATE.sessionStartedAt = new Date().toISOString();
    STATE.curveBuffer = [Math.round(STATE.currentDB || 40)];
    STATE.energyCurveBuffer = [Math.round(clampEnergy(STATE.energy))];
    STATE.manifestedAt = null;
    STATE.manifestedElapsedSeconds = null;
    STATE.reportEffectiveReadingSeconds = 0;
    STATE.reportPeakEnergy = Math.round(clampEnergy(STATE.energy));
    STATE.rewardState = createSessionRewardState();
    STATE.finalHoldUntil = null;
    syncSessionGrowthRate();
    STATE.competitionRoundActive = Boolean(options.competitionRound || STATE.activeMode === APP_MODES.COMPETITION);
    if (STATE.competitionRoundActive) {
        const session = getOrCreateCompetitionSession();
        if (!STATE.activeCompetitionGroupId || !STATE.competitionSession.groups.some(group => group.id === STATE.activeCompetitionGroupId)) {
            STATE.activeCompetitionGroupId = getNextPendingCompetitionGroup(session)?.id || STATE.competitionSession.groups[0]?.id || null;
        }
        if (STATE.activeCompetitionGroupId) {
            startCompetitionGroupAttempt(session, STATE.activeCompetitionGroupId, STATE.sessionStartedAt);
        }
    } else if (STATE.activeMode !== APP_MODES.CLASS) {
        STATE.competitionSession = null;
        STATE.competitionLastResult = null;
    }
    renderCompetitionPanel();
    renderRewardPanel();
}

function captureReportPoint() {
    if (!STATE.isListening || !STATE.sessionStartedAt) return;
    STATE.curveBuffer.push(Math.round(STATE.currentDB || 40));
    const currentEnergy = Math.round(clampEnergy(STATE.energy));
    STATE.energyCurveBuffer.push(currentEnergy);
    STATE.reportPeakEnergy = Math.max(STATE.reportPeakEnergy || 0, currentEnergy);
}

function finalizeReportSession() {
    if (!STATE.sessionStartedAt) return;

    const startedAt = STATE.sessionStartedAt;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
    const rawCurve = STATE.curveBuffer.length
        ? STATE.curveBuffer.map(point => Math.round(point))
        : [Math.round(STATE.currentDB || 40)];
    const rawEnergyCurve = STATE.energyCurveBuffer.length
        ? STATE.energyCurveBuffer.map(point => Math.round(clampEnergy(point)))
        : [Math.round(clampEnergy(STATE.energy))];
    const curve = compressCurve(rawCurve, 40);
    const energyCurve = compressCurve(rawEnergyCurve, 40);
    const peakDb = Math.max(...rawCurve);
    const lowDb = Math.min(...rawCurve);
    const averageDb = Math.round(rawCurve.reduce((sum, value) => sum + value, 0) / rawCurve.length);
    const finalEnergy = Math.round(clampEnergy(STATE.energy));
    const peakEnergy = Math.max(finalEnergy, Math.round(STATE.reportPeakEnergy || 0), ...rawEnergyCurve);
    const readingSeconds = Math.max(0, Math.round(STATE.reportEffectiveReadingSeconds || 0));
    const activeRatio = durationSeconds > 0 ? Math.round((readingSeconds / durationSeconds) * 100) / 100 : 0;
    const manifestedAt = STATE.hasManifested && STATE.manifestedAt ? STATE.manifestedAt : null;
    const manifestedElapsedSeconds = STATE.hasManifested && Number.isFinite(STATE.manifestedElapsedSeconds)
        ? Math.max(0, Math.round(STATE.manifestedElapsedSeconds))
        : null;
    const rewardState = STATE.rewardState || createSessionRewardState();
    const wasCompetitionRound = isCompetitionRoundActive();
    const completedCompetitionGroupId = wasCompetitionRound
        ? STATE.activeCompetitionGroupId
        : null;
    if (wasCompetitionRound && STATE.competitionSession && completedCompetitionGroupId) {
        finishCompetitionGroupAttempt(STATE.competitionSession, completedCompetitionGroupId, endedAt);
    }
    const competition = wasCompetitionRound
        ? buildCompetitionReportPayload(STATE.competitionSession, APP_MODES.COMPETITION)
        : null;
    const nextCompetitionGroup = wasCompetitionRound && STATE.competitionSession
        ? getNextPendingCompetitionGroup(STATE.competitionSession, completedCompetitionGroupId)
        : null;
    const treeStage = getTreeLifecycleStage({
        finalEnergy: Math.max(finalEnergy, peakEnergy),
        manifested: Boolean(STATE.hasManifested)
    });

    STATE.sessionStartedAt = null;
    STATE.curveBuffer = [];
    STATE.energyCurveBuffer = [];
    STATE.reportEffectiveReadingSeconds = 0;
    STATE.reportPeakEnergy = 0;
    STATE.manifestedAt = null;
    STATE.manifestedElapsedSeconds = null;
    STATE.rewardState = createSessionRewardState();
    STATE.finalHoldUntil = null;
    if (wasCompetitionRound) {
        STATE.competitionLastResult = competition;
    }
    if (wasCompetitionRound) {
        STATE.activeCompetitionGroupId = nextCompetitionGroup?.id || completedCompetitionGroupId || STATE.activeCompetitionGroupId;
    } else if (STATE.activeMode !== APP_MODES.CLASS) {
        STATE.competitionSession = null;
        STATE.lastCompletedCompetitionGroupId = null;
    }
    STATE.competitionRoundActive = false;
    renderRewardPanel();
    renderCompetitionPanel();

    announceCompetitionResult(competition);

    const shouldStoreReport = durationSeconds >= 5 && (
        !wasCompetitionRound ||
        competition?.isComplete
    );

    if (!shouldStoreReport) {
        renderWeeklyReport();
        renderForestMap();
        return;
    }

    const nextRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt,
        endedAt,
        durationSeconds,
        curve,
        energyCurve,
        peakDb,
        lowDb,
        averageDb,
        finalEnergy,
        peakEnergy,
        readingSeconds,
        activeRatio,
        sensitivity: clampSensitivity(STATE.sensitivity),
        rewards: {
            waterCount: Math.max(0, Math.round(rewardState.waterCount || 0)),
            fertilizerCount: Math.max(0, Math.round(rewardState.fertilizerCount || 0))
        },
        competition,
        treeStage,
        manifestedAt,
        manifestedElapsedSeconds,
        manifested: Boolean(STATE.hasManifested)
    };

    const nextReports = [
        nextRecord,
        ...loadStoredReports()
    ]
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, MAX_STORED_REPORTS);

    persistReports(nextReports);
    upsertForestDayRecord(nextRecord);
    renderWeeklyReport();
    renderForestMap();
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
    const today = getCurrentWeekdayKey(new Date()) || 'mon';
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

function buildCompetitionReportSection(competition) {
    if (!competition || !Array.isArray(competition.rankings) || !competition.rankings.length) return '';
    const rankings = getCompetitionRankings({ groups: competition.rankings });
    const winner = competition.winnerId
        ? rankings.find(group => group.id === competition.winnerId) || null
        : competition.isComplete
            ? rankings.find(group => group.peakDb > 0) || null
            : null;

    return `
        <section class="report-competition-panel">
            <div class="report-competition-head">
                <div>
                    <span>${t('morningTree.competition.reportTitle') || '小组竞赛结果'}</span>
                    <strong>${winner ? `${escapeHtml(winner.name)} · ${winner.peakDb} dB` : (t('morningTree.competition.noWinner') || '暂无冠军')}</strong>
                </div>
                <em>${t('morningTree.competition.highestDbRule') || '按最高分贝排名'}</em>
            </div>
            <div class="report-competition-ranks">
                ${rankings.map((group, index) => `
                    <div class="report-competition-row ${winner?.id === group.id ? 'leader' : ''}">
                        <span>${index + 1}</span>
                        <strong>${escapeHtml(group.name)}</strong>
                        <em>${group.peakDb ? `${group.peakDb} dB` : '--'}</em>
                        <small>${formatDuration(group.readingSeconds || 0)}</small>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
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
    const manifestedDisplay = getManifestedDisplay(selectedReport);
    const readingSeconds = getReportReadingSeconds(selectedReport);
    const activeRatio = getReportActiveRatio(selectedReport);
    const finalEnergy = typeof selectedReport.finalEnergy === 'number'
        ? getReportEnergyValue(selectedReport, 'finalEnergy')
        : (selectedReport.manifested ? 100 : null);
    const peakEnergy = typeof selectedReport.peakEnergy === 'number'
        ? getReportEnergyValue(selectedReport, 'peakEnergy')
        : finalEnergy;
    const sensitivity = typeof selectedReport.sensitivity === 'number'
        ? `${clampSensitivity(selectedReport.sensitivity)}%`
        : '--';
    const activeRatioLabel = activeRatio === null ? '--' : `${Math.round(activeRatio * 100)}%`;
    const readingSecondsLabel = readingSeconds === null ? '--' : formatDuration(readingSeconds);
    const finalEnergyLabel = finalEnergy === null ? '--' : `${finalEnergy}%`;
    const peakEnergyLabel = peakEnergy === null ? '--' : `${peakEnergy}%`;
    const reportStage = selectedReport.treeStage?.key
        ? selectedReport.treeStage
        : getTreeLifecycleStage({
            finalEnergy: Math.max(finalEnergy || 0, peakEnergy || 0),
            manifested: selectedReport.manifested
        });
    const rewards = selectedReport.rewards || {};
    const waterCount = Math.max(0, Math.round(Number(rewards.waterCount) || 0));
    const fertilizerCount = Math.max(0, Math.round(Number(rewards.fertilizerCount) || 0));
    const competitionSection = buildCompetitionReportSection(selectedReport.competition);

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

            <div class="report-detail-grid">
                <div class="report-detail-item wide">
                    <span>${t('morningTree.report.readingWindow') || '早读时间'}</span>
                    <strong>${formatPreciseClock(selectedReport.startedAt)} - ${formatPreciseClock(selectedReport.endedAt)}</strong>
                    <small>${formatShortDate(selectedReport.startedAt)}</small>
                </div>
                <div class="report-detail-item mature">
                    <span>${t('morningTree.report.manifestTime') || '长成时间'}</span>
                    <strong>${manifestedDisplay.value}</strong>
                    <small>${manifestedDisplay.hint}</small>
                </div>
                <div class="report-detail-item">
                    <span>${t('morningTree.report.effectiveReading') || '有效朗读'}</span>
                    <strong>${readingSecondsLabel}</strong>
                    <small>${t('morningTree.report.activeRatio') || '有效占比'} ${activeRatioLabel}</small>
                </div>
                <div class="report-detail-item">
                    <span>${t('morningTree.lifecycle.title') || '成长层次'}</span>
                    <strong>${getLifecycleLabel(reportStage)}</strong>
                    <small>${t('morningTree.forest.localOnly') || '记录保存在本机'}</small>
                </div>
            </div>

            ${competitionSection}

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
                    <span>${t('morningTree.report.peakDb') || t('morningTree.report.peak') || '最高分贝'}</span>
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
                <div class="report-metric-card energy">
                    <span>${t('morningTree.report.finalEnergy') || '最终能量'}</span>
                    <strong>${finalEnergyLabel}</strong>
                </div>
                <div class="report-metric-card energy">
                    <span>${t('morningTree.report.peakEnergy') || '最高能量'}</span>
                    <strong>${peakEnergyLabel}</strong>
                </div>
                <div class="report-metric-card">
                    <span>${t('morningTree.report.sensitivity') || '灵敏度'}</span>
                    <strong>${sensitivity}</strong>
                </div>
                <div class="report-metric-card energy">
                    <span>${t('morningTree.rewards.water') || '浇水'}</span>
                    <strong>${waterCount}</strong>
                </div>
                <div class="report-metric-card energy">
                    <span>${t('morningTree.rewards.fertilizer') || '施肥'}</span>
                    <strong>${fertilizerCount}</strong>
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
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const reports = loadStoredReports().filter(report => {
        const startedAt = new Date(report.startedAt).getTime();
        return startedAt >= monday.getTime() && startedAt <= sunday.getTime();
    });
    const weeklyPeak = reports.length
        ? Math.max(...reports.map(report => getCurveStats(report).peakValue))
        : 0;
    const dayGroups = getWeeklyDayGroups(reports, monday);
    const defaultDay = pickDefaultReportDay(dayGroups);

    if (!STATE.reportActiveDay || !dayGroups.some(group => group.key === STATE.reportActiveDay)) {
        STATE.reportActiveDay = defaultDay;
    }

    reportWeekLabel.textContent = `${formatShortDate(monday)} - ${formatShortDate(sunday)}`;
    if (reportSummaryCount) reportSummaryCount.textContent = `${reports.length}`;
    if (reportSummaryPeak) reportSummaryPeak.textContent = reports.length ? `${weeklyPeak} dB` : '--';

    renderReportDaySidebar(dayGroups, STATE.reportActiveDay);
    const selectedDay = dayGroups.find(group => group.key === STATE.reportActiveDay) || dayGroups[0];
    renderReportFocus(selectedDay);
}

function openReportModal() {
    if (taskModal?.classList.contains('open')) closeTaskModal();
    if (forestModal?.classList.contains('open')) closeForestModal();
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
        if (forestModal?.classList.contains('open')) closeForestModal();
    });

    renderWeeklyReport();
}

function getLifecycleLabel(stageLike) {
    const stage = typeof stageLike === 'string' ? { key: stageLike } : stageLike;
    const key = stage?.key || 'seed';
    return t(`morningTree.lifecycle.${key}`) || ({
        seed: '种子',
        sprout: '发芽',
        branches: '枝条',
        leaves: '叶片',
        flowers: '开花',
        fruit: '结果',
        final: '能量树'
    }[key] || key);
}

function getForestWeekGroups(forest, monday = getCurrentWeekMonday()) {
    return REPORT_WEEKDAYS.map(({ key, offset }) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + offset);
        const dateKey = toDateKey(date);
        const record = forest.find(item => item.dateKey === dateKey) || null;
        return {
            key,
            date,
            dateKey,
            dateLabel: formatShortDate(date),
            label: t(`morningTree.report.days.${key}`) || key,
            record
        };
    });
}

function pickDefaultForestDate(dayGroups) {
    const todayKey = toDateKey(new Date());
    return dayGroups.find(group => group.dateKey === todayKey)?.dateKey
        || dayGroups.find(group => group.record)?.dateKey
        || dayGroups[0]?.dateKey
        || null;
}

function renderForestDetail(selectedGroup) {
    if (!forestDetail) return;

    const record = selectedGroup?.record || null;
    if (!record) {
        forestDetail.innerHTML = `
            <div class="forest-detail-empty">
                <strong>${selectedGroup?.dateLabel || '--'}</strong>
                <span>${t('morningTree.forest.emptyDay') || '这一天还没有种下能量树'}</span>
            </div>
        `;
        return;
    }

    const manifestedDisplay = getManifestedDisplay(record);
    const competition = record.competition || null;
    const competitionRankings = competition ? (competition.rankings || competition.groups) : null;
    const competitionWinner = competition?.winnerId
        ? (competitionRankings || []).find(group => group.id === competition.winnerId) || null
        : competition?.isComplete
            ? getCompetitionWinner({ groups: competitionRankings })
            : null;
    const competitionHtml = competition
        ? `
            <div class="forest-competition-row">
                <span>${t('morningTree.competition.reportTitle') || '小组竞赛结果'}</span>
                <strong>${competitionWinner ? `${escapeHtml(competitionWinner.name)} · ${competitionWinner.peakDb} dB` : (t('morningTree.competition.noWinner') || '暂无冠军')}</strong>
            </div>
        `
        : `<div class="forest-competition-empty">${t('morningTree.forest.noCompetition') || '这一天没有竞赛记录'}</div>`;

    forestDetail.innerHTML = `
        <div class="forest-detail-head">
            <div>
                <strong>${record.dateLabel || selectedGroup.dateLabel}</strong>
                <span>${getLifecycleLabel(record.treeStage)} · ${record.sessionCount}${t('morningTree.report.sessionSuffix') || '场'}</span>
            </div>
            <span class="forest-stage-badge is-${record.treeStage?.key || 'seed'}">${getLifecycleLabel(record.treeStage)}</span>
        </div>
        <div class="forest-detail-grid">
            <div><span>${t('morningTree.report.effectiveReading') || '有效朗读'}</span><strong>${formatDuration(record.readingSeconds || 0)}</strong></div>
            <div><span>${t('morningTree.report.peakDb') || '最高分贝'}</span><strong>${record.peakDb || 0} dB</strong></div>
            <div><span>${t('morningTree.report.finalEnergy') || '最终能量'}</span><strong>${Math.round(record.finalEnergy || 0)}%</strong></div>
            <div><span>${t('morningTree.report.manifestTime') || '长成时间'}</span><strong>${manifestedDisplay.value}</strong></div>
        </div>
        <div class="forest-reward-row">
            <span>${t('morningTree.rewards.water') || '浇水'} ${record.rewards?.waterCount || 0}</span>
            <span>${t('morningTree.rewards.fertilizer') || '施肥'} ${record.rewards?.fertilizerCount || 0}</span>
        </div>
        <div class="forest-competition-list">
            ${competitionHtml}
        </div>
    `;
}

function renderForestMap() {
    if (!forestMapGrid || !forestDetail) return;

    const forest = loadStoredForest();
    const monday = getCurrentWeekMonday();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const dayGroups = getForestWeekGroups(forest, monday);

    if (!STATE.forestActiveDateKey || !dayGroups.some(group => group.dateKey === STATE.forestActiveDateKey)) {
        STATE.forestActiveDateKey = pickDefaultForestDate(dayGroups);
    }

    if (forestWeekLabel) {
        forestWeekLabel.textContent = `${formatShortDate(monday)} - ${formatShortDate(sunday)}`;
    }

    forestMapGrid.innerHTML = dayGroups.map(group => {
        const record = group.record;
        const stage = record?.treeStage || getTreeLifecycleStage({ finalEnergy: 0 });
        return `
            <button type="button" class="forest-map-node ${record ? 'has-tree' : ''} ${group.dateKey === STATE.forestActiveDateKey ? 'selected' : ''} is-${stage.key}" data-forest-date="${group.dateKey}">
                <span class="forest-node-day">${group.label}</span>
                <strong>${group.dateLabel}</strong>
                <span class="forest-node-tree" aria-hidden="true"></span>
                <small>${record ? getLifecycleLabel(stage) : (t('morningTree.forest.emptyShort') || '未种下')}</small>
            </button>
        `;
    }).join('');

    forestMapGrid.querySelectorAll('[data-forest-date]').forEach(button => {
        button.onpointerdown = (event) => {
            event.preventDefault();
            STATE.forestActiveDateKey = button.getAttribute('data-forest-date');
            renderForestMap();
        };
    });

    const selected = dayGroups.find(group => group.dateKey === STATE.forestActiveDateKey) || dayGroups[0];
    renderForestDetail(selected);
}

function openForestModal() {
    if (taskModal?.classList.contains('open')) closeTaskModal();
    if (reportModal?.classList.contains('open')) closeReportModal();
    STATE.forestActiveDateKey = null;
    renderForestMap();
    if (forestBody) forestBody.scrollTop = 0;
    forestModal.classList.add('open');
    forestModal.setAttribute('aria-hidden', 'false');
}

function closeForestModal() {
    forestModal?.classList.remove('open');
    forestModal?.setAttribute('aria-hidden', 'true');
}

function initForestUI() {
    if (!forestTriggerBtn || !forestModal) return;

    forestTriggerBtn.onclick = openForestModal;
    if (forestBackdrop) forestBackdrop.onclick = closeForestModal;
    if (forestCloseBtn) forestCloseBtn.onclick = closeForestModal;
    renderForestMap();
}

function getCurrentCompetitionSource() {
    return STATE.competitionSession || STATE.competitionLastResult || null;
}

function getCompetitionSourceGroups(source) {
    if (Array.isArray(source?.groups)) return source.groups;
    if (Array.isArray(source?.rankings)) return source.rankings;
    return [];
}

function renderCompetitionEditor() {
    if (!competitionFields) return;
    const config = normalizeCompetitionConfig(STATE.competitionConfig || loadCompetitionConfig());
    competitionFields.innerHTML = config.groups.map((group, index) => `
        <label class="competition-field ${index >= config.groupCount ? 'muted' : ''}">
            <span>${t('morningTree.competition.groupLabel') || '小组'} ${index + 1}</span>
            <input type="text" value="${escapeHtml(group.name)}" data-competition-index="${index}" maxlength="12">
        </label>
    `).join('');
}

function renderCompetitionSummary(source = getCurrentCompetitionSource()) {
    if (!competitionSummary) return;
    if (!hasReadingModeSelected()) {
        competitionSummary.innerHTML = '';
        return;
    }

    const rankings = getCompetitionRankings(source);
    const completion = getCompetitionCompletion(source);
    const leader = rankings.find(group => group.peakDb > 0) || null;
    const emptyText = t('morningTree.competition.noScore') || '点击某个小组开始挑战，结束后会记录该组最高分贝。';

    if (!rankings.length || !leader) {
        competitionSummary.innerHTML = `<div class="competition-empty">${emptyText}</div>`;
        return;
    }

    const statusText = `${completion.completedCount}/${completion.total} ${t('morningTree.competition.completedSuffix') || '组已记录'}`;
    competitionSummary.innerHTML = `
        <div class="competition-winner">
            <span>${t('morningTree.competition.currentWinner') || '当前领先'} · ${statusText}</span>
            <strong>${escapeHtml(leader.name)} · ${leader.peakDb} dB</strong>
        </div>
        <div class="competition-ranking">
            ${rankings.map((group, index) => `
                <div class="competition-rank-row ${index === 0 && group.peakDb > 0 ? 'leader' : ''}">
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(group.name)}</strong>
                    <em>${group.peakDb ? `${group.peakDb} dB` : '--'}</em>
                </div>
            `).join('')}
        </div>
    `;
}

function renderCompetitionPanel() {
    if (!competitionPanel || !competitionList) return;
    const showCompetitionPanel = hasReadingModeSelected();
    competitionPanel.classList.toggle('hidden', !showCompetitionPanel);

    if (!showCompetitionPanel) {
        competitionList.innerHTML = '';
        if (competitionSummary) competitionSummary.innerHTML = '';
        return;
    }

    STATE.competitionConfig = normalizeCompetitionConfig(STATE.competitionConfig || loadCompetitionConfig());
    const config = STATE.competitionConfig;
    const activeGroups = getActiveCompetitionGroups(config);
    const source = getCurrentCompetitionSource();
    const sourceGroups = getCompetitionSourceGroups(source);
    if (!STATE.activeCompetitionGroupId || !activeGroups.some(group => group.id === STATE.activeCompetitionGroupId)) {
        STATE.activeCompetitionGroupId = getNextPendingCompetitionGroup(source)?.id || activeGroups[0]?.id || null;
    }

    if (competitionGroupCount) {
        competitionGroupCount.value = String(config.groupCount);
        competitionGroupCount.disabled = STATE.isListening || getCompetitionCompletion(source).completedCount > 0;
    }

    competitionList.innerHTML = activeGroups.map(group => {
        const metric = sourceGroups.find(item => item.id === group.id) || {};
        const peakDb = Math.round(Number(metric.peakDb) || 0);
        const challengeSeconds = Math.round(Number(metric.challengeSeconds ?? metric.readingSeconds) || 0);
        const isRunning = isCompetitionRoundActive() && STATE.isListening && group.id === STATE.activeCompetitionGroupId;
        const isComplete = hasCompetitionGroupCompleted(metric);
        const statusText = isRunning
            ? (t('morningTree.competition.groupRunning') || '挑战中')
            : isComplete
                ? (t('morningTree.competition.groupRecorded') || '已记录')
                : (t('morningTree.competition.groupReady') || '点击开始');
        const isLocked = STATE.isListening && (!isCompetitionRoundActive() || group.id !== STATE.activeCompetitionGroupId);
        const lockedText = isCompetitionRoundActive()
            ? (t('morningTree.competition.groupLocked') || '先结束当前组')
            : (t('morningTree.competition.classReadingLocked') || '先结束当前早读');
        const actionState = isLocked ? 'locked' : isRunning ? 'running' : isComplete ? 'complete' : 'ready';
        const actionLabel = isLocked
            ? lockedText
            : isRunning
                ? statusText
                : isComplete
                    ? statusText
                    : `${statusText} ${group.name}`;
        const ariaLabel = isLocked
            ? `${group.name}，${lockedText}`
            : isRunning
                ? `${group.name}，${statusText}`
                : isComplete
                    ? `${group.name}，${statusText}${peakDb ? `，最高 ${peakDb} dB` : ''}`
                    : `${group.name}，${statusText}`;
        return `
            <button type="button" class="competition-chip ${group.id === STATE.activeCompetitionGroupId ? 'selected' : ''} ${isRunning ? 'running' : ''} ${isComplete ? 'complete' : ''}" data-competition-group-id="${group.id}" aria-label="${escapeHtml(ariaLabel)}" ${isLocked ? 'disabled' : ''}>
                <span class="competition-chip-name">${escapeHtml(group.name)}</span>
                <strong>${peakDb ? `${peakDb} dB` : '--'}</strong>
                <span class="competition-chip-action ${actionState}" aria-hidden="true" title="${escapeHtml(actionLabel)}"></span>
                <small>${isLocked ? lockedText : `${statusText} · ${formatDuration(challengeSeconds)}`}</small>
            </button>
        `;
    }).join('');

    competitionList.querySelectorAll('[data-competition-group-id]').forEach(button => {
        button.onclick = async (event) => {
            event.preventDefault();
            const groupId = button.getAttribute('data-competition-group-id');
            if (STATE.isListening) {
                if (!isCompetitionRoundActive()) {
                    showToast(t('morningTree.competition.finishReadingToast') || '请先结束当前全班早读');
                } else if (groupId !== STATE.activeCompetitionGroupId) {
                    showToast(t('morningTree.competition.finishCurrentToast') || '请先结束当前小组挑战');
                }
                return;
            }
            STATE.activeCompetitionGroupId = groupId;
            renderCompetitionPanel();
            await startMic({ competitionRound: true });
        };
    });

    renderCompetitionEditor();
    renderCompetitionSummary(source);
}

function selectAppMode(mode) {
    const nextMode = mode === APP_MODES.COMPETITION ? APP_MODES.COMPETITION : APP_MODES.CLASS;
    if (STATE.isListening) stopMic();
    STATE.activeMode = nextMode;
    STATE.competitionConfig = normalizeCompetitionConfig(STATE.competitionConfig || loadCompetitionConfig());
    if (hasReadingModeSelected(nextMode) && !STATE.activeCompetitionGroupId) {
        STATE.activeCompetitionGroupId = getActiveCompetitionGroups(STATE.competitionConfig)[0]?.id || null;
    }
    resetGame();
    modePicker?.classList.add('hidden');
    appContainer?.classList.remove('mode-selection-active');
    updateModeUI();
    renderCompetitionPanel();
}

function showModePicker() {
    if (STATE.isListening) stopMic();
    STATE.activeMode = null;
    modePicker?.classList.remove('hidden');
    appContainer?.classList.add('mode-selection-active');
    updateModeUI();
    renderCompetitionPanel();
}

function updateModeUI() {
    const isCompetitionMode = STATE.activeMode === APP_MODES.COMPETITION;
    const isClassMode = STATE.activeMode === APP_MODES.CLASS;
    const modeLabel = isCompetitionMode
        ? (t('morningTree.mode.competitionShort') || '小组竞赛')
        : isClassMode
            ? (t('morningTree.mode.classShort') || '全班早读')
            : (t('morningTree.mode.unselected') || '未选择模式');

    if (currentModeBadge) currentModeBadge.textContent = modeLabel;
    if (micBtn) {
        if (STATE.isListening) {
            micBtn.textContent = t('morningTree.controls.pause') || '暂停早读';
        } else if (isCompetitionMode) {
            const activeGroup = getActiveCompetitionGroups(STATE.competitionConfig || loadCompetitionConfig())
                .find(group => group.id === STATE.activeCompetitionGroupId);
            const template = t('morningTree.controls.startGroup') || '开始{name}';
            micBtn.textContent = template.replace('{name}', activeGroup?.name || (t('morningTree.controls.startCompetition') || '竞赛'));
        } else {
            micBtn.textContent = t('morningTree.controls.startClass') || '开始早读';
        }
    }
    if (document.body?.dataset) {
        document.body.dataset.morningTreeMode = STATE.activeMode || 'none';
    }
}

function announceCompetitionResult(competition) {
    if (!competition) return;
    if (!competition.isComplete) {
        const name = competition.lastCompletedGroupName || '';
        const peakDb = Math.round(Number(competition.lastCompletedGroupPeakDb) || 0);
        const template = peakDb
            ? (t('morningTree.competition.partialToast') || '{name} 已记录，最高 {db} dB，请选择下一组')
            : (t('morningTree.competition.partialNoScoreToast') || '{name} 已结束，还没有有效分贝，请选择下一组');
        if (name) {
            showToast(template
                .replace('{name}', name)
                .replace('{db}', String(peakDb)));
        }
        return;
    }

    if (!competition.winnerName || !competition.winnerPeakDb) {
        showToast(t('morningTree.competition.noWinnerToast') || '本场竞赛未产生有效分贝记录');
        return;
    }

    const template = t('morningTree.competition.winnerToast') || '本场冠军：{name}，最高 {db} dB';
    showToast(template
        .replace('{name}', competition.winnerName)
        .replace('{db}', String(competition.winnerPeakDb)));
}

function initCompetitionUI() {
    STATE.competitionConfig = loadCompetitionConfig();
    renderCompetitionPanel();

    modeChoiceButtons.forEach(button => {
        button.onclick = () => selectAppMode(button.getAttribute('data-mode-choice'));
    });

    if (modeSwitchBtn) {
        modeSwitchBtn.onclick = showModePicker;
    }

    if (competitionGroupCount) {
        competitionGroupCount.onchange = (event) => {
            if (STATE.isListening || getCompetitionCompletion(getCurrentCompetitionSource()).completedCount > 0) {
                renderCompetitionPanel();
                return;
            }
            STATE.competitionConfig = persistCompetitionConfig({
                ...normalizeCompetitionConfig(STATE.competitionConfig || loadCompetitionConfig()),
                groupCount: event.target.value
            });
            const activeGroups = getActiveCompetitionGroups(STATE.competitionConfig);
            if (!activeGroups.some(group => group.id === STATE.activeCompetitionGroupId)) {
                STATE.activeCompetitionGroupId = activeGroups[0]?.id || null;
            }
            STATE.competitionLastResult = null;
            renderCompetitionPanel();
        };
    }

    if (competitionEditBtn && competitionEditor) {
        competitionEditBtn.onclick = () => {
            competitionEditor.classList.toggle('hidden');
            renderCompetitionEditor();
        };
    }

    if (competitionSaveBtn) {
        competitionSaveBtn.onclick = () => {
            const current = normalizeCompetitionConfig(STATE.competitionConfig || loadCompetitionConfig());
            const nextGroups = current.groups.map((group, index) => {
                const input = competitionFields?.querySelector(`[data-competition-index="${index}"]`);
                return {
                    ...group,
                    name: input?.value?.trim() || group.name
                };
            });
            STATE.competitionConfig = persistCompetitionConfig({
                ...current,
                groups: nextGroups
            });
            if (competitionEditor) competitionEditor.classList.add('hidden');
            renderCompetitionPanel();
        };
    }

    if (competitionResetBtn) {
        competitionResetBtn.onclick = () => {
            if (STATE.isListening) return;
            STATE.competitionLastResult = null;
            STATE.competitionSession = null;
            STATE.lastCompletedCompetitionGroupId = null;
            STATE.activeCompetitionGroupId = getActiveCompetitionGroups(STATE.competitionConfig || loadCompetitionConfig())[0]?.id || null;
            renderCompetitionPanel();
        };
    }
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
        taskStripMeta.textContent = (t('morningTree.tasks.emptyHint') || '点击右侧今日任务，设置周一到周日内容')
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
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const dayGroups = getTaskDayGroups(STATE.taskDrafts, monday);
    const weekdayKey = getCurrentWeekdayKey() || 'mon';
    if (!STATE.taskActiveDay || !dayGroups.some(group => group.key === STATE.taskActiveDay)) {
        STATE.taskActiveDay = weekdayKey;
    }

    taskWeekLabel.textContent = `${formatShortDate(monday)} - ${formatShortDate(sunday)}`;
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
    if (forestModal?.classList.contains('open')) closeForestModal();
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
        showModePicker();
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
            syncSessionGrowthRate();
            updateTimerDisplay();
        }
    };

    customDuration.onchange = (e) => {
        const mins = parseInt(e.target.value) || 30;
        STATE.sessionDuration = Math.max(1, Math.min(120, mins));
        STATE.remainingTime = STATE.sessionDuration * 60;
        syncSessionGrowthRate();
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
    if (!STATE.activeMode) {
        showModePicker();
        return;
    }

    if (STATE.isListening) {
        stopMic();
    } else {
        await startMic({ competitionRound: STATE.activeMode === APP_MODES.COMPETITION });
    }
}

async function startMic(options = {}) {
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
        STATE.readingHoldSeconds = 0;
        STATE.lastFrameAt = Date.now();
        micBtn.textContent = t('morningTree.controls.pause') || '暂停早读';
        micBtn.classList.add('active');
        dbDisplay.classList.add('active');

        if (audioCtx.state === 'suspended') await audioCtx.resume();

        startReportSession({ competitionRound: Boolean(options.competitionRound) });
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
    STATE.readingHoldSeconds = 0;
    STATE.lastFrameAt = null;
    updateModeUI();
    micBtn.classList.remove('active');
    dbDisplay.classList.remove('active');
    dbValue.textContent = '--';
    renderCompetitionPanel();
    if (STATE.timerInterval) {
        clearInterval(STATE.timerInterval);
        STATE.timerInterval = null;
    }
}

function resetGame() {
    STATE.sessionStartedAt = null;
    STATE.curveBuffer = [];
    STATE.energyCurveBuffer = [];
    STATE.reportActiveSession = 0;
    STATE.manifestedAt = null;
    STATE.manifestedElapsedSeconds = null;
    STATE.reportEffectiveReadingSeconds = 0;
    STATE.reportPeakEnergy = 0;
    STATE.rewardState = createSessionRewardState();
    STATE.competitionSession = null;
    STATE.competitionLastResult = null;
    STATE.lastCompletedCompetitionGroupId = null;
    STATE.competitionRoundActive = false;
    STATE.energy = 0;
    STATE.visualEnergy = 0;
    STATE.readingHoldSeconds = 0;
    STATE.lastFrameAt = null;
    STATE.isSuperMode = false;
    STATE.hasManifested = false;
    STATE.finalVisualReady = false;
    STATE.treeColor = '#4caf50';
    STATE.finalHoldUntil = null;
    if (STATE.superModeTimer) {
        clearTimeout(STATE.superModeTimer);
        STATE.superModeTimer = null;
    }
    STATE.remainingTime = STATE.sessionDuration * 60;
    syncSessionGrowthRate();
    updateTimerDisplay();
    sparkles.length = 0;
    energyParticles.length = 0;
    trunkTransfers.length = 0;
    soilTransfers.length = 0;
    rewardEffects.length = 0;
    resetMeadowPlants();
    updateFinalEnergyVisuals();
    renderRewardPanel();
    renderCompetitionPanel();
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

    return applySensitivityToDb(db, STATE.sensitivity);
}

/* --- 4. Game Logic --- */
function updateState(deltaSeconds = FRAME_DELTA_FALLBACK_SECONDS) {
    if (!STATE.isListening) return;

    const frameSeconds = normalizeDeltaSeconds(deltaSeconds);
    const sensitivityProfile = getSensitivityProfile(STATE.sensitivity);
    const targetDB = calculateDB();
    STATE.currentDB += (targetDB - STATE.currentDB) * 0.3;

    const displayDB = Math.round(STATE.currentDB);
    dbValue.textContent = displayDB;
    const isAboveReadingThreshold = STATE.currentDB >= sensitivityProfile.readingThreshold;
    if (isAboveReadingThreshold) {
        STATE.readingHoldSeconds += frameSeconds;
    } else {
        STATE.readingHoldSeconds = 0;
    }
    const isReadingLoudly = isAboveReadingThreshold && STATE.readingHoldSeconds >= sensitivityProfile.minimumReadingSeconds;
    if (isReadingLoudly) {
        STATE.reportEffectiveReadingSeconds += frameSeconds;
    }
    const audioActivation = getAudioActivation(STATE.currentDB, sensitivityProfile, STATE.readingHoldSeconds);
    const previousRewardState = STATE.rewardState || createSessionRewardState();
    const previousRewardCounts = {
        waterCount: previousRewardState.waterCount || 0,
        fertilizerCount: previousRewardState.fertilizerCount || 0
    };
    STATE.rewardState = updateSessionRewards(previousRewardState, {
        currentDB: STATE.currentDB,
        deltaSeconds: frameSeconds,
        isReadingLoudly,
        effectiveReadingSeconds: STATE.reportEffectiveReadingSeconds
    });
    const rewardEnergyBonus = getRewardEnergyBonus(previousRewardCounts, STATE.rewardState);
    announceRewardChanges(previousRewardCounts, STATE.rewardState);
    updateCompetitionSessionMetrics(STATE.competitionSession, STATE.activeCompetitionGroupId, {
        currentDB: STATE.currentDB,
        deltaSeconds: frameSeconds,
        isAboveReadingThreshold,
        isReadingLoudly
    });
    const renderNow = Date.now();
    if (rewardPanel && renderNow - (STATE.rewardLastRenderAt || 0) > 500) {
        STATE.rewardLastRenderAt = renderNow;
        renderRewardPanel();
    }
    if (competitionPanel && isCompetitionRoundActive() && renderNow - (STATE.competitionLastRenderAt || 0) > 350) {
        STATE.competitionLastRenderAt = renderNow;
        renderCompetitionPanel();
    }

    if (STATE.currentDB > 96) {
        dbValue.style.color = '#d8ff66';
        dbDisplay.style.borderColor = 'rgba(216, 255, 102, 0.82)';
        if (dbStatus) { dbStatus.textContent = '声音很有劲'; dbStatus.style.color = '#d8ff66'; }
    } else if (STATE.currentDB > 88) {
        dbValue.style.color = '#ffd166';
        dbDisplay.style.borderColor = 'rgba(255, 209, 102, 0.78)';
        if (dbStatus) { dbStatus.textContent = '声音很棒'; dbStatus.style.color = '#ffd166'; }
    } else if (isReadingLoudly) {
        dbValue.style.color = '#4caf50';
        dbDisplay.style.borderColor = 'rgba(76, 175, 80, 0.8)';
        if (dbStatus) { dbStatus.textContent = '稳定朗读'; dbStatus.style.color = '#4caf50'; }
    } else if (isAboveReadingThreshold) {
        dbValue.style.color = '#fff';
        dbDisplay.style.borderColor = 'rgba(255, 255, 255, 0.52)';
        if (dbStatus) { dbStatus.textContent = '保持朗读'; dbStatus.style.color = 'rgba(255,255,255,0.82)'; }
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
    } else {
        const syncedGrowthRate = syncSessionGrowthRate();
        STATE.energy = getNextEnergy(STATE.energy, STATE.currentDB, syncedGrowthRate, {
            sensitivity: STATE.sensitivity,
            deltaSeconds: frameSeconds,
            readingHoldSeconds: STATE.readingHoldSeconds
        });
    }
    if (rewardEnergyBonus.totalBonus > 0) {
        STATE.energy = applyRewardEnergyBonus(STATE.energy, rewardEnergyBonus);
        flashRewardEnergyBonus(rewardEnergyBonus);
    }
    if (STATE.hasManifested) {
        STATE.energy = 100;
    }
    STATE.reportPeakEnergy = Math.max(STATE.reportPeakEnergy || 0, Math.round(clampEnergy(STATE.energy)));

    if (STATE.energy >= 100 && !STATE.isSuperMode && !STATE.hasManifested) triggerSuperMode();
    updateVisualEnergy(frameSeconds);
    energyFill.style.width = STATE.energy + '%';
    updateFinalEnergyVisuals();
}

function triggerSuperMode() {
    if (STATE.superModeTimer) {
        clearTimeout(STATE.superModeTimer);
        STATE.superModeTimer = null;
    }
    STATE.isSuperMode = true;
    STATE.hasManifested = true;
    STATE.finalHoldUntil = Date.now() + FINAL_TREE_HOLD_MS;
    if (STATE.sessionStartedAt && !STATE.manifestedAt) {
        const now = new Date();
        const startedAt = new Date(STATE.sessionStartedAt).getTime();
        STATE.manifestedAt = now.toISOString();
        STATE.manifestedElapsedSeconds = Number.isFinite(startedAt)
            ? Math.max(0, Math.round((now.getTime() - startedAt) / 1000))
            : null;
    }
    STATE.energy = 100;
    STATE.treeColor = '#ffd700';
    STATE.finalVisualReady = false;

    STATE.superModeTimer = setTimeout(() => {
        STATE.isSuperMode = false;
        STATE.treeColor = '#4caf50';
        STATE.superModeTimer = null;
    }, FINAL_TREE_HOLD_MS);
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
const rewardEffects = [];
const meadowPlants = [];
const meadowCritters = [];

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
    return energyParticles.length + trunkTransfers.length + soilTransfers.length + (rewardEffects.length * 0.65) + (sparkles.length * 0.3);
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

class Frog {
    constructor(index = 0) {
        this.index = index;
        this.reset();
    }

    reset() {
        const side = this.index % 2 === 0 ? -1 : 1;
        const lane = 0.16 + Math.random() * 0.2;
        this.x = canvas.width * (side < 0 ? lane : 1 - lane);
        this.y = getMeadowGroundY(this.x) + 18 + Math.random() * 12;
        this.size = 0.72 + Math.random() * 0.28;
        this.phase = Math.random() * Math.PI * 2;
        this.blinkOffset = Math.random() * 3;
    }

    update() {
        this.phase += 0.035;
        if (this.x < 20 || this.x > canvas.width - 20 || this.y > canvas.height + 12) {
            this.reset();
        }
    }

    draw() {
        const bounce = Math.sin(this.phase) * 1.2;
        const blink = Math.sin(this.phase * 0.7 + this.blinkOffset) > 0.94;

        ctx.save();
        ctx.translate(this.x, this.y + bounce);
        ctx.scale(this.size, this.size);

        ctx.fillStyle = 'rgba(41, 133, 64, 0.34)';
        ctx.beginPath();
        ctx.ellipse(0, 9, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#52b955';
        ctx.strokeStyle = '#27753f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#76d36c';
        ctx.beginPath();
        ctx.ellipse(-10, -8, 8, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -8, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-10, -9, 3.2, 0, Math.PI * 2);
        ctx.arc(10, -9, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1d5130';
        ctx.lineWidth = blink ? 1.8 : 0;
        if (blink) {
            ctx.beginPath();
            ctx.moveTo(-13, -9);
            ctx.lineTo(-7, -9);
            ctx.moveTo(7, -9);
            ctx.lineTo(13, -9);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#1d5130';
            ctx.beginPath();
            ctx.arc(-10, -9, 1.5, 0, Math.PI * 2);
            ctx.arc(10, -9, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = '#27753f';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 5);
        ctx.quadraticCurveTo(-25, 9, -30, 2);
        ctx.moveTo(15, 5);
        ctx.quadraticCurveTo(25, 9, 30, 2);
        ctx.stroke();

        ctx.restore();
    }
}

class Dragonfly {
    constructor(index = 0) {
        this.index = index;
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.baseY = canvas.height * (0.54 + Math.random() * 0.18);
        this.speed = 0.55 + Math.random() * 0.45;
        this.size = 0.56 + Math.random() * 0.28;
        this.phase = Math.random() * Math.PI * 2;
        this.hue = Math.random() < 0.5 ? '#7df9ff' : '#d8ff66';
        this.direction = Math.random() < 0.5 ? -1 : 1;
    }

    update() {
        this.x += this.speed * this.direction;
        this.phase += 0.16;
        this.y = this.baseY + Math.sin(this.phase * 0.9) * 18 + Math.sin(this.x / 70) * 10;

        if (this.direction > 0 && this.x > canvas.width + 50) {
            this.x = -50;
            this.baseY = canvas.height * (0.54 + Math.random() * 0.18);
        } else if (this.direction < 0 && this.x < -50) {
            this.x = canvas.width + 50;
            this.baseY = canvas.height * (0.54 + Math.random() * 0.18);
        }
    }

    draw() {
        const wing = 0.62 + Math.sin(this.phase * 2.4) * 0.18;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.direction * this.size, this.size);
        ctx.globalCompositeOperation = 'screen';

        ctx.fillStyle = 'rgba(255,255,255,0.46)';
        ctx.beginPath();
        ctx.ellipse(-7, -3, 13, 4.2 * wing, -0.45, 0, Math.PI * 2);
        ctx.ellipse(7, -3, 13, 4.2 * wing, 0.45, 0, Math.PI * 2);
        ctx.ellipse(-6, 3, 11, 3.6 * wing, 0.35, 0, Math.PI * 2);
        ctx.ellipse(6, 3, 11, 3.6 * wing, -0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#246f7a';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();

        ctx.fillStyle = this.hue;
        ctx.beginPath();
        ctx.arc(17, 0, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.86)';
        ctx.beginPath();
        ctx.arc(19, -1.4, 1.1, 0, Math.PI * 2);
        ctx.fill();

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

function getGravityWaterPoint(spout, target, progress, lateralOffset = 0) {
    const t = clamp(Number(progress) || 0, 0, 1);
    const start = {
        x: Number.isFinite(spout?.x) ? spout.x : 0,
        y: Number.isFinite(spout?.y) ? spout.y : 0
    };
    const landing = {
        x: (Number.isFinite(target?.x) ? target.x : start.x) + (lateralOffset * 0.72),
        y: Math.max(Number.isFinite(target?.y) ? target.y : start.y + 36, start.y + 36)
    };
    const xProgress = 1 - Math.pow(1 - t, 1.18);
    const yProgress = Math.pow(t, 1.38);
    const sway = Math.sin(t * Math.PI) * lateralOffset * 0.18;

    return {
        x: start.x + ((landing.x - start.x) * xProgress) + sway,
        y: start.y + ((landing.y - start.y) * yProgress)
    };
}

class RewardWateringCan {
    constructor(targetX, targetY, side = -1, strength = 1) {
        const safeSide = side === 1 ? 1 : -1;
        const safeStrength = Number.isFinite(strength) ? strength : 1;
        this.type = 'water';
        this.side = safeSide;
        this.target = { x: targetX, y: targetY };
        this.start = {
            x: targetX + safeSide * Math.min(360, Math.max(220, canvas.width * 0.22)),
            y: Math.max(82, targetY - Math.min(220, Math.max(145, canvas.height * 0.22)))
        };
        this.end = {
            x: targetX + safeSide * Math.min(190, Math.max(126, canvas.width * 0.1)),
            y: Math.max(78, targetY - Math.min(172, Math.max(116, canvas.height * 0.18)))
        };
        this.t = 0;
        this.speed = 0.0048 + safeStrength * 0.0008;
        this.life = 1;
        this.strength = safeStrength;
        this.phase = Math.random() * Math.PI * 2;
        this.x = this.start.x;
        this.y = this.start.y;
    }

    getPourAmount() {
        if (this.t < 0.22 || this.t > 0.82) return 0;
        const local = (this.t - 0.22) / 0.6;
        return Math.sin(local * Math.PI);
    }

    update() {
        this.t += this.speed;
        const travel = easeInOutSine(Math.min(1, this.t / 0.28));
        const hover = Math.sin((STATE.frameNow || Date.now()) / 180 + this.phase) * 3;
        this.x = this.start.x + (this.end.x - this.start.x) * travel;
        this.y = this.start.y + (this.end.y - this.start.y) * travel + hover;
        this.life = this.t > 0.82 ? Math.max(0, 1 - ((this.t - 0.82) / 0.34)) : 1;

        if (this.getPourAmount() > 0.72 && Math.random() < 0.28) {
            spawnSparkle(
                this.target.x + ((Math.random() - 0.5) * 30),
                this.target.y + ((Math.random() - 0.5) * 18),
                '#c9f8ff'
            );
        }

        return this.t < 1.18;
    }

    drawWaterStream(spout, pourAmount) {
        if (pourAmount <= 0) return;

        const lineCount = 3;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';

        for (let i = 0; i < lineCount; i++) {
            const offset = (i - 1) * 7;
            const startPoint = getGravityWaterPoint(spout, this.target, 0, offset);
            ctx.globalAlpha = this.life * pourAmount * (0.38 + i * 0.16);
            ctx.strokeStyle = i === 1 ? '#c9f8ff' : '#5bd6ff';
            ctx.lineWidth = i === 1 ? 4.2 : 2.4;
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            for (let step = 1; step <= 12; step++) {
                const point = getGravityWaterPoint(spout, this.target, step / 12, offset);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        const dropCount = 12;
        for (let i = 0; i < dropCount; i++) {
            const seed = i * 0.137 + this.phase;
            const travel = (this.t * 2.6 + seed) % 1;
            const offset = (seededUnit(seed + 7) - 0.5) * 14;
            const point = getGravityWaterPoint(spout, this.target, travel, offset);
            const size = 2.1 + seededUnit(seed + 2) * 2.4;
            ctx.globalAlpha = this.life * pourAmount * (0.42 + travel * 0.54);
            ctx.fillStyle = seededUnit(seed + 4) > 0.44 ? '#8deeff' : '#ffffff';
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = this.life * pourAmount * 0.26;
        const splash = ctx.createRadialGradient(this.target.x, this.target.y, 0, this.target.x, this.target.y, 50);
        splash.addColorStop(0, 'rgba(201, 248, 255, 0.8)');
        splash.addColorStop(0.48, 'rgba(91, 214, 255, 0.22)');
        splash.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = splash;
        ctx.beginPath();
        ctx.ellipse(this.target.x, this.target.y + 4, 46, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawCanBody(pourAmount) {
        const facing = this.side === -1 ? 1 : -1;
        const tilt = 0.42 * pourAmount;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(facing, 1);
        ctx.rotate(tilt);
        ctx.globalAlpha = this.life;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.24;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 84);
        glow.addColorStop(0, 'rgba(201, 248, 255, 0.72)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 84, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#46c5e8';
        ctx.strokeStyle = '#1a6e93';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-36, -24);
        ctx.quadraticCurveTo(-44, -10, -38, 20);
        ctx.quadraticCurveTo(-12, 36, 36, 22);
        ctx.quadraticCurveTo(44, -8, 30, -26);
        ctx.quadraticCurveTo(0, -34, -36, -24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const bodyShine = ctx.createLinearGradient(-30, -28, 28, 24);
        bodyShine.addColorStop(0, 'rgba(255,255,255,0.42)');
        bodyShine.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        bodyShine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = bodyShine;
        ctx.beginPath();
        ctx.ellipse(-8, -8, 30, 14, 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1a6e93';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(-37, 0, 24, Math.PI * 0.68, Math.PI * 1.42);
        ctx.stroke();

        ctx.fillStyle = '#67dafa';
        ctx.strokeStyle = '#1a6e93';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(31, -16);
        ctx.quadraticCurveTo(55, -22, 76, -9);
        ctx.lineTo(72, 4);
        ctx.quadraticCurveTo(52, -2, 33, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d8fbff';
        ctx.strokeStyle = '#1a6e93';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(4, -31, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#24506a';
        ctx.beginPath();
        ctx.arc(14, -32, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -33, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(25, -29, 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    draw() {
        const pourAmount = this.getPourAmount();
        const spout = {
            x: this.x - this.side * (72 + pourAmount * 8),
            y: this.y - 8 + pourAmount * 18
        };

        this.drawWaterStream(spout, pourAmount);
        this.drawCanBody(pourAmount);
    }
}

class RewardWaterDrop {
    constructor(startX, startY, targetX, targetY, strength = 1) {
        this.type = 'water';
        this.start = { x: startX, y: startY };
        this.target = { x: targetX, y: targetY };
        this.control = {
            x: ((startX + targetX) / 2) + ((Math.random() - 0.5) * 56),
            y: startY + ((targetY - startY) * (0.46 + Math.random() * 0.18))
        };
        this.t = Math.random() * 0.08;
        this.speed = 0.012 + Math.random() * 0.009 + (strength * 0.0025);
        this.size = 2.8 + Math.random() * 3.8;
        this.life = 1;
        this.splashLife = 0;
        this.isSplashing = false;
        this.phase = Math.random() * Math.PI * 2;
        this.color = REWARD_WATER_COLORS[Math.floor(Math.random() * REWARD_WATER_COLORS.length)];
        this.history = [];
        this.splashSeeds = Array.from({ length: 5 }, () => ({
            angle: (-Math.PI * 0.88) + (Math.random() * Math.PI * 0.76),
            distance: 10 + Math.random() * 22,
            lift: 8 + Math.random() * 12,
            size: 1 + Math.random() * 1.5
        }));
        this.x = startX;
        this.y = startY;
    }

    update() {
        if (!this.isSplashing) {
            this.t += this.speed;
            const rawT = Math.min(1, this.t);
            const eased = rawT * rawT * (3 - (2 * rawT));
            const point = pointOnQuadratic(this.start, this.control, this.target, eased);
            const wobble = Math.sin(this.phase + this.t * 9) * 5.5 * (1 - eased);
            this.x = point.x + wobble;
            this.y = point.y;
            this.history.push({ x: this.x, y: this.y });
            if (this.history.length > 6) this.history.shift();

            if (this.t >= 1) {
                this.isSplashing = true;
                this.splashLife = 1;
                this.history.length = 0;
                spawnSparkle(this.target.x, this.target.y, '#c9f8ff');
            }
            return true;
        }

        this.splashLife -= 0.032;
        return this.splashLife > 0;
    }

    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        if (!this.isSplashing) {
            drawParticleTrail(this.history, this.color, this.size * 0.55, 0.46);

            ctx.translate(this.x, this.y);
            ctx.rotate(-0.18 + Math.sin(this.phase + this.t * 6) * 0.08);
            ctx.globalAlpha = 0.86;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -this.size * 1.9);
            ctx.bezierCurveTo(this.size * 1.15, -this.size * 0.72, this.size * 1.02, this.size * 1.25, 0, this.size * 1.68);
            ctx.bezierCurveTo(-this.size * 1.02, this.size * 1.25, -this.size * 1.15, -this.size * 0.72, 0, -this.size * 1.9);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 0.72;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-this.size * 0.28, -this.size * 0.45, Math.max(0.8, this.size * 0.22), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        const spread = 1 - this.splashLife;
        ctx.globalAlpha = this.splashLife * 0.72;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(this.target.x, this.target.y + 2, 8 + spread * 24, 3 + spread * 8, 0, 0, Math.PI * 2);
        ctx.stroke();

        this.splashSeeds.forEach(seed => {
            const x = this.target.x + Math.cos(seed.angle) * seed.distance * spread;
            const y = this.target.y + Math.sin(seed.angle) * seed.lift * spread + (spread * spread * 20);
            ctx.globalAlpha = this.splashLife * 0.82;
            ctx.fillStyle = seed.size > 1.9 ? '#ffffff' : this.color;
            ctx.beginPath();
            ctx.arc(x, y, seed.size * this.splashLife, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
}

class RewardFertilizerNutrient {
    constructor(startX, startY, targetX, targetY, strength = 1) {
        this.type = 'fertilizer';
        this.start = { x: startX, y: startY };
        this.target = { x: targetX, y: targetY };
        this.control = {
            x: ((startX + targetX) / 2) + ((Math.random() - 0.5) * 82),
            y: targetY + ((startY - targetY) * (0.28 + Math.random() * 0.24))
        };
        this.t = Math.random() * 0.06;
        this.speed = 0.008 + Math.random() * 0.007 + (strength * 0.002);
        this.size = 2.4 + Math.random() * 3.6;
        this.life = 1;
        this.strength = Number.isFinite(strength) ? strength : 1;
        this.phase = Math.random() * Math.PI * 2;
        this.color = REWARD_FERTILIZER_COLORS[Math.floor(Math.random() * REWARD_FERTILIZER_COLORS.length)];
        this.history = [];
        this.x = startX;
        this.y = startY;
    }

    update() {
        this.phase += 0.11;
        this.t += this.speed;
        const eased = easeInOutSine(Math.min(1, this.t));
        const point = pointOnQuadratic(this.start, this.control, this.target, eased);
        const tangent = tangentOnQuadratic(this.start, this.control, this.target, eased);
        const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
        const normalX = -tangent.y / tangentLength;
        const normalY = tangent.x / tangentLength;
        const wobble = Math.sin(this.phase) * (12 + this.strength * 6) * (1 - eased * 0.72);

        this.x = point.x + normalX * wobble;
        this.y = point.y + normalY * wobble;
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 9) this.history.shift();

        if (this.t >= 1) {
            spawnSparkle(this.target.x, this.target.y, '#fff59d');
            feedMeadowGrowth(this.start.x, this.strength * 0.9, this.color);
            return false;
        }

        this.life = Math.max(0.22, 1 - this.t * 0.38);
        return true;
    }

    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawParticleTrail(this.history, this.color, this.size * 0.86, this.life * 0.76);

        ctx.globalAlpha = this.life * 0.9;
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 6.2);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.28, this.color);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 6.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(this.x, this.y);
        ctx.rotate(this.phase * 0.8);
        ctx.globalAlpha = Math.min(1, this.life + 0.12);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 1.7);
        ctx.quadraticCurveTo(this.size * 1.7, 0, 0, this.size * 1.7);
        ctx.quadraticCurveTo(-this.size * 1.7, 0, 0, -this.size * 1.7);
        ctx.fill();

        ctx.globalAlpha = 0.86;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.9, this.size * 0.34), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class RewardFertilizerPour {
    constructor(targetX, targetY, side = 1, strength = 1) {
        const safeSide = side === -1 ? -1 : 1;
        const safeStrength = Number.isFinite(strength) ? strength : 1;
        this.type = 'fertilizer';
        this.side = safeSide;
        this.target = { x: targetX, y: targetY };
        this.start = {
            x: targetX + safeSide * Math.min(340, Math.max(210, canvas.width * 0.2)),
            y: Math.max(92, targetY - Math.min(190, Math.max(128, canvas.height * 0.2)))
        };
        this.end = {
            x: targetX + safeSide * Math.min(178, Math.max(118, canvas.width * 0.09)),
            y: Math.max(86, targetY - Math.min(142, Math.max(94, canvas.height * 0.16)))
        };
        this.t = 0;
        this.speed = 0.0046 + safeStrength * 0.0007;
        this.life = 1;
        this.strength = safeStrength;
        this.phase = Math.random() * Math.PI * 2;
        this.x = this.start.x;
        this.y = this.start.y;
        this.pellets = Array.from({ length: 24 }, (_, index) => ({
            seed: this.phase + index * 0.217,
            size: 2.2 + Math.random() * 3.4,
            delay: Math.random() * 0.26
        }));
    }

    getPourAmount() {
        if (this.t < 0.2 || this.t > 0.86) return 0;
        const local = (this.t - 0.2) / 0.66;
        return Math.sin(local * Math.PI);
    }

    update() {
        this.t += this.speed;
        const travel = easeInOutSine(Math.min(1, this.t / 0.3));
        const hover = Math.sin((STATE.frameNow || Date.now()) / 210 + this.phase) * 2.5;
        this.x = this.start.x + (this.end.x - this.start.x) * travel;
        this.y = this.start.y + (this.end.y - this.start.y) * travel + hover;
        this.life = this.t > 0.86 ? Math.max(0, 1 - ((this.t - 0.86) / 0.34)) : 1;

        if (this.getPourAmount() > 0.64 && Math.random() < 0.22) {
            feedMeadowGrowth(
                this.target.x + ((Math.random() - 0.5) * 34),
                this.strength * 0.48,
                REWARD_FERTILIZER_COLORS[Math.floor(Math.random() * REWARD_FERTILIZER_COLORS.length)]
            );
        }

        return this.t < 1.2;
    }

    drawPelletStream(mouth, pourAmount) {
        if (pourAmount <= 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        this.pellets.forEach((pellet, index) => {
            const rawTravel = ((this.t * 2.1) + pellet.seed + pellet.delay) % 1;
            const trailWindow = pourAmount > 0.18 ? 1 : pourAmount * 5;
            if (rawTravel > trailWindow) return;

            const control = {
                x: mouth.x + (this.target.x - mouth.x) * (0.36 + seededUnit(pellet.seed + 1) * 0.18) - this.side * (8 + seededUnit(pellet.seed + 2) * 22),
                y: mouth.y + (this.target.y - mouth.y) * 0.45 + 28 + seededUnit(pellet.seed + 3) * 24
            };
            const point = pointOnQuadratic(
                mouth,
                control,
                {
                    x: this.target.x + (seededUnit(pellet.seed + 4) - 0.5) * 44,
                    y: this.target.y + seededUnit(pellet.seed + 5) * 14
                },
                rawTravel
            );
            const color = REWARD_FERTILIZER_COLORS[(index + Math.floor(seededUnit(pellet.seed + 6) * 3)) % REWARD_FERTILIZER_COLORS.length];
            const size = pellet.size * (0.72 + rawTravel * 0.34);

            ctx.globalAlpha = this.life * pourAmount * (0.36 + rawTravel * 0.56);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();

            if (index % 4 === 0) {
                ctx.globalAlpha = this.life * pourAmount * 0.32;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(point.x - size * 0.22, point.y - size * 0.22, size * 0.32, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.globalAlpha = this.life * pourAmount * 0.32;
        const soilGlow = ctx.createRadialGradient(this.target.x, this.target.y, 0, this.target.x, this.target.y, 64);
        soilGlow.addColorStop(0, 'rgba(255, 241, 118, 0.76)');
        soilGlow.addColorStop(0.42, 'rgba(155, 225, 93, 0.28)');
        soilGlow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = soilGlow;
        ctx.beginPath();
        ctx.ellipse(this.target.x, this.target.y + 8, 58, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBagBody(pourAmount) {
        const facing = this.side === 1 ? -1 : 1;
        const tilt = 0.48 * pourAmount;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(facing, 1);
        ctx.rotate(tilt);
        ctx.globalAlpha = this.life;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.2;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 86);
        glow.addColorStop(0, 'rgba(255, 241, 118, 0.64)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 86, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#f4c25f';
        ctx.strokeStyle = '#8a5b24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-34, -34);
        ctx.quadraticCurveTo(4, -44, 42, -30);
        ctx.lineTo(36, 32);
        ctx.quadraticCurveTo(0, 44, -42, 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffe7a3';
        ctx.beginPath();
        ctx.moveTo(-26, -27);
        ctx.quadraticCurveTo(4, -34, 32, -24);
        ctx.lineTo(27, -12);
        ctx.quadraticCurveTo(4, -19, -23, -13);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#6aba45';
        ctx.strokeStyle = 'rgba(90, 57, 27, 0.36)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect?.(-22, -4, 42, 24, 8);
        if (!ctx.roundRect) {
            ctx.rect(-22, -4, 42, 24);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f7ff9c';
        ctx.beginPath();
        ctx.ellipse(-2, 8, 13, 6, -0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f8f35';
        ctx.beginPath();
        ctx.moveTo(-3, 7);
        ctx.quadraticCurveTo(4, 0, 13, 2);
        ctx.quadraticCurveTo(6, 10, -3, 7);
        ctx.fill();

        ctx.fillStyle = '#8a5b24';
        ctx.beginPath();
        ctx.moveTo(34, -19);
        ctx.quadraticCurveTo(56, -10, 69, 1);
        ctx.lineTo(64, 12);
        ctx.quadraticCurveTo(48, 7, 31, 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff1b8';
        ctx.beginPath();
        ctx.ellipse(66, 6, 11, 5, 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    draw() {
        const pourAmount = this.getPourAmount();
        const mouth = {
            x: this.x - this.side * (68 + pourAmount * 8),
            y: this.y + 6 + pourAmount * 16
        };

        this.drawPelletStream(mouth, pourAmount);
        this.drawBagBody(pourAmount);
    }
}

class RewardSoilPulse {
    constructor(x, y, strength = 1) {
        this.type = 'fertilizer';
        this.x = x;
        this.y = y;
        this.life = 1;
        this.strength = Number.isFinite(strength) ? strength : 1;
        this.radius = 20 + Math.random() * 18 + this.strength * 8;
        this.color = REWARD_FERTILIZER_COLORS[Math.floor(Math.random() * REWARD_FERTILIZER_COLORS.length)];
    }

    update() {
        this.life -= 0.026;
        return this.life > 0;
    }

    draw() {
        const spread = 1 - this.life;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.life * 0.4;
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * (1.2 + spread));
        glow.addColorStop(0, this.color);
        glow.addColorStop(0.45, 'rgba(255, 241, 118, 0.38)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * (1.35 + spread), this.radius * (0.34 + spread * 0.18), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = this.life * 0.76;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * (0.52 + spread), this.radius * (0.16 + spread * 0.12), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function getRewardEffectCount(type = null) {
    if (!type) return rewardEffects.length;
    return rewardEffects.filter(effect => effect.type === type).length;
}

function spawnRewardAnimation(type, triggerCount = 1) {
    if (!canvas || !canvas.width || !canvas.height) return 0;

    const normalizedType = type === 'fertilizer' ? 'fertilizer' : type === 'water' ? 'water' : null;
    if (!normalizedType) return 0;

    const safeTriggerCount = Math.max(1, Math.min(5, Math.round(Number(triggerCount) || 1)));
    const treeSize = getTreeRenderSize(getTreeDisplayEnergy(), { width: canvas.width, height: canvas.height });
    const anchors = getEnergyAnchors(treeSize);
    const renderMode = getRenderMode(treeSize);
    const effectLimit = getFxLimit('rewardEffects', treeSize);
    if (!effectLimit) return 0;

    const burstScale = renderMode.ultraLowPower ? 0.58 : renderMode.lowPower ? 0.78 : 1;
    const baseCount = normalizedType === 'water' ? 24 : 22;
    const spawnCount = Math.max(5, Math.min(effectLimit, Math.round(baseCount * safeTriggerCount * burstScale)));
    let spawned = 0;

    if (normalizedType === 'water') {
        const canopySpread = Math.max(92, treeSize * 0.68);
        const targetMinY = anchors.canopy.y + Math.max(12, treeSize * 0.08);
        const targetMaxY = Math.min(canvas.height - 32, anchors.trunkBase.y - 8);
        const pourTarget = {
            x: anchors.trunkBase.x,
            y: anchors.trunkBase.y - Math.min(96, Math.max(34, treeSize * 0.48))
        };
        pushLimitedEffect(
            rewardEffects,
            new RewardWateringCan(pourTarget.x, pourTarget.y, Math.random() < 0.5 ? -1 : 1, burstScale),
            effectLimit
        );
        spawned += 1;

        for (let i = 0; i < spawnCount; i++) {
            const targetX = anchors.canopy.x + ((Math.random() - 0.5) * canopySpread);
            const targetY = Math.min(
                canvas.height - 32,
                targetMinY + (Math.random() * Math.max(24, targetMaxY - targetMinY))
            );
            const startX = targetX + ((Math.random() - 0.5) * 112) - 18;
            const startY = Math.max(34, targetMinY - Math.max(118, treeSize * 0.54) - Math.random() * 92);
            pushLimitedEffect(
                rewardEffects,
                new RewardWaterDrop(startX, startY, targetX, targetY, burstScale),
                effectLimit
            );
            spawned += 1;
        }

        return spawned;
    }

    const pourTarget = {
        x: anchors.trunkBase.x,
        y: anchors.trunkBase.y + 16
    };
    pushLimitedEffect(
        rewardEffects,
        new RewardFertilizerPour(pourTarget.x, pourTarget.y, Math.random() < 0.5 ? -1 : 1, burstScale),
        effectLimit
    );
    spawned += 1;

    const pulseCount = Math.min(spawnCount, Math.max(2, safeTriggerCount * 2));
    for (let i = 0; i < pulseCount; i++) {
        const offset = (i % 2 === 0 ? -1 : 1) * (18 + Math.random() * 46);
        pushLimitedEffect(
            rewardEffects,
            new RewardSoilPulse(anchors.trunkBase.x + offset, anchors.trunkBase.y + 24 + Math.random() * 8, burstScale),
            effectLimit
        );
        spawned += 1;
    }

    const nutrientCount = Math.max(0, spawnCount - spawned);
    for (let i = 0; i < nutrientCount; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const startX = anchors.trunkBase.x + side * (22 + Math.random() * Math.max(34, treeSize * 0.2));
        const startY = anchors.trunkBase.y + 24 + Math.random() * 22;
        const targetX = anchors.canopy.x + ((Math.random() - 0.5) * Math.max(64, treeSize * 0.42));
        const targetY = anchors.canopy.y + Math.random() * Math.max(28, treeSize * 0.18);
        pushLimitedEffect(
            rewardEffects,
            new RewardFertilizerNutrient(startX, startY, targetX, targetY, burstScale),
            effectLimit
        );
        spawned += 1;
    }

    return spawned;
}

function drawRewardEffects(treeSize) {
    if (!rewardEffects.length) return;

    const anchors = getEnergyAnchors(treeSize);
    const waterCount = getRewardEffectCount('water');
    const fertilizerCount = getRewardEffectCount('fertilizer');

    if (waterCount > 0) {
        drawEnergyAura(
            anchors.canopy.x,
            anchors.canopy.y + Math.max(18, treeSize * 0.16),
            18 + Math.min(20, waterCount * 0.42),
            '#7df9ff',
            0.12
        );
    }

    if (fertilizerCount > 0) {
        drawEnergyAura(
            anchors.trunkBase.x,
            anchors.trunkBase.y + 18,
            18 + Math.min(26, fertilizerCount * 0.5),
            '#d8ff66',
            0.12
        );
    }

    for (let i = rewardEffects.length - 1; i >= 0; i--) {
        if (!rewardEffects[i].update()) {
            rewardEffects.splice(i, 1);
        } else {
            rewardEffects[i].draw();
        }
    }
}

function getMeadowGroundY(x) {
    if (!canvas || !canvas.width || !canvas.height) return 0;

    const t = clamp((Number(x) || 0) / Math.max(1, canvas.width), 0, 1);
    return canvas.height - (160 * t * (1 - t));
}

function createMeadowPlant(x, layer, index, petalPalette) {
    const layerScale = layer === 0 ? 0.58 : layer === 1 ? 0.78 : 1;
    const pattern = (index + layer * 2) % 6;
    const kind = pattern <= (layer === 0 ? 1 : layer === 1 ? 2 : 3) ? 'flower' : 'grass';
    const baseGrowth = kind === 'flower'
        ? 0.58 + Math.random() * 0.34
        : 0.44 + Math.random() * 0.34;
    const groundY = getMeadowGroundY(x);
    const footOffset = 5 + layer * 11 + Math.random() * (8 + layer * 4);

    return {
        side: x < canvas.width / 2 ? -1 : 1,
        layer,
        kind,
        x,
        baseY: Math.min(canvas.height - 3, groundY + footOffset),
        growth: baseGrowth,
        baseGrowth,
        stemHeight: (14 + Math.random() * 28) * layerScale,
        bloomSize: (5.2 + Math.random() * 6.8) * layerScale,
        bloomCount: 1 + (Math.random() < 0.54 ? 1 : 0) + (Math.random() < 0.24 ? 1 : 0),
        swayPhase: Math.random() * Math.PI * 2 + index * 0.21,
        pulse: 0,
        bladeWidth: 1.4 + layer * 0.42 + Math.random() * 0.45,
        energyColor: SOIL_FLOW_COLORS[Math.floor(Math.random() * SOIL_FLOW_COLORS.length)],
        grassColor: ['#6fcf61', '#78d870', '#92df72', '#50b96a'][Math.floor(Math.random() * 4)],
        petalColor: petalPalette[Math.floor(Math.random() * petalPalette.length)]
    };
}

function initMeadowPlants() {
    meadowPlants.length = 0;
    const petalPalette = ['#ffe082', '#ffcc80', '#ffd1f5', '#d0ff71', '#9ff4ff', '#ffc5df', '#ffffff', '#f8a9ff'];
    const layerCounts = [
        Math.round(clamp(canvas.width / 30, 32, 54)),
        Math.round(clamp(canvas.width / 24, 42, 70)),
        Math.round(clamp(canvas.width / 20, 54, 88))
    ];

    layerCounts.forEach((count, layer) => {
        for (let i = 0; i < count; i++) {
            const step = canvas.width / Math.max(1, count - 1);
            const jitter = (Math.random() - 0.5) * step * 0.78;
            const x = clamp((i * step) + jitter, 6, canvas.width - 6);
            meadowPlants.push(createMeadowPlant(x, layer, i, petalPalette));
        }
    });

    meadowPlants.sort((a, b) => a.baseY - b.baseY);
}

function initMeadowCritters() {
    meadowCritters.length = 0;
    for (let i = 0; i < 2; i++) meadowCritters.push(new Frog(i));
    for (let i = 0; i < 4; i++) meadowCritters.push(new Dragonfly(i));
}

function getMeadowEnvironmentSummary() {
    return {
        plantCount: meadowPlants.length,
        flowerCount: meadowPlants.filter(plant => plant.kind === 'flower').length,
        grassCount: meadowPlants.filter(plant => plant.kind === 'grass').length,
        frogCount: meadowCritters.filter(critter => critter instanceof Frog).length,
        dragonflyCount: meadowCritters.filter(critter => critter instanceof Dragonfly).length
    };
}

function resetMeadowPlants() {
    meadowPlants.forEach(plant => {
        plant.growth = Math.max(0.36, Number(plant.baseGrowth) || 0.48);
        plant.pulse = 0;
        plant.energyColor = SOIL_FLOW_COLORS[Math.floor(Math.random() * SOIL_FLOW_COLORS.length)];
    });
    meadowCritters.forEach(critter => critter.reset?.());
}

function feedMeadowGrowth(sourceX, strength, color) {
    if (!Number.isFinite(sourceX) || !meadowPlants.length) return;

    const safeStrength = Number.isFinite(strength) ? strength : 0;
    const petalPalette = ['#ffe082', '#ffcc80', '#ffd1f5', '#d0ff71', '#9ff4ff', '#ffc5df'];
    const nearby = meadowPlants
        .map(plant => ({ plant, dist: Math.abs(plant.x - sourceX) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 14);

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
    ctx.lineWidth = (plant.bladeWidth || 2.2) * (heightScale > 0.9 ? 1 : 0.82);
    ctx.strokeStyle = plant.grassColor || '#78d870';
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

function drawSeedRoots(rootGrowth) {
    if (rootGrowth <= 0.04) return;

    const rootLines = [
        { c: { x: -5, y: 14 }, e: { x: -26, y: 24 }, width: 2.4, start: 0.08 },
        { c: { x: 5, y: 13 }, e: { x: 28, y: 22 }, width: 2.2, start: 0.18 },
        { c: { x: -1, y: 16 }, e: { x: -4, y: 35 }, width: 2.8, start: 0.02 },
        { c: { x: -10, y: 24 }, e: { x: -34, y: 39 }, width: 1.6, start: 0.42 },
        { c: { x: 8, y: 24 }, e: { x: 35, y: 37 }, width: 1.6, start: 0.48 }
    ];

    ctx.save();
    ctx.lineCap = 'round';
    rootLines.forEach((root, index) => {
        const reveal = clamp((rootGrowth - root.start) / Math.max(0.1, 1 - root.start), 0, 1);
        if (reveal <= 0) return;

        const end = {
            x: root.e.x * reveal,
            y: root.e.y * reveal
        };
        const control = {
            x: root.c.x * reveal + Math.sin((STATE.frameNow || Date.now()) / 900 + index) * 0.6,
            y: root.c.y * reveal
        };

        ctx.globalAlpha = 0.32 + reveal * 0.44;
        ctx.strokeStyle = TREE_SOIL_COLORS.root;
        ctx.lineWidth = root.width * (0.55 + reveal * 0.45);
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        ctx.stroke();
    });
    ctx.restore();
}

function drawSeedAndSprout(startX, startY, stage) {
    const energy = clampEnergy(STATE.energy);
    const stageProgress = clamp(Number(stage?.progress) || 0, 0, 1);
    const rootGrowth = clamp(energy / 16, 0, 1);
    const sproutGrowth = stage?.key === 'seed'
        ? clamp(stageProgress * 0.36, 0, 0.36)
        : clamp((energy - 8) / 22, 0.18, 1);
    const soilPulse = 1 + Math.sin(((STATE.frameNow || Date.now()) / 1000) * 1.1) * 0.025;

    ctx.save();
    ctx.translate(startX, startY);

    ctx.save();
    ctx.scale(soilPulse, 1);
    ctx.fillStyle = TREE_SOIL_COLORS.dark;
    ctx.beginPath();
    ctx.ellipse(0, 9, 39, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TREE_SOIL_COLORS.mid;
    ctx.beginPath();
    ctx.ellipse(0, 5, 31, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(190, 133, 70, 0.34)';
    ctx.beginPath();
    ctx.ellipse(-9, 0, 12, 4.5, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawSeedRoots(rootGrowth);

    if (stage.key === 'seed') {
        drawEnergyAura(0, -1, 10 + rootGrowth * 9, '#d8ff66', 0.06 + rootGrowth * 0.1);
        ctx.save();
        ctx.rotate(-0.24);
        ctx.fillStyle = '#8a623e';
        ctx.beginPath();
        ctx.ellipse(0, -2, 8, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 220, 144, 0.44)';
        ctx.beginPath();
        ctx.ellipse(-2, -5, 2.2, 4.3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (sproutGrowth > 0.08) {
            ctx.strokeStyle = '#79c45b';
            ctx.lineWidth = 2.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.quadraticCurveTo(-2, -15 * sproutGrowth, -1, -26 * sproutGrowth);
            ctx.stroke();
        }
        ctx.restore();
        return;
    }

    ctx.strokeStyle = '#4f9f4c';
    ctx.lineWidth = 3.6 + sproutGrowth * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-5, -20 * sproutGrowth, -2, -48 * sproutGrowth);
    ctx.stroke();

    ctx.fillStyle = '#79cc63';
    ctx.beginPath();
    ctx.ellipse(-13 * sproutGrowth, -30 * sproutGrowth, 13 * sproutGrowth, 5.4 * sproutGrowth, -0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a5d76d';
    ctx.beginPath();
    ctx.ellipse(12 * sproutGrowth, -39 * sproutGrowth, 12 * sproutGrowth, 5.2 * sproutGrowth, 0.48, 0, Math.PI * 2);
    ctx.fill();

    if (sproutGrowth > 0.62) {
        const secondLeafScale = (sproutGrowth - 0.62) / 0.38;
        ctx.fillStyle = '#5fbd58';
        ctx.beginPath();
        ctx.ellipse(-8 * secondLeafScale, -47 * sproutGrowth, 7 * secondLeafScale, 3.4 * secondLeafScale, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b7dc7a';
        ctx.beginPath();
        ctx.ellipse(8 * secondLeafScale, -50 * sproutGrowth, 6.6 * secondLeafScale, 3.2 * secondLeafScale, 0.36, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawLifecycleAccents(treeSize, stage, renderMode) {
    if (!stage || stage.index < 4) return;
    const anchors = getEnergyAnchors(treeSize);
    const countBase = stage.key === 'flowers' ? 12 : stage.key === 'fruit' ? 16 : 22;
    const count = renderMode.ultraLowPower ? Math.ceil(countBase * 0.42) : renderMode.lowPower ? Math.ceil(countBase * 0.64) : countBase;
    const radiusX = treeSize * 0.34;
    const radiusY = treeSize * 0.24;

    for (let i = 0; i < count; i++) {
        const seed = (i + 1) * 2.417;
        const ring = 0.35 + ((Math.sin(seed * 1.7) + 1) * 0.32);
        const x = anchors.canopy.x + Math.cos(seed) * radiusX * ring;
        const y = anchors.canopy.y + Math.sin(seed * 1.23) * radiusY * ring;
        const size = 4.2 + ((Math.sin(seed * 2.2) + 1) * 2.4);

        if (stage.index >= 5 && i % 3 === 0) {
            ctx.save();
            ctx.fillStyle = stage.key === 'final' ? '#ffd166' : '#ff9f43';
            ctx.strokeStyle = 'rgba(90, 57, 27, 0.36)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else {
            drawFlowerCluster(x, y, size, stage.key === 'final' ? '#fff3a3' : '#ffd1f5');
        }
    }

    if (stage.key === 'final') {
        drawEnergyAura(anchors.canopy.x, anchors.canopy.y, treeSize * 0.34, '#ffe082', 0.18);
    }
}

function seededUnit(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function parseHexColor(hexColor) {
    const value = String(hexColor || '').trim().replace('#', '');
    const normalized = value.length === 3
        ? value.split('').map(part => part + part).join('')
        : value;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    const numericValue = parseInt(normalized, 16);
    return {
        r: (numericValue >> 16) & 255,
        g: (numericValue >> 8) & 255,
        b: numericValue & 255
    };
}

function mixHexColor(sourceColor, targetColor, ratio) {
    const source = parseHexColor(sourceColor);
    const target = parseHexColor(targetColor);
    if (!source || !target) return sourceColor;

    const amount = clamp(ratio, 0, 1);
    const r = Math.round(source.r + (target.r - source.r) * amount);
    const g = Math.round(source.g + (target.g - source.g) * amount);
    const b = Math.round(source.b + (target.b - source.b) * amount);

    return `rgb(${r}, ${g}, ${b})`;
}

function getFinalTreeDisplayColor(color, visualState) {
    if (!visualState?.active) return color;
    const dimRatio = 1 - visualState.brightness;
    if (dimRatio <= 0.04) return color;
    return mixHexColor(color, '#67806f', Math.min(0.58, dimRatio * 0.95));
}

function getBloomTreePalette(stage) {
    if (stage?.key !== 'final') return BLOOM_TREE_LEAF_COLORS;
    const finalMorph = getFinalTreeMorphProgress(stage);
    return BLOOM_TREE_LEAF_COLORS.map((color, index) => {
        const target = BLOOM_TREE_FINAL_COLORS[index % BLOOM_TREE_FINAL_COLORS.length];
        return mixHexColor(color, target, finalMorph);
    });
}

function getQuadraticPoint(start, control, end, t) {
    return pointOnQuadratic(start, control, end, clamp(t, 0, 1));
}

function drawTaperedBranch(start, control, end, startWidth, endWidth, colors = {}) {
    const steps = 18;
    const barkDark = colors.dark || '#4a2f2a';
    const barkMid = colors.mid || '#6d4c41';
    const barkLight = colors.light || '#8d6e63';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < steps; i++) {
            const t0 = i / steps;
            const t1 = (i + 1) / steps;
            const p0 = getQuadraticPoint(start, control, end, t0);
            const p1 = getQuadraticPoint(start, control, end, t1);
            const width = startWidth + (endWidth - startWidth) * ((t0 + t1) / 2);

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineWidth = Math.max(1, width + (layer === 0 ? 2.8 : 0));
            ctx.strokeStyle = layer === 0
                ? barkDark
                : t1 > 0.72
                    ? barkLight
                    : barkMid;
            ctx.globalAlpha = layer === 0 ? 0.5 : 0.98;
            ctx.stroke();
        }
    }

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#d7a56b';
    ctx.lineWidth = Math.max(1, endWidth * 0.36);
    ctx.beginPath();
    const highlightStart = getQuadraticPoint(start, control, end, 0.1);
    const highlightEnd = getQuadraticPoint(start, control, end, 0.88);
    ctx.moveTo(highlightStart.x - startWidth * 0.16, highlightStart.y);
    ctx.quadraticCurveTo(control.x - startWidth * 0.18, control.y, highlightEnd.x - endWidth * 0.12, highlightEnd.y);
    ctx.stroke();
    ctx.restore();
}

function getVisibleBranchCount(stageIndex, stageProgress, branchTotal, isFinalTree) {
    if (isFinalTree) return branchTotal;
    if (stageIndex <= 2) return Math.min(branchTotal, 3 + Math.round(stageProgress * 3));
    if (stageIndex === 3) return Math.min(branchTotal, 6 + Math.round(stageProgress * 2));
    if (stageIndex === 4) return Math.min(branchTotal, 8);
    return Math.min(branchTotal, 9);
}

function drawSurfaceRoots(spread, trunkBaseWidth, branchColor, stageIndex, stageProgress) {
    const reveal = clamp((stageIndex - 2 + stageProgress) / 2.4, 0, 1);
    if (reveal <= 0.02) return;

    const roots = [
        { x: -spread * 0.24, c: -spread * 0.12, y: 15, width: 0.34 },
        { x: spread * 0.24, c: spread * 0.12, y: 14, width: 0.32 },
        { x: -spread * 0.14, c: -spread * 0.05, y: 24, width: 0.24 },
        { x: spread * 0.16, c: spread * 0.06, y: 23, width: 0.24 }
    ];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.5 + reveal * 0.36;
    roots.forEach((root, index) => {
        const rootReveal = clamp(reveal * 1.28 - index * 0.12, 0, 1);
        if (rootReveal <= 0) return;

        ctx.strokeStyle = index < 2 ? branchColor.mid : branchColor.dark;
        ctx.lineWidth = Math.max(2, trunkBaseWidth * root.width * rootReveal);
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.quadraticCurveTo(root.c * rootReveal, root.y * 0.42, root.x * rootReveal, root.y);
        ctx.stroke();
    });
    ctx.restore();
}

function drawNaturalTwigCluster(branch, branchIndex, trunkBaseWidth, branchColor, stageIndex, stageProgress, renderMode) {
    const twigReveal = clamp((stageIndex - 2.15 + stageProgress) / 2.6, 0, 1);
    if (twigReveal <= 0.02 || renderMode.ultraLowPower) return;

    const twigCount = renderMode.lowPower
        ? Math.max(1, Math.round(1 + twigReveal))
        : Math.max(1, Math.round(2 + twigReveal * 2));
    const branchDirection = branch.e.x >= branch.s.x ? 1 : -1;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.42 + twigReveal * 0.36;
    ctx.strokeStyle = branchColor.light;
    for (let i = 0; i < twigCount; i++) {
        const seed = branchIndex * 4.73 + i * 1.91;
        const t = 0.64 + seededUnit(seed) * 0.26;
        const base = getQuadraticPoint(branch.s, branch.c, branch.e, t);
        const length = (16 + seededUnit(seed + 0.9) * 22) * twigReveal;
        const side = i % 2 === 0 ? 1 : -1;
        const end = {
            x: base.x + branchDirection * side * length * (0.42 + seededUnit(seed + 1.4) * 0.5),
            y: base.y - length * (0.28 + seededUnit(seed + 2.2) * 0.54)
        };
        const control = {
            x: (base.x + end.x) / 2 + branchDirection * side * 6,
            y: (base.y + end.y) / 2 - 4
        };

        ctx.lineWidth = Math.max(1, trunkBaseWidth * (0.035 + twigReveal * 0.035));
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
        ctx.stroke();

        if (stageIndex <= 2) {
            drawBranchBud(end.x, end.y, Math.max(2.2, trunkBaseWidth * 0.08), '#9bdc65');
        }
    }
    ctx.restore();
}

function drawBloomLeafCluster(cluster, palette, stage, renderMode, frameTime, layer = 'front') {
    if (!cluster) return;
    const stageIndex = Math.max(0, Number(stage?.index) || 0);
    const bloomStrength = clamp((stageIndex - 2) / 4, 0.28, 1);
    const finalVisualState = stage?.key === 'final' ? getFinalTreeVisualState({ stage }) : null;
    const finalReveal = stage?.key === 'final' ? clamp(Number(stage.finalReveal) || 0, 0, 1) : 0;
    const finalCanopyAlpha = finalVisualState?.canopyAlpha ?? 1;
    const densityBoost = stage?.key === 'final' ? 1.18 + finalReveal * 0.37 : stage?.key === 'fruit' ? 1.18 : 1;
    const sizeBoost = stage?.key === 'final' ? 1.04 + finalReveal * 0.14 : 1;
    const alpha = Math.min(0.98, (layer === 'back' ? 0.84 : 0.95) * bloomStrength * (stage?.key === 'final' ? 1.08 : 1) * finalCanopyAlpha);
    const blobCountBase = Math.round((layer === 'back' ? 14 : 12) * densityBoost);
    const blobCount = renderMode.ultraLowPower
        ? Math.ceil(blobCountBase * 0.42)
        : renderMode.lowPower
            ? Math.ceil(blobCountBase * 0.68)
            : blobCountBase;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < blobCount; i++) {
        const seed = cluster.seed + i * 1.73 + (layer === 'back' ? 10 : 0);
        const angle = seededUnit(seed) * Math.PI * 2;
        const ring = 0.18 + seededUnit(seed + 2.4) * 0.82;
        const x = cluster.x + Math.cos(angle) * cluster.rx * ring;
        const y = cluster.y + Math.sin(angle) * cluster.ry * ring + Math.sin(frameTime * 0.8 + seed) * (layer === 'back' ? 1.2 : 2.2);
        const w = cluster.rx * sizeBoost * (0.34 + seededUnit(seed + 4.1) * 0.32);
        const h = cluster.ry * sizeBoost * (0.32 + seededUnit(seed + 5.7) * 0.34);
        const color = palette[Math.floor(seededUnit(seed + 8.9) * palette.length)] || palette[0];

        ctx.fillStyle = getFinalTreeDisplayColor(color, finalVisualState);
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, angle * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }

    if (layer === 'front' && stageIndex >= 3) {
        const detailBase = stage?.key === 'final' ? Math.round(9 + finalReveal * 9) : stageIndex >= 5 ? 9 : 6;
        const detailCount = renderMode.ultraLowPower
            ? Math.ceil(detailBase * 0.35)
            : renderMode.lowPower
                ? Math.ceil(detailBase * 0.58)
                : detailBase;
        ctx.globalAlpha = Math.min(0.95, (0.42 + bloomStrength * 0.28) * finalCanopyAlpha);
        for (let i = 0; i < detailCount; i++) {
            const seed = cluster.seed * 5.17 + i * 2.43;
            const angle = seededUnit(seed) * Math.PI * 2;
            const ring = 0.18 + seededUnit(seed + 0.7) * 0.76;
            const x = cluster.x + Math.cos(angle) * cluster.rx * ring;
            const y = cluster.y + Math.sin(angle) * cluster.ry * ring + Math.sin(frameTime * 1.1 + seed) * 1.6;
            const leafWidth = Math.max(2.2, cluster.rx * (0.035 + seededUnit(seed + 1.3) * 0.025));
            const leafHeight = Math.max(3.2, cluster.ry * (0.05 + seededUnit(seed + 2.6) * 0.025));
            const color = palette[Math.floor(seededUnit(seed + 3.9) * palette.length)] || palette[0];

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.sin(frameTime + seed) * 0.18);
            ctx.fillStyle = getFinalTreeDisplayColor(color, finalVisualState);
            ctx.beginPath();
            ctx.ellipse(0, 0, leafWidth, leafHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    if (layer === 'front' && !renderMode.lowPower) {
        ctx.globalAlpha = 0.22 * bloomStrength * finalCanopyAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cluster.x - cluster.rx * 0.16, cluster.y - cluster.ry * 0.24, cluster.rx * 0.38, cluster.ry * 0.22, -0.25, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawBranchBud(x, y, size, color = '#9be15d') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(59, 92, 44, 0.34)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.1, size * 0.72, -0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawBloomTreeFlowers(cluster, stage, renderMode, frameTime) {
    if (!cluster || !stage || stage.index < 4) return;
    const finalReveal = stage.key === 'final' ? clamp(Number(stage.finalReveal) || 0, 0, 1) : 0;
    const baseCount = stage.key === 'final' ? Math.round(8 + finalReveal * 3) : stage.key === 'flowers' ? 7 : stage.key === 'fruit' ? 8 : 11;
    const finalVisualState = stage.key === 'final' ? getFinalTreeVisualState({ stage }) : null;
    const finalFlowerAlpha = finalVisualState?.flowerAlpha ?? 1;
    const count = renderMode.ultraLowPower
        ? Math.ceil(baseCount * 0.44)
        : renderMode.lowPower
            ? Math.ceil(baseCount * 0.68)
            : baseCount;

    for (let i = 0; i < count; i++) {
        const seed = cluster.seed * 2.07 + i * 2.31;
        const angle = seededUnit(seed) * Math.PI * 2;
        const ring = 0.18 + seededUnit(seed + 1.4) * 0.76;
        const x = cluster.x + Math.cos(angle) * cluster.rx * ring;
        const y = cluster.y + Math.sin(angle * 1.07) * cluster.ry * ring + Math.sin(frameTime * 1.2 + seed) * 1.8;
        const size = Math.max(3.2, Math.min(8.5, cluster.ry * (0.16 + seededUnit(seed + 3.8) * 0.06)));
        const petalColor = BLOOM_TREE_FLOWER_COLORS[Math.floor(seededUnit(seed + 5.5) * BLOOM_TREE_FLOWER_COLORS.length)];

        ctx.save();
        ctx.globalAlpha = finalFlowerAlpha;
        drawFlowerCluster(x, y, size, getFinalTreeDisplayColor(petalColor, finalVisualState));
        ctx.restore();
    }
}

function drawBloomTreeFruit(cluster, stage, renderMode, frameTime) {
    if (!cluster || !stage || stage.index < 5) return;
    const finalReveal = stage.key === 'final' ? clamp(Number(stage.finalReveal) || 0, 0, 1) : 0;
    const baseCount = stage.key === 'final' ? Math.round(3 + finalReveal * 2) : 3;
    const finalVisualState = stage.key === 'final' ? getFinalTreeVisualState({ stage }) : null;
    const finalFruitAlpha = finalVisualState?.flowerAlpha ?? 1;
    const count = renderMode.ultraLowPower
        ? Math.max(1, Math.ceil(baseCount * 0.5))
        : renderMode.lowPower
            ? Math.ceil(baseCount * 0.72)
            : baseCount;

    for (let i = 0; i < count; i++) {
        const seed = cluster.seed * 3.19 + i * 4.07;
        const angle = seededUnit(seed) * Math.PI * 2;
        const ring = 0.18 + seededUnit(seed + 1.8) * 0.62;
        const x = cluster.x + Math.cos(angle) * cluster.rx * ring;
        const y = cluster.y + Math.sin(angle) * cluster.ry * ring + Math.sin(frameTime * 0.9 + seed) * 1.4;
        const size = Math.max(4, Math.min(9, cluster.ry * (0.17 + seededUnit(seed + 3.2) * 0.07)));

        ctx.save();
        ctx.globalAlpha = finalFruitAlpha;
        ctx.fillStyle = getFinalTreeDisplayColor(stage.key === 'final' ? '#ffcf4a' : '#ff9f43', finalVisualState);
        ctx.strokeStyle = 'rgba(90, 57, 27, 0.36)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.beginPath();
        ctx.arc(x - size * 0.28, y - size * 0.32, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawBloomingEnergyTree(startX, startY, treeSize, stage, renderMode = { lowPower: false, ultraLowPower: false }) {
    const frameTime = (STATE.frameNow || Date.now()) / 1000;
    const stageIndex = Math.max(2, Number(stage?.index) || 2);
    const isFinalTree = stage?.key === 'final';
    const finalReveal = isFinalTree ? clamp(Number(stage?.finalReveal) || 0, 0, 1) : 0;
    const finalMorph = isFinalTree ? getFinalTreeMorphProgress(finalReveal) : 0;
    const stageProgress = isFinalTree ? finalMorph : clamp(Number(stage?.progress) || 0, 0, 1);
    const renderStageIndex = isFinalTree ? 5 + finalMorph : stageIndex;
    const renderStage = isFinalTree ? { ...stage, index: renderStageIndex, progress: stageProgress, finalReveal: finalMorph } : stage;
    const finalVisualState = isFinalTree ? getFinalTreeVisualState({ stage: renderStage }) : null;
    const heightBoost = isFinalTree ? finalMorph * 0.46 : 0;
    const treeHeight = Math.min(
        canvas.height * (isFinalTree ? 0.67 + finalMorph * 0.07 : 0.67),
        Math.max(118, treeSize * (2.15 + renderStageIndex * 0.13 + heightBoost))
    );
    const spread = Math.min(
        canvas.width * (isFinalTree ? 0.34 + finalMorph * 0.09 : 0.34),
        Math.max(
            treeSize * (isFinalTree ? 0.95 + finalMorph * 0.29 : 0.95),
            treeHeight * (isFinalTree ? 0.58 + finalMorph * 0.2 : 0.58)
        )
    );
    const trunkBaseWidth = Math.max(
        isFinalTree ? 11 + finalMorph * 6 : 11,
        treeSize * (isFinalTree ? 0.11 + finalMorph * 0.04 : 0.11)
    );
    const sway = Math.sin(frameTime * 0.72) * (STATE.isListening ? Math.min(8, Math.max(1.5, (STATE.currentDB - 58) * 0.12)) : 1.6);
    const palette = getBloomTreePalette(stage);

    const branchColor = isFinalTree
        ? { dark: '#44312a', mid: '#6f4b3a', light: '#9b7045' }
        : { dark: '#3f2b25', mid: '#6d4c41', light: '#8d6e63' };
    const trunkTop = { x: sway * 0.28 - spread * 0.02, y: -treeHeight * 0.72 };
    const branchDefs = [
        { s: { x: -spread * 0.01, y: -treeHeight * 0.26 }, c: { x: -spread * 0.2 + sway * 0.18, y: -treeHeight * 0.38 }, e: { x: -spread * 0.56 + sway * 0.32, y: -treeHeight * 0.54 }, sw: 0.48, ew: 0.16 },
        { s: { x: spread * 0.01, y: -treeHeight * 0.32 }, c: { x: spread * 0.25 + sway * 0.12, y: -treeHeight * 0.44 }, e: { x: spread * 0.62 + sway * 0.25, y: -treeHeight * 0.58 }, sw: 0.46, ew: 0.16 },
        { s: { x: -spread * 0.02, y: -treeHeight * 0.45 }, c: { x: -spread * 0.3 + sway * 0.22, y: -treeHeight * 0.62 }, e: { x: -spread * 0.4 + sway * 0.34, y: -treeHeight * 0.84 }, sw: 0.34, ew: 0.12 },
        { s: { x: spread * 0.01, y: -treeHeight * 0.5 }, c: { x: spread * 0.2 + sway * 0.15, y: -treeHeight * 0.68 }, e: { x: spread * 0.4 + sway * 0.3, y: -treeHeight * 0.84 }, sw: 0.32, ew: 0.11 },
        { s: { x: trunkTop.x, y: trunkTop.y + treeHeight * 0.08 }, c: { x: -spread * 0.08 + sway * 0.15, y: -treeHeight * 0.88 }, e: { x: -spread * 0.02 + sway * 0.24, y: -treeHeight * 0.99 }, sw: 0.28, ew: 0.1 },
        { s: { x: -spread * 0.24, y: -treeHeight * 0.7 }, c: { x: -spread * 0.55 + sway * 0.18, y: -treeHeight * 0.76 }, e: { x: -spread * 0.66 + sway * 0.25, y: -treeHeight * 0.68 }, sw: 0.18, ew: 0.08 },
        { s: { x: spread * 0.25, y: -treeHeight * 0.7 }, c: { x: spread * 0.52 + sway * 0.18, y: -treeHeight * 0.75 }, e: { x: spread * 0.68 + sway * 0.25, y: -treeHeight * 0.66 }, sw: 0.18, ew: 0.08 },
        { s: { x: -spread * 0.04, y: -treeHeight * 0.58 }, c: { x: -spread * 0.34 + sway * 0.18, y: -treeHeight * 0.72 }, e: { x: -spread * 0.58 + sway * 0.28, y: -treeHeight * 0.88 }, sw: 0.22, ew: 0.08 },
        { s: { x: spread * 0.05, y: -treeHeight * 0.58 }, c: { x: spread * 0.34 + sway * 0.18, y: -treeHeight * 0.72 }, e: { x: spread * 0.58 + sway * 0.28, y: -treeHeight * 0.88 }, sw: 0.22, ew: 0.08 }
    ];
    const clusters = [
        { x: -spread * 0.62 + sway * 0.24, y: -treeHeight * 0.57, rx: spread * 0.24, ry: treeHeight * 0.13, seed: 1.1 },
        { x: spread * 0.64 + sway * 0.2, y: -treeHeight * 0.59, rx: spread * 0.25, ry: treeHeight * 0.13, seed: 2.6 },
        { x: -spread * 0.42 + sway * 0.2, y: -treeHeight * 0.82, rx: spread * 0.25, ry: treeHeight * 0.15, seed: 4.2 },
        { x: spread * 0.42 + sway * 0.2, y: -treeHeight * 0.82, rx: spread * 0.25, ry: treeHeight * 0.15, seed: 5.7 },
        { x: -spread * 0.02 + sway * 0.16, y: -treeHeight * 0.99, rx: spread * 0.3, ry: treeHeight * 0.17, seed: 7.5 },
        { x: -spread * 0.08 + sway * 0.1, y: -treeHeight * 0.67, rx: spread * 0.24, ry: treeHeight * 0.13, seed: 9.9 },
        { x: spread * 0.12 + sway * 0.08, y: -treeHeight * 0.7, rx: spread * 0.22, ry: treeHeight * 0.12, seed: 11.4 },
        { x: -spread * 0.72 + sway * 0.2, y: -treeHeight * 0.42, rx: spread * 0.18, ry: treeHeight * 0.095, seed: 13.2 },
        { x: spread * 0.74 + sway * 0.18, y: -treeHeight * 0.43, rx: spread * 0.18, ry: treeHeight * 0.095, seed: 15.4 },
        { x: -spread * 0.22 + sway * 0.12, y: -treeHeight * 0.52, rx: spread * 0.2, ry: treeHeight * 0.11, seed: 17.6 },
        { x: spread * 0.28 + sway * 0.1, y: -treeHeight * 0.52, rx: spread * 0.2, ry: treeHeight * 0.11, seed: 19.8 }
    ];
    const finalCrownClusters = [
        { x: -spread * 0.46 + sway * 0.16, y: -treeHeight * 0.71, rx: spread * 0.25, ry: treeHeight * 0.18, seed: 21.2 },
        { x: spread * 0.48 + sway * 0.14, y: -treeHeight * 0.72, rx: spread * 0.25, ry: treeHeight * 0.18, seed: 22.8 },
        { x: -spread * 0.18 + sway * 0.12, y: -treeHeight * 0.84, rx: spread * 0.27, ry: treeHeight * 0.18, seed: 24.1 },
        { x: spread * 0.18 + sway * 0.1, y: -treeHeight * 0.84, rx: spread * 0.27, ry: treeHeight * 0.18, seed: 25.9 },
        { x: -spread * 0.02 + sway * 0.1, y: -treeHeight * 0.62, rx: spread * 0.28, ry: treeHeight * 0.16, seed: 27.4 },
        { x: -spread * 0.02 + sway * 0.1, y: -treeHeight * 0.76, rx: spread * 0.31, ry: treeHeight * 0.19, seed: 29.7 }
    ];
    const finalBaseClusterCount = isFinalTree ? 8 + Math.round((clusters.length - 8) * finalMorph) : clusters.length;
    const finalClusterCount = isFinalTree ? Math.floor(finalCrownClusters.length * finalMorph) : 0;
    const naturalClusters = isFinalTree
        ? clusters.slice(0, finalBaseClusterCount).concat(finalCrownClusters.slice(0, finalClusterCount))
        : clusters;
    const visibleBranches = branchDefs.slice(0, getVisibleBranchCount(renderStageIndex, stageProgress, branchDefs.length, isFinalTree));
    const visibleClusters = isFinalTree
        ? naturalClusters
        : stageIndex >= 5
            ? naturalClusters.slice(0, 8)
            : stageIndex >= 4
                ? naturalClusters.slice(0, 6)
                : stageIndex >= 3
                    ? naturalClusters.slice(0, 5)
                    : [];

    ctx.save();
    ctx.translate(startX, startY);

    ctx.save();
    ctx.globalAlpha = 0.22 * (finalVisualState?.canopyAlpha ?? 1);
    ctx.fillStyle = '#2f6d3d';
    ctx.beginPath();
    ctx.ellipse(0, 9, spread * 0.42, treeSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawSurfaceRoots(spread, trunkBaseWidth, branchColor, renderStageIndex, stageProgress);

    if (isFinalTree) {
        ctx.save();
        ctx.globalAlpha = 0.16 * finalMorph * (finalVisualState?.canopyAlpha ?? 1);
        ctx.fillStyle = getFinalTreeDisplayColor('#2f8848', finalVisualState);
        ctx.beginPath();
        ctx.ellipse(sway * 0.08, -treeHeight * 0.76, spread * 0.52, treeHeight * 0.33, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawEnergyAura(sway * 0.12, -treeHeight * 0.72, spread * 0.24, '#baff82', finalVisualState.glowAlpha * (0.25 + finalMorph * 0.75));
        if (!finalVisualState.quiet) {
            drawEnergyAura(-spread * 0.05, -treeHeight * 0.98, spread * 0.2, '#fff3a3', finalVisualState.glowAlpha * 0.82 * finalMorph);
        }
        ctx.restore();
    }

    visibleClusters.forEach(cluster => drawBloomLeafCluster(cluster, palette, renderStage, renderMode, frameTime, 'back'));

    ctx.save();
    ctx.globalAlpha = finalVisualState?.branchAlpha ?? 1;
    drawTaperedBranch(
        { x: 0, y: 2 },
        { x: -spread * 0.07 + sway * 0.1, y: -treeHeight * 0.34 },
        trunkTop,
        trunkBaseWidth,
        Math.max(4.4, trunkBaseWidth * 0.34),
        branchColor
    );

    visibleBranches.forEach((branch, index) => {
        const widthScale = index > 4 ? 0.72 : 1;
        drawTaperedBranch(
            branch.s,
            branch.c,
            branch.e,
            Math.max(2.4, trunkBaseWidth * branch.sw * widthScale),
            Math.max(1.2, trunkBaseWidth * branch.ew * widthScale),
            branchColor
        );
        drawNaturalTwigCluster(branch, index, trunkBaseWidth, branchColor, renderStageIndex, stageProgress, renderMode);

        if (renderStageIndex === 2) {
            drawBranchBud(branch.e.x, branch.e.y, Math.max(3.2, trunkBaseWidth * 0.12), '#9be15d');
        }
    });
    ctx.restore();

    visibleClusters.forEach(cluster => {
        drawBloomLeafCluster(cluster, palette, renderStage, renderMode, frameTime, 'front');
        drawBloomTreeFlowers(cluster, renderStage, renderMode, frameTime);
        drawBloomTreeFruit(cluster, renderStage, renderMode, frameTime);
    });

    if (stage?.key === 'final') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawEnergyAura(sway * 0.12, -treeHeight * 0.72, spread * 0.22, '#ffe082', finalVisualState.glowAlpha * 0.7 * (0.25 + finalMorph * 0.75));
        if (!finalVisualState.quiet) {
            drawEnergyAura(-spread * 0.05, -treeHeight * 0.98, spread * 0.18, '#fff3a3', finalVisualState.glowAlpha * 0.58 * finalMorph);
        }
        ctx.restore();
    }

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
    ctx.lineWidth = Math.max(1.4, (plant.bladeWidth || 2.1) * 1.12);
    ctx.strokeStyle = plant.grassColor || '#5abf59';
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

        const layer = Number.isFinite(plant.layer) ? plant.layer : 1;
        const layerAlpha = lowPowerMode ? 0.72 : 0.66 + layer * 0.14;
        const sway = Math.sin(time + plant.swayPhase + index * 0.18) * (lowPowerMode ? 2.4 : 2.2 + layer * 1.1 + plant.growth * 3.4);
        drawEnergyAura(
            plant.x,
            plant.baseY - 4,
            (lowPowerMode ? 3.6 : 5) + plant.pulse * (lowPowerMode ? 4.2 : 7),
            plant.energyColor,
            (lowPowerMode ? 0.025 : 0.04) + plant.pulse * (lowPowerMode ? 0.03 : 0.06)
        );

        ctx.save();
        ctx.globalAlpha = clamp(layerAlpha + plant.pulse * 0.16, 0.52, 1);
        ctx.lineCap = 'round';
        if (plant.kind === 'flower') {
            drawFlowerPlant(plant, sway, lowPowerMode);
        } else {
            drawGrassBlade(plant, sway, 1);
            drawGrassBlade(plant, sway * 0.72 - 6, 0.82);
            drawGrassBlade(plant, sway * 0.65 + 5, 0.74);
            if (!lowPowerMode && (plant.growth > 0.42 || plant.pulse > 0.24 || layer >= 2)) {
                drawGrassBlade(plant, sway * 0.38 + 8, 0.62);
            }
            if (!lowPowerMode && layer >= 1) {
                drawGrassBlade(plant, sway * 0.28 - 10, 0.52);
            }
        }
        ctx.restore();
    });
}

function drawMeadowCritters() {
    if (!meadowCritters.length) return;

    meadowCritters.forEach(critter => {
        critter.update?.();
        critter.draw?.();
    });
}

function spawnSkyEnergy(treeSize, anchors) {
    if (!STATE.isListening) return;
    const activationMeta = getAudioActivation(STATE.currentDB, getSensitivityProfile(STATE.sensitivity), STATE.readingHoldSeconds);
    const activation = activationMeta.intensity;
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
    let spawnCount = Math.max(1, Math.min(activationMeta.orbCount, 3));
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
    const activationMeta = getAudioActivation(STATE.currentDB, getSensitivityProfile(STATE.sensitivity), STATE.readingHoldSeconds);
    const activation = activationMeta.intensity;
    const anchors = getEnergyAnchors(treeSize);
    const renderMode = getRenderMode(treeSize);
    const hasFlow = activation > 0.04 || energyParticles.length || trunkTransfers.length || soilTransfers.length;
    if (activation > 0.05 && (!renderMode.ultraLowPower || Math.random() < 0.72)) {
        spawnSkyEnergy(treeSize, anchors);
    }

    if (hasFlow) {
        const flowAlpha = Math.min(0.9, activationMeta.glow);
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
    if (meadowCritters.length) initMeadowCritters();
}

function initEnvironment() {
    clouds.length = 0;
    birds.length = 0;
    sparkles.length = 0;
    energyParticles.length = 0;
    trunkTransfers.length = 0;
    soilTransfers.length = 0;
    rewardEffects.length = 0;
    initMeadowPlants();
    initMeadowCritters();
    for (let i = 0; i < 5; i++) clouds.push(new Cloud());
    for (let i = 0; i < 3; i++) birds.push(new Bird());
}

// Enhanced Recursive Tree
function drawEnhancedTree(startX, startY, len, angle, branchWidth, depth, renderMode = { lowPower: false, ultraLowPower: false }) {
    ctx.beginPath();
    ctx.save();
    const frameTime = (STATE.frameNow || Date.now()) / 1000;
    const visualEnergy = getTreeDisplayEnergy();
    const lifecycleStage = getTreeDisplayLifecycleStage(visualEnergy);

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
        if (lifecycleStage.index >= 3 && shouldRenderCanopyCluster(depth, len, angle, renderMode)) {
            const baseSize = (visualEnergy / 100) * 12 + 3;
            const leafPulse = renderMode.lowPower ? 1 : 1.5;
            const size = baseSize + Math.sin(frameTime + depth) * leafPulse;

            const colorSet = (STATE.isSuperMode || lifecycleStage.key === 'final') ? GOLDEN_COLORS : FOLIAGE_COLORS;
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
    const now = Date.now();
    const deltaSeconds = getFrameDeltaSeconds(now);
    STATE.lastFrameAt = now;
    updateState(deltaSeconds);
    STATE.frameNow = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#4facfe');
    skyGradient.addColorStop(1, '#00f2fe');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    const visualEnergy = getTreeDisplayEnergy();
    const treeSize = getTreeRenderSize(visualEnergy, { width: canvas.width, height: canvas.height });
    const renderMode = getRenderMode(treeSize);
    const lifecycleStage = getTreeDisplayLifecycleStage(visualEnergy);
    maybeAnnounceFinalTree(lifecycleStage);

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height - 80, canvas.width, canvas.height);
    ctx.fillStyle = '#66bb6a';
    ctx.fill();

    if (lifecycleStage.index >= 2 && treeSize > 60) {
        drawBloomingEnergyTree(canvas.width / 2, canvas.height - 20, treeSize, lifecycleStage, renderMode);
    } else {
        const startX = canvas.width / 2;
        const startY = canvas.height - 30;
        drawSeedAndSprout(startX, startY, lifecycleStage);
    }

    drawEnergyFlow(treeSize);
    drawRewardEffects(treeSize);
    drawMeadowPlants();
    drawMeadowCritters();

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

    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        const translated = t(key);
        if (translated) el.setAttribute('aria-label', translated);
    });

    updateTaskStrip();
    renderWeeklyReport();
    renderForestMap();
    updateModeUI();
    renderCompetitionPanel();
    if (taskModal?.classList.contains('open')) renderTaskBoard();
}

function updateSensitivityControl(value = STATE.sensitivity) {
    const nextSensitivity = clampSensitivity(value);
    const profile = getSensitivityProfile(nextSensitivity);
    STATE.sensitivity = nextSensitivity;

    if (sensitivitySlider) {
        sensitivitySlider.value = String(nextSensitivity);
        const progress = ((nextSensitivity - SENSITIVITY_MIN) / (SENSITIVITY_MAX - SENSITIVITY_MIN)) * 100;
        sensitivitySlider.style.setProperty('--sens-progress', `${progress}%`);
    }

    if (sensitivityValue) {
        sensitivityValue.textContent = `${nextSensitivity}%`;
    }

    if (sensitivityHint) {
        const modeKey = nextSensitivity <= 45 ? 'steady' : nextSensitivity >= 70 ? 'sensitive' : 'standard';
        const modeLabel = t(`morningTree.sensitivityModes.${modeKey}`) || (
            modeKey === 'steady' ? '稳健' : modeKey === 'sensitive' ? '灵敏' : '标准'
        );
        const hintTemplate = t('morningTree.sensitivityHint') || '{mode}：约 {threshold}dB 后持续 {seconds} 秒才增长';
        sensitivityHint.textContent = hintTemplate
            .replace('{mode}', modeLabel)
            .replace('{threshold}', Math.round(profile.readingThreshold))
            .replace('{seconds}', profile.minimumReadingSeconds.toFixed(1));
    }
}

// Init
initLocalization().then(() => {
    initGatekeeper();
    initCompetitionUI();
    initTaskUI();
    initReportUI();
    initForestUI();
    initRewardUI();
    renderRewardPanel();
    updateSensitivityControl();
    updateModeUI();
});
micBtn.onclick = toggleMic;
if ($('reset-btn')) $('reset-btn').onclick = resetGame;

window.addEventListener('pagehide', () => {
    saveTaskDrafts(false);
    if (STATE.isListening) stopMic();
});

if (sensitivitySlider) {
    sensitivitySlider.oninput = (event) => updateSensitivityControl(event.target.value);
}

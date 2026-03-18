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
    translations: null
};

// Aesthetic Config
const FOLIAGE_COLORS = ['#43a047', '#66bb6a', '#a5d6a7', '#81c784'];
const GOLDEN_COLORS = ['#ffd700', '#ffecb3', '#fff9c4', '#fff59d'];
const ENERGY_SKY_COLORS = ['#fff176', '#ffe082', '#fff59d', '#ffecb3'];

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
let audioCtx, analyser, dataArray, source;

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

        startTimer();
        loop();
    } catch (err) {
        console.error("Mic Error:", err);
        alert(t('morningTree.micError') || "无法访问麦克风，请检查权限设置。");
    }
}

function stopMic() {
    if (source) source.disconnect();
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
    STATE.energy = 0;
    STATE.isSuperMode = false;
    STATE.remainingTime = STATE.sessionDuration * 60;
    updateTimerDisplay();
    sparkles.length = 0;
    energyParticles.length = 0;
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = -(Math.random() * 2 + 1);
        this.life = 1;
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class SkyEnergy {
    constructor(x, y, targetX, targetY, strength = 0.5) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.strength = strength;
        this.size = 2 + (Math.random() * 4 * strength);
        this.life = 1;
        this.phase = Math.random() * Math.PI * 2;
        this.hue = ENERGY_SKY_COLORS[Math.floor(Math.random() * ENERGY_SKY_COLORS.length)];
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = 0.2 + Math.random() * 0.4;
    }
    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = 0.012 + (this.strength * 0.02);

        this.phase += 0.15;
        this.vx += (dx / dist) * pull;
        this.vy += (dy / dist) * pull;
        this.vx *= 0.985;
        this.vy *= 0.987;

        this.x += this.vx + Math.sin(this.phase) * 0.35;
        this.y += this.vy;

        if (dist < 18) {
            sparkles.push(new Sparkle(this.x, this.y));
            return false;
        }

        this.life -= 0.003 + (this.strength * 0.001);
        return this.life > 0 && this.y < canvas.height + 80;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0.15, this.life);
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
        glow.addColorStop(0, this.hue);
        glow.addColorStop(0.45, 'rgba(255,255,255,0.85)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.min(1, this.life + 0.15);
        ctx.fillStyle = this.hue;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function spawnSkyEnergy(treeSize) {
    if (!STATE.isListening) return;
    const activation = Math.max(0, (STATE.currentDB - 56) / 26);
    if (activation <= 0) return;

    const spawnCount = Math.random() < (0.18 + activation * 0.4) ? 1 : 0;
    if (!spawnCount) return;

    const targetX = (canvas.width / 2) + ((Math.random() - 0.5) * treeSize * 0.35);
    const targetY = canvas.height - 30 - (treeSize * 0.78) + ((Math.random() - 0.5) * treeSize * 0.15);
    const sourceBand = Math.max(90, canvas.width * 0.18);
    const sourceX = canvas.width - 100 + ((Math.random() - 0.5) * sourceBand);
    const sourceY = 90 + (Math.random() * 90);

    energyParticles.push(new SkyEnergy(sourceX, sourceY, targetX, targetY, activation));
}

function drawEnergyFlow(treeSize) {
    const activation = Math.max(0, (STATE.currentDB - 56) / 26);
    if (activation > 0.05) {
        spawnSkyEnergy(treeSize);

        ctx.save();
        ctx.globalAlpha = Math.min(0.25, activation * 0.22);
        const beam = ctx.createLinearGradient(canvas.width - 100, 100, canvas.width / 2, canvas.height - 40 - treeSize * 0.72);
        beam.addColorStop(0, 'rgba(255, 245, 157, 0.55)');
        beam.addColorStop(0.55, 'rgba(255, 255, 255, 0.12)');
        beam.addColorStop(1, 'rgba(76, 175, 80, 0)');
        ctx.strokeStyle = beam;
        ctx.lineWidth = 10 + (activation * 8);
        ctx.beginPath();
        ctx.moveTo(canvas.width - 100, 100);
        ctx.quadraticCurveTo(canvas.width * 0.72, canvas.height * 0.24, canvas.width / 2, canvas.height - 35 - treeSize * 0.72);
        ctx.stroke();
        ctx.restore();
    }

    for (let i = energyParticles.length - 1; i >= 0; i--) {
        if (!energyParticles[i].update()) {
            energyParticles.splice(i, 1);
        } else {
            energyParticles[i].draw();
        }
    }
}


function initCanvas() {
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function initEnvironment() {
    clouds.length = 0;
    birds.length = 0;
    sparkles.length = 0;
    energyParticles.length = 0;
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
    drawEnergyFlow(treeSize);

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
});
micBtn.onclick = toggleMic;
if ($('reset-btn')) $('reset-btn').onclick = resetGame;

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

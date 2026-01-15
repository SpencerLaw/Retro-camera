/**
 * Morning Energy Tree - Enhanced Version 2.0 (Aesthetic Update)
 * 
 * Features:
 * 1. Session Timer & Game Logic (Preserved)
 * 2. Visual Upgrade: Lush Foliage, Gradient Trunk, Wind Animation
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
    baseGrowthRate: 1.67 / 60
};

// Aesthetic Config
const FOLIAGE_COLORS = ['#43a047', '#66bb6a', '#a5d6a7', '#81c784'];
const GOLDEN_COLORS = ['#ffd700', '#ffecb3', '#fff9c4', '#fff59d'];

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

    if (input.startsWith(LICENSE_PREFIX) && input.length >= 5) {
        localStorage.setItem(AUTH_KEY, input);
        showApp();
    } else {
        errorMsg.style.display = 'block';
        errorMsg.textContent = '无效的授权码：必须以 "ZD" 开头';
        $('gatekeeper-screen').querySelector('.auth-card').animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
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
                showToast("⏰ 早读时间结束！");
                stopMic();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(STATE.remainingTime / 60);
    const secs = STATE.remainingTime % 60;
    countdownTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        alert("无法访问麦克风，请检查权限设置。");
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
    } else if (STATE.currentDB > 70) {
        dbValue.style.color = '#4caf50';
        dbDisplay.style.borderColor = 'rgba(76, 175, 80, 0.8)';
    } else {
        dbValue.style.color = '#fff';
        dbDisplay.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    }

    const READING_THRESHOLD = 70;
    if (STATE.currentDB >= READING_THRESHOLD) {
        const volumeBonus = Math.min((STATE.currentDB - READING_THRESHOLD) / 20, 1);
        const rate = STATE.baseGrowthRate * (1 + volumeBonus);
        STATE.energy += rate;

        if (STATE.currentDB > 95) shakeScreen(3);
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
    showToast("🎉 能量树显灵了！全班棒棒哒！ 🎉"); // Changed toast text slightly

    setTimeout(() => {
        STATE.isSuperMode = false;
        STATE.energy = 80;
        STATE.treeColor = '#4caf50';
    }, 5000);
}

function shakeScreen(intensity = 5) {
    document.body.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`;
    setTimeout(() => {
        document.body.style.transform = 'none';
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
function initCanvas() {
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Sparkle Particle (for Super Mode or Growth)
const sparkles = [];
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

// Enhanced Recursive Tree with "Clump" Foliage
function drawEnhancedTree(startX, startY, len, angle, branchWidth, depth) {
    ctx.beginPath();
    ctx.save();

    // Aesthetic: Tapered Branches
    ctx.lineCap = 'round';
    ctx.lineWidth = branchWidth;

    // Trunk Gradient & Color
    if (depth < 2) {
        const grad = ctx.createLinearGradient(0, 0, 0, -len);
        grad.addColorStop(0, '#4e342e'); // Darker Wood
        grad.addColorStop(0.5, '#795548'); // Medium Wood
        grad.addColorStop(1, '#8d6e63'); // Lighter Top
        ctx.strokeStyle = grad;
    } else {
        ctx.strokeStyle = '#6d4c41';
    }

    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI / 180);

    // Draw Curve Branch (More natural)
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0, -len / 2, 0, -len);
    ctx.stroke();

    // 🌳 LUSH FOLIAGE (CLUMPS) 🌳
    // Draw clouds of leaves at higher depths
    if (depth >= 4 || (len < 10 && depth > 2)) {
        if (STATE.energy > 15) {
            // Size pulses with wind/energy
            const baseSize = (STATE.energy / 100) * 12 + 3;
            const size = baseSize + Math.sin(Date.now() / 500 + depth) * 2;

            // Color Selection
            const colorSet = STATE.isSuperMode ? GOLDEN_COLORS : FOLIAGE_COLORS;
            // Random-ish but deterministic by depth to avoid flickering
            const colorIndex = (depth * 3) % colorSet.length;
            const color = colorSet[colorIndex];

            ctx.beginPath();
            ctx.fillStyle = color;
            // Draw main clump
            ctx.arc(0, -len, size, 0, Math.PI * 2);
            ctx.fill();

            // Highlight (Sunlight)
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.arc(-size * 0.3, -len - size * 0.3, size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Super Mode Glint
            if (STATE.isSuperMode && Math.random() < 0.05) {
                sparkles.push(new Sparkle(
                    // World coords rough approximation would be hard here?
                    // Actually we can just draw sparkle here relative to ctx
                    0 + (Math.random() - 0.5) * size,
                    -len + (Math.random() - 0.5) * size
                ));
            }
        }
    }

    if (len < 10) {
        ctx.restore();
        return;
    }

    // Branching with Wind
    let wind = 0;
    if (STATE.currentDB > 50) {
        // Wind affects thinner branches more
        wind = Math.sin(Date.now() / 400 + depth) * ((STATE.currentDB - 50) / 30) * (depth * 0.5);
    }

    // Spread based on volume presence
    let volumeFactor = (STATE.currentDB - 30) / 70;
    if (volumeFactor < 0) volumeFactor = 0;

    let spread = 20 + (volumeFactor * 10); // Base spread

    ctx.translate(0, -len);

    const branchCount = 2;
    for (let i = 0; i < branchCount; i++) {
        // Natural asymmetry
        const dir = i === 0 ? -1 : 1;
        const offset = (Math.random() - 0.5) * 5; // Slight jitter
        const branchAngle = (spread * dir) + wind + offset;
        const lengthFactor = 0.72 + (Math.random() * 0.05); // Varying lengths

        drawEnhancedTree(0, 0, len * lengthFactor, branchAngle, branchWidth * 0.7, depth + 1);
    }

    // Occasional 3rd branch for fullness if energy is high
    if (depth < 3 && STATE.energy > 60 && Math.random() < 0.3) {
        drawEnhancedTree(0, 0, len * 0.6, wind, branchWidth * 0.6, depth + 1);
    }

    ctx.restore();
}

function loop() {
    updateState();

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Beautiful Sky Background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#4facfe'); // Fresh Blue
    skyGradient.addColorStop(1, '#00f2fe'); // Light Blue
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun
    ctx.beginPath();
    const sunGrad = ctx.createRadialGradient(canvas.width, 0, 20, canvas.width, 0, 150);
    sunGrad.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
    sunGrad.addColorStop(1, 'rgba(255, 235, 59, 0)');
    ctx.fillStyle = sunGrad;
    ctx.arc(canvas.width, 0, 150, 0, Math.PI * 2);
    ctx.fill();

    // Rolling Hills (Ground)
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height - 80, canvas.width, canvas.height);
    ctx.fillStyle = '#66bb6a';
    ctx.fill();

    // Main Tree
    const treeSize = 80 + (STATE.energy * 1.6);

    if (treeSize > 60) {
        drawEnhancedTree(canvas.width / 2, canvas.height - 20, treeSize, 0, treeSize / 9, 0);
    } else {
        // Quality Seed
        ctx.beginPath();
        const startX = canvas.width / 2;
        const startY = canvas.height - 30;
        ctx.fillStyle = '#795548';
        ctx.ellipse(startX, startY, 10, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Sprout
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX - 5, startY - 15, startX - 15, startY - 20);
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // Render and update sparkles (no transform context needed as they are stored in screen coords? 
    // Wait, my sparkle gen logic in drawEnhancedTree was flawed because canvas was transformed.
    // Fixed: Sparkles generated relative to tree are tricky.
    // Let's just generate global ambient sparkles in loop if super mode.

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

// Init
initGatekeeper();
// Re-bind listener just in case overwriting removed them (it doesn't, listeners are on DOM nodes)
micBtn.onclick = toggleMic;
if ($('reset-btn')) $('reset-btn').onclick = () => {
    STATE.energy = 0;
    STATE.isSuperMode = false;
    STATE.remainingTime = STATE.sessionDuration * 60;
    updateTimerDisplay();
    sparkles.length = 0;
};
if ($('sensitivity-slider')) $('sensitivity-slider').oninput = (e) => { STATE.sensitivity = parseInt(e.target.value); };

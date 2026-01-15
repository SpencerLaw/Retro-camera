/**
 * Morning Energy Tree - Enhanced Version
 * 
 * Features:
 * 1. Session Timer (30/40 min + custom)
 * 2. Calibrated Growth: 1 min @ 70dB = 100% energy
 * 3. Enhanced Tree Visualization
 * 4. Animated dB Meter
 */

/* --- Constants & State --- */
const AUTH_KEY = 'morning_tree_auth';
const LICENSE_PREFIX = 'ZD';

const STATE = {
    isListening: false,
    energy: 0, // 0 to 100
    sensitivity: 50,
    currentDB: 30,
    treeColor: '#4caf50',
    isSuperMode: false,

    // Timer System
    sessionDuration: 30, // minutes
    remainingTime: 30 * 60, // seconds
    timerInterval: null,

    // Growth calibration: 1 min loud reading = full tree
    // So growth rate per second at 70dB+ should be: 100 / 60 = 1.67% per second
    // At 60fps, that's 1.67/60 = 0.028 per frame
    baseGrowthRate: 1.67 / 60 // per frame at 70dB
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
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
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

        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        startTimer();
        loop();
    } catch (err) {
        console.error("Mic Error:", err);
        alert("无法访问麦克风，请检查权限设置。");
    }
}

function stopMic() {
    if (source) {
        source.disconnect();
    }
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
    if (rms > 0) {
        db = (Math.log10(rms) * 20) + 100;
    }

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
    STATE.currentDB += (targetDB - STATE.currentDB) * 0.3; // Faster response

    // Update dB UI with dramatic color changes
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

    // Growth Logic: Calibrated for 1 min @ 70dB = full tree
    const READING_THRESHOLD = 70;

    if (STATE.currentDB >= READING_THRESHOLD) {
        // Growth rate increases with volume
        // At 70dB: base rate
        // At 90dB: 2x rate
        const volumeBonus = Math.min((STATE.currentDB - READING_THRESHOLD) / 20, 1);
        const rate = STATE.baseGrowthRate * (1 + volumeBonus);

        STATE.energy += rate;

        if (STATE.currentDB > 95) {
            shakeScreen(3);
        }
    } else {
        // Slow decay when quiet
        STATE.energy -= 0.05;
    }

    if (STATE.energy < 0) STATE.energy = 0;
    if (STATE.energy > 100) STATE.energy = 100;

    energyFill.style.width = STATE.energy + '%';

    if (STATE.energy >= 100 && !STATE.isSuperMode) {
        triggerSuperMode();
    }
}

function triggerSuperMode() {
    STATE.isSuperMode = true;
    STATE.treeColor = '#ffd700';
    showToast("🎉 能量树已长成！继续保持！ 🎉");

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

/* --- 5. Enhanced Tree Visualization --- */
function initCanvas() {
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Particle system for leaves
const leaves = [];
class Leaf {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * 2 + 1;
        this.size = Math.random() * 8 + 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.life = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.life -= 0.01;
        return this.life > 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;

        // Leaf shape
        ctx.fillStyle = STATE.isSuperMode ? '#ffd700' : '#4caf50';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function drawEnhancedTree(startX, startY, len, angle, branchWidth, depth) {
    ctx.beginPath();
    ctx.save();

    // Trunk color with gradient
    if (depth === 0) {
        const gradient = ctx.createLinearGradient(0, 0, 0, -len);
        gradient.addColorStop(0, '#5d4037');
        gradient.addColorStop(1, '#8d6e63');
        ctx.strokeStyle = gradient;
    } else if (depth < 3) {
        ctx.strokeStyle = '#6d4c41';
    } else {
        ctx.strokeStyle = STATE.isSuperMode ? '#ffd700' : STATE.treeColor;
    }

    ctx.lineWidth = branchWidth;
    ctx.lineCap = 'round';
    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI / 180);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();

    // Add leaves/flowers at branch ends
    if (len < 15 && STATE.energy > 30) {
        const endX = startX + Math.sin(angle * Math.PI / 180) * len;
        const endY = startY - Math.cos(angle * Math.PI / 180) * len;

        // Occasionally spawn leaves
        if (Math.random() < 0.02 && STATE.currentDB > 70) {
            leaves.push(new Leaf(endX, endY));
        }

        // Draw flower/fruit
        if (STATE.energy > 60) {
            ctx.beginPath();
            ctx.arc(0, -len, 6, 0, Math.PI * 2);

            if (STATE.isSuperMode) {
                const flowerGradient = ctx.createRadialGradient(0, -len, 0, 0, -len, 6);
                flowerGradient.addColorStop(0, '#fff');
                flowerGradient.addColorStop(1, '#ffd700');
                ctx.fillStyle = flowerGradient;
            } else {
                ctx.fillStyle = STATE.energy > 80 ? '#ff6b9d' : '#e74c3c';
            }
            ctx.fill();

            // Flower petals for super mode
            if (STATE.isSuperMode) {
                for (let i = 0; i < 5; i++) {
                    const petalAngle = (i / 5) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.ellipse(
                        Math.cos(petalAngle) * 8,
                        -len + Math.sin(petalAngle) * 8,
                        4, 6, petalAngle, 0, Math.PI * 2
                    );
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                }
            }
        }

        ctx.restore();
        return;
    }

    if (len < 10) {
        ctx.restore();
        return;
    }

    // Dynamic branching based on volume
    let volumeFactor = (STATE.currentDB - 30) / 70;
    if (volumeFactor < 0) volumeFactor = 0;
    if (volumeFactor > 1) volumeFactor = 1;

    let spread = 18 + (volumeFactor * 20);
    spread += (Math.random() - 0.5) * 8;

    ctx.translate(0, -len);

    // Recursive branches
    const branchCount = depth < 2 ? 2 : 2;
    for (let i = 0; i < branchCount; i++) {
        const branchAngle = i === 0 ? -spread : spread;
        drawEnhancedTree(0, 0, len * 0.72, branchAngle, branchWidth * 0.65, depth + 1);
    }

    ctx.restore();
}

function loop() {
    updateState();

    // Clear with slight trail effect for smoothness
    ctx.fillStyle = 'rgba(41, 128, 185, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#2980b9');
    skyGradient.addColorStop(1, '#6dd5fa');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    const groundGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
    groundGradient.addColorStop(0, '#81c784');
    groundGradient.addColorStop(1, '#66bb6a');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Tree
    const treeSize = 70 + (STATE.energy * 1.5);

    if (treeSize > 60) {
        drawEnhancedTree(canvas.width / 2, canvas.height - 40, treeSize, 0, treeSize / 8, 0);
    } else {
        // Seed
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height - 30, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#5d4037';
        ctx.fill();
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Update and draw leaves
    for (let i = leaves.length - 1; i >= 0; i--) {
        if (!leaves[i].update()) {
            leaves.splice(i, 1);
        } else {
            leaves[i].draw();
        }
    }

    if (STATE.isListening) {
        requestAnimationFrame(loop);
    }
}

/* --- Event Listeners --- */
micBtn.onclick = toggleMic;
$('reset-btn').onclick = () => {
    STATE.energy = 0;
    STATE.isSuperMode = false;
    STATE.remainingTime = STATE.sessionDuration * 60;
    updateTimerDisplay();
    leaves.length = 0;
};
$('sensitivity-slider').oninput = (e) => { STATE.sensitivity = parseInt(e.target.value); };

// Init
initGatekeeper();

/**
 * Morning Energy Tree - Core Logic
 * 
 * Features:
 * 1. Gatekeeper Authorization (ZD-XXX)
 * 2. Web Audio API Analysis (RMS)
 * 3. Fractal Tree Visualization (Canvas)
 * 4. Gamification (Energy Bar, Rewards)
 */

/* --- Constants & State --- */
const AUTH_KEY = 'morning_tree_auth';
const LICENSE_PREFIX = 'ZD';

const STATE = {
    isListening: false,
    energy: 0, // 0 to 100
    sensitivity: 50, // 1 to 100
    volume: 0, // Current smoothed volume (0.0 to 1.0)
    treeColor: '#4caf50',
    isSuperMode: false,
    superModeTimer: 0
};

/* --- DOM Elements --- */
const $ = (id) => document.getElementById(id);
const gatekeeper = $('gatekeeper-screen');
const appContainer = $('app-container');
const canvas = $('tree-canvas');
const ctx = canvas.getContext('2d');
const energyFill = $('energy-fill');
const micBtn = $('mic-toggle-btn');

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
        // Shake animation
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
    }, 500);
}

/* --- 2. Audio Logic --- */
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser); // Only connect to analyser, not destination (to avoid feedback loop)

        dataArray = new Uint8Array(analyser.frequencyBinCount);

        STATE.isListening = true;
        micBtn.textContent = '⏸';
        micBtn.classList.add('active');

        // Resume context if suspended
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        loop();
    } catch (err) {
        console.error("Mic Error:", err);
        alert("无法访问麦克风，请检查权限设置。");
    }
}

function stopMic() {
    if (source) {
        source.disconnect();
        // track.stop() to release hardware
    }
    STATE.isListening = false;
    micBtn.textContent = '🎤';
    micBtn.classList.remove('active');
}

function getVolume() {
    if (!STATE.isListening || !analyser) return 0;

    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (average power)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Normalize based on sensitivity (0 to 255 -> 0.0 to 1.0)
    // Higher sensitivity slider = lower threshold needed = multiply average by higher factor
    // Slider 1-100. Factor 0.5 to 3.0
    const factor = 0.5 + (STATE.sensitivity / 100 * 4);
    let norm = (average * factor) / 100;
    if (norm > 1) norm = 1;

    return norm;
}

/* --- 3. Game Logic --- */
function updateState() {
    const targetVolume = getVolume();
    // Smooth volume transition
    STATE.volume += (targetVolume - STATE.volume) * 0.1;

    if (!STATE.isListening) return;

    // Energy logic
    // Ideal range: 0.1 to 0.8.
    // > 0.9 is noise (penalty).

    if (STATE.volume > 0.05) {
        if (STATE.volume > 0.9) {
            // Noise penalty
            STATE.energy -= 0.5;
            shakeScreen();
        } else {
            // Growth
            STATE.energy += 0.05 * (STATE.volume * 2);
        }
    } else {
        // Decay if silent
        STATE.energy -= 0.02;
    }

    // Clamp energy
    if (STATE.energy < 0) STATE.energy = 0;
    if (STATE.energy > 100) STATE.energy = 100;

    // Update UI
    energyFill.style.width = STATE.energy + '%';

    // Check Super Mode
    if (STATE.energy >= 100 && !STATE.isSuperMode) {
        triggerSuperMode();
    }
}

function triggerSuperMode() {
    STATE.isSuperMode = true;
    STATE.treeColor = '#ffd700'; // Gold
    showToast("🎉 班级早读成就达成！ 🎉");

    // Keep super mode for 5 seconds then reset energy slightly to keep playing
    setTimeout(() => {
        STATE.isSuperMode = false;
        STATE.energy = 80;
        STATE.treeColor = '#4caf50';
    }, 5000);
}

function shakeScreen() {
    document.body.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`;
    setTimeout(() => {
        document.body.style.transform = 'none';
    }, 100);
}

function showToast(msg) {
    const container = $('toast-container');
    const el = document.createElement('div');
    el.className = 'achievement-text';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

/* --- 4. Visualization (Canvas) --- */
function initCanvas() {
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawTree(startX, startY, len, angle, branchWidth, depth) {
    ctx.beginPath();
    ctx.save();
    ctx.strokeStyle = depth < 2 ? '#2e7d32' : STATE.isSuperMode ? '#f1c40f' : '#5d4037'; // Green leaves, brown trunk
    if (depth <= 2) ctx.strokeStyle = STATE.treeColor; // Leaves color

    ctx.lineWidth = branchWidth;
    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI / 180);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();

    if (len < 10) {
        // Draw fruit/flower if deep enough
        if (STATE.isSuperMode || depth < 1) {
            ctx.beginPath();
            ctx.arc(0, -len, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c'; // Red fruit
            ctx.fill();
        }
        ctx.restore();
        return;
    }

    // Dynamic params based on volume and energy
    // More volume = more spread (angle)
    // More energy = more length recursion

    // Base spread angle: 15 to 30 degrees
    let spread = 15 + (STATE.volume * 20);
    // Random jitter (wind)
    spread += (Math.random() - 0.5) * 4;

    ctx.translate(0, -len);

    // Recursive calls
    // Left branch
    drawTree(0, 0, len * 0.75, -spread, branchWidth * 0.7, depth + 1);
    // Right branch
    drawTree(0, 0, len * 0.75, spread, branchWidth * 0.7, depth + 1);

    ctx.restore();
}

function loop() {
    updateState();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.fillStyle = '#81c784';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Calculate Tree Size based on Energy
    // Base trunk length: 50 px + (Energy * 1.5)
    // Max trunk: 200px
    const treeSize = 60 + (STATE.energy * 1.4);

    if (treeSize > 50) {
        // Only draw if there is some energy
        drawTree(canvas.width / 2, canvas.height - 20, treeSize, 0, treeSize / 10, 0);
    } else {
        // Draw seed
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height - 10, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#5d4037';
        ctx.fill();
    }

    if (STATE.isListening) {
        requestAnimationFrame(loop);
    }
}

/* --- Event Listeners --- */
micBtn.onclick = toggleMic;
$('reset-btn').onclick = () => { STATE.energy = 0; STATE.isSuperMode = false; };
$('sensitivity-slider').oninput = (e) => { STATE.sensitivity = parseInt(e.target.value); };

// Init
initGatekeeper();

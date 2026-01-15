/**
 * Morning Energy Tree - Core Logic
 * 
 * Features:
 * 1. Gatekeeper Authorization (ZD-XXX)
 * 2. Web Audio API Analysis (TimeDomain -> dB)
 * 3. Fractal Tree Visualization (Canvas)
 * 4. Gamification (Energy Bar, dB Meter, Rewards)
 */

/* --- Constants & State --- */
const AUTH_KEY = 'morning_tree_auth';
const LICENSE_PREFIX = 'ZD';

const STATE = {
    isListening: false,
    energy: 0, // 0 to 100
    sensitivity: 50, // 1 to 100 (Still useful for fine tuning dB offset maybe? or remove)
    // Let's keep sensitivity as a gain multiplier or offset if needed.
    // For now, hard standard dB is better.
    currentDB: 30,
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
const dbValue = $('db-value');

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

/* --- 2. Audio Logic (dB Calculation) --- */
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
        analyser.fftSize = 512; // Time domain needs reasonable size
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.fftSize);

        STATE.isListening = true;
        micBtn.textContent = '⏸';
        micBtn.classList.add('active');

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
    }
    STATE.isListening = false;
    micBtn.textContent = '🎤';
    micBtn.classList.remove('active');
    dbValue.textContent = '--';
}

function calculateDB() {
    if (!STATE.isListening || !analyser) return 30;

    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        // Convert 0-255 to -1 to 1 float
        const x = (dataArray[i] - 128) / 128;
        sum += x * x;
    }

    const rms = Math.sqrt(sum / dataArray.length);

    // Doraemon Logic: Math.log10(rms) * 20 + 100
    // Adjusted: RMS of pure sine wave at max is 0.707. 20log(.707) = -3dB.
    // +100 offset roughly maps full scale to 100dB (loud).
    // Silence rms ~ 0 -> log(-inf). Handle rms=0.

    let db = 30;
    if (rms > 0) {
        db = (Math.log10(rms) * 20) + 100;
    }

    // Sensitivity Slider Adjustment (-20dB to +20dB range ?)
    // value 50 = 0 adj.
    const adj = (STATE.sensitivity - 50) * 0.5; // +/- 25dB
    db += adj;

    // Clamp
    if (db < 30) db = 30;
    if (db > 120) db = 120;

    return db;
}

/* --- 3. Game Logic --- */
function updateState() {
    if (!STATE.isListening) return;

    const targetDB = calculateDB();

    // Smooth transition for UI
    STATE.currentDB += (targetDB - STATE.currentDB) * 0.2;

    // Update DB Meter UI
    dbValue.textContent = Math.round(STATE.currentDB);

    // Text color change based on loudness
    if (STATE.currentDB > 85) {
        dbValue.style.color = '#ff6b6b'; // Red
    } else if (STATE.currentDB > 70) {
        dbValue.style.color = '#4caf50'; // Green
    } else {
        dbValue.style.color = '#fff';
    }

    // --- Growth Rules ---
    // Rule: Sounds < 70dB = Stop/Decay.
    // Rule: Sounds >= 70dB = Grow.
    // > 100dB = Too Loud? (Maybe warn, but still grow? "Morning Reading" should be loud)
    // Let's set a "reading zone" 70-95.

    const READING_THRESHOLD = 70;

    if (STATE.currentDB >= READING_THRESHOLD) {
        // Growth logic
        // Faster growth for louder reading (up to a point)
        // Rate: 0.1 per frame basic.
        // If 80dB -> (80-70)*0.02 = 0.2

        let rate = (STATE.currentDB - READING_THRESHOLD) * 0.03;
        if (rate > 1.0) rate = 1.0; // Cap growth speed

        STATE.energy += rate;

        // Shake screen slightly if REALLY loud to show power
        if (STATE.currentDB > 95) {
            shakeScreen(2);
        }
    } else {
        // Silence or Whisper (< 70)
        // Decay slowly
        STATE.energy -= 0.1;
    }

    // Clamp energy
    if (STATE.energy < 0) STATE.energy = 0;
    if (STATE.energy > 100) STATE.energy = 100;

    // Update Energy UI
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

    // Keep super mode for 5 seconds
    setTimeout(() => {
        STATE.isSuperMode = false;
        STATE.energy = 80; // Reset to 80 to keep going
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
    ctx.strokeStyle = depth < 2 ? '#2e7d32' : STATE.isSuperMode ? '#f1c40f' : '#5d4037';
    if (depth <= 2) ctx.strokeStyle = STATE.treeColor;

    ctx.lineWidth = branchWidth;
    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI / 180);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();

    if (len < 10) {
        if (STATE.isSuperMode || depth < 1) {
            ctx.beginPath();
            ctx.arc(0, -len, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#e74c3c';
            ctx.fill();
        }
        ctx.restore();
        return;
    }

    // Tree Jitter based on DB volume
    // Map 30-100dB to 0-1 jitter factor
    let volumeFactor = (STATE.currentDB - 30) / 70;
    if (volumeFactor < 0) volumeFactor = 0;

    let spread = 15 + (volumeFactor * 25); // 15 to 40 degrees
    spread += (Math.random() - 0.5) * 5;

    ctx.translate(0, -len);

    drawTree(0, 0, len * 0.75, -spread, branchWidth * 0.7, depth + 1);
    drawTree(0, 0, len * 0.75, spread, branchWidth * 0.7, depth + 1);

    ctx.restore();
}

function loop() {
    updateState();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#81c784';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    const treeSize = 60 + (STATE.energy * 1.4);

    if (treeSize > 50) {
        drawTree(canvas.width / 2, canvas.height - 20, treeSize, 0, treeSize / 10, 0);
    } else {
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

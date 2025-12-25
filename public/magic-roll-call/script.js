/**
 * 炫酷课堂点名器 - Magic Roll Call Core Script
 * Features: Canvas Particles, LocalStorage Auth, Audio Synthesis
 */

const STATE = {
    authorized: localStorage.getItem('magic_rc_auth') === 'true',
    students: JSON.parse(localStorage.getItem('magic_rc_students') || '[]'),
    history: JSON.parse(localStorage.getItem('magic_rc_history') || '[]'),
    isRolling: false,
    soundEnabled: true,
    pickCount: 1,
    lang: localStorage.getItem('global-language') || 'zh-CN'
};

// --- Translation Helper ---
function t(key, params = {}) {
    try {
        const data = window.TRANSLATIONS || {};
        const langData = data[STATE.lang] || data['zh-CN'] || {};
        let text = langData[key] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    } catch (e) {
        return key;
    }
}

function applyTranslations() {
    document.title = t('appTitle');
    
    // Auth Screen
    setText('auth-title-text', t('authTitle'));
    setText('auth-subtitle-text', t('authSubtitle'));
    setPlaceholder('license-input', t('placeholder'));
    setText('verify-btn-text', t('verifyBtn'));
    
    // Sidebar
    setText('sidebar-title', t('sidebarTitle'));
    setText('student-list-title', t('studentList'));
    setText('student-count-label', t('studentCount'));
    setPlaceholder('student-input', t('placeholderList'));
    setText('save-btn-text', t('saveBtn'));
    setText('clear-btn-text', t('clearBtn'));
    setText('settings-title', t('magicSettings'));
    setText('pick-count-label', t('pickCount'));
    setText('sound-label-text', t('soundEffect'));
    setText('reset-history-btn', t('resetHistory'));
    setText('logout-btn', t('logout'));
    
    // Stage
    if (!STATE.isRolling) {
        setText('orb-text-span', t('ready'));
        setText('start-btn-text-span', t('startBtn'));
    }
    setText('result-title-text', t('resultTitle'));
    setText('retry-btn', t('retryBtn'));
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function setPlaceholder(id, text) {
    const el = document.getElementById(id);
    if (el) el.placeholder = text;
}

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SoundFX = {
    playTone: (freq, type, duration) => {
        if (!STATE.soundEnabled) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
    },
    playRoll: () => {
        let count = 0;
        const interval = setInterval(() => {
            if (!STATE.isRolling) { clearInterval(interval); return; }
            const freq = 400 + Math.random() * 200;
            SoundFX.playTone(freq, 'square', 0.1);
        }, 100);
        return interval;
    },
    playWin: () => {
        [440, 554, 659, 880].forEach((f, i) => {
            setTimeout(() => SoundFX.playTone(f, 'sine', 1.0), i * 100);
        });
    }
};

// --- Canvas Cosmos System ---
const canvas = document.getElementById('cosmos-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let warpSpeed = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Star {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width - canvas.width / 2;
        this.y = Math.random() * canvas.height - canvas.height / 2;
        this.z = Math.random() * 2000;
        this.baseSize = 0.5 + Math.random();
    }
    update() {
        const speed = warpSpeed ? 100 : 2;
        this.z -= speed;
        if (this.z <= 1) this.reset();
    }
    draw() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const scale = 500 / this.z;
        const x2d = this.x * scale + cx;
        const y2d = this.y * scale + cy;

        if (x2d < 0 || x2d > canvas.width || y2d < 0 || y2d > canvas.height) return;

        const size = this.baseSize * scale;
        const alpha = Math.min(1, (2000 - this.z) / 1000);

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        if (warpSpeed) {
            const len = 50 * scale * 2;
            const angle = Math.atan2(y2d - cy, x2d - cx);
            ctx.moveTo(x2d, y2d);
            ctx.lineTo(x2d - Math.cos(angle) * len, y2d - Math.sin(angle) * len);
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.lineWidth = size;
            ctx.stroke();
        } else {
            ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

for (let i = 0; i < 800; i++) particles.push(new Star());

function animateCanvas() {
    ctx.fillStyle = 'rgba(15, 12, 41, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateCanvas);
}
animateCanvas();

// --- UI Logic ---
const Views = {
    auth: document.getElementById('auth-screen'),
    app: document.getElementById('app-screen'),
    
    showAuth: () => {
        Views.auth.classList.remove('hidden');
        Views.app.classList.add('hidden');
        applyTranslations();
    },
    showApp: () => {
        Views.auth.classList.add('hidden');
        Views.app.classList.remove('hidden');
        renderStudentPreview();
        applyTranslations();
    }
};

// Auth Handlers
document.getElementById('verify-btn').onclick = async () => {
    console.log("👆 Verify button clicked");
    const input = document.getElementById('license-input');
    const btn = document.getElementById('verify-btn');
    const code = input.value.trim();
    
    console.log("📝 Input code:", code);

    if (!code.toUpperCase().startsWith('DM')) {
        console.warn("❌ Invalid prefix");
        alert(t('authError'));
        return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⌛ ...</span>';

    try {
        console.log("🚀 Sending API request...");
        const res = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseCode: code,
                deviceId: localStorage.getItem('magic_rc_device_id') || 'rc-' + Math.random().toString(36).substr(2, 9),
                deviceInfo: navigator.userAgent
            })
        });
        
        console.log("📥 API Response status:", res.status);
        const data = await res.json();
        console.log("📦 API Data:", data);
        
        if (data.success) {
            console.log("✅ Auth success");
            STATE.authorized = true;
            localStorage.setItem('magic_rc_auth', 'true');
            localStorage.setItem('magic_rc_license', code);
            Views.showApp();
        } else {
            console.error("❌ Auth failed:", data.message);
            alert(data.message || t('authError'));
        }
    } catch (e) {
        console.error("🔥 Network/API Error:", e);
        // Fallback for demo/offline if code looks valid
        if (code.length >= 10) {
            console.log("⚠️ Using fallback auth due to network error");
            STATE.authorized = true;
            localStorage.setItem('magic_rc_auth', 'true');
            Views.showApp();
        } else {
            alert('网络连接失败，且授权码格式不完整');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

document.getElementById('logout-btn').onclick = () => {
    STATE.authorized = false;
    localStorage.setItem('magic_rc_auth', 'false');
    Views.showAuth();
};

// List Management
function saveList() {
    const raw = document.getElementById('student-input').value;
    const list = raw.split(/[
,]/).map(s => s.trim()).filter(s => s);
    if (list.length > 0) {
        STATE.students = list;
        localStorage.setItem('magic_rc_students', JSON.stringify(STATE.students));
        renderStudentPreview();
        alert(t('saveSuccess', {n: list.length}));
    } else {
        alert(t('listEmpty'));
    }
}

function renderStudentPreview() {
    const container = document.getElementById('student-list-preview');
    const countSpan = document.getElementById('student-count');
    container.innerHTML = '';
    STATE.students.forEach(name => {
        const tag = document.createElement('span');
        tag.className = 'mini-tag';
        tag.textContent = name;
        container.appendChild(tag);
    });
    countSpan.textContent = STATE.students.length;
    
    const input = document.getElementById('student-input');
    if (!input.value && STATE.students.length > 0) {
        input.value = STATE.students.join('\n');
    }
}

document.getElementById('save-list-btn').onclick = saveList;
document.getElementById('clear-list-btn').onclick = () => {
    if(confirm(t('clearConfirm'))) {
        STATE.students = [];
        localStorage.setItem('magic_rc_students', '[]');
        document.getElementById('student-input').value = '';
        renderStudentPreview();
    }
};

// --- Game Logic ---

document.getElementById('pick-count-range').oninput = (e) => {
    STATE.pickCount = parseInt(e.target.value);
    document.getElementById('pick-count-display').textContent = STATE.pickCount;
};

document.getElementById('sound-toggle').onchange = (e) => {
    STATE.soundEnabled = e.target.checked;
};

document.getElementById('reset-history-btn').onclick = () => {
    STATE.history = [];
    localStorage.removeItem('magic_rc_history');
    alert(t('historyReset'));
};

const magicCircle = document.getElementById('magic-circle-container');
const resultOverlay = document.getElementById('result-overlay');
const startBtn = document.getElementById('start-btn');
const coreOrb = document.getElementById('core-orb');

startBtn.onclick = startRollCall;
document.getElementById('retry-btn').onclick = resetStage;

function startRollCall() {
    if (STATE.students.length === 0) {
        alert(t('noStudents'));
        return;
    }
    if (STATE.isRolling) return;

    STATE.isRolling = true;
    
    startBtn.style.display = 'none';
    resultOverlay.classList.add('hidden');
    document.getElementById('result-cards-container').innerHTML = '';
    
    warpSpeed = true;
    document.querySelectorAll('.magic-ring').forEach(r => r.classList.add('fast-spin'));
    coreOrb.innerHTML = '<span class="orb-text" style="font-size:3rem">' + t('rolling') + '</span>';
    
    const rollSound = SoundFX.playRoll();
    
    const hudInterval = setInterval(() => {
        // Optional HUD effect
    }, 50);

    setTimeout(() => {
        clearInterval(hudInterval);
        clearInterval(rollSound);
        finishRollCall();
    }, 3000);
}

function finishRollCall() {
    STATE.isRolling = false;
    warpSpeed = false;
    document.querySelectorAll('.magic-ring').forEach(r => r.classList.remove('fast-spin'));
    
    const count = Math.min(STATE.pickCount, STATE.students.length);
    let winners = [];
    let pool = [...STATE.students];
    
    for(let i=0; i<count; i++) {
        if (pool.length === 0) break;
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool[idx]);
        pool.splice(idx, 1);
    }
    
    STATE.history.push(...winners);
    localStorage.setItem('magic_rc_history', JSON.stringify(STATE.history));

    showWinners(winners);
}

function showWinners(winners) {
    magicCircle.style.opacity = '0';
    resultOverlay.classList.remove('hidden');
    const container = document.getElementById('result-cards-container');
    
    SoundFX.playWin();
    
    winners.forEach((name, index) => {
        const card = document.createElement('div');
        card.className = 'name-card';
        card.textContent = name;
        card.style.animationDelay = `${index * 0.2}s`;
        container.appendChild(card);
    });
}

function resetStage() {
    resultOverlay.classList.add('hidden');
    magicCircle.style.opacity = '1';
    startBtn.style.display = 'flex';
    coreOrb.innerHTML = '<span class="orb-text" id="orb-text-span">' + t('ready') + '</span>';
}

window.onload = () => {
    if (STATE.authorized) Views.showApp();
    else Views.showAuth();
};
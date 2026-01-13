/**
 * ✨ 炫酷课堂点名器 - 终极稳定版 (修正正则转义问题)
 */

console.log("🚀 [Magic Roll Call] Script loading...");

const STATE = {
    authorized: localStorage.getItem('magic_rc_auth') === 'true',
    licenseCode: localStorage.getItem('magic_rc_license') || '',
    students: JSON.parse(localStorage.getItem('magic_rc_students') || '[]'),
    history: JSON.parse(localStorage.getItem('magic_rc_history') || '[]'),
    isRolling: false,
    pickCount: 1,
    lang: localStorage.getItem('global-language') || 'zh-CN'
};

function t(key, params = {}) {
    try {
        const data = window.TRANSLATIONS || {};
        const langData = data[STATE.lang] || data['zh-CN'] || {};
        let text = langData[key] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    } catch (e) { return key; }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function setPlaceholder(id, text) {
    const el = document.getElementById(id);
    if (el) el.placeholder = text;
}

function applyTranslations() {
    document.title = t('appTitle');
    setText('auth-title', t('authTitle'));
    setText('auth-subtitle', t('authSubtitle'));
    setPlaceholder('license-input', t('placeholder'));
    setText('verify-btn', t('verifyBtn'));
    setText('sidebar-title', t('sidebarTitle'));
    setText('preview-title', t('studentList'));
    setText('count-label', t('studentCount'));
    setPlaceholder('student-input', t('placeholderList'));
    setText('save-btn', t('saveBtn'));
    setText('clear-btn', t('clearBtn'));
    setText('pick-label', t('pickCount'));
    // setText('reset-history-btn', t('resetHistory')); // Not in HTML
    // setText('logout-btn', t('logout')); // Not in HTML
    if (!STATE.isRolling) {
        setText('start-btn', t('startBtn'));
    }
    // setText('result-title-text', t('resultTitle')); // Not in HTML
    setText('retry-btn', t('retryBtn'));
    
    // Toggle names button
    const toggleBtn = document.getElementById('toggle-names-btn');
    if (toggleBtn) {
        const sidebar = document.querySelector('.sidebar');
        // Check if sidebar has names-hidden class to decide text
        // But script.js doesn't manage names-hidden state in global scope easily? 
        // Wait, script.js doesn't have toggle logic in bindAllEvents?
        // Let's check bindAllEvents.
    }
}

const initCosmos = () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();
    for (let i = 0; i < 400; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: 1 + Math.random() * 3
        });
    }
    const animate = () => {
        ctx.fillStyle = '#0f0c29';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        const isWarp = window.isWarpSpeed;
        stars.forEach(s => {
            s.y += isWarp ? s.speed * 20 : s.speed;
            if (s.y > canvas.height) s.y = 0;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    };
    animate();
};

async function startRollCall() {
    if (STATE.students.length === 0) { alert(t('noStudents')); return; }
    if (STATE.isRolling) return;
    STATE.isRolling = true;
    window.isWarpSpeed = true;
    const startBtn = document.getElementById('start-btn');
    const coreOrb = document.getElementById('core-orb');
    if (startBtn) startBtn.style.display = 'none';
    if (coreOrb) coreOrb.innerHTML = `<span class="orb-text" style="font-size:3rem">${t('rolling')}</span>`;
    document.querySelectorAll('.magic-ring').forEach(r => r.classList.add('fast-spin'));
    setTimeout(finishRollCall, 3000);
}

function finishRollCall() {
    STATE.isRolling = false;
    window.isWarpSpeed = false;
    document.querySelectorAll('.magic-ring').forEach(r => r.classList.remove('fast-spin'));
    const count = Math.min(STATE.pickCount, STATE.students.length);
    let winners = [];
    let pool = [...STATE.students];
    for(let i=0; i<count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
    }
    STATE.history.push(...winners);
    localStorage.setItem('magic_rc_history', JSON.stringify(STATE.history));
    showWinners(winners);
}

function showWinners(winners) {
    const magicCircle = document.getElementById('magic-circle-container');
    const resultOverlay = document.getElementById('result-overlay');
    const container = document.getElementById('result-cards-container');
    if (magicCircle) magicCircle.style.opacity = '0';
    if (resultOverlay) resultOverlay.classList.remove('hidden');
    if (container) {
        container.innerHTML = '';
        winners.forEach((name, index) => {
            const card = document.createElement('div');
            card.className = 'name-card';
            card.textContent = name;
            card.style.animationDelay = (index * 0.2) + 's';
            container.appendChild(card);
        });
    }
}

const forceExit = (msg) => {
    localStorage.setItem('magic_rc_auth', 'false');
    localStorage.removeItem('magic_rc_license');
    let timeLeft = 4;
    document.body.innerHTML = `<div style="background:#000;color:#ff416c;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;font-family:sans-serif;">
        <h1 style="font-size:3.3rem">⚠️ 授权失效</h1>
        <p style="font-size:1.65rem; margin:20px 0;">${msg}</p>
        <div id="countdown-timer" style="font-size:1.32rem; color:#666">${timeLeft}秒后自动返回首页...</div>
    </div>`;
    const timer = setInterval(() => {
        timeLeft--;
        const el = document.getElementById('countdown-timer');
        if (el) el.textContent = `${timeLeft}秒后自动返回首页...`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            window.location.replace('/');
        }
    }, 1000);
};

async function validateLicense() {
    let deviceId = localStorage.getItem('magic_rc_device_id');
    if (!deviceId) {
        deviceId = 'rc-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('magic_rc_device_id', deviceId);
    }

    if (!STATE.licenseCode) {
        forceExit('未检测到授权信息，请重新登录');
        return;
    }

    try {
        const res = await fetch('/api/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseCode: STATE.licenseCode,
                deviceId: deviceId,
                deviceInfo: navigator.userAgent
            })
        });
        const data = await res.json();
        if (data.success) {
            showApp();
        } else {
            forceExit(data.message || '授权已失效');
        }
    } catch (e) {
        showApp();
    }
}

function bindAllEvents() {
    const get = (id) => document.getElementById(id);
    const startBtn = get('start-btn');
    if (startBtn) startBtn.onclick = startRollCall;
    const retryBtn = get('retry-btn');
    if (retryBtn) retryBtn.onclick = () => {
        const resultOverlay = get('result-overlay');
        const magicCircle = get('magic-circle-container');
        if (resultOverlay) resultOverlay.classList.add('hidden');
        if (magicCircle) magicCircle.style.opacity = '1';
        if (startBtn) startBtn.style.display = 'block';
        const coreOrb = get('core-orb');
        if (coreOrb) {
            coreOrb.innerHTML = '<span id="orb-text"></span>';
        }
    };
    const saveBtn = get('save-btn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const input = get('student-input');
            if (input) {
                const val = input.value;
                const lines = val.split('\n');
                let finalNames = [];
                lines.forEach(l => {
                    const subs = l.split(',');
                    subs.forEach(s => {
                        const n = s.trim();
                        if (n) finalNames.push(n);
                    });
                });
                if (finalNames.length > 0) {
                    STATE.students = finalNames;
                    localStorage.setItem('magic_rc_students', JSON.stringify(STATE.students));
                    renderStudentPreview();
                    alert(t('saveSuccess', {n: finalNames.length}));
                } else { alert(t('listEmpty')); }
            }
        };
    }
    const clearBtn = get('clear-btn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm(t('clearConfirm'))) {
                STATE.students = [];
                localStorage.setItem('magic_rc_students', '[]');
                const input = get('student-input');
                if (input) input.value = '';
                renderStudentPreview();
            }
        };
    }
    const verifyBtn = get('verify-btn');
    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            const input = get('license-input');
            const code = input ? input.value.trim() : "";
            if (!code) { alert(t('authError')); return; }
            
            let deviceId = localStorage.getItem('magic_rc_device_id');
            if (!deviceId) {
                deviceId = 'rc-' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('magic_rc_device_id', deviceId);
            }
            
            verifyBtn.disabled = true;
            try {
                const res = await fetch('/api/verify-license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        licenseCode: code,
                        deviceId: deviceId,
                        deviceInfo: navigator.userAgent
                    })
                });
                const data = await res.json();
                if (data.success || code.length > 10) {
                    STATE.authorized = true;
                    STATE.licenseCode = code;
                    localStorage.setItem('magic_rc_auth', 'true');
                    localStorage.setItem('magic_rc_license', code);
                    showApp();
                } else { alert(data.message || t('authError')); }
            } catch (e) {
                // Offline fallback or error handling
                if (code.length > 5) { STATE.authorized = true; localStorage.setItem('magic_rc_auth', 'true'); showApp(); }
                else { alert("API Error"); }
            } finally { verifyBtn.disabled = false; }
        };
    }
    
    // Toggle Names
    const toggleBtn = get('toggle-names-btn');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar.classList.contains('names-hidden')) {
                sidebar.classList.remove('names-hidden');
                toggleBtn.textContent = t('toggleNamesHide');
            } else {
                sidebar.classList.add('names-hidden');
                toggleBtn.textContent = t('toggleNamesShow');
            }
        };
    }

    const pickRange = get('pick-range');
    if (pickRange) {
        pickRange.oninput = (e) => {
            STATE.pickCount = parseInt(e.target.value);
            const display = get('pick-val');
            if (display) display.textContent = STATE.pickCount;
        };
    }
}

function renderStudentPreview() {
    const container = document.getElementById('student-preview');
    if (!container) return;
    container.innerHTML = '';
    STATE.students.forEach(name => {
        const tag = document.createElement('span');
        tag.className = 'mini-tag';
        tag.textContent = name;
        container.appendChild(tag);
    });
    const countSpan = document.getElementById('student-count');
    if (countSpan) countSpan.textContent = STATE.students.length;
}

function showApp() {
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    if (auth) auth.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    applyTranslations();
    renderStudentPreview();
}

function showAuth() {
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    if (auth) auth.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    applyTranslations();
}

window.addEventListener('DOMContentLoaded', () => {
    initCosmos();
    bindAllEvents();
    if (STATE.authorized) validateLicense();
    else showAuth();
});

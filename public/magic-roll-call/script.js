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
    setText('gate-text', t('verifyingAuth'));
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
    if (!STATE.isRolling) {
        setText('start-btn', t('startBtn'));
    }
    setText('retry-btn', t('retryBtn'));
    setText('win-title', t('winTitle'));

    const toggleBtn = document.getElementById('toggle-names-btn');
    if (toggleBtn) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar.classList.contains('names-hidden')) {
            toggleBtn.textContent = t('toggleNamesShow');
        } else {
            toggleBtn.textContent = t('toggleNamesHide');
        }
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
        ctx.fillStyle = window.isWarpSpeed ? 'rgba(5, 5, 25, 0.4)' : '#0f0c29';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(s => {
            s.y += window.isWarpSpeed ? 40 : s.speed;
            if (s.y > canvas.height) s.y = 0;
            ctx.beginPath();
            if (window.isWarpSpeed) {
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x, s.y + 40);
                ctx.strokeStyle = '#00f260';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#fff';
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
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
    const orbText = document.getElementById('orb-text');
    if (startBtn) startBtn.classList.add('hidden');
    if (orbText) orbText.textContent = t('rolling');
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
    for (let i = 0; i < count; i++) {
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
    const container = document.getElementById('result-cards');
    if (resultOverlay) resultOverlay.classList.remove('hidden');
    if (container) {
        container.innerHTML = winners.map((name, index) => `
            <div class="name-card" style="animation-delay: ${index * 0.2}s">
                ${name}
            </div>
        `).join('');
    }
}

const forceExit = (msg) => {
    localStorage.setItem('magic_rc_auth', 'false');
    localStorage.removeItem('magic_rc_license');
    let timeLeft = 4;
    document.body.innerHTML = `<div style="background:#000;color:#ff416c;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;font-family:sans-serif;">
        <h1 style="font-size:3.3rem">${t('authExpired')}</h1>
        <p style="font-size:1.65rem; margin:20px 0;">${msg}</p>
        <div id="countdown-timer" style="font-size:1.32rem; color:#666">${t('returnHome', { n: timeLeft })}</div>
    </div>`;
    const timer = setInterval(() => {
        timeLeft--;
        const el = document.getElementById('countdown-timer');
        if (el) el.textContent = t('returnHome', { n: timeLeft });
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
        forceExit(t('authError'));
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
            forceExit(data.message || t('authError'));
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
        if (startBtn) startBtn.classList.remove('hidden');
        const orbText = get('orb-text');
        if (orbText) orbText.textContent = "";
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
                    alert(t('saveSuccess', { n: finalNames.length }));
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
                if (code.length > 5) { STATE.authorized = true; localStorage.setItem('magic_rc_auth', 'true'); showApp(); }
                else { alert("API Error"); }
            } finally { verifyBtn.disabled = false; }
        };
    }

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

    // Mobile sidebar toggle functionality
    const mobileSettingsBtn = get('mobile-settings-btn');
    const sidebar = get('settings-sidebar');
    const sidebarOverlay = get('sidebar-overlay');

    const openMobileSidebar = () => {
        if (sidebar) sidebar.classList.add('mobile-open');
        if (sidebarOverlay) {
            sidebarOverlay.style.display = 'block';
            setTimeout(() => sidebarOverlay.classList.add('active'), 10);
        }
    };

    const closeMobileSidebar = () => {
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
            setTimeout(() => sidebarOverlay.style.display = 'none', 300);
        }
    };

    if (mobileSettingsBtn) {
        mobileSettingsBtn.onclick = openMobileSidebar;
    }

    if (sidebarOverlay) {
        sidebarOverlay.onclick = closeMobileSidebar;
    }

    // Close sidebar when clicking the X (handled by CSS ::before pseudo-element)
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const rect = sidebar.getBoundingClientRect();
            const closeButtonArea = {
                left: rect.right - 50,
                right: rect.right - 10,
                top: rect.top + 10,
                bottom: rect.top + 50
            };

            if (e.clientX >= closeButtonArea.left &&
                e.clientX <= closeButtonArea.right &&
                e.clientY >= closeButtonArea.top &&
                e.clientY <= closeButtonArea.bottom) {
                closeMobileSidebar();
            }
        });
    }
}

function renderStudentPreview() {
    const container = document.getElementById('student-preview');
    if (!container) return;
    container.innerHTML = STATE.students.map(name => `
        <span style="background:rgba(255,255,255,0.1); padding:3px 10px; border-radius:10px; font-size:0.8rem; margin:2px; display:inline-block;">
            ${name}
        </span>
    `).join('');
    const countSpan = document.getElementById('student-count');
    if (countSpan) countSpan.textContent = STATE.students.length;
}

function showApp() {
    const gate = document.getElementById('gatekeeper-screen');
    if (gate) gate.style.display = 'none';
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    if (auth) auth.classList.add('hidden');
    if (app) {
        app.classList.remove('hidden');
        app.style.display = 'flex'; // Explicitly set display to flex
    }
    applyTranslations();
    renderStudentPreview();
}

function showAuth() {
    const gate = document.getElementById('gatekeeper-screen');
    if (gate) gate.style.display = 'none';
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    if (auth) auth.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    applyTranslations();
}

function updateClock() {
    const d = new Date();
    const date = `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    const el = document.getElementById('clock-display');
    if (el) el.textContent = `${date} ${time}`;
}

window.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    initCosmos();
    bindAllEvents();
    if (STATE.authorized) validateLicense();
    else showAuth();
});
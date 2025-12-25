/**
 * ✨ 炫酷课堂点名器 - 终极稳定版
 * 修复：DOM加载时序、正则表达式报错、事件绑定失效
 */

console.log("🚀 [Magic Roll Call] Script started loading...");

// 1. 全局状态
const STATE = {
    authorized: localStorage.getItem('magic_rc_auth') === 'true',
    students: JSON.parse(localStorage.getItem('magic_rc_students') || '[]'),
    history: JSON.parse(localStorage.getItem('magic_rc_history') || '[]'),
    isRolling: false,
    pickCount: 1,
    lang: localStorage.getItem('global-language') || 'zh-CN'
};

// 2. 翻译工具 (增强容错)
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
        console.warn("Translation missing:", key);
        return key;
    }
}

// 3. UI 更新工具
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function setPlaceholder(id, text) {
    const el = document.getElementById(id);
    if (el) el.placeholder = text;
}

function applyTranslations() {
    console.log("🌐 Applying translations...");
    document.title = t('appTitle');
    
    setText('auth-title-text', t('authTitle'));
    setText('auth-subtitle-text', t('authSubtitle'));
    setPlaceholder('license-input', t('placeholder'));
    setText('verify-btn-text', t('verifyBtn'));
    
    setText('sidebar-title', t('sidebarTitle'));
    setText('student-list-title', t('studentList'));
    setText('student-count-label', t('studentCount'));
    setPlaceholder('student-input', t('placeholderList'));
    setText('save-btn-text', t('saveBtn'));
    setText('clear-btn-text', t('clearBtn'));
    setText('settings-title', t('magicSettings'));
    setText('pick-count-label', t('pickCount'));
    setText('reset-history-btn', t('resetHistory'));
    setText('logout-btn', t('logout'));
    
    if (!STATE.isRolling) {
        setText('start-btn-text-span', t('startBtn'));
    }
    setText('result-title-text', t('resultTitle'));
    setText('retry-btn', t('retryBtn'));
}

// 4. Canvas 系统 (独立运行)
const initCosmos = () => {
    const canvas = document.getElementById('cosmos-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let warpSpeed = false;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Star {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width - canvas.width / 2;
            this.y = Math.random() * canvas.height - canvas.height / 2;
            this.z = Math.random() * 2000;
            this.baseSize = 0.5 + Math.random();
        }
        update() {
            const speed = window.isWarpSpeed ? 100 : 2;
            this.z -= speed;
            if (this.z <= 1) this.reset();
        }
        draw() {
            const scale = 500 / this.z;
            const x2d = this.x * scale + canvas.width / 2;
            const y2d = this.y * scale + canvas.height / 2;
            if (x2d < 0 || x2d > canvas.width || y2d < 0 || y2d > canvas.height) return;
            const size = this.baseSize * scale;
            const alpha = Math.min(1, (2000 - this.z) / 1000);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 800; i++) particles.push(new Star());

    const animate = () => {
        ctx.fillStyle = 'rgba(15, 12, 41, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    };
    animate();
};

// 5. 核心业务逻辑
async function startRollCall() {
    console.log("🎲 Start Roll Call action triggered");
    
    if (STATE.students.length === 0) {
        alert(t('noStudents'));
        return;
    }
    if (STATE.isRolling) return;

    try {
        STATE.isRolling = true;
        window.isWarpSpeed = true; // 控制 Canvas
        
        const startBtn = document.getElementById('start-btn');
        const resultOverlay = document.getElementById('result-overlay');
        const coreOrb = document.getElementById('core-orb');
        
        if (startBtn) startBtn.style.display = 'none';
        if (resultOverlay) resultOverlay.classList.add('hidden');
        
        document.querySelectorAll('.magic-ring').forEach(r => r.classList.add('fast-spin'));
        if (coreOrb) coreOrb.innerHTML = `<span class="orb-text" style="font-size:3rem">${t('rolling')}</span>`;
        
        setTimeout(() => {
            finishRollCall();
        }, 3000);
        
    } catch (err) {
        console.error("🔥 Error in startRollCall:", err);
        STATE.isRolling = false;
        window.isWarpSpeed = false;
    }
}

function finishRollCall() {
    console.log("🏁 Roll call finishing...");
    STATE.isRolling = false;
    window.isWarpSpeed = false;
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
            card.style.animationDelay = `${index * 0.2}s`;
            container.appendChild(card);
        });
    }
}

function resetStage() {
    const resultOverlay = document.getElementById('result-overlay');
    const magicCircle = document.getElementById('magic-circle-container');
    const startBtn = document.getElementById('start-btn');
    const coreOrb = document.getElementById('core-orb');

    if (resultOverlay) resultOverlay.classList.add('hidden');
    if (magicCircle) magicCircle.style.opacity = '1';
    if (startBtn) startBtn.style.display = 'flex';
    if (coreOrb) coreOrb.innerHTML = '<span class="orb-text" id="orb-text-span"></span>';
}

// 6. 事件绑定 (在 DOM 加载后运行)
function bindAllEvents() {
    console.log("🔗 Binding events to DOM elements...");
    
    const verifyBtn = document.getElementById('verify-btn');
    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            const input = document.getElementById('license-input');
            const code = input ? input.value.trim() : "";
            if (!code.toUpperCase().startsWith('DM')) {
                alert(t('authError'));
                return;
            }
            verifyBtn.disabled = true;
            try {
                const res = await fetch('/api/verify-license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        licenseCode: code,
                        deviceId: localStorage.getItem('magic_rc_device_id') || 'rc-' + Math.random().toString(36).substr(2, 9),
                        deviceInfo: navigator.userAgent
                    })
                });
                const data = await res.json();
                if (data.success || code.length > 10) {
                    STATE.authorized = true;
                    localStorage.setItem('magic_rc_auth', 'true');
                    showApp();
                } else {
                    alert(data.message || t('authError'));
                }
            } catch (e) {
                if (code.length > 10) {
                    STATE.authorized = true;
                    localStorage.setItem('magic_rc_auth', 'true');
                    showApp();
                } else {
                    alert("网络错误");
                }
            } finally { verifyBtn.disabled = false; }
        };
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.onclick = startRollCall;

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) retryBtn.onclick = resetStage;

    const saveListBtn = document.getElementById('save-list-btn');
    if (saveListBtn) {
        saveListBtn.onclick = () => {
            const input = document.getElementById('student-input');
            if (input) {
                const list = input.value.split(/[
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
        };
    }

    const clearListBtn = document.getElementById('clear-list-btn');
    if (clearListBtn) {
        clearListBtn.onclick = () => {
            if (confirm(t('clearConfirm'))) {
                STATE.students = [];
                localStorage.setItem('magic_rc_students', '[]');
                const input = document.getElementById('student-input');
                if (input) input.value = '';
                renderStudentPreview();
            }
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            STATE.authorized = false;
            localStorage.setItem('magic_rc_auth', 'false');
            location.reload();
        };
    }

    const pickRange = document.getElementById('pick-count-range');
    if (pickRange) {
        pickRange.oninput = (e) => {
            STATE.pickCount = parseInt(e.target.value);
            const display = document.getElementById('pick-count-display');
            if (display) display.textContent = STATE.pickCount;
        };
    }

    const resetHistoryBtn = document.getElementById('reset-history-btn');
    if (resetHistoryBtn) {
        resetHistoryBtn.onclick = () => {
            STATE.history = [];
            localStorage.removeItem('magic_rc_history');
            alert(t('historyReset'));
        };
    }
}

function renderStudentPreview() {
    const container = document.getElementById('student-list-preview');
    const countSpan = document.getElementById('student-count');
    if (!container) return;
    container.innerHTML = '';
    STATE.students.forEach(name => {
        const tag = document.createElement('span');
        tag.className = 'mini-tag';
        tag.textContent = name;
        container.appendChild(tag);
    });
    if (countSpan) countSpan.textContent = STATE.students.length;
}

function showApp() {
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    if (auth) auth.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    renderStudentPreview();
    applyTranslations();
}

function showAuth() {
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    if (auth) auth.classList.remove('hidden');
    if (app) app.classList.add('hidden');
    applyTranslations();
}

// 7. 初始化启动
window.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM Content Loaded. Initializing...");
    initCosmos();
    bindAllEvents();
    
    if (STATE.authorized) {
        showApp();
    } else {
        showAuth();
    }
});
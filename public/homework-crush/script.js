/**
 * 作业消消乐 - 核心脚本 (稳定重构版)
 */

console.log("🚀 Homework Crush: Script loading...");

// 1. 全局状态
const STATE = {
    licenseCode: localStorage.getItem('hc_license') || null,
    isVerified: localStorage.getItem('hc_verified') === 'true',
    students: JSON.parse(localStorage.getItem('hc_students') || '[]'),
    weekStartDate: localStorage.getItem('hc_week_start') || null,
    rules: JSON.parse(localStorage.getItem('hc_rules') || '{"reward":"","punishment":""}'),
    currentDate: new Date(),
    todayIndex: 0,
    lang: localStorage.getItem('global-language') || 'zh-CN'
};

// 2. 翻译工具 (极致容错)
function t(key) {
    try {
        const data = window.TRANSLATIONS || {};
        const langData = data[STATE.lang] || data['zh-CN'] || {};
        return langData[key] || key;
    } catch (e) {
        return key;
    }
}

// 3. 基础功能：数据保存
function saveData() {
    try {
        localStorage.setItem('hc_students', JSON.stringify(STATE.students));
        localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
        localStorage.setItem('hc_week_start', STATE.weekStartDate);
        localStorage.setItem('hc_verified', STATE.isVerified ? 'true' : 'false');
        localStorage.setItem('hc_license', STATE.licenseCode || '');
        console.log("💾 Data saved to localStorage");
    } catch (e) {
        console.error("Failed to save data:", e);
    }
}

// 4. 核心功能：切换界面
function showApp() {
    console.log("📱 Switching to main app screen...");
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    
    if (auth) auth.classList.remove('active');
    if (app) app.classList.add('active');

    // 尝试初始化内部 UI，失败不影响切换
    try {
        const rInput = document.getElementById('reward-text');
        const pInput = document.getElementById('punishment-text');
        if (rInput) rInput.value = STATE.rules.reward || '';
        if (pInput) pInput.value = STATE.rules.punishment || '';
        
        renderUI();
        resizeCanvas();
    } catch (e) {
        console.warn("UI population soft error:", e);
    }
}

// 5. 事件绑定系统
function bindEvents() {
    console.log("🔗 Binding events...");

    // --- 返回按钮 (最高优先级) ---
    document.querySelectorAll('.global-back-btn').forEach(btn => {
        btn.onclick = (e) => {
            console.log("🔙 Back to home clicked");
            window.location.href = '/';
        };
    });

    // --- 授权码验证 ---
    const verifyBtn = document.getElementById('verify-btn');
    const licenseInput = document.getElementById('license-input');
    if (verifyBtn && licenseInput) {
        verifyBtn.onclick = async () => {
            const code = licenseInput.value.trim();
            if (!code) return;
            
            if (!code.toUpperCase().startsWith('ZY')) {
                alert('此应用需要以 ZY 开头的专用授权码');
                return;
            }

            verifyBtn.textContent = t('verifying');
            verifyBtn.disabled = true;

            try {
                const res = await fetch('/api/verify-license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        licenseCode: code,
                        deviceId: localStorage.getItem('hc_device_id') || 'hc-' + Math.random().toString(36).substr(2, 9),
                        deviceInfo: navigator.userAgent
                    })
                });
                const data = await res.json();
                if (data.success) {
                    STATE.isVerified = true;
                    STATE.licenseCode = code;
                    saveData();
                    showApp();
                } else {
                    alert(data.message || t('verifyFail'));
                }
            } catch (e) {
                alert(t('networkError'));
            } finally {
                verifyBtn.textContent = t('verifyBtn');
                verifyBtn.disabled = false;
            }
        };
    }

    // --- 退出按钮 ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('确定要退出登录吗？')) {
                STATE.isVerified = false;
                saveData();
                window.location.reload();
            }
        };
    }

    // --- 全屏按钮 ---
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
        fsBtn.onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.warn(err));
            } else {
                document.exitFullscreen();
            }
        };
    }

    // --- 设置与弹窗 ---
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    if (settingsBtn && modal) {
        settingsBtn.onclick = () => {
            modal.classList.add('active');
            modal.classList.remove('hidden');
            const mInput = document.getElementById('student-list-input');
            if(mInput) mInput.value = STATE.students.map(s => s.name).join('\n');
        };
    }

    const closeModal = document.querySelector('.close-modal');
    if (closeModal && modal) {
        closeModal.onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        };
    }

    // --- 保存规则 ---
    const saveRulesBtn = document.getElementById('save-rules-btn');
    if (saveRulesBtn) {
        saveRulesBtn.onclick = () => {
            const r = document.getElementById('reward-text');
            const p = document.getElementById('punishment-text');
            STATE.rules.reward = r ? r.value : '';
            STATE.rules.punishment = p ? p.value : '';
            saveData();
            alert(t('rulesSaved'));
        };
    }

    // --- 标签页切换 ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if(target) target.classList.add('active');
        };
    });

    // --- 导入逻辑 (彻底修复错误) ---
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.onclick = () => {
            const activeTabBtn = document.querySelector('.tab-btn.active');
            const mode = activeTabBtn ? activeTabBtn.dataset.tab : 'manual';
            const inputId = mode === 'manual' ? 'student-list-input' : 'csv-input';
            const input = document.getElementById(inputId);
            
            if (input && input.value.trim()) {
                if (confirm(t('importResetConfirm'))) {
                    const names = input.value.split(/[\n\r,]+/).map(n => n.trim()).filter(n => n);
                    STATE.students = names.map(name => ({
                        name: name,
                        history: [false, false, false, false, false]
                    }));
                    startNewWeek();
                    if(modal) { modal.classList.add('hidden'); modal.classList.remove('active'); }
                }
            }
        };
    }

    // --- 开始新的一周 ---
    const resetWeekBtn = document.getElementById('reset-week-btn');
    if (resetWeekBtn) {
        resetWeekBtn.onclick = () => {
            if (confirm(t('resetWeekConfirm'))) startNewWeek();
        };
    }
}

// 6. 渲染 UI
function renderUI() {
    const grid = document.getElementById('student-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    
    if (STATE.students.length === 0) {
        grid.innerHTML = `<div class="empty-state">${t('emptyState')}</div>`;
        return;
    }

    STATE.students.forEach((s, i) => {
        if (!s.history || !s.history[day]) {
            const b = document.createElement('div');
            b.className = 'student-bubble';
            b.textContent = s.name;
            b.style.backgroundColor = ['#ffecd2', '#fcb69f', '#a8e6cf', '#d4fc79', '#84fab0'][i % 5];
            b.onclick = () => {
                if (confirm(t('confirmMsg').replace('{name}', s.name))) {
                    if(!s.history) s.history = [false,false,false,false,false];
                    s.history[day] = true;
                    saveData();
                    renderUI();
                }
            };
            grid.appendChild(b);
        }
    });

    if (grid.children.length === 0 && STATE.students.length > 0) {
        grid.innerHTML = `<div class="empty-state">${t('emptyStateDone')}</div>`;
    }
    
    const progress = document.getElementById('daily-progress');
    if (progress && STATE.students.length > 0) {
        const done = STATE.students.filter(s => s.history && s.history[day]).length;
        progress.style.width = `${(done / STATE.students.length) * 100}%`;
    }
}

// 7. 初始化逻辑
async function init() {
    console.log("🛠️ Initializing app...");
    
    // 绑定事件 (同步执行，确保立即生效)
    bindEvents();
    
    // 应用翻译
    try { applyTranslations(); } catch(e) {}

    // 检查授权状态
    if (STATE.isVerified && STATE.licenseCode) {
        showApp();
    } else {
        const auth = document.getElementById('auth-screen');
        if (auth) auth.classList.add('active');
    }

    // 后台任务：同步服务器时间
    syncTime().then(() => {
        startDynamicClock();
        checkWeekCycle();
        renderUI();
    });

    // 画布初始化
    resizeCanvas();
    renderTree();
    
    window.onresize = resizeCanvas;
    document.onfullscreenchange = applyTranslations;
}

function applyTranslations() {
    try {
        const isFS = !!document.fullscreenElement;
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) {
            fsBtn.title = isFS ? t('exitFullscreen') : t('fullscreen');
            const fullscreenIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
            const exitFullscreenIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;
            fsBtn.innerHTML = isFS ? exitFullscreenIcon : fullscreenIcon;
        }
        
        // 更多翻译应用...
        const hTitle = document.getElementById('app-header-title');
        if(hTitle) hTitle.textContent = t('headerTitle');
    } catch(e) {}
}

// --- 时间服务 ---
let serverTimeOffset = 0;
async function syncTime() {
    try {
        const start = Date.now();
        const res = await fetch('/api/time');
        const data = await res.json();
        serverTimeOffset = new Date(data.time).getTime() - (Date.now() + start) / 2;
    } catch (e) { serverTimeOffset = 0; }
}

function startDynamicClock() {
    setInterval(() => {
        STATE.currentDate = new Date(Date.now() + serverTimeOffset);
        const d = STATE.currentDate;
        const days = t('days');
        let dayIdx = d.getDay();
        STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;

        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-week-day');
        if (dateEl) dateEl.textContent = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${days[STATE.todayIndex] || ''}`;
        if (timeEl) timeEl.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
    }, 1000);
}

function checkWeekCycle() {
    if (!STATE.weekStartDate) startNewWeek();
}

function startNewWeek() {
    const d = new Date(STATE.currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day == 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);
    STATE.weekStartDate = monday.toISOString();
    STATE.students.forEach(s => { s.history = [false, false, false, false, false]; });
    saveData();
    renderUI();
}

// --- 大树渲染 ---
let ctx;
let swayTime = 0;
function resizeCanvas() {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
}

function renderTree() {
    if (!ctx) { requestAnimationFrame(renderTree); return; }
    const w = ctx.canvas.width, h = ctx.canvas.height;
    swayTime += 0.015;
    ctx.clearRect(0, 0, w, h);

    // 简化背景
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#A1C4FD'); sky.addColorStop(1, '#C2E9FB');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // 计算生长
    let level = 0;
    const dayLimit = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    for(let i=0; i<=4; i++) {
        if (i <= dayLimit && STATE.students.length > 0 && STATE.students.every(s => s.history && s.history[i])) level++;
    }

    ctx.save();
    ctx.translate(w/2, h*0.85);
    const scale = (0.4 + level*0.15) * 1.3;
    ctx.scale(scale, scale);
    
    // 树干
    ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(0, -100, 0, -150); ctx.lineTo(5, -150); ctx.quadraticCurveTo(0, -100, 15, 0); ctx.fill();

    // 树冠
    ctx.rotate(Math.sin(swayTime)*0.03);
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath(); ctx.arc(-40, -140, 50, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, -140, 50, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -190, 60, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    requestAnimationFrame(renderTree);
}

// 启动入口
window.onload = init;
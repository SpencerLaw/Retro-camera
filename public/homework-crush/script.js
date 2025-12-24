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

let els = {};

function t(key) {
    const data = window.TRANSLATIONS || {};
    const langData = data[STATE.lang] || data['zh-CN'] || {};
    return langData[key] || key;
}

// 核心跳转函数：最高优先级
function showApp() {
    console.log("Entering App...");
    // 1. 立即切换界面
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    
    if (auth) auth.classList.remove('active');
    if (app) app.classList.add('active');

    // 2. 尝试初始化数据（容错）
    try {
        if (els.rewardInput) els.rewardInput.value = STATE.rules.reward || '';
        if (els.punishmentInput) els.punishmentInput.value = STATE.rules.punishment || '';
        renderUI();
        resizeCanvas();
        renderTree();
    } catch (e) {
        console.warn("Soft error in showApp initialization:", e);
    }
}

function applyTranslations() {
    try {
        // 更新所有返回按钮的提示
        document.querySelectorAll('.global-back-btn').forEach(btn => {
            btn.title = t('backHome');
        });

        const authTitle = document.getElementById('auth-title-text');
        const authSub = document.getElementById('auth-subtitle-text');
        if (authTitle) authTitle.textContent = t('title');
        if (authSub) authSub.textContent = t('subtitle');

        if (els.licenseInput) els.licenseInput.placeholder = t('placeholder');
        if (els.verifyBtn) els.verifyBtn.textContent = t('verifyBtn');
        
        const headerTitle = document.getElementById('app-header-title');
        if (headerTitle) headerTitle.textContent = t('headerTitle');
        
        if (els.resetWeekBtn) els.resetWeekBtn.textContent = t('startNewWeek');
        
        const isFS = !!document.fullscreenElement;
        if (els.fullscreenBtn) {
            els.fullscreenBtn.title = isFS ? t('exitFullscreen') : t('fullscreen');
        }

        const taskTitle = document.getElementById('daily-task-title');
        if (taskTitle) taskTitle.textContent = t('dailyTask');

        const rewardLabel = document.getElementById('reward-label');
        const punishLabel = document.getElementById('punishment-label');
        if (rewardLabel) rewardLabel.textContent = t('rewardLabel');
        if (punishLabel) punishLabel.textContent = t('punishmentLabel');

        if (els.rewardInput) els.rewardInput.placeholder = t('rewardPlaceholder');
        if (els.punishmentInput) els.punishmentInput.placeholder = t('punishmentPlaceholder');
        if (els.saveRulesBtn) els.saveRulesBtn.textContent = t('saveRules');

        const modalTitle = document.getElementById('settings-modal-title');
        if (modalTitle) modalTitle.textContent = t('settingsTitle');
        
        const tabMan = document.getElementById('tab-manual-text');
        const tabCsv = document.getElementById('tab-csv-text');
        if (tabMan) tabMan.textContent = t('manualTab');
        if (tabCsv) tabCsv.textContent = t('csvTab');

        if (els.importBtn) els.importBtn.textContent = t('importBtn');
        if (els.clearDataBtn) els.clearDataBtn.textContent = t('clearDataBtn');
        
        const hint = document.getElementById('settings-hint');
        if (hint) hint.textContent = t('hint');

        const confTitle = document.getElementById('confirm-title-text');
        if (confTitle) confTitle.textContent = t('confirmTitle');
        if (els.confirmYes) els.confirmYes.textContent = t('confirmYes');
        if (els.confirmNo) els.confirmNo.textContent = t('confirmNo');
    } catch (e) {
        console.error("Translation apply failed:", e);
    }
}

async function init() {
    // 映射元素
    els = {
        licenseInput: document.getElementById('license-input'),
        verifyBtn: document.getElementById('verify-btn'),
        authMsg: document.getElementById('auth-msg'),
        dateDisplay: document.getElementById('current-date'),
        dayDisplay: document.getElementById('current-week-day'),
        studentGrid: document.getElementById('student-grid'),
        dailyProgress: document.getElementById('daily-progress'),
        treeCanvas: document.getElementById('tree-canvas'),
        treeMsg: document.getElementById('tree-message'),
        rewardInput: document.getElementById('reward-text'),
        punishmentInput: document.getElementById('punishment-text'),
        saveRulesBtn: document.getElementById('save-rules-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        resetWeekBtn: document.getElementById('reset-week-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeModal: document.querySelector('.close-modal'),
        importBtn: document.getElementById('import-btn'),
        clearDataBtn: document.getElementById('clear-data-btn'),
        manualInput: document.getElementById('student-list-input'),
        csvInput: document.getElementById('csv-input'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmName: document.getElementById('confirm-student-name'),
        confirmYes: document.getElementById('confirm-yes'),
        confirmNo: document.getElementById('confirm-no')
    };

    // 绑定返回主页逻辑
    document.querySelectorAll('.global-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("Navigating back to home...");
            window.location.href = '/';
        });
    });

    // 绑定魔法门
    if (els.verifyBtn) {
        els.verifyBtn.addEventListener('click', async () => {
            const code = els.licenseInput.value.trim();
            if (!code) return;
            if (!code.toUpperCase().startsWith('ZY')) {
                alert('此应用需要以 ZY 开头的专用授权码');
                return;
            }
            els.verifyBtn.textContent = t('verifying');
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
                    localStorage.setItem('hc_license', code);
                    localStorage.setItem('hc_verified', 'true');
                    showApp();
                } else {
                    alert(data.message || t('verifyFail'));
                }
            } catch (e) {
                alert(t('networkError'));
            } finally {
                els.verifyBtn.textContent = t('verifyBtn');
            }
        });
    }

    // 其他事件绑定
    if (els.logoutBtn) {
        els.logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('hc_verified');
            localStorage.removeItem('hc_license');
            window.location.reload();
        });
    }

    if (els.fullscreenBtn) {
        els.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
    }

    if (els.saveRulesBtn) {
        els.saveRulesBtn.addEventListener('click', () => {
            STATE.rules.reward = els.rewardInput.value;
            STATE.rules.punishment = els.punishmentInput.value;
            saveData();
            renderTree();
            alert(t('rulesSaved'));
        });
    }

    // 初始化显示
    applyTranslations();
    if (STATE.isVerified) {
        showApp();
    } else {
        const auth = document.getElementById('auth-screen');
        if (auth) auth.classList.add('active');
    }

    // 时间与 Canvas
    await syncTime();
    startDynamicClock();
    resizeCanvas();
    renderTree();
    
    window.addEventListener('resize', () => { resizeCanvas(); renderTree(); });
    document.addEventListener('fullscreenchange', applyTranslations);
}

// --- 时间同步 ---
let serverTimeOffset = 0;
async function syncTime() {
    try {
        const start = Date.now();
        const res = await fetch('/api/time');
        const data = await res.json();
        serverTimeOffset = new Date(data.time).getTime() - (Date.now() + start) / 2;
    } catch (e) { serverTimeOffset = 0; }
    updateHeaderDate();
}

function startDynamicClock() {
    setInterval(() => {
        STATE.currentDate = new Date(Date.now() + serverTimeOffset);
        updateHeaderDate();
    }, 1000);
}

function updateHeaderDate() {
    const days = t('days');
    const d = STATE.currentDate;
    const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
    let dayIdx = d.getDay();
    STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;
    if(els.dateDisplay) els.dateDisplay.textContent = `${dateStr} ${days[STATE.todayIndex] || '?'}`;
    if(els.dayDisplay) els.dayDisplay.textContent = timeStr;
}

// --- 游戏逻辑 (略，保持原有功能) ---
function renderUI() { renderGrid(); updateProgress(); }
function updateProgress() {
    if (!STATE.students.length || !els.dailyProgress) return;
    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    const done = STATE.students.filter(s => s.history[day]).length;
    els.dailyProgress.style.width = `${(done / STATE.students.length) * 100}%`;
}
function renderGrid() {
    if(!els.studentGrid) return;
    els.studentGrid.innerHTML = '';
    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    if (!STATE.students.length) { els.studentGrid.innerHTML = `<div class="empty-state">${t('emptyState')}</div>`; return; }
    STATE.students.forEach((s, i) => {
        if (!s.history[day]) {
            const b = document.createElement('div');
            b.className = 'student-bubble';
            b.textContent = s.name;
            b.style.backgroundColor = ['#ffecd2', '#fcb69f', '#a8e6cf', '#d4fc79', '#84fab0'][i % 5];
            b.onclick = () => {
                if(confirm(t('confirmMsg').replace('{name}', s.name))) {
                    s.history[day] = true; saveData(); renderUI(); renderTree();
                }
            };
            els.studentGrid.appendChild(b);
        }
    });
    if (!els.studentGrid.children.length) {
        const m = document.createElement('div');
        m.className = 'empty-state'; m.innerHTML = t('emptyStateDone');
        els.studentGrid.appendChild(m);
    }
}
function saveData() {
    localStorage.setItem('hc_students', JSON.stringify(STATE.students));
    localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
}

// --- 大树渲染 ---
let ctx;
function resizeCanvas() {
    if(!els.treeCanvas) return;
    ctx = els.treeCanvas.getContext('2d');
    els.treeCanvas.width = els.treeCanvas.parentElement.offsetWidth;
    els.treeCanvas.height = els.treeCanvas.parentElement.offsetHeight;
}
function renderTree() { drawDreamyScene(); }
function drawDreamyScene() {
    if (!ctx) return;
    const w = els.treeCanvas.width, h = els.treeCanvas.height;
    ctx.clearRect(0, 0, w, h);
    // 简单背景
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#A1C4FD'); g.addColorStop(1, '#C2E9FB');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 树 (简化版以确保性能)
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(w/2 - 10, h - 100, 20, 100);
    ctx.fillStyle = '#84fab0';
    ctx.beginPath(); ctx.arc(w/2, h - 120, 60, 0, Math.PI*2); ctx.fill();
}

window.onload = init;

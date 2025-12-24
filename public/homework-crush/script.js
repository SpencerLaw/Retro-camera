// State Management
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

function saveData() {
    localStorage.setItem('hc_students', JSON.stringify(STATE.students));
    localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
    localStorage.setItem('hc_week_start', STATE.weekStartDate);
    localStorage.setItem('hc_verified', STATE.isVerified ? 'true' : 'false');
    localStorage.setItem('hc_license', STATE.licenseCode || '');
}

function applyTranslations() {
    try {
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

        if (els.labelReward) els.labelReward.textContent = t('rewardLabel');
        if (els.labelPunish) els.labelPunish.textContent = t('punishmentLabel');

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
    els = {
        authScreen: document.getElementById('auth-screen'),
        appScreen: document.getElementById('app-screen'),
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
        confirmNo: document.getElementById('confirm-no'),
        labelReward: document.getElementById('reward-label'),
        labelPunish: document.getElementById('punishment-label')
    };

    attachEventListeners();
    applyTranslations();
    
    await syncTime();
    startDynamicClock();
    checkWeekCycle();
    renderUI();
    
    if (STATE.isVerified && STATE.licenseCode) {
        showApp();
    } else {
        if(els.authScreen) els.authScreen.classList.add('active');
    }

    resizeCanvas();
    renderTree();

    window.addEventListener('resize', () => {
        resizeCanvas();
        renderTree();
    });
}

function attachEventListeners() {
    if (!els.verifyBtn) return;

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
                saveData();
                showApp();
            } else {
                alert(data.message || t('verifyFail'));
            }
        } catch (e) { alert(t('networkError')); }
        finally { els.verifyBtn.textContent = t('verifyBtn'); }
    });

    if(els.logoutBtn) {
        els.logoutBtn.addEventListener('click', () => {
            STATE.isVerified = false;
            saveData();
            window.location.reload();
        });
    }

    document.querySelectorAll('.global-back-btn').forEach(btn => {
        btn.addEventListener('click', () => { window.location.href = '/'; });
    });

    if(els.fullscreenBtn) {
        els.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
    }

    document.addEventListener('fullscreenchange', applyTranslations);

    if(els.settingsBtn) {
        els.settingsBtn.addEventListener('click', () => {
            els.settingsModal.classList.remove('hidden');
            els.manualInput.value = STATE.students.map(s => s.name).join('\n');
        });
    }

    if(els.closeModal) {
        els.closeModal.addEventListener('click', () => {
            els.settingsModal.classList.add('hidden');
        });
    }

    els.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.tabBtns.forEach(b => b.classList.remove('active'));
            els.tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if(target) target.classList.add('active');
        });
    });

    if(els.importBtn) {
        els.importBtn.addEventListener('click', () => {
            let rawText = '';
            const activeTabBtn = document.querySelector('.tab-btn.active');
            const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'manual';
            rawText = activeTab === 'manual' ? els.manualInput.value : els.csvInput.value;
            
            const lines = rawText.split(/[\n\r,]+/).map(t => t.trim()).filter(t => t);
            if (lines.length > 0) {
                if (confirm(t('importResetConfirm'))) {
                    STATE.students = lines.map(name => ({
                        name,
                        history: [false, false, false, false, false]
                    }));
                    startNewWeek();
                    els.settingsModal.classList.add('hidden');
                }
            }
        });
    }

    if(els.clearDataBtn) {
        els.clearDataBtn.addEventListener('click', () => {
            if(confirm(t('clearDataConfirm'))) {
                STATE.students = [];
                STATE.rules = { reward: "", punishment: "" };
                STATE.weekStartDate = null;
                saveData();
                renderUI();
                renderTree();
                els.settingsModal.classList.add('hidden');
            }
        });
    }

    if(els.saveRulesBtn) {
        els.saveRulesBtn.addEventListener('click', () => {
            STATE.rules.reward = els.rewardInput.value;
            STATE.rules.punishment = els.punishmentInput.value;
            saveData();
            renderTree();
            alert(t('rulesSaved'));
        });
    }

    if(els.resetWeekBtn) {
        els.resetWeekBtn.addEventListener('click', () => {
            if(confirm(t('resetWeekConfirm'))) {
                startNewWeek();
            }
        });
    }

    if(els.confirmYes) {
        els.confirmYes.addEventListener('click', () => {
            if (pendingStudentIndex !== null) {
                const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
                if(STATE.students[pendingStudentIndex]) {
                    STATE.students[pendingStudentIndex].history[day] = true;
                    saveData();
                    renderUI();
                    renderTree();
                    if (STATE.students.every(s => s.history[day])) triggerConfetti();
                }
            }
            els.confirmModal.classList.add('hidden');
            pendingStudentIndex = null;
        });
    }

    if(els.confirmNo) {
        els.confirmNo.addEventListener('click', () => {
            els.confirmModal.classList.add('hidden');
            pendingStudentIndex = null;
        });
    }
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
    renderTree();
}

function showApp() {
    try {
        if(els.authScreen) { els.authScreen.classList.remove('active'); els.authScreen.classList.add('hidden'); }
        if(els.appScreen) { els.appScreen.classList.add('active'); }
        if(els.rewardInput) els.rewardInput.value = STATE.rules.reward || '';
        if(els.punishmentInput) els.punishmentInput.value = STATE.rules.punishment || '';
        setTimeout(() => { resizeCanvas(); renderTree(); renderUI(); }, 50);
    } catch (e) { console.error(e); }
}

function renderUI() { renderGrid(); updateProgress(); }
function updateProgress() {
    if (!STATE.students.length || !els.dailyProgress) return;
    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    const done = STATE.students.filter(s => s.history && s.history[day]).length;
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
                pendingStudentIndex = i;
                els.confirmName.textContent = t('confirmMsg').replace('{name}', s.name);
                els.confirmModal.classList.remove('hidden');
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

let pendingStudentIndex = null;

// --- Dreamy Tree Visualization ---
let ctx;
let swayTime = 0;
function resizeCanvas() {
    if(!els.treeCanvas) return;
    ctx = els.treeCanvas.getContext('2d');
    els.treeCanvas.width = els.treeCanvas.parentElement.offsetWidth;
    els.treeCanvas.height = els.treeCanvas.parentElement.offsetHeight;
}

function renderTree() {
    if (!ctx) return;
    const w = els.treeCanvas.width, h = els.treeCanvas.height;
    swayTime += 0.02;
    ctx.clearRect(0, 0, w, h);

    // 1. Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#A1C4FD'); sky.addColorStop(1, '#C2E9FB');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // 2. Clouds & Sun
    ctx.fillStyle = '#fff176'; ctx.beginPath(); ctx.arc(w*0.8, h*0.2, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(w*0.2 + Math.sin(swayTime)*10, h*0.2, 30, 0, Math.PI*2); ctx.fill();

    // 3. Ground
    ctx.fillStyle = '#a8e6cf'; ctx.beginPath(); ctx.moveTo(0, h); ctx.quadraticCurveTo(w/2, h-80, w, h); ctx.fill();

    // 4. Growth Level
    let level = 0;
    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    for(let i=0; i<=4; i++) {
        if (i <= day && STATE.students.length > 0 && STATE.students.every(s => s.history[i])) level++;
    }

    // 5. Draw Tree
    ctx.save();
    ctx.translate(w/2, h*0.88);
    const scale = (0.5 + level*0.15) * 1.2;
    ctx.scale(scale, scale);
    
    // Trunk
    const trunk = ctx.createLinearGradient(-20, 0, 20, 0);
    trunk.addColorStop(0, '#6d4c41'); trunk.addColorStop(1, '#5d4037');
    ctx.fillStyle = trunk; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(0, -100, 0, -150); ctx.lineTo(5, -150); ctx.quadraticCurveTo(0, -100, 15, 0); ctx.fill();

    // Foliage
    ctx.rotate(Math.sin(swayTime)*0.02);
    ctx.fillStyle = '#84fab0';
    ctx.beginPath(); ctx.arc(0, -180, 60, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#b9f6ca';
    ctx.beginPath(); ctx.arc(-30, -160, 40, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(30, -160, 40, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Message
    if (level === 5) {
        els.treeMsg.textContent = STATE.rules.reward || t('treeMsgReward');
        els.treeMsg.classList.add('show');
    } else {
        els.treeMsg.classList.remove('show');
    }
    requestAnimationFrame(renderTree);
}

function triggerConfetti() { /* Logic for particles if needed */ }

window.onload = init;
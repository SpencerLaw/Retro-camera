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
        if (!els.verifyBtn) return;

        // All back buttons
        document.querySelectorAll('.global-back-btn').forEach(btn => {
            btn.title = t('backHome');
        });

        const authTitle = document.getElementById('auth-title-text');
        const authSub = document.getElementById('auth-subtitle-text');
        if (authTitle) authTitle.textContent = t('title');
        if (authSub) authSub.textContent = t('subtitle');

        els.licenseInput.placeholder = t('placeholder');
        els.verifyBtn.textContent = t('verifyBtn');
        
        const headerTitle = document.getElementById('app-header-title');
        if (headerTitle) headerTitle.textContent = t('headerTitle');
        if (els.resetWeekBtn) els.resetWeekBtn.textContent = t('startNewWeek');
        
        // Fullscreen SVG Icons
        const isFS = !!document.fullscreenElement;
        if (els.fullscreenBtn) {
            els.fullscreenBtn.title = isFS ? t('exitFullscreen') : t('fullscreen');
            const fullscreenIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
            const exitFullscreenIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;
            els.fullscreenBtn.innerHTML = isFS ? exitFullscreenIcon : fullscreenIcon;
        }

        const taskTitle = document.getElementById('daily-task-title');
        if (taskTitle) taskTitle.textContent = t('dailyTask');

        const rewardLabel = document.getElementById('reward-label');
        const punishLabel = document.getElementById('punishment-label');
        if (rewardLabel) rewardLabel.textContent = t('rewardLabel');
        if (punishLabel) punishLabel.textContent = t('punishmentLabel');

        els.rewardInput.placeholder = t('rewardPlaceholder');
        els.punishmentInput.placeholder = t('punishmentPlaceholder');
        els.saveRulesBtn.textContent = t('saveRules');

        const modalTitle = document.getElementById('settings-modal-title');
        if (modalTitle) modalTitle.textContent = t('settingsTitle');
        
        const tabMan = document.getElementById('tab-manual-text');
        const tabCsv = document.getElementById('tab-csv-text');
        if (tabMan) tabMan.textContent = t('manualTab');
        if (tabCsv) tabCsv.textContent = t('csvTab');

        els.importBtn.textContent = t('importBtn');
        els.clearDataBtn.textContent = t('clearDataBtn');
        
        const hint = document.getElementById('settings-hint');
        if (hint) hint.textContent = t('hint');

        const confTitle = document.getElementById('confirm-title-text');
        if (confTitle) confTitle.textContent = t('confirmTitle');
        if (els.confirmYes) els.confirmYes.textContent = t('confirmYes');
        if (els.confirmNo) els.confirmNo.textContent = t('confirmNo');
    } catch (e) { console.error(e); }
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

    window.addEventListener('resize', () => { resizeCanvas(); });
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
            } else { alert(data.message || t('verifyFail')); }
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
                    STATE.students = lines.map(name => ({ name, history: [false, false, false, false, false] }));
                    startNewWeek();
                    els.settingsModal.classList.add('hidden');
                }
            }
        });
    }

    if(els.clearDataBtn) {
        els.clearDataBtn.addEventListener('click', () => {
            if(confirm(t('clearDataConfirm'))) {
                STATE.students = []; STATE.rules = { reward: "", punishment: "" }; STATE.weekStartDate = null;
                saveData(); renderUI(); els.settingsModal.classList.add('hidden');
            }
        });
    }

    if(els.saveRulesBtn) {
        els.saveRulesBtn.addEventListener('click', () => {
            STATE.rules.reward = els.rewardInput.value;
            STATE.rules.punishment = els.punishmentInput.value;
            saveData(); alert(t('rulesSaved'));
        });
    }

    if(els.resetWeekBtn) {
        els.resetWeekBtn.addEventListener('click', () => {
            if(confirm(t('resetWeekConfirm'))) startNewWeek();
        });
    }

    if(els.confirmYes) {
        els.confirmYes.addEventListener('click', () => {
            if (pendingStudentIndex !== null) {
                const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
                if(STATE.students[pendingStudentIndex]) {
                    STATE.students[pendingStudentIndex].history[day] = true;
                    saveData(); renderGrid(); updateProgress();
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
    saveData(); renderUI();
}

function showApp() {
    try {
        if(els.authScreen) { els.authScreen.classList.remove('active'); }
        if(els.appScreen) { els.appScreen.classList.add('active'); }
        if(els.rewardInput) els.rewardInput.value = STATE.rules.reward || '';
        if(els.punishmentInput) els.punishmentInput.value = STATE.rules.punishment || '';
        renderUI();
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

let ctx;
let swayTime = 0;

function resizeCanvas() {
    if(!els.treeCanvas) return;
    ctx = els.treeCanvas.getContext('2d');
    const parent = els.treeCanvas.parentElement;
    els.treeCanvas.width = parent.offsetWidth;
    els.treeCanvas.height = parent.offsetHeight;
}

function renderTree() {
    if (!ctx) { requestAnimationFrame(renderTree); return; }
    const w = els.treeCanvas.width;
    const h = els.treeCanvas.height;
    swayTime += 0.015;
    ctx.clearRect(0, 0, w, h);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#A1C4FD'); skyGrad.addColorStop(1, '#C2E9FB');
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 249, 196, 0.6)'; ctx.beginPath(); ctx.arc(w*0.8, h*0.2, 40, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff176'; ctx.beginPath(); ctx.arc(w*0.8, h*0.2, 25, 0, Math.PI*2); ctx.fill();
    
    const cloudX = w*0.2 + Math.sin(swayTime*0.5)*20;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(cloudX, h*0.25, 30, 0, Math.PI*2); ctx.arc(cloudX+30, h*0.27, 40, 0, Math.PI*2); ctx.arc(cloudX-30, h*0.27, 35, 0, Math.PI*2); ctx.fill();

    const groundGrad = ctx.createLinearGradient(0, h*0.8, 0, h);
    groundGrad.addColorStop(0, '#84fab0'); groundGrad.addColorStop(1, '#8fd3f4');
    ctx.fillStyle = groundGrad;
    ctx.beginPath(); ctx.moveTo(-50, h); ctx.quadraticCurveTo(w*0.2, h*0.75, w*0.5, h*0.85); ctx.quadraticCurveTo(w*0.8, h*0.9, w+50, h*0.8); ctx.lineTo(w+50, h); ctx.lineTo(-50, h); ctx.fill();

    let level = 0;
    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    for(let i=0; i<=4; i++) {
        if (i <= day && STATE.students.length > 0 && STATE.students.every(s => s.history[i])) level++;
    }

    ctx.save();
    ctx.translate(w/2, h*0.85);
    const treeScale = (0.4 + level*0.15) * 1.3;
    ctx.scale(treeScale, treeScale);

    const trunkGrad = ctx.createLinearGradient(-20, 0, 20, 0);
    trunkGrad.addColorStop(0, '#6d4c41'); trunkGrad.addColorStop(0.4, '#8d6e63'); trunkGrad.addColorStop(1, '#5d4037');
    ctx.fillStyle = trunkGrad; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-10, -80, -5, -150); ctx.lineTo(5, -150); ctx.quadraticCurveTo(15, -80, 20, 0); ctx.fill();
    ctx.strokeStyle = trunkGrad; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -60); ctx.quadraticCurveTo(-30, -100, -80, -140); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -60); ctx.quadraticCurveTo(30, -120, 60, -160); ctx.stroke();

    ctx.save();
    ctx.rotate(Math.sin(swayTime)*0.03);
    const leafDark = ctx.createRadialGradient(0, -180, 0, 0, -180, 80);
    leafDark.addColorStop(0, '#66bb6a'); leafDark.addColorStop(1, '#2e7d32');
    const leafLight = ctx.createRadialGradient(0, -200, 0, 0, -200, 70);
    leafLight.addColorStop(0, '#b9f6ca'); leafLight.addColorStop(1, '#00c853');
    ctx.fillStyle = leafDark;
    ctx.beginPath(); ctx.arc(-50, -140, 50, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(50, -160, 55, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -210, 60, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = leafLight; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(-30, -170, 50, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(30, -190, 50, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#b9f6ca'; ctx.globalAlpha = 1.0;
    ctx.beginPath(); ctx.arc(0, -230, 45, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(20, -240, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, -150, 8, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.restore();

    if (level === 5) {
        els.treeMsg.textContent = STATE.rules.reward || t('treeMsgReward');
        els.treeMsg.classList.add('show');
    } else {
        els.treeMsg.classList.remove('show');
    }
    requestAnimationFrame(renderTree);
}

function triggerConfetti() {}

window.onload = init;
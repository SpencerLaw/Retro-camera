// State Management
const STATE = {
    licenseCode: localStorage.getItem('hc_license') || null,
    isVerified: localStorage.getItem('hc_verified') === 'true',
    students: JSON.parse(localStorage.getItem('hc_students') || '[]'),
    weekStartDate: localStorage.getItem('hc_week_start') || null,
    rules: JSON.parse(localStorage.getItem('hc_rules') || '{"reward":"","punishment":""}'),
    currentDate: new Date(), // Will be synced with server
    todayIndex: 0, // 0=Mon, 4=Fri, -1=Weekend
    lang: localStorage.getItem('global-language') || 'zh-CN'
};

// Helper for Translation
function t(key) {
    const langData = TRANSLATIONS[STATE.lang] || TRANSLATIONS['zh-CN'];
    return langData[key] || key;
}

function applyTranslations() {
    // Auth
    if(els.authTitle) els.authTitle.textContent = t('title');
    if(els.authSubtitle) els.authSubtitle.textContent = t('subtitle');
    els.licenseInput.placeholder = t('placeholder');
    els.verifyBtn.textContent = t('verifyBtn');
    
    // Header
    const headerTitle = document.querySelector('.header-left h2');
    if(headerTitle) headerTitle.textContent = t('headerTitle');
    
    if(els.backBtn) els.backBtn.title = t('backHome');
    
    els.resetWeekBtn.textContent = t('startNewWeek');
    
    const isFS = !!document.fullscreenElement;
    els.fullscreenBtn.title = isFS ? t('exitFullscreen') : t('fullscreen');
    els.fullscreenBtn.textContent = isFS ? "📺" : "📺"; // Could swap icon if desired, using same for now
    
    els.settingsBtn.title = t('settings');
    els.logoutBtn.title = t('logout');
    
    // Game Zone
    const gameTitle = document.getElementById('daily-task-title');
    if(gameTitle) gameTitle.textContent = t('dailyTask');
    
    // Rules
    if(els.labelReward) els.labelReward.textContent = t('rewardLabel');
    if(els.labelPunish) els.labelPunish.textContent = t('punishmentLabel');
    
    els.rewardInput.placeholder = t('rewardPlaceholder');
    els.punishmentInput.placeholder = t('punishmentPlaceholder');
    els.saveRulesBtn.textContent = t('saveRules');
    
    // Modal
    const modalH2 = document.querySelector('.modal-content h2');
    if(modalH2) modalH2.textContent = t('settingsTitle');
    
    const tabMan = document.querySelector('[data-tab="manual"]');
    if(tabMan) tabMan.textContent = t('manualTab');
    
    const tabCsv = document.querySelector('[data-tab="csv"]');
    if(tabCsv) tabCsv.textContent = t('csvTab');
    
    els.manualInput.placeholder = t('manualPlaceholder');
    els.csvInput.placeholder = t('csvPlaceholder');
    els.importBtn.textContent = t('importBtn');
    els.clearDataBtn.textContent = t('clearDataBtn');
    
    const hint = document.querySelector('.hint');
    if(hint) hint.textContent = t('hint');
    
    // Confirm Modal
    const confirmH3 = document.querySelector('.confirm-box h3');
    if(confirmH3) confirmH3.textContent = t('confirmTitle');
    els.confirmYes.textContent = t('confirmYes');
    els.confirmNo.textContent = t('confirmNo');
}

// DOM Elements
const els = {
    authScreen: document.getElementById('auth-screen'),
    appScreen: document.getElementById('app-screen'),
    licenseInput: document.getElementById('license-input'),
    verifyBtn: document.getElementById('verify-btn'),
    authMsg: document.getElementById('auth-msg'),
    dateDisplay: document.getElementById('current-date'),
    backBtn: document.getElementById('back-btn'),
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
    // New labels for 3-column layout
    labelReward: document.getElementById('reward-label'),
    labelPunish: document.getElementById('punishment-label'),
    // Auth titles
    authTitle: document.querySelector('.auth-box h1'),
    authSubtitle: document.querySelector('.subtitle')
};

// --- Initialization ---

async function init() {
    applyTranslations();
    await syncTime();
    startDynamicClock();
    checkWeekCycle();
    renderUI();
    
    // Auth Check
    if (STATE.isVerified && STATE.licenseCode) {
        showApp();
    } else {
        els.authScreen.classList.remove('hidden');
    }

    // Canvas Resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    renderTree(); // Initial tree render
}

let serverTimeOffset = 0;

async function syncTime() {
    try {
        const start = Date.now();
        const res = await fetch('/api/time');
        const data = await res.json();
        const end = Date.now();
        const serverDate = new Date(data.time);
        serverTimeOffset = serverDate.getTime() - (end + start) / 2;
        STATE.currentDate = new Date(Date.now() + serverTimeOffset);
    } catch (e) {
        console.warn('Time sync failed, using local time');
        STATE.currentDate = new Date();
        serverTimeOffset = 0;
    }
    
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

    els.dateDisplay.textContent = `${dateStr} ${days[STATE.todayIndex] || '?'}`;
    els.dayDisplay.textContent = timeStr;
}

function checkWeekCycle() {
    if (!STATE.weekStartDate) {
        startNewWeek();
        return;
    }
}

function startNewWeek() {
    const d = new Date(STATE.currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day == 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);
    
    STATE.weekStartDate = monday.toISOString();
    STATE.students.forEach(s => {
        s.history = [false, false, false, false, false];
    });
    
    saveData();
    renderUI();
    renderTree();
}

// --- Auth Logic ---

els.verifyBtn.addEventListener('click', async () => {
    const code = els.licenseInput.value.trim();
    if (!code) return;

    // 强制消消乐专属前缀校验
    if (!code.toUpperCase().startsWith('ZY')) {
        alert('此应用需要以 ZY 开头的专用授权码');
        return;
    }

    els.verifyBtn.textContent = t('verifying');
    els.verifyBtn.disabled = true;
    els.authMsg.textContent = '';

    try {
        let deviceId = localStorage.getItem('hc_device_id');
        if (!deviceId) {
            deviceId = 'hc-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('hc_device_id', deviceId);
        }

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

        if (data.success) {
            STATE.licenseCode = code;
            STATE.isVerified = true;
            localStorage.setItem('hc_license', code);
            localStorage.setItem('hc_verified', 'true');
            showApp();
        } else {
            els.authMsg.textContent = data.message || t('verifyFail');
        }
    } catch (e) {
        els.authMsg.textContent = t('networkError');
    } finally {
        els.verifyBtn.textContent = t('verifyBtn');
        els.verifyBtn.disabled = false;
    }
});

els.logoutBtn.addEventListener('click', () => {
    STATE.isVerified = false;
    localStorage.removeItem('hc_verified');
    location.reload();
});

if(els.backBtn) {
    els.backBtn.addEventListener('click', () => {
        window.location.href = '/';
    });
}

els.fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    applyTranslations(); // Refresh titles/icons
});

function showApp() {
    els.authScreen.classList.remove('active');
    setTimeout(() => {
        els.authScreen.classList.add('hidden');
        els.appScreen.classList.remove('hidden');
        setTimeout(() => {
            resizeCanvas();
            renderTree();
        }, 100); 
    }, 500);
    
    els.rewardInput.value = STATE.rules.reward;
    els.punishmentInput.value = STATE.rules.punishment;
}

// --- Main UI Logic ---

function renderUI() {
    renderGrid();
    updateProgress();
}

function renderGrid() {
    els.studentGrid.innerHTML = '';
    
    if (STATE.students.length === 0) {
        els.studentGrid.innerHTML = `<div class="empty-state">${t('emptyState')}</div>`;
        return;
    }

    const dayIndex = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;

    STATE.students.forEach((student, index) => {
        const isDone = student.history[dayIndex];
        if (!isDone) {
            const bubble = document.createElement('div');
            bubble.className = 'student-bubble';
            bubble.textContent = student.name;
            bubble.style.backgroundColor = getBubbleColor(index);
            bubble.onclick = () => confirmComplete(index);
            els.studentGrid.appendChild(bubble);
        }
    });
    
    if (els.studentGrid.children.length === 0 && STATE.students.length > 0) {
        const msg = document.createElement('div');
        msg.className = 'empty-state';
        msg.innerHTML = t('emptyStateDone');
        msg.style.color = 'var(--primary-green)';
        els.studentGrid.appendChild(msg);
    }
}

let pendingStudentIndex = null;

function confirmComplete(index) {
    pendingStudentIndex = index;
    const student = STATE.students[index];
    els.confirmName.textContent = t('confirmMsg').replace('{name}', student.name);
    els.confirmModal.classList.remove('hidden');
}

els.confirmYes.addEventListener('click', () => {
    if (pendingStudentIndex !== null) {
        const dayIndex = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
        STATE.students[pendingStudentIndex].history[dayIndex] = true;
        saveData();
        renderGrid();
        updateProgress();
        renderTree();
        
        const allDoneToday = STATE.students.every(s => s.history[dayIndex]);
        if (allDoneToday) {
            triggerConfetti();
        }
    }
    els.confirmModal.classList.add('hidden');
    pendingStudentIndex = null;
});

els.confirmNo.addEventListener('click', () => {
    els.confirmModal.classList.add('hidden');
    pendingStudentIndex = null;
});

function updateProgress() {
    if (STATE.students.length === 0) return;
    const dayIndex = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    const total = STATE.students.length;
    const done = STATE.students.filter(s => s.history[dayIndex]).length;
    const pct = (done / total) * 100;
    els.dailyProgress.style.width = `${pct}%`;
}

function getBubbleColor(index) {
    const colors = ['#ffecd2', '#fcb69f', '#a8e6cf', '#d4fc79', '#84fab0', '#fccb90'];
    return colors[index % colors.length];
}

function saveData() {
    localStorage.setItem('hc_students', JSON.stringify(STATE.students));
    localStorage.setItem('hc_week_start', STATE.weekStartDate);
    localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
}

// --- Dreamy Tree Visualization (Canvas) ---

const ctx = els.treeCanvas.getContext('2d');
let animFrameId;
let swayTime = 0;

function resizeCanvas() {
    const parent = els.treeCanvas.parentElement;
    if (!parent) return;
    els.treeCanvas.width = parent.offsetWidth;
    els.treeCanvas.height = parent.offsetHeight;
    if (!animFrameId) renderTree(); 
}

function renderTree() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    function animate() {
        swayTime += 0.02;
        drawDreamyScene();
        animFrameId = requestAnimationFrame(animate);
    }
    animate();
}

function drawDreamyScene() {
    if (!ctx) return;
    const w = els.treeCanvas.width;
    const h = els.treeCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#A1C4FD');
    skyGrad.addColorStop(1, '#C2E9FB');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 249, 196, 0.6)';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.2, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff176';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.2, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCloud(w * 0.2 + Math.sin(swayTime * 0.5) * 10, h * 0.25, 1);
    drawCloud(w * 0.6 + Math.sin(swayTime * 0.3 + 2) * 15, h * 0.15, 0.7);

    const groundGrad = ctx.createLinearGradient(0, 0, 0, h);
    groundGrad.addColorStop(0, '#84fab0');
    groundGrad.addColorStop(1, '#8fd3f4');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.85);
    ctx.quadraticCurveTo(w * 0.3, h * 0.75, w * 0.6, h * 0.88);
    ctx.quadraticCurveTo(w * 0.8, h * 0.92, w, h * 0.85);
    ctx.lineTo(w, h);
    ctx.fill();

    let level = 0;
    let isWeekPerfect = true;
    const scanLimit = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    for (let i = 0; i <= 4; i++) {
        const allDone = STATE.students.length > 0 && STATE.students.every(s => s.history[i]);
        if (i <= scanLimit) {
            if (allDone) level++;
            else if (i < scanLimit) isWeekPerfect = false;
        }
    }

    const baseScale = (0.5 + (level * 0.15)) * 1.2; 
    const treeX = w / 2;
    const treeY = h * 0.88;

    ctx.save();
    ctx.translate(treeX, treeY);
    ctx.scale(baseScale, baseScale);
    if (level === 0) drawSprout(ctx);
    else drawDreamyTree(ctx, level, swayTime);
    ctx.restore();

    if (level === 5 && isWeekPerfect) {
        els.treeMsg.textContent = STATE.rules.reward || t('treeMsgReward');
        els.treeMsg.classList.add('show');
    } else if (STATE.todayIndex > 4 && !isWeekPerfect) {
         els.treeMsg.textContent = STATE.rules.punishment || t('treeMsgPunish');
         els.treeMsg.classList.add('show');
    } else {
        els.treeMsg.classList.remove('show');
    }
}

function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.arc(30, 10, 40, 0, Math.PI * 2);
    ctx.arc(60, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSprout(ctx) {
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(0, -10, 5, 10, Math.PI/4, 0, Math.PI*2);
    ctx.ellipse(0, -10, 5, 10, -Math.PI/4, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-2, 0, 4, 10);
}

function drawDreamyTree(ctx, level, time) {
    const trunkGrad = ctx.createLinearGradient(-30, 0, 30, 0);
    trunkGrad.addColorStop(0, '#6d4c41');
    trunkGrad.addColorStop(0.4, '#8d6e63');
    trunkGrad.addColorStop(1, '#5d4037');
    ctx.strokeStyle = trunkGrad;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.quadraticCurveTo(-10, -80, -5, -150);
    ctx.lineTo(5, -150);
    ctx.quadraticCurveTo(15, -80, 20, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-15, -40);
    ctx.quadraticCurveTo(-30, -100, -80, -140);
    ctx.moveTo(15, -50);
    ctx.quadraticCurveTo(40, -120, 80, -160);
    ctx.stroke();
    const swayAngle = Math.sin(time) * 0.02;
    ctx.save();
    ctx.rotate(swayAngle);
    const leafDark = ctx.createRadialGradient(-50, -140, 0, -50, -140, 50);
    leafDark.addColorStop(0, '#66bb6a');
    leafDark.addColorStop(1, '#2e7d32');
    const leafLight = ctx.createRadialGradient(30, -190, 0, 30, -190, 50);
    leafLight.addColorStop(0, '#b9f6ca');
    leafLight.addColorStop(1, '#00c853');
    ctx.fillStyle = leafDark;
    if (level >= 1) { ctx.beginPath(); ctx.arc(0, -180, 60, 0, Math.PI*2); ctx.fill(); }
    if (level >= 2) { ctx.beginPath(); ctx.arc(-50, -140, 50, 0, Math.PI*2); ctx.fill(); }
    if (level >= 3) { ctx.beginPath(); ctx.arc(50, -160, 55, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = leafLight;
    ctx.globalAlpha = 0.9;
    if (level >= 2) { ctx.beginPath(); ctx.arc(-30, -170, 50, 0, Math.PI*2); ctx.fill(); }
    if (level >= 3) { ctx.beginPath(); ctx.arc(30, -190, 50, 0, Math.PI*2); ctx.fill(); }
    if (level >= 1) {
        ctx.fillStyle = '#b9f6ca';
        ctx.globalAlpha = 1.0;
        ctx.beginPath(); ctx.arc(0, -210, 45, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(-20, -220, 10, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

// --- Confetti ---
function triggerConfetti() {
    const canvas = els.treeCanvas;
    const myCtx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const particles = [];
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff'];
    for(let i=0; i<100; i++) {
        particles.push({
            x: w/2,
            y: h - 50,
            vx: (Math.random() - 0.5) * 10,
            vy: -(Math.random() * 10 + 5),
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 5 + 2
        });
    }
    function animateConfetti() {
        drawDreamyScene(); 
        let active = false;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            myCtx.fillStyle = p.color;
            myCtx.beginPath();
            myCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            myCtx.fill();
            if (p.y < h) active = true;
        });
        if (active) requestAnimationFrame(animateConfetti);
    }
    animateConfetti();
}

// --- Settings / Modal Logic ---

els.settingsBtn.addEventListener('click', () => {
    els.settingsModal.classList.remove('hidden');
    const names = STATE.students.map(s => s.name).join('\n');
    els.manualInput.value = names;
});

els.closeModal.addEventListener('click', () => {
    els.settingsModal.classList.add('hidden');
});

els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        els.tabBtns.forEach(b => b.classList.remove('active'));
        els.tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

els.importBtn.addEventListener('click', () => {
    let rawText = '';
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'manual') rawText = els.manualInput.value;
    else rawText = els.csvInput.value;
    const lines = rawText.split(/[\n,]+/).map(t => t.trim()).filter(t => t);
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

els.clearDataBtn.addEventListener('click', () => {
    if(confirm(t('clearDataConfirm'))) {
        localStorage.removeItem('hc_students');
        localStorage.removeItem('hc_week_start');
        localStorage.removeItem('hc_rules');
        STATE.students = [];
        STATE.rules = { reward: "", punishment: "" };
        renderUI();
        renderTree();
        els.settingsModal.classList.add('hidden');
    }
});

els.saveRulesBtn.addEventListener('click', () => {
    STATE.rules.reward = els.rewardInput.value;
    STATE.rules.punishment = els.punishmentInput.value;
    saveData();
    renderTree();
    alert(t('rulesSaved'));
});

els.resetWeekBtn.addEventListener('click', () => {
    if(confirm(t('resetWeekConfirm'))) {
        startNewWeek();
    }
});

init();
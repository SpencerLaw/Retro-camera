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

// Helper for Translation
function t(key) {
    const data = window.TRANSLATIONS || {};
    const langData = data[STATE.lang] || data['zh-CN'] || {};
    return langData[key] || key;
}

function applyTranslations() {
    try {
        if (!els.verifyBtn) return;

        const authTitle = document.querySelector('.auth-box h1');
        const authSub = document.querySelector('.subtitle');
        if (authTitle) authTitle.textContent = t('title');
        if (authSub) authSub.textContent = t('subtitle');
        if (els.licenseInput) els.licenseInput.placeholder = t('placeholder');
        if (els.verifyBtn) els.verifyBtn.textContent = t('verifyBtn');
        
        const headerTitle = document.querySelector('.header-left h2');
        if (headerTitle) headerTitle.textContent = t('headerTitle');
        
        document.querySelectorAll('#back-btn, .back-to-home-btn').forEach(btn => {
            btn.title = t('backHome');
        });
        
        const isFS = !!document.fullscreenElement;
        if (els.fullscreenBtn) {
            els.fullscreenBtn.title = isFS ? t('exitFullscreen') : t('fullscreen');
        }
        
        if (els.resetWeekBtn) els.resetWeekBtn.textContent = t('startNewWeek');
        if (els.settingsBtn) els.settingsBtn.title = t('settings');
        if (els.logoutBtn) els.logoutBtn.title = t('logout');
        
        const gameTitle = document.getElementById('daily-task-title');
        if (gameTitle) gameTitle.textContent = t('dailyTask');
        
        if (els.labelReward) els.labelReward.textContent = t('rewardLabel');
        if (els.labelPunish) els.labelPunish.textContent = t('punishmentLabel');
        
        if (els.rewardInput) els.rewardInput.placeholder = t('rewardPlaceholder');
        if (els.punishmentInput) els.punishmentInput.placeholder = t('punishmentPlaceholder');
        if (els.saveRulesBtn) els.saveRulesBtn.textContent = t('saveRules');
        
        const modalH2 = document.querySelector('.modal-content h2');
        if (modalH2) modalH2.textContent = t('settingsTitle');
        
        const tabMan = document.querySelector('[data-tab="manual"]');
        if (tabMan) tabMan.textContent = t('manualTab');
        const tabCsv = document.querySelector('[data-tab="csv"]');
        if (tabCsv) tabCsv.textContent = t('csvTab');
        
        if (els.manualInput) els.manualInput.placeholder = t('manualPlaceholder');
        if (els.csvInput) els.csvInput.placeholder = t('csvPlaceholder');
        if (els.importBtn) els.importBtn.textContent = t('importBtn');
        if (els.clearDataBtn) els.clearDataBtn.textContent = t('clearDataBtn');
        
        const hint = document.querySelector('.hint');
        if (hint) hint.textContent = t('hint');
        
        const confirmH3 = document.querySelector('.confirm-box h3');
        if (confirmH3) confirmH3.textContent = t('confirmTitle');
        if (els.confirmYes) els.confirmYes.textContent = t('confirmYes');
        if (els.confirmNo) els.confirmNo.textContent = t('confirmNo');
    } catch (e) {
        console.error('Translation error:', e);
    }
}

// --- Initialization ---

async function init() {
    els = {
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
        labelReward: document.getElementById('reward-label'),
        labelPunish: document.getElementById('punishment-label')
    };

    attachEventListeners();
    applyTranslations();
    
    // 异步加载时间
    syncTime().then(() => {
        startDynamicClock();
        checkWeekCycle();
        renderUI();
    });
    
    if (STATE.isVerified && STATE.licenseCode) {
        showApp();
    } else {
        if(els.authScreen) els.authScreen.classList.add('active');
        if(els.authScreen) els.authScreen.classList.remove('hidden');
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
        els.verifyBtn.disabled = true;
        if(els.authMsg) els.authMsg.textContent = '';

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
                if(els.authMsg) els.authMsg.textContent = data.message || t('verifyFail');
            }
        } catch (e) {
            if(els.authMsg) els.authMsg.textContent = t('networkError');
        } finally {
            els.verifyBtn.textContent = t('verifyBtn');
            els.verifyBtn.disabled = false;
        }
    });

    if(els.logoutBtn) {
        els.logoutBtn.addEventListener('click', () => {
            STATE.isVerified = false;
            localStorage.removeItem('hc_verified');
            localStorage.removeItem('hc_license');
            location.reload();
        });
    }

    document.querySelectorAll('#back-btn, .back-to-home-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = '/';
        });
    });

    if(els.fullscreenBtn) {
        els.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        applyTranslations();
    });

    if(els.settingsBtn) {
        els.settingsBtn.addEventListener('click', () => {
            if(els.settingsModal) els.settingsModal.classList.remove('hidden');
            if(els.manualInput) {
                const names = STATE.students.map(s => s.name).join('\n');
                els.manualInput.value = names;
            }
        });
    }

    if(els.closeModal) {
        els.closeModal.addEventListener('click', () => {
            if(els.settingsModal) els.settingsModal.classList.add('hidden');
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
            try {
                let rawText = '';
                const activeTabBtn = document.querySelector('.tab-btn.active');
                const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'manual';
                
                if (activeTab === 'manual') rawText = els.manualInput.value;
                else rawText = els.csvInput.value;
                
                const lines = rawText.split(/[\n\r,]+/).map(t => t.trim()).filter(t => t);
                if (lines.length > 0) {
                    if (confirm(t('importResetConfirm'))) {
                        STATE.students = lines.map(name => ({
                            name,
                            history: [false, false, false, false, false]
                        }));
                        startNewWeek();
                        if(els.settingsModal) els.settingsModal.classList.add('hidden');
                    }
                }
            } catch (e) { console.error(e); }
        });
    }

    if(els.clearDataBtn) {
        els.clearDataBtn.addEventListener('click', () => {
            if(confirm(t('clearDataConfirm'))) {
                localStorage.removeItem('hc_students');
                localStorage.removeItem('hc_week_start');
                localStorage.removeItem('hc_rules');
                STATE.students = [];
                STATE.rules = { reward: "", punishment: "" };
                renderUI();
                renderTree();
                if(els.settingsModal) els.settingsModal.classList.add('hidden');
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
                const dayIndex = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
                if(STATE.students[pendingStudentIndex]) {
                    STATE.students[pendingStudentIndex].history[dayIndex] = true;
                    saveData();
                    renderGrid();
                    updateProgress();
                    renderTree();
                    
                    const allDoneToday = STATE.students.every(s => s.history && s.history[dayIndex]);
                    if (allDoneToday) {
                        triggerConfetti();
                    }
                }
            }
            if(els.confirmModal) els.confirmModal.classList.add('hidden');
            pendingStudentIndex = null;
        });
    }

    if(els.confirmNo) {
        els.confirmNo.addEventListener('click', () => {
            if(els.confirmModal) els.confirmModal.classList.add('hidden');
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
        const end = Date.now();
        const serverDate = new Date(data.time);
        serverTimeOffset = serverDate.getTime() - (end + start) / 2;
        STATE.currentDate = new Date(Date.now() + serverTimeOffset);
    } catch (e) {
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
    try {
        const days = t('days');
        const d = STATE.currentDate;
        const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        
        let dayIdx = d.getDay();
        STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;

        if(els.dateDisplay) els.dateDisplay.textContent = `${dateStr} ${days[STATE.todayIndex] || '?'}`;
        if(els.dayDisplay) els.dayDisplay.textContent = timeStr;
    } catch (e) {}
}

function checkWeekCycle() {
    if (!STATE.weekStartDate) {
        startNewWeek();
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
        if(!s.history) s.history = [false, false, false, false, false];
        else s.history.fill(false);
    });
    
    saveData();
    renderUI();
    renderTree();
}

function showApp() {
    try {
        // 核心动作：切换界面
        if(els.authScreen) {
            els.authScreen.classList.remove('active');
            els.authScreen.classList.add('hidden');
        }
        if(els.appScreen) {
            els.appScreen.classList.remove('hidden');
            els.appScreen.classList.add('active'); // 确保可见
        }

        // 次要动作：填充数据
        if(els.rewardInput) els.rewardInput.value = STATE.rules.reward || '';
        if(els.punishmentInput) els.punishmentInput.value = STATE.rules.punishment || '';

        // 刷新渲染
        setTimeout(() => {
            resizeCanvas();
            renderTree();
            renderUI();
        }, 50);
    } catch (e) {
        console.error('Error in showApp:', e);
        // 保底：即使报错也强行显示主界面
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
    }
}

function renderUI() {
    renderGrid();
    updateProgress();
}

function renderGrid() {
    if(!els.studentGrid) return;
    els.studentGrid.innerHTML = '';
    
    if (STATE.students.length === 0) {
        els.studentGrid.innerHTML = `<div class="empty-state">${t('emptyState')}</div>`;
        return;
    }

    const dayIndex = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;

    STATE.students.forEach((student, index) => {
        const isDone = student.history ? student.history[dayIndex] : false;
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
    if(els.confirmName) els.confirmName.textContent = t('confirmMsg').replace('{name}', student.name);
    if(els.confirmModal) els.confirmModal.classList.remove('hidden');
}

function updateProgress() {
    if (!STATE.students || STATE.students.length === 0 || !els.dailyProgress) return;
    const dayIndex = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    const total = STATE.students.length;
    const done = STATE.students.filter(s => s.history && s.history[dayIndex]).length;
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

// --- Tree Visualization (Canvas) ---
let ctx;
let animFrameId;
let swayTime = 0;

function resizeCanvas() {
    if(!els.treeCanvas) return;
    ctx = els.treeCanvas.getContext('2d');
    const parent = els.treeCanvas.parentElement;
    if (!parent) return;
    els.treeCanvas.width = parent.offsetWidth;
    els.treeCanvas.height = parent.offsetHeight;
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
        const allDone = STATE.students.length > 0 && STATE.students.every(s => s.history && s.history[i]);
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
        if(els.treeMsg) els.treeMsg.classList.remove('show');
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

function triggerConfetti() {
    if(!els.treeCanvas) return;
    const myCtx = els.treeCanvas.getContext('2d');
    const w = els.treeCanvas.width;
    const h = els.treeCanvas.height;
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

window.addEventListener('load', init);
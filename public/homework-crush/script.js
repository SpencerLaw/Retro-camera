/**
 * 作业消消乐 - 核心逻辑脚本 (稳定性加强版)
 */

console.log("Homework Crush script loading...");

// 1. 状态管理
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

// 2. 翻译工具 (增加容错)
function t(key) {
    const data = window.TRANSLATIONS || {};
    const langData = data[STATE.lang] || data['zh-CN'] || {};
    return langData[key] || key;
}

// 3. 核心界面切换函数
function showApp() {
    console.log("Attempting to show app screen...");
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    
    if (auth) auth.classList.remove('active');
    if (app) app.classList.add('active');
    
    // 填充数据
    try {
        const rInput = document.getElementById('reward-text');
        const pInput = document.getElementById('punishment-text');
        if (rInput) rInput.value = STATE.rules.reward || '';
        if (pInput) pInput.value = STATE.rules.punishment || '';
        
        renderUI();
        resizeCanvas();
        console.log("App screen shown successfully.");
    } catch (e) {
        console.error("Error during app UI population:", e);
    }
}

// 4. 渲染逻辑
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
    
    // 更新进度条
    const progress = document.getElementById('daily-progress');
    if (progress && STATE.students.length > 0) {
        const done = STATE.students.filter(s => s.history && s.history[day]).length;
        progress.style.width = `${(done / STATE.students.length) * 100}%`;
    }
}

function saveData() {
    localStorage.setItem('hc_students', JSON.stringify(STATE.students));
    localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
    localStorage.setItem('hc_week_start', STATE.weekStartDate);
    localStorage.setItem('hc_verified', STATE.isVerified ? 'true' : 'false');
    localStorage.setItem('hc_license', STATE.licenseCode || '');
}

// 5. 初始化与事件绑定
async function init() {
    console.log("Initializing application...");

    // 绑定返回按钮 (所有类名为 global-back-btn 的元素)
    document.querySelectorAll('.global-back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Back button clicked, navigating to home...");
            window.location.href = '/';
        });
    });

    // 绑定授权逻辑
    const verifyBtn = document.getElementById('verify-btn');
    const licenseInput = document.getElementById('license-input');
    if (verifyBtn && licenseInput) {
        verifyBtn.addEventListener('click', async () => {
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
                    console.log("License verified!");
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
        });
    }

    // 绑定退出
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            STATE.isVerified = false;
            saveData();
            window.location.reload();
        });
    }

    // 绑定全屏
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        });
    }

    // 绑定设置按钮
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    if (settingsBtn && modal) {
        settingsBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            const manualInput = document.getElementById('student-list-input');
            if (manualInput) manualInput.value = STATE.students.map(s => s.name).join('\n');
        });
    }

    // 绑定关闭弹窗
    const closeModal = document.querySelector('.close-modal');
    if (closeModal && modal) {
        closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    }

    // 绑定保存规则
    const saveRulesBtn = document.getElementById('save-rules-btn');
    if (saveRulesBtn) {
        saveRulesBtn.addEventListener('click', () => {
            const rInput = document.getElementById('reward-text');
            const pInput = document.getElementById('punishment-text');
            STATE.rules.reward = rInput ? rInput.value : '';
            STATE.rules.punishment = pInput ? pInput.value : '';
            saveData();
            alert(t('rulesSaved'));
        });
    }

    // 绑定新的一周
    const resetWeekBtn = document.getElementById('reset-week-btn');
    if (resetWeekBtn) {
        resetWeekBtn.addEventListener('click', () => {
            if (confirm(t('resetWeekConfirm'))) {
                startNewWeek();
            }
        });
    }

    // 绑定导入
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const activeTabBtn = document.querySelector('.tab-btn.active');
            const mode = activeTabBtn ? activeTabBtn.dataset.tab : 'manual';
            const inputId = mode === 'manual' ? 'student-list-input' : 'csv-input';
            const input = document.getElementById(inputId);
            
            if (input && input.value.trim()) {
                if (confirm(t('importResetConfirm'))) {
                    const lines = input.value.split(/[
,]+/).map(txt => t.trim()).filter(txt => txt); // Fix here: typo txt.trim
                    STATE.students = input.value.split(/[
,]+/).map(n => n.trim()).filter(n => n).map(name => ({
                        name,
                        history: [false, false, false, false, false]
                    }));
                    startNewWeek();
                    if(modal) modal.classList.add('hidden');
                }
            }
        });
    }

    // 绑定标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if(target) target.classList.add('active');
        });
    });

    // 初始设置
    applyTranslations();
    if (STATE.isVerified && STATE.licenseCode) {
        showApp();
    } else {
        const auth = document.getElementById('auth-screen');
        if (auth) auth.classList.add('active');
    }

    // 启动背景服务
    await syncTime();
    startDynamicClock();
    
    // 启动大树渲染
    resizeCanvas();
    renderTree();
    
    window.addEventListener('resize', resizeCanvas);
}

// --- 时间服务 ---
let serverTimeOffset = 0;
async function syncTime() {
    try {
        const start = Date.now();
        const res = await fetch('/api/time');
        const data = await res.json();
        serverTimeOffset = new Date(data.time).getTime() - (Date.now() + start) / 2;
    } catch (e) { console.warn("Sync failed"); }
}

function startDynamicClock() {
    setInterval(() => {
        STATE.currentDate = new Date(Date.now() + serverTimeOffset);
        const days = t('days');
        const d = STATE.currentDate;
        const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        
        let dayIdx = d.getDay();
        STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;

        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-week-day');
        if (dateEl) dateEl.textContent = `${dateStr} ${days[STATE.todayIndex] || '?'}`;
        if (timeEl) timeEl.textContent = timeStr;
    }, 1000);
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

// --- 大树动画 (精简核心逻辑) ---
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
    const canvas = document.getElementById('tree-canvas');
    const w = canvas.width, h = canvas.height;
    swayTime += 0.015;
    ctx.clearRect(0, 0, w, h);

    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#A1C4FD'); sky.addColorStop(1, '#C2E9FB');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // 太阳
    ctx.fillStyle = 'rgba(255, 249, 196, 0.6)'; ctx.beginPath(); ctx.arc(w*0.8, h*0.2, 40, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff176'; ctx.beginPath(); ctx.arc(w*0.8, h*0.2, 25, 0, Math.PI*2); ctx.fill();

    // 地面
    ctx.fillStyle = '#a8e6cf'; ctx.beginPath(); ctx.moveTo(-50, h); ctx.quadraticCurveTo(w/2, h-80, w+50, h); ctx.lineTo(w+50, h); ctx.fill();

    // 等级
    let level = 0;
    const dayLimit = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    for(let i=0; i<=4; i++) {
        if (i <= dayLimit && STATE.students.length > 0 && STATE.students.every(s => s.history && s.history[i])) level++;
    }

    // 画树
    ctx.save();
    ctx.translate(w/2, h*0.85);
    const scale = (0.4 + level*0.15) * 1.3;
    ctx.scale(scale, scale);
    
    // 树干
    ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(0, -100, 0, -150); ctx.lineTo(5, -150); ctx.quadraticCurveTo(0, -100, 15, 0); ctx.fill();

    // 树冠 (摇摆)
    ctx.rotate(Math.sin(swayTime)*0.03);
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath(); ctx.arc(-40, -140, 50, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, -140, 50, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -190, 60, 0, Math.PI*2); ctx.fill();
    
    ctx.restore();

    // 提示信息
    const msg = document.getElementById('tree-message');
    if (msg) {
        if (level === 5) {
            msg.textContent = STATE.rules.reward || t('treeMsgReward');
            msg.classList.add('show');
        } else {
            msg.classList.remove('show');
        }
    }

    requestAnimationFrame(renderTree);
}

// 启动
window.addEventListener('load', init);

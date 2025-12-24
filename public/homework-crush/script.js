/**
 * 作业消消乐 - 核心脚本 (稳健修复版)
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

// 2. 翻译工具
function t(key) {
    try {
        const data = window.TRANSLATIONS || {};
        const langData = data[STATE.lang] || data['zh-CN'] || {};
        return langData[key] || key;
    } catch (e) {
        return key;
    }
}

function saveData() {
    try {
        localStorage.setItem('hc_students', JSON.stringify(STATE.students));
        localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
        localStorage.setItem('hc_week_start', STATE.weekStartDate);
        localStorage.setItem('hc_verified', STATE.isVerified ? 'true' : 'false');
        localStorage.setItem('hc_license', STATE.licenseCode || '');
    } catch (e) { console.error("Save error", e); }
}

// 3. 核心界面切换
function showApp() {
    console.log("📱 Entering App...");
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app-screen');
    
    if (auth) {
        auth.classList.remove('active');
        auth.style.display = 'none';
    }
    if (app) {
        app.classList.add('active');
        app.style.display = 'flex';
    }

    try {
        const rInput = document.getElementById('reward-text');
        const pInput = document.getElementById('punishment-text');
        if (rInput) rInput.value = STATE.rules.reward || '';
        if (pInput) pInput.value = STATE.rules.punishment || '';
        renderUI();
        resizeCanvas();
    } catch (e) { console.warn(e); }
}

// 4. 事件绑定 (采用最稳健的直接绑定方式)
function bindEvents() {
    console.log("🔗 Binding Events...");

    // 返回按钮
    document.querySelectorAll('.global-back-btn').forEach(btn => {
        btn.onclick = () => { window.location.href = '/'; };
    });

    // 授权验证
    const verifyBtn = document.getElementById('verify-btn');
    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            const input = document.getElementById('license-input');
            const code = input ? input.value.trim() : '';
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
            } catch (e) { alert(t('networkError')); }
            finally {
                verifyBtn.textContent = t('verifyBtn');
                verifyBtn.disabled = false;
            }
        };
    }

    // 退出
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

    // 设置与导入 (修复报错点)
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    if (settingsBtn && modal) {
        settingsBtn.onclick = () => {
            modal.classList.remove('hidden');
            const mInput = document.getElementById('student-list-input');
            if(mInput) mInput.value = STATE.students.map(s => s.name).join('\n');
        };
    }

    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.onclick = () => {
            const activeTabBtn = document.querySelector('.tab-btn-premium.active');
            const mode = activeTabBtn ? activeTabBtn.dataset.tab : 'manual';
            const inputId = mode === 'manual' ? 'student-list-input' : 'csv-input';
            const input = document.getElementById(inputId);

            if (input && input.value.trim()) {
                if (confirm(t('importResetConfirm'))) {
                    // 使用稳健的拆分方式，不使用可能导致报错的复杂正则
                    const rawLines = input.value.split('\n');
                    const names = [];
                    rawLines.forEach(line => {
                        const subLines = line.split(',');
                        subLines.forEach(name => {
                            const trimmed = name.trim();
                            if (trimmed) names.push(trimmed);
                        });
                    });

                    STATE.students = names.map(name => ({
                        name: name,
                        history: [false, false, false, false, false]
                    }));
                    startNewWeek();
                    if(modal) modal.classList.add('hidden');
                }
            }
        };
    }

    // 清空数据按钮
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        clearDataBtn.onclick = () => {
            if (confirm('⚠️ 确定要清空所有数据吗？\n\n这将删除：\n• 所有学生名单\n• 本周进度记录\n• 奖惩规则\n\n此操作不可恢复！')) {
                // 清空所有数据
                STATE.students = [];
                STATE.rules = { reward: '', punishment: '' };
                STATE.weekStartDate = null;
                saveData();

                // 关闭弹窗并刷新UI
                if (modal) modal.classList.add('hidden');
                renderUI();
                renderTree();

                alert('✅ 所有数据已清空！');
            }
        };
    }

    const closeModalBtn = document.querySelector('.close-modal-btn');
    if (closeModalBtn && modal) {
        closeModalBtn.onclick = () => modal.classList.add('hidden');
    }

    // 点击背景关闭弹窗
    const modalBackdrop = document.querySelector('.modal-backdrop');
    if (modalBackdrop && modal) {
        modalBackdrop.onclick = () => modal.classList.add('hidden');
    }

    // 其他按钮
    const resetWeekBtn = document.getElementById('reset-week-btn');
    if (resetWeekBtn) {
        resetWeekBtn.onclick = () => {
            if (confirm(t('resetWeekConfirm'))) startNewWeek();
        };
    }

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

    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
        fsBtn.onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };
    }

    document.querySelectorAll('.tab-btn-premium').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn-premium').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content-premium').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if(target) target.classList.add('active');
        };
    });

    // 文件选择处理
    const csvFileInput = document.getElementById('csv-file-input');
    if (csvFileInput) {
        csvFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const csvInput = document.getElementById('csv-input');
                    if (csvInput) {
                        csvInput.value = event.target.result;
                    }
                };
                reader.readAsText(file, 'UTF-8');
            }
        };
    }
}

// 5. 渲染 UI
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
        // 确保每个学生都有history数组
        if (!s.history || !Array.isArray(s.history) || s.history.length < 5) {
            s.history = [false, false, false, false, false];
        }

        // 只有当天作业明确未完成时才显示泡泡
        if (s.history[day] !== true) {
            const b = document.createElement('div');
            b.className = 'student-bubble';

            // 创建状态图标和名字
            const icon = document.createElement('div');
            icon.className = 'status-icon';
            icon.textContent = '📝';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'name';
            nameDiv.textContent = s.name;

            b.appendChild(icon);
            b.appendChild(nameDiv);

            b.onclick = () => {
                if (confirm(t('confirmMsg').replace('{name}', s.name))) {
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

// 6. 初始化
async function init() {
    bindEvents();
    try { applyTranslations(); } catch(e) {}

    if (STATE.isVerified && STATE.licenseCode) {
        showApp();
    } else {
        const auth = document.getElementById('auth-screen');
        if (auth) {
            auth.classList.add('active');
            auth.style.display = 'flex';
        }
    }

    syncTime().then(() => {
        startDynamicClock();
        checkWeekCycle();
        renderUI();
        renderTree();
    });

    window.onresize = () => renderTree();
}

function applyTranslations() {
    try {
        const headerTitle = document.getElementById('app-header-title');
        if (headerTitle) headerTitle.textContent = t('headerTitle');
        const resetBtn = document.getElementById('reset-week-btn');
        if (resetBtn) resetBtn.textContent = t('startNewWeek');
        
        const isFS = !!document.fullscreenElement;
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) {
            const fullscreenIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
            const exitFullscreenIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;
            fsBtn.innerHTML = isFS ? exitFullscreenIcon : fullscreenIcon;
        }
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
    } catch (e) {}
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

// --- 大树渲染 (使用SVG) ---
function renderTree() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    // 计算完成等级 (0-5天)
    let level = 0;
    const dayLimit = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    for(let i=0; i<=4; i++) {
        if (i <= dayLimit && STATE.students.length > 0 && STATE.students.every(s => s.history && s.history[i])) {
            level++;
        }
    }

    // 根据等级调整大树大小和颜色
    const treeScale = 0.6 + level * 0.08; // 从0.6到1.0
    const leafOpacity = 0.3 + level * 0.14; // 从0.3到1.0

    container.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
                <!-- 天空渐变 -->
                <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#A1C4FD;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#C2E9FB;stop-opacity:1" />
                </linearGradient>

                <!-- 地面渐变 -->
                <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#84fab0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#8fd3f4;stop-opacity:1" />
                </linearGradient>

                <!-- 树干渐变：增加立体感 -->
                <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#6d4c41;stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#8d6e63;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#5d4037;stop-opacity:1" />
                </linearGradient>

                <!-- 树叶渐变1 (深色阴影) -->
                <radialGradient id="leafDark" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2e7d32;stop-opacity:1" />
                </radialGradient>

                <!-- 树叶渐变2 (亮色受光面) -->
                <radialGradient id="leafLight" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:#b9f6ca;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#00c853;stop-opacity:1" />
                </radialGradient>
            </defs>

            <!-- 背景裁剪圆形 -->
            <clipPath id="circleView">
                <circle cx="250" cy="250" r="240" />
            </clipPath>

            <!-- 画布内容 -->
            <g clip-path="url(#circleView)">
                <!-- 天空 -->
                <rect width="500" height="500" fill="url(#skyGradient)" />

                <!-- 装饰：云朵 -->
                <g class="float-slow" fill="#FFFFFF" opacity="0.6">
                    <circle cx="100" cy="100" r="30" />
                    <circle cx="130" cy="110" r="40" />
                    <circle cx="70" cy="110" r="35" />
                </g>
                <g class="float-med" fill="#FFFFFF" opacity="0.4" transform="translate(300, 50)">
                    <circle cx="0" cy="0" r="20" />
                    <circle cx="25" cy="5" r="25" />
                    <circle cx="-20" cy="10" r="15" />
                </g>

                <!-- 太阳/光晕 -->
                <circle cx="400" cy="80" r="40" fill="#fff9c4" opacity="0.6" />
                <circle cx="400" cy="80" r="25" fill="#fff176" />

                <!-- 地面 (起伏的山坡) -->
                <path d="M-50,400 Q100,350 250,420 T550,400 V550 H-50 Z" fill="url(#groundGradient)" />
                <path d="M-50,450 Q200,420 550,480 V550 H-50 Z" fill="#66bb6a" opacity="0.3" />

                <!-- 树的主体组 -->
                <g transform="translate(250, 420) scale(${treeScale})">
                    <!-- 树干 -->
                    <path d="M-15,0
                             Q-10,-60 -30,-100
                             Q-40,-120 -80,-140
                             M-10,-60
                             Q5,-120 40,-160
                             M0,0
                             Q15,-50 25,-100
                             Q35,-150 80,-180
                             L0,0 Z"
                          fill="none" stroke="url(#trunkGradient)" stroke-width="20" stroke-linecap="round" />

                    <!-- 主树干基底 (加粗填充) -->
                    <path d="M-20,0 Q-10,-80 -5,-150 L5,-150 Q15,-80 20,0 Z" fill="url(#trunkGradient)" />

                    <!-- 树冠 (分层绘制) -->
                    <g class="sway">
                        <!-- 后层树叶 (深色) -->
                        <circle cx="-50" cy="-140" r="50" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="50" cy="-160" r="55" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="0" cy="-210" r="60" fill="url(#leafDark)" opacity="${leafOpacity}" />

                        <!-- 中层树叶 -->
                        <circle cx="-30" cy="-170" r="50" fill="url(#leafLight)" opacity="${Math.min(leafOpacity * 0.9, 1)}" />
                        <circle cx="30" cy="-190" r="50" fill="url(#leafLight)" opacity="${Math.min(leafOpacity * 0.9, 1)}" />

                        <!-- 顶层高光树叶 -->
                        <circle cx="0" cy="-230" r="45" fill="url(#leafLight)" opacity="${leafOpacity}" />
                        <circle cx="-40" cy="-190" r="35" fill="#b9f6ca" opacity="${Math.min(leafOpacity * 0.6, 1)}" />

                        <!-- 装饰性小叶子/粒子 -->
                        <circle cx="20" cy="-240" r="5" fill="#fff" opacity="${Math.min(leafOpacity * 0.6, 1)}" />
                        <circle cx="-20" cy="-150" r="8" fill="#fff" opacity="${Math.min(leafOpacity * 0.4, 1)}" />
                    </g>
                </g>

                <!-- 一些飘落的叶子 -->
                <path d="M200,350 Q210,360 200,370" stroke="#4caf50" stroke-width="3" fill="none" opacity="0.8" />
                <path d="M300,300 Q290,310 300,320" stroke="#81c784" stroke-width="3" fill="none" opacity="0.8" />
            </g>

            <!-- 外边框 -->
            <circle cx="250" cy="250" r="240" fill="none" stroke="#fff" stroke-width="10" opacity="0.5"/>
        </svg>
        ${level === 5 ? `<div class="tree-message show">${STATE.rules.reward || t('treeMsgReward')}</div>` : ''}
    `;

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        .float-slow { animation: float 6s ease-in-out infinite; }
        .float-med { animation: float 5s ease-in-out infinite reverse; }
        .sway { transform-origin: bottom center; animation: sway 4s ease-in-out infinite; }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
        @keyframes sway {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(1deg); }
        }
        .tree-message.show {
            display: block;
        }
    `;
    container.appendChild(style);
}

function resizeCanvas() {
    // SVG会自动响应，不需要手动resize
    renderTree();
}

window.onload = init;

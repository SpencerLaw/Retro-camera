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
    const incompleteGrid = document.getElementById('incomplete-grid');
    const completedGrid = document.getElementById('completed-grid');
    const incompleteCount = document.getElementById('incomplete-count');
    const completedCount = document.getElementById('completed-count');

    if (!incompleteGrid || !completedGrid) return;

    incompleteGrid.innerHTML = '';
    completedGrid.innerHTML = '';

    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;

    if (STATE.students.length === 0) {
        incompleteGrid.innerHTML = `<div class="empty-state">${t('emptyState')}</div>`;
        if (incompleteCount) incompleteCount.textContent = '0人';
        if (completedCount) completedCount.textContent = '0人';
        return;
    }

    let incompleteNum = 0;
    let completedNum = 0;

    STATE.students.forEach((student, index) => {
        // 确保每个学生都有history数组
        if (!student.history || !Array.isArray(student.history) || student.history.length < 5) {
            student.history = [false, false, false, false, false];
        }

        const bubble = document.createElement('div');
        bubble.className = 'student-bubble';

        // 创建爱心SVG
        const heartSVG = `
            <svg class="heart-svg" width="100" height="100" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="strawberryPink-${index}" cx="30%" cy="30%" r="80%">
                        <stop offset="0%" stop-color="#ffbfd3" />
                        <stop offset="60%" stop-color="#ff6b95" />
                        <stop offset="100%" stop-color="#ff3366" />
                    </radialGradient>
                    <filter id="softShadow-${index}" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#ffb3c6" flood-opacity="0.5"/>
                    </filter>
                </defs>
                <path d="M100,175 C 40,115 20,85 20,60 C 20,25 50,15 75,15 C 92,15 100,25 100,30 C 100,25 108,15 125,15 C 150,15 180,25 180,60 C 180,85 160,115 100,175 Z"
                      fill="url(#strawberryPink-${index})"
                      stroke="#ff3366" stroke-width="4" stroke-linejoin="round"
                      filter="url(#softShadow-${index})" />
                <ellipse cx="60" cy="50" rx="12" ry="20" fill="#ffffff" transform="rotate(-15 60 50)" opacity="0.9"/>
                <circle cx="82" cy="40" r="5" fill="#ffffff" opacity="0.8"/>
                <path d="M150,50 q10,10 5,20" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
            </svg>
        `;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = student.name;

        bubble.innerHTML = heartSVG;
        bubble.appendChild(nameDiv);

        // 根据完成状态分配到不同区域
        if (student.history[day] === true) {
            // 已完成 - 添加到已完成区域
            completedGrid.appendChild(bubble);
            completedNum++;
        } else {
            // 未完成 - 添加到未完成区域，并绑定点击事件
            // 使用立即执行函数确保正确捕获index
            (function(studentIndex) {
                bubble.onclick = function() {
                    const currentStudent = STATE.students[studentIndex];
                    if (confirm(t('confirmMsg').replace('{name}', currentStudent.name))) {
                        // 添加爱心散开动画
                        bubble.classList.add('heart-burst');

                        setTimeout(() => {
                            STATE.students[studentIndex].history[day] = true;
                            saveData();
                            renderUI();
                            renderTree();
                        }, 600);
                    }
                };
            })(index);

            incompleteGrid.appendChild(bubble);
            incompleteNum++;
        }
    });

    // 更新人数统计
    if (incompleteCount) incompleteCount.textContent = `${incompleteNum}人`;
    if (completedCount) completedCount.textContent = `${completedNum}人`;

    // 更新总进度条
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

// --- 大树渲染 (使用SVG) 根据当天完成学生数量 ---
function renderTree() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
    const totalStudents = STATE.students.length;
    let completedStudents = 0;

    if (totalStudents > 0) {
        completedStudents = STATE.students.filter(s => s.history && s.history[day] === true).length;
    }

    // 计算完成百分比
    const completionPercent = totalStudents > 0 ? (completedStudents / totalStudents) : 0;

    // 根据完成百分比确定生长阶段
    // 0-20%: 树枝
    // 20-50%: 树枝+小叶子
    // 50-80%: 树枝+中等叶子
    // 80-99%: 几乎完整的树
    // 100%: 完整大树 + 烟花庆祝
    let stage = 0;
    if (completionPercent < 0.2) stage = 0; // 树枝
    else if (completionPercent < 0.5) stage = 1; // 小叶子
    else if (completionPercent < 0.8) stage = 2; // 中等叶子
    else if (completionPercent < 1) stage = 3; // 大叶子
    else stage = 4; // 完整 + 烟花

    // 根据阶段调整参数
    const treeScale = 0.5 + stage * 0.12; // 从0.5到1.0
    const leafOpacity = Math.min(stage * 0.25, 1); // 从0到1
    const showFireworks = stage === 4;

    container.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
                <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#A1C4FD;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#C2E9FB;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#84fab0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#8fd3f4;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#6d4c41;stop-opacity:1" />
                    <stop offset="40%" style="stop-color:#8d6e63;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#5d4037;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="leafDark" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2e7d32;stop-opacity:1" />
                </radialGradient>
                <radialGradient id="leafLight" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:#b9f6ca;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#00c853;stop-opacity:1" />
                </radialGradient>
            </defs>

            <rect width="500" height="500" fill="url(#skyGradient)" />

                ${stage >= 1 ? `
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
                ` : ''}

                ${stage >= 2 ? `
                <circle cx="400" cy="80" r="40" fill="#fff9c4" opacity="0.6" />
                <circle cx="400" cy="80" r="25" fill="#fff176" />
                ` : ''}

                <path d="M-50,400 Q100,350 250,420 T550,400 V550 H-50 Z" fill="url(#groundGradient)" />
                ${stage >= 1 ? `<path d="M-50,450 Q200,420 550,480 V550 H-50 Z" fill="#66bb6a" opacity="0.3" />` : ''}

                <g transform="translate(250, 420) scale(${treeScale})">
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

                    <path d="M-20,0 Q-10,-80 -5,-150 L5,-150 Q15,-80 20,0 Z" fill="url(#trunkGradient)" />

                    ${stage >= 1 ? `
                    <g class="sway">
                        <circle cx="-50" cy="-140" r="${30 + stage * 5}" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="50" cy="-160" r="${35 + stage * 5}" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="0" cy="-210" r="${40 + stage * 5}" fill="url(#leafDark)" opacity="${leafOpacity}" />

                        ${stage >= 2 ? `
                        <circle cx="-30" cy="-170" r="${30 + stage * 5}" fill="url(#leafLight)" opacity="${Math.min(leafOpacity * 0.9, 1)}" />
                        <circle cx="30" cy="-190" r="${30 + stage * 5}" fill="url(#leafLight)" opacity="${Math.min(leafOpacity * 0.9, 1)}" />
                        ` : ''}

                        ${stage >= 3 ? `
                        <circle cx="0" cy="-230" r="${25 + stage * 5}" fill="url(#leafLight)" opacity="${leafOpacity}" />
                        <circle cx="-40" cy="-190" r="${20 + stage * 5}" fill="#b9f6ca" opacity="${Math.min(leafOpacity * 0.6, 1)}" />
                        ` : ''}

                        ${stage >= 4 ? `
                        <circle cx="20" cy="-240" r="5" fill="#fff" opacity="0.6" />
                        <circle cx="-20" cy="-150" r="8" fill="#fff" opacity="0.4" />
                        ` : ''}
                    </g>
                    ` : ''}
                </g>

                ${stage >= 1 ? `
                <path d="M200,350 Q210,360 200,370" stroke="#4caf50" stroke-width="3" fill="none" opacity="0.8" />
                <path d="M300,300 Q290,310 300,320" stroke="#81c784" stroke-width="3" fill="none" opacity="0.8" />
                ` : ''}

                ${showFireworks ? renderFireworks() : ''}
        </svg>
        ${showFireworks ? `<div class="tree-message show celebrate">${STATE.rules.reward || '🎉 全班完成！太棒了！'}</div>` : ''}
    `;

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
        .tree-message.celebrate {
            animation: celebratePulse 1s ease-in-out infinite;
        }
        @keyframes celebratePulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }
    `;
    container.appendChild(style);
}

// 烟花效果 SVG
function renderFireworks() {
    return `
        <!-- 烟花效果 -->
        <g class="firework" opacity="0.9">
            <circle cx="150" cy="100" r="3" fill="#ff6b95">
                <animate attributeName="r" from="0" to="40" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="350" cy="120" r="3" fill="#ffd700">
                <animate attributeName="r" from="0" to="45" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="1" to="0" dur="1.8s" begin="0.3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="250" cy="80" r="3" fill="#00c853">
                <animate attributeName="r" from="0" to="50" dur="2s" begin="0.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="1" to="0" dur="2s" begin="0.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="180" cy="150" r="3" fill="#667eea">
                <animate attributeName="r" from="0" to="35" dur="1.6s" begin="0.9s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="1" to="0" dur="1.6s" begin="0.9s" repeatCount="indefinite"/>
            </circle>
            <circle cx="320" cy="160" r="3" fill="#ff758c">
                <animate attributeName="r" from="0" to="42" dur="1.7s" begin="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="1" to="0" dur="1.7s" begin="1.2s" repeatCount="indefinite"/>
            </circle>
        </g>

        <!-- 星星闪烁效果 -->
        <g class="stars">
            <path d="M 100,140 L 102,145 L 107,145 L 103,148 L 105,153 L 100,150 L 95,153 L 97,148 L 93,145 L 98,145 Z" fill="#fff176">
                <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M 380,100 L 382,105 L 387,105 L 383,108 L 385,113 L 380,110 L 375,113 L 377,108 L 373,105 L 378,105 Z" fill="#fff176">
                <animate attributeName="opacity" values="0;1;0" dur="2.5s" begin="0.5s" repeatCount="indefinite"/>
            </path>
            <path d="M 280,130 L 282,135 L 287,135 L 283,138 L 285,143 L 280,140 L 275,143 L 277,138 L 273,135 L 278,135 Z" fill="#fff176">
                <animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="1s" repeatCount="indefinite"/>
            </path>
        </g>
    `;
}

function resizeCanvas() {
    // SVG会自动响应，不需要手动resize
    renderTree();
}

window.onload = init;

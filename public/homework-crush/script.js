/**
 * 作业消消乐 - 终极流畅版 (解决一切卡死问题)
 */

(function(){
    // 1. 救命代码：第一时间尝试隐藏黑屏
    const fastHideGate = () => {
        const gate = document.getElementById('gatekeeper-screen');
        if (gate) gate.style.display = 'none';
    };
    fastHideGate();
    setTimeout(fastHideGate, 100);
    setTimeout(fastHideGate, 500);

    // 2. 安全的数据加载 (带防崩溃保护)
    const safeGetItem = (key, defaultVal) => {
        try {
            const val = localStorage.getItem(key);
            if (!val) return defaultVal;
            return JSON.parse(val);
        } catch (e) {
            console.error('Data corrupted for key:', key);
            return defaultVal;
        }
    };

    const STATE = {
        licenseCode: localStorage.getItem('hc_license') || null,
        isVerified: localStorage.getItem('hc_verified') === 'true',
        students: safeGetItem('hc_students', []),
        rules: safeGetItem('hc_rules', {reward: "", punishment: ""}),
        todayIndex: 0,
        lang: localStorage.getItem('global-language') || 'zh-CN'
    };

    // ... 其余逻辑保持不变但确保使用反引号 ...
    const t = (k, params = {}) => {
        const data = window.TRANSLATIONS || {};
        const langData = data[STATE.lang] || data['zh-CN'] || {};
        let text = langData[k] || k;
        for (const [key, val] of Object.entries(params)) {
            text = text.replace(`{${key}}`, val);
        }
        return text;
    };

    const applyTranslations = () => {
        try {
            document.title = t('title');
            const ids = {
                'auth-title-text': 'title', 'auth-subtitle-text': 'subtitle', 'verify-btn': 'verifyBtn',
                'app-header-title': 'headerTitle', 'reset-day-btn': 'startNewDay', 'daily-task-title': 'dailyTask',
                'incomplete-homework-title': 'incompleteHomework', 'completed-homework-title': 'completedHomework',
                'reward-label': 'rewardLabel', 'punishment-label': 'punishmentLabel', 'save-rules-btn': 'saveRules',
                'import-btn': 'importBtn', 'clear-data-btn': 'clearDataBtn'
            };
            for (const [id, key] of Object.entries(ids)) {
                const el = document.getElementById(id);
                if (el) el.textContent = t(key);
            }
            const licInput = document.getElementById('license-input');
            if (licInput) licInput.placeholder = t('placeholder');
            const rewardInput = document.getElementById('reward-text');
            if (rewardInput) rewardInput.placeholder = t('rewardPlaceholder');
            const punishInput = document.getElementById('punishment-text');
            if (punishInput) punishInput.placeholder = t('punishmentPlaceholder');
            const studentInput = document.getElementById('student-list-input');
            if (studentInput) studentInput.placeholder = t('manualPlaceholder');
        } catch (e) { console.error('Translation error', e); }
    };

    const forceExit = (msg) => {
        localStorage.setItem('hc_verified', 'false');
        localStorage.removeItem('hc_license');
        document.body.innerHTML = `<div style="background:#000;color:#ff416c;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;">
            <h1>${t('authExpired')}</h1><p>${msg}</p>
            <button onclick="window.location.replace('/')" style="margin-top:20px;padding:10px 20px;">返回首页</button>
        </div>`;
    };

    function saveData() {
        try {
            localStorage.setItem('hc_students', JSON.stringify(STATE.students));
            localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
            localStorage.setItem('hc_verified', 'true');
            localStorage.setItem('hc_license', STATE.licenseCode);
        } catch(e) {}
    }

    function createStudentBubble(student, index, isDone, day) {
        const bubble = document.createElement('div');
        bubble.className = `student-bubble ${isDone ? 'done' : ''}`;
        const heartSVG = `
            <svg class="heart-svg" width="100" height="100" viewBox="0 0 200 200">
                <defs>
                    <radialGradient id="strawberry-${index}" cx="30%" cy="30%" r="80%">
                        <stop offset="0%" stop-color="#ffbfd3" />
                        <stop offset="60%" stop-color="#ff6b95" />
                        <stop offset="100%" stop-color="#ff3366" />
                    </radialGradient>
                </defs>
                <path d="M100,175 C 40,115 20,85 20,60 C 20,25 50,15 75,15 C 92,15 100,25 100,30 C 100,25 108,15 125,15 C 150,15 180,25 180,60 C 180,85 160,115 100,175 Z"
                      fill="${isDone ? 'url(#strawberry-' + index + ')' : '#ffdce5'}" 
                      stroke="#ff3366" stroke-width="4" />
                <ellipse cx="60" cy="50" rx="12" ry="20" fill="#ffffff" transform="rotate(-15 60 50)" opacity="${isDone ? '0.8' : '0.4'}"/>
            </svg>`;
        bubble.innerHTML = heartSVG + `<div class="name" style="color: ${isDone ? '#374151' : '#a36d7d'}">${student.name}</div>`;
        if (!isDone) {
            bubble.onclick = () => {
                const modal = document.getElementById('confirm-modal');
                const yesBtn = document.getElementById('confirm-yes-btn');
                const noBtn = document.getElementById('confirm-no-btn');
                document.getElementById('confirm-title').textContent = t('confirmDoneTitle');
                document.getElementById('confirm-message').textContent = t('confirmDoneMsg', {name: student.name});
                modal.classList.remove('hidden');
                yesBtn.onclick = () => {
                    modal.classList.add('hidden');
                    bubble.classList.add('heart-burst');
                    setTimeout(() => { student.history[day] = true; saveData(); renderUI(); renderTree(); }, 600);
                };
                noBtn.onclick = () => modal.classList.add('hidden');
            };
        }
        return bubble;
    }

    function renderUI() {
        const incGrid = document.getElementById('incomplete-grid');
        const comGrid = document.getElementById('completed-grid');
        if (!incGrid || !comGrid) return;
        incGrid.innerHTML = ''; comGrid.innerHTML = '';
        const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
        let doneNum = 0;
        STATE.students.forEach((student, index) => {
            if (!student.history) student.history = [false, false, false, false, false];
            const isDone = student.history[day];
            const bubble = createStudentBubble(student, index, isDone, day);
            if (isDone) { comGrid.appendChild(bubble); doneNum++; } else incGrid.appendChild(bubble);
        });
        document.getElementById('incomplete-count').textContent = (STATE.students.length - doneNum) + t('studentCountUnit');
        document.getElementById('completed-count').textContent = doneNum + t('studentCountUnit');
        const prog = document.getElementById('daily-progress');
        if (prog) prog.style.width = `${(doneNum / (STATE.students.length || 1)) * 100}%`;
    }

    function renderTree() {
        const container = document.getElementById('tree-container');
        if (!container) return;
        const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
        const total = STATE.students.length;
        const done = STATE.students.filter(s => s.history && s.history[day]).length;
        const percent = total > 0 ? done / total : 0;
        let stage = 0;
        if (percent < 0.2) stage = 0; else if (percent < 0.5) stage = 1; else if (percent < 0.8) stage = 2; else if (percent < 1) stage = 3; else stage = 4;
        const treeScale = 0.5 + stage * 0.12;
        const leafOpacity = Math.min(stage * 0.25, 1);
        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#A1C4FD"/><stop offset="100%" stop-color="#C2E9FB"/></linearGradient>
                    <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6d4c41"/><stop offset="40%" stop-color="#8d6e63"/><stop offset="100%" stop-color="#5d4037"/></linearGradient>
                    <radialGradient id="leafDark" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></radialGradient>
                    <radialGradient id="leafLight" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#b9f6ca"/><stop offset="100%" stop-color="#00c853"/></radialGradient>
                </defs>
                <rect width="500" height="500" fill="url(#skyGrad)" />
                <path d="M-50,400 Q100,350 250,420 T550,400 V550 H-50 Z" fill="#84fab0" />
                <g transform="translate(250, 420) scale(${treeScale})">
                    <path d="M-15,0 Q-10,-60 -30,-100 Q-40,-120 -80,-140 M-10,-60 Q5,-120 40,-160 M0,0 Q15,-50 25,-100 Q35,-150 80,-180 L0,0 Z" 
                          fill="none" stroke="url(#trunkGrad)" stroke-width="20" stroke-linecap="round" />
                    <path d="M-20,0 Q-10,-80 -5,-150 L5,-150 Q15,-80 20,0 Z" fill="url(#trunkGrad)" />
                    ${stage >= 1 ? `<g class="sway">
                        <circle cx="-50" cy="-140" r="40" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="50" cy="-160" r="45" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="0" cy="-210" r="50" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        ${stage >= 2 ? `<circle cx="-30" cy="-170" r="35" fill="url(#leafLight)" opacity="${leafOpacity}"/><circle cx="30" cy="-190" r="35" fill="url(#leafLight)" opacity="${leafOpacity}"/>` : ''}
                        ${stage >= 3 ? `<circle cx="0" cy="-230" r="30" fill="#b9f6ca" opacity="${leafOpacity}" />` : ''}
                    </g>` : ''}
                </g>
                ${stage === 4 ? `<g class="firework">
                    <circle cx="150" cy="100" r="5" fill="#ff6b95"><animate attributeName="r" from="0" to="50" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite"/></circle>
                    <circle cx="350" cy="120" r="5" fill="#ffd700"><animate attributeName="r" from="0" to="60" dur="2s" begin="0.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="2s" begin="0.5s" repeatCount="indefinite"/></circle>
                </g>` : ''}
            </svg>
            ${stage === 4 ? `<div class="celebrate-badge">${t('allDone')}</div>` : ''}
        `;
    }

    const initApp = () => {
        fastHideGate();
        const app = document.getElementById('app-screen');
        if (app) app.style.display = 'flex';
        const rew = document.getElementById('reward-text'); if(rew) rew.value = STATE.rules.reward || '';
        const pun = document.getElementById('punishment-text'); if(pun) pun.value = STATE.rules.punishment || '';
        
        // 绑定事件
        const darkBtn = document.getElementById('dark-mode-btn');
        if (darkBtn) {
            darkBtn.onclick = () => {
                const isD = document.body.classList.toggle('dark-mode');
                localStorage.setItem('hc_dark_mode', isD);
                darkBtn.textContent = isD ? '🌙' : '🌞';
            };
        }
        document.getElementById('settings-btn').onclick = () => {
            document.getElementById('settings-modal').classList.remove('hidden');
            document.getElementById('student-list-input').value = STATE.students.map(s => s.name).join('\n');
        };
        document.getElementById('import-btn').onclick = () => {
            const raw = document.getElementById('student-list-input').value;
            const names = Array.from(new Set(raw.split('\n').map(n => n.trim()).filter(n => n)));
            if (names.length > 0) {
                STATE.students = names.map(n => ({ name: n, history: [false,false,false,false,false] }));
                saveData(); document.getElementById('settings-modal').classList.add('hidden');
                renderUI(); renderTree();
            }
        };
        renderUI(); renderTree();
    };

    async function validateLicense() {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        try {
            const res = await fetch('/api/verify-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseCode: STATE.licenseCode, deviceId: localStorage.getItem('hc_device_id') || 'hc-user' }),
                signal: controller.signal
            });
            clearTimeout(tid);
            const data = await res.json();
            if (!data.success) forceExit(data.message);
        } catch (e) { clearTimeout(tid); }
    }

    window.addEventListener('DOMContentLoaded', () => {
        applyTranslations();
        fastHideGate();

        if (STATE.isVerified && STATE.licenseCode) {
            initApp();
            validateLicense();
        } else {
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('verify-btn').onclick = async () => {
                const code = document.getElementById('license-input').value.trim();
                const res = await fetch('/api/verify-license', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ licenseCode: code, deviceId: 'hc-user' }) });
                const data = await res.json();
                if (data.success) { STATE.isVerified = true; STATE.licenseCode = code; saveData(); initApp(); } 
                else alert(data.message);
            };
        }
        
        // 时钟
        setInterval(() => {
            const d = new Date();
            const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
            const el = document.getElementById('current-time'); if(el) el.textContent = timeStr;
            const dayIdx = d.getDay(); STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;
        }, 1000);
    });
})();
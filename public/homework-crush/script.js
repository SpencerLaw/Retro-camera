/**
 * 作业消消乐 - 视觉巅峰版 (修复位置与配色)
 */

(function(){
    const STATE = {
        licenseCode: localStorage.getItem('hc_license') || null,
        isVerified: localStorage.getItem('hc_verified') === 'true',
        students: JSON.parse(localStorage.getItem('hc_students') || '[]'),
        rules: JSON.parse(localStorage.getItem('hc_rules') || '{"reward":"","punishment":""}'),
        todayIndex: 0,
        lang: localStorage.getItem('global-language') || 'zh-CN'
    };

    const t = (k) => {
        const data = window.TRANSLATIONS || {};
        const langData = data[STATE.lang] || data['zh-CN'] || {};
        return langData[k] || k;
    };

    const forceExit = (msg) => {
        localStorage.setItem('hc_verified', 'false');
        localStorage.removeItem('hc_license');
        document.body.innerHTML = `<div style="background:#000;color:#ff416c;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;">
            <h1 style="font-size:3rem">⚠️ 授权失效</h1>
            <p style="font-size:1.5rem; margin:20px 0;">${msg}</p>
            <div style="font-size:1.2rem; color:#666">4秒后自动返回首页...</div>
        </div>`;
        setTimeout(() => { window.location.replace('/'); }, 4000);
    };

    function saveData() {
        localStorage.setItem('hc_students', JSON.stringify(STATE.students));
        localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
        localStorage.setItem('hc_verified', 'true');
        localStorage.setItem('hc_license', STATE.licenseCode);
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
            </svg>
        `;

        bubble.innerHTML = heartSVG + `<div class="name" style="color: ${isDone ? '#ff3366' : '#a36d7d'}">${student.name}</div>`;

        if (!isDone) {
            bubble.onclick = () => {
                if (confirm(`确认 ${student.name} 完成了吗？`)) {
                    bubble.classList.add('heart-burst');
                    setTimeout(() => {
                        student.history[day] = true;
                        saveData();
                        renderUI();
                        renderTree();
                    }, 600);
                }
            };
        }
        return bubble;
    }

    function renderUI() {
        const incompleteGrid = document.getElementById('incomplete-grid');
        const completedGrid = document.getElementById('completed-grid');
        if (!incompleteGrid || !completedGrid) return;

        incompleteGrid.innerHTML = '';
        completedGrid.innerHTML = '';
        const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;

        let doneNum = 0;
        STATE.students.forEach((student, index) => {
            if (!student.history) student.history = [false, false, false, false, false];
            const isDone = student.history[day];
            const bubble = createStudentBubble(student, index, isDone, day);
            if (isDone) { completedGrid.appendChild(bubble); doneNum++; }
            else { incompleteGrid.appendChild(bubble); }
        });

        document.getElementById('incomplete-count').textContent = (STATE.students.length - doneNum) + '人';
        document.getElementById('completed-count').textContent = doneNum + '人';
        const progress = document.getElementById('daily-progress');
        if (progress) progress.style.width = `${(doneNum / STATE.students.length) * 100}%`;
    }

    function renderTree() {
        const container = document.getElementById('tree-container');
        if (!container) return;
        const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
        const total = STATE.students.length;
        const done = STATE.students.filter(s => s.history && s.history[day]).length;
        const percent = total > 0 ? done / total : 0;

        let stage = 0;
        if (percent < 0.2) stage = 0;
        else if (percent < 0.5) stage = 1;
        else if (percent < 0.8) stage = 2;
        else if (percent < 1) stage = 3;
        else stage = 4;

        const treeScale = 0.5 + stage * 0.12;
        const leafOpacity = Math.min(stage * 0.25, 1);

        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#A1C4FD"/><stop offset="100%" stop-color="#C2E9FB"/></linearGradient>
                    <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%" ><stop offset="0%" stop-color="#6d4c41"/><stop offset="40%" stop-color="#8d6e63"/><stop offset="100%" stop-color="#5d4037"/></linearGradient>
                    <radialGradient id="leafDark" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></radialGradient>
                    <radialGradient id="leafLight" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#b9f6ca"/><stop offset="100%" stop-color="#00c853"/></radialGradient>
                </defs>
                <rect width="500" height="500" fill="url(#skyGrad)" />
                <path d="M-50,400 Q100,350 250,420 T550,400 V550 H-50 Z" fill="#84fab0" />
                <g transform="translate(250, 420) scale(${treeScale})">
                    <path d="M-15,0 Q-10,-60 -30,-100 Q-40,-120 -80,-140 M-10,-60 Q5,-120 40,-160 M0,0 Q15,-50 25,-100 Q35,-150 80,-180 L0,0 Z" 
                          fill="none" stroke="url(#trunkGrad)" stroke-width="20" stroke-linecap="round" />
                    <path d="M-20,0 Q-10,-80 -5,-150 L5,-150 Q15,-80 20,0 Z" fill="url(#trunkGrad)" />
                    ${stage >= 1 ? `
                    <g class="sway">
                        <circle cx="-50" cy="-140" r="40" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="50" cy="-160" r="45" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        <circle cx="0" cy="-210" r="50" fill="url(#leafDark)" opacity="${leafOpacity}" />
                        ${stage >= 2 ? `
                        <circle cx="-30" cy="-170" r="35" fill="url(#leafLight)" opacity="${leafOpacity}"/>
                        <circle cx="30" cy="-190" r="35" fill="url(#leafLight)" opacity="${leafOpacity}"/>` : ''}
                        ${stage >= 3 ? `
                        <circle cx="0" cy="-230" r="30" fill="#b9f6ca" opacity="${leafOpacity}"/>` : ''}
                    </g>` : ''}
                </g>
                ${stage === 4 ? `
                    <g class="firework">
                        <circle cx="150" cy="100" r="5" fill="#ff6b95"><animate attributeName="r" from="0" to="50" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite"/></circle>
                        <circle cx="350" cy="120" r="5" fill="#ffd700"><animate attributeName="r" from="0" to="60" dur="2s" begin="0.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="2s" begin="0.5s" repeatCount="indefinite"/></circle>
                    </g>` : ''}
            </svg>
            ${stage === 4 ? `<div class="celebrate-badge">🎉 全班完成！</div>` : ''}
        `;
    }

    function bindFunctionalEvents() {
        document.getElementById('settings-btn').onclick = () => {
            document.getElementById('settings-modal').classList.remove('hidden');
            document.getElementById('student-list-input').value = STATE.students.map(s => s.name).join('\n');
        };
        document.querySelectorAll('.close-modal-btn, .modal-backdrop').forEach(el => {
            el.onclick = () => document.getElementById('settings-modal').classList.add('hidden');
        });
        document.getElementById('import-btn').onclick = () => {
            const raw = document.getElementById('student-list-input').value;
            const names = Array.from(new Set(raw.split('\n').map(n => n.trim()).filter(n => n)));
            if (names.length > 0) {
                STATE.students = names.map(n => ({ name: n, history: [false,false,false,false,false] }));
                saveData();
                document.getElementById('settings-modal').classList.add('hidden');
                renderUI(); renderTree();
            }
        };
        document.getElementById('clear-data-btn').onclick = () => {
            if (confirm('确定清空所有数据？')) { STATE.students = []; saveData(); renderUI(); renderTree(); }
        };
        document.getElementById('logout-btn').onclick = () => { localStorage.clear(); window.location.href = '/'; };
        document.getElementById('reset-day-btn').onclick = () => {
            if(confirm(t('resetDayConfirm'))) {
                const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
                STATE.students.forEach(s => { if(!s.history) s.history=[false,false,false,false,false]; s.history[day] = false; });
                saveData(); renderUI(); renderTree();
            }
        };
        document.getElementById('fullscreen-btn').onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };
        document.getElementById('save-rules-btn').onclick = () => {
            STATE.rules.reward = document.getElementById('reward-text').value;
            STATE.rules.punishment = document.getElementById('punishment-text').value;
            saveData(); alert(t('rulesSaved'));
        };
    }

    const initApp = () => {
        const gate = document.getElementById('gatekeeper-screen');
        if (gate) gate.style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        document.getElementById('reward-text').value = STATE.rules.reward || '';
        document.getElementById('punishment-text').value = STATE.rules.punishment || '';
        bindFunctionalEvents();
        renderUI(); renderTree();
    };

    async function validateLicense() {
        try {
            const res = await fetch('/api/verify-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseCode: STATE.licenseCode,
                    deviceId: localStorage.getItem('hc_device_id') || 'hc-fixed'
                })
            });
            const data = await res.json();
            if (data.success) initApp(); else forceExit(data.message);
        } catch (e) { initApp(); }
    }

    window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.global-back-btn').forEach(btn => {
            btn.onclick = (e) => { e.preventDefault(); window.location.href = '/'; };
        });
        const d = new Date();
        const dayIdx = d.getDay();
        STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;
        const dateEl = document.getElementById('current-date');
        if(dateEl) dateEl.textContent = d.toLocaleDateString();
        if (STATE.isVerified && STATE.licenseCode) validateLicense();
        else {
            const gate = document.getElementById('gatekeeper-screen');
            if (gate) gate.style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('verify-btn').onclick = async () => {
                const code = document.getElementById('license-input').value.trim();
                if (!code.toUpperCase().startsWith('ZY')) return alert('需 ZY 授权码');
                try {
                    const res = await fetch('/api/verify-license', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ licenseCode: code, deviceId: 'hc-user' }) });
                    const data = await res.json();
                    if (data.success) { STATE.isVerified = true; STATE.licenseCode = code; saveData(); initApp(); }
                    else alert(data.message);
                } catch(e) { alert("网络异常"); }
            };
        }
    });
})();

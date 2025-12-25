/**
 * 作业消消乐 - 商业加固完整版
 */

(function(){
    // 1. 全局状态
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

    // 2. 安全熔断与跳转
    const forceExit = (msg) => {
        localStorage.setItem('hc_verified', 'false');
        localStorage.removeItem('hc_license');
        document.body.innerHTML = `<div style="background:#000;color:#ff416c;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;font-family:sans-serif;">
            <h1 style="font-size:3rem">⚠️ 授权失效</h1>
            <p style="font-size:1.5rem; margin:20px 0;">${msg}</p>
            <div style="font-size:1.2rem; color:#666">4秒后自动返回首页...</div>
        </div>`;
        setTimeout(() => { window.location.replace('/'); }, 4000);
    };

    // 3. UI 渲染逻辑
    function saveData() {
        localStorage.setItem('hc_students', JSON.stringify(STATE.students));
        localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
        localStorage.setItem('hc_verified', 'true');
        localStorage.setItem('hc_license', STATE.licenseCode);
    }

    function renderUI() {
        const incompleteGrid = document.getElementById('incomplete-grid');
        const completedGrid = document.getElementById('completed-grid');
        if (!incompleteGrid || !completedGrid) return;

        incompleteGrid.innerHTML = '';
        completedGrid.innerHTML = '';
        const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;

        if (STATE.students.length === 0) {
            incompleteGrid.innerHTML = `<div style="padding:20px;color:#999;text-align:center;grid-column:1/-1;">${t('emptyState')}</div>`;
            return;
        }

        let doneCount = 0;
        STATE.students.forEach((student, index) => {
            if (!student.history) student.history = [false, false, false, false, false];
            const isDone = student.history[day];
            
            const bubble = document.createElement('div');
            bubble.className = 'student-bubble';
            bubble.innerHTML = `
                <svg class="heart-svg" width="80" height="80" viewBox="0 0 200 200">
                    <path d="M100,175 C 40,115 20,85 20,60 C 20,25 50,15 75,15 C 92,15 100,25 100,30 C 100,25 108,15 125,15 C 150,15 180,25 180,60 C 180,85 160,115 100,175 Z" 
                          fill="${isDone ? '#ff3366' : '#eee'}" stroke="#ff3366" stroke-width="4"/>
                </svg>
                <div class="name" style="color:${isDone ? '#fff' : '#666'}">${student.name}</div>
            `;

            if (isDone) {
                completedGrid.appendChild(bubble);
                doneCount++;
            } else {
                bubble.onclick = () => {
                    if (confirm("确认 " + student.name + " 完成了吗？")) {
                        student.history[day] = true;
                        saveData();
                        renderUI();
                        renderTree();
                    }
                };
                incompleteGrid.appendChild(bubble);
            }
        });

        document.getElementById('incomplete-count').textContent = (STATE.students.length - doneCount) + '人';
        document.getElementById('completed-count').textContent = doneCount + '人';
        document.getElementById('daily-progress').style.width = `${(doneCount / STATE.students.length) * 100}%`;
    }

    function renderTree() {
        const container = document.getElementById('tree-container');
        if (!container) return;
        const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
        const done = STATE.students.filter(s => s.history && s.history[day]).length;
        const percent = STATE.students.length > 0 ? done / STATE.students.length : 0;
        
        // 极简大树 SVG
        container.innerHTML = `
            <svg viewBox="0 0 200 200" style="width:100%; height:100%">
                <rect x="95" y="${200 - (percent * 150)}" width="10" height="${percent * 150}" fill="#8d6e63" />
                ${percent > 0.2 ? `<circle cx="100" cy="50" r="${percent * 40}" fill="#84fab0" opacity="0.8"/>` : ''}
            </svg>
            ${percent >= 1 ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2rem;">🎉 全员完成!</div>' : ''}
        `;
    }

    // 4. 事件绑定
    function bindFunctionalEvents() {
        // 设置按钮与弹窗
        const settingsBtn = document.getElementById('settings-btn');
        const modal = document.getElementById('settings-modal');
        if (settingsBtn && modal) {
            settingsBtn.onclick = () => {
                modal.classList.remove('hidden');
                document.getElementById('student-list-input').value = STATE.students.map(s => s.name).join('\n');
            };
        }

        // 关闭弹窗
        document.querySelectorAll('.close-modal-btn, .modal-backdrop').forEach(el => {
            el.onclick = () => modal.classList.add('hidden');
        });

        // 导入名单
        document.getElementById('import-btn').onclick = () => {
            const raw = document.getElementById('student-list-input').value;
            const names = Array.from(new Set(raw.split('\n').map(n => n.trim()).filter(n => n)));
            if (names.length > 0) {
                STATE.students = names.map(n => ({ name: n, history: [false,false,false,false,false] }));
                saveData();
                modal.classList.add('hidden');
                renderUI();
                renderTree();
            }
        };

        // 清空数据
        document.getElementById('clear-data-btn').onclick = () => {
            if (confirm('确定清空所有数据？')) {
                STATE.students = [];
                saveData();
                renderUI();
                renderTree();
            }
        };

        // 退出按钮
        document.getElementById('logout-btn').onclick = () => {
            localStorage.clear();
            window.location.href = '/';
        };

        // 开始新一天
        document.getElementById('reset-day-btn').onclick = () => {
            if(confirm(t('resetDayConfirm'))) {
                const day = STATE.todayIndex > 4 ? 4 : STATE.todayIndex;
                STATE.students.forEach(s => s.history[day] = false);
                saveData();
                renderUI();
                renderTree();
            }
        };

        // 全屏
        document.getElementById('fullscreen-btn').onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };

        // 保存规则
        document.getElementById('save-rules-btn').onclick = () => {
            STATE.rules.reward = document.getElementById('reward-text').value;
            STATE.rules.punishment = document.getElementById('punishment-text').value;
            saveData();
            alert(t('rulesSaved'));
        };
    }

    const initApp = () => {
        const gate = document.getElementById('gatekeeper-screen');
        if (gate) gate.style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        
        // 填充规则数据
        document.getElementById('reward-text').value = STATE.rules.reward || '';
        document.getElementById('punishment-text').value = STATE.rules.punishment || '';

        bindFunctionalEvents();
        renderUI();
        renderTree();
    };

    async function validateLicense() {
        try {
            const res = await fetch('/api/verify-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseCode: STATE.licenseCode,
                    deviceId: localStorage.getItem('hc_device_id') || 'hc-user'
                })
            });
            const data = await res.json();
            if (data.success) initApp();
            else forceExit(data.message);
        } catch (e) { initApp(); }
    }

    // 初始化启动
    window.addEventListener('DOMContentLoaded', () => {
        // 设置日期
        const d = new Date();
        const dayIdx = d.getDay();
        STATE.todayIndex = dayIdx === 0 ? 6 : dayIdx - 1;
        document.getElementById('current-date').textContent = d.toLocaleDateString();

        if (STATE.isVerified && STATE.licenseCode) {
            validateLicense();
        } else {
            const gate = document.getElementById('gatekeeper-screen');
            if (gate) gate.style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
            
            // 登录校验
            document.getElementById('verify-btn').onclick = async () => {
                const code = document.getElementById('license-input').value.trim();
                if (!code.toUpperCase().startsWith('ZY')) return alert('需要以 ZY 开头的授权码');
                try {
                    const res = await fetch('/api/verify-license', { 
                        method: 'POST', 
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ licenseCode: code, deviceId: 'hc-' + Math.random().toString(36).substr(2,5) })
                    });
                    const data = await res.json();
                    if (data.success) {
                        STATE.isVerified = true; STATE.licenseCode = code;
                        saveData(); initApp();
                    } else alert(data.message);
                } catch(e) { alert("网络异常"); }
            };
        }
    });
})();

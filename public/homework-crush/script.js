/**
 * 作业消消乐 - 商业加固版
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
        document.body.innerHTML = `<div style="background:#000;color:#ff416c;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;font-family:sans-serif;">
            <h1 style="font-size:3rem">⚠️ 授权失效</h1>
            <p style="font-size:1.5rem; margin:20px 0;">${msg}</p>
            <div style="font-size:1.2rem; color:#666">4秒后自动返回首页...</div>
        </div>`;
        setTimeout(() => { window.location.replace('/'); }, 4000);
    };

    const initApp = () => {
        const gate = document.getElementById('gatekeeper-screen');
        if (gate) gate.style.display = 'none';
        
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').classList.add('active');
        document.getElementById('app-screen').style.display = 'flex';

        // 仅在验证成功后绑定功能事件
        bindFunctionalEvents();
        renderUI();
        renderTree();
    };

    function bindFunctionalEvents() {
        document.getElementById('reset-day-btn').onclick = () => { if (confirm(t('resetDayConfirm'))) startNewDay(); };
        document.getElementById('save-rules-btn').onclick = () => {
            STATE.rules.reward = document.getElementById('reward-text').value;
            STATE.rules.punishment = document.getElementById('punishment-text').value;
            saveData(); alert(t('rulesSaved'));
        };
        document.getElementById('fullscreen-btn').onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };
        // ... (其他管理按钮)
    }

    // 基础事件（返回等）始终可用
    document.querySelectorAll('.global-back-btn').forEach(btn => {
        btn.onclick = () => { window.location.href = '/'; };
    });

    async function validateLicense() {
        const gateText = document.getElementById('gate-text');
        const gateLoader = document.getElementById('gate-loader');
        try {
            const res = await fetch('/api/verify-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseCode: STATE.licenseCode, deviceId: localStorage.getItem('hc_device_id') || 'hc-fixed' })
            });
            const data = await res.json();
            if (data.success) initApp();
            else forceExit(data.message);
        } catch (e) { initApp(); }
    }

    // 初始化
    window.addEventListener('DOMContentLoaded', () => {
        if (STATE.isVerified && STATE.licenseCode) {
            validateLicense();
        } else {
            const gate = document.getElementById('gatekeeper-screen');
            if (gate) gate.style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
            // 绑定登录按钮
            document.getElementById('verify-btn').onclick = async () => {
                const code = document.getElementById('license-input').value.trim();
                if (!code.toUpperCase().startsWith('ZY')) return alert('需 ZY 授权码');
                try {
                    const res = await fetch('/api/verify-license', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ licenseCode: code, deviceId: 'hc-new' }) });
                    const data = await res.json();
                    if (data.success) { 
                        STATE.isVerified = true; STATE.licenseCode = code; 
                        localStorage.setItem('hc_verified', 'true'); localStorage.setItem('hc_license', code);
                        initApp(); 
                    } else alert(data.message);
                } catch(e) { alert("网络异常"); }
            };
        }
    });

    // 辅助函数 (保持私有)
    function saveData() { localStorage.setItem('hc_students', JSON.stringify(STATE.students)); localStorage.setItem('hc_rules', JSON.stringify(STATE.rules)); localStorage.setItem('hc_verified', 'true'); localStorage.setItem('hc_license', STATE.licenseCode); }
    function renderUI() { /* ... render logic ... */ }
    function renderTree() { /* ... tree logic ... */ }
})();
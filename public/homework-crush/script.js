/**
 * 作业消消乐 - 逻辑终极加固版
 * 1. 彻底解决引用共享问题 (Deep Clone)
 * 2. 强制实时保存 (Persistence Fix)
 * 3. 优化事件绑定与交互逻辑
 */
(function(){
    // 救命代码：立即隐藏黑屏
    var hideGate = function() {
        var g = document.getElementById('gatekeeper-screen');
        if (g) g.style.display = 'none';
    };
    hideGate();
    setTimeout(hideGate, 300);

    // 状态管理
    var STATE = {
        licenseCode: localStorage.getItem('hc_license') || null,
        isVerified: localStorage.getItem('hc_verified') === 'true',
        students: [],
        rules: {reward: "", punishment: ""},
        todayIndex: 0,
        lang: localStorage.getItem('global-language') || 'zh-CN'
    };

    // 数据持久化函数
    var saveData = function() {
        console.log('Saving Data...', STATE.students);
        localStorage.setItem('hc_students', JSON.stringify(STATE.students));
        localStorage.setItem('hc_rules', JSON.stringify(STATE.rules));
        localStorage.setItem('hc_verified', 'true');
        localStorage.setItem('hc_license', STATE.licenseCode);
    };

    // 【核心修复】强制数据体检与隔离
    var sanitizeData = function() {
        try {
            var raw = localStorage.getItem('hc_students');
            var list = raw ? JSON.parse(raw) : [];
            
            // 确保 list 是数组且每个对象独立
            STATE.students = list.map(function(s) {
                // 深度隔离 history 数组，防止引用污染
                var newHistory = [false, false, false, false, false, false, false];
                if (s.history && Array.isArray(s.history)) {
                    for (var i = 0; i < Math.min(s.history.length, 7); i++) {
                        newHistory[i] = !!s.history[i];
                    }
                }
                return {
                    name: s.name || '未知',
                    history: newHistory
                };
            });

            var rawRules = localStorage.getItem('hc_rules');
            STATE.rules = rawRules ? JSON.parse(rawRules) : {reward: "", punishment: ""};
            
            // 修正后立即保存一次，确保下次刷新读取的是干净的数据
            saveData();
        } catch(e) {
            console.error('Data Sanitize Error', e);
            STATE.students = [];
        }
    };

    // 翻译引擎
    var t = function(k, params) {
        var data = window.TRANSLATIONS || {};
        var langData = data[STATE.lang] || data['zh-CN'] || {};
        var text = langData[k] || k;
        if (params) {
            for (var key in params) {
                text = text.replace('{' + key + '}', params[key]);
            }
        }
        return text;
    };

    var applyTranslations = function() {
        var ids = {
            'auth-title-text': 'title', 'auth-subtitle-text': 'subtitle', 'verify-btn': 'verifyBtn',
            'app-header-title': 'headerTitle', 'reset-day-btn': 'startNewDay', 'daily-task-title': 'dailyTask',
            'incomplete-homework-title': 'incompleteHomework', 'completed-homework-title': 'completedHomework',
            'reward-label': 'rewardLabel', 'punishment-label': 'punishmentLabel', 'save-rules-btn': 'saveRules',
            'import-btn': 'importBtn', 'clear-data-btn': 'clearDataBtn'
        };
        for (var id in ids) {
            var el = document.getElementById(id);
            if (el) el.textContent = t(ids[id]);
        }
        var placeholders = {
            'license-input': 'placeholder', 'reward-text': 'rewardPlaceholder',
            'punishment-text': 'punishmentPlaceholder', 'student-list-input': 'manualPlaceholder'
        };
        for (var pid in placeholders) {
            var pel = document.getElementById(pid);
            if (pel) pel.placeholder = t(placeholders[pid]);
        }
    };

    // 自定义确认弹窗
    var showConfirm = function(title, msg, onYes) {
        var modal = document.getElementById('confirm-modal');
        if (!modal) return;
        document.getElementById('confirm-title').textContent = title || t('confirmTitle');
        document.getElementById('confirm-message').textContent = msg || t('confirmMsg');
        var yesBtn = document.getElementById('confirm-yes-btn');
        var noBtn = document.getElementById('confirm-no-btn');
        modal.classList.remove('hidden');
        yesBtn.onclick = function() {
            modal.classList.add('hidden');
            if (onYes) onYes();
        };
        noBtn.onclick = function() {
            modal.classList.add('hidden');
        };
    };

    // 渲染逻辑
    var createStudentBubble = function(student, index, isDone, day) {
        var bubble = document.createElement('div');
        bubble.className = 'student-bubble ' + (isDone ? 'done' : '');
        var gradId = 'strawberry-' + index;
        var heartSVG = '<svg class="heart-svg" width="100" height="100" viewBox="0 0 200 200"><defs><radialGradient id="' + gradId + '" cx="30%" cy="30%" r="80%"><stop offset="0%" stop-color="#ffbfd3" /><stop offset="60%" stop-color="#ff6b95" /><stop offset="100%" stop-color="#ff3366" /></radialGradient></defs><path d="M100,175 C 40,115 20,85 20,60 C 20,25 50,15 75,15 C 92,15 100,25 100,30 C 100,25 108,15 125,15 C 150,15 180,25 180,60 C 180,85 160,115 100,175 Z" fill="' + (isDone ? 'url(#' + gradId + ')' : '#ffdce5') + '" stroke="#ff3366" stroke-width="4" /><ellipse cx="60" cy="50" rx="12" ry="20" fill="#ffffff" transform="rotate(-15 60 50)" opacity="' + (isDone ? '0.8' : '0.4') + '"/></svg>';
        bubble.innerHTML = heartSVG + '<div class="name" style="color: ' + (isDone ? '#374151' : '#a36d7d') + '">' + student.name + '</div>';
        
        if (!isDone) {
            bubble.onclick = function() {
                showConfirm(t('confirmDoneTitle'), t('confirmDoneMsg', {name: student.name}), function() {
                    bubble.classList.add('heart-burst');
                    setTimeout(function() {
                        student.history[day] = true;
                        saveData();
                        renderUI();
                        renderTree();
                    }, 600);
                });
            };
        }
        return bubble;
    };

    var renderUI = function() {
        var incGrid = document.getElementById('incomplete-grid');
        var comGrid = document.getElementById('completed-grid');
        if (!incGrid || !comGrid) return;
        incGrid.innerHTML = ''; comGrid.innerHTML = '';
        var day = STATE.todayIndex;
        var doneCount = 0;
        STATE.students.forEach(function(student, idx) {
            var isDone = student.history[day];
            var bubble = createStudentBubble(student, idx, isDone, day);
            if (isDone) { comGrid.appendChild(bubble); doneCount++; } 
            else { incGrid.appendChild(bubble); }
        });
        document.getElementById('incomplete-count').textContent = (STATE.students.length - doneCount) + t('studentCountUnit');
        document.getElementById('completed-count').textContent = doneCount + t('studentCountUnit');
        var progress = document.getElementById('daily-progress');
        if (progress) progress.style.width = (STATE.students.length > 0 ? (doneCount / STATE.students.length * 100) : 0) + '%';
    };

    var renderTree = function() {
        var container = document.getElementById('tree-container');
        if (!container) return;
        var day = STATE.todayIndex;
        var done = STATE.students.filter(function(s){ return s.history[day]; }).length;
        var percent = STATE.students.length > 0 ? done / STATE.students.length : 0;
        var stage = 0;
        if (percent < 0.2) stage = 0; else if (percent < 0.5) stage = 1; else if (percent < 0.8) stage = 2; else if (percent < 1) stage = 3; else stage = 4;
        var treeScale = 0.5 + stage * 0.12;
        var leafOpacity = Math.min(stage * 0.25, 1);
        var treeSVG = '<svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#A1C4FD"/><stop offset="100%" stop-color="#C2E9FB"/></linearGradient><linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6d4c41"/><stop offset="40%" stop-color="#8d6e63"/><stop offset="100%" stop-color="#5d4037"/></linearGradient><radialGradient id="leafDark" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></radialGradient><radialGradient id="leafLight" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#b9f6ca"/><stop offset="100%" stop-color="#00c853"/></radialGradient></defs><rect width="500" height="500" fill="url(#skyGrad)" /><path d="M-50,400 Q100,350 250,420 T550,400 V550 H-50 Z" fill="#84fab0" /><g transform="translate(250, 420) scale(' + treeScale + ')"><path d="M-15,0 Q-10,-60 -30,-100 Q-40,-120 -80,-140 M-10,-60 Q5,-120 40,-160 M0,0 Q15,-50 25,-100 Q35,-150 80,-180 L0,0 Z" fill="none" stroke="url(#trunkGrad)" stroke-width="20" stroke-linecap="round" /><path d="M-20,0 Q-10,-80 -5,-150 L5,-150 Q15,-80 20,0 Z" fill="url(#trunkGrad)" />';
        if (stage >= 1) {
            treeSVG += '<g class="sway"><circle cx="-50" cy="-140" r="40" fill="url(#leafDark)" opacity="' + leafOpacity + '" /><circle cx="50" cy="-160" r="45" fill="url(#leafDark)" opacity="' + leafOpacity + '" /><circle cx="0" cy="-210" r="50" fill="url(#leafDark)" opacity="' + leafOpacity + '" />';
            if (stage >= 2) treeSVG += '<circle cx="-30" cy="-170" r="35" fill="url(#leafLight)" opacity="' + leafOpacity + '"/><circle cx="30" cy="-190" r="35" fill="url(#leafLight)" opacity="' + leafOpacity + '"/>';
            if (stage >= 3) treeSVG += '<circle cx="0" cy="-230" r="30" fill="#b9f6ca" opacity="' + leafOpacity + '" />';
            treeSVG += '</g>';
        }
        treeSVG += '</g>';
        if (stage === 4) {
            treeSVG += '<g class="firework"><circle cx="150" cy="100" r="5" fill="#ff6b95"><animate attributeName="r" from="0" to="50" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="350" cy="120" r="5" fill="#ffd700"><animate attributeName="r" from="0" to="60" dur="2s" begin="0.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="1" to="0" dur="2s" begin="0.5s" repeatCount="indefinite"/></circle></g>';
        }
        treeSVG += '</svg>';
        if (stage === 4) treeSVG += '<div class="celebrate-badge">' + t('allDone') + '</div>';
        container.innerHTML = treeSVG;
    };

    // 事件绑定
    var bindEvents = function() {
        console.log('Binding events...');
        document.getElementById('dark-mode-btn').onclick = function() {
            var isD = document.body.classList.toggle('dark-mode');
            localStorage.setItem('hc_dark_mode', isD);
            this.textContent = isD ? '🌙' : '🌞';
        };
        if (localStorage.getItem('hc_dark_mode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('dark-mode-btn').textContent = '🌙';
        }

        document.getElementById('fullscreen-btn').onclick = function() {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        };

        document.getElementById('settings-btn').onclick = function() {
            document.getElementById('settings-modal').classList.remove('hidden');
            document.getElementById('student-list-input').value = STATE.students.map(function(s){ return s.name; }).join('\n');
        };

        document.querySelectorAll('.close-modal-btn, .modal-backdrop').forEach(function(el){
            el.onclick = function(){ document.getElementById('settings-modal').classList.add('hidden'); };
        });

        document.getElementById('import-btn').onclick = function() {
            var raw = document.getElementById('student-list-input').value;
            var names = raw.split('\n').map(function(n){ return n.trim(); }).filter(function(n){ return n; });
            if (names.length > 0) {
                // 【修复】导入时强制隔离 history
                STATE.students = names.map(function(n){ 
                    return { name: n, history: [false,false,false,false,false,false,false] }; 
                });
                saveData();
                document.getElementById('settings-modal').classList.add('hidden');
                renderUI(); renderTree();
                alert(t('importSuccess') || '导入成功！');
            }
        };

        document.getElementById('clear-data-btn').onclick = function() {
            showConfirm(t('confirmTitle'), t('clearDataConfirm'), function() {
                STATE.students = []; saveData(); renderUI(); renderTree();
            });
        };

        document.getElementById('reset-day-btn').onclick = function() {
            console.log('Reset button clicked');
            showConfirm(t('confirmTitle'), t('resetDayConfirm'), function() {
                var day = STATE.todayIndex;
                STATE.students.forEach(function(s){
                    if(s.history) s.history[day] = false;
                });
                saveData(); renderUI(); renderTree();
            });
        };

        document.getElementById('save-rules-btn').onclick = function() {
            STATE.rules.reward = document.getElementById('reward-text').value;
            STATE.rules.punishment = document.getElementById('punishment-text').value;
            saveData();
            alert(t('rulesSaved') || '规则已保存！');
        };

        document.querySelectorAll('.global-back-btn').forEach(function(btn){
            btn.onclick = function(e){ e.preventDefault(); window.location.href = '/'; };
        });
    };

    var updateClock = function() {
        var d = new Date();
        var timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
        var dateStr = d.getFullYear() + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getDate().toString().padStart(2, '0');
        if (document.getElementById('current-time')) document.getElementById('current-time').textContent = timeStr;
        if (document.getElementById('current-date')) document.getElementById('current-date').textContent = dateStr;
        var dayIdx = d.getDay(); 
        STATE.todayIndex = (dayIdx === 0 ? 6 : dayIdx - 1);
    };

    var initApp = function() {
        hideGate();
        document.getElementById('app-screen').style.display = 'flex';
        document.getElementById('reward-text').value = STATE.rules.reward || "";
        document.getElementById('punishment-text').value = STATE.rules.punishment || "";
        bindEvents();
        renderUI();
        renderTree();
    };

    window.addEventListener('DOMContentLoaded', function() {
        updateClock();
        setInterval(updateClock, 1000);
        applyTranslations();
        sanitizeData(); // 加载时立即体检数据

        if (STATE.isVerified && STATE.licenseCode) {
            initApp();
            fetch('/api/verify-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseCode: STATE.licenseCode, deviceId: localStorage.getItem('hc_device_id') || 'hc-user' })
            }).catch(function(){});
        } else {
            hideGate();
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('verify-btn').onclick = function() {
                var code = document.getElementById('license-input').value.trim();
                fetch('/api/verify-license', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ licenseCode: code, deviceId: 'hc-user' }) 
                })
                .then(function(r){ return r.json(); }).then(function(data){
                    if (data.success) { 
                        STATE.isVerified = true; 
                        STATE.licenseCode = code; 
                        saveData(); 
                        initApp(); 
                    } else alert(data.message);
                });
            };
        }
    });
})();

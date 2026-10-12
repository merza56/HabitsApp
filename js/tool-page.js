/**
 * HabitFlow Pro - Dedicated Tool Page Controller
 * Handles loading any of the 15 tools with full interactive interface,
 * two-way sync with habits/todos, sound generation, and scientific guide.
 */
(function() {
  'use strict';

  // 1. Resolve Active User with Multi-Key Fallback
  function resolveActiveUser() {
    let user = { id: 'default', username: 'عبدالله', avatar: '👤' };
    try {
      const users = JSON.parse(localStorage.getItem('habits_users_registry_v2') || '[]');
      const activeId = localStorage.getItem('habits_active_user_id_v2') || 
        (window.sessionStorage ? sessionStorage.getItem('habits_active_user_id_v2') : null);
      if (activeId && users.length) {
        const found = users.find(u => u.id === activeId);
        if (found) user = found;
      } else if (users.length) {
        user = users[0];
      }
    } catch(e) {}
    return user;
  }

  const currentUser = resolveActiveUser();

  const authHelper = {
    getUserStorageKey: function(key) {
      return key + '_usr_' + (currentUser.id || 'default');
    }
  };

  // Helper: Load user habits with multi-key fallback
  function loadUserHabits(uid) {
    try {
      const keys = [`habits_data_usr_${uid}`, `habits_usr_${uid}`, 'minimal_habits_data_v4'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch(e) {}
    return [
      { id: 'h_focus', name: 'جلسة تركيز عميق 🧠', category: 'عمل' },
      { id: 'h_read', name: 'قراءة كتاب مفيد 📖', category: 'تطوير' },
      { id: 'h_sport', name: 'تمارين ولياقة بدنية 🏃‍♂️', category: 'صحة' }
    ];
  }

  // Helper: Load user todos with multi-key fallback
  function loadUserTodos(uid) {
    try {
      const keys = [`todos_data_usr_${uid}`, `todos_usr_${uid}`, 'minimal_todos_data_v4'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    } catch(e) {}
    return {};
  }

  // Helper: Haptics & Toast
  function haptic(type = 'light') {
    if (!navigator.vibrate) return;
    try {
      if (type === 'light') navigator.vibrate(12);
      else if (type === 'medium') navigator.vibrate(28);
      else if (type === 'double') navigator.vibrate([15, 40, 15]);
    } catch(e) {}
  }

  function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  // Setup ToolsEngine
  let toolsEngine = null;
  if (window.HabitFlowToolsEngine) {
    const userHabits = loadUserHabits(currentUser.id);
    const userTodos = loadUserTodos(currentUser.id);

    const mockApp = {
      currentUser: currentUser,
      getStorageKey: function(key) {
        return authHelper.getUserStorageKey(key);
      },
      habits: userHabits,
      todos: userTodos,
      getTodayDateString: function() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },
      saveHabits: function() {
        try {
          localStorage.setItem(`habits_data_usr_${currentUser.id || 'default'}`, JSON.stringify(this.habits));
        } catch(e) {}
      },
      saveTodos: function() {
        try {
          localStorage.setItem(`todos_data_usr_${currentUser.id || 'default'}`, JSON.stringify(this.todos));
        } catch(e) {}
      },
      saveData: function() {
        this.saveHabits();
        this.saveTodos();
      },
      addXP: function(amount, reason) {
        try {
          const profileKey = authHelper.getUserStorageKey('profile');
          const p = JSON.parse(localStorage.getItem(profileKey) || '{"xp":0,"level":1}');
          p.xp = (p.xp || 0) + amount;
          p.level = Math.floor(p.xp / 100) + 1;
          localStorage.setItem(profileKey, JSON.stringify(p));
        } catch(e) {}
      },
      showToast: showToast,
      triggerHaptic: haptic
    };
    try {
      toolsEngine = new window.HabitFlowToolsEngine(mockApp);
    } catch(e) {}
  }

  // ------------------------------------------------------------------------
  // Page Bootstrapper
  // ------------------------------------------------------------------------
  function initToolPage() {
    // 1. Sync Theme
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('habitflow_theme', newTheme);
      });
    }
    const savedTheme = localStorage.getItem('habitflow_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // 2. Identify Tool from Query Parameter ?id=...
    let toolId = 'pomodoro';
    try {
      if (window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        toolId = urlParams.get('id') || 'pomodoro';
      }
    } catch(e) {}

    const catalog = window.HabitFlowToolsCatalog || [];
    let currentTool = catalog.find(t => t.id === toolId);
    if (!currentTool && catalog.length > 0) {
      currentTool = catalog[0];
    }

    if (!currentTool) {
      const c = document.getElementById('toolPageContainer');
      if (c) c.innerHTML = '<div style="padding:40px; text-align:center;"><h2>لم يتم العثور على الأداة</h2><a href="tools.html">العودة لقائمة الأدوات</a></div>';
      return;
    }

    // Set Page Title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = `${currentTool.title} | عاداتي برو`;

    // Render Full Tool Page View
    const container = document.getElementById('toolPageContainer');
    if (!container) return;

    container.innerHTML = `
      <!-- 1. Header Hero -->
      <header class="tool-header-hero">
        <div class="tool-header-top">
          <div class="tool-identity-row">
            <div class="tool-hero-icon">${currentTool.icon}</div>
            <div class="tool-hero-titles">
              <span class="tool-hero-num">الأداة ${currentTool.num} • ${currentTool.categoryName}</span>
              <h1 class="tool-hero-title">${currentTool.title}</h1>
              <span class="tool-hero-author">المؤلف والباحث: ${currentTool.author}</span>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            ${currentTool.widgetId ? `
              <button type="button" class="pin-widget-btn" id="heroPinWidgetBtn" style="padding:10px 16px; font-size:13px;">
                <span>🍱</span> تثبيت في مساحة البدء
              </button>
            ` : ''}
            <a href="./tools.html" class="circle-arrow-btn" title="الرجوع لجميع الأدوات" style="text-decoration:none;">
              ✕
            </a>
          </div>
        </div>

        <p class="tool-hero-tagline">${currentTool.tagline}</p>

        <div class="tool-pill-meta-row">
          <div class="pill-stat-btn">
            <span>📚</span>
            <span>${currentTool.scientificRef}</span>
          </div>
          <a href="${currentTool.guideUrl}" target="_blank" rel="noopener" class="pill-stat-btn" style="text-decoration:none; color:var(--ios-blue);">
            <span>↗</span>
            <span>الدراسة والمرجع العلمي</span>
          </a>
        </div>
      </header>

      <!-- 2. Main Interactive Machine & Deep Guide Grid -->
      <main class="tool-main-grid">
        
        <!-- Left Column: Interactive Machine -->
        <section class="tool-machine-card" id="toolInteractiveMachine">
          <div class="machine-header">
            <h2 class="machine-title">
              <span>⚙️</span>
              <span>لوحة التحكم والتنفيذ الفوري</span>
            </h2>
            <span class="inline-pill-badge" style="background:rgba(16,185,129,0.1); color:#10B981;">تطبيق حقيقي</span>
          </div>

          <!-- Render Specific Machine Form -->
          <div id="machineFormSlot"></div>
        </section>

        <!-- Right Column: Scientific Guide & Practical Steps -->
        <aside class="tool-guide-card">
          <div class="guide-section-title">
            <span>🧠</span>
            <span>الأساس العلمي والمنهجي للأداة</span>
          </div>
          <p class="guide-desc-text">${currentTool.desc}</p>

          <div class="guide-section-title" style="margin-top:6px;">
            <span>📋</span>
            <span>خطوات التطبيق العملي اليومي:</span>
          </div>
          <div class="steps-ordered-list">
            ${(currentTool.howToUse || []).map((step, idx) => `
              <div class="step-list-item">
                <span class="step-number-badge">${idx + 1}</span>
                <span>${step}</span>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:auto; padding-top:14px; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-tertiary);">
            <span>مزامنة مباشرة مع محرك العادات</span>
            <span style="color:#10B981; font-weight:800;">● متصل ومفعل</span>
          </div>
        </aside>

      </main>
    `;

    // Handle Pin Button in Hero
    const pinBtn = document.getElementById('heroPinWidgetBtn');
    if (pinBtn && currentTool.widgetId && toolsEngine) {
      pinBtn.addEventListener('click', () => {
        haptic('medium');
        toolsEngine.addToolWidgetToCanvas(currentTool.widgetId);
        showToast(`تم تثبيت ويدجت «${currentTool.title}» في مساحة البدء بنجاح 🍱`);
      });
    }

    // 3. Inject and Bind Interactive Machine based on interactiveType
    const machineSlot = document.getElementById('machineFormSlot');
    if (!machineSlot) return;

    try {
      switch (currentTool.interactiveType) {
        case 'pomodoro':
          renderPomodoroMachine(machineSlot);
          break;
        case 'two_minute':
          renderTwoMinMachine(machineSlot);
          break;
        case 'five_second_rule':
          renderRocketMachine(machineSlot);
          break;
        case 'eisenhower_matrix':
          renderEisenhowerMachine(machineSlot);
          break;
        case 'habit_stacking':
          renderHabitStackMachine(machineSlot);
          break;
        case 'ivy_lee':
          renderIvyLeeMachine(machineSlot);
          break;
        case 'temptation_bundling':
          renderTemptationMachine(machineSlot);
          break;
        case 'focus_sound_40hz':
          renderSoundMachine(machineSlot);
          break;
        case 'woop_framework':
          renderWoopMachine(machineSlot);
          break;
        case 'pareto_analysis':
          renderParetoMachine(machineSlot);
          break;
        case 'time_boxing':
          renderTimeBoxMachine(machineSlot);
          break;
        case 'habit_scorecard':
          renderScorecardMachine(machineSlot);
          break;
        case 'twenty_second_rule':
          renderTwentySecMachine(machineSlot);
          break;
        case 'habit_contract':
          renderContractMachine(machineSlot);
          break;
        case 'stoic_reflection':
          renderStoicMachine(machineSlot);
          break;
        default:
          machineSlot.innerHTML = `<p>الأداة جاهزة ومفعلة تلقائياً.</p>`;
      }
    } catch(err) {
      machineSlot.innerHTML = `
        <div style="padding:20px; background:rgba(239,68,68,0.06); border-radius:16px; border:1px solid rgba(239,68,68,0.2);">
          <h4 style="color:#DC2626; margin-bottom:8px;">جاهز للتشغيل</h4>
          <p style="font-size:13px; color:var(--text-secondary);">${currentTool.tagline}</p>
        </div>
      `;
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 1: POMODORO
  // ------------------------------------------------------------------------
  function renderPomodoroMachine(slot) {
    const habits = (toolsEngine && toolsEngine.app && toolsEngine.app.habits) ? toolsEngine.app.habits : [];
    const habitOptions = habits.length > 0 
      ? habits.map(h => `<option value="${h.id}">${h.name} (${h.category || 'عام'})\</option>`).join('')
      : `
        <option value="focus_deep">جلسة تركيز عميق 🧠</option>
        <option value="reading">قراءة كتاب مفيد 📖</option>
        <option value="fitness">تمارين وإطالة 🏃‍♂️</option>
      `;

    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="bento-segmented-toggle">
            <button type="button" class="segmented-option active" id="pWorkBtn">تركيز (25 د)</button>
            <button type="button" class="segmented-option" id="pBreakBtn">استراحة (5 د)</button>
            <button type="button" class="segmented-option" id="pLongBreakBtn">طويلة (15 د)</button>
          </div>
          <span style="font-size:12px; font-weight:800; color:var(--ios-blue);">+15 XP لكل جلسة</span>
        </div>

        <div style="text-align:center; padding:24px 0;">
          <div style="font-size:clamp(54px, 12vw, 84px); font-weight:950; font-variant-numeric:tabular-nums; letter-spacing:-2px; color:var(--text-primary);" id="pTimerNum">
            25:00
          </div>
          <div style="font-size:13px; font-weight:700; color:var(--text-secondary);" id="pSessionStatus">
            جاهز لبدء جلسة التركيز العميق
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <label style="font-size:13px; font-weight:750; color:var(--text-primary);">ربط الجلسة بعادة معينة لتسجيل الدقائق تلقائياً:</label>
          <select class="priority-select" id="pHabitSelect" style="width:100%; padding:12px; font-size:14px; background:var(--card-gray-subtle);">
            <option value="">-- اختر العادة المرتبطة --</option>
            ${habitOptions}
          </select>
        </div>

        <div style="display:flex; gap:10px; margin-top:8px;">
          <button type="button" class="bento-todo-add-btn" id="pMainAction" style="flex:1; padding:14px; font-size:15px; font-weight:900; background:#121316; color:#FFF;">
            بدء جلسة التركيز ⏱️
          </button>
          <button type="button" class="bento-todo-add-btn" id="pResetAction" style="background:rgba(0,0,0,0.08); color:var(--text-primary); padding:14px 20px; font-size:15px;">
            إعادة ضبط ↺
          </button>
        </div>
      </div>
    `;

    let durationSec = 25 * 60;
    let remainingSec = durationSec;
    let timerInterval = null;
    let isRunning = false;

    const display = document.getElementById('pTimerNum');
    const status = document.getElementById('pSessionStatus');
    const mainBtn = document.getElementById('pMainAction');
    const resetBtn = document.getElementById('pResetAction');
    const workBtn = document.getElementById('pWorkBtn');
    const breakBtn = document.getElementById('pBreakBtn');
    const longBreakBtn = document.getElementById('pLongBreakBtn');
    const habitSelect = document.getElementById('pHabitSelect');

    function updateDisplay() {
      const m = Math.floor(remainingSec / 60).toString().padStart(2, '0');
      const s = (remainingSec % 60).toString().padStart(2, '0');
      if (display) display.textContent = `${m}:${s}`;
    }

    function setTab(sec, btn, msg) {
      if (isRunning) clearInterval(timerInterval);
      isRunning = false;
      durationSec = sec;
      remainingSec = sec;
      [workBtn, breakBtn, longBreakBtn].forEach(b => { if (b) b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      if (mainBtn) {
        mainBtn.textContent = 'بدء الجلسة ⏱️';
        mainBtn.style.background = '#121316';
      }
      if (status) status.textContent = msg;
      updateDisplay();
    }

    if (workBtn) workBtn.onclick = () => setTab(25 * 60, workBtn, 'جلسة تركيز 25 دقيقة (+15 XP)');
    if (breakBtn) breakBtn.onclick = () => setTab(5 * 60, breakBtn, 'استراحة قصيرة 5 دقائق');
    if (longBreakBtn) longBreakBtn.onclick = () => setTab(15 * 60, longBreakBtn, 'استراحة طويلة 15 دقيقة');

    if (mainBtn) {
      mainBtn.onclick = () => {
        haptic('light');
        if (isRunning) {
          clearInterval(timerInterval);
          isRunning = false;
          mainBtn.textContent = 'استئناف ⏱️';
          if (status) status.textContent = 'الجلسة متوقفة مؤقتاً';
        } else {
          isRunning = true;
          mainBtn.textContent = 'إيقاف مؤقت ⏸';
          mainBtn.style.background = 'var(--ios-blue)';
          if (status) status.textContent = 'جلسة تركيز نشطة الآن... ركز طاقتك كلياً!';

          timerInterval = setInterval(() => {
            remainingSec--;
            updateDisplay();
            if (remainingSec <= 0) {
              clearInterval(timerInterval);
              isRunning = false;
              haptic('double');
              mainBtn.textContent = 'جلسة جديدة ⏱️';
              if (status) status.textContent = 'اكتملت الجلسة بنجاح! أحسنت 🎉';
              if (toolsEngine) {
                const habitId = habitSelect ? habitSelect.value : '';
                toolsEngine.completePomodoroSession(habitId);
              }
              showToast('اكتملت جلسة التركيز وتم إيداع +15 XP وسجل العادة! 🍅');
            }
          }, 1000);
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        haptic('light');
        if (isRunning) clearInterval(timerInterval);
        isRunning = false;
        remainingSec = durationSec;
        if (mainBtn) {
          mainBtn.textContent = 'بدء الجلسة ⏱️';
          mainBtn.style.background = '#121316';
        }
        if (status) status.textContent = 'تمت إعادة الضبط';
        updateDisplay();
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 2: TWO MINUTE RULE
  // ------------------------------------------------------------------------
  function renderTwoMinMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(6,78,59,0.06); border:1px solid rgba(6,78,59,0.15); border-radius:18px; padding:14px; color:#064E3B;">
          <strong>القاعدة الذهبية:</strong> ابدأ الآن فوراً لمدة دقيقتين فقط، وستجد أن 80% من صعوبة العادة تتلاشى بمجرد كسر جمود البداية!
        </div>

        <div style="text-align:center; padding:16px 0;">
          <div style="font-size:clamp(48px, 10vw, 72px); font-weight:950; font-variant-numeric:tabular-nums; color:#064E3B;" id="twoMinTimerNum">
            02:00
          </div>
          <div style="font-size:13px; font-weight:750; color:#065F46;" id="twoMinStatus">
            انطلاق فوري للتنفيذ دون تسويف
          </div>
        </div>

        <input type="text" class="bento-todo-input" id="twoMinTaskInput" placeholder="ما هي المهمة أو العادة التي ستنجز دقيقتيها الآن؟ (مثال: تمرين ضغط، قراءة صفحة)">

        <div style="display:flex; gap:10px;">
          <button type="button" class="bento-todo-add-btn" id="twoMinStartBtn" style="flex:1; padding:14px; background:#064E3B; color:#FFF; font-weight:850;">
            انطلاق الـ 120 ثانية 🚀
          </button>
          <button type="button" class="bento-todo-add-btn" id="twoMinResetBtn" style="background:rgba(0,0,0,0.08); color:var(--text-primary); padding:14px 18px;">
            ↺
          </button>
        </div>
      </div>
    `;

    let sec = 120;
    let timer = null;
    let running = false;
    const disp = document.getElementById('twoMinTimerNum');
    const stat = document.getElementById('twoMinStatus');
    const startBtn = document.getElementById('twoMinStartBtn');
    const resetBtn = document.getElementById('twoMinResetBtn');
    const taskInput = document.getElementById('twoMinTaskInput');

    function update() {
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      if (disp) disp.textContent = `${m}:${s}`;
    }

    if (startBtn) {
      startBtn.onclick = () => {
        haptic('light');
        if (running) {
          clearInterval(timer);
          running = false;
          startBtn.textContent = 'استئناف 🚀';
        } else {
          running = true;
          startBtn.textContent = 'إيقاف مؤقت ⏸';
          if (stat) stat.textContent = `جاري تنفيذ: «${taskInput?.value?.trim() || 'العادة الخاطفة'}»`;
          timer = setInterval(() => {
            sec--;
            update();
            if (sec <= 0) {
              clearInterval(timer);
              running = false;
              haptic('double');
              if (disp) disp.textContent = '00:00';
              if (stat) stat.textContent = 'انتهت الدقيقتان! تم كسر حاجز البداية بنجاح 🏆';
              if (toolsEngine) toolsEngine.awardXP(10, 'قاعدة الدقيقتين الخاطفة');
              showToast('أحسنت! أتممت دقيقتي البداية الخاطفة بنجاح (+10 XP) ✨');
            }
          }, 1000);
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        if (running) clearInterval(timer);
        running = false;
        sec = 120;
        if (startBtn) startBtn.textContent = 'انطلاق الـ 120 ثانية 🚀';
        if (stat) stat.textContent = 'انطلاق فوري للتنفيذ دون تسويف';
        update();
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 3: FIVE SECOND RULE
  // ------------------------------------------------------------------------
  function renderRocketMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="text-align:center; padding:30px 0; background:var(--card-dark); border-radius:24px; color:#FFF;">
          <div style="font-size:clamp(64px, 14vw, 100px); font-weight:950; color:var(--card-yellow); line-height:1;" id="rocketBigNum">
            5
          </div>
          <div style="font-size:14px; font-weight:800; color:rgba(255,255,255,0.7); margin-top:8px;" id="rocketBigText">
            اضغط على الزر واستعد للتحرك الجسدي الفوري
          </div>
        </div>

        <input type="text" class="bento-todo-input" id="rocketActionGoal" placeholder="ما هو الفعل الذي تؤجله الآن؟ (مثال: النهوض من السرير، فتح الكتاب)">

        <button type="button" class="bento-todo-add-btn" id="rocketLaunchNow" style="padding:16px; font-size:16px; font-weight:900; background:var(--card-yellow); color:#121316;">
          إطلاق العد التنازلي الحاسم 🔥
        </button>
      </div>
    `;

    const numDisp = document.getElementById('rocketBigNum');
    const textDisp = document.getElementById('rocketBigText');
    const launchBtn = document.getElementById('rocketLaunchNow');
    const goalInput = document.getElementById('rocketActionGoal');

    if (launchBtn) {
      launchBtn.onclick = () => {
        haptic('light');
        launchBtn.disabled = true;
        let count = 5;
        if (numDisp) numDisp.textContent = count;
        if (textDisp) textDisp.textContent = 'استعد... 5';

        const interval = setInterval(() => {
          count--;
          if (count > 0) {
            haptic('light');
            if (numDisp) numDisp.textContent = count;
            if (textDisp) textDisp.textContent = `انطلق في... ${count}`;
          } else {
            clearInterval(interval);
            haptic('double');
            if (numDisp) numDisp.textContent = '🚀';
            if (textDisp) textDisp.textContent = `تحرك جسدياً فوراً وافعل: «${goalInput?.value?.trim() || 'هدفك الآن'}»!`;
            launchBtn.disabled = false;
            launchBtn.textContent = 'إطلاق من جديد 🔥';
            if (toolsEngine) toolsEngine.awardXP(10, 'صاروخ الـ 5 ثوانٍ');
            showToast('انطلق الصاروخ! تحرك جسدياً فوراً لكسر التردد (+10 XP) 🚀');
          }
        }, 1000);
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 4: EISENHOWER MATRIX
  // ------------------------------------------------------------------------
  function renderEisenhowerMachine(slot) {
    let state = toolsEngine ? toolsEngine.state.eisenhower : { q1: [], q2: [], q3: [], q4: [] };

    // Auto-seed realistic tasks if completely empty so user never sees a blank matrix
    const totalCount = ((state.q1||[]).length) + ((state.q2||[]).length) + ((state.q3||[]).length) + ((state.q4||[]).length);
    if (totalCount === 0 && toolsEngine) {
      toolsEngine.addEisenhowerTask('إنهاء المهمة العاجلة وتسليم المطلوب اليوم', 'q1');
      toolsEngine.addEisenhowerTask('ممارسة عادة الرياضة والقراءة (تطوير الذات)', 'q2');
      toolsEngine.addEisenhowerTask('الرد على الاستفسارات والإيميلات الروتينية', 'q3');
      toolsEngine.addEisenhowerTask('التصفح العشوائي للتطبيقات ومواقع التواصل', 'q4');
      state = toolsEngine.state.eisenhower;
    }

    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input type="text" class="bento-todo-input" id="eisenFullInput" placeholder="أدخل مهمة جديدة للفرز..." style="flex:2; min-width:180px;">
          <select class="priority-select" id="eisenFullSelect" style="flex:1; min-width:140px; padding:10px;">
            <option value="q1">🔴 عاجل ومهم (فوري)</option>
            <option value="q2">🔵 مهم وغير عاجل (تخطيط)</option>
            <option value="q3">🟡 عاجل وغير مهم (تفويض)</option>
            <option value="q4">⚪ غير عاجل وغير مهم (حذف)</option>
          </select>
          <button type="button" class="bento-todo-add-btn" id="eisenFullAddBtn" style="padding:10px 18px;">إضافة للمصفوفة</button>
        </div>

        <div class="eisen-full-grid">
          <div class="eisen-quad-box q1">
            <div style="display:flex; justify-content:space-between; font-weight:850; color:#DC2626;">
              <span>🔴 الربع 1: عاجل ومهم</span>
              <small>تتزامن بقائمة مهام اليوم</small>
            </div>
            <div id="slotQ1" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>

          <div class="eisen-quad-box q2">
            <div style="display:flex; justify-content:space-between; font-weight:850; color:#2563EB;">
              <span>🔵 الربع 2: مهم وغير عاجل</span>
              <small>تطوير الذات والعادات</small>
            </div>
            <div id="slotQ2" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>

          <div class="eisen-quad-box q3">
            <div style="display:flex; justify-content:space-between; font-weight:850; color:#D97706;">
              <span>🟡 الربع 3: عاجل وغير مهم</span>
              <small>اختصره أو فوضه</small>
            </div>
            <div id="slotQ3" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>

          <div class="eisen-quad-box q4">
            <div style="display:flex; justify-content:space-between; font-weight:850; color:#4B5563;">
              <span>⚪ الربع 4: غير عاجل وغير مهم</span>
              <small>احذفه فوراً</small>
            </div>
            <div id="slotQ4" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>
        </div>
      </div>
    `;

    function refreshQuadLists() {
      const curState = toolsEngine ? toolsEngine.state.eisenhower : state;
      ['q1', 'q2', 'q3', 'q4'].forEach(quad => {
        const slotEl = document.getElementById(`slot${quad.toUpperCase()}`);
        if (!slotEl) return;
        slotEl.innerHTML = '';
        const list = curState[quad] || [];
        if (list.length === 0) {
          slotEl.innerHTML = `<span style="font-size:12px; color:var(--text-tertiary); font-style:italic; padding:6px 0;">لا توجد مهام حالياً</span>`;
          return;
        }
        list.forEach(item => {
          const isDone = item.done || item.completed;
          const div = document.createElement('div');
          div.className = 'eisen-task-item';
          div.innerHTML = `
            <span style="${isDone ? 'text-decoration:line-through; opacity:0.6;' : ''}">${item.text}</span>
            <button type="button" style="border:none; background:transparent; cursor:pointer; font-size:15px;" data-toggle-id="${item.id}">
              ${isDone ? '✅' : '⚪'}
            </button>
          `;
          slotEl.appendChild(div);
        });
      });

      // Bind toggle clicks
      slot.querySelectorAll('[data-toggle-id]').forEach(btn => {
        btn.onclick = () => {
          haptic('light');
          const id = btn.getAttribute('data-toggle-id');
          if (toolsEngine) {
            toolsEngine.toggleEisenhowerTask(id);
            refreshQuadLists();
            showToast('تم تحديث حالة المهمة والمزامنة مع مهام اليوم! ✨');
          }
        };
      });
    }

    refreshQuadLists();

    const addBtn = document.getElementById('eisenFullAddBtn');
    const input = document.getElementById('eisenFullInput');
    const select = document.getElementById('eisenFullSelect');

    if (addBtn && input && select) {
      addBtn.onclick = () => {
        const text = input.value.trim();
        if (!text) { showToast('أدخل نص المهمة أولاً'); return; }
        haptic('light');
        if (toolsEngine) {
          toolsEngine.addEisenhowerTask(text, select.value);
          input.value = '';
          refreshQuadLists();
          showToast('تمت إضافة المهمة لمصفوفة أيزنهاور وتزامنها مع المهام اليومية! 🔲');
        }
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 5: HABIT STACKING
  // ------------------------------------------------------------------------
  function renderHabitStackMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:18px; padding:14px; color:#064E3B; font-size:13.5px; line-height:1.6;">
          <strong>معادلة تكديس العادات:</strong><br>
          «بعد أن أقوم بـ [العادة الراسخة]، سوف أقوم فوراً بـ [العادة الجديدة] في [المكان المحدد]».
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">1. العادة الراسخة اليومية (الزناد العصبي Trigger):</label>
          <input type="text" class="bento-todo-input" id="stackBaseInput" placeholder="مثال: شرب قهوة الصباح، صلاة الفجر، إغلاق اللابتوب...">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">2. العادة الجديدة التي تود بناءها:</label>
          <input type="text" class="bento-todo-input" id="stackTargetInput" placeholder="مثال: قراءة 5 صفحات، تدوين الامتنان، تمارين الإطالة...">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">3. التصنيف:</label>
          <select class="priority-select" id="stackCatSelect" style="padding:10px;">
            <option value="صحة">صحة ولياقة 🏃‍♂️</option>
            <option value="تطوير">تطوير وتركيز 🧠</option>
            <option value="إنتاجية">إنتاجية وعمل ⏱️</option>
            <option value="روحي">روحي وذهني 🌙</option>
          </select>
        </div>

        <div id="stackEquationCard" style="display:none; background:var(--card-gray-subtle); border:1.5px dashed var(--ios-blue); border-radius:18px; padding:14px; font-size:14px; font-weight:800; color:var(--text-primary);"></div>

        <div style="display:flex; gap:10px;">
          <button type="button" class="bento-todo-add-btn" id="stackPreviewBtn" style="padding:12px; background:rgba(0,0,0,0.08); color:var(--text-primary); font-weight:800;">
            معاينة المعادلة 🔍
          </button>
          <button type="button" class="bento-todo-add-btn" id="stackCommitBtn" style="flex:1; padding:12px; background:var(--ios-blue); color:#FFF; font-weight:900;">
            إدراج كعادة رسمية ومفعلة بجدول اليوم (+20 XP) ✨
          </button>
        </div>
      </div>
    `;

    const baseIn = document.getElementById('stackBaseInput');
    const targetIn = document.getElementById('stackTargetInput');
    const catSel = document.getElementById('stackCatSelect');
    const eqCard = document.getElementById('stackEquationCard');
    const prevBtn = document.getElementById('stackPreviewBtn');
    const commitBtn = document.getElementById('stackCommitBtn');

    if (prevBtn) {
      prevBtn.onclick = () => {
        const b = baseIn?.value?.trim() || 'قهوة الصباح';
        const t = targetIn?.value?.trim() || 'قراءة صفحة واحدة';
        if (eqCard) {
          eqCard.innerHTML = `🔗 <strong>المعادلة:</strong> «بعد أن أقوم بـ (${b})، سوف أقوم فوراً بـ (${t}).»`;
          eqCard.style.display = 'block';
        }
        haptic('light');
      };
    }

    if (commitBtn) {
      commitBtn.onclick = () => {
        const b = baseIn?.value?.trim();
        const t = targetIn?.value?.trim();
        if (!b || !t) {
          showToast('يرجى ملء العادة الراسخة والعادة الجديدة أولاً');
          return;
        }
        haptic('double');
        if (toolsEngine) {
          toolsEngine.convertStackToLiveHabit(b, t, catSel?.value || 'صحة');
          showToast(`تم إدراج «${t}» بنجاح في جدول عاداتك وكسبت +20 XP! 🚀`);
          if (eqCard) {
            eqCard.innerHTML = `✅ <strong>تم الاعتماد:</strong> تم إدراج العادة وربطها بنجاح بقائمتك اليومية.`;
            eqCard.style.display = 'block';
          }
        }
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 6: IVY LEE (6 TASKS)
  // ------------------------------------------------------------------------
  function renderIvyLeeMachine(slot) {
    const defaultStarterTasks = [
      'التركيز على المهمة الأولى الأكثر أهمية لهذا اليوم',
      'جلسة عمل عميق لمدة 25 دقيقة دون مقاطعة',
      'ممارسة عادة المشي والرياضة 30 دقيقة',
      'مراجعة وتحديث جدول المهام والمراسلات',
      'قراءة 10 صفحات من كتاب مفيد',
      'التدوين المسائي والمراجعة الرواقية قبل النوم'
    ];

    let state = toolsEngine ? toolsEngine.state.ivyLee : { tasks: [], activeIndex: 0 };
    if (!state.tasks || state.tasks.length === 0) {
      if (toolsEngine) {
        toolsEngine.setIvyLeeTasks(defaultStarterTasks);
        state = toolsEngine.state.ivyLee;
      }
    }

    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; font-weight:800; color:var(--text-secondary);">
            وضع التركيز الأحادي الصارم (المهمة 1 لا تترك قبل تمامها)
          </span>
          <span class="inline-pill-badge" style="background:#DC2626; color:#FFF;" id="ivyActiveBadge">
            المهمة 1 من 6
          </span>
        </div>

        <div style="background:var(--card-gray-subtle); border-radius:20px; padding:18px; border:1px solid var(--border-glass); display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:12px; font-weight:750; color:var(--text-tertiary);">المهمة المركزية قيد التنفيذ الآن:</div>
          <div style="font-size:18px; font-weight:900; color:var(--text-primary);" id="ivyCurrentTaskText">
            ${(state.tasks && state.tasks[state.activeIndex || 0]?.text) || defaultStarterTasks[0]}
          </div>
          <div style="display:flex; gap:10px; margin-top:8px;">
            <button type="button" class="bento-todo-add-btn" id="ivyCompleteTaskBtn" style="flex:1; padding:12px; background:var(--ios-green); color:#FFF; font-weight:900;">
              إنجاز والانتقال للتالية (+15 XP) ✓
            </button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">قائمة المهام الست لليوم (مرتبة حسب الأولوية الحقيقية):</label>
          ${[1, 2, 3, 4, 5, 6].map(n => {
            const val = (state.tasks && state.tasks[n-1]?.text) || defaultStarterTasks[n-1] || '';
            return `
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="width:24px; font-size:12px; font-weight:900; color:var(--text-secondary); text-align:center;">#${n}</span>
                <input type="text" class="bento-todo-input ivy-task-field" data-index="${n-1}" value="${val}" placeholder="المهمة ${n}..." style="padding:10px;">
              </div>
            `;
          }).join('')}
          <button type="button" class="bento-todo-add-btn" id="ivySaveListBtn" style="margin-top:6px; padding:12px; background:#121316; color:#FFF; font-weight:850;">
            حفظ واعتماد قائمة آيفي لي لليوم 📋
          </button>
        </div>
      </div>
    `;

    const badge = document.getElementById('ivyActiveBadge');
    const taskText = document.getElementById('ivyCurrentTaskText');
    const compBtn = document.getElementById('ivyCompleteTaskBtn');
    const saveBtn = document.getElementById('ivySaveListBtn');
    const fields = slot.querySelectorAll('.ivy-task-field');

    const activeIdx = state.activeIndex || 0;
    if (badge) badge.textContent = `المهمة ${activeIdx + 1} من ${(state.tasks && state.tasks.length) || 6}`;

    if (saveBtn) {
      saveBtn.onclick = () => {
        const arr = [];
        fields.forEach(f => {
          if (f.value.trim()) arr.push(f.value.trim());
        });
        if (arr.length === 0) {
          showToast('أدخل مهمة واحدة على الأقل');
          return;
        }
        haptic('light');
        if (toolsEngine) {
          toolsEngine.setIvyLeeTasks(arr);
          if (badge) badge.textContent = `المهمة 1 من ${arr.length}`;
          if (taskText) taskText.textContent = arr[0];
          showToast('تم حفظ واعتماد قائمة آيفي لي لليوم بنجاح! 📝');
        }
      };
    }

    if (compBtn) {
      compBtn.onclick = () => {
        haptic('double');
        if (toolsEngine) {
          toolsEngine.advanceIvyLeeTask();
          const cur = toolsEngine.state.ivyLee;
          if (badge) badge.textContent = `المهمة ${cur.activeIndex + 1} من ${cur.tasks.length || 6}`;
          if (cur.activeIndex < cur.tasks.length) {
            if (taskText) taskText.textContent = cur.tasks[cur.activeIndex]?.text || '';
            showToast('أحسنت! تم إنجاز المهمة وإيداع +15 XP والتقدم للمهمة التالية! ✨');
          } else {
            if (taskText) taskText.textContent = '🎉 مبارك! أتممت مهام آيفي لي الست كاملة لليوم (+50 XP)!';
            showToast('تهانينا! حصدت المكافأة الكبرى لإتمام الـ 6 مهام كاملة (+50 XP) 🏆');
          }
        }
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 7: TEMPTATION BUNDLING
  // ------------------------------------------------------------------------
  function renderTemptationMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.2); border-radius:18px; padding:14px; color:#6D28D9; font-size:13.5px; line-height:1.6;">
          <strong>معادلة الدوبامين:</strong> لا أسمح لنفسي بالاستمتاع بالمكافأة [Y] إلا وأنا أمارس النشاط الشاق [X].
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">الواجب الشاق الذي تتكاسل عنه (Need to do):</label>
          <input type="text" class="bento-todo-input" id="tbDuty" value="ممارسة التمارين الرياضية على السير" placeholder="مثال: الرياضة الصباحية، تنظيم الفواتير، غسيل الصحون...">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">المكافأة التي تعشقها وتتشوق إليها (Want to do):</label>
          <input type="text" class="bento-todo-input" id="tbJoy" value="الاستماع إلى البودكاست الوثائقي المفضل" placeholder="مثال: الاستماع لبودكاست وثائقي، شرب شاي فاخر، مسلسل شيق...">
        </div>

        <div id="tbResultBox" style="background:rgba(139,92,246,0.08); border-radius:18px; padding:16px; font-size:14px; font-weight:800; color:#5B21B6; border:1.5px dashed #8B5CF6;">
          🎁 <strong>حزمة الدوبامين الجاهزة:</strong><br>
          «سأقوم بالاستمتاع بـ (الاستماع للبودكاست) حصرياً وفقط أثناء ممارسة (الرياضة). لن أسمح لنفسي بالمكافأة في أي وقت آخر!»
        </div>

        <button type="button" class="bento-todo-add-btn" id="tbBuildBtn" style="padding:14px; background:#7C3AED; color:#FFF; font-weight:900;">
          توليد واعتماد ميثاق حزمة المغريات ⚡️
        </button>
      </div>
    `;

    const d = document.getElementById('tbDuty');
    const j = document.getElementById('tbJoy');
    const res = document.getElementById('tbResultBox');
    const btn = document.getElementById('tbBuildBtn');

    if (btn) {
      btn.onclick = () => {
        const duty = d?.value?.trim() || 'الرياضة والترتيب';
        const joy = j?.value?.trim() || 'البودكاست المفضل';
        haptic('light');
        if (res) {
          res.innerHTML = `🎁 <strong>حزمة الدوبامين المعتمدة:</strong><br>«سأقوم بالاستمتاع بـ (${joy}) حصرياً وفقط أثناء ممارسة (${duty}). لن أسمح لنفسي بالمكافأة في أي وقت آخر!»`;
          res.style.display = 'block';
        }
        if (toolsEngine) toolsEngine.awardXP(10, 'توليد حزمة مغريات');
        showToast('تم إنشاء حزمة الدوبامين واعتمادها بنجاح (+10 XP) ⚡️');
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 8: FOCUS SOUND 40HZ
  // ------------------------------------------------------------------------
  function renderSoundMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="text-align:center; padding:28px 0; background:var(--card-gray-subtle); border-radius:24px; border:1px solid var(--border-glass);">
          <div style="font-size:32px; margin-bottom:8px;">🎧</div>
          <div style="font-size:20px; font-weight:900; color:var(--text-primary);" id="soundStatusHeader">
            موجات غاما 40Hz متوقفة
          </div>
          <div style="font-size:13px; font-weight:700; color:var(--text-secondary); margin-top:4px;">
            توليد حقيقي عبر Web Audio API محلياً في جهازك
          </div>

          <div class="audio-waves-row" id="soundWavesRow" style="justify-content:center; margin-top:16px;">
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
            <div class="audio-wave-bar"></div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:800;">
            <span>درجة الصوت المريحة:</span>
            <span id="volLabel">15%</span>
          </div>
          <input type="range" id="volSlider" min="0" max="0.5" step="0.01" value="0.15" style="width:100%;">
        </div>

        <div style="display:flex; gap:10px;">
          <button type="button" class="bento-todo-add-btn" id="soundStartBtn" style="flex:1; padding:14px; background:var(--ios-blue); color:#FFF; font-weight:900;">
            تشغيل الموجات 40Hz 🔊
          </button>
          <button type="button" class="bento-todo-add-btn" id="soundStopBtn" style="padding:14px 20px; background:rgba(0,0,0,0.08); color:var(--text-primary); font-weight:800;">
            إيقاف ⏹
          </button>
        </div>
      </div>
    `;

    const stH = document.getElementById('soundStatusHeader');
    const waves = document.getElementById('soundWavesRow');
    const startB = document.getElementById('soundStartBtn');
    const stopB = document.getElementById('soundStopBtn');
    const slider = document.getElementById('volSlider');
    const volLbl = document.getElementById('volLabel');

    if (slider) {
      slider.oninput = () => {
        if (volLbl) volLbl.textContent = `${Math.round(slider.value * 200)}%`;
        if (toolsEngine && toolsEngine.binauralGain) {
          toolsEngine.binauralGain.gain.setValueAtTime(parseFloat(slider.value), toolsEngine.audioCtx.currentTime);
        }
      };
    }

    if (startB) {
      startB.onclick = () => {
        haptic('light');
        if (toolsEngine) {
          toolsEngine.startBinauralFocus();
          if (waves) waves.classList.add('wave-active');
          if (stH) stH.textContent = 'موجات 40Hz تعمل الآن بجودة نقية 🌊';
          showToast('بدأ توليد موجات التركيز 40Hz بنجاح 🎧');
        }
      };
    }

    if (stopB) {
      stopB.onclick = () => {
        haptic('light');
        if (toolsEngine) {
          toolsEngine.stopBinauralFocus();
          if (waves) waves.classList.remove('wave-active');
          if (stH) stH.textContent = 'موجات غاما 40Hz متوقفة';
          showToast('تم إيقاف الصوت.');
        }
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 9: WOOP FRAMEWORK
  // ------------------------------------------------------------------------
  function renderWoopMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">1. الأمنية والرغبة (Wish):</label>
          <input type="text" class="bento-todo-input" id="wWish" value="الالتزام بممارسة عادة الرياضة 45 دقيقة" placeholder="ما الذي ترغب بإنجازه اليوم أو هذا الأسبوع؟">
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">2. أفضل نتيجة ملموسة (Outcome):</label>
          <input type="text" class="bento-todo-input" id="wOut" value="طاقة جسدية عالية وصفاء ذهني وثقة بالنفس" placeholder="ما أفضل شعور أو مكسب ستجنيه عند التحقيق؟">
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">3. العقبة الداخلية فيك (Obstacle):</label>
          <input type="text" class="bento-todo-input" id="wObs" value="الشعور بالكسل وتصفح الهاتف على الأريكة" placeholder="ما هو العائق الداخلي (تسويف، خوف، تفقد الهاتف)؟">
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">4. خطة التجاوز الاستباقية (Plan):</label>
          <input type="text" class="bento-todo-input" id="wPlan" value="ارتداء حذاء الجري وتشغيل صاروخ الـ 5 ثوانٍ فوراً" placeholder="إذا ظهرت العقبة... فسوف أقوم بـ...">
        </div>

        <div id="woopOutputCard" style="background:rgba(16,185,129,0.08); border-radius:18px; padding:16px; border:1.5px dashed #10B981; font-size:13.5px; line-height:1.6; color:#064E3B;">
          🎯 <strong>وثيقة WOOP العلمية المعتمدة:</strong><br>
          • <strong>الأمنية:</strong> الالتزام بممارسة عادة الرياضة 45 دقيقة<br>
          • <strong>النتيجة:</strong> طاقة جسدية عالية وصفاء ذهني وثقة بالنفس<br>
          • <strong>العقبة الداخلية:</strong> الشعور بالكسل وتصفح الهاتف على الأريكة<br>
          • <strong>الخطة الشرطية:</strong> «إذا ظهرت (الشعور بالكسل)، فسوف أقوم فوراً بـ (ارتداء حذاء الجري وتشغيل صاروخ الـ 5 ثوانٍ فوراً)».
        </div>

        <button type="button" class="bento-todo-add-btn" id="woopBuildBtn" style="padding:14px; background:#10B981; color:#FFF; font-weight:900;">
          اعتماد وتحديث ميثاق التباين الذهني WOOP (+15 XP) 🎯
        </button>
      </div>
    `;

    const btn = document.getElementById('woopBuildBtn');
    const wW = document.getElementById('wWish');
    const wO = document.getElementById('wOut');
    const wB = document.getElementById('wObs');
    const wP = document.getElementById('wPlan');
    const outC = document.getElementById('woopOutputCard');

    if (btn) {
      btn.onclick = () => {
        const wish = wW?.value?.trim() || 'الاستمرار في العادة';
        const outcome = wO?.value?.trim() || 'راحة البال والفخر بالإنجاز';
        const obstacle = wB?.value?.trim() || 'التشتت بالهاتف';
        const plan = wP?.value?.trim() || 'إبعاد الهاتف لغرفة ثانية والتنفس بعمق';

        haptic('double');
        if (outC) {
          outC.innerHTML = `
            🎯 <strong>وثيقة WOOP العلمية المعتمدة:</strong><br>
            • <strong>الأمنية:</strong> ${wish}<br>
            • <strong>النتيجة:</strong> ${outcome}<br>
            • <strong>العقبة الداخلية:</strong> ${obstacle}<br>
            • <strong>الخطة الشرطية:</strong> «إذا ظهرت (${obstacle})، فسوف أقوم فوراً بـ (${plan})».
          `;
          outC.style.display = 'block';
        }
        if (toolsEngine) toolsEngine.awardXP(15, 'بناء خطة WOOP');
        showToast('تمت صياغة خطة WOOP واعتمادها بنجاح (+15 XP) ✨');
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 10: PARETO 80/20
  // ------------------------------------------------------------------------
  function renderParetoMachine(slot) {
    const starter20 = ['جلسات التركيز العميق (25 د) على المشروع الأساسي', 'الالتزام بعادة الرياضة والنوم المبكر'];
    const starter80 = ['تصفح الإشعارات كل 10 دقائق', 'الرد اللحظي على الرسائل غير العاجلة'];

    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; gap:8px;">
          <input type="text" class="bento-todo-input" id="paretoItemInput" placeholder="أدخل عادة أو نشاطاً لتقييم أثره..." style="flex:2;">
          <select class="priority-select" id="paretoTierSelect" style="flex:1; padding:10px;">
            <option value="20">🌟 20% ذهبية (عالية الأثر)</option>
            <option value="80">⏳ 80% روتينية (قليلة الأثر)</option>
          </select>
          <button type="button" class="bento-todo-add-btn" id="paretoAddBtn">تصنيف</button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="background:rgba(245,158,11,0.08); border:1.5px solid rgba(245,158,11,0.3); border-radius:18px; padding:14px; display:flex; flex-direction:column; gap:8px;">
            <span style="font-weight:900; color:#D97706; font-size:13px;">🌟 الـ 20% الذهبية (ركز عليها)</span>
            <div id="pareto20List" style="display:flex; flex-direction:column; gap:6px;">
              ${starter20.map(t => `<div class="eisen-task-item">${t}</div>`).join('')}
            </div>
          </div>
          <div style="background:rgba(107,114,128,0.08); border:1.5px solid rgba(107,114,128,0.3); border-radius:18px; padding:14px; display:flex; flex-direction:column; gap:8px;">
            <span style="font-weight:900; color:#4B5563; font-size:13px;">⏳ الـ 80% الروتينية (قلصها)</span>
            <div id="pareto80List" style="display:flex; flex-direction:column; gap:6px;">
              ${starter80.map(t => `<div class="eisen-task-item">${t}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById('paretoItemInput');
    const sel = document.getElementById('paretoTierSelect');
    const addB = document.getElementById('paretoAddBtn');
    const l20 = document.getElementById('pareto20List');
    const l80 = document.getElementById('pareto80List');

    if (addB && input && sel) {
      addB.onclick = () => {
        const val = input.value.trim();
        if (!val) return;
        haptic('light');
        const item = document.createElement('div');
        item.className = 'eisen-task-item';
        item.textContent = val;
        if (sel.value === '20' && l20) l20.appendChild(item);
        else if (l80) l80.appendChild(item);
        input.value = '';
        showToast('تم تصنيف النشاط في ميزان باريتو ⚖️');
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 11: TIME BOXING
  // ------------------------------------------------------------------------
  function renderTimeBoxMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.2); border-radius:18px; padding:14px; font-size:13.5px; color:#1D4ED8;">
          <strong>صناديق الوقت الصارمة:</strong> احجز فترات زمنية مغلقة لكل مهمة لمنع تسرب الوقت وتمدد العمل.
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:70px; font-weight:800; font-size:12px; color:var(--text-secondary);">صباحاً:</span>
            <input type="text" class="bento-todo-input" value="عمل عميق على المشروع الرئيسي (08:00 - 10:00)">
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:70px; font-weight:800; font-size:12px; color:var(--text-secondary);">ظهيرة:</span>
            <input type="text" class="bento-todo-input" value="مراسلات وتحديث المهام (12:00 - 12:45)">
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="width:70px; font-weight:800; font-size:12px; color:var(--text-secondary);">مساءً:</span>
            <input type="text" class="bento-todo-input" value="رياضة وقراءة وتأمل رواقي (18:00 - 19:30)">
          </div>
        </div>

        <button type="button" class="bento-todo-add-btn" id="tbConfirmBtn" style="padding:14px; background:#121316; color:#FFF; font-weight:900;">
          تثبيت صناديق اليوم (+10 XP) 📦
        </button>
      </div>
    `;

    const btn = document.getElementById('tbConfirmBtn');
    if (btn) {
      btn.onclick = () => {
        haptic('double');
        if (toolsEngine) toolsEngine.awardXP(10, 'اعتماد صناديق الوقت');
        showToast('تم اعتماد صناديق اليوم! التزم بكل فترة دون مقاطعات (+10 XP) 📦');
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 12: HABIT SCORECARD
  // ------------------------------------------------------------------------
  function renderScorecardMachine(slot) {
    const starterScorecard = [
      { text: 'الاستيقاظ في الموعد المحدد', sign: '+', col: '#10B981' },
      { text: 'تفقد الهاتف في السرير فور الاستيقاظ', sign: '-', col: '#EF4444' },
      { text: 'شرب كوب ماء كبير وترطيب الجسم', sign: '+', col: '#10B981' },
      { text: 'تحضير القهوة ووجبة الإفطار', sign: '=', col: '#6B7280' },
      { text: 'المشي والتعرض لأشعة الشمس 15 دقيقة', sign: '+', col: '#10B981' }
    ];

    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; gap:8px;">
          <input type="text" class="bento-todo-input" id="scItem" placeholder="أدخل عادة روتينية (مثل: شرب الماء)..." style="flex:1;">
          <button type="button" class="bento-todo-add-btn" id="scPos" style="background:#10B981; color:#FFF;">+</button>
          <button type="button" class="bento-todo-add-btn" id="scNeu" style="background:#6B7280; color:#FFF;">=</button>
          <button type="button" class="bento-todo-add-btn" id="scNeg" style="background:#EF4444; color:#FFF;">-</button>
        </div>

        <div style="font-size:12px; font-weight:700; color:var(--text-secondary);">
          (+) عادة إيجابية تبنيك | (=) محايدة روتينية | (-) عادة سلبية تعيقك
        </div>

        <div id="scFullList" style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto;">
          ${starterScorecard.map(it => `
            <div class="eisen-task-item">
              <span>${it.text}</span>
              <strong style="color:${it.col}; font-size:16px;">[${it.sign}]</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const itemIn = document.getElementById('scItem');
    const posB = document.getElementById('scPos');
    const neuB = document.getElementById('scNeu');
    const negB = document.getElementById('scNeg');
    const list = document.getElementById('scFullList');

    function addSc(sign, col) {
      if (!itemIn) return;
      const txt = itemIn.value.trim();
      if (!txt) return;
      haptic('light');
      const row = document.createElement('div');
      row.className = 'eisen-task-item';
      row.innerHTML = `
        <span>${txt}</span>
        <strong style="color:${col}; font-size:16px;">[${sign}]</strong>
      `;
      if (list) list.appendChild(row);
      itemIn.value = '';
    }

    if (posB) posB.onclick = () => addSc('+', '#10B981');
    if (neuB) neuB.onclick = () => addSc('=', '#6B7280');
    if (negB) negB.onclick = () => addSc('-', '#EF4444');
  }

  // ------------------------------------------------------------------------
  // MACHINE 13: 20-SECOND RULE
  // ------------------------------------------------------------------------
  function renderTwentySecMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); border-radius:18px; padding:14px; font-size:13.5px; color:#B45309; line-height:1.6;">
          <strong>تقليل الاحتكاك للعادة الجيدة:</strong> وفر 20 ثانية من طاقة البدء بجعل أدواتها جاهزة.<br>
          <strong>زيادة الاحتكاك للعادة السيئة:</strong> أضف حاجزاً يستغرق 20 ثانية لكسر الاندفاعية التلقائية.
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">عادة جيدة تود تسهيلها بنزع الاحتكاك:</label>
          <input type="text" class="bento-todo-input" id="tsGood" value="القراءة (سأضع الكتاب مفتوحاً على الوسادة)" placeholder="مثال: القراءة...">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">عادة سيئة تود تعطيلها بإضافة 20 ثانية مقاومة:</label>
          <input type="text" class="bento-todo-input" id="tsBad" value="تشتت وسائل التواصل (تسجيل الخروج ووضع كلمة سر معقدة)" placeholder="مثال: شبكات التواصل...">
        </div>

        <button type="button" class="bento-todo-add-btn" id="tsSaveBtn" style="padding:14px; background:#D97706; color:#FFF; font-weight:900;">
          اعتماد خطة بيئة الـ 20 ثانية (+10 XP) ⚡
        </button>
      </div>
    `;

    const btn = document.getElementById('tsSaveBtn');
    if (btn) {
      btn.onclick = () => {
        haptic('double');
        if (toolsEngine) toolsEngine.awardXP(10, 'قاعدة الـ 20 ثانية');
        showToast('تم اعتماد خطة البيئة لتقليل الاحتكاك بنجاح (+10 XP) ⚡');
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 14: HABIT CONTRACT
  // ------------------------------------------------------------------------
  function renderContractMachine(slot) {
    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">العادة الصارمة التي تتعهد بها:</label>
          <input type="text" class="bento-todo-input" id="cHabit" value="ممارسة الرياضة 45 دقيقة يومياً دون انقطاع" placeholder="مثال: ممارسة الرياضة...">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">اسم شريك المساءلة (Accountability Partner):</label>
          <input type="text" class="bento-todo-input" id="cPartner" value="أحمد (صديقي المعتمد)" placeholder="مثال: أحمد...">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:13px; font-weight:800;">الشرط الجزائي والغرامة السلوكية عند الإخفاق:</label>
          <input type="text" class="bento-todo-input" id="cPenalty" value="دفع 50 ريال للجمعية الخيرية أو غسيل سيارة شريكي" placeholder="مثال: دفع 50 ريال...">
        </div>

        <div id="cDocPreview" style="display:none; background:var(--card-gray-subtle); border-radius:18px; padding:16px; font-size:13.5px; line-height:1.7; border:1px solid var(--border-glass);"></div>

        <button type="button" class="bento-todo-add-btn" id="cGenBtn" style="padding:14px; background:#121316; color:#FFF; font-weight:900;">
          توليد ونسخ وثيقة الميثاق الرسمية 📜
        </button>
      </div>
    `;

    const h = document.getElementById('cHabit');
    const p = document.getElementById('cPartner');
    const pen = document.getElementById('cPenalty');
    const prev = document.getElementById('cDocPreview');
    const btn = document.getElementById('cGenBtn');

    if (btn) {
      btn.onclick = () => {
        const habit = h?.value?.trim() || 'الالتزام بالعادات اليومية';
        const partner = p?.value?.trim() || 'شريكي المعتمد';
        const penalty = pen?.value?.trim() || 'دفع غرامة التزام لشريكي';

        const doc = `📜 وثيقة ميثاق عادات رسمي:
أنا الموقع أدناه ألتزم بكامل إرادتي بممارسة (${habit}) يومياً.
وفي حال الانقطاع أو التراجع دون عذر قاهر، ألتزم بتنفيذ الشرط الجزائي فوراً وهو (${penalty}) وتسليمه لشريكي (${partner}).
تاريخ الالتزام: ${new Date().toLocaleDateString('ar-SA')}`;

        if (prev) {
          prev.innerHTML = doc.split("\n").join("<br>");
          prev.style.display = 'block';
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(doc).then(() => {
            haptic('double');
            showToast('تم نسخ الميثاق الرسمي للحافظة لمشاركته مع شريكك 📋');
          }).catch(() => {
            showToast('تم توليد الميثاق بنجاح!');
          });
        } else {
          showToast('تم توليد الميثاق بنجاح!');
        }
      };
    }
  }

  // ------------------------------------------------------------------------
  // MACHINE 15: STOIC REVIEW
  // ------------------------------------------------------------------------
  function renderStoicMachine(slot) {
    const rawEntries = toolsEngine ? toolsEngine.state.stoicReview.entries : [];
    const today = new Date().toISOString().split('T')[0];
    let todayEntry = { q1: '', q2: '', q3: '' };

    if (Array.isArray(rawEntries)) {
      const found = rawEntries.find(e => e.date === today);
      if (found) {
        todayEntry = {
          q1: found.bestAchievement || found.q1 || '',
          q2: found.frictions || found.q2 || '',
          q3: found.tomorrowPlan || found.q3 || ''
        };
      }
    } else if (rawEntries && typeof rawEntries === 'object' && rawEntries[today]) {
      todayEntry = rawEntries[today];
    }

    slot.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(30,41,59,0.06); border:1px solid rgba(30,41,59,0.15); border-radius:18px; padding:14px; font-size:13.5px; line-height:1.6; color:var(--text-primary);">
          <strong>المساءلة الرواقية (على خطى ماركوس أوريليوس):</strong><br>
          مراجعة ليلية هادئة تسجل مدخلاتك في نظام التأملات وتغذي التقرير الشهري بنقاط الـ XP.
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">1. ما الذي قمت به حسناً اليوم وتفخر به؟</label>
          <input type="text" class="bento-todo-input" id="stQ1" value="${todayEntry.q1 || ''}" placeholder="أنجزت جلسة البومودورو، حافظت على هدوئي...">
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">2. ما الذي قصرت فيه أو تمنيت لو تعاملت معه بحكمة أكبر؟</label>
          <input type="text" class="bento-todo-input" id="stQ2" value="${todayEntry.q2 || ''}" placeholder="استسلمت للتسويف بعد الظهر، أفرطت في الهاتف...">
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:13px; font-weight:800;">3. كيف أكون نسخة أكثر انضباطاً وقوة غداً؟</label>
          <input type="text" class="bento-todo-input" id="stQ3" value="${todayEntry.q3 || ''}" placeholder="سأبدأ بمهمة آيفي لي الأولى قبل فتح أي تطبيق...">
        </div>

        <button type="button" class="bento-todo-add-btn" id="stSaveBtn" style="padding:14px; background:#121316; color:#FFF; font-weight:900;">
          حفظ المراجعة الرواقية وتغذية التقييم الشهري (+10 XP) 🌙
        </button>
      </div>
    `;

    const saveBtn = document.getElementById('stSaveBtn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        haptic('double');
        const q1 = document.getElementById('stQ1')?.value || '';
        const q2 = document.getElementById('stQ2')?.value || '';
        const q3 = document.getElementById('stQ3')?.value || '';
        if (toolsEngine) {
          toolsEngine.saveStoicReview(q1, q2, q3);
          showToast('تم حفظ مراجعتك الرواقية وتغذية تقريرك الشهري بنجاح (+10 XP) 🌙');
        }
      };
    }
  }

  // ------------------------------------------------------------------------
  // Kickstart Execution safely
  // ------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToolPage);
  } else {
    initToolPage();
  }

})();

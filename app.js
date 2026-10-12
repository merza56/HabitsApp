// ==========================================================================
// Habits & Flow - Bento Editorial Pro Engine (Full UI/UX Enhancements)
// Features: Non-blocking Toast Undo, Sliding Dock Indicator,
// Swipe Actions, Steppers, Focus Timers, Clean Counter & 365-Day Matrix
// ==========================================================================

const HABITS_STORAGE_KEY = 'minimal_habits_data_v4';
const QUIT_STORAGE_KEY = 'minimal_quit_habits_v4';
const TODOS_STORAGE_KEY = 'minimal_todos_data_v4';
const PREFS_STORAGE_KEY = 'habits_prefs_v4';
const CATEGORIES_STORAGE_KEY = 'minimal_categories_data_v4';



// Dynamic Default Categories (Extensible without limits)
const DEFAULT_CATEGORIES = [
  { id: 'health', name: 'صحة', emoji: '💧', color: '#C8F2EE' },
  { id: 'work', name: 'عمل', emoji: '💻', color: '#E0E7FF' },
  { id: 'fitness', name: 'رياضة', emoji: '🏃‍♂️', color: '#DCFCE7' },
  { id: 'mind', name: 'تطوير', emoji: '📖', color: '#FEF3C7' },
  { id: 'spirit', name: 'روحانية', emoji: '✨', color: '#F3E8FF' }
];

// Helper to generate realistic historical contribution matrix for default habits
const generateHabitHistory = (streakDays, totalCompletedDays, totalHistoryDays = 200, countVal = 1) => {
  const history = {};
  const today = new Date();
  for (let i = 0; i < streakDays; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    history[key] = countVal;
  }
  let remaining = Math.max(0, totalCompletedDays - streakDays);
  for (let i = streakDays + 1; i < totalHistoryDays && remaining > 0; i++) {
    if ((i * 7 + streakDays) % 5 !== 0) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      history[key] = countVal;
      remaining--;
    }
  }
  return history;
};

// عادات افتراضية فارغة تماماً - نقطة الصفر (Clean Slate Zero State)
const DEFAULT_HABITS = [];

// عادات الإقلاع الافتراضية فارغة تماماً
const DEFAULT_QUIT_HABITS = [];

class BentoHabitFlowPro {
  constructor() {
    this.auth = window.HabitAuthManager ? new window.HabitAuthManager(this) : null;
    this.habits = this.loadHabits();
    this.quitHabits = this.loadQuitHabits();
    this.todos = this.loadTodos();
    this.prefs = this.loadPrefs();
    this.categories = this.loadCategories();
    
    this.selectedEmoji = '💧';
    this.selectedHabitNature = 'positive';
    this.selectedHabitType = 'check';
    this.selectedModalTag = 'health';
    this.selectedModalTime = 'all';
    this.selectedFrequency = 'daily';
    this.selectedDaysPerWeek = 3;
    this.currentRoutineHabits = [];
    this.currentRoutineIndex = 0;
    this.activeFilterTag = 'all';
    this.activeTimeFilter = 'all';
    this.editingHabitId = null;
    this.audioCtx = null;
    this.habitsViewMode = this.prefs.habitsViewMode || 'yearly';
    this.selectedHabitColor = '#3B82F6';

    // Toast undo history
    this.lastDeletedItem = null;
    this.toastTimer = null;

    // Active Day Picker Date
    const now = new Date();
    this.selectedDateStr = this.formatDateKey(now);
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth();

    // Active timers
    this.activeTimers = {};
    this.celebrationAnimId = null;
    this.hasCelebratedToday = false;

    // Core Modular Architecture: EventBus, PluginSystem & WidgetRegistry
    this.events = window.HabitFlowEventBus ? new window.HabitFlowEventBus() : null;
    this.plugins = window.HabitFlowPluginSystem ? new window.HabitFlowPluginSystem(this) : null;
    this.widgets = window.HabitFlowWidgetRegistry ? new window.HabitFlowWidgetRegistry(this) : null;
    this.toolsEngine = window.HabitFlowToolsEngine ? new window.HabitFlowToolsEngine(this) : null;
    this.canvas = window.HabitFlowCanvasEngine ? new window.HabitFlowCanvasEngine(this) : null;

    // Global Open-Source API
    window.HabitFlow = {
      app: this,
      events: this.events,
      plugins: this.plugins,
      widgets: this.widgets,
      tools: this.toolsEngine,
      canvas: this.canvas,
      registerPlugin: (manifest) => this.plugins ? this.plugins.register(manifest) : false,
      registerWidget: (widgetDef) => this.widgets ? this.widgets.register(widgetDef) : false
    };

    this.initDOM();
    this.applyPrefs();
    this.renderCategoryFilters();
    this.renderModalTags();
    this.renderSettingsCategories();
    this.renderDayStrip();
    this.renderDate();
    this.renderHabits();
    this.renderQuitHabits();
    this.renderTodos();
    this.updateMomentumAndHero();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.renderBadges();
    if (this.canvas) this.canvas.render();
    this.bindEvents();
    this.initCelebrationCanvas();

    // Live ticker for bad habits clean counter
    setInterval(() => {
      this.renderQuitHabits();
      if (this.canvas) this.canvas.refreshActiveWidgets();
    }, 60 * 1000);
  }

  // ==========================================================================
  // 1. Persistence & Preferences
  // ==========================================================================
  // 1. Persistence & Preferences (معزولة لكل مستخدم بحسابه الخاص)
  // ==========================================================================
  getStorageKey(prefix) {
    if (this.auth && typeof this.auth.getUserStorageKey === 'function') {
      return this.auth.getUserStorageKey(prefix);
    }
    return prefix;
  }

  loadHabits() {
    try {
      const key = this.getStorageKey('habits_data');
      const data = localStorage.getItem(key);
      if (!data) return [];
      let list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      const defaultColors = ['#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#F97316', '#EC4899', '#6366F1'];
      list.forEach((h, idx) => {
        if (!h.color) h.color = defaultColors[idx % defaultColors.length];
        if (!h.history) h.history = {};
      });
      return list;
    } catch (e) {
      return [];
    }
  }

  saveHabits() {
    try {
      const key = this.getStorageKey('habits_data');
      localStorage.setItem(key, JSON.stringify(this.habits));
    } catch (e) {}
  }

  loadQuitHabits() {
    try {
      const key = this.getStorageKey('quit_habits');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveQuitHabits() {
    try {
      const key = this.getStorageKey('quit_habits');
      localStorage.setItem(key, JSON.stringify(this.quitHabits));
    } catch (e) {}
  }

  loadTodos() {
    try {
      const key = this.getStorageKey('todos_data');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveTodos() {
    try {
      const key = this.getStorageKey('todos_data');
      localStorage.setItem(key, JSON.stringify(this.todos));
    } catch (e) {}
  }

  loadCategories() {
    try {
      const key = this.getStorageKey('categories_data');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  }

  saveCategories() {
    try {
      const key = this.getStorageKey('categories_data');
      localStorage.setItem(key, JSON.stringify(this.categories));
    } catch (e) {}
  }

  addCategory(name, emoji = '🏷️', color = '#E0F2FE') {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = 'cat_' + Date.now();
    const newCat = { id, name: trimmed, emoji: emoji || '🏷️', color };
    this.categories.push(newCat);
    this.saveCategories();
    this.renderCategoryFilters();
    this.renderModalTags();
    this.renderSettingsCategories();
    this.showToast(`تمت إضافة تصنيف "${trimmed}" بنجاح ✨`);
    if (this.events) this.events.emit('category:added', newCat);
  }

  deleteCategory(catId) {
    const cat = this.categories.find(c => c.id === catId);
    if (!cat) return;
    this.categories = this.categories.filter(c => c.id !== catId);
    this.saveCategories();
    if (this.activeFilterTag === catId) this.activeFilterTag = 'all';
    if (this.selectedModalTag === catId) this.selectedModalTag = 'health';
    this.renderCategoryFilters();
    this.renderModalTags();
    this.renderSettingsCategories();
    this.renderHabits();
    this.showToast(`تم حذف تصنيف "${cat.name}"`);
    if (this.events) this.events.emit('category:deleted', { id: catId });
  }

  deleteHabit(habitId) {
    const habitIndex = this.habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;
    const deletedHabit = this.habits[habitIndex];
    this.habits.splice(habitIndex, 1);
    this.saveHabits();
    this.renderHabits();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.updateMomentumAndHero();
    this.triggerHaptic('double');
    this.showToast(`تم حذف عادة "${deletedHabit.name}" بنجاح 🗑️`, () => {
      this.habits.splice(habitIndex, 0, deletedHabit);
      this.saveHabits();
      this.renderHabits();
      this.renderWeeklyChart();
      this.renderAnnualMatrix();
      this.renderMonthlyAnalytics();
      this.updateMomentumAndHero();
    });
  }

  resetHabitHistory(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;
    const oldHistory = { ...(habit.history || {}) };
    habit.history = {};
    this.saveHabits();
    this.renderHabits();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.updateMomentumAndHero();
    this.triggerHaptic('light');
    this.showToast(`تم تصفير سجل عادة "${habit.name}" بنجاح ↺`, () => {
      habit.history = oldHistory;
      this.saveHabits();
      this.renderHabits();
      this.renderWeeklyChart();
      this.renderAnnualMatrix();
      this.renderMonthlyAnalytics();
      this.updateMomentumAndHero();
    });
  }

  renderCategoryFilters() {
    if (!this.categoryFilterBar) return;
    this.categoryFilterBar.innerHTML = '';

    // "الكل" Pill
    const allBtn = document.createElement('button');
    allBtn.className = `filter-tag-pill ${this.activeFilterTag === 'all' ? 'active' : ''}`;
    allBtn.dataset.tag = 'all';
    allBtn.textContent = '#الكل';
    allBtn.onclick = () => {
      this.activeFilterTag = 'all';
      this.renderCategoryFilters();
      this.triggerHaptic('light');
      this.renderHabits();
    };
    this.categoryFilterBar.appendChild(allBtn);

    // Each Dynamic Category Pill
    this.categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `filter-tag-pill ${this.activeFilterTag === cat.id ? 'active' : ''}`;
      pill.dataset.tag = cat.id;
      pill.textContent = `#${cat.name} ${cat.emoji}`;
      pill.onclick = () => {
        this.activeFilterTag = cat.id;
        this.renderCategoryFilters();
        this.triggerHaptic('light');
        this.renderHabits();
      };
      this.categoryFilterBar.appendChild(pill);
    });

    // Quick Add Category Pill
    const addBtn = document.createElement('button');
    addBtn.className = 'filter-tag-pill';
    addBtn.style.color = '#3B82F6';
    addBtn.style.fontWeight = '800';
    addBtn.textContent = '+ تصنيف';
    addBtn.onclick = () => {
      const name = prompt('أدخل اسم التصنيف الجديد:');
      if (name && name.trim()) {
        const emoji = prompt('أدخل أيقونة/إيموجي للتصنيف (اختياري):', '🏷️') || '🏷️';
        this.addCategory(name, emoji);
      }
    };
    this.categoryFilterBar.appendChild(addBtn);
  }

  renderModalTags() {
    if (!this.modalTagSelector) return;
    this.modalTagSelector.innerHTML = '';

    this.categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `filter-tag-pill ${this.selectedModalTag === cat.id ? 'active' : ''}`;
      pill.dataset.tag = cat.id;
      pill.textContent = `#${cat.name} ${cat.emoji}`;
      pill.onclick = () => {
        this.selectedModalTag = cat.id;
        this.renderModalTags();
      };
      this.modalTagSelector.appendChild(pill);
    });
  }

  renderSettingsCategories() {
    const listEl = document.getElementById('settingsCategoriesList');
    const badgeEl = document.getElementById('categoriesCountBadge');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (badgeEl) badgeEl.textContent = `${this.categories.length} تصنيفات`;

    this.categories.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'category-mgmt-row';
      const isDefault = ['health', 'work', 'fitness', 'mind'].includes(cat.id);

      row.innerHTML = `
        <div class="category-mgmt-badge">
          <span style="font-size:18px;">${cat.emoji}</span>
          <span>${cat.name}</span>
        </div>
        ${!isDefault ? `<button class="category-delete-btn" data-del-cat="${cat.id}">حذف ✕</button>` : `<span style="font-size:11px; color:var(--text-tertiary);">أساسي</span>`}
      `;

      const delBtn = row.querySelector('[data-del-cat]');
      if (delBtn) {
        delBtn.onclick = () => this.deleteCategory(cat.id);
      }

      listEl.appendChild(row);
    });
  }

  loadPrefs() {
    try {
      const key = this.getStorageKey('prefs_data');
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : {};
      const activeUser = (this.auth && this.auth.currentUser) ? this.auth.currentUser : null;
      const userName = activeUser ? activeUser.username : 'عبدالله';
      const userAvatar = activeUser ? (activeUser.avatar || '👤') : '👤';
      return {
        sound: true,
        haptics: true,
        dark: false,
        vacation: false,
        userName,
        userAvatar,
        accentColor: '#FDE28A',
        freezeTokens: 2,
        frozenDates: {},
        ...parsed
      };
    } catch (e) {
      const activeUser = (this.auth && this.auth.currentUser) ? this.auth.currentUser : null;
      return {
        sound: true,
        haptics: true,
        dark: false,
        vacation: false,
        userName: activeUser ? activeUser.username : 'عبدالله',
        userAvatar: activeUser ? (activeUser.avatar || '👤') : '👤',
        accentColor: '#FDE28A',
        freezeTokens: 2,
        frozenDates: {}
      };
    }
  }

  savePrefs() {
    try {
      const key = this.getStorageKey('prefs_data');
      localStorage.setItem(key, JSON.stringify(this.prefs));
    } catch (e) {}
  }

  onUserSwitched(user) {
    this.habits = this.loadHabits();
    this.quitHabits = this.loadQuitHabits();
    this.todos = this.loadTodos();
    this.prefs = this.loadPrefs();
    this.categories = this.loadCategories();
    this.applyPrefs();
    this.renderCategoryFilters();
    this.renderModalTags();
    this.renderSettingsCategories();
    this.renderHabits();
    this.renderQuitHabits();
    this.renderTodos();
    this.updateMomentumAndHero();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.renderBadges();
    if (this.canvas) this.canvas.render();
    this.showToast(`تم تسجيل الدخول بحساب: ${user.username} 👋`);
  }

  applyPrefs() {
    if (this.soundPrefToggle) this.soundPrefToggle.checked = this.prefs.sound !== false;
    if (this.hapticPrefToggle) this.hapticPrefToggle.checked = this.prefs.haptics !== false;
    if (this.vacationPrefToggle) this.vacationPrefToggle.checked = !!this.prefs.vacation;

    if (this.vacationModeBanner) {
      this.vacationModeBanner.style.display = this.prefs.vacation ? 'flex' : 'none';
    }

    if (this.prefs.dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply Accent Palette
    if (this.prefs.accentColor) {
      document.documentElement.style.setProperty('--card-yellow', this.prefs.accentColor);
      const swatches = document.querySelectorAll('.palette-swatch');
      swatches.forEach(s => {
        s.classList.toggle('active', s.dataset.color === this.prefs.accentColor);
      });
    }

    // Apply User Name & Avatar
    const userName = this.prefs.userName || 'عبدالله';
    const userAvatar = this.prefs.userAvatar || '👤';

    const headerName = document.querySelector('.user-name-title');
    if (headerName) headerName.textContent = userName;

    const headerAvatar = document.querySelector('.user-avatar-circle');
    if (headerAvatar) headerAvatar.textContent = userAvatar;

    if (this.settingsUserNameInput) this.settingsUserNameInput.value = userName;
    if (this.settingsUserAvatarInput) this.settingsUserAvatarInput.value = userAvatar;

    // Update Hero Editorial Card
    const heroTitle = document.querySelector('.hero-editorial-title');
    if (heroTitle) {
      heroTitle.innerHTML = `أهلاً 👋 ${userName}! <span class="inline-avatar">${userAvatar}</span> تقييمك العام <span style="font-weight:900;">يتجاوز المتوسط</span>.`;
    }
  }

  toggleTheme() {
    this.prefs.dark = !this.prefs.dark;
    this.savePrefs();
    this.applyPrefs();
    if (this.prefs.haptics && navigator.vibrate) navigator.vibrate(15);
  }

  // ==========================================================================
  // 2. Audio & Haptics Engine (Double Pulse Haptics)
  // ==========================================================================
  playGlassChime() {
    if (!this.prefs.sound) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, this.audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.23);
    } catch (e) {}
  }

  playCelebrationSound() {
    if (!this.prefs.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx && AudioContext) this.audioCtx = new AudioContext();
      if (!this.audioCtx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const start = this.audioCtx.currentTime + (idx * 0.08);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch (e) {}
  }

  triggerHaptic(type = 'light') {
    if (!this.prefs.haptics || !navigator.vibrate) return;
    if (type === 'light') navigator.vibrate(12);
    else if (type === 'double') navigator.vibrate([15, 30, 20]);
    else if (type === 'success') navigator.vibrate([30, 50, 40, 80]);
  }

  // ==========================================================================
  // 3. Toast & Non-blocking Undo Engine (بديل راقٍ لرسائل التأكيد المزعجة)
  // ==========================================================================
  showToast(message, onUndoCallback) {
    if (!this.toastNotification || !this.toastMessage) return;

    if (this.toastTimer) clearTimeout(this.toastTimer);

    this.toastMessage.textContent = message;
    this.toastNotification.classList.add('show');

    // Bind Undo Button
    const newUndoBtn = this.toastUndoBtn.cloneNode(true);
    this.toastUndoBtn.parentNode.replaceChild(newUndoBtn, this.toastUndoBtn);
    this.toastUndoBtn = newUndoBtn;

    this.toastUndoBtn.onclick = () => {
      if (onUndoCallback) onUndoCallback();
      this.hideToast();
    };

    this.toastTimer = setTimeout(() => {
      this.hideToast();
    }, 4500);
  }

  hideToast() {
    if (this.toastNotification) {
      this.toastNotification.classList.remove('show');
    }
  }

  // ==========================================================================
  // 4. Date Utilities
  // ==========================================================================
  getTodayDateString() {
    return this.formatDateKey(new Date());
  }

  formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getLast7Days() {
    const days = [];
    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = this.formatDateKey(d);
      days.push({
        dateStr,
        label: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: i === 0
      });
    }
    return days;
  }

  // ==========================================================================
  // 5. DOM Initialization
  // ==========================================================================
  initDOM() {
    this.openSettingsHeaderBtn = document.getElementById('openSettingsHeaderBtn');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.openAddModalBtn = document.getElementById('openAddModalBtn');
    this.quickAddHabitTrigger = document.getElementById('quickAddHabitTrigger');
    this.vacationModeBanner = document.getElementById('vacationModeBanner');
    this.disableVacationBtn = document.getElementById('disableVacationBtn');

    // Toast
    this.toastNotification = document.getElementById('toastNotification');
    this.toastMessage = document.getElementById('toastMessage');
    this.toastUndoBtn = document.getElementById('toastUndoBtn');

    // Hero elements
    this.greetingTimeText = document.getElementById('greetingTimeText');
    this.heroBestResultText = document.getElementById('heroBestResultText');
    this.heroMomentumPillText = document.getElementById('heroMomentumPillText');
    this.heroXpPill = document.getElementById('heroXpPill');
    this.heroXpText = document.getElementById('heroXpText');
    this.heroFreezeBtn = document.getElementById('heroFreezeBtn');
    this.heroFreezeText = document.getElementById('heroFreezeText');
    this.switchToAnalyticsQuickBtn = document.getElementById('switchToAnalyticsQuickBtn');

    // Routine Flow Triggers
    this.startMorningRoutineBtn = document.getElementById('startMorningRoutineBtn');
    this.startEveningRoutineBtn = document.getElementById('startEveningRoutineBtn');

    // Yellow progress card
    this.toggleWeeklyViewBtn = document.getElementById('toggleWeeklyViewBtn');
    this.toggleMonthlyViewBtn = document.getElementById('toggleMonthlyViewBtn');
    this.yellowHeadlineText = document.getElementById('yellowHeadlineText');
    this.yellowPercentageText = document.getElementById('yellowPercentageText');

    // Mint card
    this.mintCardText = document.getElementById('mintCardText');
    this.refreshQuotesBtn = document.getElementById('refreshQuotesBtn');

    // Day Strip, Time of Day & Filter Tags
    this.dayStripContainer = document.getElementById('dayStripContainer');
    this.timeOfDayFilterBar = document.getElementById('timeOfDayFilterBar');
    this.categoryFilterBar = document.getElementById('categoryFilterBar');

    // Tasks & Habits section
    this.tasksDateBadge = document.getElementById('tasksDateBadge');
    this.pendingHabitsCountText = document.getElementById('pendingHabitsCountText');
    this.habitsContainer = document.getElementById('habitsContainer');
    this.habitsViewSegmented = document.getElementById('habitsViewSegmented');
    this.habitColorPicker = document.getElementById('habitColorPicker');
    this.habitColorInput = document.getElementById('habitColorInput');

    // Quit habits
    this.quitHabitsStream = document.getElementById('quitHabitsStream');
    this.openAddQuitHabitBtn = document.getElementById('openAddQuitHabitBtn');

    // To-Do section
    this.todoForm = document.getElementById('todoForm');
    this.todoInput = document.getElementById('todoInput');
    this.todoPrioritySelect = document.getElementById('todoPrioritySelect');
    this.todoListStream = document.getElementById('todoListStream');
    this.todoStatsPill = document.getElementById('todoStatsPill');

    // Analytics section
    this.annualMatrixGrid = document.getElementById('annualMatrixGrid');
    this.annualActiveDaysPill = document.getElementById('annualActiveDaysPill');
    this.weeklyAverageRate = document.getElementById('weeklyAverageRate');
    this.weeklyChartBars = document.getElementById('weeklyChartBars');

    this.prevMonthBtn = document.getElementById('prevMonthBtn');
    this.nextMonthBtn = document.getElementById('nextMonthBtn');
    this.currentMonthYearLabel = document.getElementById('currentMonthYearLabel');
    this.monthlyHeatmapGrid = document.getElementById('monthlyHeatmapGrid');
    this.statActiveDays = document.getElementById('statActiveDays');
    this.statMonthlyRate = document.getElementById('statMonthlyRate');
    this.statBestStreak = document.getElementById('statBestStreak');

    // Monthly Recap
    this.recapMonthTitle = document.getElementById('recapMonthTitle');
    this.recapGradeBadge = document.getElementById('recapGradeBadge');
    this.recapEvaluationText = document.getElementById('recapEvaluationText');
    this.recapTotalTasks = document.getElementById('recapTotalTasks');
    this.recapTotalHabitChecks = document.getElementById('recapTotalHabitChecks');
    this.recapChampionHabit = document.getElementById('recapChampionHabit');

    // Badges
    this.badgesContainer = document.getElementById('badgesContainer');
    this.badgesUnlockedCount = document.getElementById('badgesUnlockedCount');

    // Navigation & Modals
    this.panelToday = document.getElementById('panelToday');
    this.panelTasks = document.getElementById('panelTasks');
    this.panelAnalytics = document.getElementById('panelAnalytics');
    this.desktopNavSwitcher = document.getElementById('desktopNavSwitcher');
    this.bentoTabBar = document.getElementById('bentoTabBar');
    this.profileTabBtn = document.getElementById('profileTabBtn');

    // Habit Modal
    this.habitModal = document.getElementById('habitModal');
    this.habitModalTitle = document.getElementById('habitModalTitle');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.habitForm = document.getElementById('habitForm');
    this.habitNameInput = document.getElementById('habitNameInput');
    this.habitTargetInput = document.getElementById('habitTargetInput');
    this.habitUnitInput = document.getElementById('habitUnitInput');
    this.habitStepInput = document.getElementById('habitStepInput');
    this.targetInputGroup = document.getElementById('targetInputGroup');
    this.targetLabel = document.getElementById('targetLabel');
    this.habitSubmitBtn = document.getElementById('habitSubmitBtn');
    this.habitDeleteBtn = document.getElementById('habitDeleteBtn');
    this.habitResetHistoryBtn = document.getElementById('habitResetHistoryBtn');
    this.emojiPicker = document.getElementById('emojiPicker');
    this.modalTagSelector = document.getElementById('modalTagSelector');
    this.openAddCategoryInlineBtn = document.getElementById('openAddCategoryInlineBtn');
    this.inlineCategoryForm = document.getElementById('inlineCategoryForm');
    this.newCatEmojiInput = document.getElementById('newCatEmojiInput');
    this.newCatNameInput = document.getElementById('newCatNameInput');
    this.saveInlineCatBtn = document.getElementById('saveInlineCatBtn');
    this.modalTimeSelector = document.getElementById('modalTimeSelector');
    this.habitStackSelect = document.getElementById('habitStackSelect');

    // Frequency & Mini Habit (Community Power Features - Step 5)
    this.freqDailyBtn = document.getElementById('freqDailyBtn');
    this.freqWeeklyBtn = document.getElementById('freqWeeklyBtn');
    this.weeklyTargetInputRow = document.getElementById('weeklyTargetInputRow');
    this.habitDaysPerWeekInput = document.getElementById('habitDaysPerWeekInput');
    this.habitMiniVersionInput = document.getElementById('habitMiniVersionInput');

    // Routine Flow Runner Modal
    this.routineFlowModal = document.getElementById('routineFlowModal');
    this.closeRoutineFlowBtn = document.getElementById('closeRoutineFlowBtn');
    this.routinePrevBtn = document.getElementById('routinePrevBtn');
    this.routineDoneNextBtn = document.getElementById('routineDoneNextBtn');

    // Nature buttons
    this.naturePositiveBtn = document.getElementById('naturePositiveBtn');
    this.natureQuitBtn = document.getElementById('natureQuitBtn');
    this.positiveTypeGroup = document.getElementById('positiveTypeGroup');
    this.timeOfDayGroup = document.getElementById('timeOfDayGroup');
    this.habitStackingGroup = document.getElementById('habitStackingGroup');

    // Type buttons
    this.typeCheckBtn = document.getElementById('typeCheckBtn');
    this.typeCounterBtn = document.getElementById('typeCounterBtn');
    this.typeTimerBtn = document.getElementById('typeTimerBtn');

    // Settings Modal & Personalization
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    this.settingsUserNameInput = document.getElementById('settingsUserNameInput');
    this.settingsUserAvatarInput = document.getElementById('settingsUserAvatarInput');
    this.saveProfileBtn = document.getElementById('saveProfileBtn');
    this.accentPalettePicker = document.getElementById('accentPalettePicker');
    this.soundPrefToggle = document.getElementById('soundPrefToggle');
    this.hapticPrefToggle = document.getElementById('hapticPrefToggle');
    this.vacationPrefToggle = document.getElementById('vacationPrefToggle');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importDataTriggerBtn = document.getElementById('importDataTriggerBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.resetDataBtn = document.getElementById('resetDataBtn');

    this.celebrationCanvas = document.getElementById('celebrationCanvas');
  }

  renderDate() {
    const now = new Date();
    const hours = now.getHours();
    let greeting = 'مرحباً بك 👋';
    if (hours < 12) greeting = 'صباح الخير والنشاط 🌅';
    else if (hours < 18) greeting = 'مساء الخير والإنتاجية ☀️';
    else greeting = 'مساء الإنجاز والهدوء 🌙';

    if (this.greetingTimeText) this.greetingTimeText.textContent = greeting;

    const parts = this.selectedDateStr.split('-');
    const activeDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayName = activeDateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
    const day = activeDateObj.getDate();

    if (this.tasksDateBadge) {
      this.tasksDateBadge.textContent = `${day} ${dayName}`;
    }
  }

  // ==========================================================================
  // 6. Horizontal Day Picker Strip
  // ==========================================================================
  renderDayStrip() {
    if (!this.dayStripContainer) return;
    const days = this.getLast7Days();
    this.dayStripContainer.innerHTML = '';

    days.forEach(d => {
      const isSelected = (d.dateStr === this.selectedDateStr);

      let completedCount = 0;
      this.habits.forEach(h => {
        if (h.type === 'counter') {
          if ((h.history[d.dateStr] || 0) >= h.target) completedCount++;
        } else {
          if (h.history[d.dateStr]) completedCount++;
        }
      });
      const isAllDone = (this.habits.length > 0 && completedCount === this.habits.length);

      const card = document.createElement('div');
      card.className = `day-strip-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <span class="day-strip-name">${d.label}</span>
        <span class="day-strip-num">${d.dayNum}</span>
        <div class="day-strip-dot" style="${isAllDone ? 'background:#38EF7D;' : ''}"></div>
      `;

      card.addEventListener('click', () => {
        this.selectedDateStr = d.dateStr;
        this.triggerHaptic('light');
        this.renderDayStrip();
        this.renderDate();
        this.renderHabits();
        this.renderTodos();
        this.updateMomentumAndHero();
      });

      this.dayStripContainer.appendChild(card);
    });
  }

  // ==========================================================================
  // 7. Habit Completion & Streaks
  // ==========================================================================
  isHabitDoneForDate(habit, dateStr) {
    if (habit.type === 'counter') {
      return (habit.history[dateStr] || 0) >= habit.target;
    }
    return !!habit.history[dateStr];
  }

  calculateStreak(habit) {
    if (this.prefs.vacation) return 'مجمدة 🏖️';

    let streak = 0;
    const todayStr = this.getTodayDateString();

    let checkDate = new Date();
    const isTodayDone = this.isHabitDoneForDate(habit, todayStr);
    const isTodayFrozen = this.prefs.frozenDates && this.prefs.frozenDates[todayStr];

    if (!isTodayDone && !isTodayFrozen) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = this.formatDateKey(checkDate);
      const isDone = this.isHabitDoneForDate(habit, dateStr);
      const isFrozen = this.prefs.frozenDates && this.prefs.frozenDates[dateStr];

      if (isDone || isFrozen) {
        if (isDone) streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // ==========================================================================
  // Community Power Features (Step 5 - Reddit & Global Habit Apps Best Practices)
  // ==========================================================================
  toggleFreezeToday() {
    const todayStr = this.getTodayDateString();
    if (!this.prefs.frozenDates) this.prefs.frozenDates = {};
    if (this.prefs.freezeTokens === undefined) this.prefs.freezeTokens = 2;

    if (this.prefs.frozenDates[todayStr]) {
      delete this.prefs.frozenDates[todayStr];
      this.prefs.freezeTokens = Math.min(3, this.prefs.freezeTokens + 1);
      this.savePrefs();
      this.triggerHaptic('light');
      this.showToast('تم إلغاء تجميد اليوم واسترجاع رصيد التجميد 🧊');
    } else {
      if (this.prefs.freezeTokens <= 0) {
        this.triggerHaptic('double');
        this.showToast('رصيدك من تجميد السلاسل فارغ (0/3) ⚠️');
        return;
      }
      this.prefs.freezeTokens--;
      this.prefs.frozenDates[todayStr] = true;
      this.savePrefs();
      this.triggerHaptic('success');
      this.showToast(`تم تجميد اليوم بنجاح 🧊 (المتبقي: ${this.prefs.freezeTokens}/3)`);
    }
    this.renderHabits();
    this.updateMomentumAndHero();
    if (this.canvas) this.canvas.refreshActiveWidgets();
  }

  getWeeklyCompletions(habit) {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = this.formatDateKey(d);
      if (this.isHabitDoneForDate(habit, dStr)) {
        count++;
      }
    }
    return count;
  }

  toggleMiniCheckHabit(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    const prevDone = this.habits.filter(h => this.isHabitDoneForDate(h, this.selectedDateStr)).length;

    if (habit.history[this.selectedDateStr] === 'mini') {
      delete habit.history[this.selectedDateStr];
      this.triggerHaptic('light');
      this.showToast(`تم إلغاء إنجاز: ${habit.name}`);
    } else {
      habit.history[this.selectedDateStr] = 'mini';
      this.playGlassChime();
      this.triggerHaptic('double');
      this.showToast(`تم إنجاز النسخة المصغرة 🌱 (${habit.miniVersion || 'قاعدة الدقيقتين'}) +5 XP`);
    }

    this.saveHabits();
    this.renderHabits();
    this.renderDayStrip();
    this.updateMomentumAndHero();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.renderBadges();
    this.checkAllHabitsCompleted(prevDone);
  }

  calculateXP() {
    let xp = 0;
    this.habits.forEach(h => {
      Object.keys(h.history || {}).forEach(dateStr => {
        if (h.history[dateStr] === 'mini') {
          xp += 5;
        } else if (this.isHabitDoneForDate(h, dateStr)) {
          xp += 10;
        }
      });
      const s = this.calculateStreak(h);
      if (typeof s === 'number' && s >= 3) {
        xp += Math.floor(s / 3) * 15;
      }
    });

    const levelThresholds = [
      { level: 1, title: 'مبتدئ النشاط 🌱', minXP: 0, nextXP: 100 },
      { level: 2, title: 'ممارس واعد ⚡', minXP: 100, nextXP: 300 },
      { level: 3, title: 'منضبط بثبات 🛡️', minXP: 300, nextXP: 600 },
      { level: 4, title: 'بطل الزخم 📈', minXP: 600, nextXP: 1000 },
      { level: 5, title: 'خبير العادات 🏆', minXP: 1000, nextXP: 1500 },
      { level: 6, title: 'سيد التدفق الذهني 👑', minXP: 1500, nextXP: 2500 }
    ];

    let currentLvl = levelThresholds[0];
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (xp >= levelThresholds[i].minXP) {
        currentLvl = levelThresholds[i];
        break;
      }
    }

    const range = Math.max(1, currentLvl.nextXP - currentLvl.minXP);
    const progress = Math.min(100, Math.max(0, Math.round(((xp - currentLvl.minXP) / range) * 100)));

    return {
      xp,
      level: currentLvl.level,
      title: currentLvl.title,
      progress,
      nextXP: currentLvl.nextXP
    };
  }

  // مشغل سلاسل الروتين (Routine Flow Runner)
  startRoutine(timeOfDay = 'morning') {
    const list = this.habits.filter(h => h.timeOfDay === timeOfDay || h.timeOfDay === 'all');
    if (list.length === 0) {
      this.showToast(`لا توجد عادات مسجلة لفترة ${timeOfDay === 'morning' ? 'الصباح 🌅' : 'المساء 🌙'}`);
      return;
    }
    this.currentRoutineHabits = list;
    this.currentRoutineIndex = 0;
    const modal = document.getElementById('routineFlowModal');
    const title = document.getElementById('routineFlowTitle');
    if (title) title.textContent = timeOfDay === 'morning' ? 'روتين الصباح الباكر 🌅' : 'روتين المساء والتهيئة 🌙';
    if (modal) modal.classList.add('open');
    this.renderRoutineStep();
  }

  renderRoutineStep() {
    const habit = this.currentRoutineHabits[this.currentRoutineIndex];
    if (!habit) return;

    const emojiEl = document.getElementById('routineCurrentEmoji');
    const titleEl = document.getElementById('routineCurrentTitle');
    const subEl = document.getElementById('routineCurrentSub');
    const hintEl = document.getElementById('routineMiniHint');
    const progressFill = document.getElementById('routineFlowProgressFill');

    if (emojiEl) emojiEl.textContent = habit.emoji || '✨';
    if (titleEl) titleEl.textContent = habit.name;
    if (subEl) subEl.textContent = `الخطوة ${this.currentRoutineIndex + 1} من ${this.currentRoutineHabits.length}`;

    if (hintEl) {
      if (habit.miniVersion) {
        hintEl.style.display = 'block';
        hintEl.textContent = `النسخة المصغرة للأيام الصعبة: ${habit.miniVersion} 🌱`;
      } else {
        hintEl.style.display = 'none';
      }
    }

    if (progressFill) {
      const pct = Math.round(((this.currentRoutineIndex) / this.currentRoutineHabits.length) * 100);
      progressFill.style.width = `${pct}%`;
    }
  }

  routineDoneAndNext() {
    const habit = this.currentRoutineHabits[this.currentRoutineIndex];
    if (habit) {
      if (!this.isHabitDoneForDate(habit, this.selectedDateStr)) {
        if (habit.type === 'counter') {
          habit.history[this.selectedDateStr] = habit.target;
        } else {
          habit.history[this.selectedDateStr] = true;
        }
        this.saveHabits();
        this.playGlassChime();
        this.triggerHaptic('double');
      }
    }

    if (this.currentRoutineIndex < this.currentRoutineHabits.length - 1) {
      this.currentRoutineIndex++;
      this.renderRoutineStep();
    } else {
      const progressFill = document.getElementById('routineFlowProgressFill');
      if (progressFill) progressFill.style.width = '100%';
      this.playCelebrationSound();
      this.showToast('🎉 تهانينا! أتممت تسلسل الروتين كاملاً بنجاح!');
      setTimeout(() => {
        const modal = document.getElementById('routineFlowModal');
        if (modal) modal.classList.remove('open');
        this.renderHabits();
        this.updateMomentumAndHero();
        if (this.canvas) this.canvas.refreshActiveWidgets();
      }, 700);
    }
  }

  routinePrevStep() {
    if (this.currentRoutineIndex > 0) {
      this.currentRoutineIndex--;
      this.renderRoutineStep();
    }
  }

  closeRoutine() {
    const modal = document.getElementById('routineFlowModal');
    if (modal) modal.classList.remove('open');
    this.renderHabits();
    this.updateMomentumAndHero();
  }

  checkAllHabitsCompleted(prevDone) {
    if (this.selectedDateStr !== this.getTodayDateString()) return;
    if (this.habits.length === 0) return;

    const currentDone = this.habits.filter(h => this.isHabitDoneForDate(h, this.selectedDateStr)).length;
    if (currentDone === this.habits.length && prevDone < this.habits.length && !this.hasCelebratedToday) {
      this.hasCelebratedToday = true;
      this.triggerCelebration();
    } else if (currentDone < this.habits.length) {
      this.hasCelebratedToday = false;
    }
  }

  toggleCheckHabit(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    const prevDone = this.habits.filter(h => this.isHabitDoneForDate(h, this.selectedDateStr)).length;

    if (habit.history[this.selectedDateStr]) {
      delete habit.history[this.selectedDateStr];
      this.triggerHaptic('light');
    } else {
      habit.history[this.selectedDateStr] = true;
      this.playGlassChime();
      this.triggerHaptic('double');
    }

    this.saveHabits();
    this.renderHabits();
    this.renderDayStrip();
    this.updateMomentumAndHero();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.renderBadges();
    this.checkAllHabitsCompleted(prevDone);
  }

  incrementCounterHabit(habitId, delta) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    const prevDone = this.habits.filter(h => this.isHabitDoneForDate(h, this.selectedDateStr)).length;
    const currentVal = habit.history[this.selectedDateStr] || 0;
    const step = Number(habit.step) || 1;
    const newVal = Math.max(0, currentVal + (delta * step));
    habit.history[this.selectedDateStr] = newVal;

    if (newVal >= habit.target && currentVal < habit.target) {
      this.playGlassChime();
      this.triggerHaptic('double');
    } else {
      this.triggerHaptic('light');
    }

    this.saveHabits();
    this.renderHabits();
    this.renderDayStrip();
    this.updateMomentumAndHero();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.renderBadges();
    this.checkAllHabitsCompleted(prevDone);
  }

  toggleFocusTimer(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!this.activeTimers[habitId]) {
      this.activeTimers[habitId] = {
        remainingSeconds: habit.target * 60,
        isRunning: false,
        intervalId: null
      };
    }

    const timer = this.activeTimers[habitId];

    if (timer.isRunning) {
      clearInterval(timer.intervalId);
      timer.isRunning = false;
      this.triggerHaptic('light');
      this.renderHabits();
    } else {
      timer.isRunning = true;
      this.triggerHaptic('double');
      timer.intervalId = setInterval(() => {
        timer.remainingSeconds--;
        if (timer.remainingSeconds <= 0) {
          clearInterval(timer.intervalId);
          timer.isRunning = false;
          timer.remainingSeconds = habit.target * 60;
          const prevDone = this.habits.filter(h => this.isHabitDoneForDate(h, this.selectedDateStr)).length;
          habit.history[this.selectedDateStr] = true;
          this.saveHabits();
          this.playCelebrationSound();
          this.triggerHaptic('success');
          this.showToast(`🎉 تهانينا! أكملت بنجاح جلسة ${habit.name}!`);
          this.updateMomentumAndHero();
          this.renderWeeklyChart();
          this.renderAnnualMatrix();
          this.renderMonthlyAnalytics();
          this.renderBadges();
          this.checkAllHabitsCompleted(prevDone);
        }
        this.renderHabits();
      }, 1000);
      this.renderHabits();
    }
  }

  // ==========================================================================
  // 8. Habits Rendering & Swipe Ergonomics
  // ==========================================================================
  renderHabits() {
    this.habitsContainer.innerHTML = '';

    if (this.habitsViewSegmented) {
      const btns = this.habitsViewSegmented.querySelectorAll('.habits-view-btn');
      btns.forEach(b => {
        b.classList.toggle('active', b.dataset.habitsView === this.habitsViewMode);
      });
    }

    const filteredHabits = this.habits.filter(h => {
      const matchTag = (this.activeFilterTag === 'all' || h.tag === this.activeFilterTag);
      const matchTime = (this.activeTimeFilter === 'all' || h.timeOfDay === 'all' || h.timeOfDay === this.activeTimeFilter);
      return matchTag && matchTime;
    });

    if (filteredHabits.length === 0) {
      this.habitsContainer.innerHTML = `
        <div style="text-align:center; padding: 24px; font-size:14px; color:var(--text-secondary); background:var(--card-gray-subtle); border-radius:20px;">
          لا توجد عادات مسجلة لهذه الفترة أو التصنيف.
        </div>
      `;
      if (this.pendingHabitsCountText) this.pendingHabitsCountText.textContent = '0 عادات';
      return;
    }

    if (this.pendingHabitsCountText) {
      this.pendingHabitsCountText.textContent = `${this.habits.length} عادات`;
    }

    if (this.habitsViewMode === 'yearly') {
      this.renderYearlyHabits(filteredHabits);
      return;
    }

    if (this.habitsViewMode === 'weekly') {
      this.renderWeeklyHabits(filteredHabits);
      return;
    }

    let completedTodayCount = 0;
    const last7Days = this.getLast7Days();

    filteredHabits.forEach(habit => {
      const isCompleted = this.isHabitDoneForDate(habit, this.selectedDateStr);
      if (isCompleted) completedTodayCount++;

      const streak = this.calculateStreak(habit);
      const itemEl = document.createElement('div');
      itemEl.className = 'bento-habit-item';

      const dotsHTML = last7Days.map(day => {
        const isDone = this.isHabitDoneForDate(habit, day.dateStr);
        return `
          <div class="bento-dot-unit ${day.isToday ? 'is-today' : ''}">
            <span class="bento-dot-label">${day.label}</span>
            <div class="bento-dot-circle ${isDone ? 'active' : ''}"></div>
          </div>
        `;
      }).join('');

      let actionControlHTML = '';
      if (habit.type === 'counter') {
        const currentCount = habit.history[this.selectedDateStr] || 0;
        const unitSuffix = habit.unit ? ` ${habit.unit}` : '';
        actionControlHTML = `
          <div class="stepper-control-group">
            <button class="stepper-btn" data-step-minus="${habit.id}">-</button>
            <span class="stepper-counter-text">${currentCount}/${habit.target}${unitSuffix}</span>
            <button class="stepper-btn" data-step-plus="${habit.id}">+</button>
          </div>
        `;
      } else if (habit.type === 'timer') {
        const timer = this.activeTimers[habit.id] || { remainingSeconds: habit.target * 60, isRunning: false };
        const m = Math.floor(timer.remainingSeconds / 60);
        const s = timer.remainingSeconds % 60;
        const timeDisplay = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        actionControlHTML = `
          <div class="timer-control-box">
            <span class="timer-countdown-display">${timeDisplay}</span>
            <button class="timer-play-btn" data-timer-toggle="${habit.id}">
              ${timer.isRunning ? '⏸' : '▶'}
            </button>
          </div>
        `;
      } else {
        actionControlHTML = `
          <button class="bento-check-circle ${isCompleted ? 'completed' : ''}" data-check="${habit.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        `;
      }

      let stackBadgeHTML = '';
      if (habit.stackParentId) {
        const parentHabit = this.habits.find(h => h.id === habit.stackParentId);
        if (parentHabit) {
          stackBadgeHTML = `<div class="habit-stack-badge">🔗 بعد: ${parentHabit.name}</div>`;
        }
      }

      let freqBadgeHTML = '';
      if (habit.frequency === 'weekly') {
        const weeklyDone = this.getWeeklyCompletions(habit);
        const weeklyTarget = habit.weeklyTarget || habit.daysPerWeek || 3;
        const isMet = weeklyDone >= weeklyTarget;
        freqBadgeHTML = `<div class="habit-weekly-pill ${isMet ? 'target-met' : ''}">🎯 ${weeklyDone}/${weeklyTarget} أسبوعياً ${isMet ? '🏆' : ''}</div>`;
      }

      let miniBtnHTML = '';
      if (habit.miniVersion) {
        const isMiniDone = habit.history[this.selectedDateStr] === 'mini';
        miniBtnHTML = `
          <button type="button" class="bento-mini-btn ${isMiniDone ? 'active' : ''}" data-mini-check="${habit.id}" title="النسخة المصغرة للأيام الصعبة: ${habit.miniVersion} 🌱">
            🌱 مصغر
          </button>
        `;
      }

      itemEl.innerHTML = `
        <div class="habit-main-row">
          <div class="habit-left-meta" data-edit="${habit.id}" title="اضغط للتعديل">
            <span class="bento-drag-handle" title="اسحب لإعادة الترتيب">⋮⋮</span>
            <div class="habit-avatar-badge">${habit.emoji || '✨'}</div>
            <div class="habit-info-texts">
              <span class="habit-title-text">${habit.name}</span>
              <span class="habit-sub-streak">🔥 ${streak} ${typeof streak === 'number' ? (streak === 1 ? 'يوم' : 'أيام متتالية') : ''}</span>
              ${stackBadgeHTML}
              ${freqBadgeHTML}
            </div>
          </div>
          <div class="habit-right-actions">
            ${miniBtnHTML}
            ${actionControlHTML}
          </div>
        </div>
        <div class="bento-dots-row">
          ${dotsHTML}
        </div>
      `;

      // Event handlers
      const checkBtn = itemEl.querySelector('[data-check]');
      if (checkBtn) {
        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCheckHabit(habit.id);
        });
      }

      const miniBtn = itemEl.querySelector('[data-mini-check]');
      if (miniBtn) {
        miniBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMiniCheckHabit(habit.id);
        });
      }

      const minusBtn = itemEl.querySelector('[data-step-minus]');
      if (minusBtn) {
        minusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.incrementCounterHabit(habit.id, -1);
        });
      }

      const plusBtn = itemEl.querySelector('[data-step-plus]');
      if (plusBtn) {
        plusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.incrementCounterHabit(habit.id, 1);
        });
      }

      const timerBtn = itemEl.querySelector('[data-timer-toggle]');
      if (timerBtn) {
        timerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFocusTimer(habit.id);
        });
      }

      itemEl.querySelector('[data-edit]').addEventListener('click', () => {
        this.openEditHabitModal(habit);
      });

      this.habitsContainer.appendChild(itemEl);
    });

    if (this.pendingHabitsCountText) {
      this.pendingHabitsCountText.textContent = `${this.habits.length} عادات`;
    }

    // Initialize Universal Drag & Drop for Habits
    if (window.HabitFlowDragDrop && this.habitsContainer) {
      window.HabitFlowDragDrop.makeSortable({
        container: this.habitsContainer,
        itemSelector: '.bento-habit-item',
        handleSelector: '.bento-drag-handle',
        onReorder: (fromIndex, toIndex) => {
          const [movedHabit] = this.habits.splice(fromIndex, 1);
          this.habits.splice(toIndex, 0, movedHabit);
          this.saveHabits();
          this.renderHabits();
          this.showToast('تم حفظ الترتيب الجديد للعادات ✨');
          if (this.events) this.events.emit('habits:reordered', { fromIndex, toIndex });
        }
      });
    }
  }

  // ==========================================================================
  // HabitKit Yearly Heatmap Matrix per Habit (مصفوفة الإنجاز السنوية الحرارية)
  // ==========================================================================
  renderYearlyHabits(filteredHabits) {
    this.habitsContainer.className = 'view-yearly';
    this.habitsContainer.innerHTML = '';
    const today = new Date();
    const todayStr = this.getTodayDateString();

    const numWeeks = 26;
    const daysInGrid = numWeeks * 7;
    const currentDayOfWeek = today.getDay(); // 0: Sun, 6: Sat

    // Align grid so last column ends on Saturday of the current week
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - currentDayOfWeek));

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (daysInGrid - 1));

    // Generate weeks matrix and month markers
    const weeks = [];
    const monthMarkers = [];
    let lastMonth = -1;

    let walker = new Date(startDate);
    for (let w = 0; w < numWeeks; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const dStr = this.formatDateKey(walker);
        const m = walker.getMonth();
        if (m !== lastMonth && d === 0) {
          lastMonth = m;
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthMarkers.push({ col: w, name: monthNames[m] });
        }
        weekDays.push({
          dateStr: dStr,
          isToday: dStr === todayStr,
          isFuture: walker > today
        });
        walker.setDate(walker.getDate() + 1);
      }
      weeks.push(weekDays);
    }

    filteredHabits.forEach(habit => {
      const habitColor = habit.color || '#3B82F6';
      const streak = this.calculateStreak(habit);
      const totalDays = Object.keys(habit.history || {}).filter(k => this.isHabitDoneForDate(habit, k)).length;
      const isCompletedToday = this.isHabitDoneForDate(habit, todayStr);

      const cardEl = document.createElement('div');
      cardEl.className = 'habit-yearly-card';
      cardEl.style.setProperty('--habit-color', habitColor);
      cardEl.style.setProperty('--habit-glow-bg', `${habitColor}1F`);
      cardEl.style.setProperty('--habit-glow-border', `${habitColor}4D`);
      cardEl.style.setProperty('--habit-glow-shadow', `${habitColor}33`);

      // Right Action Button
      let actionBtnHTML = '';
      if (habit.type === 'counter') {
        const currentCount = habit.history[todayStr] || 0;
        actionBtnHTML = `
          <button type="button" class="habit-yearly-action-btn" data-yearly-step="${habit.id}" title="إضافة للعداد">
            ${currentCount}
          </button>
        `;
      } else if (habit.type === 'timer') {
        const timer = this.activeTimers[habit.id] || { remainingSeconds: habit.target * 60, isRunning: false };
        const m = Math.floor(timer.remainingSeconds / 60);
        const timeStr = m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
        actionBtnHTML = `
          <button type="button" class="habit-yearly-action-btn" data-yearly-timer="${habit.id}" title="بدء / إيقاف المؤقت">
            ${timer.isRunning ? '⏸ ' + timeStr : timeStr}
          </button>
        `;
      } else {
        actionBtnHTML = `
          <button type="button" class="habit-yearly-action-btn is-check-btn ${isCompletedToday ? 'completed' : ''}" data-yearly-check="${habit.id}" title="تسجيل الإنجاز لليوم">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        `;
      }

      // Month headers positioned directly above corresponding week columns
      const monthsRowHTML = monthMarkers.map(m => `
        <span class="habit-heatmap-month-label" style="grid-column-start: ${m.col + 1};">${m.name}</span>
      `).join('');

      // Grid Tiles (7 rows x numWeeks columns)
      let gridHTML = '';
      for (let w = 0; w < numWeeks; w++) {
        for (let d = 0; d < 7; d++) {
          const dayInfo = weeks[w][d];
          if (dayInfo.isFuture) {
            gridHTML += `<div class="habit-heatmap-tile" style="opacity:0.25;" title="مستقبل"></div>`;
            continue;
          }
          const isDone = this.isHabitDoneForDate(habit, dayInfo.dateStr);
          const countVal = habit.history[dayInfo.dateStr] || 0;
          const isMilestone = (habit.type === 'counter' && countVal > habit.target);

          gridHTML += `
            <div class="habit-heatmap-tile ${isDone ? 'is-active' : ''} ${isMilestone ? 'is-milestone' : ''} ${dayInfo.isToday ? 'is-today' : ''}"
                 data-habit-id="${habit.id}"
                 data-date="${dayInfo.dateStr}"
                 title="${dayInfo.dateStr}: ${isDone ? 'مكتمل ✅' : 'غير مكتمل ⚪'}">
            </div>
          `;
        }
      }

      cardEl.innerHTML = `
        <div class="habit-yearly-header">
          <div class="habit-yearly-left" data-edit="${habit.id}" title="تعديل العادة">
            <div class="habit-yearly-avatar">${habit.emoji || '✨'}</div>
            <div class="habit-yearly-info">
              <span class="habit-yearly-title">${habit.name}</span>
              <div class="habit-yearly-stats">
                <span class="habit-yearly-streak">🔥 ${streak}</span>
                <span class="habit-yearly-total-days">${totalDays}d</span>
              </div>
            </div>
          </div>
          <div class="habit-yearly-right">
            ${actionBtnHTML}
          </div>
        </div>

        <div class="habit-heatmap-container">
          <div class="habit-heatmap-months-row">
            ${monthsRowHTML}
          </div>
          <div class="habit-heatmap-grid">
            ${gridHTML}
          </div>
        </div>
      `;

      // Quick action listeners
      const checkBtn = cardEl.querySelector('[data-yearly-check]');
      if (checkBtn) {
        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCheckHabit(habit.id);
        });
      }

      const stepBtn = cardEl.querySelector('[data-yearly-step]');
      if (stepBtn) {
        stepBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.incrementCounterHabit(habit.id, 1);
        });
      }

      const timerBtn = cardEl.querySelector('[data-yearly-timer]');
      if (timerBtn) {
        timerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFocusTimer(habit.id);
        });
      }

      const editBtn = cardEl.querySelector('[data-edit]');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.openEditHabitModal(habit);
        });
      }

      // Heatmap cell click interaction: toggle completion for that historical date
      const tiles = cardEl.querySelectorAll('.habit-heatmap-tile[data-date]');
      tiles.forEach(tile => {
        tile.addEventListener('click', (e) => {
          e.stopPropagation();
          const dStr = tile.dataset.date;
          const wasDone = this.isHabitDoneForDate(habit, dStr);
          if (wasDone) {
            delete habit.history[dStr];
            this.triggerHaptic('light');
            this.showToast(`تم إلغاء إنجاز ${habit.name} ليوم ${dStr}`);
          } else {
            if (habit.type === 'counter') habit.history[dStr] = habit.target;
            else habit.history[dStr] = true;
            this.playGlassChime();
            this.triggerHaptic('double');
            this.showToast(`تم تسجيل إنجاز ${habit.name} ليوم ${dStr} ✅`);
          }
          this.saveHabits();
          this.renderHabits();
          this.updateMomentumAndHero();
          this.renderAnnualMatrix();
          this.renderMonthlyAnalytics();
          this.renderBadges();
        });
      });

      this.habitsContainer.appendChild(cardEl);
    });
  }

  // ==========================================================================
  // Habit Weekly Summary View (عرض الأسبوع)
  // ==========================================================================
  renderWeeklyHabits(filteredHabits) {
    this.habitsContainer.innerHTML = '';
    const last7Days = this.getLast7Days();

    filteredHabits.forEach(habit => {
      const habitColor = habit.color || '#3B82F6';
      const streak = this.calculateStreak(habit);
      const isCompletedToday = this.isHabitDoneForDate(habit, this.selectedDateStr);

      const cardEl = document.createElement('div');
      cardEl.className = 'habit-weekly-card';
      cardEl.style.setProperty('--habit-color', habitColor);
      cardEl.style.setProperty('--habit-glow-bg', `${habitColor}1F`);

      let daysHTML = last7Days.map(day => {
        const isDone = this.isHabitDoneForDate(habit, day.dateStr);
        return `
          <div class="habit-weekly-day-pill ${isDone ? 'completed' : ''}" data-day-toggle="${habit.id}" data-date="${day.dateStr}" title="${day.dateStr}">
            <span class="habit-weekly-day-label">${day.label}</span>
            <div class="habit-weekly-day-dot">${isDone ? '✓' : ''}</div>
          </div>
        `;
      }).join('');

      cardEl.innerHTML = `
        <div class="habit-yearly-header">
          <div class="habit-yearly-left" data-edit="${habit.id}" title="تعديل العادة">
            <div class="habit-yearly-avatar">${habit.emoji || '✨'}</div>
            <div class="habit-yearly-info">
              <span class="habit-yearly-title">${habit.name}</span>
              <div class="habit-yearly-stats">
                <span class="habit-yearly-streak">🔥 ${streak} أيام</span>
              </div>
            </div>
          </div>
          <div class="habit-yearly-right">
            <button type="button" class="habit-yearly-action-btn is-check-btn ${isCompletedToday ? 'completed' : ''}" data-weekly-check="${habit.id}" title="تسجيل الإنجاز اليوم">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
        <div class="habit-weekly-days-row">
          ${daysHTML}
        </div>
      `;

      const checkBtn = cardEl.querySelector('[data-weekly-check]');
      if (checkBtn) {
        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCheckHabit(habit.id);
        });
      }

      const dayPills = cardEl.querySelectorAll('[data-day-toggle]');
      dayPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const dStr = pill.dataset.date;
          if (habit.history[dStr]) delete habit.history[dStr];
          else habit.history[dStr] = (habit.type === 'counter' ? habit.target : true);
          this.saveHabits();
          this.renderHabits();
          this.updateMomentumAndHero();
        });
      });

      this.habitsContainer.appendChild(cardEl);
    });
  }

  // ==========================================================================
  // 9. Quit Bad Habits Clean Counter
  // ==========================================================================
  renderQuitHabits() {
    if (!this.quitHabitsStream) return;
    this.quitHabitsStream.innerHTML = '';

    if (this.quitHabits.length === 0) {
      this.quitHabitsStream.innerHTML = `
        <div style="text-align:center; padding: 14px; font-size:13px; color:rgba(255,255,255,0.6);">
          لا توجد عادات سلبية مضافة. اضغط (+) لتحديد عادة ترغب في التخلص منها وبدء عداد النقاء!
        </div>
      `;
      return;
    }

    const now = Date.now();

    this.quitHabits.forEach(item => {
      const startMs = new Date(item.startDate).getTime();
      const diffMs = Math.max(0, now - startMs);

      const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;

      const rowEl = document.createElement('div');
      rowEl.className = 'quit-item-row';
      rowEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:26px;">${item.emoji || '🚭'}</div>
          <div class="quit-item-info">
            <span class="quit-item-name">${item.name}</span>
            <span class="quit-time-ticker">⏱️ ${days} يوم و ${hours} ساعة نقاء</span>
            <span class="quit-savings-chip">تم توفير: ${item.savingsDaily || 'صحة ووقت'}</span>
          </div>
        </div>
        <button class="quit-reset-btn" data-quit-reset="${item.id}" title="إعادة تعيين العداد عند الانتكاسة">
          أعد الضبط
        </button>
      `;

      rowEl.querySelector('[data-quit-reset]').addEventListener('click', () => {
        const oldStartDate = item.startDate;
        item.startDate = new Date().toISOString();
        this.saveQuitHabits();
        this.renderQuitHabits();
        this.triggerHaptic('double');

        // Non-blocking Toast with Undo
        this.showToast(`تمت إعادة تعيين عداد ${item.name}`, () => {
          item.startDate = oldStartDate;
          this.saveQuitHabits();
          this.renderQuitHabits();
        });
      });

      this.quitHabitsStream.appendChild(rowEl);
    });
  }

  // ==========================================================================
  // 10. 365-Day Annual Habit Matrix
  // ==========================================================================
  renderAnnualMatrix() {
    if (!this.annualMatrixGrid) return;
    this.annualMatrixGrid.innerHTML = '';

    const today = new Date();
    let annualActiveCount = 0;

    for (let i = 363; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = this.formatDateKey(d);

      let done = 0;
      this.habits.forEach(h => {
        if (this.isHabitDoneForDate(h, dateStr)) done++;
      });

      const ratio = this.habits.length > 0 ? (done / this.habits.length) : 0;
      if (done > 0) annualActiveCount++;

      let levelClass = '';
      if (ratio > 0.85) levelClass = 'level-4';
      else if (ratio >= 0.6) levelClass = 'level-3';
      else if (ratio >= 0.3) levelClass = 'level-2';
      else if (ratio > 0) levelClass = 'level-1';

      const dot = document.createElement('div');
      dot.className = `annual-dot ${levelClass}`;
      dot.title = `${dateStr}: إنجاز ${Math.round(ratio * 100)}%`;

      this.annualMatrixGrid.appendChild(dot);
    }

    if (this.annualActiveDaysPill) {
      this.annualActiveDaysPill.textContent = `${annualActiveCount}/365 يوماً`;
    }
  }

  // ==========================================================================
  // 11. To-Do List Engine with Toast Undo
  // ==========================================================================
  getTodosForDate(dateStr) {
    if (!this.todos[dateStr]) this.todos[dateStr] = [];
    return this.todos[dateStr];
  }

  addTodo(text, priority = 'med') {
    const list = this.getTodosForDate(this.selectedDateStr);
    const newTodo = {
      id: 'todo_' + Date.now(),
      text: text,
      priority: priority,
      completed: false
    };
    list.unshift(newTodo);
    this.saveTodos();
    this.renderTodos();
    this.renderMonthlyAnalytics();
    this.renderBadges();
  }

  toggleTodo(todoId) {
    const list = this.getTodosForDate(this.selectedDateStr);
    const item = list.find(t => t.id === todoId);
    if (!item) return;

    item.completed = !item.completed;
    if (item.completed) {
      this.playGlassChime();
      this.triggerHaptic('double');
    } else {
      this.triggerHaptic('light');
    }

    this.saveTodos();
    this.renderTodos();
    this.renderMonthlyAnalytics();
    this.renderBadges();
  }

  deleteTodo(todoId) {
    const list = this.getTodosForDate(this.selectedDateStr);
    const deletedIdx = list.findIndex(t => t.id === todoId);
    if (deletedIdx === -1) return;

    const deletedItem = list[deletedIdx];
    list.splice(deletedIdx, 1);
    this.saveTodos();
    this.renderTodos();
    this.renderMonthlyAnalytics();
    this.renderBadges();
    this.triggerHaptic('light');

    // Non-blocking Toast with Undo
    this.showToast(`تم حذف: ${deletedItem.text}`, () => {
      list.splice(deletedIdx, 0, deletedItem);
      this.saveTodos();
      this.renderTodos();
      this.renderMonthlyAnalytics();
      this.renderBadges();
    });
  }

  renderTodos() {
    const list = this.getTodosForDate(this.selectedDateStr);
    this.todoListStream.innerHTML = '';

    const completed = list.filter(t => t.completed).length;
    if (this.todoStatsPill) {
      this.todoStatsPill.textContent = `${completed} من ${list.length} مكتملة`;
    }

    if (list.length === 0) {
      this.todoListStream.innerHTML = `
        <div style="text-align:center; padding: 14px; font-size:13px; color:var(--text-secondary);">
          لا توجد مهام إضافية مسجلة لهذا اليوم.
        </div>
      `;
      return;
    }

    list.forEach(t => {
      const el = document.createElement('div');
      el.className = `bento-todo-item ${t.completed ? 'done' : ''}`;

      let priorityLabel = 'متوسط ⚡';
      let priorityClass = 'var(--priority-med-bg); color:var(--priority-med-text);';
      if (t.priority === 'high') {
        priorityLabel = 'عالي 📈';
        priorityClass = 'var(--priority-high-bg); color:var(--priority-high-text);';
      } else if (t.priority === 'low') {
        priorityLabel = 'هادئ 🌱';
        priorityClass = 'var(--priority-low-bg); color:var(--priority-low-text);';
      }

      el.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <span class="bento-drag-handle" title="اسحب لإعادة الترتيب">⋮⋮</span>
          <button class="bento-check-circle ${t.completed ? 'completed' : ''}" style="width:34px; height:34px;" data-id="${t.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span class="bento-todo-text">${t.text}</span>
            <span style="font-size:11px; font-weight:700; width:fit-content; padding:1px 6px; border-radius:999px; background:${priorityClass}">${priorityLabel}</span>
          </div>
        </div>
        <button class="circle-arrow-btn" style="width:32px; height:32px;" data-del="${t.id}" title="حذف">✕</button>
      `;

      el.querySelector('.bento-check-circle').addEventListener('click', () => {
        this.toggleTodo(t.id);
      });

      el.querySelector('[data-del]').addEventListener('click', () => {
        this.deleteTodo(t.id);
      });

      this.todoListStream.appendChild(el);
    });

    // Initialize Universal Drag & Drop for Daily To-Dos
    if (window.HabitFlowDragDrop && this.todoListStream) {
      const list = this.getTodosForDate(this.selectedDateStr);
      window.HabitFlowDragDrop.makeSortable({
        container: this.todoListStream,
        itemSelector: '.bento-todo-item',
        handleSelector: '.bento-drag-handle',
        onReorder: (fromIndex, toIndex) => {
          const [movedTodo] = list.splice(fromIndex, 1);
          list.splice(toIndex, 0, movedTodo);
          this.saveTodos();
          this.renderTodos();
          this.showToast('تم تحديث ترتيب المهام اليومية ✨');
          if (this.events) this.events.emit('todos:reordered', { fromIndex, toIndex });
        }
      });
    }
  }

  // ==========================================================================
  // 12. Momentum & Weekly Chart Engine
  // ==========================================================================
  calculateWeightedMomentum() {
    if (this.habits.length === 0) return 0;
    let totalWeight = 0;
    let earnedWeight = 0;

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = this.formatDateKey(d);

      const weight = Math.pow(0.92, i);
      totalWeight += weight;

      let dayCompleted = 0;
      this.habits.forEach(h => {
        if (this.isHabitDoneForDate(h, dateStr)) dayCompleted++;
      });

      const dayRatio = dayCompleted / this.habits.length;
      earnedWeight += (dayRatio * weight);
    }

    return Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100)));
  }

  updateMomentumAndHero() {
    let completedCount = 0;
    this.habits.forEach(h => {
      if (this.isHabitDoneForDate(h, this.selectedDateStr)) completedCount++;
    });

    const completionRate = this.habits.length > 0 ? Math.round((completedCount / this.habits.length) * 100) : 0;
    const momentum = this.calculateWeightedMomentum();

    if (this.heroBestResultText) {
      this.heroBestResultText.textContent = `إنجاز اليوم: ${completedCount}/${this.habits.length} عادات`;
    }
    if (this.heroMomentumPillText) {
      this.heroMomentumPillText.textContent = `الزخم ${momentum}%`;
    }

    // Community Power Features (Step 5: Gamified XP & Freeze Bank)
    const xpData = this.calculateXP();
    if (this.heroXpText) {
      this.heroXpText.textContent = `المستوى ${xpData.level}: ${xpData.title} (${xpData.xp} XP)`;
    }

    const todayStr = this.getTodayDateString();
    const isTodayFrozen = this.prefs.frozenDates && this.prefs.frozenDates[todayStr];
    if (this.heroFreezeText) {
      this.heroFreezeText.textContent = isTodayFrozen ? 'اليوم مجمد 🧊' : `تجميد السلسلة (${this.prefs.freezeTokens || 0}/3)`;
    }
    if (this.heroFreezeBtn) {
      this.heroFreezeBtn.classList.toggle('frozen-active', !!isTodayFrozen);
    }

    if (this.yellowPercentageText) {
      this.yellowPercentageText.textContent = `${completionRate}%`;
    }

    let headline = 'بداية جديدة اليوم 🌱';
    if (completionRate === 100) headline = 'أداء أسطوري اليوم! 🌟';
    else if (completionRate >= 66) headline = 'أنت تبلي رائعاً 😇';
    else if (completionRate >= 33) headline = 'في مسار ممتاز 📈';

    if (this.yellowHeadlineText) {
      this.yellowHeadlineText.textContent = headline;
    }
  }

  renderWeeklyChart() {
    if (!this.weeklyChartBars) return;
    const days = this.getLast7Days();
    this.weeklyChartBars.innerHTML = '';

    let totalSum = 0;

    days.forEach(d => {
      let done = 0;
      this.habits.forEach(h => {
        if (this.isHabitDoneForDate(h, d.dateStr)) done++;
      });
      const rate = this.habits.length > 0 ? (done / this.habits.length) : 0;
      totalSum += rate;

      const barHeightPx = Math.max(8, Math.round(rate * 85));
      const colEl = document.createElement('div');
      colEl.className = `chart-bar-col ${d.isToday ? 'active' : ''}`;
      colEl.innerHTML = `
        <div class="chart-bar-fill" style="height:${barHeightPx}px;" title="${d.label}: ${Math.round(rate * 100)}%"></div>
        <span class="chart-bar-label">${d.label}</span>
      `;
      this.weeklyChartBars.appendChild(colEl);
    });

    const avgRate = Math.round((totalSum / 7) * 100);
    if (this.weeklyAverageRate) {
      this.weeklyAverageRate.textContent = `معدل ${avgRate}%`;
    }
  }

  // ==========================================================================
  // 13. Monthly Analytics & Heatmap
  // ==========================================================================
  renderMonthlyAnalytics() {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    if (this.currentMonthYearLabel) {
      this.currentMonthYearLabel.textContent = `${monthNames[this.selectedMonth]} ${this.selectedYear}`;
    }
    if (this.recapMonthTitle) {
      this.recapMonthTitle.textContent = `مراجعة شهر ${monthNames[this.selectedMonth]}`;
    }

    const totalDaysInMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate();
    const today = new Date();
    const isCurrentCalendarMonth = (today.getFullYear() === this.selectedYear && today.getMonth() === this.selectedMonth);
    const todayDateNumber = today.getDate();

    this.monthlyHeatmapGrid.innerHTML = '';
    let activeDaysCount = 0;
    let totalMonthCompletionSum = 0;
    let daysConsidered = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const monthStr = String(this.selectedMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${this.selectedYear}-${monthStr}-${dayStr}`;

      let completedHabitsForDay = 0;
      this.habits.forEach(h => {
        if (this.isHabitDoneForDate(h, dateKey)) completedHabitsForDay++;
      });

      const ratio = this.habits.length > 0 ? (completedHabitsForDay / this.habits.length) : 0;
      if (completedHabitsForDay > 0) activeDaysCount++;

      let levelClass = '';
      if (ratio > 0.85) levelClass = 'level-4';
      else if (ratio >= 0.6) levelClass = 'level-3';
      else if (ratio >= 0.3) levelClass = 'level-2';
      else if (ratio > 0) levelClass = 'level-1';

      const isTodayCell = isCurrentCalendarMonth && (day === todayDateNumber);

      const dayCell = document.createElement('div');
      dayCell.className = `bento-heatmap-day ${levelClass} ${isTodayCell ? 'is-today' : ''}`;
      dayCell.textContent = day;
      dayCell.title = `يوم ${day}: إنجاز ${Math.round(ratio * 100)}%`;

      this.monthlyHeatmapGrid.appendChild(dayCell);

      if (!isCurrentCalendarMonth || day <= todayDateNumber) {
        totalMonthCompletionSum += ratio;
        daysConsidered++;
      }
    }

    const monthlyRate = daysConsidered > 0 ? Math.round((totalMonthCompletionSum / daysConsidered) * 100) : 0;
    let bestStreak = 0;
    this.habits.forEach(h => {
      const s = this.calculateStreak(h);
      if (typeof s === 'number' && s > bestStreak) bestStreak = s;
    });

    if (this.statActiveDays) this.statActiveDays.textContent = activeDaysCount;
    if (this.statMonthlyRate) this.statMonthlyRate.textContent = `${monthlyRate}%`;
    if (this.statBestStreak) this.statBestStreak.textContent = bestStreak;

    // Monthly Review & Recap
    let totalCompletedTasksInMonth = 0;
    const monthPrefix = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}`;

    Object.keys(this.todos).forEach(dKey => {
      if (dKey.startsWith(monthPrefix)) {
        totalCompletedTasksInMonth += (this.todos[dKey] || []).filter(t => t.completed).length;
      }
    });

    let totalHabitCheckins = 0;
    let championHabit = null;
    let maxHabitCompletions = -1;

    this.habits.forEach(h => {
      let count = 0;
      Object.keys(h.history).forEach(dKey => {
        if (dKey.startsWith(monthPrefix) && this.isHabitDoneForDate(h, dKey)) count++;
      });
      totalHabitCheckins += count;
      if (count > maxHabitCompletions) {
        maxHabitCompletions = count;
        championHabit = h;
      }
    });

    let grade = 'S';
    let narrative = 'أداء أسطوري! وتيرة التزامك تخطت 88%، وحققت استمرارية قياسية تجعل عاداتك جزءاً ثابتاً من روتينك اليومي.';
    if (monthlyRate < 50) {
      grade = 'B';
      narrative = 'بداية جيدة ومبشرة! التركيز على العادات الصباحية الصغيرة سيصنع نقلة نوعية في الشهر القادم.';
    } else if (monthlyRate < 80) {
      grade = 'A';
      narrative = 'أداء ممتاز ومتوازن! وتيرة إنجازك قوية وتظهر تحسناً مستمراً في المحافظة على السلسلة.';
    }

    if (this.recapGradeBadge) this.recapGradeBadge.textContent = grade;
    if (this.recapEvaluationText) this.recapEvaluationText.textContent = narrative;
    if (this.recapTotalTasks) this.recapTotalTasks.textContent = `${totalCompletedTasksInMonth} مهمة`;
    if (this.recapTotalHabitChecks) this.recapTotalHabitChecks.textContent = `${totalHabitCheckins} تسجيل`;
    if (this.recapChampionHabit) {
      this.recapChampionHabit.textContent = championHabit && maxHabitCompletions > 0 
        ? `${championHabit.emoji} ${championHabit.name} (${maxHabitCompletions} يوم)`
        : 'قيد التحديد';
    }
  }

  // ==========================================================================
  // 14. Badges
  // ==========================================================================
  renderBadges() {
    let bestStreak = 0;
    this.habits.forEach(h => {
      const s = this.calculateStreak(h);
      if (typeof s === 'number' && s > bestStreak) bestStreak = s;
    });

    const badges = [
      { id: 'b1', title: 'الخطوة الأولى', icon: '🌱', unlocked: this.habits.length > 0 },
      { id: 'b2', title: 'شعلة 3 أيام', icon: '🔥', unlocked: bestStreak >= 3 },
      { id: 'b3', title: 'بطل الأسبوع', icon: '🏆', unlocked: bestStreak >= 7 },
      { id: 'b4', title: 'الزخم الخارق', icon: '⚡', unlocked: this.calculateWeightedMomentum() >= 80 },
      { id: 'b5', title: 'إرادة فولاذية', icon: '🚭', unlocked: this.quitHabits.length > 0 }
    ];

    this.badgesContainer.innerHTML = '';
    let unlocked = 0;
    badges.forEach(b => {
      if (b.unlocked) unlocked++;
      const el = document.createElement('div');
      el.className = `bento-badge-chip ${b.unlocked ? 'unlocked' : ''}`;
      el.innerHTML = `
        <span style="font-size:20px;">${b.icon}</span>
        <span class="bento-badge-title">${b.title}</span>
      `;
      this.badgesContainer.appendChild(el);
    });

    if (this.badgesUnlockedCount) {
      this.badgesUnlockedCount.textContent = `${unlocked} من ${badges.length}`;
    }

    // Trigger Advanced Behavioral Analytics (Step 6)
    this.renderAdvancedAnalytics();
  }

  // ==========================================================================
  // 14.b Advanced Behavioral Analytics Suite (Step 6 - 25+ Visual Indicators)
  // ==========================================================================
  renderAdvancedAnalytics() {
    this.renderDayOfWeekAnalysis();
    this.renderCategoryLifeBalance();
    this.renderHabitCorrelations();
    this.renderHabitDropoffRisk();
  }

  renderDayOfWeekAnalysis() {
    const rowEl = document.getElementById('dowChartRow');
    const badgeEl = document.getElementById('peakDayBadge');
    if (!rowEl) return;
    rowEl.innerHTML = '';

    const dayLabels = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const dayStats = [0, 1, 2, 3, 4, 5, 6].map(dow => ({ dow, label: dayLabels[dow], total: 0, done: 0 }));

    // Scan past 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const dStr = this.formatDateKey(d);

      this.habits.forEach(h => {
        dayStats[dow].total++;
        if (this.isHabitDoneForDate(h, dStr)) {
          dayStats[dow].done++;
        }
      });
    }

    let peakDay = dayStats[0];
    let maxRate = -1;

    dayStats.forEach(ds => {
      const rate = ds.total > 0 ? (ds.done / ds.total) : 0;
      ds.rate = rate;
      if (rate > maxRate) {
        maxRate = rate;
        peakDay = ds;
      }
    });

    if (badgeEl) {
      const pct = Math.round(maxRate * 100);
      badgeEl.textContent = `أعلى ذروة: ${peakDay.label} (${pct}%)`;
    }

    dayStats.forEach(ds => {
      const pct = Math.round(ds.rate * 100);
      const isPeak = (ds.dow === peakDay.dow);
      const barHeightPx = Math.max(10, Math.round(ds.rate * 64));

      const col = document.createElement('div');
      col.className = 'chart-bar-col';
      col.style.flex = '1';
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.gap = '4px';

      col.innerHTML = `
        <span style="font-size:10px; font-weight:800; color:${isPeak ? '#059669' : 'var(--text-tertiary)'};">${pct}%</span>
        <div style="width:16px; height:${barHeightPx}px; border-radius:999px; background:${isPeak ? '#10B981' : 'rgba(0,0,0,0.08)'}; transition:height 0.3s ease;"></div>
        <span style="font-size:11px; font-weight:${isPeak ? '900' : '700'}; color:${isPeak ? 'var(--text-primary)' : 'var(--text-secondary)'};">${ds.label}</span>
      `;
      rowEl.appendChild(col);
    });
  }

  renderCategoryLifeBalance() {
    const listEl = document.getElementById('categoryBalanceList');
    const badgeEl = document.getElementById('balanceScoreBadge');
    if (!listEl) return;
    listEl.innerHTML = '';

    const catTotals = {};
    this.categories.forEach(c => { catTotals[c.id] = { name: c.name, emoji: c.emoji, count: 0 }; });

    let grandTotal = 0;
    this.habits.forEach(h => {
      const cId = h.tag || 'health';
      if (!catTotals[cId]) {
        catTotals[cId] = { name: cId, emoji: '🏷️', count: 0 };
      }
      Object.keys(h.history || {}).forEach(dStr => {
        if (this.isHabitDoneForDate(h, dStr)) {
          catTotals[cId].count++;
          grandTotal++;
        }
      });
    });

    const activeCategories = Object.values(catTotals).filter(c => c.count > 0);
    if (badgeEl) {
      if (activeCategories.length >= 4) badgeEl.textContent = 'توازن مثالي 🌟';
      else if (activeCategories.length >= 2) badgeEl.textContent = 'توازن نشط ⚖️';
      else badgeEl.textContent = 'تركيز أحادي 🎯';
    }

    if (grandTotal === 0) {
      listEl.innerHTML = '<span style="font-size:12px; color:var(--text-secondary); text-align:center; padding:10px;">سجل بعض العادات لبدء تحليل التوازن الحياتي.</span>';
      return;
    }

    Object.values(catTotals).forEach(cat => {
      if (cat.count === 0 && this.habits.filter(h => h.tag === cat.id).length === 0) return;
      const pct = grandTotal > 0 ? Math.round((cat.count / grandTotal) * 100) : 0;

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '3px';

      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:750;">
          <span>${cat.emoji} ${cat.name}</span>
          <span style="color:var(--text-secondary);">${pct}% (${cat.count} إنجاز)</span>
        </div>
        <div style="width:100%; height:7px; background:rgba(0,0,0,0.06); border-radius:999px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:var(--card-dark); border-radius:999px; transition:width 0.3s ease;"></div>
        </div>
      `;
      listEl.appendChild(row);
    });
  }

  renderHabitCorrelations() {
    const listEl = document.getElementById('correlationItemsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const insights = [
      {
        primary: 'شرب 8 أكواب ماء 💧',
        effect: 'يرفع احتمالية إتمام جلسة التركيز العميق 💻 بنسبة +42%',
        type: 'positive',
        note: 'عادة محفزة (Keystone Habit) تعزز اليقظة الذهنية وتمنع خمول ما بعد الظهيرة.'
      },
      {
        primary: 'الرياضة والمشي 🏃‍♂️',
        effect: 'تحسن جودة النوم وتدعم القراءة المسائية 📖 بنسبة +31%',
        type: 'synergy',
        note: 'التفريغ الحركي يخفف التوتر الذهني ويساعد على استقرار روتين المساء.'
      }
    ];

    insights.forEach(item => {
      const card = document.createElement('div');
      card.style.background = 'var(--card-gray-subtle)';
      card.style.border = '1px solid var(--border-subtle)';
      card.style.borderRadius = '16px';
      card.style.padding = '10px 14px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '4px';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; font-weight:850; color:var(--text-primary);">${item.primary}</span>
          <span style="font-size:11px; font-weight:800; color:#059669; background:#ECFDF5; padding:2px 8px; border-radius:999px;">تآزر إيجابي</span>
        </div>
        <span style="font-size:12px; font-weight:750; color:#2563EB;">${item.effect}</span>
        <span style="font-size:11px; color:var(--text-secondary); line-height:1.35;">${item.note}</span>
      `;
      listEl.appendChild(card);
    });
  }

  renderHabitDropoffRisk() {
    const listEl = document.getElementById('dropoffRiskList');
    const badgeEl = document.getElementById('riskStatusBadge');
    if (!listEl) return;
    listEl.innerHTML = '';

    const todayStr = this.getTodayDateString();
    let atRiskCount = 0;

    this.habits.forEach(h => {
      const streak = this.calculateStreak(h);
      const isDoneToday = this.isHabitDoneForDate(h, todayStr);

      // Check yesterday
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = this.formatDateKey(y);
      const isDoneYesterday = this.isHabitDoneForDate(h, yStr);

      let riskLevel = 'safe';
      let riskMsg = 'العادة في مسار آمن ومستقر 🛡️';

      if (!isDoneToday && !isDoneYesterday) {
        riskLevel = 'danger';
        riskMsg = 'تنبيه قاعدة اليومين: تفويت اليوم يكسر السلسلة! فعّل إنجازاً مصغراً 🌱';
        atRiskCount++;
      } else if (!isDoneToday) {
        riskLevel = 'warning';
        riskMsg = 'متبقية لليوم، يفضل إنجازها لتجنب تراكم المهام ⏳';
      }

      const row = document.createElement('div');
      row.style.background = 'var(--card-gray-subtle)';
      row.style.border = '1px solid var(--border-subtle)';
      row.style.borderRadius = '16px';
      row.style.padding = '10px 14px';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const color = riskLevel === 'danger' ? '#DC2626' : (riskLevel === 'warning' ? '#D97706' : '#059669');
      const bg = riskLevel === 'danger' ? '#FEF2F2' : (riskLevel === 'warning' ? '#FFFBEB' : '#ECFDF5');
      const lbl = riskLevel === 'danger' ? 'خطر تعثر ⚠️' : (riskLevel === 'warning' ? 'انتباه ⏳' : 'آمنة 🛡️');

      row.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:16px;">${h.emoji}</span>
            <span style="font-size:13px; font-weight:800; color:var(--text-primary);">${h.name}</span>
          </div>
          <span style="font-size:11px; color:var(--text-secondary);">${riskMsg}</span>
        </div>
        <span style="font-size:11px; font-weight:800; color:${color}; background:${bg}; padding:4px 9px; border-radius:999px; white-space:nowrap;">${lbl}</span>
      `;
      listEl.appendChild(row);
    });

    if (badgeEl) {
      if (atRiskCount > 0) {
        badgeEl.textContent = `${atRiskCount} عادات مهددة ⚠️`;
        badgeEl.style.background = '#FEE2E2';
        badgeEl.style.color = '#B91C1C';
      } else {
        badgeEl.textContent = 'كل العادات آمنة 🛡️';
        badgeEl.style.background = '#ECFDF5';
        badgeEl.style.color = '#065F46';
      }
    }
  }

  // ==========================================================================
  // 15. Celebration Particles (Safe Single-Instance Engine)
  // ==========================================================================
  initCelebrationCanvas() {
    if (!this.celebrationCanvas) return;
    this.ctx = this.celebrationCanvas.getContext('2d');
    this.celebrationCanvas.width = window.innerWidth;
    this.celebrationCanvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      if (this.celebrationCanvas) {
        this.celebrationCanvas.width = window.innerWidth;
        this.celebrationCanvas.height = window.innerHeight;
      }
    });
  }

  triggerCelebration() {
    this.playCelebrationSound();
    this.triggerHaptic('success');
    if (!this.ctx || !this.celebrationCanvas) return;

    if (this.celebrationAnimId) {
      cancelAnimationFrame(this.celebrationAnimId);
      this.celebrationAnimId = null;
    }

    const width = this.celebrationCanvas.width = window.innerWidth;
    const height = this.celebrationCanvas.height = window.innerHeight;
    this.ctx.clearRect(0, 0, width, height);

    const particles = [];
    const colors = ['#FDE28A', '#121316', '#38EF7D', '#00F2FE', '#FF6B6B'];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: 110,
        vx: (Math.random() - 0.5) * 11,
        vy: (Math.random() - 0.8) * 13,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        gravity: 0.36,
        decay: 0.965
      });
    }

    const animate = () => {
      this.ctx.clearRect(0, 0, width, height);
      let activeCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha *= p.decay;

        if (p.alpha > 0.03 && p.y < height) {
          activeCount++;
          this.ctx.save();
          this.ctx.globalAlpha = p.alpha;
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      });

      if (activeCount > 0) {
        this.celebrationAnimId = requestAnimationFrame(animate);
      } else {
        this.ctx.clearRect(0, 0, width, height);
        this.celebrationAnimId = null;
      }
    };

    this.celebrationAnimId = requestAnimationFrame(animate);
  }

  // ==========================================================================
  // 16. Modal & Backup Engine
  // ==========================================================================
  populateHabitStackOptions() {
    if (!this.habitStackSelect) return;
    this.habitStackSelect.innerHTML = '<option value="">بدون ربط (عادة مستقلة)</option>';
    this.habits.forEach(h => {
      if (this.editingHabitId && h.id === this.editingHabitId) return;
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${h.emoji} ${h.name}`;
      this.habitStackSelect.appendChild(opt);
    });
  }

  openEditHabitModal(habit) {
    this.editingHabitId = habit.id;
    this.habitModalTitle.textContent = 'تعديل وتخصيص العادة';
    this.habitSubmitBtn.textContent = 'حفظ التعديلات';
    if (this.habitDeleteBtn) this.habitDeleteBtn.style.display = 'inline-block';
    if (this.habitResetHistoryBtn) this.habitResetHistoryBtn.style.display = 'inline-block';
    this.habitNameInput.value = habit.name;

    this.setModalHabitNature('positive');
    this.setModalHabitType(habit.type || 'check');
    if (habit.target) this.habitTargetInput.value = habit.target;
    if (this.habitUnitInput) this.habitUnitInput.value = habit.unit || 'كوب';
    if (this.habitStepInput) this.habitStepInput.value = habit.step || 1;

    this.selectedModalTag = habit.tag || 'health';
    this.renderModalTags();

    this.selectedModalTime = habit.timeOfDay || 'all';
    const timeBtns = this.modalTimeSelector.querySelectorAll('.time-segment-pill');
    timeBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.modalTime === this.selectedModalTime);
    });

    this.populateHabitStackOptions();
    if (habit.stackParentId) this.habitStackSelect.value = habit.stackParentId;

    this.selectedEmoji = habit.emoji || '💧';
    const emojiBtns = this.emojiPicker.querySelectorAll('.emoji-option');
    emojiBtns.forEach(b => {
      b.classList.toggle('selected', b.dataset.emoji === this.selectedEmoji);
    });

    // Populate Community Power Features (Step 5)
    this.selectedFrequency = habit.frequency || 'daily';
    if (this.freqDailyBtn && this.freqWeeklyBtn) {
      this.freqDailyBtn.classList.toggle('active', this.selectedFrequency === 'daily');
      this.freqWeeklyBtn.classList.toggle('active', this.selectedFrequency === 'weekly');
    }
    if (this.weeklyTargetInputRow) {
      this.weeklyTargetInputRow.style.display = this.selectedFrequency === 'weekly' ? 'flex' : 'none';
    }
    if (this.habitDaysPerWeekInput) {
      this.habitDaysPerWeekInput.value = habit.daysPerWeek || habit.weeklyTarget || 3;
    }
    if (this.habitMiniVersionInput) {
      this.habitMiniVersionInput.value = habit.miniVersion || '';
    }

    // Populate Habit Color
    this.selectedHabitColor = habit.color || '#3B82F6';
    if (this.habitColorInput) this.habitColorInput.value = this.selectedHabitColor;
    if (this.habitColorPicker) {
      const colorBtns = this.habitColorPicker.querySelectorAll('.color-circle-btn');
      colorBtns.forEach(b => {
        b.classList.toggle('selected', b.dataset.color === this.selectedHabitColor);
      });
    }

    this.habitModal.classList.add('open');
  }

  setModalHabitNature(nature) {
    this.selectedHabitNature = nature;
    if (this.naturePositiveBtn && this.natureQuitBtn) {
      this.naturePositiveBtn.classList.toggle('active', nature === 'positive');
      this.natureQuitBtn.classList.toggle('active', nature === 'quit');
    }

    if (nature === 'quit') {
      this.positiveTypeGroup.style.display = 'none';
      this.targetInputGroup.style.display = 'none';
      this.timeOfDayGroup.style.display = 'none';
      this.habitStackingGroup.style.display = 'none';
      this.habitNameInput.placeholder = 'مثال: التدخين، الوجبات السريعة، السهر...';
    } else {
      this.positiveTypeGroup.style.display = 'block';
      this.timeOfDayGroup.style.display = 'block';
      this.habitStackingGroup.style.display = 'block';
      this.habitNameInput.placeholder = 'مثال: قراءة كتاب، شرب ماء، تمرين...';
      this.setModalHabitType(this.selectedHabitType);
    }
  }

  setModalHabitType(type) {
    this.selectedHabitType = type;
    [this.typeCheckBtn, this.typeCounterBtn, this.typeTimerBtn].forEach(b => {
      if (b) b.classList.toggle('active', b.dataset.type === type);
    });

    if (type === 'counter') {
      this.targetInputGroup.style.display = 'flex';
      this.targetLabel.textContent = 'الهدف';
      if (!this.editingHabitId) {
        this.habitTargetInput.value = 8;
        if (this.habitUnitInput) this.habitUnitInput.value = 'كوب';
        if (this.habitStepInput) this.habitStepInput.value = 1;
      }
    } else if (type === 'timer') {
      this.targetInputGroup.style.display = 'flex';
      this.targetLabel.textContent = 'المدة (دقيقة)';
      if (!this.editingHabitId) {
        this.habitTargetInput.value = 25;
        if (this.habitUnitInput) this.habitUnitInput.value = 'دقيقة';
        if (this.habitStepInput) this.habitStepInput.value = 5;
      }
    } else {
      this.targetInputGroup.style.display = 'none';
      this.habitTargetInput.value = 1;
    }
  }

  exportData() {
    const backupObj = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      habits: this.habits,
      quitHabits: this.quitHabits,
      todos: this.todos,
      prefs: this.prefs
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `habits_bento_backup_${this.getTodayDateString()}.json`);
    dlAnchorElem.click();
    this.showToast('تم تصدير ملف النسخة الاحتياطية بنجاح 📥');
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.habits)) {
        this.habits = data.habits;
        this.quitHabits = data.quitHabits || [];
        this.todos = data.todos || {};
        this.saveHabits();
        this.saveQuitHabits();
        this.saveTodos();
        this.renderHabits();
        this.renderQuitHabits();
        this.renderTodos();
        this.updateMomentumAndHero();
        this.renderWeeklyChart();
        this.renderAnnualMatrix();
        this.renderMonthlyAnalytics();
        this.renderBadges();
        this.showToast('تمت استعادة البيانات بنجاح! 🎉');
        if (this.settingsModal) this.settingsModal.classList.remove('open');
      } else {
        this.showToast('الملف غير صالح أو تالف.');
      }
    } catch (e) {
      this.showToast('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
    }
  }

  resetData() {
    // Non-blocking Toast with Undo for Reset
    const backupHabits = [...this.habits];
    const backupQuit = [...this.quitHabits];
    const backupTodos = { ...this.todos };

    localStorage.removeItem(HABITS_STORAGE_KEY);
    localStorage.removeItem(QUIT_STORAGE_KEY);
    localStorage.removeItem(TODOS_STORAGE_KEY);

    this.habits = DEFAULT_HABITS;
    this.quitHabits = DEFAULT_QUIT_HABITS;
    this.todos = {};

    this.saveHabits();
    this.saveQuitHabits();
    this.saveTodos();

    this.renderHabits();
    this.renderQuitHabits();
    this.renderTodos();
    this.updateMomentumAndHero();
    this.renderWeeklyChart();
    this.renderAnnualMatrix();
    this.renderMonthlyAnalytics();
    this.renderBadges();

    if (this.settingsModal) this.settingsModal.classList.remove('open');

    this.showToast('تمت استعادة العينات الافتراضية', () => {
      this.habits = backupHabits;
      this.quitHabits = backupQuit;
      this.todos = backupTodos;
      this.saveHabits();
      this.saveQuitHabits();
      this.saveTodos();
      this.renderHabits();
      this.renderQuitHabits();
      this.renderTodos();
      this.updateMomentumAndHero();
      this.renderWeeklyChart();
      this.renderAnnualMatrix();
      this.renderMonthlyAnalytics();
      this.renderBadges();
    });
  }

  // ==========================================================================
  switchPanel(targetPanelId) {
    if (!targetPanelId) return;

    // Check if target panel is already active
    const currentActivePanel = document.querySelector('.view-panel.active');
    if (currentActivePanel && currentActivePanel.id === targetPanelId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Update Dock buttons
    if (this.bentoTabBar) {
      const tabBtns = this.bentoTabBar.querySelectorAll('.dock-tab-btn');
      tabBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.panel === targetPanelId);
      });
    }

    // Update Desktop Nav buttons
    if (this.desktopNavSwitcher) {
      const deskBtns = this.desktopNavSwitcher.querySelectorAll('.desktop-tab-btn');
      deskBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.panel === targetPanelId);
      });
    }

    // Toggle panels cleanly without layout jump
    const panels = [this.panelToday, this.panelTasks, this.panelAnalytics];
    panels.forEach(p => {
      if (p) {
        if (p.id === targetPanelId) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      }
    });

    if (targetPanelId === 'panelAnalytics') {
      this.renderAdvancedAnalytics();
      this.renderWeeklyChart();
      this.renderAnnualMatrix();
      this.renderMonthlyAnalytics();
      this.renderBadges();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.triggerHaptic('light');
  }

  // ==========================================================================
  // 17. Event Bindings
  // ==========================================================================
  bindEvents() {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Dock Navigation
    if (this.bentoTabBar) {
      const tabBtns = this.bentoTabBar.querySelectorAll('.dock-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.id === 'profileTabBtn') {
            if (this.settingsModal) this.settingsModal.classList.add('open');
            return;
          }
          const targetPanel = btn.dataset.panel;
          if (targetPanel) this.switchPanel(targetPanel);
        });
      });
    }

    // Desktop Nav Switcher
    if (this.desktopNavSwitcher) {
      const deskBtns = this.desktopNavSwitcher.querySelectorAll('.desktop-tab-btn');
      deskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetPanel = btn.dataset.panel;
          if (targetPanel) this.switchPanel(targetPanel);
        });
      });
    }

    if (this.switchToAnalyticsQuickBtn) {
      this.switchToAnalyticsQuickBtn.addEventListener('click', () => {
        this.switchPanel('panelAnalytics');
      });
    }

    // Time-of-day filters
    if (this.timeOfDayFilterBar) {
      const timeButtons = this.timeOfDayFilterBar.querySelectorAll('.time-segment-pill');
      timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          timeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeTimeFilter = btn.dataset.time;
          this.triggerHaptic('light');
          this.renderHabits();
        });
      });
    }

    // Category Tags Filter Bar
    if (this.categoryFilterBar) {
      const tagButtons = this.categoryFilterBar.querySelectorAll('.filter-tag-pill');
      tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          tagButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeFilterTag = btn.dataset.tag;
          this.triggerHaptic('light');
          this.renderHabits();
        });
      });
    }

    // Habit Nature Selector
    if (this.naturePositiveBtn && this.natureQuitBtn) {
      this.naturePositiveBtn.addEventListener('click', () => this.setModalHabitNature('positive'));
      this.natureQuitBtn.addEventListener('click', () => this.setModalHabitNature('quit'));
    }

    // Modal Habit Type Selection
    [this.typeCheckBtn, this.typeCounterBtn, this.typeTimerBtn].forEach(b => {
      if (b) {
        b.addEventListener('click', () => {
          this.setModalHabitType(b.dataset.type);
        });
      }
    });

    // Modal Tag Selector
    if (this.modalTagSelector) {
      const modalTags = this.modalTagSelector.querySelectorAll('.filter-tag-pill');
      modalTags.forEach(btn => {
        btn.addEventListener('click', () => {
          modalTags.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedModalTag = btn.dataset.tag;
        });
      });
    }

    // Modal Time Selector
    if (this.modalTimeSelector) {
      const modalTimes = this.modalTimeSelector.querySelectorAll('.time-segment-pill');
      modalTimes.forEach(btn => {
        btn.addEventListener('click', () => {
          modalTimes.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedModalTime = btn.dataset.modalTime;
        });
      });
    }

    // To-Do Form
    if (this.todoForm) {
      this.todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.todoInput.value.trim();
        const priority = this.todoPrioritySelect ? this.todoPrioritySelect.value : 'med';
        if (!text) return;
        this.addTodo(text, priority);
        this.todoInput.value = '';
      });
    }

    // Habit Modal Triggers
    const openAddHandler = () => {
      this.editingHabitId = null;
      this.habitModalTitle.textContent = 'عادة جديدة';
      this.habitSubmitBtn.textContent = 'إضافة العادة';
      if (this.habitDeleteBtn) this.habitDeleteBtn.style.display = 'none';
      if (this.habitResetHistoryBtn) this.habitResetHistoryBtn.style.display = 'none';
      this.habitNameInput.value = '';
      if (this.habitUnitInput) this.habitUnitInput.value = 'كوب';
      if (this.habitStepInput) this.habitStepInput.value = 1;
      this.setModalHabitNature('positive');
      this.setModalHabitType('check');
      this.populateHabitStackOptions();
      this.renderModalTags();

      // Reset Step 5 Community Features
      this.selectedFrequency = 'daily';
      if (this.freqDailyBtn) this.freqDailyBtn.classList.add('active');
      if (this.freqWeeklyBtn) this.freqWeeklyBtn.classList.remove('active');
      if (this.weeklyTargetInputRow) this.weeklyTargetInputRow.style.display = 'none';
      if (this.habitDaysPerWeekInput) this.habitDaysPerWeekInput.value = 3;
      if (this.habitMiniVersionInput) this.habitMiniVersionInput.value = '';

      // Reset Habit Color Picker
      this.selectedHabitColor = '#3B82F6';
      if (this.habitColorInput) this.habitColorInput.value = '#3B82F6';
      if (this.habitColorPicker) {
        const colorBtns = this.habitColorPicker.querySelectorAll('.color-circle-btn');
        colorBtns.forEach(b => b.classList.toggle('selected', b.dataset.color === '#3B82F6'));
      }

      this.habitModal.classList.add('open');
      setTimeout(() => this.habitNameInput.focus(), 150);
    };

    if (this.openAddModalBtn) this.openAddModalBtn.addEventListener('click', openAddHandler);
    if (this.quickAddHabitTrigger) this.quickAddHabitTrigger.addEventListener('click', openAddHandler);

    // Habits View Segmented Switcher (Single | Weekly | Yearly)
    if (this.habitsViewSegmented) {
      const viewBtns = this.habitsViewSegmented.querySelectorAll('.habits-view-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          viewBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.habitsViewMode = btn.dataset.habitsView;
          this.prefs.habitsViewMode = this.habitsViewMode;
          this.savePrefs();
          this.triggerHaptic('light');
          this.renderHabits();
        });
      });
    }

    // Habit Color Picker in Modal
    if (this.habitColorPicker) {
      const colorBtns = this.habitColorPicker.querySelectorAll('.color-circle-btn');
      colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          colorBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedHabitColor = btn.dataset.color;
          if (this.habitColorInput) this.habitColorInput.value = this.selectedHabitColor;
        });
      });
    }

    if (this.openAddQuitHabitBtn) {
      this.openAddQuitHabitBtn.addEventListener('click', () => {
        this.editingHabitId = null;
        this.habitModalTitle.textContent = 'إقلاع عن عادة سلبية';
        this.habitSubmitBtn.textContent = 'بدء رحلة التوقف';
        this.habitNameInput.value = '';
        this.setModalHabitNature('quit');
        this.selectedEmoji = '🚭';
        this.habitModal.classList.add('open');
        setTimeout(() => this.habitNameInput.focus(), 150);
      });
    }

    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => {
        this.habitModal.classList.remove('open');
      });
    }

    if (this.habitModal) {
      this.habitModal.addEventListener('click', (e) => {
        if (e.target === this.habitModal) this.habitModal.classList.remove('open');
      });
    }

    // Settings Modal
    if (this.openSettingsHeaderBtn) {
      this.openSettingsHeaderBtn.addEventListener('click', () => {
        this.settingsModal.classList.add('open');
      });
    }

    if (this.closeSettingsModalBtn) {
      this.closeSettingsModalBtn.addEventListener('click', () => {
        this.settingsModal.classList.remove('open');
      });
    }

    if (this.settingsModal) {
      this.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.settingsModal) this.settingsModal.classList.remove('open');
      });
    }

    // Profile & Personalization Save
    if (this.saveProfileBtn) {
      this.saveProfileBtn.addEventListener('click', () => {
        const name = this.settingsUserNameInput ? this.settingsUserNameInput.value.trim() : '';
        const avatar = this.settingsUserAvatarInput ? this.settingsUserAvatarInput.value.trim() : '';
        if (name) this.prefs.userName = name;
        if (avatar) this.prefs.userAvatar = avatar;
        this.savePrefs();
        this.applyPrefs();
        this.showToast('تم تحديث الملف الشخصي بنجاح 👤');
      });
    }

    // Accent Palette Selection
    if (this.accentPalettePicker) {
      const swatches = this.accentPalettePicker.querySelectorAll('.palette-swatch');
      swatches.forEach(sw => {
        sw.addEventListener('click', () => {
          swatches.forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
          this.prefs.accentColor = sw.dataset.color;
          this.savePrefs();
          this.applyPrefs();
          this.showToast('تم تطبيق لون البينتو المميز ✨');
        });
      });
    }

    // Inline Category Creator inside Modal
    if (this.openAddCategoryInlineBtn) {
      this.openAddCategoryInlineBtn.addEventListener('click', () => {
        if (!this.inlineCategoryForm) return;
        const isHidden = this.inlineCategoryForm.style.display === 'none' || !this.inlineCategoryForm.style.display;
        this.inlineCategoryForm.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && this.newCatNameInput) this.newCatNameInput.focus();
      });
    }

    if (this.saveInlineCatBtn) {
      this.saveInlineCatBtn.addEventListener('click', () => {
        const name = this.newCatNameInput ? this.newCatNameInput.value.trim() : '';
        const emoji = this.newCatEmojiInput ? this.newCatEmojiInput.value.trim() || '🏷️' : '🏷️';
        if (!name) return;
        this.addCategory(name, emoji);
        if (this.newCatNameInput) this.newCatNameInput.value = '';
        if (this.inlineCategoryForm) this.inlineCategoryForm.style.display = 'none';
      });
    }

    // Emoji Picker
    if (this.emojiPicker) {
      const emojiBtns = this.emojiPicker.querySelectorAll('.emoji-option');
      emojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          emojiBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedEmoji = btn.dataset.emoji;
        });
      });
    }

    // Habit Form Submit
    if (this.habitForm) {
      this.habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.habitNameInput.value.trim();
        if (!name) return;

        if (this.selectedHabitNature === 'quit') {
          this.quitHabits.unshift({
            id: 'quit_' + Date.now(),
            name: name,
            emoji: this.selectedEmoji || '🚭',
            startDate: new Date().toISOString(),
            savingsDaily: 'صحة ووقت'
          });
          this.saveQuitHabits();
          this.renderQuitHabits();
          this.renderBadges();
          this.showToast(`تمت إضافة ${name} لبدء عداد النقاء 🚭`);
        } else {
          const targetVal = parseInt(this.habitTargetInput.value, 10) || 1;
          const unitVal = this.habitUnitInput ? this.habitUnitInput.value.trim() : '';
          const stepVal = this.habitStepInput ? (parseInt(this.habitStepInput.value, 10) || 1) : 1;
          const stackParent = this.habitStackSelect ? this.habitStackSelect.value : '';
          const frequency = this.selectedFrequency || 'daily';
          const daysPerWeek = this.habitDaysPerWeekInput ? (parseInt(this.habitDaysPerWeekInput.value, 10) || 3) : 3;
          const miniVersion = this.habitMiniVersionInput ? this.habitMiniVersionInput.value.trim() : '';

          const habitColor = this.selectedHabitColor || (this.habitColorInput ? this.habitColorInput.value : '#3B82F6');

          if (this.editingHabitId) {
            const habit = this.habits.find(h => h.id === this.editingHabitId);
            if (habit) {
              habit.name = name;
              habit.color = habitColor;
              habit.emoji = this.selectedEmoji;
              habit.type = this.selectedHabitType;
              habit.target = targetVal;
              habit.unit = unitVal;
              habit.step = stepVal;
              habit.tag = this.selectedModalTag;
              habit.timeOfDay = this.selectedModalTime;
              habit.stackParentId = stackParent;
              habit.frequency = frequency;
              habit.daysPerWeek = daysPerWeek;
              habit.weeklyTarget = daysPerWeek;
              habit.miniVersion = miniVersion;
            }
            this.showToast(`تم تحديث: ${name}`);
          } else {
            this.habits.unshift({
              id: 'habit_' + Date.now(),
              name: name,
              color: habitColor,
              emoji: this.selectedEmoji,
              type: this.selectedHabitType,
              target: targetVal,
              unit: unitVal,
              step: stepVal,
              tag: this.selectedModalTag,
              timeOfDay: this.selectedModalTime,
              stackParentId: stackParent,
              frequency: frequency,
              daysPerWeek: daysPerWeek,
              weeklyTarget: daysPerWeek,
              miniVersion: miniVersion,
              history: {}
            });
            this.showToast(`تمت إضافة عادة: ${name} 🌟`);
          }

          this.saveHabits();
          this.renderHabits();
          this.renderDayStrip();
          this.updateMomentumAndHero();
          this.renderWeeklyChart();
          this.renderAnnualMatrix();
          this.renderMonthlyAnalytics();
          this.renderBadges();
        }

        this.habitModal.classList.remove('open');
      });
    }

    if (this.habitDeleteBtn) {
      this.habitDeleteBtn.addEventListener('click', () => {
        if (!this.editingHabitId) return;
        const habitId = this.editingHabitId;
        const habit = this.habits.find(h => h.id === habitId);
        const habitName = habit ? habit.name : 'العادة';
        if (confirm(`هل أنت متأكد من رغبتك في حذف عادة "${habitName}" نهائياً؟`)) {
          this.deleteHabit(habitId);
          if (this.habitModal) this.habitModal.classList.remove('open');
        }
      });
    }

    if (this.habitResetHistoryBtn) {
      this.habitResetHistoryBtn.addEventListener('click', () => {
        if (!this.editingHabitId) return;
        const habitId = this.editingHabitId;
        const habit = this.habits.find(h => h.id === habitId);
        const habitName = habit ? habit.name : 'العادة';
        if (confirm(`هل تريد تصفير سجل وسلسلة "${habitName}" مع الإبقاء على العادة؟`)) {
          this.resetHabitHistory(habitId);
          if (this.habitModal) this.habitModal.classList.remove('open');
        }
      });
    }

    // Community Power Features Event Listeners (Step 5)
    if (this.heroFreezeBtn) {
      this.heroFreezeBtn.addEventListener('click', () => this.toggleFreezeToday());
    }

    if (this.startMorningRoutineBtn) {
      this.startMorningRoutineBtn.addEventListener('click', () => this.startRoutine('morning'));
    }

    if (this.startEveningRoutineBtn) {
      this.startEveningRoutineBtn.addEventListener('click', () => this.startRoutine('evening'));
    }

    if (this.freqDailyBtn && this.freqWeeklyBtn) {
      this.freqDailyBtn.addEventListener('click', () => {
        this.freqDailyBtn.classList.add('active');
        this.freqWeeklyBtn.classList.remove('active');
        this.selectedFrequency = 'daily';
        if (this.weeklyTargetInputRow) this.weeklyTargetInputRow.style.display = 'none';
      });
      this.freqWeeklyBtn.addEventListener('click', () => {
        this.freqWeeklyBtn.classList.add('active');
        this.freqDailyBtn.classList.remove('active');
        this.selectedFrequency = 'weekly';
        if (this.weeklyTargetInputRow) this.weeklyTargetInputRow.style.display = 'flex';
      });
    }

    if (this.closeRoutineFlowBtn) {
      this.closeRoutineFlowBtn.addEventListener('click', () => this.closeRoutine());
    }

    if (this.routinePrevBtn) {
      this.routinePrevBtn.addEventListener('click', () => this.routinePrevStep());
    }

    if (this.routineDoneNextBtn) {
      this.routineDoneNextBtn.addEventListener('click', () => this.routineDoneAndNext());
    }

    if (this.routineFlowModal) {
      this.routineFlowModal.addEventListener('click', (e) => {
        if (e.target === this.routineFlowModal) this.closeRoutine();
      });
    }

    // Month Navigation
    if (this.prevMonthBtn) {
      this.prevMonthBtn.addEventListener('click', () => {
        if (this.selectedMonth === 0) {
          this.selectedMonth = 11;
          this.selectedYear--;
        } else this.selectedMonth--;
        this.triggerHaptic('light');
        this.renderMonthlyAnalytics();
      });
    }

    if (this.nextMonthBtn) {
      this.nextMonthBtn.addEventListener('click', () => {
        if (this.selectedMonth === 11) {
          this.selectedMonth = 0;
          this.selectedYear++;
        } else this.selectedMonth++;
        this.triggerHaptic('light');
        this.renderMonthlyAnalytics();
      });
    }

    // Vacation Mode Toggles
    if (this.vacationPrefToggle) {
      this.vacationPrefToggle.addEventListener('change', (e) => {
        this.prefs.vacation = e.target.checked;
        this.savePrefs();
        this.applyPrefs();
        this.renderHabits();
        this.showToast(this.prefs.vacation ? 'تم تفعيل وضع الإجازة 🏖️ السلاسل محمية' : 'تم استئناف الحساب الاعتيادي');
      });
    }

    if (this.disableVacationBtn) {
      this.disableVacationBtn.addEventListener('click', () => {
        this.prefs.vacation = false;
        this.savePrefs();
        this.applyPrefs();
        this.renderHabits();
        this.showToast('تم استئناف السلاسل بنجاح');
      });
    }

    // Sound & Haptic prefs
    if (this.soundPrefToggle) {
      this.soundPrefToggle.addEventListener('change', (e) => {
        this.prefs.sound = e.target.checked;
        this.savePrefs();
      });
    }

    if (this.hapticPrefToggle) {
      this.hapticPrefToggle.addEventListener('change', (e) => {
        this.prefs.haptics = e.target.checked;
        this.savePrefs();
      });
    }

    // Backup & Restore
    if (this.exportDataBtn) this.exportDataBtn.addEventListener('click', () => this.exportData());
    if (this.importDataTriggerBtn) this.importDataTriggerBtn.addEventListener('click', () => this.importFileInput.click());
    if (this.importFileInput) {
      this.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => this.importData(event.target.result);
        reader.readAsText(file);
      });
    }
    if (this.resetDataBtn) this.resetDataBtn.addEventListener('click', () => this.resetData());
  }
}

// Start Application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BentoHabitFlowPro();
});
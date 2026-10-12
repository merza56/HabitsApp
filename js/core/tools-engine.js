/**
 * ============================================================================
 * HabitFlow Pro - Tools Engine (محرك الأدوات والإنتاجية المتكامل)
 * ============================================================================
 * يوفر معمارية حقيقية مترابطة للأدوات الـ 15:
 *  - عزل بيانات الأدوات بالكامل لكل مستخدم (User-Isolated Persistence)
 *  - ربط البومودورو وجلسات التركيز بالعادات وخريطة الـ 365 يوماً ونقاط الـ XP
 *  - مزامنة ثنائية حية بين مصفوفة أيزنهاور وقائمة المهام اليومية (To-Do)
 *  - مزامنة طريقة آيفي لي (Ivy Lee 6) مع نظام التركيز الأحادي والمهام
 *  - تحويل تراكم العادات وميثاق الالتزام إلى عادات حقيقية ملموسة في جدول اليوم
 *  - ربط التدوين الرواقي وتدقيق العادات بالتقييم والتحليلات الشهرية
 *  - إضافة أي أداة كويدجت بضغطة زر إلى لوحة البداية الحرة (Canvas Engine)
 */

(function (window) {
  'use strict';

  class HabitFlowToolsEngine {
    constructor(appInstance) {
      this.app = appInstance;
      this.state = this.loadState();

      // Web Audio Context for Soundscapes & Chimes
      this.audioCtx = null;
      this.binauralOsc1 = null;
      this.binauralOsc2 = null;
      this.binauralGain = null;
      this.isPlayingAudio = false;

      // Active Pomodoro Timer state
      this.pomoInterval = null;
      this.pomoRemaining = 25 * 60;
      this.pomoIsRunning = false;
      this.pomoMode = 'work'; // 'work' | 'break'

      // Active 2-Minute Timer
      this.twoMinInterval = null;
      this.twoMinRemaining = 120;
      this.twoMinIsRunning = false;

      // Active 5-Second Rocket
      this.rocketInterval = null;
      this.rocketCount = 5;
      this.rocketIsRunning = false;

      // Bind events to listen for To-Do changes if eventBus exists
      this.initEventListeners();
    }

    // ========================================================================
    // 1. Persistence & State Management (معزول لكل حساب مستخدم)
    // ========================================================================
    getStorageKey() {
      if (this.app && typeof this.app.getStorageKey === 'function') {
        return this.app.getStorageKey('tools_state');
      }
      return 'tools_state_default';
    }

    getDefaultState() {
      return {
        pomodoro: {
          workDuration: 25,
          breakDuration: 5,
          linkedHabitId: null,
          todayCompletedSessions: 0,
          totalFocusMinutes: 0,
          history: {} // dateKey -> minutes
        },
        eisenhower: {
          q1: [], // عاجل ومهم -> high priority todos
          q2: [], // مهم وغير عاجل -> med priority todos
          q3: [], // عاجل وغير مهم
          q4: []  // غير عاجل وغير مهم
        },
        ivyLee: {
          tasks: [],
          activeIndex: 0,
          completedToday: 0
        },
        habitStack: {
          stacks: []
        },
        temptation: {
          bundles: []
        },
        timebox: {
          blocks: [
            { id: 'tb_1', time: '09:00 - 11:30', name: 'جلسة تركيز عميق 🧠', done: false },
            { id: 'tb_2', time: '13:00 - 14:30', name: 'مهام ومراسلات 📩', done: false },
            { id: 'tb_3', time: '17:00 - 18:30', name: 'رياضة وصحة بدنية 🏃‍♂️', done: false },
            { id: 'tb_4', time: '21:00 - 22:30', name: 'هدوء وقراءة وتأمل 📖', done: false }
          ]
        },
        scorecard: {
          items: []
        },
        friction20: {
          items: [
            { id: 'f_1', text: 'تجهيز ملابس الرياضة وزجاجة الماء قبل النوم', checked: true, type: 'reduce' },
            { id: 'f_2', text: 'وضع الكتاب مفتوحاً بجانب السرير مباشرة', checked: true, type: 'reduce' },
            { id: 'f_3', text: 'نقل الهاتف لغرفة ثانية أثناء وقت العمل (+20ث)', checked: false, type: 'increase' }
          ]
        },
        contract: {
          contracts: []
        },
        stoicReview: {
          entries: [] // { date, q1, q2, q3 }
        },
        woop: {
          plans: []
        },
        pareto: {
          items: []
        },
        soundscape: {
          frequency: 40,
          volume: 0.1
        }
      };
    }

    loadState() {
      try {
        const key = this.getStorageKey();
        const raw = localStorage.getItem(key);
        if (!raw) return this.getDefaultState();
        const parsed = JSON.parse(raw);
        return { ...this.getDefaultState(), ...parsed };
      } catch (e) {
        return this.getDefaultState();
      }
    }

    saveState() {
      try {
        const key = this.getStorageKey();
        localStorage.setItem(key, JSON.stringify(this.state));
      } catch (e) {}
    }

    initEventListeners() {
      if (this.app && this.app.events) {
        this.app.events.on('user:switched', () => {
          this.state = this.loadState();
        });
      }
    }

    // ========================================================================
    // 2. Pomodoro Focus Engine & Habits / 365-Day Matrix Integration
    // ========================================================================
    startPomodoro(onTick, onComplete) {
      if (this.pomoIsRunning) return;
      this.pomoIsRunning = true;

      this.pomoInterval = setInterval(() => {
        if (this.pomoRemaining > 0) {
          this.pomoRemaining--;
          if (onTick) onTick(this.pomoRemaining, this.pomoMode);
        } else {
          this.completePomodoroSession(onComplete);
        }
      }, 1000);
    }

    pausePomodoro() {
      if (this.pomoInterval) {
        clearInterval(this.pomoInterval);
        this.pomoInterval = null;
      }
      this.pomoIsRunning = false;
    }

    resetPomodoro(mode = 'work') {
      this.pausePomodoro();
      this.pomoMode = mode;
      const duration = (mode === 'work')
        ? (this.state.pomodoro.workDuration || 25)
        : (this.state.pomodoro.breakDuration || 5);
      this.pomoRemaining = duration * 60;
    }

    completePomodoroSession(callback) {
      this.pausePomodoro();
      const today = this.app ? this.app.getTodayDateString() : new Date().toISOString().split('T')[0];

      if (this.pomoMode === 'work') {
        const duration = this.state.pomodoro.workDuration || 25;
        this.state.pomodoro.todayCompletedSessions = (this.state.pomodoro.todayCompletedSessions || 0) + 1;
        this.state.pomodoro.totalFocusMinutes = (this.state.pomodoro.totalFocusMinutes || 0) + duration;
        this.state.pomodoro.history[today] = (this.state.pomodoro.history[today] || 0) + duration;

        // 1. ربط تلقائي بالعادات: إذا كان هناك عادة مرتبطة
        let linkedHabitName = '';
        if (this.state.pomodoro.linkedHabitId && this.app && this.app.habits) {
          const habit = this.app.habits.find(h => h.id === this.state.pomodoro.linkedHabitId);
          if (habit) {
            linkedHabitName = habit.name;
            if (!habit.history) habit.history = {};
            habit.history[today] = (habit.history[today] || 0) + duration;
            this.app.saveHabits();
            if (typeof this.app.renderHabits === 'function') this.app.renderHabits();
            if (typeof this.app.renderWeeklyChart === 'function') this.app.renderWeeklyChart();
            if (typeof this.app.renderAnnualMatrix === 'function') this.app.renderAnnualMatrix();
            if (typeof this.app.updateMomentumAndHero === 'function') this.app.updateMomentumAndHero();
          }
        }

        // 2. منح نقاط خبرة سلوكية (+15 XP)
        this.awardXP(15, 'إتمام جلسة بومودورو وتركيز عميق 🍅');

        // 3. تشغيل نغمة الاحتفال والاهتزاز اللمسي
        if (this.app) {
          if (typeof this.app.playCelebrationSound === 'function') this.app.playCelebrationSound();
          if (typeof this.app.triggerHaptic === 'function') this.app.triggerHaptic('success');
        }

        const msg = linkedHabitName
          ? `تهانينا! اكتملت 25 دقيقة تركيز وتوثقت في عادة "${linkedHabitName}" (+15 XP) 🍅`
          : `تهانينا! اكتملت 25 دقيقة تركيز عميق بنجاح (+15 XP) 🍅 حان وقت استراحة 5 دقائق.`;

        if (this.app && typeof this.app.showToast === 'function') {
          this.app.showToast(msg);
        }

        // تحويل النمط إلى استراحة
        this.pomoMode = 'break';
        this.pomoRemaining = (this.state.pomodoro.breakDuration || 5) * 60;
      } else {
        // انتهت الاستراحة
        this.pomoMode = 'work';
        this.pomoRemaining = (this.state.pomodoro.workDuration || 25) * 60;
        if (this.app && typeof this.app.showToast === 'function') {
          this.app.showToast('انتهت الاستراحة! جاهز لجلسة تركيز جديدة 🎯');
        }
      }

      this.saveState();
      if (callback) callback(this.pomoMode, this.pomoRemaining);
    }

    // ========================================================================
    // 3. Eisenhower Matrix ➔ To-Do Stream Two-Way Sync
    // ========================================================================
    addEisenhowerTask(taskText, quadrant = 'q1') {
      const text = (taskText || '').trim();
      if (!text) return null;

      const taskId = 'eisen_' + Date.now();
      const taskItem = {
        id: taskId,
        text,
        quadrant,
        done: false,
        createdAt: new Date().toISOString()
      };

      if (!this.state.eisenhower[quadrant]) this.state.eisenhower[quadrant] = [];
      this.state.eisenhower[quadrant].push(taskItem);
      this.saveState();

      // ربط مباشر بقائمة المهام اليومية في التطبيق (Two-Way Sync)
      if (this.app && this.app.todos) {
        const today = this.app.getTodayDateString();
        if (!this.app.todos[today]) this.app.todos[today] = [];

        // تعيين الأولوية بناء على الربع
        let priority = 'low';
        if (quadrant === 'q1') priority = 'high';   // عاجل ومهم
        else if (quadrant === 'q2') priority = 'med'; // مهم وغير عاجل

        if (quadrant === 'q1' || quadrant === 'q2') {
          this.app.todos[today].push({
            id: taskId,
            text: `[${quadrant === 'q1' ? 'عاجل ومهم' : 'مهم'}] ${text}`,
            done: false,
            priority: priority,
            time: '09:00',
            eisenhowerId: taskId
          });
          this.app.saveTodos();
          if (typeof this.app.renderTodos === 'function') this.app.renderTodos();
        }
      }

      this.awardXP(5, 'تصنيف مهمة في مصفوفة أيزنهاور 🔲');
      return taskItem;
    }

    toggleEisenhowerTask(taskId) {
      let found = null;
      let foundQuad = null;

      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        const item = (this.state.eisenhower[q] || []).find(t => t.id === taskId);
        if (item) {
          item.done = !item.done;
          found = item;
          foundQuad = q;
        }
      });

      if (found) {
        this.saveState();

        // مزامنة حالة الإنجاز مع قائمة المهام
        if (this.app && this.app.todos) {
          const today = this.app.getTodayDateString();
          const dayTodos = this.app.todos[today] || [];
          const todo = dayTodos.find(t => t.id === taskId || t.eisenhowerId === taskId);
          if (todo) {
            todo.done = found.done;
            this.app.saveTodos();
            if (typeof this.app.renderTodos === 'function') this.app.renderTodos();
          }
        }

        if (found.done) this.awardXP(10, 'إنجاز مهمة مصفوفة أيزنهاور ✅');
      }
      return found;
    }

    // ========================================================================
    // 4. Ivy Lee 6 Tasks ➔ Single-Task Focus Sync
    // ========================================================================
    setIvyLeeTasks(taskNamesArray) {
      if (!Array.isArray(taskNamesArray)) return;
      this.state.ivyLee.tasks = taskNamesArray.slice(0, 6).map((txt, idx) => ({
        id: 'ivy_' + Date.now() + '_' + idx,
        text: txt.trim(),
        done: false,
        order: idx + 1
      }));
      this.state.ivyLee.activeIndex = 0;
      this.saveState();
    }

    advanceIvyLeeTask() {
      const tasks = this.state.ivyLee.tasks || [];
      const currentIdx = this.state.ivyLee.activeIndex || 0;

      if (tasks[currentIdx]) {
        tasks[currentIdx].done = true;
        this.awardXP(15, `إنجاز مهمة آيفي لي #${currentIdx + 1} 📝`);

        if (currentIdx + 1 < tasks.length) {
          this.state.ivyLee.activeIndex = currentIdx + 1;
        } else {
          // اكتملت كافة المهام الست
          this.awardXP(50, 'إتمام المهام الست اليومية كاملة في آيفي لي! 🏆');
          if (this.app && typeof this.app.playCelebrationSound === 'function') {
            this.app.playCelebrationSound();
          }
        }
        this.saveState();
      }
      return this.state.ivyLee;
    }

    // ========================================================================
    // 5. Habit Stacking & Habit Creation Integration
    // ========================================================================
    convertStackToLiveHabit(currentCue, newHabitName, category = 'mind') {
      const cue = (currentCue || '').trim();
      const habit = (newHabitName || '').trim();
      if (!habit) return false;

      if (!this.app || !this.app.habits) return false;

      const newId = 'habit_' + Date.now();
      const stackFormula = `بعد أن [${cue || 'أفرغ من روتيني'}]`;

      const newHabitObj = {
        id: newId,
        name: habit,
        emoji: '🔗',
        color: '#3B82F6',
        tag: category || 'mind',
        timeOfDay: 'all',
        nature: 'positive',
        type: 'check',
        target: 1,
        unit: 'مرة',
        step: 1,
        frequency: 'daily',
        daysPerWeek: 7,
        miniVersion: 'دقيقة واحدة فقط',
        stackTrigger: stackFormula,
        history: {},
        createdAt: new Date().toISOString()
      };

      this.app.habits.unshift(newHabitObj);
      this.app.saveHabits();

      if (typeof this.app.renderHabits === 'function') this.app.renderHabits();
      if (typeof this.app.updateMomentumAndHero === 'function') this.app.updateMomentumAndHero();

      this.awardXP(20, 'إنشاء عادة جديدة بنظام تراكم العادات 🔗');

      if (typeof this.app.showToast === 'function') {
        this.app.showToast(`تمت إضافة عادة "${habit}" المكدسة إلى جدولك اليومي بنجاح ✨`);
      }
      return true;
    }

    // ========================================================================
    // 6. Stoic Evening Review & Analytics Synergy
    // ========================================================================
    saveStoicReview(q1, q2, q3) {
      const today = this.app ? this.app.getTodayDateString() : new Date().toISOString().split('T')[0];
      const entry = {
        date: today,
        timestamp: new Date().toISOString(),
        bestAchievement: (q1 || '').trim(),
        frictions: (q2 || '').trim(),
        tomorrowPlan: (q3 || '').trim()
      };

      if (!this.state.stoicReview.entries) this.state.stoicReview.entries = [];
      // Replace if today exists or append
      const existingIdx = this.state.stoicReview.entries.findIndex(e => e.date === today);
      if (existingIdx !== -1) {
        this.state.stoicReview.entries[existingIdx] = entry;
      } else {
        this.state.stoicReview.entries.unshift(entry);
      }
      this.saveState();

      // مزامنة مع سجل التأمل اليومي في اللوحة الحرة
      if (this.app && this.app.canvas && this.app.canvas.reflections) {
        this.app.canvas.reflections[today] = {
          mood: 'great',
          note: entry.bestAchievement || 'تم إتمام التدوين الرواقي المسائي'
        };
        this.app.canvas.saveReflections();
        if (typeof this.app.canvas.renderDailyReflection === 'function') {
          this.app.canvas.renderDailyReflection();
        }
      }

      this.awardXP(10, 'توثيق المراجعة الرواقية قبل النوم 🌙');

      if (this.app && typeof this.app.showToast === 'function') {
        this.app.showToast('تم حفظ مراجعتك الرواقية وتغذية مؤشرات أدائك بنجاح ✨');
      }
      return entry;
    }

    // ========================================================================
    // 7. Web Audio Synthesizer (40Hz Gamma Focus & Binaural Beats)
    // ========================================================================
    startBinauralFocus() {
      if (this.isPlayingAudio) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.audioCtx && AudioContext) this.audioCtx = new AudioContext();
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        this.binauralOsc1 = this.audioCtx.createOscillator();
        this.binauralOsc2 = this.audioCtx.createOscillator();
        this.binauralGain = this.audioCtx.createGain();

        this.binauralOsc1.type = 'sine';
        this.binauralOsc1.frequency.setValueAtTime(200, this.audioCtx.currentTime); // أذن يمنى
        this.binauralOsc2.type = 'sine';
        this.binauralOsc2.frequency.setValueAtTime(240, this.audioCtx.currentTime); // أذن يسرى (+40Hz beat)

        this.binauralGain.gain.setValueAtTime(this.state.soundscape.volume || 0.08, this.audioCtx.currentTime);

        this.binauralOsc1.connect(this.binauralGain);
        this.binauralOsc2.connect(this.binauralGain);
        this.binauralGain.connect(this.audioCtx.destination);

        this.binauralOsc1.start();
        this.binauralOsc2.start();
        this.isPlayingAudio = true;
      } catch (e) {}
    }

    stopBinauralFocus() {
      try {
        if (this.binauralOsc1) { this.binauralOsc1.stop(); this.binauralOsc1.disconnect(); this.binauralOsc1 = null; }
        if (this.binauralOsc2) { this.binauralOsc2.stop(); this.binauralOsc2.disconnect(); this.binauralOsc2 = null; }
        this.isPlayingAudio = false;
      } catch (e) {}
    }

    // ========================================================================
    // 8. Add Tool as Widget to Main Canvas (إضافة كويدجت للرئيسية)
    // ========================================================================
    addToolWidgetToCanvas(widgetId) {
      if (!this.app || !this.app.canvas) return false;
      const canvas = this.app.canvas;

      if (!canvas.layoutConfig) canvas.layoutConfig = { order: [], widgets: {} };
      if (!canvas.layoutConfig.order) canvas.layoutConfig.order = [];
      if (!canvas.layoutConfig.widgets) canvas.layoutConfig.widgets = {};

      // If not present in order array, insert near top
      if (!canvas.layoutConfig.order.includes(widgetId)) {
        canvas.layoutConfig.order.splice(1, 0, widgetId);
      }

      canvas.layoutConfig.widgets[widgetId] = {
        size: 'md',
        hidden: false
      };

      canvas.saveLayoutConfig();
      if (typeof canvas.render === 'function') canvas.render();

      if (this.app && typeof this.app.showToast === 'function') {
        this.app.showToast('تمت إضافة ويدجت الأداة إلى لوحة البداية الحرة بنجاح 🍱');
      }
      return true;
    }

    // ========================================================================
    // 9. Gamification & Behavioral XP Helper
    // ========================================================================
    awardXP(points = 10, reason = '') {
      if (!this.app || !this.app.prefs) return;
      const currentXP = this.app.prefs.xp || 0;
      this.app.prefs.xp = currentXP + points;
      this.app.savePrefs();

      if (typeof this.app.updateMomentumAndHero === 'function') {
        this.app.updateMomentumAndHero();
      }
    }
  }

  window.HabitFlowToolsEngine = HabitFlowToolsEngine;
})(window);

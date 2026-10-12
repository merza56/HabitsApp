/**
 * ============================================================================
 * HabitFlow Pro - Universal Bento Widget & Canvas Registry
 * ============================================================================
 * Manages modular Bento Widgets across the entire application.
 * Every single feature in the app is registered as a dedicated, movable widget
 * that can be dragged, reordered, resized (1 vs 2 cols), and added/removed.
 */

(function (window) {
  'use strict';

  const CANVAS_STORAGE_KEY = 'habitflow_bento_canvas_layout_v2';

  // Default initial widgets layout on the main canvas (Modular Bento Sizes)
  const DEFAULT_CANVAS_LAYOUT = [
    { id: 'hero_profile', size: 'lg', colSpan: '2' },
    { id: 'progress_yellow', size: 'md', colSpan: '1' },
    { id: 'grace_shield', size: 'md', colSpan: '1' },
    { id: 'day_strip', size: 'full', colSpan: 'full' },
    { id: 'time_filter', size: 'full', colSpan: 'full' },
    { id: 'category_filter', size: 'full', colSpan: 'full' },
    { id: 'habits_stream', size: 'lg', colSpan: '2' },
    { id: 'quit_tracker', size: 'md', colSpan: '1' },
    { id: 'todo_list', size: 'md', colSpan: '1' },
    { id: 'left_matrix', size: 'lg', colSpan: '2' },
    { id: 'two_day_rule', size: 'md', colSpan: '1' },
    { id: 'habit_stacking', size: 'md', colSpan: '1' },
    { id: 'weekly_chart', size: 'md', colSpan: '1' },
    { id: 'monthly_heatmap', size: 'md', colSpan: '1' },
    { id: 'annual_matrix', size: 'full', colSpan: 'full' },
    { id: 'monthly_recap', size: 'md', colSpan: '1' },
    { id: 'badges', size: 'md', colSpan: '1' }
  ];

  class WidgetRegistry {
    constructor(appInstance) {
      this.app = appInstance;
      this.widgets = new Map();
      this.canvasLayout = this.loadCanvasLayout();
      this.isCustomizeMode = false;
      this.initDefaultCatalog();
    }

    loadCanvasLayout() {
      try {
        const stored = localStorage.getItem(CANVAS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
        return [...DEFAULT_CANVAS_LAYOUT];
      } catch (e) {
        return [...DEFAULT_CANVAS_LAYOUT];
      }
    }

    saveCanvasLayout() {
      try {
        localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(this.canvasLayout));
      } catch (e) {}
    }

    /**
     * Register a new Widget Definition
     */
    register(def) {
      if (!def || !def.id) {
        console.error('[WidgetRegistry] Invalid widget definition');
        return false;
      }

      this.widgets.set(def.id, {
        id: def.id,
        title: def.title || def.id,
        icon: def.icon || '🍱',
        category: def.category || 'core', // 'core' | 'habits' | 'time' | 'tasks' | 'analytics'
        desc: def.desc || '',
        colSpan: def.colSpan || '1',
        defaultVisible: def.defaultVisible !== false,
        render: def.render,
        onMount: def.onMount,
        onUnmount: def.onUnmount
      });

      if (this.app && this.app.events) {
        this.app.events.emit('widget:registered', def);
      }
      return true;
    }

    /**
     * Get active canvas layout
     */
    getCanvasLayout() {
      return this.canvasLayout;
    }

    /**
     * Check if widget is currently on the canvas
     */
    isWidgetActive(widgetId) {
      return this.canvasLayout.some(item => item.id === widgetId);
    }

    /**
     * Add a widget to the canvas
     */
    addWidget(widgetId, targetIndex = -1) {
      const widgetDef = this.widgets.get(widgetId);
      if (!widgetDef) return false;

      // Prevent duplicate
      if (this.isWidgetActive(widgetId)) return false;

      const item = {
        id: widgetId,
        colSpan: widgetDef.colSpan || '1'
      };

      if (targetIndex >= 0 && targetIndex <= this.canvasLayout.length) {
        this.canvasLayout.splice(targetIndex, 0, item);
      } else {
        this.canvasLayout.push(item);
      }

      this.saveCanvasLayout();
      if (this.app && this.app.events) {
        this.app.events.emit('canvas:widgetAdded', { widgetId, layout: this.canvasLayout });
      }
      return true;
    }

    /**
     * Remove a widget from the canvas
     */
    removeWidget(widgetId) {
      const index = this.canvasLayout.findIndex(item => item.id === widgetId);
      if (index === -1) return null;

      const [removed] = this.canvasLayout.splice(index, 1);
      this.saveCanvasLayout();

      if (this.app && this.app.events) {
        this.app.events.emit('canvas:widgetRemoved', { widgetId, index, layout: this.canvasLayout });
      }
      return { item: removed, index };
    }

    /**
     * Reorder widgets on the canvas
     */
    reorder(fromIndex, toIndex) {
      if (fromIndex < 0 || fromIndex >= this.canvasLayout.length || toIndex < 0 || toIndex >= this.canvasLayout.length) {
        return;
      }

      const [movedItem] = this.canvasLayout.splice(fromIndex, 1);
      this.canvasLayout.splice(toIndex, 0, movedItem);

      this.saveCanvasLayout();

      if (this.app && this.app.events) {
        this.app.events.emit('canvas:reordered', { fromIndex, toIndex, layout: this.canvasLayout });
      }
    }

    /**
     * Set specific size for a widget ('sm' | 'md' | 'lg' | 'full')
     */
    setWidgetSize(widgetId, size) {
      const item = this.canvasLayout.find(w => w.id === widgetId);
      if (!item) return;

      const validSizes = ['sm', 'md', 'lg', 'full'];
      if (!validSizes.includes(size)) size = 'md';

      item.size = size;
      item.colSpan = (size === 'sm' || size === 'md') ? '1' : (size === 'lg' ? '2' : 'full');
      this.saveCanvasLayout();

      if (this.app && this.app.events) {
        this.app.events.emit('canvas:sizeChanged', { widgetId, size: item.size, colSpan: item.colSpan });
      }
      return item.size;
    }

    /**
     * Cycle through sizes: sm -> md -> lg -> full -> sm
     */
    cycleWidgetSize(widgetId) {
      const item = this.canvasLayout.find(w => w.id === widgetId);
      if (!item) return;

      const sizes = ['sm', 'md', 'lg', 'full'];
      const currentSize = item.size || (item.colSpan === '2' ? 'lg' : (item.colSpan === 'full' ? 'full' : 'md'));
      const currentIdx = sizes.indexOf(currentSize);
      const nextIdx = (currentIdx + 1) % sizes.length;
      return this.setWidgetSize(widgetId, sizes[nextIdx]);
    }

    /**
     * Get current size of a widget
     */
    getWidgetSize(widgetId) {
      const item = this.canvasLayout.find(w => w.id === widgetId);
      if (!item) return 'md';
      return item.size || (item.colSpan === '2' ? 'lg' : (item.colSpan === 'full' ? 'full' : 'md'));
    }

    /**
     * Toggle Col-Span / Size
     */
    toggleColSpan(widgetId) {
      return this.cycleWidgetSize(widgetId);
    }

    /**
     * Reset canvas layout to defaults
     */
    resetLayout() {
      this.canvasLayout = JSON.parse(JSON.stringify(DEFAULT_CANVAS_LAYOUT));
      this.saveCanvasLayout();
      if (this.app && this.app.events) {
        this.app.events.emit('canvas:reset');
      }
    }

    /**
     * Toggle Customize Mode
     */
    toggleCustomizeMode(forcedState) {
      this.isCustomizeMode = (forcedState !== undefined) ? forcedState : !this.isCustomizeMode;
      return this.isCustomizeMode;
    }

    /**
     * Get a specific widget definition
     */
    get(widgetId) {
      return this.widgets.get(widgetId);
    }

    /**
     * Get all registered widgets
     */
    getAllWidgets() {
      return Array.from(this.widgets.values());
    }

    /**
     * Initialize catalog with all 21 modular widgets
     */
    initDefaultCatalog() {
      // 1. Hero Greeting & Profile
      this.register({
        id: 'hero_profile',
        title: 'الملف التعريفي والتحية',
        icon: '👤',
        category: 'core',
        desc: 'الترحيب الشخصي، تقييم الأداء العام، مؤشر الزخم، وأفضل أداء يومي.',
        colSpan: '2'
      });

      // 2. Warm Butter Yellow Progress Card
      this.register({
        id: 'progress_yellow',
        title: 'نسبة الإنجاز اليومي',
        icon: '📈',
        category: 'core',
        desc: 'نسبة التقدم الكبرى والعبارات التحفيزية مع تبديل العرض الأسبوعي والشهري.',
        colSpan: '1'
      });

      // 3. Grace Shield & Consistency
      this.register({
        id: 'grace_shield',
        title: 'درع حماية السلسلة',
        icon: '🛡️',
        category: 'core',
        desc: 'حماية السلاسل وتجميدها في أيام الراحة مع اقتباسات ملهمة متجددة.',
        colSpan: '1'
      });

      // 4. Day Strip Picker
      this.register({
        id: 'day_strip',
        title: 'شريط الأيام السبعة المباشر',
        icon: '📅',
        category: 'core',
        desc: 'شريط التنقل الأفقي السريع بين أيام الأسبوع مع نقاط الإنجاز اليومية.',
        colSpan: '2'
      });

      // 5. Time Filter Bar
      this.register({
        id: 'time_filter',
        title: 'فلاتر فترات اليوم',
        icon: '⏱️',
        category: 'core',
        desc: 'فلترة العادات حسب الصباح، الظهيرة، المساء، وقبل النوم.',
        colSpan: '2'
      });

      // 6. Category Tag Filters
      this.register({
        id: 'category_filter',
        title: 'شريط التصنيفات والوسوم المخصصة',
        icon: '🏷️',
        category: 'core',
        desc: 'تصفية العادات حسب التصنيفات اللانهائية مع زر إنشاء تصنيف جديد فوري.',
        colSpan: '2'
      });

      // 7. Interactive Habits Stream
      this.register({
        id: 'habits_stream',
        title: 'تدفق العادات اليومية التفاعلي',
        icon: '⚡',
        category: 'habits',
        desc: 'قائمة عادات اليوم مع أزرار الإنجاز، العدادات الرقمية، ومؤقتات التركيز.',
        colSpan: '2'
      });

      // 8. Quit Bad Habits Counter
      this.register({
        id: 'quit_tracker',
        title: 'عداد كسر العادات السلبية (النقاء)',
        icon: '🚭',
        category: 'tasks',
        desc: 'تتبع مدة التوقف المستمر (أيام/ساعات/دقائق) وحساب التوفير المالي والصحي.',
        colSpan: '1'
      });

      // 9. Daily To-Do List
      this.register({
        id: 'todo_list',
        title: 'قائمة مهام اليوم المرافقة',
        icon: '📝',
        category: 'tasks',
        desc: 'قائمة مهام اليوم السريعة مع مستويات الأولوية (عاجل، متوسط، هادئ).',
        colSpan: '1'
      });

      // 10. Left-Inspired Time Matrix
      this.register({
        id: 'left_matrix',
        title: 'مصفوفة تقدم الوقت الحية (Left Matrix)',
        icon: '⏳',
        category: 'time',
        desc: 'مؤشرات دائرية حية لحساب الوقت المنقضي والمتبقي من الدقائق، الساعات، اليوم، الأسبوع، الشهر، والسنة.',
        colSpan: '2'
      });

      // 11. Two-Day Rule Tracker
      this.register({
        id: 'two_day_rule',
        title: 'قاعدة اليومين (Atomic Habits)',
        icon: '🔄',
        category: 'habits',
        desc: 'حماية ذكية تمنع تفويت العادة يومين متتاليين وتمنحك تنبيهاً لإنقاذ السلسلة.',
        colSpan: '1'
      });

      // 12. Habit Stacking Chain
      this.register({
        id: 'habit_stacking',
        title: 'تسلسل وتراكم العادات',
        icon: '🔗',
        category: 'habits',
        desc: 'ربط العادات بتسلسل شرطي ذكي (بعد [العادة X] سأقوم فوراً بـ [العادة Y]).',
        colSpan: '1'
      });

      // 13. Annual Consistency Matrix (365-Day)
      this.register({
        id: 'annual_matrix',
        title: 'بانوراما الـ 365 يوماً السنوية',
        icon: '🌟',
        category: 'analytics',
        desc: 'خريطة التزام سنوية كاملة على مدار 52 أسبوعاً بأسلوب GitHub و Left.',
        colSpan: '2'
      });

      // 14. Weekly Bar Chart
      this.register({
        id: 'weekly_chart',
        title: 'الرسم البياني الأسبوعي',
        icon: '📊',
        category: 'analytics',
        desc: 'أعمدة بيانية متجاوبة توضح معدل إنجاز العادات للأيام السبعة.',
        colSpan: '1'
      });

      // 15. Monthly Heatmap Grid
      this.register({
        id: 'monthly_heatmap',
        title: 'الخريطة الحرارية الشهرية',
        icon: '🗺️',
        category: 'analytics',
        desc: 'تقويم الشهر مع تدرجات لونية لكثافة الالتزام وإحصائيات السلاسل.',
        colSpan: '1'
      });

      // 16. Monthly Algorithm Recap
      this.register({
        id: 'monthly_recap',
        title: 'بطاقة التقييم الشهري الذكي',
        icon: '🏆',
        category: 'analytics',
        desc: 'تقييم الأداء العام بدرجة خوارزمية (S/A/B) مع إحصاء العادة البطلة.',
        colSpan: '1'
      });

      // 17. Gamification Badges
      this.register({
        id: 'badges',
        title: 'أوسمة وشارات الإنجاز',
        icon: '🎖️',
        category: 'analytics',
        desc: 'أوسمة الاستمرارية المفتوحة ومسار التقدم نحو الشارات القادمة.',
        colSpan: '1'
      });

      // 18. Quick Metrics Matrix
      this.register({
        id: 'quick_stats',
        title: 'مصفوفة الإحصائيات السريعة',
        icon: '📌',
        category: 'analytics',
        desc: '4 مؤشرات رقمية فورية: إجمالي العادات، السلاسل النشطة، معدل الكفاءة، ودروع الأمان.',
        colSpan: '2'
      });

      // 19. Daily Quote
      this.register({
        id: 'daily_quote',
        title: 'اقتباس فلسفي وتحفيزي يومي',
        icon: '💬',
        category: 'time',
        desc: 'حكمة يومية من كتب العادات والإنتاجية مع إمكانية التحديث بضغطة زر.',
        colSpan: '1'
      });

      // 20. Circadian Rhythm
      this.register({
        id: 'circadian_rhythm',
        title: 'الإيقاع الحيوي وساعات الذروة',
        icon: '☀️',
        category: 'analytics',
        desc: 'تحليل أوقات اليوم الأكثر إنتاجية بحسب إنجازاتك المسجلة.',
        colSpan: '1'
      });

      // 21. Daily Reflection & Friction Log
      this.register({
        id: 'daily_reflection',
        title: 'سجل التأمل والملاحظات السريع',
        icon: '✍️',
        category: 'habits',
        desc: 'تدوين الحالة المزاجية، العوائق، وملاحظات يومية سريعة.',
        colSpan: '2'
      });

      // 22. Habit Strength Index (Consistency Score)
      this.register({
        id: 'habit_strength',
        title: 'مؤشر قوة العادات والاستمرارية',
        icon: '🔋',
        category: 'habits',
        desc: 'مقياس علمي تراكمي لقوة العادة (Consistency Score) يتجاوز قلق انقطاع السلاسل.',
        colSpan: '1'
      });

      // 23. Financial & Health Recovery Savings Ticker
      this.register({
        id: 'financial_roi',
        title: 'عداد التوفير المالي والصحي',
        icon: '💰',
        category: 'tasks',
        desc: 'حساب فوري للأموال المحفوظة وساعات النقاء والصحة المكتسبة من كسر العادات السلبية.',
        colSpan: '1'
      });

      // 24. Ambient Focus Soundscapes
      this.register({
        id: 'focus_audio',
        title: 'مولد أصوات التركيز والخلفيات الهادئة',
        icon: '🎧',
        category: 'time',
        desc: 'أصوات مطر وأمواج بحر وموجات ألفا 10Hz مولدة فورياً بـ Web Audio للعمل دون إنترنت.',
        colSpan: '1'
      });

      // 25. Week-over-Week Momentum Velocity
      this.register({
        id: 'momentum_velocity',
        title: 'مقارنة النمو والسرعة الأسبوعية',
        icon: '🚀',
        category: 'analytics',
        desc: 'مقارنة إنجاز الأسبوع الحالي بالأسبوع السابق مع قياس سرعة الزخم التراكمي.',
        colSpan: '1'
      });

      // ========================================================================
      // 26-32. الأدوات الإنتاجية الـ 15 كويدجتس تفاعلية حية (Tools as Bento Widgets)
      // ========================================================================
      // 26. Live Pomodoro Focus Widget
      this.register({
        id: 'tool_pomodoro',
        title: 'مؤقت البومودورو والتركيز',
        icon: '🍅',
        category: 'time',
        desc: 'مؤقت بومودورو للتركيز المباشر مع ربطه بالعادات وتوثيق الدقائق ونقاط XP تلقائياً.',
        colSpan: '1'
      });

      // 27. Live Eisenhower Matrix Widget
      this.register({
        id: 'tool_eisenhower',
        title: 'مصفوفة أيزنهاور لفرز الأولويات',
        icon: '🔲',
        category: 'tasks',
        desc: 'الأرباع الأربعة مع إضافة مباشرة ومزامنة حية ثنائية مع قائمة مهام اليوم.',
        colSpan: '2'
      });

      // 28. Live Ivy Lee 6 Tasks Widget
      this.register({
        id: 'tool_ivy_lee',
        title: 'طريقة آيفي لي (أهم 6 مهام)',
        icon: '📝',
        category: 'tasks',
        desc: 'قائمة أهم 6 مهام مع وضع التركيز الأحادي على المهمة رقم 1 وزر إنجاز فوري.',
        colSpan: '1'
      });

      // 29. Live 5-Second Rocket Widget
      this.register({
        id: 'tool_rocket_5s',
        title: 'صاروخ الـ 5 ثوانٍ لكسر التسويف',
        icon: '🚀',
        category: 'time',
        desc: 'عد تنازلي سريع 5-4-3-2-1 لتحفيز الانطلاق الجسدي وكسر التردد والتسويف.',
        colSpan: '1'
      });

      // 30. Live Habit Stacking Widget
      this.register({
        id: 'tool_habit_stack',
        title: 'مخطط تراكم العادات السريعة',
        icon: '🔗',
        category: 'habits',
        desc: 'ربط العادات الجديدة بعادات راسخة مع زر إضافة مباشر إلى جدول اليوم.',
        colSpan: '1'
      });

      // 31. Live Stoic Review Widget
      this.register({
        id: 'tool_stoic_card',
        title: 'المساءلة والمراجعة الرواقية',
        icon: '🌙',
        category: 'habits',
        desc: 'تدوين ختام اليوم بالأسئلة الثلاثية وتغذية مؤشرات الأداء والتقييم الشهري الذكي.',
        colSpan: '2'
      });

      // 32. Live 2-Minute Rule Widget
      this.register({
        id: 'tool_two_min',
        title: 'قاعدة الدقيقتين للإنجاز الخاطف',
        icon: '⏳',
        category: 'habits',
        desc: 'مؤقت 120 ثانية لكسر حاجز البداية وتحجيم العادات الثقيلة.',
        colSpan: '1'
      });
    }
  }

  window.HabitFlowWidgetRegistry = WidgetRegistry;
})(window);

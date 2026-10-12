/**
 * ============================================================================
 * HabitFlow Pro - Universal Bento Widget Canvas Engine (Rock-Solid Edition)
 * ============================================================================
 * Manages the interactive, freely movable Bento widgets on the main dashboard:
 *  - Universal Touch & Mouse Drag-and-Drop across the entire canvas
 *  - Interactive Multi-Size Switcher (S, M, L, Full) for EVERY widget
 *  - Adaptive layouts across Mobile (<640px), Tablet (640-1023px), and Desktop (≥1024px)
 *  - Widget Gallery (+ ويدجت) to show/hide any of the features
 *  - Left-Inspired live Time Matrix (second ticker across minute, hour, day, week, month, year)
 *  - Atomic Habits Two-Day rule & habit stacking integration
 *  - Full layout & size persistence in localStorage
 */

(function (window) {
  'use strict';

  const CANVAS_LAYOUT_KEY = 'habitflow_bento_layout_v4';
  const REFLECTIONS_STORAGE_KEY = 'habitflow_daily_reflections_v1';

  const DEFAULT_CANVAS_CONFIG = {
    order: [
      'hero_profile',
      'progress_yellow',
      'grace_shield',
      'left_matrix',
      'calendar_controls',
      'habits_stream',
      'two_day_rule',
      'habit_stacking',
      'quick_stats',
      'daily_quote',
      'daily_reflection'
    ],
    widgets: {
      hero_profile: { size: 'full', hidden: false },
      progress_yellow: { size: 'md', hidden: false },
      grace_shield: { size: 'md', hidden: false },
      left_matrix: { size: 'md', hidden: false },
      calendar_controls: { size: 'full', hidden: false },
      habits_stream: { size: 'full', hidden: false },
      two_day_rule: { size: 'md', hidden: false },
      habit_stacking: { size: 'md', hidden: false },
      quick_stats: { size: 'lg', hidden: false },
      daily_quote: { size: 'md', hidden: false },
      daily_reflection: { size: 'lg', hidden: false }
    }
  };

  class CanvasEngine {
    constructor(appInstance) {
      this.app = appInstance;
      this.container = document.getElementById('bentoWidgetCanvas');
      this.galleryModal = document.getElementById('widgetGalleryModal');
      this.galleryGrid = document.getElementById('widgetGalleryGrid');
      this.galleryCategoryTabs = document.getElementById('galleryCategoryTabs');
      this.openGalleryBtn = document.getElementById('openWidgetGalleryBtn');
      this.closeGalleryBtn = document.getElementById('closeWidgetGalleryBtn');
      this.toggleCustomizeBtn = document.getElementById('toggleCustomizeCanvasBtn');
      this.resetLayoutBtn = document.getElementById('resetCanvasLayoutBtn');
      this.canvasModeLabel = document.getElementById('canvasModeLabel');

      this.isCustomizeMode = false;
      this.activeGalleryCategory = 'all';
      this.leftMatrixUnit = 'day'; // 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

      // Curated Stoic & Atomic Habits Quotes
      this.quotes = [
        { text: "أنت لا ترتقي إلى مستوى أهدافك، بل تنحدر إلى مستوى أنظمتك.", author: "جيمس كلير (Atomic Habits)" },
        { text: "الاستمرارية البسيطة يومياً تهزم الجهد الهائل المتقطع.", author: "ستيف جوينز" },
        { text: "لا تكسر السلسلة أبداً، وإذا فوتت يوماً فلا تفوت اليوم الثاني إطلاقاً.", author: "قاعدة اليومين (Atomic Habits)" },
        { text: "الوقت هو الشيء الوحيد الذي لا يمكنك استرجاعه، اجعل كل لحظة محسوبة.", author: "سينيكا" },
        { text: "البساطة والوضوح هما أساس الإتقان والإنتاجية الفائقة.", author: "ماركوس أوريليوس" },
        { text: "كل عمل تقوم به هو تصويت لصالح الشخص الذي ترغب في أن تصبحه.", author: "جيمس كلير" }
      ];
      this.currentQuoteIndex = 0;

      this.reflections = this.loadReflections();
      this.layoutConfig = this.loadLayoutConfig();

      this.init();
    }

    loadLayoutConfig() {
      try {
        const stored = localStorage.getItem(CANVAS_LAYOUT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && parsed.order && Array.isArray(parsed.order)) {
            return parsed;
          }
        }
        return JSON.parse(JSON.stringify(DEFAULT_CANVAS_CONFIG));
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_CANVAS_CONFIG));
      }
    }

    saveLayoutConfig() {
      try {
        localStorage.setItem(CANVAS_LAYOUT_KEY, JSON.stringify(this.layoutConfig));
      } catch (e) {}
    }

    loadReflections() {
      try {
        const stored = localStorage.getItem(REFLECTIONS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    }

    saveReflections() {
      try {
        localStorage.setItem(REFLECTIONS_STORAGE_KEY, JSON.stringify(this.reflections));
      } catch (e) {}
    }

    render() {
      this.applySavedLayout();
      this.refreshActiveWidgets();
    }

    init() {
      if (!this.container) return;

      this.applySavedLayout();
      this.bindToolbarEvents();
      this.bindWidgetControls();
      this.initDragAndDrop();

      // Render specialized interactive widgets
      this.renderLeftMatrix();
      this.renderTwoDayRule();
      this.renderHabitStacking();
      this.renderQuickStats();
      this.renderDailyReflection();
      this.renderCircadianRhythm();
      this.renderHabitStrength();
      this.renderFinancialRoi();
      this.renderFocusAudio();
      this.renderMomentumVelocity();

      // Start Left Time Matrix second-by-second live ticker
      setInterval(() => {
        this.updateLeftMatrixTick();
      }, 1000);
    }

    /**
     * Apply saved layout order, sizes, and visibility to existing DOM cards
     */
    applySavedLayout() {
      if (!this.container) return;

      const cards = Array.from(this.container.querySelectorAll('.bento-widget-card'));
      const cardMap = new Map();
      cards.forEach(c => cardMap.set(c.dataset.widgetId, c));

      // If we have saved order, reorder DOM nodes smoothly
      const orderList = (this.layoutConfig.order && Array.isArray(this.layoutConfig.order))
        ? this.layoutConfig.order
        : DEFAULT_CANVAS_CONFIG.order;

      orderList.forEach(wId => {
        const card = cardMap.get(wId);
        if (card) {
          this.container.appendChild(card);
        }
      });

      // Apply saved sizes and hidden states
      const widgetConfigs = this.layoutConfig.widgets || DEFAULT_CANVAS_CONFIG.widgets;
      Object.entries(widgetConfigs).forEach(([wId, cfg]) => {
        const card = cardMap.get(wId);
        if (!card) return;

        if (cfg.hidden) {
          card.style.display = 'none';
        } else {
          card.style.display = '';
        }

        if (cfg.size) {
          this.setCardSizeClass(card, cfg.size);
        }
      });
    }

    setCardSizeClass(cardEl, size) {
      if (!cardEl) return;
      const validSizes = ['sm', 'md', 'lg', 'full'];
      if (!validSizes.includes(size)) size = 'md';

      cardEl.classList.remove('size-sm', 'size-md', 'size-lg', 'size-full', 'span-1', 'span-2', 'span-full');
      cardEl.classList.add(`size-${size}`);
      const colSpan = (size === 'sm' || size === 'md') ? '1' : (size === 'lg' ? '2' : 'full');
      cardEl.classList.add(`span-${colSpan}`);
      cardEl.dataset.widgetSize = size;

      // Update active pills
      cardEl.querySelectorAll('.size-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.setSize === size);
      });
    }

    bindToolbarEvents() {
      if (this.openGalleryBtn) {
        this.openGalleryBtn.onclick = () => this.openGallery();
      }

      if (this.closeGalleryBtn) {
        this.closeGalleryBtn.onclick = () => this.closeGallery();
      }

      if (this.galleryModal) {
        this.galleryModal.onclick = (e) => {
          if (e.target === this.galleryModal) this.closeGallery();
        };
      }

      if (this.toggleCustomizeBtn) {
        this.toggleCustomizeBtn.onclick = () => this.toggleCustomizeMode();
      }

      if (this.resetLayoutBtn) {
        this.resetLayoutBtn.onclick = () => {
          if (confirm('هل ترغب بإعادة ضبط ترتيب وأحجام اللوحة إلى الوضع الافتراضي المتوازن؟')) {
            this.resetLayout();
            this.app.showToast('تمت استعادة الترتيب والأبعاد المتناسقة بنجاح ↺');
          }
        };
      }

      // Gallery Category Tabs
      if (this.galleryCategoryTabs) {
        const tabs = this.galleryCategoryTabs.querySelectorAll('.gallery-tab-pill');
        tabs.forEach(tab => {
          tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.activeGalleryCategory = tab.dataset.cat || 'all';
            this.renderGalleryGrid();
            this.app.triggerHaptic('light');
          };
        });
      }

      // Quote Shuffle in widget
      const shuffleQuoteBtn = document.getElementById('canvasShuffleQuoteBtn');
      if (shuffleQuoteBtn) {
        shuffleQuoteBtn.onclick = () => {
          this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.quotes.length;
          const q = this.quotes[this.currentQuoteIndex];
          const b = document.getElementById('canvasQuoteBody');
          const a = document.getElementById('canvasQuoteAuthor');
          if (b) b.textContent = `"${q.text}"`;
          if (a) a.textContent = `— ${q.author}`;
          this.app.triggerHaptic('light');
        };
      }
    }

    bindWidgetControls() {
      if (!this.container) return;

      // Direct size buttons: S | M | L | Full
      this.container.querySelectorAll('.size-pill-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const wId = btn.dataset.widgetId;
          const targetSize = btn.dataset.setSize;
          this.applyWidgetSize(wId, targetSize);
        };
      });

      // Quick cycle size button (📐) and corner handle (⤡)
      this.container.querySelectorAll('[data-cycle-id]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const wId = btn.dataset.cycleId;
          this.cycleWidgetSize(wId);
        };
      });

      // Hide / Remove button (✕)
      this.container.querySelectorAll('.widget-remove-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const wId = btn.dataset.removeId;
          const card = this.container.querySelector(`[data-widget-id="${wId}"]`);
          if (card) {
            card.style.display = 'none';

            if (!this.layoutConfig.widgets) this.layoutConfig.widgets = {};
            if (!this.layoutConfig.widgets[wId]) this.layoutConfig.widgets[wId] = {};
            this.layoutConfig.widgets[wId].hidden = true;
            this.saveLayoutConfig();

            this.app.triggerHaptic('light');
            this.app.showToast('تم إخفاء الويدجت من اللوحة الرئيسية', () => {
              card.style.display = '';
              this.layoutConfig.widgets[wId].hidden = false;
              this.saveLayoutConfig();
              this.app.triggerHaptic('light');
            });
          }
        };
      });
    }

    initDragAndDrop() {
      if (!this.container || !window.HabitFlowDragDrop) return;

      window.HabitFlowDragDrop.makeSortable({
        container: this.container,
        itemSelector: '.bento-widget-card',
        handleSelector: '.widget-drag-handle',
        onReorder: () => {
          const cards = Array.from(this.container.querySelectorAll('.bento-widget-card'));
          this.layoutConfig.order = cards.map(c => c.dataset.widgetId).filter(Boolean);
          this.saveLayoutConfig();
          this.app.triggerHaptic('double');
          this.app.showToast('تم حفظ الترتيب الجديد للوحة بنجاح ✨');
        }
      });
    }

    applyWidgetSize(widgetId, targetSize) {
      const card = this.container.querySelector(`[data-widget-id="${widgetId}"]`);
      if (!card) return;

      this.setCardSizeClass(card, targetSize);

      if (!this.layoutConfig.widgets) this.layoutConfig.widgets = {};
      if (!this.layoutConfig.widgets[widgetId]) this.layoutConfig.widgets[widgetId] = {};
      this.layoutConfig.widgets[widgetId].size = targetSize;
      this.saveLayoutConfig();

      this.app.triggerHaptic('light');

      const sizeLabels = {
        sm: 'صغير مدمج (S)',
        md: 'متوسط قياسي (M)',
        lg: 'عريض (L)',
        full: 'كامل الشاشة (Full)'
      };
      this.app.showToast(`تم تغيير القياس إلى: ${sizeLabels[targetSize] || targetSize} 📐`);
    }

    cycleWidgetSize(widgetId) {
      const card = this.container.querySelector(`[data-widget-id="${widgetId}"]`);
      if (!card) return;

      const currentSize = card.dataset.widgetSize || 'md';
      const sizes = ['sm', 'md', 'lg', 'full'];
      const nextIdx = (sizes.indexOf(currentSize) + 1) % sizes.length;
      this.applyWidgetSize(widgetId, sizes[nextIdx]);
    }

    toggleCustomizeMode() {
      this.isCustomizeMode = !this.isCustomizeMode;

      if (this.toggleCustomizeBtn) {
        this.toggleCustomizeBtn.classList.toggle('active', this.isCustomizeMode);
        this.toggleCustomizeBtn.innerHTML = this.isCustomizeMode ? '<span>✓</span> حفظ' : '<span>✏️</span> تخصيص';
      }

      if (this.canvasModeLabel) {
        this.canvasModeLabel.textContent = this.isCustomizeMode ? 'وضع التخصيص وإعادة الترتيب 🛠️' : 'لوحة البينتو الحرة';
      }

      const cards = this.container.querySelectorAll('.bento-widget-card');
      cards.forEach(card => card.classList.toggle('is-customizing', this.isCustomizeMode));

      this.app.triggerHaptic(this.isCustomizeMode ? 'double' : 'light');
      this.app.showToast(this.isCustomizeMode ? 'وضع التخصيص مفعّل: يمكنك سحب أي ويدجت، تحجيمه (📐)، أو إخفاؤه (✕)' : 'تم حفظ تخطيط اللوحة بنجاح ✓');
    }

    resetLayout() {
      this.layoutConfig = JSON.parse(JSON.stringify(DEFAULT_CANVAS_CONFIG));
      this.saveLayoutConfig();

      const cardMap = new Map();
      this.container.querySelectorAll('.bento-widget-card').forEach(c => cardMap.set(c.dataset.widgetId, c));

      DEFAULT_CANVAS_CONFIG.order.forEach(wId => {
        const card = cardMap.get(wId);
        if (card) {
          card.style.display = '';
          const cfg = DEFAULT_CANVAS_CONFIG.widgets[wId] || { size: 'md' };
          this.setCardSizeClass(card, cfg.size);
          this.container.appendChild(card);
        }
      });
    }

    openGallery() {
      if (this.galleryModal) {
        this.renderGalleryGrid();
        this.galleryModal.classList.add('open');
        this.app.triggerHaptic('light');
      }
    }

    closeGallery() {
      if (this.galleryModal) {
        this.galleryModal.classList.remove('open');
      }
    }

    renderGalleryGrid() {
      if (!this.galleryGrid) return;
      this.galleryGrid.innerHTML = '';

      const allWidgets = [
        { id: 'hero_profile', title: 'الملف التعريفي والتحية', icon: '👤', category: 'core', desc: 'الترحيب الشخصي، تقييم الأداء، مؤشر الزخم، وأفضل أداء يومي.' },
        { id: 'progress_yellow', title: 'نسبة الإنجاز اليومي', icon: '📈', category: 'core', desc: 'نسبة التقدم الكبرى والعبارات التحفيزية مع تبديل العرض.' },
        { id: 'grace_shield', title: 'درع حماية السلسلة', icon: '🛡️', category: 'core', desc: 'حماية السلاسل وتجميدها في أيام الراحة مع اقتباسات ملهمة.' },
        { id: 'left_matrix', title: 'مصفوفة تقدم الوقت الحية (Left)', icon: '⏳', category: 'time', desc: 'دوائر ومصفوفة حية لحساب الوقت المنقضي من الدقيقة، الساعة، اليوم، الأسبوع، الشهر، والسنة.' },
        { id: 'calendar_controls', title: 'التقويم وفلاتر العادات الذكية', icon: '📅', category: 'core', desc: 'شريط الأيام السبعة مع فلاتر فترات اليوم والتصنيفات في بطاقة موحدة.' },
        { id: 'habits_stream', title: 'تدفق العادات اليومية التفاعلي', icon: '⚡', category: 'habits', desc: 'قائمة عادات اليوم مع أزرار الإنجاز، العدادات (+/-)، ومؤقتات التركيز.' },
        { id: 'two_day_rule', title: 'قاعدة اليومين (Atomic Habits)', icon: '🔄', category: 'habits', desc: 'حماية ذكية تمنع تفويت العادة يومين متتاليين مع إنقاذ فوري.' },
        { id: 'habit_stacking', title: 'تسلسل وتراكم العادات', icon: '🔗', category: 'habits', desc: 'ربط العادات بتسلسل شرطي ذكي (بعد العادة X أقوم فوراً بـ Y).' },
        { id: 'quick_stats', title: 'مصفوفة الإحصائيات السريعة', icon: '📌', category: 'analytics', desc: '4 مؤشرات رقمية فورية: إجمالي العادات، السلاسل، الكفاءة، والدروع.' },
        { id: 'daily_quote', title: 'اقتباس فلسفي وتحفيزي يومي', icon: '💬', category: 'time', desc: 'حكمة يومية من كتب العادات والإنتاجية مع زر تحديث عشوائي.' },
        { id: 'daily_reflection', title: 'سجل التأمل والملاحظات', icon: '✍️', category: 'habits', desc: 'تدوين الحالة المزاجية، العوائق، وملاحظات يومية سريعة.' },
        { id: 'circadian_rhythm', title: 'منحنى الساعة البيولوجية والتركيز', icon: '🧬', category: 'time', desc: 'مخطط ذروة الكورتيزول والتركيز على مدار اليوم لتحديد التوقيت البيولوجي الأنسب لكل عادة.' },
        { id: 'habit_strength', title: 'مؤشر قوة العادات والاستمرارية', icon: '🔋', category: 'habits', desc: 'مقياس علمي تراكمي لقوة العادة (Consistency Score) يتجاوز قلق انقطاع السلاسل.' },
        { id: 'financial_roi', title: 'عداد التوفير المالي والصحي', icon: '💰', category: 'tasks', desc: 'حساب الأموال المحفوظة وساعات النقاء والصحة المكتسبة من كسر العادات السلبية.' },
        { id: 'focus_audio', title: 'مولد أصوات التركيز والخلفيات الهادئة', icon: '🎧', category: 'time', desc: 'أصوات مطر وأمواج بحر وموجات ألفا مولدة فورياً بـ Web Audio للعمل دون إنترنت.' },
        { id: 'momentum_velocity', title: 'مقارنة النمو والسرعة الأسبوعية', icon: '🚀', category: 'analytics', desc: 'مقارنة إنجاز الأسبوع الحالي بالأسبوع السابق مع قياس سرعة الزخم التراكمي.' },
        { id: 'tool_pomodoro', title: 'مؤقت البومودورو والتركيز', icon: '🍅', category: 'time', desc: 'مؤقت بومودورو للتركيز المباشر مع ربطه بالعادات وتوثيق الدقائق ونقاط XP تلقائياً.' },
        { id: 'tool_eisenhower', title: 'مصفوفة أيزنهاور لفرز الأولويات', icon: '🔲', category: 'tasks', desc: 'الأرباع الأربعة مع إضافة مباشرة ومزامنة حية ثنائية مع قائمة مهام اليوم.' },
        { id: 'tool_ivy_lee', title: 'طريقة آيفي لي (أهم 6 مهام)', icon: '📝', category: 'tasks', desc: 'قائمة أهم 6 مهام مع وضع التركيز الأحادي على المهمة رقم 1 وزر إنجاز فوري.' },
        { id: 'tool_rocket_5s', title: 'صاروخ الـ 5 ثوانٍ لكسر التسويف', icon: '🚀', category: 'time', desc: 'عد تنازلي سريع 5-4-3-2-1 لتحفيز الانطلاق الجسدي وكسر التردد والتسويف.' },
        { id: 'tool_habit_stack', title: 'مخطط تراكم العادات السريعة', icon: '🔗', category: 'habits', desc: 'ربط العادات الجديدة بعادات راسخة مع زر إضافة مباشر إلى جدول اليوم.' },
        { id: 'tool_stoic_card', title: 'المساءلة والمراجعة الرواقية', icon: '🌙', category: 'habits', desc: 'تدوين ختام اليوم بالأسئلة الثلاثية وتغذية مؤشرات الأداء والتقييم الشهري الذكي.' },
        { id: 'tool_two_min', title: 'قاعدة الدقيقتين للإنجاز الخاطف', icon: '⏳', category: 'habits', desc: 'مؤقت 120 ثانية لكسر حاجز البداية وتحجيم العادات الثقيلة.' }
      ];

      const filtered = (this.activeGalleryCategory === 'all')
        ? allWidgets
        : allWidgets.filter(w => w.category === this.activeGalleryCategory);

      filtered.forEach(w => {
        let card = this.container.querySelector(`[data-widget-id="${w.id}"]`);
        const isVisible = card && card.style.display !== 'none';

        const itemEl = document.createElement('div');
        itemEl.className = 'gallery-widget-item';
        itemEl.innerHTML = `
          <div class="gallery-widget-top">
            <div class="gallery-widget-icon">${w.icon}</div>
            <div class="gallery-widget-info">
              <span class="gallery-widget-title">${w.title}</span>
              <span class="gallery-widget-desc">${w.desc}</span>
            </div>
          </div>
          <button type="button" class="gallery-widget-btn ${isVisible ? 'is-active' : ''}" data-gallery-id="${w.id}">
            ${isVisible ? '✓ معروض في اللوحة' : '+ إظهار في اللوحة'}
          </button>
        `;

        const btn = itemEl.querySelector('[data-gallery-id]');
        if (btn) {
          btn.onclick = () => {
            if (!card) {
              card = this.createWidgetCardElement(w.id);
              this.container.appendChild(card);
              this.bindSingleWidgetControls(card);
            }

            if (card) {
              card.style.display = '';
              if (!this.layoutConfig.widgets) this.layoutConfig.widgets = {};
              if (!this.layoutConfig.widgets[w.id]) this.layoutConfig.widgets[w.id] = {};
              this.layoutConfig.widgets[w.id].hidden = false;
              this.saveLayoutConfig();

              this.renderSpecializedWidget(w.id);

              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              this.closeGallery();
              this.app.triggerHaptic('double');
              this.app.showToast(`تم إظهار ويدجت "${w.title}" في اللوحة ✨`);
            }
          };
        }

        this.galleryGrid.appendChild(itemEl);
      });
    }

    /**
     * Refreshes dynamic metrics across custom widgets
     */
    refreshActiveWidgets() {
      this.updateLeftMatrixTick();
      this.renderTwoDayRule();
      this.renderQuickStats();
      this.renderCircadianRhythm();
      this.renderHabitStrength();
      this.renderFinancialRoi();
      this.renderMomentumVelocity();
      this.renderToolPomodoro();
      this.renderToolEisenhower();
      this.renderToolIvyLee();
      this.renderToolRocket();
      this.renderToolHabitStack();
      this.renderToolStoic();
      this.renderToolTwoMin();
    }

    /**
     * Left-Inspired Live Time Matrix Tool
     */
    renderLeftMatrix() {
      const container = document.getElementById('leftMatrixDisplay');
      if (!container) return;

      const tabs = document.querySelectorAll('#leftMatrixUnitTabs .left-tab-btn');
      tabs.forEach(tab => {
        tab.onclick = () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.leftMatrixUnit = tab.dataset.unit || 'day';
          this.app.triggerHaptic('light');
          this.updateLeftMatrixTick();
        };
      });

      this.updateLeftMatrixTick();
    }

    updateLeftMatrixTick() {
      const displayEl = document.getElementById('leftMatrixDisplay');
      if (!displayEl) return;

      const now = new Date();
      let totalUnits = 24;
      let elapsedUnits = 0;
      let unitLabel = '';
      let remainingText = '';
      let dotSizePx = 9;

      switch (this.leftMatrixUnit) {
        case 'minute': {
          totalUnits = 60;
          elapsedUnits = now.getSeconds();
          unitLabel = 'من الدقيقة الحالية';
          const rem = 60 - elapsedUnits;
          remainingText = `${rem} ثانية متبقية`;
          dotSizePx = 7;
          break;
        }
        case 'hour': {
          totalUnits = 60;
          elapsedUnits = now.getMinutes();
          unitLabel = 'من الساعة الحالية';
          const rem = 60 - elapsedUnits;
          remainingText = `${rem} دقيقة متبقية`;
          dotSizePx = 7;
          break;
        }
        case 'day': {
          totalUnits = 24;
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          elapsedUnits = currentHour + (currentMinute / 60);
          unitLabel = 'من اليوم المنقضي';
          const remHours = (24 - elapsedUnits).toFixed(1);
          remainingText = `${remHours} ساعة متبقية`;
          dotSizePx = 11;
          break;
        }
        case 'week': {
          totalUnits = 7;
          const dayOfWeek = (now.getDay() + 1) % 7;
          elapsedUnits = dayOfWeek + (now.getHours() / 24);
          unitLabel = 'من الأسبوع الحالي';
          const remDays = (7 - elapsedUnits).toFixed(1);
          remainingText = `${remDays} أيام متبقية`;
          dotSizePx = 16;
          break;
        }
        case 'month': {
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          totalUnits = daysInMonth;
          elapsedUnits = now.getDate() - 1 + (now.getHours() / 24);
          unitLabel = `من شهر ${now.toLocaleDateString('ar-EG', { month: 'long' })}`;
          const rem = (totalUnits - elapsedUnits).toFixed(1);
          remainingText = `${rem} يوماً متبقياً`;
          dotSizePx = 10;
          break;
        }
        case 'year': {
          // For year, show 52 weekly milestones so they fit 100% cleanly
          totalUnits = 52;
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const diffDays = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
          elapsedUnits = Math.min(52, Math.floor(diffDays / 7));
          unitLabel = `من عام ${now.getFullYear()} (بالأسابيع)`;
          const remWeeks = Math.max(0, 52 - elapsedUnits);
          remainingText = `${remWeeks} أسبوعاً حتى نهاية العام`;
          dotSizePx = 8;
          break;
        }
      }

      const percent = Math.min(100, Math.max(0, Math.round((elapsedUnits / totalUnits) * 100)));

      displayEl.innerHTML = `
        <div class="left-matrix-big-stat">
          <div style="display:flex; flex-direction:column;">
            <div style="display:flex; align-items:baseline; gap:8px;">
              <span class="left-stat-number">${percent}%</span>
              <span class="left-stat-label">${unitLabel}</span>
            </div>
            <span style="font-size:12px; color:rgba(255,255,255,0.7); font-weight:700;">${remainingText}</span>
          </div>
          <div style="font-size:24px;">⏳</div>
        </div>

        <div class="left-dots-grid" style="margin-top:6px;">
          ${Array.from({ length: totalUnits }).map((_, idx) => {
            const isPassed = idx < Math.floor(elapsedUnits);
            const isCurrent = idx === Math.floor(elapsedUnits);
            return `<div class="left-circle-dot ${isPassed ? 'passed' : ''} ${isCurrent ? 'current' : ''}" style="width:${dotSizePx}px; height:${dotSizePx}px;" title="وحدة ${idx + 1}"></div>`;
          }).join('')}
        </div>
      `;
    }

    /**
     * Two-Day Rule Tracker (Atomic Habits)
     */
    renderTwoDayRule() {
      const container = document.getElementById('twoDayRuleContainer');
      if (!container) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.app.formatDateKey(yesterday);
      const todayStr = this.app.getTodayDateString();

      const atRiskHabits = this.app.habits.filter(h => {
        const missedYesterday = !this.app.isHabitDoneForDate(h, yesterdayStr);
        const doneToday = this.app.isHabitDoneForDate(h, todayStr);
        return missedYesterday && !doneToday;
      });

      if (atRiskHabits.length > 0) {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="two-day-badge">⚠️ تنبيه قاعدة اليومين</div>
            <span style="font-size:11.5px; font-weight:700; color:var(--text-secondary);">لا تفوت مرتين أبداً</span>
          </div>
          <h4 style="font-size:15px; font-weight:850; color:var(--text-primary); margin-top:2px;">
            لديك ${atRiskHabits.length} عادات لم تنجزها بالأمس! أنجزها اليوم لحماية السلسلة.
          </h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${atRiskHabits.map(h => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--card-gray-subtle); border-radius:14px;">
                <span style="font-size:13px; font-weight:800;">${h.emoji} ${h.name}</span>
                <button type="button" class="bento-todo-add-btn" style="padding:4px 12px; font-size:12px;" data-rescue-id="${h.id}">إنجاز الآن ✅</button>
              </div>
            `).join('')}
          </div>
        `;

        container.querySelectorAll('[data-rescue-id]').forEach(btn => {
          btn.onclick = () => {
            const hId = btn.dataset.rescueId;
            this.app.toggleCheckHabit(hId);
            this.renderTwoDayRule();
            this.app.triggerHaptic('success');
            this.app.showToast('تم إنقاذ العادة وحماية السلسلة بنجاح! 🛡️');
          };
        });
      } else {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="two-day-safe-badge">🛡️ قاعدة اليومين في أمان</div>
            <span style="font-size:11.5px; font-weight:700; color:#059669;">سلسلتك محمية 100%</span>
          </div>
          <p style="font-size:13px; font-weight:700; color:var(--text-secondary); line-height:1.4; margin-top:2px;">
            ممتاز جداً! لم تفوت أي عادة يومين متتاليين. هذا هو جوهر الاستمرارية الفولاذية في كتاب Atomic Habits.
          </p>
        `;
      }
    }

    /**
     * Habit Stacking Sequences
     */
    renderHabitStacking() {
      const container = document.getElementById('habitStackingContainer');
      if (!container) return;

      const stacked = this.app.habits.filter(h => h.stackParentId);

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="hero-subtitle">تراكم العادات المترابطة</span>
          <span class="pill-stat-btn">${stacked.length} سلاسل مكدسة</span>
        </div>
        <h4 style="font-size:15px; font-weight:850; color:var(--text-primary); margin-top:2px;">
          المحفزات والسلاسل التلقائية
        </h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${stacked.length > 0 ? stacked.map(h => {
            const parent = this.app.habits.find(p => p.id === h.stackParentId);
            return `
              <div class="stack-chain-row">
                <span>بعد أن [${parent ? parent.name : 'عادة سابقة'}]</span>
                <span class="stack-arrow">➔</span>
                <span style="color:#10B981;">فوراً [${h.name}]</span>
              </div>
            `;
          }).join('') : `
            <div style="font-size:12.5px; color:var(--text-secondary); padding:10px; text-align:center;">
              يمكنك ربط أي عادة بأخرى عند تعديلها لتكوين تسلسل تلقائي غير قابل للكسر!
            </div>
          `}
        </div>
      `;
    }

    /**
     * Quick Metrics Matrix (4 tiles)
     */
    renderQuickStats() {
      const container = document.getElementById('quickStatsGrid');
      if (!container) return;

      let totalDone = 0;
      let maxStreak = 0;
      this.app.habits.forEach(h => {
        if (this.app.isHabitDoneForDate(h, this.app.selectedDateStr)) totalDone++;
        const s = this.app.calculateStreak(h);
        if (typeof s === 'number' && s > maxStreak) maxStreak = s;
      });

      const rate = this.app.habits.length > 0 ? Math.round((totalDone / this.app.habits.length) * 100) : 0;

      container.innerHTML = `
        <div class="quick-stat-tile">
          <span class="quick-stat-icon">⚡</span>
          <span class="quick-stat-num">${this.app.habits.length}</span>
          <span class="quick-stat-lbl">إجمالي العادات</span>
        </div>
        <div class="quick-stat-tile">
          <span class="quick-stat-icon">🔥</span>
          <span class="quick-stat-num">${maxStreak}</span>
          <span class="quick-stat-lbl">أطول سلسلة</span>
        </div>
        <div class="quick-stat-tile">
          <span class="quick-stat-icon">📈</span>
          <span class="quick-stat-num">${rate}%</span>
          <span class="quick-stat-lbl">كفاءة اليوم</span>
        </div>
        <div class="quick-stat-tile">
          <span class="quick-stat-icon">🛡️</span>
          <span class="quick-stat-num">3/3</span>
          <span class="quick-stat-lbl">دروع التجميد</span>
        </div>
      `;
    }

    /**
     * Daily Reflection & Friction Log
     */
    renderDailyReflection() {
      const container = document.getElementById('dailyReflectionContainer');
      if (!container) return;

      const dateKey = this.app.selectedDateStr;
      const todayLog = this.reflections[dateKey] || { mood: 'great', note: '' };

      container.innerHTML = `
        <div class="tasks-card-header">
          <div>
            <span class="hero-subtitle">اليوميات والتأمل</span>
            <h3 style="font-size:18px; font-weight:800;">سجل العوائق والإنجاز</h3>
          </div>
          <span class="pill-stat-btn">${todayLog.note ? 'تم التسجيل ✓' : 'في انتظار التدوين'}</span>
        </div>

        <div class="mood-selector-row">
          <button type="button" class="mood-btn ${todayLog.mood === 'great' ? 'active' : ''}" data-mood="great" title="ممتاز">😀</button>
          <button type="button" class="mood-btn ${todayLog.mood === 'good' ? 'active' : ''}" data-mood="good" title="جيد">😊</button>
          <button type="button" class="mood-btn ${todayLog.mood === 'neutral' ? 'active' : ''}" data-mood="neutral" title="عادي">😐</button>
          <button type="button" class="mood-btn ${todayLog.mood === 'tough' ? 'active' : ''}" data-mood="tough" title="صعب">😔</button>
        </div>

        <div class="reflection-input-row" style="margin-top:6px;">
          <input type="text" id="reflectionTextInput" class="reflection-text-input" placeholder="ما الذي ساعدك أو أعاقك اليوم؟..." value="${todayLog.note || ''}">
          <button type="button" id="saveReflectionBtn" class="bento-todo-add-btn">حفظ</button>
        </div>
      `;

      const moodBtns = container.querySelectorAll('.mood-btn');
      moodBtns.forEach(btn => {
        btn.onclick = () => {
          moodBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mood = btn.dataset.mood;
          if (!this.reflections[dateKey]) this.reflections[dateKey] = { mood, note: '' };
          this.reflections[dateKey].mood = mood;
          this.saveReflections();
          this.app.triggerHaptic('light');
        };
      });

      const saveBtn = container.querySelector('#saveReflectionBtn');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const inp = container.querySelector('#reflectionTextInput');
          const note = inp ? inp.value.trim() : '';
          const activeMood = container.querySelector('.mood-btn.active');
          const mood = activeMood ? activeMood.dataset.mood : 'great';

          this.reflections[dateKey] = { mood, note };
          this.saveReflections();
          this.app.triggerHaptic('double');
          this.app.showToast('تم حفظ التأمل اليومي بنجاح ✍️');
          this.renderDailyReflection();
        };
      }
    }

    createWidgetCardElement(wId) {
      const widgetMeta = {
        circadian_rhythm: {
          title: 'الساعة البيولوجية والتركيز',
          icon: '🧬',
          size: 'full',
          html: '<div class="circadian-widget" id="circadianContainer"></div>'
        },
        habit_strength: {
          title: 'مؤشر قوة العادات التراكمي',
          icon: '🔋',
          size: 'md',
          html: '<div class="habit-strength-widget" id="habitStrengthContainer"></div>'
        },
        financial_roi: {
          title: 'توفير التعافي المالي والصحي',
          icon: '💰',
          size: 'md',
          html: '<div class="savings-ticker-widget" id="savingsTickerContainer"></div>'
        },
        focus_audio: {
          title: 'أصوات وخلفيات التركيز الهادئة',
          icon: '🎧',
          size: 'md',
          html: '<div class="focus-audio-widget" id="focusAudioContainer"></div>'
        },
        momentum_velocity: {
          title: 'مقارنة النمو والسرعة الأسبوعية',
          icon: '🚀',
          size: 'md',
          html: '<div class="momentum-velocity-widget" id="momentumVelocityContainer"></div>'
        },
        tool_pomodoro: {
          title: 'مؤقت البومودورو والتركيز',
          icon: '🍅',
          size: 'md',
          html: '<div class="bento-yellow-card" id="canvasToolPomoContainer" style="padding:16px; border-radius:24px; min-width:0;"></div>'
        },
        tool_eisenhower: {
          title: 'مصفوفة أيزنهاور لفرز الأولويات',
          icon: '🔲',
          size: 'lg',
          html: '<div class="bento-card-white" id="canvasToolEisenContainer" style="padding:16px; border-radius:24px; min-width:0;"></div>'
        },
        tool_ivy_lee: {
          title: 'طريقة آيفي لي (أهم 6 مهام)',
          icon: '📝',
          size: 'md',
          html: '<div class="bento-card-white" id="canvasToolIvyContainer" style="padding:16px; border-radius:24px; min-width:0;"></div>'
        },
        tool_rocket_5s: {
          title: 'صاروخ الـ 5 ثوانٍ لكسر التسويف',
          icon: '🚀',
          size: 'sm',
          html: '<div class="bento-card-dark" id="canvasToolRocketContainer" style="padding:16px; border-radius:24px; text-align:center; min-width:0; background:var(--card-dark-glass); color:#FFF;"></div>'
        },
        tool_habit_stack: {
          title: 'مخطط تراكم العادات السريعة',
          icon: '🔗',
          size: 'md',
          html: '<div class="bento-card-white" id="canvasToolStackContainer" style="padding:16px; border-radius:24px; min-width:0;"></div>'
        },
        tool_stoic_card: {
          title: 'المساءلة والمراجعة الرواقية',
          icon: '🌙',
          size: 'lg',
          html: '<div class="bento-card-white" id="canvasToolStoicContainer" style="padding:16px; border-radius:24px; min-width:0;"></div>'
        },
        tool_two_min: {
          title: 'قاعدة الدقيقتين للإنجاز الخاطف',
          icon: '⏳',
          size: 'md',
          html: '<div class="bento-mint-card" id="canvasToolTwoMinContainer" style="padding:16px; border-radius:24px; min-width:0;"></div>'
        }
      };

      const meta = widgetMeta[wId] || {
        title: wId,
        icon: '🍱',
        size: 'md',
        html: `<div class="bento-card-white" id="${wId}Container"></div>`
      };

      const card = document.createElement('article');
      card.className = `bento-widget-card size-${meta.size} span-${meta.size === 'full' ? 'full' : (meta.size === 'lg' ? '2' : '1')}`;
      card.dataset.widgetId = wId;
      card.dataset.widgetSize = meta.size;

      card.innerHTML = `
        <div class="widget-header-toolbar">
          <div class="widget-drag-handle" title="اسحب لتحريك الويدجت">⋮⋮</div>
          <div class="widget-badge-title"><span>${meta.icon}</span> ${meta.title}</div>
          <div class="widget-actions-cluster">
            <div class="widget-size-switcher" title="تغيير القياس">
              <button type="button" class="size-pill-btn ${meta.size === 'sm' ? 'active' : ''}" data-set-size="sm" data-widget-id="${wId}">S</button>
              <button type="button" class="size-pill-btn ${meta.size === 'md' ? 'active' : ''}" data-set-size="md" data-widget-id="${wId}">M</button>
              <button type="button" class="size-pill-btn ${meta.size === 'lg' ? 'active' : ''}" data-set-size="lg" data-widget-id="${wId}">L</button>
              <button type="button" class="size-pill-btn ${meta.size === 'full' ? 'active' : ''}" data-set-size="full" data-widget-id="${wId}">Full</button>
            </div>
            <button type="button" class="widget-tool-btn widget-cycle-size-btn" title="تبديل القياس دورياً (📐)" data-cycle-id="${wId}">📐</button>
            <button type="button" class="widget-tool-btn widget-remove-btn" title="إخفاء من اللوحة" data-remove-id="${wId}">✕</button>
          </div>
        </div>
        ${meta.html}
        <div class="widget-corner-resize-handle" data-cycle-id="${wId}" title="انقر لتغيير القياس">⤡</div>
      `;

      return card;
    }

    bindSingleWidgetControls(card) {
      if (!card) return;

      card.querySelectorAll('.size-pill-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const wId = btn.dataset.widgetId;
          const targetSize = btn.dataset.setSize;
          this.applyWidgetSize(wId, targetSize);
        };
      });

      card.querySelectorAll('[data-cycle-id]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const wId = btn.dataset.cycleId;
          this.cycleWidgetSize(wId);
        };
      });

      card.querySelectorAll('.widget-remove-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const wId = btn.dataset.removeId;
          card.style.display = 'none';
          if (!this.layoutConfig.widgets) this.layoutConfig.widgets = {};
          if (!this.layoutConfig.widgets[wId]) this.layoutConfig.widgets[wId] = {};
          this.layoutConfig.widgets[wId].hidden = true;
          this.saveLayoutConfig();
          this.app.triggerHaptic('light');
          this.app.showToast('تم إخفاء الويدجت من اللوحة الرئيسية');
        };
      });
    }

    renderSpecializedWidget(wId) {
      switch (wId) {
        case 'circadian_rhythm': this.renderCircadianRhythm(); break;
        case 'habit_strength': this.renderHabitStrength(); break;
        case 'financial_roi': this.renderFinancialRoi(); break;
        case 'focus_audio': this.renderFocusAudio(); break;
        case 'momentum_velocity': this.renderMomentumVelocity(); break;
        case 'left_matrix': this.renderLeftMatrix(); break;
        case 'two_day_rule': this.renderTwoDayRule(); break;
        case 'habit_stacking': this.renderHabitStacking(); break;
        case 'quick_stats': this.renderQuickStats(); break;
        case 'daily_reflection': this.renderDailyReflection(); break;
        case 'tool_pomodoro': this.renderToolPomodoro(); break;
        case 'tool_eisenhower': this.renderToolEisenhower(); break;
        case 'tool_ivy_lee': this.renderToolIvyLee(); break;
        case 'tool_rocket_5s': this.renderToolRocket(); break;
        case 'tool_habit_stack': this.renderToolHabitStack(); break;
        case 'tool_stoic_card': this.renderToolStoic(); break;
        case 'tool_two_min': this.renderToolTwoMin(); break;
      }
    }

    /**
     * 1. Circadian Rhythm & Peak Focus Energy Timeline
     */
    renderCircadianRhythm() {
      const container = document.getElementById('circadianContainer');
      if (!container) return;

      const now = new Date();
      const currentHour = now.getHours();

      let phaseTitle = 'النشاط الصباحي والتركيز 🌅';
      let phaseRec = 'أفضل توقيت لأداء العادات المعرفية والتركيز الذهني الأكثر تطلباً.';
      if (currentHour >= 9 && currentHour < 13) {
        phaseTitle = 'ذروة التركيز الفائق (Morning Peak) ⚡';
        phaseRec = 'الكورتيزول في أعلى مستوياته: أنجز عادة العمل العميق والمهام الأكثر صعوبة الآن.';
      } else if (currentHour >= 13 && currentHour < 17) {
        phaseTitle = 'فترة استرجاع الطاقة (Afternoon Dip) ☕';
        phaseRec = 'هبوط طبيعي في اليقظة: ركز على القراءة الخفيفة، المشي، والمهام الروتينية.';
      } else if (currentHour >= 17 && currentHour < 20) {
        phaseTitle = 'الذروة البدنية والإبداعية (Physical Peak) 🏃‍♂️';
        phaseRec = 'حرارة الجسم وقوة العضلات في ذروتها: توقيت مثالي للرياضة والعادات الإبداعية.';
      } else if (currentHour >= 20 && currentHour < 23) {
        phaseTitle = 'الاسترخاء وإفراز الميلاتونين 🌙';
        phaseRec = 'ابتعد عن الشاشات الزرقاء، وركز على التأمل، الامتنان، والقراءة قبل النوم.';
      } else {
        phaseTitle = 'الترميم العصبي والنوم العميق 😴';
        phaseRec = 'الجسم في طور إعادة شحن الطاقة وترميم المسارات العصبية وبناء العادات.';
      }

      const curveHeights = [
        15, 10, 8, 8, 10, 20,
        35, 55, 75, 95, 100, 90,
        65, 45, 40, 50, 65, 85,
        80, 70, 50, 35, 25, 18
      ];

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:11px; font-weight:800; color:rgba(255,255,255,0.7); text-transform:uppercase;">الساعة البيولوجية والإنتاجية</span>
            <h3 style="font-size:17px; font-weight:850; margin-top:2px;">منحنى الطاقة والتركيز</h3>
          </div>
          <div class="circadian-phase-badge">${phaseTitle}</div>
        </div>

        <div class="circadian-wave-bar">
          ${curveHeights.map((h, hr) => {
            const isCurr = hr === currentHour;
            return `<div class="circadian-hour-bar ${isCurr ? 'is-current' : ''}" style="height:${h}%;" title="الساعة ${hr}:00"></div>`;
          }).join('')}
        </div>

        <div class="circadian-recommendation">
          💡 ${phaseRec}
        </div>
      `;
    }

    /**
     * 2. Habit Strength Index (Consistency Score over Streaks)
     */
    renderHabitStrength() {
      const container = document.getElementById('habitStrengthContainer');
      if (!container) return;

      const topHabits = this.app.habits.slice(0, 4).map(h => {
        let doneLast30 = 0;
        const now = new Date();
        for (let i = 0; i < 30; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const k = this.app.formatDateKey(d);
          if (this.app.isHabitDoneForDate(h, k)) doneLast30++;
        }
        const score = Math.round((doneLast30 / 30) * 100);
        return { habit: h, score };
      });

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="hero-subtitle">علم تكوين العادات</span>
            <h3 style="font-size:17px; font-weight:850; margin-top:2px;">مؤشر قوة العادات التراكمي</h3>
          </div>
          <span class="pill-stat-btn">نافذة 30 يوماً</span>
        </div>
        <p style="font-size:12px; color:var(--text-secondary); line-height:1.35; margin-top:-4px;">
          يقيس ثباتك على مدى شهر بدلاً من السلسلة الهشة، لتقليل قلق الانقطاع وفق علم النفس السلوكي.
        </p>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:4px;">
          ${topHabits.length > 0 ? topHabits.map(item => `
            <div class="strength-item-row">
              <div class="strength-meta-line">
                <span>${item.habit.emoji} ${item.habit.name}</span>
                <span style="color:#10B981;">${item.score}% قوة</span>
              </div>
              <div class="strength-meter-track">
                <div class="strength-meter-fill" style="width:${Math.max(8, item.score)}%;"></div>
              </div>
            </div>
          `).join('') : '<div style="text-align:center; padding:12px; font-size:12px; color:var(--text-secondary);">أضف عاداتك لقياس مؤشر قوتها التراكمي.</div>'}
        </div>
      `;
    }

    /**
     * 3. Financial & Health Recovery Savings Ticker
     */
    renderFinancialRoi() {
      const container = document.getElementById('savingsTickerContainer');
      if (!container) return;

      let totalDaysSaved = 0;
      let totalItems = this.app.quitHabits.length;
      let totalEstSavings = 0;

      const now = Date.now();
      this.app.quitHabits.forEach(item => {
        const startMs = new Date(item.startDate).getTime();
        const days = Math.max(0, Math.floor((now - startMs) / (1000 * 60 * 60 * 24)));
        totalDaysSaved += days;
        const dailyNum = parseFloat((item.savingsDaily || '').replace(/[^0-9.]/g, '')) || 8;
        totalEstSavings += (days * dailyNum);
      });

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:11px; font-weight:800; color:rgba(255,255,255,0.7); text-transform:uppercase;">عائد النقاء والاستثمار</span>
            <h3 style="font-size:17px; font-weight:850; margin-top:2px;">التوفير المالي والصحي</h3>
          </div>
          <span style="font-size:20px;">💰</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px;">
          <span class="savings-amount-huge">$${totalEstSavings.toLocaleString()}</span>
          <span style="font-size:12px; color:rgba(255,255,255,0.8); font-weight:700;">
            إجمالي الأموال التي وفرتها بالابتعاد عن العادات السلبية
          </span>
        </div>

        <div class="savings-badges-row">
          <div class="savings-pill">⏱️ ${totalDaysSaved} يوماً من النقاء التراكمي</div>
          <div class="savings-pill">🫀 كسبت ~${(totalDaysSaved * 3.5).toFixed(0)} ساعة صحية</div>
          <div class="savings-pill">🛡️ ${totalItems} عادات مقلعة</div>
        </div>
      `;
    }

    /**
     * 4. Ambient Focus Audio Generator (Pure Web Audio API)
     */
    initAudioEngine() {
      if (this.audioEngine) return;
      this.audioEngine = {
        ctx: null,
        node: null,
        gainNode: null,
        preset: 'rain',
        isPlaying: false
      };
    }

    renderFocusAudio() {
      const container = document.getElementById('focusAudioContainer');
      if (!container) return;

      this.initAudioEngine();

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="hero-subtitle">الأجواء الصوتية للإنتاجية</span>
            <h3 style="font-size:17px; font-weight:850; margin-top:2px;">أصوات وخلفيات التركيز</h3>
          </div>
          <span class="pill-stat-btn">بدون إنترنت (Web Audio)</span>
        </div>

        <div class="sound-presets-row">
          <button type="button" class="sound-preset-btn ${this.audioEngine.preset === 'rain' ? 'active' : ''}" data-sound="rain">🌧️ مطر ناعم</button>
          <button type="button" class="sound-preset-btn ${this.audioEngine.preset === 'ocean' ? 'active' : ''}" data-sound="ocean">🌊 أمواج محيط</button>
          <button type="button" class="sound-preset-btn ${this.audioEngine.preset === 'alpha' ? 'active' : ''}" data-sound="alpha">🧘‍♂️ موجات ألفا 10Hz</button>
        </div>

        <button type="button" class="sound-play-toggle-btn" id="focusAudioToggleBtn">
          <span>${this.audioEngine.isPlaying ? '⏹ إيقاف الصوت' : '▶ تشغيل صوت التركيز'}</span>
        </button>
      `;

      container.querySelectorAll('[data-sound]').forEach(btn => {
        btn.onclick = () => {
          const snd = btn.dataset.sound;
          container.querySelectorAll('[data-sound]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.audioEngine.isPlaying) {
            this.playFocusAudio(snd);
          } else {
            this.audioEngine.preset = snd;
          }
          this.app.triggerHaptic('light');
        };
      });

      const playBtn = container.querySelector('#focusAudioToggleBtn');
      if (playBtn) {
        playBtn.onclick = () => {
          this.toggleFocusAudio(this.audioEngine.preset || 'rain');
          this.app.triggerHaptic('double');
        };
      }
    }

    updateFocusAudioUI() {
      const btn = document.querySelector('#focusAudioToggleBtn');
      if (btn && this.audioEngine) {
        btn.innerHTML = `<span>${this.audioEngine.isPlaying ? '⏹ إيقاف الصوت' : '▶ تشغيل صوت التركيز'}</span>`;
      }
    }

    toggleFocusAudio(preset = 'rain') {
      this.initAudioEngine();
      if (this.audioEngine.isPlaying) {
        this.stopFocusAudio();
      } else {
        this.playFocusAudio(preset);
      }
    }

    playFocusAudio(preset = 'rain') {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!this.audioEngine.ctx) this.audioEngine.ctx = new AudioContext();
        if (this.audioEngine.ctx.state === 'suspended') this.audioEngine.ctx.resume();

        this.stopFocusAudio();
        const ctx = this.audioEngine.ctx;
        this.audioEngine.preset = preset;

        if (preset === 'rain' || preset === 'ocean') {
          const bufferSize = ctx.sampleRate * 2;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          }

          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          whiteNoise.loop = true;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = preset === 'rain' ? 800 : 450;

          const gain = ctx.createGain();
          gain.gain.value = 0.25;

          whiteNoise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          whiteNoise.start();

          this.audioEngine.node = whiteNoise;
          this.audioEngine.gainNode = gain;
        } else if (preset === 'alpha') {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.value = 216;
          osc2.type = 'sine';
          osc2.frequency.value = 226;

          gain.gain.value = 0.12;

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();

          this.audioEngine.node = {
            stop: () => { osc1.stop(); osc2.stop(); },
            disconnect: () => { osc1.disconnect(); osc2.disconnect(); }
          };
          this.audioEngine.gainNode = gain;
        }

        this.audioEngine.isPlaying = true;
        this.updateFocusAudioUI();
      } catch (e) {
        console.warn('Audio play error:', e);
      }
    }

    stopFocusAudio() {
      if (this.audioEngine && this.audioEngine.isPlaying && this.audioEngine.node) {
        try {
          this.audioEngine.node.stop();
          this.audioEngine.node.disconnect();
        } catch (e) {}
        this.audioEngine.isPlaying = false;
        this.updateFocusAudioUI();
      }
    }

    /**
     * 5. Week-over-Week Momentum Velocity
     */
    renderMomentumVelocity() {
      const container = document.getElementById('momentumVelocityContainer');
      if (!container) return;

      const now = new Date();
      let thisWeekCount = 0;
      let prevWeekCount = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const k = this.app.formatDateKey(d);
        this.app.habits.forEach(h => {
          if (this.app.isHabitDoneForDate(h, k)) thisWeekCount++;
        });
      }

      for (let i = 7; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const k = this.app.formatDateKey(d);
        this.app.habits.forEach(h => {
          if (this.app.isHabitDoneForDate(h, k)) prevWeekCount++;
        });
      }

      const diff = thisWeekCount - prevWeekCount;
      const rate = prevWeekCount > 0 ? Math.round((diff / prevWeekCount) * 100) : (thisWeekCount > 0 ? 100 : 0);
      const isPositive = diff >= 0;

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="hero-subtitle">مؤشر السرعة والزخم</span>
            <h3 style="font-size:17px; font-weight:850; margin-top:2px;">مقارنة الأداء الأسبوعي</h3>
          </div>
          <div class="velocity-growth-pill" style="${isPositive ? '' : 'background:rgba(239,68,68,0.15); color:#DC2626;'}">
            ${isPositive ? '▲ +' : '▼ '}${rate}% نمو
          </div>
        </div>

        <div class="velocity-stats-compare">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:11px; color:var(--text-secondary); font-weight:700;">هذا الأسبوع</span>
            <span style="font-size:22px; font-weight:900;">${thisWeekCount} إنجاز</span>
          </div>
          <div style="font-size:18px; color:var(--text-tertiary);">➔</div>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:11px; color:var(--text-secondary); font-weight:700;">الأسبوع السابق</span>
            <span style="font-size:22px; font-weight:900; color:var(--text-secondary);">${prevWeekCount} إنجاز</span>
          </div>
        </div>

        <p style="font-size:12px; font-weight:700; color:var(--text-secondary); line-height:1.4; margin-top:2px;">
          ${isPositive ? '🎉 رائع جداً! سرعتك الأسبوعية في تصاعد إيجابي، مما يعزز وتيرة تحول العادات إلى طبيعة ثانية تلقائية.' : 'استمر في المحاولة اليوم! خطوة واحدة كافية لإعادة منحنى الزخم نحو الصعود.'}
        </p>
      `;
    }

    /**
     * ========================================================================
     * Tool Bento Widgets Renderers (الأدوات الإنتاجية كويدجتس حية في لوحة البينتو)
     * ========================================================================
     */

    // 1. Live Pomodoro Focus Widget (Warm Butter Yellow Card)
    renderToolPomodoro() {
      const container = document.getElementById('canvasToolPomoContainer');
      if (!container) return;

      const tools = this.app.toolsEngine || (window.HabitFlow ? window.HabitFlow.tools : null);
      const habits = this.app.habits || [];
      const pomo = tools ? tools.state.pomodoro : { todayCompletedSessions: 0, totalFocusMinutes: 0 };

      const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      const currentTimeText = tools && tools.pomoRemaining !== undefined ? formatTime(tools.pomoRemaining) : '25:00';
      const isRunning = tools ? tools.pomoIsRunning : false;
      const currentMode = tools ? tools.pomoMode : 'work';

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="yellow-mini-icon">🍅</div>
            <div>
              <span class="yellow-subtitle">بومودورو التركيز</span>
              <h4 style="font-size:15px; font-weight:850; color:#121316; margin:0;">جلسة الـ 25 دقيقة</h4>
            </div>
          </div>
          <span class="inline-pill-badge" style="background:#121316; color:#FFF;">+15 XP</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:baseline; margin:10px 0 6px;">
          <span style="font-size:32px; font-weight:900; color:#121316; font-variant-numeric:tabular-nums;" id="canvasPomoTime">${currentTimeText}</span>
          <span style="font-size:11.5px; font-weight:750; color:rgba(18,19,22,0.7);">${currentMode === 'work' ? '🎯 تركيز مكثف' : '☕️ استراحة قصيرة'}</span>
        </div>

        <div style="margin-bottom:8px;">
          <select class="priority-select" id="canvasPomoHabitSelect" style="width:100%; padding:6px 10px; font-size:12px; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.1);">
            <option value="">-- ربط بعادة معينة لتوثيق الإنجاز --</option>
            ${habits.map(h => `<option value="${h.id}" ${tools && tools.state.pomodoro.linkedHabitId === h.id ? 'selected' : ''}>${h.emoji} ${h.name}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:6px;">
          <button type="button" class="bento-todo-add-btn" id="canvasPomoStartBtn" style="flex:1; padding:8px 12px; font-size:12px; background:#121316; color:#FFF;">
            ${isRunning ? 'إيقاف مؤقت ⏸' : 'بدء التركيز ⏱️'}
          </button>
          <button type="button" class="bento-todo-add-btn" id="canvasPomoResetBtn" style="padding:8px 12px; font-size:12px; background:rgba(0,0,0,0.1); color:#121316;">
            ↺
          </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:11px; color:rgba(18,19,22,0.65); font-weight:700;">
          <span>جلسات اليوم: ${pomo.todayCompletedSessions || 0}</span>
          <span>إجمالي التركيز: ${pomo.totalFocusMinutes || 0} دقيقة</span>
        </div>
      `;

      const select = container.querySelector('#canvasPomoHabitSelect');
      if (select && tools) {
        select.onchange = (e) => {
          tools.state.pomodoro.linkedHabitId = e.target.value || null;
          tools.saveState();
        };
      }

      const startBtn = container.querySelector('#canvasPomoStartBtn');
      if (startBtn && tools) {
        startBtn.onclick = () => {
          this.app.triggerHaptic('light');
          if (tools.pomoIsRunning) {
            tools.pausePomodoro();
            this.renderToolPomodoro();
          } else {
            tools.startPomodoro(
              (rem, mode) => {
                const el = document.getElementById('canvasPomoTime');
                if (el) el.textContent = formatTime(rem);
              },
              () => {
                this.renderToolPomodoro();
              }
            );
            this.renderToolPomodoro();
          }
        };
      }

      const resetBtn = container.querySelector('#canvasPomoResetBtn');
      if (resetBtn && tools) {
        resetBtn.onclick = () => {
          this.app.triggerHaptic('light');
          tools.resetPomodoro();
          this.renderToolPomodoro();
        };
      }
    }

    // 2. Live Eisenhower Matrix Widget (4-Quadrants Bento Card)
    renderToolEisenhower() {
      const container = document.getElementById('canvasToolEisenContainer');
      if (!container) return;

      const tools = this.app.toolsEngine || (window.HabitFlow ? window.HabitFlow.tools : null);
      const eisen = tools ? tools.state.eisenhower : { q1: [], q2: [], q3: [], q4: [] };

      const renderQuadrantList = (list) => {
        if (!list || list.length === 0) return '<span style="font-size:10.5px; opacity:0.6;">لا توجد مهام</span>';
        return list.slice(-3).map(item => `
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; padding:3px 0; border-bottom:1px solid rgba(0,0,0,0.04);">
            <span style="${item.done ? 'text-decoration:line-through; opacity:0.5;' : ''}">${item.text}</span>
            <input type="checkbox" ${item.done ? 'checked' : ''} data-eisen-toggle="${item.id}" style="cursor:pointer; width:13px; height:13px;">
          </div>
        `).join('');
      };

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span class="hero-subtitle">تحديد الأولويات التلقائي</span>
            <h4 style="font-size:16px; font-weight:850; margin:0;">مصفوفة أيزنهاور المتزامنة</h4>
          </div>
          <span class="inline-pill-badge" style="background:rgba(37,99,235,0.1); color:#2563EB;">To-Do Sync</span>
        </div>

        <div class="eisen-grid-bento" style="margin-bottom:8px;">
          <div class="eisen-cell q1">
            <span>🔴 عاجل ومهم</span>
            ${renderQuadrantList(eisen.q1)}
          </div>
          <div class="eisen-cell q2">
            <span>🔵 مهم وغير عاجل</span>
            ${renderQuadrantList(eisen.q2)}
          </div>
          <div class="eisen-cell q3">
            <span>🟡 عاجل وغير مهم</span>
            ${renderQuadrantList(eisen.q3)}
          </div>
          <div class="eisen-cell q4">
            <span>⚪ غير عاجل وغير مهم</span>
            ${renderQuadrantList(eisen.q4)}
          </div>
        </div>

        <div style="display:flex; gap:6px;">
          <input type="text" class="bento-todo-input" id="canvasEisenText" placeholder="إضافة مهمة للمصفوفة..." style="padding:6px 10px; font-size:12px;">
          <select class="priority-select" id="canvasEisenQuad" style="padding:6px; font-size:11px;">
            <option value="q1">عاجل ومهم (🔴)</option>
            <option value="q2">مهم وغير عاجل (🔵)</option>
            <option value="q3">عاجل وغير مهم (🟡)</option>
            <option value="q4">غير عاجل (⚪)</option>
          </select>
          <button type="button" class="bento-todo-add-btn" id="canvasEisenAddBtn" style="padding:6px 12px; font-size:12px;">+</button>
        </div>
      `;

      container.querySelectorAll('[data-eisen-toggle]').forEach(box => {
        box.onchange = () => {
          if (tools) {
            tools.toggleEisenhowerTask(box.dataset.eisenToggle);
            this.renderToolEisenhower();
          }
        };
      });

      const addBtn = container.querySelector('#canvasEisenAddBtn');
      const input = container.querySelector('#canvasEisenText');
      const quadSelect = container.querySelector('#canvasEisenQuad');

      if (addBtn && input && tools) {
        addBtn.onclick = () => {
          const val = input.value.trim();
          if (val) {
            tools.addEisenhowerTask(val, quadSelect.value);
            input.value = '';
            this.renderToolEisenhower();
            this.app.triggerHaptic('light');
          }
        };
      }
    }

    // 3. Live Ivy Lee 6 Tasks Widget
    renderToolIvyLee() {
      const container = document.getElementById('canvasToolIvyContainer');
      if (!container) return;

      const tools = this.app.toolsEngine || (window.HabitFlow ? window.HabitFlow.tools : null);
      const ivy = tools ? tools.state.ivyLee : { tasks: [], activeIndex: 0 };
      const tasks = ivy.tasks || [];
      const currentIdx = ivy.activeIndex || 0;
      const currentTask = tasks[currentIdx];

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span class="hero-subtitle">التركيز الأحادي الصارم</span>
            <h4 style="font-size:15px; font-weight:850; margin:0;">طريقة آيفي لي (#1)</h4>
          </div>
          <span class="inline-pill-badge" style="background:rgba(245,158,11,0.12); color:#D97706;">${tasks.length > 0 ? (currentIdx + 1) + '/6' : '0/6'}</span>
        </div>

        <div style="background:var(--card-gray-subtle); padding:10px 12px; border-radius:14px; border:1px solid var(--border-glass); margin-bottom:8px;">
          <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); margin-bottom:2px;">المهمة الحالية ذات الأولوية المطلقة:</div>
          <div style="font-size:13.5px; font-weight:850; color:var(--text-primary);">${currentTask ? currentTask.text : 'لم تحدد مهام آيفي لي بعد، أضفها أدناه'}</div>
        </div>

        ${tasks.length === 0 ? `
          <div style="display:flex; gap:6px;">
            <input type="text" class="bento-todo-input" id="canvasIvyNewInput" placeholder="أدخل مهمتك الأساسية..." style="padding:6px 10px; font-size:12px;">
            <button type="button" class="bento-todo-add-btn" id="canvasIvyAddBtn" style="padding:6px 12px; font-size:12px;">تحديد</button>
          </div>
        ` : `
          <button type="button" class="bento-todo-add-btn" id="canvasIvyDoneBtn" style="width:100%; padding:8px; font-size:12.5px; background:var(--ios-green); color:#FFF;">
            إنجاز المهمة رقم #${currentIdx + 1} والانتقال للتالية (+15 XP) ✓
          </button>
        `}
      `;

      const doneBtn = container.querySelector('#canvasIvyDoneBtn');
      if (doneBtn && tools) {
        doneBtn.onclick = () => {
          this.app.triggerHaptic('double');
          tools.advanceIvyLeeTask();
          this.renderToolIvyLee();
        };
      }

      const addBtn = container.querySelector('#canvasIvyAddBtn');
      const input = container.querySelector('#canvasIvyNewInput');
      if (addBtn && input && tools) {
        addBtn.onclick = () => {
          const val = input.value.trim();
          if (val) {
            tools.setIvyLeeTasks([val]);
            this.renderToolIvyLee();
            this.app.triggerHaptic('light');
          }
        };
      }
    }

    // 4. Live 5-Second Rocket Widget (Small Fast Launcher)
    renderToolRocket() {
      const container = document.getElementById('canvasToolRocketContainer');
      if (!container) return;

      const tools = this.app.toolsEngine || (window.HabitFlow ? window.HabitFlow.tools : null);

      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
          <span style="font-size:11px; font-weight:800; color:var(--card-yellow); text-transform:uppercase;">صاروخ 5 ثوانٍ</span>
          <span style="font-size:16px;">🚀</span>
        </div>
        <div style="font-size:28px; font-weight:950; color:var(--card-yellow); margin:4px 0;" id="canvasRocketDisplay">5</div>
        <button type="button" class="bento-todo-add-btn" id="canvasRocketBtn" style="background:var(--card-yellow); color:#121316; font-size:11.5px; font-weight:850; padding:6px 12px; border-radius:999px; width:100%;">
          انطلاق 5-4-3-2-1 🔥
        </button>
      `;

      const btn = container.querySelector('#canvasRocketBtn');
      const disp = container.querySelector('#canvasRocketDisplay');

      if (btn && disp) {
        btn.onclick = () => {
          this.app.triggerHaptic('double');
          btn.disabled = true;
          let count = 5;
          disp.textContent = count;

          const timer = setInterval(() => {
            count--;
            if (count > 0) {
              disp.textContent = count;
              this.app.triggerHaptic('light');
            } else {
              clearInterval(timer);
              disp.textContent = 'انطلق الآن! 🔥';
              btn.disabled = false;
              this.app.triggerHaptic('double');
              if (tools) tools.awardXP(10, 'كسر التسويف بصاروخ الـ 5 ثوانٍ 🚀');
              this.app.showToast('انطلق لتنفيذ المهمة فوراً دون تردد! (+10 XP)');
            }
          }, 1000);
        };
      }
    }

    // 5. Live Habit Stacking Widget
    renderToolHabitStack() {
      const container = document.getElementById('canvasToolStackContainer');
      if (!container) return;

      const tools = this.app.toolsEngine || (window.HabitFlow ? window.HabitFlow.tools : null);

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span class="hero-subtitle">تراكم العادات (Atomic)</span>
            <h4 style="font-size:15px; font-weight:850; margin:0;">الربط العصبي التلقائي</h4>
          </div>
          <span class="inline-pill-badge" style="background:rgba(16,185,129,0.1); color:#10B981;">+20 XP</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
          <input type="text" class="bento-todo-input" id="canvasStackOld" placeholder="العادة الراسخة (مثال: قهوة الصباح)" style="padding:6px 10px; font-size:12px;">
          <input type="text" class="bento-todo-input" id="canvasStackNew" placeholder="العادة الجديدة (مثال: قراءة صفحة)" style="padding:6px 10px; font-size:12px;">
        </div>

        <button type="button" class="bento-todo-add-btn" id="canvasStackCreateBtn" style="width:100%; padding:8px; font-size:12px; background:var(--ios-blue); color:#FFF;">
          اعتماد كعادة في جدول اليوم ✨
        </button>
      `;

      const createBtn = container.querySelector('#canvasStackCreateBtn');
      const oldInput = container.querySelector('#canvasStackOld');
      const newInput = container.querySelector('#canvasStackNew');

      if (createBtn && oldInput && newInput && tools) {
        createBtn.onclick = () => {
          const cue = oldInput.value.trim();
          const habit = newInput.value.trim();
          if (habit) {
            tools.convertStackToLiveHabit(cue, habit);
            oldInput.value = '';
            newInput.value = '';
            this.renderToolHabitStack();
          } else {
            this.app.showToast('أدخل اسم العادة الجديدة أولاً');
          }
        };
      }
    }

    // 6. Live Stoic Review Widget
    renderToolStoic() {
      const container = document.getElementById('canvasToolStoicContainer');
      if (!container) return;

      const tools = this.app.toolsEngine || (window.HabitFlow ? window.HabitFlow.tools : null);
      const entries = tools ? tools.state.stoicReview.entries : [];
      const latest = entries && entries.length > 0 ? entries[0] : null;

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span class="hero-subtitle">المساءلة والتأمل الليلي</span>
            <h4 style="font-size:16px; font-weight:850; margin:0;">المراجعة الرواقية للمساء</h4>
          </div>
          <span class="inline-pill-badge" style="background:rgba(139,92,246,0.12); color:#8B5CF6;">+10 XP</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
          <input type="text" class="bento-todo-input" id="canvasStoicQ1" placeholder="1. ما أفضل إنجاز أحسنته اليوم؟" value="${latest ? latest.bestAchievement || '' : ''}" style="padding:7px 10px; font-size:12px;">
          <input type="text" class="bento-todo-input" id="canvasStoicQ2" placeholder="2. أين كان موضع التقصير أو التشتت؟" value="${latest ? latest.frictions || '' : ''}" style="padding:7px 10px; font-size:12px;">
          <input type="text" class="bento-todo-input" id="canvasStoicQ3" placeholder="3. كيف سأكون أفضل غداً؟" value="${latest ? latest.tomorrowPlan || '' : ''}" style="padding:7px 10px; font-size:12px;">
        </div>

        <button type="button" class="bento-todo-add-btn" id="canvasStoicSaveBtn" style="width:100%; padding:8px; font-size:12.5px; background:var(--card-dark); color:#FFF;">
          حفظ التأمل المسائي وتغذية التقييم الشهري 🌙
        </button>
      `;

      const saveBtn = container.querySelector('#canvasStoicSaveBtn');
      const q1 = container.querySelector('#canvasStoicQ1');
      const q2 = container.querySelector('#canvasStoicQ2');
      const q3 = container.querySelector('#canvasStoicQ3');

      if (saveBtn && q1 && q2 && q3 && tools) {
        saveBtn.onclick = () => {
          this.app.triggerHaptic('double');
          tools.saveStoicReview(q1.value, q2.value, q3.value);
          this.renderToolStoic();
        };
      }
    }

    // 7. Live 2-Minute Rule Widget
    renderToolTwoMin() {
      const container = document.getElementById('canvasToolTwoMinContainer');
      if (!container) return;

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:18px;">⏳</span>
            <span style="font-size:14px; font-weight:850; color:#064E3B;">قاعدة الدقيقتين</span>
          </div>
          <span style="font-size:18px; font-weight:900; color:#064E3B; font-variant-numeric:tabular-nums;" id="canvasTwoMinTime">02:00</span>
        </div>
        <p style="font-size:11.5px; color:#064E3B; margin-bottom:8px; line-height:1.35;">
          قاعدة التحجيم السلوكي: قلص أي عادة شاقة إلى دقيقتين فقط لكسر حاجز المقاومة الأولية.
        </p>
        <button type="button" class="bento-todo-add-btn" id="canvasTwoMinBtn" style="width:100%; padding:7px; font-size:12px; background:#064E3B; color:#FFF;">
          انطلاق دقيقتين خاطفتين 🚀
        </button>
      `;

      const btn = container.querySelector('#canvasTwoMinBtn');
      const disp = container.querySelector('#canvasTwoMinTime');

      if (btn && disp) {
        btn.onclick = () => {
          this.app.triggerHaptic('double');
          btn.disabled = true;
          let secs = 120;

          const timer = setInterval(() => {
            if (secs > 0) {
              secs--;
              const m = Math.floor(secs / 60);
              const s = secs % 60;
              disp.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            } else {
              clearInterval(timer);
              disp.textContent = 'اكتملت 🚀';
              btn.disabled = false;
              this.app.triggerHaptic('success');
              this.app.showToast('تهانينا! لقد كسرت حاجز البداية الأصعب بنجاح (+10 XP)');
            }
          }, 1000);
        };
      }
    }
  }

  window.HabitFlowCanvasEngine = CanvasEngine;
})(window);

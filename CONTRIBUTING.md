# دليل المساهمة في المشروع | Contributing to Bento Habits & Flow Pro

شكراً لاهتمامك بالمساهمة في **Bento Habits & Flow Pro (عاداتي برو)**! هذا المشروع مفتوح المصدر بالكامل (Open-Source Local-First PWA) ومصمم لتمكين مجتمع المطورين والمصممين من بناء وتوسيع تجربة تتبع العادات والإنتاجية السلوكية وفق أحدث المعايير البرمجية.

---

## 🧭 الفلسفة المعمارية للمشروع (Core Architecture)

تم بناء التطبيق بدون أطر عمل خارجية ثقيلة (Vanilla Web Standards: Modern HTML5, CSS3 Custom Properties, Modular ES6+) مع الالتزام بالمبادئ التالية:
1. **الخصوصية المطلقة وتفضيل التخزين المحلي (100% Local-First & Privacy):** جميع البيانات تُعالج وتُحفظ محلياً في المتصفح عبر `localStorage` مع دعم التصدير والاستيراد وService Worker للعمل التام دون إنترنت.
2. **فك الارتباط الكامل بناقل الأحداث (Decoupled EventBus):** التواصل بين كافة المكونات والويدجتس يتم عبر `window.HabitFlowEventBus` بنمط (Publish/Subscribe).
3. **نظام الإضافات القابل للتوسع (Extensible Plugin Architecture):** إتاحة خطافات دورة الحياة (Lifecycle Hooks) للمطورين لإضافة وظائف جديدة دون المساس بالنواة الأساسية.
4. **محرك لوحة البينتو الحرة والتحجيم الرباعي (Universal Bento Canvas Engine):** كل عنصر في التطبيق هو ويدجت مستقل يمكن سحبه وإفلاته وتحجيمه بين 4 قياسات (`S` / `M` / `L` / `Full`).

---

## 🚀 البدء السريع والتطوير المحلي (Quick Start)

### 1. نسخ المستودع (Clone)
```bash
git clone https://github.com/your-username/HabitsApp.git
cd HabitsApp
```

### 2. التشغيل على أجهزة macOS بنقرة واحدة
انقر نقراً مزدوجاً على الملف التنفيذي:
```bash
تشغيل_التطبيق.command
```
سيقوم تلقائياً بتشغيل خادم محلي خفيف وفتح التطبيق في متصفحك الافتراضي.

### 3. التشغيل عبر سطر الأوامر (أي نظام تشغيل)
```bash
# باستخدام Python 3
python3 -m http.server 8080

# أو باستخدام Node.js
npx serve .
```
ثم افتح: `http://localhost:8080`

---

## 🧩 دليل تطوير الإضافات والويدجتس (Plugins & Widgets Guide)

### 1. تسجيل إضافة جديدة (Plugin Registration)
أضف كود الإضافة وسجله عبر واجهة `HabitFlow`:
```javascript
window.HabitFlow.registerPlugin({
  id: 'streak-guardian-pack',
  name: 'حزمة حارس السلاسل المتقدمة',
  version: '1.0.0',
  author: 'Your Name (@github)',
  description: 'إضافة تنبيهات ذكية وتكتيكات لحماية السلاسل المتتالية',

  init(app) {
    console.log('Plugin initialized with app state:', app);
  },

  hooks: {
    onHabitToggle(context, app) {
      const { habit, date, isDone } = context;
      if (isDone) {
        console.log(`تم إنجاز العادة: ${habit.name}`);
      }
      return context;
    },

    onStatsCompute(stats, app) {
      stats.customScore = 95;
      return stats;
    }
  }
});
```

#### قائمة الخطافات المدعومة (Lifecycle Hooks)
- `onInit`: عند بدء تشغيل التطبيق.
- `onHabitToggle`: عند إنجاز أو إلغاء إنجاز عادة.
- `onHabitCreate`: عند إنشاء عادة جديدة.
- `onHabitUpdate`: عند تعديل خصائص عادة.
- `onHabitDelete`: عند حذف عادة.
- `onTaskToggle`: عند إنجاز مهمة في قائمة To-Do.
- `onDayChange`: عند تغيير اليوم المحدد في شريط الأيام.
- `onStatsCompute`: عند حساب مؤشرات الزخم والتقييم.

---

### 2. تسجيل ويدجت Bento جديد في المعرض
يمكن تسجيل أي بطاقة تفاعلية جديدة كويدجت عبر `HabitFlowWidgetRegistry`:
```javascript
window.HabitFlow.registerWidget({
  id: 'pomodoro_timer_card',
  title: 'مؤقت بومودورو الذكي',
  icon: '⏱️',
  category: 'time', // 'core' | 'habits' | 'tasks' | 'time' | 'analytics'
  desc: 'جلسات تركيز 25 دقيقة مع فترات راحة 5 دقائق ونغمات زجاجية ناعمة.',
  colSpan: '1',     // '1' (Small/Medium) أو '2' (Large) أو 'full' (Panorama)
  defaultVisible: true,

  render(container, appState) {
    container.innerHTML = `
      <div class="bento-card-white">
        <h3>جلسة تركيز 25 دقيقة ⏱️</h3>
        <button id="startPomodoroTrigger" class="bento-submit-btn">ابدأ الجلسة</button>
      </div>
    `;
  },

  onMount(container) {
    const btn = container.querySelector('#startPomodoroTrigger');
    if (btn) btn.onclick = () => alert('بدأت الجلسة!');
  },

  onUnmount() {
    // تنظيف الموارد والمؤقتات
  }
});
```

---

## 📐 معايير كتابة الكود والتصميم (Design & Code Standards)

1. **معايير Bento Editorial UI:**
   - زوايا دائرية عريضة (`border-radius: 20px` إلى `28px`).
   - بطاقات باستيلية مميزة:
     - الأصفر الدافئ (`#FDE28A`) للإنجازات الكبرى.
     - النعناعي السماوي (`#C8F2EE`) للحماية والزخم.
     - الكربوني الداكن (`#121316`) للشريط السفلي والإقلاع والتقارير.
     - الأبيض النقي (`#FFFFFF`) للبطاقات وقوائم المهام.
2. **التوافق التام مع الشاشات (Universal Responsiveness):**
   - **الهواتف (< 640px):** عمود واحد مرن (`1fr`) مع منع انقطاع النصوص أو تدفق العناصر خارج الشاشة في نمط RTL.
   - **الأجهزة اللوحية (640px - 1023px):** شبكة عمودين متوازنة (`2 columns`).
   - **سطح المكتب (≥ 1024px):** شبكة 3 أعمدة (`3 columns`).
3. **أداء اللمس والـ PWA:**
   - تطبيق `touch-action: manipulation` على كافة الأزرار لإلغاء تأخير الـ 300ms.
   - احترام هوامش أمان الهواتف عبر `env(safe-area-inset-bottom)` و `env(safe-area-inset-top)`.

---

## 📮 خطوات إرسال المساهمات (Pull Request Workflow)

1. أنشئ فرعاً جديداً لتغييراتك:
   ```bash
   git checkout -b feature/my-new-widget
   ```
2. تأكد من خلو الكود من الأخطاء النحوية واختباره على الهاتف والكمبيوتر.
3. التزم برسائل Commit واضحة ودقيقة:
   ```bash
   git commit -m "feat(analytics): add correlation catalyst visualizer"
   ```
4. ارفع الفرع وافتح Pull Request مع توضيح شامل للميزة المضافة.

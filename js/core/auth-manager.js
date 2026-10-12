// ==========================================================================
// Habits & Flow Pro - HabitAuthManager
// نظام إدارة الحسابات المتعددة، تسجيل الدخول، وعزل البيانات المشفر محلياً
// Pure Apple Liquid Glass Offline-First Architecture
// ==========================================================================

class HabitAuthManager {
  constructor(app = null) {
    this.app = app;
    this.USERS_KEY = 'habits_users_registry_v2';
    this.SESSION_KEY = 'habits_active_user_id_v2';
    this.users = this.loadUsers();
    this.currentUser = this.loadSession();
    this.selectedAvatar = '👤';
    this.authMode = 'login'; // 'login' or 'register'

    this.initDOM();
    this.bindEvents();

    // التحقق عند الإقلاع: إذا لم يكن هناك جلسة نشطة
    if (!this.currentUser) {
      if (this.users.length === 0) {
        this.setAuthMode('register');
      } else {
        this.setAuthMode('login');
      }
      this.openAuthModal(false); // لا يمكن إغلاقها بدون تسجيل
    } else {
      this.updateHeaderProfile();
    }
  }

  // ==========================================================================
  // 1. Persistence & Session
  // ==========================================================================
  loadUsers() {
    try {
      const data = localStorage.getItem(this.USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveUsers() {
    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(this.users));
    } catch (e) {}
  }

  loadSession() {
    try {
      const activeId = localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY);
      if (activeId) {
        const found = this.users.find(u => u.id === activeId);
        if (found) return found;
      }
    } catch (e) {}
    return null;
  }

  saveSession(user, remember = true) {
    this.currentUser = user;
    try {
      if (user) {
        if (remember) {
          localStorage.setItem(this.SESSION_KEY, user.id);
          sessionStorage.removeItem(this.SESSION_KEY);
        } else {
          sessionStorage.setItem(this.SESSION_KEY, user.id);
          localStorage.removeItem(this.SESSION_KEY);
        }
      } else {
        localStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.SESSION_KEY);
      }
    } catch (e) {}
    this.updateHeaderProfile();
  }

  // ==========================================================================
  // 2. Cryptographic Security (SHA-256 Web Crypto API)
  // ==========================================================================
  async hashPin(pin) {
    if (!pin) return '';
    const salt = 'habits_salt_2026_';
    try {
      if (window.crypto && crypto.subtle) {
        const msgUint8 = new TextEncoder().encode(salt + pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    // Fallback hash function
    let hash = 0;
    const str = salt + pin;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }

  // ==========================================================================
  // 3. User Operations (Register, Login, Switch, Logout)
  // ==========================================================================
  async register(username, avatar = '👤', pin = '', remember = true) {
    const trimmed = (username || '').trim();
    if (!trimmed) throw new Error('يرجى كتابة اسم للحساب أو المستخدم.');

    const exists = this.users.find(u => u.username.toLowerCase() === trimmed.toLowerCase());
    if (exists) throw new Error('هذا الاسم مسجل مسبقاً على هذا الجهاز.');

    const pinHash = pin ? await this.hashPin(pin) : '';
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      username: trimmed,
      avatar: avatar || '👤',
      pinHash: pinHash,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.saveUsers();
    this.saveSession(newUser, remember);

    if (this.app && typeof this.app.onUserSwitched === 'function') {
      this.app.onUserSwitched(newUser);
    } else {
      location.reload();
    }
    return newUser;
  }

  async login(username, pin = '', remember = true) {
    const trimmed = (username || '').trim();
    if (!trimmed) throw new Error('يرجى إدخال اسم المستخدم.');

    const user = this.users.find(u => u.username.toLowerCase() === trimmed.toLowerCase());
    if (!user) throw new Error('الحساب غير موجود، اضغط على "حساب جديد" بالأعلى لإنشائه.');

    if (user.pinHash) {
      if (!pin) throw new Error('رمز PIN مطلوب لتسجيل الدخول لهذا الحساب.');
      const enteredHash = await this.hashPin(pin);
      if (enteredHash !== user.pinHash) {
        throw new Error('رمز المرور (PIN) غير صحيح.');
      }
    }

    this.saveSession(user, remember);

    if (this.app && typeof this.app.onUserSwitched === 'function') {
      this.app.onUserSwitched(user);
    } else {
      location.reload();
    }
    return user;
  }

  logout() {
    this.saveSession(null, false);
    this.setAuthMode('login');
    this.openAuthModal(false);
  }

  deleteUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;
    if (!confirm(`هل أنت متأكد من حذف الحساب "${user.username}" وجميع بياناته المعزولة نهائياً؟`)) return;

    // مسح مفاتيح تخزين المستخدم
    const keysToRemove = [
      `habits_data_usr_${userId}`,
      `quit_habits_usr_${userId}`,
      `todos_data_usr_${userId}`,
      `prefs_data_usr_${userId}`,
      `categories_data_usr_${userId}`
    ];
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    this.users = this.users.filter(u => u.id !== userId);
    this.saveUsers();

    if (this.currentUser && this.currentUser.id === userId) {
      this.logout();
    } else {
      this.renderQuickProfiles();
    }
  }

  getUserStorageKey(prefix) {
    const uid = this.currentUser ? this.currentUser.id : 'default_guest';
    return `${prefix}_usr_${uid}`;
  }

  // ==========================================================================
  // 4. DOM Initialization & Bindings
  // ==========================================================================
  initDOM() {
    this.authModal = document.getElementById('authModal');
    this.closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
    this.authModalTitle = document.getElementById('authModalTitle');
    this.authModalSubtitle = document.getElementById('authModalSubtitle');
    this.authTabLogin = document.getElementById('authTabLogin');
    this.authTabRegister = document.getElementById('authTabRegister');
    this.authProfilesQuickContainer = document.getElementById('authProfilesQuickContainer');
    this.authProfilesQuickList = document.getElementById('authProfilesQuickList');
    this.authForm = document.getElementById('authForm');
    this.authUsernameGroup = document.getElementById('authUsernameGroup');
    this.authUsernameInput = document.getElementById('authUsernameInput');
    this.authAvatarGroup = document.getElementById('authAvatarGroup');
    this.authAvatarGrid = document.getElementById('authAvatarGrid');
    this.authPinInput = document.getElementById('authPinInput');
    this.authRememberMe = document.getElementById('authRememberMe');
    this.authAlertMessage = document.getElementById('authAlertMessage');
    this.authSubmitBtn = document.getElementById('authSubmitBtn');
    this.authGuestBtn = document.getElementById('authGuestBtn');

    // أزرار الملف الشخصي والإعدادات
    this.openAuthModalFromSettingsBtn = document.getElementById('openAuthModalFromSettingsBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
  }

  bindEvents() {
    if (this.authTabLogin) {
      this.authTabLogin.addEventListener('click', () => this.setAuthMode('login'));
    }
    if (this.authTabRegister) {
      this.authTabRegister.addEventListener('click', () => this.setAuthMode('register'));
    }

    if (this.closeAuthModalBtn) {
      this.closeAuthModalBtn.addEventListener('click', () => {
        if (this.currentUser) this.closeAuthModal();
      });
    }

    // Avatar Selection Chips
    if (this.authAvatarGrid) {
      this.authAvatarGrid.querySelectorAll('.auth-avatar-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          this.authAvatarGrid.querySelectorAll('.auth-avatar-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.selectedAvatar = chip.dataset.avatar || '👤';
        });
      });
    }

    // Form Submission
    if (this.authForm) {
      this.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.hideAlert();
        const username = this.authUsernameInput ? this.authUsernameInput.value.trim() : '';
        const pin = this.authPinInput ? this.authPinInput.value.trim() : '';
        const remember = this.authRememberMe ? this.authRememberMe.checked : true;

        try {
          if (this.authMode === 'register') {
            await this.register(username, this.selectedAvatar, pin, remember);
          } else {
            await this.login(username, pin, remember);
          }
          this.closeAuthModal();
        } catch (err) {
          this.showAlert(err.message || 'حدث خطأ أثناء المصادقة.');
        }
      });
    }

    // Guest / Skip Button
    if (this.authGuestBtn) {
      this.authGuestBtn.addEventListener('click', async () => {
        try {
          let guestUser = this.users.find(u => u.username === 'حساب محلي');
          if (!guestUser) {
            guestUser = await this.register('حساب محلي', '👤', '', true);
          } else {
            await this.login('حساب محلي', '', true);
          }
          this.closeAuthModal();
        } catch (err) {
          this.showAlert(err.message);
        }
      });
    }

    // Settings Modal Triggers
    if (this.openAuthModalFromSettingsBtn) {
      this.openAuthModalFromSettingsBtn.addEventListener('click', () => {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.remove('open');
        this.setAuthMode('login');
        this.openAuthModal(true);
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.remove('open');
        this.logout();
      });
    }
  }

  // ==========================================================================
  // 5. UI Helpers
  // ==========================================================================
  setAuthMode(mode) {
    this.authMode = mode;
    this.hideAlert();

    if (mode === 'login') {
      if (this.authTabLogin) this.authTabLogin.classList.add('active');
      if (this.authTabRegister) this.authTabRegister.classList.remove('active');
      if (this.authModalTitle) this.authModalTitle.textContent = 'تسجيل الدخول';
      if (this.authModalSubtitle) this.authModalSubtitle.textContent = 'اختر حسابك المسجل أو أدخل بياناتك';
      if (this.authSubmitBtn) this.authSubmitBtn.textContent = 'دخول إلى التطبيق';
      if (this.authAvatarGroup) this.authAvatarGroup.style.display = 'none';

      this.renderQuickProfiles();
    } else {
      if (this.authTabLogin) this.authTabLogin.classList.remove('active');
      if (this.authTabRegister) this.authTabRegister.classList.add('active');
      if (this.authModalTitle) this.authModalTitle.textContent = 'إنشاء حساب جديد';
      if (this.authModalSubtitle) this.authModalSubtitle.textContent = 'ابدأ رحلتك السلوكية بملف شخصي مستقل';
      if (this.authSubmitBtn) this.authSubmitBtn.textContent = 'إنشاء الحساب وبدء العادات';
      if (this.authAvatarGroup) this.authAvatarGroup.style.display = 'block';
      if (this.authProfilesQuickContainer) this.authProfilesQuickContainer.style.display = 'none';
    }
  }

  renderQuickProfiles() {
    if (!this.authProfilesQuickContainer || !this.authProfilesQuickList) return;
    this.authProfilesQuickList.innerHTML = '';

    if (this.users.length === 0) {
      this.authProfilesQuickContainer.style.display = 'none';
      return;
    }

    this.authProfilesQuickContainer.style.display = 'block';

    this.users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'auth-quick-profile-card';
      const isCurrent = this.currentUser && this.currentUser.id === u.id;

      card.innerHTML = `
        <div class="auth-profile-avatar">${u.avatar || '👤'}</div>
        <div class="auth-profile-meta">
          <span class="auth-profile-name">${u.username}</span>
          <span class="auth-profile-sub">${u.pinHash ? '🔒 محمي برمز PIN' : 'مفتوح بدون رمز'}${isCurrent ? ' • (الحالي)' : ''}</span>
        </div>
        <div class="auth-profile-actions">
          <button type="button" class="auth-profile-del-btn" title="حذف هذا الحساب">✕</button>
        </div>
      `;

      // Select profile
      card.onclick = (e) => {
        if (e.target.classList.contains('auth-profile-del-btn')) return;
        if (this.authUsernameInput) this.authUsernameInput.value = u.username;
        if (this.authPinInput) {
          this.authPinInput.value = '';
          if (u.pinHash) this.authPinInput.focus();
        }
      };

      // Delete profile
      const delBtn = card.querySelector('.auth-profile-del-btn');
      if (delBtn) {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          this.deleteUser(u.id);
        };
      }

      this.authProfilesQuickList.appendChild(card);
    });
  }

  openAuthModal(canClose = true) {
    if (!this.authModal) return;
    if (this.closeAuthModalBtn) {
      this.closeAuthModalBtn.style.display = (canClose && this.currentUser) ? 'flex' : 'none';
    }
    this.authModal.classList.add('open');
    if (this.authMode === 'login') this.renderQuickProfiles();
  }

  closeAuthModal() {
    if (!this.authModal) return;
    this.authModal.classList.remove('open');
  }

  showAlert(msg) {
    if (!this.authAlertMessage) return;
    this.authAlertMessage.textContent = msg;
    this.authAlertMessage.style.display = 'block';
  }

  hideAlert() {
    if (!this.authAlertMessage) return;
    this.authAlertMessage.textContent = '';
    this.authAlertMessage.style.display = 'none';
  }

  updateHeaderProfile() {
    if (!this.currentUser) return;
    const headerName = document.querySelector('.user-name-title');
    if (headerName) headerName.textContent = this.currentUser.username;

    const headerAvatar = document.querySelector('.user-avatar-circle');
    if (headerAvatar) headerAvatar.textContent = this.currentUser.avatar || '👤';

    const heroTitle = document.querySelector('.hero-editorial-title');
    if (heroTitle) {
      heroTitle.innerHTML = `أهلاً 👋 ${this.currentUser.username}! <span class="inline-avatar">${this.currentUser.avatar || '👤'}</span> تقييمك العام <span style="font-weight:900;">يتجاوز المتوسط</span>.`;
    }
  }
}

// تصدير الكائن على النطاق العام
window.HabitAuthManager = HabitAuthManager;

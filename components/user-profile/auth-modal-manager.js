/**
 * Auth Modal Manager
 * 
 * Менеджер для управления модальными окнами авторизации, регистрации и восстановления пароля.
 * Создаёт модальные окна динамически и управляет их видимостью.
 */

class AuthModalManager {
  constructor() {
    this._authModal = null;
    this._registerModal = null;
    this._passwordResetModal = null;
    this._initPromise = null;
  }

  /**
   * Инициализация менеджера - создание модальных окон
   */
  async init() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = this._initModals();
    return this._initPromise;
  }

  async _initModals() {
    // Проверяем, не инициализированы ли уже модальные окна
    if (this._authModal && this._authModal.isConnected) {
      return;
    }

    // Загружаем компоненты модальных окон (ленивая загрузка)
    await Promise.all([
      import('./modals/auth-modal/auth-modal.js'),
      import('./modals/register-modal/register-modal.js'),
      import('./modals/password-reset-modal/password-reset-modal.js')
    ]);

    // Проверяем, не были ли модальные окна созданы другим экземпляром менеджера
    const modalArea = document.querySelector('.UIModalArea') || document.body;
    
    // Проверяем существующие модальные окна в DOM
    let existingAuthModal = modalArea.querySelector('auth-modal');
    let existingRegisterModal = modalArea.querySelector('register-modal');
    let existingPasswordResetModal = modalArea.querySelector('password-reset-modal');

    // Auth Modal
    if (!existingAuthModal) {
      this._authModal = document.createElement('auth-modal');
      this._authModal.setAttribute('visible', 'false');
      
      // Регистрация событий auth-modal
      this._authModal.addEventListener('auth-modal:register-click', () => {
        this.hideAuth();
        this.showRegister();
      });
      
      this._authModal.addEventListener('auth-modal:forgot-password-click', () => {
        this.hideAuth();
        this.showPasswordReset();
      });

      modalArea.appendChild(this._authModal);
    } else {
      this._authModal = existingAuthModal;
      // Навешиваем обработчики на существующий элемент
      this._authModal.addEventListener('auth-modal:register-click', () => {
        this.hideAuth();
        this.showRegister();
      });
      this._authModal.addEventListener('auth-modal:forgot-password-click', () => {
        this.hideAuth();
        this.showPasswordReset();
      });
    }

    // Register Modal
    if (!existingRegisterModal) {
      this._registerModal = document.createElement('register-modal');
      this._registerModal.setAttribute('visible', 'false');
      
      // Регистрация событий register-modal
      this._registerModal.addEventListener('register-modal:login-click', () => {
        this.hideRegister();
        this.showAuth();
      });

      modalArea.appendChild(this._registerModal);
    } else {
      this._registerModal = existingRegisterModal;
      this._registerModal.addEventListener('register-modal:login-click', () => {
        this.hideRegister();
        this.showAuth();
      });
    }

    // Password Reset Modal
    if (!existingPasswordResetModal) {
      this._passwordResetModal = document.createElement('password-reset-modal');
      this._passwordResetModal.setAttribute('visible', 'false');
      modalArea.appendChild(this._passwordResetModal);
    } else {
      this._passwordResetModal = existingPasswordResetModal;
    }
  }

  /**
   * Показать модальное окно авторизации
   */
  async showAuth() {
    await this.init();
    this.hideAll();
    if (this._authModal) {
      this._authModal.show();
    }
  }

  /**
   * Скрыть модальное окно авторизации
   */
  hideAuth() {
    if (this._authModal) {
      this._authModal.hide();
    }
  }

  /**
   * Показать модальное окно регистрации
   */
  async showRegister() {
    await this.init();
    this.hideAll();
    if (this._registerModal) {
      this._registerModal.show();
    }
  }

  /**
   * Скрыть модальное окно регистрации
   */
  hideRegister() {
    if (this._registerModal) {
      this._registerModal.hide();
    }
  }

  /**
   * Показать модальное окно восстановления пароля
   */
  async showPasswordReset() {
    await this.init();
    this.hideAll();
    if (this._passwordResetModal) {
      this._passwordResetModal.show();
    }
  }

  /**
   * Скрыть модальное окно восстановления пароля
   */
  hidePasswordReset() {
    if (this._passwordResetModal) {
      this._passwordResetModal.hide();
    }
  }

  /**
   * Скрыть все модальные окна
   */
  hideAll() {
    this.hideAuth();
    this.hideRegister();
    this.hidePasswordReset();
  }
}

// Создаём единственный экземпляр менеджера
export const authModalManager = new AuthModalManager();

// Делаем доступным глобально
if (window.app) {
  window.app.authModalManager = authModalManager;
}

export default AuthModalManager;


import { BaseElement } from '../../../base-element.js';
import { step_auth_template } from './step-auth-template.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./step-auth-styles.css', import.meta.url));
}

/**
 * Step Auth Component
 * Шаг проверки авторизации с ветвлением
 * 
 * Если пользователь не авторизован:
 * - Предлагает выбор: войти или зарегистрироваться
 * - При выборе "Войти" - открывает модальное окно авторизации
 * - При выборе "Зарегистрироваться" - переходит к шагу личных данных
 * 
 * Если пользователь авторизован:
 * - Пропускает этот шаг автоматически
 */
export class StepAuth extends BaseElement {
  static stateSchema = {
    isAuthorized: { type: 'boolean', default: false, attribute: null, internal: true },
    choice: { type: 'string', default: '', attribute: null, internal: true }, // 'login' | 'register'
  };

  constructor() {
    super();
    this._handleLoginClick = () => this.handleLogin();
    this._handleRegisterClick = () => this.handleRegister();
  }

  connectedCallback() {
    super.connectedCallback();
    this.checkAuth();
    this.render();
    this.attachEventListeners();
  }

  /**
   * Проверить авторизацию
   */
  async checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({
        isAuthorized: true,
        choice: 'authorized',
      });
      // Уведомляем Wizard, что можно перейти к следующему шагу
      this.dispatchEvent(new CustomEvent('wizard:step:next'));
    } else {
      // PHP вернул null - пользователь не авторизован, не делаем запросов
      this.setState({ isAuthorized: false });
    }
  }

  /**
   * Обработка выбора "Войти"
   */
  async handleLogin() {
    this.setState({ choice: 'login' });

    // Открываем модальное окно авторизации
    try {
      // Загружаем auth-modal-manager если еще не загружен
      if (!window.app?.authModalManager) {
        const { default: AuthModalManager } = await import('../../../user-profile/auth-modal-manager.js');
        window.app.authModalManager = new AuthModalManager();
        await window.app.authModalManager.init();
      }

      // Показываем модальное окно авторизации
      window.app.authModalManager.showAuth();

      // Слушаем событие успешной авторизации
      const handleAuthSuccess = () => {
        window.removeEventListener('elkaretro:auth:login', handleAuthSuccess);
        this.checkAuth(); // Проверяем авторизацию снова
      };

      window.addEventListener('elkaretro:auth:login', handleAuthSuccess);
    } catch (error) {
      console.error('[StepAuth] Failed to open auth modal:', error);
      this.showNotification('Не удалось открыть окно авторизации', 'error');
    }
  }

  /**
   * Обработка выбора "Зарегистрироваться"
   */
  handleRegister() {
    this.setState({ choice: 'register' });
    // Переходим к шагу личных данных (шаг 2)
    this.dispatchEvent(new CustomEvent('wizard:step:goto', {
      detail: { step: 2 },
    }));
  }

  /**
   * Валидация шага
   */
  async validate() {
    if (this.state.isAuthorized) {
      return true;
    }

    if (!this.state.choice) {
      this.showNotification('Пожалуйста, выберите способ оформления заказа', 'error');
      return false;
    }

    return true;
  }

  /**
   * Получить данные шага
   */
  async getData() {
    return {
      isAuthorized: this.state.isAuthorized,
      choice: this.state.choice,
    };
  }

  /**
   * Показать уведомление
   */
  showNotification(message, type = 'info') {
    if (window.app && window.app.ui && window.app.ui.showNotification) {
      window.app.ui.showNotification(message, type);
    } else {
      console.log(`[StepAuth] ${type}: ${message}`);
    }
  }

  render() {
    const { isAuthorized, choice } = this.state;

    this.innerHTML = step_auth_template({
      isAuthorized,
      choice,
    });
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    // Обработка кликов через кастомные события от ui-button
    this.removeEventListener('step-auth:login-click', this._handleLoginClick);
    this.addEventListener('step-auth:login-click', this._handleLoginClick);

    this.removeEventListener('step-auth:register-click', this._handleRegisterClick);
    this.addEventListener('step-auth:register-click', this._handleRegisterClick);
  }
}

customElements.define('step-auth', StepAuth);


import { BaseElement } from '../../../base-element.js';
import { step_auth_template } from './step-auth-template.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./step-auth-styles.css', import.meta.url));
}

/**
 * Step Auth Component
 * Шаг проверки авторизации
 * 
 * Если пользователь не авторизован:
 * - Показывает кнопку "Авторизация" (открывает модальное окно)
 * - Показывает кнопку "Продолжить без авторизации" (переход к шагу 2 для регистрации)
 * 
 * Если пользователь авторизован:
 * - Пропускает этот шаг автоматически
 */
export class StepAuth extends BaseElement {
  static stateSchema = {
    isAuthorized: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._handleLoginClick = (e) => {
      console.log('[StepAuth] Login click handler called', e);
      this.handleLogin();
    };
    this._handleContinueWithoutAuthClick = (e) => {
      console.log('[StepAuth] Continue without auth click handler called', e);
      // Предотвращаем множественную обработку
      if (this._isProcessingContinue) {
        console.log('[StepAuth] Already processing continue, ignoring duplicate event');
        return;
      }
      this._isProcessingContinue = true;
      this.handleContinueWithoutAuth(e);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        this._isProcessingContinue = false;
      }, 100);
    };
    this._isProcessingContinue = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.checkAuth();
    this.render();
    // Ждем, пока DOM обновится, прежде чем прикреплять обработчики
    requestAnimationFrame(() => {
      this.attachEventListeners();
    });
  }

  /**
   * Проверить авторизацию
   */
  async checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({
        isAuthorized: true,
      });
      // Уведомляем Wizard, что можно перейти к следующему шагу
      this.dispatchEvent(new CustomEvent('wizard:step:next', {
        bubbles: true,
        composed: true,
      }));
    } else {
      // PHP вернул null - пользователь не авторизован, не делаем запросов
      this.setState({ isAuthorized: false });
    }
  }

  /**
   * Обработка клика на кнопку "Авторизация"
   */
  async handleLogin() {
    try {
      if (!window.app?.services?.userUi) {
        await import('../../../user-profile/services/user-ui-service.js');
      }

      if (window.app?.events) {
        window.app.events.emit('user.showSignInModal', { source: 'order-wizard' });
      } else {
        window.app?.services?.userUi?.showSignInModal();
      }

      // Wizard сам обработает переход через событие elkaretro:auth:login
      // Не нужно здесь обрабатывать - Wizard слушает это событие глобально
    } catch (error) {
      console.error('[StepAuth] Failed to open auth modal:', error);
      this.showNotification('Не удалось открыть окно авторизации', 'error');
    }
  }

  /**
   * Обработка клика на кнопку "Продолжить без авторизации"
   */
  handleContinueWithoutAuth(event) {
    console.log('[StepAuth] handleContinueWithoutAuth called', event);
    // Переходим к шагу личных данных (шаг 2) для регистрации
    const gotoEvent = new CustomEvent('wizard:step:goto', {
      bubbles: true,
      composed: true,
      detail: { step: 2 },
    });
    console.log('[StepAuth] Dispatching wizard:step:goto event:', gotoEvent);
    this.dispatchEvent(gotoEvent);
  }

  /**
   * Валидация шага
   * Для шага авторизации валидация не требуется - пользователь либо авторизуется, либо продолжает без авторизации
   */
  async validate() {
    // Если авторизован - шаг пройден
    if (this.state.isAuthorized) {
      return true;
    }

    // Если не авторизован - шаг всегда валиден (пользователь может выбрать любой вариант)
    return true;
  }

  /**
   * Получить данные шага
   */
  async getData() {
    return {
      isAuthorized: this.state.isAuthorized,
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
    const { isAuthorized } = this.state;

    this.innerHTML = step_auth_template({
      isAuthorized,
    });
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    // Обработка кликов через кастомные события от ui-button
    // Используем делегирование событий на корневом элементе
    this.removeEventListener('step-auth:login-click', this._handleLoginClick);
    this.addEventListener('step-auth:login-click', this._handleLoginClick);

    this.removeEventListener('step-auth:continue-without-auth-click', this._handleContinueWithoutAuthClick);
    this.addEventListener('step-auth:continue-without-auth-click', this._handleContinueWithoutAuthClick);
    
    console.log('[StepAuth] Event listeners attached');
  }
}

customElements.define('step-auth', StepAuth);


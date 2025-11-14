import { BaseElement } from '../../../base-element.js';
import { renderAuthModalTemplate } from './auth-modal-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./auth-modal-styles.css', import.meta.url));
}

export class AuthModal extends BaseElement {
  static stateSchema = {
    visible: { 
      type: 'boolean', 
      default: false, 
      attribute: { name: 'visible', observed: true, reflect: true } 
    },
    loading: { 
      type: 'boolean', 
      default: false, 
      attribute: null, 
      internal: true 
    }
  };

  constructor() {
    super();
    this._modal = null;
    this._onLoginSuccess = this._onLoginSuccess.bind(this);
    this._onLoginError = this._onLoginError.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Подписываемся на события авторизации
    window.addEventListener('elkaretro:auth:login', this._onLoginSuccess);
    window.addEventListener('elkaretro:auth:error', this._onLoginError);
  }

  disconnectedCallback() {
    window.removeEventListener('elkaretro:auth:login', this._onLoginSuccess);
    window.removeEventListener('elkaretro:auth:error', this._onLoginError);
  }

  onStateChanged(key) {
    if (key === 'visible') {
      this._updateModalVisibility();
    }
  }

  async _updateModalVisibility() {
    if (!this._modal) {
      this._modal = this.querySelector('ui-modal');
    }
    
    if (this._modal) {
      if (this.state.visible) {
        // Загружаем конфигурацию формы при первом открытии (ленивая загрузка)
        if (!window.app?.forms?.signIn) {
          await import(new URL('../../../../app/forms/index.js', import.meta.url).href);
        }
        // Форма инициализируется автоматически через config-path в шаблоне
        this._modal.show();
      } else {
        this._modal.hide();
      }
    }
  }

  _onLoginSuccess(event) {
    // Закрываем модальное окно
    // Успешная авторизация обрабатывается через pipeline.onSuccess в конфигурации формы
    this.setState({ visible: false });
    
    // Отправляем событие успешной авторизации
    this.dispatchEvent(new CustomEvent('auth-modal:success', {
      detail: { user: event.detail.user },
      bubbles: true
    }));
  }

  _onLoginError(event) {
    // Ошибка обрабатывается через pipeline.onError в конфигурации формы
    // Здесь просто отправляем событие для обработки внешним кодом
    this.dispatchEvent(new CustomEvent('auth-modal:error', {
      detail: { error: event.detail.error },
      bubbles: true
    }));
  }

  show() {
    this.setState({ visible: true });
  }

  hide() {
    this.setState({ visible: false });
  }

  render() {
    // Просто рендерим шаблон - ui-form-controller инициализируется сам через config-path
    this.innerHTML = renderAuthModalTemplate(this.state);
    
    // Привязываем обработчики ссылок после рендера
    this._attachLinkHandlers();
  }

  _attachLinkHandlers() {
    // Обработка ссылок
    const registerLink = this.querySelector('[data-action="register"]');
    const forgotPasswordLink = this.querySelector('[data-action="forgot-password"]');

    if (registerLink) {
      registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('auth-modal:register-click', { bubbles: true }));
      });
    }

    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('auth-modal:forgot-password-click', { bubbles: true }));
      });
    }
  }
}

customElements.define('auth-modal', AuthModal);


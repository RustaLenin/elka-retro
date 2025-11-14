import { BaseElement } from '../../../base-element.js';
import { renderRegisterModalTemplate } from './register-modal-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./register-modal-styles.css', import.meta.url));
}

export class RegisterModal extends BaseElement {
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
    this._onRegisterSuccess = this._onRegisterSuccess.bind(this);
    this._onRegisterError = this._onRegisterError.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Подписываемся на события регистрации
    window.addEventListener('elkaretro:auth:register', this._onRegisterSuccess);
    window.addEventListener('elkaretro:auth:error', this._onRegisterError);
  }

  disconnectedCallback() {
    window.removeEventListener('elkaretro:auth:register', this._onRegisterSuccess);
    window.removeEventListener('elkaretro:auth:error', this._onRegisterError);
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
        if (!window.app?.forms?.register) {
          await import(new URL('../../../../app/forms/index.js', import.meta.url).href);
        }
        this._modal.show();
      } else {
        this._modal.hide();
      }
    }
  }

  _onRegisterSuccess(event) {
    // Закрываем модальное окно
    this.setState({ visible: false, loading: false });
    
    // Отправляем событие успешной регистрации
    this.dispatchEvent(new CustomEvent('register-modal:success', {
      detail: { user: event.detail.user },
      bubbles: true
    }));
  }

  _onRegisterError(event) {
    this.setState({ loading: false });
    
    // Отправляем событие ошибки
    this.dispatchEvent(new CustomEvent('register-modal:error', {
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
    this.innerHTML = renderRegisterModalTemplate(this.state);
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Обработка ссылки на авторизацию
    const loginLink = this.querySelector('[data-action="login"]');
    if (loginLink) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('register-modal:login-click', { bubbles: true }));
      });
    }
  }
}

customElements.define('register-modal', RegisterModal);


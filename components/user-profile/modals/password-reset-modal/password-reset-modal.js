import { BaseElement } from '../../../base-element.js';
import { renderPasswordResetModalTemplate } from './password-reset-modal-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./password-reset-modal-styles.css', import.meta.url));
}

export class PasswordResetModal extends BaseElement {
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
    },
    submitted: {
      type: 'boolean',
      default: false,
      attribute: null,
      internal: true
    }
  };

  constructor() {
    super();
    this._modal = null;
    this._onPasswordResetSuccess = this._onPasswordResetSuccess.bind(this);
    this._onPasswordResetError = this._onPasswordResetError.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Подписываемся на события восстановления пароля
    window.addEventListener('password-reset:success', this._onPasswordResetSuccess);
    window.addEventListener('password-reset:error', this._onPasswordResetError);
  }

  disconnectedCallback() {
    window.removeEventListener('password-reset:success', this._onPasswordResetSuccess);
    window.removeEventListener('password-reset:error', this._onPasswordResetError);
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
        if (!window.app?.forms?.passwordReset) {
          await import(new URL('../../../../app/forms/index.js', import.meta.url).href);
        }
        this._modal.show();
      } else {
        this._modal.hide();
      }
    }

    // Сбрасываем состояние при открытии
    if (this.state.visible && !this.state.submitted) {
      this.setState({ loading: false, submitted: false });
    }
  }

  _onPasswordResetSuccess(event) {
    this.setState({ loading: false, submitted: true });
    
    // Отправляем событие успешной отправки запроса
    this.dispatchEvent(new CustomEvent('password-reset-modal:success', {
      detail: { message: event.detail.message },
      bubbles: true
    }));
  }

  _onPasswordResetError(event) {
    this.setState({ loading: false });
    
    // Отправляем событие ошибки
    this.dispatchEvent(new CustomEvent('password-reset-modal:error', {
      detail: { error: event.detail.error },
      bubbles: true
    }));
  }

  show() {
    this.setState({ visible: true, submitted: false });
  }

  hide() {
    this.setState({ visible: false });
  }

  render() {
    this.innerHTML = renderPasswordResetModalTemplate(this.state);
  }
}

customElements.define('password-reset-modal', PasswordResetModal);


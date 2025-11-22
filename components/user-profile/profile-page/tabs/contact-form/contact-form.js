import { BaseElement } from '../../../../base-element.js';
import { renderContactFormTemplate } from './contact-form-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./contact-form-styles.css', import.meta.url));
}

export class ContactFormTab extends BaseElement {
  static stateSchema = {
    userId: {
      type: 'number',
      default: null,
      attribute: { name: 'user-id', observed: true, reflect: true }
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
    this._onSubmitSuccess = this._onSubmitSuccess.bind(this);
    this._onSubmitError = this._onSubmitError.bind(this);
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Загружаем конфигурацию формы при первом подключении (ленивая загрузка)
    if (!window.app?.forms?.contact) {
      await import(new URL('../../../../../app/forms/index.js', import.meta.url).href);
    }
    
    this.render();
    
    // Подписываемся на события формы
    window.addEventListener('contact:submitted', this._onSubmitSuccess);
    window.addEventListener('contact:submit-error', this._onSubmitError);
    
    // Проверяем, есть ли предзаполненные данные из sessionStorage
    this._applyPresetData();
  }

  _applyPresetData() {
    try {
      const presetData = sessionStorage.getItem('contact-form-preset');
      if (!presetData) return;

      const preset = JSON.parse(presetData);
      sessionStorage.removeItem('contact-form-preset'); // Удаляем после использования

      // Ждем, пока форма загрузится
      requestAnimationFrame(() => {
        const formController = this.querySelector('#contact-form-controller');
        if (formController && preset.subject) {
          // Устанавливаем значение темы
          const subjectField = formController.getField('subject');
          if (subjectField) {
            subjectField.setValue(preset.subject);
          }
        }
      });
    } catch (error) {
      console.error('[ContactFormTab] Failed to apply preset data:', error);
    }
  }

  disconnectedCallback() {
    window.removeEventListener('contact:submitted', this._onSubmitSuccess);
    window.removeEventListener('contact:submit-error', this._onSubmitError);
  }

  onStateChanged(key) {
    if (key === 'submitted') {
      this.render();
    }
  }

  _onSubmitSuccess(e) {
    // Устанавливаем состояние submitted для показа сообщения об успехе
    this.setState({ submitted: true });
  }

  _onSubmitError(e) {
    // Ошибка отправки уже отображается в форме через конфигурацию
  }

  _resetForm() {
    this.setState({ submitted: false });
    const formController = this.querySelector('#contact-form-controller');
    if (formController && typeof formController.reset === 'function') {
      formController.reset();
    }
    this.render();
  }

  render() {
    if (this.state.submitted) {
      this.innerHTML = `
        <div class="contact-form-tab">
          <div class="contact-form-tab__success">
            <ui-icon name="check" size="large"></ui-icon>
            <h3>Сообщение отправлено</h3>
            <p>Мы получили ваше сообщение и ответим вам на указанный email в ближайшее время.</p>
            <p class="contact-form-tab__hint">Проверьте папку "Спам", если ответ не пришёл в течение нескольких дней.</p>
            <button class="contact-form-tab__button" onclick="this.closest('contact-form-tab')._resetForm()">
              Отправить ещё одно сообщение
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.innerHTML = renderContactFormTemplate(this.state);
  }
}

customElements.define('contact-form-tab', ContactFormTab);

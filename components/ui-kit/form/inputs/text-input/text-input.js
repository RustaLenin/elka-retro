import { BaseElement } from '../../../../base-element.js';
import { renderTextInputTemplate } from './text-input-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./text-input-styles.css', import.meta.url));
}

export class UITextInput extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер - управляем вручную

  static stateSchema = {
    value:        { type: 'string',  default: '', attribute: { name: 'value', observed: true, reflect: true } },
    placeholder:  { type: 'string',  default: '', attribute: { name: 'placeholder', observed: true, reflect: true } },
    name:         { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    disabled:     { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    readonly:     { type: 'boolean', default: false, attribute: { name: 'readonly', observed: true, reflect: true } },
    required:     { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:       { type: 'string',  default: 'default', attribute: null },
    messages:     { type: 'json',    default: null, attribute: null },
    maxLength:    { type: 'number',  default: null, attribute: { name: 'maxlength', observed: true, reflect: true } },
    autocomplete: { type: 'string',  default: '', attribute: { name: 'autocomplete', observed: true, reflect: true } },
    inputMode:    { type: 'string',  default: '', attribute: { name: 'inputmode', observed: true, reflect: true } },
    pattern:      { type: 'string',  default: '', attribute: { name: 'pattern', observed: true, reflect: true } },
    mask:         { type: 'string',  default: null, attribute: { name: 'mask', observed: true, reflect: true } },
    prefix:       { type: 'string',  default: '', attribute: { name: 'prefix', observed: true, reflect: true } },
    suffix:       { type: 'string',  default: '', attribute: { name: 'suffix', observed: true, reflect: true } },
    clearable:    { type: 'boolean', default: false, attribute: { name: 'clearable', observed: true, reflect: true } },
    meta:         { type: 'json',    default: null, attribute: null },
    focused:      { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:        { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onInput = this._onInput.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onClear = this._onClear.bind(this);
    this._inputEl = null;
    this._clearBtn = null;
    this._suspendDispatch = false;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Рендерим сначала
    this.render();
    
    // Затем инициализируем связь со стейтом родителя (поля)
    // Ждем следующий кадр, чтобы убедиться, что поле уже инициализировало ссылку на форму
    requestAnimationFrame(() => {
      this._initStateLink();
    });
    
    this._emitLifecycleEvent('init');
  }

  disconnectedCallback() {
    // Очищаем ссылку на стейт родителя
    if (this.state._valueDescriptor) {
      delete this.state.value;
      delete this.state._valueDescriptor;
    }
    
    this._detachEvents();
  }
  
  _initStateLink() {
    // Находим родителя (поле)
    const field = this.closest('ui-form-field');
    if (!field || !field.state) {
      // Если поля нет, работаем автономно (не в контексте формы)
      return;
    }
    
    // Если value еще не инициализирован (поле еще не создало ссылку на форму), ждем
    if (field.state.value === undefined || !field.state._valueDescriptor) {
      // Пытаемся еще раз через кадр
      requestAnimationFrame(() => {
        this._initStateLink();
      });
      return;
    }
    
    // Если ссылка уже создана, не создаем повторно
    if (this.state._valueDescriptor) return;
    
    // Создаем ссылку на значение в стейте поля
    Object.defineProperty(this.state, 'value', {
      get: () => field.state.value,
      set: (val) => {
        field.state.value = val; // Используем setter поля (который синхронизируется с формой)
        // Обновляем DOM напрямую
        if (this._inputEl && this._inputEl.value !== String(val ?? '')) {
          this._inputEl.value = val ?? '';
        }
      },
      enumerable: true,
      configurable: true
    });
    this.state._valueDescriptor = true;
    
    // Устанавливаем начальное значение в DOM
    if (this._inputEl && field.state.value !== null && field.state.value !== undefined) {
      this._inputEl.value = field.state.value ?? '';
    }
  }

  onStateChanged(_key) {
    // value теперь обновляется автоматически через getter/setter
    // Но нужно синхронизировать DOM при изменении извне (через setter поля)
    if (_key === 'value' && this._inputEl) {
      const currentValue = this.state.value ?? '';
      if (this._inputEl.value !== String(currentValue)) {
        this._inputEl.value = currentValue;
      }
    }

    // Обновляем статус (классы/атрибуты) без полной перерисовки
    if (_key === 'status' || _key === 'messages') {
      this._updateStatus();
      if (!this._suspendDispatch) {
        this._emitValidation();
      }
    }

    // Перерисовываем только при изменении структуры (disabled, readonly, clearable, prefix, suffix)
    const structuralKeys = ['disabled', 'readonly', 'clearable', 'prefix', 'suffix', 'placeholder', 'maxLength', 'autocomplete', 'inputMode', 'pattern', 'mask'];
    if (structuralKeys.includes(_key)) {
      this.render();
    }
  }

  _updateStatus() {
    if (!this._inputEl) return;

    // Обновляем классы и атрибуты для статуса напрямую на элементе
    const status = this.state.status || 'default';
    
    // Удаляем все статусные классы
    this.classList.remove('ui-input-text--default', 'ui-input-text--error', 'ui-input-text--success', 'ui-input-text--warning');
    
    // Добавляем класс текущего статуса
    if (status !== 'default') {
      this.classList.add(`ui-input-text--${status}`);
    }

    // Обновляем data-атрибут для стилизации
    if (status !== 'default') {
      this.setAttribute('data-status', status);
    } else {
      this.removeAttribute('data-status');
    }

    // Обновляем атрибут aria-invalid
    if (status === 'error') {
      this._inputEl.setAttribute('aria-invalid', 'true');
    } else {
      this._inputEl.removeAttribute('aria-invalid');
    }

    // Обновляем сообщения (TODO: если нужно показывать в DOM, обновляем только этот блок, не весь компонент)
  }

  render() {
    this._detachEvents();
    this.innerHTML = renderTextInputTemplate(this.state);
    this._inputEl = this.querySelector('.ui-input-text__control');
    this._clearBtn = this.querySelector('.ui-input-text__clear');
    this._attachEvents();
    this._syncControl();
  }

  _attachEvents() {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('input', this._onInput);
    this._inputEl.addEventListener('change', this._onChange);
    this._inputEl.addEventListener('focus', this._onFocus);
    this._inputEl.addEventListener('blur', this._onBlur);
    if (this._clearBtn) {
      this._clearBtn.addEventListener('click', this._onClear);
    }
  }

  _detachEvents() {
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._onInput);
      this._inputEl.removeEventListener('change', this._onChange);
      this._inputEl.removeEventListener('focus', this._onFocus);
      this._inputEl.removeEventListener('blur', this._onBlur);
    }
    if (this._clearBtn) {
      this._clearBtn.removeEventListener('click', this._onClear);
    }
  }

  _syncControl() {
    if (this._inputEl) {
      // Синхронизируем DOM с текущим значением из стейта
      const currentValue = this.state.value ?? '';
      this._inputEl.value = currentValue;
    }
  }

  _onInput(event) {
    const nextValue = event.target.value ?? '';
    
    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.value = nextValue;
    
    // Обновляем локальные флаги
    this.setState({ dirty: true });
    
    // Отправляем событие для других слушателей (валидация, UI-обновления)
    this._emitEvent('ui-input-text:input', { value: nextValue, originalEvent: event });
  }

  _onChange(event) {
    const nextValue = event.target.value ?? '';
    
    // Обновляем через setter
    this.state.value = nextValue;
    
    // Отправляем событие
    this._emitEvent('ui-input-text:change', { value: nextValue, originalEvent: event });
  }

  _onFocus(event) {
    this.setState({ focused: true });
    this._emitEvent('ui-input-text:focus', { value: this.state.value, originalEvent: event });
  }

  _onBlur(event) {
    this.setState({ focused: false });
    this._emitEvent('ui-input-text:blur', { value: this.state.value, originalEvent: event });
  }

  _onClear() {
    // Обновляем через setter
    this.state.value = '';
    
    // Обновляем локальные флаги
    this.setState({ dirty: true });
    
    // Отправляем события
    this._emitEvent('ui-input-text:clear', { value: '' });
    this._emitEvent('ui-input-text:change', { value: '' });
  }

  _emitValidation() {
    const messages = this.state.messages || { error: [], success: [], info: [] };
    this._emitEvent('ui-input-text:validation', {
      status: this.state.status || 'default',
      messages
    });
  }

  _emitLifecycleEvent(type) {
    this._emitEvent(`ui-input-text:${type}`, { value: this.state.value });
  }

  _emitEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        field: this.getAttribute('name') || this.state.name || null,
        ...detail
      }
    }));
  }

  // Публичный API

  /**
   * Получить текущее значение
   * @returns {string}
   */
  value() {
    return this.state.value ?? '';
  }

  /**
   * Установить значение
   * @param {string} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    const previousValue = this.state.value;
    const newValue = String(value ?? '');
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
    }
    
    // Обновляем DOM напрямую (не перерисовываем!)
    if (this._inputEl && this._inputEl.value !== newValue) {
      this._inputEl.value = newValue;
    }
    
    // Устанавливаем dirty флаг
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emitEvent('ui-input-text:change', { value: newValue, previousValue });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтному значению
   * @returns {this}
   */
  reset() {
    this.setValue('');
    this.setState({ dirty: false, touched: false });
    this._updateStatus();
    return this;
  }

  /**
   * Проверить валидность
   * @returns {boolean}
   */
  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  /**
   * Установить фокус на инпут
   * @returns {this}
   */
  focus() {
    if (this._inputEl) {
      this._inputEl.focus();
    }
    return this;
  }

  /**
   * Убрать фокус с инпута
   * @returns {this}
   */
  blur() {
    if (this._inputEl) {
      this._inputEl.blur();
    }
    return this;
  }
}

customElements.define('ui-input-text', UITextInput);



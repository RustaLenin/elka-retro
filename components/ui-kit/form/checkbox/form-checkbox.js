import { BaseElement } from '../../../base-element.js';
import { renderFormCheckboxTemplate } from './form-checkbox-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./form-checkbox-styles.css', import.meta.url));
}

const EVENT_PREFIX = 'ui-checkbox';

export class UIFormCheckbox extends BaseElement {
  static stateSchema = {
    checked:       { type: 'boolean', default: false, attribute: { name: 'checked', observed: true, reflect: true } },
    indeterminate: { type: 'boolean', default: false, attribute: { name: 'indeterminate', observed: true, reflect: true } },
    value:         { type: 'string',  default: 'on', attribute: { name: 'value', observed: true, reflect: true } },
    name:          { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    label:         { type: 'string',  default: '', attribute: { name: 'label', observed: true, reflect: true } },
    description:   { type: 'string',  default: '', attribute: { name: 'description', observed: true, reflect: true } },
    hint:          { type: 'string',  default: '', attribute: { name: 'hint', observed: true, reflect: true } },
    disabled:      { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    required:      { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:        { type: 'string',  default: 'default', attribute: null },
    messages:      { type: 'json',    default: null, attribute: null },
    meta:          { type: 'json',    default: null, attribute: null },
    touched:       { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:         { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onChange = this._onChange.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);

    this._inputEl = null;
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
  }

  disconnectedCallback() {
    // Очищаем ссылку на стейт родителя
    if (this.state._checkedDescriptor) {
      delete this.state.checked;
      delete this.state._checkedDescriptor;
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
    if (this.state._checkedDescriptor) return;
    
    // Создаем ссылку на значение в стейте поля (boolean для checkbox)
    Object.defineProperty(this.state, 'checked', {
      get: () => Boolean(field.state.value),
      set: (val) => {
        field.state.value = Boolean(val); // Используем setter поля (который синхронизируется с формой)
        // Обновляем DOM напрямую
        if (this._inputEl) {
          this._inputEl.checked = Boolean(val);
        }
      },
      enumerable: true,
      configurable: true
    });
    this.state._checkedDescriptor = true;
    
    // Устанавливаем начальное значение в DOM
    if (this._inputEl && field.state.value !== null && field.state.value !== undefined) {
      this._inputEl.checked = Boolean(field.state.value);
    }
  }

  onStateChanged(key) {
    // checked теперь обновляется автоматически через getter/setter
    // Но нужно синхронизировать DOM при изменении извне (через setter поля)
    if (key === 'checked' && this._inputEl) {
      const currentChecked = Boolean(this.state.checked);
      if (this._inputEl.checked !== currentChecked) {
        this._inputEl.checked = currentChecked;
      }
    }
    
    if (key === 'status') {
      // Применяем статус напрямую к веб-компоненту
      const status = this.state.status || 'default';
      this.setAttribute('data-status', status);
      // Удаляем старые классы статуса
      this.classList.remove('ui-form-checkbox--error', 'ui-form-checkbox--success', 'ui-form-checkbox--default');
      if (status !== 'default') {
        this.classList.add(`ui-form-checkbox--${status}`);
      }
    }
    
    if (['indeterminate', 'disabled', 'required', 'value'].includes(key)) {
      this._syncControl();
    }
  }

  render() {
    this._detachEvents();
    this.innerHTML = renderFormCheckboxTemplate(this.state);
    this._inputEl = this.querySelector('.ui-form-checkbox__control');
    // Применяем статус к веб-компоненту
    const status = this.state.status || 'default';
    this.setAttribute('data-status', status);
    if (status !== 'default') {
      this.classList.add(`ui-form-checkbox--${status}`);
    }
    this._attachEvents();
    this._syncControl();
  }

  _attachEvents() {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('change', this._onChange);
    this._inputEl.addEventListener('focus', this._onFocus);
    this._inputEl.addEventListener('blur', this._onBlur);
  }

  _detachEvents() {
    if (!this._inputEl) return;
    this._inputEl.removeEventListener('change', this._onChange);
    this._inputEl.removeEventListener('focus', this._onFocus);
    this._inputEl.removeEventListener('blur', this._onBlur);
  }

  _syncControl() {
    if (!this._inputEl) return;
    this._inputEl.checked = Boolean(this.state.checked);
    this._inputEl.indeterminate = Boolean(this.state.indeterminate);
    this._inputEl.disabled = Boolean(this.state.disabled);
    this._inputEl.required = Boolean(this.state.required);
    if (this.state.value != null) {
      this._inputEl.value = String(this.state.value);
    }
  }

  _onChange(event) {
    const checked = event.target.checked;
    const indeterminate = event.target.indeterminate;
    
    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.checked = checked;
    
    // Обновляем indeterminate и флаги
    this.setState({
      indeterminate,
      dirty: true,
      touched: true
    });
    
    // Отправляем события для других слушателей
    this._emit(EVENT_PREFIX + ':input', { checked });
    this._emit(EVENT_PREFIX + ':change', { checked });
  }

  _onFocus(event) {
    this._emit(EVENT_PREFIX + ':focus', { checked: this.state.checked, originalEvent: event });
  }

  _onBlur(event) {
    this.setState({ touched: true });
    this._emit(EVENT_PREFIX + ':blur', { checked: this.state.checked, originalEvent: event });
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        checked: this.state.checked,
        value: this.state.checked ? this.state.value : null,
        ...detail
      }
    }));
  }

  // Публичный API

  /**
   * Получить текущее значение (checked)
   * @returns {boolean}
   */
  value() {
    return Boolean(this.state.checked);
  }

  /**
   * Установить значение
   * @param {boolean} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    const newValue = Boolean(value);
    const previousValue = Boolean(this.state.checked);
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._checkedDescriptor) {
      this.state.checked = newValue;
    } else {
      this.setState({ checked: newValue });
    }
    
    // Обновляем DOM напрямую
    if (this._inputEl) {
      this._inputEl.checked = newValue;
    }
    
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emit(EVENT_PREFIX + ':change', { checked: newValue, previousChecked: previousValue });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтному значению
   * @returns {this}
   */
  reset() {
    this.setValue(false);
    this.setState({ dirty: false, touched: false, indeterminate: false });
    this._syncControl();
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
   * Переключить состояние
   * @returns {this}
   */
  toggle() {
    return this.setValue(!this.value());
  }

  /**
   * Установить в состояние "отмечено"
   * @returns {this}
   */
  check() {
    return this.setValue(true);
  }

  /**
   * Установить в состояние "не отмечено"
   * @returns {this}
   */
  uncheck() {
    return this.setValue(false);
  }
}

customElements.define('ui-form-checkbox', UIFormCheckbox);

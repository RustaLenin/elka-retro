import { BaseElement } from '../../../../base-element.js';
import { renderNumberInputTemplate } from './number-input-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./number-input-styles.css', import.meta.url));
}

export class UINumberInput extends BaseElement {
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
    min:          { type: 'number',  default: null, attribute: { name: 'min', observed: true, reflect: true } },
    max:          { type: 'number',  default: null, attribute: { name: 'max', observed: true, reflect: true } },
    step:         { type: 'number',  default: 1, attribute: { name: 'step', observed: true, reflect: true } },
    precision:    { type: 'number',  default: null, attribute: { name: 'precision', observed: true, reflect: true } },
    format:       { type: 'string',  default: 'decimal', attribute: { name: 'format', observed: true, reflect: true } },
    currency:     { type: 'string',  default: '', attribute: { name: 'currency', observed: true, reflect: true } },
    prefix:       { type: 'string',  default: '', attribute: { name: 'prefix', observed: true, reflect: true } },
    suffix:       { type: 'string',  default: '', attribute: { name: 'suffix', observed: true, reflect: true } },
    stepper:      { type: 'json',    default: null, attribute: null },
    inputMode:    { type: 'string',  default: 'decimal', attribute: { name: 'inputmode', observed: true, reflect: true } },
    clearable:    { type: 'boolean', default: false, attribute: { name: 'clearable', observed: true, reflect: true } },
    meta:         { type: 'json',    default: null, attribute: null },
    numericValue: { type: 'number',  default: null, attribute: null, internal: true },
    focused:      { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:        { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onInput = this._onInput.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onIncrement = this._onIncrement.bind(this);
    this._onDecrement = this._onDecrement.bind(this);
    this._inputEl = null;
    this._stepperUp = null;
    this._stepperDown = null;
    this._updatingInternally = false;
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
      get: () => field.state.value ?? '',
      set: (val) => {
        field.state.value = val ?? ''; // Используем setter поля (который синхронизируется с формой)
        // Обновляем DOM напрямую
        if (this._inputEl && this._inputEl.value !== String(val ?? '')) {
          this._inputEl.value = val ?? '';
        }
        // Обновляем numericValue
        const parsed = this._parseToNumber(val);
        this._updatingInternally = true;
        this.setState({ numericValue: parsed });
        this._updatingInternally = false;
      },
      enumerable: true,
      configurable: true
    });
    this.state._valueDescriptor = true;
    
    // Устанавливаем начальное значение в DOM
    if (this._inputEl && field.state.value !== null && field.state.value !== undefined) {
      this._inputEl.value = field.state.value ?? '';
      const parsed = this._parseToNumber(field.state.value);
      this._updatingInternally = true;
      this.setState({ numericValue: parsed });
      this._updatingInternally = false;
    }
  }

  onStateChanged(_key) {
    // value теперь обновляется автоматически через getter/setter
    // Но нужно синхронизировать DOM при изменении извне (через setter поля)
    if (_key === 'value' && !this._updatingInternally) {
      if (this._inputEl && this._inputEl.value !== String(this.state.value ?? '')) {
        this._inputEl.value = this.state.value ?? '';
      }
      const parsed = this._parseToNumber(this.state.value);
      this._updatingInternally = true;
      this.setState({ numericValue: parsed });
      this._updatingInternally = false;
    }

    if (_key === 'numericValue' && !this._updatingInternally) {
      const formatted = this._formatValue(this.state.numericValue);
      if (formatted !== this.state.value) {
        // Обновляем через setter (который синхронизируется с полем и формой)
        this.state.value = formatted ?? '';
        this._updatingInternally = true;
        // Не вызываем setState для value, так как setter уже обновил его
        this._updatingInternally = false;
      }
    }

    // Обновляем статус (классы/атрибуты) без полной перерисовки
    if ((_key === 'status' || _key === 'messages') && !this._updatingInternally) {
      this._updateStatus();
      this._emitValidation();
    }

    // Перерисовываем только при изменении структуры (disabled, readonly, clearable, prefix, suffix, stepper)
    const structuralKeys = ['disabled', 'readonly', 'clearable', 'prefix', 'suffix', 'placeholder', 'min', 'max', 'step', 'precision', 'format', 'currency', 'inputMode', 'stepper'];
    if (structuralKeys.includes(_key)) {
      this.render();
    }
  }

  _updateStatus() {
    if (!this._inputEl) return;

    // Обновляем классы и атрибуты для статуса напрямую на элементе
    const status = this.state.status || 'default';
    
    // Удаляем все статусные классы
    this.classList.remove('ui-input-number--default', 'ui-input-number--error', 'ui-input-number--success', 'ui-input-number--warning');
    
    // Добавляем класс текущего статуса
    if (status !== 'default') {
      this.classList.add(`ui-input-number--${status}`);
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
  }

  render() {
    this._detachEvents();
    this.innerHTML = renderNumberInputTemplate(this.state);
    this._inputEl = this.querySelector('.ui-input-number__control');
    this._stepperUp = this.querySelector('.ui-input-number__stepper--up');
    this._stepperDown = this.querySelector('.ui-input-number__stepper--down');
    this._attachEvents();
    this._syncControl();
  }

  _attachEvents() {
    if (this._inputEl) {
      this._inputEl.addEventListener('input', this._onInput);
      this._inputEl.addEventListener('change', this._onChange);
      this._inputEl.addEventListener('focus', this._onFocus);
      this._inputEl.addEventListener('blur', this._onBlur);
    }
    if (this._stepperUp) this._stepperUp.addEventListener('click', this._onIncrement);
    if (this._stepperDown) this._stepperDown.addEventListener('click', this._onDecrement);
  }

  _detachEvents() {
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._onInput);
      this._inputEl.removeEventListener('change', this._onChange);
      this._inputEl.removeEventListener('focus', this._onFocus);
      this._inputEl.removeEventListener('blur', this._onBlur);
    }
    if (this._stepperUp) this._stepperUp.removeEventListener('click', this._onIncrement);
    if (this._stepperDown) this._stepperDown.removeEventListener('click', this._onDecrement);
  }

  _syncControl() {
    if (this._inputEl) {
      this._inputEl.value = this.state.value ?? '';
    }
  }

  _onInput(event) {
    const raw = event.target.value ?? '';
    const numeric = this._parseToNumber(raw);
    
    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.value = raw;
    
    // Обновляем numericValue и dirty
    this._updatingInternally = true;
    this.setState({ numericValue: numeric, dirty: true });
    this._updatingInternally = false;
    
    // Отправляем событие для других слушателей
    this._emitEvent('ui-input-number:input', {
      value: numeric,
      rawValue: raw,
      formatted: raw,
      originalEvent: event
    });
  }

  _onChange(event) {
    this._commitValue(event, 'change');
  }

  _onFocus(event) {
    this.setState({ focused: true });
    this._emitEvent('ui-input-number:focus', {
      value: this.state.numericValue,
      rawValue: this.state.value,
      originalEvent: event
    });
  }

  _onBlur(event) {
    this.setState({ focused: false });
    this._commitValue(event, 'blur');
    this._emitEvent('ui-input-number:blur', {
      value: this.state.numericValue,
      rawValue: this.state.value,
      originalEvent: event
    });
  }

  _onIncrement() {
    this._stepValue(1);
  }

  _onDecrement() {
    this._stepValue(-1);
  }

  _stepValue(direction) {
    const step = Number(this.state.step || 1);
    const current = this.state.numericValue ?? 0;
    const next = current + step * direction;
    const clamped = this._clamp(this._applyPrecision(next));
    const formatted = this._formatValue(clamped) ?? '';

    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.value = formatted;
    
    // Обновляем numericValue и dirty
    this._updatingInternally = true;
    this.setState({
      numericValue: clamped,
      dirty: true
    });
    this._updatingInternally = false;
    this._syncControl();

    this._emitEvent(direction > 0 ? 'ui-input-number:increment' : 'ui-input-number:decrement', {
      value: clamped,
      rawValue: formatted
    });
    this._emitEvent('ui-input-number:input', {
      value: clamped,
      rawValue: formatted,
      formatted
    });
    this._commitValue(null, 'stepper');
  }

  _commitValue(originalEvent, origin = 'change') {
    const parsed = this.state.numericValue;
    if (parsed == null) {
      // Empty or invalid value, emit change with null
      this._emitEvent('ui-input-number:change', {
        value: null,
        rawValue: this.state.value ?? '',
        formatted: this.state.value ?? '',
        origin,
        originalEvent
      });
      return;
    }

    const clamped = this._clamp(parsed);
    const formatted = this._formatValue(clamped) ?? '';

    if (formatted !== this.state.value) {
      // Обновляем через setter (который синхронизируется с полем и формой)
      this.state.value = formatted;
      
      // Обновляем numericValue
      this._updatingInternally = true;
      this.setState({ numericValue: clamped });
      this._updatingInternally = false;
      this._syncControl();
    }

    this._emitEvent('ui-input-number:change', {
      value: clamped,
      rawValue: this.state.value ?? '',
      formatted,
      origin,
      originalEvent
    });
  }

  _parseToNumber(raw) {
    if (raw == null || raw === '') return null;
    const normalized = String(raw).replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return this._applyPrecision(parsed);
  }

  _applyPrecision(num) {
    const precision = this.state.precision;
    if (typeof precision === 'number' && Number.isInteger(precision) && precision >= 0) {
      const factor = Math.pow(10, precision);
      return Math.round(num * factor) / factor;
    }
    return num;
  }

  _clamp(num) {
    let result = num;
    if (this.state.min != null && Number.isFinite(this.state.min)) {
      result = Math.max(result, this.state.min);
    }
    if (this.state.max != null && Number.isFinite(this.state.max)) {
      result = Math.min(result, this.state.max);
    }
    return result;
  }

  _formatValue(num) {
    if (num == null) return '';
    const precision = this.state.precision;
    if (typeof precision === 'number' && Number.isInteger(precision) && precision >= 0) {
      return num.toFixed(precision);
    }
    return String(num);
  }

  _emitValidation() {
    const messages = this.state.messages || { error: [], success: [], info: [] };
    this._emitEvent('ui-input-number:validation', {
      status: this.state.status || 'default',
      messages
    });
  }

  _emitLifecycleEvent(type) {
    this._emitEvent(`ui-input-number:${type}`, {
      value: this.state.numericValue,
      rawValue: this.state.value
    });
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
   * Получить текущее числовое значение
   * @returns {number|null}
   */
  value() {
    const val = this.state.numericValue;
    if (val === null || val === undefined) return null;
    return Number(val);
  }

  /**
   * Установить значение
   * @param {number|string|null} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    let newValue = null;
    
    if (value !== null && value !== undefined && value !== '') {
      newValue = Number(value);
      
      // Применяем min/max
      newValue = this._clamp(newValue);
      
      // Применяем precision
      if (this.state.precision !== null) {
        newValue = this._applyPrecision(newValue);
      }
    }
    
    const previousValue = this.state.numericValue;
    const formatted = this._formatValue(newValue) ?? '';
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = formatted;
    } else {
      this.setState({ value: formatted, numericValue: newValue });
    }
    
    // Обновляем DOM напрямую
    if (this._inputEl) {
      this._inputEl.value = formatted;
    }
    
    if (previousValue !== newValue) {
      this._updatingInternally = true;
      this.setState({ numericValue: newValue, dirty: true });
      this._updatingInternally = false;
      this._emitEvent('ui-input-number:change', { 
        value: newValue, 
        rawValue: formatted,
        formatted,
        previousValue
      });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтному значению
   * @returns {this}
   */
  reset() {
    this.setValue(null);
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

customElements.define('ui-input-number', UINumberInput);



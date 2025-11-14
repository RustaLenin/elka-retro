import { BaseElement } from '../../../../base-element.js';
import { renderRangeInputTemplate } from './range-input-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./range-input-styles.css', import.meta.url));
}

export class UIRangeInput extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер - управляем вручную

  static stateSchema = {
    minValue:      { type: 'string',  default: '', attribute: { name: 'min-value', observed: true, reflect: true } },
    maxValue:      { type: 'string',  default: '', attribute: { name: 'max-value', observed: true, reflect: true } },
    minPlaceholder: { type: 'string',  default: '', attribute: { name: 'min-placeholder', observed: true, reflect: true } },
    maxPlaceholder: { type: 'string',  default: '', attribute: { name: 'max-placeholder', observed: true, reflect: true } },
    minLabel:      { type: 'string',  default: 'от', attribute: { name: 'min-label', observed: true, reflect: true } },
    maxLabel:      { type: 'string',  default: 'до', attribute: { name: 'max-label', observed: true, reflect: true } },
    name:          { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    disabled:      { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    readonly:      { type: 'boolean', default: false, attribute: { name: 'readonly', observed: true, reflect: true } },
    required:      { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:        { type: 'string',  default: 'default', attribute: null },
    messages:      { type: 'json',    default: null, attribute: null },
    min:           { type: 'number',  default: null, attribute: { name: 'min', observed: true, reflect: true } },
    max:           { type: 'number',  default: null, attribute: { name: 'max', observed: true, reflect: true } },
    step:          { type: 'number',  default: 1, attribute: { name: 'step', observed: true, reflect: true } },
    precision:     { type: 'number',  default: null, attribute: { name: 'precision', observed: true, reflect: true } },
    format:        { type: 'string',  default: 'decimal', attribute: { name: 'format', observed: true, reflect: true } },
    currency:      { type: 'string',  default: '', attribute: { name: 'currency', observed: true, reflect: true } },
    prefix:        { type: 'string',  default: '', attribute: { name: 'prefix', observed: true, reflect: true } },
    suffix:        { type: 'string',  default: '', attribute: { name: 'suffix', observed: true, reflect: true } },
    stepper:       { type: 'json',    default: null, attribute: null },
    inputMode:     { type: 'string',  default: 'decimal', attribute: { name: 'inputmode', observed: true, reflect: true } },
    clearable:     { type: 'boolean', default: false, attribute: { name: 'clearable', observed: true, reflect: true } },
    meta:          { type: 'json',    default: null, attribute: null },
    minNumericValue: { type: 'number',  default: null, attribute: null, internal: true },
    maxNumericValue: { type: 'number',  default: null, attribute: null, internal: true },
    focused:       { type: 'string',  default: '', attribute: null, internal: true }, // 'min' | 'max' | ''
    dirty:         { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onMinInput = this._onMinInput.bind(this);
    this._onMaxInput = this._onMaxInput.bind(this);
    this._onMinChange = this._onMinChange.bind(this);
    this._onMaxChange = this._onMaxChange.bind(this);
    this._onMinFocus = this._onMinFocus.bind(this);
    this._onMaxFocus = this._onMaxFocus.bind(this);
    this._onMinBlur = this._onMinBlur.bind(this);
    this._onMaxBlur = this._onMaxBlur.bind(this);
    this._onMinIncrement = this._onMinIncrement.bind(this);
    this._onMinDecrement = this._onMinDecrement.bind(this);
    this._onMaxIncrement = this._onMaxIncrement.bind(this);
    this._onMaxDecrement = this._onMaxDecrement.bind(this);
    this._onMinClear = this._onMinClear.bind(this);
    this._onMaxClear = this._onMaxClear.bind(this);
    this._minInputEl = null;
    this._maxInputEl = null;
    this._minStepperUp = null;
    this._minStepperDown = null;
    this._maxStepperUp = null;
    this._maxStepperDown = null;
    this._updatingInternally = false;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Рендерим сначала
    this.render();
    this._bindEvents();
    
    // Затем инициализируем связь со стейтом родителя (поля)
    requestAnimationFrame(() => {
      this._initStateLink();
    });
  }
  
  disconnectedCallback() {
    // Очищаем ссылку на стейт родителя
    if (this.state._rangeDescriptor) {
      delete this.state._rangeValue;
      delete this.state._rangeDescriptor;
    }
  }
  
  _initStateLink() {
    // Находим родителя (поле)
    const field = this.closest('ui-form-field');
    if (!field || !field.state) {
      // Если поля нет, работаем автономно (не в контексте формы)
      this._syncNumericValues();
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
    if (this.state._rangeDescriptor) {
      this._syncFromFieldValue();
      return;
    }
    
    // Создаем объект-обертку для синхронизации с полем
    // field.state.value должен быть объектом { min, max }
    if (!field.state.value || typeof field.state.value !== 'object') {
      field.state.value = { min: null, max: null };
    }
    
    // Создаем ссылку на объект в стейте поля
    this.state._rangeValue = field.state.value;
    this.state._rangeDescriptor = true;
    
    // Синхронизируем minValue и maxValue с объектом
    this._syncFromFieldValue();
    this._syncNumericValues();
  }
  
  _syncFromFieldValue() {
    if (!this.state._rangeValue) return;
    const range = this.state._rangeValue;
    
    // Обновляем minValue и maxValue из объекта
    const minValue = range.min !== null && range.min !== undefined ? String(range.min) : '';
    const maxValue = range.max !== null && range.max !== undefined ? String(range.max) : '';
    
    if (this.state.minValue !== minValue || this.state.maxValue !== maxValue) {
      this._updatingInternally = true;
      this.setState({
        minValue,
        maxValue
      });
      this._updatingInternally = false;
      
      // Обновляем DOM
      if (this._minInputEl && this._minInputEl.value !== minValue) {
        this._minInputEl.value = minValue;
      }
      if (this._maxInputEl && this._maxInputEl.value !== maxValue) {
        this._maxInputEl.value = maxValue;
      }
    }
  }
  
  _syncToFieldValue() {
    if (!this.state._rangeValue) return;
    
    // Обновляем объект из minValue и maxValue
    const minNum = this._parseNumber(this.state.minValue, true);
    const maxNum = this._parseNumber(this.state.maxValue, true);
    
    this.state._rangeValue.min = minNum;
    this.state._rangeValue.max = maxNum;
  }

  onStateChanged(_key) {
    // Обновляем только значения инпутов напрямую, БЕЗ перерисовки всего компонента
    if (_key === 'minValue' && !this._updatingInternally) {
      if (this._minInputEl && this._minInputEl.value !== String(this.state.minValue ?? '')) {
        this._minInputEl.value = this.state.minValue ?? '';
      }
      // Синхронизируем с полем
      this._syncToFieldValue();
    }
    if (_key === 'maxValue' && !this._updatingInternally) {
      if (this._maxInputEl && this._maxInputEl.value !== String(this.state.maxValue ?? '')) {
        this._maxInputEl.value = this.state.maxValue ?? '';
      }
      // Синхронизируем с полем
      this._syncToFieldValue();
    }

    // Обновляем статус (классы/атрибуты) без полной перерисовки
    if (_key === 'status' || _key === 'messages') {
      this._updateStatus();
      this._validateRange();
    }

    // Перерисовываем только при изменении структуры (disabled, readonly, clearable, prefix, suffix, labels, placeholders)
    const structuralKeys = ['disabled', 'readonly', 'clearable', 'prefix', 'suffix', 'minLabel', 'maxLabel', 'minPlaceholder', 'maxPlaceholder', 'min', 'max', 'step', 'precision', 'format', 'currency', 'inputMode', 'stepper'];
    if (structuralKeys.includes(_key)) {
      this.render();
      this._bindEvents();
      this._syncNumericValues();
    }
  }

  _updateStatus() {
    // Обновляем классы и атрибуты для статуса напрямую на элементе
    const status = this.state.status || 'default';
    
    // Удаляем все статусные классы
    this.classList.remove('ui-input-range--default', 'ui-input-range--error', 'ui-input-range--success', 'ui-input-range--warning');
    
    // Добавляем класс текущего статуса
    if (status !== 'default') {
      this.classList.add(`ui-input-range--${status}`);
    }

    // Обновляем data-атрибут для стилизации
    if (status !== 'default') {
      this.setAttribute('data-status', status);
    } else {
      this.removeAttribute('data-status');
    }

    // Обновляем атрибут aria-invalid для обоих инпутов
    if (status === 'error') {
      if (this._minInputEl) this._minInputEl.setAttribute('aria-invalid', 'true');
      if (this._maxInputEl) this._maxInputEl.setAttribute('aria-invalid', 'true');
    } else {
      if (this._minInputEl) this._minInputEl.removeAttribute('aria-invalid');
      if (this._maxInputEl) this._maxInputEl.removeAttribute('aria-invalid');
    }
  }

  _bindEvents() {
    this._minInputEl = this.querySelector('[data-range-input="min"]');
    this._maxInputEl = this.querySelector('[data-range-input="max"]');
    this._minStepperUp = this.querySelector('[data-stepper="min-up"]');
    this._minStepperDown = this.querySelector('[data-stepper="min-down"]');
    this._maxStepperUp = this.querySelector('[data-stepper="max-up"]');
    this._maxStepperDown = this.querySelector('[data-stepper="max-down"]');

    if (this._minInputEl) {
      this._minInputEl.addEventListener('input', this._onMinInput);
      this._minInputEl.addEventListener('change', this._onMinChange);
      this._minInputEl.addEventListener('focus', this._onMinFocus);
      this._minInputEl.addEventListener('blur', this._onMinBlur);
    }
    if (this._maxInputEl) {
      this._maxInputEl.addEventListener('input', this._onMaxInput);
      this._maxInputEl.addEventListener('change', this._onMaxChange);
      this._maxInputEl.addEventListener('focus', this._onMaxFocus);
      this._maxInputEl.addEventListener('blur', this._onMaxBlur);
    }
    if (this._minStepperUp) this._minStepperUp.addEventListener('click', this._onMinIncrement);
    if (this._minStepperDown) this._minStepperDown.addEventListener('click', this._onMinDecrement);
    if (this._maxStepperUp) this._maxStepperUp.addEventListener('click', this._onMaxIncrement);
    if (this._maxStepperDown) this._maxStepperDown.addEventListener('click', this._onMaxDecrement);

    const minClearBtn = this.querySelector('[data-clear="min"]');
    const maxClearBtn = this.querySelector('[data-clear="max"]');
    if (minClearBtn) minClearBtn.addEventListener('click', this._onMinClear);
    if (maxClearBtn) maxClearBtn.addEventListener('click', this._onMaxClear);
  }

  _parseNumber(str, allowEmpty = true) {
    if (!str || str.trim() === '') return allowEmpty ? null : 0;
    const cleaned = str.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  _formatNumber(num, allowEmpty = true) {
    if (num === null || num === undefined) return allowEmpty ? '' : '0';
    const precision = this.state.precision !== null ? this.state.precision : (this.state.step < 1 ? 2 : 0);
    let formatted = num.toFixed(precision);
    if (this.state.format === 'integer') {
      formatted = Math.round(num).toString();
    }
    if (this.state.currency) {
      formatted = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: this.state.currency
      }).format(num);
    }
    return formatted;
  }

  _clampValue(value, isMin) {
    const globalMin = this.state.min !== null ? this.state.min : -Infinity;
    const globalMax = this.state.max !== null ? this.state.max : Infinity;
    let clamped = value;
    if (clamped < globalMin) clamped = globalMin;
    if (clamped > globalMax) clamped = globalMax;
    if (isMin && this.state.maxNumericValue !== null && clamped > this.state.maxNumericValue) {
      clamped = this.state.maxNumericValue;
    }
    if (!isMin && this.state.minNumericValue !== null && clamped < this.state.minNumericValue) {
      clamped = this.state.minNumericValue;
    }
    return clamped;
  }

  _syncNumericValues() {
    const minNum = this._parseNumber(this.state.minValue, true);
    const maxNum = this._parseNumber(this.state.maxValue, true);
    this.setState({
      minNumericValue: minNum,
      maxNumericValue: maxNum
    });
    this._validateRange();
  }

  _validateRange() {
    const minNum = this.state.minNumericValue;
    const maxNum = this.state.maxNumericValue;
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      this.setState({
        status: 'error',
        messages: { error: ['Минимальное значение не может быть больше максимального'] }
      });
      this._emitEvent('validation', {
        valid: false,
        status: 'error',
        messages: { error: ['Минимальное значение не может быть больше максимального'] }
      });
      return false;
    }
    if (this.state.status === 'error' && this.state.messages?.error?.[0]?.includes('не может быть больше')) {
      this.setState({
        status: 'default',
        messages: null
      });
      this._emitEvent('validation', {
        valid: true,
        status: 'default',
        messages: null
      });
    }
    return true;
  }

  _onMinInput(e) {
    if (this._updatingInternally) return;
    const rawValue = e.target.value;
    const numValue = this._parseNumber(rawValue, true);
    
    this._updatingInternally = true;
    this.setState({
      minValue: rawValue,
      minNumericValue: numValue,
      dirty: true
    });
    this._updatingInternally = false;
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._emitEvent('input', {
      value: { min: numValue, max: this.state.maxNumericValue },
      rawValue: { min: rawValue, max: this.state.maxValue },
      origin: 'min'
    });
  }

  _onMaxInput(e) {
    if (this._updatingInternally) return;
    const rawValue = e.target.value;
    const numValue = this._parseNumber(rawValue, true);
    
    this._updatingInternally = true;
    this.setState({
      maxValue: rawValue,
      maxNumericValue: numValue,
      dirty: true
    });
    this._updatingInternally = false;
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._emitEvent('input', {
      value: { min: this.state.minNumericValue, max: numValue },
      rawValue: { min: this.state.minValue, max: rawValue },
      origin: 'max'
    });
  }

  _onMinChange(e) {
    if (this._updatingInternally) return;
    const numValue = this._parseNumber(e.target.value, true);
    if (numValue !== null) {
      const clamped = this._clampValue(numValue, true);
      const formatted = this._formatNumber(clamped, false);
      this._updatingInternally = true;
      this.setState({
        minValue: formatted,
        minNumericValue: clamped
      });
      this._updatingInternally = false;
      if (this._minInputEl) this._minInputEl.value = formatted;
      
      // Синхронизируем с полем
      this._syncToFieldValue();
    }
    this._validateRange();
    this._emitEvent('change', {
      value: { min: this.state.minNumericValue, max: this.state.maxNumericValue },
      rawValue: { min: this.state.minValue, max: this.state.maxValue },
      origin: 'min'
    });
  }

  _onMaxChange(e) {
    if (this._updatingInternally) return;
    const numValue = this._parseNumber(e.target.value, true);
    if (numValue !== null) {
      const clamped = this._clampValue(numValue, false);
      const formatted = this._formatNumber(clamped, false);
      this._updatingInternally = true;
      this.setState({
        maxValue: formatted,
        maxNumericValue: clamped
      });
      this._updatingInternally = false;
      if (this._maxInputEl) this._maxInputEl.value = formatted;
      
      // Синхронизируем с полем
      this._syncToFieldValue();
    }
    this._validateRange();
    this._emitEvent('change', {
      value: { min: this.state.minNumericValue, max: this.state.maxNumericValue },
      rawValue: { min: this.state.minValue, max: this.state.maxValue },
      origin: 'max'
    });
  }

  _onMinFocus(e) {
    this.setState({ focused: 'min' });
    this._emitEvent('focus', { origin: 'min' });
  }

  _onMaxFocus(e) {
    this.setState({ focused: 'max' });
    this._emitEvent('focus', { origin: 'max' });
  }

  _onMinBlur(e) {
    if (this.state.focused === 'min') {
      this.setState({ focused: '' });
      this._onMinChange(e);
      this._emitEvent('blur', { origin: 'min' });
    }
  }

  _onMaxBlur(e) {
    if (this.state.focused === 'max') {
      this.setState({ focused: '' });
      this._onMaxChange(e);
      this._emitEvent('blur', { origin: 'max' });
    }
  }

  _onMinIncrement(e) {
    e.preventDefault();
    const current = this.state.minNumericValue ?? (this.state.min ?? 0);
    const newValue = this._clampValue(current + this.state.step, true);
    const formatted = this._formatNumber(newValue, false);
    this._updatingInternally = true;
    this.setState({
      minValue: formatted,
      minNumericValue: newValue
    });
    this._updatingInternally = false;
    if (this._minInputEl) this._minInputEl.value = formatted;
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._validateRange();
    this._emitEvent('change', {
      value: { min: newValue, max: this.state.maxNumericValue },
      rawValue: { min: formatted, max: this.state.maxValue },
      origin: 'min'
    });
  }

  _onMinDecrement(e) {
    e.preventDefault();
    const current = this.state.minNumericValue ?? (this.state.min ?? 0);
    const newValue = this._clampValue(current - this.state.step, true);
    const formatted = this._formatNumber(newValue, false);
    this._updatingInternally = true;
    this.setState({
      minValue: formatted,
      minNumericValue: newValue
    });
    this._updatingInternally = false;
    if (this._minInputEl) this._minInputEl.value = formatted;
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._validateRange();
    this._emitEvent('change', {
      value: { min: newValue, max: this.state.maxNumericValue },
      rawValue: { min: formatted, max: this.state.maxValue },
      origin: 'min'
    });
  }

  _onMaxIncrement(e) {
    e.preventDefault();
    const current = this.state.maxNumericValue ?? (this.state.max ?? 0);
    const newValue = this._clampValue(current + this.state.step, false);
    const formatted = this._formatNumber(newValue, false);
    this._updatingInternally = true;
    this.setState({
      maxValue: formatted,
      maxNumericValue: newValue
    });
    this._updatingInternally = false;
    if (this._maxInputEl) this._maxInputEl.value = formatted;
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._validateRange();
    this._emitEvent('change', {
      value: { min: this.state.minNumericValue, max: newValue },
      rawValue: { min: this.state.minValue, max: formatted },
      origin: 'max'
    });
  }

  _onMaxDecrement(e) {
    e.preventDefault();
    const current = this.state.maxNumericValue ?? (this.state.max ?? 0);
    const newValue = this._clampValue(current - this.state.step, false);
    const formatted = this._formatNumber(newValue, false);
    this._updatingInternally = true;
    this.setState({
      maxValue: formatted,
      maxNumericValue: newValue
    });
    this._updatingInternally = false;
    if (this._maxInputEl) this._maxInputEl.value = formatted;
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._validateRange();
    this._emitEvent('change', {
      value: { min: this.state.minNumericValue, max: newValue },
      rawValue: { min: this.state.minValue, max: formatted },
      origin: 'max'
    });
  }

  _onMinClear(e) {
    e.preventDefault();
    this._updatingInternally = true;
    this.setState({
      minValue: '',
      minNumericValue: null
    });
    this._updatingInternally = false;
    if (this._minInputEl) this._minInputEl.value = '';
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._validateRange();
    this._emitEvent('change', {
      value: { min: null, max: this.state.maxNumericValue },
      rawValue: { min: '', max: this.state.maxValue },
      origin: 'min'
    });
  }

  _onMaxClear(e) {
    e.preventDefault();
    this._updatingInternally = true;
    this.setState({
      maxValue: '',
      maxNumericValue: null
    });
    this._updatingInternally = false;
    if (this._maxInputEl) this._maxInputEl.value = '';
    
    // Синхронизируем с полем
    this._syncToFieldValue();
    
    this._validateRange();
    this._emitEvent('change', {
      value: { min: this.state.minNumericValue, max: null },
      rawValue: { min: this.state.minValue, max: '' },
      origin: 'max'
    });
  }

  _emitEvent(type, detail) {
    this.dispatchEvent(new CustomEvent(`ui-input-range:${type}`, {
      bubbles: true,
      composed: true,
      detail: {
        ...detail,
        component: 'ui-input-range',
        name: this.state.name
      }
    }));
  }

  render() {
    this.innerHTML = renderRangeInputTemplate(this.state);
    this._bindEvents();
  }

  // Публичный API

  /**
   * Получить текущее значение диапазона
   * @returns {{min: number|null, max: number|null}}
   */
  value() {
    return {
      min: this.state.minNumericValue !== null ? Number(this.state.minNumericValue) : null,
      max: this.state.maxNumericValue !== null ? Number(this.state.maxNumericValue) : null
    };
  }

  /**
   * Установить значение диапазона
   * @param {{min?: number|null, max?: number|null}|null} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    let minValue = null;
    let maxValue = null;
    
    if (value && typeof value === 'object') {
      if (value.min !== null && value.min !== undefined && value.min !== '') {
        minValue = Number(value.min);
      }
      if (value.max !== null && value.max !== undefined && value.max !== '') {
        maxValue = Number(value.max);
      }
      
      // Применяем min/max ограничения
      const minLimit = this.state.min ?? null;
      const maxLimit = this.state.max ?? null;
      
      if (minLimit !== null && minValue !== null && minValue < minLimit) {
        minValue = minLimit;
      }
      if (maxLimit !== null && maxValue !== null && maxValue > maxLimit) {
        maxValue = maxLimit;
      }
      
      // Применяем clamp для взаимных ограничений
      if (minValue !== null) {
        minValue = this._clampValue(minValue, true);
      }
      if (maxValue !== null) {
        maxValue = this._clampValue(maxValue, false);
      }
      
      // Проверяем, что min <= max
      if (minValue !== null && maxValue !== null && minValue > maxValue) {
        [minValue, maxValue] = [maxValue, minValue];
      }
    }
    
    const previousValue = {
      min: this.state.minNumericValue,
      max: this.state.maxNumericValue
    };
    
    const minFormatted = this._formatNumber(minValue, true);
    const maxFormatted = this._formatNumber(maxValue, true);
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._rangeDescriptor && this.state._rangeValue) {
      this.state._rangeValue.min = minValue;
      this.state._rangeValue.max = maxValue;
      // Синхронизируем строковые значения
      this._syncFromFieldValue();
    } else {
      this._updatingInternally = true;
      this.setState({
        minValue: minFormatted,
        maxValue: maxFormatted,
        minNumericValue: minValue,
        maxNumericValue: maxValue
      });
      this._updatingInternally = false;
    }
    
    // Обновляем DOM напрямую
    if (this._minInputEl) {
      this._minInputEl.value = minFormatted;
    }
    if (this._maxInputEl) {
      this._maxInputEl.value = maxFormatted;
    }
    
    // Обновляем numeric values
    this._syncNumericValues();
    
    if (previousValue.min !== minValue || previousValue.max !== maxValue) {
      this.setState({ dirty: true });
      this._validateRange();
      this._emitEvent('change', {
        value: { min: minValue, max: maxValue },
        previousValue
      });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setValue({ min: null, max: null });
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
}

customElements.define('ui-input-range', UIRangeInput);


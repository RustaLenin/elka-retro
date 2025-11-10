import { BaseElement } from '../../../../base-element.js';
import { renderNumberInputTemplate } from './number-input-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./number-input-styles.css', import.meta.url));
}

export class UINumberInput extends BaseElement {
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
    this.render();
    this._emitLifecycleEvent('init');
  }

  disconnectedCallback() {
    this._detachEvents();
  }

  onStateChanged(_key) {
    if (_key === 'value' && !this._updatingInternally) {
      const parsed = this._parseToNumber(this.state.value);
      this._updatingInternally = true;
      this.setState({ numericValue: parsed });
      this._updatingInternally = false;
      if (this._inputEl && this._inputEl.value !== (this.state.value ?? '')) {
        this._inputEl.value = this.state.value ?? '';
      }
    }

    if (_key === 'numericValue' && !this._updatingInternally) {
      const formatted = this._formatValue(this.state.numericValue);
      if (formatted !== this.state.value) {
        this._updatingInternally = true;
        this.setState({ value: formatted ?? '' });
        this._updatingInternally = false;
      }
    }

    if ((_key === 'status' || _key === 'messages') && !this._updatingInternally) {
      this._emitValidation();
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
    this._updatingInternally = true;
    this.setState({ value: raw, numericValue: numeric, dirty: true });
    this._updatingInternally = false;
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

    this._updatingInternally = true;
    this.setState({
      value: formatted,
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
      this._updatingInternally = true;
      this.setState({ value: formatted, numericValue: clamped });
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
}

customElements.define('ui-input-number', UINumberInput);


